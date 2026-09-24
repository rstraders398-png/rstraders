import 'package:flutter/services.dart';
import 'package:local_auth/local_auth.dart';
import 'package:local_auth_android/local_auth_android.dart';
import 'package:local_auth_darwin/local_auth_darwin.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'dart:convert';
import '../constants/app_constants.dart';

class BiometricUserPreferences {
  final bool isFingerprintEnabled;
  final bool isFaceUnlockEnabled;

  const BiometricUserPreferences({
    this.isFingerprintEnabled = true,
    this.isFaceUnlockEnabled = true,
  });

  Map<String, dynamic> toMap() => {
    'isFingerprintEnabled': isFingerprintEnabled,
    'isFaceUnlockEnabled': isFaceUnlockEnabled,
  };

  factory BiometricUserPreferences.fromMap(Map<String, dynamic> map) => BiometricUserPreferences(
    isFingerprintEnabled: map['isFingerprintEnabled'] ?? true,
    isFaceUnlockEnabled: map['isFaceUnlockEnabled'] ?? true,
  );
}

class BiometricService {
  final LocalAuthentication _auth = LocalAuthentication();
  final FlutterSecureStorage _storage = const FlutterSecureStorage();

  /// Checks if device has biometric hardware capable of evaluating auth
  Future<bool> isBiometricsSupported() async {
    try {
      final bool canAuthenticateWithBiometrics = await _auth.canCheckBiometrics;
      final bool canAuthenticate = canAuthenticateWithBiometrics || await _auth.isDeviceSupported();
      return canAuthenticate;
    } on PlatformException {
      return false;
    }
  }

  /// Lists available hardware biometric types (Face, Fingerprint, Strong/Weak)
  Future<List<BiometricType>> getAvailableBiometrics() async {
    try {
      return await _auth.getAvailableBiometrics();
    } on PlatformException {
      return <BiometricType>[];
    }
  }

  /// Loads user settings for Face and Fingerprint toggles
  Future<BiometricUserPreferences> getPreferences() async {
    final raw = await _storage.read(key: AppConstants.biometricPrefsKey);
    if (raw == null) return const BiometricUserPreferences();
    try {
      return BiometricUserPreferences.fromMap(jsonDecode(raw));
    } catch (_) {
      return const BiometricUserPreferences();
    }
  }

  /// Saves user settings toggles
  Future<void> savePreferences(BiometricUserPreferences prefs) async {
    await _storage.write(
      key: AppConstants.biometricPrefsKey,
      value: jsonEncode(prefs.toMap()),
    );
  }

  /// Triggers biometric prompt with company name context
  Future<bool> authenticateForCompany({
    required String companyCode,
    required String companyName,
  }) async {
    final isSupported = await isBiometricsSupported();
    if (!isSupported) return false;

    final prefs = await getPreferences();
    if (!prefs.isFingerprintEnabled && !prefs.isFaceUnlockEnabled) {
      return false; // Both disabled in app settings
    }

    try {
      return await _auth.authenticate(
        localizedReason: 'Unlock workspace for $companyName ($companyCode)',
        authMessages: const <AuthMessages>[
          AndroidAuthMessages(
            signInTitle: 'ChequeDesk Biometric Auth',
            cancelButton: 'Cancel',
            biometricHint: 'Verify your identity (Fingerprint or Face)',
          ),
          IOSAuthMessages(
            cancelButton: 'Cancel',
          ),
        ],
        options: const AuthenticationOptions(
          stickyAuth: true,
          biometricOnly: true,
          useErrorDialogs: true,
        ),
      );
    } on PlatformException {
      return false;
    }
  }
}
