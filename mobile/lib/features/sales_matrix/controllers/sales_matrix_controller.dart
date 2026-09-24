import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:hive/hive.dart';
import '../models/company_feature_matrix.dart';
import '../../../core/constants/app_constants.dart';

final salesMatrixProvider = StateNotifierProvider<SalesMatrixController, CompanyFeatureMatrix>((ref) {
  return SalesMatrixController();
});

class SalesMatrixController extends StateNotifier<CompanyFeatureMatrix> {
  SalesMatrixController() : super(CompanyFeatureMatrix.allEnabled('')) {
    _loadCachedMatrix();
  }

  Future<void> _loadCachedMatrix() async {
    try {
      final box = await Hive.openBox(AppConstants.featureMatrixBox);
      final raw = box.get('current_matrix');
      if (raw != null && raw is Map) {
        state = CompanyFeatureMatrix.fromMap(Map<String, dynamic>.from(raw));
      }
    } catch (_) {}
  }

  /// Sets matrix from server during login or periodic sync
  Future<void> updateMatrix(CompanyFeatureMatrix matrix) async {
    state = matrix;
    try {
      final box = await Hive.openBox(AppConstants.featureMatrixBox);
      await box.put('current_matrix', matrix.toMap());
    } catch (_) {}
  }

  /// Check whether a specific feature flag is granted for the active tenant
  bool isFeatureAllowed(bool Function(CompanyFeatureMatrix matrix) selector) {
    return selector(state);
  }
}
