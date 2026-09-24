import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../core/constants/app_constants.dart';
import '../../../core/database/offline_database.dart';
import '../../../core/sync/sync_engine.dart';
import '../models/cheque_record.dart';
import '../../sales_matrix/controllers/sales_matrix_controller.dart';
import '../../sales_matrix/widgets/feature_permission_gate.dart';
import '../../backup/screens/backup_restore_screen.dart';
import '../../settings/screens/security_settings_screen.dart';

class ChequeDashboardScreen extends ConsumerStatefulWidget {
  final String companyCode;
  final String companyName;
  final String currentUser;

  const ChequeDashboardScreen({
    Key? key,
    required this.companyCode,
    required this.companyName,
    required this.currentUser,
  }) : super(key: key);

  @override
  ConsumerState<ChequeDashboardScreen> createState() => _ChequeDashboardScreenState();
}

class _ChequeDashboardScreenState extends ConsumerState<ChequeDashboardScreen> {
  final OfflineDatabase _database = OfflineDatabase();
  final SyncEngine _syncEngine = SyncEngine();
  List<ChequeRecord> _cheques = [];

  @override
  void initState() {
    super.initState();
    _loadLocalCheques();
    _syncEngine.startListening();
  }

  @override
  void dispose() {
    _syncEngine.dispose();
    super.dispose();
  }

  void _loadLocalCheques() {
    final list = _database.getChequesForCompany(widget.companyCode);
    setState(() => _cheques = list);
  }

  void _showAddChequeSheet() {
    final chequeNumberCtrl = TextEditingController();
    final payeeNameCtrl = TextEditingController();
    final amountCtrl = TextEditingController();
    final bankNameCtrl = TextEditingController(text: 'Nabil Bank Ltd.');
    final dueDateBsCtrl = TextEditingController(text: '2081-11-15');
    final dueDateAdCtrl = TextEditingController(text: '2025-02-27');

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (ctx) => Padding(
        padding: EdgeInsets.only(bottom: MediaQuery.of(ctx).viewInsets.bottom),
        child: Container(
          decoration: const BoxDecoration(
            color: AppColors.surface,
            borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
          ),
          padding: const EdgeInsets.all(20),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  const Text(
                    'Add Cheque to Ledger',
                    style: TextStyle(color: Colors.white, fontSize: 18, fontWeight: FontWeight.bold),
                  ),
                  IconButton(
                    icon: const Icon(Icons.close, color: AppColors.textMuted),
                    onPressed: () => Navigator.of(ctx).pop(),
                  ),
                ],
              ),
              const SizedBox(height: 12),
              TextField(
                controller: chequeNumberCtrl,
                style: const TextStyle(color: Colors.white),
                decoration: const InputDecoration(
                  labelText: 'Cheque Number',
                  labelStyle: TextStyle(color: AppColors.textSecondary),
                ),
              ),
              const SizedBox(height: 8),
              TextField(
                controller: payeeNameCtrl,
                style: const TextStyle(color: Colors.white),
                decoration: const InputDecoration(
                  labelText: 'Payee / Party Name',
                  labelStyle: TextStyle(color: AppColors.textSecondary),
                ),
              ),
              const SizedBox(height: 8),
              TextField(
                controller: amountCtrl,
                keyboardType: TextInputType.number,
                style: const TextStyle(color: Colors.white),
                decoration: const InputDecoration(
                  labelText: 'Amount (NPR)',
                  labelStyle: TextStyle(color: AppColors.textSecondary),
                ),
              ),
              const SizedBox(height: 8),
              TextField(
                controller: bankNameCtrl,
                style: const TextStyle(color: Colors.white),
                decoration: const InputDecoration(
                  labelText: 'Bank Name',
                  labelStyle: TextStyle(color: AppColors.textSecondary),
                ),
              ),
              const SizedBox(height: 16),
              SizedBox(
                width: double.infinity,
                child: ElevatedButton(
                  onPressed: () async {
                    final num = chequeNumberCtrl.text.trim();
                    final payee = payeeNameCtrl.text.trim();
                    final amt = double.tryParse(amountCtrl.text.trim()) ?? 0.0;
                    if (num.isEmpty || payee.isEmpty || amt <= 0) return;

                    final newRecord = ChequeRecord(
                      id: 'cq_${DateTime.now().millisecondsSinceEpoch}',
                      companyCode: widget.companyCode,
                      chequeNumber: num,
                      payeeName: payee,
                      amount: amt,
                      amountInWords: '$amt Rupees Only',
                      bankName: bankNameCtrl.text.trim(),
                      accountNumber: '0010012345678',
                      status: 'Pending',
                      dueDateBS: dueDateBsCtrl.text.trim(),
                      dueDateAD: dueDateAdCtrl.text.trim(),
                      issuedDateBS: '2081-11-01',
                      issuedDateAD: '2025-02-13',
                      isSynced: false,
                    );

                    await _database.saveCheque(newRecord);
                    Navigator.of(ctx).pop();
                    _loadLocalCheques();

                    // Trigger auto-sync if permitted and online
                    final matrix = ref.read(salesMatrixProvider);
                    if (matrix.cloudSync) {
                      _syncEngine.triggerAutoSync();
                    }
                  },
                  style: ElevatedButton.styleFrom(
                    backgroundColor: AppColors.primary,
                    padding: const EdgeInsets.symmetric(vertical: 14),
                  ),
                  child: const Text('Save Locally & Queue Sync', style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold)),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final matrix = ref.watch(salesMatrixProvider);

    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        backgroundColor: AppColors.surface,
        elevation: 0,
        title: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              widget.companyName,
              style: const TextStyle(color: Colors.white, fontSize: 16, fontWeight: FontWeight.bold),
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
            ),
            Text(
              'Code: ${widget.companyCode} • Logged in: ${widget.currentUser}',
              style: const TextStyle(color: AppColors.primaryLight, fontSize: 11),
            ),
          ],
        ),
        actions: [
          // Security Settings
          IconButton(
            icon: const Icon(Icons.shield_rounded, color: AppColors.textSecondary),
            tooltip: 'Security Settings',
            onPressed: () {
              Navigator.of(context).push(
                MaterialPageRoute(builder: (_) => const SecuritySettingsScreen()),
              );
            },
          ),
          // Backup & Restore
          FeaturePermissionGate(
            isPermitted: (m) => m.offlineLocalBackup,
            child: IconButton(
              icon: const Icon(Icons.backup_rounded, color: AppColors.textSecondary),
              tooltip: 'Backup & Restore',
              onPressed: () {
                Navigator.of(context).push(
                  MaterialPageRoute(
                    builder: (_) => BackupRestoreScreen(
                      companyCode: widget.companyCode,
                      companyName: widget.companyName,
                    ),
                  ),
                );
              },
            ),
          ),
        ],
      ),
      body: Column(
        children: [
          // Offline-First Sync Engine Status Bar
          StreamBuilder<SyncStatus>(
            stream: _syncEngine.statusStream,
            initialData: _syncEngine.currentStatus,
            builder: (context, snapshot) {
              final status = snapshot.data ?? const SyncStatus();
              return Container(
                padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                color: status.isOnline
                    ? (status.pendingMutationsCount > 0 ? Colors.amber.shade900.withOpacity(0.3) : AppColors.surfaceLight)
                    : Colors.rose.shade900.withOpacity(0.4),
                child: Row(
                  children: [
                    Container(
                      width: 8,
                      height: 8,
                      decoration: BoxDecoration(
                        shape: BoxShape.circle,
                        color: status.isOnline ? AppColors.primaryLight : Colors.roseAccent,
                      ),
                    ),
                    const SizedBox(width: 10),
                    Expanded(
                      child: Text(
                        status.isOnline
                            ? (status.isSyncing
                                ? 'Auto-syncing queued mutations with cloud...'
                                : (status.pendingMutationsCount > 0
                                    ? '${status.pendingMutationsCount} local change(s) queued for sync'
                                    : 'Offline Database Ready • Synced with Cloud'))
                            : 'Offline Mode: All edits are stored locally and will sync automatically upon reconnection',
                        style: TextStyle(
                          color: status.isOnline ? AppColors.textSecondary : Colors.rose.shade200,
                          fontSize: 11,
                          fontWeight: FontWeight.w500,
                        ),
                      ),
                    ),
                    if (matrix.cloudSync && status.isOnline && !status.isSyncing)
                      InkWell(
                        onTap: () => _syncEngine.triggerAutoSync(),
                        child: const Padding(
                          padding: EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                          child: Icon(Icons.sync_rounded, color: AppColors.primaryLight, size: 18),
                        ),
                      ),
                  ],
                ),
              );
            },
          ),

          // Cheque Register List
          Expanded(
            child: _cheques.isEmpty
                ? Center(
                    child: Column(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        Icon(Icons.receipt_long_rounded, color: AppColors.border, size: 56),
                        const SizedBox(height: 12),
                        const Text(
                          'No Cheques in Ledger',
                          style: TextStyle(color: Colors.white, fontSize: 16, fontWeight: FontWeight.bold),
                        ),
                        const SizedBox(height: 4),
                        const Text(
                          'Tap + to register a cheque leaf offline.',
                          style: TextStyle(color: AppColors.textMuted, fontSize: 12),
                        ),
                      ],
                    ),
                  )
                : ListView.separated(
                    padding: const EdgeInsets.all(16),
                    itemCount: _cheques.length,
                    separatorBuilder: (_, __) => const SizedBox(height: 10),
                    itemBuilder: (context, index) {
                      final item = _cheques[index];
                      return Container(
                        padding: const EdgeInsets.all(14),
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
                                color: AppColors.primary.withOpacity(0.12),
                                borderRadius: BorderRadius.circular(12),
                              ),
                              child: const Icon(Icons.payment_rounded, color: AppColors.primaryLight, size: 22),
                            ),
                            const SizedBox(width: 14),
                            Expanded(
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Row(
                                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                    children: [
                                      Text(
                                        '#${item.chequeNumber}',
                                        style: const TextStyle(
                                          color: AppColors.primaryLight,
                                          fontWeight: FontWeight.bold,
                                          fontSize: 13,
                                        ),
                                      ),
                                      Text(
                                        'NPR ${item.amount.toStringAsFixed(2)}',
                                        style: const TextStyle(
                                          color: Colors.white,
                                          fontWeight: FontWeight.w800,
                                          fontSize: 14,
                                        ),
                                      ),
                                    ],
                                  ),
                                  const SizedBox(height: 3),
                                  Text(
                                    item.payeeName,
                                    style: const TextStyle(color: Colors.white, fontSize: 13, fontWeight: FontWeight.w600),
                                  ),
                                  const SizedBox(height: 2),
                                  Text(
                                    '${item.bankName} • Due: ${item.dueDateBS} (${item.dueDateAD})',
                                    style: const TextStyle(color: AppColors.textMuted, fontSize: 11),
                                  ),
                                ],
                              ),
                            ),
                          ],
                        ),
                      );
                    },
                  ),
          ),
        ],
      ),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: _showAddChequeSheet,
        backgroundColor: AppColors.primary,
        icon: const Icon(Icons.add_rounded, color: Colors.white),
        label: const Text('New Cheque', style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold)),
      ),
    );
  }
}
