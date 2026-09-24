import 'package:flutter/material.dart';
import 'package:local_auth/local_auth.dart';
import '../../../core/constants/app_constants.dart';
import '../../../core/security/biometric_service.dart';

class SecuritySettingsScreen extends StatefulWidget {
  const SecuritySettingsScreen({Key? key}) : super(key: key);

  @override
  State<SecuritySettingsScreen> createState() => _SecuritySettingsScreenState();
}

class _SecuritySettingsScreenState extends State<SecuritySettingsScreen> {
  final BiometricService _biometricService = BiometricService();
  bool _isHardwareSupported = false;
  List<BiometricType> _hardwareTypes = [];
  bool _isFingerprintEnabled = true;
  bool _isFaceUnlockEnabled = true;
  bool _isLoading = true;

  @override
  void initState() {
    super.initState();
    _loadBiometricSettings();
  }

  Future<void> _loadBiometricSettings() async {
    setState(() => _isLoading = true);
    final supported = await _biometricService.isBiometricsSupported();
    final types = await _biometricService.getAvailableBiometrics();
    final prefs = await _biometricService.getPreferences();

    if (mounted) {
      setState(() {
        _isHardwareSupported = supported;
        _hardwareTypes = types;
        _isFingerprintEnabled = prefs.isFingerprintEnabled;
        _isFaceUnlockEnabled = prefs.isFaceUnlockEnabled;
        _isLoading = false;
      });
    }
  }

  Future<void> _updatePreferences() async {
    final prefs = BiometricUserPreferences(
      isFingerprintEnabled: _isFingerprintEnabled,
      isFaceUnlockEnabled: _isFaceUnlockEnabled,
    );
    await _biometricService.savePreferences(prefs);
    if (mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Security & Biometrics settings updated'),
          backgroundColor: AppColors.primaryDark,
          duration: Duration(seconds: 2),
        ),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        backgroundColor: AppColors.surface,
        title: const Text(
          'Security & Biometrics',
          style: TextStyle(fontWeight: FontWeight.bold, fontSize: 18),
        ),
        elevation: 0,
      ),
      body: _isLoading
          ? const Center(child: CircularProgressIndicator(color: AppColors.primary))
          : SingleChildScrollView(
              padding: const EdgeInsets.all(20),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  // Status Banner
                  Container(
                    padding: const EdgeInsets.all(16),
                    decoration: BoxDecoration(
                      color: _isHardwareSupported
                          ? AppColors.primary.withOpacity(0.1)
                          : Colors.rose.withOpacity(0.1),
                      borderRadius: BorderRadius.circular(16),
                      border: Border.all(
                        color: _isHardwareSupported
                            ? AppColors.primary.withOpacity(0.3)
                            : Colors.rose.withOpacity(0.3),
                      ),
                    ),
                    child: Row(
                      children: [
                        Icon(
                          _isHardwareSupported
                              ? Icons.security_rounded
                              : Icons.warning_amber_rounded,
                          color: _isHardwareSupported
                              ? AppColors.primaryLight
                              : Colors.roseAccent,
                          size: 28,
                        ),
                        const SizedBox(width: 14),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                _isHardwareSupported
                                    ? 'Biometric Hardware Active'
                                    : 'Biometrics Not Detected',
                                style: const TextStyle(
                                  color: AppColors.textPrimary,
                                  fontWeight: FontWeight.bold,
                                  fontSize: 14,
                                ),
                              ),
                              const SizedBox(height: 2),
                              Text(
                                _isHardwareSupported
                                    ? 'Detected: ${_hardwareTypes.map((e) => e.name).join(", ")}'
                                    : 'Your device does not have enrolled biometrics or sensor is disabled.',
                                style: const TextStyle(
                                  color: AppColors.textSecondary,
                                  fontSize: 12,
                                ),
                              ),
                            ],
                          ),
                        ),
                      ],
                    ),
                  ),

                  const SizedBox(height: 28),
                  const Text(
                    'AUTHENTICATION SENSORS',
                    style: TextStyle(
                      color: AppColors.textMuted,
                      fontSize: 12,
                      fontWeight: FontWeight.w800,
                      letterSpacing: 1,
                    ),
                  ),
                  const SizedBox(height: 12),

                  // 1. Fingerprint Sensor Toggle
                  _buildToggleCard(
                    title: 'Fingerprint Sensor',
                    subtitle: 'Use physical or under-display optical fingerprint scanner',
                    icon: Icons.fingerprint_rounded,
                    value: _isFingerprintEnabled,
                    onChanged: (val) {
                      setState(() => _isFingerprintEnabled = val);
                      _updatePreferences();
                    },
                  ),

                  const SizedBox(height: 12),

                  // 2. Face Unlock Toggle
                  _buildToggleCard(
                    title: 'Face Unlock (Face ID)',
                    subtitle: 'Use front camera 3D/2D facial recognition for instant login',
                    icon: Icons.face_rounded,
                    value: _isFaceUnlockEnabled,
                    onChanged: (val) {
                      setState(() => _isFaceUnlockEnabled = val);
                      _updatePreferences();
                    },
                  ),

                  const SizedBox(height: 32),
                  const Text(
                    'HOW IT WORKS',
                    style: TextStyle(
                      color: AppColors.textMuted,
                      fontSize: 12,
                      fontWeight: FontWeight.w800,
                      letterSpacing: 1,
                    ),
                  ),
                  const SizedBox(height: 10),
                  Container(
                    padding: const EdgeInsets.all(16),
                    decoration: BoxDecoration(
                      color: AppColors.surfaceLight,
                      borderRadius: BorderRadius.circular(16),
                      border: Border.all(color: AppColors.border),
                    ),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: const [
                        Text(
                          '• Multiple Saved Accounts:',
                          style: TextStyle(
                            color: AppColors.primaryLight,
                            fontWeight: FontWeight.bold,
                            fontSize: 13,
                          ),
                        ),
                        SizedBox(height: 4),
                        Text(
                          'When tapping "Login with Biometrics" on the login screen, if you have 2+ company sessions saved, ChequeDesk shows the MeroShare-style account chooser bottom sheet with Company Code on top and Company Name below.',
                          style: TextStyle(color: AppColors.textSecondary, fontSize: 12, height: 1.4),
                        ),
                        SizedBox(height: 12),
                        Text(
                          '• Single Saved Account:',
                          style: TextStyle(
                            color: AppColors.primaryLight,
                            fontWeight: FontWeight.bold,
                            fontSize: 13,
                          ),
                        ),
                        SizedBox(height: 4),
                        Text(
                          'If you only have one company workspace saved, ChequeDesk skips the picker and directly invokes your biometric prompt.',
                          style: TextStyle(color: AppColors.textSecondary, fontSize: 12, height: 1.4),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            ),
    );
  }

  Widget _buildToggleCard({
    required String title,
    required String subtitle,
    required IconData icon,
    required bool value,
    required ValueChanged<bool> onChanged,
  }) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: AppColors.surface,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: AppColors.border),
      ),
      child: Row(
        children: [
          Container(
            padding: const EdgeInsets.all(10),
            decoration: BoxDecoration(
              color: value
                  ? AppColors.primary.withOpacity(0.15)
                  : AppColors.border.withOpacity(0.5),
              borderRadius: BorderRadius.circular(12),
            ),
            child: Icon(
              icon,
              color: value ? AppColors.primaryLight : AppColors.textMuted,
              size: 24,
            ),
          ),
          const SizedBox(width: 14),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  title,
                  style: const TextStyle(
                    color: AppColors.textPrimary,
                    fontWeight: FontWeight.bold,
                    fontSize: 14,
                  ),
                ),
                const SizedBox(height: 2),
                Text(
                  subtitle,
                  style: const TextStyle(
                    color: AppColors.textSecondary,
                    fontSize: 11,
                  ),
                ),
              ],
            ),
          ),
          Switch(
            value: value,
            activeColor: AppColors.primaryLight,
            activeTrackColor: AppColors.primaryDark,
            inactiveThumbColor: AppColors.textMuted,
            inactiveTrackColor: AppColors.surfaceLight,
            onChanged: onChanged,
          ),
        ],
      ),
    );
  }
}
