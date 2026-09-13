import React, { useState, useMemo } from 'react';
import {
  CalendarDays,
  Clock,
  DollarSign,
  Eye,
  Edit2,
  Trash2,
  AlertTriangle,
  CheckCircle2,
  Phone,
  Landmark,
  Search,
  Plus,
  ArrowRight,
  Filter,
  Calendar,
  FileSpreadsheet,
  FileText,
} from 'lucide-react';
import { Bank, Cheque, Party } from '../types';
import { formatCurrency, formatBsDateFriendly, getCurrentAdDate, getCurrentBsDate } from '../lib/dateUtils';
import { exportGroupedTableToPDF, exportGroupedTableToExcel, GroupedExportSection } from '../lib/exportUtils';

interface DueDateTimelineProps {
  cheques: Cheque[];
  parties: Party[];
  banks: Bank[];
  companyName?: string;
  onRecordPayment: (cheque: Cheque) => void;
  onViewDetails: (cheque: Cheque) => void;
  onEditCheque: (cheque: Cheque) => void;
  onDeleteCheque: (id: string) => void;
  onNewCheque: () => void;
}

export const DueDateTimeline: React.FC<DueDateTimelineProps> = ({
  cheques,
  parties,
  banks,
  companyName = "rstraders's Company",
  onRecordPayment,
  onViewDetails,
  onEditCheque,
  onDeleteCheque,
  onNewCheque,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'pending_only' | 'cleared_only'>('pending_only');

  const todayAd = getCurrentAdDate();

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

  // Filtered cheques
  const filtered = useMemo(() => {
    return cheques.filter((c) => {
      if (filterType === 'pending_only' && c.status === 'Cleared') return false;
      if (filterType === 'cleared_only' && c.status !== 'Cleared') return false;

      if (!searchTerm.trim()) return true;
      const q = searchTerm.toLowerCase();
      const pName = c.party_id ? (partyMap.get(c.party_id)?.name || '').toLowerCase() : '';
      const bName = c.bank_id ? (bankMap.get(c.bank_id)?.name || '').toLowerCase() : '';
      const num = (c.cheque_number || '').toLowerCase();
      const bill = (c.bill_number || '').toLowerCase();
      return pName.includes(q) || bName.includes(q) || num.includes(q) || bill.includes(q);
    });
  }, [cheques, searchTerm, filterType, partyMap, bankMap]);

  // Categorize by timeline buckets: Overdue, Today's Due, Tomorrow's Due, Upcoming
  const timelineGroups = useMemo(() => {
    const overdue: Cheque[] = [];
    const todayDue: Cheque[] = [];
    const tomorrowDue: Cheque[] = [];
    const upcoming: Cheque[] = [];
    const cleared: Cheque[] = [];

    const todayDate = new Date();
    todayDate.setHours(0, 0, 0, 0);

    filtered.forEach((chq) => {
      if (chq.status === 'Cleared') {
        cleared.push(chq);
        return;
      }

      if (!chq.due_date_ad) {
        upcoming.push(chq);
        return;
      }

      const due = new Date(chq.due_date_ad);
      due.setHours(0, 0, 0, 0);

      const diffDays = Math.round((due.getTime() - todayDate.getTime()) / (1000 * 60 * 60 * 24));

      if (diffDays < 0) {
        overdue.push(chq);
      } else if (diffDays === 0) {
        todayDue.push(chq);
      } else if (diffDays === 1) {
        tomorrowDue.push(chq);
      } else {
        upcoming.push(chq);
      }
    });

    // Sort within buckets
    const sortByDueAsc = (a: Cheque, b: Cheque) => (a.due_date_ad || '').localeCompare(b.due_date_ad || '');
    overdue.sort(sortByDueAsc);
    todayDue.sort(sortByDueAsc);
    tomorrowDue.sort(sortByDueAsc);
    upcoming.sort(sortByDueAsc);
    cleared.sort((a, b) => (b.due_date_ad || '').localeCompare(a.due_date_ad || ''));

    const groups = [
      {
        id: 'overdue',
        title: 'Overdue',
        description: 'Past due date — immediate action required',
        items: overdue,
        badgeColor: 'bg-rose-100 text-rose-800 border-rose-200',
        borderColor: 'border-l-4 border-rose-500',
        headerBg: 'bg-rose-50/80 border-rose-200',
        icon: AlertTriangle,
        iconColor: 'text-rose-600',
      },
      {
        id: 'today',
        title: "Today's Due",
        description: 'Cheques maturing today for deposit/presentation',
        items: todayDue,
        badgeColor: 'bg-amber-100 text-amber-800 border-amber-200',
        borderColor: 'border-l-4 border-amber-500',
        headerBg: 'bg-amber-50/80 border-amber-200',
        icon: Clock,
        iconColor: 'text-amber-600',
      },
      {
        id: 'tomorrow',
        title: "Tomorrow's Due",
        description: 'Due tomorrow — prepare for banking clearance',
        items: tomorrowDue,
        badgeColor: 'bg-blue-100 text-blue-800 border-blue-200',
        borderColor: 'border-l-4 border-blue-500',
        headerBg: 'bg-blue-50/80 border-blue-200',
        icon: CalendarDays,
        iconColor: 'text-blue-600',
      },
      {
        id: 'upcoming',
        title: 'Upcoming',
        description: 'Future scheduled presentation dates',
        items: upcoming,
        badgeColor: 'bg-slate-100 text-slate-800 border-slate-200',
        borderColor: 'border-l-4 border-slate-400',
        headerBg: 'bg-slate-50 border-slate-200',
        icon: Calendar,
        iconColor: 'text-slate-600',
      },
    ];

    if (filterType === 'all' || filterType === 'cleared_only') {
      groups.push({
        id: 'cleared',
        title: 'Cleared Cheques',
        description: 'Successfully settled cheques',
        items: cleared,
        badgeColor: 'bg-emerald-100 text-emerald-800 border-emerald-200',
        borderColor: 'border-l-4 border-emerald-500',
        headerBg: 'bg-emerald-50 border-emerald-200',
        icon: CheckCircle2,
        iconColor: 'text-emerald-600',
      });
    }

    return groups;
  }, [filtered, filterType]);

  // Overall statistics
  const totalAmountFiltered = useMemo(() => {
    return filtered.reduce((sum, c) => sum + c.amount, 0);
  }, [filtered]);

  const totalRemainingFiltered = useMemo(() => {
    return filtered.reduce((sum, c) => sum + c.remaining_amount, 0);
  }, [filtered]);

  // Export helper functions
  const buildExportSections = (): GroupedExportSection[] => {
    const headers = [
      'Cheque #',
      'Bill #',
      'Party Name',
      'Bank Name',
      'Issue Date (BS)',
      'Due Date (BS)',
      'Amount (NPR)',
      'Remaining (NPR)',
      'Status',
    ];

    return timelineGroups
      .filter((g) => g.items.length > 0)
      .map((g) => {
        const sumGroup = g.items.reduce((acc, c) => acc + c.amount, 0);
        const remGroup = g.items.reduce((acc, c) => acc + c.remaining_amount, 0);
        const rows = g.items.map((c) => [
          c.cheque_number,
          c.bill_number || '—',
          c.party_id ? partyMap.get(c.party_id)?.name || 'Unassigned' : 'Unassigned',
          c.bank_id ? bankMap.get(c.bank_id)?.name || '—' : '—',
          c.issue_date_bs || '—',
          c.due_date_bs || '—',
          `रू ${formatCurrency(c.amount)}`,
          `रू ${formatCurrency(c.remaining_amount)}`,
          c.status,
        ]);

        return {
          groupTitle: g.title,
          summaryText: `${g.items.length} cheques · Total: रू ${formatCurrency(sumGroup)} (Pending: रू ${formatCurrency(remGroup)})`,
          headers,
          rows,
          footer: [
            `Subtotal (${g.title})`,
            '',
            `${g.items.length} Cheques`,
            '',
            '',
            '',
            `रू ${formatCurrency(sumGroup)}`,
            `रू ${formatCurrency(remGroup)}`,
            '',
          ],
        };
      });
  };

  const handleExportPDF = () => {
    const sections = buildExportSections();
    exportGroupedTableToPDF({
      fileName: `${companyName.replace(/[^a-zA-Z0-9]/g, '_')}_DueDate_Timeline_${getCurrentBsDate()}`,
      companyName,
      reportTitle: 'Due Date Timeline & Cheque Presentation Schedule',
      dateRange: 'All Filtered Groups',
      summaryMetrics: [
        { label: 'Total Matched Cheques', value: filtered.length },
        { label: 'Total Cheque Value', value: `रू ${formatCurrency(totalAmountFiltered)}` },
        { label: 'Remaining Pending', value: `रू ${formatCurrency(totalRemainingFiltered)}` },
      ],
      groups: sections,
      grandTotalFooter: [
        `GRAND TOTAL: ${filtered.length} Cheques  |  Total Value: रू ${formatCurrency(
          totalAmountFiltered
        )}  |  Total Balance Due: रू ${formatCurrency(totalRemainingFiltered)}`,
      ],
    });
  };

  const handleExportExcel = () => {
    const sections = buildExportSections();
    exportGroupedTableToExcel({
      fileName: `${companyName.replace(/[^a-zA-Z0-9]/g, '_')}_DueDate_Timeline_${getCurrentBsDate()}`,
      companyName,
      reportTitle: 'Due Date Timeline & Cheque Presentation Schedule',
      dateRange: 'All Filtered Groups',
      summaryMetrics: [
        { label: 'Total Matched Cheques', value: filtered.length },
        { label: 'Total Cheque Value', value: `रू ${formatCurrency(totalAmountFiltered)}` },
        { label: 'Remaining Pending', value: `रू ${formatCurrency(totalRemainingFiltered)}` },
      ],
      groups: sections,
      grandTotalFooter: [
        'GRAND TOTALS',
        '',
        `${filtered.length} Cheques`,
        '',
        '',
        '',
        totalAmountFiltered,
        totalRemainingFiltered,
        '',
      ],
    });
  };

  const renderStatusBadge = (status: Cheque['status']) => {
    switch (status) {
      case 'Cleared':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200">
            <CheckCircle2 className="w-3 h-3" />
            Cleared
          </span>
        );
      case 'Partially Paid':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-800 border border-blue-200">
            <Clock className="w-3 h-3" />
            Partially Paid
          </span>
        );
      case 'Pending':
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 border border-amber-200">
            <Clock className="w-3 h-3" />
            Pending
          </span>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner / Summary */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200">
              <CalendarDays className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900 tracking-tight">
                Due Date Timeline
              </h2>
              <p className="text-xs text-slate-500">
                Organized presentation schedule grouped into Overdue, Today's Due, Tomorrow's Due, and Upcoming
              </p>
            </div>
          </div>
        </div>

        {/* Global Action & Summary Metrics */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="bg-slate-50 px-4 py-2 rounded-xl border border-slate-200 text-right font-mono">
            <span className="text-[10px] text-slate-500 block uppercase font-sans font-semibold">
              Total Listed
            </span>
            <span className="text-sm font-bold text-slate-800">
              रू {formatCurrency(totalAmountFiltered)}
            </span>
          </div>

          <div className="bg-amber-50 px-4 py-2 rounded-xl border border-amber-200 text-right font-mono">
            <span className="text-[10px] text-amber-700 block uppercase font-sans font-semibold">
              Remaining Pending
            </span>
            <span className="text-sm font-bold text-amber-900">
              रू {formatCurrency(totalRemainingFiltered)}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleExportExcel}
              className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 rounded-xl transition shadow-2xs cursor-pointer"
              title="Download Timeline Excel (.xlsx)"
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-700" />
              <span>Export Excel</span>
            </button>

            <button
              onClick={handleExportPDF}
              className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold bg-rose-50 hover:bg-rose-100 text-rose-800 border border-rose-300 rounded-xl transition shadow-2xs cursor-pointer"
              title="Download Timeline PDF (.pdf)"
            >
              <FileText className="w-4 h-4 text-rose-700" />
              <span>Export PDF</span>
            </button>

            <button
              id="timeline-new-cheque-btn"
              onClick={onNewCheque}
              className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl shadow-xs transition cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>New Cheque</span>
            </button>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-3.5 rounded-xl border border-slate-200/80 shadow-2xs flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search party, bank, cheque #, bill #..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500"
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-slate-600"
            >
              ×
            </button>
          )}
        </div>

        <div className="flex items-center gap-1.5 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0">
          <span className="text-xs text-slate-400 flex items-center gap-1 px-1">
            <Filter className="w-3 h-3" /> Filter:
          </span>
          <button
            onClick={() => setFilterType('pending_only')}
            className={`px-3 py-1 text-xs font-medium rounded-lg transition ${
              filterType === 'pending_only'
                ? 'bg-amber-100 text-amber-900 font-semibold border border-amber-300'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            Pending Only
          </button>
          <button
            onClick={() => setFilterType('all')}
            className={`px-3 py-1 text-xs font-medium rounded-lg transition ${
              filterType === 'all'
                ? 'bg-emerald-600 text-white font-semibold shadow-2xs'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            All Cheques
          </button>
          <button
            onClick={() => setFilterType('cleared_only')}
            className={`px-3 py-1 text-xs font-medium rounded-lg transition ${
              filterType === 'cleared_only'
                ? 'bg-emerald-100 text-emerald-900 font-semibold border border-emerald-300'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            Cleared Only
          </button>
        </div>
      </div>

      {/* Timeline Groups */}
      <div className="space-y-6">
        {timelineGroups.map((group) => {
          const GroupIcon = group.icon;
          const totalGroupAmount = group.items.reduce((sum, c) => sum + c.amount, 0);
          const totalRemaining = group.items.reduce((sum, c) => sum + c.remaining_amount, 0);

          return (
            <div
              key={group.id}
              className="bg-white rounded-2xl border border-slate-200/80 shadow-2xs overflow-hidden"
            >
              {/* Group Header matching user requirement: e.g. "2 cheques · रू 1,24,160" */}
              <div
                className={`p-4 border-b flex flex-col sm:flex-row sm:items-center justify-between gap-2 ${group.headerBg}`}
              >
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-xl bg-white shadow-2xs ${group.iconColor}`}>
                    <GroupIcon className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-bold text-slate-900 text-base">
                        {group.title}
                      </h3>
                      {/* Sub-header badge formatted as requested: "X cheques · रू Y" */}
                      <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-white text-slate-800 border border-slate-200 shadow-2xs font-mono">
                        {group.items.length} {group.items.length === 1 ? 'cheque' : 'cheques'} · रू {formatCurrency(totalGroupAmount)}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 font-medium">
                      {group.description}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-4 text-xs font-mono">
                  <div className="text-right">
                    <span className="text-[10px] text-slate-400 block font-sans">Total Sum</span>
                    <span className="font-bold text-slate-800">रू {formatCurrency(totalGroupAmount)}</span>
                  </div>
                  {totalRemaining > 0 && (
                    <div className="text-right pl-3 border-l border-slate-200">
                      <span className="text-[10px] text-amber-600 block font-sans">Remaining Due</span>
                      <span className="font-bold text-amber-700">रू {formatCurrency(totalRemaining)}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Items List */}
              {group.items.length === 0 ? (
                <div className="p-6 text-center text-xs text-slate-400 italic">
                  No cheques in this bucket.
                </div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {group.items.map((cheque) => {
                    const party = cheque.party_id ? partyMap.get(cheque.party_id) : null;
                    const bank = cheque.bank_id ? bankMap.get(cheque.bank_id) : null;
                    const paidAmount = cheque.amount - cheque.remaining_amount;
                    const progressPct = Math.min(
                      100,
                      Math.max(0, Math.round((paidAmount / cheque.amount) * 100))
                    );

                    return (
                      <div
                        key={cheque.id}
                        className={`p-4 hover:bg-slate-50/80 transition-colors flex flex-col md:flex-row md:items-center justify-between gap-4 ${group.borderColor}`}
                      >
                        {/* Cheque & Party Info */}
                        <div className="space-y-1 min-w-[220px]">
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-bold text-slate-900 text-sm">
                              #{cheque.cheque_number}
                            </span>
                            {cheque.bill_number && (
                              <span className="text-[11px] px-1.5 py-0.5 bg-slate-100 text-slate-600 rounded font-mono">
                                Bill: {cheque.bill_number}
                              </span>
                            )}
                            {renderStatusBadge(cheque.status)}
                          </div>

                          <div className="flex items-center gap-2">
                            <span className="font-medium text-slate-800 text-sm">
                              {party ? party.name : <span className="text-slate-400 italic">Unassigned</span>}
                            </span>
                            {party?.phone && (
                              <span className="text-[11px] text-slate-400 flex items-center gap-0.5">
                                <Phone className="w-2.5 h-2.5" />
                                {party.phone}
                              </span>
                            )}
                          </div>

                          <div className="flex items-center gap-2 text-xs text-slate-500">
                            <Landmark className="w-3.5 h-3.5 text-slate-400" />
                            <span>{bank?.name || 'Bank Not Specified'}</span>
                            {bank?.code && (
                              <span className="text-[10px] bg-slate-100 px-1 py-0.5 rounded font-mono font-semibold">
                                {bank.code}
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Due Date & Issue Date */}
                        <div className="grid grid-cols-2 md:flex md:items-center gap-4 text-xs font-mono">
                          <div className="bg-slate-50 p-2 rounded-lg border border-slate-200/70 min-w-[130px]">
                            <span className="text-[10px] uppercase font-sans text-slate-400 block font-semibold">
                              Due Date
                            </span>
                            <span className="font-bold text-slate-900 block">
                              {cheque.due_date_bs || '—'} <span className="text-[9px] font-sans text-slate-500">BS</span>
                            </span>
                            <span className="text-[11px] text-slate-500 block">
                              {cheque.due_date_ad || '—'} <span className="text-[9px] font-sans">AD</span>
                            </span>
                          </div>

                          <div className="bg-slate-50/50 p-2 rounded-lg border border-slate-200/50 min-w-[130px]">
                            <span className="text-[10px] uppercase font-sans text-slate-400 block font-semibold">
                              Issue Date
                            </span>
                            <span className="font-medium text-slate-700 block">
                              {cheque.issue_date_bs || '—'} <span className="text-[9px] font-sans text-slate-400">BS</span>
                            </span>
                            <span className="text-[11px] text-slate-400 block">
                              {cheque.issue_date_ad || '—'} <span className="text-[9px] font-sans">AD</span>
                            </span>
                          </div>
                        </div>

                        {/* Amount, Partial Balance Tracking & Progress */}
                        <div className="min-w-[180px] text-right font-mono space-y-1">
                          <div className="text-xs text-slate-400 font-sans">Total Cheque Amount</div>
                          <div className="font-bold text-slate-900 text-base">
                            रू {formatCurrency(cheque.amount)}
                          </div>

                          {/* Balance tracking */}
                          <div className="flex items-center justify-end gap-2 text-xs">
                            <span className="text-slate-400 font-sans text-[11px]">Remaining:</span>
                            <span
                              className={`font-bold ${
                                cheque.remaining_amount > 0 ? 'text-amber-700' : 'text-emerald-600'
                              }`}
                            >
                              रू {formatCurrency(cheque.remaining_amount)}
                            </span>
                          </div>

                          {/* Progress bar for partial payments */}
                          {cheque.status === 'Partially Paid' && (
                            <div className="space-y-0.5">
                              <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                                <div
                                  className="bg-emerald-600 h-full rounded-full transition-all"
                                  style={{ width: `${progressPct}%` }}
                                />
                              </div>
                              <span className="text-[10px] text-slate-400 font-sans block">
                                {progressPct}% cleared (रू {formatCurrency(paidAmount)} paid)
                              </span>
                            </div>
                          )}
                        </div>

                        {/* Action Buttons: Includes "+ Pay" */}
                        <div className="flex items-center justify-end gap-1.5 shrink-0 pt-2 md:pt-0 border-t md:border-t-0 border-slate-100">
                          {cheque.status !== 'Cleared' && (
                            <button
                              id={`timeline-pay-${cheque.id}`}
                              onClick={() => onRecordPayment(cheque)}
                              className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-lg transition shadow-2xs"
                              title="Record partial or full payment"
                            >
                              <Plus className="w-3.5 h-3.5" />
                              <span>+ Pay</span>
                            </button>
                          )}

                          <button
                            onClick={() => onViewDetails(cheque)}
                            className="p-2 text-slate-500 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg transition border border-transparent hover:border-emerald-200"
                            title="View full history & payment logs"
                          >
                            <Eye className="w-4 h-4" />
                          </button>

                          <button
                            onClick={() => onEditCheque(cheque)}
                            className="p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition"
                            title="Edit cheque details"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>

                          <button
                            onClick={() => onDeleteCheque(cheque.id)}
                            className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                            title="Delete cheque"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
