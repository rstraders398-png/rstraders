import React, { useMemo, useState } from 'react';
import {
  Wallet,
  LayoutDashboard,
  CalendarDays,
  CalendarCheck,
  Clock,
  Receipt,
  CheckCircle2,
  Printer,
  Landmark,
  Users,
  Building,
  ShieldCheck,
  Palette,
  X,
  User as UserIcon,
  Eye,
  Smartphone,
  BarChart3,
  FileSpreadsheet,
  Layers,
  Sparkles,
  FileText,
  Sliders,
  Lock,
  Check,
  HardDrive,
} from 'lucide-react';
import { User } from 'firebase/auth';
import { THEMES, ThemeId, ORDERED_THEMES, DEFAULT_THEME, resolveThemeId } from '../lib/theme';
import { CompanyFeatures, SystemFeature } from '../types';
import { isCompanyFeatureEnabled } from '../lib/featureRegistry';

export type NavView =
  | 'dashboard'
  | 'due_timeline'
  | 'issued_log'
  | 'pending'
  | 'partial_payments'
  | 'cleared'
  | 'print'
  | 'banks'
  | 'parties'
  | 'company_users'
  | 'super_admin'
  | 'sms_notifications'
  | 'advanced_reports'
  | 'bulk_cheque_import'
  | 'connectips_gateway'
  | string;

interface SidebarProps {
  currentView: NavView;
  onSelectView: (view: NavView) => void;
  pendingCount?: number;
  partialCount?: number;
  clearedCount?: number;
  companyName: string;
  currentUser?: User | null;
  onSignIn?: () => void;
  onSignOut?: () => void;
  isOpenMobile: boolean;
  onCloseMobile: () => void;
  currentTheme?: ThemeId;
  onThemeChange?: (theme: ThemeId) => void;
  isSuperAdmin?: boolean;
  isSupportMode?: boolean;
  onExitSupportMode?: () => void;
  companyFeatures?: CompanyFeatures;
  systemFeatures?: SystemFeature[];
  activeCompanyCode?: string;
}

const getFeatureIcon = (iconName?: string) => {
  switch (iconName) {
    case 'Smartphone':
      return Smartphone;
    case 'BarChart3':
      return BarChart3;
    case 'FileSpreadsheet':
      return FileSpreadsheet;
    case 'Layers':
      return Layers;
    case 'ShieldCheck':
      return ShieldCheck;
    case 'Printer':
      return Printer;
    case 'CalendarDays':
      return CalendarDays;
    case 'Landmark':
      return Landmark;
    case 'Users':
      return Users;
    case 'FileText':
      return FileText;
    default:
      return Sparkles;
  }
};

export const Sidebar: React.FC<SidebarProps> = ({
  currentView,
  onSelectView,
  pendingCount = 0,
  partialCount = 0,
  clearedCount = 0,
  companyName,
  currentUser,
  onSignIn,
  onSignOut,
  isOpenMobile,
  onCloseMobile,
  currentTheme = 'forest',
  onThemeChange,
  isSuperAdmin = true,
  isSupportMode = false,
  onExitSupportMode,
  companyFeatures,
  systemFeatures,
  activeCompanyCode,
}) => {
  const [isThemeGalleryOpen, setIsThemeGalleryOpen] = useState(false);
  const isThemeCustomizerEnabled = isCompanyFeatureEnabled('custom_theme_customizer', companyFeatures);
  const currentCanonical = resolveThemeId(currentTheme);
  const theme = THEMES[currentTheme] || THEMES[DEFAULT_THEME];

  // Reactively compute menu items according to company's active features
  const menuItems = useMemo(() => {
    const items: {
      id: NavView;
      label: string;
      icon: React.ComponentType<{ className?: string }>;
      badge?: number | string;
      badgeColor?: 'amber' | 'blue' | 'emerald' | 'indigo' | 'purple';
      isAddon?: boolean;
    }[] = [
      {
        id: 'dashboard',
        label: 'Dashboard',
        icon: LayoutDashboard,
      },
      {
        id: 'due_timeline',
        label: 'Due Date Timeline',
        icon: CalendarDays,
      },
      {
        id: 'issued_log',
        label: 'Issued Date Log',
        icon: CalendarCheck,
      },
      {
        id: 'pending',
        label: 'Pending Cheques',
        icon: Clock,
        badge: pendingCount > 0 ? pendingCount : undefined,
        badgeColor: 'amber',
      },
    ];

    // Feature: Partial Payments
    if (companyFeatures?.partial_payments !== false) {
      items.push({
        id: 'partial_payments',
        label: 'Partial Payments',
        icon: Receipt,
        badge: partialCount > 0 ? partialCount : undefined,
        badgeColor: 'blue',
      });
    }

    items.push({
      id: 'cleared',
      label: 'Cleared Cheques',
      icon: CheckCircle2,
      badge: clearedCount > 0 ? clearedCount : undefined,
      badgeColor: 'emerald',
    });

    // Feature: Cheque Printing
    if (companyFeatures?.cheque_printing !== false) {
      items.push({
        id: 'print',
        label: 'Print Cheque',
        icon: Printer,
      });
    }

    // Feature: Bank Reconciliation
    if (companyFeatures?.bank_reconciliation !== false) {
      items.push({
        id: 'banks',
        label: 'Banks',
        icon: Landmark,
      });
    }

    items.push({
      id: 'parties',
      label: 'Parties',
      icon: Users,
    });

    // Feature: Multi User RBAC
    if (companyFeatures?.multi_user_rbac !== false) {
      items.push({
        id: 'company_users',
        label: 'Company & Users',
        icon: Building,
      });
    }

    // Dynamic Module: SMS Notifications
    const isSmsActive = Boolean(
      companyFeatures?.sms_notifications || companyFeatures?.sms_whatsapp_alerts
    );
    if (isSmsActive) {
      items.push({
        id: 'sms_notifications',
        label: 'SMS & WhatsApp Alerts',
        icon: Smartphone,
        badge: 'LIVE',
        badgeColor: 'emerald',
        isAddon: true,
      });
    }

    // Dynamic Module: Advanced Reports
    if (companyFeatures?.advanced_reports === true) {
      items.push({
        id: 'advanced_reports',
        label: 'Advanced Reports & Forecast',
        icon: BarChart3,
        badge: 'v2.4',
        badgeColor: 'indigo',
        isAddon: true,
      });
    }

    // Dynamic Module: Bulk Cheque Import (Excel / CSV)
    if (companyFeatures?.bulk_cheque_import !== false) {
      items.push({
        id: 'bulk_cheque_import',
        label: 'Import Cheques (Excel/CSV)',
        icon: FileSpreadsheet,
        badge: 'Excel/CSV',
        badgeColor: 'purple',
      });
    }

    // Dynamic Module: ConnectIPS Electronic Gateway
    if (companyFeatures?.connectips_gateway === true) {
      items.push({
        id: 'connectips_gateway',
        label: 'ConnectIPS Gateway',
        icon: Layers,
        badge: 'NCHL',
        badgeColor: 'indigo',
        isAddon: true,
      });
    }

    // Dynamic Module: Offline-First Desktop & Multi-Destination Backup System
    if (
      isCompanyFeatureEnabled(companyFeatures, 'offline_backup_system') ||
      isCompanyFeatureEnabled(companyFeatures, 'backup_settings')
    ) {
      items.push({
        id: 'backup_settings',
        label: 'Backup & Data Safety',
        icon: HardDrive,
        badge: 'Offline',
        badgeColor: 'emerald',
        isAddon: true,
      });
    }

    // Any other dynamically registered custom features from the system registry
    const coreKeys = new Set([
      'cheque_printing',
      'partial_payments',
      'nepali_bs_calendar',
      'bank_reconciliation',
      'audit_logs',
      'multi_user_rbac',
      'export_reports',
      'sms_notifications',
      'sms_whatsapp_alerts',
      'advanced_reports',
      'bulk_cheque_import',
      'connectips_gateway',
      'custom_theme_customizer',
      'offline_backup_system',
      'backup_settings',
    ]);

    if (systemFeatures) {
      systemFeatures.forEach((feat) => {
        if (!coreKeys.has(feat.key) && Boolean(companyFeatures?.[feat.key])) {
          items.push({
            id: feat.key,
            label: feat.name,
            icon: getFeatureIcon(feat.icon),
            badge: feat.badge || 'ACTIVE',
            badgeColor: 'emerald',
            isAddon: true,
          });
        }
      });
    }

    return items;
  }, [pendingCount, partialCount, clearedCount, companyFeatures, systemFeatures]);

  const handleItemClick = (id: NavView) => {
    onSelectView(id);
    onCloseMobile();
  };

  const sidebarContent = (
    <div className={`flex flex-col h-full ${theme.sidebarBg} text-white select-none transition-colors duration-300`}>
      {/* Brand Header */}
      <div className={`p-5 pb-4 border-b ${theme.sidebarBorder} flex items-center justify-between`}>
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-xl ${theme.headerIconBg} flex items-center justify-center text-white shadow-md shadow-black/20 shrink-0`}>
            <Wallet className="w-5 h-5" />
          </div>
          <div>
            <h1 className="font-bold text-lg leading-tight text-white tracking-tight flex items-center gap-1.5">
              <span>ChequeDesk</span>
            </h1>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className="text-[10px] text-white/60 font-mono">
                #{activeCompanyCode || '1001'}
              </span>
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
              <span className="text-[10px] text-white/70 font-medium truncate max-w-[100px]">
                {companyName}
              </span>
            </div>
          </div>
        </div>

        {/* Mobile close button */}
        <button
          onClick={onCloseMobile}
          className="lg:hidden p-1.5 text-white/60 hover:text-white hover:bg-white/10 rounded-lg transition"
          aria-label="Close sidebar"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Navigation List */}
      <div className="flex-1 py-4 px-3 space-y-1 overflow-y-auto">
        {/* Support Mode Notification if active */}
        {isSupportMode && (
          <div className="p-2.5 mb-2 rounded-xl bg-amber-950/70 border border-amber-500/50 space-y-1.5 shadow-xs">
            <div className="flex items-center gap-1.5 text-[11px] font-bold text-amber-300">
              <Eye className="w-3.5 h-3.5 text-amber-300 shrink-0" />
              <span>Support View Active</span>
            </div>
            <p className="text-[10px] text-amber-100/80 leading-tight">
              Viewing company as Super Admin impersonator.
            </p>
            {onExitSupportMode && (
              <button
                onClick={onExitSupportMode}
                className="w-full py-1 text-[10px] font-bold rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 transition shadow-2xs"
              >
                Return to Master Console
              </button>
            )}
          </div>
        )}

        {/* Super Admin Switcher button */}
        {isSuperAdmin && !isSupportMode && (
          <div className="pb-2 border-b border-white/10 mb-2">
            <button
              onClick={() => handleItemClick('super_admin')}
              id="sidebar-nav-super-admin"
              className={`w-full flex items-center justify-between px-3 py-2 text-xs transition-all ${
                currentView === 'super_admin'
                  ? 'rounded-full bg-gradient-to-r from-amber-500 to-orange-600 text-white font-bold shadow-md'
                  : 'text-amber-200/90 hover:text-white hover:bg-amber-500/20 rounded-xl border border-amber-400/30'
              }`}
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <ShieldCheck className="w-4 h-4 text-amber-300 shrink-0" />
                <span className="truncate font-semibold">Super Admin Panel</span>
              </div>
              <span className="text-[9px] font-extrabold px-1.5 py-0.5 rounded-sm bg-amber-400/30 text-amber-100 border border-amber-400/40 font-mono">
                MASTER
              </span>
            </button>
          </div>
        )}

        {/* Dynamic menu items */}
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentView === item.id;

          return (
            <button
              key={item.id}
              onClick={() => handleItemClick(item.id)}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 text-xs transition-all ${
                isActive
                  ? `rounded-full ${theme.activeCapsule}`
                  : 'text-white/80 hover:text-white hover:bg-white/10 rounded-xl'
              }`}
            >
              <div className="flex items-center gap-3 min-w-0">
                <Icon
                  className={`w-4 h-4 shrink-0 ${
                    isActive ? 'text-white' : 'text-white/70'
                  }`}
                />
                <span className="truncate">{item.label}</span>
              </div>

              {item.badge !== undefined && (
                <span
                  className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full shrink-0 font-mono ${
                    isActive
                      ? 'bg-white text-slate-900 shadow-2xs'
                      : item.badgeColor === 'amber'
                      ? 'bg-amber-400/20 text-amber-300 border border-amber-400/40'
                      : item.badgeColor === 'blue'
                      ? 'bg-blue-400/20 text-blue-300 border border-blue-400/40'
                      : item.badgeColor === 'indigo'
                      ? 'bg-indigo-400/20 text-indigo-300 border border-indigo-400/40'
                      : item.badgeColor === 'purple'
                      ? 'bg-purple-400/20 text-purple-300 border border-purple-400/40'
                      : 'bg-emerald-400/20 text-emerald-300 border border-emerald-400/40'
                  }`}
                >
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Footer & Theme Switcher */}
      <div className={`p-4 border-t ${theme.sidebarBorder} space-y-3 bg-black/20`}>
        {/* Theme Switcher or Locked Notice */}
        {isThemeCustomizerEnabled ? (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-[11px] text-white/70 font-semibold px-1">
              <button
                type="button"
                onClick={() => setIsThemeGalleryOpen(!isThemeGalleryOpen)}
                className="flex items-center gap-1.5 hover:text-white transition group cursor-pointer"
                title="Click to view all 10 theme descriptions"
              >
                <Palette className="w-3.5 h-3.5 text-white/80 group-hover:text-white" />
                <span>Themes (10)</span>
                <span className="text-[9px] px-1.5 py-0.2 rounded bg-white/10 text-white/80 font-mono">
                  {isThemeGalleryOpen ? '▲ Close' : '▼ List'}
                </span>
              </button>
              <span className="text-[10px] font-medium text-white/70 truncate max-w-[100px]" title={theme.name}>
                {theme.name}
              </span>
            </div>

            {/* Quick 5x2 grid of 10 color circles */}
            <div className="grid grid-cols-5 gap-1.5 p-1.5 bg-black/30 rounded-xl border border-white/10">
              {ORDERED_THEMES.map((opt, idx) => {
                const isSelected = currentCanonical === opt.id;
                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => onThemeChange && onThemeChange(opt.id)}
                    className={`relative group flex flex-col items-center py-1.5 px-0.5 rounded-lg transition-all ${
                      isSelected
                        ? 'bg-white/25 shadow-xs ring-2 ring-white scale-105'
                        : 'hover:bg-white/15'
                    }`}
                    title={`${idx + 1}. ${opt.name} — ${opt.tagline}`}
                    aria-label={`Switch to theme ${opt.name}`}
                  >
                    <span
                      className="w-4 h-4 rounded-full border border-white/40 shadow-xs flex items-center justify-center"
                      style={{ backgroundColor: opt.dotColor }}
                    >
                      {isSelected && <span className="w-1.5 h-1.5 rounded-full bg-white shadow-xs" />}
                    </span>
                    <span className="text-[8px] mt-1 text-white/80 font-mono leading-none">
                      {idx + 1}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Expandable 10-Theme Gallery List with Names and Descriptions */}
            {isThemeGalleryOpen && (
              <div className="p-2 bg-black/50 rounded-xl border border-white/15 space-y-1 max-h-56 overflow-y-auto animate-in fade-in zoom-in-95 duration-150">
                <div className="text-[10px] font-bold text-white/80 px-1 pb-1 flex items-center justify-between border-b border-white/10">
                  <span>Eye-Friendly Palettes</span>
                  <span className="text-[9px] text-white/50">10 Styles</span>
                </div>
                {ORDERED_THEMES.map((opt, idx) => {
                  const isSelected = currentCanonical === opt.id;
                  return (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => {
                        onThemeChange && onThemeChange(opt.id);
                        setIsThemeGalleryOpen(false);
                      }}
                      className={`w-full text-left p-1.5 rounded-lg flex items-center justify-between gap-2 text-xs transition ${
                        isSelected
                          ? 'bg-white/20 text-white font-bold ring-1 ring-white/40'
                          : 'text-white/80 hover:bg-white/10 hover:text-white'
                      }`}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <span
                          className="w-3.5 h-3.5 rounded-full border border-white/40 shrink-0"
                          style={{ backgroundColor: opt.dotColor }}
                        />
                        <div className="truncate">
                          <div className="text-[11px] leading-tight truncate">
                            {idx + 1}. {opt.name}
                          </div>
                          <div className="text-[9px] text-white/50 truncate">
                            {opt.tagline}
                          </div>
                        </div>
                      </div>
                      {isSelected && <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        ) : (
          /* Locked Theme Notification when Super Admin disabled Theme Customizer */
          <div className="p-2.5 bg-black/30 rounded-xl border border-white/10 space-y-1.5">
            <div className="flex items-center justify-between text-[11px]">
              <span className="flex items-center gap-1.5 text-white/80 font-bold">
                <Lock className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                <span>Theme (Locked)</span>
              </span>
              <span className="text-[9px] font-mono px-1.5 py-0.5 bg-amber-500/20 text-amber-300 rounded border border-amber-500/30">
                {theme.name}
              </span>
            </div>
            <p className="text-[10px] text-white/50 leading-tight">
              Theme customizer is locked by Super Admin policy for this company profile.
            </p>
          </div>
        )}

        {/* Company profile & Auth status */}
        <div className="pt-1 flex items-center justify-between gap-2 px-1 text-xs">
          <div className="min-w-0">
            <p className="font-bold text-white text-xs truncate">
              {companyName || 'RS Traders'}
            </p>
            <p className="text-[10px] text-white/50 truncate font-mono">
              {currentUser?.email || 'Demo Workspace'}
            </p>
          </div>

          {currentUser ? (
            <button
              onClick={onSignOut}
              className="px-2 py-1 text-[10px] text-white/70 hover:text-white hover:bg-white/15 rounded-lg transition"
            >
              Sign out
            </button>
          ) : (
            <button
              onClick={onSignIn}
              className="px-2.5 py-1 text-[10px] font-semibold text-white bg-white/15 hover:bg-white/25 rounded-lg transition flex items-center gap-1"
            >
              <UserIcon className="w-3 h-3" />
              Sign in
            </button>
          )}
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Sidebar */}
      <aside className="hidden lg:block w-64 h-screen sticky top-0 shrink-0 z-30 shadow-xl">
        {sidebarContent}
      </aside>

      {/* Mobile Drawer */}
      {isOpenMobile && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity"
            onClick={onCloseMobile}
          />
          <div className="relative w-72 max-w-[80vw] h-full shadow-2xl z-10 animate-in slide-in-from-left duration-200">
            {sidebarContent}
          </div>
        </div>
      )}
    </>
  );
};
