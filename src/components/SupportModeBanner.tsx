import React, { useState } from 'react';
import {
  ShieldAlert,
  ArrowLeft,
  Eye,
  Lock,
  Sliders,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Database,
  Activity,
  ChevronDown,
  ChevronUp,
  Sparkles,
} from 'lucide-react';
import { Company, CompanyFeatures, AuditLog, Cheque, Party, Bank } from '../types';
import { updateCompanyFeatures } from '../lib/adminService';

interface SupportModeBannerProps {
  company: Company | null;
  companyName: string;
  companyId: string;
  companyCode?: string;
  auditLogs?: AuditLog[];
  cheques?: Cheque[];
  parties?: Party[];
  banks?: Bank[];
  onExitSupportMode: () => void;
  onToast?: (msg: string, type?: 'success' | 'info' | 'error') => void;
}

export const SupportModeBanner: React.FC<SupportModeBannerProps> = ({
  company,
  companyName,
  companyId,
  companyCode,
  auditLogs = [],
  cheques = [],
  parties = [],
  banks = [],
  onExitSupportMode,
  onToast,
}) => {
  const [isInspectorOpen, setIsInspectorOpen] = useState(false);
  const [activeSubTab, setActiveSubTab] = useState<'features' | 'logs' | 'health'>('features');
  const [localFeatures, setLocalFeatures] = useState<CompanyFeatures | null>(
    company?.features || null
  );
  const [isSavingFeature, setIsSavingFeature] = useState(false);

  const displayCode = companyCode || company?.company_code || '1001';

  // Filter audit logs for this specific company
  const companyLogs = auditLogs.filter(
    (l) => l.company_id === companyId || l.company_name.toLowerCase() === companyName.toLowerCase()
  );

  const handleToggleFeature = async (key: keyof CompanyFeatures) => {
    if (!company) return;
    const current = localFeatures || company.features;
    if (!current) return;

    const nextFeatures: CompanyFeatures = {
      ...current,
      [key]: !current[key],
    };
    setLocalFeatures(nextFeatures);

    try {
      setIsSavingFeature(true);
      await updateCompanyFeatures(company.id, company.name, nextFeatures);
      if (onToast) {
        onToast(`Toggled ${String(key).replace(/_/g, ' ')} ${nextFeatures[key] ? 'ON [✓]' : 'OFF [✗]'} for #${displayCode}`, 'success');
      }
    } catch (err: any) {
      if (onToast) onToast(err?.message || 'Failed to update feature', 'error');
    } finally {
      setIsSavingFeature(false);
    }
  };

  const featureList: Array<{ key: keyof CompanyFeatures; label: string; desc: string }> = [
    { key: 'cheque_printing', label: 'Cheque Leaf Printing', desc: 'Custom Payee Print Layouts & A4/Dot-Matrix' },
    { key: 'partial_payments', label: 'Partial Payments Terminal', desc: 'Split Installments & Voucher Entries' },
    { key: 'nepali_bs_calendar', label: 'Nepali BS Dual Calendar', desc: 'Bikram Sambat 32-day sync engine' },
    { key: 'bank_reconciliation', label: 'Bank Reconciliation', desc: 'Multi-account balance ledger tracking' },
    { key: 'sms_whatsapp_alerts', label: 'SMS & WhatsApp Reminders', desc: 'Auto-dispatch overdue alerts to parties' },
    { key: 'audit_logs', label: 'Security & Audit Logs', desc: 'User activity and tamper detection' },
    { key: 'multi_user_rbac', label: 'Multi-User RBAC', desc: 'Staff and accountant access roles' },
    { key: 'export_reports', label: 'Reports & Ledger Export', desc: 'Excel, PDF, and CSV tax summaries' },
    { key: 'custom_theme_customizer', label: 'Custom Theme Customizer', desc: '10 eye-friendly dark and light visual palettes' },
  ];

  return (
    <div className="sticky top-0 z-40">
      {/* Primary Banner */}
      <aside
        id="support-mode-banner"
        aria-label="Developer Support Mode Active"
        className="bg-gradient-to-r from-amber-700 via-amber-800 to-orange-900 text-white px-4 py-2 shadow-lg border-b border-amber-600/60 transition-all"
      >
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-2.5 text-xs">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-black/30 flex items-center justify-center shrink-0 border border-white/20">
              <Eye className="w-4 h-4 text-amber-300" />
            </div>
            <div>
              <div className="flex items-center flex-wrap gap-2">
                <span className="font-bold tracking-wide uppercase text-[10px] bg-black/40 px-2 py-0.5 rounded-full border border-amber-400/50 text-amber-300">
                  DEVELOPER SUPPORT VIEW • READ-ONLY
                </span>
                <span className="font-bold text-white text-xs sm:text-sm">
                  Inspecting: {companyName}
                </span>
                <span className="font-mono text-xs font-bold px-2 py-0.5 bg-amber-400 text-amber-950 rounded-md shadow-2xs">
                  Code: #{displayCode}
                </span>
              </div>
              <p className="text-[11px] text-amber-200/90 flex items-center gap-1.5 mt-0.5">
                <Lock className="w-3 h-3 text-amber-300 inline shrink-0" />
                <span>Client mutating operations locked. Direct diagnosis & permissions active.</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {/* Toggle Troubleshooting Inspector Drawer */}
            <button
              onClick={() => setIsInspectorOpen(!isInspectorOpen)}
              id="btn-toggle-troubleshooting"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-amber-900/80 hover:bg-amber-900 text-amber-100 border border-amber-500/50 font-bold rounded-lg transition text-xs shadow-2xs"
            >
              <Sliders className="w-3.5 h-3.5 text-amber-300" />
              <span>{isInspectorOpen ? 'Hide Debug Inspector' : 'Live Troubleshooting View'}</span>
              {isInspectorOpen ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </button>

            {/* Exit Button */}
            <button
              onClick={onExitSupportMode}
              id="btn-exit-support-mode"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white text-amber-950 hover:bg-amber-50 font-bold rounded-lg transition shadow-xs text-xs"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Exit to Developer Console</span>
            </button>
          </div>
        </div>
      </aside>

      {/* Developer Live Troubleshooting Drawer */}
      {isInspectorOpen && (
        <div
          id="developer-troubleshooting-drawer"
          className="bg-slate-900 text-slate-100 border-b border-slate-700 shadow-2xl p-4 sm:p-5 text-xs animate-in slide-in-from-top duration-150"
        >
          <div className="max-w-7xl mx-auto space-y-4">
            {/* Top Sub-nav */}
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-md bg-indigo-500/20 text-indigo-400 flex items-center justify-center">
                  <Activity className="w-3.5 h-3.5" />
                </div>
                <span className="font-bold text-slate-200 text-sm">
                  Live Troubleshooting Panel for #{displayCode}
                </span>
              </div>

              <div className="flex items-center gap-1 bg-slate-800/80 p-1 rounded-lg border border-slate-700">
                <button
                  onClick={() => setActiveSubTab('features')}
                  className={`px-3 py-1 rounded-md text-xs font-bold transition ${
                    activeSubTab === 'features'
                      ? 'bg-indigo-600 text-white'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Feature Permissions (Tick Marks)
                </button>
                <button
                  onClick={() => setActiveSubTab('logs')}
                  className={`px-3 py-1 rounded-md text-xs font-bold transition ${
                    activeSubTab === 'logs'
                      ? 'bg-indigo-600 text-white'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Real-time Error Logs ({companyLogs.length})
                </button>
                <button
                  onClick={() => setActiveSubTab('health')}
                  className={`px-3 py-1 rounded-md text-xs font-bold transition ${
                    activeSubTab === 'health'
                      ? 'bg-indigo-600 text-white'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Data Diagnostics
                </button>
              </div>
            </div>

            {/* SubTab 1: Feature Permissions with Instant Toggles */}
            {activeSubTab === 'features' && (
              <div className="space-y-3">
                <div className="flex items-center justify-between text-slate-400 text-xs">
                  <p>
                    Developer Quick-Fix: Click any toggle to turn feature ON/OFF immediately without password or logout.
                  </p>
                  <span className="text-[11px] text-amber-400">
                    Live Bound to Company #{displayCode}
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                  {featureList.map((f) => {
                    const active = localFeatures ? Boolean(localFeatures[f.key]) : true;

                    return (
                      <div
                        key={f.key}
                        onClick={() => handleToggleFeature(f.key)}
                        className={`p-3 rounded-xl border cursor-pointer transition flex items-start justify-between gap-2 ${
                          active
                            ? 'bg-slate-800/90 border-emerald-500/40 hover:border-emerald-400'
                            : 'bg-slate-900 border-slate-800 hover:border-slate-700 opacity-60'
                        }`}
                      >
                        <div className="min-w-0">
                          <div className="font-bold text-slate-200 text-xs flex items-center gap-1.5">
                            {active ? (
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                            ) : (
                              <XCircle className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                            )}
                            <span className="truncate">{f.label}</span>
                          </div>
                          <p className="text-[10px] text-slate-400 mt-1 line-clamp-2">{f.desc}</p>
                        </div>

                        <span
                          className={`shrink-0 px-2 py-0.5 rounded-full text-[9px] font-bold ${
                            active
                              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                              : 'bg-slate-800 text-slate-400'
                          }`}
                        >
                          {active ? 'ON [✓]' : 'OFF [✗]'}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* SubTab 2: Real-time Error Logs & System Activity */}
            {activeSubTab === 'logs' && (
              <div className="space-y-2">
                <div className="text-slate-400 text-xs flex items-center justify-between">
                  <span>Recent audit events, validation warnings, and errors for Company #{displayCode}</span>
                  <span className="font-mono text-[11px] text-slate-400">{companyLogs.length} events logged</span>
                </div>

                <div className="bg-slate-950 rounded-xl border border-slate-800 max-h-48 overflow-y-auto divide-y divide-slate-800/80 p-2 font-mono text-[11px]">
                  {companyLogs.length === 0 ? (
                    <div className="p-4 text-center text-slate-500">
                      No errors or security warnings recorded for Company #{displayCode}.
                    </div>
                  ) : (
                    companyLogs.map((log) => (
                      <div key={log.id} className="p-2 flex items-start gap-3 hover:bg-slate-900/60 rounded-md">
                        <div
                          className={`w-5 h-5 rounded-md flex items-center justify-center shrink-0 mt-0.5 ${
                            log.severity === 'error'
                              ? 'bg-rose-500/20 text-rose-400'
                              : log.severity === 'warning'
                              ? 'bg-amber-500/20 text-amber-400'
                              : 'bg-blue-500/20 text-blue-400'
                          }`}
                        >
                          {log.severity === 'error' ? (
                            <AlertTriangle className="w-3 h-3" />
                          ) : (
                            <Activity className="w-3 h-3" />
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <span className="text-indigo-400 font-bold">[{log.event_type}]</span>
                            <span className="text-slate-400 truncate">{log.user_email}</span>
                            <span className="text-slate-600 text-[10px] ml-auto">
                              {new Date(log.timestamp).toLocaleTimeString()}
                            </span>
                          </div>
                          <div className="text-slate-300 mt-0.5">{log.details}</div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}

            {/* SubTab 3: Data Diagnostics */}
            {activeSubTab === 'health' && (
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 text-xs">
                <div className="bg-slate-800/80 p-3 rounded-xl border border-slate-700">
                  <div className="text-slate-400 text-[11px]">Cheques Count</div>
                  <div className="text-lg font-bold text-white mt-1">{cheques.length} Cheques</div>
                  <div className="text-[10px] text-slate-400 mt-0.5">
                    {cheques.filter((c) => c.status === 'Cleared').length} Cleared •{' '}
                    {cheques.filter((c) => c.status !== 'Cleared').length} Pending
                  </div>
                </div>

                <div className="bg-slate-800/80 p-3 rounded-xl border border-slate-700">
                  <div className="text-slate-400 text-[11px]">Linked Parties</div>
                  <div className="text-lg font-bold text-white mt-1">{parties.length} Parties</div>
                  <div className="text-[10px] text-slate-400 mt-0.5">Assigned vendors and clients</div>
                </div>

                <div className="bg-slate-800/80 p-3 rounded-xl border border-slate-700">
                  <div className="text-slate-400 text-[11px]">Configured Banks</div>
                  <div className="text-lg font-bold text-white mt-1">{banks.length} Accounts</div>
                  <div className="text-[10px] text-slate-400 mt-0.5">Primary clearing banks</div>
                </div>

                <div className="bg-slate-800/80 p-3 rounded-xl border border-slate-700">
                  <div className="text-slate-400 text-[11px]">Isolation Check</div>
                  <div className="text-lg font-bold text-emerald-400 mt-1 flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Strictly Isolated</span>
                  </div>
                  <div className="text-[10px] text-slate-400 mt-0.5 font-mono">
                    ID: {companyId}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
