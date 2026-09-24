class SavedAccount {
  final String companyCode;
  final String companyName;
  final String username;
  final String authToken;
  final String role;
  final DateTime lastLogin;

  SavedAccount({
    required this.companyCode,
    required this.companyName,
    required this.username,
    required this.authToken,
    required this.role,
    required this.lastLogin,
  });

  Map<String, dynamic> toJson() => {
    'companyCode': companyCode,
    'companyName': companyName,
    'username': username,
    'authToken': authToken,
    'role': role,
    'lastLogin': lastLogin.toIso8601String(),
  };

  factory SavedAccount.fromJson(Map<String, dynamic> json) => SavedAccount(
    companyCode: json['companyCode'] ?? '',
    companyName: json['companyName'] ?? '',
    username: json['username'] ?? '',
    authToken: json['authToken'] ?? '',
    role: json['role'] ?? 'User',
    lastLogin: json['lastLogin'] != null ? DateTime.parse(json['lastLogin']) : DateTime.now(),
  );

  SavedAccount copyWith({
    String? companyCode,
    String? companyName,
    String? username,
    String? authToken,
    String? role,
    DateTime? lastLogin,
  }) {
    return SavedAccount(
      companyCode: companyCode ?? this.companyCode,
      companyName: companyName ?? this.companyName,
      username: username ?? this.username,
      authToken: authToken ?? this.authToken,
      role: role ?? this.role,
      lastLogin: lastLogin ?? this.lastLogin,
    );
  }
}
