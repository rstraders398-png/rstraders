import 'package:hive_flutter/hive_flutter.dart';
import '../../features/cheques/models/cheque_record.dart';
import '../constants/app_constants.dart';

class OfflineDatabase {
  static final OfflineDatabase _instance = OfflineDatabase._internal();
  factory OfflineDatabase() => _instance;
  OfflineDatabase._internal();

  Box? _chequesBox;
  Box? _syncQueueBox;

  Future<void> initialize() async {
    await Hive.initFlutter();
    _chequesBox = await Hive.openBox(AppConstants.chequesBox);
    _syncQueueBox = await Hive.openBox(AppConstants.syncQueueBox);
  }

  Box get chequesBox {
    if (_chequesBox == null || !_chequesBox!.isOpen) {
      throw Exception('Offline database not initialized. Call initialize() first.');
    }
    return _chequesBox!;
  }

  Box get syncQueueBox {
    if (_syncQueueBox == null || !_syncQueueBox!.isOpen) {
      throw Exception('Sync queue box not initialized. Call initialize() first.');
    }
    return _syncQueueBox!;
  }

  /// Get all cheques for a specific company code
  List<ChequeRecord> getChequesForCompany(String companyCode) {
    return chequesBox.values
        .whereType<Map>()
        .map((map) => ChequeRecord.fromMap(map))
        .where((record) =>
            record.companyCode.toUpperCase() == companyCode.toUpperCase())
        .toList()
      ..sort((a, b) => b.updatedAt.compareTo(a.updatedAt));
  }

  /// Write a cheque locally (zero latency) and queue for sync
  Future<void> saveCheque(ChequeRecord cheque) async {
    // 1. Store in local box
    await chequesBox.put(cheque.id, cheque.toMap());

    // 2. Queue mutation if not marked synced
    if (!cheque.isSynced) {
      await syncQueueBox.put(cheque.id, {
        'id': cheque.id,
        'action': 'UPSERT',
        'timestamp': DateTime.now().toIso8601String(),
        'payload': cheque.toMap(),
      });
    }
  }

  /// Marks a record as synced
  Future<void> markAsSynced(String chequeId) async {
    final existing = chequesBox.get(chequeId);
    if (existing != null && existing is Map) {
      final updated = Map<String, dynamic>.from(existing);
      updated['isSynced'] = true;
      await chequesBox.put(chequeId, updated);
    }
    await syncQueueBox.delete(chequeId);
  }

  /// Deletes a cheque locally and queues deletion
  Future<void> deleteCheque(String chequeId) async {
    await chequesBox.delete(chequeId);
    await syncQueueBox.put('del_$chequeId', {
      'id': chequeId,
      'action': 'DELETE',
      'timestamp': DateTime.now().toIso8601String(),
    });
  }

  /// Dumps complete company data for backup export
  List<Map<String, dynamic>> dumpCompanyLedger(String companyCode) {
    return chequesBox.values
        .whereType<Map>()
        .map((map) => Map<String, dynamic>.from(map))
        .where((record) =>
            (record['companyCode'] ?? '').toString().toUpperCase() ==
            companyCode.toUpperCase())
        .toList();
  }

  /// Restores company ledger from JSON dump
  Future<int> restoreCompanyLedger(List<Map<String, dynamic>> records) async {
    int restoredCount = 0;
    for (final item in records) {
      final id = item['id']?.toString() ?? DateTime.now().millisecondsSinceEpoch.toString();
      item['isSynced'] = true; // Restored items marked current
      await chequesBox.put(id, item);
      restoredCount++;
    }
    return restoredCount;
  }
}
