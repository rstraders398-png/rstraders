class ChequeRecord {
  final String id;
  final String companyCode;
  final String chequeNumber;
  final String payeeName;
  final double amount;
  final String amountInWords;
  final String bankName;
  final String accountNumber;
  final String status; // 'Pending' | 'Partially Paid' | 'Cleared' | 'Bounced'
  final String dueDateBS;
  final String dueDateAD;
  final String issuedDateBS;
  final String issuedDateAD;
  final String remarks;
  final bool isSynced;
  final DateTime updatedAt;

  ChequeRecord({
    required this.id,
    required this.companyCode,
    required this.chequeNumber,
    required this.payeeName,
    required this.amount,
    required this.amountInWords,
    required this.bankName,
    required this.accountNumber,
    required this.status,
    required this.dueDateBS,
    required this.dueDateAD,
    required this.issuedDateBS,
    required this.issuedDateAD,
    this.remarks = '',
    this.isSynced = false,
    DateTime? updatedAt,
  }) : updatedAt = updatedAt ?? DateTime.now();

  Map<String, dynamic> toMap() => {
    'id': id,
    'companyCode': companyCode,
    'chequeNumber': chequeNumber,
    'payeeName': payeeName,
    'amount': amount,
    'amountInWords': amountInWords,
    'bankName': bankName,
    'accountNumber': accountNumber,
    'status': status,
    'dueDateBS': dueDateBS,
    'dueDateAD': dueDateAD,
    'issuedDateBS': issuedDateBS,
    'issuedDateAD': issuedDateAD,
    'remarks': remarks,
    'isSynced': isSynced,
    'updatedAt': updatedAt.toIso8601String(),
  };

  factory ChequeRecord.fromMap(Map<dynamic, dynamic> map) => ChequeRecord(
    id: map['id']?.toString() ?? '',
    companyCode: map['companyCode']?.toString() ?? '',
    chequeNumber: map['chequeNumber']?.toString() ?? '',
    payeeName: map['payeeName']?.toString() ?? '',
    amount: (map['amount'] as num?)?.toDouble() ?? 0.0,
    amountInWords: map['amountInWords']?.toString() ?? '',
    bankName: map['bankName']?.toString() ?? '',
    accountNumber: map['accountNumber']?.toString() ?? '',
    status: map['status']?.toString() ?? 'Pending',
    dueDateBS: map['dueDateBS']?.toString() ?? '',
    dueDateAD: map['dueDateAD']?.toString() ?? '',
    issuedDateBS: map['issuedDateBS']?.toString() ?? '',
    issuedDateAD: map['issuedDateAD']?.toString() ?? '',
    remarks: map['remarks']?.toString() ?? '',
    isSynced: map['isSynced'] == true,
    updatedAt: map['updatedAt'] != null
        ? DateTime.parse(map['updatedAt'])
        : DateTime.now(),
  );

  ChequeRecord copyWith({
    String? status,
    bool? isSynced,
    DateTime? updatedAt,
  }) {
    return ChequeRecord(
      id: id,
      companyCode: companyCode,
      chequeNumber: chequeNumber,
      payeeName: payeeName,
      amount: amount,
      amountInWords: amountInWords,
      bankName: bankName,
      accountNumber: accountNumber,
      status: status ?? this.status,
      dueDateBS: dueDateBS,
      dueDateAD: dueDateAD,
      issuedDateBS: issuedDateBS,
      issuedDateAD: issuedDateAD,
      remarks: remarks,
      isSynced: isSynced ?? this.isSynced,
      updatedAt: updatedAt ?? this.updatedAt,
    );
  }
}
