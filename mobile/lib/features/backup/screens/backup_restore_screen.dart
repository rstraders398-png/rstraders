import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../core/constants/app_constants.dart';
import '../services/backup_service.dart';
import '../../sales_matrix/widgets/feature_permission_gate.dart';

class BackupRestoreScreen extends ConsumerStatefulWidget {
  final String companyCode;
  final String companyName;

  const BackupRestoreScreen({
    Key? key,
    required this.companyCode,
    required this.companyName,
  }) : super(key: key);

  @override
  ConsumerState<BackupRestoreScreen> createState() => _BackupRestoreScreenState();
}

class _BackupRestoreScreenState extends ConsumerState<BackupRestoreScreen> {
  final BackupService _backupService = BackupService();
  bool _isProcessing = false;
  String? _statusMessage;
  bool? _isSuccessStatus;

  Future<void> _handleExport(BackupDestination destination) async {
    setState(() {
      _isProcessing = true;
      _statusMessage = null;
    });

    final result = await _backupService.exportLedgerBackup(
      companyCode: widget.companyCode,
      companyName: widget.companyName,
      destination: destination,
    );

    if (mounted) {
      setState(() {
        _isProcessing = false;
        _isSuccessStatus = result.isSuccess;
        _statusMessage = result.message;
      });
    }
  }

  Future<void> _handleRestore() async {
    final confirm = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        backgroundColor: AppColors.surface,
        title: const Text('Restore Company Ledger?', style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold)),
        content: const Text(
          'Restoring from a backup file will merge imported cheques into your local offline database. Do you wish to continue?',
          style: TextStyle(color: AppColors.textSecondary, fontSize: 13),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(ctx).pop(false),
            child: const Text('Cancel', style: TextStyle(color: AppColors.textMuted)),
          ),
          ElevatedButton(
            onPressed: () => Navigator.of(ctx).pop(true),
            style: ElevatedButton.styleFrom(backgroundColor: AppColors.primary),
            child: const Text('Select File', style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold)),
          ),
        ],
      ),
    );

    if (confirm != true) return;

    setState(() {
      _isProcessing = true;
      _statusMessage = null;
    });

    final result = await _backupService.restoreFromBackupPicker(widget.companyCode);

    if (mounted) {
      setState(() {
        _isProcessing = false;
        _isSuccessStatus = result.isSuccess;
        _statusMessage = result.message;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        backgroundColor: AppColors.surface,
        title: const Text('Ledger Backup & Restore', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 18)),
        elevation: 0,
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(20),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Company Header Banner
            Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                gradient: LinearGradient(
                  colors: [AppColors.surface, AppColors.surfaceLight],
                  begin: Alignment.topLeft,
                  end: Alignment.bottomRight,
                ),
                borderRadius: BorderRadius.circular(16),
                border: Border.all(color: AppColors.border),
              ),
              child: Row(
                children: [
                  Container(
                    width: 48,
                    height: 48,
                    decoration: BoxDecoration(
                      color: AppColors.primary.withOpacity(0.15),
                      borderRadius: BorderRadius.circular(12),
                      border: Border.all(color: AppColors.primaryLight.withOpacity(0.3)),
                    ),
                    child: const Icon(Icons.inventory_2_rounded, color: AppColors.primaryLight, size: 26),
                  ),
                  const SizedBox(width: 14),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          'Company: ${widget.companyName}',
                          style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 15),
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                        ),
                        const SizedBox(height: 2),
                        Text(
                          'Code: ${widget.companyCode} • Local Offline Snapshot',
                          style: const TextStyle(color: AppColors.primaryLight, fontSize: 12, fontWeight: FontWeight.w600),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            ),

            if (_statusMessage != null) ...[
              const SizedBox(height: 16),
              Container(
                padding: const EdgeInsets.all(14),
                decoration: BoxDecoration(
                  color: (_isSuccessStatus == true ? AppColors.primary : Colors.rose).withOpacity(0.12),
                  borderRadius: BorderRadius.circular(14),
                  border: Border.all(
                    color: (_isSuccessStatus == true ? AppColors.primary : Colors.rose).withOpacity(0.3),
                  ),
                ),
                child: Row(
                  children: [
                    Icon(
                      _isSuccessStatus == true ? Icons.check_circle_rounded : Icons.error_outline_rounded,
                      color: _isSuccessStatus == true ? AppColors.primaryLight : Colors.roseAccent,
                      size: 22,
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Text(
                        _statusMessage!,
                        style: TextStyle(
                          color: _isSuccessStatus == true ? Colors.white : Colors.rose.shade200,
                          fontSize: 13,
                          fontWeight: FontWeight.w500,
                        ),
                      ),
                    ),
                  ],
                ),
              ),
            ],

            const SizedBox(height: 28),
            const Text(
              'EXPORT BACKUP ARCHIVES',
              style: TextStyle(
                color: AppColors.textMuted,
                fontSize: 12,
                fontWeight: FontWeight.w800,
                letterSpacing: 1,
              ),
            ),
            const SizedBox(height: 12),

            // Feature Permission Gated by Developer Sales Matrix
            FeaturePermissionGate(
              isPermitted: (matrix) => matrix.offlineLocalBackup,
              showDisabledBanner: true,
              featureName: 'Ledger Backup Engine',
              child: Column(
                children: [
                  // 1. Local Device File Manager
                  _buildBackupOption(
                    title: 'Local Storage / File Manager',
                    subtitle: 'Save JSON ledger snapshot to device storage or Files app',
                    icon: Icons.folder_copy_rounded,
                    color: AppColors.primary,
                    onTap: _isProcessing ? null : () => _handleExport(BackupDestination.localDevice),
                  ),
                  const SizedBox(height: 12),

                  // 2. Google Drive
                  _buildBackupOption(
                    title: 'Google Drive Cloud Storage',
                    subtitle: 'Directly upload and sync company ledger to Google Drive',
                    icon: Icons.add_to_drive_rounded,
                    color: AppColors.accentCyan,
                    onTap: _isProcessing ? null : () => _handleExport(BackupDestination.googleDrive),
                  ),
                  const SizedBox(height: 12),

                  // 3. Microsoft OneDrive
                  _buildBackupOption(
                    title: 'Microsoft OneDrive Vault',
                    subtitle: 'Sync snapshot archive to Microsoft 365 cloud folder',
                    icon: Icons.cloud_upload_rounded,
                    color: AppColors.accentSky,
                    onTap: _isProcessing ? null : () => _handleExport(BackupDestination.oneDrive),
                  ),
                ],
              ),
            ),

            const SizedBox(height: 32),
            const Text(
              'RESTORE DATABASE',
              style: TextStyle(
                color: AppColors.textMuted,
                fontSize: 12,
                fontWeight: FontWeight.w800,
                letterSpacing: 1,
              ),
            ),
            const SizedBox(height: 12),

            // Restore Card
            InkWell(
              onTap: _isProcessing ? null : _handleRestore,
              borderRadius: BorderRadius.circular(16),
              child: Container(
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(
                  color: AppColors.surface,
                  borderRadius: BorderRadius.circular(16),
                  border: Border.all(color: AppColors.border),
                ),
                child: Row(
                  children: [
                    Container(
                      padding: const EdgeInsets.all(12),
                      decoration: BoxDecoration(
                        color: Colors.purple.withOpacity(0.15),
                        borderRadius: BorderRadius.circular(12),
                      ),
                      child: const Icon(Icons.settings_backup_restore_rounded, color: Colors.purpleAccent, size: 24),
                    ),
                    const SizedBox(width: 14),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: const [
                          Text(
                            'Restore Ledger from File',
                            style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 14),
                          ),
                          SizedBox(height: 2),
                          Text(
                            'Select a previously exported .json or .chequedesk backup file',
                            style: TextStyle(color: AppColors.textSecondary, fontSize: 11),
                          ),
                        ],
                      ),
                    ),
                    const Icon(Icons.chevron_right_rounded, color: AppColors.textMuted),
                  ],
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildBackupOption({
    required String title,
    required String subtitle,
    required IconData icon,
    required Color color,
    required VoidCallback? onTap,
  }) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(16),
      child: Container(
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: AppColors.surface,
          borderRadius: BorderRadius.circular(16),
          border: Border.all(color: AppColors.border),
        ),
        child: Row(
          children: [
            Container(
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: color.withOpacity(0.15),
                borderRadius: BorderRadius.circular(12),
              ),
              child: Icon(icon, color: color, size: 24),
            ),
            const SizedBox(width: 14),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    title,
                    style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 14),
                  ),
                  const SizedBox(height: 2),
                  Text(
                    subtitle,
                    style: const TextStyle(color: AppColors.textSecondary, fontSize: 11),
                  ),
                ],
              ),
            ),
            const Icon(Icons.arrow_forward_ios_rounded, color: AppColors.textMuted, size: 14),
          ],
        ),
      ),
    );
  }
}
