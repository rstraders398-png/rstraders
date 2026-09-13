import React, { useState, useEffect, useMemo } from 'react';
import {
  initAuth,
  signInWithGoogle,
  signOutUser,
  auth,
  testConnection,
} from './lib/firebase';
import {
  syncUserCompanyProfile,
  setActiveCompanyId,
  subscribeToCheques,
  subscribeToParties,
  subscribeToBanks,
  createCheque,
  updateCheque,
  deleteCheque,
  recordPayment,
  seedDemoDataIfEmpty,
} from './lib/chequeService';
import {
  Company,
  AppUser,
  AuditLog,
  SupportTicket,
  ImpersonationSession,
  Cheque,
  Party,
  Bank,
  CreateChequeInput,
  RecordPaymentInput,
  SystemFeature,
  DEFAULT_COMPANY_FEATURES,
} from './types';
import {
  isUserSuperAdmin,
  getImpersonationSession,
  setImpersonationSession,
  subscribeToCompanies,
  subscribeToAllUsers,
  subscribeToAuditLogs,
  subscribeToSupportTickets,
  seedSaaSDemoDataIfEmpty,
} from './lib/adminService';
import {
  subscribeToFeatureRegistry,
  BUILTIN_SYSTEM_FEATURES,
  isCompanyFeatureEnabled,
} from './lib/featureRegistry';
import { Sidebar, NavView } from './components/Sidebar';
import { TopHeader } from './components/TopHeader';
import { StatsCards } from './components/StatsCards';
import { ChequeTable } from './components/ChequeTable';
import { DueDateTimeline } from './components/DueDateTimeline';
import { IssuedDateLog } from './components/IssuedDateLog';
import { PrintChequeView } from './components/PrintChequeView';
import { PartiesView } from './components/PartiesView';
import { BanksView } from './components/BanksView';
import { CompanyUsersView } from './components/CompanyUsersView';
import { PartialPaymentsView } from './components/PartialPaymentsView';
import { BackupSettingsView } from './components/BackupSettingsView';
import { PendingChequesView } from './components/PendingChequesView';
import { ClearedChequesView } from './components/ClearedChequesView';
import { DeveloperConsole } from './components/DeveloperConsole';
import { SupportModeBanner } from './components/SupportModeBanner';
import { SmsNotificationsView } from './components/modules/SmsNotificationsView';
import { AdvancedReportsView } from './components/modules/AdvancedReportsView';
import { BulkChequeImportView } from './components/modules/BulkChequeImportView';
import { ConnectIpsGatewayView } from './components/modules/ConnectIpsGatewayView';
import { DynamicModulePlaceholderView } from './components/modules/DynamicModulePlaceholderView';
import { ThemeId, getSavedTheme, saveTheme, DEFAULT_THEME, THEMES } from './lib/theme';
import { ChequeModal } from './components/ChequeModal';
import { PaymentModal } from './components/PaymentModal';
import { ChequeDetailModal } from './components/ChequeDetailModal';
import { PartiesModal } from './components/PartiesModal';
import { BanksModal } from './components/BanksModal';
import { CheckCircle2, AlertCircle, Sparkles, ArrowLeft, ShieldCheck, ExternalLink, Lock } from 'lucide-react';
import { User } from 'firebase/auth';

const DEFAULT_COMPANY_ID = 'default-company-101';
const DEFAULT_COMPANY_NAME = 'RS Traders';

export default function App() {
  const [currentView, setCurrentView] = useState<NavView>('due_timeline');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState<boolean>(false);

  // Impersonation & Developer Portal Routing State
  const [impersonation, setImpersonation] = useState<ImpersonationSession | null>(getImpersonationSession());
  const [isDeveloperPreviewTenant, setIsDeveloperPreviewTenant] = useState<boolean>(false);

  // Current company context
  const initialCid = impersonation?.isImpersonating ? impersonation.companyId : DEFAULT_COMPANY_ID;
  const initialCname = impersonation?.isImpersonating ? impersonation.companyName : DEFAULT_COMPANY_NAME;
  const [companyId, setCompanyId] = useState<string>(initialCid);
  const [companyName, setCompanyName] = useState<string>(initialCname);

  const [currentUser, setCurrentUser] = useState<User | null>(auth.currentUser);
  const [currentTheme, setCurrentTheme] = useState<ThemeId>(getSavedTheme());

  // Tenant workspace state
  const [cheques, setCheques] = useState<Cheque[]>([]);
  const [parties, setParties] = useState<Party[]>([]);
  const [banks, setBanks] = useState<Bank[]>([]);
  const [statusFilter, setStatusFilter] = useState<string>('All');

  // Super Admin / Platform Data
  const [allCompanies, setAllCompanies] = useState<Company[]>([]);
  const [allUsers, setAllUsers] = useState<AppUser[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [supportTickets, setSupportTickets] = useState<SupportTicket[]>([]);
  const [systemFeatures, setSystemFeatures] = useState<SystemFeature[]>(BUILTIN_SYSTEM_FEATURES);

  // Modals state
  const [isChequeModalOpen, setIsChequeModalOpen] = useState(false);
  const [editingCheque, setEditingCheque] = useState<Cheque | null>(null);

  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [payingCheque, setPayingCheque] = useState<Cheque | null>(null);

  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [selectedCheque, setSelectedCheque] = useState<Cheque | null>(null);

  const [isPartiesModalOpen, setIsPartiesModalOpen] = useState(false);
  const [isBanksModalOpen, setIsBanksModalOpen] = useState(false);

  const [isSeeding, setIsSeeding] = useState(false);
  const [toastMessage, setToastMessage] = useState<{ type: 'success' | 'info' | 'error'; text: string } | null>(null);

  const showToast = (text: string, type: 'success' | 'info' | 'error' = 'success') => {
    setToastMessage({ text, type });
    setTimeout(() => {
      setToastMessage(null);
    }, 4000);
  };

  // 1. Initialize Auth and Test Firestore Connection
  useEffect(() => {
    const unsub = initAuth(async (user) => {
      setCurrentUser(user);
      testConnection();
      if (user && !impersonation?.isImpersonating) {
        try {
          const userCid = await syncUserCompanyProfile(user);
          if (userCid && userCid !== companyId) {
            setCompanyId(userCid);
            setActiveCompanyId(userCid);
          }
        } catch (e) {
          console.warn('Error syncing user company profile:', e);
        }
      }
    });
    return () => unsub();
  }, [impersonation]);

  // 2. Real-time Subscriptions for Super Admin Platform Data & Auto-seed
  useEffect(() => {
    seedSaaSDemoDataIfEmpty().then((seeded) => {
      if (seeded) {
        console.log('SaaS Demo companies and releases initialized.');
      }
    });

    const unsubCompanies = subscribeToCompanies((comps) => setAllCompanies(comps));
    const unsubUsers = subscribeToAllUsers((usrs) => setAllUsers(usrs));
    const unsubLogs = subscribeToAuditLogs((logs) => setAuditLogs(logs));
    const unsubTickets = subscribeToSupportTickets((tix) => setSupportTickets(tix));
    const unsubFeatures = subscribeToFeatureRegistry((feats) => setSystemFeatures(feats));

    return () => {
      unsubCompanies();
      unsubUsers();
      unsubLogs();
      unsubTickets();
      unsubFeatures();
    };
  }, []);

  const handleSignIn = async () => {
    try {
      const user = await signInWithGoogle();
      setCurrentUser(user);
      showToast(`Signed in as ${user.email || 'User'}`, 'success');
    } catch (err: any) {
      console.error('Sign-in error:', err);
      showToast(err?.message || 'Sign in failed', 'error');
    }
  };

  const handleSignOut = async () => {
    try {
      await signOutUser();
      setCurrentUser(null);
      showToast('Signed out successfully', 'info');
    } catch (err: any) {
      console.error('Sign-out error:', err);
    }
  };

  // 3. Real-time Subscriptions for Current Tenant Workspace
  useEffect(() => {
    const unsubParties = subscribeToParties(companyId, (p) => setParties(p));
    const unsubBanks = subscribeToBanks(companyId, (b) => setBanks(b));
    const unsubCheques = subscribeToCheques(companyId, (c) => {
      setCheques(c);
      // Auto-seed if freshly started and completely empty
      if (c.length === 0) {
        seedDemoDataIfEmpty(companyId).then((seeded) => {
          if (seeded) {
            showToast('Loaded sample cheques, banks, and parties!', 'info');
          }
        });
      }
    });

    return () => {
      unsubParties();
      unsubBanks();
      unsubCheques();
    };
  }, [companyId]);

  // Cheque Actions
  const handleCreateCheque = async (input: CreateChequeInput) => {
    await createCheque(input);
    showToast(`Cheque ${input.cheque_number} created successfully.`);
  };

  const handleUpdateCheque = async (id: string, partial: Partial<Cheque>) => {
    await updateCheque(id, partial);
    showToast('Cheque updated successfully.');
  };

  const handleDeleteCheque = async (id: string) => {
    const target = cheques.find((c) => c.id === id);
    if (!confirm(`Are you sure you want to delete cheque ${target?.cheque_number || ''}? This will also delete its payment history.`)) {
      return;
    }
    try {
      await deleteCheque(id);
      showToast('Cheque deleted successfully.');
    } catch (err: any) {
      showToast(err?.message || 'Failed to delete cheque', 'error');
    }
  };

  // Payment Recording
  const handleRecordPayment = async (data: {
    cheque_id: string;
    amount: number;
    payment_mode: any;
    payment_date_bs: string;
    payment_date_ad: string;
    notes?: string;
  }) => {
    const input: RecordPaymentInput = {
      ...data,
      company_id: companyId,
    };
    await recordPayment(input);
    showToast(`Payment of ₹${data.amount} recorded successfully.`);
  };

  // Seed sample data
  const handleSeedData = async () => {
    try {
      setIsSeeding(true);
      await seedDemoDataIfEmpty(companyId);
      showToast('Sample dataset refreshed.', 'success');
    } catch (err: any) {
      showToast(err?.message || 'Error seeding demo data', 'error');
    } finally {
      setIsSeeding(false);
    }
  };

  // Impersonation Support Handlers
  const handleImpersonateCompany = (comp: Company) => {
    const session: ImpersonationSession = {
      isImpersonating: true,
      companyId: comp.id,
      companyName: comp.name,
      companyCode: comp.company_code || '1001',
      originalCompanyId: DEFAULT_COMPANY_ID,
      originalCompanyName: DEFAULT_COMPANY_NAME,
      startedAt: new Date().toISOString(),
    };
    setImpersonation(session);
    setImpersonationSession(session);
    setCompanyId(comp.id);
    setCompanyName(comp.name);
    setActiveCompanyId(comp.id);
    setIsDeveloperPreviewTenant(false);
    showToast(`Entered Live Troubleshooting View for ${comp.name} (#${comp.company_code || '1001'})`, 'info');
  };

  const handleExitSupportMode = () => {
    setImpersonation(null);
    setImpersonationSession(null);
    setIsDeveloperPreviewTenant(false);
    setCompanyId(DEFAULT_COMPANY_ID);
    setCompanyName(DEFAULT_COMPANY_NAME);
    setActiveCompanyId(DEFAULT_COMPANY_ID);
    showToast('Exited support mode. Returned to Super Admin Developer Console.', 'info');
  };

  // Lookup helpers
  const getParty = (partyId?: string | null) => {
    return partyId ? parties.find((p) => p.id === partyId) : null;
  };

  const getBank = (bankId?: string | null) => {
    return bankId ? banks.find((b) => b.id === bankId) : null;
  };

  const pendingCount = cheques.filter((c) => c.status !== 'Cleared').length;
  const partialCount = cheques.filter(
    (c) => c.status === 'Partially Paid' || (c.remaining_amount < c.amount && c.remaining_amount > 0)
  ).length;
  const clearedCount = cheques.filter((c) => c.status === 'Cleared').length;

  const viewTitles: Record<NavView, string> = {
    dashboard: 'Dashboard Overview',
    due_timeline: 'Due Date Timeline',
    issued_log: 'Issued Date Log',
    pending: 'Pending Cheques',
    partial_payments: 'Partial Payments Terminal',
    cleared: 'Cleared Cheques',
    print: 'Print Cheque',
    banks: 'Banks',
    parties: 'Parties',
    company_users: 'Company & Users',
    super_admin: 'Super Admin Console',
    backup_settings: 'Backup & Data Safety Center',
  };

  // Determine if user has Super Admin Developer privileges
  const isSuperAdmin = isUserSuperAdmin(currentUser);

  // =========================================================================
  // VIEW SELECTION & ROLE-BASED PORTAL SEPARATION (Requirement 1)
  // When logged in as "Developer / Super Admin", redirect directly to Developer Console
  // Unless actively impersonating a client company or explicitly previewing tenant
  // =========================================================================
  if (isSuperAdmin && !impersonation?.isImpersonating && !isDeveloperPreviewTenant) {
    return (
      <>
        <DeveloperConsole
          companies={allCompanies}
          users={allUsers}
          auditLogs={auditLogs}
          supportTickets={supportTickets}
          allChequesCount={cheques.length}
          allChequesVolume={cheques.reduce((sum, c) => sum + c.amount, 0)}
          currentUser={currentUser}
          onImpersonateCompany={handleImpersonateCompany}
          onSwitchToTenantView={() => setIsDeveloperPreviewTenant(true)}
          onToast={(text, type) => showToast(text, type)}
          onSignOut={handleSignOut}
        />

        {/* Global Toast */}
        {toastMessage && (
          <div
            id="app-toast-message"
            className="fixed bottom-5 right-5 z-50 flex items-center gap-2 px-4 py-2.5 rounded-xl shadow-lg border text-xs font-semibold bg-white border-slate-200 text-slate-800 transition-all"
          >
            {toastMessage.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-indigo-600 shrink-0" />
            )}
            <span>{toastMessage.text}</span>
          </div>
        )}
      </>
    );
  }

  // =========================================================================
  // TENANT CHEQUEDESK VIEW (Standard Client Dashboard or Support Inspection Mode)
  // =========================================================================
  const inspectedCompany = allCompanies.find((c) => c.id === companyId) || null;
  const activeCompanyCode = inspectedCompany?.company_code || impersonation?.companyCode || '1001';
  const activeCompanyFeatures = inspectedCompany?.features || DEFAULT_COMPANY_FEATURES;
  const isCustomizerEnabled = isCompanyFeatureEnabled('custom_theme_customizer', activeCompanyFeatures);

  // Sync / enforce theme according to active company and its custom_theme_customizer policy
  useEffect(() => {
    const compKey = activeCompanyCode || companyId;
    if (!isCustomizerEnabled) {
      setCurrentTheme(DEFAULT_THEME);
    } else {
      const saved = getSavedTheme(compKey);
      setCurrentTheme(saved);
    }
  }, [companyId, activeCompanyCode, isCustomizerEnabled]);

  const handleThemeChange = (newTheme: ThemeId) => {
    if (!isCustomizerEnabled) return;
    setCurrentTheme(newTheme);
    const compKey = activeCompanyCode || companyId;
    saveTheme(newTheme, compKey);
  };

  const activeTheme = THEMES[currentTheme] || THEMES[DEFAULT_THEME];

  // Resolve dynamic active feature title
  const activeFeatureDef = systemFeatures.find((f) => f.key === currentView);
  const currentHeaderTitle = activeFeatureDef
    ? activeFeatureDef.name
    : viewTitles[currentView] || 'Workspace';

  return (
    <div className={`min-h-screen ${activeTheme.appBg || 'bg-slate-50'} flex flex-col font-sans antialiased text-slate-800 transition-colors duration-300`} id="cheque-app-root">
      {/* 1. Developer Live Troubleshooting Banner if Impersonating (Requirement 3 & 6) */}
      {impersonation?.isImpersonating && (
        <SupportModeBanner
          company={inspectedCompany}
          companyName={companyName}
          companyId={companyId}
          companyCode={impersonation.companyCode}
          auditLogs={auditLogs}
          cheques={cheques}
          parties={parties}
          banks={banks}
          onExitSupportMode={handleExitSupportMode}
          onToast={(msg, type) => showToast(msg, type)}
        />
      )}

      {/* 2. Developer Preview Banner if testing tenant view */}
      {!impersonation?.isImpersonating && isDeveloperPreviewTenant && (
        <div className="bg-slate-900 text-slate-200 px-4 py-2 text-xs flex items-center justify-between border-b border-slate-800 sticky top-0 z-30">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="font-bold text-white">Developer Preview Mode:</span>
            <span className="text-slate-300">Viewing standard ChequeDesk client workspace for {companyName}</span>
          </div>
          <button
            onClick={() => setIsDeveloperPreviewTenant(false)}
            className="inline-flex items-center gap-1.5 px-3 py-1 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg font-bold transition text-xs shadow-xs"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Return to Developer Console</span>
          </button>
        </div>
      )}

      {/* Main Workspace Layout */}
      <div className="flex-1 flex flex-col lg:flex-row min-w-0">
        {/* Persistent Desktop / Drawer Mobile Sidebar with Reactive Feature Deployment */}
        <Sidebar
          currentView={currentView}
          onSelectView={(v) => {
            if (v === 'super_admin') {
              setIsDeveloperPreviewTenant(false);
              return;
            }
            setCurrentView(v);
          }}
          pendingCount={pendingCount}
          partialCount={partialCount}
          clearedCount={clearedCount}
          companyName={companyName}
          currentUser={currentUser}
          onSignIn={handleSignIn}
          onSignOut={handleSignOut}
          isOpenMobile={isMobileMenuOpen}
          onCloseMobile={() => setIsMobileMenuOpen(false)}
          currentTheme={currentTheme}
          onThemeChange={handleThemeChange}
          isSuperAdmin={isSuperAdmin}
          isSupportMode={impersonation?.isImpersonating}
          onExitSupportMode={handleExitSupportMode}
          companyFeatures={activeCompanyFeatures}
          systemFeatures={systemFeatures}
          activeCompanyCode={activeCompanyCode}
        />

        {/* Main Content Area */}
        <div className="flex-1 flex flex-col min-w-0 overflow-x-hidden">
          {/* Top Header */}
          <TopHeader
            currentViewTitle={currentHeaderTitle}
            onOpenMobileMenu={() => setIsMobileMenuOpen(true)}
            onNewCheque={() => {
              if (impersonation?.isImpersonating) {
                showToast('Action disabled: Read-Only Support Inspection Mode active', 'error');
                return;
              }
              setEditingCheque(null);
              setIsChequeModalOpen(true);
            }}
            companyName={companyName}
            companyId={companyId}
            currentUser={currentUser}
            onSeedDemoData={handleSeedData}
            isSeeding={isSeeding}
            onOpenBackupSettings={() => setCurrentView('backup_settings')}
          />

          {/* View Router */}
          <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
            {currentView === 'dashboard' && (
              <div className="space-y-6">
                <StatsCards
                  cheques={cheques}
                  onFilterStatus={(status) => setStatusFilter(status)}
                  activeStatusFilter={statusFilter}
                />
                <ChequeTable
                  cheques={cheques}
                  parties={parties}
                  banks={banks}
                  statusFilter={statusFilter}
                  onStatusFilterChange={(s) => setStatusFilter(s)}
                  onRecordPayment={(cheque) => {
                    setPayingCheque(cheque);
                    setIsPaymentModalOpen(true);
                  }}
                  onViewDetails={(cheque) => {
                    setSelectedCheque(cheque);
                    setIsDetailModalOpen(true);
                  }}
                  onEditCheque={(cheque) => {
                    setEditingCheque(cheque);
                    setIsChequeModalOpen(true);
                  }}
                  onDeleteCheque={handleDeleteCheque}
                  onNewCheque={() => {
                    setEditingCheque(null);
                    setIsChequeModalOpen(true);
                  }}
                />
              </div>
            )}

            {currentView === 'due_timeline' && (
              <DueDateTimeline
                cheques={cheques}
                parties={parties}
                banks={banks}
                companyName={companyName}
                onRecordPayment={(cheque) => {
                  setPayingCheque(cheque);
                  setIsPaymentModalOpen(true);
                }}
                onViewDetails={(cheque) => {
                  setSelectedCheque(cheque);
                  setIsDetailModalOpen(true);
                }}
                onEditCheque={(cheque) => {
                  setEditingCheque(cheque);
                  setIsChequeModalOpen(true);
                }}
                onDeleteCheque={handleDeleteCheque}
                onNewCheque={() => {
                  setEditingCheque(null);
                  setIsChequeModalOpen(true);
                }}
              />
            )}

            {currentView === 'issued_log' && (
              <IssuedDateLog
                cheques={cheques}
                parties={parties}
                banks={banks}
                companyName={companyName}
                onRecordPayment={(cheque) => {
                  setPayingCheque(cheque);
                  setIsPaymentModalOpen(true);
                }}
                onViewDetails={(cheque) => {
                  setSelectedCheque(cheque);
                  setIsDetailModalOpen(true);
                }}
                onEditCheque={(cheque) => {
                  setEditingCheque(cheque);
                  setIsChequeModalOpen(true);
                }}
                onDeleteCheque={handleDeleteCheque}
                onNewCheque={() => {
                  setEditingCheque(null);
                  setIsChequeModalOpen(true);
                }}
              />
            )}

            {currentView === 'pending' && (
              <PendingChequesView
                cheques={cheques}
                parties={parties}
                banks={banks}
                companyName={companyName}
                onRecordPayment={(cheque) => {
                  setPayingCheque(cheque);
                  setIsPaymentModalOpen(true);
                }}
                onViewDetails={(cheque) => {
                  setSelectedCheque(cheque);
                  setIsDetailModalOpen(true);
                }}
                onEditCheque={(cheque) => {
                  setEditingCheque(cheque);
                  setIsChequeModalOpen(true);
                }}
                onDeleteCheque={handleDeleteCheque}
                onNewCheque={() => {
                  setEditingCheque(null);
                  setIsChequeModalOpen(true);
                }}
              />
            )}

            {currentView === 'partial_payments' && (
              <PartialPaymentsView
                cheques={cheques}
                parties={parties}
                banks={banks}
                companyId={companyId}
                companyName={companyName}
                initialSelectedChequeId={payingCheque?.id || null}
                onOpenNewCheque={() => {
                  setEditingCheque(null);
                  setIsChequeModalOpen(true);
                }}
              />
            )}

            {currentView === 'cleared' && (
              <ClearedChequesView
                cheques={cheques}
                parties={parties}
                banks={banks}
                companyName={companyName}
                onViewDetails={(cheque) => {
                  setSelectedCheque(cheque);
                  setIsDetailModalOpen(true);
                }}
                onEditCheque={(cheque) => {
                  setEditingCheque(cheque);
                  setIsChequeModalOpen(true);
                }}
                onDeleteCheque={handleDeleteCheque}
              />
            )}

            {currentView === 'print' && (
              <PrintChequeView
                cheques={cheques}
                parties={parties}
                banks={banks}
                onRecordPayment={(cheque) => {
                  setPayingCheque(cheque);
                  setIsPaymentModalOpen(true);
                }}
                onViewDetails={(cheque) => {
                  setSelectedCheque(cheque);
                  setIsDetailModalOpen(true);
                }}
              />
            )}

            {currentView === 'banks' && (
              <BanksView
                banks={banks}
                cheques={cheques}
                companyId={companyId}
                companyName={companyName}
                onRecordPayment={(cheque) => {
                  setPayingCheque(cheque);
                  setIsPaymentModalOpen(true);
                }}
                onViewDetails={(cheque) => {
                  setSelectedCheque(cheque);
                  setIsDetailModalOpen(true);
                }}
              />
            )}

            {currentView === 'parties' && (
              <PartiesView
                parties={parties}
                cheques={cheques}
                companyId={companyId}
                companyName={companyName}
                onRecordPayment={(cheque) => {
                  setPayingCheque(cheque);
                  setIsPaymentModalOpen(true);
                }}
                onViewDetails={(cheque) => {
                  setSelectedCheque(cheque);
                  setIsDetailModalOpen(true);
                }}
              />
            )}

            {currentView === 'company_users' && (
              <CompanyUsersView
                companyId={companyId}
                companyName={companyName}
                onCompanyChange={(id, name) => {
                  setCompanyId(id);
                  setCompanyName(name);
                }}
                currentUser={currentUser}
                onSignIn={handleSignIn}
                onSignOut={handleSignOut}
                onSeedDemoData={handleSeedData}
                isSeeding={isSeeding}
                partiesCount={parties.length}
                banksCount={banks.length}
                chequesCount={cheques.length}
              />
            )}

            {/* ================================================================= */}
            {/* DYNAMIC FEATURE REGISTRY VIEWS (Instant Activation & Revocation) */}
            {/* ================================================================= */}
            {currentView === 'sms_notifications' && (
              isCompanyFeatureEnabled('sms_notifications', activeCompanyFeatures) ? (
                <SmsNotificationsView
                  companyId={companyId}
                  companyName={companyName}
                  cheques={cheques}
                  parties={parties}
                />
              ) : (
                <FeatureDisabledBanner
                  featureName="SMS & WhatsApp Alerts"
                  onGoToDashboard={() => setCurrentView('dashboard')}
                />
              )
            )}

            {currentView === 'advanced_reports' && (
              isCompanyFeatureEnabled('advanced_reports', activeCompanyFeatures) ? (
                <AdvancedReportsView
                  cheques={cheques}
                  parties={parties}
                  banks={banks}
                  companyName={companyName}
                />
              ) : (
                <FeatureDisabledBanner
                  featureName="Advanced Reports & Financial Forecasts"
                  onGoToDashboard={() => setCurrentView('dashboard')}
                />
              )
            )}

            {currentView === 'bulk_cheque_import' && (
              isCompanyFeatureEnabled('bulk_cheque_import', activeCompanyFeatures) ? (
                <BulkChequeImportView
                  companyId={companyId}
                  companyName={companyName}
                  banks={banks}
                  parties={parties}
                  onSuccess={() => {
                    showToast('Bulk cheques imported into ledger!', 'success');
                    setCurrentView('pending');
                  }}
                />
              ) : (
                <FeatureDisabledBanner
                  featureName="Bulk Cheque Import & Migration"
                  onGoToDashboard={() => setCurrentView('dashboard')}
                />
              )
            )}

            {currentView === 'connectips_gateway' && (
              isCompanyFeatureEnabled('connectips_gateway', activeCompanyFeatures) ? (
                <ConnectIpsGatewayView
                  companyName={companyName}
                  companyCode={inspectedCompany?.company_code}
                  cheques={cheques}
                />
              ) : (
                <FeatureDisabledBanner
                  featureName="ConnectIPS Electronic Clearing Gateway"
                  onGoToDashboard={() => setCurrentView('dashboard')}
                />
              )
            )}

            {currentView === 'backup_settings' && (
              isCompanyFeatureEnabled('offline_backup_system', activeCompanyFeatures) ||
              isCompanyFeatureEnabled('backup_settings', activeCompanyFeatures) ? (
                <BackupSettingsView
                  companyId={companyId}
                  companyName={companyName}
                  onToast={(msg, type) => showToast(msg, type || 'info')}
                  onRefreshData={() => {
                    showToast('Ledger database refreshed from local storage', 'info');
                  }}
                />
              ) : (
                <FeatureDisabledBanner
                  featureName="Backup & Data Safety Engine"
                  onGoToDashboard={() => setCurrentView('dashboard')}
                />
              )
            )}

            {/* Any custom or dynamically discovered module from systemFeatures */}
            {activeFeatureDef &&
              ![
                'sms_notifications',
                'sms_whatsapp_alerts',
                'advanced_reports',
                'bulk_cheque_import',
                'connectips_gateway',
                'backup_settings',
                'offline_backup_system',
                'cheque_printing',
                'partial_payments',
                'nepali_bs_calendar',
                'bank_reconciliation',
                'audit_logs',
                'multi_user_rbac',
                'export_reports',
                'dashboard',
                'due_timeline',
                'issued_log',
                'pending',
                'cleared',
                'print',
                'banks',
                'parties',
                'company_users',
              ].includes(currentView) && (
                isCompanyFeatureEnabled(currentView, activeCompanyFeatures) ? (
                  <DynamicModulePlaceholderView
                    feature={activeFeatureDef}
                    companyName={companyName}
                    companyCode={inspectedCompany?.company_code}
                  />
                ) : (
                  <FeatureDisabledBanner
                    featureName={activeFeatureDef.name}
                    onGoToDashboard={() => setCurrentView('dashboard')}
                  />
                )
              )}
          </main>
        </div>
      </div>

      {/* Toast notification banner */}
      {toastMessage && (
        <div
          id="app-toast-message"
          className="fixed bottom-5 right-5 z-50 flex items-center gap-2 px-4 py-2.5 rounded-xl shadow-lg border text-xs font-semibold bg-white border-slate-200 text-slate-800 transition-all"
        >
          {toastMessage.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          ) : (
            <AlertCircle className="w-4 h-4 text-indigo-600 shrink-0" />
          )}
          <span>{toastMessage.text}</span>
        </div>
      )}

      {/* Modal: New / Edit Cheque */}
      <ChequeModal
        isOpen={isChequeModalOpen}
        onClose={() => {
          setIsChequeModalOpen(false);
          setEditingCheque(null);
        }}
        onSubmit={handleCreateCheque}
        onUpdate={handleUpdateCheque}
        initialCheque={editingCheque}
        parties={parties}
        banks={banks}
        onOpenNewParty={() => setIsPartiesModalOpen(true)}
        onOpenNewBank={() => setIsBanksModalOpen(true)}
        companyId={companyId}
      />

      {/* Modal: Record Payment */}
      <PaymentModal
        isOpen={isPaymentModalOpen}
        onClose={() => {
          setIsPaymentModalOpen(false);
          setPayingCheque(null);
        }}
        cheque={payingCheque}
        party={getParty(payingCheque?.party_id)}
        bank={getBank(payingCheque?.bank_id)}
        onSubmit={handleRecordPayment}
      />

      {/* Modal: Cheque Details & Payment Logs */}
      <ChequeDetailModal
        isOpen={isDetailModalOpen}
        onClose={() => {
          setIsDetailModalOpen(false);
          setSelectedCheque(null);
        }}
        cheque={selectedCheque ? cheques.find((c) => c.id === selectedCheque.id) || selectedCheque : null}
        party={getParty(selectedCheque?.party_id)}
        bank={getBank(selectedCheque?.bank_id)}
        onOpenPayment={(chq) => {
          setIsDetailModalOpen(false);
          setPayingCheque(chq);
          setIsPaymentModalOpen(true);
        }}
      />

      {/* Modal: Parties Manager */}
      <PartiesModal
        isOpen={isPartiesModalOpen}
        onClose={() => setIsPartiesModalOpen(false)}
        parties={parties}
        cheques={cheques}
        companyId={companyId}
      />

      {/* Modal: Banks Manager */}
      <BanksModal
        isOpen={isBanksModalOpen}
        onClose={() => setIsBanksModalOpen(false)}
        banks={banks}
        cheques={cheques}
        companyId={companyId}
      />
    </div>
  );
}

// Visual banner displayed when tenant navigates to an unprovisioned or disabled module
const FeatureDisabledBanner: React.FC<{
  featureName: string;
  onGoToDashboard: () => void;
}> = ({ featureName, onGoToDashboard }) => (
  <div className="max-w-xl mx-auto py-16 px-6 text-center space-y-4 animate-in fade-in duration-150">
    <div className="w-16 h-16 rounded-2xl bg-amber-500/10 text-amber-600 border border-amber-500/20 flex items-center justify-center mx-auto shadow-xs">
      <Lock className="w-8 h-8" />
    </div>
    <div className="space-y-1">
      <h2 className="text-xl font-bold text-slate-900 tracking-tight">Module Not Activated</h2>
      <p className="text-xs text-slate-500 max-w-md mx-auto leading-relaxed">
        <span className="font-semibold text-slate-800">"{featureName}"</span> is currently disabled for this tenant profile.
        A Super Admin can instantly activate it from the Developer Console without requiring code redeployment.
      </p>
    </div>
    <div className="pt-2">
      <button
        onClick={onGoToDashboard}
        className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition shadow-xs"
      >
        Return to Dashboard Overview
      </button>
    </div>
  </div>
);

