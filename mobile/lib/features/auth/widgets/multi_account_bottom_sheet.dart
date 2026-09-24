import 'package:flutter/material.dart';
import '../../../core/constants/app_constants.dart';
import '../models/saved_account.dart';

class MultiAccountBottomSheet extends StatelessWidget {
  final List<SavedAccount> accounts;
  final ValueChanged<SavedAccount> onSelectAccount;
  final ValueChanged<SavedAccount>? onRemoveAccount;

  const MultiAccountBottomSheet({
    Key? key,
    required this.accounts,
    required this.onSelectAccount,
    this.onRemoveAccount,
  }) : super(key: key);

  static Future<SavedAccount?> show(
    BuildContext context, {
    required List<SavedAccount> accounts,
    ValueChanged<SavedAccount>? onRemove,
  }) {
    return showModalBottomSheet<SavedAccount>(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (ctx) => MultiAccountBottomSheet(
        accounts: accounts,
        onSelectAccount: (acc) => Navigator.of(ctx).pop(acc),
        onRemoveAccount: onRemove,
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Container(
      constraints: BoxConstraints(
        maxHeight: MediaQuery.of(context).size.height * 0.75,
      ),
      decoration: const BoxDecoration(
        color: AppColors.surface,
        borderRadius: BorderRadius.vertical(top: Radius.circular(28)),
        boxShadow: [
          BoxShadow(
            color: Colors.black54,
            blurRadius: 30,
            offset: Offset(0, -5),
          ),
        ],
      ),
      padding: const EdgeInsets.fromLTRB(20, 14, 20, 28),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Drag handle
          Center(
            child: Container(
              width: 44,
              height: 5,
              decoration: BoxDecoration(
                color: AppColors.border,
                borderRadius: BorderRadius.circular(10),
              ),
            ),
          ),
          const SizedBox(height: 18),

          // Header with Biometric Badge
          Row(
            children: [
              Container(
                width: 42,
                height: 42,
                decoration: BoxDecoration(
                  color: AppColors.primary.withOpacity(0.15),
                  shape: BoxShape.circle,
                  border: Border.all(color: AppColors.primary.withOpacity(0.3)),
                ),
                child: const Icon(
                  Icons.fingerprint_rounded,
                  color: AppColors.primaryLight,
                  size: 24,
                ),
              ),
              const SizedBox(width: 14),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text(
                      'Select Company Workspace',
                      style: TextStyle(
                        color: AppColors.textPrimary,
                        fontSize: 17,
                        fontWeight: FontWeight.w700,
                      ),
                    ),
                    Text(
                      'Choose an account to authenticate with Biometrics',
                      style: TextStyle(
                        color: AppColors.textSecondary,
                        fontSize: 12,
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),

          const SizedBox(height: 18),
          const Divider(color: AppColors.border, height: 1),
          const SizedBox(height: 12),

          // Account list (MeroShare styled)
          Flexible(
            child: ListView.separated(
              shrinkWrap: true,
              itemCount: accounts.length,
              separatorBuilder: (_, __) => const SizedBox(height: 10),
              itemBuilder: (context, index) {
                final acc = accounts[index];
                final initials = acc.companyCode.isNotEmpty
                    ? (acc.companyCode.length <= 4
                        ? acc.companyCode.toUpperCase()
                        : acc.companyCode.substring(0, 4).toUpperCase())
                    : 'CD';

                return Material(
                  color: Colors.transparent,
                  child: InkWell(
                    onTap: () => onSelectAccount(acc),
                    borderRadius: BorderRadius.circular(16),
                    splashColor: AppColors.primary.withOpacity(0.12),
                    child: Container(
                      padding: const EdgeInsets.all(14),
                      decoration: BoxDecoration(
                        color: AppColors.surfaceLight,
                        borderRadius: BorderRadius.circular(16),
                        border: Border.all(color: AppColors.border.withOpacity(0.8)),
                      ),
                      child: Row(
                        children: [
                          // Code Badge
                          Container(
                            width: 50,
                            height: 50,
                            decoration: BoxDecoration(
                              gradient: LinearGradient(
                                colors: [
                                  AppColors.primaryDark,
                                  const Color(0xFF0F766E),
                                ],
                                begin: Alignment.topLeft,
                                end: Alignment.bottomRight,
                              ),
                              borderRadius: BorderRadius.circular(14),
                              border: Border.all(
                                color: AppColors.primaryLight.withOpacity(0.4),
                              ),
                            ),
                            alignment: Alignment.center,
                            child: Text(
                              initials,
                              style: const TextStyle(
                                color: Colors.white,
                                fontWeight: FontWeight.w900,
                                fontSize: 13,
                                letterSpacing: 0.8,
                              ),
                            ),
                          ),
                          const SizedBox(width: 14),

                          // Account Info: Company Code on Top, Company Name Below
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                // 1. Company Code on top
                                Row(
                                  children: [
                                    Text(
                                      'CODE: ${acc.companyCode.toUpperCase()}',
                                      style: const TextStyle(
                                        color: AppColors.primaryLight,
                                        fontWeight: FontWeight.w800,
                                        fontSize: 14,
                                        letterSpacing: 0.6,
                                      ),
                                    ),
                                    const SizedBox(width: 8),
                                    Container(
                                      padding: const EdgeInsets.symmetric(
                                        horizontal: 6,
                                        vertical: 2,
                                      ),
                                      decoration: BoxDecoration(
                                        color: AppColors.border,
                                        borderRadius: BorderRadius.circular(6),
                                      ),
                                      child: Text(
                                        acc.role,
                                        style: const TextStyle(
                                          color: AppColors.textSecondary,
                                          fontSize: 10,
                                          fontWeight: FontWeight.bold,
                                        ),
                                      ),
                                    ),
                                  ],
                                ),
                                const SizedBox(height: 3),

                                // 2. Company Name below it
                                Text(
                                  acc.companyName,
                                  style: const TextStyle(
                                    color: AppColors.textPrimary,
                                    fontWeight: FontWeight.w600,
                                    fontSize: 14,
                                  ),
                                  maxLines: 1,
                                  overflow: TextOverflow.ellipsis,
                                ),
                                const SizedBox(height: 2),

                                // Username info
                                Text(
                                  'User: ${acc.username}',
                                  style: const TextStyle(
                                    color: AppColors.textMuted,
                                    fontSize: 12,
                                  ),
                                ),
                              ],
                            ),
                          ),

                          const SizedBox(width: 8),
                          // Biometric prompt icon
                          Container(
                            padding: const EdgeInsets.all(8),
                            decoration: BoxDecoration(
                              color: AppColors.surface,
                              shape: BoxShape.circle,
                              border: Border.all(color: AppColors.border),
                            ),
                            child: const Icon(
                              Icons.lock_open_rounded,
                              color: AppColors.primaryLight,
                              size: 16,
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),
                );
              },
            ),
          ),
          const SizedBox(height: 14),

          // Bottom cancel button
          SizedBox(
            width: double.infinity,
            child: TextButton(
              onPressed: () => Navigator.of(context).pop(),
              style: TextButton.styleFrom(
                foregroundColor: AppColors.textSecondary,
                padding: const EdgeInsets.symmetric(vertical: 12),
              ),
              child: const Text(
                'Cancel & Use Password Login',
                style: TextStyle(fontSize: 13, fontWeight: FontWeight.w600),
              ),
            ),
          ),
        ],
      ),
    );
  }
}
