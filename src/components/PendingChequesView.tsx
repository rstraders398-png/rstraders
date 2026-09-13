import React, { useState, useMemo } from 'react';
import {
  Clock,
  Search,
  Filter,
  Download,
  Printer,
  Plus,
  ArrowUpDown,
  Eye,
  Edit2,
  Trash2,
  DollarSign,
  AlertTriangle,
  Calendar,
  Building2,
  FileSpreadsheet,
  FileText,
} from 'lucide-react';
import { Bank, Cheque, Party } from '../types';
import {
  formatCurrency,
  getCurrentBsDate,
  getCurrentAdDate,
} from '../lib/dateUtils';
import { exportTableToPDF, exportTableToExcel } from '../lib/exportUtils';

interface PendingChequesViewProps {
  cheques: Cheque[];
  parties: Party[];
  banks: Bank[];
  companyName: string;
  onRecordPayment: (cheque: Cheque) => void;
  onViewDetails: (cheque: Cheque) => void;
  onEditCheque: (cheque: Cheque) => void;
  onDeleteCheque: (id: string) => void;
  onNewCheque: () => void;
}

export const PendingChequesView: React.FC<PendingChequesViewProps> = ({
  cheques,
  parties,
  banks,
  companyName,
  onRecordPayment,
  onViewDetails,
  onEditCheque,
  onDeleteCheque,
  onNewCheque,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedBankId, setSelectedBankId] = useState('all');
  const [selectedPartyId, setSelectedPartyId] = useState('all');
  const [dateFilterField, setDateFilterField] = useState<'due' | 'issue'>('due');
  const [bsDateFrom, setBsDateFrom] = useState('');
  const [bsDateTo, setBsDateTo] = useState('');
  const [quickRange, setQuickRange] = useState<'all' | 'this_month' | 'next_30' | 'overdue'>('all');
  const [sortBy, setSortBy] = useState<'due_date' | 'amount' | 'remaining' | 'issue_date'>('due_date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

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

  // Handle Quick Range selection
  const handleQuickRange = (range: 'all' | 'this_month' | 'next_30' | 'overdue') => {
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
    } else if (range === 'next_30') {
      setBsDateFrom(todayBs);
      setBsDateTo('');
    } else if (range === 'overdue') {
      setBsDateFrom('');
      setBsDateTo(todayBs);
    }
  };

  // Filter only pending or partially paid cheques
  const pendingCheques = useMemo(() => {
    return cheques.filter((c) => c.status !== 'Cleared');
  }, [cheques]);

  // Filtered dataset
  const filteredCheques = useMemo(() => {
    return pendingCheques.filter((c) => {
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

      // BS Date Range filter
      const targetBsDate = dateFilterField === 'due' ? c.due_date_bs : c.issue_date_bs;
      if (bsDateFrom && targetBsDate && targetBsDate < bsDateFrom) return false;
      if (bsDateTo && targetBsDate && targetBsDate > bsDateTo) return false;

      // If quick range is overdue, check against today
      if (quickRange === 'overdue') {
        if (c.due_date_ad && c.due_date_ad >= todayAd) return false;
      }

      return true;
    }).sort((a, b) => {
      let comp = 0;
      if (sortBy === 'due_date') {
        comp = (a.due_date_ad || '').localeCompare(b.due_date_ad || '');
      } else if (sortBy === 'issue_date') {
        comp = (a.issue_date_ad || '').localeCompare(b.issue_date_ad || '');
      } else if (sortBy === 'amount') {
        comp = a.amount - b.amount;
      } else if (sortBy === 'remaining') {
        comp = a.remaining_amount - b.remaining_amount;
      }
      return sortOrder === 'asc' ? comp : -comp;
    });
  }, [
    pendingCheques,
    selectedPartyId,
    selectedBankId,
    searchTerm,
    dateFilterField,
    bsDateFrom,
    bsDateTo,
    quickRange,
    sortBy,
    sortOrder,
    partyMap,
    bankMap,
    todayAd,
  ]);

  // Real-time summary metrics
  const metrics = useMemo(() => {
    const totalRemaining = filteredCheques.reduce((s, c) => s + c.remaining_amount, 0);
    const totalFaceAmount = filteredCheques.reduce((s, c) => s + c.amount, 0);
    const totalCollectedPartials = totalFaceAmount - totalRemaining;

    const overdueCheques = filteredCheques.filter(
      (c) => c.due_date_ad && c.due_date_ad < todayAd
    );
    const overdueCount = overdueCheques.length;
    const overdueSum = overdueCheques.reduce((s, c) => s + c.remaining_amount, 0);

    const partialCount = filteredCheques.filter(
      (c) => c.status === 'Partially Paid' || (c.remaining_amount < c.amount && c.remaining_amount > 0)
    ).length;

    return {
      totalRemaining,
      totalFaceAmount,
      totalCollectedPartials,
      totalCount: filteredCheques.length,
      overdueCount,
      overdueSum,
      partialCount,
    };
  }, [filteredCheques, todayAd]);

  // Unified Excel (.xlsx) Export
  const handleExportExcel = () => {
    const headers = [
      'Cheque Number',
      'Bill Number',
      'Party Name',
      'Bank Name',
      'Issue Date (BS)',
      'Due Date (BS)',
      'Face Amount (NPR)',
      'Remaining Balance (NPR)',
      'Status',
      'Notes',
    ];

    const rows = filteredCheques.map((c) => {
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
        c.remaining_amount,
        c.status,
        c.notes || '—',
      ];
    });

    const dateRangeStr =
      bsDateFrom || bsDateTo
        ? `${bsDateFrom || 'Start'} to ${bsDateTo || 'End'} (BS)`
        : 'All Pending Records';

    exportTableToExcel({
      fileName: `${companyName.replace(/[^a-zA-Z0-9]/g, '_')}_Pending_Cheques_${getCurrentBsDate()}`,
      companyName,
      reportTitle: 'Pending & Outstanding Cheques Register',
      dateRange: dateRangeStr,
      summaryMetrics: [
        { label: 'Total Pending Cheques', value: filteredCheques.length },
        { label: 'Total Face Value', value: `रू ${formatCurrency(metrics.totalFaceAmount)}` },
        { label: 'Remaining Pending', value: `रू ${formatCurrency(metrics.totalRemaining)}` },
        { label: 'Overdue Cheques', value: `${metrics.overdueCount} (रू ${formatCurrency(metrics.overdueSum)})` },
      ],
      headers,
      rows,
      footers: [
        'GRAND TOTALS',
        '',
        `${filteredCheques.length} Cheques`,
        '',
        '',
        '',
        metrics.totalFaceAmount,
        metrics.totalRemaining,
        '',
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
      'Due Date (BS)',
      'Total Amount',
      'Remaining',
      'Status',
    ];

    const rows = filteredCheques.map((c) => {
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
        `रू ${formatCurrency(c.remaining_amount)}`,
        c.status,
      ];
    });

    const dateRangeStr =
      bsDateFrom || bsDateTo
        ? `${bsDateFrom || 'Start'} to ${bsDateTo || 'End'} (BS)`
        : 'All Pending Records';

    exportTableToPDF({
      fileName: `${companyName.replace(/[^a-zA-Z0-9]/g, '_')}_Pending_Cheques_${getCurrentBsDate()}`,
      companyName,
      reportTitle: 'Pending & Outstanding Cheques Register',
      dateRange: dateRangeStr,
      summaryMetrics: [
        { label: 'Total Pending Cheques', value: filteredCheques.length },
        { label: 'Total Face Value', value: `रू ${formatCurrency(metrics.totalFaceAmount)}` },
        { label: 'Remaining Pending', value: `रू ${formatCurrency(metrics.totalRemaining)}` },
        { label: 'Overdue Cheques', value: `${metrics.overdueCount} (रू ${formatCurrency(metrics.overdueSum)})` },
      ],
      headers,
      rows,
      footers: [
        'GRAND TOTALS',
        '',
        `${filteredCheques.length} Cheques`,
        '',
        '',
        '',
        `रू ${formatCurrency(metrics.totalFaceAmount)}`,
        `रू ${formatCurrency(metrics.totalRemaining)}`,
        '',
      ],
    });
  };

  // Browser Print View
  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      {/* Top Banner & Primary Actions */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-amber-50 text-amber-700 border border-amber-200">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900 tracking-tight">
                Pending Cheques Register
              </h2>
              <p className="text-xs text-slate-500">
                All outstanding and partially paid cheques requiring settlement or collection.
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={handleExportExcel}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 rounded-xl transition shadow-2xs cursor-pointer"
            title="Export filtered pending cheques to Excel (.xlsx)"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-700" />
            <span>Export Excel</span>
          </button>

          <button
            onClick={handleExportPDF}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold bg-rose-50 hover:bg-rose-100 text-rose-800 border border-rose-300 rounded-xl transition shadow-2xs cursor-pointer"
            title="Export filtered pending cheques to PDF (.pdf)"
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

          <button
            onClick={onNewCheque}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl transition shadow-xs cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>New Cheque</span>
          </button>
        </div>
      </div>

      {/* Real-time Total Summary Metrics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-amber-50/60 border border-amber-200/80 rounded-2xl p-4 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-amber-800 uppercase tracking-wider">
              Remaining Pending
            </span>
            <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-amber-200/60 text-amber-900 font-mono">
              {metrics.totalCount} Cheques
            </span>
          </div>
          <div className="text-xl font-bold font-mono text-amber-950 mt-1">
            रू {formatCurrency(metrics.totalRemaining)}
          </div>
          <div className="text-[11px] text-amber-700 mt-1 flex items-center justify-between">
            <span>Face Value:</span>
            <span className="font-mono font-semibold">रू {formatCurrency(metrics.totalFaceAmount)}</span>
          </div>
        </div>

        <div className="bg-rose-50/60 border border-rose-200/80 rounded-2xl p-4 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-rose-800 uppercase tracking-wider">
              Overdue in Filter
            </span>
            <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-rose-200/60 text-rose-900 font-mono">
              {metrics.overdueCount} Overdue
            </span>
          </div>
          <div className="text-xl font-bold font-mono text-rose-950 mt-1">
            रू {formatCurrency(metrics.overdueSum)}
          </div>
          <div className="text-[11px] text-rose-700 mt-1">
            Requires immediate presentation or follow-up
          </div>
        </div>

        <div className="bg-blue-50/60 border border-blue-200/80 rounded-2xl p-4 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-blue-800 uppercase tracking-wider">
              Partial Installments
            </span>
            <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-blue-200/60 text-blue-900 font-mono">
              {metrics.partialCount} Active
            </span>
          </div>
          <div className="text-xl font-bold font-mono text-blue-950 mt-1">
            रू {formatCurrency(metrics.totalCollectedPartials)}
          </div>
          <div className="text-[11px] text-blue-700 mt-1">
            Collected towards pending balance
          </div>
        </div>

        <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
              Company Context
            </span>
            <span className="text-[10px] font-mono bg-slate-200 text-slate-700 px-1.5 py-0.5 rounded">
              BS {todayBs}
            </span>
          </div>
          <div className="text-base font-bold text-slate-900 mt-1 truncate">
            {companyName}
          </div>
          <div className="text-[11px] text-slate-500 mt-1 font-mono">
            {parties.length} Parties · {banks.length} Banks
          </div>
        </div>
      </div>

      {/* BS Date Range Filter and Search Controls */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-2xs space-y-3">
        {/* Row 1: Search & Filter Mode */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search cheque #, bill #, party name, bank, notes..."
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

        {/* Row 2: BS Date Range Filter Controls */}
        <div className="pt-2 border-t border-slate-100 flex flex-col lg:flex-row lg:items-center justify-between gap-3 text-xs">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-semibold text-slate-700 flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5 text-emerald-600" />
              BS Date Filter:
            </span>

            <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded-lg">
              <button
                onClick={() => setDateFilterField('due')}
                className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition ${
                  dateFilterField === 'due'
                    ? 'bg-white text-slate-900 shadow-2xs font-semibold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Due Date (BS)
              </button>
              <button
                onClick={() => setDateFilterField('issue')}
                className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition ${
                  dateFilterField === 'issue'
                    ? 'bg-white text-slate-900 shadow-2xs font-semibold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Issue Date (BS)
              </button>
            </div>

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

          {/* Quick Presets */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 lg:pb-0">
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
              onClick={() => handleQuickRange('overdue')}
              className={`px-2 py-0.5 text-[11px] rounded-md transition ${
                quickRange === 'overdue'
                  ? 'bg-rose-600 text-white font-semibold'
                  : 'bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200'
              }`}
            >
              Overdue
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
              onClick={() => handleQuickRange('next_30')}
              className={`px-2 py-0.5 text-[11px] rounded-md transition ${
                quickRange === 'next_30'
                  ? 'bg-emerald-600 text-white font-semibold'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              Upcoming
            </button>
          </div>
        </div>
      </div>

      {/* Main Cheques Table Listing */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50/80 border-b border-slate-200 text-slate-600 uppercase font-semibold text-[10px] tracking-wider">
              <tr>
                <th className="py-3 px-4">Cheque / Bill #</th>
                <th className="py-3 px-4">Party</th>
                <th className="py-3 px-4">Bank</th>
                <th className="py-3 px-4">Due Date (BS / AD)</th>
                <th className="py-3 px-4 text-right">Face Amount</th>
                <th className="py-3 px-4 text-right">Balance Due</th>
                <th className="py-3 px-4 text-center">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredCheques.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    <p className="text-sm font-medium">No pending cheques found</p>
                    <p className="text-xs text-slate-400 mt-1">
                      Try adjusting the BS date range or search keyword.
                    </p>
                  </td>
                </tr>
              ) : (
                filteredCheques.map((cheque) => {
                  const party = cheque.party_id ? partyMap.get(cheque.party_id) : null;
                  const bank = cheque.bank_id ? bankMap.get(cheque.bank_id) : null;
                  const isOverdue = cheque.due_date_ad && cheque.due_date_ad < todayAd;
                  const paidAmount = cheque.amount - cheque.remaining_amount;
                  const pct = Math.min(100, Math.round((paidAmount / cheque.amount) * 100));

                  return (
                    <tr
                      key={cheque.id}
                      className="hover:bg-slate-50/80 transition-colors group"
                    >
                      {/* Cheque & Bill # */}
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

                      {/* Due Date */}
                      <td className="py-3.5 px-4 font-mono">
                        <div className="font-bold text-slate-900">
                          {cheque.due_date_bs || '—'} <span className="text-[9px] font-sans text-slate-400">BS</span>
                        </div>
                        <div className={`text-[11px] ${isOverdue ? 'text-rose-600 font-semibold' : 'text-slate-400'}`}>
                          {cheque.due_date_ad || '—'} <span className="text-[9px] font-sans">AD</span>
                          {isOverdue && <span className="ml-1 text-[9px] uppercase font-bold text-rose-600">(Overdue)</span>}
                        </div>
                      </td>

                      {/* Face Amount */}
                      <td className="py-3.5 px-4 text-right font-mono font-medium text-slate-600">
                        रू {formatCurrency(cheque.amount)}
                      </td>

                      {/* Balance Due */}
                      <td className="py-3.5 px-4 text-right font-mono">
                        <div className="font-bold text-amber-900 text-sm">
                          रू {formatCurrency(cheque.remaining_amount)}
                        </div>
                        {cheque.status === 'Partially Paid' && (
                          <div className="text-[10px] text-emerald-700 font-sans">
                            {pct}% paid (रू {formatCurrency(paidAmount)})
                          </div>
                        )}
                      </td>

                      {/* Status */}
                      <td className="py-3.5 px-4 text-center">
                        {cheque.status === 'Partially Paid' ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-blue-100 text-blue-800 border border-blue-200">
                            Partially Paid
                          </span>
                        ) : isOverdue ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-rose-100 text-rose-800 border border-rose-200">
                            <AlertTriangle className="w-3 h-3" /> Overdue
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-amber-100 text-amber-800 border border-amber-200">
                            Pending
                          </span>
                        )}
                      </td>

                      {/* Actions: Prominently includes "+ Pay" */}
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            id={`pending-pay-${cheque.id}`}
                            onClick={() => onRecordPayment(cheque)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-lg transition shadow-2xs"
                            title="Record partial or full payment"
                          >
                            <Plus className="w-3.5 h-3.5" />
                            <span>+ Pay</span>
                          </button>

                          <button
                            onClick={() => onViewDetails(cheque)}
                            className="p-1.5 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition"
                            title="View history"
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

        {/* Footer info */}
        <div className="p-3.5 bg-slate-50/80 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500 gap-2">
          <span>
            Showing <strong className="text-slate-800">{filteredCheques.length}</strong> of{' '}
            <strong className="text-slate-800">{pendingCheques.length}</strong> pending cheques
          </span>
          <span className="font-mono">
            Total Outstanding Filtered:{' '}
            <strong className="text-amber-800">रू {formatCurrency(metrics.totalRemaining)}</strong>
          </span>
        </div>
      </div>
    </div>
  );
};
