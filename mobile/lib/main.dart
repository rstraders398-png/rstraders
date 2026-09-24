import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'core/constants/app_constants.dart';
import 'core/database/offline_database.dart';
import 'features/auth/screens/login_screen.dart';
import 'features/cheques/models/cheque_record.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();

  // Dark navigation and status bar style
  SystemChrome.setSystemUIOverlayStyle(
    const SystemUiOverlayStyle(
      statusBarColor: Colors.transparent,
      statusBarIconBrightness: Brightness.light,
      systemNavigationBarColor: AppColors.background,
      systemNavigationBarIconBrightness: Brightness.light,
    ),
  );

  // Initialize Hive offline database
  final db = OfflineDatabase();
  await db.initialize();

  // Seed initial demo cheques if local storage is fresh
  if (db.chequesBox.isEmpty) {
    await db.saveCheque(
      ChequeRecord(
        id: 'seed_cq_001',
        companyCode: '1001',
        chequeNumber: 'CHQ-882190',
        payeeName: 'Global Traders Pvt. Ltd.',
        amount: 150000.0,
        amountInWords: 'One Lakh Fifty Thousand Rupees Only',
        bankName: 'Nabil Bank Ltd.',
        accountNumber: '0010012345678',
        status: 'Pending',
        dueDateBS: '2081-11-20',
        dueDateAD: '2025-03-04',
        issuedDateBS: '2081-11-01',
        issuedDateAD: '2025-02-13',
        isSynced: true,
      ),
    );
    await db.saveCheque(
      ChequeRecord(
        id: 'seed_cq_002',
        companyCode: '1001',
        chequeNumber: 'CHQ-882191',
        payeeName: 'Himalayan Cement Industries',
        amount: 320000.0,
        amountInWords: 'Three Lakh Twenty Thousand Rupees Only',
        bankName: 'NIC Asia Bank Ltd.',
        accountNumber: '0420089234120',
        status: 'Partially Paid',
        dueDateBS: '2081-11-25',
        dueDateAD: '2025-03-09',
        issuedDateBS: '2081-11-05',
        issuedDateAD: '2025-02-17',
        isSynced: true,
      ),
    );
  }

  runApp(
    const ProviderScope(
      child: ChequeDeskMobileApp(),
    ),
  );
}

class ChequeDeskMobileApp extends StatelessWidget {
  const ChequeDeskMobileApp({Key? key}) : super(key: key);

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: AppConstants.appName,
      debugShowCheckedModeBanner: false,
      theme: ThemeData(
        brightness: Brightness.dark,
        scaffoldBackgroundColor: AppColors.background,
        primaryColor: AppColors.primary,
        colorScheme: const ColorScheme.dark(
          primary: AppColors.primary,
          secondary: AppColors.primaryLight,
          surface: AppColors.surface,
          background: AppColors.background,
        ),
        fontFamily: 'Inter',
      ),
      home: const LoginScreen(),
    );
  }
}
