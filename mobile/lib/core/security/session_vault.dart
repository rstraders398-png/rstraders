import 'dart:convert';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import '../../features/auth/models/saved_account.dart';
import '../constants/app_constants.dart';

class SessionVault {
  static const _storage = FlutterSecureStorage(
    aOptions: AndroidOptions(encryptedSharedPreferences: true),
    iOptions: IOSOptions(accessibility: KeychainAccessibility.first_unlock),
  );

  /// Retrieves list of all locally stored company accounts
  Future<List<SavedAccount>> getAllSavedAccounts() async {
    final raw = await _storage.read(key: AppConstants.secureAccountsKey);
    if (raw == null || raw.trim().isEmpty) return [];

    try {
      final List<dynamic> list = jsonDecode(raw);
      final accounts = list
          .map((item) => SavedAccount.fromJson(item as Map<String, dynamic>))
          .toList();
      // Sort by most recently active first
      accounts.sort((a, b) => b.lastLogin.compareTo(a.lastLogin));
      return accounts;
    } catch (_) {
      return [];
    }
  }

  /// Adds or updates a saved company session
  Future<void> saveAccount(SavedAccount account) async {
    final accounts = await getAllSavedAccounts();
    accounts.removeWhere((item) =>
        item.companyCode.trim().toUpperCase() == account.companyCode.trim().toUpperCase() &&
        item.username.trim().toLowerCase() == account.username.trim().toLowerCase());

    accounts.insert(0, account);

    await _storage.write(
      key: AppConstants.secureAccountsKey,
      value: jsonEncode(accounts.map((e) => e.toJson()).toList()),
    );
    await setActiveCompanyCode(account.companyCode);
  }

  /// Removes a specific account from storage
  Future<void> removeAccount(String companyCode, String username) async {
    final accounts = await getAllSavedAccounts();
    accounts.removeWhere((item) =>
        item.companyCode.trim().toUpperCase() == companyCode.trim().toUpperCase() &&
        item.username.trim().toLowerCase() == username.trim().toLowerCase());

    await _storage.write(
      key: AppConstants.secureAccountsKey,
      value: jsonEncode(accounts.map((e) => e.toJson()).toList()),
    );
  }

  /// Gets the currently active company code
  Future<String?> getActiveCompanyCode() async {
    return await _storage.read(key: AppConstants.activeCompanyKey);
  }

  /// Sets active company code
  Future<void> setActiveCompanyCode(String companyCode) async {
    await _storage.write(key: AppConstants.activeCompanyKey, value: companyCode);
  }

  /// Clear all stored sessions
  Future<void> clearAll() async {
    await _storage.delete(key: AppConstants.secureAccountsKey);
    await _storage.delete(key: AppConstants.activeCompanyKey);
  }
}
