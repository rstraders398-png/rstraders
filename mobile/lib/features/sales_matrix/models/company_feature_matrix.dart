class CompanyFeatureMatrix {
  final String companyCode;
  final bool biometricLogin;
  final bool offlineLocalBackup;
  final bool cloudSync;
  final bool printCheque;
  final bool importCheques;
  final bool advancedReports;
  final DateTime lastFetched;

  CompanyFeatureMatrix({
    required this.companyCode,
    this.biometricLogin = true,
    this.offlineLocalBackup = true,
    this.cloudSync = true,
    this.printCheque = true,
    this.importCheques = true,
    this.advancedReports = true,
    DateTime? lastFetched,
  }) : lastFetched = lastFetched ?? DateTime.now();

  Map<String, dynamic> toMap() => {
    'companyCode': companyCode,
    'biometricLogin': biometricLogin,
    'offlineLocalBackup': offlineLocalBackup,
    'cloudSync': cloudSync,
    'printCheque': printCheque,
    'importCheques': importCheques,
    'advancedReports': advancedReports,
    'lastFetched': lastFetched.toIso8601String(),
  };

  factory CompanyFeatureMatrix.fromMap(Map<String, dynamic> map) => CompanyFeatureMatrix(
    companyCode: map['companyCode'] ?? '',
    biometricLogin: map['biometricLogin'] ?? map['mobile_biometrics'] ?? true,
    offlineLocalBackup: map['offlineLocalBackup'] ?? map['mobile_offline_backup'] ?? true,
    cloudSync: map['cloudSync'] ?? map['mobile_cloud_sync'] ?? true,
    printCheque: map['printCheque'] ?? map['print_cheque'] ?? true,
    importCheques: map['importCheques'] ?? map['import_cheques'] ?? true,
    advancedReports: map['advancedReports'] ?? map['excel_pdf_export'] ?? true,
    lastFetched: map['lastFetched'] != null ? DateTime.parse(map['lastFetched']) : DateTime.now(),
  );

  factory CompanyFeatureMatrix.allEnabled(String code) => CompanyFeatureMatrix(
    companyCode: code,
    biometricLogin: true,
    offlineLocalBackup: true,
    cloudSync: true,
    printCheque: true,
    importCheques: true,
    advancedReports: true,
  );
}
