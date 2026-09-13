import React from 'react';
import {
  Clock,
  CheckCircle2,
  AlertTriangle,
  CreditCard,
  PieChart,
} from 'lucide-react';
import { Cheque } from '../types';
import { formatCurrency, getCurrentAdDate } from '../lib/dateUtils';

interface StatsCardsProps {
  cheques: Cheque[];
  onFilterStatus: (status: string) => void;
  activeStatusFilter: string;
}

export const StatsCards: React.FC<StatsCardsProps> = ({
  cheques,
  onFilterStatus,
  activeStatusFilter,
}) => {
  const todayAd = getCurrentAdDate();

  const totalCount = cheques.length;
  const totalAmount = cheques.reduce((acc, c) => acc + (c.amount || 0), 0);
  const totalRemaining = cheques.reduce((acc, c) => acc + (c.remaining_amount ?? c.amount ?? 0), 0);

  const pendingCheques = cheques.filter((c) => c.status === 'Pending');
  const pendingAmount = pendingCheques.reduce((acc, c) => acc + (c.remaining_amount ?? c.amount ?? 0), 0);

  const partialCheques = cheques.filter((c) => c.status === 'Partially Paid');
  const partialRemaining = partialCheques.reduce((acc, c) => acc + (c.remaining_amount ?? 0), 0);
  const partialOriginal = partialCheques.reduce((acc, c) => acc + (c.amount ?? 0), 0);

  const clearedCheques = cheques.filter((c) => c.status === 'Cleared');
  const clearedAmount = clearedCheques.reduce((acc, c) => acc + (c.amount || 0), 0);

  // Overdue count (due_date_ad < today and status != 'Cleared')
  const overdueCount = cheques.filter(
    (c) => c.status !== 'Cleared' && c.due_date_ad && c.due_date_ad < todayAd
  ).length;

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4" id="stats-cards-grid">
      {/* 1. Total Outstanding */}
      <div
        id="card-stat-total"
        onClick={() => onFilterStatus('All')}
        className={`bg-white p-4 rounded-xl border transition cursor-pointer hover:shadow-sm ${
          activeStatusFilter === 'All'
            ? 'border-indigo-400 ring-2 ring-indigo-50 shadow-xs'
            : 'border-slate-200 hover:border-slate-300'
        }`}
      >
        <div className="flex items-center justify-between text-slate-500 mb-2">
          <span className="text-xs font-semibold uppercase tracking-wider">Total Cheques</span>
          <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
            <CreditCard className="w-4 h-4" />
          </div>
        </div>
        <div className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight font-mono">
          रू {formatCurrency(totalAmount)}
        </div>
        <div className="mt-1 flex items-center justify-between text-xs text-slate-500">
          <span>{totalCount} total cheques</span>
          <span className="font-medium text-slate-700 font-mono">Bal: रू {formatCurrency(totalRemaining)}</span>
        </div>
      </div>

      {/* 2. Pending */}
      <div
        id="card-stat-pending"
        onClick={() => onFilterStatus('Pending')}
        className={`bg-white p-4 rounded-xl border transition cursor-pointer hover:shadow-sm ${
          activeStatusFilter === 'Pending'
            ? 'border-amber-400 ring-2 ring-amber-50 shadow-xs'
            : 'border-slate-200 hover:border-slate-300'
        }`}
      >
        <div className="flex items-center justify-between text-slate-500 mb-2">
          <span className="text-xs font-semibold uppercase tracking-wider text-amber-700">Pending</span>
          <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
            <Clock className="w-4 h-4" />
          </div>
        </div>
        <div className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight font-mono">
          रू {formatCurrency(pendingAmount)}
        </div>
        <div className="mt-1 flex items-center justify-between text-xs text-slate-500">
          <span className="text-amber-700 font-medium">{pendingCheques.length} awaiting payment</span>
          {overdueCount > 0 && (
            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-rose-600 bg-rose-50 px-1.5 py-0.2 rounded border border-rose-200">
              <AlertTriangle className="w-3 h-3" />
              {overdueCount} overdue
            </span>
          )}
        </div>
      </div>

      {/* 3. Partially Paid */}
      <div
        id="card-stat-partial"
        onClick={() => onFilterStatus('Partially Paid')}
        className={`bg-white p-4 rounded-xl border transition cursor-pointer hover:shadow-sm ${
          activeStatusFilter === 'Partially Paid'
            ? 'border-blue-400 ring-2 ring-blue-50 shadow-xs'
            : 'border-slate-200 hover:border-slate-300'
        }`}
      >
        <div className="flex items-center justify-between text-slate-500 mb-2">
          <span className="text-xs font-semibold uppercase tracking-wider text-blue-700">Partially Paid</span>
          <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
            <PieChart className="w-4 h-4" />
          </div>
        </div>
        <div className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight font-mono">
          रू {formatCurrency(partialRemaining)}
        </div>
        <div className="mt-1 flex items-center justify-between text-xs text-slate-500">
          <span className="text-blue-700 font-medium">{partialCheques.length} in progress</span>
          <span className="text-slate-500 font-mono">Orig: रू {formatCurrency(partialOriginal)}</span>
        </div>
      </div>

      {/* 4. Cleared */}
      <div
        id="card-stat-cleared"
        onClick={() => onFilterStatus('Cleared')}
        className={`bg-white p-4 rounded-xl border transition cursor-pointer hover:shadow-sm ${
          activeStatusFilter === 'Cleared'
            ? 'border-emerald-400 ring-2 ring-emerald-50 shadow-xs'
            : 'border-slate-200 hover:border-slate-300'
        }`}
      >
        <div className="flex items-center justify-between text-slate-500 mb-2">
          <span className="text-xs font-semibold uppercase tracking-wider text-emerald-700">Cleared</span>
          <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
            <CheckCircle2 className="w-4 h-4" />
          </div>
        </div>
        <div className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight font-mono">
          रू {formatCurrency(clearedAmount)}
        </div>
        <div className="mt-1 flex items-center justify-between text-xs text-slate-500">
          <span className="text-emerald-700 font-medium">{clearedCheques.length} settled cheques</span>
          <span className="text-emerald-600 font-semibold">100% Paid</span>
        </div>
      </div>
    </div>
  );
};
