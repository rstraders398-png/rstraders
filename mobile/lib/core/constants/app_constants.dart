import 'package:flutter/material.dart';

class AppConstants {
  static const String appName = 'ChequeDesk Mobile';
  static const String appVersion = 'v1.0.0 (Offline-First)';
  
  // API Base URL (syncs with Vercel / Cloud Backend)
  static const String defaultApiBaseUrl = 'https://chequedesk.vercel.app/api';
  
  // Storage keys
  static const String secureAccountsKey = 'chequedesk_multitenant_accounts_v1';
  static const String activeCompanyKey = 'chequedesk_active_company_key';
  static const String biometricPrefsKey = 'chequedesk_biometric_preferences';
  
  // Hive box names
  static const String chequesBox = 'chequedesk_cheques_box';
  static const String auditLogsBox = 'chequedesk_audit_logs_box';
  static const String syncQueueBox = 'chequedesk_sync_queue_box';
  static const String featureMatrixBox = 'chequedesk_feature_matrix_box';
}

class AppColors {
  static const Color background = Color(0xFF0A0F1D); // Deep Navy Slate
  static const Color surface = Color(0xFF131C31);    // Elevated Slate
  static const Color surfaceLight = Color(0xFF1E293B);
  static const Color border = Color(0xFF2E3D5B);
  
  static const Color primary = Color(0xFF10B981);    // Emerald Green
  static const Color primaryDark = Color(0xFF047857);
  static const Color primaryLight = Color(0xFF34D399);
  
  static const Color accentCyan = Color(0xFF06B6D4);
  static const Color accentSky = Color(0xFF0284C7);
  static const Color warning = Color(0xFFF59E0B);
  static const Color danger = Color(0xFFEF4444);
  
  static const Color textPrimary = Colors.white;
  static const Color textSecondary = Color(0xFF94A3B8);
  static const Color textMuted = Color(0xFF64748B);
}
