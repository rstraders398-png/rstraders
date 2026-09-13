import React, { useState, useMemo } from 'react';
import {
  CheckCircle2,
  Search,
  Filter,
  Download,
  Printer,
  Eye,
  Edit2,
  Trash2,
  FileSpreadsheet,
  FileText,
  Calendar,
  DollarSign,
  Landmark,
} from 'lucide-react';
import { Bank, Cheque, Party } from '../types';
import { formatCurrency, getCurrentBsDate, getCurrentAdDate } from '../lib/dateUtils';
import { exportTableToPDF, exportTableToExcel } from '../lib/exportUtils';

interface ClearedChequesViewProps {
  cheques: Cheque[];
  parties: Party[];
  banks: Bank[];
  companyName: string;
  onViewDetails: (cheque: Cheque) => void;
  onEditCheque: (cheque: Cheque) => void;
  onDeleteCheque: (id: string) => void;
}

export const ClearedChequesView: React.FC<ClearedChequesViewProps> = ({
  cheques,
  parties,
  banks,
  companyName,
  onViewDetails,
  onEditCheque,
  onDeleteCheque,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedBankId, setSelectedBankId] = useState('all');
  const [selectedPartyId, setSelectedPartyId] = useState('all');
  const [bsDateFrom, setBsDateFrom] = useState('');
  const [bsDateTo, setBsDateTo] = useState('');
  const [quickRange, setQuickRange] = useState<'all' | 'this_month' | 'last_3_months' | 'this_year'>('all');

  const todayAd = getCurrentAdDate();
  const todayBs = getCurrentBsDate();

  const partyMap = useMemo(() => {
    const map = new Map<string, Party>();
    parties.forEach((p) => map.set(p.id, p));
    return map;
  }, [parties]);

  const bankMap = useMemo(() => {
    const map = new Map<string, Bank>();
    banks.forEach((b) => map.set(b.id, b));
    return map;
  }, [banks]);

  const clearedAll = useMemo(() => {
    return cheques.filter((c) => c.status === 'Cleared');
  }, [cheques]);

  const totalClearedAllTime = useMemo(() => {
    return clearedAll.reduce((s, c) => s + c.amount, 0);
  }, [clearedAll]);

  const remainingPendingOverall = useMemo(() => {
    return cheques
      .filter((c) => c.status !== 'Cleared')
      .reduce((s, c) => s + c.remaining_amount, 0);
  }, [cheques]);

  // Handle Quick Range selection
  const handleQuickRange = (range: 'all' | 'this_month' | 'last_3_months' | 'this_year') => {
    setQuickRange(range);
    if (range === 'all') {
      setBsDateFrom('');
      setBsDateTo('');
    } else if (range === 'this_month') {
      if (todayBs) {
        const parts = todayBs.split('-');
        if (parts.length >= 2) {
          setBsDateFrom(`${parts[0]}-${parts[1]}-01`);
          setBsDateTo(`${parts[0]}-${parts[1]}-32`);
        }
      }
    } else if (range === 'this_year') {
      if (todayBs) {
        const parts = todayBs.split('-');
        if (parts.length >= 1) {
          setBsDateFrom(`${parts[0]}-01-01`);
          setBsDateTo(`${parts[0]}-12-32`);
        }
      }
    }
  };

  // Filtered dataset
  const filteredCleared = useMemo(() => {
    return clearedAll.filter((c) => {
      // Party filter
      if (selectedPartyId !== 'all' && c.party_id !== selectedPartyId) return false;

      // Bank filter
      if (selectedBankId !== 'all' && c.bank_id !== selectedBankId) return false;

      // Search term
      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase();
        const pName = c.party_id ? (partyMap.get(c.party_id)?.name || '').toLowerCase() : '';
        const bName = c.bank_id ? (bankMap.get(c.bank_id)?.name || '').toLowerCase() : '';
        const num = (c.cheque_number || '').toLowerCase();
        const bill = (c.bill_number || '').toLowerCase();
        const notes = (c.notes || '').toLowerCase();
        if (
          !pName.includes(q) &&
          !bName.includes(q) &&
          !num.includes(q) &&
          !bill.includes(q) &&
          !notes.includes(q)
        ) {
          return false;
        }
      }

      // BS Date Range filter (using due_date_bs or cleared date)
      const targetBsDate = c.due_date_bs || c.issue_date_bs;
      if (bsDateFrom && targetBsDate && targetBsDate < bsDateFrom) return false;
      if (bsDateTo && targetBsDate && targetBsDate > bsDateTo) return false;

      return true;
    }).sort((a, b) => (b.due_date_ad || '').localeCompare(a.due_date_ad || ''));
  }, [
    clearedAll,
    selectedPartyId,
    selectedBankId,
    searchTerm,
    bsDateFrom,
    bsDateTo,
    partyMap,
    bankMap,
  ]);

  // Real-time summary metrics for cleared view
  const metrics = useMemo(() => {
    const clearedInRange = filteredCleared.reduce((s, c) => s + c.amount, 0);
    const countInRange = filteredCleared.length;
    const avgValue = countInRange > 0 ? Math.round(clearedInRange / countInRange) : 0;

    return {
      clearedInRange,
      countInRange,
      avgValue,
    };
  }, [filteredCleared]);

  // Unified Excel (.xlsx) Export
  const handleExportExcel = () => {
    const headers = [
      'Cheque Number',
      'Bill Number',
      'Party Name',
      'Bank Name',
      'Issue Date (BS)',
      'Settled/Due Date (BS)',
      'Cleared Amount (NPR)',
      'Status',
      'Notes',
    ];

    const rows = filteredCleared.map((c) => {
      const p = c.party_id ? partyMap.get(c.party_id)?.name || 'Unassigned' : 'Unassigned';
      const b = c.bank_id ? bankMap.get(c.bank_id)?.name || '—' : '—';
      return [
        c.cheque_number || '',
        c.bill_number || '—',
        p,
        b,
        c.issue_date_bs || '—',
        c.due_date_bs || '—',
        c.amount,
        c.status,
        c.notes || '—',
      ];
    });

    const dateRangeStr =
      bsDateFrom || bsDateTo
        ? `${bsDateFrom || 'Start'} to ${bsDateTo || 'End'} (BS)`
        : 'All Cleared Records';

    exportTableToExcel({
      fileName: `${companyName.replace(/[^a-zA-Z0-9]/g, '_')}_Cleared_Cheques_${getCurrentBsDate()}`,
      companyName,
      reportTitle: 'Cleared & Realized Cheques Archive',
      dateRange: dateRangeStr,
      summaryMetrics: [
        { label: 'Cleared in Range', value: `${metrics.countInRange} Settled` },
        { label: 'Total Realized Amount', value: `रू ${formatCurrency(metrics.clearedInRange)}` },
        { label: 'Average Settlement', value: `रू ${formatCurrency(metrics.avgValue)}` },
      ],
      headers,
      rows,
      footers: [
        'GRAND TOTALS',
        '',
        `${filteredCleared.length} Cheques Settled`,
        '',
        '',
        '',
        metrics.clearedInRange,
        'CLEARED',
        '',
      ],
    });
  };

  // Unified PDF (.pdf) Export
  const handleExportPDF = () => {
    const headers = [
      'Cheque #',
      'Bill #',
      'Party Name',
      'Bank Name',
      'Issue Date',
      'Settled Date (BS)',
      'Cleared Amount',
      'Status',
    ];

    const rows = filteredCleared.map((c) => {
      const p = c.party_id ? partyMap.get(c.party_id)?.name || 'Unassigned' : 'Unassigned';
      const b = c.bank_id ? bankMap.get(c.bank_id)?.name || '—' : '—';
      return [
        c.cheque_number || '',
        c.bill_number || '—',
        p,
        b,
        c.issue_date_bs || '—',
        c.due_date_bs || '—',
        `रू ${formatCurrency(c.amount)}`,
        c.status,
      ];
    });

    const dateRangeStr =
      bsDateFrom || bsDateTo
        ? `${bsDateFrom || 'Start'} to ${bsDateTo || 'End'} (BS)`
        : 'All Cleared Records';

    exportTableToPDF({
      fileName: `${companyName.replace(/[^a-zA-Z0-9]/g, '_')}_Cleared_Cheques_${getCurrentBsDate()}`,
      companyName,
      reportTitle: 'Cleared & Realized Cheques Archive',
      dateRange: dateRangeStr,
      summaryMetrics: [
        { label: 'Cleared in Range', value: `${metrics.countInRange} Settled` },
        { label: 'Total Realized Amount', value: `रू ${formatCurrency(metrics.clearedInRange)}` },
        { label: 'Average Settlement', value: `रू ${formatCurrency(metrics.avgValue)}` },
      ],
      headers,
      rows,
      footers: [
        'GRAND TOTALS',
        '',
        `${filteredCleared.length} Cheques Settled`,
        '',
        '',
        '',
        `रू ${formatCurrency(metrics.clearedInRange)}`,
        'CLEARED',
      ],
    });
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      {/* Top Banner & Header */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900 tracking-tight">
                Cleared Cheques Archive
              </h2>
              <p className="text-xs text-slate-500">
                Complete settlement archive of realized and fully cleared cheques.
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={handleExportExcel}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 rounded-xl transition shadow-2xs cursor-pointer"
            title="Export filtered cleared archive to Excel (.xlsx)"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-700" />
            <span>Export Excel</span>
          </button>

          <button
            onClick={handleExportPDF}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold bg-rose-50 hover:bg-rose-100 text-rose-800 border border-rose-300 rounded-xl transition shadow-2xs cursor-pointer"
            title="Export filtered cleared archive to PDF (.pdf)"
          >
            <FileText className="w-4 h-4 text-rose-700" />
            <span>Export PDF</span>
          </button>

          <button
            onClick={handlePrint}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 rounded-xl transition shadow-2xs cursor-pointer"
            title="Print report"
          >
            <Printer className="w-3.5 h-3.5 text-slate-600" />
            <span>Print</span>
          </button>
        </div>
      </div>

      {/* Real-Time Total Summary Metrics as requested:
          (Cleared in range, Remaining pending, Total cleared value) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-emerald-50/70 border border-emerald-200/90 rounded-2xl p-4 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-emerald-900 uppercase tracking-wider">
              Cleared in Range
            </span>
            <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-emerald-200 text-emerald-900 font-mono">
              {metrics.countInRange} Settled
            </span>
          </div>
          <div className="text-xl font-bold font-mono text-emerald-950 mt-1">
            रू {formatCurrency(metrics.clearedInRange)}
          </div>
          <div className="text-[11px] text-emerald-700 mt-1">
            Realized cash flow in chosen date period
          </div>
        </div>

        <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
              Total Cleared Value
            </span>
            <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-slate-200 text-slate-800 font-mono">
              {clearedAll.length} Total
            </span>
          </div>
          <div className="text-xl font-bold font-mono text-slate-900 mt-1">
            रू {formatCurrency(totalClearedAllTime)}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">
            All-time historical cleared volume
          </div>
        </div>

        <div className="bg-amber-50/60 border border-amber-200/80 rounded-2xl p-4 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-amber-800 uppercase tracking-wider">
              Remaining Pending
            </span>
            <span className="text-[10px] uppercase font-bold text-amber-800 font-mono">
              Active Due
            </span>
          </div>
          <div className="text-xl font-bold font-mono text-amber-950 mt-1">
            रू {formatCurrency(remainingPendingOverall)}
          </div>
          <div className="text-[11px] text-amber-700 mt-1">
            Outstanding balance across active pending register
          </div>
        </div>

        <div className="bg-blue-50/60 border border-blue-200/80 rounded-2xl p-4 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-blue-800 uppercase tracking-wider">
              Average Cheque Value
            </span>
            <span className="text-[10px] text-blue-700 font-mono">
              In Range
            </span>
          </div>
          <div className="text-xl font-bold font-mono text-blue-950 mt-1">
            रू {formatCurrency(metrics.avgValue)}
          </div>
          <div className="text-[11px] text-blue-700 mt-1 truncate">
            Average realization per cheque
          </div>
        </div>
      </div>

      {/* BS Date Range Filter and Search Controls */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-2xs space-y-3">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search cleared cheque #, bill #, party, bank..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-slate-600"
              >
                ×
              </button>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <select
              value={selectedPartyId}
              onChange={(e) => setSelectedPartyId(e.target.value)}
              className="text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-700 focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
            >
              <option value="all">All Parties ({parties.length})</option>
              {parties.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>

            <select
              value={selectedBankId}
              onChange={(e) => setSelectedBankId(e.target.value)}
              className="text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-700 focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
            >
              <option value="all">All Banks ({banks.length})</option>
              {banks.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name} {b.code ? `(${b.code})` : ''}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* BS Date Range controls */}
        <div className="pt-2 border-t border-slate-100 flex flex-col lg:flex-row lg:items-center justify-between gap-3 text-xs">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-semibold text-slate-700 flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5 text-emerald-600" />
              BS Date Filter:
            </span>

            <div className="flex items-center gap-1.5 font-mono">
              <input
                type="text"
                placeholder="From (YYYY-MM-DD)"
                value={bsDateFrom}
                onChange={(e) => {
                  setBsDateFrom(e.target.value);
                  setQuickRange('all');
                }}
                className="w-32 px-2.5 py-1 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-hidden focus:ring-1 focus:ring-emerald-500"
              />
              <span className="text-slate-400 font-sans">to</span>
              <input
                type="text"
                placeholder="To (YYYY-MM-DD)"
                value={bsDateTo}
                onChange={(e) => {
                  setBsDateTo(e.target.value);
                  setQuickRange('all');
                }}
                className="w-32 px-2.5 py-1 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-hidden focus:ring-1 focus:ring-emerald-500"
              />
            </div>

            {(bsDateFrom || bsDateTo) && (
              <button
                onClick={() => {
                  setBsDateFrom('');
                  setBsDateTo('');
                  setQuickRange('all');
                }}
                className="px-2 py-1 text-[11px] text-slate-500 hover:text-slate-800 bg-slate-100 rounded-lg"
              >
                Clear Range
              </button>
            )}
          </div>

          <div className="flex items-center gap-1.5 overflow-x-auto">
            <span className="text-slate-400 text-[11px]">Presets:</span>
            <button
              onClick={() => handleQuickRange('all')}
              className={`px-2 py-0.5 text-[11px] rounded-md transition ${
                quickRange === 'all' && !bsDateFrom && !bsDateTo
                  ? 'bg-emerald-600 text-white font-semibold'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              All Time
            </button>
            <button
              onClick={() => handleQuickRange('this_month')}
              className={`px-2 py-0.5 text-[11px] rounded-md transition ${
                quickRange === 'this_month'
                  ? 'bg-emerald-600 text-white font-semibold'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              This Month
            </button>
            <button
              onClick={() => handleQuickRange('this_year')}
              className={`px-2 py-0.5 text-[11px] rounded-md transition ${
                quickRange === 'this_year'
                  ? 'bg-emerald-600 text-white font-semibold'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              This Year (BS)
            </button>
          </div>
        </div>
      </div>

      {/* Cleared Table Listing */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50/80 border-b border-slate-200 text-slate-600 uppercase font-semibold text-[10px] tracking-wider">
              <tr>
                <th className="py-3 px-4">Cheque / Bill #</th>
                <th className="py-3 px-4">Party</th>
                <th className="py-3 px-4">Bank</th>
                <th className="py-3 px-4">Settled Date (BS / AD)</th>
                <th className="py-3 px-4 text-right">Cleared Amount</th>
                <th className="py-3 px-4 text-center">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredCleared.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    <p className="text-sm font-medium">No cleared cheques found</p>
                    <p className="text-xs text-slate-400 mt-1">
                      No transactions matched the selected date range or search filters.
                    </p>
                  </td>
                </tr>
              ) : (
                filteredCleared.map((cheque) => {
                  const party = cheque.party_id ? partyMap.get(cheque.party_id) : null;
                  const bank = cheque.bank_id ? bankMap.get(cheque.bank_id) : null;

                  return (
                    <tr
                      key={cheque.id}
                      className="hover:bg-slate-50/80 transition-colors group"
                    >
                      {/* Cheque & Bill */}
                      <td className="py-3.5 px-4 font-mono">
                        <div className="font-bold text-slate-900 text-sm">
                          #{cheque.cheque_number}
                        </div>
                        {cheque.bill_number && (
                          <div className="text-[11px] text-slate-500 font-sans">
                            Bill: <span className="font-mono font-medium">{cheque.bill_number}</span>
                          </div>
                        )}
                      </td>

                      {/* Party */}
                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-slate-900">
                          {party ? party.name : <span className="text-slate-400 italic">Unassigned</span>}
                        </div>
                        {party?.phone && (
                          <div className="text-[11px] text-slate-400 font-mono">
                            {party.phone}
                          </div>
                        )}
                      </td>

                      {/* Bank */}
                      <td className="py-3.5 px-4">
                        <div className="text-slate-800 font-medium">
                          {bank?.name || 'Bank Not Specified'}
                        </div>
                        {bank?.code && (
                          <span className="text-[10px] bg-slate-100 text-slate-600 px-1 py-0.5 rounded font-mono font-semibold">
                            {bank.code}
                          </span>
                        )}
                      </td>

                      {/* Dates */}
                      <td className="py-3.5 px-4 font-mono">
                        <div className="font-bold text-slate-800">
                          {cheque.due_date_bs || cheque.issue_date_bs || '—'}{' '}
                          <span className="text-[9px] font-sans text-slate-400">BS</span>
                        </div>
                        <div className="text-[11px] text-slate-400">
                          {cheque.due_date_ad || cheque.issue_date_ad || '—'}{' '}
                          <span className="text-[9px] font-sans">AD</span>
                        </div>
                      </td>

                      {/* Cleared Amount */}
                      <td className="py-3.5 px-4 text-right font-mono">
                        <span className="font-bold text-emerald-700 text-sm">
                          रू {formatCurrency(cheque.amount)}
                        </span>
                      </td>

                      {/* Status */}
                      <td className="py-3.5 px-4 text-center">
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200">
                          <CheckCircle2 className="w-3 h-3" /> Cleared
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => onViewDetails(cheque)}
                            className="p-1.5 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition"
                            title="View statement & payment logs"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>

                          <button
                            onClick={() => onEditCheque(cheque)}
                            className="p-1.5 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition"
                            title="Edit"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>

                          <button
                            onClick={() => onDeleteCheque(cheque.id)}
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                            title="Delete"
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

        {/* Footer */}
        <div className="p-3.5 bg-slate-50/80 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500 gap-2">
          <span>
            Showing <strong className="text-slate-800">{filteredCleared.length}</strong> of{' '}
            <strong className="text-slate-800">{clearedAll.length}</strong> cleared cheques
          </span>
          <span className="font-mono">
            Total Cleared in Selection:{' '}
            <strong className="text-emerald-700">रू {formatCurrency(metrics.clearedInRange)}</strong>
          </span>
        </div>
      </div>
    </div>
  );
};
