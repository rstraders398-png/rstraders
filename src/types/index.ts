export type PartyType = 'Sundry Debtors' | 'Sundry Creditors';

export interface Party {
  id: string;
  company_id: string;
  name: string;
  phone?: string;
  address?: string;
  pan_vat?: string;
  email?: string;
  party_type?: PartyType;
  created_at: string;
}

export interface Bank {
  id: string;
  company_id: string;
  name: string;
  code?: string;
  created_at: string;
}

export type ChequeStatus = 'Pending' | 'Partially Paid' | 'Cleared';

export interface Cheque {
  id: string;
  company_id: string;
  cheque_number: string;
  bill_number?: string;
  account_number?: string;
  bank_id?: string | null;
  party_id?: string | null;
  amount: number;
  remaining_amount: number;
  issue_date_bs: string;
  issue_date_ad: string;
  due_date_bs: string;
  due_date_ad: string;
  status: ChequeStatus;
  notes?: string;
  created_at: string;
  entered_by?: string;
  updated_by?: string;
}

export type PaymentMode = 'Cash' | 'IPS' | 'ConnectIPS' | 'Fonepay QR' | 'Bank Transfer' | 'Cheque' | 'Bank Deposit' | string;

export interface PaymentLog {
  id: string;
  cheque_id: string;
  company_id?: string;
  party_id?: string;
  amount: number;
  payment_mode: PaymentMode;
  payment_type?: 'Received' | 'Payment';
  payment_date_bs: string;
  payment_date_ad: string;
  notes?: string;
  created_at: string;
  recorded_by?: string;
}

export interface CreateChequeInput {
  company_id: string;
  cheque_number: string;
  bill_number?: string;
  account_number?: string;
  bank_id?: string | null;
  party_id?: string | null;
  amount: number;
  issue_date_bs: string;
  issue_date_ad: string;
  due_date_bs: string;
  due_date_ad: string;
  status?: ChequeStatus;
  notes?: string;
  entered_by?: string;
  updated_by?: string;
}

export interface RecordPaymentInput {
  company_id: string;
  cheque_id: string;
  amount: number;
  payment_mode: PaymentMode;
  payment_type?: 'Received' | 'Payment';
  payment_date_bs: string;
  payment_date_ad: string;
  notes?: string;
  recorded_by?: string;
  party_id?: string;
}

export type SubscriptionPlan = 'Starter' | 'Professional' | 'Enterprise';
export type SubscriptionStatus = 'Active' | 'Trial' | 'Expired' | 'Suspended';
export type UserRole = 'super_admin' | 'company_admin' | 'accountant' | 'viewer';
export type FeatureCategory = 'core' | 'communication' | 'analytics' | 'finance' | 'security' | 'integration' | 'advanced';

export interface SystemFeature {
  id: string; // unique identifier / key e.g. 'sms_notifications'
  key: string; // feature toggle key e.g. 'sms_notifications' or 'SMS_NOTIFICATIONS'
  name: string; // readable title e.g. 'SMS & WhatsApp Notifications'
  description: string;
  category: FeatureCategory;
  icon?: string; // lucide icon identifier e.g. 'Smartphone'
  badge?: string; // e.g. 'New v2.4', 'Popular', 'Automated'
  default_enabled: boolean;
  source_module?: string; // e.g. 'Software Release v2.4.1', 'Core Engine'
  created_at?: string;
}

export interface CompanyFeatures {
  cheque_printing?: boolean;
  partial_payments?: boolean;
  nepali_bs_calendar?: boolean;
  sms_whatsapp_alerts?: boolean;
  bank_reconciliation?: boolean;
  audit_logs?: boolean;
  multi_user_rbac?: boolean;
  export_reports?: boolean;
  sms_notifications?: boolean;
  advanced_reports?: boolean;
  bulk_cheque_import?: boolean;
  connectips_gateway?: boolean;
  custom_theme_customizer?: boolean;
  offline_backup_system?: boolean;
  enable_sales_discount?: boolean;
  [key: string]: boolean | undefined;
}

export const DEFAULT_COMPANY_FEATURES: CompanyFeatures = {
  cheque_printing: true,
  partial_payments: true,
  nepali_bs_calendar: true,
  sms_whatsapp_alerts: true,
  bank_reconciliation: true,
  audit_logs: true,
  multi_user_rbac: true,
  export_reports: true,
  sms_notifications: false,
  advanced_reports: false,
  bulk_cheque_import: false,
  connectips_gateway: false,
  custom_theme_customizer: true,
  offline_backup_system: true,
};

export interface BackupConfig {
  localDiskPath: string;
  autoLocalBackup: boolean;
  backupTime: string;
  backupOnExit: boolean;
  autoEmailBackup: boolean;
  emailRecipient: string;
  emailRecipients?: string[];
  emailFrequency: 'daily' | 'weekly' | 'on_sync';
  cloudSnapshotEnabled: boolean;
  encryptionEnabled: boolean;
  lastLocalBackupAt: string | null;
  lastEmailBackupAt: string | null;
  lastCloudSnapshotAt: string | null;
}

export interface BackupHistoryItem {
  id: string;
  filename: string;
  timestamp: string;
  destination: 'local_disk' | 'email' | 'cloud';
  fileSize: string;
  format: 'bak' | 'json' | 'xlsx' | 'zip';
  recordsCount: { cheques: number; parties: number; banks: number; paymentLogs: number };
  status: 'success' | 'failed';
  notes?: string;
}

export interface Company {
  id: string;
  company_code?: string;
  name: string;
  owner_name?: string;
  contact_phone?: string;
  contact_email?: string;
  backup_emails?: string[];
  subscription_plan?: SubscriptionPlan;
  subscription_status?: SubscriptionStatus;
  expiry_date_bs?: string;
  expiry_date_ad?: string;
  monthly_fee?: number;
  is_active?: boolean;
  owner_uid?: string;
  created_at: string;
  sales_date?: string;
  features?: CompanyFeatures;
  admin_password?: string;
  plan_type?: string;
  subscription_expiry?: string;
  enable_sales_discount?: boolean;
}

export interface AppUser {
  uid: string;
  email: string;
  name: string;
  role: UserRole;
  company_id: string;
  company_name?: string;
  status: 'Active' | 'Inactive';
  created_at: string;
  last_login_at?: string;
}

export interface ImpersonationSession {
  isImpersonating: boolean;
  companyId: string;
  companyName: string;
  companyCode?: string;
  originalCompanyId: string;
  originalCompanyName: string;
  startedAt: string;
}

export type AuditEventType =
  | 'LOGIN'
  | 'ERROR'
  | 'CHEQUE_CREATED'
  | 'PAYMENT_RECORDED'
  | 'SUBSCRIPTION_EXTENDED'
  | 'USER_PROVISIONED'
  | 'COMPANY_CREATED'
  | 'COMPANY_UPDATED'
  | 'FEATURE_TOGGLED'
  | 'FEATURE_MODULE_REGISTERED'
  | 'SYSTEM_RELEASE_PUBLISHED'
  | 'IMPERSONATION_STARTED';

export interface AuditLog {
  id: string;
  company_id: string;
  company_name: string;
  user_email: string;
  event_type: AuditEventType;
  severity: 'info' | 'warning' | 'error';
  details: string;
  timestamp: string;
}

export interface SupportTicket {
  id: string;
  company_id: string;
  company_code?: string;
  company_name: string;
  title: string;
  description: string;
  priority: 'Low' | 'Medium' | 'High' | 'Critical';
  status: 'Open' | 'In Progress' | 'Resolved';
  created_at: string;
}

export interface SystemRelease {
  id: string;
  version: string;
  title: string;
  description: string;
  release_date: string;
  type: 'feature' | 'patch' | 'major';
  is_deployed: boolean;
  deployed_at?: string;
}
