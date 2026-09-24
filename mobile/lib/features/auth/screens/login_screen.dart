import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../core/constants/app_constants.dart';
import '../../../core/security/biometric_service.dart';
import '../../../core/security/session_vault.dart';
import '../models/saved_account.dart';
import '../widgets/multi_account_bottom_sheet.dart';
import '../../settings/screens/security_settings_screen.dart';
import '../../sales_matrix/controllers/sales_matrix_controller.dart';
import '../../sales_matrix/models/company_feature_matrix.dart';
import '../../cheques/screens/cheque_dashboard_screen.dart';

class LoginScreen extends ConsumerStatefulWidget {
  const LoginScreen({Key? key}) : super(key: key);

  @override
  ConsumerState<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends ConsumerState<LoginScreen> {
  final _companyCodeController = TextEditingController(text: '1001');
  final _usernameController = TextEditingController(text: 'admin');
  final _passwordController = TextEditingController(text: '1234');

  final _sessionVault = SessionVault();
  final _biometricService = BiometricService();

  List<SavedAccount> _savedAccounts = [];
  bool _canUseBiometrics = false;
  bool _isLoading = false;
  bool _obscurePassword = true;

  @override
  void initState() {
    super.initState();
    _initSavedAccounts();
  }

  Future<void> _initSavedAccounts() async {
    final accounts = await _sessionVault.getAllSavedAccounts();
    final isBiometricSupported = await _biometricService.isBiometricsSupported();

    if (mounted) {
      setState(() {
        _savedAccounts = accounts;
        _canUseBiometrics = isBiometricSupported && accounts.isNotEmpty;
      });
    }
  }

  /// Handles Login form submit (Password login)
  Future<void> _handlePasswordLogin() async {
    final code = _companyCodeController.text.trim();
    final user = _usernameController.text.trim();
    final pass = _passwordController.text.trim();

    if (code.isEmpty || user.isEmpty || pass.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Please fill in Company Code, Username, and Password'),
          backgroundColor: Colors.rose,
        ),
      );
      return;
    }

    setState(() => _isLoading = true);

    // Simulate network authentication against server API
    await Future.delayed(const Duration(milliseconds: 600));

    // For demo/production, resolve company name based on company code
    final companyName = code == '1001'
        ? 'R.S. Traders & Suppliers Pvt. Ltd.'
        : (code == '2002' ? 'Himalayan Suppliers Pvt. Ltd.' : 'Company Workspace $code');

    final newAccount = SavedAccount(
      companyCode: code,
      companyName: companyName,
      username: user,
      authToken: 'token_${DateTime.now().millisecondsSinceEpoch}',
      role: 'Administrator',
      lastLogin: DateTime.now(),
    );

    await _sessionVault.saveAccount(newAccount);

    // Sync default feature matrix for this company
    ref.read(salesMatrixProvider.notifier).updateMatrix(
          CompanyFeatureMatrix.allEnabled(code),
        );

    if (mounted) {
      setState(() => _isLoading = false);
      _navigateToDashboard(newAccount);
    }
  }

  /// Handles "Tap to Login with Biometrics" Flow
  Future<void> _handleBiometricLoginTrigger() async {
    if (_savedAccounts.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('No saved company account found. Please sign in once with password.'),
        ),
      );
      return;
    }

    SavedAccount? targetAccount;

    // Requirement:
    // 1. If 2 or more accounts are saved, show a bottom selection sheet listing saved companies.
    // 2. If only 1 account is saved, skip selection sheet and trigger biometrics directly.
    if (_savedAccounts.length >= 2) {
      targetAccount = await MultiAccountBottomSheet.show(
        context,
        accounts: _savedAccounts,
        onRemove: (acc) async {
          await _sessionVault.removeAccount(acc.companyCode, acc.username);
          _initSavedAccounts();
        },
      );
      if (targetAccount == null) return; // User dismissed bottom sheet
    } else {
      targetAccount = _savedAccounts.first;
    }

    // Trigger Native Biometrics Prompt for the chosen company
    final authenticated = await _biometricService.authenticateForCompany(
      companyCode: targetAccount.companyCode,
      companyName: targetAccount.companyName,
    );

    if (authenticated && mounted) {
      await _sessionVault.setActiveCompanyCode(targetAccount.companyCode);
      
      // Update feature matrix
      ref.read(salesMatrixProvider.notifier).updateMatrix(
            CompanyFeatureMatrix.allEnabled(targetAccount.companyCode),
          );

      _navigateToDashboard(targetAccount);
    } else if (mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Biometric verification cancelled or unrecognized.'),
          backgroundColor: Colors.amber,
        ),
      );
    }
  }

  void _navigateToDashboard(SavedAccount account) {
    Navigator.of(context).pushReplacement(
      MaterialPageRoute(
        builder: (_) => ChequeDashboardScreen(
          companyCode: account.companyCode,
          companyName: account.companyName,
          currentUser: account.username,
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        backgroundColor: Colors.transparent,
        elevation: 0,
        actions: [
          // Security Settings Icon
          IconButton(
            icon: const Icon(Icons.shield_outlined, color: AppColors.textSecondary),
            tooltip: 'Security & Biometrics Settings',
            onPressed: () {
              Navigator.of(context).push(
                MaterialPageRoute(builder: (_) => const SecuritySettingsScreen()),
              );
            },
          ),
          const SizedBox(width: 8),
        ],
      ),
      body: SafeArea(
        child: Center(
          child: SingleChildScrollView(
            padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 12),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                // Branding Logo & Title
                Center(
                  child: Container(
                    width: 72,
                    height: 72,
                    decoration: BoxDecoration(
                      gradient: const LinearGradient(
                        colors: [AppColors.primary, AppColors.primaryDark],
                        begin: Alignment.topLeft,
                        end: Alignment.bottomRight,
                      ),
                      borderRadius: BorderRadius.circular(22),
                      boxShadow: [
                        BoxShadow(
                          color: AppColors.primary.withOpacity(0.35),
                          blurRadius: 22,
                          offset: const Offset(0, 8),
                        ),
                      ],
                    ),
                    child: const Icon(Icons.account_balance_rounded, color: Colors.white, size: 38),
                  ),
                ),
                const SizedBox(height: 18),
                const Center(
                  child: Text(
                    'ChequeDesk Mobile',
                    style: TextStyle(
                      color: Colors.white,
                      fontSize: 26,
                      fontWeight: FontWeight.w900,
                      letterSpacing: -0.5,
                    ),
                  ),
                ),
                const SizedBox(height: 4),
                Center(
                  child: Text(
                    'Multi-Tenant Cheque Register & Ledger',
                    style: TextStyle(color: AppColors.textSecondary, fontSize: 13),
                  ),
                ),
                const SizedBox(height: 36),

                // Form Container
                Container(
                  padding: const EdgeInsets.all(22),
                  decoration: BoxDecoration(
                    color: AppColors.surface,
                    borderRadius: BorderRadius.circular(22),
                    border: Border.all(color: AppColors.border),
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      // Field 1: Company Code
                      _buildTextField(
                        label: 'Company Code',
                        hint: 'e.g. 1001, 2002',
                        controller: _companyCodeController,
                        icon: Icons.domain_rounded,
                      ),
                      const SizedBox(height: 16),

                      // Field 2: Username
                      _buildTextField(
                        label: 'Username / Email',
                        hint: 'admin or employee',
                        controller: _usernameController,
                        icon: Icons.person_rounded,
                      ),
                      const SizedBox(height: 16),

                      // Field 3: Password
                      _buildTextField(
                        label: 'Password',
                        hint: 'Enter your password',
                        controller: _passwordController,
                        icon: Icons.lock_rounded,
                        obscure: _obscurePassword,
                        suffix: IconButton(
                          icon: Icon(
                            _obscurePassword ? Icons.visibility_off : Icons.visibility,
                            color: AppColors.textMuted,
                            size: 18,
                          ),
                          onPressed: () => setState(() => _obscurePassword = !_obscurePassword),
                        ),
                      ),
                      const SizedBox(height: 24),

                      // Submit Button
                      SizedBox(
                        width: double.infinity,
                        height: 52,
                        child: ElevatedButton(
                          onPressed: _isLoading ? null : _handlePasswordLogin,
                          style: ElevatedButton.styleFrom(
                            backgroundColor: AppColors.primary,
                            elevation: 4,
                            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                          ),
                          child: _isLoading
                              ? const SizedBox(
                                  width: 24,
                                  height: 24,
                                  child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2.5),
                                )
                              : const Text(
                                  'Sign In with Password',
                                  style: TextStyle(
                                    color: Colors.white,
                                    fontSize: 15,
                                    fontWeight: FontWeight.bold,
                                  ),
                                ),
                        ),
                      ),
                    ],
                  ),
                ),

                // Biometrics Quick Access Section
                if (_canUseBiometrics) ...[
                  const SizedBox(height: 28),
                  Row(
                    children: [
                      Expanded(child: Divider(color: AppColors.border.withOpacity(0.8))),
                      Padding(
                        padding: const EdgeInsets.symmetric(horizontal: 14),
                        child: Text(
                          'OR BIOMETRIC UNLOCK',
                          style: TextStyle(
                            color: AppColors.textMuted,
                            fontSize: 11,
                            fontWeight: FontWeight.w800,
                            letterSpacing: 1,
                          ),
                        ),
                      ),
                      Expanded(child: Divider(color: AppColors.border.withOpacity(0.8))),
                    ],
                  ),
                  const SizedBox(height: 20),

                  // Tap to Login with Fingerprint/Face
                  SizedBox(
                    width: double.infinity,
                    height: 54,
                    child: OutlinedButton.icon(
                      onPressed: _handleBiometricLoginTrigger,
                      icon: const Icon(Icons.fingerprint_rounded, color: AppColors.primaryLight, size: 28),
                      label: Text(
                        _savedAccounts.length >= 2
                            ? 'Tap to Select Account & Login'
                            : 'Tap to Login with Biometrics',
                        style: const TextStyle(
                          color: AppColors.primaryLight,
                          fontWeight: FontWeight.w700,
                          fontSize: 14,
                        ),
                      ),
                      style: OutlinedButton.styleFrom(
                        side: const BorderSide(color: AppColors.primary, width: 1.5),
                        backgroundColor: AppColors.primary.withOpacity(0.08),
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                      ),
                    ),
                  ),

                  const SizedBox(height: 10),
                  Center(
                    child: Text(
                      '${_savedAccounts.length} company account${_savedAccounts.length > 1 ? 's' : ''} saved locally',
                      style: const TextStyle(color: AppColors.textMuted, fontSize: 11),
                    ),
                  ),
                ],
              ],
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildTextField({
    required String label,
    required String hint,
    required TextEditingController controller,
    required IconData icon,
    bool obscure = false,
    Widget? suffix,
  }) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          label,
          style: const TextStyle(
            color: AppColors.textSecondary,
            fontSize: 12,
            fontWeight: FontWeight.w600,
          ),
        ),
        const SizedBox(height: 6),
        TextField(
          controller: controller,
          obscureText: obscure,
          style: const TextStyle(color: Colors.white, fontSize: 14),
          decoration: InputDecoration(
            hintText: hint,
            hintStyle: const TextStyle(color: AppColors.textMuted, fontSize: 13),
            prefixIcon: Icon(icon, color: AppColors.primaryLight, size: 20),
            suffixIcon: suffix,
            filled: true,
            fillColor: AppColors.surfaceLight,
            contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 14),
            enabledBorder: OutlineInputBorder(
              borderRadius: BorderRadius.circular(12),
              borderSide: BorderSide(color: AppColors.border.withOpacity(0.7)),
            ),
            focusedBorder: OutlineInputBorder(
              borderRadius: BorderRadius.circular(12),
              borderSide: const BorderSide(color: AppColors.primary, width: 1.5),
            ),
          ),
        ),
      ],
    );
  }
}
