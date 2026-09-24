import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../controllers/sales_matrix_controller.dart';
import '../models/company_feature_matrix.dart';
import '../../../core/constants/app_constants.dart';

class FeaturePermissionGate extends ConsumerWidget {
  final bool Function(CompanyFeatureMatrix matrix) isPermitted;
  final Widget child;
  final Widget? fallback;
  final bool showDisabledBanner;
  final String featureName;

  const FeaturePermissionGate({
    Key? key,
    required this.isPermitted,
    required this.child,
    this.fallback,
    this.showDisabledBanner = false,
    this.featureName = 'This feature',
  }) : super(key: key);

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final matrix = ref.watch(salesMatrixProvider);
    final allowed = isPermitted(matrix);

    if (allowed) {
      return child;
    }

    if (fallback != null) {
      return fallback!;
    }

    if (showDisabledBanner) {
      return Container(
        margin: const EdgeInsets.symmetric(vertical: 8, horizontal: 16),
        padding: const EdgeInsets.all(14),
        decoration: BoxDecoration(
          color: AppColors.surfaceLight,
          borderRadius: BorderRadius.circular(14),
          border: Border.all(color: AppColors.border),
        ),
        child: Row(
          children: [
            Container(
              padding: const EdgeInsets.all(8),
              decoration: BoxDecoration(
                color: Colors.amber.withOpacity(0.15),
                shape: BoxShape.circle,
              ),
              child: const Icon(Icons.lock_clock_rounded, color: Colors.amber, size: 20),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    '$featureName is Locked',
                    style: const TextStyle(
                      color: AppColors.textPrimary,
                      fontWeight: FontWeight.bold,
                      fontSize: 13,
                    ),
                  ),
                  const SizedBox(height: 2),
                  const Text(
                    'Contact Developer / Super Admin to enable this module in your company Sales Matrix plan.',
                    style: TextStyle(color: AppColors.textSecondary, fontSize: 11),
                  ),
                ],
              ),
            ),
          ],
        ),
      );
    }

    // Default: Completely hide the UI element
    return const SizedBox.shrink();
  }
}
