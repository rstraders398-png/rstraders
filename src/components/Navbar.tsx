import React from 'react';
import {
  CreditCard,
  Building2,
  Users,
  Plus,
  Sparkles,
  Calendar,
  Building,
  RefreshCw,
  LogIn,
  LogOut,
  ShieldCheck,
  User as UserIcon,
} from 'lucide-react';
import { getCurrentAdDate, getCurrentBsDate, formatBsDateFriendly } from '../lib/dateUtils';
import { User } from 'firebase/auth';

interface NavbarProps {
  companyName: string;
  companyId: string;
  partiesCount: number;
  banksCount: number;
  onOpenNewCheque: () => void;
  onOpenParties: () => void;
  onOpenBanks: () => void;
  onSeedDemoData: () => void;
  isSeeding: boolean;
  onCompanyChange: (id: string, name: string) => void;
  currentUser?: User | null;
  onSignIn?: () => void;
  onSignOut?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  companyName,
  companyId,
  partiesCount,
  banksCount,
  onOpenNewCheque,
  onOpenParties,
  onOpenBanks,
  onSeedDemoData,
  isSeeding,
  onCompanyChange,
  currentUser,
  onSignIn,
  onSignOut,
}) => {
  const todayAd = getCurrentAdDate();
  const todayBs = getCurrentBsDate();

  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-xs" id="app-navbar">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 gap-4">
          {/* Brand & Identity */}
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-600 to-indigo-800 flex items-center justify-center text-white shadow-sm shrink-0">
              <CreditCard className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h1 className="text-lg font-bold text-slate-900 tracking-tight leading-tight truncate">
                  Cheque Management
                </h1>
                <span className="hidden sm:inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200">
                  BS & AD
                </span>
              </div>
              <div className="flex items-center gap-1.5 text-xs text-slate-500 truncate">
                <Building className="w-3.5 h-3.5 text-slate-400" />
                <span className="font-medium text-slate-700">{companyName}</span>
                <span className="text-slate-300">•</span>
                <span className="text-[11px] text-slate-400 font-mono">ID: {companyId.slice(0, 10)}</span>
              </div>
            </div>
          </div>

          {/* Today's Dual Date Indicator (Desktop) */}
          <div className="hidden lg:flex items-center gap-3 bg-slate-50 px-3.5 py-1.5 rounded-lg border border-slate-200">
            <Calendar className="w-4 h-4 text-indigo-600" />
            <div className="text-xs">
              <div className="font-semibold text-slate-800">
                {formatBsDateFriendly(todayBs)} <span className="text-slate-400 font-normal">({todayBs} BS)</span>
              </div>
              <div className="text-[11px] text-slate-500 font-mono">
                {todayAd} AD (Gregorian)
              </div>
            </div>
          </div>

          {/* Actions & Navigation */}
          <div className="flex items-center gap-2 shrink-0">
            {/* User Auth Status / Sign In */}
            {currentUser ? (
              <div className="hidden sm:flex items-center gap-2 px-2.5 py-1 bg-emerald-50 border border-emerald-200 rounded-lg text-xs text-emerald-800">
                <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                <span className="font-medium truncate max-w-[120px] md:max-w-[160px]">
                  {currentUser.email || currentUser.displayName || 'Authenticated'}
                </span>
                {onSignOut && (
                  <button
                    onClick={onSignOut}
                    title="Sign Out"
                    className="text-emerald-700 hover:text-emerald-950 p-1 hover:bg-emerald-100/60 rounded transition"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            ) : onSignIn ? (
              <button
                id="btn-nav-signin"
                onClick={onSignIn}
                className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 rounded-lg transition"
                title="Sign In with Google"
              >
                <LogIn className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Sign In</span>
              </button>
            ) : null}

            <button
              id="btn-nav-parties"
              onClick={onOpenParties}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 rounded-lg transition shadow-2xs hover:border-slate-300"
              title="Manage Parties / Vendors"
            >
              <Users className="w-4 h-4 text-slate-500" />
              <span className="hidden md:inline">Parties</span>
              <span className="px-1.5 py-0.2 bg-slate-100 text-slate-600 rounded text-[10px] font-bold">
                {partiesCount}
              </span>
            </button>

            <button
              id="btn-nav-banks"
              onClick={onOpenBanks}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 rounded-lg transition shadow-2xs hover:border-slate-300"
              title="Manage Banks"
            >
              <Building2 className="w-4 h-4 text-slate-500" />
              <span className="hidden md:inline">Banks</span>
              <span className="px-1.5 py-0.2 bg-slate-100 text-slate-600 rounded text-[10px] font-bold">
                {banksCount}
              </span>
            </button>

            <button
              id="btn-nav-seed"
              onClick={onSeedDemoData}
              disabled={isSeeding}
              className="inline-flex items-center gap-1.5 px-2.5 py-2 text-xs font-medium text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200/80 rounded-lg transition"
              title="Seed sample demo data"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isSeeding ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">Sample Data</span>
            </button>

            <button
              id="btn-nav-new-cheque"
              onClick={onOpenNewCheque}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 rounded-lg transition shadow-sm hover:shadow"
            >
              <Plus className="w-4 h-4" />
              <span>Issue Cheque</span>
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};
