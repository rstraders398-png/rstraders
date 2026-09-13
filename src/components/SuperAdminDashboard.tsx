import React, { useState, useMemo } from 'react';
import {
  Building2,
  Users,
  ShieldAlert,
  LifeBuoy,
  Plus,
  Search,
  Filter,
  MoreVertical,
  ExternalLink,
  Edit,
  CalendarPlus,
  UserCheck,
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  Clock,
  ShieldCheck,
  CreditCard,
  Building,
  KeyRound,
  Trash2,
  Eye,
  RefreshCw,
  Sparkles,
  ArrowUpRight,
  Sliders,
} from 'lucide-react';
import {
  Company,
  AppUser,
  AuditLog,
  SupportTicket,
  SubscriptionPlan,
  SubscriptionStatus,
} from '../types';
import { formatCurrency } from '../lib/dateUtils';
import { EditCompanyModal } from './admin/EditCompanyModal';
import { ExtendSubscriptionModal } from './admin/ExtendSubscriptionModal';
import { ManageCompanyUsersModal } from './admin/ManageCompanyUsersModal';
import { OnboardCompanyModal } from './admin/OnboardCompanyModal';
import { ProvisionUserModal } from './admin/ProvisionUserModal';
import {
  updateCompany,
  updateUser,
  deleteUserAccount,
  updateSupportTicketStatus,
  setDevSuperAdminMode,
  getDevSuperAdminMode,
} from '../lib/adminService';

interface SuperAdminDashboardProps {
  companies: Company[];
  users: AppUser[];
  auditLogs: AuditLog[];
  supportTickets: SupportTicket[];
  allChequesCount: number;
  allChequesVolume: number;
  onImpersonateCompany: (company: Company) => void;
  onToast: (text: string, type?: 'success' | 'info' | 'error') => void;
  onRefreshData?: () => void;
  onSwitchToTenantView?: () => void;
}

type AdminTab = 'overview' | 'companies' | 'users' | 'audit' | 'support';

export const SuperAdminDashboard: React.FC<SuperAdminDashboardProps> = ({
  companies,
  users,
  auditLogs,
  supportTickets,
  allChequesCount,
  allChequesVolume,
  onImpersonateCompany,
  onToast,
  onRefreshData,
  onSwitchToTenantView,
}) => {
  const [activeTab, setActiveTab] = useState<AdminTab>('overview');

  // Search & Filter states
  const [searchQuery, setSearchQuery] = useState('');
  const [planFilter, setPlanFilter] = useState<string>('All');
  const [statusFilter, setStatusFilter] = useState<string>('All');
  const [userRoleFilter, setUserRoleFilter] = useState<string>('All');
  const [userCompanyFilter, setUserCompanyFilter] = useState<string>('All');
  const [auditSeverityFilter, setAuditSeverityFilter] = useState<string>('All');
  const [ticketStatusFilter, setTicketStatusFilter] = useState<string>('All');

  // Modals state
  const [isOnboardModalOpen, setIsOnboardModalOpen] = useState(false);
  const [isProvisionUserModalOpen, setIsProvisionUserModalOpen] = useState(false);
  const [editingCompany, setEditingCompany] = useState<Company | null>(null);
  const [extendingCompany, setExtendingCompany] = useState<Company | null>(null);
  const [managingUsersCompany, setManagingUsersCompany] = useState<Company | null>(null);

  // Dropdown action menu tracker
  const [openDropdownId, setOpenDropdownId] = useState<string | null>(null);

  // Developer Super Admin Mode state
  const [isDevAdminActive, setIsDevAdminActive] = useState<boolean>(getDevSuperAdminMode());

  const handleToggleDevMode = () => {
    const next = !isDevAdminActive;
    setIsDevAdminActive(next);
    setDevSuperAdminMode(next);
    onToast(`Super Admin Mode ${next ? 'Enabled' : 'Disabled'}`, 'info');
  };

  // 1. Overview Metrics Calculations
  const activeCompaniesCount = useMemo(
    () => companies.filter((c) => c.is_active && c.subscription_status === 'Active').length,
    [companies]
  );

  const totalMonthlyRevenue = useMemo(
    () =>
      companies
        .filter((c) => c.is_active && (c.subscription_status === 'Active' || c.subscription_status === 'Trial'))
        .reduce((sum, c) => sum + (c.monthly_fee || 0), 0),
    [companies]
  );

  const openTicketsCount = useMemo(
    () => supportTickets.filter((t) => t.status !== 'Resolved').length,
    [supportTickets]
  );

  // Filtered Companies
  const filteredCompanies = useMemo(() => {
    return companies.filter((c) => {
      const matchSearch =
        c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (c.owner_name && c.owner_name.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (c.contact_email && c.contact_email.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchPlan = planFilter === 'All' || c.subscription_plan === planFilter;
      const matchStatus = statusFilter === 'All' || c.subscription_status === statusFilter;

      return matchSearch && matchPlan && matchStatus;
    });
  }, [companies, searchQuery, planFilter, statusFilter]);

  // Filtered Users
  const filteredUsers = useMemo(() => {
    return users.filter((u) => {
      const matchSearch =
        u.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        u.email.toLowerCase().includes(searchQuery.toLowerCase());
      const matchRole = userRoleFilter === 'All' || u.role === userRoleFilter;
      const matchCompany = userCompanyFilter === 'All' || u.company_id === userCompanyFilter;
      return matchSearch && matchRole && matchCompany;
    });
  }, [users, searchQuery, userRoleFilter, userCompanyFilter]);

  // Filtered Audit Logs
  const filteredAuditLogs = useMemo(() => {
    return auditLogs.filter((log) => {
      const matchSearch =
        log.details.toLowerCase().includes(searchQuery.toLowerCase()) ||
        log.company_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        log.user_email.toLowerCase().includes(searchQuery.toLowerCase());
      const matchSeverity =
        auditSeverityFilter === 'All' || log.severity === auditSeverityFilter;
      return matchSearch && matchSeverity;
    });
  }, [auditLogs, searchQuery, auditSeverityFilter]);

  // Filtered Tickets
  const filteredTickets = useMemo(() => {
    return supportTickets.filter((t) => {
      const matchSearch =
        t.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.company_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.description.toLowerCase().includes(searchQuery.toLowerCase());
      const matchStatus =
        ticketStatusFilter === 'All' || t.status === ticketStatusFilter;
      return matchSearch && matchStatus;
    });
  }, [supportTickets, searchQuery, ticketStatusFilter]);

  const handleEditCompanySubmit = async (id: string, partial: Partial<Company>) => {
    try {
      await updateCompany(id, partial);
      onToast(`Updated company details for ${partial.name || id}`, 'success');
      setEditingCompany(null);
    } catch (err: any) {
      onToast(err?.message || 'Failed to update company', 'error');
    }
  };

  const handleTicketStatusChange = async (
    ticketId: string,
    status: 'Open' | 'In Progress' | 'Resolved'
  ) => {
    try {
      await updateSupportTicketStatus(ticketId, status);
      onToast(`Ticket marked as ${status}`, 'success');
    } catch {
      onToast('Failed to update ticket status', 'error');
    }
  };

  const handleResetUser = (u: AppUser) => {
    onToast(`Security auth link dispatched to ${u.email}`, 'info');
  };

  const handleToggleUserStatus = async (u: AppUser) => {
    const nextStatus = u.status === 'Active' ? 'Inactive' : 'Active';
    try {
      await updateUser(u.uid, { status: nextStatus });
      onToast(`User ${u.name} status updated to ${nextStatus}`, 'info');
    } catch {
      onToast('Failed to toggle user status', 'error');
    }
  };

  const handleDeleteUser = async (u: AppUser) => {
    if (!confirm(`Are you sure you want to permanently delete user ${u.name} (${u.email})?`)) {
      return;
    }
    try {
      await deleteUserAccount(u.uid);
      onToast(`User ${u.name} deleted`, 'info');
    } catch {
      onToast('Failed to delete user', 'error');
    }
  };

  return (
    <div className="space-y-6 pb-12" id="super-admin-dashboard-container">
      {/* Top Banner: Super Admin & Developer Control Room */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white rounded-2xl p-6 shadow-xl border border-slate-800 relative overflow-hidden">
        <div className="absolute right-0 top-0 bottom-0 w-96 bg-radial from-indigo-500/10 via-transparent to-transparent pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-5">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-widest bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                SaaS Multi-Tenant Core
              </span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                Developer Engine v2.4
              </span>
            </div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white flex items-center gap-2">
              <span>Super Admin & Developer Panel</span>
            </h1>
            <p className="text-xs text-slate-300 max-w-2xl leading-relaxed">
              Platform-wide client governance, subscription sales & renewal tracking, global user management, security audit telemetry, and isolated client troubleshooting tools.
            </p>
          </div>

          {/* Quick Header Actions */}
          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            {onSwitchToTenantView && (
              <button
                onClick={onSwitchToTenantView}
                className="inline-flex items-center gap-1.5 px-3 py-2 bg-white/10 hover:bg-white/20 text-white text-xs font-semibold rounded-xl border border-white/15 transition shadow-xs"
                title="Switch to Client Workspace view"
              >
                <Building className="w-3.5 h-3.5 text-slate-300" />
                <span>Go to Client Workspace</span>
              </button>
            )}

            <button
              onClick={() => setIsProvisionUserModalOpen(true)}
              id="btn-admin-provision-user"
              className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-xl border border-indigo-500/40 transition shadow-xs"
            >
              <Users className="w-3.5 h-3.5" />
              <span>+ Provision User</span>
            </button>

            <button
              onClick={() => setIsOnboardModalOpen(true)}
              id="btn-admin-onboard-company"
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl border border-emerald-500/40 transition shadow-md"
            >
              <Plus className="w-4 h-4" />
              <span>+ Onboard Client</span>
            </button>
          </div>
        </div>
      </div>

      {/* 4 Metric Cards (Requirement 3) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Metric 1: Total Active Client Companies */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-2 relative overflow-hidden group hover:border-slate-300 transition">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Active Client Companies</span>
            <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center">
              <Building2 className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-black text-slate-900 font-mono tracking-tight">
              {activeCompaniesCount}
            </span>
            <span className="text-xs text-slate-400 font-medium">/ {companies.length} enrolled</span>
          </div>
          <div className="text-[11px] text-emerald-700 font-semibold flex items-center gap-1">
            <TrendingUp className="w-3.5 h-3.5" />
            <span>Multi-tenant isolation active</span>
          </div>
        </div>

        {/* Metric 2: Total Revenue / Subscriptions */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-2 relative overflow-hidden group hover:border-slate-300 transition">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Monthly Subscriptions ARR/MRR</span>
            <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-700 flex items-center justify-center">
              <CreditCard className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-1">
            <span className="text-2xl font-black text-indigo-900 font-mono tracking-tight">
              {formatCurrency(totalMonthlyRevenue)}
            </span>
            <span className="text-[10px] text-slate-400 font-mono">/month</span>
          </div>
          <div className="text-[11px] text-slate-500 flex items-center gap-1">
            <span>Annual Run-Rate:</span>
            <span className="font-mono font-bold text-slate-800">
              {formatCurrency(totalMonthlyRevenue * 12)}
            </span>
          </div>
        </div>

        {/* Metric 3: Active Cheque Volume Across Companies */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-2 relative overflow-hidden group hover:border-slate-300 transition">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Cross-Tenant Cheque Volume</span>
            <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-black text-slate-900 font-mono tracking-tight">
              {formatCurrency(allChequesVolume)}
            </span>
          </div>
          <div className="text-[11px] text-slate-500 flex items-center gap-1">
            <span className="font-mono font-bold text-slate-700">{allChequesCount}</span>
            <span>registered cheques under monitoring</span>
          </div>
        </div>

        {/* Metric 4: Open Support Tickets */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-2 relative overflow-hidden group hover:border-slate-300 transition">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Open Support Tickets</span>
            <div className="w-8 h-8 rounded-xl bg-rose-50 text-rose-700 flex items-center justify-center">
              <LifeBuoy className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-black text-rose-700 font-mono tracking-tight">
              {openTicketsCount}
            </span>
            <span className="text-xs text-slate-400 font-medium">pending triage</span>
          </div>
          <div className="text-[11px] text-slate-500 flex items-center gap-1">
            <ShieldAlert className="w-3.5 h-3.5 text-rose-500" />
            <span>Direct Impersonation support ready</span>
          </div>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="border-b border-slate-200 flex items-center justify-between gap-4 overflow-x-auto">
        <nav className="flex items-center gap-1">
          <button
            onClick={() => setActiveTab('overview')}
            className={`px-4 py-3 text-xs font-bold border-b-2 transition-all flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'overview'
                ? 'border-emerald-600 text-emerald-700'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Building2 className="w-4 h-4" />
            <span>Client Companies & Sales</span>
            <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-slate-100 text-slate-600 font-mono">
              {companies.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('users')}
            className={`px-4 py-3 text-xs font-bold border-b-2 transition-all flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'users'
                ? 'border-emerald-600 text-emerald-700'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>Global User Accounts</span>
            <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-slate-100 text-slate-600 font-mono">
              {users.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('audit')}
            className={`px-4 py-3 text-xs font-bold border-b-2 transition-all flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'audit'
                ? 'border-emerald-600 text-emerald-700'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <ShieldCheck className="w-4 h-4" />
            <span>System Logs & Security Audit</span>
            <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-slate-100 text-slate-600 font-mono">
              {auditLogs.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('support')}
            className={`px-4 py-3 text-xs font-bold border-b-2 transition-all flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'support'
                ? 'border-emerald-600 text-emerald-700'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <LifeBuoy className="w-4 h-4" />
            <span>Developer Troubleshooting & Tickets</span>
            {openTicketsCount > 0 && (
              <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-rose-100 text-rose-700 font-mono font-bold">
                {openTicketsCount}
              </span>
            )}
          </button>
        </nav>

        {/* Global Search Bar */}
        <div className="relative min-w-[200px] max-w-xs shrink-0 my-1 hidden sm:block">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search clients, users, logs..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none"
          />
        </div>
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: Client Companies Directory & Quick Actions Dropdowns (Requirement 3) */}
      {/* ========================================================================= */}
      {(activeTab === 'overview' || activeTab === 'companies') && (
        <div className="space-y-4">
          {/* Filter Bar */}
          <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-4 rounded-xl border border-slate-200 text-xs">
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-slate-600">Plan:</span>
                <select
                  value={planFilter}
                  onChange={(e) => setPlanFilter(e.target.value)}
                  className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium focus:outline-none"
                >
                  <option value="All">All Plans</option>
                  <option value="Starter">Starter</option>
                  <option value="Professional">Professional</option>
                  <option value="Enterprise">Enterprise</option>
                </select>
              </div>

              <div className="flex items-center gap-2">
                <span className="font-semibold text-slate-600">Status:</span>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium focus:outline-none"
                >
                  <option value="All">All Statuses</option>
                  <option value="Active">Active</option>
                  <option value="Trial">Trial</option>
                  <option value="Expired">Expired</option>
                  <option value="Suspended">Suspended</option>
                </select>
              </div>
            </div>

            <div className="text-slate-400 text-xs font-medium">
              Showing {filteredCompanies.length} of {companies.length} Client Companies
            </div>
          </div>

          {/* Companies Table */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs divide-y divide-slate-200">
                <thead className="bg-slate-50 text-slate-600 font-bold uppercase tracking-wider text-[10px]">
                  <tr>
                    <th className="px-5 py-3.5">Company & ID</th>
                    <th className="px-4 py-3.5">Owner / Contact</th>
                    <th className="px-4 py-3.5">Plan & Fee</th>
                    <th className="px-4 py-3.5">Subscription Expiry</th>
                    <th className="px-4 py-3.5">Status</th>
                    <th className="px-5 py-3.5 text-right">Quick Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-normal">
                  {filteredCompanies.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-6 py-12 text-center text-slate-400">
                        No client companies matched your search criteria.
                      </td>
                    </tr>
                  ) : (
                    filteredCompanies.map((comp) => {
                      const isDropdownOpen = openDropdownId === comp.id;

                      return (
                        <tr
                          key={comp.id}
                          className="hover:bg-slate-50/70 transition-colors group"
                        >
                          {/* Company Name & ID */}
                          <td className="px-5 py-3.5">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-800 font-bold flex items-center justify-center shrink-0 border border-emerald-200">
                                {comp.name.charAt(0).toUpperCase()}
                              </div>
                              <div className="min-w-0">
                                <div className="font-bold text-slate-900 truncate flex items-center gap-1.5">
                                  <span>{comp.name}</span>
                                </div>
                                <div className="text-[11px] font-mono text-slate-400 truncate">
                                  {comp.id}
                                </div>
                              </div>
                            </div>
                          </td>

                          {/* Owner / Contact */}
                          <td className="px-4 py-3.5">
                            <div className="font-medium text-slate-800">
                              {comp.owner_name || 'N/A'}
                            </div>
                            <div className="text-[11px] text-slate-500 font-mono truncate max-w-[180px]">
                              {comp.contact_email || comp.contact_phone || 'No direct contact'}
                            </div>
                          </td>

                          {/* Plan & Fee */}
                          <td className="px-4 py-3.5">
                            <span
                              className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                comp.subscription_plan === 'Enterprise'
                                  ? 'bg-purple-100 text-purple-800 border border-purple-200'
                                  : comp.subscription_plan === 'Professional'
                                  ? 'bg-blue-100 text-blue-800 border border-blue-200'
                                  : 'bg-slate-100 text-slate-700 border border-slate-200'
                              }`}
                            >
                              {comp.subscription_plan || 'Professional'}
                            </span>
                            <div className="font-mono font-bold text-slate-800 text-[11px] mt-0.5">
                              {formatCurrency(comp.monthly_fee || 0)}/mo
                            </div>
                          </td>

                          {/* Expiry Date */}
                          <td className="px-4 py-3.5">
                            <div className="font-mono font-bold text-slate-800">
                              {comp.expiry_date_bs || '2082-01-01'} BS
                            </div>
                            <div className="text-[10px] text-slate-400 font-mono">
                              {comp.expiry_date_ad || '2025-04-14'} AD
                            </div>
                          </td>

                          {/* Status */}
                          <td className="px-4 py-3.5">
                            <span
                              className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                                comp.subscription_status === 'Active'
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : comp.subscription_status === 'Trial'
                                  ? 'bg-indigo-100 text-indigo-800'
                                  : comp.subscription_status === 'Expired'
                                  ? 'bg-rose-100 text-rose-800'
                                  : 'bg-amber-100 text-amber-800'
                              }`}
                            >
                              <span
                                className={`w-1.5 h-1.5 rounded-full ${
                                  comp.subscription_status === 'Active'
                                    ? 'bg-emerald-600'
                                    : comp.subscription_status === 'Trial'
                                    ? 'bg-indigo-600'
                                    : 'bg-rose-600'
                                }`}
                              />
                              <span>{comp.subscription_status || 'Active'}</span>
                            </span>
                          </td>

                          {/* Quick Actions Dropdown (Requirement 3) */}
                          <td className="px-5 py-3.5 text-right relative">
                            <div className="inline-flex items-center justify-end gap-1.5">
                              {/* Primary Troubleshoot Button */}
                              <button
                                onClick={() => onImpersonateCompany(comp)}
                                id={`btn-troubleshoot-${comp.id}`}
                                title="Log in to Client Workspace in Read-Only Support Mode"
                                className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-amber-500 hover:bg-amber-600 text-white rounded-lg text-xs font-bold transition shadow-2xs"
                              >
                                <Eye className="w-3.5 h-3.5" />
                                <span className="hidden sm:inline">Troubleshoot</span>
                              </button>

                              {/* Dropdown Toggle */}
                              <div className="relative">
                                <button
                                  onClick={() =>
                                    setOpenDropdownId(isDropdownOpen ? null : comp.id)
                                  }
                                  className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition"
                                  aria-label="Actions menu"
                                >
                                  <MoreVertical className="w-4 h-4" />
                                </button>

                                {isDropdownOpen && (
                                  <>
                                    <div
                                      onClick={() => setOpenDropdownId(null)}
                                      className="fixed inset-0 z-20"
                                    />
                                    <div className="absolute right-0 mt-1 w-52 bg-white rounded-xl shadow-xl border border-slate-200 py-1.5 z-30 text-left text-xs divide-y divide-slate-100 animate-in fade-in zoom-in-95 duration-100">
                                      {/* [Edit Details] */}
                                      <div className="py-1">
                                        <button
                                          onClick={() => {
                                            setOpenDropdownId(null);
                                            setEditingCompany(comp);
                                          }}
                                          className="w-full px-3.5 py-2 text-slate-700 hover:bg-slate-50 flex items-center gap-2.5 font-medium transition"
                                        >
                                          <Edit className="w-3.5 h-3.5 text-slate-400" />
                                          <span>[Edit Details]</span>
                                        </button>

                                        {/* [Manage Users] */}
                                        <button
                                          onClick={() => {
                                            setOpenDropdownId(null);
                                            setManagingUsersCompany(comp);
                                          }}
                                          className="w-full px-3.5 py-2 text-slate-700 hover:bg-slate-50 flex items-center gap-2.5 font-medium transition"
                                        >
                                          <Users className="w-3.5 h-3.5 text-blue-500" />
                                          <span>[Manage Users]</span>
                                        </button>

                                        {/* [Extend Subscription] */}
                                        <button
                                          onClick={() => {
                                            setOpenDropdownId(null);
                                            setExtendingCompany(comp);
                                          }}
                                          className="w-full px-3.5 py-2 text-slate-700 hover:bg-slate-50 flex items-center gap-2.5 font-medium transition"
                                        >
                                          <CalendarPlus className="w-3.5 h-3.5 text-emerald-500" />
                                          <span>[Extend Subscription]</span>
                                        </button>
                                      </div>

                                      {/* [Troubleshoot / View Dashboard] */}
                                      <div className="py-1">
                                        <button
                                          onClick={() => {
                                            setOpenDropdownId(null);
                                            onImpersonateCompany(comp);
                                          }}
                                          className="w-full px-3.5 py-2 text-amber-700 hover:bg-amber-50 flex items-center gap-2.5 font-bold transition"
                                        >
                                          <Eye className="w-3.5 h-3.5 text-amber-600" />
                                          <span>[Troubleshoot / View]</span>
                                        </button>
                                      </div>
                                    </div>
                                  </>
                                )}
                              </div>
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
      {/* TAB 2: Global User Management (Requirement 2) */}
      {/* ========================================================================= */}
      {activeTab === 'users' && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-4 rounded-xl border border-slate-200 text-xs">
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-slate-600">Company:</span>
                <select
                  value={userCompanyFilter}
                  onChange={(e) => setUserCompanyFilter(e.target.value)}
                  className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium focus:outline-none"
                >
                  <option value="All">All Companies</option>
                  {companies.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center gap-2">
                <span className="font-semibold text-slate-600">Role:</span>
                <select
                  value={userRoleFilter}
                  onChange={(e) => setUserRoleFilter(e.target.value)}
                  className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium focus:outline-none"
                >
                  <option value="All">All Roles</option>
                  <option value="super_admin">Super Admin</option>
                  <option value="company_admin">Company Admin</option>
                  <option value="accountant">Accountant</option>
                  <option value="viewer">Viewer</option>
                </select>
              </div>
            </div>

            <button
              onClick={() => setIsProvisionUserModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold transition shadow-xs"
            >
              <Users className="w-3.5 h-3.5" />
              <span>+ Provision New User</span>
            </button>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs divide-y divide-slate-200">
                <thead className="bg-slate-50 text-slate-600 font-bold uppercase tracking-wider text-[10px]">
                  <tr>
                    <th className="px-5 py-3.5">User Account</th>
                    <th className="px-4 py-3.5">Assigned Company</th>
                    <th className="px-4 py-3.5">Role</th>
                    <th className="px-4 py-3.5">Status</th>
                    <th className="px-4 py-3.5">Last Active</th>
                    <th className="px-5 py-3.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-normal">
                  {filteredUsers.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-6 py-12 text-center text-slate-400">
                        No user accounts matched the filter.
                      </td>
                    </tr>
                  ) : (
                    filteredUsers.map((u) => {
                      const linkedComp = companies.find((c) => c.id === u.company_id);

                      return (
                        <tr key={u.uid} className="hover:bg-slate-50/70 transition-colors">
                          <td className="px-5 py-3.5">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-full bg-slate-100 text-slate-700 font-bold flex items-center justify-center shrink-0 border border-slate-200">
                                {u.name.charAt(0).toUpperCase()}
                              </div>
                              <div className="min-w-0">
                                <div className="font-bold text-slate-900 truncate">{u.name}</div>
                                <div className="text-[11px] font-mono text-slate-500 truncate">
                                  {u.email}
                                </div>
                              </div>
                            </div>
                          </td>

                          <td className="px-4 py-3.5">
                            <div className="font-semibold text-slate-800">
                              {linkedComp?.name || u.company_name || u.company_id}
                            </div>
                            <div className="text-[10px] font-mono text-slate-400">
                              {u.company_id}
                            </div>
                          </td>

                          <td className="px-4 py-3.5">
                            <span
                              className={`px-2 py-0.5 rounded-full text-[10px] font-bold capitalize ${
                                u.role === 'super_admin'
                                  ? 'bg-amber-100 text-amber-800 border border-amber-200'
                                  : u.role === 'company_admin'
                                  ? 'bg-purple-100 text-purple-800 border border-purple-200'
                                  : u.role === 'accountant'
                                  ? 'bg-blue-100 text-blue-800 border border-blue-200'
                                  : 'bg-slate-100 text-slate-700'
                              }`}
                            >
                              {u.role.replace('_', ' ')}
                            </span>
                          </td>

                          <td className="px-4 py-3.5">
                            <span
                              className={`px-2 py-0.5 rounded-sm text-[10px] font-bold ${
                                u.status === 'Active'
                                  ? 'bg-emerald-50 text-emerald-700'
                                  : 'bg-rose-50 text-rose-700'
                              }`}
                            >
                              {u.status}
                            </span>
                          </td>

                          <td className="px-4 py-3.5 text-slate-500 text-[11px]">
                            {u.last_login_at
                              ? new Date(u.last_login_at).toLocaleDateString()
                              : 'Recently'}
                          </td>

                          <td className="px-5 py-3.5 text-right">
                            <div className="inline-flex items-center gap-1.5">
                              <button
                                onClick={() => handleResetUser(u)}
                                title="Reset credentials"
                                className="p-1.5 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition"
                              >
                                <KeyRound className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => handleToggleUserStatus(u)}
                                title={u.status === 'Active' ? 'Suspend User' : 'Activate User'}
                                className={`px-2 py-1 text-[10px] font-semibold rounded-lg transition ${
                                  u.status === 'Active'
                                    ? 'text-amber-700 bg-amber-50 hover:bg-amber-100'
                                    : 'text-emerald-700 bg-emerald-50 hover:bg-emerald-100'
                                }`}
                              >
                                {u.status === 'Active' ? 'Suspend' : 'Activate'}
                              </button>
                              <button
                                onClick={() => handleDeleteUser(u)}
                                title="Delete account"
                                className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
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
      )}

      {/* ========================================================================= */}
      {/* TAB 3: System Logs & Security Audit (Requirement 2) */}
      {/* ========================================================================= */}
      {activeTab === 'audit' && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-4 rounded-xl border border-slate-200 text-xs">
            <div className="flex items-center gap-3">
              <span className="font-semibold text-slate-600">Severity Filter:</span>
              <select
                value={auditSeverityFilter}
                onChange={(e) => setAuditSeverityFilter(e.target.value)}
                className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium focus:outline-none"
              >
                <option value="All">All Severities</option>
                <option value="info">Info</option>
                <option value="warning">Warning</option>
                <option value="error">Error / Critical</option>
              </select>
            </div>

            <div className="text-slate-400 text-xs font-medium">
              {filteredAuditLogs.length} Security & System Events Recorded
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
            <div className="divide-y divide-slate-100">
              {filteredAuditLogs.length === 0 ? (
                <div className="p-12 text-center text-slate-400 text-xs">
                  No audit logs recorded for this criteria.
                </div>
              ) : (
                filteredAuditLogs.map((log) => (
                  <div
                    key={log.id}
                    className="p-4 hover:bg-slate-50/70 transition flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                  >
                    <div className="flex items-start gap-3 min-w-0">
                      <div
                        className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${
                          log.severity === 'error'
                            ? 'bg-rose-100 text-rose-700'
                            : log.severity === 'warning'
                            ? 'bg-amber-100 text-amber-700'
                            : 'bg-blue-100 text-blue-700'
                        }`}
                      >
                        {log.severity === 'error' ? (
                          <AlertTriangle className="w-3.5 h-3.5" />
                        ) : log.severity === 'warning' ? (
                          <Clock className="w-3.5 h-3.5" />
                        ) : (
                          <CheckCircle2 className="w-3.5 h-3.5" />
                        )}
                      </div>

                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-slate-900 uppercase text-[10px] tracking-wider px-1.5 py-0.5 bg-slate-100 rounded-sm">
                            {log.event_type}
                          </span>
                          <span className="font-semibold text-slate-800 truncate">
                            {log.company_name}
                          </span>
                          <span className="text-[11px] text-slate-400 font-mono hidden md:inline">
                            • {log.user_email}
                          </span>
                        </div>
                        <p className="text-slate-600 mt-1 leading-normal">{log.details}</p>
                      </div>
                    </div>

                    <div className="text-[11px] font-mono text-slate-400 shrink-0 self-end sm:self-center">
                      {new Date(log.timestamp).toLocaleString()}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 4: Support & Developer Troubleshooting Tickets (Requirement 2) */}
      {/* ========================================================================= */}
      {activeTab === 'support' && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-4 rounded-xl border border-slate-200 text-xs">
            <div className="flex items-center gap-3">
              <span className="font-semibold text-slate-600">Ticket Status:</span>
              <select
                value={ticketStatusFilter}
                onChange={(e) => setTicketStatusFilter(e.target.value)}
                className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium focus:outline-none"
              >
                <option value="All">All Tickets</option>
                <option value="Open">Open</option>
                <option value="In Progress">In Progress</option>
                <option value="Resolved">Resolved</option>
              </select>
            </div>

            <div className="text-slate-400 text-xs font-medium">
              Direct Developer Resolution & Impersonation Support
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredTickets.map((ticket) => {
              const matchedCompany = companies.find((c) => c.id === ticket.company_id);

              return (
                <div
                  key={ticket.id}
                  className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-3 flex flex-col justify-between"
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          ticket.priority === 'Critical' || ticket.priority === 'High'
                            ? 'bg-rose-100 text-rose-800'
                            : ticket.priority === 'Medium'
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-slate-100 text-slate-700'
                        }`}
                      >
                        {ticket.priority} Priority
                      </span>

                      <span
                        className={`text-[10px] font-semibold px-2 py-0.5 rounded-sm ${
                          ticket.status === 'Resolved'
                            ? 'bg-emerald-50 text-emerald-700'
                            : ticket.status === 'In Progress'
                            ? 'bg-blue-50 text-blue-700'
                            : 'bg-amber-50 text-amber-700'
                        }`}
                      >
                        {ticket.status}
                      </span>
                    </div>

                    <h4 className="font-bold text-slate-900 text-sm">{ticket.title}</h4>
                    <p className="text-xs text-slate-600 leading-relaxed">{ticket.description}</p>
                    <div className="text-[11px] text-slate-500 font-semibold pt-1">
                      Client: <span className="text-slate-900 font-bold">{ticket.company_name}</span>
                    </div>
                  </div>

                  <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2 text-xs">
                    {/* Impersonate to troubleshoot ticket */}
                    {matchedCompany ? (
                      <button
                        onClick={() => onImpersonateCompany(matchedCompany)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-white rounded-lg font-bold transition shadow-xs text-xs"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>Inspect in Support View</span>
                      </button>
                    ) : (
                      <span className="text-[11px] text-slate-400">Company ID: {ticket.company_id}</span>
                    )}

                    <div className="flex items-center gap-1">
                      {ticket.status !== 'In Progress' && ticket.status !== 'Resolved' && (
                        <button
                          onClick={() => handleTicketStatusChange(ticket.id, 'In Progress')}
                          className="px-2 py-1 text-[11px] bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition"
                        >
                          Start
                        </button>
                      )}
                      {ticket.status !== 'Resolved' && (
                        <button
                          onClick={() => handleTicketStatusChange(ticket.id, 'Resolved')}
                          className="px-2.5 py-1 text-[11px] bg-emerald-100 hover:bg-emerald-200 text-emerald-800 font-semibold rounded-lg transition"
                        >
                          Resolve
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Modals */}
      <EditCompanyModal
        isOpen={Boolean(editingCompany)}
        onClose={() => setEditingCompany(null)}
        company={editingCompany}
        onUpdate={handleEditCompanySubmit}
      />

      <ExtendSubscriptionModal
        isOpen={Boolean(extendingCompany)}
        onClose={() => setExtendingCompany(null)}
        company={extendingCompany}
        onSuccess={(msg) => onToast(msg, 'success')}
      />

      <ManageCompanyUsersModal
        isOpen={Boolean(managingUsersCompany)}
        onClose={() => setManagingUsersCompany(null)}
        company={managingUsersCompany}
        users={users}
        onToast={onToast}
      />

      <OnboardCompanyModal
        isOpen={isOnboardModalOpen}
        onClose={() => setIsOnboardModalOpen(false)}
        onSuccess={(msg) => onToast(msg, 'success')}
      />

      <ProvisionUserModal
        isOpen={isProvisionUserModalOpen}
        onClose={() => setIsProvisionUserModalOpen(false)}
        companies={companies}
        onSuccess={(msg) => onToast(msg, 'success')}
      />
    </div>
  );
};
