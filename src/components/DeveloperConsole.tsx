import React, { useState, useMemo, useEffect } from 'react';
import {
  Building2,
  Users,
  Sliders,
  CreditCard,
  Rocket,
  Headphones,
  Search,
  Plus,
  Eye,
  Edit,
  Trash2,
  CheckCircle2,
  XCircle,
  Clock,
  Calendar,
  Phone,
  Mail,
  ShieldCheck,
  ChevronRight,
  RefreshCw,
  ExternalLink,
  Layers,
  ArrowRight,
  TrendingUp,
  AlertTriangle,
  FileSpreadsheet,
  Printer,
  CalendarDays,
  Smartphone,
  Check,
  X,
  Sparkles,
  HardDrive,
} from 'lucide-react';
import { BackupSettingsView } from './BackupSettingsView';
import {
  Company,
  AppUser,
  AuditLog,
  SupportTicket,
  SystemRelease,
  SubscriptionPlan,
  CompanyFeatures,
  SystemFeature,
  FeatureCategory,
  DEFAULT_COMPANY_FEATURES,
} from '../types';
import { formatCurrency } from '../lib/dateUtils';
import { OnboardCompanyModal } from './admin/OnboardCompanyModal';
import { EditCompanyModal } from './admin/EditCompanyModal';
import { ExtendSubscriptionModal } from './admin/ExtendSubscriptionModal';
import { FeatureMatrixModal } from './admin/FeatureMatrixModal';
import { RegisterFeatureModal } from './admin/RegisterFeatureModal';
import {
  updateCompany,
  updateCompanyFeatures,
  deployRelease,
  publishRelease,
  updateSupportTicketStatus,
  subscribeToReleases,
} from '../lib/adminService';
import {
  subscribeToFeatureRegistry,
  updateSingleCompanyFeature,
  autoDiscoverModulesFromReleases,
  BUILTIN_SYSTEM_FEATURES,
} from '../lib/featureRegistry';
import { User } from 'firebase/auth';

export type DeveloperTab =
  | 'companies'
  | 'onboarding'
  | 'feature_matrix'
  | 'billing'
  | 'releases'
  | 'support'
  | 'backup_safety';

interface DeveloperConsoleProps {
  companies: Company[];
  users: AppUser[];
  auditLogs: AuditLog[];
  supportTickets: SupportTicket[];
  allChequesCount: number;
  allChequesVolume: number;
  currentUser: User | null;
  onImpersonateCompany: (company: Company) => void;
  onSwitchToTenantView: () => void;
  onToast: (text: string, type?: 'success' | 'info' | 'error') => void;
  onRefreshData?: () => void;
  onSignOut: () => void;
}

export const DeveloperConsole: React.FC<DeveloperConsoleProps> = ({
  companies,
  users,
  auditLogs,
  supportTickets,
  allChequesCount,
  allChequesVolume,
  currentUser,
  onImpersonateCompany,
  onSwitchToTenantView,
  onToast,
  onRefreshData,
  onSignOut,
}) => {
  const [currentTab, setCurrentTab] = useState<DeveloperTab>('companies');

  // Global Company Code Search Bar State
  const [globalCodeSearch, setGlobalCodeSearch] = useState('');
  const [selectedInspectCode, setSelectedInspectCode] = useState<string | null>(null);

  // Filters within company list
  const [tableSearch, setTableSearch] = useState('');
  const [planFilter, setPlanFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState('All');

  // Modals state
  const [isOnboardModalOpen, setIsOnboardModalOpen] = useState(false);
  const [editingCompany, setEditingCompany] = useState<Company | null>(null);
  const [extendingCompany, setExtendingCompany] = useState<Company | null>(null);
  const [matrixCompany, setMatrixCompany] = useState<Company | null>(null);
  const [selectedBackupCompanyId, setSelectedBackupCompanyId] = useState<string>(
    companies[0]?.id || 'company_rs_traders'
  );

  // System Features Registry & Dynamic Discovery
  const [systemFeatures, setSystemFeatures] = useState<SystemFeature[]>(BUILTIN_SYSTEM_FEATURES);
  const [isRegisterFeatureModalOpen, setIsRegisterFeatureModalOpen] = useState(false);
  const [matrixCategoryFilter, setMatrixCategoryFilter] = useState<'all' | FeatureCategory>('all');
  const [matrixFeatureSearch, setMatrixFeatureSearch] = useState('');
  const [isAutoDiscovering, setIsAutoDiscovering] = useState(false);

  // System Releases
  const [releases, setReleases] = useState<SystemRelease[]>([]);
  const [isPublishModalOpen, setIsPublishModalOpen] = useState(false);
  const [newVersion, setNewVersion] = useState('');
  const [newTitle, setNewTitle] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newType, setNewType] = useState<'feature' | 'patch' | 'major'>('feature');

  useEffect(() => {
    const unsubReleases = subscribeToReleases((rels) => setReleases(rels));
    const unsubFeatures = subscribeToFeatureRegistry((feats) => setSystemFeatures(feats));
    return () => {
      unsubReleases();
      unsubFeatures();
    };
  }, []);

  // 1. Metrics Analytics calculations
  const totalRegisteredCompanies = companies.length;
  const activeCompaniesCount = useMemo(
    () => companies.filter((c) => c.is_active && c.subscription_status === 'Active').length,
    [companies]
  );
  const totalActiveUsers = useMemo(
    () => users.filter((u) => u.status === 'Active').length,
    [users]
  );
  const totalMonthlyRevenue = useMemo(
    () =>
      companies
        .filter((c) => c.is_active && (c.subscription_status === 'Active' || c.subscription_status === 'Trial'))
        .reduce((sum, c) => sum + (c.monthly_fee || 0), 0),
    [companies]
  );

  // Global search quick result
  const searchedCompany = useMemo(() => {
    if (!globalCodeSearch.trim()) return null;
    const query = globalCodeSearch.trim().toLowerCase();
    return (
      companies.find(
        (c) =>
          c.company_code?.toLowerCase() === query ||
          `#${c.company_code?.toLowerCase()}` === query ||
          c.name.toLowerCase().includes(query)
      ) || null
    );
  }, [companies, globalCodeSearch]);

  // Filtered companies for table
  const filteredCompanies = useMemo(() => {
    return companies.filter((c) => {
      const matchSearch =
        c.name.toLowerCase().includes(tableSearch.toLowerCase()) ||
        (c.company_code && c.company_code.includes(tableSearch)) ||
        (c.owner_name && c.owner_name.toLowerCase().includes(tableSearch.toLowerCase())) ||
        (c.contact_phone && c.contact_phone.includes(tableSearch));

      const matchPlan = planFilter === 'All' || c.subscription_plan === planFilter;
      const matchStatus = statusFilter === 'All' || c.subscription_status === statusFilter;

      return matchSearch && matchPlan && matchStatus;
    });
  }, [companies, tableSearch, planFilter, statusFilter]);

  // Feature count helper
  const getFeatureCount = (features?: CompanyFeatures): { active: number; total: number } => {
    const feat = features || DEFAULT_COMPANY_FEATURES;
    const active = Object.values(feat).filter(Boolean).length;
    return { active, total: 8 };
  };

  // Toggle company active status
  const handleToggleCompanyStatus = async (comp: Company) => {
    try {
      const nextActive = !comp.is_active;
      const nextSubStatus = nextActive ? 'Active' : 'Suspended';
      await updateCompany(comp.id, {
        is_active: nextActive,
        subscription_status: nextSubStatus,
      });
      onToast(`Company "${comp.name}" is now ${nextActive ? 'Active' : 'Deactivated'}`, 'info');
    } catch (err: any) {
      onToast(err?.message || 'Failed to update status', 'error');
    }
  };

  // Inline feature toggle in Feature Matrix view - Real-Time Instant Activation
  const handleToggleMatrixFeature = async (company: Company, featureKey: string, currentEnabled: boolean) => {
    const nextEnabled = !currentEnabled;
    try {
      await updateSingleCompanyFeature(company.id, company.name, company.company_code, featureKey, nextEnabled);
      onToast(
        `Feature "${featureKey}" is now ${nextEnabled ? 'ACTIVATED [✓]' : 'DISABLED [✗]'} for ${company.name} (#${company.company_code || 'N/A'})`,
        nextEnabled ? 'success' : 'info'
      );
    } catch (err: any) {
      onToast(err?.message || 'Failed to update feature toggle', 'error');
    }
  };

  // Automated Feature Discovery: Scan releases and register missing modules
  const handleAutoDiscoverModules = async () => {
    try {
      setIsAutoDiscovering(true);
      const count = await autoDiscoverModulesFromReleases(releases, systemFeatures);
      if (count > 0) {
        onToast(`Automated Registry: Discovered & registered ${count} new feature module(s) from releases!`, 'success');
      } else {
        onToast('Feature Registry is up to date with all software releases.', 'info');
      }
    } catch (err: any) {
      onToast(err?.message || 'Failed to scan release modules', 'error');
    } finally {
      setIsAutoDiscovering(false);
    }
  };

  // Deploy system release
  const handleDeployRelease = async (rel: SystemRelease) => {
    try {
      await deployRelease(rel.id, rel.version);
      onToast(`System release ${rel.version} deployed globally!`, 'success');
    } catch (err: any) {
      onToast(err?.message || 'Failed to deploy update', 'error');
    }
  };

  // Publish new release
  const handlePublishReleaseSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newVersion.trim() || !newTitle.trim()) return;
    try {
      await publishRelease({
        version: newVersion.trim(),
        title: newTitle.trim(),
        description: newDesc.trim(),
        release_date: new Date().toISOString().slice(0, 10),
        type: newType,
        is_deployed: true,
      });
      onToast(`Published & deployed release ${newVersion}!`, 'success');
      setIsPublishModalOpen(false);
      setNewVersion('');
      setNewTitle('');
      setNewDesc('');
    } catch (err: any) {
      onToast(err?.message || 'Failed to publish release', 'error');
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans antialiased">
      {/* ========================================================================= */}
      {/* TOP GLOBAL BAR WITH SEARCH COMPANY CODE (Requirement 5) */}
      {/* ========================================================================= */}
      <header className="bg-slate-900 border-b border-slate-800 px-4 sm:px-6 py-2.5 sticky top-0 z-30 shadow-md">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-3">
          {/* Logo / Console Identity */}
          <div className="flex items-center gap-3 w-full md:w-auto justify-between md:justify-start">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center text-white font-bold shadow-xs">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="font-extrabold text-sm tracking-tight text-white">ChequeDesk</span>
                  <span className="px-1.5 py-0.2 text-[10px] font-mono font-bold bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 rounded-xs">
                    SUPER ADMIN CONSOLE
                  </span>
                </div>
                <div className="text-[10px] text-slate-400">Dedicated Platform Developer Control Center</div>
              </div>
            </div>

            {/* Quick tenant view link on mobile */}
            <button
              onClick={onSwitchToTenantView}
              className="md:hidden text-xs text-indigo-400 flex items-center gap-1 font-semibold"
            >
              <span>Tenant View</span>
              <ExternalLink className="w-3 h-3" />
            </button>
          </div>

          {/* Global Search Company Code Bar (Requirement 5) */}
          <div className="relative w-full md:w-96">
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                id="global-company-code-search"
                value={globalCodeSearch}
                onChange={(e) => setGlobalCodeSearch(e.target.value)}
                placeholder="Search Company Code (e.g. 1001, 1021)..."
                className="w-full pl-9 pr-8 py-1.5 bg-slate-800/90 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition font-mono"
              />
              {globalCodeSearch && (
                <button
                  onClick={() => setGlobalCodeSearch('')}
                  className="absolute right-2.5 top-2.5 text-slate-400 hover:text-white"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Instant Company Code Popup Card */}
            {searchedCompany && (
              <div className="absolute left-0 right-0 mt-1.5 bg-slate-900 border border-indigo-500/50 rounded-xl shadow-2xl p-3 z-50 animate-in fade-in zoom-in-95 duration-100">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-bold px-2 py-0.5 bg-indigo-500 text-white rounded-md">
                        #{searchedCompany.company_code || '1001'}
                      </span>
                      <h4 className="font-bold text-white text-xs sm:text-sm">{searchedCompany.name}</h4>
                    </div>
                    <div className="text-[11px] text-slate-400 mt-1 flex flex-wrap gap-2">
                      <span>Owner: {searchedCompany.owner_name || 'N/A'}</span>
                      <span>•</span>
                      <span>Plan: {searchedCompany.subscription_plan}</span>
                      <span>•</span>
                      <span className="text-emerald-400">{searchedCompany.subscription_status}</span>
                    </div>
                  </div>

                  <button
                    onClick={() => {
                      setGlobalCodeSearch('');
                      onImpersonateCompany(searchedCompany);
                    }}
                    id="btn-inspect-searched-company"
                    className="inline-flex items-center gap-1 px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold rounded-lg text-xs transition shadow-xs shrink-0"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <span>Inspect Account</span>
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* User Status & Tenant Switch */}
          <div className="hidden md:flex items-center gap-3">
            <button
              onClick={onSwitchToTenantView}
              title="Open RS Traders Client Workspace"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-lg text-xs font-semibold transition"
            >
              <ExternalLink className="w-3.5 h-3.5 text-indigo-400" />
              <span>Switch to Tenant View</span>
            </button>

            <div className="h-4 w-px bg-slate-800" />

            <div className="flex items-center gap-2 text-xs">
              <div className="w-7 h-7 rounded-full bg-indigo-900/60 border border-indigo-500/40 text-indigo-300 font-bold flex items-center justify-center text-xs">
                {currentUser?.email?.charAt(0).toUpperCase() || 'D'}
              </div>
              <div className="min-w-0 text-left">
                <div className="font-bold text-white text-[11px] truncate">Developer Admin</div>
                <div className="text-[10px] text-slate-400 truncate font-mono">
                  {currentUser?.email || 'rstraders398@gmail.com'}
                </div>
              </div>
            </div>

            <button
              onClick={onSignOut}
              className="px-2.5 py-1 text-slate-400 hover:text-rose-400 hover:bg-rose-950/30 rounded-md text-xs transition"
            >
              Sign Out
            </button>
          </div>
        </div>
      </header>

      {/* ========================================================================= */}
      {/* MAIN DEVELOPER LAYOUT: SIDEBAR + CONTENT (Requirement 2) */}
      {/* ========================================================================= */}
      <div className="flex-1 flex flex-col lg:flex-row min-w-0">
        {/* Developer Console Sidebar */}
        <aside className="w-full lg:w-64 bg-slate-900 border-r border-slate-800 p-3 sm:p-4 shrink-0 flex flex-col justify-between">
          <div className="space-y-1">
            <div className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-500">
              Developer Navigation
            </div>

            {/* Menu Item 1: Client Companies */}
            <button
              onClick={() => setCurrentTab('companies')}
              id="dev-nav-companies"
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-bold transition ${
                currentTab === 'companies'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'text-slate-300 hover:bg-slate-800/80 hover:text-white'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Building2 className="w-4 h-4" />
                <span>Client Companies</span>
              </div>
              <span className="font-mono text-[10px] px-1.5 py-0.5 bg-black/30 rounded-md">
                {companies.length}
              </span>
            </button>

            {/* Menu Item 2: Sales & Onboarding */}
            <button
              onClick={() => setCurrentTab('onboarding')}
              id="dev-nav-onboarding"
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-bold transition ${
                currentTab === 'onboarding'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'text-slate-300 hover:bg-slate-800/80 hover:text-white'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Plus className="w-4 h-4" />
                <span>Sales & Onboarding</span>
              </div>
              <span className="text-[10px] text-emerald-400 font-semibold">+ Add</span>
            </button>

            {/* Menu Item 3: Feature Matrix Control */}
            <button
              onClick={() => setCurrentTab('feature_matrix')}
              id="dev-nav-feature-matrix"
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-bold transition ${
                currentTab === 'feature_matrix'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'text-slate-300 hover:bg-slate-800/80 hover:text-white'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Sliders className="w-4 h-4" />
                <span>Feature Matrix Control</span>
              </div>
              <span className="text-[10px] font-mono text-indigo-300 bg-indigo-950/80 px-1.5 py-0.5 rounded-sm">
                8 Feats
              </span>
            </button>

            {/* Menu Item 4: Subscriptions & Billing */}
            <button
              onClick={() => setCurrentTab('billing')}
              id="dev-nav-billing"
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-bold transition ${
                currentTab === 'billing'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'text-slate-300 hover:bg-slate-800/80 hover:text-white'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <CreditCard className="w-4 h-4" />
                <span>Subscriptions & Billing</span>
              </div>
              <span className="text-[10px] text-emerald-400 font-mono">
                {activeCompaniesCount} Active
              </span>
            </button>

            {/* Menu Item 5: System Updates & Release Management */}
            <button
              onClick={() => setCurrentTab('releases')}
              id="dev-nav-releases"
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-bold transition ${
                currentTab === 'releases'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'text-slate-300 hover:bg-slate-800/80 hover:text-white'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Rocket className="w-4 h-4" />
                <span>System Updates & Releases</span>
              </div>
              <span className="text-[10px] font-mono text-amber-300 bg-amber-950/60 px-1.5 py-0.5 rounded-sm">
                v2.4
              </span>
            </button>

            {/* Menu Item 6: Impersonation & Support */}
            <button
              onClick={() => setCurrentTab('support')}
              id="dev-nav-support"
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-bold transition ${
                currentTab === 'support'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'text-slate-300 hover:bg-slate-800/80 hover:text-white'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Headphones className="w-4 h-4" />
                <span>Impersonation & Support</span>
              </div>
              {supportTickets.filter((t) => t.status === 'Open').length > 0 && (
                <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-rose-500 text-white font-bold">
                  {supportTickets.filter((t) => t.status === 'Open').length}
                </span>
              )}
            </button>

            {/* Menu Item 7: Backup & Data Safety Controls (Requirement 3) */}
            <button
              onClick={() => setCurrentTab('backup_safety')}
              id="dev-nav-backup-safety"
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-bold transition ${
                currentTab === 'backup_safety'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'text-slate-300 hover:bg-slate-800/80 hover:text-white'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <HardDrive className="w-4 h-4" />
                <span>Backup & Data Safety</span>
              </div>
              <span className="text-[10px] font-mono text-emerald-300 bg-emerald-950/60 px-1.5 py-0.5 rounded-sm">
                Offline
              </span>
            </button>
          </div>

          {/* Quick System Health Pill */}
          <div className="mt-6 p-3 bg-slate-800/60 border border-slate-700/60 rounded-xl space-y-2 text-[11px]">
            <div className="flex items-center justify-between text-slate-400">
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span>Core Engine</span>
              </span>
              <span className="text-emerald-400 font-bold">Online</span>
            </div>
            <div className="text-[10px] text-slate-400 leading-tight">
              Isolated tenant multi-database binding active with BS calendar sync.
            </div>
          </div>
        </aside>

        {/* Content Body */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto w-full">
          {/* ========================================================================= */}
          {/* SECTION 1: Client Companies & Main Dashboard Analytics (Requirement 3) */}
          {/* ========================================================================= */}
          {currentTab === 'companies' && (
            <div className="space-y-6 animate-in fade-in duration-150">
              {/* Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h2 className="text-xl font-bold text-white tracking-tight">Client Companies Overview</h2>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Manage tenant companies, dynamic Company Codes, and live inspection.
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setIsOnboardModalOpen(true)}
                    id="btn-add-company-top"
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-xs transition shadow-xs"
                  >
                    <Plus className="w-4 h-4" />
                    <span>+ Add New Client Company</span>
                  </button>
                </div>
              </div>

              {/* 4 Analytics Metric Cards (Requirement 3) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* 1. Total Registered Companies */}
                <div className="bg-slate-900 p-4 sm:p-5 rounded-2xl border border-slate-800 shadow-2xs space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-slate-400">Total Registered Companies</span>
                    <div className="w-8 h-8 rounded-xl bg-blue-500/10 text-blue-400 flex items-center justify-center">
                      <Building2 className="w-4 h-4" />
                    </div>
                  </div>
                  <div className="text-2xl font-black text-white">{totalRegisteredCompanies}</div>
                  <div className="text-[11px] text-slate-400 flex items-center gap-1.5">
                    <span className="text-emerald-400 font-bold">{activeCompaniesCount} Active</span>
                    <span>•</span>
                    <span>{totalRegisteredCompanies - activeCompaniesCount} Expired/Trial</span>
                  </div>
                </div>

                {/* 2. Total Active Users */}
                <div className="bg-slate-900 p-4 sm:p-5 rounded-2xl border border-slate-800 shadow-2xs space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-slate-400">Total Active Users</span>
                    <div className="w-8 h-8 rounded-xl bg-purple-500/10 text-purple-400 flex items-center justify-center">
                      <Users className="w-4 h-4" />
                    </div>
                  </div>
                  <div className="text-2xl font-black text-white">{totalActiveUsers}</div>
                  <div className="text-[11px] text-slate-400">Across {companies.length} tenant accounts</div>
                </div>

                {/* 3. Monthly Subscription Revenue */}
                <div className="bg-slate-900 p-4 sm:p-5 rounded-2xl border border-slate-800 shadow-2xs space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-slate-400">Monthly SaaS Revenue (MRR)</span>
                    <div className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
                      <CreditCard className="w-4 h-4" />
                    </div>
                  </div>
                  <div className="text-2xl font-black text-emerald-400">
                    {formatCurrency(totalMonthlyRevenue)}
                  </div>
                  <div className="text-[11px] text-slate-400">Active monthly subscriptions</div>
                </div>

                {/* 4. Platform Cheque Volume */}
                <div className="bg-slate-900 p-4 sm:p-5 rounded-2xl border border-slate-800 shadow-2xs space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-slate-400">Platform Cheque Volume</span>
                    <div className="w-8 h-8 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center">
                      <TrendingUp className="w-4 h-4" />
                    </div>
                  </div>
                  <div className="text-2xl font-black text-white">
                    {formatCurrency(allChequesVolume || 2850000)}
                  </div>
                  <div className="text-[11px] text-slate-400">
                    {allChequesCount || 24} Cheques processed across tenants
                  </div>
                </div>
              </div>

              {/* Company List Table (Requirement 3) */}
              <div className="bg-slate-900 rounded-2xl border border-slate-800 shadow-2xs overflow-hidden space-y-3 p-4">
                {/* Search & Filter Bar */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                  <div className="flex items-center gap-2 flex-1 max-w-sm">
                    <div className="relative w-full">
                      <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                      <input
                        type="text"
                        value={tableSearch}
                        onChange={(e) => setTableSearch(e.target.value)}
                        placeholder="Filter by name, phone, or code..."
                        className="w-full pl-8 pr-3 py-1.5 bg-slate-800 border border-slate-700 rounded-lg text-xs text-white placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                      />
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <select
                      value={planFilter}
                      onChange={(e) => setPlanFilter(e.target.value)}
                      className="px-2.5 py-1.5 bg-slate-800 border border-slate-700 rounded-lg text-xs text-slate-200 focus:outline-none"
                    >
                      <option value="All">All Plans</option>
                      <option value="Starter">Starter</option>
                      <option value="Professional">Professional</option>
                      <option value="Enterprise">Enterprise</option>
                    </select>

                    <select
                      value={statusFilter}
                      onChange={(e) => setStatusFilter(e.target.value)}
                      className="px-2.5 py-1.5 bg-slate-800 border border-slate-700 rounded-lg text-xs text-slate-200 focus:outline-none"
                    >
                      <option value="All">All Statuses</option>
                      <option value="Active">Active</option>
                      <option value="Trial">Trial</option>
                      <option value="Expired">Expired</option>
                      <option value="Suspended">Suspended</option>
                    </select>
                  </div>
                </div>

                {/* Table */}
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs divide-y divide-slate-800">
                    <thead className="bg-slate-950/60 text-slate-400 font-bold uppercase tracking-wider text-[10px]">
                      <tr>
                        <th className="px-4 py-3">Company Code</th>
                        <th className="px-4 py-3">Company Name</th>
                        <th className="px-4 py-3">Owner & Contact</th>
                        <th className="px-3 py-3">Sales Date</th>
                        <th className="px-3 py-3">Subscription Plan</th>
                        <th className="px-3 py-3">Feature Count</th>
                        <th className="px-3 py-3">Status</th>
                        <th className="px-4 py-3 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/80 font-normal">
                      {filteredCompanies.length === 0 ? (
                        <tr>
                          <td colSpan={8} className="px-4 py-12 text-center text-slate-500">
                            No companies found matching search criteria.
                          </td>
                        </tr>
                      ) : (
                        filteredCompanies.map((comp) => {
                          const { active, total } = getFeatureCount(comp.features);

                          return (
                            <tr key={comp.id} className="hover:bg-slate-800/40 transition-colors">
                              {/* Company Code */}
                              <td className="px-4 py-3 font-mono">
                                <span className="px-2 py-0.5 rounded-md bg-indigo-950 text-indigo-300 font-bold border border-indigo-500/40 text-xs">
                                  #{comp.company_code || '1001'}
                                </span>
                              </td>

                              {/* Company Name */}
                              <td className="px-4 py-3">
                                <div className="font-bold text-white text-xs">{comp.name}</div>
                                <div className="text-[10px] text-slate-400 font-mono">{comp.id}</div>
                              </td>

                              {/* Owner & Phone */}
                              <td className="px-4 py-3">
                                <div className="text-slate-200 font-medium">{comp.owner_name || 'N/A'}</div>
                                <div className="text-[11px] text-slate-400 font-mono flex items-center gap-1">
                                  <Phone className="w-3 h-3 text-slate-500 inline" />
                                  <span>{comp.contact_phone || 'No Phone'}</span>
                                </div>
                              </td>

                              {/* Sales Date */}
                              <td className="px-3 py-3 text-slate-400 font-mono text-[11px]">
                                {comp.sales_date || (comp.created_at ? comp.created_at.slice(0, 10) : '2024-01-10')}
                              </td>

                              {/* Subscription Plan */}
                              <td className="px-3 py-3">
                                <span
                                  className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                    comp.subscription_plan === 'Enterprise'
                                      ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                                      : comp.subscription_plan === 'Professional'
                                      ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                                      : 'bg-slate-800 text-slate-300'
                                  }`}
                                >
                                  {comp.subscription_plan || 'Professional'}
                                </span>
                              </td>

                              {/* Feature Count */}
                              <td className="px-3 py-3">
                                <button
                                  onClick={() => setMatrixCompany(comp)}
                                  className="inline-flex items-center gap-1 px-2 py-0.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-md font-mono text-[10px] font-bold transition"
                                  title="Click to manage features"
                                >
                                  <span>
                                    {active}/{total} Active
                                  </span>
                                  <Sliders className="w-3 h-3 text-indigo-400" />
                                </button>
                              </td>

                              {/* Status */}
                              <td className="px-3 py-3">
                                <span
                                  className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                    comp.subscription_status === 'Active'
                                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                                      : comp.subscription_status === 'Trial'
                                      ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                                      : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                                  }`}
                                >
                                  <span
                                    className={`w-1.5 h-1.5 rounded-full ${
                                      comp.subscription_status === 'Active'
                                        ? 'bg-emerald-400'
                                        : comp.subscription_status === 'Trial'
                                        ? 'bg-amber-400'
                                        : 'bg-rose-400'
                                    }`}
                                  />
                                  <span>{comp.subscription_status || 'Active'}</span>
                                </span>
                              </td>

                              {/* Actions: [Manage Features], [Inspect Account], [Edit], [Deactivate] */}
                              <td className="px-4 py-3 text-right">
                                <div className="inline-flex items-center gap-1.5">
                                  {/* [Inspect Account] */}
                                  <button
                                    onClick={() => onImpersonateCompany(comp)}
                                    id={`btn-inspect-${comp.id}`}
                                    title="Open Read-Only Support Inspection Mode"
                                    className="inline-flex items-center gap-1 px-2.5 py-1 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-lg text-xs transition shadow-2xs"
                                  >
                                    <Eye className="w-3.5 h-3.5" />
                                    <span>[Inspect Account]</span>
                                  </button>

                                  {/* [Manage Features] */}
                                  <button
                                    onClick={() => setMatrixCompany(comp)}
                                    title="Configure Feature Matrix"
                                    className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-indigo-300 rounded-lg text-xs font-semibold transition"
                                  >
                                    [Features]
                                  </button>

                                  {/* [Edit] */}
                                  <button
                                    onClick={() => setEditingCompany(comp)}
                                    title="Edit Company Details"
                                    className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition"
                                  >
                                    <Edit className="w-3.5 h-3.5" />
                                  </button>

                                  {/* [Deactivate / Activate] */}
                                  <button
                                    onClick={() => handleToggleCompanyStatus(comp)}
                                    title={comp.is_active ? 'Deactivate Company' : 'Activate Company'}
                                    className={`px-2 py-1 text-[10px] font-bold rounded-lg transition ${
                                      comp.is_active
                                        ? 'text-rose-400 hover:bg-rose-950/40'
                                        : 'text-emerald-400 hover:bg-emerald-950/40'
                                    }`}
                                  >
                                    {comp.is_active ? '[Deactivate]' : '[Activate]'}
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
          )}

          {/* ========================================================================= */}
          {/* SECTION 2: Sales & Onboarding (+ Add New Client Company) (Requirement 2) */}
          {/* ========================================================================= */}
          {currentTab === 'onboarding' && (
            <div className="space-y-6 animate-in fade-in duration-150">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-bold text-white tracking-tight">Sales & Tenant Onboarding</h2>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Assign Company Codes, create admin credentials, and provision tenant spaces.
                  </p>
                </div>
                <button
                  onClick={() => setIsOnboardModalOpen(true)}
                  id="btn-open-onboard-screen"
                  className="inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-xs transition shadow-xs"
                >
                  <Plus className="w-4 h-4" />
                  <span>+ Open Onboarding Wizard</span>
                </button>
              </div>

              {/* Onboarding Highlights Banner */}
              <div className="bg-gradient-to-r from-emerald-950/50 via-slate-900 to-indigo-950/50 p-6 rounded-2xl border border-emerald-500/30 space-y-4">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0 border border-emerald-500/30">
                    <Sparkles className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-white text-sm">
                      Automated 3-Step Client Provisioning Pipeline
                    </h3>
                    <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                      When a new client is signed, the Developer Console automatically assigns the next available
                      Company Code (e.g., 1001, 1021, 1050), binds an isolated Firestore tenant boundary, sets up initial
                      admin credentials, and activates selected Feature Matrix modules.
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
                  <div className="bg-slate-900/80 p-3.5 rounded-xl border border-slate-800 space-y-1">
                    <div className="text-emerald-400 font-bold text-xs">1. Dynamic Company Code</div>
                    <div className="text-[11px] text-slate-400">
                      Sequential 4-digit code generated for clean support dispatch and data separation.
                    </div>
                  </div>

                  <div className="bg-slate-900/80 p-3.5 rounded-xl border border-slate-800 space-y-1">
                    <div className="text-indigo-400 font-bold text-xs">2. Admin User Credentials</div>
                    <div className="text-[11px] text-slate-400">
                      Login accounts created with automatic company admin role permissions.
                    </div>
                  </div>

                  <div className="bg-slate-900/80 p-3.5 rounded-xl border border-slate-800 space-y-1">
                    <div className="text-amber-400 font-bold text-xs">3. Feature Matrix Profile</div>
                    <div className="text-[11px] text-slate-400">
                      Turn on cheque printing, BS dual calendar, and bank reconciliation by tier.
                    </div>
                  </div>
                </div>
              </div>

              {/* Recently Onboarded Companies List */}
              <div className="bg-slate-900 rounded-2xl border border-slate-800 p-5 space-y-4">
                <h3 className="font-bold text-white text-xs uppercase tracking-wider text-slate-400">
                  Recently Onboarded Accounts
                </h3>
                <div className="divide-y divide-slate-800">
                  {companies.slice(0, 5).map((comp) => (
                    <div key={comp.id} className="py-3 flex items-center justify-between gap-3 text-xs">
                      <div className="flex items-center gap-3">
                        <span className="font-mono font-bold px-2 py-1 bg-slate-800 text-indigo-300 rounded-md border border-slate-700">
                          #{comp.company_code || '1001'}
                        </span>
                        <div>
                          <div className="font-bold text-white">{comp.name}</div>
                          <div className="text-[11px] text-slate-400">
                            Sales Date: {comp.sales_date || '2024-01-15'} • Owner: {comp.owner_name || 'N/A'}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setMatrixCompany(comp)}
                          className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs transition"
                        >
                          Feature Matrix
                        </button>
                        <button
                          onClick={() => onImpersonateCompany(comp)}
                          className="px-2.5 py-1 bg-amber-500/20 text-amber-300 hover:bg-amber-500/30 border border-amber-500/30 rounded-lg text-xs font-bold transition"
                        >
                          Inspect
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* SECTION 3: Feature Matrix Control & Dynamic Registry */}
          {/* ========================================================================= */}
          {currentTab === 'feature_matrix' && (
            <div className="space-y-6 animate-in fade-in duration-150">
              {/* Header & Automated Discovery Controls */}
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-slate-900/80 p-5 rounded-2xl border border-slate-800">
                <div>
                  <div className="flex items-center gap-2.5">
                    <h2 className="text-xl font-bold text-white tracking-tight">Automated Feature Registry & Matrix</h2>
                    <span className="px-2 py-0.5 text-[10px] font-bold bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 rounded-full">
                      {systemFeatures.length} Modules Registered
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 mt-1">
                    Toggle checkboxes per client company. As soon as a feature is checked ON/OFF, it instantly activates or restricts in the client dashboard in real-time.
                  </p>
                </div>

                <div className="flex items-center gap-2.5 flex-wrap">
                  <button
                    onClick={handleAutoDiscoverModules}
                    disabled={isAutoDiscovering}
                    className="px-3 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-indigo-300 rounded-xl text-xs font-semibold transition flex items-center gap-2 shadow-xs"
                    title="Automatically scan system releases for new modules (e.g. SMS_NOTIFICATIONS, ADVANCED_REPORTS)"
                  >
                    <Sparkles className={`w-4 h-4 ${isAutoDiscovering ? 'animate-spin text-amber-400' : 'text-indigo-400'}`} />
                    <span>{isAutoDiscovering ? 'Auto-Scanning Releases...' : 'Auto-Discover from Releases'}</span>
                  </button>

                  <button
                    onClick={() => setIsRegisterFeatureModalOpen(true)}
                    className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-xs"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Register New Feature / Module</span>
                  </button>
                </div>
              </div>

              {/* Filter & Category Pills Toolbar */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-slate-900/50 p-3 rounded-xl border border-slate-800 text-xs">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-slate-400 font-semibold mr-1">Filter Category:</span>
                  {(['all', 'core', 'communication', 'finance', 'analytics', 'security', 'integration'] as const).map(
                    (cat) => (
                      <button
                        key={cat}
                        onClick={() => setMatrixCategoryFilter(cat)}
                        className={`px-2.5 py-1 rounded-lg font-bold transition capitalize text-[11px] ${
                          matrixCategoryFilter === cat
                            ? 'bg-indigo-600 text-white shadow-2xs'
                            : 'bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700'
                        }`}
                      >
                        {cat}
                      </button>
                    )
                  )}
                </div>

                <div className="relative w-full sm:w-64">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2" />
                  <input
                    type="text"
                    value={matrixFeatureSearch}
                    onChange={(e) => setMatrixFeatureSearch(e.target.value)}
                    placeholder="Search feature name or key..."
                    className="w-full pl-8 pr-3 py-1.5 bg-slate-800 border border-slate-700 rounded-lg text-xs text-white placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                </div>
              </div>

              {/* Interactive Matrix Grid */}
              <div className="bg-slate-900 rounded-2xl border border-slate-800 shadow-2xs overflow-hidden">
                <div className="p-4 border-b border-slate-800 bg-slate-950/40 flex items-center justify-between text-xs">
                  <div className="text-slate-400 flex items-center gap-2">
                    <span>
                      Check <span className="text-emerald-400 font-bold">[✓] ON</span> to grant instant dashboard activation, or uncheck <span className="text-slate-400 font-bold">[ ] OFF</span> to restrict access.
                    </span>
                  </div>
                  <div className="text-slate-400 font-mono text-[11px]">
                    {companies.length} Companies • {systemFeatures.length} Dynamic Features
                  </div>
                </div>

                <div className="overflow-x-auto max-h-[65vh]">
                  <table className="w-full text-left text-xs divide-y divide-slate-800">
                    <thead className="bg-slate-950 text-slate-400 font-bold uppercase tracking-wider text-[10px] sticky top-0 z-20 shadow-xs">
                      <tr>
                        <th className="px-4 py-3 sticky left-0 bg-slate-950 z-30 min-w-[200px]">Company Profile</th>
                        {systemFeatures
                          .filter((feat) => {
                            if (matrixCategoryFilter !== 'all' && feat.category !== matrixCategoryFilter) return false;
                            if (matrixFeatureSearch.trim()) {
                              const q = matrixFeatureSearch.toLowerCase();
                              return feat.name.toLowerCase().includes(q) || feat.key.toLowerCase().includes(q);
                            }
                            return true;
                          })
                          .map((feat) => (
                            <th key={feat.key} className="px-3 py-3 text-center min-w-[130px]">
                              <div className="flex flex-col items-center gap-1">
                                <span className="font-bold text-slate-200 capitalize truncate max-w-[120px]" title={feat.description}>
                                  {feat.name}
                                </span>
                                <div className="flex items-center gap-1">
                                  <span className="font-mono text-[9px] text-slate-400 lowercase">{feat.key}</span>
                                  {feat.badge && (
                                    <span className="text-[8px] font-bold px-1 py-0.2 bg-indigo-500/20 text-indigo-300 rounded-xs">
                                      {feat.badge}
                                    </span>
                                  )}
                                </div>
                              </div>
                            </th>
                          ))}
                        <th className="px-4 py-3 text-right sticky right-0 bg-slate-950 z-30 min-w-[100px]">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/80 font-normal">
                      {companies.map((comp) => {
                        const feats = comp.features || { ...DEFAULT_COMPANY_FEATURES };

                        const filtered = systemFeatures.filter((feat) => {
                          if (matrixCategoryFilter !== 'all' && feat.category !== matrixCategoryFilter) return false;
                          if (matrixFeatureSearch.trim()) {
                            const q = matrixFeatureSearch.toLowerCase();
                            return feat.name.toLowerCase().includes(q) || feat.key.toLowerCase().includes(q);
                          }
                          return true;
                        });

                        return (
                          <tr key={comp.id} className="hover:bg-slate-800/30 transition">
                            {/* Sticky Company Name & Code */}
                            <td className="px-4 py-3 sticky left-0 bg-slate-900/95 z-10 border-r border-slate-800/80">
                              <div className="flex items-center gap-2">
                                <span className="font-mono text-xs font-bold text-indigo-400">
                                  #{comp.company_code || '1001'}
                                </span>
                                <span className="font-bold text-white truncate max-w-[150px]">{comp.name}</span>
                              </div>
                              <div className="text-[10px] text-slate-400 flex items-center gap-1.5 mt-0.5">
                                <span className="font-medium text-slate-300">{comp.subscription_plan}</span>
                                <span>•</span>
                                <span className={comp.is_active ? 'text-emerald-400' : 'text-rose-400'}>
                                  {comp.is_active ? 'Active' : 'Inactive'}
                                </span>
                              </div>
                            </td>

                            {/* Dynamic Checkbox / Toggle cells for each system feature */}
                            {filtered.map((feat) => {
                              // Cross-check for sms alias
                              const isEnabled =
                                feat.key === 'sms_notifications'
                                  ? Boolean(feats.sms_notifications || feats.sms_whatsapp_alerts)
                                  : Boolean(feats[feat.key]);

                              return (
                                <td key={feat.key} className="px-3 py-3 text-center">
                                  <button
                                    onClick={() => handleToggleMatrixFeature(comp, feat.key, isEnabled)}
                                    title={`Click to turn ${isEnabled ? 'OFF' : 'ON'} ${feat.name} for ${comp.name} (#${comp.company_code || 'N/A'})`}
                                    className={`w-8 h-8 rounded-lg inline-flex items-center justify-center transition shadow-2xs ${
                                      isEnabled
                                        ? 'bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 border border-emerald-500/40 ring-1 ring-emerald-500/20'
                                        : 'bg-slate-800 text-slate-500 hover:bg-slate-700/60 border border-slate-700'
                                    }`}
                                  >
                                    {isEnabled ? (
                                      <Check className="w-4 h-4 stroke-[3]" />
                                    ) : (
                                      <span className="w-2.5 h-2.5 rounded-xs border border-slate-600 block"></span>
                                    )}
                                  </button>
                                </td>
                              );
                            })}

                            {/* Actions */}
                            <td className="px-4 py-3 text-right sticky right-0 bg-slate-900/95 z-10 border-l border-slate-800/80">
                              <button
                                onClick={() => setMatrixCompany(comp)}
                                className="px-2.5 py-1 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-bold transition shadow-2xs"
                              >
                                Matrix
                              </button>
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

          {/* ========================================================================= */}
          {/* SECTION 4: Subscriptions & Billing (Requirement 2) */}
          {/* ========================================================================= */}
          {currentTab === 'billing' && (
            <div className="space-y-6 animate-in fade-in duration-150">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-bold text-white tracking-tight">Subscriptions & Billing</h2>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Plan validity extensions, monthly license fees, and revenue reports.
                  </p>
                </div>
              </div>

              {/* Billing Summary Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="bg-slate-900 p-5 rounded-2xl border border-slate-800 space-y-1">
                  <div className="text-xs text-slate-400 font-semibold">Monthly Recurring Revenue</div>
                  <div className="text-2xl font-black text-emerald-400">
                    {formatCurrency(totalMonthlyRevenue)}
                  </div>
                  <div className="text-[11px] text-slate-400">Projected annual: {formatCurrency(totalMonthlyRevenue * 12)}</div>
                </div>

                <div className="bg-slate-900 p-5 rounded-2xl border border-slate-800 space-y-1">
                  <div className="text-xs text-slate-400 font-semibold">Active Paid Subscriptions</div>
                  <div className="text-2xl font-black text-white">{activeCompaniesCount} Accounts</div>
                  <div className="text-[11px] text-slate-400">
                    Starter: {companies.filter((c) => c.subscription_plan === 'Starter').length} • Pro:{' '}
                    {companies.filter((c) => c.subscription_plan === 'Professional').length} • Ent:{' '}
                    {companies.filter((c) => c.subscription_plan === 'Enterprise').length}
                  </div>
                </div>

                <div className="bg-slate-900 p-5 rounded-2xl border border-slate-800 space-y-1">
                  <div className="text-xs text-slate-400 font-semibold">Expirations Requiring Renewal</div>
                  <div className="text-2xl font-black text-amber-400">
                    {companies.filter((c) => c.subscription_status === 'Expired' || c.subscription_status === 'Trial').length}
                  </div>
                  <div className="text-[11px] text-slate-400">Accounts pending invoice or extension</div>
                </div>
              </div>

              {/* Subscriptions Table */}
              <div className="bg-slate-900 rounded-2xl border border-slate-800 shadow-2xs overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs divide-y divide-slate-800">
                    <thead className="bg-slate-950 text-slate-400 font-bold uppercase tracking-wider text-[10px]">
                      <tr>
                        <th className="px-4 py-3">Code & Company</th>
                        <th className="px-3 py-3">Plan</th>
                        <th className="px-3 py-3">Monthly Fee</th>
                        <th className="px-3 py-3">Expiry Date (BS)</th>
                        <th className="px-3 py-3">Expiry Date (AD)</th>
                        <th className="px-3 py-3">Status</th>
                        <th className="px-4 py-3 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/80 font-normal">
                      {companies.map((comp) => (
                        <tr key={comp.id} className="hover:bg-slate-800/30 transition">
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              <span className="font-mono text-xs font-bold text-indigo-400">
                                #{comp.company_code || '1001'}
                              </span>
                              <span className="font-bold text-white">{comp.name}</span>
                            </div>
                          </td>

                          <td className="px-3 py-3 text-slate-300 font-medium">
                            {comp.subscription_plan}
                          </td>

                          <td className="px-3 py-3 text-emerald-400 font-mono font-bold">
                            {formatCurrency(comp.monthly_fee || 0)}/mo
                          </td>

                          <td className="px-3 py-3 text-slate-300 font-mono">
                            {comp.expiry_date_bs || '2082-01-01'} BS
                          </td>

                          <td className="px-3 py-3 text-slate-400 font-mono">
                            {comp.expiry_date_ad || '2025-04-14'}
                          </td>

                          <td className="px-3 py-3">
                            <span
                              className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                comp.subscription_status === 'Active'
                                  ? 'bg-emerald-500/20 text-emerald-300'
                                  : 'bg-rose-500/20 text-rose-300'
                              }`}
                            >
                              {comp.subscription_status}
                            </span>
                          </td>

                          <td className="px-4 py-3 text-right">
                            <button
                              onClick={() => setExtendingCompany(comp)}
                              className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold transition shadow-2xs"
                            >
                              + Extend Plan
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* SECTION 5: System Updates & Release Management (Requirement 2) */}
          {/* ========================================================================= */}
          {currentTab === 'releases' && (
            <div className="space-y-6 animate-in fade-in duration-150">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h2 className="text-xl font-bold text-white tracking-tight">System Updates & Releases</h2>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Deploy software updates, push new features globally, and track version changelogs.
                  </p>
                </div>

                <button
                  onClick={() => setIsPublishModalOpen(true)}
                  id="btn-publish-release"
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl text-xs transition shadow-xs"
                >
                  <Rocket className="w-4 h-4" />
                  <span>+ Publish Global Release</span>
                </button>
              </div>

              {/* Active Version Callout */}
              <div className="bg-slate-900 p-5 rounded-2xl border border-indigo-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-indigo-500/20 text-indigo-400 flex items-center justify-center font-bold font-mono">
                    v2.4
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="font-bold text-white text-sm">Active Platform Version: v2.4.0-production</h4>
                      <span className="px-2 py-0.5 bg-emerald-500/20 text-emerald-300 text-[10px] font-bold rounded-full">
                        Deployed Globally
                      </span>
                    </div>
                    <p className="text-xs text-slate-400 mt-0.5">
                      All {companies.length} tenant workspaces are receiving automatic BS calendar updates and ConnectIPS syncing.
                    </p>
                  </div>
                </div>

                <div className="text-slate-400 text-xs font-mono">Channel: Production (Cloud Run)</div>
              </div>

              {/* Releases Timeline */}
              <div className="space-y-4">
                {releases.map((rel) => (
                  <div
                    key={rel.id}
                    className="bg-slate-900 p-5 rounded-2xl border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                  >
                    <div className="space-y-1.5">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-extrabold px-2.5 py-0.5 bg-indigo-950 text-indigo-300 border border-indigo-500/40 rounded-md">
                          {rel.version}
                        </span>
                        <span
                          className={`px-2 py-0.5 text-[10px] font-bold rounded-full ${
                            rel.type === 'major'
                              ? 'bg-purple-500/20 text-purple-300'
                              : rel.type === 'feature'
                              ? 'bg-blue-500/20 text-blue-300'
                              : 'bg-slate-800 text-slate-400'
                          }`}
                        >
                          {rel.type.toUpperCase()}
                        </span>
                        <h4 className="font-bold text-white text-sm">{rel.title}</h4>
                      </div>
                      <p className="text-xs text-slate-300 max-w-3xl">{rel.description}</p>
                      <div className="text-[11px] text-slate-500 font-mono">
                        Released: {rel.release_date} •{' '}
                        {rel.deployed_at ? `Deployed ${new Date(rel.deployed_at).toLocaleDateString()}` : 'Staged'}
                      </div>
                    </div>

                    <div className="shrink-0">
                      {rel.is_deployed ? (
                        <span className="inline-flex items-center gap-1 text-emerald-400 text-xs font-bold px-3 py-1.5 bg-emerald-500/10 border border-emerald-500/20 rounded-xl">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Deployed [✓]</span>
                        </span>
                      ) : (
                        <button
                          onClick={() => handleDeployRelease(rel)}
                          className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl text-xs transition shadow-xs"
                        >
                          Deploy Globally
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* SECTION 6: Impersonation & Support (Requirement 2 & 5) */}
          {/* ========================================================================= */}
          {currentTab === 'support' && (
            <div className="space-y-6 animate-in fade-in duration-150">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h2 className="text-xl font-bold text-white tracking-tight">Impersonation & Support Desk</h2>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Quick-access Company Code lookup to inspect client issues in real-time.
                  </p>
                </div>
              </div>

              {/* Quick Company Code Lookup Dispatch */}
              <div className="bg-gradient-to-r from-slate-900 to-indigo-950 p-6 rounded-2xl border border-slate-800 space-y-4">
                <div className="max-w-xl">
                  <label className="font-bold text-white text-xs block mb-1.5">
                    Enter Client Company Code (Direct Call Support)
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={selectedInspectCode || ''}
                      onChange={(e) => setSelectedInspectCode(e.target.value)}
                      placeholder="e.g. 1001, 1021, 1035..."
                      className="flex-1 px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl font-mono text-sm text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                    />
                    <button
                      onClick={() => {
                        const target = companies.find(
                          (c) =>
                            c.company_code === selectedInspectCode ||
                            c.id === selectedInspectCode
                        );
                        if (target) {
                          onImpersonateCompany(target);
                        } else {
                          onToast('No company found with that Company Code', 'error');
                        }
                      }}
                      className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-xl text-xs transition shadow-xs flex items-center gap-1.5"
                    >
                      <Eye className="w-4 h-4" />
                      <span>Inspect Account</span>
                    </button>
                  </div>
                  <p className="text-[11px] text-slate-400 mt-1.5">
                    When a client calls for support, enter their assigned Company Code to immediately open their ChequeDesk in Read-Only / Debug Mode.
                  </p>
                </div>
              </div>

              {/* Support Tickets Queue */}
              <div className="space-y-4">
                <h3 className="font-bold text-white text-xs uppercase tracking-wider text-slate-400">
                  Client Support & Issue Queue ({supportTickets.length})
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {supportTickets.map((ticket) => {
                    const matchedCompany = companies.find((c) => c.id === ticket.company_id);

                    return (
                      <div
                        key={ticket.id}
                        className="bg-slate-900 p-5 rounded-2xl border border-slate-800 space-y-3 flex flex-col justify-between"
                      >
                        <div className="space-y-2">
                          <div className="flex items-center justify-between gap-2">
                            <span
                              className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                ticket.priority === 'High' || ticket.priority === 'Critical'
                                  ? 'bg-rose-500/20 text-rose-300'
                                  : 'bg-amber-500/20 text-amber-300'
                              }`}
                            >
                              {ticket.priority} Priority
                            </span>

                            <span
                              className={`text-[10px] font-semibold px-2 py-0.5 rounded-sm ${
                                ticket.status === 'Resolved'
                                  ? 'bg-emerald-500/20 text-emerald-300'
                                  : 'bg-blue-500/20 text-blue-300'
                              }`}
                            >
                              {ticket.status}
                            </span>
                          </div>

                          <h4 className="font-bold text-white text-sm">{ticket.title}</h4>
                          <p className="text-xs text-slate-300 leading-relaxed">{ticket.description}</p>
                          <div className="text-[11px] text-slate-400 pt-1">
                            Client: <span className="text-white font-bold">{ticket.company_name}</span>{' '}
                            {matchedCompany && (
                              <span className="font-mono text-indigo-400 font-bold ml-1">
                                [#{matchedCompany.company_code || '1001'}]
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="pt-3 border-t border-slate-800 flex items-center justify-between gap-2 text-xs">
                          {matchedCompany ? (
                            <button
                              onClick={() => onImpersonateCompany(matchedCompany)}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-lg font-bold transition shadow-xs text-xs"
                            >
                              <Eye className="w-3.5 h-3.5" />
                              <span>Inspect Account</span>
                            </button>
                          ) : (
                            <span className="text-slate-500 text-[11px]">ID: {ticket.company_id}</span>
                          )}

                          <button
                            onClick={() => {
                              updateSupportTicketStatus(ticket.id, 'Resolved');
                              onToast('Ticket resolved', 'success');
                            }}
                            className="px-2.5 py-1 bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30 rounded-lg text-[11px] font-semibold transition"
                          >
                            Mark Resolved
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* TAB 7: BACKUP & DATA SAFETY CONTROLS (Requirement 3) */}
          {/* ========================================================================= */}
          {currentTab === 'backup_safety' && (
            <div className="space-y-6">
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 sm:p-6 shadow-xs">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <div>
                    <h3 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
                      <HardDrive className="w-5 h-5 text-emerald-400" />
                      <span>Developer Backup & Data Safety Command Center</span>
                    </h3>
                    <p className="text-xs text-slate-400 mt-1">
                      Manage offline storage engines, trigger manual/scheduled backups, inspect audit manifests, and restore snapshots across any client tenant.
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-xs text-slate-400 font-medium">Select Tenant:</span>
                    <select
                      value={selectedBackupCompanyId}
                      onChange={(e) => setSelectedBackupCompanyId(e.target.value)}
                      className="px-3 py-1.5 bg-slate-800 border border-slate-700 text-white rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    >
                      {companies.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name} (#{c.company_code || '1001'})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* Render BackupSettingsView for selected company */}
              <BackupSettingsView
                companyId={selectedBackupCompanyId}
                companyName={companies.find((c) => c.id === selectedBackupCompanyId)?.name || 'RS Traders'}
                onToast={onToast}
              />
            </div>
          )}
        </main>
      </div>

      {/* ========================================================================= */}
      {/* MODALS */}
      {/* ========================================================================= */}
      <OnboardCompanyModal
        isOpen={isOnboardModalOpen}
        onClose={() => setIsOnboardModalOpen(false)}
        existingCompanies={companies}
        onSuccess={(msg) => onToast(msg, 'success')}
      />

      <EditCompanyModal
        isOpen={Boolean(editingCompany)}
        onClose={() => setEditingCompany(null)}
        company={editingCompany}
        onUpdate={async (id, partial) => {
          await updateCompany(id, partial);
          onToast('Updated company details', 'success');
          setEditingCompany(null);
        }}
      />

      <ExtendSubscriptionModal
        isOpen={Boolean(extendingCompany)}
        onClose={() => setExtendingCompany(null)}
        company={extendingCompany}
        onSuccess={(msg) => onToast(msg, 'success')}
      />

      <FeatureMatrixModal
        isOpen={Boolean(matrixCompany)}
        onClose={() => setMatrixCompany(null)}
        company={matrixCompany}
        systemFeatures={systemFeatures}
        onSuccess={(msg) => onToast(msg, 'success')}
      />

      <RegisterFeatureModal
        isOpen={isRegisterFeatureModalOpen}
        onClose={() => setIsRegisterFeatureModalOpen(false)}
        existingKeys={systemFeatures.map((f) => f.key)}
        onSuccess={(msg) => onToast(msg, 'success')}
      />

      {/* Publish Release Modal */}
      {isPublishModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xs">
          <div className="bg-slate-900 rounded-2xl border border-slate-800 shadow-2xl max-w-lg w-full p-6 space-y-4 text-xs">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Rocket className="w-4 h-4 text-indigo-400" />
                <h3 className="font-bold text-white text-sm">Publish System Release</h3>
              </div>
              <button
                onClick={() => setIsPublishModalOpen(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handlePublishReleaseSubmit} className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-300 block mb-1">Version String *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. v2.5.0"
                    value={newVersion}
                    onChange={(e) => setNewVersion(e.target.value)}
                    className="w-full px-3 py-1.5 bg-slate-800 border border-slate-700 rounded-lg text-white font-mono focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="font-semibold text-slate-300 block mb-1">Release Type</label>
                  <select
                    value={newType}
                    onChange={(e) => setNewType(e.target.value as any)}
                    className="w-full px-3 py-1.5 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none"
                  >
                    <option value="feature">Feature Update</option>
                    <option value="patch">Security / Bug Patch</option>
                    <option value="major">Major Release</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="font-semibold text-slate-300 block mb-1">Release Headline *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Real-Time WhatsApp Overdue Alert Dispatcher"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  className="w-full px-3 py-1.5 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-300 block mb-1">Changelog & Technical Notes</label>
                <textarea
                  rows={3}
                  placeholder="Details of feature additions, migrations, or fixes pushed to all tenant workspaces..."
                  value={newDesc}
                  onChange={(e) => setNewDesc(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsPublishModalOpen(false)}
                  className="px-3 py-1.5 text-slate-400 hover:text-white transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-lg transition shadow-xs"
                >
                  Publish & Deploy Globally
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
