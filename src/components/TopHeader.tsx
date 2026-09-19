import React from 'react';
import {
  Menu,
  Plus,
  Calendar,
  Building,
  ShieldCheck,
  User as UserIcon,
  RefreshCw,
  HardDrive,
  Wifi,
  WifiOff,
  Cloud,
  LogOut,
  FileSpreadsheet,
} from 'lucide-react';
import { getCurrentAdDate, getCurrentBsDate, formatBsDateFriendly } from '../lib/dateUtils';
import { User } from 'firebase/auth';
import { useSyncStatus } from '../lib/syncWorker';

interface TopHeaderProps {
  currentViewTitle: string;
  onOpenMobileMenu: () => void;
  onNewCheque: () => void;
  companyName: string;
  companyId?: string;
  currentUser?: User | any | null;
  onSeedDemoData: () => void;
  isSeeding: boolean;
  isSupportMode?: boolean;
  isSuperAdmin?: boolean;
  onGoToSuperAdmin?: () => void;
  onOpenBackupSettings?: () => void;
  onOpenImportModal?: () => void;
  onSignOut?: () => void;
}

export const TopHeader: React.FC<TopHeaderProps> = ({
  currentViewTitle,
  onOpenMobileMenu,
  onNewCheque,
  companyName,
  companyId,
  currentUser,
  onSeedDemoData,
  isSeeding,
  isSupportMode = false,
  isSuperAdmin = false,
  onGoToSuperAdmin,
  onOpenBackupSettings,
  onOpenImportModal,
  onSignOut,
}) => {
  const todayAd = getCurrentAdDate();
  const todayBs = getCurrentBsDate();
  const syncStatus = useSyncStatus(companyId);

  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-20 shadow-2xs">
      <div className="px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
        {/* Left: Mobile hamburger & View title */}
        <div className="flex items-center gap-3">
          <button
            onClick={onOpenMobileMenu}
            className="lg:hidden p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition"
            aria-label="Open navigation menu"
          >
            <Menu className="w-5 h-5" />
          </button>

          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base sm:text-lg font-bold text-slate-900 leading-tight">
                {currentViewTitle}
              </h2>
              {isSupportMode && (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-amber-100 text-amber-900 border border-amber-300 animate-pulse">
                  Read-Only Support View
                </span>
              )}
            </div>
            <div className="flex items-center gap-1.5 text-xs text-slate-400">
              <span className="font-semibold text-slate-600">{companyName || 'RS Traders'}</span>
              <span>•</span>
              <span className="text-emerald-700 font-medium">Offline-First Desktop</span>
            </div>
          </div>
        </div>

        {/* Right: Sync Status Badge, Dual Date & Quick Action */}
        <div className="flex items-center gap-2 sm:gap-2.5">
          {/* Smart Auto-Sync Status Badge (Requirement 2) */}
          <div className="flex items-center gap-1.5">
            {syncStatus.isSyncing ? (
              <button
                type="button"
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-blue-50 text-blue-800 border border-blue-200 shadow-2xs animate-pulse cursor-pointer"
                title="Synchronizing local database with cloud server..."
              >
                <RefreshCw className="w-3.5 h-3.5 animate-spin text-blue-600" />
                <span className="hidden sm:inline">Syncing...</span>
              </button>
            ) : syncStatus.isOnline ? (
              <button
                type="button"
                onClick={() => syncStatus.triggerManualSync()}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 shadow-2xs transition cursor-pointer"
                title={`Connected & Synced with Cloud. Click to sync now.`}
              >
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shrink-0" />
                <span className="text-[11px] sm:text-xs">🟢 Online (Synced)</span>
                {syncStatus.pendingCount > 0 && (
                  <span className="px-1 py-0.2 bg-amber-500 text-white rounded-full text-[9px] font-mono">
                    {syncStatus.pendingCount}
                  </span>
                )}
              </button>
            ) : (
              <button
                type="button"
                onClick={() => syncStatus.triggerManualSync()}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 shadow-2xs transition cursor-pointer"
                title="System is working locally offline. All changes are stored in SQLite/IndexedDB and will sync automatically."
              >
                <span className="w-2 h-2 rounded-full bg-amber-500 shrink-0" />
                <span className="text-[11px] sm:text-xs">
                  {syncStatus.pendingCount > 0
                    ? `🟠 Offline (${syncStatus.pendingCount} Pending)`
                    : '🟠 Offline Mode (Working Locally)'}
                </span>
              </button>
            )}

            {/* Quick Link to Backup & Data Safety Settings */}
            {onOpenBackupSettings && (
              <button
                type="button"
                onClick={onOpenBackupSettings}
                className="p-1.5 text-slate-600 hover:text-emerald-700 hover:bg-emerald-50 rounded-xl transition border border-slate-200"
                title="Open Backup & Data Safety Settings (Local Disk, Email, Cloud)"
              >
                <HardDrive className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Quick link to Super Admin if Super Admin */}
          {isSuperAdmin && onGoToSuperAdmin && (
            <button
              onClick={onGoToSuperAdmin}
              className="hidden md:inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition"
              title="Open Super Admin & Developer Panel"
            >
              <ShieldCheck className="w-3.5 h-3.5 text-amber-600" />
              <span>Super Admin</span>
            </button>
          )}

          {/* Quick Sign Out button */}
          {onSignOut && (
            <button
              onClick={onSignOut}
              className="hidden sm:inline-flex items-center gap-1 px-2.5 py-1.5 text-xs text-slate-600 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition border border-slate-200"
              title="Sign Out of session"
            >
              <LogOut className="w-3.5 h-3.5 text-slate-400 group-hover:text-rose-600" />
              <span className="font-semibold">Sign Out</span>
            </button>
          )}

          {/* Dual Date widget */}
          <div className="hidden md:flex items-center gap-2 px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs">
            <Calendar className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
            <div className="leading-tight">
              <span className="font-semibold text-slate-800 font-mono">
                {todayBs} <span className="font-sans text-[10px] text-slate-400">BS</span>
              </span>
              <span className="text-slate-300 mx-1.5">|</span>
              <span className="text-slate-500 font-mono text-[11px]">
                {todayAd} <span className="font-sans text-[10px]">AD</span>
              </span>
            </div>
          </div>

          {/* Import Excel / CSV Button */}
          {onOpenImportModal && (
            <button
              id="btn-quick-import-cheques"
              type="button"
              onClick={onOpenImportModal}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-xl border border-purple-200 bg-purple-50 hover:bg-purple-100 text-purple-700 transition cursor-pointer shadow-2xs"
              title="Import cheques from Excel (.xlsx) or CSV"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-purple-600" />
              <span className="hidden sm:inline">Import (Excel/CSV)</span>
            </button>
          )}

          {/* New Cheque Button */}
          <button
            id="btn-quick-new-cheque"
            onClick={onNewCheque}
            className={`inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-xl shadow-xs transition ${
              isSupportMode
                ? 'bg-amber-600 hover:bg-amber-700 text-white'
                : 'text-white bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800'
            }`}
            title={isSupportMode ? 'Issue Cheque (Protected in Support Mode)' : 'Issue new cheque'}
          >
            <Plus className="w-4 h-4" />
            <span>+ Issue Cheque</span>
          </button>
        </div>
      </div>
    </header>
  );
};
