import React, { useState } from 'react';
import {
  Building,
  User as UserIcon,
  ShieldCheck,
  LogIn,
  LogOut,
  RefreshCw,
  Sparkles,
  CheckCircle2,
  Database,
  Calendar,
  Layers,
} from 'lucide-react';
import { User } from 'firebase/auth';

interface CompanyUsersViewProps {
  companyId: string;
  companyName: string;
  onCompanyChange: (id: string, name: string) => void;
  currentUser?: User | null;
  onSignIn?: () => void;
  onSignOut?: () => void;
  onSeedDemoData: () => void;
  isSeeding: boolean;
  partiesCount: number;
  banksCount: number;
  chequesCount: number;
}

export const CompanyUsersView: React.FC<CompanyUsersViewProps> = ({
  companyId,
  companyName,
  onCompanyChange,
  currentUser,
  onSignIn,
  onSignOut,
  onSeedDemoData,
  isSeeding,
  partiesCount,
  banksCount,
  chequesCount,
}) => {
  const [customName, setCustomName] = useState(companyName);
  const [customId, setCustomId] = useState(companyId);

  const presets = [
    { id: 'default-company-101', name: 'RS Traders' },
    { id: 'himalayan-supplies-202', name: 'Himalayan Suppliers Pvt. Ltd.' },
    { id: 'kathmandu-enterprises-303', name: 'Kathmandu Enterprises' },
  ];

  const handleSaveCustomCompany = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customName.trim() || !customId.trim()) return;
    onCompanyChange(customId.trim(), customName.trim());
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs">
        <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
          <Building className="w-5 h-5 text-emerald-600" />
          <span>Company & Users</span>
        </h2>
        <p className="text-xs text-slate-500 mt-0.5">
          Manage your organization profile, multi-company workspaces, and authenticated access.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Company Settings */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center font-bold">
              <Building className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base text-slate-900">Organization Profile</h3>
              <p className="text-xs text-slate-500">Currently active workspace for cheques and registries</p>
            </div>
          </div>

          <div className="p-4 bg-slate-50 rounded-xl border border-slate-200/80 space-y-2">
            <div className="flex justify-between text-xs">
              <span className="text-slate-500">Company Name:</span>
              <span className="font-bold text-slate-800">{companyName}</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-slate-500">Company ID:</span>
              <span className="font-mono text-slate-700 font-semibold">{companyId}</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-slate-500">Currency & Calendar:</span>
              <span className="text-slate-700 font-medium">NPR (₹) • Bikram Sambat (BS) & AD</span>
            </div>
            <div className="flex justify-between text-xs pt-2 border-t border-slate-200">
              <span className="text-slate-500">Records Loaded:</span>
              <span className="font-semibold text-emerald-700">
                {chequesCount} Cheques • {partiesCount} Parties • {banksCount} Banks
              </span>
            </div>
          </div>

          {/* Quick Switch Presets */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-700 block">Switch Workspace Preset:</label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              {presets.map((preset) => {
                const isActive = preset.id === companyId;
                return (
                  <button
                    key={preset.id}
                    onClick={() => {
                      setCustomId(preset.id);
                      setCustomName(preset.name);
                      onCompanyChange(preset.id, preset.name);
                    }}
                    className={`px-3 py-2 text-xs font-semibold rounded-xl border text-left transition ${
                      isActive
                        ? 'bg-emerald-50 border-emerald-300 text-emerald-800'
                        : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <span className="block truncate">{preset.name}</span>
                    <span className="text-[10px] text-slate-400 font-mono block truncate">
                      {preset.id}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Custom Edit Form */}
          <form onSubmit={handleSaveCustomCompany} className="space-y-3 pt-2">
            <label className="text-xs font-bold text-slate-700 block">Custom Company Identifier:</label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <span className="text-[11px] text-slate-400 block mb-1">Company Display Name</span>
                <input
                  type="text"
                  value={customName}
                  onChange={(e) => setCustomName(e.target.value)}
                  className="w-full text-xs px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
              <div>
                <span className="text-[11px] text-slate-400 block mb-1">Unique Company ID</span>
                <input
                  type="text"
                  value={customId}
                  onChange={(e) => setCustomId(e.target.value)}
                  className="w-full text-xs font-mono px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
            </div>
            <button
              type="submit"
              className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-lg text-xs font-semibold transition"
            >
              Update Workspace
            </button>
          </form>
        </div>

        {/* User & Database Status */}
        <div className="space-y-6">
          {/* User Account */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center font-bold">
                <UserIcon className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-base text-slate-900">User Account</h3>
                <p className="text-xs text-slate-500">Authentication & Session Info</p>
              </div>
            </div>

            {currentUser ? (
              <div className="p-4 bg-emerald-50/70 border border-emerald-200 rounded-xl space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-emerald-600" />
                    <span className="text-xs font-bold text-emerald-900">Active Authentication</span>
                  </div>
                  <span className="text-[10px] bg-emerald-200/80 text-emerald-900 px-2 py-0.5 rounded-full font-bold">
                    Connected
                  </span>
                </div>
                <div className="text-xs text-slate-700 space-y-1">
                  <div>
                    <span className="text-slate-400">Email:</span>{' '}
                    <span className="font-medium text-slate-800">{currentUser.email || 'None'}</span>
                  </div>
                  <div>
                    <span className="text-slate-400">User ID:</span>{' '}
                    <span className="font-mono text-slate-600">{currentUser.uid}</span>
                  </div>
                </div>
                {onSignOut && (
                  <button
                    onClick={onSignOut}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-rose-700 bg-white border border-rose-200 hover:bg-rose-50 rounded-lg transition"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    <span>Sign Out</span>
                  </button>
                )}
              </div>
            ) : (
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-700">Not Signed In</span>
                  <span className="text-[10px] bg-slate-200 text-slate-600 px-2 py-0.5 rounded-full font-medium">
                    Guest Mode
                  </span>
                </div>
                <p className="text-xs text-slate-500">
                  You can sign in with your Google account for multi-device sync and personal company profiles.
                </p>
                {onSignIn && (
                  <button
                    onClick={onSignIn}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold transition shadow-xs"
                  >
                    <LogIn className="w-4 h-4" />
                    <span>Sign In with Google</span>
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Cloud Database & Sample Data */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-700 flex items-center justify-center font-bold">
                <Database className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-base text-slate-900">Database & Utilities</h3>
                <p className="text-xs text-slate-500">Firestore cloud storage and demo sample controls</p>
              </div>
            </div>

            <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span className="text-slate-700 font-medium">Cloud Firestore Sync Active</span>
              </div>
              <span className="font-mono text-[11px] text-slate-400">Open RLS</span>
            </div>

            <div className="pt-2">
              <button
                onClick={onSeedDemoData}
                disabled={isSeeding}
                className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold transition disabled:opacity-50"
              >
                <RefreshCw className={`w-3.5 h-3.5 text-emerald-600 ${isSeeding ? 'animate-spin' : ''}`} />
                <span>{isSeeding ? 'Refreshing dataset...' : 'Reload Demo Sample Cheques & Parties'}</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
