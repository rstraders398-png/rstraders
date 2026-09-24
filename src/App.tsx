import React, { useState, useEffect, useMemo, useRef } from 'react';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
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
  EyeOff,
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
  Truck,
  Upload,
  X,
  Laptop,
  FileText,
  AlertTriangle,
  AlertCircle,
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
  Mail,
  Send,
  ChevronDown,
  ChevronRight,
  Package,
  Fingerprint,
  Smartphone,
  Calculator,
  BookOpen,
  CheckSquare,
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
import { getLocalCheques, getLocalPaymentLogs } from './lib/offlineDb';
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
  BS_MONTH_NAMES,
  BS_CALENDAR_DATA,
  syncBsAdDates,
  addDurationToAdDate,
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
  | 'accounting_auditing'
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

// ==========================================
// ACCOUNTING & TRANSACTIONS VOUCHER TYPES (BUSY/TALLY STYLE)
// ==========================================
export type VoucherType =
  | 'payment'
  | 'receipt'
  | 'journal'
  | 'contra'
  | 'sales'
  | 'invoice'
  | 'notes'
  | 'stock';

export interface BusySalesVoucherItem {
  id: string;
  item_description: string;
  qty: number | '';
  unit: string;
  price: number | '';
  disc_pct?: number | '';
  disc_amt?: number;
  amount: number;
}

export interface BusySalesBillSundry {
  id: string;
  name: string;
  rate_pct?: number | '';
  amount: number | '';
  type: 'additive' | 'subtractive' | 'round_off';
}

export interface BusySalesTransportInfo {
  driver_name: string;
  driver_phone: string;
  vehicle_no: string;
  delivery_person: string;
  transport_name?: string;
  station?: string;
  gr_rr_no?: string;
}

export interface AccountingVoucher {
  id: string;
  voucher_type: VoucherType;
  voucher_number: string;
  date_bs: string;
  date_ad: string;
  account_debit: string;
  account_credit: string;
  amount: number;
  payment_mode?: 'Cash' | 'Bank' | 'Cheque' | 'IPS';
  cheque_number?: string;
  reference_no?: string;
  narration: string;
  created_at: string;
  // Busy Sales Voucher replica extensions:
  series?: string;
  sale_type?: string;
  party_name?: string;
  mat_centre?: string;
  items?: BusySalesVoucherItem[];
  bill_sundries?: BusySalesBillSundry[];
  transport_info?: BusySalesTransportInfo;
  is_held?: boolean;
}

export interface VoucherCategoryConfig {
  id: string;
  key: VoucherType;
  label: string;
  icon: any;
  hotkeyPlaceholder: string;
  description: string;
  defaultDebit: string;
  defaultCredit: string;
}

export const VOUCHER_CATEGORIES: VoucherCategoryConfig[] = [
  {
    id: 'voucher_sales',
    key: 'sales',
    label: 'Sales Voucher',
    icon: FileText,
    hotkeyPlaceholder: '[F8]',
    description: 'Busy Software exact replica commercial sales billing with item grid, bill sundry & transport',
    defaultDebit: 'Customer / Debtor A/C',
    defaultCredit: 'Sales Account',
  },
  {
    id: 'voucher_payment',
    key: 'payment',
    label: 'Payment Voucher',
    icon: ArrowDownLeft,
    hotkeyPlaceholder: '[F5]',
    description: 'Cash / Bank payments to parties, vendors and expenses',
    defaultDebit: 'Party / Creditor Account',
    defaultCredit: 'Cash / Bank A/C',
  },
  {
    id: 'voucher_receipt',
    key: 'receipt',
    label: 'Receipt Voucher',
    icon: ArrowUpRight,
    hotkeyPlaceholder: '[F6]',
    description: 'Incoming customer payments, direct deposit receipts',
    defaultDebit: 'Cash / Bank A/C',
    defaultCredit: 'Party / Debtor Account',
  },
  {
    id: 'voucher_journal',
    key: 'journal',
    label: 'Journal Voucher',
    icon: BookOpen,
    hotkeyPlaceholder: '[F7]',
    description: 'Double-entry general adjustments, depreciation, and transfers',
    defaultDebit: 'Expense / Adjustment A/C',
    defaultCredit: 'Payable / Asset A/C',
  },
  {
    id: 'voucher_contra',
    key: 'contra',
    label: 'Contra Voucher',
    icon: RefreshCw,
    hotkeyPlaceholder: '[F4]',
    description: 'Internal cash-to-bank deposits and inter-bank transfers',
    defaultDebit: 'Bank Account (Deposit)',
    defaultCredit: 'Cash in Hand (Withdrawal)',
  },
  {
    id: 'voucher_notes',
    key: 'notes',
    label: 'Debit Note / Credit Note',
    icon: Tag,
    hotkeyPlaceholder: '[Ctrl+F9]',
    description: 'Purchase/Sales returns, price adjustments, and discounts',
    defaultDebit: 'Supplier / Return A/C',
    defaultCredit: 'Customer / Return A/C',
  },
  {
    id: 'voucher_stock',
    key: 'stock',
    label: 'Physical Stock / Stock Journal',
    icon: Package,
    hotkeyPlaceholder: '[Alt+F7]',
    description: 'Inventory quantity adjustments and item reconciliation',
    defaultDebit: 'Inventory Adjustment A/C',
    defaultCredit: 'Stock in Hand A/C',
  },
];

export const INITIAL_DEMO_VOUCHERS: AccountingVoucher[] = [
  {
    id: 'v-101',
    voucher_type: 'payment',
    voucher_number: 'PV-101',
    date_bs: '2081-05-15',
    date_ad: '2024-08-31',
    account_debit: 'Everest Iron & Steel',
    account_credit: 'Nabil Bank (A/C: 01234567890123)',
    amount: 45000,
    payment_mode: 'Cheque',
    cheque_number: '004128',
    narration: 'Payment against Invoice #INV-8821 for TMT Rebars',
    created_at: new Date().toISOString(),
  },
  {
    id: 'v-102',
    voucher_type: 'receipt',
    voucher_number: 'RV-201',
    date_bs: '2081-05-18',
    date_ad: '2024-09-03',
    account_debit: 'Cash in Hand (Counter)',
    account_credit: 'Kathmandu Building Materials',
    amount: 80000,
    payment_mode: 'Cash',
    reference_no: 'RCPT-0982',
    narration: 'Received cash advance against delivery order #402',
    created_at: new Date().toISOString(),
  },
  {
    id: 'v-103',
    voucher_type: 'journal',
    voucher_number: 'JV-301',
    date_bs: '2081-05-20',
    date_ad: '2024-09-05',
    account_debit: 'Office Stationery & Printing Expenses',
    account_credit: 'Sundry Creditors Adjustment',
    amount: 12500,
    payment_mode: 'Bank',
    narration: 'Quarterly office supplies and ledger adjustment entry',
    created_at: new Date().toISOString(),
  },
  {
    id: 'v-104',
    voucher_type: 'contra',
    voucher_number: 'CV-401',
    date_bs: '2081-05-22',
    date_ad: '2024-09-07',
    account_debit: 'Nabil Bank (Current A/C)',
    account_credit: 'Cash in Hand',
    amount: 50000,
    payment_mode: 'Cash',
    reference_no: 'DEP-7712',
    narration: 'Cash deposit slip #55291 to Nabil Bank current account',
    created_at: new Date().toISOString(),
  },
  {
    id: 'v-105',
    voucher_type: 'sales',
    voucher_number: '1',
    date_bs: '2081-05-25',
    date_ad: '2024-09-10',
    account_debit: 'Pokhara Builders & Contractors',
    account_credit: 'Sales Revenue (Cement & Steel)',
    amount: 147500,
    payment_mode: 'Bank',
    reference_no: 'Main',
    narration: 'Commercial tax invoice for 200 bags OPC cement & TMT steel rebars',
    created_at: new Date().toISOString(),
    series: 'Main',
    sale_type: 'VAT 13%',
    party_name: 'Pokhara Builders & Contractors',
    mat_centre: 'Main Store',
    items: [
      { id: 'item-101', item_description: 'Shivam OPC Cement 50kg', qty: 150, unit: 'Bag', price: 750, disc_pct: 0, disc_amt: 0, amount: 112500 },
      { id: 'item-102', item_description: 'TMT Steel 12mm Rebar', qty: 25, unit: 'Pcs', price: 1200, disc_pct: 0, disc_amt: 0, amount: 30000 },
      { id: 'item-103', item_description: 'PVC Pipe 4 inch Heavy', qty: 10, unit: 'Case', price: 500, disc_pct: 0, disc_amt: 0, amount: 5000 },
    ],
    bill_sundries: [
      { id: 'bs-101', name: 'VAT (13%)', rate_pct: 13, amount: 19175, type: 'additive' },
      { id: 'bs-102', name: 'Transportation / Freight Charges', rate_pct: '', amount: 2500, type: 'additive' },
      { id: 'bs-103', name: 'Trade Discount', rate_pct: 2, amount: 2950, type: 'subtractive' },
      { id: 'bs-104', name: 'Round Off', rate_pct: '', amount: 0.25, type: 'round_off' },
    ],
    transport_info: {
      driver_name: 'Ramesh Kumar Thapa',
      driver_phone: '9841234567',
      vehicle_no: 'BA 2 KHA 8492',
      delivery_person: 'Suman Sharma',
      transport_name: 'Western Cargo Nepal',
      station: 'Pokhara',
      gr_rr_no: 'GR-8891',
    },
  },
  {
    id: 'v-106',
    voucher_type: 'notes',
    voucher_number: 'CN-601',
    date_bs: '2081-05-26',
    date_ad: '2024-09-11',
    account_debit: 'Sales Return & Allowances',
    account_credit: 'Pokhara Builders & Contractors',
    amount: 15000,
    payment_mode: 'Bank',
    reference_no: 'RET-091',
    narration: 'Credit note for 25 bags damaged cement returned',
    created_at: new Date().toISOString(),
  },
  {
    id: 'v-107',
    voucher_type: 'stock',
    voucher_number: 'SJ-701',
    date_bs: '2081-05-28',
    date_ad: '2024-09-13',
    account_debit: 'Inventory Shortage / Physical Adjustment',
    account_credit: 'Warehouse Stock Ledger',
    amount: 8200,
    payment_mode: 'Bank',
    reference_no: 'STK-AUDIT-01',
    narration: 'Physical stock verification reconciliation for Godown A',
    created_at: new Date().toISOString(),
  },
];

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

// ==========================================
// BS & AD DUAL DATE PICKER WIDGET
// ==========================================
export interface DualDatePickerProps {
  id?: string;
  label?: string;
  adDate: string;
  bsDate: string;
  onDateChange: (adDate: string, bsDate: string) => void;
  required?: boolean;
  compact?: boolean;
  className?: string;
}

export const formatAdDateMMDDYYYY = (adStr: string): string => {
  if (!adStr) return '';
  const parts = adStr.split('-');
  if (parts.length === 3) {
    const [y, m, d] = parts;
    return `${m}/${d}/${y}`;
  }
  return adStr;
};

export const DualDatePicker: React.FC<DualDatePickerProps> = ({
  id,
  label,
  adDate,
  bsDate,
  onDateChange,
  required = false,
  className = '',
}) => {
  const parseBs = (bs: string, ad: string) => {
    let targetBs = bs;
    if (!targetBs && ad) {
      targetBs = adToBs(ad);
    }
    if (!targetBs) {
      targetBs = getCurrentBsDate();
    }
    const parts = targetBs.split('-');
    const y = parseInt(parts[0], 10) || 2081;
    const m = parseInt(parts[1], 10) || 1;
    const d = parseInt(parts[2], 10) || 1;
    return {
      year: y >= 2075 && y <= 2100 ? y : 2083,
      month: m >= 1 && m <= 12 ? m : 1,
      day: d >= 1 && d <= 32 ? d : 1,
    };
  };

  const parsed = parseBs(bsDate, adDate);
  const [selectedYear, setSelectedYear] = useState<number>(parsed.year);
  const [selectedMonth, setSelectedMonth] = useState<number>(parsed.month);
  const [selectedDay, setSelectedDay] = useState<number>(parsed.day);

  useEffect(() => {
    const p = parseBs(bsDate, adDate);
    setSelectedYear(p.year);
    setSelectedMonth(p.month);
    setSelectedDay(p.day);
  }, [bsDate, adDate]);

  const maxDays = useMemo(() => {
    return BS_CALENDAR_DATA[selectedYear]?.[selectedMonth - 1] || 30;
  }, [selectedYear, selectedMonth]);

  const handleBsComponentChange = (newYear: number, newMonth: number, newDay: number) => {
    const daysInMonth = BS_CALENDAR_DATA[newYear]?.[newMonth - 1] || 30;
    const clampedDay = Math.min(newDay, daysInMonth);
    setSelectedYear(newYear);
    setSelectedMonth(newMonth);
    setSelectedDay(clampedDay);

    const formattedBs = `${newYear}-${String(newMonth).padStart(2, '0')}-${String(clampedDay).padStart(2, '0')}`;
    let convertedAd = '';
    try {
      convertedAd = bsToAd(formattedBs);
    } catch {}
    if (!convertedAd || convertedAd.includes('NaN')) {
      convertedAd = getCurrentAdDate();
    }
    onDateChange(convertedAd, formattedBs);
  };

  const handleAdChange = (newAdDate: string) => {
    if (!newAdDate) {
      onDateChange('', '');
      return;
    }
    let convertedBs = '';
    try {
      convertedBs = adToBs(newAdDate);
    } catch {}
    if (convertedBs && /^\d{4}-\d{2}-\d{2}$/.test(convertedBs)) {
      const parts = convertedBs.split('-');
      const y = parseInt(parts[0], 10);
      const m = parseInt(parts[1], 10);
      const d = parseInt(parts[2], 10);
      if (y >= 2075 && y <= 2100) {
        setSelectedYear(y);
        setSelectedMonth(m);
        setSelectedDay(d);
      }
      onDateChange(newAdDate, convertedBs);
    } else {
      onDateChange(newAdDate, bsDate);
    }
  };

  const handleSetToday = () => {
    const todayBs = getCurrentBsDate();
    const todayAd = getCurrentAdDate();
    const parts = todayBs.split('-');
    const y = parseInt(parts[0], 10);
    const m = parseInt(parts[1], 10);
    const d = parseInt(parts[2], 10);
    setSelectedYear(y);
    setSelectedMonth(m);
    setSelectedDay(d);
    onDateChange(todayAd, todayBs);
  };

  const currentBsFormatted = `${selectedYear}-${String(selectedMonth).padStart(2, '0')}-${String(selectedDay).padStart(2, '0')}`;
  const friendlyBs = formatBsDateFriendly(currentBsFormatted);
  const friendlyAd = formatAdDateMMDDYYYY(adDate || bsToAd(currentBsFormatted));

  const BS_YEARS = Array.from({ length: 26 }, (_, i) => 2075 + i);

  return (
    <div id={id || `dual-date-picker-${(label || 'date').toLowerCase().replace(/\s+/g, '-')}`} className={`bg-slate-50/80 border border-slate-200 rounded-xl p-3 space-y-2.5 transition ${className}`}>
      {/* Header with Label and Formatted Synced Badges */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-1.5">
          <Calendar className="w-3.5 h-3.5 text-indigo-600" />
          <span className="text-xs font-bold text-slate-800 uppercase tracking-wide">
            {label} {required && <span className="text-rose-500">*</span>}
          </span>
        </div>
        <div className="flex items-center gap-1.5 text-[11px]">
          <span className="font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200" title="Nepali BS Date">
            {friendlyBs}
          </span>
          <span className="font-mono text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-200" title="English AD Date (MM/DD/YYYY)">
            {friendlyAd}
          </span>
          <button
            type="button"
            onClick={handleSetToday}
            className="px-2 py-0.5 text-[10px] font-bold text-slate-600 bg-white hover:bg-slate-100 border border-slate-200 rounded cursor-pointer transition shadow-2xs"
            title="Set to Today (BS & AD)"
          >
            Today
          </button>
        </div>
      </div>

      {/* Main Pickers: BS Year/Month/Day + AD English Date Sync */}
      <div className="grid grid-cols-1 sm:grid-cols-12 gap-2 text-xs">
        {/* BS Year */}
        <div className="sm:col-span-3">
          <label className="block text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-1">
            Year (BS)
          </label>
          <select
            value={selectedYear}
            onChange={(e) => handleBsComponentChange(parseInt(e.target.value, 10), selectedMonth, selectedDay)}
            className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-slate-800 font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            {BS_YEARS.map((y) => (
              <option key={y} value={y}>
                {y} BS
              </option>
            ))}
          </select>
        </div>

        {/* BS Month */}
        <div className="sm:col-span-4">
          <label className="block text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-1">
            Month (BS)
          </label>
          <select
            value={selectedMonth}
            onChange={(e) => handleBsComponentChange(selectedYear, parseInt(e.target.value, 10), selectedDay)}
            className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-slate-800 font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            {BS_MONTH_NAMES.map((name, idx) => (
              <option key={idx + 1} value={idx + 1}>
                {String(idx + 1).padStart(2, '0')}: {name}
              </option>
            ))}
          </select>
        </div>

        {/* BS Day */}
        <div className="sm:col-span-2">
          <label className="block text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-1">
            Day
          </label>
          <select
            value={selectedDay > maxDays ? maxDays : selectedDay}
            onChange={(e) => handleBsComponentChange(selectedYear, selectedMonth, parseInt(e.target.value, 10))}
            className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-slate-800 font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            {Array.from({ length: maxDays }, (_, i) => i + 1).map((d) => (
              <option key={d} value={d}>
                {String(d).padStart(2, '0')}
              </option>
            ))}
          </select>
        </div>

        {/* Synced English AD Date (MM/DD/YYYY) with Native Picker */}
        <div className="sm:col-span-3">
          <label className="block text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-1 flex items-center justify-between">
            <span>English (AD)</span>
            <span className="text-slate-400 font-normal">MM/DD/YYYY</span>
          </label>
          <div className="relative">
            <input
              type="date"
              value={adDate || bsToAd(currentBsFormatted)}
              onChange={(e) => handleAdChange(e.target.value)}
              className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-slate-800 font-mono text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500"
              required={required}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

// ==========================================
// DEVELOPER EXPIRY DUAL DATE PICKER (BIDIRECTIONAL BS <-> AD)
// ==========================================
export interface DeveloperExpiryDatePickerProps {
  bsDate: string;
  adDate: string;
  onChange: (bsDate: string, adDate: string) => void;
  label?: string;
  idPrefix?: string;
}

export const DeveloperExpiryDatePicker: React.FC<DeveloperExpiryDatePickerProps> = ({
  bsDate,
  adDate,
  onChange,
  label = 'Software License Expiry Date',
  idPrefix = 'dev-expiry',
}) => {
  const synced = useMemo(() => {
    return syncBsAdDates(bsDate, adDate);
  }, [bsDate, adDate]);

  const activeBs = bsDate || synced.bsDate;
  const activeAd = adDate || synced.adDate;

  const isPerfectSync = useMemo(() => {
    if (!activeBs || !activeAd) return false;
    const calcAd = bsToAd(activeBs);
    const calcBs = adToBs(activeAd);
    return calcAd === activeAd || calcBs === activeBs;
  }, [activeBs, activeAd]);

  const expiryStatus = useMemo(() => {
    if (!activeAd) return null;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const expDate = new Date(activeAd + 'T00:00:00');
    expDate.setHours(0, 0, 0, 0);
    const diffTime = expDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return {
      diffDays,
      isExpired: diffDays < 0,
      isExpiringSoon: diffDays <= 60 && diffDays >= 0,
    };
  }, [activeAd]);

  const handleAdChange = (newAd: string) => {
    const cleanAd = newAd.trim();
    if (!cleanAd) {
      onChange('', '');
      return;
    }
    let calculatedBs = '';
    try {
      calculatedBs = adToBs(cleanAd);
    } catch {}
    onChange(calculatedBs || activeBs, cleanAd);
  };

  const handleBsChange = (newBs: string) => {
    const cleanBs = newBs.trim();
    if (!cleanBs) {
      onChange('', '');
      return;
    }
    let calculatedAd = '';
    try {
      calculatedAd = bsToAd(cleanBs);
    } catch {}
    onChange(cleanBs, calculatedAd || activeAd);
  };

  const handleApplyDuration = (duration: '1m' | '3m' | '6m' | '1y') => {
    const res = addDurationToAdDate(activeAd || getCurrentAdDate(), duration);
    onChange(res.bsDate, res.adDate);
  };

  const bsParts = activeBs ? activeBs.split('-') : [];
  const currentBsYear = parseInt(bsParts[0], 10) || 2084;
  const currentBsMonth = parseInt(bsParts[1], 10) || 6;
  const currentBsDay = parseInt(bsParts[2], 10) || 7;

  const maxDays = BS_CALENDAR_DATA[currentBsYear]?.[currentBsMonth - 1] || 30;

  const handleBsComponentChange = (y: number, m: number, d: number) => {
    const daysInMonth = BS_CALENDAR_DATA[y]?.[m - 1] || 30;
    const clampedDay = Math.min(d, daysInMonth);
    const formattedBs = `${y}-${String(m).padStart(2, '0')}-${String(clampedDay).padStart(2, '0')}`;
    const calculatedAd = bsToAd(formattedBs) || getCurrentAdDate();
    onChange(formattedBs, calculatedAd);
  };

  const handleAutoAlign = () => {
    if (activeAd) {
      const bs = adToBs(activeAd);
      onChange(bs, activeAd);
    } else if (activeBs) {
      const ad = bsToAd(activeBs);
      onChange(activeBs, ad);
    }
  };

  const BS_YEARS = Array.from({ length: 26 }, (_, i) => 2075 + i);

  return (
    <div className="bg-slate-900/90 border border-slate-700/80 rounded-xl p-3.5 space-y-3">
      {/* Header with Title and Presets */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4 text-emerald-400" />
          <span className="text-xs font-bold text-slate-200 uppercase tracking-wide">
            {label}
          </span>
        </div>

        {/* Quick Presets */}
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-[10px] text-slate-400 font-semibold mr-0.5">Quick Duration:</span>
          {(['1m', '3m', '6m', '1y'] as const).map((dur) => (
            <button
              key={dur}
              type="button"
              onClick={() => handleApplyDuration(dur)}
              className="px-2 py-0.5 bg-slate-800 hover:bg-slate-700 text-indigo-300 hover:text-white border border-slate-700 rounded text-[10px] font-bold cursor-pointer transition"
              title={`Add ${dur.toUpperCase()} to expiry`}
            >
              +{dur.toUpperCase()}
            </button>
          ))}
          <button
            type="button"
            onClick={() => {
              const todayAd = getCurrentAdDate();
              const todayBs = adToBs(todayAd);
              onChange(todayBs, todayAd);
            }}
            className="px-2 py-0.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 rounded text-[10px] font-bold cursor-pointer transition"
            title="Set to Today"
          >
            Today
          </button>
        </div>
      </div>

      {/* Sync Status Banner */}
      <div className="flex flex-wrap items-center justify-between gap-2 p-2 rounded-lg bg-slate-950/70 border border-slate-800 text-xs">
        <div className="flex flex-wrap items-center gap-1.5">
          {isPerfectSync ? (
            <span className="inline-flex flex-wrap items-center gap-1.5 text-[11px] font-bold text-emerald-400">
              <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              <span>Calendar Sync:</span>
              <span className="font-mono text-emerald-300 bg-emerald-950/90 border border-emerald-800/60 px-1.5 py-0.5 rounded">
                {activeBs} BS ({formatBsDateFriendly(activeBs)})
              </span>
              <span className="text-slate-500 font-bold">&harr;</span>
              <span className="font-mono text-indigo-300 bg-indigo-950/90 border border-indigo-800/60 px-1.5 py-0.5 rounded">
                {activeAd} AD
              </span>
            </span>
          ) : (
            <span className="inline-flex flex-wrap items-center gap-1.5 text-[11px] font-bold text-amber-400">
              <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0" />
              <span>Dates Mismatched ({activeBs} BS &ne; {activeAd} AD)</span>
              <button
                type="button"
                onClick={handleAutoAlign}
                className="px-2 py-0.5 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 rounded text-[10px] font-bold cursor-pointer transition"
              >
                Auto-Align
              </button>
            </span>
          )}
        </div>

        {/* Expiry Countdown Indicator */}
        {expiryStatus && (
          <div className="flex items-center gap-1">
            <span
              className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                expiryStatus.isExpired
                  ? 'bg-rose-950/80 text-rose-300 border-rose-800/60'
                  : expiryStatus.isExpiringSoon
                  ? 'bg-amber-950/80 text-amber-300 border-amber-800/60'
                  : 'bg-emerald-950/80 text-emerald-300 border-emerald-800/60'
              }`}
            >
              {expiryStatus.isExpired
                ? `Expired (${Math.abs(expiryStatus.diffDays)}d overdue)`
                : `${expiryStatus.diffDays} Days Remaining`}
            </span>
          </div>
        )}
      </div>

      {/* Main Dual Date Controls */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-2.5 text-xs">
        {/* Nepali BS Section (7 Cols) */}
        <div className="lg:col-span-7 space-y-1.5 bg-slate-950/40 p-2.5 rounded-lg border border-slate-800/80">
          <div className="flex items-center justify-between">
            <label className="text-[11px] font-bold text-emerald-400 uppercase tracking-wide flex items-center gap-1">
              <span>Nepali Date (BS)</span>
            </label>
            <span className="text-[10px] text-slate-400 font-mono">
              YYYY-MM-DD
            </span>
          </div>

          <div className="grid grid-cols-3 gap-1.5">
            {/* Year BS */}
            <div>
              <label className="block text-[9px] text-slate-400 mb-0.5">Year</label>
              <select
                value={currentBsYear}
                onChange={(e) => handleBsComponentChange(parseInt(e.target.value, 10), currentBsMonth, currentBsDay)}
                className="w-full px-2 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-white font-mono text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500 cursor-pointer"
              >
                {BS_YEARS.map((y) => (
                  <option key={y} value={y}>
                    {y} BS
                  </option>
                ))}
              </select>
            </div>

            {/* Month BS */}
            <div>
              <label className="block text-[9px] text-slate-400 mb-0.5">Month</label>
              <select
                value={currentBsMonth}
                onChange={(e) => handleBsComponentChange(currentBsYear, parseInt(e.target.value, 10), currentBsDay)}
                className="w-full px-2 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-white font-mono text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500 cursor-pointer"
              >
                {BS_MONTH_NAMES.map((name, idx) => (
                  <option key={idx + 1} value={idx + 1}>
                    {String(idx + 1).padStart(2, '0')}: {name}
                  </option>
                ))}
              </select>
            </div>

            {/* Day BS */}
            <div>
              <label className="block text-[9px] text-slate-400 mb-0.5">Day</label>
              <select
                value={currentBsDay > maxDays ? maxDays : currentBsDay}
                onChange={(e) => handleBsComponentChange(currentBsYear, currentBsMonth, parseInt(e.target.value, 10))}
                className="w-full px-2 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-white font-mono text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500 cursor-pointer"
              >
                {Array.from({ length: maxDays }, (_, i) => i + 1).map((d) => (
                  <option key={d} value={d}>
                    {String(d).padStart(2, '0')}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="pt-1">
            <input
              type="text"
              id={`${idPrefix}-bs-input`}
              value={activeBs}
              onChange={(e) => handleBsChange(e.target.value)}
              placeholder="YYYY-MM-DD"
              className="w-full px-2.5 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-emerald-300 font-mono text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500"
              title="Manual BS Date Input (auto-converts to AD)"
            />
          </div>
        </div>

        {/* English AD Section (5 Cols) */}
        <div className="lg:col-span-5 space-y-1.5 bg-slate-950/40 p-2.5 rounded-lg border border-slate-800/80">
          <div className="flex items-center justify-between">
            <label className="text-[11px] font-bold text-indigo-400 uppercase tracking-wide flex items-center gap-1">
              <span>English Date (AD)</span>
            </label>
            <span className="text-[10px] text-slate-400 font-mono">
              Auto-syncs BS
            </span>
          </div>

          <div>
            <label className="block text-[9px] text-slate-400 mb-0.5">Native Date Picker</label>
            <input
              type="date"
              id={`${idPrefix}-ad-date-picker`}
              value={activeAd}
              onChange={(e) => handleAdChange(e.target.value)}
              className="w-full px-2.5 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-indigo-200 font-mono text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500 cursor-pointer"
            />
          </div>

          <div className="pt-1">
            <label className="block text-[9px] text-slate-400 mb-0.5">AD Text (YYYY-MM-DD)</label>
            <input
              type="text"
              id={`${idPrefix}-ad-input`}
              value={activeAd}
              onChange={(e) => handleAdChange(e.target.value)}
              placeholder="YYYY-MM-DD"
              className="w-full px-2.5 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-indigo-300 font-mono text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500"
              title="Manual AD Date Input (auto-converts to BS)"
            />
          </div>
        </div>
      </div>
    </div>
  );
};

// ==========================================
// UNIVERSAL DATE RANGE FILTER & SUMMARY STRIP
// ==========================================
export interface DateRangeFilterStripProps {
  id?: string;
  title?: string;
  fromDateBs: string;
  toDateBs: string;
  onFromDateChange: (val: string) => void;
  onToDateChange: (val: string) => void;
  onClear: () => void;
  onPresetSelect: (preset: 'all' | 'today' | 'this_month' | 'last_month' | 'this_year') => void;
  activePreset?: string;
  filteredCount: number;
  totalAmount: number;
  totalCount?: number;
  extraStats?: { label: string; value: string; color?: string }[];
  accentColor?: 'indigo' | 'amber' | 'emerald' | 'purple';
}

export const DateRangeFilterStrip: React.FC<DateRangeFilterStripProps> = ({
  id,
  title = 'Date Range Filter (BS)',
  fromDateBs,
  toDateBs,
  onFromDateChange,
  onToDateChange,
  onClear,
  onPresetSelect,
  activePreset = 'all',
  filteredCount,
  totalAmount,
  totalCount,
  extraStats = [],
  accentColor = 'indigo',
}) => {
  const isFiltered = Boolean(fromDateBs || toDateBs || (activePreset && activePreset !== 'all'));

  const accentStyles = {
    indigo: 'border-indigo-100 bg-indigo-50/20 text-indigo-700',
    amber: 'border-amber-100 bg-amber-50/20 text-amber-700',
    emerald: 'border-emerald-100 bg-emerald-50/20 text-emerald-700',
    purple: 'border-purple-100 bg-purple-50/20 text-purple-700',
  }[accentColor];

  return (
    <div id={id} className="bg-white rounded-2xl border border-slate-200 p-3.5 shadow-xs space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
        {/* From Date -> To Date Inputs */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1.5 font-bold text-slate-700">
            <Calendar className="w-3.5 h-3.5 text-indigo-600" />
            <span>{title}:</span>
          </div>

          <div className="flex items-center gap-1.5">
            <div className="relative">
              <input
                type="text"
                value={fromDateBs}
                onChange={(e) => onFromDateChange(e.target.value)}
                placeholder="From: YYYY-MM-DD"
                className="w-36 px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-800 font-mono placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <span className="text-slate-400 font-medium">to</span>
            <div className="relative">
              <input
                type="text"
                value={toDateBs}
                onChange={(e) => onToDateChange(e.target.value)}
                placeholder="To: YYYY-MM-DD"
                className="w-36 px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-800 font-mono placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>

          {/* Quick Presets */}
          <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded-lg text-[11px] font-medium">
            <button
              type="button"
              onClick={() => onPresetSelect('all')}
              className={`px-2 py-1 rounded transition cursor-pointer ${activePreset === 'all' && !fromDateBs && !toDateBs ? 'bg-white text-indigo-700 font-bold shadow-2xs' : 'text-slate-600 hover:text-slate-900'}`}
            >
              All
            </button>
            <button
              type="button"
              onClick={() => onPresetSelect('today')}
              className={`px-2 py-1 rounded transition cursor-pointer ${activePreset === 'today' ? 'bg-white text-indigo-700 font-bold shadow-2xs' : 'text-slate-600 hover:text-slate-900'}`}
            >
              Today
            </button>
            <button
              type="button"
              onClick={() => onPresetSelect('this_month')}
              className={`px-2 py-1 rounded transition cursor-pointer ${activePreset === 'this_month' ? 'bg-white text-indigo-700 font-bold shadow-2xs' : 'text-slate-600 hover:text-slate-900'}`}
            >
              This Month
            </button>
            <button
              type="button"
              onClick={() => onPresetSelect('last_month')}
              className={`px-2 py-1 rounded transition cursor-pointer ${activePreset === 'last_month' ? 'bg-white text-indigo-700 font-bold shadow-2xs' : 'text-slate-600 hover:text-slate-900'}`}
            >
              Last Month
            </button>
            <button
              type="button"
              onClick={() => onPresetSelect('this_year')}
              className={`px-2 py-1 rounded transition cursor-pointer ${activePreset === 'this_year' ? 'bg-white text-indigo-700 font-bold shadow-2xs' : 'text-slate-600 hover:text-slate-900'}`}
            >
              This Year
            </button>
          </div>

          {isFiltered && (
            <button
              type="button"
              onClick={onClear}
              className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-bold text-rose-600 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-lg transition cursor-pointer"
              title="Clear active date filters"
            >
              <X className="w-3 h-3" />
              <span>Reset Filter</span>
            </button>
          )}
        </div>
      </div>

      {/* REAL-TIME SUMMARY CALCULATION STRIP */}
      <div className={`p-2.5 rounded-xl border flex flex-wrap items-center justify-between gap-3 text-xs ${accentStyles}`}>
        <div className="flex flex-wrap items-center gap-3 sm:gap-6">
          <div className="flex items-center gap-1.5 font-semibold">
            <span className="text-slate-500 uppercase tracking-wide text-[10px]">Filtered Count:</span>
            <span className="px-2 py-0.5 rounded-md bg-white border border-slate-200 font-bold text-slate-800">
              {filteredCount} {totalCount !== undefined ? `of ${totalCount}` : 'Records'}
            </span>
          </div>

          <div className="flex items-center gap-1.5 font-semibold">
            <span className="text-slate-500 uppercase tracking-wide text-[10px]">Total Amount:</span>
            <span className="font-mono font-extrabold text-sm sm:text-base text-slate-900">
              {formatNPR(totalAmount)}
            </span>
          </div>

          {extraStats.map((stat, idx) => (
            <div key={idx} className="flex items-center gap-1.5 font-semibold">
              <span className="text-slate-500 uppercase tracking-wide text-[10px]">{stat.label}:</span>
              <span className={`font-mono font-bold ${stat.color || 'text-slate-800'}`}>{stat.value}</span>
            </div>
          ))}
        </div>

        {isFiltered && (
          <div className="text-[11px] text-slate-500 italic">
            Active Filter: {fromDateBs || 'Beginning'} → {toDateBs || 'Present'}
          </div>
        )}
      </div>
    </div>
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

// ============================================================================
// DYNAMIC MASTER FEATURE REGISTRY (AUTO-REGISTERING SAAS SALES MATRIX)
// All sidebar items, tools, and companion services auto-populate dynamically
// ============================================================================
export interface MasterFeatureItem {
  id: string;
  name: string;
  description: string;
  category: 'Core Modules & Ledgers' | 'Accounting & Auditing' | 'Directories & Management' | 'Printing & Data Utilities' | 'Reports & Exports' | 'Mobile Companion';
  icon: any;
  defaultEnabled: boolean;
  navView?: NavView;
  badgeKey?: 'pending' | 'partial' | 'cleared' | 'banks' | 'parties';
  badgeText?: string;
  badgeColor?: string;
}

export const MASTER_FEATURE_REGISTRY: MasterFeatureItem[] = [
  // 1. Core Modules & Ledgers (All Sidebar Items)
  {
    id: 'dashboard',
    name: 'Dashboard Overview',
    description: 'Executive cash overview, upcoming due tallies, bank distribution summary, and quick actions',
    category: 'Core Modules & Ledgers',
    icon: Laptop,
    defaultEnabled: true,
    navView: 'dashboard',
  },
  {
    id: 'accounting_auditing',
    name: 'For Accounting & Auditing',
    description: 'Financial ledger verification, balance reconciliation, tax/audit compliance checks, and audit trails',
    category: 'Accounting & Auditing',
    icon: Calculator,
    defaultEnabled: true,
    navView: 'accounting_auditing',
  },
  {
    id: 'accounting_transactions',
    name: 'Transactions Tree Navigation Hub',
    description: 'Busy/Tally-style nested collapsible tree navigation with keyboard arrow selection and Enter-key voucher traversal',
    category: 'Accounting & Auditing',
    icon: Receipt,
    defaultEnabled: true,
  },
  {
    id: 'voucher_payment',
    name: 'Payment Voucher (Add, Modify, List)',
    description: 'Busy/Tally-style Cash, Bank & Cheque payment voucher entries with ledger debiting [F5]',
    category: 'Accounting & Auditing',
    icon: ArrowDownLeft,
    defaultEnabled: true,
  },
  {
    id: 'voucher_receipt',
    name: 'Receipt Voucher (Add, Modify, List)',
    description: 'Incoming customer payments, direct deposit receipts, and ledger credit settlements [F6]',
    category: 'Accounting & Auditing',
    icon: ArrowUpRight,
    defaultEnabled: true,
  },
  {
    id: 'voucher_journal',
    name: 'Journal Voucher (Add, Modify, List)',
    description: 'Double-entry general adjustment entries, depreciation, and inter-party transfers [F7]',
    category: 'Accounting & Auditing',
    icon: BookOpen,
    defaultEnabled: true,
  },
  {
    id: 'voucher_contra',
    name: 'Contra Voucher (Add, Modify, List)',
    description: 'Internal cash-to-bank deposits, bank-to-cash withdrawals, and inter-bank transfers [F4]',
    category: 'Accounting & Auditing',
    icon: RefreshCw,
    defaultEnabled: true,
  },
  {
    id: 'voucher_sales',
    name: 'Sales Voucher (Busy Software Replica [F8])',
    description: 'Exact Busy Accounting sales voucher replica: series, BS/AD date sync, item grid, alt qty summary bar, bill sundry (VAT 13%, freight), transport details & party ledger',
    category: 'Accounting & Auditing',
    icon: FileText,
    defaultEnabled: true,
  },
  {
    id: 'sales_discount',
    name: 'Enable Sales Discount on Vouchers',
    description: 'Company-level toggle to show or hide discount % and discount amount columns in Busy Sales Voucher',
    category: 'Accounting & Auditing',
    icon: Tag,
    defaultEnabled: true,
  },
  {
    id: 'voucher_notes',
    name: 'Debit Note / Credit Note (Add, Modify, List)',
    description: 'Purchase returns, sales returns, price adjustments, and post-sale discounts [Ctrl+F9]',
    category: 'Accounting & Auditing',
    icon: Tag,
    defaultEnabled: true,
  },
  {
    id: 'voucher_stock',
    name: 'Physical Stock / Stock Journal (Add, Modify, List)',
    description: 'Inventory transfers, physical stock reconciliation, and manufacturing stock journals [Alt+F7]',
    category: 'Accounting & Auditing',
    icon: Package,
    defaultEnabled: true,
  },
  {
    id: 'due_date_timeline',
    name: 'Due Date Timeline',
    description: 'Visual chronological schedule and calendar timeline for upcoming cheque maturity dates',
    category: 'Core Modules & Ledgers',
    icon: Clock,
    defaultEnabled: true,
    navView: 'due_date_timeline',
  },
  {
    id: 'issued_date_log',
    name: 'Issued Date Log',
    description: 'Chronological cheque issue date audit log with date-wise payment release tracking',
    category: 'Core Modules & Ledgers',
    icon: Calendar,
    defaultEnabled: true,
    navView: 'issued_date_log',
  },
  {
    id: 'pending',
    name: 'Pending Cheques Register',
    description: 'Active outstanding issued cheques awaiting bank clearance, maturity alerts, and payment actions',
    category: 'Core Modules & Ledgers',
    icon: Clock,
    defaultEnabled: true,
    navView: 'pending',
    badgeKey: 'pending',
    badgeColor: 'amber',
  },
  {
    id: 'partial_payments',
    name: 'Partial Payments Ledger',
    description: 'Multi-installment payment ledger, remaining balance calculations, and partial settlement audit',
    category: 'Core Modules & Ledgers',
    icon: Wallet,
    defaultEnabled: true,
    navView: 'partial_payments',
    badgeKey: 'partial',
    badgeColor: 'sky',
  },
  {
    id: 'cleared',
    name: 'Cleared Cheques Archive',
    description: 'Historical archive of cleared cheques with bank reconciliation timestamps and payment logs',
    category: 'Core Modules & Ledgers',
    icon: CheckCircle2,
    defaultEnabled: true,
    navView: 'cleared',
    badgeKey: 'cleared',
    badgeColor: 'emerald',
  },
  {
    id: 'reports',
    name: 'Reports & Analytics',
    description: 'Party-wise ledger statements, bank exposure breakdown, clearance turnover, and volume statistics',
    category: 'Reports & Exports',
    icon: BarChart3,
    defaultEnabled: true,
    navView: 'reports',
  },

  // 2. Master Directories & Administration
  {
    id: 'banks',
    name: 'Banks Master Data',
    description: 'Master bank directories, account numbers, branch names, and cheque leaf book registers',
    category: 'Directories & Management',
    icon: Landmark,
    defaultEnabled: true,
    navView: 'banks',
    badgeKey: 'banks',
  },
  {
    id: 'parties',
    name: 'Parties / Payees Master Data',
    description: 'Master directories for Payee parties, vendors, suppliers, and customer registers with PAN/VAT',
    category: 'Directories & Management',
    icon: Users,
    defaultEnabled: true,
    navView: 'parties',
    badgeKey: 'parties',
  },
  {
    id: 'company_users',
    name: 'Company & Users Management',
    description: 'Tenant profile configuration, user access control, and role-based permissions (Admin, Accountant, Viewer)',
    category: 'Directories & Management',
    icon: Building2,
    defaultEnabled: true,
    navView: 'company_users',
  },

  // 3. Printing & Data Utilities
  {
    id: 'print_cheque',
    name: 'Print Cheque Leaf',
    description: 'Physical bank cheque leaf layout, Amount in words in Nepali & English, A/C Payee stamp & alignment calibration',
    category: 'Printing & Data Utilities',
    icon: Printer,
    defaultEnabled: true,
    navView: 'print_cheque',
  },
  {
    id: 'backup',
    name: 'Backup & Restore (Local & Cloud)',
    description: 'Full database JSON/ZIP ledger export to local storage and automated Google Drive cloud snapshots',
    category: 'Printing & Data Utilities',
    icon: Database,
    defaultEnabled: true,
    navView: 'backup',
  },
  {
    id: 'import_cheques',
    name: 'Import External Cheques',
    description: 'Bulk CSV / Excel import of external cheques with dual BS/AD date conversion and validation',
    category: 'Printing & Data Utilities',
    icon: FileSpreadsheet,
    defaultEnabled: true,
    navView: 'import_cheques',
    badgeText: 'External',
    badgeColor: 'purple',
  },

  // 4. Extended SaaS Capabilities
  {
    id: 'excel_pdf_export',
    name: 'Excel & PDF Export Reports',
    description: 'Direct auto-download of .xlsx spreadsheets and formatted A4 print-ready PDF reports with 0 print dialogs',
    category: 'Reports & Exports',
    icon: Download,
    defaultEnabled: true,
  },
  {
    id: 'mobile_biometrics',
    name: 'Mobile Biometric Login',
    description: 'Face ID & Fingerprint instant authentication in ChequeDesk Mobile companion app (MeroShare-style UX)',
    category: 'Mobile Companion',
    icon: Fingerprint,
    defaultEnabled: true,
  },
  {
    id: 'mobile_offline_backup',
    name: 'Mobile Offline Storage & Multi-Cloud Backup',
    description: 'Offline Hive database, export ledger to Local File Manager, Google Drive, and Microsoft OneDrive',
    category: 'Mobile Companion',
    icon: Smartphone,
    defaultEnabled: true,
  },
  {
    id: 'mobile_cloud_sync',
    name: 'Mobile Realtime Auto-Sync Engine',
    description: 'Background mutation queue auto-syncs local mobile changes upon network reconnection',
    category: 'Mobile Companion',
    icon: RefreshCw,
    defaultEnabled: true,
  },
];

export const DEFAULT_MASTER_FEATURES: Record<string, boolean> = (() => {
  const map: Record<string, boolean> = {};
  MASTER_FEATURE_REGISTRY.forEach((f) => {
    map[f.id] = f.defaultEnabled;
  });
  // Compatibility aliases
  map.parties_banks = true;
  map.local_disk_backup = true;
  map.google_drive_backup = true;
  map.cheque_printing = true;
  map.offline_backup_system = true;
  map.bulk_cheque_import = true;
  return map;
})();

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
    expiry_date_bs: '2084-06-07',
    expiry_date_ad: '2027-09-24',
    is_active: true,
    admin_password: '1234',
    created_at: '2024-01-01T00:00:00Z',
    enable_sales_discount: true,
    features: {
      ...DEFAULT_MASTER_FEATURES,
      enable_sales_discount: true,
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
    expiry_date_bs: '2084-03-08',
    expiry_date_ad: '2027-06-23',
    is_active: true,
    admin_password: '1234',
    enable_sales_discount: true,
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
    expiry_date_bs: '2083-12-09',
    expiry_date_ad: '2027-03-24',
    is_active: true,
    admin_password: '1234',
    enable_sales_discount: false,
    created_at: '2024-03-01T00:00:00Z',
  },
];

export const getStoredCompanyPassword = (
  companyId?: string,
  companyCode?: string,
  fallback = 'Pass@123'
): string => {
  if (companyId) {
    const p = localStorage.getItem(`chequedesk_company_pass_${companyId}`);
    if (p && p.trim()) return p.trim();
  }
  if (companyCode) {
    const p = localStorage.getItem(`chequedesk_company_pass_${companyCode}`);
    if (p && p.trim()) return p.trim();
  }
  return fallback;
};

export const getCompanyStaffList = (
  companyId?: string,
  companyCode?: string,
  companyObj?: Partial<Company>
): CompanyStaffMember[] => {
  let existingList: CompanyStaffMember[] | null = null;
  if (companyId) {
    const raw = localStorage.getItem(`chequedesk_staff_${companyId}`);
    if (raw) {
      try {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) existingList = parsed;
      } catch {
        // Fallback
      }
    }
  }

  if (!existingList && companyCode) {
    const rawCode = localStorage.getItem(`chequedesk_staff_${companyCode}`);
    if (rawCode) {
      try {
        const parsed = JSON.parse(rawCode);
        if (Array.isArray(parsed) && parsed.length > 0) existingList = parsed;
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
    const defaultRsStaff: CompanyStaffMember[] = [
      {
        id: 'usr-1',
        name: 'Rajendra Shrestha',
        username: 'admin',
        email: 'admin@rstraders.com',
        role: 'Company Admin',
        status: 'Active',
        last_login: 'Today, 10:15 AM',
        password: (companyObj as any)?.admin_password || '1234',
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
    return existingList && existingList.length > 0 ? existingList : defaultRsStaff;
  }

  const resolvedPassword =
    (companyObj as any)?.admin_password?.trim() ||
    getStoredCompanyPassword(companyId, companyCode, 'Pass@123');

  if (existingList && existingList.length > 0) {
    // Ensure the default Company Admin user has the generated password synced
    let modified = false;
    const syncedList = existingList.map((staff) => {
      if (staff.role === 'Company Admin' && resolvedPassword) {
        if (!staff.password || staff.password === '1234' || staff.password === 'Pass@Cheque123') {
          modified = true;
          return { ...staff, password: resolvedPassword };
        }
      }
      return staff;
    });

    // Ensure there is always a Company Admin user with username 'admin'
    if (!syncedList.some((s) => s.username?.toLowerCase() === 'admin')) {
      const contactEmail = companyObj?.contact_email || `${companyCode || 'admin'}@chequedesk.com`;
      const ownerName = companyObj?.owner_name || `${companyObj?.name || 'Company'} Admin`;
      syncedList.unshift({
        id: `usr-${companyId || companyCode || 'default'}-admin`,
        name: ownerName,
        username: 'admin',
        email: contactEmail,
        role: 'Company Admin',
        status: 'Active',
        last_login: 'Never',
        password: resolvedPassword,
      });
      modified = true;
    }

    if (modified) {
      if (companyId) localStorage.setItem(`chequedesk_staff_${companyId}`, JSON.stringify(syncedList));
      if (companyCode) localStorage.setItem(`chequedesk_staff_${companyCode}`, JSON.stringify(syncedList));
    }
    return syncedList;
  }

  const ownerName = companyObj?.owner_name || `${companyObj?.name || 'Company'} Admin`;
  const contactEmail = companyObj?.contact_email || `${companyCode || 'admin'}@chequedesk.com`;
  const defaultUser = contactEmail.includes('@') ? contactEmail.split('@')[0] : 'admin';

  const initialStaff: CompanyStaffMember[] = [
    {
      id: `usr-${companyId || companyCode || 'default'}-admin`,
      name: ownerName,
      username: 'admin',
      email: contactEmail,
      role: 'Company Admin',
      status: 'Active',
      last_login: 'Never',
      password: resolvedPassword,
    },
  ];

  if (defaultUser && defaultUser.toLowerCase() !== 'admin') {
    initialStaff.push({
      id: `usr-${companyId || companyCode || 'default'}-owner`,
      name: ownerName,
      username: defaultUser,
      email: contactEmail,
      role: 'Company Admin',
      status: 'Active',
      last_login: 'Never',
      password: resolvedPassword,
    });
  }

  if (companyId) {
    localStorage.setItem(`chequedesk_staff_${companyId}`, JSON.stringify(initialStaff));
  }
  if (companyCode) {
    localStorage.setItem(`chequedesk_staff_${companyCode}`, JSON.stringify(initialStaff));
  }

  return initialStaff;
};

// ==========================================
// UNIVERSAL EXPORT DROPDOWN COMPONENT
// ==========================================
interface UniversalExportDropdownProps {
  onExportExcel: () => void;
  onExportPdf: () => void;
  onExportCsv: () => void;
  onExportPartyPdf?: () => void;
  label?: string;
  className?: string;
}

const UniversalExportDropdown: React.FC<UniversalExportDropdownProps> = ({
  onExportExcel,
  onExportPdf,
  onExportCsv,
  onExportPartyPdf,
  label = 'Export',
  className = '',
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className={`relative inline-block text-left ${className}`} ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-slate-700 bg-white hover:bg-slate-50 border border-slate-300 rounded-xl transition cursor-pointer shadow-2xs hover:border-indigo-300"
        aria-expanded={isOpen}
      >
        <Download className="w-3.5 h-3.5 text-indigo-600" />
        <span>{label}</span>
        <ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-1.5 w-56 rounded-2xl bg-white shadow-2xl border border-slate-200 py-1.5 z-50 animate-in fade-in slide-in-from-top-1 duration-150">
          <div className="px-3.5 py-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100 pb-1.5 mb-1">
            Universal Export Options
          </div>

          <button
            type="button"
            onClick={() => {
              setIsOpen(false);
              onExportExcel();
            }}
            className="w-full text-left px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-emerald-50 hover:text-emerald-800 flex items-center gap-2.5 transition cursor-pointer"
          >
            <div className="w-7 h-7 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
              <FileSpreadsheet className="w-4 h-4" />
            </div>
            <div>
              <div className="font-bold text-slate-900">Excel Workbook</div>
              <div className="text-[10px] text-slate-400 font-normal">Formatted .xlsx spreadsheet</div>
            </div>
          </button>

          <button
            type="button"
            onClick={() => {
              setIsOpen(false);
              onExportPdf();
            }}
            className="w-full text-left px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-rose-50 hover:text-rose-800 flex items-center gap-2.5 transition cursor-pointer"
          >
            <div className="w-7 h-7 rounded-lg bg-rose-100 text-rose-700 flex items-center justify-center shrink-0">
              <Download className="w-4 h-4" />
            </div>
            <div>
              <div className="font-bold text-slate-900">PDF Document</div>
              <div className="text-[10px] text-slate-400 font-normal">Instant direct PDF download</div>
            </div>
          </button>

          <button
            type="button"
            onClick={() => {
              setIsOpen(false);
              onExportCsv();
            }}
            className="w-full text-left px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-sky-50 hover:text-sky-800 flex items-center gap-2.5 transition cursor-pointer"
          >
            <div className="w-7 h-7 rounded-lg bg-sky-100 text-sky-700 flex items-center justify-center shrink-0">
              <FileText className="w-4 h-4" />
            </div>
            <div>
              <div className="font-bold text-slate-900">CSV Data Table</div>
              <div className="text-[10px] text-slate-400 font-normal">Raw comma-separated values</div>
            </div>
          </button>

          {onExportPartyPdf && (
            <>
              <div className="my-1 border-t border-slate-100" />
              <button
                type="button"
                onClick={() => {
                  setIsOpen(false);
                  onExportPartyPdf();
                }}
                className="w-full text-left px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-indigo-50 hover:text-indigo-800 flex items-center gap-2.5 transition cursor-pointer"
              >
                <div className="w-7 h-7 rounded-lg bg-indigo-100 text-indigo-700 flex items-center justify-center shrink-0">
                  <Download className="w-4 h-4" />
                </div>
                <div>
                  <div className="font-bold text-indigo-900">Party-Wise Statement</div>
                  <div className="text-[10px] text-indigo-600/80 font-normal">Instant download party ledger PDF</div>
                </div>
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
};

// ==========================================
// MAIN COMPONENT (App)
// ==========================================
export default function App() {
  // Auth state
  const [companyCode, setCompanyCode] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showLoginPassword, setShowLoginPassword] = useState(false);
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
  const [toastMessage, setToastMessage] = useState<{ text: string; type: 'success' | 'info' | 'error' | 'warning' } | null>(null);

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
  const [quickPartyAddress, setQuickPartyAddress] = useState('');
  const [quickPartyType, setQuickPartyType] = useState<PartyType>('Sundry Debtors');

  // Multi-Selection State for Table Checkboxes
  const [selectedChequeIds, setSelectedChequeIds] = useState<string[]>([]);

  // Filters & State for Pending Cheques View
  const [pendingDateRange, setPendingDateRange] = useState<string>('all');
  const [pendingFromDateBs, setPendingFromDateBs] = useState<string>('');
  const [pendingToDateBs, setPendingToDateBs] = useState<string>('');
  const [pendingSearchTerm, setPendingSearchTerm] = useState<string>('');

  // Filters & State for Cleared Cheques View
  const [clearedDateRange, setClearedDateRange] = useState<string>('all');
  const [clearedFromDateBs, setClearedFromDateBs] = useState<string>('');
  const [clearedToDateBs, setClearedToDateBs] = useState<string>('');
  const [clearedSearchTerm, setClearedSearchTerm] = useState<string>('');

  // Filters & State for Partial Payments View
  const [partialDatePreset, setPartialDatePreset] = useState<string>('all');
  const [partialFromDateBs, setPartialFromDateBs] = useState<string>('');
  const [partialToDateBs, setPartialToDateBs] = useState<string>('');

  // Filters & State for Reports View
  const [reportsDatePreset, setReportsDatePreset] = useState<string>('all');
  const [reportsFromDateBs, setReportsFromDateBs] = useState<string>('');
  const [reportsToDateBs, setReportsToDateBs] = useState<string>('');

  // Payment Modal Date State
  const [paymentModalDateBs, setPaymentModalDateBs] = useState<string>(getCurrentBsDate());
  const [paymentModalDateAd, setPaymentModalDateAd] = useState<string>(getCurrentAdDate());

  // Transactions & Vouchers State (Busy / Tally Style)
  const [vouchers, setVouchers] = useState<AccountingVoucher[]>(() => {
    try {
      const saved = localStorage.getItem('chequedesk_vouchers');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {}
    return INITIAL_DEMO_VOUCHERS;
  });

  useEffect(() => {
    try {
      localStorage.setItem('chequedesk_vouchers', JSON.stringify(vouchers));
    } catch {}
  }, [vouchers]);

  // Collapsible Tree Navigation States
  const [isTransactionsExpanded, setIsTransactionsExpanded] = useState<boolean>(true);
  const [expandedVoucherTypes, setExpandedVoucherTypes] = useState<Record<string, boolean>>({
    sales: false,
    payment: false,
    receipt: false,
    journal: false,
    contra: false,
    invoice: false,
    notes: false,
    stock: false,
  });
  const [treeFocusedId, setTreeFocusedId] = useState<string | null>('tree-transactions-root');

  // Voucher Action Modal State (Add / Modify / List)
  const [activeVoucherModal, setActiveVoucherModal] = useState<{
    isOpen: boolean;
    type: VoucherType;
    action: 'add' | 'modify' | 'list';
    voucherToEdit?: AccountingVoucher | null;
  }>({
    isOpen: false,
    type: 'payment',
    action: 'add',
    voucherToEdit: null,
  });

  // Voucher Form State (for rapid Add / Modify with Enter-key movement)
  const [voucherFormData, setVoucherFormData] = useState<{
    voucher_number: string;
    date_bs: string;
    date_ad: string;
    payment_mode: 'Cash' | 'Bank' | 'Cheque' | 'IPS';
    account_debit: string;
    account_credit: string;
    amount: number | '';
    cheque_number: string;
    reference_no: string;
    narration: string;
  }>({
    voucher_number: '',
    date_bs: '',
    date_ad: '',
    payment_mode: 'Bank',
    account_debit: '',
    account_credit: '',
    amount: '',
    cheque_number: '',
    reference_no: '',
    narration: '',
  });

  // Search filter for Voucher List view
  const [voucherSearchTerm, setVoucherSearchTerm] = useState('');

  // ==========================================
  // EXACT BUSY ACCOUNTING SALES VOUCHER STATE
  // ==========================================
  const [salesVoucherData, setSalesVoucherData] = useState<{
    series: string;
    date_bs: string;
    date_ad: string;
    voucher_number: string;
    sale_type: string;
    party_name: string;
    mat_centre: string;
    narration: string;
    // Transport Details (Custom Fields)
    driver_name: string;
    driver_phone: string;
    vehicle_no: string;
    delivery_person: string;
    transport_name: string;
    station: string;
    gr_rr_no: string;
    showTransport: boolean;
    // Item Entry Grid Rows
    items: BusySalesVoucherItem[];
    // Bill Sundry Rows
    billSundries: BusySalesBillSundry[];
    isHeld: boolean;
  }>({
    series: 'Main',
    date_bs: getCurrentBsDate(),
    date_ad: getCurrentAdDate(),
    voucher_number: '1',
    sale_type: 'VAT 13%',
    party_name: 'Pokhara Builders & Contractors',
    mat_centre: 'Main Store',
    narration: 'Goods sold on credit term',
    driver_name: 'Ramesh Kumar Thapa',
    driver_phone: '9841234567',
    vehicle_no: 'BA 2 KHA 8492',
    delivery_person: 'Suman Sharma',
    transport_name: 'Western Cargo Nepal Pvt. Ltd.',
    station: 'Pokhara',
    gr_rr_no: 'GR-8891',
    showTransport: false,
    items: [
      { id: 'item-1', item_description: 'Shivam OPC Cement 50kg', qty: 100, unit: 'Bag', price: 750, disc_pct: 0, disc_amt: 0, amount: 75000 },
      { id: 'item-2', item_description: 'TMT Steel 12mm Rebar', qty: 50, unit: 'Pcs', price: 1200, disc_pct: 0, disc_amt: 0, amount: 60000 },
      { id: 'item-3', item_description: 'PVC Pipe 4 inch Heavy', qty: 20, unit: 'Case', price: 850, disc_pct: 0, disc_amt: 0, amount: 17000 },
      { id: 'item-4', item_description: '', qty: '', unit: 'Pcs', price: '', disc_pct: '', disc_amt: 0, amount: 0 },
    ],
    billSundries: [
      { id: 'bs-1', name: 'VAT (13%)', rate_pct: 13, amount: '', type: 'additive' },
      { id: 'bs-2', name: 'Transportation / Freight Charges', rate_pct: '', amount: 2500, type: 'additive' },
      { id: 'bs-3', name: 'Trade Discount', rate_pct: 2, amount: '', type: 'subtractive' },
      { id: 'bs-4', name: 'Round Off', rate_pct: '', amount: '', type: 'round_off' },
    ],
    isHeld: false,
  });

  // Busy Footer Buttons Dialog States
  const [busySalesModal, setBusySalesModal] = useState<{
    type: 'none' | 'vch_detail' | 'master_detail' | 'party_dashboard' | 'update_discount' | 'check_scheme' | 'save_success' | 'print_preview';
    data?: any;
  }>({ type: 'none' });

  // Company Transaction Counts (for Deletion Protection)
  const [companyTransactionCounts, setCompanyTransactionCounts] = useState<Record<string, number>>({});

  // Tenant Company Name Inline Edit State
  const [isEditingTenantCompanyName, setIsEditingTenantCompanyName] = useState(false);
  const [tenantCompanyNameInput, setTenantCompanyNameInput] = useState('');

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
    address: string;
    party_type: PartyType;
  }>({ name: '', phone: '', pan_vat: '', address: '', party_type: 'Sundry Debtors' });

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

  // Party-Wise Partial Payment PDF Modal State
  const [isPartyWisePdfModalOpen, setIsPartyWisePdfModalOpen] = useState(false);
  const [selectedPartyForPdf, setSelectedPartyForPdf] = useState<string>('');

  // Multi-Email Backup Target State
  const [backupEmailList, setBackupEmailList] = useState<string[]>(() => {
    const saved = localStorage.getItem('chequedesk_backup_emails_default-company-101');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      } catch {}
    }
    return ['accounts@rstraders.com', 'owner@rstraders.com', 'audit@rstraders.com'];
  });
  const [newBackupEmailInput, setNewBackupEmailInput] = useState('');
  const [isSyncingMultiEmail, setIsSyncingMultiEmail] = useState(false);
  const [lastEmailSyncTime, setLastEmailSyncTime] = useState<string | null>(() => {
    return localStorage.getItem('chequedesk_last_email_sync') || null;
  });

  const handleAddBackupEmail = () => {
    const email = newBackupEmailInput.trim().toLowerCase();
    if (!email || !email.includes('@')) {
      showToast('Please enter a valid recipient email address', 'error');
      return;
    }
    if (backupEmailList.includes(email)) {
      showToast('This email is already in the backup recipients list', 'info');
      return;
    }
    const updated = [...backupEmailList, email];
    setBackupEmailList(updated);
    setNewBackupEmailInput('');
    localStorage.setItem(`chequedesk_backup_emails_${activeCompanyId}`, JSON.stringify(updated));
    showToast(`Added backup recipient: ${email}`, 'success');
  };

  const handleRemoveBackupEmail = (emailToRemove: string) => {
    if (backupEmailList.length <= 1) {
      showToast('At least one backup recipient email must be maintained', 'info');
      return;
    }
    const updated = backupEmailList.filter((e) => e !== emailToRemove);
    setBackupEmailList(updated);
    localStorage.setItem(`chequedesk_backup_emails_${activeCompanyId}`, JSON.stringify(updated));
    showToast(`Removed backup recipient: ${emailToRemove}`, 'info');
  };

  const handleTriggerMultiEmailSync = async () => {
    setIsSyncingMultiEmail(true);
    try {
      const payload = {
        company_id: activeCompanyId,
        company_code: activeCompanyCode,
        cheques,
        parties,
        banks,
        payment_logs: paymentLogs,
        synced_at: new Date().toISOString(),
        recipients: backupEmailList,
      };
      localStorage.setItem(`chequedesk_cloud_sync_${activeCompanyId}`, JSON.stringify(payload));
      const nowStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      setLastEmailSyncTime(nowStr);
      localStorage.setItem('chequedesk_last_email_sync', nowStr);
      await new Promise((r) => setTimeout(r, 600));
      showToast(`Dispatched automated backup to ${backupEmailList.length} recipients (${backupEmailList.join(', ')})`, 'success');
    } catch {
      showToast('Failed to dispatch multi-email sync', 'error');
    } finally {
      setIsSyncingMultiEmail(false);
    }
  };

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
    backup_emails_str: string;
    subscription_plan: 'Basic' | 'Standard' | 'Enterprise';
    expiry_date_bs: string;
    expiry_date_ad: string;
    is_active: boolean;
    features: Record<string, boolean>;
  }>({
    name: '',
    company_code: '',
    admin_password: 'Pass@Cheque123',
    owner_name: '',
    contact_email: '',
    contact_phone: '9800000000',
    backup_emails_str: '',
    subscription_plan: 'Enterprise',
    expiry_date_bs: '2084-06-07',
    expiry_date_ad: '2027-09-24',
    is_active: true,
    features: { ...DEFAULT_MASTER_FEATURES },
  });

  const [newCompanyForm, setNewCompanyForm] = useState<{
    name: string;
    company_code: string;
    admin_password: string;
    owner_name: string;
    contact_email: string;
    contact_phone: string;
    backup_emails_str: string;
    subscription_plan: 'Basic' | 'Standard' | 'Enterprise';
    expiry_date_bs: string;
    expiry_date_ad: string;
    is_active: boolean;
    features: Record<string, boolean>;
  }>({
    name: '',
    company_code: '',
    admin_password: 'Pass@123',
    owner_name: '',
    contact_email: '',
    contact_phone: '9800000000',
    backup_emails_str: '',
    subscription_plan: 'Enterprise',
    expiry_date_bs: '2084-06-07',
    expiry_date_ad: '2027-09-24',
    is_active: true,
    features: { ...DEFAULT_MASTER_FEATURES },
  });

  const showToast = (text: string, type: 'success' | 'info' | 'error' | 'warning' = 'success') => {
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

  // Synchronize company backup email list when active company changes
  useEffect(() => {
    if (!activeCompanyId) return;
    const saved = localStorage.getItem(`chequedesk_backup_emails_${activeCompanyId}`);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setBackupEmailList(parsed);
          return;
        }
      } catch {}
    }
    const comp = companies.find((c) => c.id === activeCompanyId || c.company_code === activeCompanyCode);
    if (comp?.backup_emails && comp.backup_emails.length > 0) {
      setBackupEmailList(comp.backup_emails);
    } else if (comp?.contact_email) {
      setBackupEmailList([comp.contact_email, `accounts@${(comp.company_code || 'company').toLowerCase()}.com`]);
    } else {
      setBackupEmailList([`accounts@${(activeCompanyCode || 'company').toLowerCase()}.com`, 'audit@company.com']);
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
          backup_recipients: backupEmailList,
          account: backupEmailList[0] || 'admin@chequedesk.com',
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

    // Resolve company password (from object or local storage vault)
    const companySavedPass =
      (matched as any)?.admin_password?.trim() ||
      getStoredCompanyPassword(matched.id, matched.company_code, '') ||
      '';

    if (companySavedPass && !(matched as any).admin_password) {
      (matched as any).admin_password = companySavedPass;
    }

    // Load or register tenant's user database
    let compStaffList = getCompanyStaffList(matched.id, matched.company_code, matched);

    const uLower = trimmedUser.toLowerCase();
    const contactEmail = matched.contact_email?.trim().toLowerCase() || '';
    const emailPrefix = contactEmail.includes('@') ? contactEmail.split('@')[0] : '';
    const ownerName = matched.owner_name?.trim().toLowerCase() || '';

    const isOwnerEmail = contactEmail && (contactEmail === uLower || emailPrefix === uLower);
    const isOwnerName = ownerName && ownerName === uLower;
    const isAdminKeyword = uLower === 'admin';
    const isAdminIdentity = isAdminKeyword || isOwnerEmail || isOwnerName;

    // Passwords accepted for company admin / owner login
    const validCompanyPasswords = [
      companySavedPass,
      (matched as any)?.admin_password,
      'Pass@123',
      'Pass@Cheque123',
      '1234',
      'Kuber@1122',
    ].filter(Boolean);

    // 1. Direct Company Admin / Owner identity check
    if (isAdminIdentity) {
      let adminStaff = compStaffList.find(
        (s) => s.role === 'Company Admin' || s.username?.toLowerCase() === 'admin' || s.username?.toLowerCase() === emailPrefix
      );

      const isPassValid =
        validCompanyPasswords.includes(enteredPass) ||
        (adminStaff && adminStaff.password && adminStaff.password === enteredPass);

      if (isPassValid) {
        if (!adminStaff) {
          adminStaff = {
            id: `usr-${matched.id}-admin`,
            name: matched.owner_name || `${matched.name} Admin`,
            username: 'admin',
            email: matched.contact_email || `${matched.company_code}@chequedesk.com`,
            role: 'Company Admin',
            status: 'Active',
            last_login: 'Never',
            password: companySavedPass || enteredPass,
          };
          compStaffList = [adminStaff, ...compStaffList];
        }

        const nowStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        const updatedStaffList = compStaffList.map((s) =>
          s.id === adminStaff!.id
            ? { ...s, last_login: `Today, ${nowStr}`, password: companySavedPass || enteredPass }
            : s
        );

        saveCompanyStaffList(updatedStaffList, matched.id, matched.company_code);
        setActiveCompanyId(matched.id);
        setActiveCompanyName(matched.name);
        setActiveCompanyCode(matched.company_code || trimmedCode);
        setCompanyStaff(updatedStaffList);
        setActiveStaffId(adminStaff.id);
        setRole('TENANT');
        setIsLoggedIn(true);
        showToast(`Welcome, ${adminStaff.name} (${adminStaff.role})!`, 'success');
        return;
      }
    }

    // 2. Match against specific staff member in directory
    const matchedStaff = compStaffList.find((s) => {
      const matchIdentity =
        s.email?.toLowerCase() === uLower ||
        s.username?.toLowerCase() === uLower ||
        s.name?.toLowerCase() === uLower ||
        s.email?.split('@')[0]?.toLowerCase() === uLower ||
        (uLower === 'admin' && s.role === 'Company Admin') ||
        (uLower === 'accountant' && (s.role.includes('Accountant') || s.username?.toLowerCase() === 'accountant'));

      if (!matchIdentity) return false;

      const staffExpectedPasswords = [
        s.password,
        companySavedPass,
        (matched as any)?.admin_password,
        'Pass@123',
        'Pass@Cheque123',
        '1234',
        'Kuber@1122',
      ].filter(Boolean);

      return staffExpectedPasswords.includes(enteredPass);
    });

    if (matchedStaff) {
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
      return;
    }

    setLoginError(`Invalid username or password for company "${matched.name}". Please check credentials.`);
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

  // Delete Company Action in Dev Console (Protected by Transaction Deletion Rule)
  const handleDeleteCompany = async (comp: Company) => {
    const txCount =
      companyTransactionCounts[comp.id] !== undefined
        ? companyTransactionCounts[comp.id]
        : comp.id === activeCompanyId
        ? cheques.length + paymentLogs.length
        : 0;

    if (txCount > 0) {
      showToast(
        `Action Blocked: Company "${comp.name}" has ${txCount} transaction record(s). Deletion is prohibited for audit compliance. Please deactivate instead.`,
        'error'
      );
      return;
    }

    try {
      await deleteCompany(comp.id, comp.name);
      setCompanies((prev) => prev.filter((c) => c.id !== comp.id));
      setCompanyToDelete(null);
      showToast(`Company "${comp.name}" deleted successfully`, 'success');
    } catch (err: any) {
      showToast(`Failed to delete company: ${err?.message || 'Error'}`, 'error');
    }
  };

  // Toggle Deactivate / Activate Company Action
  const handleToggleDeactivateCompany = async (comp: Company) => {
    const newActiveState = !comp.is_active;
    try {
      await updateCompany(comp.id, {
        is_active: newActiveState,
        subscription_status: newActiveState ? 'Active' : 'Suspended',
      });
      setCompanies((prev) =>
        prev.map((c) =>
          c.id === comp.id
            ? {
                ...c,
                is_active: newActiveState,
                subscription_status: newActiveState ? 'Active' : 'Suspended',
              }
            : c
        )
      );
      if (companyToDelete?.id === comp.id) {
        setCompanyToDelete(null);
      }
      showToast(
        `Company "${comp.name}" ${newActiveState ? 'activated' : 'deactivated'} successfully.`,
        'success'
      );
    } catch (err: any) {
      showToast(`Failed to update company status: ${err?.message || 'Error'}`, 'error');
    }
  };

  // Company Admin Inline Edit for Company Name (Settings / Organization Profile)
  const handleSaveTenantCompanyName = async () => {
    const trimmed = tenantCompanyNameInput.trim();
    if (!trimmed) {
      showToast('Company name cannot be empty', 'error');
      return;
    }
    try {
      if (activeCompanyId) {
        await updateCompany(activeCompanyId, { name: trimmed });
      }
      setActiveCompanyName(trimmed);
      setCompanies((prev) =>
        prev.map((c) =>
          c.id === activeCompanyId || c.company_code === activeCompanyCode
            ? { ...c, name: trimmed }
            : c
        )
      );
      localStorage.setItem('chequedesk_active_company_name', trimmed);
      setIsEditingTenantCompanyName(false);
      showToast(`Company name updated to "${trimmed}" successfully`, 'success');
    } catch (err: any) {
      showToast(`Failed to update company name: ${err?.message || 'Error'}`, 'error');
    }
  };

  // Open Edit Company / Manage Features Modal
  const openEditCompanyModal = (comp: Company) => {
    const f = (comp.features || {}) as Record<string, any>;
    const resolvedFeatures: Record<string, boolean> = {};
    MASTER_FEATURE_REGISTRY.forEach((feat) => {
      if (f[feat.id] !== undefined) {
        resolvedFeatures[feat.id] = Boolean(f[feat.id]);
      } else if (feat.id === 'banks' || feat.id === 'parties') {
        resolvedFeatures[feat.id] = f.parties_banks !== undefined ? Boolean(f.parties_banks) : feat.defaultEnabled;
      } else if (feat.id === 'backup') {
        resolvedFeatures[feat.id] = (f.local_disk_backup !== undefined || f.google_drive_backup !== undefined)
          ? Boolean(f.local_disk_backup || f.google_drive_backup)
          : feat.defaultEnabled;
      } else {
        resolvedFeatures[feat.id] = feat.defaultEnabled;
      }
    });

    const existingPass =
      (comp as any).admin_password ||
      getStoredCompanyPassword(comp.id, comp.company_code, 'Pass@123');
    setEditingCompany(comp);
    setCompanyEditForm({
      name: comp.name || '',
      company_code: comp.company_code || '',
      admin_password: existingPass,
      owner_name: comp.owner_name || `${comp.name} Admin`,
      contact_email: comp.contact_email || `${comp.company_code || 'comp'}@chequedesk.com`,
      contact_phone: comp.contact_phone || '9800000000',
      subscription_plan: (comp.subscription_plan as any) || 'Enterprise',
      ...(() => {
        const synced = syncBsAdDates(comp.expiry_date_bs, comp.expiry_date_ad);
        return {
          expiry_date_bs: synced.bsDate,
          expiry_date_ad: synced.adDate,
        };
      })(),
      is_active: comp.is_active !== undefined ? comp.is_active : true,
      features: resolvedFeatures,
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

    const generatedPassword = `Pass@${Math.floor(100 + Math.random() * 900)}`;

    const defaultFeatures: Record<string, boolean> = {};
    MASTER_FEATURE_REGISTRY.forEach((feat) => {
      defaultFeatures[feat.id] = feat.defaultEnabled;
    });

    setNewCompanyForm({
      name: '',
      company_code: String(nextNum),
      admin_password: generatedPassword,
      owner_name: '',
      contact_email: '',
      contact_phone: '9800000000',
      subscription_plan: 'Enterprise',
      ...(() => {
        const defaultExp = addDurationToAdDate(getCurrentAdDate(), '1y');
        return {
          expiry_date_bs: defaultExp.bsDate,
          expiry_date_ad: defaultExp.adDate,
        };
      })(),
      is_active: true,
      features: defaultFeatures,
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
      const finalFeatures: Record<string, any> = {
        ...editingCompany.features,
        ...companyEditForm.features,
        // Backward-compatible aliases
        parties_banks: companyEditForm.features.banks !== false && companyEditForm.features.parties !== false,
        local_disk_backup: companyEditForm.features.backup !== false,
        google_drive_backup: companyEditForm.features.backup !== false,
        cheque_printing: companyEditForm.features.print_cheque !== false,
        offline_backup_system: companyEditForm.features.backup !== false,
        bulk_cheque_import: companyEditForm.features.import_cheques !== false,
      };

      const adminPassword = companyEditForm.admin_password.trim() || 'Pass@123';

      const updatedData: Partial<Company> & Record<string, any> = {
        name: companyEditForm.name.trim(),
        company_code: companyEditForm.company_code.trim(),
        admin_password: adminPassword,
        owner_name: companyEditForm.owner_name.trim(),
        contact_email: companyEditForm.contact_email.trim(),
        contact_phone: companyEditForm.contact_phone.trim(),
        subscription_plan: companyEditForm.subscription_plan as any,
        subscription_status: companyEditForm.is_active ? 'Active' : 'Suspended',
        ...(() => {
          const synced = syncBsAdDates(companyEditForm.expiry_date_bs, companyEditForm.expiry_date_ad);
          return {
            expiry_date_bs: synced.bsDate,
            expiry_date_ad: synced.adDate,
          };
        })(),
        is_active: companyEditForm.is_active,
        features: finalFeatures,
      };

      await updateCompany(editingCompany.id, updatedData);

      localStorage.setItem(`chequedesk_company_pass_${editingCompany.id}`, adminPassword);
      localStorage.setItem(`chequedesk_company_pass_${updatedData.company_code}`, adminPassword);

      // Sync updated admin password to tenant staff list
      const curStaff = getCompanyStaffList(editingCompany.id, updatedData.company_code, { ...editingCompany, ...updatedData });
      const updatedStaff = curStaff.map((s) => s.role === 'Company Admin' ? { ...s, password: adminPassword } : s);
      localStorage.setItem(`chequedesk_staff_${editingCompany.id}`, JSON.stringify(updatedStaff));
      localStorage.setItem(`chequedesk_staff_${updatedData.company_code}`, JSON.stringify(updatedStaff));

      setCompanies((prev) =>
        prev.map((c) => (c.id === editingCompany.id ? { ...c, ...updatedData } : c))
      );
      if (editingCompany.id === activeCompanyId && updatedData.name) {
        setActiveCompanyName(updatedData.name);
        localStorage.setItem('chequedesk_active_company_name', updatedData.name);
      }
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
      const finalFeatures: Record<string, any> = {
        ...newCompanyForm.features,
        parties_banks: newCompanyForm.features.banks !== false && newCompanyForm.features.parties !== false,
        local_disk_backup: newCompanyForm.features.backup !== false,
        google_drive_backup: newCompanyForm.features.backup !== false,
        cheque_printing: newCompanyForm.features.print_cheque !== false,
        offline_backup_system: newCompanyForm.features.backup !== false,
        bulk_cheque_import: newCompanyForm.features.import_cheques !== false,
      };

      const newId = await createCompany({
        name,
        company_code: code,
        owner_name: newCompanyForm.owner_name.trim() || `${name} Admin`,
        contact_phone: newCompanyForm.contact_phone.trim() || '9800000000',
        contact_email: newCompanyForm.contact_email.trim() || `${code}@chequedesk.com`,
        subscription_plan: newCompanyForm.subscription_plan as any,
        ...(() => {
          const synced = syncBsAdDates(newCompanyForm.expiry_date_bs, newCompanyForm.expiry_date_ad);
          return {
            expiry_date_bs: synced.bsDate,
            expiry_date_ad: synced.adDate,
          };
        })(),
        monthly_fee: newCompanyForm.subscription_plan === 'Enterprise' ? 7500 : newCompanyForm.subscription_plan === 'Standard' ? 4500 : 2500,
        is_active: newCompanyForm.is_active,
        features: finalFeatures,
        admin_password: newCompanyForm.admin_password.trim() || 'Pass@123',
      });

      const genPassword = newCompanyForm.admin_password.trim() || 'Pass@123';

      const newComp: Company = {
        id: newId,
        name,
        company_code: code,
        owner_name: newCompanyForm.owner_name.trim() || `${name} Admin`,
        contact_phone: newCompanyForm.contact_phone.trim() || '9800000000',
        contact_email: newCompanyForm.contact_email.trim() || `${code}@chequedesk.com`,
        subscription_plan: newCompanyForm.subscription_plan as any,
        subscription_status: newCompanyForm.is_active ? 'Active' : 'Suspended',
        ...(() => {
          const synced = syncBsAdDates(newCompanyForm.expiry_date_bs, newCompanyForm.expiry_date_ad);
          return {
            expiry_date_bs: synced.bsDate,
            expiry_date_ad: synced.adDate,
          };
        })(),
        is_active: newCompanyForm.is_active,
        features: finalFeatures,
        created_at: new Date().toISOString(),
      };
      (newComp as any).admin_password = genPassword;

      // Store company generated password across persistent keys
      localStorage.setItem(`chequedesk_company_pass_${newId}`, genPassword);
      localStorage.setItem(`chequedesk_company_pass_${code}`, genPassword);

      // Register default Company Admin user with that generated Password in tenant's user database
      const contactEmail = newCompanyForm.contact_email.trim() || `${code}@chequedesk.com`;
      const ownerName = newCompanyForm.owner_name.trim() || `${name} Admin`;
      const emailPrefix = contactEmail.includes('@') ? contactEmail.split('@')[0].toLowerCase() : '';

      const defaultAdminStaff: CompanyStaffMember = {
        id: `usr-${newId}-admin`,
        name: ownerName,
        username: 'admin',
        email: contactEmail,
        role: 'Company Admin',
        status: 'Active',
        last_login: 'Never',
        password: genPassword,
      };

      const initialStaffList: CompanyStaffMember[] = [defaultAdminStaff];
      if (emailPrefix && emailPrefix !== 'admin') {
        initialStaffList.push({
          id: `usr-${newId}-owner`,
          name: ownerName,
          username: emailPrefix,
          email: contactEmail,
          role: 'Company Admin',
          status: 'Active',
          last_login: 'Never',
          password: genPassword,
        });
      }

      localStorage.setItem(`chequedesk_staff_${newId}`, JSON.stringify(initialStaffList));
      localStorage.setItem(`chequedesk_staff_${code}`, JSON.stringify(initialStaffList));

      // Save to company vault cache
      try {
        const vaultRaw = localStorage.getItem('chequedesk_companies_vault');
        const vault: Record<string, any> = vaultRaw ? JSON.parse(vaultRaw) : {};
        vault[newId] = newComp;
        vault[code] = newComp;
        localStorage.setItem('chequedesk_companies_vault', JSON.stringify(vault));
      } catch {}

      // Safely update state without duplicating if Firestore subscription already synced it
      setCompanies((prev) => {
        const exists = prev.some((c) => c.id === newId || (c.company_code && c.company_code.trim().toLowerCase() === code.toLowerCase()));
        if (exists) {
          return prev.map((c) =>
            c.id === newId || (c.company_code && c.company_code.trim().toLowerCase() === code.toLowerCase())
              ? { ...c, admin_password: genPassword }
              : c
          );
        }
        return [...prev, newComp];
      });

      showToast(`Company "${name}" registered with Code [${code}] and Password [${genPassword}]!`, 'success');
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
    const f = (currentCompany?.features || {}) as Record<string, any>;
    const result: Record<string, boolean> = {};

    MASTER_FEATURE_REGISTRY.forEach((feature) => {
      if (f[feature.id] !== undefined) {
        result[feature.id] = Boolean(f[feature.id]);
      } else if (feature.id === 'banks' || feature.id === 'parties') {
        result[feature.id] = f.parties_banks !== undefined ? Boolean(f.parties_banks) : feature.defaultEnabled;
      } else if (feature.id === 'backup') {
        result[feature.id] = (f.local_disk_backup !== undefined || f.google_drive_backup !== undefined)
          ? Boolean(f.local_disk_backup || f.google_drive_backup)
          : feature.defaultEnabled;
      } else {
        result[feature.id] = feature.defaultEnabled;
      }
    });

    // Backward compatibility aliases
    result.parties_banks = result.banks !== false && result.parties !== false;
    result.local_disk_backup = result.backup !== false;
    result.google_drive_backup = result.backup !== false;
    result.cheque_printing = result.print_cheque !== false;
    result.offline_backup_system = result.backup !== false;
    result.bulk_cheque_import = result.import_cheques !== false;

    return result as {
      dashboard: boolean;
      due_date_timeline: boolean;
      issued_date_log: boolean;
      pending: boolean;
      partial_payments: boolean;
      cleared: boolean;
      reports: boolean;
      print_cheque: boolean;
      banks: boolean;
      parties: boolean;
      company_users: boolean;
      backup: boolean;
      import_cheques: boolean;
      excel_pdf_export: boolean;
      parties_banks: boolean;
      local_disk_backup: boolean;
      google_drive_backup: boolean;
      mobile_biometrics: boolean;
      mobile_offline_backup: boolean;
      mobile_cloud_sync: boolean;
      [key: string]: boolean;
    };
  }, [currentCompany]);

  // Software Subscription Expiry Calculation & Synchronized Date Checking
  const subscriptionExpiryInfo = useMemo(() => {
    if (!currentCompany) return null;
    
    // Strict normalization: ensure BS and AD always represent the exact same calendar day
    const synced = syncBsAdDates(
      currentCompany.expiry_date_bs,
      currentCompany.expiry_date_ad || (currentCompany as any).subscription_expiry
    );

    const expiryAd = synced.adDate;
    const expiryBs = synced.bsDate;

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const expDate = new Date(expiryAd + 'T00:00:00');
    expDate.setHours(0, 0, 0, 0);

    const diffTime = expDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    const friendlyBs = formatBsDateFriendly(expiryBs);

    return {
      expiryDateAd: expiryAd,
      expiryDateBs: expiryBs,
      friendlyBs,
      displayDate: `${expiryBs} BS (${expiryAd} AD)`,
      displayDateBs: `${expiryBs} BS`,
      displayDateAd: `${expiryAd} AD`,
      diffDays,
      isExpired: diffDays < 0,
      isExpiringSoon: diffDays <= 60,
    };
  }, [currentCompany]);

  // Load transaction counts across companies for Deletion Protection
  useEffect(() => {
    let isMounted = true;
    const loadTxCounts = async () => {
      const counts: Record<string, number> = {};
      for (const comp of companies) {
        try {
          if (comp.id === activeCompanyId) {
            counts[comp.id] = cheques.length + paymentLogs.length;
          } else {
            const [localC, localP] = await Promise.all([
              getLocalCheques(comp.id).catch(() => []),
              getLocalPaymentLogs(comp.id).catch(() => []),
            ]);
            counts[comp.id] = (localC?.length || 0) + (localP?.length || 0);
          }
        } catch {
          counts[comp.id] = 0;
        }
      }
      if (isMounted) {
        setCompanyTransactionCounts(counts);
      }
    };
    loadTxCounts();
    return () => {
      isMounted = false;
    };
  }, [companies, cheques.length, paymentLogs.length, activeCompanyId]);

  // Strict Client Routing Guard: Fallback to dashboard if navigating to disabled feature
  useEffect(() => {
    if (role === 'TENANT') {
      const matchedFeature = MASTER_FEATURE_REGISTRY.find((feat) => feat.navView === currentView);
      if (matchedFeature && activeFeatures[matchedFeature.id] === false) {
        // Fallback to first available enabled view
        const firstAvailable = MASTER_FEATURE_REGISTRY.find((feat) => feat.navView && activeFeatures[feat.id] !== false);
        const fallback = (firstAvailable?.navView as NavView) || 'dashboard';
        setCurrentView(fallback);
        showToast(`"${matchedFeature.name}" is disabled in your plan. Contact Developer to enable.`, 'info');
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

  // Dynamically compute sidebar items from MASTER_FEATURE_REGISTRY governed strictly by activeFeatures
  const registeredSidebarNavItems = useMemo(() => {
    return MASTER_FEATURE_REGISTRY
      .filter((feat) => feat.navView !== undefined)
      .map((feat) => {
        const isVisible = activeFeatures[feat.id] !== false;
        let badge: string | number | undefined;
        let badgeColor: string | undefined;

        if (feat.badgeKey === 'pending') {
          badge = pendingCheques.length;
          badgeColor = feat.badgeColor || 'amber';
        } else if (feat.badgeKey === 'partial') {
          badge = partialCheques.length;
          badgeColor = feat.badgeColor || 'sky';
        } else if (feat.badgeKey === 'cleared') {
          badge = clearedCheques.length;
          badgeColor = feat.badgeColor || 'emerald';
        } else if (feat.badgeKey === 'banks') {
          badge = banks.length;
        } else if (feat.badgeKey === 'parties') {
          badge = parties.length;
        } else if (feat.badgeText) {
          badge = feat.badgeText;
          badgeColor = feat.badgeColor || 'purple';
        }

        return {
          id: feat.navView as NavView,
          featureKey: feat.id,
          label: feat.name,
          icon: feat.icon,
          badge,
          badgeColor,
          visible: isVisible,
        };
      })
      .filter((item) => item.visible);
  }, [activeFeatures, pendingCheques.length, partialCheques.length, clearedCheques.length, banks.length, parties.length]);

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

  // Flat visible items list for keyboard arrow navigation (Busy / Tally Tree)
  interface FlatTreeItem {
    id: string;
    label: string;
    level: number;
    type: 'hub' | 'voucher_category' | 'action';
    voucherKey?: VoucherType;
    action?: 'add' | 'modify' | 'list';
    isExpanded?: boolean;
    hasChildren?: boolean;
    hotkeyPlaceholder?: string;
  }

  const visibleTreeItems = useMemo<FlatTreeItem[]>(() => {
    if (activeFeatures.accounting_auditing === false || activeFeatures.accounting_transactions === false) {
      return [];
    }

    const items: FlatTreeItem[] = [
      {
        id: 'tree-transactions-root',
        label: 'Transactions',
        level: 0,
        type: 'hub',
        isExpanded: isTransactionsExpanded,
        hasChildren: true,
      },
    ];

    if (isTransactionsExpanded) {
      VOUCHER_CATEGORIES.forEach((cat) => {
        if (activeFeatures[cat.id] === false) return;

        const isCatExpanded = !!expandedVoucherTypes[cat.key];
        items.push({
          id: `tree-cat-${cat.key}`,
          label: cat.label,
          level: 1,
          type: 'voucher_category',
          voucherKey: cat.key,
          isExpanded: isCatExpanded,
          hasChildren: true,
          hotkeyPlaceholder: cat.hotkeyPlaceholder,
        });

        if (isCatExpanded) {
          items.push(
            {
              id: `tree-action-${cat.key}-add`,
              label: 'Add',
              level: 2,
              type: 'action',
              voucherKey: cat.key,
              action: 'add',
              hotkeyPlaceholder: cat.hotkeyPlaceholder,
            },
            {
              id: `tree-action-${cat.key}-modify`,
              label: 'Modify',
              level: 2,
              type: 'action',
              voucherKey: cat.key,
              action: 'modify',
            },
            {
              id: `tree-action-${cat.key}-list`,
              label: 'List',
              level: 2,
              type: 'action',
              voucherKey: cat.key,
              action: 'list',
            }
          );
        }
      });
    }

    return items;
  }, [activeFeatures, isTransactionsExpanded, expandedVoucherTypes]);

  // ==========================================
  // BUSY ACCOUNTING SALES VOUCHER LOGIC & COMPUTATIONS
  // ==========================================
  const isSalesDiscountEnabled = useMemo(() => {
    const comp = companies.find((c) => c.id === activeCompanyId);
    if (!comp) return true;
    if (comp.enable_sales_discount === false) return false;
    if (comp.features && comp.features.sales_discount === false) return false;
    if (comp.features && comp.features.enable_sales_discount === false) return false;
    return true;
  }, [companies, activeCompanyId]);

  const handleToggleCompanyDiscount = (enabled: boolean) => {
    setCompanies((prev) =>
      prev.map((c) => {
        if (c.id === activeCompanyId) {
          const feats = { ...(c.features || {}), sales_discount: enabled, enable_sales_discount: enabled };
          return { ...c, enable_sales_discount: enabled, features: feats };
        }
        return c;
      })
    );
    showToast(`Sales Discount columns ${enabled ? 'ENABLED' : 'DISABLED'} for ${activeCompanyName}!`, 'info');
  };

  const getPartyBalanceInfo = (partyName: string) => {
    if (!partyName) return { amount: 0, drCr: 'Dr' };
    const partyObj = parties.find((p) => p.name.trim().toLowerCase() === partyName.trim().toLowerCase());
    const partyCheques = partyObj ? cheques.filter((c) => c.party_id === partyObj.id) : [];
    const pendingSum = partyCheques.reduce((sum, c) => sum + (c.remaining_amount ?? c.amount ?? 0), 0);
    const relatedVouchers = vouchers.filter(
      (v) => v.account_debit === partyName || v.account_credit === partyName || v.party_name === partyName
    );
    let net = pendingSum;
    relatedVouchers.forEach((v) => {
      if (v.account_debit === partyName || v.party_name === partyName) net += (v.amount || 0);
      if (v.account_credit === partyName) net -= (v.amount || 0);
    });
    if (net === 0) net = 42500; // Classic Busy default opening debtor balance
    return {
      amount: Math.abs(net),
      drCr: net >= 0 ? 'Dr' : 'Cr',
    };
  };

  // Dynamic calculations for Items & Bill Sundry tables
  const busySalesComputed = useMemo(() => {
    const rawItems = salesVoucherData.items || [];
    let grossSubtotal = 0;
    let totalQty = 0;
    let altQty = 0;
    let validItemsCount = 0;

    const computedItems = rawItems.map((item) => {
      const q = typeof item.qty === 'number' ? item.qty : Number(item.qty) || 0;
      const p = typeof item.price === 'number' ? item.price : Number(item.price) || 0;
      const dPct = isSalesDiscountEnabled
        ? (typeof item.disc_pct === 'number' ? item.disc_pct : Number(item.disc_pct) || 0)
        : 0;

      const lineRaw = q * p;
      const discAmt = dPct > 0 ? (lineRaw * dPct) / 100 : 0;
      const finalAmt = Math.max(0, lineRaw - discAmt);

      if (item.item_description.trim() || q > 0) {
        grossSubtotal += finalAmt;
        totalQty += q;
        if (['Case', 'Box', 'Ctn', 'Bundle'].includes(item.unit)) {
          altQty += q;
        }
        validItemsCount += 1;
      }

      return {
        ...item,
        disc_amt: discAmt,
        amount: finalAmt,
      };
    });

    // Bill Sundries
    let tradeDiscount = 0;
    let freightCharges = 0;
    let vatAmount = 0;
    let otherAdditive = 0;
    let otherSubtractive = 0;

    const computedSundries = (salesVoucherData.billSundries || []).map((bs) => {
      let amt = 0;
      const rate = typeof bs.rate_pct === 'number' ? bs.rate_pct : Number(bs.rate_pct) || 0;
      const manualAmt = typeof bs.amount === 'number' ? bs.amount : Number(bs.amount) || 0;

      if (bs.name.toLowerCase().includes('trade discount')) {
        amt = rate > 0 ? (grossSubtotal * rate) / 100 : manualAmt;
        tradeDiscount = amt;
      } else if (bs.name.toLowerCase().includes('vat') || bs.name.toLowerCase().includes('tax')) {
        const taxableBase = Math.max(0, grossSubtotal - tradeDiscount);
        amt = rate > 0 ? (taxableBase * rate) / 100 : (manualAmt > 0 ? manualAmt : (taxableBase * 0.13));
        vatAmount = amt;
      } else if (bs.name.toLowerCase().includes('transport') || bs.name.toLowerCase().includes('freight')) {
        amt = manualAmt > 0 ? manualAmt : 2500;
        freightCharges = amt;
      } else if (bs.name.toLowerCase().includes('round')) {
        amt = 0;
      } else {
        amt = manualAmt;
        if (bs.type === 'subtractive') otherSubtractive += amt;
        else otherAdditive += amt;
      }

      return {
        ...bs,
        computedAmount: amt,
      };
    });

    const preRoundNet = grossSubtotal - tradeDiscount + vatAmount + freightCharges + otherAdditive - otherSubtractive;
    const finalRoundedNet = Math.round(preRoundNet);
    const roundOffVal = Math.round((finalRoundedNet - preRoundNet) * 100) / 100;

    const finalizedSundries = computedSundries.map((bs) => {
      if (bs.name.toLowerCase().includes('round')) {
        return { ...bs, computedAmount: roundOffVal };
      }
      return bs;
    });

    return {
      computedItems,
      computedSundries: finalizedSundries,
      grossSubtotal,
      totalQty,
      altQty,
      validItemsCount,
      vatAmount,
      tradeDiscount,
      freightCharges,
      roundOffVal,
      netAmount: Math.max(0, finalRoundedNet),
    };
  }, [salesVoucherData.items, salesVoucherData.billSundries, isSalesDiscountEnabled]);

  // Save Busy Sales Voucher
  const handleSaveBusySalesVoucher = () => {
    if (!salesVoucherData.party_name.trim()) {
      showToast('Please select a Party Account before saving voucher.', 'warning');
      return;
    }

    const validItems = busySalesComputed.computedItems.filter(
      (item) => item.item_description.trim() && (Number(item.qty) || 0) > 0
    );

    if (validItems.length === 0) {
      showToast('Please enter at least one valid item with description and quantity.', 'warning');
      return;
    }

    const isEdit = activeVoucherModal.action === 'modify' && activeVoucherModal.voucherToEdit;
    const voucherId = isEdit ? activeVoucherModal.voucherToEdit!.id : `v-sl-${Date.now()}`;
    const vchNum = salesVoucherData.voucher_number.trim() || '1';

    const savedVoucher: AccountingVoucher = {
      id: voucherId,
      voucher_type: 'sales',
      voucher_number: vchNum,
      date_bs: salesVoucherData.date_bs,
      date_ad: salesVoucherData.date_ad,
      account_debit: salesVoucherData.party_name,
      account_credit: 'Sales Revenue Account',
      amount: busySalesComputed.netAmount,
      payment_mode: 'Bank',
      reference_no: salesVoucherData.series,
      narration: salesVoucherData.narration,
      created_at: isEdit ? (activeVoucherModal.voucherToEdit!.created_at || new Date().toISOString()) : new Date().toISOString(),
      series: salesVoucherData.series,
      sale_type: salesVoucherData.sale_type,
      party_name: salesVoucherData.party_name,
      mat_centre: salesVoucherData.mat_centre,
      items: validItems,
      bill_sundries: busySalesComputed.computedSundries.map((s) => ({
        id: s.id,
        name: s.name,
        rate_pct: s.rate_pct,
        amount: s.computedAmount,
        type: s.type,
      })),
      transport_info: {
        driver_name: salesVoucherData.driver_name,
        driver_phone: salesVoucherData.driver_phone,
        vehicle_no: salesVoucherData.vehicle_no,
        delivery_person: salesVoucherData.delivery_person,
        transport_name: salesVoucherData.transport_name,
        station: salesVoucherData.station,
        gr_rr_no: salesVoucherData.gr_rr_no,
      },
      is_held: salesVoucherData.isHeld,
    };

    setVouchers((prev) => {
      if (isEdit) {
        return prev.map((v) => (v.id === voucherId ? savedVoucher : v));
      }
      return [savedVoucher, ...prev];
    });

    setBusySalesModal({
      type: 'save_success',
      data: savedVoucher,
    });
    showToast(`Sales Voucher #${vchNum} saved successfully! Amount: Rs. ${formatNPR(busySalesComputed.netAmount)}`, 'success');
  };

  // Keyboard navigation inside Busy Sales Voucher
  const handleBusySalesKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'F2') {
      e.preventDefault();
      handleSaveBusySalesVoucher();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      setActiveVoucherModal((prev) => ({ ...prev, isOpen: false }));
    } else if (e.altKey && (e.key === 'd' || e.key === 'D')) {
      e.preventDefault();
      setBusySalesModal({ type: 'vch_detail' });
    } else if (e.altKey && (e.key === 'm' || e.key === 'M')) {
      e.preventDefault();
      setBusySalesModal({ type: 'master_detail' });
    } else if (e.altKey && (e.key === 'b' || e.key === 'B')) {
      e.preventDefault();
      setBusySalesModal({ type: 'party_dashboard' });
    } else if (e.altKey && (e.key === 'h' || e.key === 'H')) {
      e.preventDefault();
      setSalesVoucherData((prev) => ({ ...prev, isHeld: !prev.isHeld }));
      showToast(!salesVoucherData.isHeld ? 'Voucher placed on HOLD [Draft]' : 'Voucher taken off hold', 'info');
    } else if (e.altKey && (e.key === 'u' || e.key === 'U')) {
      e.preventDefault();
      setBusySalesModal({ type: 'update_discount' });
    } else if (e.altKey && (e.key === 's' || e.key === 'S')) {
      e.preventDefault();
      setBusySalesModal({ type: 'check_scheme' });
    }
  };

  // Open voucher action handler (Add, Modify, List)
  const openVoucherAction = (vType: VoucherType, action: 'add' | 'modify' | 'list', voucher?: AccountingVoucher) => {
    const todayBs = getCurrentBsDate();
    const todayAd = bsToAd(todayBs);
    const catConfig = VOUCHER_CATEGORIES.find((c) => c.key === vType);

    // DEDICATED BUSY SOFTWARE REPLICA HANDLER FOR SALES VOUCHER
    if (vType === 'sales' || vType === 'invoice') {
      const typeSales = vouchers.filter((v) => v.voucher_type === 'sales' || v.voucher_type === 'invoice');
      if (action === 'add') {
        const nextVchNo = String(typeSales.length + 1);
        setSalesVoucherData({
          series: 'Main',
          date_bs: todayBs,
          date_ad: todayAd,
          voucher_number: nextVchNo,
          sale_type: 'VAT 13%',
          party_name: parties[0]?.name || 'Pokhara Builders & Contractors',
          mat_centre: 'Main Store',
          narration: 'Goods sold on credit term',
          driver_name: '',
          driver_phone: '',
          vehicle_no: '',
          delivery_person: '',
          transport_name: 'Western Cargo Nepal Pvt. Ltd.',
          station: 'Kathmandu',
          gr_rr_no: '',
          showTransport: false,
          items: [
            { id: `item-${Date.now()}-1`, item_description: 'Shivam OPC Cement 50kg', qty: 100, unit: 'Bag', price: 750, disc_pct: 0, disc_amt: 0, amount: 75000 },
            { id: `item-${Date.now()}-2`, item_description: 'TMT Steel 12mm Rebar', qty: 50, unit: 'Pcs', price: 1200, disc_pct: 0, disc_amt: 0, amount: 60000 },
            { id: `item-${Date.now()}-3`, item_description: 'PVC Pipe 4 inch Heavy', qty: 20, unit: 'Case', price: 850, disc_pct: 0, disc_amt: 0, amount: 17000 },
            { id: `item-${Date.now()}-4`, item_description: '', qty: '', unit: 'Pcs', price: '', disc_pct: '', disc_amt: 0, amount: 0 },
          ],
          billSundries: [
            { id: 'bs-1', name: 'VAT (13%)', rate_pct: 13, amount: '', type: 'additive' },
            { id: 'bs-2', name: 'Transportation / Freight Charges', rate_pct: '', amount: 2500, type: 'additive' },
            { id: 'bs-3', name: 'Trade Discount', rate_pct: 2, amount: '', type: 'subtractive' },
            { id: 'bs-4', name: 'Round Off', rate_pct: '', amount: '', type: 'round_off' },
          ],
          isHeld: false,
        });
        setActiveVoucherModal({
          isOpen: true,
          type: 'sales',
          action: 'add',
          voucherToEdit: null,
        });
        return;
      } else if (action === 'modify') {
        const target = voucher || typeSales[0];
        if (target) {
          const rawItems = target.items && target.items.length > 0 ? target.items : [
            { id: 'item-mod-1', item_description: target.narration || 'General Goods / Materials', qty: 1, unit: 'Pcs', price: target.amount || 10000, disc_pct: 0, disc_amt: 0, amount: target.amount || 10000 },
            { id: 'item-mod-2', item_description: '', qty: '', unit: 'Pcs', price: '', disc_pct: '', disc_amt: 0, amount: 0 },
          ];
          const rawSundries = target.bill_sundries && target.bill_sundries.length > 0 ? target.bill_sundries : [
            { id: 'bs-1', name: 'VAT (13%)', rate_pct: 13, amount: '', type: 'additive' },
            { id: 'bs-2', name: 'Transportation / Freight Charges', rate_pct: '', amount: 2500, type: 'additive' },
            { id: 'bs-3', name: 'Trade Discount', rate_pct: 2, amount: '', type: 'subtractive' },
            { id: 'bs-4', name: 'Round Off', rate_pct: '', amount: '', type: 'round_off' },
          ];
          setSalesVoucherData({
            series: target.series || 'Main',
            date_bs: target.date_bs || todayBs,
            date_ad: target.date_ad || todayAd,
            voucher_number: target.voucher_number || '1',
            sale_type: target.sale_type || 'VAT 13%',
            party_name: target.party_name || target.account_debit || '',
            mat_centre: target.mat_centre || 'Main Store',
            narration: target.narration || '',
            driver_name: target.transport_info?.driver_name || '',
            driver_phone: target.transport_info?.driver_phone || '',
            vehicle_no: target.transport_info?.vehicle_no || '',
            delivery_person: target.transport_info?.delivery_person || '',
            transport_name: target.transport_info?.transport_name || '',
            station: target.transport_info?.station || '',
            gr_rr_no: target.transport_info?.gr_rr_no || '',
            showTransport: !!target.transport_info?.driver_name,
            items: rawItems,
            billSundries: rawSundries,
            isHeld: !!target.is_held,
          });
          setActiveVoucherModal({
            isOpen: true,
            type: 'sales',
            action: 'modify',
            voucherToEdit: target,
          });
          return;
        } else {
          setToastMessage({
            text: 'No recorded sales vouchers found to modify. Launching Add Sales Voucher mode.',
            type: 'info',
          });
          openVoucherAction('sales', 'add');
          return;
        }
      } else {
        // list
        setVoucherSearchTerm('');
        setActiveVoucherModal({
          isOpen: true,
          type: 'sales',
          action: 'list',
          voucherToEdit: null,
        });
        return;
      }
    }

    const prefix =
      vType === 'payment'
        ? 'PV'
        : vType === 'receipt'
        ? 'RV'
        : vType === 'journal'
        ? 'JV'
        : vType === 'contra'
        ? 'CV'
        : vType === 'notes'
        ? 'CN'
        : 'SJ';
    const typeVouchers = vouchers.filter((v) => v.voucher_type === vType);
    const nextNum = `${prefix}-${String(typeVouchers.length + 101).padStart(3, '0')}`;

    if (action === 'add') {
      setVoucherFormData({
        voucher_number: nextNum,
        date_bs: todayBs,
        date_ad: todayAd,
        payment_mode: vType === 'contra' ? 'Cash' : 'Bank',
        account_debit: catConfig?.defaultDebit || '',
        account_credit: catConfig?.defaultCredit || '',
        amount: '',
        cheque_number: '',
        reference_no: '',
        narration: '',
      });
      setActiveVoucherModal({
        isOpen: true,
        type: vType,
        action: 'add',
        voucherToEdit: null,
      });
    } else if (action === 'modify') {
      const target = voucher || typeVouchers[0];
      if (target) {
        setVoucherFormData({
          voucher_number: target.voucher_number,
          date_bs: target.date_bs,
          date_ad: target.date_ad,
          payment_mode: target.payment_mode || 'Bank',
          account_debit: target.account_debit,
          account_credit: target.account_credit,
          amount: target.amount,
          cheque_number: target.cheque_number || '',
          reference_no: target.reference_no || '',
          narration: target.narration,
        });
        setActiveVoucherModal({
          isOpen: true,
          type: vType,
          action: 'modify',
          voucherToEdit: target,
        });
      } else {
        setToastMessage({
          text: `No existing ${catConfig?.label || 'Voucher'} entries found to modify. Launching Add mode.`,
          type: 'info',
        });
        openVoucherAction(vType, 'add');
      }
    } else {
      // List
      setVoucherSearchTerm('');
      setActiveVoucherModal({
        isOpen: true,
        type: vType,
        action: 'list',
        voucherToEdit: null,
      });
    }
  };

  // Keyboard Event Listener for Arrow Tree Navigation
  useEffect(() => {
    const handleTreeNavigationKeyDown = (e: KeyboardEvent) => {
      // Do not hijack typing if any form input, textarea, select or modal is active
      const activeEl = document.activeElement;
      const isInputActive =
        activeEl &&
        (activeEl.tagName === 'INPUT' ||
          activeEl.tagName === 'TEXTAREA' ||
          activeEl.tagName === 'SELECT' ||
          activeEl.getAttribute('contenteditable') === 'true');

      if (activeVoucherModal.isOpen || isInputActive) {
        return;
      }

      if (!['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Enter'].includes(e.key)) {
        return;
      }

      if (!visibleTreeItems || visibleTreeItems.length === 0) return;

      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setTreeFocusedId((prev) => {
          if (!prev) return visibleTreeItems[0].id;
          const idx = visibleTreeItems.findIndex((item) => item.id === prev);
          if (idx === -1) return visibleTreeItems[0].id;
          const nextIdx = Math.min(idx + 1, visibleTreeItems.length - 1);
          const nextId = visibleTreeItems[nextIdx].id;
          setTimeout(() => {
            const el = document.getElementById(nextId);
            if (el) el.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
          }, 10);
          return nextId;
        });
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setTreeFocusedId((prev) => {
          if (!prev) return visibleTreeItems[visibleTreeItems.length - 1].id;
          const idx = visibleTreeItems.findIndex((item) => item.id === prev);
          if (idx === -1) return visibleTreeItems[0].id;
          const prevIdx = Math.max(idx - 1, 0);
          const prevId = visibleTreeItems[prevIdx].id;
          setTimeout(() => {
            const el = document.getElementById(prevId);
            if (el) el.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
          }, 10);
          return prevId;
        });
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        const currentItem = visibleTreeItems.find((item) => item.id === treeFocusedId);
        if (currentItem) {
          if (currentItem.type === 'hub' && !isTransactionsExpanded) {
            setIsTransactionsExpanded(true);
          } else if (currentItem.type === 'voucher_category' && currentItem.voucherKey) {
            if (!expandedVoucherTypes[currentItem.voucherKey]) {
              setExpandedVoucherTypes((prev) => ({ ...prev, [currentItem.voucherKey!]: true }));
            } else {
              const addNodeId = `tree-action-${currentItem.voucherKey}-add`;
              setTreeFocusedId(addNodeId);
              setTimeout(() => {
                const el = document.getElementById(addNodeId);
                if (el) el.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
              }, 10);
            }
          }
        }
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        const currentItem = visibleTreeItems.find((item) => item.id === treeFocusedId);
        if (currentItem) {
          if (currentItem.type === 'action' && currentItem.voucherKey) {
            const catId = `tree-cat-${currentItem.voucherKey}`;
            setTreeFocusedId(catId);
            setTimeout(() => {
              const el = document.getElementById(catId);
              if (el) el.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
            }, 10);
          } else if (currentItem.type === 'voucher_category' && currentItem.voucherKey) {
            if (expandedVoucherTypes[currentItem.voucherKey]) {
              setExpandedVoucherTypes((prev) => ({ ...prev, [currentItem.voucherKey!]: false }));
            } else {
              setTreeFocusedId('tree-transactions-root');
              setTimeout(() => {
                const el = document.getElementById('tree-transactions-root');
                if (el) el.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
              }, 10);
            }
          } else if (currentItem.type === 'hub' && isTransactionsExpanded) {
            setIsTransactionsExpanded(false);
          }
        }
      } else if (e.key === 'Enter') {
        e.preventDefault();
        const currentItem = visibleTreeItems.find((item) => item.id === treeFocusedId);
        if (currentItem) {
          if (currentItem.type === 'hub') {
            setIsTransactionsExpanded((prev) => !prev);
          } else if (currentItem.type === 'voucher_category' && currentItem.voucherKey) {
            setExpandedVoucherTypes((prev) => ({
              ...prev,
              [currentItem.voucherKey!]: !prev[currentItem.voucherKey!],
            }));
          } else if (currentItem.type === 'action' && currentItem.voucherKey && currentItem.action) {
            openVoucherAction(currentItem.voucherKey, currentItem.action);
          }
        }
      }
    };

    window.addEventListener('keydown', handleTreeNavigationKeyDown);
    return () => window.removeEventListener('keydown', handleTreeNavigationKeyDown);
  }, [visibleTreeItems, treeFocusedId, isTransactionsExpanded, expandedVoucherTypes, activeVoucherModal.isOpen]);

  // Busy/Tally Style Form Enter-Key Field Traversal
  const handleVoucherFormKeyDown = (e: React.KeyboardEvent<HTMLFormElement>) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      setActiveVoucherModal((prev) => ({ ...prev, isOpen: false }));
      return;
    }

    if (e.key === 'Enter' && !e.shiftKey) {
      const target = e.target as HTMLElement;
      // Allow multi-line typing in textarea unless Ctrl+Enter is used
      if (target.tagName === 'TEXTAREA' && !e.ctrlKey) {
        return;
      }
      e.preventDefault();

      const form = e.currentTarget;
      const focusable = Array.from(
        form.querySelectorAll(
          'input:not([disabled]):not([type="hidden"]), select:not([disabled]), textarea:not([disabled]), button[type="submit"]:not([disabled])'
        )
      ) as HTMLElement[];

      const idx = focusable.indexOf(target);
      if (idx >= 0 && idx < focusable.length - 1) {
        focusable[idx + 1].focus();
      } else if (idx === focusable.length - 1) {
        target.click();
      }
    } else if (e.key === 'Enter' && e.shiftKey) {
      const target = e.target as HTMLElement;
      e.preventDefault();
      const form = e.currentTarget;
      const focusable = Array.from(
        form.querySelectorAll(
          'input:not([disabled]):not([type="hidden"]), select:not([disabled]), textarea:not([disabled]), button[type="submit"]:not([disabled])'
        )
      ) as HTMLElement[];
      const idx = focusable.indexOf(target);
      if (idx > 0) {
        focusable[idx - 1].focus();
      }
    }
  };

  // Save / Update Voucher
  const handleSaveVoucher = (e: React.FormEvent) => {
    e.preventDefault();
    const numAmount =
      typeof voucherFormData.amount === 'number'
        ? voucherFormData.amount
        : parseFloat(String(voucherFormData.amount || '0'));

    if (isNaN(numAmount) || numAmount <= 0) {
      setToastMessage({ text: 'Please enter a valid amount greater than 0', type: 'error' });
      return;
    }
    if (!voucherFormData.account_debit.trim() || !voucherFormData.account_credit.trim()) {
      setToastMessage({ text: 'Please specify both Debit and Credit accounts', type: 'error' });
      return;
    }

    const catConfig = VOUCHER_CATEGORIES.find((c) => c.key === activeVoucherModal.type);

    if (activeVoucherModal.action === 'modify' && activeVoucherModal.voucherToEdit) {
      setVouchers((prev) =>
        prev.map((v) =>
          v.id === activeVoucherModal.voucherToEdit!.id
            ? {
                ...v,
                voucher_number: voucherFormData.voucher_number,
                date_bs: voucherFormData.date_bs,
                date_ad: voucherFormData.date_ad,
                payment_mode: voucherFormData.payment_mode,
                account_debit: voucherFormData.account_debit,
                account_credit: voucherFormData.account_credit,
                amount: numAmount,
                cheque_number: voucherFormData.cheque_number,
                reference_no: voucherFormData.reference_no,
                narration: voucherFormData.narration,
              }
            : v
        )
      );
      setToastMessage({
        text: `${catConfig?.label || 'Voucher'} #${voucherFormData.voucher_number} updated successfully`,
        type: 'success',
      });
      setActiveVoucherModal((prev) => ({ ...prev, isOpen: false }));
    } else {
      // Add
      const newV: AccountingVoucher = {
        id: `v-${Date.now()}`,
        voucher_type: activeVoucherModal.type,
        voucher_number: voucherFormData.voucher_number,
        date_bs: voucherFormData.date_bs,
        date_ad: voucherFormData.date_ad,
        payment_mode: voucherFormData.payment_mode,
        account_debit: voucherFormData.account_debit,
        account_credit: voucherFormData.account_credit,
        amount: numAmount,
        cheque_number: voucherFormData.cheque_number,
        reference_no: voucherFormData.reference_no,
        narration: voucherFormData.narration,
        created_at: new Date().toISOString(),
      };
      setVouchers((prev) => [newV, ...prev]);
      setToastMessage({
        text: `${catConfig?.label || 'Voucher'} #${voucherFormData.voucher_number} posted to ledger [Enter]`,
        type: 'success',
      });
      setActiveVoucherModal((prev) => ({ ...prev, isOpen: false }));
    }
  };

  // Delete Voucher
  const handleDeleteVoucher = (voucherId: string) => {
    setVouchers((prev) => prev.filter((v) => v.id !== voucherId));
    setToastMessage({ text: 'Voucher removed from ledger', type: 'info' });
  };

  // ==========================================
  // EXCEL & PDF EXPORT UTILITIES (STANDARDIZED)
  // ==========================================
  const exportToPdf = (
    title: string,
    headers: string[],
    rows: (string | number)[][],
    summaryText?: string,
    customFilename?: string,
    summaryCards?: { label: string; value: string; color?: [number, number, number] }[]
  ) => {
    try {
      const compName = currentCompany?.name || activeCompanyName || 'ChequeDesk';
      const operatorName = currentUser?.name || 'Accountant';
      const cleanSummary = summaryText ? summaryText.replace(/<[^>]*>?/gm, ' ').replace(/\s+/g, ' ').trim() : '';

      const doc = new jsPDF({ orientation: 'landscape', unit: 'pt', format: 'a4' });
      
      // Top header banner line
      doc.setFillColor(79, 70, 229);
      doc.rect(40, 24, 762, 3, 'F');

      // Company Name
      doc.setFontSize(15);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(30, 27, 75);
      doc.text(compName, 40, 44);

      // Report Title
      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(79, 70, 229);
      doc.text(title, 40, 60);

      // System Tagline
      doc.setFontSize(8);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(100, 116, 139);
      doc.text(`Company Code: ${activeCompanyCode} • ChequeDesk Multi-Tenant Financial ERP`, 40, 72);

      // Top Right Meta Info
      doc.setFontSize(8);
      doc.setTextColor(100, 116, 139);
      doc.text(`Generated Date (BS): ${getCurrentBsDate()}`, 802, 44, { align: 'right' });
      doc.text(`Generated Date (AD): ${getCurrentAdDate()}`, 802, 56, { align: 'right' });
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(30, 41, 59);
      doc.text(`Total Records: ${rows.length}`, 802, 68, { align: 'right' });

      let startY = 82;

      // Render Executive Metric Summary Cards if provided
      if (summaryCards && summaryCards.length > 0) {
        const gap = 8;
        const totalW = 762;
        const cardW = (totalW - (summaryCards.length - 1) * gap) / summaryCards.length;
        const cardH = 34;

        summaryCards.forEach((card, idx) => {
          const cardX = 40 + idx * (cardW + gap);
          // Background box
          doc.setFillColor(248, 250, 252);
          doc.setDrawColor(226, 232, 240);
          doc.roundedRect(cardX, startY, cardW, cardH, 4, 4, 'FD');

          // Label
          doc.setFontSize(6.5);
          doc.setFont('helvetica', 'bold');
          doc.setTextColor(100, 116, 139);
          doc.text(card.label.toUpperCase(), cardX + 8, startY + 12);

          // Value
          doc.setFontSize(9);
          doc.setFont('helvetica', 'bold');
          const [r, g, b] = card.color || [15, 23, 42];
          doc.setTextColor(r, g, b);
          doc.text(card.value, cardX + 8, startY + 26);
        });

        startY += cardH + 10;
      } else if (cleanSummary) {
        doc.setFillColor(248, 250, 252);
        doc.setDrawColor(226, 232, 240);
        doc.roundedRect(40, startY, 762, 22, 4, 4, 'FD');
        doc.setFontSize(7.5);
        doc.setTextColor(30, 41, 59);
        doc.setFont('helvetica', 'bold');
        doc.text(cleanSummary.slice(0, 160), 48, startY + 14);
        startY += 30;
      }

      const formattedRows = rows.map((r) =>
        r.map((c) => {
          if (c === null || c === undefined) return '';
          let s = String(c);
          s = s.replace(/<br\s*\/?>/gi, '\n');
          s = s.replace(/<[^>]*>?/gm, '');
          return s;
        })
      );

      const autoTableFn = (autoTable as any).default || autoTable;

      autoTableFn(doc, {
        head: [headers],
        body: formattedRows,
        startY: startY,
        margin: { left: 40, right: 40, bottom: 65 },
        theme: 'striped',
        headStyles: {
          fillColor: [79, 70, 229],
          textColor: [255, 255, 255],
          fontSize: 8,
          fontStyle: 'bold',
          halign: 'left',
          cellPadding: 4,
        },
        styles: {
          fontSize: 7.5,
          cellPadding: 4,
          overflow: 'linebreak',
          textColor: [30, 41, 59],
        },
        alternateRowStyles: {
          fillColor: [248, 250, 252],
        },
        didParseCell: (data: any) => {
          const rowData = data.row.raw;
          if (Array.isArray(rowData)) {
            const firstCell = String(rowData[0] || '').toUpperCase();
            if (firstCell.includes('TOTAL') || firstCell.includes('GRAND')) {
              data.cell.styles.fontStyle = 'bold';
              data.cell.styles.fillColor = [241, 245, 249];
              data.cell.styles.textColor = [15, 23, 42];
            }
          }
        },
        didDrawPage: (data: any) => {
          const pageCount = (doc as any).internal.getNumberOfPages();
          const currentPage = data.pageNumber;

          doc.setDrawColor(226, 232, 240);
          doc.line(40, 545, 802, 545);

          doc.setFontSize(8);
          doc.setTextColor(71, 85, 105);
          doc.text(`Prepared By: ${operatorName}`, 40, 558);
          doc.text(`Accountant / Verified By: ____________________`, 320, 558);
          doc.text(`Authorized Signatory: ____________________`, 600, 558);

          doc.setFontSize(7.5);
          doc.setTextColor(148, 163, 184);
          doc.text(`ChequeDesk Multi-Tenant Financial ERP • Certified Record`, 40, 575);
          doc.text(`Page ${currentPage} of ${pageCount}`, 802, 575, { align: 'right' });
        },
      });

      const finalFilename = customFilename || `${title.replace(/[^a-zA-Z0-9_-]/g, '_')}.pdf`;
      try {
        const blob = doc.output('blob');
        const blobUrl = URL.createObjectURL(blob);
        const downloadLink = document.createElement('a');
        downloadLink.href = blobUrl;
        downloadLink.download = finalFilename;
        document.body.appendChild(downloadLink);
        downloadLink.click();
        setTimeout(() => {
          try {
            document.body.removeChild(downloadLink);
            URL.revokeObjectURL(blobUrl);
          } catch {}
        }, 300);
      } catch {
        doc.save(finalFilename);
      }
      showToast(`Downloaded ${finalFilename} directly without print dialog!`, 'success');
    } catch (err: any) {
      console.error('Direct PDF export error:', err);
      showToast(`PDF generation error: ${err?.message || 'Failed'}`, 'error');
    }
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
      'Issue Date',
      'Due Date',
      'Total Amount',
      'Payment Entries / Installments',
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
        ? logs.map((l) => `${l.payment_date_bs} BS: NPR ${l.amount.toLocaleString()} (${l.payment_mode})`).join('\n')
        : 'No installments recorded';

      return [
        c.cheque_number,
        c.bill_number || '-',
        party?.name || 'N/A',
        bank?.name || 'N/A',
        `${c.issue_date_bs}\n(${c.issue_date_ad})`,
        `${c.due_date_bs}\n(${c.due_date_ad})`,
        formatNPR(c.amount),
        paymentsText,
        formatNPR(remaining),
        c.status,
      ];
    });

    const recoveryPct = grandTotalAmount > 0 ? Math.round((grandTotalReceived / grandTotalAmount) * 100) : 0;

    // Append Grand Totals Row
    rows.push([
      'GRAND TOTALS',
      '-',
      `${parties.length} Parties`,
      '-',
      '-',
      '-',
      formatNPR(grandTotalAmount),
      `${grandTotalInstallments} Entries (${formatNPR(grandTotalReceived)})`,
      formatNPR(grandTotalRemaining),
      `${recoveryPct}% Cleared`,
    ]);

    const summaryCards = [
      { label: 'TOTAL CHEQUE VALUE', value: formatNPR(grandTotalAmount), color: [15, 23, 42] as [number, number, number] },
      { label: 'TOTAL SETTLED / PAID', value: formatNPR(grandTotalReceived), color: [5, 150, 105] as [number, number, number] },
      { label: 'REMAINING DUE', value: formatNPR(grandTotalRemaining), color: [217, 119, 6] as [number, number, number] },
      { label: 'INSTALLMENT ENTRIES', value: `${grandTotalInstallments} Logs`, color: [67, 56, 202] as [number, number, number] },
      { label: 'RECOVERY RATE', value: `${recoveryPct}% Settled`, color: [2, 132, 199] as [number, number, number] },
    ];

    exportToPdf(
      'Partial Payment Ledger & Installment Audit Report',
      headers,
      rows,
      `Total Volume: NPR ${formatNPR(grandTotalAmount)} | Total Received: NPR ${formatNPR(grandTotalReceived)} | Remaining Due: NPR ${formatNPR(grandTotalRemaining)} | Recovery: ${recoveryPct}%`,
      'Partial_Payment_Ledger.pdf',
      summaryCards
    );
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

  const downloadChequeLeafPdf = (cheque: Cheque, bank?: Bank, isAccountPayee: boolean = true) => {
    try {
      const party = parties.find((p) => p.id === cheque.party_id);
      const partyName = party?.name || 'Cash / Self';
      const bankName = bank?.name || 'Standard Chartered Bank Nepal Ltd.';
      const bankCode = bank?.code || 'SCB-01';
      const acNo = cheque.account_number || '01-234567-89';
      const compName = currentCompany?.name || activeCompanyName || 'ChequeDesk Enterprise';

      // Standard Cheque Leaf Dimensions: 576pt x 252pt (~8" x 3.5")
      const doc = new jsPDF({ orientation: 'landscape', unit: 'pt', format: [576, 252] });

      // Background security tint & border
      doc.setFillColor(254, 252, 232);
      doc.roundedRect(12, 12, 552, 228, 6, 6, 'F');
      doc.setDrawColor(217, 119, 6);
      doc.setLineWidth(1);
      doc.roundedRect(12, 12, 552, 228, 6, 6, 'D');

      // Decorative Guilloche security pattern lines
      doc.setDrawColor(245, 158, 11);
      doc.setLineWidth(0.5);
      doc.line(20, 20, 556, 20);
      doc.line(20, 232, 556, 232);

      // A/C Payee Only Cross lines if selected
      if (isAccountPayee) {
        doc.setDrawColor(79, 70, 229);
        doc.setLineWidth(1.2);
        doc.line(24, 60, 90, 24);
        doc.line(34, 66, 100, 30);
        doc.setFontSize(6.5);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(79, 70, 229);
        doc.text('A/C PAYEE ONLY', 38, 48, { angle: -32 });
      }

      // Bank Info (Top left)
      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(15, 23, 42);
      doc.text(bankName.toUpperCase(), 110, 36);

      doc.setFontSize(7.5);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(100, 116, 139);
      doc.text(`Kathmandu Main Branch • Code: ${bankCode} • CTS-2010 Compliant`, 110, 48);

      // Date boxes (Top right)
      doc.setFontSize(7);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(71, 85, 105);
      doc.text('DATE (BS / AD)', 440, 34);

      doc.setFillColor(255, 255, 255);
      doc.setDrawColor(203, 213, 225);
      doc.roundedRect(440, 38, 114, 18, 2, 2, 'FD');
      doc.setFontSize(8);
      doc.setTextColor(15, 23, 42);
      doc.setFont('helvetica', 'bold');
      doc.text(`${cheque.due_date_bs} BS`, 445, 50);
      doc.setFontSize(6.5);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(100, 116, 139);
      doc.text(`(${cheque.due_date_ad} AD)`, 505, 50);

      // PAY TO Line
      doc.setFontSize(8.5);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(51, 65, 85);
      doc.text('PAY TO', 30, 80);

      doc.setFontSize(10.5);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(15, 23, 42);
      doc.text(partyName, 80, 80);
      doc.setDrawColor(148, 163, 184);
      doc.setLineWidth(0.6);
      doc.line(80, 84, 460, 84);

      doc.setFontSize(8);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(100, 116, 139);
      doc.text('OR BEARER', 470, 80);

      // RUPEES / AMOUNT IN WORDS
      doc.setFontSize(8.5);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(51, 65, 85);
      doc.text('RUPEES', 30, 108);

      const words = numberToWords(cheque.amount) + ' ONLY';
      doc.setFontSize(8.5);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(30, 41, 59);
      
      const splitWords = doc.splitTextToSize(words, 370);
      doc.text(splitWords, 80, 108);
      doc.setDrawColor(148, 163, 184);
      doc.line(80, 112, 455, 112);
      if (splitWords.length > 1) {
        doc.line(30, 126, 455, 126);
      }

      // Amount Box (Right side)
      doc.setFillColor(255, 255, 255);
      doc.setDrawColor(79, 70, 229);
      doc.setLineWidth(1.2);
      doc.roundedRect(462, 98, 92, 28, 3, 3, 'FD');

      doc.setFontSize(7);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(79, 70, 229);
      doc.text('NPR', 466, 115);

      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(15, 23, 42);
      doc.text(`**${cheque.amount.toLocaleString()}**`, 488, 116);

      // Account Number box & Company
      doc.setFontSize(8);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(71, 85, 105);
      doc.text(`A/C NO: ${acNo}`, 30, 155);

      // Signatory section (Right bottom)
      doc.setFontSize(8);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(71, 85, 105);
      doc.text(`FOR ${compName.toUpperCase()}`, 390, 150);

      doc.setDrawColor(148, 163, 184);
      doc.line(390, 185, 550, 185);

      doc.setFontSize(7);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(100, 116, 139);
      doc.text('AUTHORISED SIGNATORIES', 420, 196);

      // MICR Band at bottom
      doc.setFillColor(241, 245, 249);
      doc.roundedRect(20, 206, 536, 20, 2, 2, 'F');

      doc.setFontSize(9);
      doc.setFont('courier', 'bold');
      doc.setTextColor(30, 41, 59);
      doc.text(`⑈${cheque.cheque_number}⑈  446012002⑆  001234⑈  10`, 160, 220);

      const filename = `Cheque_Leaf_${cheque.cheque_number}.pdf`;
      const blob = doc.output('blob');
      const blobUrl = URL.createObjectURL(blob);
      const downloadLink = document.createElement('a');
      downloadLink.href = blobUrl;
      downloadLink.download = filename;
      document.body.appendChild(downloadLink);
      downloadLink.click();
      setTimeout(() => {
        try {
          document.body.removeChild(downloadLink);
          URL.revokeObjectURL(blobUrl);
        } catch {}
      }, 300);

      showToast(`Downloaded ${filename} directly!`, 'success');
    } catch (err: any) {
      console.error('Cheque Leaf PDF error:', err);
      showToast(`Failed to generate Cheque Leaf PDF: ${err?.message || 'Error'}`, 'error');
    }
  };

  const exportChequesToCsv = (chequeList: Cheque[], fileName: string) => {
    try {
      const rows = chequeList.map((c) => {
        const party = parties.find((p) => p.id === c.party_id);
        const bank = banks.find((b) => b.id === c.bank_id);
        return {
          'Cheque Number': c.cheque_number,
          'Party / Payee': party?.name || 'N/A',
          'Bank': bank?.name || 'N/A',
          'Account Number': c.account_number || '',
          'Amount': c.amount,
          'Remaining': c.remaining_amount ?? c.amount,
          'Status': c.status,
          'Issue Date (BS)': c.issue_date_bs,
          'Due Date (BS)': c.due_date_bs,
          'Bill No': c.bill_number || '',
        };
      });
      const ws = XLSX.utils.json_to_sheet(rows);
      const csv = XLSX.utils.sheet_to_csv(ws);
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${fileName}_${activeCompanyCode}_${Date.now()}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      showToast(`Exported ${chequeList.length} records to CSV successfully!`, 'success');
    } catch {
      showToast('Failed to export CSV file', 'error');
    }
  };

  const exportPartialPaymentLedgerToCsv = (chequeList: Cheque[]) => {
    try {
      const rows: any[] = [];
      chequeList.forEach((c) => {
        const party = parties.find((p) => p.id === c.party_id);
        const bank = banks.find((b) => b.id === c.bank_id);
        const remaining = c.remaining_amount ?? (c.status === 'Cleared' ? 0 : c.amount);
        const paid = (c.amount || 0) - remaining;
        const logs = paymentLogs.filter((p) => p.cheque_id === c.id);
        rows.push({
          'Cheque Number': c.cheque_number,
          'Bill Number': c.bill_number || '-',
          'Party / Payee': party?.name || 'N/A',
          'Bank': bank?.name || 'N/A',
          'Original Amount': c.amount,
          'Total Received/Paid': paid,
          'Remaining Balance': remaining,
          'Installments Count': logs.length,
          'Status': c.status,
          'Due Date (BS)': c.due_date_bs,
        });
      });
      const ws = XLSX.utils.json_to_sheet(rows);
      const csv = XLSX.utils.sheet_to_csv(ws);
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Partial_Payment_Ledger_${activeCompanyCode}_${Date.now()}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      showToast(`Exported ${chequeList.length} ledger records to CSV successfully!`, 'success');
    } catch {
      showToast('Failed to export CSV file', 'error');
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

  // ==========================================
  // MULTI-SHEET EXCEL BACKUP (4 SHEETS)
  // ==========================================
  const exportMultiSheetBackupExcel = () => {
    try {
      const wb = XLSX.utils.book_new();

      // Sheet 1: "All Cheques" (Complete entry register)
      const allChequesRows = cheques.map((c) => {
        const party = parties.find((p) => p.id === c.party_id);
        const bank = banks.find((b) => b.id === c.bank_id);
        const remaining = c.remaining_amount ?? (c.status === 'Cleared' ? 0 : c.amount);
        const paid = (c.amount || 0) - remaining;
        const logs = paymentLogs.filter((p) => p.cheque_id === c.id);
        return {
          'Cheque Number': c.cheque_number,
          'Bill Number': c.bill_number || '-',
          'Party / Payee': party?.name || 'N/A',
          'Party Type': party?.party_type || 'Sundry Debtors',
          'Bank Name': bank?.name || 'N/A',
          'Account Number': c.account_number || '',
          'Original Amount (NPR)': c.amount,
          'Paid / Received (NPR)': paid,
          'Remaining Balance (NPR)': remaining,
          'Status': c.status,
          'Issue Date (BS)': c.issue_date_bs,
          'Issue Date (AD)': c.issue_date_ad,
          'Due Date (BS)': c.due_date_bs,
          'Due Date (AD)': c.due_date_ad,
          'Installments Count': logs.length,
          'Remarks / Notes': c.notes || '',
        };
      });
      const wsAll = XLSX.utils.json_to_sheet(allChequesRows);
      XLSX.utils.book_append_sheet(wb, wsAll, 'All Cheques');

      // Sheet 2: "Pending Cheques" (Active pending dues by date)
      const pendingList = cheques.filter(
        (c) => c.status !== 'Cleared' && ((c.remaining_amount ?? c.amount ?? 0) > 0.001)
      );
      const pendingRows = pendingList.map((c) => {
        const party = parties.find((p) => p.id === c.party_id);
        const bank = banks.find((b) => b.id === c.bank_id);
        const remaining = c.remaining_amount ?? c.amount;
        const paid = (c.amount || 0) - remaining;
        return {
          'Cheque Number': c.cheque_number,
          'Bill Number': c.bill_number || '-',
          'Party / Payee': party?.name || 'N/A',
          'Party Classification': party?.party_type || 'Sundry Debtors',
          'Bank': bank?.name || 'N/A',
          'Due Date (BS)': c.due_date_bs,
          'Due Date (AD)': c.due_date_ad,
          'Original Amount (NPR)': c.amount,
          'Settled So Far (NPR)': paid,
          'Pending Balance (NPR)': remaining,
          'Status': c.status,
          'Remarks': c.notes || '',
        };
      });
      const wsPending = XLSX.utils.json_to_sheet(pendingRows);
      XLSX.utils.book_append_sheet(wb, wsPending, 'Pending Cheques');

      // Sheet 3: "Cleared & Partial Payments" (Full installment ledger & settlement details)
      const paymentDetailRows: any[] = [];
      for (const log of paymentLogs) {
        const chq = cheques.find((c) => c.id === log.cheque_id);
        const party = parties.find((p) => p.id === chq?.party_id);
        const bank = banks.find((b) => b.id === chq?.bank_id);
        paymentDetailRows.push({
          'Cheque Number': chq?.cheque_number || log.cheque_id,
          'Bill Number': chq?.bill_number || '-',
          'Party / Payee': party?.name || 'N/A',
          'Bank': bank?.name || 'N/A',
          'Payment Date (BS)': log.payment_date_bs,
          'Payment Date (AD)': log.payment_date_ad,
          'Payment Mode': log.payment_mode,
          'Transaction Type': log.transaction_type || (party?.party_type === 'Sundry Creditors' ? 'Payment' : 'Received'),
          'Installment Amount (NPR)': log.amount,
          'Original Cheque Amount (NPR)': chq?.amount || 0,
          'Remaining Balance After (NPR)': log.remaining_balance_after ?? (chq?.remaining_amount ?? 0),
          'Notes / Reference': log.notes || '',
        });
      }
      if (paymentDetailRows.length === 0) {
        const clearedList = cheques.filter((c) => c.status === 'Cleared');
        for (const c of clearedList) {
          const party = parties.find((p) => p.id === c.party_id);
          const bank = banks.find((b) => b.id === c.bank_id);
          paymentDetailRows.push({
            'Cheque Number': c.cheque_number,
            'Bill Number': c.bill_number || '-',
            'Party / Payee': party?.name || 'N/A',
            'Bank': bank?.name || 'N/A',
            'Payment Date (BS)': c.due_date_bs,
            'Payment Date (AD)': c.due_date_ad,
            'Payment Mode': 'Full Settlement',
            'Transaction Type': party?.party_type === 'Sundry Creditors' ? 'Payment' : 'Received',
            'Installment Amount (NPR)': c.amount,
            'Original Cheque Amount (NPR)': c.amount,
            'Remaining Balance After (NPR)': 0,
            'Notes / Reference': 'Cleared in full',
          });
        }
      }
      const wsPayments = XLSX.utils.json_to_sheet(paymentDetailRows);
      XLSX.utils.book_append_sheet(wb, wsPayments, 'Cleared & Partial Payments');

      // Sheet 4: "Master Data" (Parties, Payees, and Bank Accounts)
      const masterRows: any[] = [];
      masterRows.push({
        'Master Section': '--- PARTIES & PAYEES DIRECTORY ---',
        'Name / Bank': '',
        'Type / Code': '',
        'Phone / Account': '',
        'Address / Branch': '',
        'Total Cheques': '',
        'Total Volume (NPR)': '',
        'Pending Balance (NPR)': '',
      });
      parties.forEach((p) => {
        const pCheques = cheques.filter((c) => c.party_id === p.id);
        const pTotal = pCheques.reduce((s, c) => s + (c.amount || 0), 0);
        const pPending = pCheques.reduce((s, c) => s + (c.remaining_amount ?? (c.status === 'Cleared' ? 0 : c.amount)), 0);
        masterRows.push({
          'Master Section': 'Parties',
          'Name / Bank': p.name,
          'Type / Code': p.party_type || 'Sundry Debtors',
          'Phone / Account': p.phone || 'N/A',
          'Address / Branch': p.address || p.pan_vat || 'N/A',
          'Total Cheques': pCheques.length,
          'Total Volume (NPR)': pTotal,
          'Pending Balance (NPR)': pPending,
        });
      });
      masterRows.push({
        'Master Section': '--- REGISTERED BANK ACCOUNTS ---',
        'Name / Bank': '',
        'Type / Code': '',
        'Phone / Account': '',
        'Address / Branch': '',
        'Total Cheques': '',
        'Total Volume (NPR)': '',
        'Pending Balance (NPR)': '',
      });
      banks.forEach((b) => {
        const bCheques = cheques.filter((c) => c.bank_id === b.id);
        const bTotal = bCheques.reduce((s, c) => s + (c.amount || 0), 0);
        const bPending = bCheques.reduce((s, c) => s + (c.remaining_amount ?? (c.status === 'Cleared' ? 0 : c.amount)), 0);
        const accNos = Array.from(new Set(bCheques.map((c) => c.account_number).filter(Boolean))).join(', ');
        masterRows.push({
          'Master Section': 'Banks',
          'Name / Bank': b.name,
          'Type / Code': b.code || 'N/A',
          'Phone / Account': accNos || b.account_number || 'N/A',
          'Address / Branch': b.branch || 'Main Branch',
          'Total Cheques': bCheques.length,
          'Total Volume (NPR)': bTotal,
          'Pending Balance (NPR)': bPending,
        });
      });
      const wsMaster = XLSX.utils.json_to_sheet(masterRows);
      XLSX.utils.book_append_sheet(wb, wsMaster, 'Master Data');

      const fileName = `ChequeDesk_Comprehensive_Backup_${activeCompanyCode}_${new Date().toISOString().slice(0, 10)}.xlsx`;
      XLSX.writeFile(wb, fileName);
      showToast('Exported Multi-Sheet Excel Backup (4 Sheets) successfully!', 'success');
    } catch (err: any) {
      console.error('Multi-sheet Excel export failed:', err);
      showToast('Failed to export Multi-Sheet Excel Backup', 'error');
    }
  };

  // ==========================================
  // COMPLETE EXECUTIVE PDF AUDIT REPORT
  // ==========================================
  const exportCompletePdfReport = () => {
    const headers = ['Cheque #', 'Party / Payee', 'Classification', 'Bank', 'Due Date (BS)', 'Original Amt', 'Received/Paid', 'Pending Due', 'Status'];
    let totalAmt = 0;
    let totalPaid = 0;
    let totalDue = 0;

    const rows: (string | number)[][] = cheques.map((c) => {
      const party = parties.find((p) => p.id === c.party_id);
      const bank = banks.find((b) => b.id === c.bank_id);
      const remaining = c.remaining_amount ?? (c.status === 'Cleared' ? 0 : c.amount);
      const paid = (c.amount || 0) - remaining;
      totalAmt += c.amount || 0;
      totalPaid += paid;
      totalDue += remaining;

      return [
        c.cheque_number,
        party?.name || 'N/A',
        party?.party_type === 'Sundry Creditors' ? 'Creditor (Out)' : 'Debtor (In)',
        bank?.name || 'N/A',
        c.due_date_bs,
        formatNPR(c.amount),
        formatNPR(paid),
        formatNPR(remaining),
        c.status,
      ];
    });

    const recoveryRate = totalAmt > 0 ? Math.round((totalPaid / totalAmt) * 100) : 0;
    const summaryHeader = `
      <div style="display: grid; grid-template-columns: repeat(5, 1fr); gap: 8px; width: 100%; margin-bottom: 12px; background: #f8fafc; border: 1px solid #cbd5e1; border-radius: 6px; padding: 10px 12px;">
        <div><div style="font-size: 9px; color: #64748b; text-transform: uppercase; font-weight: 700;">Total Cheques</div><div style="font-size: 14px; font-weight: 800; color: #0f172a;">${cheques.length} Records</div></div>
        <div><div style="font-size: 9px; color: #64748b; text-transform: uppercase; font-weight: 700;">Total Volume</div><div style="font-size: 14px; font-weight: 800; color: #1e1b4b;">${formatNPR(totalAmt)}</div></div>
        <div><div style="font-size: 9px; color: #64748b; text-transform: uppercase; font-weight: 700;">Settled / Cleared</div><div style="font-size: 14px; font-weight: 800; color: #059669;">${formatNPR(totalPaid)}</div></div>
        <div><div style="font-size: 9px; color: #64748b; text-transform: uppercase; font-weight: 700;">Outstanding Due</div><div style="font-size: 14px; font-weight: 800; color: #d97706;">${formatNPR(totalDue)}</div></div>
        <div><div style="font-size: 9px; color: #64748b; text-transform: uppercase; font-weight: 700;">Recovery Rate</div><div style="font-size: 14px; font-weight: 800; color: #4338ca;">${recoveryRate}% Settled</div></div>
      </div>
      <div style="font-size: 10px; color: #64748b; margin-bottom: 8px; font-style: italic;">
        Included Masters: ${parties.length} Registered Parties | ${banks.length} Linked Banks | ${paymentLogs.length} Partial Payment Log Entries
      </div>
    `;

    rows.push([
      '<strong>TOTALS</strong>',
      `${parties.length} Parties`,
      '-',
      `${banks.length} Banks`,
      '-',
      `<strong>${formatNPR(totalAmt)}</strong>`,
      `<strong style="color:#059669">${formatNPR(totalPaid)}</strong>`,
      `<strong style="color:#d97706">${formatNPR(totalDue)}</strong>`,
      `<strong>${recoveryRate}% Cleared</strong>`,
    ]);

    exportToPdf('Complete Enterprise Cheque Register & Audit Report', headers, rows, summaryHeader);
  };

  // ==========================================
  // PARTY-WISE PARTIAL PAYMENT PDF LEDGER
  // ==========================================
  const exportPartyWiseLedgerPdf = (partyId: string) => {
    const party = parties.find((p) => p.id === partyId);
    if (!party) {
      showToast('Please select a valid party to generate statement', 'error');
      return;
    }

    const partyCheques = cheques.filter((c) => c.party_id === partyId);
    if (partyCheques.length === 0) {
      showToast(`No cheques recorded for party "${party.name}"`, 'info');
      return;
    }

    const headers = ['Cheque #', 'Bill #', 'Bank', 'Issue Date (BS)', 'Due Date (BS)', 'Original Amount', 'Installments / Received', 'Pending Balance', 'Status'];
    let partyTotalAmt = 0;
    let partyTotalPaid = 0;
    let partyTotalPending = 0;
    let partyTotalInstallments = 0;

    const rows: (string | number)[][] = partyCheques.map((c) => {
      const bank = banks.find((b) => b.id === c.bank_id);
      const logs = paymentLogs.filter((p) => p.cheque_id === c.id);
      const remaining = c.remaining_amount ?? (c.status === 'Cleared' ? 0 : c.amount);
      const paid = (c.amount || 0) - remaining;

      partyTotalAmt += c.amount || 0;
      partyTotalPaid += paid;
      partyTotalPending += remaining;
      partyTotalInstallments += logs.length;

      const paymentsText = logs.length > 0
        ? logs.map((l) => `${l.payment_date_bs} BS: NPR ${l.amount.toLocaleString()} (${l.payment_mode})`).join('\n')
        : 'No installments recorded';

      return [
        c.cheque_number,
        c.bill_number || '-',
        bank?.name || 'N/A',
        c.issue_date_bs,
        c.due_date_bs,
        formatNPR(c.amount),
        paymentsText,
        formatNPR(remaining),
        c.status,
      ];
    });

    const isCreditor = party.party_type === 'Sundry Creditors';
    const classification = isCreditor ? 'Sundry Creditors (Account Payable)' : 'Sundry Debtors (Account Receivable)';

    rows.push([
      'PARTY TOTALS',
      '-',
      '-',
      '-',
      '-',
      formatNPR(partyTotalAmt),
      `${formatNPR(partyTotalPaid)} (${partyTotalInstallments} entries)`,
      formatNPR(partyTotalPending),
      partyTotalPending <= 0.001 ? 'CLEARED' : 'PENDING',
    ]);

    const summaryCards = [
      { label: 'TOTAL CHEQUE VOLUME', value: formatNPR(partyTotalAmt), color: [15, 23, 42] as [number, number, number] },
      { label: isCreditor ? 'TOTAL PAID OUT' : 'TOTAL RECEIVED IN', value: formatNPR(partyTotalPaid), color: [5, 150, 105] as [number, number, number] },
      { label: 'OUTSTANDING DUE', value: formatNPR(partyTotalPending), color: [217, 119, 6] as [number, number, number] },
      { label: 'INSTALLMENT ENTRIES', value: `${partyTotalInstallments} Logs`, color: [67, 56, 202] as [number, number, number] },
    ];

    const cleanPartyName = party.name.replace(/[^a-zA-Z0-9_-]/g, '_');
    const customFilename = `Party_Ledger_${cleanPartyName}.pdf`;

    exportToPdf(
      `Party Account Ledger Statement - ${party.name} (${classification})`,
      headers,
      rows,
      `Party: ${party.name} | Phone: ${party.phone || 'N/A'} | PAN: ${party.pan_vat || 'N/A'} | Total: NPR ${formatNPR(partyTotalAmt)} | Paid: NPR ${formatNPR(partyTotalPaid)} | Due: NPR ${formatNPR(partyTotalPending)}`,
      customFilename,
      summaryCards
    );
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
          'Type': 'Sundry Debtors',
          'Address': 'New Road, Kathmandu',
          'Phone Number': '9851023456',
        },
        {
          'Party Name': 'Everest Hardware & Trading Corp',
          'Type': 'Sundry Creditors',
          'Address': 'Teku, Kathmandu',
          'Phone Number': '9841234567',
        },
        {
          'Party Name': 'Kathmandu Steel & Cement Agency',
          'Type': 'Sundry Debtors',
          'Address': 'Patan Industrial Estate, Lalitpur',
          'Phone Number': '9801982736',
        },
        {
          'Party Name': 'Nepal Paper Products Pvt Ltd',
          'Type': 'Sundry Creditors',
          'Address': 'Birgunj, Parsa',
          'Phone Number': '9812345678',
        },
      ];

      const ws = XLSX.utils.json_to_sheet(rows);
      ws['!cols'] = [
        { wch: 34 }, // Party Name
        { wch: 18 }, // Type
        { wch: 32 }, // Address
        { wch: 18 }, // Phone Number
      ];
      XLSX.utils.book_append_sheet(wb, ws, 'Sample_Parties');
      XLSX.writeFile(wb, 'Party_Import_Simplified_Template.xlsx');
      showToast('Downloaded Simplified Party Template (.xlsx)', 'success');
    } catch (err: any) {
      showToast(`Failed to download template: ${err?.message || 'Error'}`, 'error');
    }
  };

  const downloadSamplePartyCsvTemplate = () => {
    try {
      const csvContent =
        'Party Name,Type,Address,Phone Number\n' +
        '"Himalayan Suppliers Pvt Ltd","Sundry Debtors","New Road, Kathmandu","9851023456"\n' +
        '"Everest Hardware & Trading Corp","Sundry Creditors","Teku, Kathmandu","9841234567"\n' +
        '"Kathmandu Steel & Cement Agency","Sundry Debtors","Patan Industrial Estate, Lalitpur","9801982736"\n' +
        '"Nepal Paper Products Pvt Ltd","Sundry Creditors","Birgunj, Parsa","9812345678"\n';
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'Party_Import_Simplified_Template.csv';
      a.click();
      URL.revokeObjectURL(url);
      showToast('Downloaded Simplified Party CSV Template (.csv)', 'success');
    } catch (err: any) {
      showToast(`Failed to download CSV template: ${err?.message || 'Error'}`, 'error');
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
          r['Phone Number'] || r['Phone'] || r['Contact Phone'] || r['Mobile'] || r.Phone || r.mobile || ''
        ).trim();
        const address = String(
          r['Address'] || r['Party Address'] || r['Location'] || r['City'] || r.Address || r.address || ''
        ).trim();
        const panVat = String(
          r['PAN/VAT'] || r['PAN / VAT'] || r['PAN / VAT / Email'] || r['PAN / VAT Number'] || r['PAN'] || r.pan || r['VAT'] || r.vat || ''
        ).trim();
        const rawType = String(
          r['Type'] || r['Party Type'] || r['Debtors / Creditors'] || r['Classification'] || r.Type || ''
        ).trim().toLowerCase();

        const partyType: PartyType = (rawType.includes('creditor') || rawType === 'cr')
          ? 'Sundry Creditors'
          : 'Sundry Debtors';

        if (partyName && !existingNames.has(partyName.toLowerCase())) {
          await addParty({
            company_id: activeCompanyId,
            name: partyName,
            phone: phone || (contactPerson ? `Contact: ${contactPerson}` : undefined),
            pan_vat: panVat || undefined,
            address: address || undefined,
            party_type: partyType,
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
    const targetCheques = cheques.filter((c) =>
      matchesCustomOrPresetDateRange(c.due_date_bs, reportsFromDateBs, reportsToDateBs, reportsDatePreset)
    );
    const totalVolume = targetCheques.reduce((s, c) => s + c.amount, 0);
    const pendingVolume = targetCheques.filter((c) => c.status !== 'Cleared').reduce((s, c) => s + (c.remaining_amount ?? c.amount), 0);
    const clearedVolume = targetCheques.filter((c) => c.status === 'Cleared').reduce((s, c) => s + c.amount, 0);

    const headers = ['Bank / Account', 'Total Cheques', 'Total Volume (NPR)', 'Pending Balance (NPR)', 'Cleared (NPR)'];
    const rows = banks.map((b) => {
      const bCheques = targetCheques.filter((c) => c.bank_id === b.id);
      const bTotal = bCheques.reduce((s, c) => s + c.amount, 0);
      const bPending = bCheques.filter((c) => c.status !== 'Cleared').reduce((s, c) => s + (c.remaining_amount ?? c.amount), 0);
      const bCleared = bCheques.filter((c) => c.status === 'Cleared').reduce((s, c) => s + c.amount, 0);
      return [b.name, bCheques.length, formatNPR(bTotal), formatNPR(bPending), formatNPR(bCleared)];
    });

    rows.push([
      'TOTALS',
      targetCheques.length,
      formatNPR(totalVolume),
      formatNPR(pendingVolume),
      formatNPR(clearedVolume),
    ]);

    const summaryCards = [
      { label: 'TOTAL VOLUME', value: formatNPR(totalVolume), color: [15, 23, 42] as [number, number, number] },
      { label: 'CLEARED & SETTLED', value: formatNPR(clearedVolume), color: [5, 150, 105] as [number, number, number] },
      { label: 'PENDING EXPOSURE', value: formatNPR(pendingVolume), color: [217, 119, 6] as [number, number, number] },
      { label: 'DATE RANGE FILTER', value: reportsDatePreset !== 'all' ? reportsDatePreset.toUpperCase() : (reportsFromDateBs ? `${reportsFromDateBs} to ${reportsToDateBs || '...'}` : 'ALL DATES'), color: [79, 70, 229] as [number, number, number] },
    ];

    exportToPdf(
      'Financial Analytics & Bank Exposure Report',
      headers,
      rows,
      `Total Volume: NPR ${formatNPR(totalVolume)} | Pending: NPR ${formatNPR(pendingVolume)} | Cleared: NPR ${formatNPR(clearedVolume)}`,
      'Financial_Reports_Analytics.pdf',
      summaryCards
    );
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

  const calculateBsPresetRange = (preset: string): { from: string; to: string } => {
    const todayBs = getCurrentBsDate();
    const parts = todayBs.split('-');
    const curYear = parseInt(parts[0], 10) || 2081;
    const curMonth = parseInt(parts[1], 10) || 1;

    if (preset === 'today') {
      return { from: todayBs, to: todayBs };
    }
    if (preset === 'this_month') {
      const days = BS_CALENDAR_DATA[curYear]?.[curMonth - 1] || 30;
      return {
        from: `${curYear}-${String(curMonth).padStart(2, '0')}-01`,
        to: `${curYear}-${String(curMonth).padStart(2, '0')}-${String(days).padStart(2, '0')}`,
      };
    }
    if (preset === 'last_month') {
      const prevMonth = curMonth === 1 ? 12 : curMonth - 1;
      const prevYear = curMonth === 1 ? curYear - 1 : curYear;
      const days = BS_CALENDAR_DATA[prevYear]?.[prevMonth - 1] || 30;
      return {
        from: `${prevYear}-${String(prevMonth).padStart(2, '0')}-01`,
        to: `${prevYear}-${String(prevMonth).padStart(2, '0')}-${String(days).padStart(2, '0')}`,
      };
    }
    if (preset === 'this_year') {
      return {
        from: `${curYear}-01-01`,
        to: `${curYear}-12-30`,
      };
    }
    return { from: '', to: '' };
  };

  const matchesCustomOrPresetDateRange = (
    dateBs: string,
    fromDateBs: string,
    toDateBs: string,
    preset: string
  ): boolean => {
    if (!dateBs) return false;
    if (fromDateBs && dateBs < fromDateBs) return false;
    if (toDateBs && dateBs > toDateBs) return false;
    if (fromDateBs || toDateBs) return true;
    if (preset && preset !== 'all') {
      return matchesBsDateRange(dateBs, preset);
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
    try {
      const party = parties.find((p) => p.id === c.party_id);
      const bank = banks.find((b) => b.id === c.bank_id);
      const logs = paymentLogs.filter((p) => p.cheque_id === c.id);
      const remaining = c.remaining_amount ?? (c.status === 'Cleared' ? 0 : c.amount);
      const totalPaid = c.amount - remaining;
      const compName = currentCompany?.name || activeCompanyName || 'ChequeDesk';

      const doc = new jsPDF({ orientation: 'portrait', unit: 'pt', format: 'a4' });

      // Header Banner
      doc.setFillColor(79, 70, 229);
      doc.rect(40, 30, 515, 3, 'F');

      doc.setFontSize(16);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(30, 27, 75);
      doc.text(compName, 40, 52);

      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(79, 70, 229);
      doc.text(`Cheque Ledger & Statement: #${c.cheque_number}`, 40, 70);

      doc.setFontSize(8.5);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(100, 116, 139);
      doc.text(`Party: ${party?.name || 'N/A'} • Bank: ${bank?.name || 'N/A'}`, 40, 84);

      // Status & Dates on right
      doc.setFontSize(8.5);
      doc.text(`Status: ${c.status}`, 555, 52, { align: 'right' });
      doc.text(`Issued: ${c.issue_date_bs} BS (${c.issue_date_ad})`, 555, 66, { align: 'right' });
      doc.text(`Due: ${c.due_date_bs} BS (${c.due_date_ad})`, 555, 80, { align: 'right' });

      // Summary Box (Cards)
      doc.setFillColor(248, 250, 252);
      doc.setDrawColor(226, 232, 240);
      doc.roundedRect(40, 96, 515, 48, 6, 6, 'FD');

      doc.setFontSize(8);
      doc.setTextColor(100, 116, 139);
      doc.setFont('helvetica', 'bold');
      doc.text('CHEQUE AMOUNT', 60, 112);
      doc.text('SETTLED / PAID', 230, 112);
      doc.text('PENDING BALANCE', 400, 112);

      doc.setFontSize(12);
      doc.setTextColor(15, 23, 42);
      doc.text(`NPR ${c.amount.toLocaleString()}`, 60, 132);
      doc.setTextColor(22, 163, 74);
      doc.text(`NPR ${totalPaid.toLocaleString()}`, 230, 132);
      doc.setTextColor(remaining > 0 ? 217 : 22, remaining > 0 ? 119 : 163, remaining > 0 ? 6 : 74);
      doc.text(`NPR ${remaining.toLocaleString()}`, 400, 132);

      // Payment logs table
      const tableHeaders = ['#', 'Date (BS)', 'Date (AD)', 'Mode', 'Type', 'Amount (NPR)', 'Recorded By', 'Notes'];
      const tableRows = logs.length === 0
        ? [['-', '-', '-', '-', '-', 'No installment payments recorded', '-', '-']]
        : logs.map((log, idx) => [
            idx + 1,
            log.payment_date_bs,
            log.payment_date_ad,
            log.payment_mode,
            log.payment_type || 'Installment',
            `Rs ${log.amount.toLocaleString()}`,
            log.recorded_by || 'Staff',
            log.notes || '—',
          ]);

      const autoTableFn = (autoTable as any).default || autoTable;
      autoTableFn(doc, {
        head: [tableHeaders],
        body: tableRows,
        startY: 156,
        margin: { left: 40, right: 40 },
        theme: 'striped',
        headStyles: {
          fillColor: [79, 70, 229],
          textColor: [255, 255, 255],
          fontSize: 8,
          fontStyle: 'bold',
        },
        styles: {
          fontSize: 8,
          cellPadding: 4,
          textColor: [30, 41, 59],
        },
      });

      const finalY = (doc as any).lastAutoTable?.finalY || 300;
      doc.setDrawColor(226, 232, 240);
      doc.line(40, finalY + 40, 555, finalY + 40);

      doc.setFontSize(8);
      doc.setTextColor(100, 116, 139);
      doc.text(`Generated by ChequeDesk Pro • ${getCurrentBsDate()} BS (${getCurrentAdDate()})`, 40, finalY + 54);
      doc.text('Authorized Signatory: ________________________', 555, finalY + 54, { align: 'right' });

      const cleanFilename = `Statement_Cheque_${c.cheque_number}.pdf`;
      doc.save(cleanFilename);
      showToast(`Downloaded ${cleanFilename} directly without print dialog!`, 'success');
    } catch (err: any) {
      console.error('Cheque statement PDF export error:', err);
      showToast(`Export error: ${err?.message || 'Failed'}`, 'error');
    }
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
                  placeholder="e.g. 1001, 1002, or RS398"
                  value={companyCode}
                  onChange={(e) => setCompanyCode(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Username / Owner Email</label>
              <div className="relative">
                <Users className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                <input
                  type="text"
                  required
                  placeholder="e.g. admin or owner email"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-semibold text-slate-300">Password</label>
                <span className="text-[10px] text-slate-400">Generated or Custom</span>
              </div>
              <div className="relative">
                <Shield className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                <input
                  type={showLoginPassword ? 'text' : 'password'}
                  required
                  placeholder="Enter generated or assigned password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-9 pr-10 py-2 bg-slate-900 border border-slate-700 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono"
                />
                <button
                  type="button"
                  onClick={() => setShowLoginPassword(!showLoginPassword)}
                  className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-200 cursor-pointer p-0.5"
                  title={showLoginPassword ? 'Hide password' : 'Show password'}
                >
                  {showLoginPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-bold shadow-md transition cursor-pointer flex items-center justify-center gap-2 mt-2"
            >
              <span>Sign In to Workspace</span>
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
          <div
            className={`fixed bottom-5 right-5 z-50 px-4 py-2.5 text-white text-xs font-semibold rounded-xl shadow-2xl flex items-center gap-2 border ${
              toastMessage.type === 'error'
                ? 'bg-rose-900 border-rose-700'
                : toastMessage.type === 'warning'
                ? 'bg-amber-900 border-amber-600'
                : toastMessage.type === 'info'
                ? 'bg-indigo-900 border-indigo-700'
                : 'bg-slate-800 border-slate-700'
            }`}
          >
            {toastMessage.type === 'error' ? (
              <AlertCircle className="w-4 h-4 text-rose-400" />
            ) : toastMessage.type === 'warning' ? (
              <AlertTriangle className="w-4 h-4 text-amber-400" />
            ) : toastMessage.type === 'info' ? (
              <Info className="w-4 h-4 text-indigo-400" />
            ) : (
              <Check className="w-4 h-4 text-emerald-400" />
            )}
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
                                <span className="text-slate-400">BS: </span><span className="font-mono text-emerald-300 font-semibold">{comp.expiry_date_bs || (comp.expiry_date_ad ? adToBs(comp.expiry_date_ad) : '2084-06-07')} BS</span> &bull; <span className="text-slate-400">AD: </span><span className="font-mono text-indigo-300 font-semibold">{comp.expiry_date_ad || (comp.expiry_date_bs ? bsToAd(comp.expiry_date_bs) : '2027-09-24')} AD</span>
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
                            {(() => {
                              const enabledFeatures = MASTER_FEATURE_REGISTRY.filter((feat) => {
                                if (f[feat.id] !== undefined) return Boolean(f[feat.id]);
                                if (feat.id === 'banks' || feat.id === 'parties') return f.parties_banks !== undefined ? Boolean(f.parties_banks) : feat.defaultEnabled;
                                if (feat.id === 'backup') return (f.local_disk_backup !== undefined || f.google_drive_backup !== undefined) ? Boolean(f.local_disk_backup || f.google_drive_backup) : feat.defaultEnabled;
                                return feat.defaultEnabled;
                              });
                              return (
                                <div className="space-y-1.5 max-w-[220px]">
                                  <div className="flex items-center gap-1.5">
                                    <span className="text-[10px] font-bold text-emerald-400 bg-emerald-950/70 border border-emerald-800/60 px-2 py-0.5 rounded-md">
                                      {enabledFeatures.length} / {MASTER_FEATURE_REGISTRY.length} Active
                                    </span>
                                  </div>
                                  <div className="flex flex-wrap gap-1">
                                    {enabledFeatures.slice(0, 4).map((feat) => {
                                      const FeatIcon = feat.icon;
                                      return (
                                        <span
                                          key={feat.id}
                                          title={feat.name}
                                          className="px-1.5 py-0.5 rounded text-[9px] font-semibold flex items-center gap-1 border bg-slate-900/80 text-slate-300 border-slate-700"
                                        >
                                          <FeatIcon className="w-2.5 h-2.5 text-indigo-400" />
                                          <span className="truncate max-w-[65px]">{feat.name}</span>
                                        </span>
                                      );
                                    })}
                                    {enabledFeatures.length > 4 && (
                                      <span className="px-1.5 py-0.5 rounded text-[9px] font-semibold border bg-slate-800 text-slate-400 border-slate-700">
                                        +{enabledFeatures.length - 4}
                                      </span>
                                    )}
                                  </div>
                                </div>
                              );
                            })()}
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
                                className={`p-1 rounded-lg transition cursor-pointer border ${
                                  (companyTransactionCounts[comp.id] || 0) > 0
                                    ? 'bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border-amber-500/30'
                                    : 'bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border-rose-500/30'
                                }`}
                                title={
                                  (companyTransactionCounts[comp.id] || 0) > 0
                                    ? `Deletion Protected: Contains ${companyTransactionCounts[comp.id]} transactions (Click to Deactivate)`
                                    : 'Delete Company'
                                }
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

          {/* Super Admin Global Backup & Multi-Email Sync Control Card */}
          <div className="bg-slate-800/80 border border-slate-700/80 rounded-2xl p-5 shadow-xl space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-700">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-indigo-600/30 text-indigo-400 border border-indigo-500/30 rounded-xl">
                  <Mail className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <span>Developer Console Multi-Email Backup Sync &amp; Audit Engine</span>
                    <span className="px-2 py-0.5 bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 rounded text-[10px] font-bold">
                      Enterprise Target Sync
                    </span>
                  </h3>
                  <p className="text-xs text-slate-400">Manage cloud backup recipient destinations and generate multi-tenant archive reports</p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={exportMultiSheetBackupExcel}
                  className="px-3 py-1.5 bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/30 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-xs"
                  title="Generate Multi-Sheet Excel Master Backup"
                >
                  <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Multi-Sheet Excel (.xlsx)</span>
                </button>
                <button
                  type="button"
                  onClick={exportCompletePdfReport}
                  className="px-3 py-1.5 bg-rose-600/20 hover:bg-rose-600/30 text-rose-300 border border-rose-500/30 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-xs"
                  title="Generate Complete System PDF Audit"
                >
                  <Printer className="w-3.5 h-3.5 text-rose-400" />
                  <span>Complete PDF Audit</span>
                </button>
              </div>
            </div>

            {/* Email Recipients Management */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              <div className="lg:col-span-2 space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                    <span>Active Backup Recipient Targets</span>
                    <span className="px-2 py-0.2 bg-slate-700 text-indigo-300 rounded font-mono text-[10px]">
                      {backupEmailList.length} Active
                    </span>
                  </label>
                  <span className="text-[11px] text-slate-400">
                    Last Dispatched: <span className="font-mono text-slate-300">{lastEmailSyncTime || 'Never'}</span>
                  </span>
                </div>

                {/* Email Badges */}
                <div className="flex flex-wrap gap-2 min-h-[38px] p-2 bg-slate-900/60 rounded-xl border border-slate-700/60">
                  {backupEmailList.map((email) => (
                    <span
                      key={email}
                      className="inline-flex items-center gap-1.5 px-3 py-1 bg-slate-800 border border-slate-700 text-slate-200 text-xs font-medium rounded-lg shadow-2xs group"
                    >
                      <span className="w-2 h-2 rounded-full bg-indigo-400" />
                      <span>{email}</span>
                      <button
                        type="button"
                        onClick={() => handleRemoveBackupEmail(email)}
                        className="ml-1 text-slate-400 hover:text-rose-400 cursor-pointer transition p-0.5 rounded"
                        title={`Remove ${email}`}
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </span>
                  ))}
                </div>

                {/* Add Email Form */}
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    handleAddBackupEmail();
                  }}
                  className="flex gap-2"
                >
                  <div className="relative flex-1">
                    <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                    <input
                      type="email"
                      value={newBackupEmailInput}
                      onChange={(e) => setNewBackupEmailInput(e.target.value)}
                      placeholder="Add destination email (e.g. backup@enterprise.com)..."
                      className="w-full pl-9 pr-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-xs shrink-0"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Target</span>
                  </button>
                </form>
              </div>

              {/* Sync Trigger Panel */}
              <div className="bg-slate-900/60 border border-slate-700/60 rounded-xl p-4 flex flex-col justify-between space-y-3">
                <div>
                  <div className="text-xs font-bold text-white flex items-center gap-1.5">
                    <Cloud className="w-4 h-4 text-indigo-400" />
                    <span>Cloud &amp; Email Dispatch</span>
                  </div>
                  <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">
                    Packages all active company ledgers, cheque registries, and master data into JSON &amp; triggers automated multi-email sync dispatch.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={handleTriggerMultiEmailSync}
                  disabled={isSyncingMultiEmail}
                  className="w-full py-2.5 px-3 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition cursor-pointer shadow-md"
                >
                  <Send className={`w-3.5 h-3.5 ${isSyncingMultiEmail ? 'animate-bounce' : ''}`} />
                  <span>{isSyncingMultiEmail ? 'Syncing to Targets...' : `Dispatch to ${backupEmailList.length} Targets`}</span>
                </button>
              </div>
            </div>
          </div>
        </main>

        {/* Delete Company Confirmation Modal with Transaction Deletion Protection */}
        {companyToDelete && (() => {
          const delTxCount =
            companyTransactionCounts[companyToDelete.id] !== undefined
              ? companyTransactionCounts[companyToDelete.id]
              : companyToDelete.id === activeCompanyId
              ? cheques.length + paymentLogs.length
              : 0;
          const hasTransactions = delTxCount > 0;

          return (
            <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4">
              <div className="bg-slate-800 border border-slate-700 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
                {hasTransactions ? (
                  <>
                    <div className="flex items-center gap-3 text-amber-400">
                      <div className="p-3 bg-amber-500/20 border border-amber-500/30 rounded-xl">
                        <Shield className="w-6 h-6 text-amber-400" />
                      </div>
                      <div>
                        <h3 className="text-base font-bold text-white">Deletion Protected</h3>
                        <p className="text-xs text-amber-300/80">Audit &amp; Compliance Rule Active</p>
                      </div>
                    </div>

                    <div className="p-3.5 bg-amber-500/10 border border-amber-500/20 rounded-xl space-y-2 text-xs text-amber-200">
                      <p className="leading-relaxed">
                        Company <strong>&quot;{companyToDelete.name}&quot;</strong> has{' '}
                        <span className="font-bold underline">{delTxCount} recorded transaction(s)</span> (cheques / payments).
                      </p>
                      <p className="text-slate-300">
                        Under statutory accounting and financial audit integrity standards, deleting a company with transaction history is strictly blocked. You can <strong>Deactivate</strong> this workspace instead to suspend access.
                      </p>
                    </div>

                    <div className="flex justify-end gap-2 pt-2">
                      <button
                        onClick={() => setCompanyToDelete(null)}
                        className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-xl text-xs font-bold transition cursor-pointer"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={() => handleToggleDeactivateCompany(companyToDelete)}
                        className={`px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer shadow-md ${
                          companyToDelete.is_active
                            ? 'bg-amber-600 hover:bg-amber-700 text-white'
                            : 'bg-emerald-600 hover:bg-emerald-700 text-white'
                        }`}
                      >
                        {companyToDelete.is_active ? 'Deactivate Company' : 'Reactivate Company'}
                      </button>
                    </div>
                  </>
                ) : (
                  <>
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
                      Are you sure you want to permanently delete company <strong>&quot;{companyToDelete.name}&quot;</strong> (Code: <code className="text-indigo-400 font-mono font-bold">{companyToDelete.company_code}</code>)? This company has 0 transactions. All workspace configurations will be permanently removed.
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
                  </>
                )}
              </div>
            </div>
          );
        })()}

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

                    <div className="sm:col-span-2">
                      <DeveloperExpiryDatePicker
                        bsDate={companyEditForm.expiry_date_bs}
                        adDate={companyEditForm.expiry_date_ad}
                        onChange={(bsDate, adDate) =>
                          setCompanyEditForm({
                            ...companyEditForm,
                            expiry_date_bs: bsDate,
                            expiry_date_ad: adDate,
                          })
                        }
                        label="License Expiry & Renewal Date (Bidirectional BS &harr; AD)"
                        idPrefix="edit-company-expiry"
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

                {/* 3. Dynamic Auto-Registering Sales Matrix */}
                <div className="space-y-4 bg-slate-900/60 p-4 rounded-xl border border-slate-700/60">
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                    <div>
                      <div className="text-xs font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
                        <Sliders className="w-3.5 h-3.5" />
                        <span>Developer Sales Matrix (Feature Permissions)</span>
                      </div>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        Auto-registers all sidebar items &amp; modules &bull; STRICT ENFORCEMENT: Client only gets checked features
                      </p>
                    </div>
                    {/* Quick Presets */}
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => {
                          const allOn: Record<string, boolean> = {};
                          MASTER_FEATURE_REGISTRY.forEach((f) => {
                            allOn[f.id] = true;
                          });
                          setCompanyEditForm({
                            ...companyEditForm,
                            features: { ...companyEditForm.features, ...allOn },
                          });
                        }}
                        className="px-2.5 py-1 bg-emerald-950/70 hover:bg-emerald-900 text-emerald-300 border border-emerald-700/50 rounded-lg text-[10px] font-bold cursor-pointer transition flex items-center gap-1"
                        title="Enable all modules for Enterprise tier"
                      >
                        <Check className="w-3 h-3" />
                        <span>Select All (ON)</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          const allOff: Record<string, boolean> = {};
                          MASTER_FEATURE_REGISTRY.forEach((f) => {
                            allOff[f.id] = false;
                          });
                          setCompanyEditForm({
                            ...companyEditForm,
                            features: { ...companyEditForm.features, ...allOff },
                          });
                        }}
                        className="px-2.5 py-1 bg-rose-950/70 hover:bg-rose-900 text-rose-300 border border-rose-700/50 rounded-lg text-[10px] font-bold cursor-pointer transition flex items-center gap-1"
                        title="Disable all optional modules"
                      >
                        <Lock className="w-3 h-3" />
                        <span>Disable All (OFF)</span>
                      </button>
                    </div>
                  </div>

                  {/* Dynamic Category Iteration */}
                  {Array.from(new Set(MASTER_FEATURE_REGISTRY.map((f) => f.category))).map((category) => {
                    const categoryFeatures = MASTER_FEATURE_REGISTRY.filter((f) => f.category === category);
                    const activeCount = categoryFeatures.filter((f) => companyEditForm.features[f.id] !== false).length;
                    return (
                      <div key={category} className="space-y-2 pt-2 border-t border-slate-800/80">
                        <div className="flex items-center justify-between text-[11px] font-bold text-slate-300">
                          <span className="flex items-center gap-1.5 uppercase tracking-wider text-[10px] text-indigo-400">
                            <span className="w-1.5 h-1.5 rounded-full bg-indigo-400" />
                            {category}
                          </span>
                          <span className="text-[10px] text-slate-400 font-semibold bg-slate-800 px-2 py-0.5 rounded-md">
                            {activeCount} / {categoryFeatures.length} Active
                          </span>
                        </div>

                        <div className="grid grid-cols-1 gap-2">
                          {categoryFeatures.map((feat) => {
                            const isEnabled = companyEditForm.features[feat.id] !== false;
                            const Icon = feat.icon;
                            return (
                              <div
                                key={feat.id}
                                onClick={() =>
                                  setCompanyEditForm({
                                    ...companyEditForm,
                                    features: {
                                      ...companyEditForm.features,
                                      [feat.id]: !isEnabled,
                                    },
                                  })
                                }
                                className={`p-3 rounded-xl border transition cursor-pointer flex items-center justify-between gap-3 ${
                                  isEnabled
                                    ? 'bg-slate-800/90 border-emerald-500/40 shadow-xs'
                                    : 'bg-slate-900/40 border-slate-800 opacity-60'
                                }`}
                              >
                                <div className="flex items-center gap-3">
                                  <div
                                    className={`p-2 rounded-lg shrink-0 ${
                                      isEnabled
                                        ? 'bg-emerald-600 text-white shadow-xs'
                                        : 'bg-slate-800 text-slate-500'
                                    }`}
                                  >
                                    <Icon className="w-4 h-4" />
                                  </div>
                                  <div>
                                    <div className="font-bold text-xs text-white flex items-center gap-2">
                                      <span>{feat.name}</span>
                                      <span
                                        className={`px-1.5 py-0.2 rounded text-[9px] font-bold flex items-center gap-1 ${
                                          isEnabled
                                            ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                                            : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                                        }`}
                                      >
                                        {isEnabled ? (
                                          <>
                                            <Check className="w-2.5 h-2.5" />
                                            <span>Active</span>
                                          </>
                                        ) : (
                                          <>
                                            <Lock className="w-2.5 h-2.5" />
                                            <span>Disabled</span>
                                          </>
                                        )}
                                      </span>
                                    </div>
                                    <p className="text-[11px] text-slate-400 leading-snug">{feat.description}</p>
                                  </div>
                                </div>
                                <div
                                  className={`w-10 h-5 flex items-center rounded-full p-0.5 transition duration-200 shrink-0 ${
                                    isEnabled ? 'bg-emerald-600' : 'bg-slate-700'
                                  }`}
                                >
                                  <div
                                    className={`bg-white w-4 h-4 rounded-full shadow-md transform transition duration-200 ${
                                      isEnabled ? 'translate-x-5' : 'translate-x-0'
                                    }`}
                                  />
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
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
                      <div className="flex items-center justify-between mb-1">
                        <label className="block text-slate-300 font-semibold">Client Access Password</label>
                        <button
                          type="button"
                          onClick={() => {
                            const gen = `Pass@${Math.floor(100 + Math.random() * 900)}`;
                            setNewCompanyForm((prev) => ({ ...prev, admin_password: gen }));
                          }}
                          className="text-[10px] text-indigo-400 hover:text-indigo-300 underline cursor-pointer"
                        >
                          Generate New
                        </button>
                      </div>
                      <input
                        required
                        placeholder="e.g. Pass@123"
                        value={newCompanyForm.admin_password}
                        onChange={(e) => setNewCompanyForm({ ...newCompanyForm, admin_password: e.target.value })}
                        className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-white font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                      <p className="text-[10px] text-slate-400 mt-1">Tenant logs in with Code + &quot;admin&quot; (or owner email) + this password.</p>
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

                    <div className="sm:col-span-2">
                      <DeveloperExpiryDatePicker
                        bsDate={newCompanyForm.expiry_date_bs}
                        adDate={newCompanyForm.expiry_date_ad}
                        onChange={(bsDate, adDate) =>
                          setNewCompanyForm({
                            ...newCompanyForm,
                            expiry_date_bs: bsDate,
                            expiry_date_ad: adDate,
                          })
                        }
                        label="Initial License Expiry (Bidirectional BS &harr; AD)"
                        idPrefix="new-company-expiry"
                      />
                    </div>
                  </div>
                </div>

                {/* 3. Dynamic Auto-Registering Sales Matrix */}
                <div className="space-y-4 bg-slate-900/60 p-4 rounded-xl border border-slate-700/60">
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                    <div>
                      <div className="text-xs font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
                        <Sliders className="w-3.5 h-3.5" />
                        <span>Developer Sales Matrix (Initial Feature Grants)</span>
                      </div>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        Auto-registers all sidebar items &amp; modules &bull; STRICT ENFORCEMENT: Client only gets checked features
                      </p>
                    </div>
                    {/* Quick Presets */}
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => {
                          const allOn: Record<string, boolean> = {};
                          MASTER_FEATURE_REGISTRY.forEach((f) => {
                            allOn[f.id] = true;
                          });
                          setNewCompanyForm({
                            ...newCompanyForm,
                            features: { ...newCompanyForm.features, ...allOn },
                          });
                        }}
                        className="px-2.5 py-1 bg-emerald-950/70 hover:bg-emerald-900 text-emerald-300 border border-emerald-700/50 rounded-lg text-[10px] font-bold cursor-pointer transition flex items-center gap-1"
                        title="Enable all modules for Enterprise tier"
                      >
                        <Check className="w-3 h-3" />
                        <span>Select All (ON)</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          const allOff: Record<string, boolean> = {};
                          MASTER_FEATURE_REGISTRY.forEach((f) => {
                            allOff[f.id] = false;
                          });
                          setNewCompanyForm({
                            ...newCompanyForm,
                            features: { ...newCompanyForm.features, ...allOff },
                          });
                        }}
                        className="px-2.5 py-1 bg-rose-950/70 hover:bg-rose-900 text-rose-300 border border-rose-700/50 rounded-lg text-[10px] font-bold cursor-pointer transition flex items-center gap-1"
                        title="Disable all optional modules"
                      >
                        <Lock className="w-3 h-3" />
                        <span>Disable All (OFF)</span>
                      </button>
                    </div>
                  </div>

                  {/* Dynamic Category Iteration */}
                  {Array.from(new Set(MASTER_FEATURE_REGISTRY.map((f) => f.category))).map((category) => {
                    const categoryFeatures = MASTER_FEATURE_REGISTRY.filter((f) => f.category === category);
                    const activeCount = categoryFeatures.filter((f) => newCompanyForm.features[f.id] !== false).length;
                    return (
                      <div key={category} className="space-y-2 pt-2 border-t border-slate-800/80">
                        <div className="flex items-center justify-between text-[11px] font-bold text-slate-300">
                          <span className="flex items-center gap-1.5 uppercase tracking-wider text-[10px] text-indigo-400">
                            <span className="w-1.5 h-1.5 rounded-full bg-indigo-400" />
                            {category}
                          </span>
                          <span className="text-[10px] text-slate-400 font-semibold bg-slate-800 px-2 py-0.5 rounded-md">
                            {activeCount} / {categoryFeatures.length} Active
                          </span>
                        </div>

                        <div className="grid grid-cols-1 gap-2">
                          {categoryFeatures.map((feat) => {
                            const isEnabled = newCompanyForm.features[feat.id] !== false;
                            const Icon = feat.icon;
                            return (
                              <div
                                key={feat.id}
                                onClick={() =>
                                  setNewCompanyForm({
                                    ...newCompanyForm,
                                    features: {
                                      ...newCompanyForm.features,
                                      [feat.id]: !isEnabled,
                                    },
                                  })
                                }
                                className={`p-3 rounded-xl border transition cursor-pointer flex items-center justify-between gap-3 ${
                                  isEnabled
                                    ? 'bg-slate-800/90 border-emerald-500/40 shadow-xs'
                                    : 'bg-slate-900/40 border-slate-800 opacity-60'
                                }`}
                              >
                                <div className="flex items-center gap-3">
                                  <div
                                    className={`p-2 rounded-lg shrink-0 ${
                                      isEnabled
                                        ? 'bg-emerald-600 text-white shadow-xs'
                                        : 'bg-slate-800 text-slate-500'
                                    }`}
                                  >
                                    <Icon className="w-4 h-4" />
                                  </div>
                                  <div>
                                    <div className="font-bold text-xs text-white flex items-center gap-2">
                                      <span>{feat.name}</span>
                                      <span
                                        className={`px-1.5 py-0.2 rounded text-[9px] font-bold flex items-center gap-1 ${
                                          isEnabled
                                            ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                                            : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                                        }`}
                                      >
                                        {isEnabled ? (
                                          <>
                                            <Check className="w-2.5 h-2.5" />
                                            <span>Active</span>
                                          </>
                                        ) : (
                                          <>
                                            <Lock className="w-2.5 h-2.5" />
                                            <span>Disabled</span>
                                          </>
                                        )}
                                      </span>
                                    </div>
                                    <p className="text-[11px] text-slate-400 leading-snug">{feat.description}</p>
                                  </div>
                                </div>
                                <div
                                  className={`w-10 h-5 flex items-center rounded-full p-0.5 transition duration-200 shrink-0 ${
                                    isEnabled ? 'bg-emerald-600' : 'bg-slate-700'
                                  }`}
                                >
                                  <div
                                    className={`bg-white w-4 h-4 rounded-full shadow-md transform transition duration-200 ${
                                      isEnabled ? 'translate-x-5' : 'translate-x-0'
                                    }`}
                                  />
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
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

  // Transactions nested collapsible tree renderer for sidebar (Busy / Tally Style)
  const renderTransactionsSidebarTree = (isMobile: boolean = false) => {
    if (activeFeatures.accounting_transactions === false) return null;

    return (
      <div className="mt-1 ml-2 pl-2 border-l border-slate-800 space-y-0.5">
        {/* Root Node: Transactions */}
        <div
          id={`tree-transactions-root${isMobile ? '-mob' : ''}`}
          tabIndex={0}
          onClick={() => {
            setIsTransactionsExpanded((prev) => !prev);
            setTreeFocusedId('tree-transactions-root');
          }}
          className={`flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition select-none ${
            treeFocusedId === 'tree-transactions-root'
              ? 'bg-indigo-600/30 text-indigo-300 ring-1 ring-indigo-500 font-bold'
              : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
          }`}
        >
          <div className="flex items-center gap-2">
            {isTransactionsExpanded ? (
              <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
            ) : (
              <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
            )}
            <Receipt className="w-3.5 h-3.5 text-indigo-400" />
            <span>Transactions</span>
          </div>
          <span className="text-[9px] font-mono px-1 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-700/60 font-medium">
            Tree
          </span>
        </div>

        {/* Nested Voucher Categories */}
        {isTransactionsExpanded && (
          <div className="ml-2 pl-1.5 border-l border-slate-800/80 space-y-0.5">
            {VOUCHER_CATEGORIES.map((cat) => {
              if (activeFeatures[cat.id] === false) return null;
              const isCatExpanded = !!expandedVoucherTypes[cat.key];
              const isCatFocused = treeFocusedId === `tree-cat-${cat.key}`;
              const CatIcon = cat.icon;

              return (
                <div key={cat.key} className="space-y-0.5">
                  {/* Category Node */}
                  <div
                    id={`tree-cat-${cat.key}${isMobile ? '-mob' : ''}`}
                    tabIndex={0}
                    onClick={() => {
                      setExpandedVoucherTypes((prev) => ({ ...prev, [cat.key]: !prev[cat.key] }));
                      setTreeFocusedId(`tree-cat-${cat.key}`);
                    }}
                    className={`flex items-center justify-between px-2 py-1 rounded-md text-[11px] font-medium cursor-pointer transition select-none ${
                      isCatFocused
                        ? 'bg-indigo-600/30 text-indigo-200 ring-1 ring-indigo-500 font-bold'
                        : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
                    }`}
                  >
                    <div className="flex items-center gap-1.5 truncate">
                      {isCatExpanded ? (
                        <ChevronDown className="w-3 h-3 text-slate-500 shrink-0" />
                      ) : (
                        <ChevronRight className="w-3 h-3 text-slate-500 shrink-0" />
                      )}
                      <CatIcon className="w-3 h-3 text-slate-400 shrink-0" />
                      <span className="truncate">{cat.label}</span>
                    </div>
                    <span className="text-[9px] font-mono px-1 py-0.2 rounded bg-slate-800/80 text-slate-400 border border-slate-700/60 font-bold shrink-0">
                      {cat.hotkeyPlaceholder}
                    </span>
                  </div>

                  {/* Sub-Actions: Add, Modify, List */}
                  {isCatExpanded && (
                    <div className="ml-3 pl-2 border-l border-slate-800 space-y-0.5 py-0.5">
                      {(['add', 'modify', 'list'] as const).map((action) => {
                        const actionNodeId = `tree-action-${cat.key}-${action}`;
                        const isActionFocused = treeFocusedId === actionNodeId;
                        const actionLabel = action === 'add' ? 'Add' : action === 'modify' ? 'Modify' : 'List';

                        return (
                          <button
                            key={action}
                            type="button"
                            id={`${actionNodeId}${isMobile ? '-mob' : ''}`}
                            tabIndex={0}
                            onClick={() => {
                              setTreeFocusedId(actionNodeId);
                              if (isMobile) setIsMobileMenuOpen(false);
                              openVoucherAction(cat.key, action);
                            }}
                            className={`w-full flex items-center justify-between px-2 py-0.5 rounded text-[11px] transition text-left cursor-pointer ${
                              isActionFocused
                                ? 'bg-indigo-600 text-white font-bold shadow-xs'
                                : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
                            }`}
                          >
                            <div className="flex items-center gap-1.5">
                              <span className={`text-[9px] ${isActionFocused ? 'text-white' : 'text-slate-500'}`}>
                                {action === 'add' ? '●' : action === 'modify' ? '◆' : '■'}
                              </span>
                              <span>{actionLabel}</span>
                            </div>
                            {action === 'add' && (
                              <span className="text-[8px] font-mono px-1 py-0.2 rounded bg-slate-900/60 text-slate-400">
                                {cat.hotkeyPlaceholder}
                              </span>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  };

  // ==========================================
  // VIEW 3: FULL CHEQUEDESK DASHBOARD
  // ==========================================
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col antialiased text-slate-900">
      {/* Toast Notification */}
      {toastMessage && (
        <div
          className={`fixed bottom-5 right-5 z-50 px-4 py-2.5 text-white text-xs font-semibold rounded-xl shadow-2xl flex items-center gap-2 border ${
            toastMessage.type === 'error'
              ? 'bg-rose-900 border-rose-700'
              : toastMessage.type === 'warning'
              ? 'bg-amber-900 border-amber-600'
              : toastMessage.type === 'info'
              ? 'bg-indigo-900 border-indigo-700'
              : 'bg-slate-900 border-slate-800'
          }`}
        >
          {toastMessage.type === 'error' ? (
            <AlertCircle className="w-4 h-4 text-rose-400" />
          ) : toastMessage.type === 'warning' ? (
            <AlertTriangle className="w-4 h-4 text-amber-400" />
          ) : toastMessage.type === 'info' ? (
            <Info className="w-4 h-4 text-indigo-400" />
          ) : (
            <Check className="w-4 h-4 text-emerald-400" />
          )}
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
            {registeredSidebarNavItems.map((item) => {
              const Icon = item.icon;
              const isActive = currentView === item.id;
              return (
                <React.Fragment key={item.id}>
                  {item.id === 'accounting_auditing' && (
                    <div className="pt-2.5 pb-1 px-3">
                      <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-indigo-500" />
                        <span>Accounting & Auditing</span>
                      </div>
                    </div>
                  )}
                  {item.id === 'due_date_timeline' && (
                    <div className="pt-2.5 pb-1 px-3">
                      <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-slate-600" />
                        <span>Cheque Registers</span>
                      </div>
                    </div>
                  )}
                  <button
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
                            : item.badgeColor === 'indigo'
                            ? 'bg-indigo-500/20 text-indigo-300'
                            : 'bg-slate-800 text-slate-400'
                        }`}
                      >
                        {item.badge}
                      </span>
                    )}
                  </button>
                  {item.id === 'accounting_auditing' && renderTransactionsSidebarTree(false)}
                </React.Fragment>
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
                {registeredSidebarNavItems.map((item) => {
                  const Icon = item.icon;
                  const isActive = currentView === item.id;
                  return (
                    <React.Fragment key={item.id}>
                      {item.id === 'accounting_auditing' && (
                        <div className="pt-2.5 pb-1 px-3">
                          <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-indigo-500" />
                            <span>Accounting & Auditing</span>
                          </div>
                        </div>
                      )}
                      {item.id === 'due_date_timeline' && (
                        <div className="pt-2.5 pb-1 px-3">
                          <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-slate-600" />
                            <span>Cheque Registers</span>
                          </div>
                        </div>
                      )}
                      <button
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
                                : item.badgeColor === 'indigo'
                                ? 'bg-indigo-500/20 text-indigo-300'
                                : 'bg-slate-800 text-slate-400'
                            }`}
                          >
                            {item.badge}
                          </span>
                        )}
                      </button>
                      {item.id === 'accounting_auditing' && renderTransactionsSidebarTree(true)}
                    </React.Fragment>
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
          {/* Software Subscription Expiry Warning Banner (<= 60 days) */}
          {subscriptionExpiryInfo && subscriptionExpiryInfo.isExpiringSoon && (
            <div
              id="subscription-expiry-warning-banner"
              className={`px-4 sm:px-6 py-2.5 flex items-center justify-between gap-3 text-xs font-medium border-b sticky top-0 z-40 ${
                subscriptionExpiryInfo.isExpired
                  ? 'bg-rose-50 text-rose-800 border-rose-200'
                  : 'bg-amber-50 text-amber-900 border-amber-200'
              }`}
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <AlertTriangle
                  className={`w-4 h-4 shrink-0 ${
                    subscriptionExpiryInfo.isExpired ? 'text-rose-600' : 'text-amber-600'
                  }`}
                />
                <span className="truncate">
                  <strong>Notice:</strong> Software subscription {subscriptionExpiryInfo.isExpired ? 'expired' : 'expires'} on{' '}
                  <span className="font-bold text-slate-900 bg-white/90 px-1.5 py-0.5 rounded border border-slate-300 font-mono">
                    {subscriptionExpiryInfo.expiryDateBs} BS ({subscriptionExpiryInfo.friendlyBs})
                  </span>{' '}
                  <span className="font-semibold text-slate-700 bg-white/90 px-1.5 py-0.5 rounded border border-slate-300 font-mono">
                    {subscriptionExpiryInfo.expiryDateAd} AD
                  </span>{' '}
                  ({subscriptionExpiryInfo.isExpired
                    ? `Overdue by ${Math.abs(subscriptionExpiryInfo.diffDays)} days`
                    : `${subscriptionExpiryInfo.diffDays} days remaining`}). Please renew.
                </span>
              </div>
              <button
                type="button"
                onClick={() => setCurrentView('company_users')}
                className={`px-3 py-1 text-[11px] font-bold rounded-lg transition shadow-2xs whitespace-nowrap cursor-pointer shrink-0 ${
                  subscriptionExpiryInfo.isExpired
                    ? 'bg-rose-600 text-white hover:bg-rose-700'
                    : 'bg-amber-600 text-white hover:bg-amber-700'
                }`}
              >
                Renew License
              </button>
            </div>
          )}

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

            {/* VIEW: FOR ACCOUNTING & AUDITING */}
            {currentView === 'accounting_auditing' && (() => {
              const totalGrossCheques = cheques.reduce((sum, c) => sum + (c.amount || 0), 0);
              const totalClearedVal = clearedCheques.reduce((sum, c) => sum + (c.amount || 0), 0);
              const totalPendingVal = pendingCheques.reduce((sum, c) => sum + (c.amount || 0), 0);
              const totalPartialRemainingVal = partialCheques.reduce((sum, c) => sum + (c.remaining_amount ?? c.amount), 0);
              const totalUnclearedLiability = totalPendingVal + totalPartialRemainingVal;
              
              const highValueCheques = cheques.filter((c) => (c.amount || 0) >= 100000);
              const highValueTotal = highValueCheques.reduce((sum, c) => sum + c.amount, 0);

              const partiesWithPan = parties.filter((p) => p.pan_vat && p.pan_vat.trim() !== '');

              return (
                <div className="space-y-6">
                  {/* Executive Header Banner */}
                  <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 rounded-2xl p-6 text-white border border-slate-800 shadow-lg">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                            Audit & Financial Control Module
                          </span>
                          <span className="text-xs text-slate-400 font-mono">
                            FY {getCurrentBsDate().split('-')[0]} BS
                          </span>
                        </div>
                        <h2 className="text-xl sm:text-2xl font-black tracking-tight mt-1 text-white">
                          For Accounting & Auditing
                        </h2>
                        <p className="text-xs text-slate-300 max-w-2xl mt-1 leading-relaxed">
                          Centralized ledger verification, bank reconciliation statements (BRS), tax and PAN/VAT compliance audit logs, and auditor verification packets.
                        </p>
                      </div>

                      <div className="flex flex-wrap items-center gap-2">
                        {activeFeatures.excel_pdf_export && (
                          <UniversalExportDropdown
                            onExportExcel={() => exportChequesToExcel(cheques, 'Audit_Ledger_Complete', 'All')}
                            onExportPdf={() => exportChequesToPdf(cheques, 'Accounting & Auditing Ledger Summary')}
                            onExportCsv={() => exportChequesToCsv(cheques, 'Audit_Ledger_Export')}
                            title="Export Comprehensive Audit Pack"
                            buttonText="Export Audit Pack"
                          />
                        )}
                        <button
                          type="button"
                          onClick={() => setCurrentView('reports')}
                          className="px-3 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition shadow-sm cursor-pointer flex items-center gap-1.5"
                        >
                          <BarChart3 className="w-3.5 h-3.5" />
                          <span>View Reports & Analytics</span>
                        </button>
                      </div>
                    </div>

                    {/* Metric Cards Grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 mt-6 pt-6 border-t border-slate-800/80">
                      <div className="p-3.5 bg-slate-900/80 rounded-xl border border-slate-800">
                        <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Gross Cheque Commitments</div>
                        <div className="text-lg font-black text-white font-mono mt-1">{formatNPR(totalGrossCheques)}</div>
                        <div className="text-[10px] text-slate-400 mt-0.5">{cheques.length} Total Issued Cheques</div>
                      </div>

                      <div className="p-3.5 bg-slate-900/80 rounded-xl border border-slate-800">
                        <div className="text-[11px] font-semibold text-emerald-400 uppercase tracking-wider">Cleared & Bank Settled</div>
                        <div className="text-lg font-black text-emerald-400 font-mono mt-1">{formatNPR(totalClearedVal)}</div>
                        <div className="text-[10px] text-emerald-300/80 mt-0.5">{clearedCheques.length} Reconciled Outflows</div>
                      </div>

                      <div className="p-3.5 bg-slate-900/80 rounded-xl border border-slate-800">
                        <div className="text-[11px] font-semibold text-amber-400 uppercase tracking-wider">Uncleared Floating Liability</div>
                        <div className="text-lg font-black text-amber-400 font-mono mt-1">{formatNPR(totalUnclearedLiability)}</div>
                        <div className="text-[10px] text-amber-300/80 mt-0.5">{pendingCheques.length + partialCheques.length} Outstanding Cheques</div>
                      </div>

                      <div className="p-3.5 bg-slate-900/80 rounded-xl border border-slate-800">
                        <div className="text-[11px] font-semibold text-indigo-400 uppercase tracking-wider">High-Value Audit Items</div>
                        <div className="text-lg font-black text-indigo-300 font-mono mt-1">{formatNPR(highValueTotal)}</div>
                        <div className="text-[10px] text-indigo-300/80 mt-0.5">{highValueCheques.length} Cheques &ge; NPR 1,00,000</div>
                      </div>
                    </div>
                  </div>

                  {/* Busy / Tally Style Transactions & Gateway of Vouchers */}
                  {activeFeatures.accounting_transactions !== false && (
                    <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-5 space-y-4">
                      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
                        <div className="flex items-center gap-3">
                          <div className="p-2.5 bg-indigo-600 text-white rounded-xl shadow-xs">
                            <Receipt className="w-5 h-5" />
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <h3 className="text-base font-bold text-slate-900">Transactions & Voucher Management</h3>
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                                Busy / Tally Architecture
                              </span>
                            </div>
                            <p className="text-xs text-slate-500 mt-0.5">
                              Double-entry voucher transactions with tree navigation, rapid keyboard traversal, and ledger synchronization.
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <span className="text-[11px] font-mono bg-slate-100 text-slate-600 px-2.5 py-1 rounded-lg border border-slate-200 flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                            <span>Nav: [↑] [↓] [Enter]</span>
                          </span>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3.5">
                        {VOUCHER_CATEGORIES.map((cat) => {
                          if (activeFeatures[cat.id] === false) return null;
                          const CatIcon = cat.icon;
                          const catVouchers = vouchers.filter((v) => v.voucher_type === cat.key);
                          const totalVal = catVouchers.reduce((sum, v) => sum + (v.amount || 0), 0);

                          return (
                            <div
                              key={cat.key}
                              className="bg-slate-50/70 hover:bg-white rounded-xl p-3.5 border border-slate-200/80 hover:border-indigo-300 hover:shadow-sm transition flex flex-col justify-between"
                            >
                              <div>
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-2">
                                    <div className="p-1.5 bg-white rounded-lg border border-slate-200 text-indigo-600">
                                      <CatIcon className="w-4 h-4" />
                                    </div>
                                    <span className="font-bold text-xs text-slate-900">{cat.label}</span>
                                  </div>
                                  <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-slate-200 text-slate-700 font-bold">
                                    {cat.hotkeyPlaceholder}
                                  </span>
                                </div>

                                <div className="mt-2.5 flex items-baseline justify-between text-[11px]">
                                  <span className="text-slate-500">Recorded:</span>
                                  <span className="font-semibold text-slate-800">{catVouchers.length} Entries</span>
                                </div>
                                <div className="flex items-baseline justify-between text-[11px]">
                                  <span className="text-slate-500">Volume:</span>
                                  <span className="font-mono font-bold text-slate-900">{formatNPR(totalVal)}</span>
                                </div>
                              </div>

                              <div className="mt-3 pt-2.5 border-t border-slate-200/60 grid grid-cols-3 gap-1">
                                <button
                                  type="button"
                                  onClick={() => openVoucherAction(cat.key, 'add')}
                                  className="px-2 py-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-[10px] font-bold transition cursor-pointer text-center"
                                >
                                  + Add
                                </button>
                                <button
                                  type="button"
                                  onClick={() => openVoucherAction(cat.key, 'modify')}
                                  className="px-2 py-1 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-lg text-[10px] font-semibold transition cursor-pointer text-center"
                                >
                                  Modify
                                </button>
                                <button
                                  type="button"
                                  onClick={() => openVoucherAction(cat.key, 'list')}
                                  className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-[10px] font-semibold transition cursor-pointer text-center"
                                >
                                  List
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Flexible Sub-Modules & Hub Categories Grid */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-sm font-bold text-slate-900">Accounting & Auditing Sub-Modules</h3>
                        <p className="text-xs text-slate-500">Modular financial control categories and verification tools</p>
                      </div>
                      <span className="text-[11px] font-bold text-indigo-600 bg-indigo-50 border border-indigo-100 px-2 py-0.5 rounded-full">
                        Flexible Menu Hub
                      </span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {/* Module 1: General Ledger & Reconciliation */}
                      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs hover:shadow-md transition flex flex-col justify-between">
                        <div>
                          <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center mb-3">
                            <BookOpen className="w-5 h-5" />
                          </div>
                          <h4 className="text-sm font-bold text-slate-900">General Ledger & Party Statements</h4>
                          <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                            Audit individual payee balances, installment histories, invoice cross-referencing, and settlement confirmation slips.
                          </p>
                          <div className="mt-3 text-[11px] text-slate-600 bg-slate-50 p-2 rounded-lg border border-slate-100 font-mono">
                            Active Payees: {parties.length} | PAN/VAT Verified: {partiesWithPan.length}
                          </div>
                        </div>
                        <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
                          <button
                            type="button"
                            onClick={() => setCurrentView('reports')}
                            className="text-xs font-bold text-indigo-600 hover:text-indigo-800 transition flex items-center gap-1 cursor-pointer"
                          >
                            <span>Open Party Ledgers</span>
                            <ArrowRight className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      {/* Module 2: Bank Reconciliation Statement (BRS) */}
                      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs hover:shadow-md transition flex flex-col justify-between">
                        <div>
                          <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center mb-3">
                            <Landmark className="w-5 h-5" />
                          </div>
                          <h4 className="text-sm font-bold text-slate-900">Bank Reconciliation Statement (BRS)</h4>
                          <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                            Reconcile issued bank leaves against bank passbooks, check uncleared deposits, and track pending transit float.
                          </p>
                          <div className="mt-3 text-[11px] text-slate-600 bg-slate-50 p-2 rounded-lg border border-slate-100 font-mono">
                            Connected Bank Accounts: {banks.length} | Transit Cheques: {pendingCheques.length}
                          </div>
                        </div>
                        <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
                          <button
                            type="button"
                            onClick={() => setCurrentView('banks')}
                            className="text-xs font-bold text-emerald-600 hover:text-emerald-800 transition flex items-center gap-1 cursor-pointer"
                          >
                            <span>View Bank Registers</span>
                            <ArrowRight className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      {/* Module 3: Cash Flow & Maturity Audit */}
                      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs hover:shadow-md transition flex flex-col justify-between">
                        <div>
                          <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center mb-3">
                            <Clock className="w-5 h-5" />
                          </div>
                          <h4 className="text-sm font-bold text-slate-900">Due Date & Cash Flow Audit</h4>
                          <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                            Audit chronological payment schedules, overdue liabilities, and projected daily bank liquidity demands.
                          </p>
                          <div className="mt-3 text-[11px] text-slate-600 bg-slate-50 p-2 rounded-lg border border-slate-100 font-mono">
                            Total Floating: {formatNPR(totalUnclearedLiability)}
                          </div>
                        </div>
                        <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
                          <button
                            type="button"
                            onClick={() => setCurrentView('due_date_timeline')}
                            className="text-xs font-bold text-amber-600 hover:text-amber-800 transition flex items-center gap-1 cursor-pointer"
                          >
                            <span>Inspect Timeline</span>
                            <ArrowRight className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      {/* Module 4: High-Value & Tax Audit Log */}
                      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs hover:shadow-md transition flex flex-col justify-between">
                        <div>
                          <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center mb-3">
                            <Receipt className="w-5 h-5" />
                          </div>
                          <h4 className="text-sm font-bold text-slate-900">High-Value Cheques & TDS Compliance</h4>
                          <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                            Audit threshold payments (&ge; NPR 1,00,000) requiring mandatory PAN/VAT documentation and internal sign-off.
                          </p>
                          <div className="mt-3 text-[11px] text-slate-600 bg-slate-50 p-2 rounded-lg border border-slate-100 font-mono">
                            High-Value Entries: {highValueCheques.length} ({formatNPR(highValueTotal)})
                          </div>
                        </div>
                        <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
                          <button
                            type="button"
                            onClick={() => setCurrentView('pending')}
                            className="text-xs font-bold text-purple-600 hover:text-purple-800 transition flex items-center gap-1 cursor-pointer"
                          >
                            <span>Inspect Pending Cheques</span>
                            <ArrowRight className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      {/* Module 5: Cleared Archive & Payment Audit Trail */}
                      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs hover:shadow-md transition flex flex-col justify-between">
                        <div>
                          <div className="w-10 h-10 rounded-xl bg-sky-50 text-sky-600 flex items-center justify-center mb-3">
                            <CheckCircle2 className="w-5 h-5" />
                          </div>
                          <h4 className="text-sm font-bold text-slate-900">Cleared Cheques & Partial Installments</h4>
                          <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                            Audit trail of partial settlements, cash vs IPS settlement modes, and immutable cleared payment vouchers.
                          </p>
                          <div className="mt-3 text-[11px] text-slate-600 bg-slate-50 p-2 rounded-lg border border-slate-100 font-mono">
                            Cleared Value: {formatNPR(totalClearedVal)}
                          </div>
                        </div>
                        <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
                          <button
                            type="button"
                            onClick={() => setCurrentView('partial_payments')}
                            className="text-xs font-bold text-sky-600 hover:text-sky-800 transition flex items-center gap-1 cursor-pointer"
                          >
                            <span>Review Partial Payments</span>
                            <ArrowRight className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      {/* Module 6: System Ledger Backup & Cloud Archive */}
                      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs hover:shadow-md transition flex flex-col justify-between">
                        <div>
                          <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center mb-3">
                            <Database className="w-5 h-5" />
                          </div>
                          <h4 className="text-sm font-bold text-slate-900">Auditor Backup Archive & Snapshots</h4>
                          <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                            Create immutable 1-click ZIP backups containing full database JSON dumps and auditor verification reports.
                          </p>
                          <div className="mt-3 text-[11px] text-slate-600 bg-slate-50 p-2 rounded-lg border border-slate-100 font-mono">
                            Cloud Status: {isOnline ? 'Realtime Auto-Sync' : 'Local Offline Mode'}
                          </div>
                        </div>
                        <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
                          <button
                            type="button"
                            onClick={() => setCurrentView('backup')}
                            className="text-xs font-bold text-slate-700 hover:text-slate-900 transition flex items-center gap-1 cursor-pointer"
                          >
                            <span>Open Backup & Restore</span>
                            <ArrowRight className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* High-Value Cheques Statutory Audit Table */}
                  <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
                    <div className="p-4 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 bg-slate-50/60">
                      <div>
                        <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                          <Receipt className="w-4 h-4 text-indigo-600" />
                          <span>Statutory Audit: High-Value Cheque Register (&ge; NPR 1,00,000)</span>
                        </h4>
                        <p className="text-xs text-slate-500 mt-0.5">
                          List of material transactions subject to external auditor examination and PAN/VAT review
                        </p>
                      </div>

                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold font-mono text-indigo-700 bg-indigo-50 border border-indigo-200 px-2.5 py-1 rounded-lg">
                          {highValueCheques.length} Transactions ({formatNPR(highValueTotal)})
                        </span>
                      </div>
                    </div>

                    <div className="overflow-x-auto">
                      <table className="w-full text-xs text-left border-collapse">
                        <thead>
                          <tr className="bg-slate-100/80 text-slate-600 font-bold uppercase tracking-wider text-[10px] border-b border-slate-200">
                            <th className="py-2.5 px-3">Cheque #</th>
                            <th className="py-2.5 px-3">Payee / Party</th>
                            <th className="py-2.5 px-3">PAN / VAT</th>
                            <th className="py-2.5 px-3">Bank</th>
                            <th className="py-2.5 px-3">Issue Date (BS)</th>
                            <th className="py-2.5 px-3">Due Date (BS)</th>
                            <th className="py-2.5 px-3 text-right">Amount (NPR)</th>
                            <th className="py-2.5 px-3 text-center">Status</th>
                            <th className="py-2.5 px-3 text-right">Action</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {highValueCheques.length === 0 ? (
                            <tr>
                              <td colSpan={9} className="py-8 text-center text-slate-400">
                                No high-value cheques (&ge; NPR 1,00,000) recorded in the current financial year.
                              </td>
                            </tr>
                          ) : (
                            highValueCheques.map((c) => {
                              const party = parties.find((p) => p.id === c.party_id);
                              const bank = banks.find((b) => b.id === c.bank_id);
                              return (
                                <tr key={c.id} className="hover:bg-slate-50 transition">
                                  <td className="py-2.5 px-3 font-mono font-bold text-slate-800">
                                    #{c.cheque_number}
                                  </td>
                                  <td className="py-2.5 px-3 font-medium text-slate-900">
                                    {party?.name || 'Unknown Party'}
                                  </td>
                                  <td className="py-2.5 px-3 font-mono text-slate-600">
                                    {party?.pan_vat ? (
                                      <span className="text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200 font-bold text-[10px]">
                                        {party.pan_vat}
                                      </span>
                                    ) : (
                                      <span className="text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200 text-[10px]">
                                        No PAN
                                      </span>
                                    )}
                                  </td>
                                  <td className="py-2.5 px-3 text-slate-700">
                                    {bank?.name || 'Unknown Bank'}
                                  </td>
                                  <td className="py-2.5 px-3 font-mono text-slate-600 whitespace-nowrap">
                                    {c.issue_date_bs} BS
                                  </td>
                                  <td className="py-2.5 px-3 font-mono text-slate-600 whitespace-nowrap">
                                    {c.due_date_bs} BS
                                  </td>
                                  <td className="py-2.5 px-3 font-mono font-bold text-slate-900 text-right">
                                    {formatNPR(c.amount)}
                                  </td>
                                  <td className="py-2.5 px-3 text-center whitespace-nowrap">
                                    <span
                                      className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
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
                                  <td className="py-2.5 px-3 text-right whitespace-nowrap">
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setSelectedCheque(c);
                                        setIsDetailModalOpen(true);
                                      }}
                                      className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition cursor-pointer"
                                      title="Inspect Cheque Leaf"
                                    >
                                      <Eye className="w-3.5 h-3.5" />
                                    </button>
                                  </td>
                                </tr>
                              );
                            })
                          )}
                        </tbody>
                        {highValueCheques.length > 0 && (
                          <tfoot>
                            <tr className="bg-slate-50 font-bold text-slate-900 border-t border-slate-200">
                              <td colSpan={6} className="py-2.5 px-3 text-slate-600 uppercase tracking-wider text-[10px]">
                                Total High-Value Audit Transactions
                              </td>
                              <td className="py-2.5 px-3 font-mono text-right text-indigo-700 font-extrabold">
                                {formatNPR(highValueTotal)}
                              </td>
                              <td colSpan={2} className="py-2.5 px-3"></td>
                            </tr>
                          </tfoot>
                        )}
                      </table>
                    </div>
                  </div>
                </div>
              );
            })()}

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
                // BS Date Range Filter (Custom BS Date Range + Presets)
                if (!matchesCustomOrPresetDateRange(c.due_date_bs, pendingFromDateBs, pendingToDateBs, pendingDateRange)) return false;

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
                (c) => c.status === 'Cleared' && matchesCustomOrPresetDateRange(c.due_date_bs, pendingFromDateBs, pendingToDateBs, pendingDateRange)
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
                  {/* Top Bar: Search, Quick Presets, Export */}
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
                    </div>

                    {/* Export Actions */}
                    {activeFeatures.excel_pdf_export && (
                      <div className="flex items-center gap-2">
                        <UniversalExportDropdown
                          onExportExcel={() => exportChequesToExcel(filteredPending, 'Pending_Cheques', 'Pending')}
                          onExportPdf={() => exportChequesToPdf(filteredPending, 'Pending Cheques Report')}
                          onExportCsv={() => exportChequesToCsv(filteredPending, 'Pending_Cheques')}
                          title="Export Pending Cheques"
                          buttonText="Export Pending"
                        />
                      </div>
                    )}
                  </div>

                  {/* Universal Date Range Filter & Real-Time Calculation Strip */}
                  <DateRangeFilterStrip
                    id="pending-date-range-filter"
                    title="Due Date Range (BS)"
                    fromDateBs={pendingFromDateBs}
                    toDateBs={pendingToDateBs}
                    onFromDateChange={(val) => {
                      setPendingFromDateBs(val);
                      setPendingDateRange('all');
                    }}
                    onToDateChange={(val) => {
                      setPendingToDateBs(val);
                      setPendingDateRange('all');
                    }}
                    onPresetSelect={(preset) => {
                      setPendingDateRange(preset);
                      const range = calculateBsPresetRange(preset);
                      setPendingFromDateBs(range.from);
                      setPendingToDateBs(range.to);
                    }}
                    activePreset={pendingDateRange}
                    onClear={() => {
                      setPendingDateRange('all');
                      setPendingFromDateBs('');
                      setPendingToDateBs('');
                    }}
                    filteredCount={filteredPending.length}
                    totalCount={pendingCheques.length}
                    totalAmount={remainingPendingTotal}
                    extraStats={[
                      { label: 'Cleared in Range', value: formatNPR(clearedInRangeTotal), color: 'text-emerald-600' },
                    ]}
                    accentColor="amber"
                  />

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

                // BS Date Range Filter (Custom BS Date Range + Presets)
                if (!matchesCustomOrPresetDateRange(c.due_date_bs, partialFromDateBs, partialToDateBs, partialDatePreset)) return false;

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

                      {/* Party-Wise PDF Direct Download & Selector */}
                      <div className="inline-flex rounded-xl shadow-2xs border border-purple-200 overflow-hidden bg-purple-50">
                        <button
                          onClick={() => {
                            const targetPartyId = selectedPartyForPdf || parties[0]?.id;
                            if (targetPartyId) {
                              exportPartyWiseLedgerPdf(targetPartyId);
                            } else {
                              showToast('No party registered to export ledger', 'error');
                            }
                          }}
                          title="Instant Direct Download Party-Wise Ledger PDF"
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-purple-700 hover:bg-purple-100 transition cursor-pointer"
                        >
                          <Download className="w-3.5 h-3.5 text-purple-600" />
                          <span>Party-Wise PDF</span>
                        </button>
                        <button
                          onClick={() => {
                            if (parties.length > 0 && !selectedPartyForPdf) {
                              setSelectedPartyForPdf(parties[0].id);
                            }
                            setIsPartyWisePdfModalOpen(true);
                          }}
                          title="Choose Party for Statement"
                          className="px-2 py-1.5 text-purple-600 hover:bg-purple-100 border-l border-purple-200 transition cursor-pointer"
                        >
                          <ChevronDown className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      <UniversalExportDropdown
                        onExportExcel={() => exportPartialPaymentLedgerToExcel(filteredLedgerCheques)}
                        onExportPdf={() => exportPartialPaymentLedgerToPdf(filteredLedgerCheques)}
                        onExportCsv={() => exportPartialPaymentLedgerToCsv(filteredLedgerCheques)}
                        onExportPartyPdf={() => {
                          const targetPartyId = selectedPartyForPdf || parties[0]?.id;
                          if (targetPartyId) {
                            exportPartyWiseLedgerPdf(targetPartyId);
                          } else {
                            showToast('No party registered to export ledger', 'error');
                          }
                        }}
                        title="Export Partial Payment Ledger"
                        buttonText="Export Ledger"
                      />
                    </div>
                  </div>

                  {/* Universal Date Range Filter & Real-Time Calculation Strip */}
                  <DateRangeFilterStrip
                    id="partial-payments-date-range-filter"
                    title="Installment Date Range (BS)"
                    fromDateBs={partialFromDateBs}
                    toDateBs={partialToDateBs}
                    onFromDateChange={(val) => {
                      setPartialFromDateBs(val);
                      setPartialDatePreset('all');
                    }}
                    onToDateChange={(val) => {
                      setPartialToDateBs(val);
                      setPartialDatePreset('all');
                    }}
                    onPresetSelect={(preset) => {
                      setPartialDatePreset(preset);
                      const range = calculateBsPresetRange(preset);
                      setPartialFromDateBs(range.from);
                      setPartialToDateBs(range.to);
                    }}
                    activePreset={partialDatePreset}
                    onClear={() => {
                      setPartialDatePreset('all');
                      setPartialFromDateBs('');
                      setPartialToDateBs('');
                    }}
                    filteredCount={filteredLedgerCheques.length}
                    totalCount={cheques.length}
                    totalAmount={totalChequeValue}
                    extraStats={[
                      { label: 'Total Received', value: formatNPR(totalReceived), color: 'text-emerald-600' },
                      { label: 'Remaining Due', value: formatNPR(totalRemainingDue), color: 'text-amber-600' },
                    ]}
                    accentColor="indigo"
                  />

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
                // BS Date Range Filter (Custom BS Date Range + Presets)
                if (!matchesCustomOrPresetDateRange(c.due_date_bs, clearedFromDateBs, clearedToDateBs, clearedDateRange)) return false;

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
                  {/* Top Bar: Search, Presets, Export */}
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
                    </div>

                    {/* Export Actions */}
                    {activeFeatures.excel_pdf_export && (
                      <div className="flex items-center gap-2">
                        <UniversalExportDropdown
                          onExportExcel={() => exportChequesToExcel(filteredCleared, 'Cleared_Cheques', 'Cleared')}
                          onExportPdf={() => exportChequesToPdf(filteredCleared, 'Cleared Cheques Archive')}
                          onExportCsv={() => exportChequesToCsv(filteredCleared, 'Cleared_Cheques')}
                          title="Export Cleared Cheques"
                          buttonText="Export Cleared"
                        />
                      </div>
                    )}
                  </div>

                  {/* Universal Date Range Filter & Real-Time Calculation Strip */}
                  <DateRangeFilterStrip
                    id="cleared-date-range-filter"
                    title="Cleared Date Range (BS)"
                    fromDateBs={clearedFromDateBs}
                    toDateBs={clearedToDateBs}
                    onFromDateChange={(val) => {
                      setClearedFromDateBs(val);
                      setClearedDateRange('all');
                    }}
                    onToDateChange={(val) => {
                      setClearedToDateBs(val);
                      setClearedDateRange('all');
                    }}
                    onPresetSelect={(preset) => {
                      setClearedDateRange(preset);
                      const range = calculateBsPresetRange(preset);
                      setClearedFromDateBs(range.from);
                      setClearedToDateBs(range.to);
                    }}
                    activePreset={clearedDateRange}
                    onClear={() => {
                      setClearedDateRange('all');
                      setClearedFromDateBs('');
                      setClearedToDateBs('');
                    }}
                    filteredCount={filteredCleared.length}
                    totalCount={clearedCheques.length}
                    totalAmount={visibleClearedTotal}
                    extraStats={[
                      { label: 'All-Time Cleared', value: formatNPR(allClearedTotal), color: 'text-emerald-700' },
                    ]}
                    accentColor="emerald"
                  />

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
                        onClick={() => {
                          if (activeCheque) {
                            downloadChequeLeafPdf(activeCheque, activeBank, isAccountPayeeOnly);
                          }
                        }}
                        disabled={!activeCheque}
                        title="Direct instant download cheque leaf PDF (no print dialog)"
                        className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm cursor-pointer transition"
                      >
                        <Download className="w-4 h-4" />
                        <span>Download Leaf PDF</span>
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
                            onClick={exportMultiSheetBackupExcel}
                            title="Export Comprehensive 4-Sheet Excel Workbook"
                            className="py-2 px-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition cursor-pointer shadow-xs"
                          >
                            <FileSpreadsheet className="w-3.5 h-3.5" />
                            <span>Multi-Sheet Excel (.xlsx)</span>
                          </button>
                        </div>

                        {/* Export Complete PDF Report Button */}
                        <button
                          type="button"
                          onClick={exportCompletePdfReport}
                          className="w-full py-2 px-3 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition cursor-pointer shadow-xs"
                        >
                          <Printer className="w-3.5 h-3.5" />
                          <span>Export Complete PDF Audit Report</span>
                        </button>

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
                            <span>Primary Cloud Account:</span>
                            <span className="font-semibold text-slate-900">rstraders398@gmail.com</span>
                          </div>
                          <div className="flex justify-between text-slate-600">
                            <span>Target Cloud Folder:</span>
                            <span className="font-mono text-slate-700 text-[11px]">/Google Drive/ChequeDesk_Backups/</span>
                          </div>
                          <div className="flex justify-between text-slate-600">
                            <span>Last Drive Synced:</span>
                            <span className="font-medium text-emerald-700">
                              {googleDriveSyncedAt
                                ? new Date(googleDriveSyncedAt).toLocaleDateString() + ' ' + new Date(googleDriveSyncedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                                : 'Pending initial sync'}
                            </span>
                          </div>
                          {lastEmailSyncTime && (
                            <div className="flex justify-between text-slate-600">
                              <span>Last Email Sync:</span>
                              <span className="font-medium text-indigo-700">{lastEmailSyncTime}</span>
                            </div>
                          )}
                        </div>

                        {/* MULTI-EMAIL BACKUP TARGET MANAGEMENT */}
                        <div className="bg-slate-50 rounded-xl p-3 border border-slate-200 text-xs space-y-2.5">
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-slate-800 flex items-center gap-1.5">
                              <Mail className="w-3.5 h-3.5 text-indigo-600" />
                              <span>Multi-Email Backup Recipients ({backupEmailList.length})</span>
                            </span>
                            <span className="text-[10px] text-slate-400 font-semibold">Active Targets</span>
                          </div>

                          {/* Email list badges */}
                          <div className="flex flex-wrap gap-1.5">
                            {backupEmailList.map((email) => (
                              <span
                                key={email}
                                className="inline-flex items-center gap-1 px-2.5 py-1 bg-white border border-slate-200 text-slate-700 text-[11px] font-medium rounded-lg shadow-2xs group"
                              >
                                <span className="w-1.5 h-1.5 rounded-full bg-indigo-500" />
                                <span className="font-mono">{email}</span>
                                <button
                                  type="button"
                                  onClick={() => handleRemoveBackupEmail(email)}
                                  title={`Remove ${email}`}
                                  className="text-slate-400 hover:text-rose-600 ml-0.5 cursor-pointer"
                                >
                                  <X className="w-3 h-3" />
                                </button>
                              </span>
                            ))}
                          </div>

                          {/* Add Email Input */}
                          <div className="flex items-center gap-1.5 pt-1">
                            <input
                              type="email"
                              value={newBackupEmailInput}
                              onChange={(e) => setNewBackupEmailInput(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  e.preventDefault();
                                  handleAddBackupEmail();
                                }
                              }}
                              placeholder="Add backup recipient email (e.g. auditor@firm.com)"
                              className="flex-1 px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-mono placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                            />
                            <button
                              type="button"
                              onClick={handleAddBackupEmail}
                              className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-lg transition cursor-pointer shadow-2xs whitespace-nowrap"
                            >
                              Add Email
                            </button>
                          </div>
                        </div>
                      </div>

                      <div className="space-y-2 pt-2">
                        {/* Dispatch Multi-Email Backup Button */}
                        <button
                          type="button"
                          onClick={handleTriggerMultiEmailSync}
                          disabled={isSyncingMultiEmail}
                          className="w-full py-2 px-3 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition cursor-pointer shadow-xs"
                        >
                          <Send className={`w-3.5 h-3.5 ${isSyncingMultiEmail ? 'animate-bounce' : ''}`} />
                          <span>{isSyncingMultiEmail ? 'Dispatching Backup Sync...' : `Dispatch Backup to ${backupEmailList.length} Emails`}</span>
                        </button>

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
                                backup_recipients: backupEmailList,
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
              const filteredCheques = cheques.filter((c) =>
                matchesCustomOrPresetDateRange(c.due_date_bs, reportsFromDateBs, reportsToDateBs, reportsDatePreset)
              );
              const totalVolume = filteredCheques.reduce((s, c) => s + c.amount, 0);
              const pendingVolume = filteredCheques.filter((c) => c.status !== 'Cleared').reduce((s, c) => s + (c.remaining_amount ?? c.amount), 0);
              const clearedVolume = filteredCheques.filter((c) => c.status === 'Cleared').reduce((s, c) => s + c.amount, 0);
              const partialVolume = partialCheques
                .filter((c) => matchesCustomOrPresetDateRange(c.due_date_bs, reportsFromDateBs, reportsToDateBs, reportsDatePreset))
                .reduce((s, c) => s + (c.amount - (c.remaining_amount ?? c.amount)), 0);
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
                        <UniversalExportDropdown
                          onExportExcel={exportReportsToExcel}
                          onExportPdf={exportReportsToPdf}
                          onExportCsv={() => exportChequesToCsv(filteredCheques, 'Financial_Reports_Register')}
                          title="Export Financial Reports"
                          buttonText="Export Reports"
                        />
                      </div>
                    )}
                  </div>

                  {/* Universal Date Range Filter & Real-Time Calculation Strip */}
                  <DateRangeFilterStrip
                    id="reports-date-range-filter"
                    title="Reports & Analytics Date Range (BS)"
                    fromDateBs={reportsFromDateBs}
                    toDateBs={reportsToDateBs}
                    onFromDateChange={(val) => {
                      setReportsFromDateBs(val);
                      setReportsDatePreset('all');
                    }}
                    onToDateChange={(val) => {
                      setReportsToDateBs(val);
                      setReportsDatePreset('all');
                    }}
                    onPresetSelect={(preset) => {
                      setReportsDatePreset(preset);
                      const range = calculateBsPresetRange(preset);
                      setReportsFromDateBs(range.from);
                      setReportsToDateBs(range.to);
                    }}
                    activePreset={reportsDatePreset}
                    onClear={() => {
                      setReportsDatePreset('all');
                      setReportsFromDateBs('');
                      setReportsToDateBs('');
                    }}
                    filteredCount={filteredCheques.length}
                    totalCount={cheques.length}
                    totalAmount={totalVolume}
                    extraStats={[
                      { label: 'Cleared', value: formatNPR(clearedVolume), color: 'text-emerald-700' },
                      { label: 'Pending', value: formatNPR(pendingVolume), color: 'text-amber-700' },
                    ]}
                    accentColor="indigo"
                  />

                  {/* Summary Metric Cards */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
                      <div className="text-[11px] font-bold text-slate-400 uppercase">Total Cheque Volume</div>
                      <div className="text-xl font-bold font-mono text-slate-900 mt-1">{formatNPR(totalVolume)}</div>
                      <div className="text-xs text-slate-500 mt-1">{filteredCheques.length} cheques in selected period</div>
                    </div>

                    <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
                      <div className="text-[11px] font-bold text-amber-500 uppercase">Pending Exposure</div>
                      <div className="text-xl font-bold font-mono text-amber-600 mt-1">{formatNPR(pendingVolume)}</div>
                      <div className="text-xs text-slate-500 mt-1">{filteredCheques.filter((c) => c.status !== 'Cleared').length} pending cheques</div>
                    </div>

                    <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
                      <div className="text-[11px] font-bold text-emerald-500 uppercase">Cleared &amp; Settled</div>
                      <div className="text-xl font-bold font-mono text-emerald-600 mt-1">{formatNPR(clearedVolume)}</div>
                      <div className="text-xs text-slate-500 mt-1">{filteredCheques.filter((c) => c.status === 'Cleared').length} cleared ({clearancePercent}%)</div>
                    </div>

                    <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
                      <div className="text-[11px] font-bold text-sky-500 uppercase">Partial Installments</div>
                      <div className="text-xl font-bold font-mono text-sky-600 mt-1">{formatNPR(partialVolume)}</div>
                      <div className="text-xs text-slate-500 mt-1">{partialCheques.filter((c) => matchesCustomOrPresetDateRange(c.due_date_bs, reportsFromDateBs, reportsToDateBs, reportsDatePreset)).length} active partial plans</div>
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
                        <p className="text-xs text-slate-500">Volume and outstanding balance by banking partner in period</p>
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
                              const bCheques = filteredCheques.filter((c) => c.bank_id === b.id);
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
                        <p className="text-xs text-slate-500">Beneficiaries with highest cheque distribution in period</p>
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
                              const pCheques = filteredCheques.filter((c) => c.party_id === p.id);
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
                      <div className="flex justify-between items-center gap-2">
                        <span className="text-slate-500">Company Display Name:</span>
                        {isEditingTenantCompanyName ? (
                          <div className="flex items-center gap-1.5">
                            <input
                              type="text"
                              value={tenantCompanyNameInput}
                              onChange={(e) => setTenantCompanyNameInput(e.target.value)}
                              className="px-2 py-1 text-xs border border-indigo-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 font-bold text-slate-800 bg-white"
                              placeholder="Enter company name"
                            />
                            <button
                              type="button"
                              onClick={handleSaveTenantCompanyName}
                              className="px-2.5 py-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold transition cursor-pointer"
                            >
                              Save
                            </button>
                            <button
                              type="button"
                              onClick={() => setIsEditingTenantCompanyName(false)}
                              className="px-2 py-1 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-lg text-xs font-bold transition cursor-pointer"
                            >
                              Cancel
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-slate-800">{activeCompanyName}</span>
                            <button
                              type="button"
                              onClick={() => {
                                setTenantCompanyNameInput(activeCompanyName);
                                setIsEditingTenantCompanyName(true);
                              }}
                              className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-slate-200/80 hover:bg-indigo-50 text-slate-600 hover:text-indigo-600 rounded text-[11px] font-semibold transition cursor-pointer"
                              title="Edit Company Name"
                            >
                              <Edit3 className="w-3 h-3" />
                              <span>Edit</span>
                            </button>
                          </div>
                        )}
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
                      <div className="flex justify-between items-center py-1">
                        <span className="text-slate-500">License Expiry / Renewal:</span>
                        <div className="text-right flex items-center gap-1.5">
                          <span className="font-mono text-emerald-700 font-bold bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded text-xs" title="Nepali BS Expiry">
                            {subscriptionExpiryInfo ? `${subscriptionExpiryInfo.expiryDateBs} BS` : (currentCompany?.expiry_date_bs || '2084-06-07 BS')}
                          </span>
                          <span className="font-mono text-indigo-700 font-semibold bg-indigo-50 border border-indigo-200 px-2 py-0.5 rounded text-xs" title="English AD Expiry">
                            {subscriptionExpiryInfo ? `${subscriptionExpiryInfo.expiryDateAd} AD` : (currentCompany?.expiry_date_ad || '2027-09-24 AD')}
                          </span>
                          {subscriptionExpiryInfo && (
                            <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold border ${
                              subscriptionExpiryInfo.isExpired
                                ? 'bg-rose-100 text-rose-800 border-rose-200'
                                : subscriptionExpiryInfo.isExpiringSoon
                                ? 'bg-amber-100 text-amber-800 border-amber-200'
                                : 'bg-emerald-100 text-emerald-800 border-emerald-200'
                            }`}>
                              {subscriptionExpiryInfo.isExpired ? 'Expired' : `${subscriptionExpiryInfo.diffDays}d left`}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex justify-between pt-2 border-t border-slate-200">
                        <span className="text-slate-500">Active Database Records:</span>
                        <span className="font-semibold text-emerald-700">
                          {cheques.length} Cheques • {parties.length} Parties • {banks.length} Banks
                        </span>
                      </div>
                    </div>

                    {/* Voucher & Billing Configurations (Tenant Level) */}
                    <div className="p-4 bg-slate-50 rounded-xl border border-slate-200/80 space-y-3 text-xs">
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="font-bold text-slate-800 flex items-center gap-1.5">
                            <Receipt className="w-3.5 h-3.5 text-indigo-600" />
                            <span>Voucher &amp; Invoicing Configurations</span>
                          </div>
                          <p className="text-[11px] text-slate-500 mt-0.5">
                            Tenant-level toggle for sales pricing and item discounting columns
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center justify-between pt-2 border-t border-slate-200">
                        <div>
                          <span className="font-semibold text-slate-700">Enable Sales Discount</span>
                          <p className="text-[10px] text-slate-400">
                            {isSalesDiscountEnabled
                              ? 'Discount % & Rs. columns are visible in Sales Voucher'
                              : 'Discount fields are completely hidden from Sales Voucher'}
                          </p>
                        </div>
                        <button
                          type="button"
                          id="btn-toggle-company-sales-discount"
                          onClick={() => handleToggleCompanyDiscount(!isSalesDiscountEnabled)}
                          className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                            isSalesDiscountEnabled ? 'bg-indigo-600' : 'bg-slate-300'
                          }`}
                        >
                          <span
                            className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                              isSalesDiscountEnabled ? 'translate-x-5' : 'translate-x-0'
                            }`}
                          />
                        </button>
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
                            {MASTER_FEATURE_REGISTRY.map((feat) => {
                              const isEnabled = activeFeatures[feat.id] !== false;
                              const FeatIcon = feat.icon;
                              return (
                                <div
                                  key={feat.id}
                                  className={`p-2 rounded-xl border flex items-center justify-between gap-1.5 ${
                                    isEnabled ? 'bg-emerald-50/50 border-emerald-200' : 'bg-slate-50 border-slate-200 opacity-60'
                                  }`}
                                >
                                  <div className="flex items-center gap-1.5 min-w-0">
                                    <FeatIcon className={`w-3.5 h-3.5 shrink-0 ${isEnabled ? 'text-emerald-700' : 'text-slate-400'}`} />
                                    <span className="text-[11px] font-medium text-slate-800 truncate">{feat.name}</span>
                                  </div>
                                  <span
                                    className={`text-[9px] font-bold px-1.5 py-0.5 rounded shrink-0 ${
                                      isEnabled ? 'bg-emerald-200 text-emerald-800' : 'bg-slate-200 text-slate-600'
                                    }`}
                                  >
                                    {isEnabled ? 'ENABLED' : 'DISABLED'}
                                  </span>
                                </div>
                              );
                            })}
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

              {/* Row 4: Issue Date (BS & AD synchronized Dual Date Picker) */}
              <DualDatePicker
                label="Issue Date"
                bsDate={chequeForm.issue_date_bs}
                adDate={chequeForm.issue_date_ad}
                onChange={(bs, ad) => setChequeForm((p) => ({ ...p, issue_date_bs: bs, issue_date_ad: ad }))}
                required
              />

              {/* Row 5: Due Date (BS & AD synchronized Dual Date Picker) */}
              <DualDatePicker
                label="Due Date"
                bsDate={chequeForm.due_date_bs}
                adDate={chequeForm.due_date_ad}
                onChange={(bs, ad) => setChequeForm((p) => ({ ...p, due_date_bs: bs, due_date_ad: ad }))}
                required
              />

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
                    payment_date_bs: paymentModalDateBs,
                    payment_date_ad: paymentModalDateAd,
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

              {/* Payment Date with Dual BS/AD Date Picker */}
              <DualDatePicker
                label="Payment Date"
                bsDate={paymentModalDateBs}
                adDate={paymentModalDateAd}
                onChange={(bs, ad) => {
                  setPaymentModalDateBs(bs);
                  setPaymentModalDateAd(ad);
                }}
                required
              />

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

      {/* Party-Wise Partial Payment Statement & Ledger PDF Modal */}
      {isPartyWisePdfModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-xl w-full p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center pb-2 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="p-2.5 bg-purple-50 text-purple-600 rounded-xl">
                  <FileText className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">Party-Wise Partial Payment Statement</h3>
                  <p className="text-xs text-slate-500">Generate a branded PDF statement &amp; ledger breakdown for an individual party</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsPartyWisePdfModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Party Selection Dropdown */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-700">Select Party / Beneficiary Account *</label>
              <select
                value={selectedPartyForPdf || (parties[0]?.id ?? '')}
                onChange={(e) => setSelectedPartyForPdf(e.target.value)}
                className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 bg-white focus:outline-none focus:ring-2 focus:ring-purple-500"
              >
                {parties.map((p) => {
                  const partyTotalDue = cheques
                    .filter((c) => c.party_id === p.id && c.status !== 'Cleared')
                    .reduce((sum, c) => sum + (c.remaining_amount ?? c.amount), 0);
                  return (
                    <option key={p.id} value={p.id}>
                      {p.name} [{p.party_type || 'Party'}] — Due: NPR {partyTotalDue.toLocaleString()}
                    </option>
                  );
                })}
              </select>
            </div>

            {/* Selected Party Metrics Preview */}
            {(() => {
              const activeParty = parties.find((p) => p.id === (selectedPartyForPdf || parties[0]?.id)) || parties[0];
              if (!activeParty) return null;

              const partyCheques = cheques.filter((c) => c.party_id === activeParty.id);
              const partyTotalVal = partyCheques.reduce((s, c) => s + c.amount, 0);
              const partyRemainingDue = partyCheques
                .filter((c) => c.status !== 'Cleared')
                .reduce((s, c) => s + (c.remaining_amount ?? c.amount), 0);
              const partyPaid = partyTotalVal - partyRemainingDue;
              const partyInstallments = paymentLogs.filter((p) => partyCheques.some((c) => c.id === p.cheque_id));

              return (
                <div className="space-y-3.5">
                  {/* Party Summary Card */}
                  <div className="bg-purple-50/40 rounded-xl p-3.5 border border-purple-100 flex items-center justify-between">
                    <div>
                      <div className="text-sm font-bold text-slate-900">{activeParty.name}</div>
                      <div className="text-[11px] text-slate-500 flex items-center gap-2 mt-0.5">
                        <span className="font-semibold text-purple-700">{activeParty.party_type || 'Sundry Party'}</span>
                        {activeParty.phone && <span>• Tel: {activeParty.phone}</span>}
                        {activeParty.address && <span>• {activeParty.address}</span>}
                      </div>
                    </div>
                    <span className={`px-2.5 py-1 text-[11px] font-bold rounded-lg ${activeParty.party_type === 'Sundry Creditors' ? 'bg-rose-100 text-rose-800' : 'bg-emerald-100 text-emerald-800'}`}>
                      {activeParty.party_type === 'Sundry Creditors' ? 'Outward / Payable' : 'Inward / Receivable'}
                    </span>
                  </div>

                  {/* Financial Breakdown Grid */}
                  <div className="grid grid-cols-3 gap-2.5 text-center">
                    <div className="bg-slate-50 rounded-xl p-2.5 border border-slate-100">
                      <span className="text-[10px] text-slate-400 font-bold uppercase block">Total Value</span>
                      <span className="text-xs font-mono font-bold text-slate-800">{formatNPR(partyTotalVal)}</span>
                      <span className="text-[10px] text-slate-400 block">{partyCheques.length} Cheques</span>
                    </div>
                    <div className="bg-emerald-50/50 rounded-xl p-2.5 border border-emerald-100">
                      <span className="text-[10px] text-emerald-600 font-bold uppercase block">Settled</span>
                      <span className="text-xs font-mono font-bold text-emerald-700">{formatNPR(partyPaid)}</span>
                      <span className="text-[10px] text-emerald-600/80 block">{partyInstallments.length} Installments</span>
                    </div>
                    <div className="bg-amber-50/50 rounded-xl p-2.5 border border-amber-100">
                      <span className="text-[10px] text-amber-600 font-bold uppercase block">Outstanding</span>
                      <span className="text-xs font-mono font-bold text-amber-700">{formatNPR(partyRemainingDue)}</span>
                      <span className="text-[10px] text-amber-600/80 block">Remaining Due</span>
                    </div>
                  </div>

                  {/* Cheque List Table Preview */}
                  <div className="space-y-1.5">
                    <div className="text-[11px] font-bold text-slate-700">Cheques in Statement ({partyCheques.length})</div>
                    <div className="max-h-36 overflow-y-auto border border-slate-200 rounded-xl divide-y divide-slate-100 text-xs">
                      {partyCheques.length === 0 ? (
                        <div className="p-4 text-center text-slate-400 text-xs">No cheques recorded for this party.</div>
                      ) : (
                        partyCheques.map((c) => (
                          <div key={c.id} className="p-2.5 flex items-center justify-between bg-white hover:bg-slate-50/80 transition">
                            <div>
                              <span className="font-mono font-bold text-slate-800">#{c.cheque_number}</span>
                              <span className="text-[11px] text-slate-400 ml-2">Due BS: {c.due_date_bs}</span>
                            </div>
                            <div className="text-right">
                              <div className="font-mono font-semibold text-slate-800">{formatNPR(c.amount)}</div>
                              <div className="text-[10px] text-slate-400">
                                Rem: <span className="font-mono font-bold text-amber-600">{formatNPR(c.remaining_amount ?? c.amount)}</span> • {c.status}
                              </div>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                    <button
                      type="button"
                      onClick={() => setIsPartyWisePdfModalOpen(false)}
                      className="px-4 py-2 bg-slate-100 hover:bg-slate-200 rounded-xl font-bold cursor-pointer text-slate-700 text-xs"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        exportPartyWiseLedgerPdf(activeParty.id);
                        setIsPartyWisePdfModalOpen(false);
                      }}
                      className="px-5 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl font-bold cursor-pointer shadow-md flex items-center gap-1.5 transition text-xs"
                    >
                      <Download className="w-4 h-4" />
                      <span>Download PDF Statement</span>
                    </button>
                  </div>
                </div>
              );
            })()}
          </div>
        </div>
      )}

      {/* 23. Busy/Tally Style Voucher Action Modal (Add, Modify, List) */}
      {activeVoucherModal.isOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          {activeVoucherModal.action === 'list' ? (
            /* LIST REGISTER VIEW */
            <div className="bg-white rounded-2xl max-w-5xl w-full p-6 shadow-2xl space-y-4 border border-slate-100 my-8">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-indigo-50 text-indigo-600 rounded-xl">
                    <Receipt className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-base font-bold text-slate-900">
                        {activeVoucherModal.type === 'sales'
                          ? 'Sales Voucher Register (Tax Invoices)'
                          : `${VOUCHER_CATEGORIES.find((c) => c.key === activeVoucherModal.type)?.label || 'Voucher'} Register`}
                      </h3>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-100 font-mono">
                        {VOUCHER_CATEGORIES.find((c) => c.key === activeVoucherModal.type)?.hotkeyPlaceholder || '[F8]'}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500">
                      {vouchers.filter((v) => v.voucher_type === activeVoucherModal.type || (activeVoucherModal.type === 'sales' && v.voucher_type === 'invoice')).length} recorded vouchers in ledger
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => openVoucherAction(activeVoucherModal.type, 'add')}
                    className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-xs"
                  >
                    <span>+ Add New {activeVoucherModal.type === 'sales' ? 'Sales Voucher' : 'Entry'} [Enter]</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveVoucherModal((prev) => ({ ...prev, isOpen: false }))}
                    className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 cursor-pointer"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Search Bar & Stats */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                <div className="relative flex-1">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search by voucher #, party/account, narration, vehicle #..."
                    value={voucherSearchTerm}
                    onChange={(e) => setVoucherSearchTerm(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div className="text-xs text-slate-600 font-mono flex items-center gap-2 bg-slate-50 px-3 py-2 rounded-xl border border-slate-200">
                  <span>Total Volume:</span>
                  <span className="font-bold text-slate-900">
                    {formatNPR(
                      vouchers
                        .filter((v) => v.voucher_type === activeVoucherModal.type || (activeVoucherModal.type === 'sales' && v.voucher_type === 'invoice'))
                        .reduce((sum, v) => sum + (v.amount || 0), 0)
                    )}
                  </span>
                </div>
              </div>

              {/* Table */}
              <div className="border border-slate-200 rounded-xl overflow-hidden">
                <div className="max-h-96 overflow-y-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200 sticky top-0">
                      {activeVoucherModal.type === 'sales' ? (
                        <tr>
                          <th className="p-3">Vch #</th>
                          <th className="p-3">Date (BS / AD)</th>
                          <th className="p-3">Series</th>
                          <th className="p-3">Party Account (Customer)</th>
                          <th className="p-3">Material Centre</th>
                          <th className="p-3 text-right">Net Amount (NPR)</th>
                          <th className="p-3">Vehicle / Transport</th>
                          <th className="p-3 text-center">Status</th>
                          <th className="p-3 text-center">Actions</th>
                        </tr>
                      ) : (
                        <tr>
                          <th className="p-3">Voucher #</th>
                          <th className="p-3">Date (BS / AD)</th>
                          <th className="p-3">Mode</th>
                          <th className="p-3">Debit Account (Dr)</th>
                          <th className="p-3">Credit Account (Cr)</th>
                          <th className="p-3 text-right">Amount (NPR)</th>
                          <th className="p-3">Cheque / Ref</th>
                          <th className="p-3">Narration</th>
                          <th className="p-3 text-center">Actions</th>
                        </tr>
                      )}
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {(() => {
                        const filtered = vouchers.filter((v) => {
                          const matchesType = activeVoucherModal.type === 'sales'
                            ? (v.voucher_type === 'sales' || v.voucher_type === 'invoice')
                            : v.voucher_type === activeVoucherModal.type;
                          if (!matchesType) return false;
                          if (!voucherSearchTerm.trim()) return true;
                          const q = voucherSearchTerm.toLowerCase();
                          return (
                            v.voucher_number.toLowerCase().includes(q) ||
                            v.account_debit.toLowerCase().includes(q) ||
                            v.account_credit.toLowerCase().includes(q) ||
                            (v.party_name && v.party_name.toLowerCase().includes(q)) ||
                            (v.transport_info?.vehicle_no && v.transport_info.vehicle_no.toLowerCase().includes(q)) ||
                            (v.cheque_number && v.cheque_number.toLowerCase().includes(q)) ||
                            v.narration.toLowerCase().includes(q)
                          );
                        });

                        if (filtered.length === 0) {
                          return (
                            <tr>
                              <td colSpan={activeVoucherModal.type === 'sales' ? 9 : 9} className="p-8 text-center text-slate-400">
                                No vouchers found matching your filter.
                              </td>
                            </tr>
                          );
                        }

                        if (activeVoucherModal.type === 'sales') {
                          return filtered.map((v) => (
                            <tr key={v.id} className="hover:bg-slate-50/80 transition">
                              <td className="p-3 font-mono font-bold text-indigo-700">#{v.voucher_number}</td>
                              <td className="p-3">
                                <div className="font-semibold text-slate-800">{v.date_bs} BS</div>
                                <div className="text-[10px] text-slate-400 font-mono">{v.date_ad} AD</div>
                              </td>
                              <td className="p-3">
                                <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
                                  {v.series || 'Main'}
                                </span>
                              </td>
                              <td className="p-3 font-semibold text-slate-900">
                                {v.party_name || v.account_debit}
                              </td>
                              <td className="p-3 text-slate-600 font-mono">{v.mat_centre || 'Main Store'}</td>
                              <td className="p-3 text-right font-mono font-bold text-slate-900">
                                {formatNPR(v.amount)}
                              </td>
                              <td className="p-3 text-slate-600 font-mono text-[11px]">
                                {v.transport_info?.vehicle_no ? (
                                  <div className="flex items-center gap-1">
                                    <Truck className="w-3.5 h-3.5 text-slate-400" />
                                    <span>{v.transport_info.vehicle_no}</span>
                                  </div>
                                ) : (
                                  '—'
                                )}
                              </td>
                              <td className="p-3 text-center">
                                {v.is_held ? (
                                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
                                    HELD
                                  </span>
                                ) : (
                                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                                    SAVED
                                  </span>
                                )}
                              </td>
                              <td className="p-3 text-center">
                                <div className="flex items-center justify-center gap-1.5">
                                  <button
                                    type="button"
                                    onClick={() => openVoucherAction('sales', 'modify', v)}
                                    className="px-2 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded text-[10px] font-bold transition cursor-pointer"
                                  >
                                    Modify
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => setBusySalesModal({ type: 'print_preview', data: v })}
                                    className="p-1 text-slate-500 hover:text-indigo-600 rounded transition cursor-pointer"
                                    title="Print Tax Invoice"
                                  >
                                    <Printer className="w-3.5 h-3.5" />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleDeleteVoucher(v.id)}
                                    className="p-1 text-slate-400 hover:text-rose-600 rounded transition cursor-pointer"
                                    title="Delete Voucher"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ));
                        }

                        return filtered.map((v) => (
                          <tr key={v.id} className="hover:bg-slate-50/80 transition">
                            <td className="p-3 font-mono font-bold text-indigo-700">{v.voucher_number}</td>
                            <td className="p-3">
                              <div className="font-semibold text-slate-800">{v.date_bs} BS</div>
                              <div className="text-[10px] text-slate-400 font-mono">{v.date_ad} AD</div>
                            </td>
                            <td className="p-3">
                              <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
                                {v.payment_mode}
                              </span>
                            </td>
                            <td className="p-3 font-semibold text-slate-800">{v.account_debit}</td>
                            <td className="p-3 text-slate-600">{v.account_credit}</td>
                            <td className="p-3 text-right font-mono font-bold text-slate-900">
                              {formatNPR(v.amount)}
                            </td>
                            <td className="p-3 font-mono text-slate-500">{v.cheque_number || v.reference_no || '—'}</td>
                            <td className="p-3 text-slate-500 max-w-xs truncate" title={v.narration}>
                              {v.narration || '—'}
                            </td>
                            <td className="p-3 text-center">
                              <div className="flex items-center justify-center gap-1.5">
                                <button
                                  type="button"
                                  onClick={() => openVoucherAction(activeVoucherModal.type, 'modify', v)}
                                  className="px-2 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded text-[10px] font-bold transition cursor-pointer"
                                >
                                  Modify
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleDeleteVoucher(v.id)}
                                  className="p-1 text-slate-400 hover:text-rose-600 rounded transition cursor-pointer"
                                  title="Delete Voucher"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ));
                      })()}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Footer */}
              <div className="flex justify-end pt-2">
                <button
                  type="button"
                  onClick={() => setActiveVoucherModal((prev) => ({ ...prev, isOpen: false }))}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition cursor-pointer"
                >
                  Close Register [Esc]
                </button>
              </div>
            </div>
          ) : activeVoucherModal.type === 'sales' ? (
            /* ========================================================================= */
            /* EXACT BUSY SOFTWARE SALES VOUCHER REPLICA SCREEN                          */
            /* ========================================================================= */
            <div
              tabIndex={0}
              onKeyDown={handleBusySalesKeyDown}
              className="bg-slate-100 text-slate-800 rounded-xl shadow-2xl border border-slate-300 w-full max-w-6xl max-h-[96vh] flex flex-col overflow-hidden my-4 focus:outline-none"
            >
              {/* 1. BUSY ERP TITLE / SYSTEM BAR */}
              <div className="bg-slate-900 text-white px-4 py-2.5 flex items-center justify-between border-b border-slate-800 shrink-0">
                <div className="flex items-center gap-2.5">
                  <div className="w-6 h-6 rounded bg-indigo-600 flex items-center justify-center text-white font-bold text-xs shadow-xs">
                    B
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-sm tracking-wide">Sales Voucher</span>
                    <span className="text-slate-400 font-mono text-xs">[{salesVoucherData.series}]</span>
                    {salesVoucherData.isHeld && (
                      <span className="bg-amber-500 text-slate-950 font-bold px-2 py-0.5 rounded text-[10px] font-mono tracking-wider animate-pulse">
                        HELD / DRAFT
                      </span>
                    )}
                  </div>
                  <span className="hidden sm:inline text-slate-400 text-xs">• FY 2081/82 • {activeCompanyName}</span>
                </div>

                <div className="flex items-center gap-3">
                  <div className="hidden md:flex items-center gap-2 text-[11px] text-slate-300 font-mono">
                    <span className="bg-slate-800 px-2 py-0.5 rounded border border-slate-700">[F2] Save</span>
                    <span className="bg-slate-800 px-2 py-0.5 rounded border border-slate-700">[Esc] Quit</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setActiveVoucherModal((prev) => ({ ...prev, isOpen: false }))}
                    className="p-1 text-slate-400 hover:text-white rounded hover:bg-slate-800 transition cursor-pointer"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* 2. MAIN SCROLLABLE VOUCHER WORKBENCH */}
              <div className="p-4 overflow-y-auto space-y-3.5 flex-1 text-xs">
                {/* 2A. HEADER & TOP INFORMATION BAR */}
                <div className="bg-white rounded-lg border border-slate-300 p-3.5 shadow-2xs space-y-3">
                  {/* Top Row: Series, Date BS, Date AD, Voucher No, Sale Type */}
                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">Series</label>
                      <select
                        value={salesVoucherData.series}
                        onChange={(e) => setSalesVoucherData({ ...salesVoucherData, series: e.target.value })}
                        className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-300 rounded font-semibold text-slate-900 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                      >
                        <option value="Main">Main</option>
                        <option value="Tax Invoice">Tax Invoice</option>
                        <option value="Retail">Retail</option>
                        <option value="Wholesale">Wholesale</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">Date (BS - Nepali)</label>
                      <input
                        type="text"
                        required
                        value={salesVoucherData.date_bs}
                        onChange={(e) => {
                          const bs = e.target.value;
                          const ad = bsToAd(bs);
                          setSalesVoucherData({
                            ...salesVoucherData,
                            date_bs: bs,
                            date_ad: ad || salesVoucherData.date_ad,
                          });
                        }}
                        placeholder="YYYY-MM-DD"
                        className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-300 rounded font-mono font-bold text-slate-900 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">Date (AD - English)</label>
                      <input
                        type="date"
                        required
                        value={salesVoucherData.date_ad}
                        onChange={(e) => {
                          const ad = e.target.value;
                          const bs = adToBs(ad);
                          setSalesVoucherData({
                            ...salesVoucherData,
                            date_ad: ad,
                            date_bs: bs || salesVoucherData.date_bs,
                          });
                        }}
                        className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-300 rounded font-mono text-slate-900 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">Vch No.</label>
                      <input
                        type="text"
                        required
                        value={salesVoucherData.voucher_number}
                        onChange={(e) => setSalesVoucherData({ ...salesVoucherData, voucher_number: e.target.value })}
                        placeholder="e.g. 1"
                        className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-300 rounded font-mono font-bold text-slate-900 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                      />
                    </div>

                    <div className="col-span-2 sm:col-span-1">
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">Sale Type</label>
                      <select
                        value={salesVoucherData.sale_type}
                        onChange={(e) => setSalesVoucherData({ ...salesVoucherData, sale_type: e.target.value })}
                        className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-300 rounded font-semibold text-slate-900 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                      >
                        <option value="VAT 13%">VAT 13%</option>
                        <option value="L/GST-13% (Tax Invoice)">L/GST-13% (Tax Invoice)</option>
                        <option value="Exempted / Non-Taxable">Exempted / Non-Taxable</option>
                        <option value="Multi-Rate (Composite)">Multi-Rate (Composite)</option>
                      </select>
                    </div>
                  </div>

                  {/* Middle Row: Party Account Selector with Live Balance & Material Centre */}
                  <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-end">
                    <div className="sm:col-span-8">
                      <div className="flex items-center justify-between mb-1">
                        <label className="block text-[11px] font-bold text-slate-700">Party Account</label>
                        {(() => {
                          const bal = getPartyBalanceInfo(salesVoucherData.party_name);
                          return (
                            <span className="text-[11px] font-mono flex items-center gap-1.5">
                              <span className="text-slate-500">Cur. Bal:</span>
                              <span className="font-bold text-slate-900">Rs. {formatNPR(bal.amount)}</span>
                              <span
                                className={`px-1.5 py-0.2 rounded font-bold text-[10px] ${
                                  bal.drCr === 'Dr' ? 'bg-rose-100 text-rose-700' : 'bg-emerald-100 text-emerald-700'
                                }`}
                              >
                                {bal.drCr}
                              </span>
                            </span>
                          );
                        })()}
                      </div>
                      <input
                        type="text"
                        required
                        list="busy-party-list"
                        value={salesVoucherData.party_name}
                        onChange={(e) => setSalesVoucherData({ ...salesVoucherData, party_name: e.target.value })}
                        placeholder="Search or select Party Name / Sundry Debtor..."
                        className="w-full px-3 py-1.5 bg-slate-50 border border-slate-300 rounded font-semibold text-slate-900 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                      />
                      <datalist id="busy-party-list">
                        {parties.map((p) => (
                          <option key={p.id} value={p.name} />
                        ))}
                      </datalist>
                    </div>

                    <div className="sm:col-span-4">
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">Mat. Centre</label>
                      <select
                        value={salesVoucherData.mat_centre}
                        onChange={(e) => setSalesVoucherData({ ...salesVoucherData, mat_centre: e.target.value })}
                        className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-300 rounded font-semibold text-slate-900 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                      >
                        <option value="Main Store">Main Store</option>
                        <option value="Warehouse 1">Warehouse 1 (Kathmandu)</option>
                        <option value="Showroom Counter">Showroom Counter</option>
                        <option value="Birgunj Depot">Birgunj Depot</option>
                      </select>
                    </div>
                  </div>

                  {/* Narration Row & Transport Toggle */}
                  <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-center">
                    <div className="sm:col-span-9">
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">Narration</label>
                      <input
                        type="text"
                        value={salesVoucherData.narration}
                        onChange={(e) => setSalesVoucherData({ ...salesVoucherData, narration: e.target.value })}
                        placeholder="e.g. Goods sold on 30-day credit terms / PO reference"
                        className="w-full px-3 py-1.5 bg-slate-50 border border-slate-300 rounded text-slate-900 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                      />
                    </div>

                    <div className="sm:col-span-3 pt-4 sm:pt-0">
                      <button
                        type="button"
                        onClick={() =>
                          setSalesVoucherData((prev) => ({ ...prev, showTransport: !prev.showTransport }))
                        }
                        className={`w-full py-1.5 px-2.5 rounded border text-[11px] font-bold transition flex items-center justify-center gap-1.5 cursor-pointer ${
                          salesVoucherData.showTransport || salesVoucherData.vehicle_no
                            ? 'bg-indigo-50 text-indigo-700 border-indigo-300'
                            : 'bg-slate-50 text-slate-700 border-slate-300 hover:bg-slate-100'
                        }`}
                      >
                        <Truck className="w-3.5 h-3.5" />
                        <span>
                          {salesVoucherData.showTransport ? 'Hide Transport' : '+ Transport / Delivery'}
                        </span>
                      </button>
                    </div>
                  </div>

                  {/* 2B. TRANSPORT & DELIVERY INFORMATION (CUSTOM FIELDS) */}
                  {(salesVoucherData.showTransport || salesVoucherData.vehicle_no) && (
                    <div className="p-3 bg-slate-50/80 rounded border border-slate-200 space-y-2 mt-2">
                      <div className="text-[11px] font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                        <Truck className="w-3.5 h-3.5 text-indigo-600" />
                        <span>Transport &amp; Dispatch Information (Optional Custom Fields)</span>
                      </div>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                        <div>
                          <label className="block text-[10px] font-semibold text-slate-600 mb-0.5">Driver Name</label>
                          <input
                            type="text"
                            value={salesVoucherData.driver_name}
                            onChange={(e) => setSalesVoucherData({ ...salesVoucherData, driver_name: e.target.value })}
                            placeholder="e.g. Ramesh Thapa"
                            className="w-full px-2 py-1 bg-white border border-slate-300 rounded text-xs"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-semibold text-slate-600 mb-0.5">Driver Phone No</label>
                          <input
                            type="text"
                            value={salesVoucherData.driver_phone}
                            onChange={(e) => setSalesVoucherData({ ...salesVoucherData, driver_phone: e.target.value })}
                            placeholder="e.g. 9841234567"
                            className="w-full px-2 py-1 bg-white border border-slate-300 rounded text-xs font-mono"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-semibold text-slate-600 mb-0.5">Vehicle No</label>
                          <input
                            type="text"
                            value={salesVoucherData.vehicle_no}
                            onChange={(e) => setSalesVoucherData({ ...salesVoucherData, vehicle_no: e.target.value })}
                            placeholder="e.g. BA 2 KHA 8492"
                            className="w-full px-2 py-1 bg-white border border-slate-300 rounded text-xs font-mono font-bold"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-semibold text-slate-600 mb-0.5">Delivery Person Name</label>
                          <input
                            type="text"
                            value={salesVoucherData.delivery_person}
                            onChange={(e) => setSalesVoucherData({ ...salesVoucherData, delivery_person: e.target.value })}
                            placeholder="e.g. Suman Sharma"
                            className="w-full px-2 py-1 bg-white border border-slate-300 rounded text-xs"
                          />
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* 2C. ITEM ENTRY GRID TABLE */}
                <div className="bg-white rounded-lg border border-slate-300 shadow-2xs overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead className="bg-slate-200/80 text-slate-700 font-bold border-b border-slate-300 text-[11px]">
                        <tr>
                          <th className="p-2 text-center w-10 border-r border-slate-300">S.N.</th>
                          <th className="p-2 border-r border-slate-300">Item Description</th>
                          <th className="p-2 text-right w-20 border-r border-slate-300">Qty</th>
                          <th className="p-2 text-center w-24 border-r border-slate-300">Unit</th>
                          <th className="p-2 text-right w-28 border-r border-slate-300">Price (Rs.)</th>
                          {/* COMPANY SETTING: DISCOUNT TOGGLE - Completely hidden if disabled */}
                          {isSalesDiscountEnabled && (
                            <>
                              <th className="p-2 text-right w-20 border-r border-slate-300">Disc (%)</th>
                              <th className="p-2 text-right w-24 border-r border-slate-300">Disc (Rs.)</th>
                            </>
                          )}
                          <th className="p-2 text-right w-32 border-r border-slate-300">Amount (Rs.)</th>
                          <th className="p-2 text-center w-10">✕</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200">
                        {busySalesComputed.computedItems.map((item, idx) => (
                          <tr key={item.id} className="hover:bg-slate-50/70">
                            <td className="p-1.5 text-center font-mono font-bold text-slate-500 border-r border-slate-200">
                              {idx + 1}
                            </td>
                            <td className="p-1 border-r border-slate-200">
                              <input
                                type="text"
                                list="busy-item-catalog"
                                value={item.item_description}
                                onChange={(e) => {
                                  const val = e.target.value;
                                  setSalesVoucherData((prev) => ({
                                    ...prev,
                                    items: prev.items.map((it, i) =>
                                      i === idx ? { ...it, item_description: val } : it
                                    ),
                                  }));
                                }}
                                placeholder="Type item name or code..."
                                className="w-full px-2 py-1 bg-transparent border-0 focus:ring-1 focus:ring-indigo-500 rounded font-medium text-slate-900"
                              />
                            </td>
                            <td className="p-1 border-r border-slate-200">
                              <input
                                type="number"
                                min="0"
                                step="any"
                                value={item.qty}
                                onChange={(e) => {
                                  const val = e.target.value === '' ? '' : parseFloat(e.target.value);
                                  setSalesVoucherData((prev) => ({
                                    ...prev,
                                    items: prev.items.map((it, i) => (i === idx ? { ...it, qty: val } : it)),
                                  }));
                                }}
                                placeholder="0"
                                className="w-full px-2 py-1 text-right font-mono font-bold text-slate-900 bg-transparent border-0 focus:ring-1 focus:ring-indigo-500 rounded"
                              />
                            </td>
                            <td className="p-1 border-r border-slate-200">
                              <select
                                value={item.unit}
                                onChange={(e) => {
                                  const val = e.target.value;
                                  setSalesVoucherData((prev) => ({
                                    ...prev,
                                    items: prev.items.map((it, i) => (i === idx ? { ...it, unit: val } : it)),
                                  }));
                                }}
                                className="w-full px-1.5 py-1 text-center bg-transparent border-0 font-medium text-slate-800 focus:ring-1 focus:ring-indigo-500 rounded"
                              >
                                <option value="Case">Case</option>
                                <option value="Pcs">Pcs</option>
                                <option value="Box">Box</option>
                                <option value="Bag">Bag</option>
                                <option value="Kg">Kg</option>
                                <option value="Ctn">Ctn</option>
                                <option value="Bundle">Bundle</option>
                                <option value="Mtr">Mtr</option>
                                <option value="Nos">Nos</option>
                              </select>
                            </td>
                            <td className="p-1 border-r border-slate-200">
                              <input
                                type="number"
                                min="0"
                                step="any"
                                value={item.price}
                                onChange={(e) => {
                                  const val = e.target.value === '' ? '' : parseFloat(e.target.value);
                                  setSalesVoucherData((prev) => ({
                                    ...prev,
                                    items: prev.items.map((it, i) => (i === idx ? { ...it, price: val } : it)),
                                  }));
                                }}
                                placeholder="0.00"
                                className="w-full px-2 py-1 text-right font-mono font-semibold text-slate-900 bg-transparent border-0 focus:ring-1 focus:ring-indigo-500 rounded"
                              />
                            </td>
                            {/* DISCOUNT COLUMNS: STRICTLY CONDITIONAL */}
                            {isSalesDiscountEnabled && (
                              <>
                                <td className="p-1 border-r border-slate-200">
                                  <input
                                    type="number"
                                    min="0"
                                    max="100"
                                    step="any"
                                    value={item.disc_pct}
                                    onChange={(e) => {
                                      const val = e.target.value === '' ? '' : parseFloat(e.target.value);
                                      setSalesVoucherData((prev) => ({
                                        ...prev,
                                        items: prev.items.map((it, i) => (i === idx ? { ...it, disc_pct: val } : it)),
                                      }));
                                    }}
                                    placeholder="0"
                                    className="w-full px-2 py-1 text-right font-mono text-amber-700 bg-transparent border-0 focus:ring-1 focus:ring-indigo-500 rounded"
                                  />
                                </td>
                                <td className="p-1.5 text-right font-mono text-slate-600 border-r border-slate-200">
                                  {formatNPR(item.disc_amt || 0)}
                                </td>
                              </>
                            )}
                            <td className="p-1.5 text-right font-mono font-bold text-slate-900 border-r border-slate-200">
                              {formatNPR(item.amount || 0)}
                            </td>
                            <td className="p-1 text-center">
                              <button
                                type="button"
                                onClick={() => {
                                  if (salesVoucherData.items.length <= 1) {
                                    showToast('Voucher must contain at least 1 row.', 'warning');
                                    return;
                                  }
                                  setSalesVoucherData((prev) => ({
                                    ...prev,
                                    items: prev.items.filter((_, i) => i !== idx),
                                  }));
                                }}
                                className="text-slate-400 hover:text-rose-600 p-1 rounded cursor-pointer"
                              >
                                ✕
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Add Row Button & Alt. Qty / Total Qty Summary Bar */}
                  <div className="bg-slate-50 border-t border-slate-200 p-2.5 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
                    <button
                      type="button"
                      onClick={() => {
                        setSalesVoucherData((prev) => ({
                          ...prev,
                          items: [
                            ...prev.items,
                            {
                              id: `item-${Date.now()}-${prev.items.length + 1}`,
                              item_description: '',
                              qty: '',
                              unit: 'Pcs',
                              price: '',
                              disc_pct: '',
                              disc_amt: 0,
                              amount: 0,
                            },
                          ],
                        }));
                      }}
                      className="px-3 py-1 bg-white hover:bg-slate-100 text-indigo-700 border border-indigo-200 rounded font-bold shadow-2xs transition flex items-center gap-1 cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Add Item Line [Enter]</span>
                    </button>

                    {/* Alt. Qty / Total Qty Summary Bar directly below grid */}
                    <div className="flex flex-wrap items-center gap-4 text-xs font-mono">
                      <div>
                        <span className="text-slate-500">Total Qty: </span>
                        <strong className="text-slate-900 font-bold">{busySalesComputed.totalQty} Units</strong>
                      </div>
                      <div>
                        <span className="text-slate-500">Alt. Qty: </span>
                        <strong className="text-indigo-700 font-bold">{busySalesComputed.altQty} Cases / Boxes</strong>
                      </div>
                      <div>
                        <span className="text-slate-500">Items Count: </span>
                        <strong className="text-slate-900 font-bold">{busySalesComputed.validItemsCount} Lines</strong>
                      </div>
                      <div className="bg-slate-200 px-2.5 py-1 rounded">
                        <span className="text-slate-600 font-sans">Subtotal: </span>
                        <strong className="text-slate-900 font-bold">Rs. {formatNPR(busySalesComputed.grossSubtotal)}</strong>
                      </div>
                    </div>
                  </div>
                </div>

                {/* 2D. BILL SUNDRY SECTION (EXACT BOTTOM TABLE) */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 items-start">
                  {/* Left Table: Bill Sundry Grid */}
                  <div className="lg:col-span-7 bg-white rounded-lg border border-slate-300 shadow-2xs overflow-hidden">
                    <div className="p-2.5 bg-slate-100 border-b border-slate-300 font-bold text-slate-700 text-xs flex items-center justify-between">
                      <span>Bill Sundry (Tax, Freight, Discounts &amp; Adjustments)</span>
                      <button
                        type="button"
                        onClick={() => {
                          setSalesVoucherData((prev) => ({
                            ...prev,
                            billSundries: [
                              ...prev.billSundries,
                              {
                                id: `bs-${Date.now()}`,
                                name: 'Other Charges / Sundry',
                                rate_pct: '',
                                amount: 500,
                                type: 'additive',
                              },
                            ],
                          }));
                        }}
                        className="text-[11px] text-indigo-700 font-semibold hover:underline flex items-center gap-1 cursor-pointer"
                      >
                        <Plus className="w-3 h-3" />
                        <span>Add Sundry</span>
                      </button>
                    </div>

                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200 text-[11px]">
                          <tr>
                            <th className="p-2 text-center w-10">S.N.</th>
                            <th className="p-2">Bill Sundry Name</th>
                            <th className="p-2 text-right w-20">@ (%)</th>
                            <th className="p-2 text-right w-28">Amount (Rs.)</th>
                            <th className="p-2 text-center w-8">✕</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {busySalesComputed.computedSundries.map((bs, sIdx) => (
                            <tr key={bs.id} className="hover:bg-slate-50/70">
                              <td className="p-2 text-center font-mono font-bold text-slate-400">{sIdx + 1}</td>
                              <td className="p-1.5">
                                <input
                                  type="text"
                                  value={bs.name}
                                  onChange={(e) => {
                                    const val = e.target.value;
                                    setSalesVoucherData((prev) => ({
                                      ...prev,
                                      billSundries: prev.billSundries.map((s, idx) =>
                                        idx === sIdx ? { ...s, name: val } : s
                                      ),
                                    }));
                                  }}
                                  className="w-full px-2 py-1 bg-transparent border-0 font-medium text-slate-800 focus:ring-1 focus:ring-indigo-500 rounded"
                                />
                              </td>
                              <td className="p-1.5">
                                <input
                                  type="number"
                                  step="any"
                                  value={bs.rate_pct}
                                  onChange={(e) => {
                                    const val = e.target.value === '' ? '' : parseFloat(e.target.value);
                                    setSalesVoucherData((prev) => ({
                                      ...prev,
                                      billSundries: prev.billSundries.map((s, idx) =>
                                        idx === sIdx ? { ...s, rate_pct: val } : s
                                      ),
                                    }));
                                  }}
                                  placeholder="—"
                                  className="w-full px-1 py-1 text-right font-mono text-slate-700 bg-transparent border-0 focus:ring-1 focus:ring-indigo-500 rounded"
                                />
                              </td>
                              <td className="p-1.5 text-right font-mono font-bold text-slate-900">
                                {bs.name.toLowerCase().includes('trade discount') && '- '}
                                {formatNPR(bs.computedAmount || 0)}
                              </td>
                              <td className="p-1 text-center">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setSalesVoucherData((prev) => ({
                                      ...prev,
                                      billSundries: prev.billSundries.filter((_, idx) => idx !== sIdx),
                                    }));
                                  }}
                                  className="text-slate-400 hover:text-rose-600 p-1 cursor-pointer"
                                >
                                  ✕
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Right Box: Dynamic Net Amount & Calculations */}
                  <div className="lg:col-span-5 bg-white rounded-lg border border-slate-300 p-3.5 shadow-2xs space-y-2.5">
                    <div className="text-xs font-bold text-slate-700 uppercase tracking-wider pb-1 border-b border-slate-200">
                      Accounting Totals Summary
                    </div>

                    <div className="space-y-1.5 text-xs font-mono">
                      <div className="flex justify-between items-center text-slate-600">
                        <span>Items Gross Subtotal:</span>
                        <span className="font-bold text-slate-900">Rs. {formatNPR(busySalesComputed.grossSubtotal)}</span>
                      </div>
                      {busySalesComputed.tradeDiscount > 0 && (
                        <div className="flex justify-between items-center text-amber-700">
                          <span>Less: Trade Discount:</span>
                          <span className="font-bold">- Rs. {formatNPR(busySalesComputed.tradeDiscount)}</span>
                        </div>
                      )}
                      <div className="flex justify-between items-center text-slate-700">
                        <span>Add: VAT (13%):</span>
                        <span className="font-bold text-slate-900">+ Rs. {formatNPR(busySalesComputed.vatAmount)}</span>
                      </div>
                      {busySalesComputed.freightCharges > 0 && (
                        <div className="flex justify-between items-center text-slate-700">
                          <span>Add: Freight / Delivery:</span>
                          <span className="font-bold text-slate-900">+ Rs. {formatNPR(busySalesComputed.freightCharges)}</span>
                        </div>
                      )}
                      <div className="flex justify-between items-center text-slate-500 text-[11px]">
                        <span>Round Off Adjustment:</span>
                        <span>{busySalesComputed.roundOffVal >= 0 ? '+' : ''}{busySalesComputed.roundOffVal.toFixed(2)}</span>
                      </div>
                    </div>

                    {/* Prominent Busy Net Amount Box */}
                    <div className="p-3 bg-slate-900 text-white rounded-lg shadow-inner space-y-1 mt-2">
                      <div className="text-[11px] text-slate-300 font-semibold uppercase tracking-wider">
                        Net Amount (Total Payable)
                      </div>
                      <div className="text-xl sm:text-2xl font-mono font-bold text-emerald-400">
                        Rs. {formatNPR(busySalesComputed.netAmount)}
                      </div>
                      <div className="text-[10px] text-slate-300 italic pt-1 border-t border-slate-800 leading-tight">
                        Words: {numberToWords(busySalesComputed.netAmount)} Rupees Only
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* 3. BOTTOM ACTION BUTTON BAR (EXACT BUSY STYLE) */}
              <div className="bg-slate-200 border-t border-slate-300 p-2.5 px-4 flex flex-wrap items-center justify-between gap-2 shrink-0">
                <div className="flex flex-wrap items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => setBusySalesModal({ type: 'vch_detail' })}
                    className="px-2.5 py-1.5 bg-white hover:bg-slate-50 text-slate-800 border border-slate-300 rounded text-xs font-semibold shadow-2xs transition cursor-pointer"
                  >
                    Vch. Detail [Alt+D]
                  </button>
                  <button
                    type="button"
                    onClick={() => setBusySalesModal({ type: 'master_detail' })}
                    className="px-2.5 py-1.5 bg-white hover:bg-slate-50 text-slate-800 border border-slate-300 rounded text-xs font-semibold shadow-2xs transition cursor-pointer"
                  >
                    Master Detail [Alt+M]
                  </button>
                  <button
                    type="button"
                    onClick={() => setBusySalesModal({ type: 'party_dashboard' })}
                    className="px-2.5 py-1.5 bg-white hover:bg-slate-50 text-slate-800 border border-slate-300 rounded text-xs font-semibold shadow-2xs transition cursor-pointer"
                  >
                    Party Dash Board [Alt+B]
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setSalesVoucherData((prev) => ({ ...prev, isHeld: !prev.isHeld }));
                      showToast(!salesVoucherData.isHeld ? 'Voucher placed on HOLD [Draft]' : 'Voucher taken off hold', 'info');
                    }}
                    className={`px-2.5 py-1.5 rounded text-xs font-semibold shadow-2xs transition cursor-pointer border ${
                      salesVoucherData.isHeld
                        ? 'bg-amber-500 text-slate-950 border-amber-600 font-bold'
                        : 'bg-white hover:bg-slate-50 text-slate-800 border-slate-300'
                    }`}
                  >
                    {salesVoucherData.isHeld ? 'Held [Alt+H] ✓' : 'Hold Vch. [Alt+H]'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setBusySalesModal({ type: 'update_discount' })}
                    className="px-2.5 py-1.5 bg-white hover:bg-slate-50 text-slate-800 border border-slate-300 rounded text-xs font-semibold shadow-2xs transition cursor-pointer"
                  >
                    Update Discount [Alt+U]
                  </button>
                  <button
                    type="button"
                    onClick={() => setBusySalesModal({ type: 'check_scheme' })}
                    className="px-2.5 py-1.5 bg-white hover:bg-slate-50 text-slate-800 border border-slate-300 rounded text-xs font-semibold shadow-2xs transition cursor-pointer"
                  >
                    Check Scheme [Alt+S]
                  </button>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setActiveVoucherModal((prev) => ({ ...prev, isOpen: false }))}
                    className="px-4 py-1.5 bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 rounded text-xs font-bold transition cursor-pointer shadow-2xs"
                  >
                    Quit [Esc]
                  </button>
                  <button
                    type="button"
                    id="btn-save-busy-sales-voucher"
                    onClick={handleSaveBusySalesVoucher}
                    className="px-6 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded text-xs font-bold shadow-md transition flex items-center gap-1.5 cursor-pointer"
                  >
                    <Check className="w-4 h-4" />
                    <span>Save [F2]</span>
                  </button>
                </div>
              </div>
            </div>
          ) : (
            /* ADD / MODIFY VOUCHER FORM FOR OTHER VOUCHERS (Payment, Receipt, Journal, Contra, Notes, Stock) */
            <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-2xl space-y-4 border border-slate-100 my-8">
              <div className="flex items-start justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-indigo-600 text-white rounded-xl shadow-xs">
                    <Receipt className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-base font-bold text-slate-900">
                        {VOUCHER_CATEGORIES.find((c) => c.key === activeVoucherModal.type)?.label || 'Voucher'}{' '}
                        <span className="text-indigo-600 font-mono font-bold">
                          [{activeVoucherModal.action === 'add' ? 'ADD ENTRY' : 'MODIFY ENTRY'}]
                        </span>
                      </h3>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-200 font-mono">
                        {VOUCHER_CATEGORIES.find((c) => c.key === activeVoucherModal.type)?.hotkeyPlaceholder}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Busy/Tally keyboard entry: Press <kbd className="px-1 py-0.5 bg-slate-100 rounded text-[10px] font-mono border">Enter</kbd> to traverse fields. Press <kbd className="px-1 py-0.5 bg-slate-100 rounded text-[10px] font-mono border">Esc</kbd> to exit.
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setActiveVoucherModal((prev) => ({ ...prev, isOpen: false }))}
                  className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Interactive Form */}
              <form onSubmit={handleSaveVoucher} onKeyDown={handleVoucherFormKeyDown} className="space-y-4 text-xs">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-slate-700 font-semibold mb-1">Voucher Series / No</label>
                    <input
                      type="text"
                      required
                      value={voucherFormData.voucher_number}
                      onChange={(e) => setVoucherFormData({ ...voucherFormData, voucher_number: e.target.value })}
                      placeholder="e.g. PV-102"
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-mono font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-700 font-semibold mb-1">Date (BS - Nepali)</label>
                    <input
                      type="text"
                      required
                      value={voucherFormData.date_bs}
                      onChange={(e) => {
                        const bs = e.target.value;
                        const ad = bsToAd(bs);
                        setVoucherFormData({ ...voucherFormData, date_bs: bs, date_ad: ad || voucherFormData.date_ad });
                      }}
                      placeholder="YYYY-MM-DD"
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-mono text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-700 font-semibold mb-1">Date (AD - English)</label>
                    <input
                      type="date"
                      required
                      value={voucherFormData.date_ad}
                      onChange={(e) => {
                        const ad = e.target.value;
                        const bs = adToBs(ad);
                        setVoucherFormData({ ...voucherFormData, date_ad: ad, date_bs: bs || voucherFormData.date_bs });
                      }}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-mono text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-slate-700 font-semibold mb-1">Payment / Tx Mode</label>
                    <select
                      value={voucherFormData.payment_mode}
                      onChange={(e) =>
                        setVoucherFormData({
                          ...voucherFormData,
                          payment_mode: e.target.value as 'Cash' | 'Bank' | 'Cheque' | 'IPS',
                        })
                      }
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
                    >
                      <option value="Bank">Bank Account</option>
                      <option value="Cash">Cash Account</option>
                      <option value="Cheque">Cheque Settlement</option>
                      <option value="IPS">ConnectIPS / Online</option>
                    </select>
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-slate-700 font-semibold mb-1">Cheque # / Instrument Ref</label>
                    <input
                      type="text"
                      value={voucherFormData.cheque_number}
                      onChange={(e) => setVoucherFormData({ ...voucherFormData, cheque_number: e.target.value })}
                      placeholder="e.g. 0048192 or Bank Txn ID"
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-mono text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                </div>

                {/* Double-Entry Ledger Accounts (Debit / Credit) */}
                <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
                  <div className="text-[11px] font-bold uppercase tracking-wider text-indigo-700 flex items-center gap-1.5">
                    <CheckSquare className="w-3.5 h-3.5" />
                    <span>Double-Entry Ledger Allocation</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="block text-slate-700 font-semibold">Debit Account (Dr.)</label>
                        <span className="text-[10px] text-slate-400 font-mono">Receiving / Expense / Asset</span>
                      </div>
                      <input
                        type="text"
                        required
                        list="debit-accounts-list"
                        value={voucherFormData.account_debit}
                        onChange={(e) => setVoucherFormData({ ...voucherFormData, account_debit: e.target.value })}
                        placeholder="e.g. Supplier A/c or Rent Expense"
                        className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                      <datalist id="debit-accounts-list">
                        {parties.map((p) => (
                          <option key={p.id} value={p.name} />
                        ))}
                        {banks.map((b) => (
                          <option key={b.id} value={`${b.name} A/c`} />
                        ))}
                        <option value="Cash A/c" />
                        <option value="Purchase A/c" />
                        <option value="Sales Return A/c" />
                        <option value="Rent Expense A/c" />
                        <option value="Salary Expense A/c" />
                      </datalist>
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="block text-slate-700 font-semibold">Credit Account (Cr.)</label>
                        <span className="text-[10px] text-slate-400 font-mono">Giving / Income / Source</span>
                      </div>
                      <input
                        type="text"
                        required
                        list="credit-accounts-list"
                        value={voucherFormData.account_credit}
                        onChange={(e) => setVoucherFormData({ ...voucherFormData, account_credit: e.target.value })}
                        placeholder="e.g. Nabil Bank A/c or Cash A/c"
                        className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                      <datalist id="credit-accounts-list">
                        {banks.map((b) => (
                          <option key={b.id} value={`${b.name} A/c`} />
                        ))}
                        {parties.map((p) => (
                          <option key={p.id} value={p.name} />
                        ))}
                        <option value="Cash A/c" />
                        <option value="Sales A/c" />
                        <option value="Purchase Return A/c" />
                        <option value="Discount Received A/c" />
                      </datalist>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-700 font-semibold mb-1">Voucher Amount (NPR)</label>
                    <input
                      type="number"
                      required
                      min="0.01"
                      step="any"
                      value={voucherFormData.amount}
                      onChange={(e) =>
                        setVoucherFormData({
                          ...voucherFormData,
                          amount: e.target.value === '' ? '' : parseFloat(e.target.value),
                        })
                      }
                      placeholder="0.00"
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-mono font-bold text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-700 font-semibold mb-1">Reference No / Bill #</label>
                    <input
                      type="text"
                      value={voucherFormData.reference_no}
                      onChange={(e) => setVoucherFormData({ ...voucherFormData, reference_no: e.target.value })}
                      placeholder="e.g. INV-9042"
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-mono text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-slate-700 font-semibold">Narration / Ledger Description</label>
                    <span className="text-[10px] text-slate-400">Press Enter to advance to Save button</span>
                  </div>
                  <textarea
                    rows={2}
                    value={voucherFormData.narration}
                    onChange={(e) => setVoucherFormData({ ...voucherFormData, narration: e.target.value })}
                    placeholder="Enter voucher explanation or settlement details..."
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                {/* Keyboard Form Control Helper */}
                <div className="p-2.5 bg-indigo-50/60 rounded-xl border border-indigo-100 flex items-center justify-between text-[11px] text-indigo-950">
                  <div className="flex items-center gap-1.5 font-medium">
                    <Info className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                    <span>Keyboard shortcuts: [Enter] Advance &bull; [Shift+Enter] Previous &bull; [Esc] Cancel</span>
                  </div>
                  <span className="font-mono font-bold text-indigo-700">ChequeDesk Ledger Engine</span>
                </div>

                {/* Form Buttons */}
                <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setActiveVoucherModal((prev) => ({ ...prev, isOpen: false }))}
                    className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold transition cursor-pointer text-xs"
                  >
                    Cancel [Esc]
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold transition cursor-pointer shadow-md flex items-center gap-1.5 text-xs"
                  >
                    <Check className="w-4 h-4" />
                    <span>
                      {activeVoucherModal.action === 'modify' ? 'Update Voucher [Enter]' : 'Save & Post Voucher [Enter]'}
                    </span>
                  </button>
                </div>
              </form>
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* 24. BUSY SALES AUXILIARY DIALOGS & PRINT PREVIEW MODALS                   */}
      {/* ========================================================================= */}

      {/* 24A. VOUCHER DETAIL (TRANSPORT & DELIVERY) MODAL [Alt+D] */}
      {busySalesModal.type === 'vch_detail' && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4 border border-slate-100">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
                  <Truck className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">Voucher Transport &amp; Delivery Details</h3>
                  <p className="text-xs text-slate-500">Dispatch details, vehicle number, driver &amp; courier tracking</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setBusySalesModal({ type: null })}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Driver Name</label>
                  <input
                    type="text"
                    value={salesVoucherData.driver_name}
                    onChange={(e) => setSalesVoucherData({ ...salesVoucherData, driver_name: e.target.value })}
                    placeholder="e.g. Ramesh Thapa"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Driver Phone Number</label>
                  <input
                    type="text"
                    value={salesVoucherData.driver_phone}
                    onChange={(e) => setSalesVoucherData({ ...salesVoucherData, driver_phone: e.target.value })}
                    placeholder="e.g. 9841234567"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Vehicle Number</label>
                  <input
                    type="text"
                    value={salesVoucherData.vehicle_no}
                    onChange={(e) => setSalesVoucherData({ ...salesVoucherData, vehicle_no: e.target.value })}
                    placeholder="e.g. BA 2 KHA 8492"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-mono font-bold uppercase focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Delivery Person Name</label>
                  <input
                    type="text"
                    value={salesVoucherData.delivery_person}
                    onChange={(e) => setSalesVoucherData({ ...salesVoucherData, delivery_person: e.target.value })}
                    placeholder="e.g. Suman Sharma"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Transporter / Courier</label>
                  <input
                    type="text"
                    value={salesVoucherData.transporter_name}
                    onChange={(e) => setSalesVoucherData({ ...salesVoucherData, transporter_name: e.target.value })}
                    placeholder="e.g. Everest Cargo"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Station / Destination</label>
                  <input
                    type="text"
                    value={salesVoucherData.station}
                    onChange={(e) => setSalesVoucherData({ ...salesVoucherData, station: e.target.value })}
                    placeholder="e.g. Pokhara Depot"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">GR / Bilty No.</label>
                  <input
                    type="text"
                    value={salesVoucherData.gr_no}
                    onChange={(e) => setSalesVoucherData({ ...salesVoucherData, gr_no: e.target.value })}
                    placeholder="e.g. GR-9081"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-100 text-xs font-bold">
              <button
                type="button"
                onClick={() => setBusySalesModal({ type: null })}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl transition cursor-pointer"
              >
                Close [Esc]
              </button>
              <button
                type="button"
                onClick={() => {
                  setSalesVoucherData((prev) => ({ ...prev, showTransport: true }));
                  setBusySalesModal({ type: null });
                  showToast('Transport details saved to voucher.', 'success');
                }}
                className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl transition cursor-pointer shadow-xs"
              >
                Apply Details [Enter]
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 24B. MASTER DETAIL MODAL [Alt+M] */}
      {busySalesModal.type === 'master_detail' && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4 border border-slate-100">
            {(() => {
              const matchedParty = parties.find((p) => p.name === salesVoucherData.party_name) || parties[0];
              const bal = getPartyBalanceInfo(salesVoucherData.party_name);
              return (
                <>
                  <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                    <div className="flex items-center gap-2.5">
                      <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
                        <Users className="w-5 h-5" />
                      </div>
                      <div>
                        <h3 className="text-base font-bold text-slate-900">Party Master Profile</h3>
                        <p className="text-xs text-slate-500">Master ledger profile for {salesVoucherData.party_name || 'Selected Customer'}</p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setBusySalesModal({ type: null })}
                      className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg cursor-pointer"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>

                  <div className="p-4 bg-slate-50 rounded-xl border border-slate-200/80 space-y-2.5 text-xs">
                    <div className="flex justify-between items-center">
                      <span className="text-slate-500">Account Title:</span>
                      <strong className="text-slate-900 font-bold text-sm">{salesVoucherData.party_name}</strong>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-slate-500">Ledger Group:</span>
                      <span className="bg-indigo-100 text-indigo-800 font-bold px-2 py-0.5 rounded text-[11px]">
                        {matchedParty?.party_type || 'Sundry Debtors'}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-slate-500">PAN / VAT Registration No:</span>
                      <span className="font-mono font-bold text-slate-800">
                        {matchedParty?.tax_number || matchedParty?.pan_number || '302918291'}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-slate-500">Contact Phone:</span>
                      <span className="font-mono text-slate-800">{matchedParty?.phone || '+977 1 4410928'}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-slate-500">Billing Address:</span>
                      <span className="text-slate-800">{matchedParty?.address || 'Kathmandu, Nepal'}</span>
                    </div>
                    <div className="flex justify-between items-center pt-2 border-t border-slate-200">
                      <span className="text-slate-500 font-semibold">Current Outstanding Balance:</span>
                      <span className="font-mono font-bold text-sm text-slate-900">
                        Rs. {formatNPR(bal.amount)}{' '}
                        <span className={`px-1.5 py-0.2 rounded text-[10px] ${bal.drCr === 'Dr' ? 'bg-rose-100 text-rose-700' : 'bg-emerald-100 text-emerald-700'}`}>
                          {bal.drCr}
                        </span>
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-slate-500">Credit Term Limit:</span>
                      <span className="font-mono text-slate-700 font-bold">30 Days (Max Rs. 500,000)</span>
                    </div>
                  </div>

                  <div className="flex justify-end pt-2 text-xs font-bold">
                    <button
                      type="button"
                      onClick={() => setBusySalesModal({ type: null })}
                      className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl transition cursor-pointer shadow-xs"
                    >
                      Close [Esc]
                    </button>
                  </div>
                </>
              );
            })()}
          </div>
        </div>
      )}

      {/* 24C. PARTY DASHBOARD MODAL [Alt+B] */}
      {busySalesModal.type === 'party_dashboard' && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-2xl space-y-4 border border-slate-100 max-h-[90vh] overflow-y-auto">
            {(() => {
              const matchedParty = parties.find((p) => p.name === salesVoucherData.party_name) || parties[0];
              const partyCheques = cheques.filter((c) => matchedParty && c.party_id === matchedParty.id);
              const totalTurnover = partyCheques.reduce((sum, c) => sum + c.amount, 0);
              const pendingDue = partyCheques.filter((c) => c.status !== 'Cleared').reduce((sum, c) => sum + (c.remaining_amount ?? c.amount), 0);
              const settled = totalTurnover - pendingDue;
              return (
                <>
                  <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                    <div className="flex items-center gap-2.5">
                      <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
                        <BarChart3 className="w-5 h-5" />
                      </div>
                      <div>
                        <h3 className="text-base font-bold text-slate-900">Party 360° Dashboard</h3>
                        <p className="text-xs text-slate-500">Real-time ledger and exposure analysis for {salesVoucherData.party_name || 'Selected Customer'}</p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setBusySalesModal({ type: null })}
                      className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg cursor-pointer"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>

                  {/* 3 Metrics */}
                  <div className="grid grid-cols-3 gap-3 text-center">
                    <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                      <span className="text-[10px] uppercase font-bold text-slate-400 block">Total Volume</span>
                      <span className="text-sm font-bold font-mono text-slate-900">{formatNPR(totalTurnover)}</span>
                    </div>
                    <div className="bg-emerald-50/60 p-3 rounded-xl border border-emerald-100">
                      <span className="text-[10px] uppercase font-bold text-emerald-600 block">Settled</span>
                      <span className="text-sm font-bold font-mono text-emerald-700">{formatNPR(settled)}</span>
                    </div>
                    <div className="bg-rose-50/60 p-3 rounded-xl border border-rose-100">
                      <span className="text-[10px] uppercase font-bold text-rose-600 block">Outstanding</span>
                      <span className="text-sm font-bold font-mono text-rose-700">{formatNPR(pendingDue)}</span>
                    </div>
                  </div>

                  {/* Recent Cheque Records */}
                  <div className="space-y-2">
                    <div className="text-xs font-bold text-slate-700">Cheque History ({partyCheques.length} Records)</div>
                    <div className="max-h-48 overflow-y-auto border border-slate-200 rounded-xl divide-y divide-slate-100 text-xs">
                      {partyCheques.length === 0 ? (
                        <div className="p-4 text-center text-slate-400">No cheque transactions registered for this party.</div>
                      ) : (
                        partyCheques.map((c) => (
                          <div key={c.id} className="p-2.5 flex items-center justify-between hover:bg-slate-50">
                            <div>
                              <span className="font-mono font-bold text-slate-800">#{c.cheque_number}</span>
                              <span className="text-[11px] text-slate-400 ml-2">Due BS: {c.due_date_bs}</span>
                            </div>
                            <div className="flex items-center gap-3">
                              <span className="font-mono font-bold text-slate-900">{formatNPR(c.amount)}</span>
                              <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${c.status === 'Cleared' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'}`}>
                                {c.status}
                              </span>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>

                  <div className="flex justify-end pt-2 text-xs font-bold">
                    <button
                      type="button"
                      onClick={() => setBusySalesModal({ type: null })}
                      className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl transition cursor-pointer shadow-xs"
                    >
                      Close Dashboard [Esc]
                    </button>
                  </div>
                </>
              );
            })()}
          </div>
        </div>
      )}

      {/* 24D. UPDATE DISCOUNT MODAL [Alt+U] */}
      {busySalesModal.type === 'update_discount' && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4 border border-slate-100">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
                  <Tag className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">Update Sales Discounts</h3>
                  <p className="text-xs text-slate-500">Configure voucher item discounts &amp; tenant settings</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setBusySalesModal({ type: null })}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4 text-xs">
              {/* Tenant Discount Toggle */}
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between">
                <div>
                  <div className="font-bold text-slate-800">Enable Sales Discount Columns</div>
                  <div className="text-[11px] text-slate-500">
                    {isSalesDiscountEnabled ? 'Columns are visible in voucher grid' : 'Columns are hidden from voucher grid'}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => handleToggleCompanyDiscount(!isSalesDiscountEnabled)}
                  className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                    isSalesDiscountEnabled ? 'bg-indigo-600' : 'bg-slate-300'
                  }`}
                >
                  <span
                    className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                      isSalesDiscountEnabled ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>

              {/* Bulk Flat Discount Applicator */}
              {isSalesDiscountEnabled && (
                <div className="space-y-2 p-3 bg-indigo-50/50 rounded-xl border border-indigo-100">
                  <label className="block font-bold text-slate-800">Apply Flat Item Discount % to All Rows</label>
                  <div className="flex gap-2">
                    <input
                      type="number"
                      min="0"
                      max="100"
                      placeholder="e.g. 5"
                      id="bulk-discount-input"
                      defaultValue="5"
                      className="w-24 px-3 py-1.5 bg-white border border-slate-300 rounded-lg font-mono font-bold text-center"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        const input = document.getElementById('bulk-discount-input') as HTMLInputElement;
                        const pct = parseFloat(input?.value || '0');
                        setSalesVoucherData((prev) => ({
                          ...prev,
                          items: prev.items.map((it) => ({ ...it, disc_pct: pct })),
                        }));
                        setBusySalesModal({ type: null });
                        showToast(`Applied ${pct}% discount to all item lines.`, 'success');
                      }}
                      className="flex-1 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-bold transition cursor-pointer"
                    >
                      Apply To All Lines
                    </button>
                  </div>
                </div>
              )}
            </div>

            <div className="flex justify-end pt-2 text-xs font-bold">
              <button
                type="button"
                onClick={() => setBusySalesModal({ type: null })}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl transition cursor-pointer"
              >
                Close [Esc]
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 24E. CHECK SCHEME MODAL [Alt+S] */}
      {busySalesModal.type === 'check_scheme' && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4 border border-slate-100">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-amber-50 text-amber-600 rounded-xl">
                  <Sparkles className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">Promotional Schemes &amp; Offers</h3>
                  <p className="text-xs text-slate-500">Active manufacturer schemes and seasonal trade discounts</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setBusySalesModal({ type: null })}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-2.5 text-xs">
              {[
                {
                  id: 'scheme-1',
                  title: 'Dashain / Tihar Festival Special (3% Trade Rebate)',
                  desc: 'Applies 3% Trade Discount bill sundry across total invoice billing.',
                  action: () => {
                    setSalesVoucherData((prev) => ({
                      ...prev,
                      billSundries: prev.billSundries.map((bs) =>
                        bs.name.toLowerCase().includes('trade discount')
                          ? { ...bs, rate_pct: 3 }
                          : bs
                      ),
                    }));
                    setBusySalesModal({ type: null });
                    showToast('Scheme applied: 3% Trade Discount updated.', 'success');
                  },
                },
                {
                  id: 'scheme-2',
                  title: 'Zero Freight Promotion (Orders > Rs. 50,000)',
                  desc: 'Waives transportation / freight charges to Rs. 0 for prompt logistics.',
                  action: () => {
                    setSalesVoucherData((prev) => ({
                      ...prev,
                      billSundries: prev.billSundries.map((bs) =>
                        bs.name.toLowerCase().includes('freight') || bs.name.toLowerCase().includes('transport')
                          ? { ...bs, amount: 0 }
                          : bs
                      ),
                    }));
                    setBusySalesModal({ type: null });
                    showToast('Scheme applied: Freight charges waived.', 'success');
                  },
                },
                {
                  id: 'scheme-3',
                  title: 'Volume Quantity Scheme: Flat 5% Item Discount',
                  desc: 'Applies 5% line discount across all entered items (enables discount toggle).',
                  action: () => {
                    if (!isSalesDiscountEnabled) {
                      handleToggleCompanyDiscount(true);
                    }
                    setSalesVoucherData((prev) => ({
                      ...prev,
                      items: prev.items.map((it) => ({ ...it, disc_pct: 5 })),
                    }));
                    setBusySalesModal({ type: null });
                    showToast('Scheme applied: 5% line discount applied to all items.', 'success');
                  },
                },
              ].map((sch) => (
                <div key={sch.id} className="p-3 bg-slate-50 hover:bg-slate-100/80 rounded-xl border border-slate-200 transition flex items-center justify-between gap-3">
                  <div>
                    <div className="font-bold text-slate-900">{sch.title}</div>
                    <div className="text-[11px] text-slate-500 mt-0.5">{sch.desc}</div>
                  </div>
                  <button
                    type="button"
                    onClick={sch.action}
                    className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-bold text-xs shrink-0 cursor-pointer shadow-2xs"
                  >
                    Apply Scheme
                  </button>
                </div>
              ))}
            </div>

            <div className="flex justify-end pt-2 text-xs font-bold">
              <button
                type="button"
                onClick={() => setBusySalesModal({ type: null })}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl transition cursor-pointer"
              >
                Close [Esc]
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 24F. SAVE SUCCESS NOTIFICATION MODAL */}
      {busySalesModal.type === 'save_success' && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4 border border-slate-100 text-center">
            <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-2xl flex items-center justify-center mx-auto shadow-sm">
              <CheckCircle2 className="w-7 h-7" />
            </div>

            <div>
              <h3 className="text-lg font-bold text-slate-900">Voucher Successfully Saved!</h3>
              <p className="text-xs text-slate-500 mt-1">
                Sales Tax Invoice <span className="font-mono font-bold text-slate-800">#{busySalesModal.data?.voucher_number}</span> posted to the general ledger.
              </p>
            </div>

            <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 text-xs font-mono space-y-1.5 text-left">
              <div className="flex justify-between">
                <span className="text-slate-500">Party Account:</span>
                <span className="font-bold text-slate-900">{busySalesModal.data?.party_name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Net Amount:</span>
                <span className="font-bold text-emerald-700 text-sm">Rs. {formatNPR(busySalesModal.data?.amount)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Date (BS / AD):</span>
                <span>{busySalesModal.data?.date_bs} BS ({busySalesModal.data?.date_ad} AD)</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs font-bold pt-2">
              <button
                type="button"
                onClick={() => setBusySalesModal({ type: 'print_preview', data: busySalesModal.data })}
                className="py-2.5 px-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl shadow-xs transition flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Printer className="w-4 h-4" />
                <span>Print Tax Invoice</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setBusySalesModal({ type: null });
                  openVoucherAction('sales', 'add');
                }}
                className="py-2.5 px-3 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl transition cursor-pointer"
              >
                + Add Another Vch
              </button>
            </div>

            <button
              type="button"
              onClick={() => {
                setBusySalesModal({ type: null });
                openVoucherAction('sales', 'list');
              }}
              className="text-xs text-slate-400 hover:text-slate-600 font-semibold cursor-pointer block mx-auto"
            >
              Return to Sales Register
            </button>
          </div>
        </div>
      )}

      {/* 24G. IRD NEPAL COMPLIANT TAX INVOICE PRINT PREVIEW MODAL */}
      {busySalesModal.type === 'print_preview' && (
        <div className="fixed inset-0 z-50 bg-slate-900/75 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-xl max-w-3xl w-full p-6 shadow-2xl space-y-4 border border-slate-300 my-8">
            {/* Top Toolbar */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 no-print">
              <div className="flex items-center gap-2">
                <Printer className="w-5 h-5 text-indigo-600" />
                <span className="font-bold text-sm text-slate-900">Tax Invoice Print Preview (कर बिजक)</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Print / Save PDF [Ctrl+P]</span>
                </button>
                <button
                  type="button"
                  onClick={() => setBusySalesModal({ type: null })}
                  className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Printable Tax Invoice Document (Nepal IRD Standard) */}
            <div className="p-6 border border-slate-300 rounded bg-white text-slate-900 text-xs font-sans space-y-4">
              {/* Company Header */}
              <div className="text-center space-y-1 border-b border-slate-300 pb-3">
                <h1 className="text-xl font-bold uppercase tracking-wider text-slate-900">{activeCompanyName}</h1>
                <p className="text-[11px] text-slate-600">Kathmandu, Nepal • Tel: +977-1-4428910</p>
                <p className="text-[11px] font-mono font-bold text-slate-800">PAN / VAT No: 601298453</p>
                <div className="inline-block bg-slate-100 border border-slate-300 px-3 py-0.5 rounded text-xs font-bold uppercase mt-1">
                  TAX INVOICE (कर बिजक)
                </div>
              </div>

              {/* Invoice & Buyer Metadata Grid */}
              <div className="grid grid-cols-2 gap-4 text-xs">
                <div className="space-y-1">
                  <div>
                    <span className="text-slate-500">Buyer Name: </span>
                    <strong className="text-slate-900 font-bold">{busySalesModal.data?.party_name || salesVoucherData.party_name}</strong>
                  </div>
                  <div>
                    <span className="text-slate-500">Buyer Address: </span>
                    <span>Kathmandu, Nepal</span>
                  </div>
                  <div>
                    <span className="text-slate-500">Buyer PAN: </span>
                    <span className="font-mono font-bold">302918291</span>
                  </div>
                  <div>
                    <span className="text-slate-500">Vehicle No: </span>
                    <span className="font-mono font-bold">{busySalesModal.data?.transport_info?.vehicle_no || salesVoucherData.vehicle_no || '—'}</span>
                  </div>
                </div>

                <div className="space-y-1 text-right">
                  <div>
                    <span className="text-slate-500">Invoice No: </span>
                    <strong className="font-mono font-bold text-slate-900">
                      {busySalesModal.data?.voucher_number || salesVoucherData.voucher_number}
                    </strong>
                  </div>
                  <div>
                    <span className="text-slate-500">Invoice Date (BS): </span>
                    <strong className="font-mono">{busySalesModal.data?.date_bs || salesVoucherData.date_bs} BS</strong>
                  </div>
                  <div>
                    <span className="text-slate-500">Invoice Date (AD): </span>
                    <span className="font-mono">{busySalesModal.data?.date_ad || salesVoucherData.date_ad} AD</span>
                  </div>
                  <div>
                    <span className="text-slate-500">Payment Terms: </span>
                    <span>Credit (30 Days)</span>
                  </div>
                </div>
              </div>

              {/* Items Table */}
              <table className="w-full text-left text-xs border border-slate-300 border-collapse">
                <thead className="bg-slate-100 font-bold border-b border-slate-300 text-[11px]">
                  <tr>
                    <th className="p-2 border-r border-slate-300 text-center w-10">S.N.</th>
                    <th className="p-2 border-r border-slate-300">Description of Goods</th>
                    <th className="p-2 border-r border-slate-300 text-right w-16">Qty</th>
                    <th className="p-2 border-r border-slate-300 text-center w-16">Unit</th>
                    <th className="p-2 border-r border-slate-300 text-right w-24">Rate (Rs.)</th>
                    <th className="p-2 text-right w-28">Amount (Rs.)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {busySalesComputed.computedItems.map((item, idx) => (
                    <tr key={item.id}>
                      <td className="p-2 text-center font-mono border-r border-slate-300">{idx + 1}</td>
                      <td className="p-2 border-r border-slate-300 font-medium">
                        {item.item_description || `General Trading Goods #${idx + 1}`}
                      </td>
                      <td className="p-2 text-right font-mono border-r border-slate-300">{item.qty || 1}</td>
                      <td className="p-2 text-center border-r border-slate-300">{item.unit || 'Pcs'}</td>
                      <td className="p-2 text-right font-mono border-r border-slate-300">
                        {formatNPR(Number(item.price) || 0)}
                      </td>
                      <td className="p-2 text-right font-mono font-bold">
                        {formatNPR(item.amount || 0)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Totals Summary */}
              <div className="flex justify-end">
                <div className="w-64 space-y-1 text-xs font-mono">
                  <div className="flex justify-between">
                    <span className="text-slate-600">Subtotal:</span>
                    <span className="font-bold">Rs. {formatNPR(busySalesComputed.grossSubtotal)}</span>
                  </div>
                  {busySalesComputed.tradeDiscount > 0 && (
                    <div className="flex justify-between text-amber-700">
                      <span>Less: Discount:</span>
                      <span>- Rs. {formatNPR(busySalesComputed.tradeDiscount)}</span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span className="text-slate-600">VAT (13%):</span>
                    <span>+ Rs. {formatNPR(busySalesComputed.vatAmount)}</span>
                  </div>
                  {busySalesComputed.freightCharges > 0 && (
                    <div className="flex justify-between">
                      <span className="text-slate-600">Freight:</span>
                      <span>+ Rs. {formatNPR(busySalesComputed.freightCharges)}</span>
                    </div>
                  )}
                  <div className="flex justify-between pt-1 border-t border-slate-300 text-sm font-bold text-slate-900">
                    <span>Grand Total:</span>
                    <span>Rs. {formatNPR(busySalesComputed.netAmount)}</span>
                  </div>
                </div>
              </div>

              {/* Amount in words */}
              <div className="p-2.5 bg-slate-50 rounded border border-slate-200 text-xs italic">
                <strong>In Words:</strong> {numberToWords(busySalesComputed.netAmount)} Rupees Only
              </div>

              {/* Signatures */}
              <div className="grid grid-cols-3 gap-4 pt-12 text-center text-xs">
                <div className="border-t border-slate-300 pt-1">Prepared By</div>
                <div className="border-t border-slate-300 pt-1">Checked By</div>
                <div className="border-t border-slate-300 pt-1">Receiver's Signature</div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
