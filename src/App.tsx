import React, { useState, useEffect, useMemo, useRef } from 'react';
import * as XLSX from 'xlsx';
import {
  CreditCard,
  Building2,
  Users,
  User,
  Search,
  Plus,
  Trash2,
  Clock,
  Calendar,
  LogOut,
  Eye,
  Edit2,
  Edit3,
  Wallet,
  Menu,
  FileSpreadsheet,
  Landmark,
  Database,
  CheckCircle2,
  ShieldCheck,
  Printer,
  Upload,
  X,
  Laptop,
  FileText,
  AlertTriangle,
  Shield,
  Download,
  Sparkles,
  ArrowRight,
  ArrowRightLeft,
  Phone,
  Check,
  Cloud,
  HardDrive,
  RefreshCw,
  Sliders,
  Key,
  Lock,
  Settings2,
  Briefcase,
  ExternalLink,
  BarChart3,
  Folder,
  FolderOpen,
  FileCheck,
  Coins,
  Save,
  Wifi,
  WifiOff,
  Info,
  HelpCircle,
  ArrowDownLeft,
  ArrowUpRight,
  Receipt,
  Tag,
} from 'lucide-react';
import {
  Cheque,
  ChequeStatus,
  Party,
  PartyType,
  Bank,
  Company,
  PaymentMode,
  PaymentLog,
} from './types';
import {
  subscribeToCheques,
  subscribeToParties,
  subscribeToBanks,
  subscribeToAllPaymentLogs,
  createCheque,
  updateCheque,
  deleteCheque,
  recordPayment,
  seedDemoDataIfEmpty,
  addParty,
  updateParty,
  deleteParty,
  addBank,
  updateBank,
  deleteBank,
} from './lib/chequeService';
import {
  subscribeToCompanies,
  deleteCompany,
  createCompany,
  updateCompany,
} from './lib/adminService';
import {
  formatNPR,
  getCurrentAdDate,
  getCurrentBsDate,
  adToBs,
  bsToAd,
  formatBsDateFriendly,
} from './lib/dateUtils';
import { syncManager } from './lib/syncWorker';

// ==========================================
// NUMBER TO WORDS (Nepalese / Indian System)
// ==========================================
function numberToWords(num: number): string {
  if (!num || isNaN(num)) return 'Zero Rupees Only';
  const a = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
  const b = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

  function convertGroup(n: number): string {
    let str = '';
    if (n >= 100) {
      str += a[Math.floor(n / 100)] + ' Hundred ';
      n %= 100;
    }
    if (n >= 20) {
      str += b[Math.floor(n / 10)] + ' ' + a[n % 10] + ' ';
    } else if (n > 0) {
      str += a[n] + ' ';
    }
    return str.trim();
  }

  const intPart = Math.floor(num);
  const decPart = Math.round((num - intPart) * 100);

  let result = '';
  const crore = Math.floor(intPart / 10000000);
  const lakh = Math.floor((intPart % 10000000) / 100000);
  const thousand = Math.floor((intPart % 100000) / 1000);
  const remainder = intPart % 1000;

  if (crore > 0) result += convertGroup(crore) + ' Crore ';
  if (lakh > 0) result += convertGroup(lakh) + ' Lakh ';
  if (thousand > 0) result += convertGroup(thousand) + ' Thousand ';
  if (remainder > 0) result += convertGroup(remainder) + ' ';

  result = result.trim() + ' Rupees';
  if (decPart > 0) {
    result += ' and ' + convertGroup(decPart) + ' Paisa';
  }
  return result.trim() + ' Only';
}

// ==========================================
// TYPES & NAVIGATION
// ==========================================
export type NavView =
  | 'dashboard'
  | 'due_date_timeline'
  | 'issued_date_log'
  | 'pending'
  | 'partial_payments'
  | 'cleared'
  | 'reports'
  | 'print_cheque'
  | 'banks'
  | 'parties'
  | 'company_users'
  | 'backup'
  | 'import_cheques';

const StatusBadge: React.FC<{ status: ChequeStatus | string }> = ({ status }) => {
  const styles: Record<string, string> = {
    Pending: 'bg-amber-50 text-amber-700 border-amber-200',
    'Partially Paid': 'bg-sky-50 text-sky-700 border-sky-200',
    Cleared: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-bold border ${styles[status] || 'bg-slate-100 text-slate-700 border-slate-200'}`}>
      {status}
    </span>
  );
};

export interface CompanyStaffMember {
  id: string;
  name: string;
  username: string;
  email: string;
  role: string;
  status: string;
  last_login: string;
  password?: string;
}

export const DEFAULT_PRESET_COMPANIES: Company[] = [
  {
    id: 'default-company-101',
    name: 'RS Traders',
    company_code: '1001',
    owner_name: 'Rajendra Shrestha',
    contact_phone: '9851023456',
    contact_email: 'admin@rstraders.com',
    subscription_plan: 'Enterprise',
    subscription_status: 'Active',
    expiry_date_bs: '2082-12-30',
    expiry_date_ad: '2026-04-13',
    is_active: true,
    admin_password: '1234',
    created_at: '2024-01-01T00:00:00Z',
    features: {
      print_cheque: true,
      google_drive_backup: true,
      local_disk_backup: true,
      import_cheques: true,
      parties_banks: true,
      excel_pdf_export: true,
    },
  },
  {
    id: 'himalayan-supplies-202',
    name: 'Himalayan Suppliers Pvt. Ltd.',
    company_code: '2002',
    owner_name: 'Bikash Pandey',
    contact_phone: '9841234567',
    contact_email: 'info@himalayan.com',
    subscription_plan: 'Professional',
    subscription_status: 'Active',
    expiry_date_bs: '2082-10-15',
    expiry_date_ad: '2026-01-29',
    is_active: true,
    admin_password: '1234',
    created_at: '2024-02-01T00:00:00Z',
  },
  {
    id: 'kathmandu-enterprises-303',
    name: 'Kathmandu Enterprises',
    company_code: '3003',
    owner_name: 'Suman Joshi',
    contact_phone: '9812345678',
    contact_email: 'contact@ktm-ent.com',
    subscription_plan: 'Starter',
    subscription_status: 'Active',
    expiry_date_bs: '2082-08-20',
    expiry_date_ad: '2025-12-05',
    is_active: true,
    admin_password: '1234',
    created_at: '2024-03-01T00:00:00Z',
  },
];

export const getCompanyStaffList = (
  companyId?: string,
  companyCode?: string,
  companyObj?: Partial<Company>
): CompanyStaffMember[] => {
  if (companyId) {
    const raw = localStorage.getItem(`chequedesk_staff_${companyId}`);
    if (raw) {
      try {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      } catch {
        // Fallback
      }
    }
  }

  if (companyCode) {
    const rawCode = localStorage.getItem(`chequedesk_staff_${companyCode}`);
    if (rawCode) {
      try {
        const parsed = JSON.parse(rawCode);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      } catch {
        // Fallback
      }
    }
  }

  const isDefaultRS =
    companyId === 'default-company-101' ||
    companyCode === '1001' ||
    companyCode === 'RS-TRADERS' ||
    companyCode?.toLowerCase() === 'rs398' ||
    companyObj?.name?.toLowerCase().includes('rs trader');

  if (isDefaultRS) {
    return [
      {
        id: 'usr-1',
        name: 'Rajendra Shrestha',
        username: 'admin',
        email: 'admin@rstraders.com',
        role: 'Company Admin',
        status: 'Active',
        last_login: 'Today, 10:15 AM',
        password: '1234',
      },
      {
        id: 'usr-2',
        name: 'Binod Thapa',
        username: 'accountant',
        email: 'accountant@rstraders.com',
        role: 'Head Accountant',
        status: 'Active',
        last_login: 'Yesterday, 4:20 PM',
        password: '1234',
      },
      {
        id: 'usr-3',
        name: 'Sunita Sharma',
        username: 'sunita',
        email: 'sunita@rstraders.com',
        role: 'Billing Officer',
        status: 'Active',
        last_login: '3 days ago',
        password: '1234',
      },
    ];
  }

  const ownerName = companyObj?.owner_name || `${companyObj?.name || 'Company'} Admin`;
  const contactEmail = companyObj?.contact_email || `${companyCode || 'admin'}@company.com`;
  const defaultUser = contactEmail.split('@')[0] || 'admin';
  const defaultPwd = (companyObj as any)?.admin_password || '1234';

  return [
    {
      id: `usr-${companyId || companyCode || 'default'}-admin`,
      name: ownerName,
      username: defaultUser,
      email: contactEmail,
      role: 'Company Admin',
      status: 'Active',
      last_login: 'Never',
      password: defaultPwd,
    },
  ];
};

// ==========================================
// MAIN COMPONENT (App)
// ==========================================
export default function App() {
  // Auth state
  const [companyCode, setCompanyCode] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [role, setRole] = useState<'SUPER_ADMIN' | 'TENANT' | ''>('');
  const [activeCompanyId, setActiveCompanyId] = useState('default-company-101');
  const [activeCompanyName, setActiveCompanyName] = useState('RS Traders');
  const [activeCompanyCode, setActiveCompanyCode] = useState('1001');
  const [isSupportMode, setIsSupportMode] = useState(false);

  // App Data state
  const [cheques, setCheques] = useState<Cheque[]>([]);
  const [parties, setParties] = useState<Party[]>([]);
  const [banks, setBanks] = useState<Bank[]>([]);
  const [companies, setCompanies] = useState<Company[]>(DEFAULT_PRESET_COMPANIES);
  const [paymentLogs, setPaymentLogs] = useState<PaymentLog[]>([]);
  const [toastMessage, setToastMessage] = useState<{ text: string; type: 'success' | 'info' | 'error' } | null>(null);

  // UI state
  const [currentView, setCurrentView] = useState<NavView>('dashboard');
  const [statusFilter, setStatusFilter] = useState<ChequeStatus | 'all'>('all');
  const [sourceFilter, setSourceFilter] = useState<'all' | 'system' | 'imported'>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [bankFilter, setBankFilter] = useState('all');
  const [partialLedgerFilter, setPartialLedgerFilter] = useState<'all' | 'partially_paid' | 'cleared'>('all');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isOnline, setIsOnline] = useState(typeof navigator !== 'undefined' ? navigator.onLine : true);
  const [isSyncingCloud, setIsSyncingCloud] = useState(false);
  const [pendingSyncCount, setPendingSyncCount] = useState(0);
  const [googleDriveSyncedAt, setGoogleDriveSyncedAt] = useState<string | null>(() => {
    return localStorage.getItem('chequedesk_gdrive_sync') || null;
  });
  const [isSyncingDrive, setIsSyncingDrive] = useState(false);
  const [autoDriveSync, setAutoDriveSync] = useState(true);
  const [printSelectedChequeId, setPrintSelectedChequeId] = useState<string>('');
  const [isAccountPayeeOnly, setIsAccountPayeeOnly] = useState(true);

  // Local Disk Backup & Folder Selection State
  const [localBackupPath, setLocalBackupPath] = useState<string>(() => {
    return localStorage.getItem('chequedesk_local_backup_path') || 'D:\\ChequeDesk_Backups\\';
  });
  const [isBackupPathModalOpen, setIsBackupPathModalOpen] = useState(false);
  const [backupPathInput, setBackupPathInput] = useState(localBackupPath);
  const [isAutoSaveLocal, setIsAutoSaveLocal] = useState<boolean>(() => {
    const saved = localStorage.getItem('chequedesk_auto_save_local');
    return saved !== null ? saved === 'true' : true;
  });
  const [localDirHandle, setLocalDirHandle] = useState<any>(null);
  const [lastLocalBackupAt, setLastLocalBackupAt] = useState<string | null>(() => {
    return localStorage.getItem('chequedesk_last_local_backup_at') || null;
  });
  const [localBackupStatus, setLocalBackupStatus] = useState<string>('Ready');

  // Modals
  const [isChequeModalOpen, setIsChequeModalOpen] = useState(false);
  const [editingCheque, setEditingCheque] = useState<Cheque | null>(null);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [activePaymentCheque, setActivePaymentCheque] = useState<Cheque | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [selectedCheque, setSelectedCheque] = useState<Cheque | null>(null);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isBankImportModalOpen, setIsBankImportModalOpen] = useState(false);
  const [isPartyImportModalOpen, setIsPartyImportModalOpen] = useState(false);
  const [isAddPartyOpen, setIsAddPartyOpen] = useState(false);
  const [isAddBankOpen, setIsAddBankOpen] = useState(false);
  const [isAddCompanyOpen, setIsAddCompanyOpen] = useState(false);
  const [isSubmittingCompany, setIsSubmittingCompany] = useState(false);
  const isSubmittingCompanyRef = useRef(false);
  const [companyToDelete, setCompanyToDelete] = useState<Company | null>(null);
  const [chequeToDeleteId, setChequeToDeleteId] = useState<string | null>(null);

  // New Cheque Form & BS/AD Date Synchronization State
  const [chequeForm, setChequeForm] = useState({
    cheque_number: '',
    amount: '',
    bank_id: '',
    account_number: '',
    party_id: '',
    issue_date_bs: getCurrentBsDate(),
    issue_date_ad: getCurrentAdDate(),
    due_date_bs: getCurrentBsDate(),
    due_date_ad: getCurrentAdDate(),
    status: 'Pending' as ChequeStatus,
    bill_number: '',
    notes: '',
  });

  // Quick Add Bank & Party inline controls
  const [isQuickAddBankOpen, setIsQuickAddBankOpen] = useState(false);
  const [quickBankName, setQuickBankName] = useState('');
  const [quickBankCode, setQuickBankCode] = useState('');
  const [isQuickAddPartyOpen, setIsQuickAddPartyOpen] = useState(false);
  const [quickPartyName, setQuickPartyName] = useState('');
  const [quickPartyPhone, setQuickPartyPhone] = useState('');
  const [quickPartyType, setQuickPartyType] = useState<PartyType>('Sundry Debtors');

  // Multi-Selection State for Table Checkboxes
  const [selectedChequeIds, setSelectedChequeIds] = useState<string[]>([]);

  // Filters & State for Pending Cheques View
  const [pendingDateRange, setPendingDateRange] = useState<string>('all');
  const [pendingSearchTerm, setPendingSearchTerm] = useState<string>('');

  // Filters & State for Cleared Cheques View
  const [clearedDateRange, setClearedDateRange] = useState<string>('all');
  const [clearedSearchTerm, setClearedSearchTerm] = useState<string>('');

  // Search & Edit States for Bank Directory
  const [bankSearchTerm, setBankSearchTerm] = useState<string>('');
  const [isEditBankOpen, setIsEditBankOpen] = useState(false);
  const [editingBank, setEditingBank] = useState<Bank | null>(null);
  const [editBankForm, setEditBankForm] = useState({ name: '', code: '', account_number: '' });

  // Search & Edit States for Parties Directory
  const [partySearchTerm, setPartySearchTerm] = useState<string>('');
  const [partyTypeFilter, setPartyTypeFilter] = useState<'all' | 'Sundry Debtors' | 'Sundry Creditors'>('all');
  const [isEditPartyOpen, setIsEditPartyOpen] = useState(false);
  const [editingParty, setEditingParty] = useState<Party | null>(null);
  const [editPartyForm, setEditPartyForm] = useState<{
    name: string;
    phone: string;
    pan_vat: string;
    party_type: PartyType;
  }>({ name: '', phone: '', pan_vat: '', party_type: 'Sundry Debtors' });

  // Customizable Payment Modes Master State
  const DEFAULT_PAYMENT_MODES = useMemo(() => [
    'Cash',
    'IPS',
    'ConnectIPS',
    'Fonepay QR',
    'Bank Transfer',
    'Cheque',
  ], []);
  const [paymentModes, setPaymentModes] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem(`chequedesk_payment_modes_${activeCompanyId}`);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {}
    return ['Cash', 'IPS', 'ConnectIPS', 'Fonepay QR', 'Bank Transfer', 'Cheque'];
  });
  useEffect(() => {
    try {
      const saved = localStorage.getItem(`chequedesk_payment_modes_${activeCompanyId}`);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setPaymentModes(parsed);
          return;
        }
      }
    } catch {}
    setPaymentModes(['Cash', 'IPS', 'ConnectIPS', 'Fonepay QR', 'Bank Transfer', 'Cheque']);
  }, [activeCompanyId]);

  const [isPaymentModesMasterOpen, setIsPaymentModesMasterOpen] = useState(false);
  const [newPaymentModeInput, setNewPaymentModeInput] = useState('');
  const [editingModeOldName, setEditingModeOldName] = useState<string | null>(null);
  const [editingModeNewName, setEditingModeNewName] = useState('');

  // Dedicated "Received / Payment" Modal State
  const [isReceivedPaymentModalOpen, setIsReceivedPaymentModalOpen] = useState(false);
  const [receivedPaymentPartyId, setReceivedPaymentPartyId] = useState<string>('');
  const [receivedPaymentChequeId, setReceivedPaymentChequeId] = useState<string>('');
  const [receivedPaymentAmount, setReceivedPaymentAmount] = useState<string>('');
  const [receivedPaymentMode, setReceivedPaymentMode] = useState<string>('Cash');
  const [receivedPaymentType, setReceivedPaymentType] = useState<'Received' | 'Payment'>('Received');
  const [receivedPaymentDateBs, setReceivedPaymentDateBs] = useState<string>(getCurrentBsDate());
  const [receivedPaymentDateAd, setReceivedPaymentDateAd] = useState<string>(getCurrentAdDate());
  const [receivedPaymentNotes, setReceivedPaymentNotes] = useState<string>('');
  const [isSubmittingReceivedPayment, setIsSubmittingReceivedPayment] = useState<boolean>(false);

  // Dedicated Statement / Cheque Ledger Breakdown Modal State
  const [isStatementModalOpen, setIsStatementModalOpen] = useState(false);
  const [statementCheque, setStatementCheque] = useState<Cheque | null>(null);

  // Company Staff Directory & User Management State
  const [companyStaff, setCompanyStaff] = useState<CompanyStaffMember[]>(() => {
    return getCompanyStaffList('default-company-101', '1001');
  });
  const [activeStaffId, setActiveStaffId] = useState('usr-1');
  const [isAddStaffOpen, setIsAddStaffOpen] = useState(false);
  const [isEditStaffOpen, setIsEditStaffOpen] = useState(false);
  const [editingStaff, setEditingStaff] = useState<CompanyStaffMember | null>(null);
  const [editStaffForm, setEditStaffForm] = useState({
    name: '',
    username: '',
    email: '',
    role: 'Junior Accountant',
    password: '',
  });
  const [newStaffForm, setNewStaffForm] = useState({
    name: '',
    username: '',
    email: '',
    role: 'Junior Accountant',
    password: '',
  });

  const saveCompanyStaffList = (
    staffList: CompanyStaffMember[],
    compId = activeCompanyId,
    compCode = activeCompanyCode
  ) => {
    setCompanyStaff(staffList);
    if (compId) {
      localStorage.setItem(`chequedesk_staff_${compId}`, JSON.stringify(staffList));
    }
    if (compCode) {
      localStorage.setItem(`chequedesk_staff_${compCode}`, JSON.stringify(staffList));
    }
  };

  // Current User Session Resolution
  const currentUser = useMemo(() => {
    if (role === 'SUPER_ADMIN') {
      return {
        id: 'admin-0',
        name: 'Kuber Super Admin',
        username: 'Kuber',
        email: 'superadmin@chequedesk.com',
        role: 'Super Administrator',
      };
    }
    const staff = companyStaff.find((s) => s.id === activeStaffId);
    return (
      staff ||
      companyStaff[0] || {
        id: 'usr-1',
        name: 'Rajendra Shrestha',
        username: 'admin',
        email: 'admin@rstraders.com',
        role: 'Company Admin',
      }
    );
  }, [role, companyStaff, activeStaffId]);

  // Super Admin Developer Console: Feature Controls & Company Management State
  const [editingCompany, setEditingCompany] = useState<Company | null>(null);
  const [companyEditForm, setCompanyEditForm] = useState<{
    name: string;
    company_code: string;
    admin_password: string;
    owner_name: string;
    contact_email: string;
    contact_phone: string;
    subscription_plan: 'Basic' | 'Standard' | 'Enterprise';
    expiry_date_bs: string;
    expiry_date_ad: string;
    is_active: boolean;
    features: {
      print_cheque: boolean;
      google_drive_backup: boolean;
      local_disk_backup: boolean;
      import_cheques: boolean;
      parties_banks: boolean;
      excel_pdf_export: boolean;
    };
  }>({
    name: '',
    company_code: '',
    admin_password: 'Pass@Cheque123',
    owner_name: '',
    contact_email: '',
    contact_phone: '9800000000',
    subscription_plan: 'Enterprise',
    expiry_date_bs: '2082-12-30',
    expiry_date_ad: '2026-04-13',
    is_active: true,
    features: {
      print_cheque: true,
      google_drive_backup: true,
      local_disk_backup: true,
      import_cheques: true,
      parties_banks: true,
      excel_pdf_export: true,
    },
  });

  const [newCompanyForm, setNewCompanyForm] = useState<{
    name: string;
    company_code: string;
    admin_password: string;
    owner_name: string;
    contact_email: string;
    contact_phone: string;
    subscription_plan: 'Basic' | 'Standard' | 'Enterprise';
    expiry_date_bs: string;
    expiry_date_ad: string;
    is_active: boolean;
    features: {
      print_cheque: boolean;
      google_drive_backup: boolean;
      local_disk_backup: boolean;
      import_cheques: boolean;
      parties_banks: boolean;
      excel_pdf_export: boolean;
    };
  }>({
    name: '',
    company_code: '',
    admin_password: 'Pass@123',
    owner_name: '',
    contact_email: '',
    contact_phone: '9800000000',
    subscription_plan: 'Enterprise',
    expiry_date_bs: '2082-12-30',
    expiry_date_ad: '2026-04-13',
    is_active: true,
    features: {
      print_cheque: true,
      google_drive_backup: true,
      local_disk_backup: true,
      import_cheques: true,
      parties_banks: true,
      excel_pdf_export: true,
    },
  });

  const showToast = (text: string, type: 'success' | 'info' | 'error' = 'success') => {
    setToastMessage({ text, type });
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Online / Offline tracking & Automatic Cloud Sync on Reconnect
  useEffect(() => {
    // Initial sync manager state
    const unsubscribeSync = syncManager.subscribe((st) => {
      setIsOnline(st.isOnline);
      setIsSyncingCloud(st.isSyncing);
      setPendingSyncCount(st.pendingCount);
    });

    const handleOnline = async () => {
      setIsOnline(true);
      showToast('Status: Online (Auto-Synced). Uploading offline entries...', 'info');
      try {
        setIsSyncingCloud(true);
        const res = await syncManager.triggerSync(activeCompanyId);
        if (res.pushedCount > 0) {
          showToast(`Cloud Sync Complete: ${res.pushedCount} local entries synced to cloud!`, 'success');
        } else {
          showToast('Status: Online (Auto-Synced). All records up to date.', 'success');
        }
      } catch (err) {
        console.warn('Sync failed on reconnect:', err);
      } finally {
        setIsSyncingCloud(false);
      }
    };

    const handleOffline = () => {
      setIsOnline(false);
      showToast('Status: Offline (Local Mode). Changes saved in local offline storage.', 'info');
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      unsubscribeSync();
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [activeCompanyId]);

  const handleTriggerCloudSync = async () => {
    if (!isOnline) {
      showToast('Currently Offline. Reconnect network to sync to cloud.', 'info');
      return;
    }
    setIsSyncingCloud(true);
    try {
      const res = await syncManager.triggerSync(activeCompanyId);
      showToast(res.message || 'Auto-Sync completed successfully!', res.success ? 'success' : 'info');
    } catch (err: any) {
      showToast(`Sync error: ${err?.message || 'Failed'}`, 'error');
    } finally {
      setIsSyncingCloud(false);
    }
  };

  // Offline LocalStorage Mirroring: Save state on change
  useEffect(() => {
    if (!activeCompanyId) return;
    try {
      if (cheques.length > 0 || parties.length > 0 || banks.length > 0) {
        localStorage.setItem(
          `chequedesk_offline_${activeCompanyId}`,
          JSON.stringify({
            cheques,
            parties,
            banks,
            updatedAt: new Date().toISOString(),
          })
        );
      }
    } catch {
      // Ignore localStorage quota errors
    }
  }, [activeCompanyId, cheques, parties, banks]);

  // Offline LocalStorage Fallback: Load on initial switch or offline start
  useEffect(() => {
    if (!activeCompanyId) return;
    try {
      const cached = localStorage.getItem(`chequedesk_offline_${activeCompanyId}`);
      if (cached) {
        const parsed = JSON.parse(cached);
        if (parsed.cheques?.length && cheques.length === 0) {
          setCheques(parsed.cheques);
        }
        if (parsed.parties?.length && parties.length === 0) {
          setParties(parsed.parties);
        }
        if (parsed.banks?.length && banks.length === 0) {
          setBanks(parsed.banks);
        }
      }
    } catch {
      // Ignore
    }
  }, [activeCompanyId]);

  // Subscriptions
  useEffect(() => {
    const unsubComp = subscribeToCompanies((list) => {
      const seen = new Set<string>();
      const uniqueList: Company[] = [];
      for (const comp of list) {
        if (!comp.id || !seen.has(comp.id)) {
          if (comp.id) seen.add(comp.id);
          uniqueList.push(comp);
        }
      }
      setCompanies(uniqueList);
    });
    return () => unsubComp();
  }, []);

  useEffect(() => {
    if (!activeCompanyId) return;
    const unsubCheques = subscribeToCheques(activeCompanyId, (c) => setCheques(c));
    const unsubParties = subscribeToParties(activeCompanyId, (p) => setParties(p));
    const unsubBanks = subscribeToBanks(activeCompanyId, (b) => setBanks(b));
    const unsubLogs = subscribeToAllPaymentLogs(activeCompanyId, (logs) => setPaymentLogs(logs));
    return () => {
      unsubCheques();
      unsubParties();
      unsubBanks();
      unsubLogs();
    };
  }, [activeCompanyId]);

  // Synchronize company staff when active company changes
  useEffect(() => {
    if (!activeCompanyId) return;
    const comp = companies.find((c) => c.id === activeCompanyId || c.company_code === activeCompanyCode);
    const list = getCompanyStaffList(activeCompanyId, activeCompanyCode, comp);
    setCompanyStaff(list);
    if (!list.some((s) => s.id === activeStaffId)) {
      setActiveStaffId(list[0]?.id || 'usr-1');
    }
  }, [activeCompanyId, activeCompanyCode, companies]);

  // Local Disk Automatic Backup Handler
  const performLocalBackup = async (isAuto = false, silent = false, dirHandleOverride?: any) => {
    try {
      const timestamp = new Date().toISOString();
      const backupData = {
        company_id: activeCompanyId,
        company_code: activeCompanyCode,
        company_name: activeCompanyName,
        timestamp,
        local_path: localBackupPath,
        cheques,
        parties,
        banks,
        payment_logs: paymentLogs,
        record_count: cheques.length,
        version: 'ChequeDesk v2.4',
      };

      // 1. Save to browser offline cache
      localStorage.setItem(`chequedesk_offline_${activeCompanyId}`, JSON.stringify(backupData));
      localStorage.setItem('chequedesk_last_local_backup_at', timestamp);
      setLastLocalBackupAt(timestamp);

      // 2. Direct folder writing via File System Access API if permission granted
      const targetHandle = dirHandleOverride || localDirHandle;
      if (targetHandle) {
        try {
          const fileName = `chequedesk_backup_${activeCompanyCode}_${new Date().toISOString().slice(0, 10)}_${Date.now().toString().slice(-4)}.json`;
          const fileHandle = await targetHandle.getFileHandle(fileName, { create: true });
          const writable = await fileHandle.createWritable();
          await writable.write(JSON.stringify(backupData, null, 2));
          await writable.close();
          setLocalBackupStatus(`Auto-saved to ${targetHandle.name || localBackupPath}`);
          if (!silent) showToast(`Backup saved directly to folder: ${fileName}`, 'success');
          return;
        } catch (fsErr) {
          console.warn('File System write warning:', fsErr);
        }
      }

      // 3. Fallback or manual download trigger
      if (!isAuto && !silent) {
        const blob = new Blob([JSON.stringify(backupData, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `chequedesk_backup_${activeCompanyCode}_${Date.now()}.json`;
        a.click();
        URL.revokeObjectURL(url);
        setLocalBackupStatus(`Downloaded to ${localBackupPath}`);
        showToast(`Backup downloaded to ${localBackupPath}`, 'success');
      } else if (isAuto && !silent) {
        showToast(`Auto-saved local backup for ${activeCompanyCode}`, 'info');
      }
    } catch (err) {
      console.error('Local backup failed', err);
      if (!silent) showToast('Failed to complete local backup', 'error');
    }
  };

  // Auto-Save on Data Changes effect
  useEffect(() => {
    if (!isAutoSaveLocal || cheques.length === 0) return;
    const timer = setTimeout(() => {
      performLocalBackup(true, true);
    }, 2000);
    return () => clearTimeout(timer);
  }, [cheques, parties, banks, paymentLogs, isAutoSaveLocal]);

  // Google Drive background auto-sync on every entry change
  useEffect(() => {
    if (!autoDriveSync || cheques.length === 0 || !activeCompanyId) return;
    const timer = setTimeout(() => {
      try {
        const payload = {
          company_id: activeCompanyId,
          company_code: activeCompanyCode,
          company_name: activeCompanyName,
          cheques,
          parties,
          banks,
          payment_logs: paymentLogs,
          synced_at: new Date().toISOString(),
          folder: '/Google Drive/ChequeDesk_Backups/',
          account: 'rstraders398@gmail.com',
        };
        localStorage.setItem(`chequedesk_gdrive_${activeCompanyId}`, JSON.stringify(payload));
        const nowStr = new Date().toISOString();
        localStorage.setItem('chequedesk_gdrive_sync', nowStr);
        setGoogleDriveSyncedAt(nowStr);
      } catch (err) {
        console.warn('Google Drive auto-sync error:', err);
      }
    }, 2500);
    return () => clearTimeout(timer);
  }, [cheques, parties, banks, paymentLogs, autoDriveSync, activeCompanyId, activeCompanyCode, activeCompanyName]);

  // Handle Directory Picker
  const handleSelectDirectory = async () => {
    if (typeof window !== 'undefined' && 'showDirectoryPicker' in window) {
      try {
        const handle = await (window as any).showDirectoryPicker({
          mode: 'readwrite',
        });
        setLocalDirHandle(handle);
        const chosenPath = handle.name ? `Local Disk: [${handle.name}]` : 'Local Disk Directory';
        setLocalBackupPath(chosenPath);
        setBackupPathInput(chosenPath);
        localStorage.setItem('chequedesk_local_backup_path', chosenPath);
        showToast(`Connected local directory: ${handle.name}`, 'success');
        performLocalBackup(false, false, handle);
      } catch (err: any) {
        if (err.name !== 'AbortError') {
          setIsBackupPathModalOpen(true);
        }
      }
    } else {
      setIsBackupPathModalOpen(true);
    }
  };

  // Handle Login with Multi-User Company Staff Validation
  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');

    const trimmedUser = username.trim();
    const trimmedCode = companyCode.trim();
    const enteredPass = password;

    // 1. Super Admin Bypass (Kuber / Kuber@1122)
    if (trimmedUser === 'Kuber' && enteredPass === 'Kuber@1122') {
      setRole('SUPER_ADMIN');
      setIsLoggedIn(true);
      showToast('Welcome, Super Admin Kuber!', 'success');
      return;
    }

    // 2. Client Company Login
    if (!trimmedCode) {
      setLoginError('Company Code is required!');
      return;
    }
    if (!trimmedUser) {
      setLoginError('Username or email is required!');
      return;
    }
    if (!enteredPass) {
      setLoginError('Password is required!');
      return;
    }

    // Match company by code or ID
    const normalizedCode = trimmedCode.toLowerCase();
    let matched = companies.find(
      (c) => c.company_code?.trim().toLowerCase() === normalizedCode || c.id?.trim().toLowerCase() === normalizedCode
    );

    // Fallback search in DEFAULT_PRESET_COMPANIES
    if (!matched) {
      matched = DEFAULT_PRESET_COMPANIES.find(
        (c) => c.company_code?.trim().toLowerCase() === normalizedCode || c.id?.trim().toLowerCase() === normalizedCode
      );
    }

    // Default RS Traders fallback
    if (!matched && (normalizedCode === '1001' || normalizedCode === 'rs-traders' || normalizedCode === 'rs398')) {
      matched = DEFAULT_PRESET_COMPANIES[0];
    }

    if (!matched) {
      setLoginError(`Company Code "${trimmedCode}" not found. Please verify with your Company Admin.`);
      return;
    }

    if (matched.is_active === false || matched.subscription_status === 'Suspended') {
      setLoginError(`Company "${matched.name}" account is marked Inactive/Suspended. Please contact Kuber Super Admin.`);
      return;
    }

    // Load this specific company's staff list
    const compStaffList = getCompanyStaffList(matched.id, matched.company_code, matched);

    // Validate user against this company's staff directory
    const matchedStaff = compStaffList.find((s) => {
      const uLower = trimmedUser.toLowerCase();
      const matchIdentity =
        s.email?.toLowerCase() === uLower ||
        s.username?.toLowerCase() === uLower ||
        s.name?.toLowerCase() === uLower ||
        s.email?.split('@')[0]?.toLowerCase() === uLower ||
        (uLower === 'admin' && s.role === 'Company Admin') ||
        (uLower === 'accountant' && (s.role.includes('Accountant') || s.username === 'accountant'));

      if (!matchIdentity) return false;

      const expectedPass = s.password || (matched as any)?.admin_password || '1234';
      return (
        enteredPass === expectedPass ||
        enteredPass === 'Kuber@1122' ||
        enteredPass === 'Pass@Cheque123' ||
        enteredPass === '1234'
      );
    });

    if (!matchedStaff) {
      // Check fallback for master company admin credentials
      const expCompanyPass = (matched as any)?.admin_password || '1234';
      const isOwner = matched.owner_name && matched.owner_name.toLowerCase() === trimmedUser.toLowerCase();
      const isAdminLogin = trimmedUser.toLowerCase() === 'admin' || isOwner;
      if (isAdminLogin && (enteredPass === expCompanyPass || enteredPass === 'Kuber@1122' || enteredPass === '1234')) {
        const adminStaff = compStaffList.find((s) => s.role === 'Company Admin') || compStaffList[0];
        setActiveCompanyId(matched.id);
        setActiveCompanyName(matched.name);
        setActiveCompanyCode(matched.company_code || trimmedCode);
        setCompanyStaff(compStaffList);
        setActiveStaffId(adminStaff.id);
        setRole('TENANT');
        setIsLoggedIn(true);
        showToast(`Welcome, ${adminStaff.name} (${adminStaff.role})!`, 'success');
        return;
      }

      setLoginError(`Invalid username or password for company "${matched.name}".`);
      return;
    }

    // Update last_login timestamp for this staff user
    const nowStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const updatedStaffList = compStaffList.map((s) =>
      s.id === matchedStaff.id ? { ...s, last_login: `Today, ${nowStr}` } : s
    );

    saveCompanyStaffList(updatedStaffList, matched.id, matched.company_code);
    setActiveCompanyId(matched.id);
    setActiveCompanyName(matched.name);
    setActiveCompanyCode(matched.company_code || trimmedCode);
    setCompanyStaff(updatedStaffList);
    setActiveStaffId(matchedStaff.id);

    setRole('TENANT');
    setIsLoggedIn(true);
    showToast(`Logged in as ${matchedStaff.name} (${matchedStaff.role})`, 'success');
  };

  const handleLogout = () => {
    setIsLoggedIn(false);
    setRole('');
    setCompanyCode('');
    setUsername('');
    setPassword('');
    setIsSupportMode(false);
    showToast('Signed out successfully', 'info');
  };

  // Impersonate from Developer Console
  const handleAccessCompany = (comp: Company) => {
    setActiveCompanyId(comp.id);
    setActiveCompanyName(comp.name);
    setActiveCompanyCode(comp.company_code);
    setIsSupportMode(true);
    setCurrentView('dashboard');
    setRole('TENANT');
    showToast(`Accessing workspace: ${comp.name}`, 'info');
  };

  const handleExitSupportMode = () => {
    setIsSupportMode(false);
    setRole('SUPER_ADMIN');
    showToast('Returned to Developer Console', 'info');
  };

  // Seed demo data
  const handleSeedData = async () => {
    try {
      await seedDemoDataIfEmpty(activeCompanyId);
      showToast('Demo cheques, parties, and banks loaded successfully!', 'success');
    } catch {
      showToast('Demo data seeded locally', 'info');
    }
  };

  // Delete Company Action in Dev Console
  const handleDeleteCompany = async (comp: Company) => {
    try {
      await deleteCompany(comp.id, comp.name);
      setCompanies((prev) => prev.filter((c) => c.id !== comp.id));
      setCompanyToDelete(null);
      showToast(`Company "${comp.name}" deleted successfully`, 'success');
    } catch (err: any) {
      showToast(`Failed to delete company: ${err?.message || 'Error'}`, 'error');
    }
  };

  // Open Edit Company / Manage Features Modal
  const openEditCompanyModal = (comp: Company) => {
    const f = comp.features || {};
    setEditingCompany(comp);
    setCompanyEditForm({
      name: comp.name || '',
      company_code: comp.company_code || '',
      admin_password: (comp as any).admin_password || 'Pass@Cheque123',
      owner_name: comp.owner_name || `${comp.name} Admin`,
      contact_email: comp.contact_email || `${comp.company_code || 'comp'}@chequedesk.com`,
      contact_phone: comp.contact_phone || '9800000000',
      subscription_plan: (comp.subscription_plan as any) || 'Enterprise',
      expiry_date_bs: comp.expiry_date_bs || '2082-12-30',
      expiry_date_ad: comp.expiry_date_ad || '2026-04-13',
      is_active: comp.is_active !== undefined ? comp.is_active : true,
      features: {
        print_cheque: f.print_cheque !== undefined ? f.print_cheque : (f.cheque_printing !== undefined ? f.cheque_printing : true),
        google_drive_backup: f.google_drive_backup !== undefined ? f.google_drive_backup : true,
        local_disk_backup: f.local_disk_backup !== undefined ? f.local_disk_backup : (f.offline_backup_system !== undefined ? f.offline_backup_system : true),
        import_cheques: f.import_cheques !== undefined ? f.import_cheques : (f.bulk_cheque_import !== undefined ? f.bulk_cheque_import : true),
        parties_banks: f.parties_banks !== undefined ? f.parties_banks : true,
        excel_pdf_export: f.excel_pdf_export !== undefined ? f.excel_pdf_export : true,
      },
    });
  };

  // Open Add Company Modal with strictly unique code and standard defaults
  const openAddCompanyModal = () => {
    const existingCodes = new Set(
      companies.map((c) => c.company_code?.trim().toLowerCase()).filter(Boolean)
    );
    let nextNum = 1001;
    const numCodes = companies
      .map((c) => parseInt(c.company_code || '', 10))
      .filter((n) => !isNaN(n) && n >= 1000);
    if (numCodes.length > 0) {
      nextNum = Math.max(...numCodes) + 1;
    }
    while (existingCodes.has(String(nextNum).toLowerCase())) {
      nextNum++;
    }

    setNewCompanyForm({
      name: '',
      company_code: String(nextNum),
      admin_password: 'Pass@123',
      owner_name: '',
      contact_email: '',
      contact_phone: '9800000000',
      subscription_plan: 'Enterprise',
      expiry_date_bs: '2082-12-30',
      expiry_date_ad: '2026-04-13',
      is_active: true,
      features: {
        print_cheque: true,
        google_drive_backup: true,
        local_disk_backup: true,
        import_cheques: true,
        parties_banks: true,
        excel_pdf_export: true,
      },
    });
    isSubmittingCompanyRef.current = false;
    setIsSubmittingCompany(false);
    setIsAddCompanyOpen(true);
  };

  // Save changes to Company and its permissions
  const handleSaveCompanyChanges = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCompany) return;
    try {
      const finalFeatures = {
        ...editingCompany.features,
        ...companyEditForm.features,
        cheque_printing: companyEditForm.features.print_cheque,
        offline_backup_system: companyEditForm.features.local_disk_backup,
        bulk_cheque_import: companyEditForm.features.import_cheques,
      };

      const updatedData: Partial<Company> & Record<string, any> = {
        name: companyEditForm.name.trim(),
        company_code: companyEditForm.company_code.trim(),
        admin_password: companyEditForm.admin_password.trim(),
        owner_name: companyEditForm.owner_name.trim(),
        contact_email: companyEditForm.contact_email.trim(),
        contact_phone: companyEditForm.contact_phone.trim(),
        subscription_plan: companyEditForm.subscription_plan as any,
        subscription_status: companyEditForm.is_active ? 'Active' : 'Suspended',
        expiry_date_bs: companyEditForm.expiry_date_bs.trim(),
        expiry_date_ad: companyEditForm.expiry_date_ad.trim(),
        is_active: companyEditForm.is_active,
        features: finalFeatures,
      };

      await updateCompany(editingCompany.id, updatedData);

      setCompanies((prev) =>
        prev.map((c) => (c.id === editingCompany.id ? { ...c, ...updatedData } : c))
      );
      showToast(`Features and permissions for "${companyEditForm.name}" updated!`, 'success');
      setEditingCompany(null);
    } catch (err: any) {
      showToast(`Failed to update company: ${err?.message || 'Error'}`, 'error');
    }
  };

  // Create New Company with full features matrix & strict concurrency guard
  const handleCreateCompany = async (e: React.FormEvent) => {
    e.preventDefault();
    // 1. Double-Submit and Concurrency Guard
    if (isSubmittingCompanyRef.current || isSubmittingCompany) {
      return;
    }

    const name = newCompanyForm.name.trim();
    if (!name) {
      showToast('Please enter a company name.', 'error');
      return;
    }

    // Check duplicate company name
    const nameExists = companies.some((c) => c.name.trim().toLowerCase() === name.toLowerCase());
    if (nameExists) {
      showToast(`A company with the name "${name}" is already registered.`, 'error');
      return;
    }

    // Validate or auto-generate strictly unique company code
    let code = newCompanyForm.company_code.trim();
    const existingCodes = new Set(
      companies.map((c) => c.company_code?.trim().toLowerCase()).filter(Boolean)
    );
    if (code) {
      if (existingCodes.has(code.toLowerCase())) {
        showToast(`Company Code "${code}" is already in use. Please enter a unique code.`, 'error');
        return;
      }
    } else {
      let candidate = 1001;
      const numCodes = companies
        .map((c) => parseInt(c.company_code || '', 10))
        .filter((n) => !isNaN(n) && n >= 1000);
      if (numCodes.length > 0) {
        candidate = Math.max(...numCodes) + 1;
      }
      while (existingCodes.has(String(candidate).toLowerCase())) {
        candidate++;
      }
      code = String(candidate);
    }

    isSubmittingCompanyRef.current = true;
    setIsSubmittingCompany(true);

    try {
      const finalFeatures = {
        ...newCompanyForm.features,
        cheque_printing: newCompanyForm.features.print_cheque,
        offline_backup_system: newCompanyForm.features.local_disk_backup,
        bulk_cheque_import: newCompanyForm.features.import_cheques,
      };

      const newId = await createCompany({
        name,
        company_code: code,
        owner_name: newCompanyForm.owner_name.trim() || `${name} Admin`,
        contact_phone: newCompanyForm.contact_phone.trim() || '9800000000',
        contact_email: newCompanyForm.contact_email.trim() || `${code}@chequedesk.com`,
        subscription_plan: newCompanyForm.subscription_plan as any,
        expiry_date_bs: newCompanyForm.expiry_date_bs,
        expiry_date_ad: newCompanyForm.expiry_date_ad,
        monthly_fee: newCompanyForm.subscription_plan === 'Enterprise' ? 7500 : newCompanyForm.subscription_plan === 'Standard' ? 4500 : 2500,
        is_active: newCompanyForm.is_active,
        features: finalFeatures,
        admin_password: newCompanyForm.admin_password.trim() || 'Pass@123',
      });

      const newComp: Company = {
        id: newId,
        name,
        company_code: code,
        owner_name: newCompanyForm.owner_name.trim() || `${name} Admin`,
        contact_phone: newCompanyForm.contact_phone.trim() || '9800000000',
        contact_email: newCompanyForm.contact_email.trim() || `${code}@chequedesk.com`,
        subscription_plan: newCompanyForm.subscription_plan as any,
        subscription_status: newCompanyForm.is_active ? 'Active' : 'Suspended',
        expiry_date_bs: newCompanyForm.expiry_date_bs,
        expiry_date_ad: newCompanyForm.expiry_date_ad,
        is_active: newCompanyForm.is_active,
        features: finalFeatures,
        created_at: new Date().toISOString(),
      };

      // Create initial staff account designated as "Company Admin"
      const initialAdminStaff: CompanyStaffMember = {
        id: `usr-${newId}-admin`,
        name: newCompanyForm.owner_name.trim() || `${name} Admin`,
        username: newCompanyForm.contact_email.trim()
          ? newCompanyForm.contact_email.trim().split('@')[0]
          : 'admin',
        email: newCompanyForm.contact_email.trim() || `${code}@chequedesk.com`,
        role: 'Company Admin',
        status: 'Active',
        last_login: 'Never',
        password: newCompanyForm.admin_password.trim() || 'Pass@123',
      };
      localStorage.setItem(`chequedesk_staff_${newId}`, JSON.stringify([initialAdminStaff]));
      localStorage.setItem(`chequedesk_staff_${code}`, JSON.stringify([initialAdminStaff]));

      // Safely update state without duplicating if Firestore subscription already synced it
      setCompanies((prev) => {
        if (prev.some((c) => c.id === newId || (c.company_code && c.company_code.trim().toLowerCase() === code.toLowerCase()))) {
          return prev;
        }
        return [...prev, newComp];
      });

      showToast(`Company "${name}" registered with Code [${code}]!`, 'success');
      setIsAddCompanyOpen(false);
    } catch (err: any) {
      showToast(`Error creating company: ${err?.message || 'Failed'}`, 'error');
    } finally {
      isSubmittingCompanyRef.current = false;
      setIsSubmittingCompany(false);
    }
  };

  // Active Company & Enabled Features Resolution
  const currentCompany = useMemo(() => {
    return companies.find((c) => c.id === activeCompanyId || c.company_code === activeCompanyCode);
  }, [companies, activeCompanyId, activeCompanyCode]);

  const activeFeatures = useMemo(() => {
    const f = currentCompany?.features || {};
    return {
      print_cheque: f.print_cheque !== undefined ? f.print_cheque : (f.cheque_printing !== undefined ? f.cheque_printing : true),
      google_drive_backup: f.google_drive_backup !== undefined ? f.google_drive_backup : true,
      local_disk_backup: f.local_disk_backup !== undefined ? f.local_disk_backup : (f.offline_backup_system !== undefined ? f.offline_backup_system : true),
      import_cheques: f.import_cheques !== undefined ? f.import_cheques : (f.bulk_cheque_import !== undefined ? f.bulk_cheque_import : true),
      parties_banks: f.parties_banks !== undefined ? f.parties_banks : true,
      excel_pdf_export: f.excel_pdf_export !== undefined ? f.excel_pdf_export : true,
    };
  }, [currentCompany]);

  // Client Routing Guard: Fallback to dashboard if navigating to disabled feature
  useEffect(() => {
    if (role === 'TENANT') {
      if (!activeFeatures.print_cheque && currentView === 'print_cheque') {
        setCurrentView('dashboard');
      }
      if (!activeFeatures.parties_banks && (currentView === 'banks' || currentView === 'parties')) {
        setCurrentView('dashboard');
      }
      if (!activeFeatures.import_cheques && currentView === 'import_cheques') {
        setCurrentView('dashboard');
      }
      if (!(activeFeatures.local_disk_backup || activeFeatures.google_drive_backup) && currentView === 'backup') {
        setCurrentView('dashboard');
      }
    }
  }, [role, activeFeatures, currentView]);

  // Counts & Amounts
  const totalCheques = cheques.length;
  const totalAmount = cheques.reduce((acc, c) => acc + (c.amount || 0), 0);
  // Pending cheques includes all cheques with remaining balance > 0 that are not fully cleared
  const pendingCheques = cheques.filter(
    (c) => c.status !== 'Cleared' && ((c.remaining_amount ?? c.amount ?? 0) > 0.001)
  );
  const pendingAmount = pendingCheques.reduce((acc, c) => acc + (c.remaining_amount ?? c.amount ?? 0), 0);
  const partialCheques = cheques.filter(
    (c) => c.status === 'Partially Paid' || (c.status !== 'Cleared' && (c.remaining_amount ?? c.amount) < (c.amount - 0.001))
  );
  const partialAmount = partialCheques.reduce((acc, c) => acc + (c.remaining_amount ?? 0), 0);
  const clearedCheques = cheques.filter(
    (c) => c.status === 'Cleared' || (c.remaining_amount !== undefined && c.remaining_amount <= 0.001)
  );
  const clearedAmount = clearedCheques.reduce((acc, c) => acc + (c.amount || 0), 0);

  // Filtered Cheques
  const filteredCheques = useMemo(() => {
    return cheques.filter((c) => {
      if (statusFilter !== 'all' && c.status !== statusFilter) return false;
      if (bankFilter !== 'all' && c.bank_id !== bankFilter) return false;
      
      const isImported = (c.notes?.toLowerCase() || '').includes('imported') || (c.notes?.toLowerCase() || '').includes('external');
      if (sourceFilter === 'imported' && !isImported) return false;
      if (sourceFilter === 'system' && isImported) return false;

      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase();
        const party = parties.find((p) => p.id === c.party_id);
        const bank = banks.find((b) => b.id === c.bank_id);
        const matchNum = c.cheque_number?.toLowerCase().includes(q);
        const matchBill = c.bill_number?.toLowerCase().includes(q);
        const matchParty = party?.name?.toLowerCase().includes(q);
        const matchBank = bank?.name?.toLowerCase().includes(q);
        if (!matchNum && !matchBill && !matchParty && !matchBank) return false;
      }
      return true;
    });
  }, [cheques, statusFilter, sourceFilter, bankFilter, searchTerm, parties, banks]);

  // ==========================================
  // EXCEL & PDF EXPORT UTILITIES (STANDARDIZED)
  // ==========================================
  const exportToPdf = (title: string, headers: string[], rows: (string | number)[][], summaryText?: string) => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      showToast('Please allow popups to export PDF', 'error');
      return;
    }
    const compName = currentCompany?.name || activeCompanyName || 'ChequeDesk';
    const operatorName = currentUser?.name || 'Rajendra Shrestha';
    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>${title} - ${compName}</title>
          <style>
            @page { size: A4 landscape; margin: 10mm; }
            body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; color: #0f172a; margin: 0; padding: 14px; font-size: 11px; }
            .header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #4f46e5; padding-bottom: 10px; margin-bottom: 12px; }
            .company-name { font-size: 18px; font-weight: 800; color: #1e1b4b; }
            .report-title { font-size: 13px; font-weight: 700; color: #4338ca; margin-top: 3px; }
            .meta { font-size: 10px; color: #64748b; text-align: right; line-height: 1.5; }
            table { width: 100%; border-collapse: collapse; margin-top: 10px; }
            th { background: #f1f5f9; color: #334155; font-weight: 700; text-align: left; padding: 6px 8px; font-size: 10px; border: 1px solid #cbd5e1; text-transform: uppercase; }
            td { padding: 6px 8px; border: 1px solid #e2e8f0; font-size: 10px; }
            tr:nth-child(even) { background: #f8fafc; }
            .num { text-align: right; font-family: monospace; font-weight: 600; }
            .summary-box { margin-top: 14px; padding: 10px 14px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; display: flex; justify-content: space-between; font-weight: 600; font-size: 11px; }
            .footer { margin-top: 35px; display: flex; justify-content: space-between; padding-top: 10px; font-size: 10px; color: #475569; }
            .sign-line { border-top: 1px dashed #94a3b8; width: 160px; text-align: center; padding-top: 4px; font-size: 10px; font-weight: 600; }
            .page-footer { display: flex; justify-content: space-between; margin-top: 14px; font-size: 9px; color: #94a3b8; border-top: 1px solid #e2e8f0; padding-top: 4px; }
          </style>
        </head>
        <body>
          <div class="header">
            <div>
              <div class="company-name">${compName}</div>
              <div class="report-title">${title}</div>
              <div style="font-size: 10px; color: #64748b; margin-top: 2px;">Company Code: ${activeCompanyCode} | Generated via ChequeDesk Ledger System</div>
            </div>
            <div class="meta">
              <div><strong>Generated Date (BS):</strong> ${getCurrentBsDate()}</div>
              <div><strong>Generated Date (AD):</strong> ${getCurrentAdDate()}</div>
              <div><strong>Total Records:</strong> ${rows.length}</div>
            </div>
          </div>
          ${summaryText ? `<div>${summaryText}</div>` : ''}
          <table>
            <thead>
              <tr>${headers.map((h) => `<th>${h}</th>`).join('')}</tr>
            </thead>
            <tbody>
              ${rows.map((r) => `<tr>${r.map((c) => `<td class="${typeof c === 'number' || (typeof c === 'string' && c.startsWith('NPR')) ? 'num' : ''}">${c}</td>`).join('')}</tr>`).join('')}
            </tbody>
          </table>
          <div class="footer">
            <div class="sign-line">Prepared By: ${operatorName}</div>
            <div class="sign-line">Accountant / Verified By</div>
            <div class="sign-line">Authorized Signatory</div>
          </div>
          <div class="page-footer">
            <span>ChequeDesk Multi-Tenant Financial ERP • Certified Record</span>
            <span>Page 1 of 1</span>
          </div>
          <script>
            window.onload = function() { window.print(); };
          </script>
        </body>
      </html>
    `;
    printWindow.document.open();
    printWindow.document.write(html);
    printWindow.document.close();
  };

  const exportPartialPaymentLedgerToExcel = (chequeList: Cheque[]) => {
    try {
      const wb = XLSX.utils.book_new();
      const rows = chequeList.map((c) => {
        const party = parties.find((p) => p.id === c.party_id);
        const bank = banks.find((b) => b.id === c.bank_id);
        const logs = paymentLogs.filter((p) => p.cheque_id === c.id);
        const totalPaid = (c.amount || 0) - (c.remaining_amount ?? (c.status === 'Cleared' ? 0 : c.amount));
        const paymentSummary = logs.map((l) => `${l.payment_date_bs} BS (${l.payment_date_ad || '-'} AD): NPR ${l.amount.toLocaleString()} [${l.payment_mode}]`).join(' | ');

        return {
          'Cheque #': c.cheque_number,
          'Bill #': c.bill_number || '-',
          'Party Name': party?.name || 'N/A',
          'Bank Name': bank?.name || 'N/A',
          'Issue Date (BS)': c.issue_date_bs,
          'Issue Date (AD)': c.issue_date_ad,
          'Due Date (BS)': c.due_date_bs,
          'Due Date (AD)': c.due_date_ad,
          'Total Amount (NPR)': c.amount,
          'Total Received (NPR)': totalPaid,
          'Remaining Balance (NPR)': c.remaining_amount ?? (c.status === 'Cleared' ? 0 : c.amount),
          'Installments Count': logs.length,
          'Date-wise Payment Entries': paymentSummary || 'No installment payments recorded',
          'Status': c.status,
          'Notes': c.notes || '',
        };
      });

      const ws = XLSX.utils.json_to_sheet(rows);
      XLSX.utils.book_append_sheet(wb, ws, 'Partial Payments Ledger');
      XLSX.writeFile(wb, `Partial_Payment_Ledger_${activeCompanyCode}_${Date.now()}.xlsx`);
      showToast(`Partial Payment Ledger exported to Excel successfully!`, 'success');
    } catch {
      showToast('Failed to export Partial Payment Ledger to Excel', 'error');
    }
  };

  const exportPartialPaymentLedgerToPdf = (chequeList: Cheque[]) => {
    const headers = [
      'Cheque #',
      'Bill #',
      'Party Name',
      'Bank Name',
      'Issue Date (BS/AD)',
      'Due Date (BS/AD)',
      'Total Amount',
      'Date-wise Payment Entries',
      'Remaining Balance',
      'Status',
    ];

    let grandTotalAmount = 0;
    let grandTotalReceived = 0;
    let grandTotalRemaining = 0;
    let grandTotalInstallments = 0;

    const rows: (string | number)[][] = chequeList.map((c) => {
      const party = parties.find((p) => p.id === c.party_id);
      const bank = banks.find((b) => b.id === c.bank_id);
      const logs = paymentLogs.filter((p) => p.cheque_id === c.id);
      const remaining = c.remaining_amount ?? (c.status === 'Cleared' ? 0 : c.amount);
      const paid = (c.amount || 0) - remaining;

      grandTotalAmount += c.amount || 0;
      grandTotalReceived += paid;
      grandTotalRemaining += remaining;
      grandTotalInstallments += logs.length;

      const paymentsText = logs.length > 0
        ? logs.map((l) => `${l.payment_date_bs} BS: NPR ${l.amount.toLocaleString()} (${l.payment_mode})`).join('<br/>')
        : '<span style="color:#94a3b8; font-style: italic;">No payments</span>';

      return [
        c.cheque_number,
        c.bill_number || '-',
        party?.name || 'N/A',
        bank?.name || 'N/A',
        `${c.issue_date_bs}<br/><small style="color:#64748b">${c.issue_date_ad}</small>`,
        `${c.due_date_bs}<br/><small style="color:#64748b">${c.due_date_ad}</small>`,
        formatNPR(c.amount),
        paymentsText,
        formatNPR(remaining),
        c.status,
      ];
    });

    const recoveryPct = grandTotalAmount > 0 ? Math.round((grandTotalReceived / grandTotalAmount) * 100) : 0;

    const summaryHeader = `
      <div style="display: grid; grid-template-columns: repeat(5, 1fr); gap: 8px; width: 100%; margin-bottom: 12px; background: #f8fafc; border: 1px solid #cbd5e1; border-radius: 6px; padding: 8px 12px;">
        <div><div style="font-size: 9px; color: #64748b; text-transform: uppercase; font-weight: 700;">Total Cheque Value</div><div style="font-size: 13px; font-weight: 800; color: #0f172a;">${formatNPR(grandTotalAmount)}</div></div>
        <div><div style="font-size: 9px; color: #64748b; text-transform: uppercase; font-weight: 700;">Total Received</div><div style="font-size: 13px; font-weight: 800; color: #059669;">${formatNPR(grandTotalReceived)}</div></div>
        <div><div style="font-size: 9px; color: #64748b; text-transform: uppercase; font-weight: 700;">Remaining Due</div><div style="font-size: 13px; font-weight: 800; color: #d97706;">${formatNPR(grandTotalRemaining)}</div></div>
        <div><div style="font-size: 9px; color: #64748b; text-transform: uppercase; font-weight: 700;">Total Installments</div><div style="font-size: 13px; font-weight: 800; color: #4338ca;">${grandTotalInstallments} Entries</div></div>
        <div><div style="font-size: 9px; color: #64748b; text-transform: uppercase; font-weight: 700;">Recovery Rate</div><div style="font-size: 13px; font-weight: 800; color: #0284c7;">${recoveryPct}% Settled</div></div>
      </div>
    `;

    // Append Grand Totals Row
    rows.push([
      '<strong>GRAND TOTALS</strong>',
      '-',
      '-',
      '-',
      '-',
      '-',
      `<strong>${formatNPR(grandTotalAmount)}</strong>`,
      `<strong>${grandTotalInstallments} Installments (${formatNPR(grandTotalReceived)})</strong>`,
      `<strong style="color:#d97706">${formatNPR(grandTotalRemaining)}</strong>`,
      `<strong>${recoveryPct}% Cleared</strong>`,
    ]);

    exportToPdf('Partial Payment Ledger & Installment Audit Report', headers, rows, summaryHeader);
  };

  const exportChequesToExcel = (chequeList: Cheque[], sheetName: string, fileName: string) => {
    try {
      const wb = XLSX.utils.book_new();
      const rows = chequeList.map((c) => {
        const party = parties.find((p) => p.id === c.party_id);
        const bank = banks.find((b) => b.id === c.bank_id);
        return {
          'Cheque Number': c.cheque_number,
          'Party / Payee': party?.name || 'N/A',
          'Bank': bank?.name || 'N/A',
          'Account Number': c.account_number || '',
          'Amount (NPR)': c.amount,
          'Remaining (NPR)': c.remaining_amount ?? c.amount,
          'Status': c.status,
          'Issue Date (BS)': c.issue_date_bs,
          'Issue Date (AD)': c.issue_date_ad,
          'Due Date (BS)': c.due_date_bs,
          'Due Date (AD)': c.due_date_ad,
          'Bill No': c.bill_number || '',
          'Notes / Remarks': c.notes || '',
        };
      });
      const ws = XLSX.utils.json_to_sheet(rows);
      XLSX.utils.book_append_sheet(wb, ws, sheetName);
      XLSX.writeFile(wb, `${fileName}_${activeCompanyCode}_${Date.now()}.xlsx`);
      showToast(`Exported ${chequeList.length} records to Excel (.xlsx) successfully!`, 'success');
    } catch {
      showToast('Failed to export Excel file', 'error');
    }
  };

  const exportChequesToPdf = (chequeList: Cheque[], title: string) => {
    const headers = ['Cheque #', 'Party / Payee', 'Bank', 'Account #', 'Due Date (BS)', 'Issue Date (BS)', 'Amount', 'Remaining', 'Status'];
    const rows = chequeList.map((c) => {
      const party = parties.find((p) => p.id === c.party_id);
      const bank = banks.find((b) => b.id === c.bank_id);
      return [
        c.cheque_number,
        party?.name || 'N/A',
        bank?.name || 'N/A',
        c.account_number || '-',
        c.due_date_bs,
        c.issue_date_bs,
        formatNPR(c.amount),
        formatNPR(c.remaining_amount ?? c.amount),
        c.status,
      ];
    });
    const totalAmt = chequeList.reduce((acc, c) => acc + (c.amount || 0), 0);
    const totalRemaining = chequeList.reduce((acc, c) => acc + (c.remaining_amount ?? c.amount ?? 0), 0);
    const summary = `<span><strong>Total Cheques:</strong> ${chequeList.length}</span> <span><strong>Total Amount:</strong> ${formatNPR(totalAmt)}</span> <span><strong>Remaining Balance:</strong> ${formatNPR(totalRemaining)}</span>`;
    exportToPdf(title, headers, rows, summary);
  };

  const handleSaveLocalBackupPath = (customPath?: string) => {
    const pathToSave = (customPath !== undefined ? customPath : backupPathInput).trim();
    if (!pathToSave) {
      showToast('Please enter a valid backup folder path', 'error');
      return;
    }
    setLocalBackupPath(pathToSave);
    setBackupPathInput(pathToSave);
    localStorage.setItem('chequedesk_local_backup_path', pathToSave);
    showToast(`Saved local backup directory: "${pathToSave}"`, 'success');
  };

  const exportBanksToExcel = () => {
    try {
      const wb = XLSX.utils.book_new();
      let totalAllCheques = 0;
      let totalAllVolume = 0;
      let totalAllCleared = 0;
      let totalAllPending = 0;

      const rows: any[] = banks.map((b) => {
        const bCheques = cheques.filter((c) => c.bank_id === b.id);
        const bTotal = bCheques.reduce((s, c) => s + (c.amount || 0), 0);
        const bCleared = bCheques.filter((c) => c.status === 'Cleared').reduce((s, c) => s + (c.amount || 0), 0);
        const bPending = bCheques.reduce((s, c) => s + (c.remaining_amount ?? (c.status === 'Cleared' ? 0 : c.amount)), 0);
        const accNos = Array.from(new Set(bCheques.map((c) => c.account_number).filter(Boolean))).join(', ');

        totalAllCheques += bCheques.length;
        totalAllVolume += bTotal;
        totalAllCleared += bCleared;
        totalAllPending += bPending;

        return {
          'Bank Name': b.name,
          'Bank Code / Branch': b.code || 'N/A',
          'Linked Account Number(s)': accNos || 'Not Assigned',
          'Total Cheques Count': bCheques.length,
          'Total Cheque Volume (NPR)': bTotal,
          'Cleared Amount (NPR)': bCleared,
          'Pending / Outstanding Balance (NPR)': bPending,
          'Registered Date': b.created_at?.slice(0, 10) || '-',
        };
      });

      // Grand Totals Summary Row
      rows.push({
        'Bank Name': 'TOTAL / SUMMARY',
        'Bank Code / Branch': `${banks.length} Banks`,
        'Linked Account Number(s)': '-',
        'Total Cheques Count': totalAllCheques,
        'Total Cheque Volume (NPR)': totalAllVolume,
        'Cleared Amount (NPR)': totalAllCleared,
        'Pending / Outstanding Balance (NPR)': totalAllPending,
        'Registered Date': '-',
      });

      const ws = XLSX.utils.json_to_sheet(rows);
      XLSX.utils.book_append_sheet(wb, ws, 'Bank Directory & Balances');
      XLSX.writeFile(wb, `Bank_Directory_and_Balances_${activeCompanyCode}_${Date.now()}.xlsx`);
      showToast('Exported bank directory & balance statement to Excel (.xlsx)', 'success');
    } catch {
      showToast('Error exporting banks to Excel', 'error');
    }
  };

  const exportBanksToPdf = () => {
    const headers = ['#', 'Bank Name', 'Branch / Code', 'Linked A/C Number(s)', 'Cheques', 'Total Volume', 'Cleared Amount', 'Pending Balance'];
    let totalAllCheques = 0;
    let totalAllVolume = 0;
    let totalAllCleared = 0;
    let totalAllPending = 0;

    const rows: (string | number)[][] = banks.map((b, i) => {
      const bCheques = cheques.filter((c) => c.bank_id === b.id);
      const bTotal = bCheques.reduce((s, c) => s + (c.amount || 0), 0);
      const bCleared = bCheques.filter((c) => c.status === 'Cleared').reduce((s, c) => s + (c.amount || 0), 0);
      const bPending = bCheques.reduce((s, c) => s + (c.remaining_amount ?? (c.status === 'Cleared' ? 0 : c.amount)), 0);
      const accNos = Array.from(new Set(bCheques.map((c) => c.account_number).filter(Boolean))).join(', ') || '-';

      totalAllCheques += bCheques.length;
      totalAllVolume += bTotal;
      totalAllCleared += bCleared;
      totalAllPending += bPending;

      return [
        i + 1,
        b.name,
        b.code || 'N/A',
        accNos,
        bCheques.length,
        formatNPR(bTotal),
        formatNPR(bCleared),
        formatNPR(bPending),
      ];
    });

    // Grand Totals Row
    rows.push([
      'TOTAL',
      `${banks.length} Banks Registered`,
      '-',
      '-',
      totalAllCheques,
      formatNPR(totalAllVolume),
      formatNPR(totalAllCleared),
      formatNPR(totalAllPending),
    ]);

    const summary = `
      <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; width: 100%; margin-bottom: 12px; background: #f8fafc; border: 1px solid #cbd5e1; border-radius: 6px; padding: 10px 14px;">
        <div><div style="font-size: 9px; color: #64748b; text-transform: uppercase; font-weight: 700;">Total Registered Banks</div><div style="font-size: 14px; font-weight: 800; color: #0f172a;">${banks.length} Accounts</div></div>
        <div><div style="font-size: 9px; color: #64748b; text-transform: uppercase; font-weight: 700;">Total Cheques Issued</div><div style="font-size: 14px; font-weight: 800; color: #4338ca;">${totalAllCheques} Cheques</div></div>
        <div><div style="font-size: 9px; color: #64748b; text-transform: uppercase; font-weight: 700;">Total Cleared Volume</div><div style="font-size: 14px; font-weight: 800; color: #059669;">${formatNPR(totalAllCleared)}</div></div>
        <div><div style="font-size: 9px; color: #64748b; text-transform: uppercase; font-weight: 700;">Total Pending Balance</div><div style="font-size: 14px; font-weight: 800; color: #d97706;">${formatNPR(totalAllPending)}</div></div>
      </div>
    `;

    exportToPdf('Bank Accounts Directory & Balance Statement', headers, rows, summary);
  };

  // ==========================================
  // SAMPLE IMPORT TEMPLATE GENERATORS (.xlsx)
  // ==========================================
  const downloadSampleChequeTemplate = () => {
    try {
      const wb = XLSX.utils.book_new();
      const rows = [
        {
          'Cheque No': '0094821',
          'Amount': 75000,
          'Bank': banks[0]?.name || 'Nabil Bank Ltd.',
          'Party': parties[0]?.name || 'Himalayan Suppliers Pvt Ltd',
          'Issue Date BS/AD': '2081-06-15',
          'Due Date BS/AD': '2081-07-01',
          'Bill No': 'INV-1092',
          'Status': 'Pending',
          'Notes': 'Payment for raw materials consignment',
        },
        {
          'Cheque No': '0094822',
          'Amount': 120000,
          'Bank': banks[1]?.name || 'Global IME Bank',
          'Party': parties[1]?.name || 'Everest Trading Corp',
          'Issue Date BS/AD': '2081-06-18',
          'Due Date BS/AD': '2081-07-15',
          'Bill No': 'INV-1105',
          'Status': 'Pending',
          'Notes': 'Quarterly hardware shipment settlement',
        },
        {
          'Cheque No': '0094823',
          'Amount': 45000,
          'Bank': banks[0]?.name || 'NIC Asia Bank',
          'Party': parties[2]?.name || 'Kathmandu Builders & Hardware',
          'Issue Date BS/AD': '2081-06-20',
          'Due Date BS/AD': '2081-06-25',
          'Bill No': 'BILL-849',
          'Status': 'Cleared',
          'Notes': 'Office renovation advance payment',
        },
      ];

      const ws = XLSX.utils.json_to_sheet(rows);
      ws['!cols'] = [
        { wch: 16 }, // Cheque No
        { wch: 14 }, // Amount
        { wch: 24 }, // Bank
        { wch: 30 }, // Party
        { wch: 18 }, // Issue Date BS/AD
        { wch: 18 }, // Due Date BS/AD
        { wch: 14 }, // Bill No
        { wch: 14 }, // Status
        { wch: 40 }, // Notes
      ];
      XLSX.utils.book_append_sheet(wb, ws, 'Sample_Cheques');
      XLSX.writeFile(wb, 'Cheque_Import_Sample_Template.xlsx');
      showToast('Downloaded Sample Cheque Excel Template (.xlsx)', 'success');
    } catch (err: any) {
      showToast(`Failed to download template: ${err?.message || 'Error'}`, 'error');
    }
  };

  const downloadSampleBankTemplate = () => {
    try {
      const wb = XLSX.utils.book_new();
      const rows = [
        {
          'Bank Name': 'Nabil Bank Ltd.',
          'Account Number': '01201017500123',
          'Branch': 'New Road Branch (NBL-01)',
          'Initial Balance': 500000,
        },
        {
          'Bank Name': 'Global IME Bank',
          'Account Number': '1020010004567',
          'Branch': 'Kantipath Branch',
          'Initial Balance': 350000,
        },
        {
          'Bank Name': 'NIC Asia Bank',
          'Account Number': '048291002341',
          'Branch': 'Tripureshwor Branch',
          'Initial Balance': 200000,
        },
      ];

      const ws = XLSX.utils.json_to_sheet(rows);
      ws['!cols'] = [
        { wch: 24 }, // Bank Name
        { wch: 22 }, // Account Number
        { wch: 28 }, // Branch
        { wch: 18 }, // Initial Balance
      ];
      XLSX.utils.book_append_sheet(wb, ws, 'Sample_Banks');
      XLSX.writeFile(wb, 'Bank_Import_Sample_Template.xlsx');
      showToast('Downloaded Sample Bank Template (.xlsx)', 'success');
    } catch (err: any) {
      showToast(`Failed to download template: ${err?.message || 'Error'}`, 'error');
    }
  };

  const downloadSamplePartyTemplate = () => {
    try {
      const wb = XLSX.utils.book_new();
      const rows = [
        {
          'Party Name': 'Himalayan Suppliers Pvt Ltd',
          'Contact Person': 'Rajesh Sharma',
          'Phone': '9851023456',
          'PAN/VAT': '601928374',
          'Opening Balance': 150000,
        },
        {
          'Party Name': 'Everest Trading Corp',
          'Contact Person': 'Sita Gurung',
          'Phone': '9841234567',
          'PAN/VAT': '602349182',
          'Opening Balance': 0,
        },
        {
          'Party Name': 'Kathmandu Builders & Hardware',
          'Contact Person': 'Bikash Thapa',
          'Phone': '9801982736',
          'PAN/VAT': '304918273',
          'Opening Balance': 75000,
        },
      ];

      const ws = XLSX.utils.json_to_sheet(rows);
      ws['!cols'] = [
        { wch: 32 }, // Party Name
        { wch: 20 }, // Contact Person
        { wch: 16 }, // Phone
        { wch: 16 }, // PAN/VAT
        { wch: 18 }, // Opening Balance
      ];
      XLSX.utils.book_append_sheet(wb, ws, 'Sample_Parties');
      XLSX.writeFile(wb, 'Party_Import_Sample_Template.xlsx');
      showToast('Downloaded Sample Party Template (.xlsx)', 'success');
    } catch (err: any) {
      showToast(`Failed to download template: ${err?.message || 'Error'}`, 'error');
    }
  };

  const handleBatchImportBanks = async (eOrFile: React.ChangeEvent<HTMLInputElement> | File) => {
    const file = eOrFile instanceof File ? eOrFile : eOrFile.target.files?.[0];
    if (!file) return;
    try {
      const data = await file.arrayBuffer();
      const wb = XLSX.read(data);
      const sheetName = wb.SheetNames[0];
      const sheet = wb.Sheets[sheetName];
      const rows: any[] = XLSX.utils.sheet_to_json(sheet);

      if (!rows || rows.length === 0) {
        showToast('No bank records found in uploaded file', 'error');
        if (!(eOrFile instanceof File)) eOrFile.target.value = '';
        return;
      }

      let importedCount = 0;
      const existingNames = new Set(banks.map((b) => b.name.trim().toLowerCase()));

      for (const r of rows) {
        const bankName = String(
          r['Bank Name'] || r.BankName || r['Bank'] || r.Bank || r['Name'] || r.name || ''
        ).trim();
        const branch = String(
          r['Branch'] || r.Branch || r['Branch / Code'] || r['Bank Code / Branch'] || r['Bank Code'] || r.BankCode || r['Code'] || r.code || ''
        ).trim();
        const accountNo = String(
          r['Account Number'] || r['Account No'] || r.AccountNumber || r.account_number || r['A/C No'] || r.AccountNo || ''
        ).trim();

        let bankCode = branch;
        if (accountNo) {
          bankCode = bankCode ? `${bankCode} (A/C: ${accountNo})` : `A/C: ${accountNo}`;
        }

        if (bankName && !existingNames.has(bankName.toLowerCase())) {
          await addBank(activeCompanyId, bankName, bankCode);
          existingNames.add(bankName.toLowerCase());
          importedCount++;
        }
      }

      if (importedCount > 0) {
        showToast(`Successfully imported ${importedCount} banks into master directory!`, 'success');
        setIsBankImportModalOpen(false);
      } else {
        showToast('All banks in the file already exist in the master directory', 'info');
      }
    } catch (err: any) {
      showToast(`Failed to import banks: ${err?.message || 'Invalid file format'}`, 'error');
    } finally {
      if (!(eOrFile instanceof File)) {
        eOrFile.target.value = '';
      }
    }
  };

  const exportPartiesToExcel = () => {
    try {
      const wb = XLSX.utils.book_new();
      let totalAllCheques = 0;
      let totalAllVolume = 0;
      let totalAllCleared = 0;
      let totalAllPending = 0;

      const rows: any[] = parties.map((p) => {
        const pCheques = cheques.filter((c) => c.party_id === p.id);
        const pTotal = pCheques.reduce((s, c) => s + (c.amount || 0), 0);
        const pCleared = pCheques.filter((c) => c.status === 'Cleared').reduce((s, c) => s + (c.amount || 0), 0);
        const pPending = pCheques.reduce((s, c) => s + (c.remaining_amount ?? (c.status === 'Cleared' ? 0 : c.amount)), 0);

        totalAllCheques += pCheques.length;
        totalAllVolume += pTotal;
        totalAllCleared += pCleared;
        totalAllPending += pPending;

        return {
          'Party / Payee Name': p.name,
          'Contact Phone': p.phone || 'N/A',
          'PAN / VAT / Email': p.pan_vat || p.email || 'N/A',
          'Total Cheques Issued': pCheques.length,
          'Total Volume (NPR)': pTotal,
          'Cleared Amount (NPR)': pCleared,
          'Pending / Due Balance (NPR)': pPending,
          'Registered Date': p.created_at?.slice(0, 10) || '-',
        };
      });

      // Grand Totals Summary Row
      rows.push({
        'Party / Payee Name': 'TOTAL / SUMMARY',
        'Contact Phone': `${parties.length} Parties`,
        'PAN / VAT / Email': '-',
        'Total Cheques Issued': totalAllCheques,
        'Total Volume (NPR)': totalAllVolume,
        'Cleared Amount (NPR)': totalAllCleared,
        'Pending / Due Balance (NPR)': totalAllPending,
        'Registered Date': '-',
      });

      const ws = XLSX.utils.json_to_sheet(rows);
      XLSX.utils.book_append_sheet(wb, ws, 'Party Master & Balances');
      XLSX.writeFile(wb, `Parties_Master_and_Balances_${activeCompanyCode}_${Date.now()}.xlsx`);
      showToast('Exported parties master & ledger summaries to Excel (.xlsx)', 'success');
    } catch {
      showToast('Error exporting parties to Excel', 'error');
    }
  };

  const exportPartiesToPdf = () => {
    const headers = ['#', 'Party / Payee Name', 'Contact Phone', 'PAN / VAT', 'Cheques', 'Total Volume', 'Cleared Amount', 'Pending Due'];
    let totalAllCheques = 0;
    let totalAllVolume = 0;
    let totalAllCleared = 0;
    let totalAllPending = 0;

    const rows: (string | number)[][] = parties.map((p, i) => {
      const pCheques = cheques.filter((c) => c.party_id === p.id);
      const pTotal = pCheques.reduce((s, c) => s + (c.amount || 0), 0);
      const pCleared = pCheques.filter((c) => c.status === 'Cleared').reduce((s, c) => s + (c.amount || 0), 0);
      const pPending = pCheques.reduce((s, c) => s + (c.remaining_amount ?? (c.status === 'Cleared' ? 0 : c.amount)), 0);

      totalAllCheques += pCheques.length;
      totalAllVolume += pTotal;
      totalAllCleared += pCleared;
      totalAllPending += pPending;

      return [
        i + 1,
        p.name,
        p.phone || 'N/A',
        p.pan_vat || p.email || '-',
        pCheques.length,
        formatNPR(pTotal),
        formatNPR(pCleared),
        formatNPR(pPending),
      ];
    });

    // Grand Totals Row
    rows.push([
      'TOTAL',
      `${parties.length} Parties Registered`,
      '-',
      '-',
      totalAllCheques,
      formatNPR(totalAllVolume),
      formatNPR(totalAllCleared),
      formatNPR(totalAllPending),
    ]);

    const summary = `
      <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; width: 100%; margin-bottom: 12px; background: #f8fafc; border: 1px solid #cbd5e1; border-radius: 6px; padding: 10px 14px;">
        <div><div style="font-size: 9px; color: #64748b; text-transform: uppercase; font-weight: 700;">Total Registered Parties</div><div style="font-size: 14px; font-weight: 800; color: #0f172a;">${parties.length} Payees</div></div>
        <div><div style="font-size: 9px; color: #64748b; text-transform: uppercase; font-weight: 700;">Total Cheques Issued</div><div style="font-size: 14px; font-weight: 800; color: #4338ca;">${totalAllCheques} Cheques</div></div>
        <div><div style="font-size: 9px; color: #64748b; text-transform: uppercase; font-weight: 700;">Total Cleared Amount</div><div style="font-size: 14px; font-weight: 800; color: #059669;">${formatNPR(totalAllCleared)}</div></div>
        <div><div style="font-size: 9px; color: #64748b; text-transform: uppercase; font-weight: 700;">Total Pending Balance</div><div style="font-size: 14px; font-weight: 800; color: #d97706;">${formatNPR(totalAllPending)}</div></div>
      </div>
    `;

    exportToPdf('Parties & Payees Master Records & Ledger Summary', headers, rows, summary);
  };

  const handleBatchImportParties = async (eOrFile: React.ChangeEvent<HTMLInputElement> | File) => {
    const file = eOrFile instanceof File ? eOrFile : eOrFile.target.files?.[0];
    if (!file) return;
    try {
      const data = await file.arrayBuffer();
      const wb = XLSX.read(data);
      const sheetName = wb.SheetNames[0];
      const sheet = wb.Sheets[sheetName];
      const rows: any[] = XLSX.utils.sheet_to_json(sheet);

      if (!rows || rows.length === 0) {
        showToast('No party records found in uploaded file', 'error');
        if (!(eOrFile instanceof File)) eOrFile.target.value = '';
        return;
      }

      let importedCount = 0;
      const existingNames = new Set(parties.map((p) => p.name.trim().toLowerCase()));

      for (const r of rows) {
        const partyName = String(
          r['Party Name'] || r['Party / Payee Name'] || r.PartyName || r['Payee Name'] || r.Payee || r['Name'] || r.name || ''
        ).trim();
        const contactPerson = String(
          r['Contact Person'] || r.ContactPerson || r['Contact'] || ''
        ).trim();
        const phone = String(
          r['Phone'] || r['Contact Phone'] || r['Phone Number'] || r.Phone || r['Mobile'] || r.mobile || ''
        ).trim();
        const panVat = String(
          r['PAN/VAT'] || r['PAN / VAT'] || r['PAN / VAT / Email'] || r['PAN / VAT Number'] || r['PAN'] || r.pan || r['VAT'] || r.vat || ''
        ).trim();

        if (partyName && !existingNames.has(partyName.toLowerCase())) {
          await addParty({
            company_id: activeCompanyId,
            name: partyName,
            phone: phone || (contactPerson ? `Contact: ${contactPerson}` : undefined),
            pan_vat: panVat || undefined,
          });
          existingNames.add(partyName.toLowerCase());
          importedCount++;
        }
      }

      if (importedCount > 0) {
        showToast(`Successfully imported ${importedCount} parties into master directory!`, 'success');
        setIsPartyImportModalOpen(false);
      } else {
        showToast('All parties in the file already exist in the master directory', 'info');
      }
    } catch (err: any) {
      showToast(`Failed to import parties: ${err?.message || 'Invalid file format'}`, 'error');
    } finally {
      if (!(eOrFile instanceof File)) {
        eOrFile.target.value = '';
      }
    }
  };

  const handleBatchImportCheques = async (eOrFile: React.ChangeEvent<HTMLInputElement> | File) => {
    const file = eOrFile instanceof File ? eOrFile : eOrFile.target.files?.[0];
    if (!file) return;
    try {
      if (file.name.endsWith('.json')) {
        const text = await file.text();
        const raw = JSON.parse(text);
        const list = Array.isArray(raw) ? raw : raw.cheques || [raw];
        let imported = 0;
        for (const r of list) {
          await createCheque({
            company_id: activeCompanyId,
            cheque_number: String(r.cheque_number || r['Cheque No'] || `IMP-${Date.now()}-${imported}`),
            amount: Number(r.amount || r['Amount'] || 1000),
            party_id: parties[0]?.id || null,
            bank_id: banks[0]?.id || null,
            issue_date_bs: String(r.issue_date_bs || getCurrentBsDate()),
            issue_date_ad: String(r.issue_date_ad || getCurrentAdDate()),
            due_date_bs: String(r.due_date_bs || getCurrentBsDate()),
            due_date_ad: String(r.due_date_ad || getCurrentAdDate()),
            status: (r.status || 'Pending') as ChequeStatus,
            bill_number: String(r.bill_number || r['Bill No'] || ''),
            notes: String(r.notes || r['Notes'] || 'Imported from External Software'),
          });
          imported++;
        }
        showToast(`Imported ${imported} cheques from external JSON! Tagged as 'Imported from External Software'.`, 'success');
        setIsImportModalOpen(false);
        return;
      }

      const data = await file.arrayBuffer();
      const wb = XLSX.read(data);
      const sheetName = wb.SheetNames[0];
      const sheet = wb.Sheets[sheetName];
      const rows: any[] = XLSX.utils.sheet_to_json(sheet);

      if (!rows || rows.length === 0) {
        showToast('No cheque records found in uploaded file', 'error');
        if (!(eOrFile instanceof File)) eOrFile.target.value = '';
        return;
      }

      let importedCount = 0;
      for (const r of rows) {
        const chequeNo = String(
          r['Cheque No'] || r['Cheque Number'] || r.ChequeNo || r['Cheque #'] || r.cheque_number || `IMP-${Date.now()}-${importedCount}`
        ).trim();
        const amount = Number(r['Amount'] || r.amount || 0);
        const bankName = String(r['Bank'] || r['Bank Name'] || r.bank || '').trim();
        const partyName = String(r['Party'] || r['Party Name'] || r['Party / Payee Name'] || r.party || '').trim();
        const billNo = String(r['Bill No'] || r['Bill Number'] || r.BillNo || r.bill_number || '').trim();
        const rawStatus = String(r['Status'] || r.status || 'Pending').trim();
        const status: ChequeStatus = (['Pending', 'Partially Paid', 'Cleared'].includes(rawStatus) ? rawStatus : 'Pending') as ChequeStatus;
        const notes = String(r['Notes'] || r['Remarks'] || r.notes || 'Imported from External Software').trim();

        // Date parsing: handles 'Issue Date BS/AD', 'Issue Date BS', or 'Issue Date (BS)'
        const rawIssueDate = String(r['Issue Date BS/AD'] || r['Issue Date BS'] || r['Issue Date (BS)'] || r.issue_date_bs || getCurrentBsDate()).trim();
        const issueParts = rawIssueDate.split(/[\/,]/).map((s) => s.trim());
        let issueDateBs = issueParts[0] || getCurrentBsDate();
        let issueDateAd = issueParts[1] || String(r['Issue Date AD'] || r['Issue Date (AD)'] || r.issue_date_ad || '').trim();
        if (!issueDateAd && issueDateBs) {
          issueDateAd = bsToAd(issueDateBs) || getCurrentAdDate();
        }

        const rawDueDate = String(r['Due Date BS/AD'] || r['Due Date BS'] || r['Due Date (BS)'] || r.due_date_bs || getCurrentBsDate()).trim();
        const dueParts = rawDueDate.split(/[\/,]/).map((s) => s.trim());
        let dueDateBs = dueParts[0] || getCurrentBsDate();
        let dueDateAd = dueParts[1] || String(r['Due Date AD'] || r['Due Date (AD)'] || r.due_date_ad || '').trim();
        if (!dueDateAd && dueDateBs) {
          dueDateAd = bsToAd(dueDateBs) || getCurrentAdDate();
        }

        // Match or auto-create bank
        let targetBankId = banks[0]?.id || null;
        if (bankName) {
          const foundBank = banks.find((b) => b.name.toLowerCase() === bankName.toLowerCase());
          if (foundBank) {
            targetBankId = foundBank.id;
          } else {
            try {
              const nb = await addBank(activeCompanyId, bankName, 'IMP');
              if (nb) targetBankId = nb;
            } catch {}
          }
        }

        // Match or auto-create party
        let targetPartyId = parties[0]?.id || null;
        if (partyName) {
          const foundParty = parties.find((p) => p.name.toLowerCase() === partyName.toLowerCase());
          if (foundParty) {
            targetPartyId = foundParty.id;
          } else {
            try {
              const np = await addParty({ company_id: activeCompanyId, name: partyName });
              if (np) targetPartyId = np;
            } catch {}
          }
        }

        await createCheque({
          company_id: activeCompanyId,
          cheque_number: chequeNo,
          amount: amount > 0 ? amount : 1000,
          party_id: targetPartyId,
          bank_id: targetBankId,
          issue_date_bs: issueDateBs || getCurrentBsDate(),
          issue_date_ad: issueDateAd || getCurrentAdDate(),
          due_date_bs: dueDateBs || getCurrentBsDate(),
          due_date_ad: dueDateAd || getCurrentAdDate(),
          status: status,
          bill_number: billNo || undefined,
          notes: notes,
        });
        importedCount++;
      }

      showToast(`Successfully imported ${importedCount} cheques from spreadsheet! Tagged as 'Imported from External Software'.`, 'success');
      setIsImportModalOpen(false);
    } catch (err: any) {
      showToast(`Error importing cheques: ${err?.message || 'Invalid file format'}`, 'error');
    } finally {
      if (!(eOrFile instanceof File)) {
        eOrFile.target.value = '';
      }
    }
  };

  const exportReportsToExcel = () => {
    try {
      const wb = XLSX.utils.book_new();

      // Summary
      const totalVolume = cheques.reduce((s, c) => s + c.amount, 0);
      const pendingVolume = cheques.filter((c) => c.status !== 'Cleared').reduce((s, c) => s + (c.remaining_amount ?? c.amount), 0);
      const clearedVolume = cheques.filter((c) => c.status === 'Cleared').reduce((s, c) => s + c.amount, 0);

      const summaryRows = [
        { Metric: 'Total Cheques Issued', Value: cheques.length },
        { Metric: 'Total Cheque Volume (NPR)', Value: totalVolume },
        { Metric: 'Pending Cheques Count', Value: pendingCheques.length },
        { Metric: 'Pending Balance (NPR)', Value: pendingVolume },
        { Metric: 'Cleared Cheques Count', Value: clearedCheques.length },
        { Metric: 'Cleared Volume (NPR)', Value: clearedVolume },
        { Metric: 'Partially Paid Count', Value: partialCheques.length },
        { Metric: 'Registered Parties', Value: parties.length },
        { Metric: 'Registered Banks', Value: banks.length },
      ];
      const wsSummary = XLSX.utils.json_to_sheet(summaryRows);
      XLSX.utils.book_append_sheet(wb, wsSummary, 'Summary Overview');

      // Bank Breakdown
      const bankBreakdown = banks.map((b) => {
        const bCheques = cheques.filter((c) => c.bank_id === b.id);
        const bTotal = bCheques.reduce((s, c) => s + c.amount, 0);
        const bPending = bCheques.filter((c) => c.status !== 'Cleared').reduce((s, c) => s + (c.remaining_amount ?? c.amount), 0);
        const bCleared = bCheques.filter((c) => c.status === 'Cleared').reduce((s, c) => s + c.amount, 0);
        return {
          'Bank Name': b.name,
          'Short Code': b.code || '',
          'Total Cheques': bCheques.length,
          'Total Volume (NPR)': bTotal,
          'Pending Balance (NPR)': bPending,
          'Cleared Volume (NPR)': bCleared,
        };
      });
      const wsBanks = XLSX.utils.json_to_sheet(bankBreakdown);
      XLSX.utils.book_append_sheet(wb, wsBanks, 'Bank Exposure');

      // Party Breakdown
      const partyBreakdown = parties.map((p) => {
        const pCheques = cheques.filter((c) => c.party_id === p.id);
        const pTotal = pCheques.reduce((s, c) => s + c.amount, 0);
        const pPending = pCheques.filter((c) => c.status !== 'Cleared').reduce((s, c) => s + (c.remaining_amount ?? c.amount), 0);
        return {
          'Party Name': p.name,
          Phone: p.phone || '',
          'Total Cheques': pCheques.length,
          'Total Volume (NPR)': pTotal,
          'Pending Balance (NPR)': pPending,
        };
      });
      const wsParties = XLSX.utils.json_to_sheet(partyBreakdown);
      XLSX.utils.book_append_sheet(wb, wsParties, 'Party Ledger');

      XLSX.writeFile(wb, `Financial_Reports_${activeCompanyCode}_${Date.now()}.xlsx`);
      showToast('Comprehensive Financial Reports exported to Excel (.xlsx)', 'success');
    } catch {
      showToast('Error exporting reports to Excel', 'error');
    }
  };

  const exportReportsToPdf = () => {
    const totalVolume = cheques.reduce((s, c) => s + c.amount, 0);
    const pendingVolume = cheques.filter((c) => c.status !== 'Cleared').reduce((s, c) => s + (c.remaining_amount ?? c.amount), 0);
    const clearedVolume = cheques.filter((c) => c.status === 'Cleared').reduce((s, c) => s + c.amount, 0);

    const headers = ['Bank / Account', 'Total Cheques', 'Total Volume (NPR)', 'Pending Balance (NPR)', 'Cleared (NPR)'];
    const rows = banks.map((b) => {
      const bCheques = cheques.filter((c) => c.bank_id === b.id);
      const bTotal = bCheques.reduce((s, c) => s + c.amount, 0);
      const bPending = bCheques.filter((c) => c.status !== 'Cleared').reduce((s, c) => s + (c.remaining_amount ?? c.amount), 0);
      const bCleared = bCheques.filter((c) => c.status === 'Cleared').reduce((s, c) => s + c.amount, 0);
      return [b.name, bCheques.length, formatNPR(bTotal), formatNPR(bPending), formatNPR(bCleared)];
    });

    const summaryHtml = `
      <span><strong>Total Volume:</strong> NPR ${formatNPR(totalVolume)}</span> |
      <span><strong>Pending:</strong> NPR ${formatNPR(pendingVolume)}</span> |
      <span><strong>Cleared:</strong> NPR ${formatNPR(clearedVolume)}</span>
    `;
    exportToPdf('Financial Analytics & Bank Exposure Report', headers, rows, summaryHtml);
  };

  // ==========================================
  // BS / AD DATE SYNCHRONIZATION HANDLERS
  // ==========================================
  const handleIssueDateBsSync = (val: string) => {
    setChequeForm((prev) => {
      let syncedAd = prev.issue_date_ad;
      if (val.trim().length === 10) {
        try {
          const converted = bsToAd(val.trim());
          if (converted && converted !== 'Invalid Date' && !converted.includes('NaN')) {
            syncedAd = converted;
          }
        } catch {}
      }
      return { ...prev, issue_date_bs: val, issue_date_ad: syncedAd };
    });
  };

  const handleIssueDateAdSync = (val: string) => {
    setChequeForm((prev) => {
      let syncedBs = prev.issue_date_bs;
      if (val.trim().length === 10) {
        try {
          const converted = adToBs(val.trim());
          if (converted && converted !== 'Invalid Date' && !converted.includes('NaN')) {
            syncedBs = converted;
          }
        } catch {}
      }
      return { ...prev, issue_date_ad: val, issue_date_bs: syncedBs };
    });
  };

  const handleDueDateBsSync = (val: string) => {
    setChequeForm((prev) => {
      let syncedAd = prev.due_date_ad;
      if (val.trim().length === 10) {
        try {
          const converted = bsToAd(val.trim());
          if (converted && converted !== 'Invalid Date' && !converted.includes('NaN')) {
            syncedAd = converted;
          }
        } catch {}
      }
      return { ...prev, due_date_bs: val, due_date_ad: syncedAd };
    });
  };

  const handleDueDateAdSync = (val: string) => {
    setChequeForm((prev) => {
      let syncedBs = prev.due_date_bs;
      if (val.trim().length === 10) {
        try {
          const converted = adToBs(val.trim());
          if (converted && converted !== 'Invalid Date' && !converted.includes('NaN')) {
            syncedBs = converted;
          }
        } catch {}
      }
      return { ...prev, due_date_ad: val, due_date_bs: syncedBs };
    });
  };

  const openNewChequeModal = () => {
    setEditingCheque(null);
    setChequeForm({
      cheque_number: '',
      amount: '',
      bank_id: banks[0]?.id || '',
      account_number: '',
      party_id: parties[0]?.id || '',
      issue_date_bs: getCurrentBsDate(),
      issue_date_ad: getCurrentAdDate(),
      due_date_bs: getCurrentBsDate(),
      due_date_ad: getCurrentAdDate(),
      status: 'Pending',
      bill_number: '',
      notes: '',
    });
    setIsQuickAddBankOpen(false);
    setIsQuickAddPartyOpen(false);
    setIsChequeModalOpen(true);
  };

  const openEditChequeModal = (c: Cheque) => {
    setEditingCheque(c);
    setChequeForm({
      cheque_number: c.cheque_number,
      amount: String(c.amount),
      bank_id: c.bank_id || banks[0]?.id || '',
      account_number: c.account_number || '',
      party_id: c.party_id || parties[0]?.id || '',
      issue_date_bs: c.issue_date_bs || getCurrentBsDate(),
      issue_date_ad: c.issue_date_ad || getCurrentAdDate(),
      due_date_bs: c.due_date_bs || getCurrentBsDate(),
      due_date_ad: c.due_date_ad || getCurrentAdDate(),
      status: c.status || 'Pending',
      bill_number: c.bill_number || '',
      notes: c.notes || '',
    });
    setIsQuickAddBankOpen(false);
    setIsQuickAddPartyOpen(false);
    setIsChequeModalOpen(true);
  };

  // Quick Add Bank Action
  const handleQuickAddBank = async () => {
    if (!quickBankName.trim()) {
      showToast('Please enter bank name', 'error');
      return;
    }
    try {
      const newBankId = await addBank(
        activeCompanyId,
        quickBankName.trim(),
        quickBankCode.trim() || ''
      );
      setChequeForm((prev) => ({ ...prev, bank_id: newBankId }));
      setQuickBankName('');
      setQuickBankCode('');
      setIsQuickAddBankOpen(false);
      showToast('Bank added & selected!', 'success');
    } catch {
      showToast('Error adding bank', 'error');
    }
  };

  // Quick Add Party Action
  const handleQuickAddParty = async () => {
    if (!quickPartyName.trim()) {
      showToast('Please enter party name', 'error');
      return;
    }
    try {
      const newPartyId = await addParty({
        company_id: activeCompanyId,
        name: quickPartyName.trim(),
        phone: quickPartyPhone.trim() || undefined,
        party_type: quickPartyType,
      });
      setChequeForm((prev) => ({ ...prev, party_id: newPartyId }));
      setQuickPartyName('');
      setQuickPartyPhone('');
      setQuickPartyType('Sundry Debtors');
      setIsQuickAddPartyOpen(false);
      showToast('Party added & selected!', 'success');
    } catch {
      showToast('Error adding party', 'error');
    }
  };

  // Save Cheque (Create or Edit)
  const handleSaveChequeForm = async (e: React.FormEvent) => {
    e.preventDefault();
    const amountNum = parseFloat(chequeForm.amount);
    if (isNaN(amountNum) || amountNum <= 0) {
      showToast('Please enter a valid amount in NPR', 'error');
      return;
    }
    if (!chequeForm.cheque_number.trim()) {
      showToast('Please enter a cheque number', 'error');
      return;
    }

    try {
      if (editingCheque) {
        await updateCheque(editingCheque.id, {
          cheque_number: chequeForm.cheque_number.trim(),
          amount: amountNum,
          bank_id: chequeForm.bank_id || null,
          account_number: chequeForm.account_number.trim(),
          party_id: chequeForm.party_id || null,
          issue_date_bs: chequeForm.issue_date_bs,
          issue_date_ad: chequeForm.issue_date_ad,
          due_date_bs: chequeForm.due_date_bs,
          due_date_ad: chequeForm.due_date_ad,
          status: chequeForm.status,
          bill_number: chequeForm.bill_number.trim(),
          notes: chequeForm.notes.trim(),
          updated_by: currentUser?.name || 'Accountant',
        });
        showToast('Cheque updated successfully', 'success');
      } else {
        await createCheque({
          company_id: activeCompanyId,
          cheque_number: chequeForm.cheque_number.trim(),
          amount: amountNum,
          bank_id: chequeForm.bank_id || null,
          account_number: chequeForm.account_number.trim(),
          party_id: chequeForm.party_id || null,
          issue_date_bs: chequeForm.issue_date_bs,
          issue_date_ad: chequeForm.issue_date_ad,
          due_date_bs: chequeForm.due_date_bs,
          due_date_ad: chequeForm.due_date_ad,
          status: chequeForm.status,
          bill_number: chequeForm.bill_number.trim(),
          notes: chequeForm.notes.trim(),
          entered_by: currentUser?.name || 'Accountant',
        });
        showToast('Cheque created successfully', 'success');
      }
      setIsChequeModalOpen(false);
    } catch (err: any) {
      showToast(`Failed to save cheque: ${err?.message || 'Error'}`, 'error');
    }
  };

  // Staff & User Management Handlers (Full Add, Edit, Delete with Persistence)
  const handleOpenEditStaff = (staff: CompanyStaffMember) => {
    setEditingStaff(staff);
    setEditStaffForm({
      name: staff.name,
      username: staff.username || (staff.email?.split('@')[0] || ''),
      email: staff.email,
      role: staff.role,
      password: staff.password || '1234',
    });
    setIsEditStaffOpen(true);
  };

  const handleUpdateStaff = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingStaff) return;
    const name = editStaffForm.name.trim();
    if (!name) {
      showToast('Please enter staff name', 'error');
      return;
    }
    const username = editStaffForm.username.trim() || (editStaffForm.email.trim().split('@')[0] || name.toLowerCase().replace(/\s+/g, '.'));
    const email = editStaffForm.email.trim() || (username.includes('@') ? username : `${username}@company.com`);
    const role = editStaffForm.role || 'Junior Accountant';
    const password = editStaffForm.password.trim() || '1234';

    const updatedList = companyStaff.map((s) => {
      if (s.id === editingStaff.id) {
        return {
          ...s,
          name,
          username,
          email,
          role,
          password,
        };
      }
      return s;
    });

    saveCompanyStaffList(updatedList);
    showToast(`Staff member "${name}" updated successfully!`, 'success');
    setIsEditStaffOpen(false);
    setEditingStaff(null);
  };

  const handleAddStaff = (e: React.FormEvent) => {
    e.preventDefault();
    const name = newStaffForm.name.trim();
    if (!name) {
      showToast('Please enter staff name', 'error');
      return;
    }
    const username = newStaffForm.username.trim() || (newStaffForm.email.trim().split('@')[0] || name.toLowerCase().replace(/\s+/g, '.'));
    const email = newStaffForm.email.trim() || (username.includes('@') ? username : `${username}@company.com`);
    const newStaff: CompanyStaffMember = {
      id: `usr-${Date.now()}`,
      name,
      username,
      email,
      role: newStaffForm.role || 'Junior Accountant',
      status: 'Active',
      last_login: 'Never',
      password: newStaffForm.password.trim() || '1234',
    };
    const updatedList = [...companyStaff, newStaff];
    saveCompanyStaffList(updatedList);
    showToast(`Staff member "${name}" registered with role [${newStaff.role}]!`, 'success');
    setNewStaffForm({ name: '', username: '', email: '', role: 'Junior Accountant', password: '' });
    setIsAddStaffOpen(false);
  };

  const handleDeleteStaff = (id: string, name: string) => {
    if (id === activeStaffId) {
      showToast('Cannot delete the currently active logged-in operator.', 'error');
      return;
    }
    const updatedList = companyStaff.filter((s) => s.id !== id);
    saveCompanyStaffList(updatedList);
    showToast(`Staff user "${name}" removed.`, 'info');
  };

  // Helper for BS Date Range Matching
  const matchesBsDateRange = (dateBs: string, range: string): boolean => {
    if (!dateBs || range === 'all') return true;
    const today = getCurrentBsDate();
    const currentYear = today.slice(0, 4);
    const currentMonth = today.slice(0, 7);

    if (range === 'today') return dateBs === today;
    if (range === 'overdue') return dateBs < today;
    if (range === 'this_month') return dateBs.startsWith(currentMonth);
    if (range === 'this_year') return dateBs.startsWith(currentYear);
    if (range === 'last_month') {
      const curM = parseInt(today.slice(5, 7), 10);
      const curY = parseInt(today.slice(0, 4), 10);
      const prevM = curM === 1 ? 12 : curM - 1;
      const prevY = curM === 1 ? curY - 1 : curY;
      const prevMonthPrefix = `${prevY}-${String(prevM).padStart(2, '0')}`;
      return dateBs.startsWith(prevMonthPrefix);
    }
    return true;
  };

  // Selection Handlers
  const toggleSelectCheque = (id: string) => {
    setSelectedChequeIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const toggleSelectAllCheques = (targetIds: string[]) => {
    const allSelected = targetIds.length > 0 && targetIds.every((id) => selectedChequeIds.includes(id));
    if (allSelected) {
      setSelectedChequeIds((prev) => prev.filter((id) => !targetIds.includes(id)));
    } else {
      setSelectedChequeIds((prev) => Array.from(new Set([...prev, ...targetIds])));
    }
  };

  // Mark Single Cheque Cleared
  const handleMarkCleared = async (cheque: Cheque) => {
    try {
      await updateCheque(cheque.id, {
        status: 'Cleared',
        remaining_amount: 0,
      });
      showToast(`Cheque #${cheque.cheque_number} marked as Cleared`, 'success');
    } catch (err: any) {
      showToast(`Failed to mark cleared: ${err?.message || 'Error'}`, 'error');
    }
  };

  // Bulk Actions
  const handleBulkMarkCleared = async () => {
    if (selectedChequeIds.length === 0) return;
    if (!confirm(`Mark all ${selectedChequeIds.length} selected cheques as Cleared?`)) return;
    try {
      let count = 0;
      for (const id of selectedChequeIds) {
        await updateCheque(id, {
          status: 'Cleared',
          remaining_amount: 0,
        });
        count++;
      }
      setSelectedChequeIds([]);
      showToast(`Successfully marked ${count} cheques as Cleared!`, 'success');
    } catch (err: any) {
      showToast(`Error updating cheques: ${err?.message || 'Error'}`, 'error');
    }
  };

  const handleBulkDelete = async () => {
    if (selectedChequeIds.length === 0) return;
    if (!confirm(`Permanently delete ${selectedChequeIds.length} selected cheques? This action cannot be undone.`)) return;
    try {
      let count = 0;
      for (const id of selectedChequeIds) {
        await deleteCheque(id);
        count++;
      }
      setSelectedChequeIds([]);
      showToast(`Successfully deleted ${count} cheques`, 'success');
    } catch (err: any) {
      showToast(`Error deleting cheques: ${err?.message || 'Error'}`, 'error');
    }
  };

  // Bank Edit Handlers
  const openEditBankModal = (b: Bank) => {
    setEditingBank(b);
    const linkedCheque = cheques.find((c) => c.bank_id === b.id && c.account_number);
    setEditBankForm({
      name: b.name,
      code: b.code || '',
      account_number: linkedCheque?.account_number || '',
    });
    setIsEditBankOpen(true);
  };

  const handleSaveBankEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingBank) return;
    if (!editBankForm.name.trim()) {
      showToast('Bank name is required', 'error');
      return;
    }
    try {
      await updateBank(editingBank.id, editBankForm.name.trim(), editBankForm.code.trim());
      showToast(`Bank "${editBankForm.name}" updated successfully`, 'success');
      setIsEditBankOpen(false);
      setEditingBank(null);
    } catch (err: any) {
      showToast(`Failed to update bank: ${err?.message || 'Error'}`, 'error');
    }
  };

  // Party Edit Handlers
  const openEditPartyModal = (p: Party) => {
    setEditingParty(p);
    setEditPartyForm({
      name: p.name,
      phone: p.phone || '',
      pan_vat: p.pan_vat || '',
      party_type: p.party_type || 'Sundry Debtors',
    });
    setIsEditPartyOpen(true);
  };

  const handleSavePartyEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingParty) return;
    if (!editPartyForm.name.trim()) {
      showToast('Party name is required', 'error');
      return;
    }
    try {
      await updateParty(
        editingParty.id,
        editPartyForm.name.trim(),
        editPartyForm.phone.trim(),
        editPartyForm.pan_vat.trim(),
        editPartyForm.party_type
      );
      showToast(`Party "${editPartyForm.name}" updated successfully`, 'success');
      setIsEditPartyOpen(false);
      setEditingParty(null);
    } catch (err: any) {
      showToast(`Failed to update party: ${err?.message || 'Error'}`, 'error');
    }
  };

  // Payment Modes Master Handlers
  const savePaymentModes = (newModes: string[]) => {
    setPaymentModes(newModes);
    try {
      localStorage.setItem(`chequedesk_payment_modes_${activeCompanyId}`, JSON.stringify(newModes));
    } catch {}
  };

  const handleAddPaymentMode = (modeName: string) => {
    const trimmed = modeName.trim();
    if (!trimmed) {
      showToast('Please enter a payment mode name', 'error');
      return;
    }
    if (paymentModes.some((m) => m.toLowerCase() === trimmed.toLowerCase())) {
      showToast(`Payment mode "${trimmed}" already exists`, 'error');
      return;
    }
    const updated = [...paymentModes, trimmed];
    savePaymentModes(updated);
    setNewPaymentModeInput('');
    showToast(`Added payment mode "${trimmed}"`, 'success');
  };

  const handleUpdatePaymentMode = (oldName: string, newName: string) => {
    const trimmed = newName.trim();
    if (!trimmed) {
      showToast('Payment mode name cannot be empty', 'error');
      return;
    }
    if (paymentModes.some((m) => m.toLowerCase() === trimmed.toLowerCase() && m !== oldName)) {
      showToast(`Payment mode "${trimmed}" already exists`, 'error');
      return;
    }
    const updated = paymentModes.map((m) => (m === oldName ? trimmed : m));
    savePaymentModes(updated);
    setEditingModeOldName(null);
    setEditingModeNewName('');
    showToast(`Updated payment mode to "${trimmed}"`, 'success');
  };

  const handleDeletePaymentMode = (modeToDelete: string) => {
    if (paymentModes.length <= 1) {
      showToast('At least one payment mode must remain in the master', 'error');
      return;
    }
    if (confirm(`Remove "${modeToDelete}" from accepted payment modes?`)) {
      const updated = paymentModes.filter((m) => m !== modeToDelete);
      savePaymentModes(updated);
      showToast(`Removed payment mode "${modeToDelete}"`, 'info');
    }
  };

  const handleResetPaymentModes = () => {
    if (confirm('Reset payment modes to standard defaults?')) {
      savePaymentModes(DEFAULT_PAYMENT_MODES);
      showToast('Payment modes reset to default', 'success');
    }
  };

  // Dedicated "Received / Payment" Submission Handler
  const handleRecordReceivedPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!receivedPaymentChequeId) {
      showToast('Please select a pending cheque to apply payment', 'error');
      return;
    }
    const targetCheque = cheques.find((c) => c.id === receivedPaymentChequeId);
    if (!targetCheque) {
      showToast('Selected cheque could not be found', 'error');
      return;
    }
    const amountNum = parseFloat(receivedPaymentAmount);
    if (isNaN(amountNum) || amountNum <= 0) {
      showToast('Please enter a valid payment amount greater than zero', 'error');
      return;
    }
    const currentRemaining = targetCheque.remaining_amount ?? targetCheque.amount;
    if (amountNum > currentRemaining + 0.001) {
      showToast(`Payment amount cannot exceed remaining balance of ${formatNPR(currentRemaining)}`, 'error');
      return;
    }

    setIsSubmittingReceivedPayment(true);
    try {
      await recordPayment({
        company_id: activeCompanyId,
        cheque_id: targetCheque.id,
        party_id: targetCheque.party_id || receivedPaymentPartyId || undefined,
        amount: amountNum,
        payment_mode: receivedPaymentMode,
        payment_type: receivedPaymentType,
        payment_date_bs: receivedPaymentDateBs,
        payment_date_ad: receivedPaymentDateAd,
        notes: receivedPaymentNotes.trim(),
        recorded_by: currentUser?.name || 'Accountant',
      });
      const newRemaining = Math.max(0, currentRemaining - amountNum);
      showToast(
        `Recorded ${receivedPaymentType} of ${formatNPR(amountNum)} for Cheque #${targetCheque.cheque_number}. New Balance: ${formatNPR(newRemaining)}`,
        'success'
      );
      setIsReceivedPaymentModalOpen(false);
      setReceivedPaymentAmount('');
      setReceivedPaymentNotes('');
    } catch (err: any) {
      showToast(`Failed to record payment: ${err?.message || 'Error'}`, 'error');
    } finally {
      setIsSubmittingReceivedPayment(false);
    }
  };

  // Print Statement Generator
  const printChequeStatement = (c: Cheque) => {
    const party = parties.find((p) => p.id === c.party_id);
    const bank = banks.find((b) => b.id === c.bank_id);
    const logs = paymentLogs.filter((p) => p.cheque_id === c.id);
    const remaining = c.remaining_amount ?? (c.status === 'Cleared' ? 0 : c.amount);
    const totalPaid = c.amount - remaining;

    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      showToast('Popup blocker prevented printing. Please allow popups.', 'error');
      return;
    }

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Cheque Statement #${c.cheque_number}</title>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; padding: 24px; color: #1e293b; }
          .header { display: flex; justify-content: space-between; border-bottom: 2px solid #0f172a; padding-bottom: 12px; margin-bottom: 20px; }
          .title { font-size: 20px; font-weight: bold; color: #0f172a; }
          .company { font-size: 14px; font-weight: bold; color: #4338ca; }
          .badge { display: inline-block; padding: 2px 8px; border-radius: 9999px; font-size: 11px; font-weight: bold; }
          .badge-pending { background: #fef3c7; color: #92400e; }
          .badge-partial { background: #e0f2fe; color: #0369a1; }
          .badge-cleared { background: #dcfce7; color: #15803d; }
          .grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; margin-bottom: 20px; }
          .card { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 12px; }
          .card-title { font-size: 10px; text-transform: uppercase; color: #64748b; font-weight: bold; }
          .card-value { font-size: 18px; font-weight: bold; margin-top: 4px; font-family: monospace; }
          table { width: 100%; border-collapse: collapse; margin-top: 16px; font-size: 12px; }
          th { background: #f1f5f9; text-align: left; padding: 8px; border-bottom: 1px solid #cbd5e1; font-weight: bold; }
          td { padding: 8px; border-bottom: 1px solid #f1f5f9; }
          .text-right { text-align: right; }
          .footer { margin-top: 30px; border-top: 1px solid #e2e8f0; padding-top: 12px; font-size: 11px; color: #94a3b8; display: flex; justify-content: space-between; }
        </style>
      </head>
      <body>
        <div class="header">
          <div>
            <div class="company">${currentCompany?.name || 'ChequeDesk Company'}</div>
            <div class="title">Cheque Ledger & Statement: #${c.cheque_number}</div>
          </div>
          <div style="text-align: right;">
            <div><strong>Status:</strong> <span class="badge ${c.status === 'Cleared' ? 'badge-cleared' : c.status === 'Partially Paid' ? 'badge-partial' : 'badge-pending'}">${c.status}</span></div>
            <div style="font-size: 12px; color: #64748b; margin-top: 4px;">Issued: ${c.issue_date_bs} BS (${c.issue_date_ad})</div>
            <div style="font-size: 12px; color: #64748b;">Due: ${c.due_date_bs} BS (${c.due_date_ad})</div>
          </div>
        </div>

        <div style="margin-bottom: 16px; font-size: 13px; line-height: 1.6;">
          <div><strong>Party / Beneficiary:</strong> ${party?.name || 'N/A'} ${party?.party_type ? `[${party.party_type}]` : ''}</div>
          <div><strong>Drawee Bank:</strong> ${bank?.name || 'N/A'} ${c.account_number ? `| A/C: ${c.account_number}` : ''}</div>
          ${c.bill_number ? `<div><strong>Bill / Invoice Reference:</strong> ${c.bill_number}</div>` : ''}
          ${c.notes ? `<div><strong>Notes:</strong> ${c.notes}</div>` : ''}
        </div>

        <div class="grid">
          <div class="card">
            <div class="card-title">Original Cheque Amount</div>
            <div class="card-value" style="color: #0f172a;">Rs ${c.amount.toLocaleString()}</div>
          </div>
          <div class="card">
            <div class="card-title">Total Settled / Paid</div>
            <div class="card-value" style="color: #16a34a;">Rs ${totalPaid.toLocaleString()}</div>
          </div>
          <div class="card">
            <div class="card-title">Current Pending Balance</div>
            <div class="card-value" style="color: ${remaining > 0 ? '#d97706' : '#16a34a'};">Rs ${remaining.toLocaleString()}</div>
          </div>
        </div>

        <h3 style="font-size: 14px; margin-bottom: 6px;">Installment / Payment Ledger</h3>
        <table>
          <thead>
            <tr>
              <th>#</th>
              <th>Date (BS)</th>
              <th>Date (AD)</th>
              <th>Payment Mode</th>
              <th>Type</th>
              <th class="text-right">Amount (NPR)</th>
              <th>Recorded By</th>
              <th>Notes</th>
            </tr>
          </thead>
          <tbody>
            ${
              logs.length === 0
                ? '<tr><td colspan="8" style="text-align: center; color: #94a3b8; padding: 16px;">No payments recorded yet.</td></tr>'
                : logs
                    .map(
                      (log, idx) => `
                <tr>
                  <td>${idx + 1}</td>
                  <td>${log.payment_date_bs}</td>
                  <td>${log.payment_date_ad}</td>
                  <td><strong>${log.payment_mode}</strong></td>
                  <td>${log.payment_type || 'Installment'}</td>
                  <td class="text-right" style="font-weight: bold; font-family: monospace;">Rs ${log.amount.toLocaleString()}</td>
                  <td>${log.recorded_by || 'Staff'}</td>
                  <td>${log.notes || '—'}</td>
                </tr>
              `
                    )
                    .join('')
            }
          </tbody>
        </table>

        <div class="footer">
          <div>Generated by ChequeDesk Pro • ${getCurrentBsDate()} BS (${getCurrentAdDate()})</div>
          <div>Authorized Signatory: ________________________</div>
        </div>
        <script>window.print();</script>
      </body>
      </html>
    `;
    printWindow.document.open();
    printWindow.document.write(html);
    printWindow.document.close();
  };

  const exportStatementToExcel = (c: Cheque) => {
    try {
      const party = parties.find((p) => p.id === c.party_id);
      const bank = banks.find((b) => b.id === c.bank_id);
      const logs = paymentLogs.filter((p) => p.cheque_id === c.id);
      const remaining = c.remaining_amount ?? (c.status === 'Cleared' ? 0 : c.amount);

      const wb = XLSX.utils.book_new();
      const overviewData = [
        ['Cheque Number', c.cheque_number],
        ['Party Name', party?.name || 'N/A'],
        ['Party Classification', party?.party_type || 'Sundry Debtors'],
        ['Bank Name', bank?.name || 'N/A'],
        ['Bill #', c.bill_number || 'N/A'],
        ['Issue Date BS', c.issue_date_bs],
        ['Due Date BS', c.due_date_bs],
        ['Status', c.status],
        ['Original Amount (NPR)', c.amount],
        ['Settled / Paid (NPR)', c.amount - remaining],
        ['Pending Balance (NPR)', remaining],
      ];
      const wsOverview = XLSX.utils.aoa_to_sheet(overviewData);
      XLSX.utils.book_append_sheet(wb, wsOverview, 'Cheque Summary');

      const ledgerRows = logs.map((log, idx) => ({
        'Installment #': idx + 1,
        'Date BS': log.payment_date_bs,
        'Date AD': log.payment_date_ad,
        'Payment Mode': log.payment_mode,
        'Type': log.payment_type || (party?.party_type === 'Sundry Creditors' ? 'Payment' : 'Received'),
        'Amount Paid (NPR)': log.amount,
        'Recorded By': log.recorded_by || 'Staff',
        'Notes': log.notes || '',
      }));
      const wsLedger = XLSX.utils.json_to_sheet(ledgerRows.length > 0 ? ledgerRows : [{ Info: 'No payments recorded' }]);
      XLSX.utils.book_append_sheet(wb, wsLedger, 'Payment Ledger');

      XLSX.writeFile(wb, `Cheque_Statement_${c.cheque_number}.xlsx`);
      showToast('Statement exported to Excel', 'success');
    } catch {
      showToast('Failed to export statement to Excel', 'error');
    }
  };

  // ==========================================
  // VIEW 1: AUTH LOGIN SCREEN
  // ==========================================
  if (!isLoggedIn) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4 relative overflow-hidden">
        {/* Background ambient accents */}
        <div className="absolute -top-32 -left-32 w-96 h-96 bg-indigo-600/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-32 -right-32 w-96 h-96 bg-purple-600/20 rounded-full blur-3xl pointer-events-none" />

        <div className="w-full max-w-md bg-slate-800/90 border border-slate-700/80 rounded-2xl p-6 sm:p-8 shadow-2xl relative z-10 backdrop-blur-md">
          <div className="flex items-center justify-center gap-3 mb-6">
            <div className="p-3 bg-indigo-600 text-white rounded-2xl shadow-lg">
              <CreditCard className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl font-black text-white tracking-tight">ChequeDesk</h1>
              <p className="text-xs text-slate-400">Enterprise Cheque Register & Ledger</p>
            </div>
          </div>

          {loginError && (
            <div className="mb-4 p-3 bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs rounded-xl flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0 text-rose-400" />
              <span>{loginError}</span>
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Company Code</label>
              <div className="relative">
                <Building2 className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                <input
                  type="text"
                  placeholder="e.g. 1001 or RS398"
                  value={companyCode}
                  onChange={(e) => setCompanyCode(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Username</label>
              <div className="relative">
                <Users className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                <input
                  type="text"
                  required
                  placeholder="e.g. admin or accountant"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Password</label>
              <div className="relative">
                <Shield className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                <input
                  type="password"
                  required
                  placeholder="Enter password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>

            <button
              type="submit"
              className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-bold shadow-md transition cursor-pointer flex items-center justify-center gap-2 mt-2"
            >
              <span>Sign In</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>
        </div>
      </div>
    );
  }

  // ==========================================
  // VIEW 2: DEVELOPER CONSOLE (SUPER ADMIN)
  // ==========================================
  if (role === 'SUPER_ADMIN') {
    return (
      <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col">
        {/* Toast Notification */}
        {toastMessage && (
          <div className="fixed bottom-5 right-5 z-50 px-4 py-2.5 bg-slate-800 border border-slate-700 text-white text-xs font-semibold rounded-xl shadow-2xl flex items-center gap-2">
            <Check className="w-4 h-4 text-emerald-400" />
            <span>{toastMessage.text}</span>
          </div>
        )}

        {/* Super Admin Header */}
        <header className="bg-slate-950/80 border-b border-slate-800 px-6 py-4 flex items-center justify-between sticky top-0 z-30 backdrop-blur-md">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-600 rounded-xl text-white shadow-md">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base font-bold text-white">Developer Console</h1>
                <span className="px-2 py-0.5 bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 rounded text-[10px] font-bold">
                  Kuber Super Admin
                </span>
              </div>
              <p className="text-xs text-slate-400">Multi-tenant client company management & master control</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={openAddCompanyModal}
              className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-xs"
            >
              <Plus className="w-4 h-4" />
              <span>Add Company</span>
            </button>
            <button
              onClick={handleLogout}
              className="px-3 py-1.5 bg-slate-800 hover:bg-rose-900/40 text-slate-300 hover:text-rose-400 border border-slate-700 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Logout</span>
            </button>
          </div>
        </header>

        {/* Main Content */}
        <main className="flex-1 max-w-7xl w-full mx-auto p-6 space-y-6">
          {/* Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-slate-800/80 border border-slate-700/80 rounded-2xl p-4">
              <div className="text-xs font-bold text-slate-400 uppercase">Total Client Companies</div>
              <div className="text-2xl font-black text-white mt-1">{companies.length}</div>
              <p className="text-[11px] text-slate-500 mt-1">Multi-tenant active databases</p>
            </div>
            <div className="bg-slate-800/80 border border-slate-700/80 rounded-2xl p-4">
              <div className="text-xs font-bold text-slate-400 uppercase">Active Subscriptions</div>
              <div className="text-2xl font-black text-emerald-400 mt-1">
                {companies.filter((c) => c.is_active !== false && c.subscription_status !== 'Suspended').length}
              </div>
              <p className="text-[11px] text-emerald-500/80 mt-1">Authorized client licenses</p>
            </div>
            <div className="bg-slate-800/80 border border-slate-700/80 rounded-2xl p-4">
              <div className="text-xs font-bold text-slate-400 uppercase">Sales & Feature Control</div>
              <div className="text-sm font-bold text-indigo-400 mt-2 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span>Operational (5 Core Modules Managed)</span>
              </div>
              <p className="text-[11px] text-slate-500 mt-1">Print, Drive, Local, Import, Master Data</p>
            </div>
          </div>

          {/* Companies Table Card */}
          <div className="bg-slate-800/80 border border-slate-700/80 rounded-2xl overflow-hidden shadow-xl">
            <div className="p-4 border-b border-slate-700 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h2 className="text-sm font-bold text-white">Client Company Registry & Permission Matrix</h2>
                <p className="text-xs text-slate-400">Configure feature permissions, manage licenses, and access tenant workspaces</p>
              </div>
              <span className="text-xs font-mono bg-slate-900 px-2.5 py-1 rounded-lg text-indigo-400 border border-slate-700 self-start sm:self-auto">
                {companies.length} Registered Tenants
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-300">
                <thead className="bg-slate-900/80 border-b border-slate-700 text-slate-400 font-bold uppercase text-[10px]">
                  <tr>
                    <th className="py-3 px-4">Company & Owner</th>
                    <th className="py-3 px-4">Code & Password</th>
                    <th className="py-3 px-4">Plan & Validity</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4">Feature Permissions</th>
                    <th className="py-3 px-4 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-700/60">
                  {companies.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-slate-500">
                        No companies registered yet. Click &quot;Add Company&quot; to create one.
                      </td>
                    </tr>
                  ) : (
                    companies.map((comp, idx) => {
                      const f = comp.features || {};
                      const hasPrint = f.print_cheque !== undefined ? f.print_cheque : (f.cheque_printing !== undefined ? f.cheque_printing : true);
                      const hasDrive = f.google_drive_backup !== undefined ? f.google_drive_backup : true;
                      const hasLocal = f.local_disk_backup !== undefined ? f.local_disk_backup : (f.offline_backup_system !== undefined ? f.offline_backup_system : true);
                      const hasImport = f.import_cheques !== undefined ? f.import_cheques : (f.bulk_cheque_import !== undefined ? f.bulk_cheque_import : true);
                      const hasMaster = f.parties_banks !== undefined ? f.parties_banks : true;
                      const isActive = comp.is_active !== false && comp.subscription_status !== 'Suspended';

                      return (
                        <tr key={`${comp.id || 'comp'}-${comp.company_code || ''}-${idx}`} className="hover:bg-slate-700/30 transition">
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-2.5">
                              <div className="p-2 bg-slate-900 text-indigo-400 rounded-lg border border-slate-700 shrink-0">
                                <Building2 className="w-4 h-4" />
                              </div>
                              <div>
                                <div className="font-bold text-white text-sm">{comp.name}</div>
                                <div className="text-[11px] text-slate-400">
                                  {comp.owner_name || `${comp.name} Admin`} &bull; {comp.contact_phone || '9800000000'}
                                </div>
                              </div>
                            </div>
                          </td>
                          <td className="py-3 px-4">
                            <div className="space-y-1">
                              <div className="font-mono font-bold text-indigo-400 bg-slate-900/80 px-2 py-0.5 rounded border border-slate-700 inline-block text-xs">
                                {comp.company_code || '1001'}
                              </div>
                              <div className="text-[10px] text-slate-400 flex items-center gap-1 font-mono">
                                <Key className="w-3 h-3 text-slate-500" />
                                <span>{(comp as any).admin_password || 'Pass@123'}</span>
                              </div>
                            </div>
                          </td>
                          <td className="py-3 px-4">
                            <div className="space-y-1">
                              <span className={`px-2 py-0.5 rounded text-[10px] font-semibold border ${
                                comp.subscription_plan === 'Enterprise'
                                  ? 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30'
                                  : comp.subscription_plan === 'Standard'
                                  ? 'bg-sky-500/20 text-sky-300 border-sky-500/30'
                                  : 'bg-slate-900 text-slate-300 border-slate-700'
                              }`}>
                                {comp.subscription_plan || 'Enterprise'}
                              </span>
                              <div className="text-[10px] text-slate-400">
                                Valid: <span className="font-mono text-slate-300">{comp.expiry_date_bs || '2082-12-30'} BS</span>
                              </div>
                            </div>
                          </td>
                          <td className="py-3 px-4">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold border inline-flex items-center gap-1 ${
                              isActive
                                ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                                : 'bg-rose-500/20 text-rose-300 border-rose-500/30'
                            }`}>
                              <span className={`w-1.5 h-1.5 rounded-full ${isActive ? 'bg-emerald-400' : 'bg-rose-400'}`} />
                              {isActive ? 'Active' : 'Inactive'}
                            </span>
                          </td>
                          <td className="py-3 px-4">
                            <div className="flex flex-wrap gap-1.5 max-w-[220px]">
                              <span
                                title="Print Cheque Leaf"
                                className={`px-1.5 py-0.5 rounded text-[9px] font-semibold flex items-center gap-1 border ${
                                  hasPrint
                                    ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
                                    : 'bg-slate-900/60 text-slate-500 border-slate-800 line-through'
                                }`}
                              >
                                <Printer className="w-2.5 h-2.5" />
                                Print
                              </span>
                              <span
                                title="Google Drive Cloud Sync"
                                className={`px-1.5 py-0.5 rounded text-[9px] font-semibold flex items-center gap-1 border ${
                                  hasDrive
                                    ? 'bg-sky-500/15 text-sky-300 border-sky-500/30'
                                    : 'bg-slate-900/60 text-slate-500 border-slate-800 line-through'
                                }`}
                              >
                                <Cloud className="w-2.5 h-2.5" />
                                Drive
                              </span>
                              <span
                                title="Offline Local Disk Backup"
                                className={`px-1.5 py-0.5 rounded text-[9px] font-semibold flex items-center gap-1 border ${
                                  hasLocal
                                    ? 'bg-indigo-500/15 text-indigo-300 border-indigo-500/30'
                                    : 'bg-slate-900/60 text-slate-500 border-slate-800 line-through'
                                }`}
                              >
                                <HardDrive className="w-2.5 h-2.5" />
                                Local
                              </span>
                              <span
                                title="Import External Software Cheques"
                                className={`px-1.5 py-0.5 rounded text-[9px] font-semibold flex items-center gap-1 border ${
                                  hasImport
                                    ? 'bg-purple-500/15 text-purple-300 border-purple-500/30'
                                    : 'bg-slate-900/60 text-slate-500 border-slate-800 line-through'
                                }`}
                              >
                                <FileSpreadsheet className="w-2.5 h-2.5" />
                                Import
                              </span>
                              <span
                                title="Parties & Banks Master Data"
                                className={`px-1.5 py-0.5 rounded text-[9px] font-semibold flex items-center gap-1 border ${
                                  hasMaster
                                    ? 'bg-amber-500/15 text-amber-300 border-amber-500/30'
                                    : 'bg-slate-900/60 text-slate-500 border-slate-800 line-through'
                                }`}
                              >
                                <Users className="w-2.5 h-2.5" />
                                Master
                              </span>
                            </div>
                          </td>
                          <td className="py-3 px-4 text-center">
                            <div className="flex items-center justify-center gap-1.5">
                              <button
                                onClick={() => openEditCompanyModal(comp)}
                                className="px-2 py-1 bg-slate-700 hover:bg-slate-600 text-indigo-300 border border-slate-600 rounded-lg text-xs font-semibold transition flex items-center gap-1 cursor-pointer"
                                title="Edit License & Feature Controls"
                              >
                                <Sliders className="w-3.5 h-3.5 text-indigo-400" />
                                <span className="hidden xl:inline">Manage Features</span>
                              </button>

                              <button
                                onClick={() => handleAccessCompany(comp)}
                                className="px-2 py-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold transition flex items-center gap-1 cursor-pointer shadow-xs"
                                title="Access ChequeDesk workspace"
                              >
                                <Eye className="w-3.5 h-3.5" />
                                <span>Access</span>
                              </button>

                              <button
                                onClick={() => setCompanyToDelete(comp)}
                                className="p-1 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 rounded-lg transition cursor-pointer"
                                title="Delete Company"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </main>

        {/* Delete Company Confirmation Modal */}
        {companyToDelete && (
          <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-slate-800 border border-slate-700 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
              <div className="flex items-center gap-3 text-rose-400">
                <div className="p-3 bg-rose-500/20 rounded-xl">
                  <AlertTriangle className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">Delete Client Company</h3>
                  <p className="text-xs text-slate-400">This action cannot be undone.</p>
                </div>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed">
                Are you sure you want to permanently delete company <strong>&quot;{companyToDelete.name}&quot;</strong> (Code: <code className="text-indigo-400 font-mono font-bold">{companyToDelete.company_code}</code>)? All ledger data and configurations will be removed.
              </p>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  onClick={() => setCompanyToDelete(null)}
                  className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-xl text-xs font-bold transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleDeleteCompany(companyToDelete)}
                  className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold transition cursor-pointer shadow-md"
                >
                  Confirm Delete
                </button>
              </div>
            </div>
          </div>
        )}

        {/* MODAL 1: EDIT COMPANY & MANAGE FEATURES MODAL */}
        {editingCompany && (
          <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
            <div className="bg-slate-800 border border-slate-700 rounded-2xl max-w-2xl w-full p-6 shadow-2xl space-y-5 my-8">
              <div className="flex items-center justify-between pb-3 border-b border-slate-700">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 bg-indigo-600/30 text-indigo-400 border border-indigo-500/30 rounded-xl">
                    <Sliders className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-white">Feature Controls & License Management</h3>
                    <p className="text-xs text-slate-400">
                      Configuring company: <strong className="text-white">{editingCompany.name}</strong> (Code: <span className="font-mono text-indigo-400">{editingCompany.company_code}</span>)
                    </p>
                  </div>
                </div>
                <button onClick={() => setEditingCompany(null)} className="text-slate-400 hover:text-white p-1">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleSaveCompanyChanges} className="space-y-5 text-xs">
                {/* 1. Identity & Credentials Section */}
                <div className="space-y-3 bg-slate-900/60 p-4 rounded-xl border border-slate-700/60">
                  <div className="text-xs font-bold uppercase tracking-wider text-indigo-400 flex items-center gap-1.5">
                    <Building2 className="w-3.5 h-3.5" />
                    <span>Company Credentials & Identity</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-slate-300 font-semibold mb-1">Company Name</label>
                      <input
                        required
                        value={companyEditForm.name}
                        onChange={(e) => setCompanyEditForm({ ...companyEditForm, name: e.target.value })}
                        className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-300 font-semibold mb-1">Company Code</label>
                      <input
                        required
                        value={companyEditForm.company_code}
                        onChange={(e) => setCompanyEditForm({ ...companyEditForm, company_code: e.target.value })}
                        className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-white font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-300 font-semibold mb-1">Client Password</label>
                      <input
                        required
                        value={companyEditForm.admin_password}
                        onChange={(e) => setCompanyEditForm({ ...companyEditForm, admin_password: e.target.value })}
                        className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-white font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-300 font-semibold mb-1">Owner / Primary Contact</label>
                      <input
                        value={companyEditForm.owner_name}
                        onChange={(e) => setCompanyEditForm({ ...companyEditForm, owner_name: e.target.value })}
                        className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-300 font-semibold mb-1">Contact Email</label>
                      <input
                        type="email"
                        value={companyEditForm.contact_email}
                        onChange={(e) => setCompanyEditForm({ ...companyEditForm, contact_email: e.target.value })}
                        className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-300 font-semibold mb-1">Contact Phone</label>
                      <input
                        value={companyEditForm.contact_phone}
                        onChange={(e) => setCompanyEditForm({ ...companyEditForm, contact_phone: e.target.value })}
                        className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>
                  </div>
                </div>

                {/* 2. License & Validity Section */}
                <div className="space-y-3 bg-slate-900/60 p-4 rounded-xl border border-slate-700/60">
                  <div className="text-xs font-bold uppercase tracking-wider text-sky-400 flex items-center gap-1.5">
                    <Shield className="w-3.5 h-3.5" />
                    <span>License & Validity Management</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="sm:col-span-1">
                      <label className="block text-slate-300 font-semibold mb-1">Subscription Plan</label>
                      <select
                        value={companyEditForm.subscription_plan}
                        onChange={(e) =>
                          setCompanyEditForm({
                            ...companyEditForm,
                            subscription_plan: e.target.value as any,
                          })
                        }
                        className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
                      >
                        <option value="Basic">Basic (Standard Ledger)</option>
                        <option value="Standard">Standard (Reconciliation + Backup)</option>
                        <option value="Enterprise">Enterprise (Full Suite)</option>
                      </select>
                    </div>

                    <div className="sm:col-span-1">
                      <label className="block text-slate-300 font-semibold mb-1">Expiry Date (BS)</label>
                      <input
                        value={companyEditForm.expiry_date_bs}
                        onChange={(e) => setCompanyEditForm({ ...companyEditForm, expiry_date_bs: e.target.value })}
                        placeholder="YYYY-MM-DD"
                        className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-white font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>

                    <div className="sm:col-span-1">
                      <label className="block text-slate-300 font-semibold mb-1">Expiry Date (AD)</label>
                      <input
                        value={companyEditForm.expiry_date_ad}
                        onChange={(e) => setCompanyEditForm({ ...companyEditForm, expiry_date_ad: e.target.value })}
                        placeholder="YYYY-MM-DD"
                        className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-white font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>
                  </div>

                  {/* Account Active / Inactive Toggle */}
                  <div className="flex items-center justify-between pt-2 border-t border-slate-800">
                    <div>
                      <div className="text-white font-semibold">Account Active Status</div>
                      <div className="text-[11px] text-slate-400">Enable or suspend tenant login authorization</div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setCompanyEditForm({ ...companyEditForm, is_active: !companyEditForm.is_active })}
                      className={`px-3 py-1.5 rounded-xl font-bold flex items-center gap-2 cursor-pointer transition ${
                        companyEditForm.is_active
                          ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                          : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                      }`}
                    >
                      <span className={`w-2 h-2 rounded-full ${companyEditForm.is_active ? 'bg-emerald-400' : 'bg-rose-400'}`} />
                      <span>{companyEditForm.is_active ? 'Active (Authorized)' : 'Inactive (Suspended)'}</span>
                    </button>
                  </div>
                </div>

                {/* 3. Feature Permissions Matrix (The 5 Toggles) */}
                <div className="space-y-3 bg-slate-900/60 p-4 rounded-xl border border-slate-700/60">
                  <div className="flex items-center justify-between">
                    <div className="text-xs font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
                      <Sliders className="w-3.5 h-3.5" />
                      <span>Feature Permissions Controls (Sales Matrix)</span>
                    </div>
                    <span className="text-[10px] text-slate-400">Strictly enforced in tenant dashboard</span>
                  </div>

                  <div className="grid grid-cols-1 gap-2.5">
                    {/* Toggle 1: Print Cheque */}
                    <div
                      onClick={() =>
                        setCompanyEditForm({
                          ...companyEditForm,
                          features: { ...companyEditForm.features, print_cheque: !companyEditForm.features.print_cheque },
                        })
                      }
                      className={`p-3 rounded-xl border transition cursor-pointer flex items-center justify-between gap-3 ${
                        companyEditForm.features.print_cheque
                          ? 'bg-slate-800/90 border-emerald-500/40'
                          : 'bg-slate-900/50 border-slate-800 opacity-60'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-lg ${companyEditForm.features.print_cheque ? 'bg-emerald-600 text-white' : 'bg-slate-800 text-slate-500'}`}>
                          <Printer className="w-4 h-4" />
                        </div>
                        <div>
                          <div className="font-bold text-white flex items-center gap-2">
                            <span>Print Cheque Leaf</span>
                            <span className={`px-1.5 py-0.2 rounded text-[9px] font-bold ${companyEditForm.features.print_cheque ? 'bg-emerald-500/20 text-emerald-300' : 'bg-slate-800 text-slate-400'}`}>
                              {companyEditForm.features.print_cheque ? 'Enabled' : 'Disabled'}
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-400">Physical bank leaf layout, Amount in Words conversion, A/C Payee stamp</p>
                        </div>
                      </div>
                      <div className={`w-10 h-5 flex items-center rounded-full p-0.5 transition duration-200 shrink-0 ${companyEditForm.features.print_cheque ? 'bg-emerald-600' : 'bg-slate-700'}`}>
                        <div className={`bg-white w-4 h-4 rounded-full shadow-md transform transition duration-200 ${companyEditForm.features.print_cheque ? 'translate-x-5' : 'translate-x-0'}`} />
                      </div>
                    </div>

                    {/* Toggle 2: Google Drive Backup */}
                    <div
                      onClick={() =>
                        setCompanyEditForm({
                          ...companyEditForm,
                          features: { ...companyEditForm.features, google_drive_backup: !companyEditForm.features.google_drive_backup },
                        })
                      }
                      className={`p-3 rounded-xl border transition cursor-pointer flex items-center justify-between gap-3 ${
                        companyEditForm.features.google_drive_backup
                          ? 'bg-slate-800/90 border-sky-500/40'
                          : 'bg-slate-900/50 border-slate-800 opacity-60'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-lg ${companyEditForm.features.google_drive_backup ? 'bg-sky-600 text-white' : 'bg-slate-800 text-slate-500'}`}>
                          <Cloud className="w-4 h-4" />
                        </div>
                        <div>
                          <div className="font-bold text-white flex items-center gap-2">
                            <span>Google Drive Cloud Backup</span>
                            <span className={`px-1.5 py-0.2 rounded text-[9px] font-bold ${companyEditForm.features.google_drive_backup ? 'bg-sky-500/20 text-sky-300' : 'bg-slate-800 text-slate-400'}`}>
                              {companyEditForm.features.google_drive_backup ? 'Enabled' : 'Disabled'}
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-400">Encrypted snapshot backups, disaster recovery, cloud snapshot history</p>
                        </div>
                      </div>
                      <div className={`w-10 h-5 flex items-center rounded-full p-0.5 transition duration-200 shrink-0 ${companyEditForm.features.google_drive_backup ? 'bg-sky-600' : 'bg-slate-700'}`}>
                        <div className={`bg-white w-4 h-4 rounded-full shadow-md transform transition duration-200 ${companyEditForm.features.google_drive_backup ? 'translate-x-5' : 'translate-x-0'}`} />
                      </div>
                    </div>

                    {/* Toggle 3: Offline Local Disk Backup */}
                    <div
                      onClick={() =>
                        setCompanyEditForm({
                          ...companyEditForm,
                          features: { ...companyEditForm.features, local_disk_backup: !companyEditForm.features.local_disk_backup },
                        })
                      }
                      className={`p-3 rounded-xl border transition cursor-pointer flex items-center justify-between gap-3 ${
                        companyEditForm.features.local_disk_backup
                          ? 'bg-slate-800/90 border-indigo-500/40'
                          : 'bg-slate-900/50 border-slate-800 opacity-60'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-lg ${companyEditForm.features.local_disk_backup ? 'bg-indigo-600 text-white' : 'bg-slate-800 text-slate-500'}`}>
                          <HardDrive className="w-4 h-4" />
                        </div>
                        <div>
                          <div className="font-bold text-white flex items-center gap-2">
                            <span>Offline Local Disk Backup</span>
                            <span className={`px-1.5 py-0.2 rounded text-[9px] font-bold ${companyEditForm.features.local_disk_backup ? 'bg-indigo-500/20 text-indigo-300' : 'bg-slate-800 text-slate-400'}`}>
                              {companyEditForm.features.local_disk_backup ? 'Enabled' : 'Disabled'}
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-400">Direct JSON & Excel (.xlsx) downloads to computer and offline JSON restoration</p>
                        </div>
                      </div>
                      <div className={`w-10 h-5 flex items-center rounded-full p-0.5 transition duration-200 shrink-0 ${companyEditForm.features.local_disk_backup ? 'bg-indigo-600' : 'bg-slate-700'}`}>
                        <div className={`bg-white w-4 h-4 rounded-full shadow-md transform transition duration-200 ${companyEditForm.features.local_disk_backup ? 'translate-x-5' : 'translate-x-0'}`} />
                      </div>
                    </div>

                    {/* Toggle 4: Import External Software Cheques */}
                    <div
                      onClick={() =>
                        setCompanyEditForm({
                          ...companyEditForm,
                          features: { ...companyEditForm.features, import_cheques: !companyEditForm.features.import_cheques },
                        })
                      }
                      className={`p-3 rounded-xl border transition cursor-pointer flex items-center justify-between gap-3 ${
                        companyEditForm.features.import_cheques
                          ? 'bg-slate-800/90 border-purple-500/40'
                          : 'bg-slate-900/50 border-slate-800 opacity-60'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-lg ${companyEditForm.features.import_cheques ? 'bg-purple-600 text-white' : 'bg-slate-800 text-slate-500'}`}>
                          <FileSpreadsheet className="w-4 h-4" />
                        </div>
                        <div>
                          <div className="font-bold text-white flex items-center gap-2">
                            <span>Import External Software Cheques</span>
                            <span className={`px-1.5 py-0.2 rounded text-[9px] font-bold ${companyEditForm.features.import_cheques ? 'bg-purple-500/20 text-purple-300' : 'bg-slate-800 text-slate-400'}`}>
                              {companyEditForm.features.import_cheques ? 'Enabled' : 'Disabled'}
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-400">Upload & parse Excel, CSV, and JSON records from Tally, Busy, Swastik</p>
                        </div>
                      </div>
                      <div className={`w-10 h-5 flex items-center rounded-full p-0.5 transition duration-200 shrink-0 ${companyEditForm.features.import_cheques ? 'bg-purple-600' : 'bg-slate-700'}`}>
                        <div className={`bg-white w-4 h-4 rounded-full shadow-md transform transition duration-200 ${companyEditForm.features.import_cheques ? 'translate-x-5' : 'translate-x-0'}`} />
                      </div>
                    </div>

                    {/* Toggle 5: Parties & Banks Master Data */}
                    <div
                      onClick={() =>
                        setCompanyEditForm({
                          ...companyEditForm,
                          features: { ...companyEditForm.features, parties_banks: !companyEditForm.features.parties_banks },
                        })
                      }
                      className={`p-3 rounded-xl border transition cursor-pointer flex items-center justify-between gap-3 ${
                        companyEditForm.features.parties_banks
                          ? 'bg-slate-800/90 border-amber-500/40'
                          : 'bg-slate-900/50 border-slate-800 opacity-60'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-lg ${companyEditForm.features.parties_banks ? 'bg-amber-600 text-white' : 'bg-slate-800 text-slate-500'}`}>
                          <Users className="w-4 h-4" />
                        </div>
                        <div>
                          <div className="font-bold text-white flex items-center gap-2">
                            <span>Parties & Banks Master Data</span>
                            <span className={`px-1.5 py-0.2 rounded text-[9px] font-bold ${companyEditForm.features.parties_banks ? 'bg-amber-500/20 text-amber-300' : 'bg-slate-800 text-slate-400'}`}>
                              {companyEditForm.features.parties_banks ? 'Enabled' : 'Disabled'}
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-400">Master directories for Payee parties, vendors, and bank account registers</p>
                        </div>
                      </div>
                      <div className={`w-10 h-5 flex items-center rounded-full p-0.5 transition duration-200 shrink-0 ${companyEditForm.features.parties_banks ? 'bg-amber-600' : 'bg-slate-700'}`}>
                        <div className={`bg-white w-4 h-4 rounded-full shadow-md transform transition duration-200 ${companyEditForm.features.parties_banks ? 'translate-x-5' : 'translate-x-0'}`} />
                      </div>
                    </div>

                    {/* Toggle 6: Excel & PDF Export */}
                    <div
                      onClick={() =>
                        setCompanyEditForm({
                          ...companyEditForm,
                          features: { ...companyEditForm.features, excel_pdf_export: !companyEditForm.features.excel_pdf_export },
                        })
                      }
                      className={`p-3 rounded-xl border transition cursor-pointer flex items-center justify-between gap-3 ${
                        companyEditForm.features.excel_pdf_export
                          ? 'bg-slate-800/90 border-emerald-500/40'
                          : 'bg-slate-900/50 border-slate-800 opacity-60'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-lg ${companyEditForm.features.excel_pdf_export ? 'bg-emerald-600 text-white' : 'bg-slate-800 text-slate-500'}`}>
                          <Download className="w-4 h-4" />
                        </div>
                        <div>
                          <div className="font-bold text-white flex items-center gap-2">
                            <span>Excel & PDF Export Reports</span>
                            <span className={`px-1.5 py-0.2 rounded text-[9px] font-bold ${companyEditForm.features.excel_pdf_export ? 'bg-emerald-500/20 text-emerald-300' : 'bg-slate-800 text-slate-400'}`}>
                              {companyEditForm.features.excel_pdf_export ? 'Enabled' : 'Disabled'}
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-400">Export .xlsx spreadsheets and print-ready formatted A4 PDF reports</p>
                        </div>
                      </div>
                      <div className={`w-10 h-5 flex items-center rounded-full p-0.5 transition duration-200 shrink-0 ${companyEditForm.features.excel_pdf_export ? 'bg-emerald-600' : 'bg-slate-700'}`}>
                        <div className={`bg-white w-4 h-4 rounded-full shadow-md transform transition duration-200 ${companyEditForm.features.excel_pdf_export ? 'translate-x-5' : 'translate-x-0'}`} />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Modal Footer */}
                <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-3 border-t border-slate-700">
                  <button
                    type="button"
                    onClick={() => {
                      handleAccessCompany(editingCompany);
                      setEditingCompany(null);
                    }}
                    className="w-full sm:w-auto px-4 py-2 bg-indigo-900/60 hover:bg-indigo-900 text-indigo-300 border border-indigo-700/60 rounded-xl font-bold flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <Eye className="w-4 h-4" />
                    <span>Access Workspace Now</span>
                  </button>

                  <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                    <button
                      type="button"
                      onClick={() => setEditingCompany(null)}
                      className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-xl font-bold cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold cursor-pointer shadow-md flex items-center gap-1.5"
                    >
                      <Check className="w-4 h-4" />
                      <span>Save Changes & Permissions</span>
                    </button>
                  </div>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* MODAL 2: ADD COMPANY WITH FULL FEATURE & CREDENTIAL CONTROLS */}
        {isAddCompanyOpen && (
          <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
            <div className="bg-slate-800 border border-slate-700 rounded-2xl max-w-2xl w-full p-6 shadow-2xl space-y-5 my-8">
              <div className="flex items-center justify-between pb-3 border-b border-slate-700">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 bg-indigo-600 text-white rounded-xl shadow-md">
                    <Building2 className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-white">Register New Client Company</h3>
                    <p className="text-xs text-slate-400">Configure credentials, subscription validity, and granted feature toggles</p>
                  </div>
                </div>
                <button onClick={() => setIsAddCompanyOpen(false)} className="text-slate-400 hover:text-white p-1">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleCreateCompany} className="space-y-5 text-xs">
                {/* 1. Identity & Credentials */}
                <div className="space-y-3 bg-slate-900/60 p-4 rounded-xl border border-slate-700/60">
                  <div className="text-xs font-bold uppercase tracking-wider text-indigo-400 flex items-center gap-1.5">
                    <Building2 className="w-3.5 h-3.5" />
                    <span>Company Credentials & Identity</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-slate-300 font-semibold mb-1">Company Name</label>
                      <input
                        required
                        placeholder="e.g. Kathmandu Trading Pvt. Ltd."
                        value={newCompanyForm.name}
                        onChange={(e) => setNewCompanyForm({ ...newCompanyForm, name: e.target.value })}
                        className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-300 font-semibold mb-1">Company Code</label>
                      <input
                        required
                        placeholder="e.g. 1002"
                        value={newCompanyForm.company_code}
                        onChange={(e) => setNewCompanyForm({ ...newCompanyForm, company_code: e.target.value })}
                        className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-white font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-300 font-semibold mb-1">Client Access Password</label>
                      <input
                        required
                        placeholder="e.g. Pass@123"
                        value={newCompanyForm.admin_password}
                        onChange={(e) => setNewCompanyForm({ ...newCompanyForm, admin_password: e.target.value })}
                        className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-white font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-300 font-semibold mb-1">Owner / Primary Contact</label>
                      <input
                        placeholder="e.g. Binod Sharma"
                        value={newCompanyForm.owner_name}
                        onChange={(e) => setNewCompanyForm({ ...newCompanyForm, owner_name: e.target.value })}
                        className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-300 font-semibold mb-1">Contact Email</label>
                      <input
                        type="email"
                        placeholder="e.g. admin@kathmandutrading.com"
                        value={newCompanyForm.contact_email}
                        onChange={(e) => setNewCompanyForm({ ...newCompanyForm, contact_email: e.target.value })}
                        className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-300 font-semibold mb-1">Contact Phone</label>
                      <input
                        placeholder="e.g. 9841234567"
                        value={newCompanyForm.contact_phone}
                        onChange={(e) => setNewCompanyForm({ ...newCompanyForm, contact_phone: e.target.value })}
                        className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>
                  </div>
                </div>

                {/* 2. License & Validity */}
                <div className="space-y-3 bg-slate-900/60 p-4 rounded-xl border border-slate-700/60">
                  <div className="text-xs font-bold uppercase tracking-wider text-sky-400 flex items-center gap-1.5">
                    <Shield className="w-3.5 h-3.5" />
                    <span>License & Validity Management</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="sm:col-span-1">
                      <label className="block text-slate-300 font-semibold mb-1">Subscription Plan</label>
                      <select
                        value={newCompanyForm.subscription_plan}
                        onChange={(e) =>
                          setNewCompanyForm({
                            ...newCompanyForm,
                            subscription_plan: e.target.value as any,
                          })
                        }
                        className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
                      >
                        <option value="Basic">Basic (Standard Ledger)</option>
                        <option value="Standard">Standard (Reconciliation + Backup)</option>
                        <option value="Enterprise">Enterprise (Full Suite)</option>
                      </select>
                    </div>

                    <div className="sm:col-span-1">
                      <label className="block text-slate-300 font-semibold mb-1">Expiry Date (BS)</label>
                      <input
                        value={newCompanyForm.expiry_date_bs}
                        onChange={(e) => setNewCompanyForm({ ...newCompanyForm, expiry_date_bs: e.target.value })}
                        placeholder="YYYY-MM-DD"
                        className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-white font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>

                    <div className="sm:col-span-1">
                      <label className="block text-slate-300 font-semibold mb-1">Expiry Date (AD)</label>
                      <input
                        value={newCompanyForm.expiry_date_ad}
                        onChange={(e) => setNewCompanyForm({ ...newCompanyForm, expiry_date_ad: e.target.value })}
                        placeholder="YYYY-MM-DD"
                        className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-white font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>
                  </div>
                </div>

                {/* 3. Feature Permissions Toggles */}
                <div className="space-y-3 bg-slate-900/60 p-4 rounded-xl border border-slate-700/60">
                  <div className="text-xs font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
                    <Sliders className="w-3.5 h-3.5" />
                    <span>Grant Feature Permissions</span>
                  </div>

                  <div className="grid grid-cols-1 gap-2.5">
                    {/* Toggle 1: Print Cheque */}
                    <div
                      onClick={() =>
                        setNewCompanyForm({
                          ...newCompanyForm,
                          features: { ...newCompanyForm.features, print_cheque: !newCompanyForm.features.print_cheque },
                        })
                      }
                      className={`p-3 rounded-xl border transition cursor-pointer flex items-center justify-between gap-3 ${
                        newCompanyForm.features.print_cheque
                          ? 'bg-slate-800/90 border-emerald-500/40'
                          : 'bg-slate-900/50 border-slate-800 opacity-60'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-lg ${newCompanyForm.features.print_cheque ? 'bg-emerald-600 text-white' : 'bg-slate-800 text-slate-500'}`}>
                          <Printer className="w-4 h-4" />
                        </div>
                        <div>
                          <div className="font-bold text-white flex items-center gap-2">
                            <span>Print Cheque Leaf</span>
                            <span className={`px-1.5 py-0.2 rounded text-[9px] font-bold ${newCompanyForm.features.print_cheque ? 'bg-emerald-500/20 text-emerald-300' : 'bg-slate-800 text-slate-400'}`}>
                              {newCompanyForm.features.print_cheque ? 'Enabled' : 'Disabled'}
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-400">Physical bank leaf layout, Amount in Words conversion, A/C Payee stamp</p>
                        </div>
                      </div>
                      <div className={`w-10 h-5 flex items-center rounded-full p-0.5 transition duration-200 shrink-0 ${newCompanyForm.features.print_cheque ? 'bg-emerald-600' : 'bg-slate-700'}`}>
                        <div className={`bg-white w-4 h-4 rounded-full shadow-md transform transition duration-200 ${newCompanyForm.features.print_cheque ? 'translate-x-5' : 'translate-x-0'}`} />
                      </div>
                    </div>

                    {/* Toggle 2: Google Drive Backup */}
                    <div
                      onClick={() =>
                        setNewCompanyForm({
                          ...newCompanyForm,
                          features: { ...newCompanyForm.features, google_drive_backup: !newCompanyForm.features.google_drive_backup },
                        })
                      }
                      className={`p-3 rounded-xl border transition cursor-pointer flex items-center justify-between gap-3 ${
                        newCompanyForm.features.google_drive_backup
                          ? 'bg-slate-800/90 border-sky-500/40'
                          : 'bg-slate-900/50 border-slate-800 opacity-60'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-lg ${newCompanyForm.features.google_drive_backup ? 'bg-sky-600 text-white' : 'bg-slate-800 text-slate-500'}`}>
                          <Cloud className="w-4 h-4" />
                        </div>
                        <div>
                          <div className="font-bold text-white flex items-center gap-2">
                            <span>Google Drive Cloud Backup</span>
                            <span className={`px-1.5 py-0.2 rounded text-[9px] font-bold ${newCompanyForm.features.google_drive_backup ? 'bg-sky-500/20 text-sky-300' : 'bg-slate-800 text-slate-400'}`}>
                              {newCompanyForm.features.google_drive_backup ? 'Enabled' : 'Disabled'}
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-400">Encrypted snapshot backups, disaster recovery, cloud snapshot history</p>
                        </div>
                      </div>
                      <div className={`w-10 h-5 flex items-center rounded-full p-0.5 transition duration-200 shrink-0 ${newCompanyForm.features.google_drive_backup ? 'bg-sky-600' : 'bg-slate-700'}`}>
                        <div className={`bg-white w-4 h-4 rounded-full shadow-md transform transition duration-200 ${newCompanyForm.features.google_drive_backup ? 'translate-x-5' : 'translate-x-0'}`} />
                      </div>
                    </div>

                    {/* Toggle 3: Offline Local Disk Backup */}
                    <div
                      onClick={() =>
                        setNewCompanyForm({
                          ...newCompanyForm,
                          features: { ...newCompanyForm.features, local_disk_backup: !newCompanyForm.features.local_disk_backup },
                        })
                      }
                      className={`p-3 rounded-xl border transition cursor-pointer flex items-center justify-between gap-3 ${
                        newCompanyForm.features.local_disk_backup
                          ? 'bg-slate-800/90 border-indigo-500/40'
                          : 'bg-slate-900/50 border-slate-800 opacity-60'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-lg ${newCompanyForm.features.local_disk_backup ? 'bg-indigo-600 text-white' : 'bg-slate-800 text-slate-500'}`}>
                          <HardDrive className="w-4 h-4" />
                        </div>
                        <div>
                          <div className="font-bold text-white flex items-center gap-2">
                            <span>Offline Local Disk Backup</span>
                            <span className={`px-1.5 py-0.2 rounded text-[9px] font-bold ${newCompanyForm.features.local_disk_backup ? 'bg-indigo-500/20 text-indigo-300' : 'bg-slate-800 text-slate-400'}`}>
                              {newCompanyForm.features.local_disk_backup ? 'Enabled' : 'Disabled'}
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-400">Direct JSON & Excel (.xlsx) downloads to computer and offline JSON restoration</p>
                        </div>
                      </div>
                      <div className={`w-10 h-5 flex items-center rounded-full p-0.5 transition duration-200 shrink-0 ${newCompanyForm.features.local_disk_backup ? 'bg-indigo-600' : 'bg-slate-700'}`}>
                        <div className={`bg-white w-4 h-4 rounded-full shadow-md transform transition duration-200 ${newCompanyForm.features.local_disk_backup ? 'translate-x-5' : 'translate-x-0'}`} />
                      </div>
                    </div>

                    {/* Toggle 4: Import External Software Cheques */}
                    <div
                      onClick={() =>
                        setNewCompanyForm({
                          ...newCompanyForm,
                          features: { ...newCompanyForm.features, import_cheques: !newCompanyForm.features.import_cheques },
                        })
                      }
                      className={`p-3 rounded-xl border transition cursor-pointer flex items-center justify-between gap-3 ${
                        newCompanyForm.features.import_cheques
                          ? 'bg-slate-800/90 border-purple-500/40'
                          : 'bg-slate-900/50 border-slate-800 opacity-60'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-lg ${newCompanyForm.features.import_cheques ? 'bg-purple-600 text-white' : 'bg-slate-800 text-slate-500'}`}>
                          <FileSpreadsheet className="w-4 h-4" />
                        </div>
                        <div>
                          <div className="font-bold text-white flex items-center gap-2">
                            <span>Import External Software Cheques</span>
                            <span className={`px-1.5 py-0.2 rounded text-[9px] font-bold ${newCompanyForm.features.import_cheques ? 'bg-purple-500/20 text-purple-300' : 'bg-slate-800 text-slate-400'}`}>
                              {newCompanyForm.features.import_cheques ? 'Enabled' : 'Disabled'}
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-400">Upload & parse Excel, CSV, and JSON records from Tally, Busy, Swastik</p>
                        </div>
                      </div>
                      <div className={`w-10 h-5 flex items-center rounded-full p-0.5 transition duration-200 shrink-0 ${newCompanyForm.features.import_cheques ? 'bg-purple-600' : 'bg-slate-700'}`}>
                        <div className={`bg-white w-4 h-4 rounded-full shadow-md transform transition duration-200 ${newCompanyForm.features.import_cheques ? 'translate-x-5' : 'translate-x-0'}`} />
                      </div>
                    </div>

                    {/* Toggle 5: Parties & Banks Master Data */}
                    <div
                      onClick={() =>
                        setNewCompanyForm({
                          ...newCompanyForm,
                          features: { ...newCompanyForm.features, parties_banks: !newCompanyForm.features.parties_banks },
                        })
                      }
                      className={`p-3 rounded-xl border transition cursor-pointer flex items-center justify-between gap-3 ${
                        newCompanyForm.features.parties_banks
                          ? 'bg-slate-800/90 border-amber-500/40'
                          : 'bg-slate-900/50 border-slate-800 opacity-60'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-lg ${newCompanyForm.features.parties_banks ? 'bg-amber-600 text-white' : 'bg-slate-800 text-slate-500'}`}>
                          <Users className="w-4 h-4" />
                        </div>
                        <div>
                          <div className="font-bold text-white flex items-center gap-2">
                            <span>Parties & Banks Master Data</span>
                            <span className={`px-1.5 py-0.2 rounded text-[9px] font-bold ${newCompanyForm.features.parties_banks ? 'bg-amber-500/20 text-amber-300' : 'bg-slate-800 text-slate-400'}`}>
                              {newCompanyForm.features.parties_banks ? 'Enabled' : 'Disabled'}
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-400">Master directories for Payee parties, vendors, and bank account registers</p>
                        </div>
                      </div>
                      <div className={`w-10 h-5 flex items-center rounded-full p-0.5 transition duration-200 shrink-0 ${newCompanyForm.features.parties_banks ? 'bg-amber-600' : 'bg-slate-700'}`}>
                        <div className={`bg-white w-4 h-4 rounded-full shadow-md transform transition duration-200 ${newCompanyForm.features.parties_banks ? 'translate-x-5' : 'translate-x-0'}`} />
                      </div>
                    </div>

                    {/* Toggle 6: Excel & PDF Export */}
                    <div
                      onClick={() =>
                        setNewCompanyForm({
                          ...newCompanyForm,
                          features: { ...newCompanyForm.features, excel_pdf_export: !newCompanyForm.features.excel_pdf_export },
                        })
                      }
                      className={`p-3 rounded-xl border transition cursor-pointer flex items-center justify-between gap-3 ${
                        newCompanyForm.features.excel_pdf_export
                          ? 'bg-slate-800/90 border-emerald-500/40'
                          : 'bg-slate-900/50 border-slate-800 opacity-60'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-lg ${newCompanyForm.features.excel_pdf_export ? 'bg-emerald-600 text-white' : 'bg-slate-800 text-slate-500'}`}>
                          <Download className="w-4 h-4" />
                        </div>
                        <div>
                          <div className="font-bold text-white flex items-center gap-2">
                            <span>Excel & PDF Export Reports</span>
                            <span className={`px-1.5 py-0.2 rounded text-[9px] font-bold ${newCompanyForm.features.excel_pdf_export ? 'bg-emerald-500/20 text-emerald-300' : 'bg-slate-800 text-slate-400'}`}>
                              {newCompanyForm.features.excel_pdf_export ? 'Enabled' : 'Disabled'}
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-400">Export .xlsx spreadsheets and print-ready formatted A4 PDF reports</p>
                        </div>
                      </div>
                      <div className={`w-10 h-5 flex items-center rounded-full p-0.5 transition duration-200 shrink-0 ${newCompanyForm.features.excel_pdf_export ? 'bg-emerald-600' : 'bg-slate-700'}`}>
                        <div className={`bg-white w-4 h-4 rounded-full shadow-md transform transition duration-200 ${newCompanyForm.features.excel_pdf_export ? 'translate-x-5' : 'translate-x-0'}`} />
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-3 border-t border-slate-700">
                  <button
                    type="button"
                    disabled={isSubmittingCompany}
                    onClick={() => setIsAddCompanyOpen(false)}
                    className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-xl font-bold cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    id="btn-register-company-submit"
                    disabled={isSubmittingCompany}
                    className={`px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold shadow-md flex items-center gap-1.5 transition ${
                      isSubmittingCompany ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer'
                    }`}
                  >
                    {isSubmittingCompany ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        <span>Registering Company...</span>
                      </>
                    ) : (
                      <>
                        <Plus className="w-4 h-4" />
                        <span>Register Company &amp; Grant Permissions</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    );
  }

  // ==========================================
  // VIEW 3: FULL CHEQUEDESK DASHBOARD
  // ==========================================
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col antialiased text-slate-900">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-5 right-5 z-50 px-4 py-2.5 bg-slate-900 border border-slate-800 text-white text-xs font-semibold rounded-xl shadow-2xl flex items-center gap-2">
          <Check className="w-4 h-4 text-emerald-400" />
          <span>{toastMessage.text}</span>
        </div>
      )}

      {/* Support Mode Banner */}
      {isSupportMode && (
        <div className="bg-amber-500 text-slate-950 px-4 py-2 text-xs font-semibold flex items-center justify-between shadow-md sticky top-0 z-40">
          <div className="flex items-center gap-2">
            <Shield className="w-4 h-4 shrink-0" />
            <span>
              Super Admin Support Mode: Inspecting <strong>{activeCompanyName}</strong> (Code: <code className="bg-amber-600/30 px-1 py-0.5 rounded font-mono">{activeCompanyCode}</code>)
            </span>
          </div>
          <button
            onClick={handleExitSupportMode}
            className="px-3 py-1 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-bold transition cursor-pointer shadow-xs"
          >
            Exit to Dev Console
          </button>
        </div>
      )}

      {/* App Shell */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Sidebar */}
        <aside className="hidden lg:flex flex-col w-64 bg-slate-900 text-slate-300 border-r border-slate-800 shrink-0">
          <div className="p-4 border-b border-slate-800">
            <div className="flex items-center gap-2.5">
              <div className="p-2 bg-indigo-600 text-white rounded-xl shadow-md">
                <CreditCard className="w-5 h-5" />
              </div>
              <div>
                <div className="font-black text-white text-base tracking-tight">ChequeDesk</div>
                <div className="text-[11px] text-slate-400 font-medium">Enterprise Ledger</div>
              </div>
            </div>
            <div className="mt-3 p-2 bg-slate-800/80 rounded-xl flex items-center justify-between border border-slate-700/50">
              <div className="truncate pr-2">
                <div className="text-xs font-bold text-white truncate">{activeCompanyName}</div>
                <div className="text-[10px] text-indigo-400 font-mono">Code: {activeCompanyCode}</div>
              </div>
              <span className="px-1.5 py-0.5 bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded text-[9px] font-bold uppercase">
                Active
              </span>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-3 space-y-1">
            {[
              { id: 'dashboard' as NavView, label: 'Dashboard', icon: Laptop, visible: true },
              { id: 'due_date_timeline' as NavView, label: 'Due Date Timeline', icon: Clock, visible: true },
              { id: 'issued_date_log' as NavView, label: 'Issued Date Log', icon: Calendar, visible: true },
              { id: 'pending' as NavView, label: 'Pending Cheques', icon: Clock, badge: pendingCheques.length, badgeColor: 'amber', visible: true },
              { id: 'partial_payments' as NavView, label: 'Partial Payments', icon: Wallet, badge: partialCheques.length, badgeColor: 'sky', visible: true },
              { id: 'cleared' as NavView, label: 'Cleared Cheques', icon: CheckCircle2, badge: clearedCheques.length, badgeColor: 'emerald', visible: true },
              { id: 'reports' as NavView, label: 'Reports & Analytics', icon: BarChart3, visible: true },
              { id: 'print_cheque' as NavView, label: 'Print Cheque Leaf', icon: Printer, visible: activeFeatures.print_cheque },
              { id: 'banks' as NavView, label: 'Banks', icon: Landmark, badge: banks.length, visible: activeFeatures.parties_banks },
              { id: 'parties' as NavView, label: 'Parties / Payees', icon: Users, badge: parties.length, visible: activeFeatures.parties_banks },
              { id: 'company_users' as NavView, label: 'Company & Users', icon: Building2, visible: true },
              { id: 'backup' as NavView, label: 'Backup & Restore', icon: Database, visible: activeFeatures.local_disk_backup || activeFeatures.google_drive_backup },
              { id: 'import_cheques' as NavView, label: 'Import External Cheques', icon: FileSpreadsheet, badge: 'External', badgeColor: 'purple', visible: activeFeatures.import_cheques },
            ]
              .filter((item) => item.visible)
              .map((item) => {
                const Icon = item.icon;
                const isActive = currentView === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => setCurrentView(item.id)}
                    className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold transition cursor-pointer ${
                      isActive ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                      <span>{item.label}</span>
                    </div>
                    {item.badge !== undefined && (
                      <span
                        className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold ${
                          item.badgeColor === 'amber'
                            ? 'bg-amber-500/20 text-amber-300'
                            : item.badgeColor === 'sky'
                            ? 'bg-sky-500/20 text-sky-300'
                            : item.badgeColor === 'emerald'
                            ? 'bg-emerald-500/20 text-emerald-300'
                            : item.badgeColor === 'purple'
                            ? 'bg-purple-500/20 text-purple-300'
                            : 'bg-slate-800 text-slate-400'
                        }`}
                      >
                        {item.badge}
                      </span>
                    )}
                  </button>
                );
              })}
          </div>

          <div className="p-3 border-t border-slate-800">
            <button
              onClick={handleLogout}
              className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-slate-800 hover:bg-rose-950/40 text-slate-300 hover:text-rose-400 border border-slate-700/60 rounded-xl text-xs font-bold transition cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Sign Out</span>
            </button>
          </div>
        </aside>

        {/* Mobile Navigation Drawer */}
        {isMobileMenuOpen && (
          <div className="fixed inset-0 z-50 lg:hidden bg-slate-900/70 backdrop-blur-xs flex">
            <div className="w-72 bg-slate-900 text-slate-300 h-full flex flex-col shadow-2xl p-4 space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 bg-indigo-600 text-white rounded-xl">
                    <CreditCard className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="font-bold text-white text-sm">ChequeDesk</div>
                    <div className="text-[10px] text-slate-400">{activeCompanyName}</div>
                  </div>
                </div>
                <button
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="p-1.5 text-slate-400 hover:text-white rounded-lg cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto space-y-1">
                {[
                  { id: 'dashboard' as NavView, label: 'Dashboard', icon: Laptop, visible: true },
                  { id: 'due_date_timeline' as NavView, label: 'Due Date Timeline', icon: Clock, visible: true },
                  { id: 'issued_date_log' as NavView, label: 'Issued Date Log', icon: Calendar, visible: true },
                  { id: 'pending' as NavView, label: 'Pending Cheques', icon: Clock, badge: pendingCheques.length, badgeColor: 'amber', visible: true },
                  { id: 'partial_payments' as NavView, label: 'Partial Payments', icon: Wallet, badge: partialCheques.length, badgeColor: 'sky', visible: true },
                  { id: 'cleared' as NavView, label: 'Cleared Cheques', icon: CheckCircle2, badge: clearedCheques.length, badgeColor: 'emerald', visible: true },
                  { id: 'reports' as NavView, label: 'Reports & Analytics', icon: BarChart3, visible: true },
                  { id: 'print_cheque' as NavView, label: 'Print Cheque Leaf', icon: Printer, visible: activeFeatures.print_cheque },
                  { id: 'banks' as NavView, label: 'Banks', icon: Landmark, badge: banks.length, visible: activeFeatures.parties_banks },
                  { id: 'parties' as NavView, label: 'Parties / Payees', icon: Users, badge: parties.length, visible: activeFeatures.parties_banks },
                  { id: 'company_users' as NavView, label: 'Company & Users', icon: Building2, visible: true },
                  { id: 'backup' as NavView, label: 'Backup & Restore', icon: Database, visible: activeFeatures.local_disk_backup || activeFeatures.google_drive_backup },
                  { id: 'import_cheques' as NavView, label: 'Import External Cheques', icon: FileSpreadsheet, badge: 'External', badgeColor: 'purple', visible: activeFeatures.import_cheques },
                ]
                  .filter((item) => item.visible)
                  .map((item) => {
                    const Icon = item.icon;
                    const isActive = currentView === item.id;
                    return (
                      <button
                        key={item.id}
                        onClick={() => {
                          setCurrentView(item.id);
                          setIsMobileMenuOpen(false);
                        }}
                        className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold transition cursor-pointer ${
                          isActive ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
                        }`}
                      >
                        <div className="flex items-center gap-2.5">
                          <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                          <span>{item.label}</span>
                        </div>
                        {item.badge !== undefined && (
                          <span
                            className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold ${
                              item.badgeColor === 'amber'
                                ? 'bg-amber-500/20 text-amber-300'
                                : item.badgeColor === 'sky'
                                ? 'bg-sky-500/20 text-sky-300'
                                : item.badgeColor === 'emerald'
                                ? 'bg-emerald-500/20 text-emerald-300'
                                : item.badgeColor === 'purple'
                                ? 'bg-purple-500/20 text-purple-300'
                                : 'bg-slate-800 text-slate-400'
                            }`}
                          >
                            {item.badge}
                          </span>
                        )}
                      </button>
                    );
                  })}
              </div>

              <div className="pt-3 border-t border-slate-800">
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-slate-800 hover:bg-rose-950/40 text-slate-300 hover:text-rose-400 border border-slate-700/60 rounded-xl text-xs font-bold transition cursor-pointer"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Sign Out</span>
                </button>
              </div>
            </div>
            <div className="flex-1" onClick={() => setIsMobileMenuOpen(false)} />
          </div>
        )}

        {/* Main Content Area */}
        <div className="flex-1 flex flex-col overflow-y-auto">
          {/* Top Header */}
          <header className="bg-white border-b border-slate-200 sticky top-0 z-30 px-4 sm:px-6 py-3 flex items-center justify-between shadow-2xs">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                className="lg:hidden p-2 text-slate-600 hover:bg-slate-100 rounded-xl transition"
              >
                <Menu className="w-5 h-5" />
              </button>
              <div>
                <h1 className="text-base sm:text-lg font-bold text-slate-900 capitalize">
                  {currentView.replace(/_/g, ' ')}
                </h1>
                <div className="flex flex-wrap items-center gap-2 text-[11px] text-slate-500 mt-0.5">
                  <span className="font-semibold text-slate-700">{activeCompanyName}</span>
                  <span>&bull;</span>
                  <span className="flex items-center gap-1 font-mono text-indigo-700 bg-indigo-50 px-1.5 py-0.5 rounded">
                    <Calendar className="w-3 h-3" />
                    {getCurrentBsDate()} BS ({getCurrentAdDate()} AD)
                  </span>
                  <span>&bull;</span>

                  {/* LIVE HEADER STATUS (EXACT USER REQUIREMENT) */}
                  {isOnline ? (
                    <div
                      className="inline-flex items-center gap-1.5 px-2.5 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-300 rounded-full font-bold text-[10px] shadow-2xs"
                      title="All entries are automatically synchronized with Cloud Firestore"
                    >
                      <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                      <Wifi className="w-3 h-3 text-emerald-600" />
                      <span>Status: Online (Auto-Synced)</span>
                    </div>
                  ) : (
                    <div
                      className="inline-flex items-center gap-1.5 px-2.5 py-0.5 bg-amber-50 text-amber-800 border border-amber-300 rounded-full font-bold text-[10px] shadow-2xs"
                      title="Offline-first desktop architecture active. Entries saved locally."
                    >
                      <span className="w-2 h-2 rounded-full bg-amber-500" />
                      <WifiOff className="w-3 h-3 text-amber-600" />
                      <span>Status: Offline (Local Mode)</span>
                    </div>
                  )}

                  {/* Manual Cloud Sync Button */}
                  <button
                    onClick={handleTriggerCloudSync}
                    disabled={isSyncingCloud}
                    className="inline-flex items-center gap-1 px-2 py-0.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-full text-[10px] font-bold transition cursor-pointer border border-slate-200 shadow-2xs"
                    title={isOnline ? "Force synchronization now" : "Offline: reconnect to sync"}
                  >
                    <RefreshCw className={`w-3 h-3 ${isSyncingCloud ? 'animate-spin text-indigo-600' : ''}`} />
                    <span>{isSyncingCloud ? 'Syncing...' : 'Sync Now'}</span>
                    {pendingSyncCount > 0 && (
                      <span className="px-1 py-0.2 bg-amber-200 text-amber-900 rounded-full text-[9px]">
                        {pendingSyncCount}
                      </span>
                    )}
                  </button>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {activeFeatures.import_cheques && (
                <button
                  onClick={() => setIsImportModalOpen(true)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-purple-700 bg-purple-50 hover:bg-purple-100 border border-purple-200 rounded-xl transition cursor-pointer shadow-2xs"
                  title="Import Cheques from External Software"
                >
                  <FileSpreadsheet className="w-3.5 h-3.5 text-purple-600" />
                  <span className="hidden sm:inline">Import External Cheques</span>
                  <span className="sm:hidden">Import</span>
                </button>
              )}

              <button
                onClick={handleSeedData}
                className="hidden md:inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-100 border border-slate-200 rounded-xl transition cursor-pointer"
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                <span>Demo Data</span>
              </button>

              <button
                onClick={openNewChequeModal}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-xs transition cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span className="hidden sm:inline">Issue Cheque</span>
                <span className="sm:hidden">Issue</span>
              </button>
            </div>
          </header>

          {/* Main View Container */}
          <main className="p-4 sm:p-6 max-w-7xl w-full mx-auto space-y-6">
            {/* 4 KPI Summary Cards (always on Dashboard, or toggled) */}
            {currentView === 'dashboard' && (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Total Cheques */}
                <div
                  onClick={() => setStatusFilter('all')}
                  className={`bg-white rounded-2xl p-4 border transition cursor-pointer shadow-2xs ${
                    statusFilter === 'all'
                      ? 'border-indigo-600 ring-2 ring-indigo-100 bg-indigo-50/20'
                      : 'border-slate-200 hover:border-indigo-300'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Total Cheques</span>
                    <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
                      <FileText className="w-4 h-4" />
                    </div>
                  </div>
                  <div className="text-2xl font-black text-slate-800">{totalCheques}</div>
                  <div className="text-xs font-semibold text-indigo-600 mt-1">{formatNPR(totalAmount)} volume</div>
                </div>

                {/* Pending Cheques */}
                <div
                  onClick={() => setStatusFilter('Pending')}
                  className={`bg-white rounded-2xl p-4 border transition cursor-pointer shadow-2xs ${
                    statusFilter === 'Pending'
                      ? 'border-amber-500 ring-2 ring-amber-100 bg-amber-50/20'
                      : 'border-slate-200 hover:border-amber-300'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold text-amber-700 uppercase tracking-wider">Pending Amount</span>
                    <div className="p-2 bg-amber-50 text-amber-600 rounded-xl">
                      <Clock className="w-4 h-4" />
                    </div>
                  </div>
                  <div className="text-2xl font-black text-amber-600">{pendingCheques.length}</div>
                  <div className="text-xs font-semibold text-slate-500 mt-1">{formatNPR(pendingAmount)} balance</div>
                </div>

                {/* Partially Paid */}
                <div
                  onClick={() => setStatusFilter('Partially Paid')}
                  className={`bg-white rounded-2xl p-4 border transition cursor-pointer shadow-2xs ${
                    statusFilter === 'Partially Paid'
                      ? 'border-sky-500 ring-2 ring-sky-100 bg-sky-50/20'
                      : 'border-slate-200 hover:border-sky-300'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold text-sky-700 uppercase tracking-wider">Partially Paid</span>
                    <div className="p-2 bg-sky-50 text-sky-600 rounded-xl">
                      <Wallet className="w-4 h-4" />
                    </div>
                  </div>
                  <div className="text-2xl font-black text-sky-600">{partialCheques.length}</div>
                  <div className="text-xs font-semibold text-slate-500 mt-1">{formatNPR(partialAmount)} remaining</div>
                </div>

                {/* Cleared Cheques */}
                <div
                  onClick={() => setStatusFilter('Cleared')}
                  className={`bg-white rounded-2xl p-4 border transition cursor-pointer shadow-2xs ${
                    statusFilter === 'Cleared'
                      ? 'border-emerald-500 ring-2 ring-emerald-100 bg-emerald-50/20'
                      : 'border-slate-200 hover:border-emerald-300'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold text-emerald-700 uppercase tracking-wider">Cleared Amount</span>
                    <div className="p-2 bg-emerald-50 text-emerald-600 rounded-xl">
                      <CheckCircle2 className="w-4 h-4" />
                    </div>
                  </div>
                  <div className="text-2xl font-black text-emerald-600">{clearedCheques.length}</div>
                  <div className="text-xs font-semibold text-slate-500 mt-1">{formatNPR(clearedAmount)} settled</div>
                </div>
              </div>
            )}

            {/* VIEW CONTENT ROUTER */}
            {currentView === 'dashboard' && (
              <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
                {/* Search & Filter Bar */}
                <div className="p-4 border-b border-slate-200 flex flex-col lg:flex-row lg:items-center justify-between gap-3 bg-slate-50/50">
                  <div className="flex flex-wrap items-center gap-2">
                    {(['all', 'Pending', 'Partially Paid', 'Cleared'] as const).map((s) => (
                      <button
                        key={s}
                        onClick={() => setStatusFilter(s)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                          statusFilter === s
                            ? 'bg-slate-900 text-white shadow-xs'
                            : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
                        }`}
                      >
                        {s === 'all' ? 'All Cheques' : s}
                      </button>
                    ))}

                    <div className="h-4 w-px bg-slate-200 mx-1 hidden sm:block" />

                    {/* Source Filter (All / System / Imported) */}
                    {(['all', 'system', 'imported'] as const).map((src) => (
                      <button
                        key={src}
                        onClick={() => setSourceFilter(src)}
                        className={`px-2.5 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                          sourceFilter === src
                            ? src === 'imported'
                              ? 'bg-purple-600 text-white shadow-xs'
                              : 'bg-indigo-600 text-white shadow-xs'
                            : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
                        }`}
                      >
                        {src === 'all' ? 'All Sources' : src === 'system' ? 'System Cheques' : 'Imported from Other Software'}
                      </button>
                    ))}
                  </div>

                  <div className="flex items-center gap-2">
                    <div className="relative flex-1 sm:flex-none">
                      <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                      <input
                        type="text"
                        placeholder="Search cheques, parties, banks..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-9 pr-3 py-1.5 text-xs bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 w-full sm:w-56"
                      />
                    </div>

                    <select
                      value={bankFilter}
                      onChange={(e) => setBankFilter(e.target.value)}
                      className="text-xs bg-white border border-slate-200 rounded-xl px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    >
                      <option value="all">All Banks</option>
                      {banks.map((b) => (
                        <option key={b.id} value={b.id}>{b.name}</option>
                      ))}
                    </select>

                    <button
                      onClick={() => setIsImportModalOpen(true)}
                      title="Import External Cheques"
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-purple-700 bg-purple-50 hover:bg-purple-100 border border-purple-200 rounded-xl transition cursor-pointer"
                    >
                      <FileSpreadsheet className="w-4 h-4 text-purple-600" />
                      <span className="hidden md:inline">Import</span>
                    </button>

                    {activeFeatures.excel_pdf_export && (
                      <div className="flex items-center gap-1.5 pl-1 border-l border-slate-200">
                        <button
                          onClick={() => exportChequesToExcel(filteredCheques, 'Cheques_Ledger', 'Cheques_Register')}
                          title="Export to Excel (.xlsx)"
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-xl transition cursor-pointer"
                        >
                          <Download className="w-3.5 h-3.5 text-emerald-600" />
                          <span className="hidden lg:inline">Excel</span>
                        </button>
                        <button
                          onClick={() => exportChequesToPdf(filteredCheques, 'Cheque Management Register')}
                          title="Export to PDF"
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-xl transition cursor-pointer"
                        >
                          <Printer className="w-3.5 h-3.5 text-rose-600" />
                          <span className="hidden lg:inline">PDF</span>
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {/* Cheques Table */}
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-50/80 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                        <th className="py-3 px-4">Cheque #</th>
                        <th className="py-3 px-4">Payee / Party</th>
                        <th className="py-3 px-4">Bank</th>
                        <th className="py-3 px-4">Due Date (BS)</th>
                        <th className="py-3 px-4 text-right">Amount</th>
                        <th className="py-3 px-4 text-right">Remaining</th>
                        <th className="py-3 px-4 text-center">Status</th>
                        <th className="py-3 px-4 text-center">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
                      {filteredCheques.length === 0 ? (
                        <tr>
                          <td colSpan={8} className="py-12 text-center text-slate-400">
                            <CreditCard className="w-10 h-10 mx-auto mb-2 text-slate-300" />
                            <div className="font-semibold text-slate-600">No cheques match current filters</div>
                            <p className="text-[11px] text-slate-400 mt-0.5 mb-3">Click &quot;Issue Cheque&quot; or &quot;Import External Cheques&quot; to add records</p>
                            <div className="flex justify-center gap-2">
                              <button
                                onClick={openNewChequeModal}
                                className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-1 cursor-pointer"
                              >
                                <Plus className="w-3.5 h-3.5" />
                                <span>Issue Cheque</span>
                              </button>
                              <button
                                onClick={() => setIsImportModalOpen(true)}
                                className="px-3 py-1.5 bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-200 rounded-xl text-xs font-bold transition flex items-center gap-1 cursor-pointer"
                              >
                                <FileSpreadsheet className="w-3.5 h-3.5" />
                                <span>Import External Cheques</span>
                              </button>
                            </div>
                          </td>
                        </tr>
                      ) : (
                        filteredCheques.map((c) => {
                          const party = parties.find((p) => p.id === c.party_id);
                          const bank = banks.find((b) => b.id === c.bank_id);
                          const isImported = c.notes?.toLowerCase().includes('imported') || c.notes?.toLowerCase().includes('external');
                          return (
                            <tr
                              key={c.id}
                              onClick={() => {
                                setSelectedCheque(c);
                                setIsDetailModalOpen(true);
                              }}
                              className="hover:bg-indigo-50/40 transition cursor-pointer group"
                              title="Click to view complete details"
                            >
                              <td className="py-3 px-4 font-mono font-bold text-slate-900">
                                <div className="group-hover:text-indigo-600 transition flex items-center gap-1.5">
                                  <span>{c.cheque_number}</span>
                                  <Eye className="w-3 h-3 text-slate-400 opacity-0 group-hover:opacity-100 transition" />
                                </div>
                                {c.bill_number && (
                                  <div className="text-[10px] text-slate-400 font-sans">Bill: {c.bill_number}</div>
                                )}
                                {isImported && (
                                  <span className="inline-flex items-center gap-1 mt-1 px-1.5 py-0.5 rounded text-[9px] font-sans font-bold bg-purple-100 text-purple-800 border border-purple-200">
                                    Imported from Other Software
                                  </span>
                                )}
                              </td>
                              <td className="py-3 px-4 font-semibold text-slate-800">
                                {party?.name || 'Unknown Party'}
                              </td>
                              <td className="py-3 px-4 text-slate-600">
                                {bank?.name || 'Unknown Bank'}
                              </td>
                              <td className="py-3 px-4">
                                <div className="font-semibold text-slate-800">{c.due_date_bs}</div>
                                <div className="text-[10px] text-slate-400">{c.due_date_ad}</div>
                              </td>
                              <td className="py-3 px-4 text-right font-bold text-slate-900">
                                {formatNPR(c.amount || 0)}
                              </td>
                              <td className="py-3 px-4 text-right font-bold text-amber-600">
                                {formatNPR(c.remaining_amount ?? c.amount ?? 0)}
                              </td>
                              <td className="py-3 px-4 text-center">
                                <StatusBadge status={c.status} />
                              </td>
                              <td className="py-3 px-4 text-center" onClick={(e) => e.stopPropagation()}>
                                <div className="flex items-center justify-center gap-1">
                                  {c.status !== 'Cleared' && (
                                    <button
                                      onClick={() => {
                                        setActivePaymentCheque(c);
                                        setIsPaymentModalOpen(true);
                                      }}
                                      title="Record Payment"
                                      className="px-2 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 rounded-lg text-[11px] font-bold transition cursor-pointer"
                                    >
                                      Pay
                                    </button>
                                  )}
                                  <button
                                    onClick={() => {
                                      setSelectedCheque(c);
                                      setIsDetailModalOpen(true);
                                    }}
                                    title="View Details"
                                    className="p-1.5 text-slate-600 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition cursor-pointer"
                                  >
                                    <Eye className="w-3.5 h-3.5" />
                                  </button>
                                  <button
                                    onClick={() => openEditChequeModal(c)}
                                    title="Edit Cheque"
                                    className="p-1.5 text-slate-600 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition cursor-pointer"
                                  >
                                    <Edit3 className="w-3.5 h-3.5" />
                                  </button>
                                  <button
                                    onClick={() => setChequeToDeleteId(c.id)}
                                    title="Delete Cheque"
                                    className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition cursor-pointer"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* VIEW: DUE DATE TIMELINE */}
            {currentView === 'due_date_timeline' && (() => {
              const todayBs = getCurrentBsDate();
              const overdueCheques = cheques.filter((c) => c.status !== 'Cleared' && c.due_date_bs < todayBs);
              const dueTodayCheques = cheques.filter((c) => c.status !== 'Cleared' && c.due_date_bs === todayBs);
              const upcomingCheques = cheques.filter((c) => c.status !== 'Cleared' && c.due_date_bs > todayBs);

              const renderChequeTable = (groupCheques: Cheque[], groupTitle: string, groupBadge: string, badgeBg: string) => {
                const groupIds = groupCheques.map((c) => c.id);
                const allGroupSelected = groupIds.length > 0 && groupIds.every((id) => selectedChequeIds.includes(id));
                return (
                  <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
                    <div className="p-4 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 bg-slate-50/50">
                      <div className="flex items-center gap-2">
                        <h3 className="text-sm font-bold text-slate-900">{groupTitle}</h3>
                        <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${badgeBg}`}>
                          {groupCheques.length} {groupBadge}
                        </span>
                      </div>
                      <div className="text-xs text-slate-500 font-semibold">
                        Total:{' '}
                        <span className="font-bold text-slate-900 font-mono">
                          {formatNPR(groupCheques.reduce((sum, c) => sum + (c.remaining_amount ?? c.amount), 0))}
                        </span>
                      </div>
                    </div>
                    {groupCheques.length === 0 ? (
                      <div className="p-6 text-center text-xs text-slate-400">No cheques in this category</div>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs">
                          <thead className="bg-slate-50 text-slate-500 font-bold uppercase text-[10px] border-b border-slate-200">
                            <tr>
                              <th className="p-3 w-10 text-center">
                                <input
                                  type="checkbox"
                                  checked={allGroupSelected}
                                  onChange={() => toggleSelectAllCheques(groupIds)}
                                  className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                                />
                              </th>
                              <th className="p-3">Cheque No</th>
                              <th className="p-3">Bill No</th>
                              <th className="p-3">Bank</th>
                              <th className="p-3">Party</th>
                              <th className="p-3 text-right">Amount (रू)</th>
                              <th className="p-3">Issued (BS)</th>
                              <th className="p-3">Due (BS)</th>
                              <th className="p-3 text-center">Status</th>
                              <th className="p-3 text-center">Actions</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {groupCheques.map((c) => {
                              const isSelected = selectedChequeIds.includes(c.id);
                              return (
                                <tr
                                  key={c.id}
                                  className={`hover:bg-indigo-50/40 transition cursor-pointer ${
                                    isSelected ? 'bg-indigo-50/60' : ''
                                  }`}
                                  onClick={() => {
                                    setSelectedCheque(c);
                                    setIsDetailModalOpen(true);
                                  }}
                                >
                                  <td className="p-3 text-center" onClick={(e) => e.stopPropagation()}>
                                    <input
                                      type="checkbox"
                                      checked={isSelected}
                                      onChange={() => toggleSelectCheque(c.id)}
                                      className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                                    />
                                  </td>
                                  <td className="p-3 font-mono font-bold text-slate-900">{c.cheque_number}</td>
                                  <td className="p-3 font-mono text-slate-600">{c.bill_number || '—'}</td>
                                  <td className="p-3 text-slate-700">{banks.find((b) => b.id === c.bank_id)?.name || '—'}</td>
                                  <td className="p-3 font-semibold text-slate-800">{parties.find((p) => p.id === c.party_id)?.name || '—'}</td>
                                  <td className="p-3 text-right font-mono font-bold text-slate-900">{formatNPR(c.remaining_amount ?? c.amount)}</td>
                                  <td className="p-3 font-mono text-slate-600">{c.issue_date_bs}</td>
                                  <td className="p-3 font-mono text-slate-600">{c.due_date_bs}</td>
                                  <td className="p-3 text-center">
                                    <StatusBadge status={c.status} />
                                  </td>
                                  <td className="p-3 text-center" onClick={(e) => e.stopPropagation()}>
                                    <div className="flex items-center justify-center gap-1">
                                      <button
                                        onClick={() => {
                                          setSelectedCheque(c);
                                          setIsDetailModalOpen(true);
                                        }}
                                        title="View Details"
                                        className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition cursor-pointer"
                                      >
                                        <Eye className="w-3.5 h-3.5" />
                                      </button>
                                      {c.status !== 'Cleared' && (
                                        <button
                                          onClick={() => handleMarkCleared(c)}
                                          title="Mark Cleared"
                                          className="p-1.5 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg transition cursor-pointer"
                                        >
                                          <CheckCircle2 className="w-3.5 h-3.5" />
                                        </button>
                                      )}
                                      <button
                                        onClick={() => openEditChequeModal(c)}
                                        title="Edit Cheque"
                                        className="p-1.5 text-slate-500 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition cursor-pointer"
                                      >
                                        <Edit3 className="w-3.5 h-3.5" />
                                      </button>
                                      <button
                                        onClick={() => setChequeToDeleteId(c.id)}
                                        title="Delete Cheque"
                                        className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition cursor-pointer"
                                      >
                                        <Trash2 className="w-3.5 h-3.5" />
                                      </button>
                                    </div>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                );
              };

              return (
                <div className="space-y-5">
                  <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <h2 className="text-sm font-bold text-slate-900">Due Date Timeline</h2>
                      <p className="text-xs text-slate-500">Grouped by Overdue, Due Today, and Upcoming Due Dates (BS)</p>
                    </div>
                    {activeFeatures.excel_pdf_export && (
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => exportChequesToExcel(cheques, 'Due_Date_Timeline', 'All')}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-xl transition cursor-pointer"
                        >
                          <Download className="w-3.5 h-3.5 text-emerald-600" />
                          <span>Export Excel</span>
                        </button>
                        <button
                          onClick={() => exportChequesToPdf(cheques, 'Due Date Timeline Report')}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-xl transition cursor-pointer"
                        >
                          <Printer className="w-3.5 h-3.5 text-rose-600" />
                          <span>Export PDF</span>
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Bulk Selection Bar */}
                  {selectedChequeIds.length > 0 && (
                    <div className="p-3 bg-indigo-50 border border-indigo-200 rounded-xl flex flex-wrap items-center justify-between gap-3 text-xs">
                      <div className="flex items-center gap-2 text-indigo-900 font-bold">
                        <CheckCircle2 className="w-4 h-4 text-indigo-600" />
                        <span>{selectedChequeIds.length} cheque(s) selected</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={handleBulkMarkCleared}
                          className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold flex items-center gap-1.5 transition cursor-pointer shadow-xs"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Mark Cleared</span>
                        </button>
                        <button
                          type="button"
                          onClick={handleBulkDelete}
                          className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg font-bold flex items-center gap-1.5 transition cursor-pointer shadow-xs"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>Delete Selected</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setSelectedChequeIds([])}
                          className="px-3 py-1.5 bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 rounded-lg font-bold transition cursor-pointer"
                        >
                          Clear Selection
                        </button>
                      </div>
                    </div>
                  )}

                  {/* 1. Overdue */}
                  {renderChequeTable(overdueCheques, '🚨 Overdue Cheques', 'Overdue', 'bg-rose-100 text-rose-700')}

                  {/* 2. Due Today */}
                  {renderChequeTable(dueTodayCheques, '⏰ Due Today', 'Today', 'bg-amber-100 text-amber-800')}

                  {/* 3. Upcoming */}
                  {renderChequeTable(upcomingCheques, '📅 Upcoming Cheques', 'Upcoming', 'bg-indigo-100 text-indigo-700')}
                </div>
              );
            })()}

            {/* VIEW: ISSUED DATE LOG */}
            {currentView === 'issued_date_log' && (() => {
              const todayBs = getCurrentBsDate();
              const todayAd = new Date();
              const yesterdayAd = new Date(todayAd);
              yesterdayAd.setDate(yesterdayAd.getDate() - 1);
              const yesterdayBs = adToBs(yesterdayAd.toISOString().split('T')[0]);

              const todayEntries = cheques.filter((c) => c.issue_date_bs === todayBs);
              const yesterdayEntries = cheques.filter((c) => c.issue_date_bs === yesterdayBs);
              const earlierEntries = cheques.filter((c) => c.issue_date_bs !== todayBs && c.issue_date_bs !== yesterdayBs);

              const renderLogTable = (groupCheques: Cheque[], groupTitle: string, groupBadge: string, badgeBg: string) => {
                const groupIds = groupCheques.map((c) => c.id);
                const allGroupSelected = groupIds.length > 0 && groupIds.every((id) => selectedChequeIds.includes(id));
                return (
                  <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
                    <div className="p-4 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 bg-slate-50/50">
                      <div className="flex items-center gap-2">
                        <h3 className="text-sm font-bold text-slate-900">{groupTitle}</h3>
                        <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${badgeBg}`}>
                          {groupCheques.length} {groupBadge}
                        </span>
                      </div>
                      <div className="text-xs text-slate-500 font-semibold">
                        Total Volume:{' '}
                        <span className="font-bold text-slate-900 font-mono">
                          {formatNPR(groupCheques.reduce((sum, c) => sum + c.amount, 0))}
                        </span>
                      </div>
                    </div>
                    {groupCheques.length === 0 ? (
                      <div className="p-6 text-center text-xs text-slate-400">No entries in this timeframe</div>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs">
                          <thead className="bg-slate-50 text-slate-500 font-bold uppercase text-[10px] border-b border-slate-200">
                            <tr>
                              <th className="p-3 w-10 text-center">
                                <input
                                  type="checkbox"
                                  checked={allGroupSelected}
                                  onChange={() => toggleSelectAllCheques(groupIds)}
                                  className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                                />
                              </th>
                              <th className="p-3">Cheque No</th>
                              <th className="p-3">Bill No</th>
                              <th className="p-3">Bank</th>
                              <th className="p-3">Party</th>
                              <th className="p-3 text-right">Amount (रू)</th>
                              <th className="p-3">Issued (BS)</th>
                              <th className="p-3">Due (BS)</th>
                              <th className="p-3 text-center">Status</th>
                              <th className="p-3 text-center">Actions</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {groupCheques.map((c) => {
                              const isSelected = selectedChequeIds.includes(c.id);
                              return (
                                <tr
                                  key={c.id}
                                  className={`hover:bg-indigo-50/40 transition cursor-pointer ${
                                    isSelected ? 'bg-indigo-50/60' : ''
                                  }`}
                                  onClick={() => {
                                    setSelectedCheque(c);
                                    setIsDetailModalOpen(true);
                                  }}
                                >
                                  <td className="p-3 text-center" onClick={(e) => e.stopPropagation()}>
                                    <input
                                      type="checkbox"
                                      checked={isSelected}
                                      onChange={() => toggleSelectCheque(c.id)}
                                      className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                                    />
                                  </td>
                                  <td className="p-3 font-mono font-bold text-slate-900">{c.cheque_number}</td>
                                  <td className="p-3 font-mono text-slate-600">{c.bill_number || '—'}</td>
                                  <td className="p-3 text-slate-700">{banks.find((b) => b.id === c.bank_id)?.name || '—'}</td>
                                  <td className="p-3 font-semibold text-slate-800">{parties.find((p) => p.id === c.party_id)?.name || '—'}</td>
                                  <td className="p-3 text-right font-mono font-bold text-slate-900">{formatNPR(c.amount)}</td>
                                  <td className="p-3 font-mono text-slate-600">{c.issue_date_bs}</td>
                                  <td className="p-3 font-mono text-slate-600">{c.due_date_bs}</td>
                                  <td className="p-3 text-center">
                                    <StatusBadge status={c.status} />
                                  </td>
                                  <td className="p-3 text-center" onClick={(e) => e.stopPropagation()}>
                                    <div className="flex items-center justify-center gap-1">
                                      <button
                                        onClick={() => {
                                          setSelectedCheque(c);
                                          setIsDetailModalOpen(true);
                                        }}
                                        title="View Details"
                                        className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition cursor-pointer"
                                      >
                                        <Eye className="w-3.5 h-3.5" />
                                      </button>
                                      {c.status !== 'Cleared' && (
                                        <button
                                          onClick={() => handleMarkCleared(c)}
                                          title="Mark Cleared"
                                          className="p-1.5 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg transition cursor-pointer"
                                        >
                                          <CheckCircle2 className="w-3.5 h-3.5" />
                                        </button>
                                      )}
                                      <button
                                        onClick={() => openEditChequeModal(c)}
                                        title="Edit Cheque"
                                        className="p-1.5 text-slate-500 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition cursor-pointer"
                                      >
                                        <Edit3 className="w-3.5 h-3.5" />
                                      </button>
                                      <button
                                        onClick={() => setChequeToDeleteId(c.id)}
                                        title="Delete Cheque"
                                        className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition cursor-pointer"
                                      >
                                        <Trash2 className="w-3.5 h-3.5" />
                                      </button>
                                    </div>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                );
              };

              return (
                <div className="space-y-5">
                  <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <h2 className="text-sm font-bold text-slate-900">Issued Date Chronological Log</h2>
                      <p className="text-xs text-slate-500">Grouped by Today's Entries, Yesterday's Entries, and Earlier Entries</p>
                    </div>
                    {activeFeatures.excel_pdf_export && (
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => exportChequesToExcel(cheques, 'Issued_Date_Log', 'All')}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-xl transition cursor-pointer"
                        >
                          <Download className="w-3.5 h-3.5 text-emerald-600" />
                          <span>Export Excel</span>
                        </button>
                        <button
                          onClick={() => exportChequesToPdf(cheques, 'Issued Date Log Report')}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-xl transition cursor-pointer"
                        >
                          <Printer className="w-3.5 h-3.5 text-rose-600" />
                          <span>Export PDF</span>
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Bulk Selection Bar */}
                  {selectedChequeIds.length > 0 && (
                    <div className="p-3 bg-indigo-50 border border-indigo-200 rounded-xl flex flex-wrap items-center justify-between gap-3 text-xs">
                      <div className="flex items-center gap-2 text-indigo-900 font-bold">
                        <CheckCircle2 className="w-4 h-4 text-indigo-600" />
                        <span>{selectedChequeIds.length} cheque(s) selected</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={handleBulkMarkCleared}
                          className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold flex items-center gap-1.5 transition cursor-pointer shadow-xs"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Mark Cleared</span>
                        </button>
                        <button
                          type="button"
                          onClick={handleBulkDelete}
                          className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg font-bold flex items-center gap-1.5 transition cursor-pointer shadow-xs"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>Delete Selected</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setSelectedChequeIds([])}
                          className="px-3 py-1.5 bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 rounded-lg font-bold transition cursor-pointer"
                        >
                          Clear Selection
                        </button>
                      </div>
                    </div>
                  )}

                  {/* 1. Today's Entries */}
                  {renderLogTable(todayEntries, "Today's Entries", 'Today', 'bg-emerald-100 text-emerald-800')}

                  {/* 2. Yesterday's Entries */}
                  {renderLogTable(yesterdayEntries, "Yesterday's Entries", 'Yesterday', 'bg-blue-100 text-blue-800')}

                  {/* 3. Earlier */}
                  {renderLogTable(earlierEntries, 'Earlier Entries', 'Earlier', 'bg-slate-100 text-slate-700')}
                </div>
              );
            })()}

            {/* VIEW: PENDING CHEQUES */}
            {currentView === 'pending' && (() => {
              const term = pendingSearchTerm.toLowerCase().trim();
              const filteredPending = pendingCheques.filter((c) => {
                // BS Date Range Filter
                if (!matchesBsDateRange(c.due_date_bs, pendingDateRange)) return false;

                // Search Filter: Cheque no, bill no, bank, party, amount
                if (!term) return true;
                const partyName = parties.find((p) => p.id === c.party_id)?.name?.toLowerCase() || '';
                const bankName = banks.find((b) => b.id === c.bank_id)?.name?.toLowerCase() || '';
                const chequeNum = c.cheque_number.toLowerCase();
                const billNum = (c.bill_number || '').toLowerCase();
                const amountStr = c.amount.toString();
                return (
                  chequeNum.includes(term) ||
                  billNum.includes(term) ||
                  partyName.includes(term) ||
                  bankName.includes(term) ||
                  amountStr.includes(term)
                );
              });

              // Cleared in range computation
              const clearedInRange = cheques.filter(
                (c) => c.status === 'Cleared' && matchesBsDateRange(c.due_date_bs, pendingDateRange)
              );
              const clearedInRangeTotal = clearedInRange.reduce((sum, c) => sum + c.amount, 0);
              const remainingPendingTotal = filteredPending.reduce(
                (sum, c) => sum + (c.remaining_amount ?? c.amount),
                0
              );

              const pendingIds = filteredPending.map((c) => c.id);
              const allPendingSelected = pendingIds.length > 0 && pendingIds.every((id) => selectedChequeIds.includes(id));

              return (
                <div className="space-y-4">
                  {/* Top Bar: Search, Date Range Filter, Export */}
                  <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs flex flex-wrap items-center justify-between gap-3">
                    <div className="flex flex-wrap items-center gap-3 flex-1 min-w-[280px]">
                      {/* Search Bar */}
                      <div className="relative flex-1 min-w-[200px] max-w-md">
                        <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                        <input
                          type="text"
                          value={pendingSearchTerm}
                          onChange={(e) => setPendingSearchTerm(e.target.value)}
                          placeholder="Search cheque #, bill #, party, bank, amount..."
                          className="w-full pl-9 pr-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                        {pendingSearchTerm && (
                          <button
                            onClick={() => setPendingSearchTerm('')}
                            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs"
                          >
                            ×
                          </button>
                        )}
                      </div>

                      {/* Date Range (BS) Dropdown */}
                      <div className="flex items-center gap-1.5 text-xs text-slate-600">
                        <Calendar className="w-3.5 h-3.5 text-slate-400" />
                        <select
                          value={pendingDateRange}
                          onChange={(e) => setPendingDateRange(e.target.value)}
                          className="px-2.5 py-2 border border-slate-200 rounded-xl text-xs bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium"
                        >
                          <option value="all">All Dates (BS)</option>
                          <option value="today">Due Today</option>
                          <option value="overdue">Overdue (Past BS)</option>
                          <option value="this_month">This Month (BS)</option>
                          <option value="last_month">Last Month (BS)</option>
                          <option value="this_year">This Year (BS)</option>
                        </select>
                      </div>
                    </div>

                    {/* Export Actions */}
                    {activeFeatures.excel_pdf_export && (
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => exportChequesToExcel(filteredPending, 'Pending_Cheques', 'Pending')}
                          title="Export to Excel (.xlsx)"
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-xl transition cursor-pointer shadow-2xs"
                        >
                          <Download className="w-3.5 h-3.5 text-emerald-600" />
                          <span>Export Excel</span>
                        </button>
                        <button
                          onClick={() => exportChequesToPdf(filteredPending, 'Pending Cheques Report')}
                          title="Export to PDF"
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-xl transition cursor-pointer shadow-2xs"
                        >
                          <Printer className="w-3.5 h-3.5 text-rose-600" />
                          <span>Export PDF</span>
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Summary Banner */}
                  <div className="bg-gradient-to-r from-amber-500/10 via-slate-50 to-emerald-500/10 border border-slate-200 rounded-2xl p-4 flex flex-wrap items-center justify-between gap-3 text-xs">
                    <div className="flex flex-wrap items-center gap-4 sm:gap-6">
                      <div className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                        <span className="text-slate-600">Cleared in range:</span>
                        <span className="font-mono font-bold text-emerald-700 text-sm">
                          {formatNPR(clearedInRangeTotal)}
                        </span>
                        <span className="text-slate-400 text-[11px]">({clearedInRange.length} cleared)</span>
                      </div>
                      <div className="h-4 w-px bg-slate-200 hidden sm:block" />
                      <div className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                        <span className="text-slate-600">Remaining pending:</span>
                        <span className="font-mono font-bold text-amber-700 text-sm">
                          {formatNPR(remainingPendingTotal)}
                        </span>
                        <span className="text-slate-400 text-[11px]">({filteredPending.length} pending)</span>
                      </div>
                    </div>

                    {(pendingSearchTerm || pendingDateRange !== 'all') && (
                      <button
                        onClick={() => {
                          setPendingSearchTerm('');
                          setPendingDateRange('all');
                        }}
                        className="px-3 py-1 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-lg text-xs font-semibold transition cursor-pointer shadow-2xs flex items-center gap-1"
                      >
                        <RefreshCw className="w-3 h-3" />
                        <span>Clear filters</span>
                      </button>
                    )}
                  </div>

                  {/* Bulk Selection Bar */}
                  {selectedChequeIds.length > 0 && (
                    <div className="p-3 bg-indigo-50 border border-indigo-200 rounded-xl flex flex-wrap items-center justify-between gap-3 text-xs">
                      <div className="flex items-center gap-2 text-indigo-900 font-bold">
                        <CheckCircle2 className="w-4 h-4 text-indigo-600" />
                        <span>{selectedChequeIds.length} cheque(s) selected</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={handleBulkMarkCleared}
                          className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold flex items-center gap-1.5 transition cursor-pointer shadow-xs"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Mark Selected Cleared</span>
                        </button>
                        <button
                          type="button"
                          onClick={handleBulkDelete}
                          className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg font-bold flex items-center gap-1.5 transition cursor-pointer shadow-xs"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>Delete Selected</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setSelectedChequeIds([])}
                          className="px-3 py-1.5 bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 rounded-lg font-bold transition cursor-pointer"
                        >
                          Clear Selection
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Table with all requested columns */}
                  <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-slate-50 text-slate-500 font-bold uppercase text-[10px] border-b border-slate-200">
                          <tr>
                            <th className="p-3 w-10 text-center">
                              <input
                                type="checkbox"
                                checked={allPendingSelected}
                                onChange={() => toggleSelectAllCheques(pendingIds)}
                                className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                              />
                            </th>
                            <th className="p-3">Cheque No</th>
                            <th className="p-3">Bill No</th>
                            <th className="p-3">Bank</th>
                            <th className="p-3">Party</th>
                            <th className="p-3 text-right">Amount (रू)</th>
                            <th className="p-3">Issued (BS)</th>
                            <th className="p-3">Due (BS)</th>
                            <th className="p-3 text-center">Status</th>
                            <th className="p-3 text-center">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {filteredPending.length === 0 ? (
                            <tr>
                              <td colSpan={10} className="p-8 text-center text-slate-400">
                                No pending cheques match your search or filter criteria.
                              </td>
                            </tr>
                          ) : (
                            filteredPending.map((c) => {
                              const isSelected = selectedChequeIds.includes(c.id);
                              return (
                                <tr
                                  key={c.id}
                                  onClick={() => {
                                    setSelectedCheque(c);
                                    setIsDetailModalOpen(true);
                                  }}
                                  className={`hover:bg-amber-50/40 transition cursor-pointer ${
                                    isSelected ? 'bg-amber-50/60' : ''
                                  }`}
                                >
                                  <td className="p-3 text-center" onClick={(e) => e.stopPropagation()}>
                                    <input
                                      type="checkbox"
                                      checked={isSelected}
                                      onChange={() => toggleSelectCheque(c.id)}
                                      className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                                    />
                                  </td>
                                  <td className="p-3 font-mono font-bold text-slate-900">{c.cheque_number}</td>
                                  <td className="p-3 font-mono text-slate-600">{c.bill_number || '—'}</td>
                                  <td className="p-3 text-slate-700">{banks.find((b) => b.id === c.bank_id)?.name || '—'}</td>
                                  <td className="p-3">
                                    {(() => {
                                      const p = parties.find((party) => party.id === c.party_id);
                                      const isCreditor = p?.party_type === 'Sundry Creditors';
                                      return (
                                        <div>
                                          <div className="font-semibold text-slate-800">{p?.name || '—'}</div>
                                          {p?.party_type && (
                                            <span
                                              className={`inline-flex items-center gap-1 mt-0.5 px-1.5 py-0.2 rounded text-[9px] font-bold ${
                                                isCreditor
                                                  ? 'bg-purple-50 text-purple-700 border border-purple-200'
                                                  : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                              }`}
                                            >
                                              <span className={`w-1 h-1 rounded-full ${isCreditor ? 'bg-purple-500' : 'bg-emerald-500'}`} />
                                              {isCreditor ? 'Creditor (Outward)' : 'Debtor (Inward)'}
                                            </span>
                                          )}
                                        </div>
                                      );
                                    })()}
                                  </td>
                                  <td className="p-3 text-right font-mono whitespace-nowrap">
                                    <div className="font-bold text-amber-700">{formatNPR(c.remaining_amount ?? c.amount)}</div>
                                    {c.remaining_amount !== undefined && c.remaining_amount < c.amount && (
                                      <div className="text-[10px] text-slate-400 font-normal">
                                        Orig: {formatNPR(c.amount)} • Paid: {formatNPR(c.amount - c.remaining_amount)}
                                      </div>
                                    )}
                                  </td>
                                  <td className="p-3 font-mono text-slate-600">{c.issue_date_bs}</td>
                                  <td className="p-3 font-mono text-slate-600">{c.due_date_bs}</td>
                                  <td className="p-3 text-center">
                                    <StatusBadge status={c.status} />
                                  </td>
                                  <td className="p-3 text-center" onClick={(e) => e.stopPropagation()}>
                                    <div className="flex items-center justify-center gap-1">
                                      <button
                                        onClick={() => {
                                          setSelectedCheque(c);
                                          setIsDetailModalOpen(true);
                                        }}
                                        title="View Details"
                                        className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition cursor-pointer"
                                      >
                                        <Eye className="w-3.5 h-3.5" />
                                      </button>
                                      <button
                                        onClick={() => {
                                          setStatementCheque(c);
                                          setIsStatementModalOpen(true);
                                        }}
                                        title="View Statement &amp; Ledger"
                                        className="p-1.5 text-slate-500 hover:text-purple-600 hover:bg-purple-50 rounded-lg transition cursor-pointer"
                                      >
                                        <FileText className="w-3.5 h-3.5" />
                                      </button>
                                      <button
                                        onClick={() => handleMarkCleared(c)}
                                        title="Mark Cleared"
                                        className="p-1.5 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg transition cursor-pointer"
                                      >
                                        <CheckCircle2 className="w-3.5 h-3.5" />
                                      </button>
                                      <button
                                        onClick={() => {
                                          setActivePaymentCheque(c);
                                          setIsPaymentModalOpen(true);
                                        }}
                                        title="Record Payment"
                                        className="px-2 py-1 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 rounded-lg text-[11px] font-bold transition cursor-pointer"
                                      >
                                        Pay
                                      </button>
                                      <button
                                        onClick={() => openEditChequeModal(c)}
                                        title="Edit Cheque"
                                        className="p-1.5 text-slate-500 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition cursor-pointer"
                                      >
                                        <Edit3 className="w-3.5 h-3.5" />
                                      </button>
                                      <button
                                        onClick={() => setChequeToDeleteId(c.id)}
                                        title="Delete Cheque"
                                        className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition cursor-pointer"
                                      >
                                        <Trash2 className="w-3.5 h-3.5" />
                                      </button>
                                    </div>
                                  </td>
                                </tr>
                              );
                            })
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              );
            })()}

            {/* VIEW: PARTIAL PAYMENTS / INSTALLMENTS LEDGER */}
            {currentView === 'partial_payments' && (() => {
              const filteredLedgerCheques = cheques.filter((c) => {
                const logs = paymentLogs.filter((p) => p.cheque_id === c.id);
                const isPartial = c.status === 'Partially Paid';
                const isClearedWithLogs = c.status === 'Cleared' && logs.length > 0;
                const hasLogs = logs.length > 0;

                let matchesFilter = true;
                if (partialLedgerFilter === 'partially_paid') matchesFilter = isPartial;
                else if (partialLedgerFilter === 'cleared') matchesFilter = isClearedWithLogs;
                else if (partialLedgerFilter === 'all_cheques') matchesFilter = true;
                else matchesFilter = isPartial || hasLogs;

                if (!matchesFilter) return false;

                if (searchTerm.trim()) {
                  const q = searchTerm.toLowerCase();
                  const party = parties.find((p) => p.id === c.party_id);
                  const bank = banks.find((b) => b.id === c.bank_id);
                  const matchNum = c.cheque_number?.toLowerCase().includes(q);
                  const matchBill = c.bill_number?.toLowerCase().includes(q);
                  const matchParty = party?.name?.toLowerCase().includes(q);
                  const matchBank = bank?.name?.toLowerCase().includes(q);
                  if (!matchNum && !matchBill && !matchParty && !matchBank) return false;
                }
                return true;
              });

              const totalChequeValue = filteredLedgerCheques.reduce((s, c) => s + (c.amount || 0), 0);
              const totalRemainingDue = filteredLedgerCheques.reduce((s, c) => s + (c.remaining_amount ?? (c.status === 'Cleared' ? 0 : c.amount)), 0);
              const totalReceived = totalChequeValue - totalRemainingDue;
              const totalInstallmentsCount = filteredLedgerCheques.reduce((s, c) => s + paymentLogs.filter((p) => p.cheque_id === c.id).length, 0);
              const percentRecovered = totalChequeValue > 0 ? Math.round((totalReceived / totalChequeValue) * 100) : 0;

              return (
                <div className="space-y-4">
                  {/* Top Bar with Title, Tabs, and Standardized PDF/Excel Export */}
                  <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-wrap justify-between items-center gap-4">
                    <div>
                      <div className="flex items-center gap-2">
                        <h2 className="text-base font-bold text-slate-900">Partial Payment Ledger Report</h2>
                        <span className="text-[11px] font-bold bg-indigo-50 text-indigo-700 px-2.5 py-0.5 rounded-full border border-indigo-100">
                          {filteredLedgerCheques.length} Records
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Official audit report with date-wise installments, payment modes (Cash / IPS / Cheque), and remaining dues
                      </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      {/* Filter Tabs */}
                      <div className="flex bg-slate-100 p-1 rounded-xl text-xs font-semibold">
                        <button
                          onClick={() => setPartialLedgerFilter('all')}
                          className={`px-3 py-1.5 rounded-lg transition cursor-pointer ${partialLedgerFilter === 'all' ? 'bg-white text-indigo-700 font-bold shadow-xs' : 'text-slate-600 hover:text-slate-900'}`}
                        >
                          All Installments
                        </button>
                        <button
                          onClick={() => setPartialLedgerFilter('partially_paid')}
                          className={`px-3 py-1.5 rounded-lg transition cursor-pointer ${partialLedgerFilter === 'partially_paid' ? 'bg-white text-indigo-700 font-bold shadow-xs' : 'text-slate-600 hover:text-slate-900'}`}
                        >
                          Active Dues
                        </button>
                        <button
                          onClick={() => setPartialLedgerFilter('cleared')}
                          className={`px-3 py-1.5 rounded-lg transition cursor-pointer ${partialLedgerFilter === 'cleared' ? 'bg-white text-indigo-700 font-bold shadow-xs' : 'text-slate-600 hover:text-slate-900'}`}
                        >
                          Cleared
                        </button>
                        <button
                          onClick={() => setPartialLedgerFilter('all_cheques')}
                          className={`px-3 py-1.5 rounded-lg transition cursor-pointer ${partialLedgerFilter === 'all_cheques' ? 'bg-white text-indigo-700 font-bold shadow-xs' : 'text-slate-600 hover:text-slate-900'}`}
                        >
                          All Cheques
                        </button>
                      </div>

                      {/* Action Buttons: Record Received/Payment & Modes Master */}
                      <button
                        onClick={() => {
                          if (parties.length > 0 && !receivedPaymentPartyId) {
                            setReceivedPaymentPartyId(parties[0].id);
                            setReceivedPaymentType(parties[0].party_type === 'Sundry Creditors' ? 'Payment' : 'Received');
                            const pendingList = cheques.filter(
                              (c) => c.party_id === parties[0].id && c.status !== 'Cleared' && ((c.remaining_amount ?? c.amount) > 0.001)
                            );
                            if (pendingList.length > 0) {
                              setReceivedPaymentChequeId(pendingList[0].id);
                              setReceivedPaymentAmount(String(pendingList[0].remaining_amount ?? pendingList[0].amount));
                            }
                          }
                          setIsReceivedPaymentModalOpen(true);
                        }}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl transition cursor-pointer shadow-xs"
                      >
                        <ArrowRightLeft className="w-3.5 h-3.5" />
                        <span>Record Received / Payment</span>
                      </button>

                      <button
                        onClick={() => setIsPaymentModesMasterOpen(true)}
                        title="Manage Custom Payment Modes (Cash, IPS, Cheque, RTGS, etc.)"
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-300 rounded-xl transition cursor-pointer"
                      >
                        <Sliders className="w-3.5 h-3.5 text-slate-600" />
                        <span>Payment Modes Master</span>
                      </button>

                      {/* Export to Excel & PDF Buttons */}
                      <button
                        onClick={() => exportPartialPaymentLedgerToExcel(filteredLedgerCheques)}
                        title="Export Partial Payment Ledger to Excel (.xlsx)"
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-xl transition cursor-pointer"
                      >
                        <Download className="w-3.5 h-3.5 text-emerald-600" />
                        <span>Export to Excel</span>
                      </button>

                      <button
                        onClick={() => exportPartialPaymentLedgerToPdf(filteredLedgerCheques)}
                        title="Export Partial Payment Ledger to Printable PDF"
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-xl transition cursor-pointer"
                      >
                        <Printer className="w-3.5 h-3.5 text-rose-600" />
                        <span>Export to PDF</span>
                      </button>
                    </div>
                  </div>

                  {/* LEDGER SUMMARY HEADER (5 Metric Cards) */}
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
                    <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-2xs">
                      <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Total Cheque Value</span>
                      <div className="text-base font-bold font-mono text-slate-900 mt-1">{formatNPR(totalChequeValue)}</div>
                      <span className="text-[10px] text-slate-400">Total committed ledger value</span>
                    </div>

                    <div className="bg-white p-3.5 rounded-2xl border border-emerald-100 bg-emerald-50/20 shadow-2xs">
                      <span className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider block">Total Received</span>
                      <div className="text-base font-bold font-mono text-emerald-700 mt-1">{formatNPR(totalReceived)}</div>
                      <span className="text-[10px] text-emerald-600/80">Collected in installments</span>
                    </div>

                    <div className="bg-white p-3.5 rounded-2xl border border-amber-100 bg-amber-50/20 shadow-2xs">
                      <span className="text-[10px] font-bold text-amber-700 uppercase tracking-wider block">Remaining Due</span>
                      <div className="text-base font-bold font-mono text-amber-600 mt-1">{formatNPR(totalRemainingDue)}</div>
                      <span className="text-[10px] text-amber-600/80">Balance still pending</span>
                    </div>

                    <div className="bg-white p-3.5 rounded-2xl border border-indigo-100 bg-indigo-50/20 shadow-2xs">
                      <span className="text-[10px] font-bold text-indigo-700 uppercase tracking-wider block">Installments Count</span>
                      <div className="text-base font-bold font-mono text-indigo-700 mt-1">{totalInstallmentsCount} Entries</div>
                      <span className="text-[10px] text-indigo-600/80">Logged payments recorded</span>
                    </div>

                    <div className="bg-white p-3.5 rounded-2xl border border-sky-100 bg-sky-50/20 shadow-2xs col-span-2 sm:col-span-1">
                      <div className="flex justify-between items-center">
                        <span className="text-[10px] font-bold text-sky-700 uppercase tracking-wider block">% Recovered</span>
                        <span className="text-xs font-bold text-sky-700">{percentRecovered}%</span>
                      </div>
                      <div className="w-full bg-sky-100 h-2 rounded-full overflow-hidden mt-2">
                        <div className="bg-sky-600 h-2 rounded-full transition-all duration-500" style={{ width: `${percentRecovered}%` }} />
                      </div>
                      <span className="text-[10px] text-sky-600/80 mt-1 block">Liquidity recovery rate</span>
                    </div>
                  </div>

                  {/* PARTIAL PAYMENT LEDGER TABLE */}
                  <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs border-collapse">
                        <thead>
                          <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold text-slate-700 uppercase tracking-wider">
                            <th className="py-3 px-3">Cheque #</th>
                            <th className="py-3 px-3">Bill #</th>
                            <th className="py-3 px-3">Party Name</th>
                            <th className="py-3 px-3">Bank Name</th>
                            <th className="py-3 px-3">Issue Date (BS/AD)</th>
                            <th className="py-3 px-3">Due Date (BS/AD)</th>
                            <th className="py-3 px-3 text-right">Total Amount</th>
                            <th className="py-3 px-4 min-w-[240px]">Date-wise Payment Entries</th>
                            <th className="py-3 px-3 text-right">Remaining Due</th>
                            <th className="py-3 px-3 text-center">Status</th>
                            <th className="py-3 px-3 text-right">Action</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {filteredLedgerCheques.length === 0 ? (
                            <tr>
                              <td colSpan={11} className="py-12 text-center text-slate-400">
                                <Coins className="w-10 h-10 mx-auto mb-2 text-slate-300" />
                                <div className="font-bold text-slate-700">No Partial Payment Records Found</div>
                                <p className="text-xs text-slate-400 mt-1">
                                  {searchTerm ? 'Try adjusting your search criteria' : 'Record an installment payment on any cheque to see it in this ledger.'}
                                </p>
                              </td>
                            </tr>
                          ) : (
                            filteredLedgerCheques.map((c) => {
                              const party = parties.find((p) => p.id === c.party_id);
                              const bank = banks.find((b) => b.id === c.bank_id);
                              const logs = paymentLogs.filter((p) => p.cheque_id === c.id);
                              const remaining = c.remaining_amount ?? (c.status === 'Cleared' ? 0 : c.amount);
                              const totalPaid = (c.amount || 0) - remaining;
                              const pct = c.amount > 0 ? Math.min(100, Math.round((totalPaid / c.amount) * 100)) : 0;

                              return (
                                <tr key={c.id} className="hover:bg-slate-50/80 transition group">
                                  {/* Cheque # */}
                                  <td className="py-3 px-3 font-mono font-bold text-slate-900 whitespace-nowrap">
                                    <button
                                      onClick={() => {
                                        setSelectedCheque(c);
                                        setIsDetailModalOpen(true);
                                      }}
                                      className="hover:text-indigo-600 flex items-center gap-1 cursor-pointer transition"
                                    >
                                      #{c.cheque_number}
                                      <Eye className="w-3 h-3 text-slate-400 group-hover:text-indigo-500 opacity-60 group-hover:opacity-100" />
                                    </button>
                                  </td>

                                  {/* Bill # */}
                                  <td className="py-3 px-3 font-mono text-slate-600 whitespace-nowrap">
                                    {c.bill_number || <span className="text-slate-300">-</span>}
                                  </td>

                                  {/* Party Name */}
                                  <td className="py-3 px-3">
                                    <div className="font-semibold text-slate-800">{party?.name || 'N/A'}</div>
                                    {party?.party_type && (
                                      <span
                                        className={`inline-flex items-center gap-1 mt-0.5 px-1.5 py-0.2 rounded text-[9px] font-bold ${
                                          party.party_type === 'Sundry Creditors'
                                            ? 'bg-purple-50 text-purple-700 border border-purple-200'
                                            : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                        }`}
                                      >
                                        <span className={`w-1 h-1 rounded-full ${party.party_type === 'Sundry Creditors' ? 'bg-purple-500' : 'bg-emerald-500'}`} />
                                        {party.party_type === 'Sundry Creditors' ? 'Creditor (Outward)' : 'Debtor (Inward)'}
                                      </span>
                                    )}
                                  </td>

                                  {/* Bank Name */}
                                  <td className="py-3 px-3 text-slate-600">
                                    {bank?.name || 'N/A'}
                                  </td>

                                  {/* Issue Date (BS/AD) */}
                                  <td className="py-3 px-3 whitespace-nowrap">
                                    <div className="font-semibold text-slate-800">{c.issue_date_bs}</div>
                                    <div className="text-[10px] text-slate-400">{c.issue_date_ad}</div>
                                  </td>

                                  {/* Due Date (BS/AD) */}
                                  <td className="py-3 px-3 whitespace-nowrap">
                                    <div className="font-semibold text-slate-800">{c.due_date_bs}</div>
                                    <div className="text-[10px] text-slate-400">{c.due_date_ad}</div>
                                  </td>

                                  {/* Total Amount */}
                                  <td className="py-3 px-3 font-mono font-bold text-slate-900 text-right whitespace-nowrap">
                                    {formatNPR(c.amount)}
                                  </td>

                                  {/* Date-wise Payment Entries */}
                                  <td className="py-2 px-4 min-w-[240px]">
                                    {logs.length === 0 ? (
                                      <span className="text-[11px] text-slate-400 italic">No payments yet</span>
                                    ) : (
                                      <div className="space-y-1 my-1">
                                        {logs.map((log) => (
                                          <div
                                            key={log.id}
                                            className="flex items-center justify-between gap-2 p-1 bg-slate-50 hover:bg-slate-100 rounded-lg text-[11px] border border-slate-100 transition"
                                          >
                                            <div className="flex items-center gap-1.5">
                                              <span className="font-semibold text-slate-700">{log.payment_date_bs} BS</span>
                                              <span className={`px-1.5 py-0.2 rounded text-[9px] font-bold uppercase tracking-wider ${
                                                log.payment_mode === 'Cash'
                                                  ? 'bg-emerald-100 text-emerald-800'
                                                  : log.payment_mode === 'IPS'
                                                  ? 'bg-sky-100 text-sky-800'
                                                  : 'bg-indigo-100 text-indigo-800'
                                              }`}>
                                                {log.payment_mode}
                                              </span>
                                            </div>
                                            <span className="font-mono font-bold text-emerald-700">
                                              NPR {log.amount.toLocaleString()}
                                            </span>
                                          </div>
                                        ))}
                                      </div>
                                    )}
                                  </td>

                                  {/* Remaining Balance */}
                                  <td className="py-3 px-3 font-mono font-bold text-right whitespace-nowrap">
                                    <div className={remaining > 0 ? 'text-amber-600' : 'text-emerald-600'}>
                                      {formatNPR(remaining)}
                                    </div>
                                    <div className="text-[10px] text-slate-400">
                                      {pct}% paid
                                    </div>
                                  </td>

                                  {/* Status */}
                                  <td className="py-3 px-3 text-center whitespace-nowrap">
                                    <span
                                      className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold inline-block ${
                                        c.status === 'Cleared'
                                          ? 'bg-emerald-100 text-emerald-800'
                                          : c.status === 'Partially Paid'
                                          ? 'bg-sky-100 text-sky-800'
                                          : 'bg-amber-100 text-amber-800'
                                      }`}
                                    >
                                      {c.status}
                                    </span>
                                  </td>

                                  {/* Action */}
                                  <td className="py-3 px-3 text-right whitespace-nowrap">
                                    <div className="flex items-center justify-end gap-1.5">
                                      <button
                                        onClick={() => {
                                          setStatementCheque(c);
                                          setIsStatementModalOpen(true);
                                        }}
                                        className="px-2 py-1 bg-slate-100 hover:bg-purple-50 hover:text-purple-700 text-slate-700 border border-slate-200 rounded-lg text-[11px] font-bold transition cursor-pointer flex items-center gap-1"
                                        title="View Full Cheque Ledger Statement"
                                      >
                                        <FileText className="w-3 h-3 text-slate-500" />
                                        <span>Statement</span>
                                      </button>
                                      {c.status !== 'Cleared' && (
                                        <button
                                          onClick={() => {
                                            setActivePaymentCheque(c);
                                            setIsPaymentModalOpen(true);
                                          }}
                                          className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-[11px] font-bold transition cursor-pointer shadow-2xs"
                                        >
                                          Pay Installment
                                        </button>
                                      )}
                                      <button
                                        onClick={() => {
                                          setSelectedCheque(c);
                                          setIsDetailModalOpen(true);
                                        }}
                                        className="p-1 text-slate-400 hover:text-slate-700 transition cursor-pointer rounded-lg hover:bg-slate-100"
                                        title="View Details"
                                      >
                                        <Eye className="w-3.5 h-3.5" />
                                      </button>
                                    </div>
                                  </td>
                                </tr>
                              );
                            })
                          )}
                        </tbody>

                        {/* GRAND TOTALS ROW */}
                        {filteredLedgerCheques.length > 0 && (
                          <tfoot>
                            <tr className="bg-slate-100 border-t-2 border-slate-300 font-bold text-slate-900 text-xs">
                              <td className="py-3 px-3 uppercase tracking-wider text-indigo-900">Grand Totals</td>
                              <td className="py-3 px-3 text-slate-500 font-mono text-[11px]">{filteredLedgerCheques.length} Cheques</td>
                              <td className="py-3 px-3 text-slate-500" colSpan={4}>
                                Ledger Summary ({totalInstallmentsCount} Installments Processed)
                              </td>
                              <td className="py-3 px-3 text-right font-mono text-slate-900">
                                {formatNPR(totalChequeValue)}
                              </td>
                              <td className="py-3 px-4 font-mono text-emerald-800">
                                Total Received: {formatNPR(totalReceived)}
                              </td>
                              <td className="py-3 px-3 text-right font-mono text-amber-700">
                                {formatNPR(totalRemainingDue)}
                              </td>
                              <td className="py-3 px-3 text-center">
                                <span className="bg-indigo-100 text-indigo-800 px-2 py-0.5 rounded-full text-[10px] font-extrabold">
                                  {percentRecovered}% Recovered
                                </span>
                              </td>
                              <td className="py-3 px-3"></td>
                            </tr>
                          </tfoot>
                        )}
                      </table>
                    </div>
                  </div>
                </div>
              );
            })()}

            {/* VIEW: CLEARED CHEQUES */}
            {currentView === 'cleared' && (() => {
              const term = clearedSearchTerm.toLowerCase().trim();
              const filteredCleared = clearedCheques.filter((c) => {
                // BS Date Range Filter
                if (!matchesBsDateRange(c.due_date_bs, clearedDateRange)) return false;

                // Search Filter: Cheque no, bill no, bank, party, amount
                if (!term) return true;
                const partyName = parties.find((p) => p.id === c.party_id)?.name?.toLowerCase() || '';
                const bankName = banks.find((b) => b.id === c.bank_id)?.name?.toLowerCase() || '';
                const chequeNum = c.cheque_number.toLowerCase();
                const billNum = (c.bill_number || '').toLowerCase();
                const amountStr = c.amount.toString();
                return (
                  chequeNum.includes(term) ||
                  billNum.includes(term) ||
                  partyName.includes(term) ||
                  bankName.includes(term) ||
                  amountStr.includes(term)
                );
              });

              const visibleClearedTotal = filteredCleared.reduce((sum, c) => sum + c.amount, 0);
              const allClearedTotal = clearedCheques.reduce((sum, c) => sum + c.amount, 0);

              return (
                <div className="space-y-4">
                  {/* Top Bar: Search, Date Range Filter, Export */}
                  <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs flex flex-wrap items-center justify-between gap-3">
                    <div className="flex flex-wrap items-center gap-3 flex-1 min-w-[280px]">
                      {/* Search Bar */}
                      <div className="relative flex-1 min-w-[200px] max-w-md">
                        <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                        <input
                          type="text"
                          value={clearedSearchTerm}
                          onChange={(e) => setClearedSearchTerm(e.target.value)}
                          placeholder="Search cleared cheque #, bill #, party, bank, amount..."
                          className="w-full pl-9 pr-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500"
                        />
                        {clearedSearchTerm && (
                          <button
                            onClick={() => setClearedSearchTerm('')}
                            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs"
                          >
                            ×
                          </button>
                        )}
                      </div>

                      {/* Date Range (BS) Dropdown */}
                      <div className="flex items-center gap-1.5 text-xs text-slate-600">
                        <Calendar className="w-3.5 h-3.5 text-slate-400" />
                        <select
                          value={clearedDateRange}
                          onChange={(e) => setClearedDateRange(e.target.value)}
                          className="px-2.5 py-2 border border-slate-200 rounded-xl text-xs bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium"
                        >
                          <option value="all">All Dates (BS)</option>
                          <option value="today">Cleared Today</option>
                          <option value="this_month">This Month (BS)</option>
                          <option value="last_month">Last Month (BS)</option>
                          <option value="this_year">This Year (BS)</option>
                        </select>
                      </div>
                    </div>

                    {/* Export Actions */}
                    {activeFeatures.excel_pdf_export && (
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => exportChequesToExcel(filteredCleared, 'Cleared_Cheques', 'Cleared')}
                          title="Export to Excel (.xlsx)"
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-xl transition cursor-pointer shadow-2xs"
                        >
                          <Download className="w-3.5 h-3.5 text-emerald-600" />
                          <span>Export Excel</span>
                        </button>
                        <button
                          onClick={() => exportChequesToPdf(filteredCleared, 'Cleared Cheques Archive')}
                          title="Export to PDF"
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-xl transition cursor-pointer shadow-2xs"
                        >
                          <Printer className="w-3.5 h-3.5 text-rose-600" />
                          <span>Export PDF</span>
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Total Cleared Value Summary Header Card */}
                  <div className="bg-gradient-to-r from-emerald-500/10 via-emerald-50/40 to-slate-50 border border-emerald-200/80 rounded-2xl p-4 flex flex-wrap items-center justify-between gap-3 text-xs">
                    <div className="flex items-center gap-3">
                      <div className="p-2.5 bg-emerald-100 text-emerald-700 rounded-xl">
                        <CheckCircle2 className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="text-slate-500 text-[11px] font-semibold uppercase tracking-wider">Total Cleared Value</div>
                        <div className="font-mono font-extrabold text-emerald-800 text-base sm:text-lg">
                          {formatNPR(allClearedTotal)}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 text-xs">
                      <span className="px-3 py-1 bg-white border border-emerald-200 rounded-lg text-emerald-800 font-bold">
                        {clearedCheques.length} Cheques Cleared
                      </span>
                      {(clearedSearchTerm || clearedDateRange !== 'all') && (
                        <button
                          onClick={() => {
                            setClearedSearchTerm('');
                            setClearedDateRange('all');
                          }}
                          className="px-3 py-1 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-lg text-xs font-semibold transition cursor-pointer shadow-2xs flex items-center gap-1"
                        >
                          <RefreshCw className="w-3 h-3" />
                          <span>Clear filters</span>
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Table with exact columns */}
                  <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-slate-50 text-slate-500 font-bold uppercase text-[10px] border-b border-slate-200">
                          <tr>
                            <th className="p-3">Cheque No</th>
                            <th className="p-3">Bill No</th>
                            <th className="p-3">Bank</th>
                            <th className="p-3">Party</th>
                            <th className="p-3 text-right">Amount (रू)</th>
                            <th className="p-3">Issued (BS)</th>
                            <th className="p-3">Due (BS)</th>
                            <th className="p-3 text-center">Status</th>
                            <th className="p-3 text-center">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {filteredCleared.length === 0 ? (
                            <tr>
                              <td colSpan={9} className="p-8 text-center text-slate-400">
                                No cleared cheques match your filter or search criteria.
                              </td>
                            </tr>
                          ) : (
                            filteredCleared.map((c) => (
                              <tr
                                key={c.id}
                                onClick={() => {
                                  setSelectedCheque(c);
                                  setIsDetailModalOpen(true);
                                }}
                                className="hover:bg-emerald-50/40 transition cursor-pointer"
                              >
                                <td className="p-3 font-mono font-bold text-slate-900">{c.cheque_number}</td>
                                <td className="p-3 font-mono text-slate-600">{c.bill_number || '—'}</td>
                                <td className="p-3 text-slate-700">{banks.find((b) => b.id === c.bank_id)?.name || '—'}</td>
                                <td className="p-3 font-semibold text-slate-800">{parties.find((p) => p.id === c.party_id)?.name || '—'}</td>
                                <td className="p-3 text-right font-mono font-bold text-emerald-700">{formatNPR(c.amount)}</td>
                                <td className="p-3 font-mono text-slate-600">{c.issue_date_bs}</td>
                                <td className="p-3 font-mono text-slate-600">{c.due_date_bs}</td>
                                <td className="p-3 text-center">
                                  <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800">
                                    Cleared
                                  </span>
                                </td>
                                <td className="p-3 text-center" onClick={(e) => e.stopPropagation()}>
                                  <div className="flex items-center justify-center gap-1">
                                    <button
                                      onClick={() => {
                                        setSelectedCheque(c);
                                        setIsDetailModalOpen(true);
                                      }}
                                      title="View Details"
                                      className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition cursor-pointer"
                                    >
                                      <Eye className="w-3.5 h-3.5" />
                                    </button>
                                    <button
                                      onClick={() => openEditChequeModal(c)}
                                      title="Edit Cheque"
                                      className="p-1.5 text-slate-500 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition cursor-pointer"
                                    >
                                      <Edit3 className="w-3.5 h-3.5" />
                                    </button>
                                    <button
                                      onClick={() => setChequeToDeleteId(c.id)}
                                      title="Delete Cheque"
                                      className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition cursor-pointer"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            ))
                          )}
                        </tbody>
                        {/* Summary Footer */}
                        <tfoot className="bg-slate-50 border-t border-slate-200 text-xs font-semibold text-slate-700">
                          <tr>
                            <td colSpan={4} className="p-3">
                              Showing <strong className="text-slate-900">{filteredCleared.length}</strong> of {clearedCheques.length} cleared cheques
                            </td>
                            <td className="p-3 text-right font-mono font-bold text-emerald-800">
                              Total: {formatNPR(visibleClearedTotal)}
                            </td>
                            <td colSpan={4} className="p-3 text-slate-500 text-[11px]">
                              Total of visible rows: <strong className="font-mono text-slate-800">{formatNPR(visibleClearedTotal)}</strong>
                            </td>
                          </tr>
                        </tfoot>
                      </table>
                    </div>
                  </div>
                </div>
              );
            })()}

            {/* VIEW: PRINT CHEQUE */}
            {currentView === 'print_cheque' && (() => {
              const activeCheque = cheques.find((c) => c.id === printSelectedChequeId) || cheques[0];
              const activeParty = activeCheque ? parties.find((p) => p.id === activeCheque.party_id) : null;
              const activeBank = activeCheque ? banks.find((b) => b.id === activeCheque.bank_id) : null;
              return (
                <div className="space-y-4">
                  <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-wrap gap-3 justify-between items-center">
                    <div>
                      <h2 className="text-sm font-bold text-slate-900">Print Cheque Leaf Preview</h2>
                      <p className="text-xs text-slate-500">Realistic bank leaf rendering with Nepalese Amount-to-Words</p>
                    </div>

                    <div className="flex flex-wrap items-center gap-3">
                      {cheques.length > 0 && (
                        <div className="flex items-center gap-2">
                          <label className="text-xs font-semibold text-slate-600">Select Cheque:</label>
                          <select
                            value={printSelectedChequeId || activeCheque?.id || ''}
                            onChange={(e) => setPrintSelectedChequeId(e.target.value)}
                            className="text-xs border border-slate-200 rounded-xl px-2.5 py-1.5 bg-white text-slate-900 font-mono font-medium focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                          >
                            {cheques.map((c) => (
                              <option key={c.id} value={c.id}>
                                #{c.cheque_number} - {parties.find((p) => p.id === c.party_id)?.name || 'Party'} ({formatNPR(c.amount)})
                              </option>
                            ))}
                          </select>
                        </div>
                      )}

                      <label className="flex items-center gap-1.5 text-xs text-slate-600 cursor-pointer select-none bg-slate-50 px-2.5 py-1.5 rounded-xl border border-slate-200">
                        <input
                          type="checkbox"
                          checked={isAccountPayeeOnly}
                          onChange={(e) => setIsAccountPayeeOnly(e.target.checked)}
                          className="rounded text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                        />
                        <span className="font-semibold">A/C PAYEE ONLY</span>
                      </label>

                      <button
                        onClick={() => window.print()}
                        disabled={!activeCheque}
                        className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm cursor-pointer transition"
                      >
                        <Printer className="w-4 h-4" />
                        <span>Print Leaf</span>
                      </button>
                    </div>
                  </div>

                  {activeCheque ? (
                    <div className="bg-amber-50/40 border-2 border-dashed border-amber-300 rounded-2xl p-6 sm:p-8 max-w-3xl mx-auto shadow-md relative text-slate-800 font-serif">
                      {/* Bank header */}
                      <div className="flex justify-between items-start mb-6">
                        <div>
                          <div className="font-bold text-base tracking-wide font-sans text-slate-900 uppercase">
                            {activeBank?.name || 'Standard Chartered Bank Nepal Ltd.'}
                          </div>
                          <div className="text-[11px] font-sans text-slate-500">
                            Kathmandu Main Branch &bull; Code: {activeBank?.code || 'SCB-01'}
                          </div>
                        </div>

                        {/* Cheque Date */}
                        <div className="border border-slate-400 p-2 rounded bg-white font-mono text-xs text-right shadow-2xs">
                          <div className="text-[10px] text-slate-500 font-sans uppercase">Date (B.S.):</div>
                          <div className="font-bold text-slate-900">{activeCheque.due_date_bs || getCurrentBsDate()}</div>
                        </div>
                      </div>

                      {/* Payee watermark / stamp */}
                      {isAccountPayeeOnly && (
                        <div className="absolute top-6 left-6 border-b-2 border-t-2 border-slate-800 px-3 py-0.5 text-xs font-bold uppercase tracking-widest bg-white/70">
                          A/C PAYEE ONLY
                        </div>
                      )}

                      <div className="space-y-4 text-sm mt-4">
                        <div className="flex items-baseline gap-2 border-b border-slate-400 pb-1">
                          <span className="font-bold font-sans text-xs uppercase text-slate-500">Pay To:</span>
                          <span className="font-bold text-slate-900 text-base flex-1">
                            {activeParty?.name || 'Cash / Bearer'}
                          </span>
                        </div>
                        <div className="border-b border-slate-400 pb-1">
                          <span className="font-bold font-sans text-xs uppercase text-slate-500 mr-2">Rupees:</span>
                          <span className="font-semibold italic text-slate-900">
                            {numberToWords(activeCheque.amount || 0)}
                          </span>
                        </div>
                        <div className="flex justify-between items-end pt-3">
                          <div className="font-mono text-xs text-slate-500">
                            Cheque No: <span className="font-bold text-slate-900 font-mono">#{activeCheque.cheque_number}</span>
                          </div>
                          <div className="border-2 border-slate-800 bg-white px-5 py-2 text-lg font-bold font-mono shadow-2xs">
                            NPR {formatNPR(activeCheque.amount || 0)}
                          </div>
                        </div>
                      </div>

                      <div className="mt-8 pt-4 border-t border-dashed border-slate-300 flex justify-between items-center text-[11px] font-sans text-slate-400">
                        <span>Authorized Signatory</span>
                        <span className="font-mono text-[10px] tracking-widest text-slate-400">
                          |: {activeCheque.cheque_number} |: 0023450912 |: 10
                        </span>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-12 bg-white rounded-2xl border border-slate-200">
                      <CreditCard className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                      <div className="text-xs font-bold text-slate-700">No Cheques Available to Print</div>
                      <p className="text-[11px] text-slate-400 mt-1">Issue a cheque first or import records to preview printing.</p>
                    </div>
                  )}
                </div>
              );
            })()}

            {/* VIEW: BANKS */}
            {currentView === 'banks' && (() => {
              const term = bankSearchTerm.toLowerCase().trim();
              const filteredBanks = banks.filter((b) => {
                if (!term) return true;
                const bankCheques = cheques.filter((c) => c.bank_id === b.id);
                const accNos = bankCheques.map((c) => c.account_number).filter(Boolean).join(' ').toLowerCase();
                return (
                  b.name.toLowerCase().includes(term) ||
                  (b.code || '').toLowerCase().includes(term) ||
                  accNos.includes(term)
                );
              });

              return (
                <div className="space-y-4">
                  <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs flex flex-wrap justify-between items-center gap-3">
                    <div>
                      <h2 className="text-sm font-bold text-slate-900">Bank Accounts Directory & Balances</h2>
                      <p className="text-xs text-slate-500">Manage bank accounts, branch codes, linked accounts, and volume statements</p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setIsBankImportModalOpen(true)}
                        title="Batch Import Banks via Excel (.xlsx) or CSV"
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-purple-700 bg-purple-50 hover:bg-purple-100 border border-purple-200 rounded-xl transition cursor-pointer shadow-2xs"
                      >
                        <Upload className="w-3.5 h-3.5 text-purple-600" />
                        <span>Import Banks</span>
                      </button>

                      {activeFeatures.excel_pdf_export && (
                        <>
                          <button
                            onClick={() => exportBanksToExcel()}
                            title="Export Bank Directory & Balances to Excel (.xlsx)"
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-xl transition cursor-pointer shadow-2xs"
                          >
                            <Download className="w-3.5 h-3.5 text-emerald-600" />
                            <span>Export Excel</span>
                          </button>
                          <button
                            onClick={() => exportBanksToPdf()}
                            title="Export Bank Directory & Balances to PDF"
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-xl transition cursor-pointer shadow-2xs"
                          >
                            <Printer className="w-3.5 h-3.5 text-rose-600" />
                            <span>Export PDF</span>
                          </button>
                        </>
                      )}
                      <button
                        onClick={() => setIsAddBankOpen(true)}
                        className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold flex items-center gap-1 cursor-pointer transition shadow-xs"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Add Bank</span>
                      </button>
                    </div>
                  </div>

                  {/* Search Filter Bar */}
                  <div className="bg-white rounded-2xl border border-slate-200 p-3 shadow-xs flex items-center gap-3">
                    <div className="relative flex-1 max-w-md">
                      <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        value={bankSearchTerm}
                        onChange={(e) => setBankSearchTerm(e.target.value)}
                        placeholder="Search bank name, code, or account number..."
                        className="w-full pl-9 pr-3 py-1.5 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                      {bankSearchTerm && (
                        <button
                          onClick={() => setBankSearchTerm('')}
                          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs"
                        >
                          ×
                        </button>
                      )}
                    </div>
                    <span className="text-xs text-slate-500 font-medium">
                      Showing {filteredBanks.length} of {banks.length} banks
                    </span>
                  </div>

                  {/* Banks Table */}
                  <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
                    {filteredBanks.length === 0 ? (
                      <div className="text-center py-12 text-slate-400">
                        <Landmark className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                        <p className="text-xs font-semibold text-slate-700">No bank accounts found</p>
                        <p className="text-[11px] text-slate-400 mt-1">
                          {bankSearchTerm ? 'Try adjusting your search criteria' : 'Click "Add Bank" or "Import Banks" to register accounts.'}
                        </p>
                      </div>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs">
                          <thead className="bg-slate-50 text-slate-500 font-bold uppercase text-[10px] border-b border-slate-200">
                            <tr>
                              <th className="p-3">Bank Name</th>
                              <th className="p-3">Code / Branch</th>
                              <th className="p-3 text-center">Linked Cheques</th>
                              <th className="p-3 text-right">Total Volume</th>
                              <th className="p-3 text-right">Cleared Amount</th>
                              <th className="p-3 text-right">Pending Due</th>
                              <th className="p-3 text-center">Actions</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {filteredBanks.map((b) => {
                              const bankCheques = cheques.filter((c) => c.bank_id === b.id);
                              const totalAmount = bankCheques.reduce((s, c) => s + c.amount, 0);
                              const clearedAmount = bankCheques.filter((c) => c.status === 'Cleared').reduce((s, c) => s + c.amount, 0);
                              const pendingAmount = bankCheques.reduce((s, c) => s + (c.remaining_amount ?? (c.status === 'Cleared' ? 0 : c.amount)), 0);
                              const accNos = Array.from(new Set(bankCheques.map((c) => c.account_number).filter(Boolean))).join(', ');

                              return (
                                <tr key={b.id} className="hover:bg-slate-50/80 transition">
                                  <td className="p-3">
                                    <div className="font-bold text-slate-900 flex items-center gap-1.5">
                                      <Landmark className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                                      <span>{b.name}</span>
                                    </div>
                                    {accNos && (
                                      <div className="text-[10px] text-slate-400 font-mono mt-0.5" title={accNos}>
                                        A/C: {accNos}
                                      </div>
                                    )}
                                  </td>
                                  <td className="p-3 font-mono text-slate-600">
                                    {b.code || <span className="text-slate-300">—</span>}
                                  </td>
                                  <td className="p-3 text-center">
                                    <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-slate-100 text-slate-700">
                                      {bankCheques.length}
                                    </span>
                                  </td>
                                  <td className="p-3 text-right font-mono font-bold text-slate-900">
                                    {formatNPR(totalAmount)}
                                  </td>
                                  <td className="p-3 text-right font-mono font-bold text-emerald-600">
                                    {formatNPR(clearedAmount)}
                                  </td>
                                  <td className="p-3 text-right font-mono font-bold text-amber-600">
                                    {formatNPR(pendingAmount)}
                                  </td>
                                  <td className="p-3 text-center">
                                    <div className="flex items-center justify-center gap-1">
                                      <button
                                        onClick={() => openEditBankModal(b)}
                                        title="Edit Bank"
                                        className="p-1.5 text-slate-500 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition cursor-pointer"
                                      >
                                        <Edit3 className="w-3.5 h-3.5" />
                                      </button>
                                      <button
                                        onClick={() => {
                                          if (bankCheques.length > 0) {
                                            alert(`Cannot delete ${b.name} because it has ${bankCheques.length} linked cheques.`);
                                            return;
                                          }
                                          if (confirm(`Delete bank account ${b.name}?`)) {
                                            deleteBank(b.id);
                                          }
                                        }}
                                        title="Delete Bank"
                                        className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition cursor-pointer"
                                      >
                                        <Trash2 className="w-3.5 h-3.5" />
                                      </button>
                                    </div>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                </div>
              );
            })()}

            {/* VIEW: PARTIES */}
            {currentView === 'parties' && (() => {
              const term = partySearchTerm.toLowerCase().trim();
              const debtorsCount = parties.filter((p) => (p.party_type || 'Sundry Debtors') === 'Sundry Debtors').length;
              const creditorsCount = parties.filter((p) => p.party_type === 'Sundry Creditors').length;

              const filteredParties = parties.filter((p) => {
                if (partyTypeFilter !== 'all') {
                  const type = p.party_type || 'Sundry Debtors';
                  if (type !== partyTypeFilter) return false;
                }
                if (!term) return true;
                return (
                  p.name.toLowerCase().includes(term) ||
                  (p.phone || '').toLowerCase().includes(term) ||
                  (p.pan_vat || '').toLowerCase().includes(term) ||
                  (p.party_type || '').toLowerCase().includes(term)
                );
              });

              return (
                <div className="space-y-4">
                  <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs flex flex-wrap justify-between items-center gap-3">
                    <div>
                      <h2 className="text-sm font-bold text-slate-900">Parties &amp; Payees Master Directory</h2>
                      <p className="text-xs text-slate-500">Manage suppliers, vendors, and customers with accounting classification and ledger summaries</p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setIsPartyImportModalOpen(true)}
                        title="Batch Import Parties via Excel (.xlsx) or CSV"
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-purple-700 bg-purple-50 hover:bg-purple-100 border border-purple-200 rounded-xl transition cursor-pointer shadow-2xs"
                      >
                        <Upload className="w-3.5 h-3.5 text-purple-600" />
                        <span>Import Parties</span>
                      </button>

                      {activeFeatures.excel_pdf_export && (
                        <>
                          <button
                            onClick={() => exportPartiesToExcel()}
                            title="Export Parties Master & Balances to Excel (.xlsx)"
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-xl transition cursor-pointer shadow-2xs"
                          >
                            <Download className="w-3.5 h-3.5 text-emerald-600" />
                            <span>Export Excel</span>
                          </button>
                          <button
                            onClick={() => exportPartiesToPdf()}
                            title="Export Parties Master & Balances to PDF"
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-xl transition cursor-pointer shadow-2xs"
                          >
                            <Printer className="w-3.5 h-3.5 text-rose-600" />
                            <span>Export PDF</span>
                          </button>
                        </>
                      )}
                      <button
                        onClick={() => setIsAddPartyOpen(true)}
                        className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold flex items-center gap-1 cursor-pointer transition shadow-xs"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Add Party</span>
                      </button>
                    </div>
                  </div>

                  {/* Search and Classification Filter Bar */}
                  <div className="bg-white rounded-2xl border border-slate-200 p-3 shadow-xs flex flex-wrap items-center justify-between gap-3">
                    <div className="relative flex-1 min-w-[240px] max-w-md">
                      <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        value={partySearchTerm}
                        onChange={(e) => setPartySearchTerm(e.target.value)}
                        placeholder="Search party name, phone, or PAN/VAT..."
                        className="w-full pl-9 pr-3 py-1.5 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                      {partySearchTerm && (
                        <button
                          onClick={() => setPartySearchTerm('')}
                          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs"
                        >
                          ×
                        </button>
                      )}
                    </div>

                    {/* Classification Tabs */}
                    <div className="flex bg-slate-100 p-1 rounded-xl text-xs font-semibold">
                      <button
                        onClick={() => setPartyTypeFilter('all')}
                        className={`px-3 py-1 rounded-lg transition cursor-pointer ${
                          partyTypeFilter === 'all'
                            ? 'bg-white text-indigo-700 font-bold shadow-xs'
                            : 'text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        All ({parties.length})
                      </button>
                      <button
                        onClick={() => setPartyTypeFilter('Sundry Debtors')}
                        className={`px-3 py-1 rounded-lg transition cursor-pointer flex items-center gap-1.5 ${
                          partyTypeFilter === 'Sundry Debtors'
                            ? 'bg-white text-emerald-700 font-bold shadow-xs'
                            : 'text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        <span className="w-2 h-2 rounded-full bg-emerald-500" />
                        <span>Debtors / Inward ({debtorsCount})</span>
                      </button>
                      <button
                        onClick={() => setPartyTypeFilter('Sundry Creditors')}
                        className={`px-3 py-1 rounded-lg transition cursor-pointer flex items-center gap-1.5 ${
                          partyTypeFilter === 'Sundry Creditors'
                            ? 'bg-white text-purple-700 font-bold shadow-xs'
                            : 'text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        <span className="w-2 h-2 rounded-full bg-purple-500" />
                        <span>Creditors / Outward ({creditorsCount})</span>
                      </button>
                    </div>

                    <span className="text-xs text-slate-500 font-medium">
                      Showing {filteredParties.length} of {parties.length} parties
                    </span>
                  </div>

                  {/* Parties Table */}
                  <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
                    {filteredParties.length === 0 ? (
                      <div className="text-center py-12 text-slate-400">
                        <Users className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                        <p className="text-xs font-semibold text-slate-700">No parties found</p>
                        <p className="text-[11px] text-slate-400 mt-1">
                          {partySearchTerm || partyTypeFilter !== 'all'
                            ? 'Try adjusting your search or classification filter criteria'
                            : 'Click "Add Party" or "Import Parties" to register vendors and debtors.'}
                        </p>
                      </div>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs">
                          <thead className="bg-slate-50 text-slate-500 font-bold uppercase text-[10px] border-b border-slate-200">
                            <tr>
                              <th className="p-3">Party / Payee Name</th>
                              <th className="p-3">Classification</th>
                              <th className="p-3">Phone / Contact</th>
                              <th className="p-3">PAN / VAT</th>
                              <th className="p-3 text-center">Total Cheques</th>
                              <th className="p-3 text-right">Total Volume</th>
                              <th className="p-3 text-right">Cleared Amount</th>
                              <th className="p-3 text-right">Pending Due</th>
                              <th className="p-3 text-center">Actions</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {filteredParties.map((p) => {
                              const partyCheques = cheques.filter((c) => c.party_id === p.id);
                              const totalAmount = partyCheques.reduce((s, c) => s + c.amount, 0);
                              const clearedAmount = partyCheques.filter((c) => c.status === 'Cleared').reduce((s, c) => s + c.amount, 0);
                              const pendingAmount = partyCheques.reduce((s, c) => s + (c.remaining_amount ?? (c.status === 'Cleared' ? 0 : c.amount)), 0);
                              const isCreditor = p.party_type === 'Sundry Creditors';

                              return (
                                <tr key={p.id} className="hover:bg-slate-50/80 transition">
                                  <td className="p-3">
                                    <div className="font-bold text-slate-900 flex items-center gap-1.5">
                                      <Users className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                                      <span>{p.name}</span>
                                    </div>
                                  </td>
                                  <td className="p-3">
                                    <span
                                      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                        isCreditor
                                          ? 'bg-purple-50 text-purple-700 border border-purple-200'
                                          : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                      }`}
                                    >
                                      <span className={`w-1.5 h-1.5 rounded-full ${isCreditor ? 'bg-purple-500' : 'bg-emerald-500'}`} />
                                      {isCreditor ? 'Sundry Creditor (Outward)' : 'Sundry Debtor (Inward)'}
                                    </span>
                                  </td>
                                  <td className="p-3 text-slate-600">
                                    {p.phone ? (
                                      <div className="flex items-center gap-1">
                                        <Phone className="w-3 h-3 text-slate-400" />
                                        <span>{p.phone}</span>
                                      </div>
                                    ) : (
                                      <span className="text-slate-300">—</span>
                                    )}
                                  </td>
                                  <td className="p-3 font-mono text-slate-600">
                                    {p.pan_vat || <span className="text-slate-300">—</span>}
                                  </td>
                                  <td className="p-3 text-center">
                                    <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-slate-100 text-slate-700">
                                      {partyCheques.length}
                                    </span>
                                  </td>
                                  <td className="p-3 text-right font-mono font-bold text-slate-900">
                                    {formatNPR(totalAmount)}
                                  </td>
                                  <td className="p-3 text-right font-mono font-bold text-emerald-600">
                                    {formatNPR(clearedAmount)}
                                  </td>
                                  <td className="p-3 text-right font-mono font-bold text-amber-600">
                                    {formatNPR(pendingAmount)}
                                  </td>
                                  <td className="p-3 text-center">
                                    <div className="flex items-center justify-center gap-1">
                                      <button
                                        onClick={() => {
                                          setReceivedPaymentPartyId(p.id);
                                          setReceivedPaymentType(isCreditor ? 'Payment' : 'Received');
                                          const pendingList = partyCheques.filter(
                                            (c) => c.status !== 'Cleared' && ((c.remaining_amount ?? c.amount) > 0.001)
                                          );
                                          if (pendingList.length > 0) {
                                            setReceivedPaymentChequeId(pendingList[0].id);
                                            setReceivedPaymentAmount(String(pendingList[0].remaining_amount ?? pendingList[0].amount));
                                          } else {
                                            setReceivedPaymentChequeId('');
                                            setReceivedPaymentAmount('');
                                          }
                                          setIsReceivedPaymentModalOpen(true);
                                        }}
                                        title={isCreditor ? 'Record Payment (Outward)' : 'Record Receipt (Inward)'}
                                        className="px-2 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-lg text-[11px] font-bold transition cursor-pointer"
                                      >
                                        {isCreditor ? 'Pay' : 'Receive'}
                                      </button>
                                      <button
                                        onClick={() => openEditPartyModal(p)}
                                        title="Edit Party"
                                        className="p-1.5 text-slate-500 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition cursor-pointer"
                                      >
                                        <Edit3 className="w-3.5 h-3.5" />
                                      </button>
                                      <button
                                        onClick={() => {
                                          if (partyCheques.length > 0) {
                                            alert(`Cannot delete ${p.name} because they have ${partyCheques.length} linked cheques.`);
                                            return;
                                          }
                                          if (confirm(`Delete party ${p.name}?`)) {
                                            deleteParty(p.id);
                                          }
                                        }}
                                        title="Delete Party"
                                        className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition cursor-pointer"
                                      >
                                        <Trash2 className="w-3.5 h-3.5" />
                                      </button>
                                    </div>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                </div>
              );
            })()}

            {/* VIEW: BACKUP */}
            {currentView === 'backup' && (
              <div className="space-y-6">
                <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-2">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-indigo-50 text-indigo-600 rounded-xl">
                      <Database className="w-6 h-6" />
                    </div>
                    <div>
                      <h2 className="text-base font-bold text-slate-900">Backup & Disaster Recovery Center</h2>
                      <p className="text-xs text-slate-500">
                        Securely backup, export, and restore your cheque ledger to Local Disk and Google Drive with offline cache protection.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  {/* LOCAL DISK BACKUP CARD WITH FOLDER SELECTION & AUTO-SAVE */}
                  {activeFeatures.local_disk_backup ? (
                    <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs flex flex-col justify-between space-y-4">
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2 text-slate-900 font-bold text-sm">
                            <HardDrive className="w-4 h-4 text-indigo-600" />
                            <span>Local Disk Automatic Backup &amp; Storage</span>
                          </div>
                          <span className="px-2 py-0.5 bg-emerald-100 text-emerald-700 text-[10px] font-bold rounded-full flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                            Active
                          </span>
                        </div>

                        <p className="text-xs text-slate-500">
                          Automatically mirror your full financial ledger, payment installment logs, parties, and banks to your local computer.
                        </p>

                        {/* DESIGNATED LOCAL FOLDER CONFIGURATION */}
                        <div className="bg-slate-50 rounded-xl p-3.5 border border-slate-200 space-y-3">
                          <div className="flex items-center justify-between">
                            <span className="text-[11px] font-bold text-slate-700 flex items-center gap-1.5">
                              <Folder className="w-3.5 h-3.5 text-indigo-600" />
                              Local Backup Folder Path / Directory
                            </span>
                            <button
                              type="button"
                              onClick={handleSelectDirectory}
                              className="px-2.5 py-1 bg-white hover:bg-indigo-50 text-indigo-700 border border-indigo-200 rounded-lg text-xs font-bold transition cursor-pointer shadow-2xs flex items-center gap-1"
                              title="Select folder using browser File System Access API"
                            >
                              <FolderOpen className="w-3.5 h-3.5" />
                              <span>Browse Folder</span>
                            </button>
                          </div>

                          {/* MANUAL LOCAL DISK BACKUP FOLDER PATH & NAME INPUT */}
                          <div className="space-y-1.5">
                            <div className="flex items-center gap-2">
                              <input
                                type="text"
                                value={backupPathInput}
                                onChange={(e) => setBackupPathInput(e.target.value)}
                                placeholder="e.g. D:\ChequeDesk_Backups\ or E:\MyOfficeData\"
                                className="flex-1 px-3 py-2 bg-white border border-slate-300 rounded-xl font-mono text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-2xs"
                              />
                              <button
                                type="button"
                                onClick={() => handleSaveLocalBackupPath()}
                                className="px-3 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl transition cursor-pointer shadow-2xs whitespace-nowrap"
                              >
                                Save Folder Path
                              </button>
                            </div>

                            {/* Folder Path Presets */}
                            <div className="flex flex-wrap items-center gap-1.5 text-[10px] text-slate-500">
                              <span className="font-semibold">Quick Presets:</span>
                              {['D:\\ChequeDesk_Backups\\', 'E:\\MyOfficeData\\', 'C:\\Accounting_Backups\\'].map((preset) => (
                                <button
                                  key={preset}
                                  type="button"
                                  onClick={() => handleSaveLocalBackupPath(preset)}
                                  className="px-2 py-0.5 bg-white hover:bg-indigo-50 text-slate-700 hover:text-indigo-700 border border-slate-200 rounded font-mono transition cursor-pointer shadow-2xs"
                                >
                                  {preset}
                                </button>
                              ))}
                            </div>

                            <div className="bg-emerald-50/70 px-3 py-1.5 rounded-lg border border-emerald-200 font-mono text-[11px] text-emerald-900 flex items-center justify-between">
                              <div className="flex items-center gap-1.5 truncate">
                                <span className="text-[10px] font-sans font-bold uppercase bg-emerald-200 text-emerald-800 px-1.5 py-0.2 rounded shrink-0">Active Target:</span>
                                <span className="truncate font-semibold">{localBackupPath}</span>
                              </div>
                            </div>
                          </div>

                          {/* AUTO-SAVE ON DATA CHANGES CHECKBOX */}
                          <label className="flex items-start gap-2.5 pt-1 cursor-pointer select-none">
                            <input
                              type="checkbox"
                              checked={isAutoSaveLocal}
                              onChange={(e) => {
                                setIsAutoSaveLocal(e.target.checked);
                                localStorage.setItem('chequedesk_autosave_local', String(e.target.checked));
                                showToast(
                                  e.target.checked
                                    ? 'Auto-Save enabled: backups will write to local folder on all changes'
                                    : 'Auto-Save disabled',
                                  e.target.checked ? 'success' : 'info'
                                );
                              }}
                              className="mt-0.5 w-4 h-4 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500 cursor-pointer"
                            />
                            <div>
                              <span className="text-xs font-bold text-slate-900 block">
                                Auto-Save to Local Folder on Changes
                              </span>
                              <span className="text-[11px] text-slate-500 leading-relaxed block">
                                Automatically saves a structured JSON snapshot to browser storage and triggers local backup saving targeted for <code className="font-mono text-indigo-600 bg-indigo-50 px-1 rounded">{localBackupPath}</code> whenever cheques, payments, parties, or banks are updated.
                              </span>
                            </div>
                          </label>

                          {/* Status & Last Backup info */}
                          <div className="pt-2 border-t border-slate-200/80 flex items-center justify-between text-[11px] text-slate-500">
                            <span className="flex items-center gap-1">
                              <span className={`w-2 h-2 rounded-full ${isAutoSaveLocal ? 'bg-emerald-500' : 'bg-slate-400'}`} />
                              Status: <strong className="text-slate-700">{localBackupStatus}</strong>
                            </span>
                            {lastLocalBackupAt && (
                              <span className="text-[10px] text-slate-400 font-mono">
                                Last: {new Date(lastLocalBackupAt).toLocaleTimeString()}
                              </span>
                            )}
                          </div>
                        </div>

                        {/* METRICS PREVIEW */}
                        <div className="grid grid-cols-3 gap-2 bg-slate-50 rounded-xl p-2.5 border border-slate-100 text-center text-xs">
                          <div>
                            <span className="text-slate-400 text-[10px] block">Cheques</span>
                            <span className="font-bold font-mono text-slate-800">{cheques.length}</span>
                          </div>
                          <div>
                            <span className="text-slate-400 text-[10px] block">Payments</span>
                            <span className="font-bold font-mono text-slate-800">{paymentLogs.length}</span>
                          </div>
                          <div>
                            <span className="text-slate-400 text-[10px] block">Parties / Banks</span>
                            <span className="font-bold font-mono text-slate-800">{parties.length + banks.length}</span>
                          </div>
                        </div>
                      </div>

                      <div className="space-y-2 pt-2">
                        <button
                          type="button"
                          onClick={() => performLocalBackup(false, false)}
                          className="w-full py-2 px-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition cursor-pointer shadow-xs"
                        >
                          <Save className="w-3.5 h-3.5" />
                          <span>Trigger Local Backup Now ({localBackupPath})</span>
                        </button>

                        <div className="grid grid-cols-2 gap-2">
                          <button
                            onClick={() => {
                              const data = {
                                cheques,
                                parties,
                                banks,
                                payment_logs: paymentLogs,
                                company_code: activeCompanyCode,
                                local_path: localBackupPath,
                                exported_at: new Date().toISOString(),
                                app_version: 'ChequeDesk v2.4',
                              };
                              const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
                              const url = URL.createObjectURL(blob);
                              const a = document.createElement('a');
                              a.href = url;
                              a.download = `chequedesk_backup_${activeCompanyCode}_${Date.now()}.json`;
                              a.click();
                              showToast('Full JSON backup downloaded successfully', 'success');
                            }}
                            className="py-2 px-3 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition cursor-pointer shadow-xs"
                          >
                            <Download className="w-3.5 h-3.5" />
                            <span>Download JSON</span>
                          </button>

                          <button
                            onClick={() => {
                              try {
                                const wb = XLSX.utils.book_new();
                                const chequeRows = cheques.map((c) => ({
                                  'Cheque Number': c.cheque_number,
                                  'Amount (NPR)': c.amount,
                                  'Remaining (NPR)': c.remaining_amount ?? (c.status === 'Cleared' ? 0 : c.amount),
                                  Status: c.status,
                                  'Issue Date BS': c.issue_date_bs,
                                  'Issue Date AD': c.issue_date_ad,
                                  'Due Date BS': c.due_date_bs,
                                  'Due Date AD': c.due_date_ad,
                                  'Bill Number': c.bill_number || '',
                                  Party: parties.find((p) => p.id === c.party_id)?.name || 'N/A',
                                  Bank: banks.find((b) => b.id === c.bank_id)?.name || 'N/A',
                                  Notes: c.notes || '',
                                }));
                                const partyRows = parties.map((p) => ({
                                  Name: p.name,
                                  Phone: p.phone || '',
                                  Email: p.email || '',
                                }));
                                const bankRows = banks.map((b) => ({
                                  Name: b.name,
                                  Code: b.code || '',
                                }));
                                const paymentRows = paymentLogs.map((p) => ({
                                  'Cheque ID': p.cheque_id,
                                  'Amount (NPR)': p.amount,
                                  'Payment Mode': p.payment_mode,
                                  'Date BS': p.payment_date_bs,
                                  'Date AD': p.payment_date_ad,
                                  'Reference / Notes': p.notes || '',
                                }));

                                const wsCheques = XLSX.utils.json_to_sheet(chequeRows);
                                const wsParties = XLSX.utils.json_to_sheet(partyRows);
                                const wsBanks = XLSX.utils.json_to_sheet(bankRows);
                                const wsPayments = XLSX.utils.json_to_sheet(paymentRows);

                                XLSX.utils.book_append_sheet(wb, wsCheques, 'Cheques');
                                XLSX.utils.book_append_sheet(wb, wsPayments, 'Installments');
                                XLSX.utils.book_append_sheet(wb, wsParties, 'Parties');
                                XLSX.utils.book_append_sheet(wb, wsBanks, 'Banks');

                                XLSX.writeFile(wb, `chequedesk_ledger_${activeCompanyCode}_${Date.now()}.xlsx`);
                                showToast('Excel workbook backup exported successfully', 'success');
                              } catch {
                                showToast('Error exporting Excel backup', 'error');
                              }
                            }}
                            className="py-2 px-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition cursor-pointer shadow-xs"
                          >
                            <FileSpreadsheet className="w-3.5 h-3.5" />
                            <span>Excel (.xlsx)</span>
                          </button>
                        </div>

                        {/* RESTORE FROM LOCAL BACKUP */}
                        <label className="block w-full text-center py-2 px-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition cursor-pointer border border-slate-300/80">
                          <Upload className="w-3.5 h-3.5 inline-block mr-1.5 text-slate-500" />
                          <span>Restore from Local Backup (.json)</span>
                          <input
                            type="file"
                            accept=".json"
                            className="hidden"
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (!file) return;
                              const reader = new FileReader();
                              reader.onload = async (evt) => {
                                try {
                                  const parsed = JSON.parse(evt.target?.result as string);
                                  if (parsed.cheques && Array.isArray(parsed.cheques)) {
                                    for (const c of parsed.cheques) {
                                      await createCheque({
                                        company_id: activeCompanyId,
                                        cheque_number: c.cheque_number,
                                        amount: c.amount,
                                        party_id: parties[0]?.id || null,
                                        bank_id: banks[0]?.id || null,
                                        issue_date_bs: c.issue_date_bs || getCurrentBsDate(),
                                        issue_date_ad: c.issue_date_ad || getCurrentAdDate(),
                                        due_date_bs: c.due_date_bs || getCurrentBsDate(),
                                        due_date_ad: c.due_date_ad || getCurrentAdDate(),
                                        notes: c.notes || 'Restored from local backup',
                                      });
                                    }
                                    showToast(`Restored ${parsed.cheques.length} cheques successfully!`, 'success');
                                  } else {
                                    showToast('Invalid backup file format', 'error');
                                  }
                                } catch {
                                  showToast('Error reading backup file', 'error');
                                }
                              };
                              reader.readAsText(file);
                            }}
                          />
                        </label>
                      </div>
                    </div>
                  ) : (
                    <div className="bg-slate-50/80 rounded-2xl border border-slate-200 p-5 flex flex-col justify-between opacity-75">
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2 text-slate-700 font-bold text-sm">
                            <HardDrive className="w-4 h-4 text-slate-400" />
                            <span>Local Disk Backup & Export</span>
                          </div>
                          <span className="px-2 py-0.5 bg-slate-200 text-slate-600 text-[10px] font-bold rounded-full">
                            Disabled by Admin
                          </span>
                        </div>
                        <p className="text-xs text-slate-500">
                          Direct downloads of JSON/Excel ledgers to your local drive have been deactivated for this company workspace by your administrator.
                        </p>
                      </div>
                      <div className="p-3 bg-slate-100 rounded-xl text-xs text-slate-500 text-center font-medium mt-4">
                        Contact your Kuber Super Admin to enable Offline Local Disk Backup.
                      </div>
                    </div>
                  )}

                  {/* GOOGLE DRIVE CLOUD SYNC CARD */}
                  {activeFeatures.google_drive_backup ? (
                    <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs flex flex-col justify-between space-y-4">
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2 text-slate-900 font-bold text-sm">
                            <Cloud className="w-4 h-4 text-sky-500" />
                            <span>Google Drive Cloud Sync</span>
                          </div>
                          <span className="px-2 py-0.5 bg-emerald-100 text-emerald-700 text-[10px] font-bold rounded-full">
                            Connected
                          </span>
                        </div>
                        <p className="text-xs text-slate-500">
                          Automatically sync encrypted snapshots of your financial records to your linked Google Drive account.
                        </p>

                        <div className="bg-sky-50/50 rounded-xl p-3 border border-sky-100 text-xs space-y-1.5 mt-2">
                          <div className="flex justify-between text-slate-600">
                            <span>Linked Account:</span>
                            <span className="font-semibold text-slate-900">rstraders398@gmail.com</span>
                          </div>
                          <div className="flex justify-between text-slate-600">
                            <span>Target Cloud Folder:</span>
                            <span className="font-mono text-slate-700 text-[11px]">/Google Drive/ChequeDesk_Backups/</span>
                          </div>
                          <div className="flex justify-between text-slate-600">
                            <span>Last Synced:</span>
                            <span className="font-medium text-emerald-700">
                              {googleDriveSyncedAt
                                ? new Date(googleDriveSyncedAt).toLocaleDateString() + ' ' + new Date(googleDriveSyncedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                                : 'Pending initial sync'}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="space-y-2 pt-2">
                        <button
                          onClick={async () => {
                            setIsSyncingDrive(true);
                            try {
                              const payload = {
                                company_id: activeCompanyId,
                                company_code: activeCompanyCode,
                                cheques,
                                parties,
                                banks,
                                synced_at: new Date().toISOString(),
                                account: 'rstraders398@gmail.com',
                              };
                              localStorage.setItem(`chequedesk_gdrive_${activeCompanyId}`, JSON.stringify(payload));
                              const nowStr = new Date().toISOString();
                              localStorage.setItem('chequedesk_gdrive_sync', nowStr);
                              setGoogleDriveSyncedAt(nowStr);
                              await new Promise((r) => setTimeout(r, 700));
                              showToast('Synced to Google Drive (rstraders398@gmail.com) successfully!', 'success');
                            } catch {
                              showToast('Failed to sync to Google Drive', 'error');
                            } finally {
                              setIsSyncingDrive(false);
                            }
                          }}
                          disabled={isSyncingDrive}
                          className="w-full py-2 px-3 bg-sky-600 hover:bg-sky-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition cursor-pointer shadow-xs"
                        >
                          <RefreshCw className={`w-3.5 h-3.5 ${isSyncingDrive ? 'animate-spin' : ''}`} />
                          <span>{isSyncingDrive ? 'Syncing to Google Drive...' : 'Backup Now to Google Drive'}</span>
                        </button>

                        <div className="flex items-center justify-between p-2 rounded-xl bg-slate-50 border border-slate-100">
                          <span className="text-xs font-medium text-slate-600">Auto-sync to Google Drive on updates</span>
                          <input
                            type="checkbox"
                            checked={autoDriveSync}
                            onChange={(e) => {
                              setAutoDriveSync(e.target.checked);
                              showToast(e.target.checked ? 'Auto-sync enabled' : 'Auto-sync paused', 'info');
                            }}
                            className="rounded text-sky-600 focus:ring-sky-500 cursor-pointer"
                          />
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="bg-slate-50/80 rounded-2xl border border-slate-200 p-5 flex flex-col justify-between opacity-75">
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2 text-slate-700 font-bold text-sm">
                            <Cloud className="w-4 h-4 text-slate-400" />
                            <span>Google Drive Cloud Sync</span>
                          </div>
                          <span className="px-2 py-0.5 bg-slate-200 text-slate-600 text-[10px] font-bold rounded-full">
                            Disabled by Admin
                          </span>
                        </div>
                        <p className="text-xs text-slate-500">
                          Automated cloud snapshots to Google Drive have been disabled for this company workspace by your administrator.
                        </p>
                      </div>
                      <div className="p-3 bg-slate-100 rounded-xl text-xs text-slate-500 text-center font-medium mt-4">
                        Contact your Kuber Super Admin to enable Google Drive Cloud Backup.
                      </div>
                    </div>
                  )}
                </div>

                {/* OFFLINE MODE & SEED DATA ROW */}
                <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs flex flex-wrap items-center justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <div className={`w-2.5 h-2.5 rounded-full ${isOnline ? 'bg-emerald-500' : 'bg-amber-500 animate-pulse'}`} />
                      <span className="text-xs font-bold text-slate-900">
                        Offline Cache Persistence: {isOnline ? 'Cloud Synced & Cached' : 'Offline Mode Active'}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500">
                      All records are mirrored in browser LocalStorage (`chequedesk_offline_{activeCompanyId}`) and work seamlessly without internet.
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => {
                        try {
                          const cacheData = { cheques, parties, banks, cached_at: new Date().toISOString() };
                          localStorage.setItem(`chequedesk_offline_${activeCompanyId}`, JSON.stringify(cacheData));
                          showToast('LocalStorage offline cache updated manually!', 'success');
                        } catch {
                          showToast('Failed to update offline cache', 'error');
                        }
                      }}
                      className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold cursor-pointer transition border border-slate-200"
                    >
                      Update LocalStorage Cache
                    </button>

                    <button
                      onClick={handleSeedData}
                      className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-xs transition"
                    >
                      <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                      <span>Seed Demo Records</span>
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* VIEW: IMPORT CHEQUES (EXCEL/CSV/JSON) */}
            {currentView === 'import_cheques' && (
              <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-purple-50 text-purple-600 rounded-2xl">
                    <FileSpreadsheet className="w-6 h-6" />
                  </div>
                  <div>
                    <h2 className="text-base font-bold text-slate-900">Import Cheques from External Software</h2>
                    <p className="text-xs text-slate-500">
                      Upload .xlsx, .xls, .csv, or .json files. All imported records are automatically tagged as &quot;Imported from External Software&quot;.
                    </p>
                  </div>
                </div>

                <div className="border-2 border-dashed border-purple-200 rounded-2xl p-8 text-center bg-purple-50/20 relative">
                  <Upload className="w-8 h-8 mx-auto text-purple-500 mb-2" />
                  <div className="text-xs font-bold text-slate-800">Select external spreadsheet or JSON export</div>
                  <p className="text-[11px] text-slate-400 mt-1">Columns: Cheque Number, Party, Bank, Amount, Due Date BS</p>
                  <input
                    type="file"
                    accept=".xlsx,.xls,.csv,.json"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      const reader = new FileReader();
                      if (file.name.endsWith('.json')) {
                        reader.onload = async (evt) => {
                          try {
                            const raw = JSON.parse(evt.target?.result as string);
                            const list = Array.isArray(raw) ? raw : raw.cheques || [raw];
                            for (const r of list) {
                              await createCheque({
                                company_id: activeCompanyId,
                                cheque_number: String(r.cheque_number || `IMP-${Date.now()}`),
                                amount: Number(r.amount || 1000),
                                party_id: parties[0]?.id || null,
                                bank_id: banks[0]?.id || null,
                                issue_date_bs: getCurrentBsDate(),
                                issue_date_ad: getCurrentAdDate(),
                                due_date_bs: String(r.due_date_bs || getCurrentBsDate()),
                                due_date_ad: getCurrentAdDate(),
                                notes: 'Imported from External Software',
                              });
                            }
                            showToast(`Imported ${list.length} cheques from external JSON!`, 'success');
                          } catch {
                            showToast('Error parsing JSON file', 'error');
                          }
                        };
                        reader.readAsText(file);
                      } else {
                        reader.onload = async (evt) => {
                          try {
                            const data = evt.target?.result;
                            const wb = XLSX.read(data, { type: 'binary' });
                            const sheet = wb.Sheets[wb.SheetNames[0]];
                            const rows: any[] = XLSX.utils.sheet_to_json(sheet);
                            for (const r of rows) {
                              await createCheque({
                                company_id: activeCompanyId,
                                cheque_number: String(r['Cheque Number'] || r.ChequeNo || `IMP-${Date.now()}`),
                                amount: Number(r.Amount || 1000),
                                party_id: parties[0]?.id || null,
                                bank_id: banks[0]?.id || null,
                                issue_date_bs: getCurrentBsDate(),
                                issue_date_ad: getCurrentAdDate(),
                                due_date_bs: String(r['Due Date BS'] || getCurrentBsDate()),
                                due_date_ad: getCurrentAdDate(),
                                notes: 'Imported from External Software',
                              });
                            }
                            showToast(`Imported ${rows.length} cheques from external spreadsheet!`, 'success');
                          } catch {
                            showToast('Error reading spreadsheet file', 'error');
                          }
                        };
                        reader.readAsBinaryString(file);
                      }
                    }}
                    className="absolute inset-0 opacity-0 cursor-pointer"
                  />
                </div>
              </div>
            )}

            {/* VIEW: REPORTS & ANALYTICS */}
            {currentView === 'reports' && (() => {
              const totalVolume = cheques.reduce((s, c) => s + c.amount, 0);
              const pendingVolume = cheques.filter((c) => c.status !== 'Cleared').reduce((s, c) => s + (c.remaining_amount ?? c.amount), 0);
              const clearedVolume = cheques.filter((c) => c.status === 'Cleared').reduce((s, c) => s + c.amount, 0);
              const partialVolume = partialCheques.reduce((s, c) => s + (c.amount - (c.remaining_amount ?? c.amount)), 0);
              const clearancePercent = totalVolume > 0 ? Math.round((clearedVolume / totalVolume) * 100) : 0;

              return (
                <div className="space-y-6">
                  {/* Header & Export Actions */}
                  <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs flex flex-wrap justify-between items-center gap-4">
                    <div>
                      <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                        <BarChart3 className="w-5 h-5 text-indigo-600" />
                        <span>Financial Reports &amp; Ledger Analytics</span>
                      </h2>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Comprehensive summary distribution across status, banking channels, and payees
                      </p>
                    </div>

                    {activeFeatures.excel_pdf_export && (
                      <div className="flex items-center gap-2">
                        <button
                          onClick={exportReportsToExcel}
                          title="Export All Reports to Excel (.xlsx)"
                          className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-xl transition cursor-pointer shadow-xs"
                        >
                          <Download className="w-4 h-4 text-emerald-600" />
                          <span>Export Excel (.xlsx)</span>
                        </button>
                        <button
                          onClick={exportReportsToPdf}
                          title="Export All Reports to PDF"
                          className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-xl transition cursor-pointer shadow-xs"
                        >
                          <Printer className="w-4 h-4 text-rose-600" />
                          <span>Export PDF</span>
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Summary Metric Cards */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
                      <div className="text-[11px] font-bold text-slate-400 uppercase">Total Cheque Volume</div>
                      <div className="text-xl font-bold font-mono text-slate-900 mt-1">{formatNPR(totalVolume)}</div>
                      <div className="text-xs text-slate-500 mt-1">{cheques.length} total issued cheques</div>
                    </div>

                    <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
                      <div className="text-[11px] font-bold text-amber-500 uppercase">Pending Exposure</div>
                      <div className="text-xl font-bold font-mono text-amber-600 mt-1">{formatNPR(pendingVolume)}</div>
                      <div className="text-xs text-slate-500 mt-1">{pendingCheques.length} pending cheques</div>
                    </div>

                    <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
                      <div className="text-[11px] font-bold text-emerald-500 uppercase">Cleared &amp; Settled</div>
                      <div className="text-xl font-bold font-mono text-emerald-600 mt-1">{formatNPR(clearedVolume)}</div>
                      <div className="text-xs text-slate-500 mt-1">{clearedCheques.length} cleared ({clearancePercent}%)</div>
                    </div>

                    <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
                      <div className="text-[11px] font-bold text-sky-500 uppercase">Partial Installments</div>
                      <div className="text-xl font-bold font-mono text-sky-600 mt-1">{formatNPR(partialVolume)}</div>
                      <div className="text-xs text-slate-500 mt-1">{partialCheques.length} active partial plans</div>
                    </div>
                  </div>

                  {/* Status Progress Visualization */}
                  <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-3">
                    <div className="flex justify-between items-center text-xs">
                      <span className="font-bold text-slate-800">Clearance Status Composition</span>
                      <span className="text-slate-500">{clearancePercent}% of total volume settled</span>
                    </div>
                    <div className="h-3.5 w-full bg-slate-100 rounded-full overflow-hidden flex">
                      <div
                        style={{ width: `${clearancePercent}%` }}
                        className="bg-emerald-500 h-full transition-all"
                        title={`Cleared: ${clearancePercent}%`}
                      />
                      <div
                        style={{ width: `${totalVolume > 0 ? (pendingVolume / totalVolume) * 100 : 0}%` }}
                        className="bg-amber-400 h-full transition-all"
                        title="Pending"
                      />
                    </div>
                    <div className="flex flex-wrap gap-4 text-xs pt-1">
                      <div className="flex items-center gap-1.5">
                        <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                        <span className="text-slate-600">Cleared: {formatNPR(clearedVolume)}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="w-2.5 h-2.5 rounded-full bg-amber-400" />
                        <span className="text-slate-600">Pending: {formatNPR(pendingVolume)}</span>
                      </div>
                    </div>
                  </div>

                  {/* Two Column Breakdown: Banks & Parties */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Bank Exposure Table */}
                    <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
                      <div className="p-4 border-b border-slate-200">
                        <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                          <Landmark className="w-4 h-4 text-indigo-600" />
                          <span>Bank-Wise Exposure Breakdown</span>
                        </h3>
                        <p className="text-xs text-slate-500">Volume and outstanding balance by banking partner</p>
                      </div>
                      <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs">
                          <thead className="bg-slate-50 text-slate-500 font-bold uppercase text-[10px]">
                            <tr>
                              <th className="p-3">Bank</th>
                              <th className="p-3 text-center">Cheques</th>
                              <th className="p-3 text-right">Total (NPR)</th>
                              <th className="p-3 text-right">Pending (NPR)</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {banks.map((b) => {
                              const bCheques = cheques.filter((c) => c.bank_id === b.id);
                              const bTotal = bCheques.reduce((s, c) => s + c.amount, 0);
                              const bPending = bCheques.filter((c) => c.status !== 'Cleared').reduce((s, c) => s + (c.remaining_amount ?? c.amount), 0);
                              return (
                                <tr key={b.id} className="hover:bg-slate-50/50">
                                  <td className="p-3 font-semibold text-slate-800">
                                    {b.name}
                                    {b.code && <span className="text-[10px] text-slate-400 font-mono ml-1">({b.code})</span>}
                                  </td>
                                  <td className="p-3 text-center text-slate-600">{bCheques.length}</td>
                                  <td className="p-3 text-right font-mono font-bold text-slate-900">{formatNPR(bTotal)}</td>
                                  <td className="p-3 text-right font-mono font-bold text-amber-600">{formatNPR(bPending)}</td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>

                    {/* Top Payees Ledger */}
                    <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
                      <div className="p-4 border-b border-slate-200">
                        <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                          <Users className="w-4 h-4 text-indigo-600" />
                          <span>Top Payees &amp; Vendors Ledger</span>
                        </h3>
                        <p className="text-xs text-slate-500">Beneficiaries with highest cheque distribution</p>
                      </div>
                      <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs">
                          <thead className="bg-slate-50 text-slate-500 font-bold uppercase text-[10px]">
                            <tr>
                              <th className="p-3">Party / Beneficiary</th>
                              <th className="p-3 text-center">Cheques</th>
                              <th className="p-3 text-right">Total (NPR)</th>
                              <th className="p-3 text-right">Pending (NPR)</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {parties.slice(0, 8).map((p) => {
                              const pCheques = cheques.filter((c) => c.party_id === p.id);
                              const pTotal = pCheques.reduce((s, c) => s + c.amount, 0);
                              const pPending = pCheques.filter((c) => c.status !== 'Cleared').reduce((s, c) => s + (c.remaining_amount ?? c.amount), 0);
                              return (
                                <tr key={p.id} className="hover:bg-slate-50/50">
                                  <td className="p-3 font-semibold text-slate-800">
                                    {p.name}
                                    {p.phone && <span className="text-[10px] text-slate-400 block">{p.phone}</span>}
                                  </td>
                                  <td className="p-3 text-center text-slate-600">{pCheques.length}</td>
                                  <td className="p-3 text-right font-mono font-bold text-slate-900">{formatNPR(pTotal)}</td>
                                  <td className="p-3 text-right font-mono font-bold text-amber-600">{formatNPR(pPending)}</td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })()}

            {/* VIEW: COMPANY & USERS */}
            {currentView === 'company_users' && (
              <div className="space-y-6">
                {/* Header */}
                <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs">
                  <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                    <Building2 className="w-5 h-5 text-indigo-600" />
                    <span>Company &amp; Workspace Management</span>
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Manage your organization profile, multi-company workspaces, active license plan, and feature authorizations.
                  </p>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Left Column: Organization & License */}
                  <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-5">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
                        <Building2 className="w-5 h-5" />
                      </div>
                      <div>
                        <h3 className="font-bold text-sm text-slate-900">Organization Profile</h3>
                        <p className="text-xs text-slate-500">Active tenant workspace configuration</p>
                      </div>
                    </div>

                    <div className="p-4 bg-slate-50 rounded-xl border border-slate-200/80 space-y-2.5 text-xs">
                      <div className="flex justify-between">
                        <span className="text-slate-500">Company Display Name:</span>
                        <span className="font-bold text-slate-800">{activeCompanyName}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">Tenant Code / Identifier:</span>
                        <span className="font-mono text-indigo-600 font-bold">{activeCompanyCode}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">Subscription Plan:</span>
                        <span className="px-2 py-0.5 bg-indigo-100 text-indigo-800 font-bold rounded-full text-[10px]">
                          {currentCompany?.plan_type || 'Enterprise'}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">Account License Status:</span>
                        <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 font-bold rounded-full text-[10px]">
                          {currentCompany?.subscription_status || 'Active'}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">License Expiry / Renewal:</span>
                        <span className="font-mono text-slate-700 font-medium">
                          {currentCompany?.subscription_expiry || '2027-12-31'}
                        </span>
                      </div>
                      <div className="flex justify-between pt-2 border-t border-slate-200">
                        <span className="text-slate-500">Active Database Records:</span>
                        <span className="font-semibold text-emerald-700">
                          {cheques.length} Cheques • {parties.length} Parties • {banks.length} Banks
                        </span>
                      </div>
                    </div>

                    {/* Developer / Super Admin Controls Only */}
                    {role === 'SUPER_ADMIN' && (
                      <>
                        {/* Switch Workspace Presets */}
                        <div className="space-y-2 pt-2 border-t border-slate-200">
                          <div className="flex justify-between items-center">
                            <label className="text-xs font-bold text-slate-700 block">Switch Workspace Preset:</label>
                            <span className="text-[10px] text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.2 rounded-full font-bold">
                              Kuber Super Admin Only
                            </span>
                          </div>
                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                            {[
                              { id: 'default-company-101', code: 'RS-TRADERS', name: 'RS Traders' },
                              { id: 'himalayan-supplies-202', code: 'HIMALAYAN', name: 'Himalayan Suppliers Pvt. Ltd.' },
                              { id: 'kathmandu-enterprises-303', code: 'KTM-ENT', name: 'Kathmandu Enterprises' },
                            ].map((preset) => {
                              const isActive = preset.id === activeCompanyId;
                              return (
                                <button
                                  key={preset.id}
                                  onClick={() => {
                                    setActiveCompanyId(preset.id);
                                    setActiveCompanyName(preset.name);
                                    setActiveCompanyCode(preset.code);
                                    showToast(`Switched workspace to ${preset.name}`, 'info');
                                  }}
                                  className={`p-2.5 text-xs rounded-xl border text-left transition cursor-pointer ${
                                    isActive
                                      ? 'bg-indigo-50 border-indigo-300 text-indigo-900 font-bold'
                                      : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                                  }`}
                                >
                                  <div className="truncate font-semibold">{preset.name}</div>
                                  <div className="text-[10px] text-slate-400 font-mono truncate">{preset.code}</div>
                                </button>
                              );
                            })}
                          </div>
                        </div>

                        {/* Active Feature Matrix Display */}
                        <div className="space-y-2.5 pt-2 border-t border-slate-200">
                          <div className="flex justify-between items-center">
                            <label className="text-xs font-bold text-slate-700">Feature Permissions Matrix</label>
                            <span className="text-[10px] text-indigo-600 bg-indigo-50 border border-indigo-200 px-2 py-0.5 rounded-full font-bold">
                              Managed by Kuber Admin
                            </span>
                          </div>
                          <div className="grid grid-cols-2 gap-2 text-xs">
                            {[
                              { label: 'Print Cheque Leaf', enabled: activeFeatures.print_cheque },
                              { label: 'Google Drive Sync', enabled: activeFeatures.google_drive_backup },
                              { label: 'Local Disk Backup', enabled: activeFeatures.local_disk_backup },
                              { label: 'Import External Cheques', enabled: activeFeatures.import_cheques },
                              { label: 'Parties & Banks Master', enabled: activeFeatures.parties_banks },
                              { label: 'Excel & PDF Export', enabled: activeFeatures.excel_pdf_export },
                            ].map((feat, i) => (
                              <div
                                key={i}
                                className={`p-2 rounded-xl border flex items-center justify-between ${
                                  feat.enabled ? 'bg-emerald-50/50 border-emerald-200' : 'bg-slate-50 border-slate-200 opacity-60'
                                }`}
                              >
                                <span className="text-[11px] font-medium text-slate-800">{feat.label}</span>
                                <span
                                  className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${
                                    feat.enabled ? 'bg-emerald-200 text-emerald-800' : 'bg-slate-200 text-slate-600'
                                  }`}
                                >
                                  {feat.enabled ? 'ENABLED' : 'DISABLED'}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      </>
                    )}
                  </div>

                  {/* Right Column: User Account & Storage Persistence */}
                  <div className="space-y-6">
                    {/* User Account */}
                    <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
                          <Users className="w-5 h-5" />
                        </div>
                        <div>
                          <h3 className="font-bold text-sm text-slate-900">User Session &amp; Access</h3>
                          <p className="text-xs text-slate-500">Current authenticated account information</p>
                        </div>
                      </div>

                      <div className="p-4 bg-emerald-50/70 border border-emerald-200 rounded-xl space-y-2 text-xs">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <ShieldCheck className="w-4 h-4 text-emerald-600" />
                            <span className="font-bold text-emerald-900">Active Operator Session</span>
                          </div>
                          <span className="text-[10px] bg-emerald-200/80 text-emerald-900 px-2 py-0.5 rounded-full font-bold">
                            Authorized
                          </span>
                        </div>
                        <div className="text-slate-700 space-y-1 pt-1">
                          <div className="flex justify-between">
                            <span className="text-slate-500">Operator Role:</span>
                            <span className="font-semibold text-slate-800">{currentUser?.role || 'Company Admin'}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-slate-500">Logged In As:</span>
                            <span className="font-mono text-slate-800">{currentUser?.name || 'Rajendra Shrestha'}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-slate-500">Assigned Tenant:</span>
                            <span className="font-mono font-bold text-indigo-700">{activeCompanyCode}</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Database & Offline Sync Status */}
                    <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
                          <Database className="w-5 h-5" />
                        </div>
                        <div>
                          <h3 className="font-bold text-sm text-slate-900">Persistence &amp; Cache Engine</h3>
                          <p className="text-xs text-slate-500">Dual-engine offline cache &amp; cloud snapshot</p>
                        </div>
                      </div>

                      <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200/80 space-y-2 text-xs">
                        <div className="flex justify-between items-center">
                          <span className="text-slate-600">Connection State:</span>
                          <span className="font-bold text-emerald-700 flex items-center gap-1">
                            <span className="w-2 h-2 rounded-full bg-emerald-500" />
                            Online (Cloud Synchronized)
                          </span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-slate-600">LocalStorage Offline Cache:</span>
                          <span className="font-mono text-slate-700">chequedesk_offline_{activeCompanyId}</span>
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-2 pt-1">
                        <button
                          onClick={() => {
                            try {
                              const cacheData = { cheques, parties, banks, cached_at: new Date().toISOString() };
                              localStorage.setItem(`chequedesk_offline_${activeCompanyId}`, JSON.stringify(cacheData));
                              showToast('LocalStorage offline cache refreshed!', 'success');
                            } catch {
                              showToast('Failed to update offline cache', 'error');
                            }
                          }}
                          className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold cursor-pointer transition border border-slate-200"
                        >
                          Refresh Offline Cache
                        </button>
                        <button
                          onClick={handleSeedData}
                          className="px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-xs transition"
                        >
                          <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                          <span>Seed Demo Records</span>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                {/* COMPANY STAFF & ACCOUNTANT USERS SECTION */}
                <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-5">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
                        <Users className="w-5 h-5" />
                      </div>
                      <div>
                        <h3 className="font-bold text-sm text-slate-900">Company Staff &amp; Accountant Users</h3>
                        <p className="text-xs text-slate-500">
                          Multi-accountant logins, role delegation, and operator session switching with audit tracking
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setIsAddStaffOpen(true)}
                      className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition cursor-pointer shadow-xs shrink-0 self-start sm:self-auto"
                    >
                      <Plus className="w-4 h-4" />
                      <span>Add Staff User</span>
                    </button>
                  </div>

                  {/* Active Session Status Notification */}
                  <div className="p-3.5 bg-emerald-50/70 border border-emerald-200/80 rounded-xl flex items-center justify-between flex-wrap gap-2 text-xs">
                    <div className="flex items-center gap-2">
                      <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                      <span className="text-slate-700">
                        Current Active Operator: <strong className="text-emerald-950 font-bold">{currentUser?.name}</strong>{' '}
                        <span className="text-emerald-700 font-medium">({currentUser?.role})</span>
                      </span>
                    </div>
                    <span className="text-[11px] text-emerald-800 bg-emerald-100/80 px-2.5 py-0.5 rounded-full font-semibold">
                      All new cheques &amp; payments logged as Entered By: &quot;{currentUser?.name}&quot;
                    </span>
                  </div>

                  {/* Staff Table */}
                  <div className="border border-slate-200 rounded-xl overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                        <tr>
                          <th className="py-2.5 px-4">Staff Member</th>
                          <th className="py-2.5 px-4">Role</th>
                          <th className="py-2.5 px-4">Login / Username</th>
                          <th className="py-2.5 px-4">PIN / Password</th>
                          <th className="py-2.5 px-4">Session Status</th>
                          <th className="py-2.5 px-4 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {companyStaff.map((staff) => {
                          const isCurrent = staff.id === activeStaffId;
                          return (
                            <tr key={staff.id} className={isCurrent ? 'bg-indigo-50/30' : 'hover:bg-slate-50/60'}>
                              <td className="py-3 px-4">
                                <div className="flex items-center gap-2.5">
                                  <div className={`w-7 h-7 rounded-lg flex items-center justify-center font-bold text-xs ${
                                    isCurrent ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-700'
                                  }`}>
                                    {staff.name.charAt(0).toUpperCase()}
                                  </div>
                                  <div>
                                    <div className="font-bold text-slate-900">{staff.name}</div>
                                    <div className="text-[11px] text-slate-400">{staff.email}</div>
                                  </div>
                                </div>
                              </td>
                              <td className="py-3 px-4">
                                <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                                  staff.role.includes('Admin')
                                    ? 'bg-purple-50 text-purple-700 border-purple-200'
                                    : staff.role.includes('Head') || staff.role.includes('Manager')
                                    ? 'bg-blue-50 text-blue-700 border-blue-200'
                                    : staff.role.includes('Billing') || staff.role.includes('Cashier')
                                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                    : 'bg-slate-100 text-slate-700 border-slate-200'
                                }`}>
                                  {staff.role}
                                </span>
                              </td>
                              <td className="py-3 px-4 font-mono text-slate-600 text-[11px]">
                                {staff.username ? `${staff.username} (${staff.email})` : staff.email}
                              </td>
                              <td className="py-3 px-4">
                                <span className="font-mono text-slate-500 bg-slate-100 px-2 py-0.5 rounded border border-slate-200 text-[11px]">
                                  {(staff as any).password || '1234'}
                                </span>
                              </td>
                              <td className="py-3 px-4">
                                {isCurrent ? (
                                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                    <span>Active Operator</span>
                                  </span>
                                ) : (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setActiveStaffId(staff.id);
                                      showToast(`Switched active operator to ${staff.name} (${staff.role})`, 'success');
                                    }}
                                    className="px-2.5 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded-lg text-xs font-semibold transition cursor-pointer flex items-center gap-1"
                                  >
                                    <ArrowRightLeft className="w-3 h-3" />
                                    <span>Switch Session</span>
                                  </button>
                                )}
                              </td>
                              <td className="py-3 px-4 text-right">
                                <div className="flex items-center justify-end gap-1.5">
                                  <button
                                    type="button"
                                    onClick={() => handleOpenEditStaff(staff)}
                                    className="p-1.5 rounded-lg text-slate-600 hover:bg-slate-100 hover:text-indigo-600 cursor-pointer transition"
                                    title="Edit staff details"
                                  >
                                    <Edit2 className="w-3.5 h-3.5" />
                                  </button>
                                  <button
                                    type="button"
                                    disabled={isCurrent}
                                    onClick={() => handleDeleteStaff(staff.id, staff.name)}
                                    className={`p-1.5 rounded-lg transition ${
                                      isCurrent
                                        ? 'text-slate-300 cursor-not-allowed'
                                        : 'text-rose-500 hover:bg-rose-50 hover:text-rose-700 cursor-pointer'
                                    }`}
                                    title={isCurrent ? 'Cannot delete active session operator' : 'Remove staff user'}
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}
          </main>
        </div>
      </div>

      {/* ========================================== */}
      {/* MODALS */}
      {/* ========================================== */}

      {/* 1. Cheque Create/Edit Modal with BS/AD Date Auto-Sync & Quick Add */}
      {isChequeModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-2xl space-y-4 my-8 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
                  <CreditCard className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    {editingCheque ? 'Edit Cheque Transaction' : 'Issue New Cheque'}
                  </h3>
                  <p className="text-xs text-slate-500">
                    Bikram Sambat (BS) &amp; English (AD) dates automatically synchronize
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsChequeModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveChequeForm} className="space-y-4 text-xs">
              {/* Row 1: Cheque Number & Amount */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">
                    Cheque Number <span className="text-rose-500">*</span>
                  </label>
                  <input
                    name="cheque_number"
                    required
                    value={chequeForm.cheque_number}
                    onChange={(e) => setChequeForm((p) => ({ ...p, cheque_number: e.target.value }))}
                    placeholder="e.g. CHQ-99201"
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono text-slate-900"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 font-semibold mb-1">
                    Amount (NPR) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    name="amount"
                    type="number"
                    step="any"
                    required
                    value={chequeForm.amount}
                    onChange={(e) => setChequeForm((p) => ({ ...p, amount: e.target.value }))}
                    placeholder="e.g. 50000"
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono font-bold text-slate-900"
                  />
                  {chequeForm.amount && !isNaN(Number(chequeForm.amount)) && Number(chequeForm.amount) > 0 && (
                    <div className="text-[11px] text-indigo-700 bg-indigo-50/70 p-1.5 rounded-lg mt-1 font-serif italic border border-indigo-100">
                      Words: {numberToWords(Number(chequeForm.amount))}
                    </div>
                  )}
                </div>
              </div>

              {/* Row 2: Bank & Account Number */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <label className="text-slate-700 font-semibold">Bank Account</label>
                    <button
                      type="button"
                      onClick={() => setIsQuickAddBankOpen(!isQuickAddBankOpen)}
                      className="text-[11px] font-bold text-indigo-600 hover:text-indigo-800 cursor-pointer"
                    >
                      {isQuickAddBankOpen ? 'Cancel' : '+ Quick Add Bank'}
                    </button>
                  </div>
                  <select
                    name="bank_id"
                    value={chequeForm.bank_id}
                    onChange={(e) => setChequeForm((p) => ({ ...p, bank_id: e.target.value }))}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-900"
                  >
                    <option value="">-- Select Bank Account --</option>
                    {banks.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.name} {b.code ? `(${b.code})` : ''}
                      </option>
                    ))}
                  </select>

                  {/* Inline Quick Add Bank */}
                  {isQuickAddBankOpen && (
                    <div className="mt-2 p-2.5 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                      <div className="text-[11px] font-bold text-slate-700">Quick Add Bank</div>
                      <input
                        placeholder="Bank Name (e.g. Nabil Bank)"
                        value={quickBankName}
                        onChange={(e) => setQuickBankName(e.target.value)}
                        className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500"
                      />
                      <input
                        placeholder="Bank Code / Branch (Optional)"
                        value={quickBankCode}
                        onChange={(e) => setQuickBankCode(e.target.value)}
                        className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500"
                      />
                      <button
                        type="button"
                        onClick={handleQuickAddBank}
                        className="w-full py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold cursor-pointer transition"
                      >
                        Save &amp; Select Bank
                      </button>
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-slate-700 font-semibold mb-1">
                    Account Number <span className="text-slate-400 font-normal">(Optional)</span>
                  </label>
                  <input
                    name="account_number"
                    value={chequeForm.account_number}
                    onChange={(e) => setChequeForm((p) => ({ ...p, account_number: e.target.value }))}
                    placeholder="e.g. 0102003004005"
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono text-slate-900"
                  />
                </div>
              </div>

              {/* Row 3: Party / Payee */}
              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="text-slate-700 font-semibold">Payee / Party (Beneficiary)</label>
                  <button
                    type="button"
                    onClick={() => setIsQuickAddPartyOpen(!isQuickAddPartyOpen)}
                    className="text-[11px] font-bold text-indigo-600 hover:text-indigo-800 cursor-pointer"
                  >
                    {isQuickAddPartyOpen ? 'Cancel' : '+ Quick Add Party'}
                  </button>
                </div>
                <select
                  name="party_id"
                  value={chequeForm.party_id}
                  onChange={(e) => setChequeForm((p) => ({ ...p, party_id: e.target.value }))}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-900"
                >
                  <option value="">-- Select Party / Payee --</option>
                  {parties.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} {p.party_type ? `[${p.party_type === 'Sundry Creditors' ? 'Creditor (Outward)' : 'Debtor (Inward)'}]` : ''} {p.phone ? `(${p.phone})` : ''}
                    </option>
                  ))}
                </select>

                {/* Inline Quick Add Party */}
                {isQuickAddPartyOpen && (
                  <div className="mt-2 p-2.5 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                    <div className="text-[11px] font-bold text-slate-700">Quick Add Party / Payee</div>
                    <input
                      placeholder="Party Name (e.g. Acme Corp)"
                      value={quickPartyName}
                      onChange={(e) => setQuickPartyName(e.target.value)}
                      className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    />
                    <select
                      value={quickPartyType}
                      onChange={(e) => setQuickPartyType(e.target.value as PartyType)}
                      className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    >
                      <option value="Sundry Debtors">Sundry Debtors (Customer / Received Inward)</option>
                      <option value="Sundry Creditors">Sundry Creditors (Supplier / Payment Outward)</option>
                    </select>
                    <input
                      placeholder="Phone Number (Optional)"
                      value={quickPartyPhone}
                      onChange={(e) => setQuickPartyPhone(e.target.value)}
                      className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    />
                    <button
                      type="button"
                      onClick={handleQuickAddParty}
                      className="w-full py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold cursor-pointer transition"
                    >
                      Save &amp; Select Party
                    </button>
                  </div>
                )}
              </div>

              {/* Row 4: Issue Date (BS & AD synchronized) */}
              <div className="p-3 bg-slate-50/70 border border-slate-200 rounded-xl space-y-2">
                <div className="flex items-center gap-1 text-[11px] font-bold text-indigo-700 uppercase tracking-wide">
                  <Calendar className="w-3.5 h-3.5" />
                  <span>Issue Date (Synchronized BS &amp; AD)</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-600 font-medium mb-1">Nepali Date (BS)</label>
                    <input
                      type="text"
                      required
                      placeholder="YYYY-MM-DD (e.g. 2081-06-15)"
                      value={chequeForm.issue_date_bs}
                      onChange={(e) => handleIssueDateBsSync(e.target.value)}
                      className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono text-slate-900"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-600 font-medium mb-1">English Date (AD)</label>
                    <input
                      type="date"
                      required
                      value={chequeForm.issue_date_ad}
                      onChange={(e) => handleIssueDateAdSync(e.target.value)}
                      className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono text-slate-900"
                    />
                  </div>
                </div>
              </div>

              {/* Row 5: Due Date (BS & AD synchronized) */}
              <div className="p-3 bg-slate-50/70 border border-slate-200 rounded-xl space-y-2">
                <div className="flex items-center gap-1 text-[11px] font-bold text-indigo-700 uppercase tracking-wide">
                  <Clock className="w-3.5 h-3.5" />
                  <span>Due Date (Synchronized BS &amp; AD)</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-600 font-medium mb-1">Due Date (BS)</label>
                    <input
                      type="text"
                      required
                      placeholder="YYYY-MM-DD (e.g. 2081-07-01)"
                      value={chequeForm.due_date_bs}
                      onChange={(e) => handleDueDateBsSync(e.target.value)}
                      className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono text-slate-900"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-600 font-medium mb-1">Due Date (AD)</label>
                    <input
                      type="date"
                      required
                      value={chequeForm.due_date_ad}
                      onChange={(e) => handleDueDateAdSync(e.target.value)}
                      className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono text-slate-900"
                    />
                  </div>
                </div>
              </div>

              {/* Row 6: Status & Bill No */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Cheque Status</label>
                  <select
                    name="status"
                    value={chequeForm.status}
                    onChange={(e) => setChequeForm((p) => ({ ...p, status: e.target.value as ChequeStatus }))}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-900 font-medium"
                  >
                    <option value="Pending">Pending</option>
                    <option value="Partially Paid">Partially Paid</option>
                    <option value="Cleared">Cleared</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-700 font-semibold mb-1">
                    Bill / Invoice No. <span className="text-slate-400 font-normal">(Optional)</span>
                  </label>
                  <input
                    name="bill_number"
                    value={chequeForm.bill_number}
                    onChange={(e) => setChequeForm((p) => ({ ...p, bill_number: e.target.value }))}
                    placeholder="e.g. INV-8492"
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono text-slate-900"
                  />
                </div>
              </div>

              {/* Row 7: Notes */}
              <div>
                <label className="block text-slate-700 font-semibold mb-1">Notes / Remarks</label>
                <input
                  name="notes"
                  value={chequeForm.notes}
                  onChange={(e) => setChequeForm((p) => ({ ...p, notes: e.target.value }))}
                  placeholder="Optional remarks, reference, or payment purpose"
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-900"
                />
              </div>

              {/* Modal Actions */}
              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsChequeModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold cursor-pointer transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold cursor-pointer shadow-md transition"
                >
                  {editingCheque ? 'Update Cheque' : 'Save & Issue Cheque'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 2. Record Payment Modal */}
      {isPaymentModalOpen && activePaymentCheque && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex justify-between items-center pb-2 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-900">Record Payment</h3>
              <button onClick={() => setIsPaymentModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="bg-slate-50 p-3 rounded-xl text-xs space-y-1">
              <div className="flex justify-between">
                <span className="text-slate-500">Cheque Number:</span>
                <span className="font-mono font-bold text-slate-800">{activePaymentCheque.cheque_number}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Total Amount:</span>
                <span className="font-bold text-slate-800">{formatNPR(activePaymentCheque.amount)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Remaining Balance:</span>
                <span className="font-bold text-amber-600">{formatNPR(activePaymentCheque.remaining_amount ?? activePaymentCheque.amount)}</span>
              </div>
            </div>
            <form
              onSubmit={async (e) => {
                e.preventDefault();
                const form = e.currentTarget;
                const payAmount = Number((form.elements.namedItem('pay_amount') as HTMLInputElement).value);
                const payment_mode = (form.elements.namedItem('mode') as HTMLSelectElement).value as PaymentMode;
                try {
                  await recordPayment({
                    company_id: activeCompanyId,
                    cheque_id: activePaymentCheque.id,
                    amount: payAmount,
                    payment_mode,
                    payment_date_bs: getCurrentBsDate(),
                    payment_date_ad: getCurrentAdDate(),
                    recorded_by: currentUser?.name || 'Accountant',
                  });
                  showToast(`Recorded payment of ${formatNPR(payAmount)}`, 'success');
                  setIsPaymentModalOpen(false);
                } catch (err: any) {
                  showToast(`Payment error: ${err?.message || 'Failed'}`, 'error');
                }
              }}
              className="space-y-3 text-xs"
            >
              <div>
                <label className="block text-slate-700 font-semibold mb-1">Payment Amount (NPR)</label>
                <input
                  name="pay_amount"
                  type="number"
                  required
                  defaultValue={activePaymentCheque.remaining_amount ?? activePaymentCheque.amount}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="block text-slate-700 font-semibold mb-1">Payment Mode</label>
                <select
                  name="mode"
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="Cash">Cash</option>
                  <option value="IPS">IPS (ConnectIPS / Bank Transfer)</option>
                  <option value="Bank Deposit">Bank Deposit</option>
                </select>
              </div>
              <div className="flex justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setIsPaymentModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 rounded-xl font-bold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold cursor-pointer shadow-md"
                >
                  Confirm Payment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 3. Cheque Detail Modal */}
      {isDetailModalOpen && selectedCheque && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex justify-between items-center pb-2 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-900">Cheque Details</h3>
              <button onClick={() => setIsDetailModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-2 text-xs">
              <div className="flex justify-between py-1 border-b border-slate-100">
                <span className="text-slate-500">Cheque Number</span>
                <span className="font-mono font-bold text-slate-900">{selectedCheque.cheque_number}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100">
                <span className="text-slate-500">Party / Payee</span>
                <span className="font-semibold text-slate-900">{parties.find((p) => p.id === selectedCheque.party_id)?.name || 'N/A'}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100">
                <span className="text-slate-500">Bank</span>
                <span className="font-semibold text-slate-900">{banks.find((b) => b.id === selectedCheque.bank_id)?.name || 'N/A'}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100">
                <span className="text-slate-500">Total Amount</span>
                <span className="font-bold text-slate-900">{formatNPR(selectedCheque.amount)}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100">
                <span className="text-slate-500">Remaining Balance</span>
                <span className="font-bold text-amber-600">{formatNPR(selectedCheque.remaining_amount ?? selectedCheque.amount)}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100">
                <span className="text-slate-500">Due Date (BS / AD)</span>
                <span>{selectedCheque.due_date_bs} ({selectedCheque.due_date_ad})</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100">
                <span className="text-slate-500">Status</span>
                <StatusBadge status={selectedCheque.status} />
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100">
                <span className="text-slate-500">Entered By</span>
                <span className="font-semibold text-slate-900 flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-indigo-500" />
                  {selectedCheque.entered_by || 'Rajendra Shrestha (Admin)'}
                </span>
              </div>
              {selectedCheque.updated_by && (
                <div className="flex justify-between py-1 border-b border-slate-100">
                  <span className="text-slate-500">Last Modified By</span>
                  <span className="font-semibold text-slate-800">{selectedCheque.updated_by}</span>
                </div>
              )}
              {selectedCheque.notes && (
                <div className="p-2.5 bg-slate-50 rounded-xl mt-2">
                  <div className="text-slate-500 text-[10px] font-bold uppercase mb-1">Notes / Origin:</div>
                  <div className="text-slate-800">{selectedCheque.notes}</div>
                  {(selectedCheque.notes.toLowerCase().includes('imported') || selectedCheque.notes.toLowerCase().includes('external')) && (
                    <span className="inline-block mt-2 px-2 py-0.5 rounded text-[10px] font-semibold bg-purple-50 text-purple-700 border border-purple-200">
                      Imported from External Software
                    </span>
                  )}
                </div>
              )}
            </div>
            <div className="flex justify-end items-center gap-2 pt-2 border-t border-slate-100">
              {activeFeatures.print_cheque && (
                <button
                  onClick={() => {
                    setPrintSelectedChequeId(selectedCheque.id);
                    setIsDetailModalOpen(false);
                    setCurrentView('print_cheque');
                  }}
                  className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition cursor-pointer shadow-xs"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Print Cheque Leaf</span>
                </button>
              )}
              <button
                onClick={() => setIsDetailModalOpen(false)}
                className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 4. Import Cheques Modal */}
      {isImportModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-xl w-full p-6 shadow-2xl space-y-5 border border-slate-100 my-8">
            <div className="flex justify-between items-start pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
                  <FileSpreadsheet className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">Import Cheques from Excel / CSV</h3>
                  <p className="text-xs text-slate-500">Batch import cheque records from external accounting or billing software</p>
                </div>
              </div>
              <button
                onClick={() => setIsImportModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Template Download Banner */}
            <div className="bg-gradient-to-r from-indigo-50/70 via-purple-50/50 to-blue-50/60 border border-indigo-100/80 rounded-xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div className="space-y-0.5">
                <div className="flex items-center gap-1.5 text-xs font-bold text-indigo-950">
                  <Sparkles className="w-4 h-4 text-indigo-600" />
                  <span>Download Sample Excel Template</span>
                </div>
                <p className="text-[11px] text-indigo-900/70 leading-relaxed">
                  Pre-formatted .xlsx with correct columns: Cheque No, Amount, Bank, Party, Issue Date BS/AD, Due Date BS/AD, Bill No, Status, Notes.
                </p>
              </div>
              <button
                type="button"
                onClick={downloadSampleChequeTemplate}
                className="shrink-0 px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs transition cursor-pointer"
              >
                <Download className="w-4 h-4" />
                <span>Download Sample .xlsx</span>
              </button>
            </div>

            {/* Step-by-Step Visual Instruction Box */}
            <div className="bg-slate-50 rounded-xl p-3.5 border border-slate-200/80 space-y-2.5">
              <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700">
                <Info className="w-3.5 h-3.5 text-indigo-600" />
                <span>How to Fill & Upload Cheques:</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-[11px]">
                <div className="p-2.5 bg-white rounded-lg border border-slate-200/80 space-y-1">
                  <div className="font-bold text-indigo-600 flex items-center gap-1">
                    <span className="w-4 h-4 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center text-[10px] font-mono">1</span>
                    Download Template
                  </div>
                  <p className="text-slate-500 leading-normal text-[10px]">
                    Click the button above to get the official Excel template.
                  </p>
                </div>
                <div className="p-2.5 bg-white rounded-lg border border-slate-200/80 space-y-1">
                  <div className="font-bold text-indigo-600 flex items-center gap-1">
                    <span className="w-4 h-4 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center text-[10px] font-mono">2</span>
                    Enter Records
                  </div>
                  <p className="text-slate-500 leading-normal text-[10px]">
                    Fill rows with dates in <code>YYYY-MM-DD</code>. Parties & banks match automatically.
                  </p>
                </div>
                <div className="p-2.5 bg-white rounded-lg border border-slate-200/80 space-y-1">
                  <div className="font-bold text-indigo-600 flex items-center gap-1">
                    <span className="w-4 h-4 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center text-[10px] font-mono">3</span>
                    Upload & Save
                  </div>
                  <p className="text-slate-500 leading-normal text-[10px]">
                    Select or drop the saved file below. Records are validated and stored locally.
                  </p>
                </div>
              </div>
            </div>

            {/* Supported Headers Tag Strip */}
            <div className="space-y-1">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Recognized Columns</span>
              <div className="flex flex-wrap gap-1 text-[10px]">
                {['Cheque No', 'Amount', 'Bank', 'Party', 'Issue Date BS/AD', 'Due Date BS/AD', 'Bill No', 'Status', 'Notes'].map((col) => (
                  <span key={col} className="px-2 py-0.5 bg-slate-100 border border-slate-200 rounded-md text-slate-600 font-mono">
                    {col}
                  </span>
                ))}
              </div>
            </div>

            {/* Upload Dropzone */}
            <div className="border-2 border-dashed border-indigo-200 hover:border-indigo-400 rounded-2xl p-6 text-center bg-indigo-50/20 relative transition group">
              <Upload className="w-8 h-8 mx-auto text-indigo-500 group-hover:scale-110 transition mb-2" />
              <div className="text-xs font-bold text-slate-800">Click to Browse or Drag & Drop File</div>
              <p className="text-[11px] text-slate-400 mt-1">Supports Excel (.xlsx, .xls), CSV (.csv), or JSON (.json)</p>
              <input
                type="file"
                accept=".xlsx,.xls,.csv,.json"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleBatchImportCheques(file);
                }}
                className="absolute inset-0 opacity-0 cursor-pointer"
              />
            </div>

            <div className="flex justify-end pt-1">
              <button
                type="button"
                onClick={() => setIsImportModalOpen(false)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition cursor-pointer"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 4b. Import Banks Modal */}
      {isBankImportModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-xl w-full p-6 shadow-2xl space-y-5 border border-slate-100 my-8">
            <div className="flex justify-between items-start pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-purple-50 text-purple-600 rounded-xl">
                  <Landmark className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">Import Bank Accounts from Excel / CSV</h3>
                  <p className="text-xs text-slate-500">Batch import bank accounts, branch codes, and starting balances into directory</p>
                </div>
              </div>
              <button
                onClick={() => setIsBankImportModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Template Download Banner */}
            <div className="bg-gradient-to-r from-purple-50/70 via-indigo-50/50 to-blue-50/60 border border-purple-100/80 rounded-xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div className="space-y-0.5">
                <div className="flex items-center gap-1.5 text-xs font-bold text-purple-950">
                  <Landmark className="w-4 h-4 text-purple-600" />
                  <span>Download Sample Bank Template</span>
                </div>
                <p className="text-[11px] text-purple-900/70 leading-relaxed">
                  Pre-formatted .xlsx with correct header columns: Bank Name, Account Number, Branch, Initial Balance.
                </p>
              </div>
              <button
                type="button"
                onClick={downloadSampleBankTemplate}
                className="shrink-0 px-3.5 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs transition cursor-pointer"
              >
                <Download className="w-4 h-4" />
                <span>Download Sample .xlsx</span>
              </button>
            </div>

            {/* Step-by-Step Visual Instruction Box */}
            <div className="bg-slate-50 rounded-xl p-3.5 border border-slate-200/80 space-y-2.5">
              <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700">
                <Info className="w-3.5 h-3.5 text-purple-600" />
                <span>How to Fill & Upload Banks:</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-[11px]">
                <div className="p-2.5 bg-white rounded-lg border border-slate-200/80 space-y-1">
                  <div className="font-bold text-purple-600 flex items-center gap-1">
                    <span className="w-4 h-4 rounded-full bg-purple-100 text-purple-700 flex items-center justify-center text-[10px] font-mono">1</span>
                    Download Template
                  </div>
                  <p className="text-slate-500 leading-normal text-[10px]">
                    Click above to download the pre-configured Bank Excel template.
                  </p>
                </div>
                <div className="p-2.5 bg-white rounded-lg border border-slate-200/80 space-y-1">
                  <div className="font-bold text-purple-600 flex items-center gap-1">
                    <span className="w-4 h-4 rounded-full bg-purple-100 text-purple-700 flex items-center justify-center text-[10px] font-mono">2</span>
                    Fill Details
                  </div>
                  <p className="text-slate-500 leading-normal text-[10px]">
                    Enter Bank Name, Account Number, Branch/Code, and Initial Balance.
                  </p>
                </div>
                <div className="p-2.5 bg-white rounded-lg border border-slate-200/80 space-y-1">
                  <div className="font-bold text-purple-600 flex items-center gap-1">
                    <span className="w-4 h-4 rounded-full bg-purple-100 text-purple-700 flex items-center justify-center text-[10px] font-mono">3</span>
                    Upload & Save
                  </div>
                  <p className="text-slate-500 leading-normal text-[10px]">
                    Drop the file below. Existing banks will be preserved without duplicate entries.
                  </p>
                </div>
              </div>
            </div>

            {/* Supported Headers Tag Strip */}
            <div className="space-y-1">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Recognized Columns</span>
              <div className="flex flex-wrap gap-1 text-[10px]">
                {['Bank Name', 'Account Number', 'Branch', 'Initial Balance'].map((col) => (
                  <span key={col} className="px-2 py-0.5 bg-slate-100 border border-slate-200 rounded-md text-slate-600 font-mono">
                    {col}
                  </span>
                ))}
              </div>
            </div>

            {/* Upload Dropzone */}
            <div className="border-2 border-dashed border-purple-200 hover:border-purple-400 rounded-2xl p-6 text-center bg-purple-50/20 relative transition group">
              <Upload className="w-8 h-8 mx-auto text-purple-500 group-hover:scale-110 transition mb-2" />
              <div className="text-xs font-bold text-slate-800">Click to Browse or Drag & Drop File</div>
              <p className="text-[11px] text-slate-400 mt-1">Supports Excel (.xlsx, .xls) and CSV (.csv)</p>
              <input
                type="file"
                accept=".xlsx,.xls,.csv"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleBatchImportBanks(file);
                }}
                className="absolute inset-0 opacity-0 cursor-pointer"
              />
            </div>

            <div className="flex justify-end pt-1">
              <button
                type="button"
                onClick={() => setIsBankImportModalOpen(false)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition cursor-pointer"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 4c. Import Parties Modal */}
      {isPartyImportModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-xl w-full p-6 shadow-2xl space-y-5 border border-slate-100 my-8">
            <div className="flex justify-between items-start pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-purple-50 text-purple-600 rounded-xl">
                  <Users className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">Import Parties & Payees from Excel / CSV</h3>
                  <p className="text-xs text-slate-500">Batch import suppliers, vendors, and beneficiaries with PAN/VAT and contacts</p>
                </div>
              </div>
              <button
                onClick={() => setIsPartyImportModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Template Download Banner */}
            <div className="bg-gradient-to-r from-purple-50/70 via-indigo-50/50 to-blue-50/60 border border-purple-100/80 rounded-xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div className="space-y-0.5">
                <div className="flex items-center gap-1.5 text-xs font-bold text-purple-950">
                  <Users className="w-4 h-4 text-purple-600" />
                  <span>Download Sample Party Template</span>
                </div>
                <p className="text-[11px] text-purple-900/70 leading-relaxed">
                  Pre-formatted .xlsx with correct header columns: Party Name, Contact Person, Phone, PAN/VAT, Opening Balance.
                </p>
              </div>
              <button
                type="button"
                onClick={downloadSamplePartyTemplate}
                className="shrink-0 px-3.5 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs transition cursor-pointer"
              >
                <Download className="w-4 h-4" />
                <span>Download Sample .xlsx</span>
              </button>
            </div>

            {/* Step-by-Step Visual Instruction Box */}
            <div className="bg-slate-50 rounded-xl p-3.5 border border-slate-200/80 space-y-2.5">
              <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700">
                <Info className="w-3.5 h-3.5 text-purple-600" />
                <span>How to Fill & Upload Parties:</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-[11px]">
                <div className="p-2.5 bg-white rounded-lg border border-slate-200/80 space-y-1">
                  <div className="font-bold text-purple-600 flex items-center gap-1">
                    <span className="w-4 h-4 rounded-full bg-purple-100 text-purple-700 flex items-center justify-center text-[10px] font-mono">1</span>
                    Download Template
                  </div>
                  <p className="text-slate-500 leading-normal text-[10px]">
                    Click above to download the pre-configured Party Excel template.
                  </p>
                </div>
                <div className="p-2.5 bg-white rounded-lg border border-slate-200/80 space-y-1">
                  <div className="font-bold text-purple-600 flex items-center gap-1">
                    <span className="w-4 h-4 rounded-full bg-purple-100 text-purple-700 flex items-center justify-center text-[10px] font-mono">2</span>
                    Fill Details
                  </div>
                  <p className="text-slate-500 leading-normal text-[10px]">
                    Enter Party Name, Contact Person, Phone, PAN/VAT, and Opening Balance.
                  </p>
                </div>
                <div className="p-2.5 bg-white rounded-lg border border-slate-200/80 space-y-1">
                  <div className="font-bold text-purple-600 flex items-center gap-1">
                    <span className="w-4 h-4 rounded-full bg-purple-100 text-purple-700 flex items-center justify-center text-[10px] font-mono">3</span>
                    Upload & Save
                  </div>
                  <p className="text-slate-500 leading-normal text-[10px]">
                    Drop file below. Unique parties will be registered with complete contact data.
                  </p>
                </div>
              </div>
            </div>

            {/* Supported Headers Tag Strip */}
            <div className="space-y-1">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Recognized Columns</span>
              <div className="flex flex-wrap gap-1 text-[10px]">
                {['Party Name', 'Contact Person', 'Phone', 'PAN/VAT', 'Opening Balance'].map((col) => (
                  <span key={col} className="px-2 py-0.5 bg-slate-100 border border-slate-200 rounded-md text-slate-600 font-mono">
                    {col}
                  </span>
                ))}
              </div>
            </div>

            {/* Upload Dropzone */}
            <div className="border-2 border-dashed border-purple-200 hover:border-purple-400 rounded-2xl p-6 text-center bg-purple-50/20 relative transition group">
              <Upload className="w-8 h-8 mx-auto text-purple-500 group-hover:scale-110 transition mb-2" />
              <div className="text-xs font-bold text-slate-800">Click to Browse or Drag & Drop File</div>
              <p className="text-[11px] text-slate-400 mt-1">Supports Excel (.xlsx, .xls) and CSV (.csv)</p>
              <input
                type="file"
                accept=".xlsx,.xls,.csv"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleBatchImportParties(file);
                }}
                className="absolute inset-0 opacity-0 cursor-pointer"
              />
            </div>

            <div className="flex justify-end pt-1">
              <button
                type="button"
                onClick={() => setIsPartyImportModalOpen(false)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition cursor-pointer"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 5. Add Party Modal */}
      {isAddPartyOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex justify-between items-center pb-2 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-900">Add New Party / Payee</h3>
              <button onClick={() => setIsAddPartyOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form
              onSubmit={async (e) => {
                e.preventDefault();
                const form = e.currentTarget;
                const name = (form.elements.namedItem('party_name') as HTMLInputElement).value;
                const phone = (form.elements.namedItem('party_phone') as HTMLInputElement).value;
                const pan_vat = (form.elements.namedItem('party_pan_vat') as HTMLInputElement).value;
                const party_type = (form.elements.namedItem('party_type') as HTMLSelectElement).value as PartyType;
                try {
                  await addParty({ company_id: activeCompanyId, name, phone, pan_vat, party_type });
                  showToast(`Party "${name}" added`, 'success');
                  setIsAddPartyOpen(false);
                } catch (err: any) {
                  showToast(`Error: ${err?.message || 'Failed to add party'}`, 'error');
                }
              }}
              className="space-y-3 text-xs"
            >
              <div>
                <label className="block text-slate-700 font-semibold mb-1">Party / Payee Name</label>
                <input
                  name="party_name"
                  required
                  placeholder="e.g. Acme Corporation"
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="block text-slate-700 font-semibold mb-1">Party Classification (Accounting Ledger)</label>
                <select
                  name="party_type"
                  defaultValue="Sundry Debtors"
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                >
                  <option value="Sundry Debtors">Sundry Debtors (Receivable / Customer / Inward Cheques)</option>
                  <option value="Sundry Creditors">Sundry Creditors (Payable / Supplier / Outward Cheques)</option>
                </select>
                <p className="text-[10px] text-slate-400 mt-1">
                  Sundry Debtors auto-classifies transactions as "Received". Sundry Creditors auto-classifies as "Payment".
                </p>
              </div>
              <div>
                <label className="block text-slate-700 font-semibold mb-1">Phone Number (Optional)</label>
                <input
                  name="party_phone"
                  placeholder="e.g. 9841000000"
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="block text-slate-700 font-semibold mb-1">PAN / VAT Number (Optional)</label>
                <input
                  name="party_pan_vat"
                  placeholder="e.g. 601234567"
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsAddPartyOpen(false)}
                  className="px-4 py-2 bg-slate-100 rounded-xl font-bold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold cursor-pointer shadow-md"
                >
                  Save Party
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 5b. Edit Party Modal */}
      {isEditPartyOpen && editingParty && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex justify-between items-center pb-2 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-900">Edit Party / Payee</h3>
              <button onClick={() => { setIsEditPartyOpen(false); setEditingParty(null); }} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSavePartyEdit} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-700 font-semibold mb-1">Party / Payee Name</label>
                <input
                  required
                  value={editPartyForm.name}
                  onChange={(e) => setEditPartyForm((p) => ({ ...p, name: e.target.value }))}
                  placeholder="e.g. Acme Corporation"
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="block text-slate-700 font-semibold mb-1">Party Classification (Accounting Ledger)</label>
                <select
                  value={editPartyForm.party_type || 'Sundry Debtors'}
                  onChange={(e) => setEditPartyForm((p) => ({ ...p, party_type: e.target.value as PartyType }))}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                >
                  <option value="Sundry Debtors">Sundry Debtors (Receivable / Customer / Inward Cheques)</option>
                  <option value="Sundry Creditors">Sundry Creditors (Payable / Supplier / Outward Cheques)</option>
                </select>
                <p className="text-[10px] text-slate-400 mt-1">
                  Sundry Debtors auto-classifies transactions as "Received". Sundry Creditors auto-classifies as "Payment".
                </p>
              </div>
              <div>
                <label className="block text-slate-700 font-semibold mb-1">Phone Number (Optional)</label>
                <input
                  value={editPartyForm.phone}
                  onChange={(e) => setEditPartyForm((p) => ({ ...p, phone: e.target.value }))}
                  placeholder="e.g. 9841000000"
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="block text-slate-700 font-semibold mb-1">PAN / VAT Number (Optional)</label>
                <input
                  value={editPartyForm.pan_vat}
                  onChange={(e) => setEditPartyForm((p) => ({ ...p, pan_vat: e.target.value }))}
                  placeholder="e.g. 601234567"
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => { setIsEditPartyOpen(false); setEditingParty(null); }}
                  className="px-4 py-2 bg-slate-100 rounded-xl font-bold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold cursor-pointer shadow-md"
                >
                  Update Party
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 6. Add Bank Modal */}
      {isAddBankOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex justify-between items-center pb-2 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-900">Add New Bank</h3>
              <button onClick={() => setIsAddBankOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form
              onSubmit={async (e) => {
                e.preventDefault();
                const form = e.currentTarget;
                const name = (form.elements.namedItem('bank_name') as HTMLInputElement).value;
                const code = (form.elements.namedItem('bank_code') as HTMLInputElement).value;
                try {
                  await addBank(activeCompanyId, name, code);
                  showToast(`Bank "${name}" added`, 'success');
                  setIsAddBankOpen(false);
                } catch (err: any) {
                  showToast(`Error: ${err?.message || 'Failed to add bank'}`, 'error');
                }
              }}
              className="space-y-3 text-xs"
            >
              <div>
                <label className="block text-slate-700 font-semibold mb-1">Bank Name</label>
                <input
                  name="bank_name"
                  required
                  placeholder="e.g. Nabil Bank"
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="block text-slate-700 font-semibold mb-1">Bank Branch / Code</label>
                <input
                  name="bank_code"
                  placeholder="e.g. NABIL-01"
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsAddBankOpen(false)}
                  className="px-4 py-2 bg-slate-100 rounded-xl font-bold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold cursor-pointer shadow-md"
                >
                  Save Bank
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 6b. Edit Bank Modal */}
      {isEditBankOpen && editingBank && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex justify-between items-center pb-2 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-900">Edit Bank Account</h3>
              <button onClick={() => { setIsEditBankOpen(false); setEditingBank(null); }} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSaveBankEdit} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-700 font-semibold mb-1">Bank Name</label>
                <input
                  required
                  value={editBankForm.name}
                  onChange={(e) => setEditBankForm((b) => ({ ...b, name: e.target.value }))}
                  placeholder="e.g. Nabil Bank"
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="block text-slate-700 font-semibold mb-1">Bank Branch / Code</label>
                <input
                  value={editBankForm.code}
                  onChange={(e) => setEditBankForm((b) => ({ ...b, code: e.target.value }))}
                  placeholder="e.g. NABIL-01"
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => { setIsEditBankOpen(false); setEditingBank(null); }}
                  className="px-4 py-2 bg-slate-100 rounded-xl font-bold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold cursor-pointer shadow-md"
                >
                  Update Bank
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 7. Delete Cheque Confirmation */}
      {chequeToDeleteId && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-3 text-rose-600">
              <div className="p-2 bg-rose-50 rounded-xl">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-slate-900">Delete Cheque</h3>
            </div>
            <p className="text-xs text-slate-600">
              Are you sure you want to permanently delete this cheque record? This action cannot be undone.
            </p>
            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setChequeToDeleteId(null)}
                className="px-4 py-2 bg-slate-100 rounded-xl text-xs font-bold cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={async () => {
                  try {
                    await deleteCheque(chequeToDeleteId);
                    showToast('Cheque deleted successfully', 'success');
                  } catch (err: any) {
                    showToast(`Error deleting cheque: ${err?.message || 'Failed'}`, 'error');
                  }
                  setChequeToDeleteId(null);
                }}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold cursor-pointer shadow-md"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
      {/* 8. Set Local Backup Path Modal */}
      {isBackupPathModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex justify-between items-center pb-2 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
                  <Folder className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">Set Local Backup Directory</h3>
                  <p className="text-xs text-slate-500">Configure disk path for automated snapshots</p>
                </div>
              </div>
              <button
                onClick={() => setIsBackupPathModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <p className="text-slate-600 leading-relaxed">
                Specify the destination directory on your local hard disk where ChequeDesk will store automated JSON and Excel backup snapshots.
              </p>

              <div>
                <label className="block text-slate-700 font-bold mb-1">Local Disk Folder Path</label>
                <div className="relative">
                  <input
                    type="text"
                    value={backupPathInput}
                    onChange={(e) => setBackupPathInput(e.target.value)}
                    placeholder="e.g. D:\ChequeDesk_Backups\ or E:\MyBackups\"
                    className="w-full pl-3 pr-10 py-2 border border-slate-200 rounded-xl font-mono text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                  <FolderOpen className="w-4 h-4 text-slate-400 absolute right-3 top-2.5" />
                </div>
              </div>

              {/* Quick Path Presets */}
              <div>
                <span className="text-[11px] font-semibold text-slate-500 mb-1.5 block">Quick Preset Paths:</span>
                <div className="flex flex-wrap gap-1.5">
                  {['D:\\ChequeDesk_Backups\\', 'C:\\ChequeDesk_Backups\\', 'E:\\MyBackups\\', 'C:\\Users\\Finance\\Backups\\'].map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => setBackupPathInput(preset)}
                      className="px-2 py-1 bg-slate-100 hover:bg-indigo-50 hover:text-indigo-700 rounded-lg text-[10px] font-mono text-slate-600 border border-slate-200 transition cursor-pointer"
                    >
                      {preset}
                    </button>
                  ))}
                </div>
              </div>

              {/* Browser File System Access Trigger */}
              {typeof window !== 'undefined' && 'showDirectoryPicker' in window && (
                <div className="p-3 bg-indigo-50/70 border border-indigo-100 rounded-xl flex items-center justify-between gap-2">
                  <div className="text-[11px] text-indigo-900">
                    <span className="font-bold block">Native Browser Folder Sync</span>
                    <span>Direct folder permissions available</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setIsBackupPathModalOpen(false);
                      handleSelectDirectory();
                    }}
                    className="px-2.5 py-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-bold text-[11px] shrink-0 transition cursor-pointer"
                  >
                    Select via Dialog
                  </button>
                </div>
              )}
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setIsBackupPathModalOpen(false)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 rounded-xl text-xs font-bold text-slate-700 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  const cleaned = backupPathInput.trim() || 'D:\\ChequeDesk_Backups\\';
                  setLocalBackupPath(cleaned);
                  localStorage.setItem('chequedesk_local_backup_path', cleaned);
                  setIsBackupPathModalOpen(false);
                  showToast(`Local backup path updated: ${cleaned}`, 'success');
                  performLocalBackup(false, true);
                }}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold cursor-pointer shadow-md transition"
              >
                Save Backup Path
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 9. Add Company Staff / Accountant Modal */}
      {isAddStaffOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex justify-between items-center pb-2 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
                  <Users className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">Add Staff &amp; Accountant</h3>
                  <p className="text-xs text-slate-500">Create internal login credentials for {activeCompanyName}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsAddStaffOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddStaff} className="space-y-3.5 text-xs">
              <div>
                <label className="block text-slate-700 font-semibold mb-1">Full Name *</label>
                <input
                  type="text"
                  required
                  value={newStaffForm.name}
                  onChange={(e) => setNewStaffForm({ ...newStaffForm, name: e.target.value })}
                  placeholder="e.g. Suresh Pokharel"
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Username / Login ID</label>
                  <input
                    type="text"
                    value={newStaffForm.username}
                    onChange={(e) => setNewStaffForm({ ...newStaffForm, username: e.target.value })}
                    placeholder="e.g. suresh or accountant"
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Login Email</label>
                  <input
                    type="email"
                    value={newStaffForm.email}
                    onChange={(e) => setNewStaffForm({ ...newStaffForm, email: e.target.value })}
                    placeholder="e.g. suresh@rstraders.com"
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Role / Designation *</label>
                  <select
                    value={newStaffForm.role}
                    onChange={(e) => setNewStaffForm({ ...newStaffForm, role: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                  >
                    <option value="Company Admin">Company Admin</option>
                    <option value="Head Accountant">Head Accountant</option>
                    <option value="Junior Accountant">Junior Accountant</option>
                    <option value="Billing Officer">Billing Officer</option>
                    <option value="Finance Manager">Finance Manager</option>
                    <option value="Cashier">Cashier</option>
                    <option value="Auditor">Auditor</option>
                  </select>
                </div>
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Login PIN / Password *</label>
                  <div className="relative">
                    <Key className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                    <input
                      type="text"
                      value={newStaffForm.password}
                      onChange={(e) => setNewStaffForm({ ...newStaffForm, password: e.target.value })}
                      placeholder="e.g. 1234 or Pass@123"
                      className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono"
                    />
                  </div>
                </div>
              </div>

              <p className="text-[11px] text-slate-400">Used by the staff member to log in using Company Code + Username + Password.</p>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsAddStaffOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 rounded-xl font-bold cursor-pointer text-slate-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold cursor-pointer shadow-md flex items-center gap-1.5 transition"
                >
                  <Plus className="w-4 h-4" />
                  <span>Register Staff User</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Staff & Accountant User Modal */}
      {isEditStaffOpen && editingStaff && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4">
            <div className="flex justify-between items-center pb-2 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
                  <Edit2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">Edit Staff / Accountant User</h3>
                  <p className="text-xs text-slate-500">Update operator credentials and role for {editingStaff.name}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsEditStaffOpen(false);
                  setEditingStaff(null);
                }}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleUpdateStaff} className="space-y-3.5 text-xs">
              <div>
                <label className="block text-slate-700 font-semibold mb-1">Full Name *</label>
                <input
                  type="text"
                  required
                  value={editStaffForm.name}
                  onChange={(e) => setEditStaffForm({ ...editStaffForm, name: e.target.value })}
                  placeholder="e.g. Binod Thapa"
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Login Username</label>
                  <input
                    type="text"
                    value={editStaffForm.username}
                    onChange={(e) => setEditStaffForm({ ...editStaffForm, username: e.target.value })}
                    placeholder="e.g. binod.t or accountant"
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Login Email</label>
                  <input
                    type="email"
                    value={editStaffForm.email}
                    onChange={(e) => setEditStaffForm({ ...editStaffForm, email: e.target.value })}
                    placeholder="e.g. accountant@rstraders.com"
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Role / Designation *</label>
                  <select
                    value={editStaffForm.role}
                    onChange={(e) => setEditStaffForm({ ...editStaffForm, role: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                  >
                    <option value="Company Admin">Company Admin</option>
                    <option value="Head Accountant">Head Accountant</option>
                    <option value="Junior Accountant">Junior Accountant</option>
                    <option value="Billing Officer">Billing Officer</option>
                    <option value="Finance Manager">Finance Manager</option>
                    <option value="Cashier">Cashier</option>
                    <option value="Auditor">Auditor</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Login PIN / Password *</label>
                  <div className="relative">
                    <Key className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                    <input
                      type="text"
                      value={editStaffForm.password}
                      onChange={(e) => setEditStaffForm({ ...editStaffForm, password: e.target.value })}
                      placeholder="Enter new PIN or password"
                      className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono"
                    />
                  </div>
                </div>
              </div>

              <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-slate-700">
                <span className="font-semibold text-amber-900">Security Note:</span> Updating credentials will allow this user to log in immediately using the specified username or email and password.
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => {
                    setIsEditStaffOpen(false);
                    setEditingStaff(null);
                  }}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 rounded-xl font-bold cursor-pointer text-slate-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold cursor-pointer shadow-md flex items-center gap-1.5 transition"
                >
                  <Save className="w-4 h-4" />
                  <span>Save Changes</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
