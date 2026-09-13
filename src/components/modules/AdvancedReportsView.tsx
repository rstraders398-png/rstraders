import React, { useState, useMemo } from 'react';
import {
  BarChart3,
  TrendingUp,
  Download,
  Calendar,
  AlertTriangle,
  Building,
  CheckCircle2,
  DollarSign,
  PieChart,
  ArrowUpRight,
  Filter,
} from 'lucide-react';
import { Cheque, Party, Bank } from '../../types';
import { formatCurrency } from '../../lib/dateUtils';

interface AdvancedReportsViewProps {
  cheques: Cheque[];
  parties: Party[];
  banks: Bank[];
  companyName: string;
  companyCode?: string;
}

export const AdvancedReportsView: React.FC<AdvancedReportsViewProps> = ({
  cheques,
  parties,
  banks,
  companyName,
  companyCode,
}) => {
  const [selectedPeriod, setSelectedPeriod] = useState<'30' | '60' | '90' | 'all'>('30');

  // Analytical calculations
  const totalPendingAmount = useMemo(
    () => cheques.filter((c) => c.status !== 'Cleared').reduce((sum, c) => sum + c.remaining_amount, 0),
    [cheques]
  );

  const totalClearedAmount = useMemo(
    () => cheques.filter((c) => c.status === 'Cleared').reduce((sum, c) => sum + c.amount, 0),
    [cheques]
  );

  // Top payee risk / exposure
  const partyExposure = useMemo(() => {
    const map: Record<string, { name: string; pendingAmount: number; count: number }> = {};
    cheques.forEach((chq) => {
      const party = parties.find((p) => p.id === chq.party_id);
      const name = party?.name || 'Unassigned';
      if (!map[name]) {
        map[name] = { name, pendingAmount: 0, count: 0 };
      }
      if (chq.status !== 'Cleared') {
        map[name].pendingAmount += chq.remaining_amount;
        map[name].count += 1;
      }
    });

    return Object.values(map)
      .sort((a, b) => b.pendingAmount - a.pendingAmount)
      .slice(0, 5);
  }, [cheques, parties]);

  // Bank allocation
  const bankDistribution = useMemo(() => {
    const map: Record<string, { name: string; totalAmount: number; count: number }> = {};
    cheques.forEach((chq) => {
      const bank = banks.find((b) => b.id === chq.bank_id);
      const name = bank?.name || 'Default Bank';
      if (!map[name]) {
        map[name] = { name, totalAmount: 0, count: 0 };
      }
      map[name].totalAmount += chq.amount;
      map[name].count += 1;
    });
    return Object.values(map).sort((a, b) => b.totalAmount - a.totalAmount);
  }, [cheques, banks]);

  const handleExportCSV = () => {
    const headers = ['Cheque No', 'Party', 'Bank', 'Amount', 'Remaining', 'Status', 'Due Date BS'];
    const rows = cheques.map((c) => [
      c.cheque_number,
      parties.find((p) => p.id === c.party_id)?.name || '',
      banks.find((b) => b.id === c.bank_id)?.name || '',
      c.amount,
      c.remaining_amount,
      c.status,
      c.due_date_bs,
    ]);

    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `${companyName}_Financial_Report_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto p-4 sm:p-6 animate-in fade-in duration-150">
      {/* Header */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white p-6 rounded-2xl border border-slate-800 shadow-md">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-blue-500/20 text-blue-400 border border-blue-500/30 flex items-center justify-center shadow-xs">
              <BarChart3 className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold tracking-tight">Advanced Reports & Cash Flow Forecasting</h1>
                <span className="px-2 py-0.5 text-[10px] font-bold bg-blue-500/20 text-blue-300 border border-blue-500/30 rounded-full">
                  Analytics v2.4
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-1">
                Multi-dimensional liquidity forecasting, payee risk concentration, and balance outflow schedules.
              </p>
            </div>
          </div>
          <button
            onClick={handleExportCSV}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold transition flex items-center gap-2 shadow-xs"
          >
            <Download className="w-4 h-4" />
            <span>Export Executive CSV</span>
          </button>
        </div>
      </div>

      {/* Analytics KPI Tiles */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs">
          <div className="text-xs font-semibold text-slate-500">Upcoming Outflow Exposure</div>
          <div className="text-2xl font-bold text-slate-900 mt-1">{formatCurrency(totalPendingAmount)}</div>
          <div className="text-[11px] text-amber-600 font-medium mt-2 flex items-center gap-1">
            <AlertTriangle className="w-3.5 h-3.5" />
            <span>Pending settlement across all banks</span>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs">
          <div className="text-xs font-semibold text-slate-500">Total Cleared Liquidity</div>
          <div className="text-2xl font-bold text-emerald-600 mt-1">{formatCurrency(totalClearedAmount)}</div>
          <div className="text-[11px] text-emerald-700 font-medium mt-2 flex items-center gap-1">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Successfully cleared and reconciled</span>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs">
          <div className="text-xs font-semibold text-slate-500">Total Registered Cheques</div>
          <div className="text-2xl font-bold text-indigo-600 mt-1">{cheques.length} Vouchers</div>
          <div className="text-[11px] text-slate-500 font-medium mt-2 flex items-center gap-1">
            <Building className="w-3.5 h-3.5" />
            <span>Active across {banks.length} bank branches</span>
          </div>
        </div>
      </div>

      {/* Detailed Analysis Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Payee Exposure Risk */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div className="font-bold text-slate-800 text-sm flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-indigo-600" />
              <span>Highest Payee Outflow Concentration</span>
            </div>
            <span className="text-xs text-slate-400">Top 5 Creditors</span>
          </div>

          <div className="space-y-3">
            {partyExposure.map((p, idx) => {
              const pct = totalPendingAmount > 0 ? (p.pendingAmount / totalPendingAmount) * 100 : 0;
              return (
                <div key={p.name} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-slate-800">
                      {idx + 1}. {p.name} ({p.count} cheques)
                    </span>
                    <span className="font-bold text-slate-900">{formatCurrency(p.pendingAmount)}</span>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                    <div
                      className="bg-indigo-600 h-2 rounded-full transition-all"
                      style={{ width: `${Math.min(pct, 100)}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Bank Allocation */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div className="font-bold text-slate-800 text-sm flex items-center gap-2">
              <PieChart className="w-4 h-4 text-emerald-600" />
              <span>Bank Account Volume Distribution</span>
            </div>
            <span className="text-xs text-slate-400">{banks.length} Connected</span>
          </div>

          <div className="divide-y divide-slate-100">
            {bankDistribution.map((b) => (
              <div key={b.name} className="py-3 flex items-center justify-between text-xs">
                <div>
                  <div className="font-bold text-slate-800">{b.name}</div>
                  <div className="text-[11px] text-slate-400">{b.count} Cheques processed</div>
                </div>
                <div className="font-bold text-slate-900">{formatCurrency(b.totalAmount)}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
