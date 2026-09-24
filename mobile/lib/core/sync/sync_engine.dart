import 'dart:async';
import 'package:connectivity_plus/connectivity_plus.dart';
import 'package:dio/dio.dart';
import '../constants/app_constants.dart';
import '../database/offline_database.dart';

class SyncStatus {
  final bool isOnline;
  final bool isSyncing;
  final int pendingMutationsCount;
  final DateTime? lastSyncTime;
  final String? errorMessage;

  const SyncStatus({
    this.isOnline = true,
    this.isSyncing = false,
    this.pendingMutationsCount = 0,
    this.lastSyncTime,
    this.errorMessage,
  });

  SyncStatus copyWith({
    bool? isOnline,
    bool? isSyncing,
    int? pendingMutationsCount,
    DateTime? lastSyncTime,
    String? errorMessage,
  }) {
    return SyncStatus(
      isOnline: isOnline ?? this.isOnline,
      isSyncing: isSyncing ?? this.isSyncing,
      pendingMutationsCount: pendingMutationsCount ?? this.pendingMutationsCount,
      lastSyncTime: lastSyncTime ?? this.lastSyncTime,
      errorMessage: errorMessage,
    );
  }
}

class SyncEngine {
  final OfflineDatabase _database = OfflineDatabase();
  final Dio _dio = Dio(BaseOptions(
    baseUrl: AppConstants.defaultApiBaseUrl,
    connectTimeout: const Duration(seconds: 10),
    receiveTimeout: const Duration(seconds: 10),
  ));

  StreamSubscription<ConnectivityResult>? _connectivitySubscription;
  final StreamController<SyncStatus> _statusController = StreamController<SyncStatus>.broadcast();
  SyncStatus _currentStatus = const SyncStatus();

  Stream<SyncStatus> get statusStream => _statusController.stream;
  SyncStatus get currentStatus => _currentStatus;

  void startListening() {
    _connectivitySubscription = Connectivity().onConnectivityChanged.listen((result) {
      final isOnline = result != ConnectivityResult.none;
      _updateStatus(_currentStatus.copyWith(
        isOnline: isOnline,
        pendingMutationsCount: _database.syncQueueBox.length,
      ));

      if (isOnline) {
        triggerAutoSync();
      }
    });

    // Initial check
    _updateStatus(_currentStatus.copyWith(
      pendingMutationsCount: _database.syncQueueBox.length,
    ));
  }

  void _updateStatus(SyncStatus status) {
    _currentStatus = status;
    _statusController.add(status);
  }

  /// Auto-syncs all queued changes to the server
  Future<void> triggerAutoSync() async {
    if (_currentStatus.isSyncing) return;

    final connectivityResult = await Connectivity().checkConnectivity();
    if (connectivityResult == ConnectivityResult.none) {
      _updateStatus(_currentStatus.copyWith(
        isOnline: false,
        pendingMutationsCount: _database.syncQueueBox.length,
      ));
      return;
    }

    _updateStatus(_currentStatus.copyWith(
      isSyncing: true,
      pendingMutationsCount: _database.syncQueueBox.length,
      errorMessage: null,
    ));

    try {
      final queueKeys = _database.syncQueueBox.keys.toList();
      for (final key in queueKeys) {
        final mutation = _database.syncQueueBox.get(key);
        if (mutation == null || mutation is! Map) continue;

        final action = mutation['action']?.toString();
        final id = mutation['id']?.toString() ?? key.toString();

        if (action == 'UPSERT') {
          final payload = mutation['payload'];
          await _dio.post('/cheques/sync', data: payload);
          await _database.markAsSynced(id);
        } else if (action == 'DELETE') {
          await _dio.delete('/cheques/$id');
          await _database.syncQueueBox.delete(key);
        }
      }

      _updateStatus(_currentStatus.copyWith(
        isSyncing: false,
        isOnline: true,
        pendingMutationsCount: _database.syncQueueBox.length,
        lastSyncTime: DateTime.now(),
      ));
    } catch (e) {
      _updateStatus(_currentStatus.copyWith(
        isSyncing: false,
        errorMessage: 'Sync error: $e',
        pendingMutationsCount: _database.syncQueueBox.length,
      ));
    }
  }

  void dispose() {
    _connectivitySubscription?.cancel();
    _statusController.close();
  }
}
