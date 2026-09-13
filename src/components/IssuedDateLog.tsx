import React, { useState, useMemo } from 'react';
import {
  CalendarCheck,
  Plus,
  Search,
  Eye,
  Edit2,
  Trash2,
  CheckCircle2,
  Clock,
  Landmark,
  ArrowUpDown,
  Filter,
  FileSpreadsheet,
  FileText,
} from 'lucide-react';
import { Bank, Cheque, Party } from '../types';
import {
  formatCurrency,
  getCurrentAdDate,
  getCurrentBsDate,
  formatBsDateFriendly,
} from '../lib/dateUtils';
import {
  exportGroupedTableToPDF,
  exportGroupedTableToExcel,
  GroupedExportSection,
} from '../lib/exportUtils';

interface IssuedDateLogProps {
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

export const IssuedDateLog: React.FC<IssuedDateLogProps> = ({
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
  const [sortOrder, setSortOrder] = useState<'desc' | 'asc'>('desc');

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

  // Today & Yesterday dates in AD & BS
  const todayAd = getCurrentAdDate();
  const todayBs = getCurrentBsDate();

  const yesterdayAdDate = new Date();
  yesterdayAdDate.setDate(yesterdayAdDate.getDate() - 1);
  const yesterdayAd = yesterdayAdDate.toISOString().split('T')[0];

  // Filter cheques by search term
  const filteredCheques = useMemo(() => {
    let result = [...cheques];

    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase();
      result = result.filter((c) => {
        const pName = c.party_id ? (partyMap.get(c.party_id)?.name || '').toLowerCase() : '';
        const bName = c.bank_id ? (bankMap.get(c.bank_id)?.name || '').toLowerCase() : '';
        const chqNum = (c.cheque_number || '').toLowerCase();
        const billNum = (c.bill_number || '').toLowerCase();
        return pName.includes(q) || bName.includes(q) || chqNum.includes(q) || billNum.includes(q);
      });
    }

    result.sort((a, b) => {
      const dateA = a.issue_date_ad || a.created_at || '';
      const dateB = b.issue_date_ad || b.created_at || '';
      return sortOrder === 'desc' ? dateB.localeCompare(dateA) : dateA.localeCompare(dateB);
    });

    return result;
  }, [cheques, searchTerm, sortOrder, partyMap, bankMap]);

  // Group by issuance into Today's Entries, Yesterday's Entries, Earlier
  const groupedIssued = useMemo(() => {
    const todayItems: Cheque[] = [];
    const yesterdayItems: Cheque[] = [];
    const earlierItems: Cheque[] = [];

    filteredCheques.forEach((c) => {
      const issueAd = c.issue_date_ad || (c.created_at ? c.created_at.split('T')[0] : '');
      const issueBs = c.issue_date_bs || '';

      if (issueAd === todayAd || (todayBs && issueBs === todayBs)) {
        todayItems.push(c);
      } else if (issueAd === yesterdayAd) {
        yesterdayItems.push(c);
      } else {
        earlierItems.push(c);
      }
    });

    return [
      {
        id: 'today',
        title: "Today's Entries",
        subtitle: `Registered or issued on ${todayBs || todayAd}`,
        items: todayItems,
        headerBg: 'bg-emerald-50/80 border-emerald-200',
        badgeBg: 'bg-emerald-100 text-emerald-800 border-emerald-200',
      },
      {
        id: 'yesterday',
        title: "Yesterday's Entries",
        subtitle: 'Issued on previous business day',
        items: yesterdayItems,
        headerBg: 'bg-blue-50/80 border-blue-200',
        badgeBg: 'bg-blue-100 text-blue-800 border-blue-200',
      },
      {
        id: 'earlier',
        title: 'Earlier',
        subtitle: 'Prior issued dates archive',
        items: earlierItems,
        headerBg: 'bg-slate-50 border-slate-200',
        badgeBg: 'bg-slate-100 text-slate-700 border-slate-200',
      },
    ];
  }, [filteredCheques, todayAd, todayBs, yesterdayAd]);

  const totalAllAmount = useMemo(() => {
    return filteredCheques.reduce((sum, c) => sum + c.amount, 0);
  }, [filteredCheques]);

  const totalRemainingAmount = useMemo(() => {
    return filteredCheques.reduce((sum, c) => sum + c.remaining_amount, 0);
  }, [filteredCheques]);

  // Export functions
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

    return groupedIssued
      .filter((s) => s.items.length > 0)
      .map((s) => {
        const sumSection = s.items.reduce((acc, c) => acc + c.amount, 0);
        const remSection = s.items.reduce((acc, c) => acc + c.remaining_amount, 0);
        const rows = s.items.map((c) => [
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
          groupTitle: s.title,
          summaryText: `${s.items.length} cheques · रू ${formatCurrency(sumSection)} (Pending: रू ${formatCurrency(remSection)})`,
          headers,
          rows,
          footer: [
            `Subtotal (${s.title})`,
            '',
            `${s.items.length} Cheques`,
            '',
            '',
            '',
            `रू ${formatCurrency(sumSection)}`,
            `रू ${formatCurrency(remSection)}`,
            '',
          ],
        };
      });
  };

  const handleExportPDF = () => {
    const sections = buildExportSections();
    exportGroupedTableToPDF({
      fileName: `${companyName.replace(/[^a-zA-Z0-9]/g, '_')}_Issued_Log_${getCurrentBsDate()}`,
      companyName,
      reportTitle: 'Issued Date Log - Chronological Registry',
      dateRange: 'Grouped by Issuance Period',
      summaryMetrics: [
        { label: 'Total Issued Cheques', value: filteredCheques.length },
        { label: 'Total Issued Value', value: `रू ${formatCurrency(totalAllAmount)}` },
        { label: 'Pending Collection', value: `रू ${formatCurrency(totalRemainingAmount)}` },
      ],
      groups: sections,
      grandTotalFooter: [
        `GRAND TOTAL: ${filteredCheques.length} Cheques  |  Total Value: रू ${formatCurrency(
          totalAllAmount
        )}  |  Total Balance Due: रू ${formatCurrency(totalRemainingAmount)}`,
      ],
    });
  };

  const handleExportExcel = () => {
    const sections = buildExportSections();
    exportGroupedTableToExcel({
      fileName: `${companyName.replace(/[^a-zA-Z0-9]/g, '_')}_Issued_Log_${getCurrentBsDate()}`,
      companyName,
      reportTitle: 'Issued Date Log - Chronological Registry',
      dateRange: 'Grouped by Issuance Period',
      summaryMetrics: [
        { label: 'Total Issued Cheques', value: filteredCheques.length },
        { label: 'Total Issued Value', value: `रू ${formatCurrency(totalAllAmount)}` },
        { label: 'Pending Collection', value: `रू ${formatCurrency(totalRemainingAmount)}` },
      ],
      groups: sections,
      grandTotalFooter: [
        'GRAND TOTALS',
        '',
        `${filteredCheques.length} Cheques`,
        '',
        '',
        '',
        totalAllAmount,
        totalRemainingAmount,
        '',
      ],
    });
  };

  const renderStatusBadge = (status: string) => {
    switch (status) {
      case 'Cleared':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200">
            <CheckCircle2 className="w-3 h-3" /> Cleared
          </span>
        );
      case 'Partially Paid':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-800 border border-blue-200">
            <Clock className="w-3 h-3" /> Partially Paid
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 border border-amber-200">
            <Clock className="w-3 h-3" /> Pending
          </span>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <CalendarCheck className="w-5 h-5 text-emerald-600" />
            <span>Issued Date Log</span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Grouped chronologically by issuance into Today's Entries, Yesterday's Entries, and Earlier.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="bg-slate-50 px-4 py-2 rounded-xl border border-slate-200 text-right font-mono">
            <span className="text-[10px] text-slate-500 block uppercase font-sans font-semibold">
              Total Issued
            </span>
            <span className="text-sm font-bold text-slate-800">
              रू {formatCurrency(totalAllAmount)}
            </span>
          </div>

          <div className="bg-amber-50 px-4 py-2 rounded-xl border border-amber-200 text-right font-mono">
            <span className="text-[10px] text-amber-700 block uppercase font-sans font-semibold">
              Pending Balance
            </span>
            <span className="text-sm font-bold text-amber-900">
              रू {formatCurrency(totalRemainingAmount)}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleExportExcel}
              className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 rounded-xl transition shadow-2xs cursor-pointer"
              title="Download Issued Log Excel (.xlsx)"
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-700" />
              <span>Export Excel</span>
            </button>

            <button
              onClick={handleExportPDF}
              className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold bg-rose-50 hover:bg-rose-100 text-rose-800 border border-rose-300 rounded-xl transition shadow-2xs cursor-pointer"
              title="Download Issued Log PDF (.pdf)"
            >
              <FileText className="w-4 h-4 text-rose-700" />
              <span>Export PDF</span>
            </button>

            <button
              onClick={onNewCheque}
              className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl shadow-xs transition cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>New Cheque</span>
            </button>
          </div>
        </div>
      </div>

      {/* Search & Order Toolbar */}
      <div className="bg-white rounded-xl border border-slate-200/80 p-3.5 shadow-2xs flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search cheque #, bill, party..."
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

        <div className="flex items-center gap-2">
          <button
            onClick={() => setSortOrder(sortOrder === 'desc' ? 'asc' : 'desc')}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-600 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg transition"
          >
            <ArrowUpDown className="w-3.5 h-3.5 text-slate-500" />
            <span>Sort: {sortOrder === 'desc' ? 'Newest First' : 'Oldest First'}</span>
          </button>
        </div>
      </div>

      {/* Grouped Lists: Today's Entries, Yesterday's Entries, Earlier */}
      <div className="space-y-6">
        {groupedIssued.map((group) => {
          const totalGroupAmount = group.items.reduce((s, c) => s + c.amount, 0);
          const totalRemaining = group.items.reduce((s, c) => s + c.remaining_amount, 0);

          return (
            <div
              key={group.id}
              className="bg-white rounded-2xl border border-slate-200/80 shadow-2xs overflow-hidden"
            >
              {/* Group Header with Count and Total Sum */}
              <div
                className={`p-4 border-b flex flex-col sm:flex-row sm:items-center justify-between gap-2 ${group.headerBg}`}
              >
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-slate-900 text-base">
                      {group.title}
                    </h3>
                    <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-white text-slate-800 border border-slate-200 shadow-2xs font-mono">
                      {group.items.length} {group.items.length === 1 ? 'cheque' : 'cheques'} · रू {formatCurrency(totalGroupAmount)}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5 font-medium">
                    {group.subtitle}
                  </p>
                </div>

                <div className="flex items-center gap-4 text-xs font-mono">
                  <div className="text-right">
                    <span className="text-[10px] text-slate-400 block font-sans">Total Sum</span>
                    <span className="font-bold text-slate-900">रू {formatCurrency(totalGroupAmount)}</span>
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
                  No cheque entries in this group.
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
                        className="p-4 hover:bg-slate-50/75 transition-colors flex flex-col md:flex-row md:items-center justify-between gap-4"
                      >
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

                          <div className="text-sm font-medium text-slate-800">
                            {party?.name || 'Unassigned'}
                          </div>

                          <div className="flex items-center gap-2 text-xs text-slate-500">
                            <Landmark className="w-3.5 h-3.5 text-slate-400" />
                            <span>{bank?.name || 'Bank Not Specified'}</span>
                          </div>
                        </div>

                        {/* Dates */}
                        <div className="grid grid-cols-2 md:flex md:items-center gap-3 text-xs font-mono">
                          <div className="bg-slate-50/80 p-2 rounded-lg border border-slate-200/70 min-w-[130px]">
                            <span className="text-[10px] text-slate-400 font-sans block uppercase font-semibold">
                              Issued Date
                            </span>
                            <span className="font-bold text-slate-800 block">
                              {cheque.issue_date_bs || '—'} <span className="text-[9px] font-sans text-slate-400">BS</span>
                            </span>
                            <span className="text-[11px] text-slate-400 block">
                              {cheque.issue_date_ad || '—'} <span className="text-[9px] font-sans">AD</span>
                            </span>
                          </div>

                          <div className="bg-slate-50/80 p-2 rounded-lg border border-slate-200/70 min-w-[130px]">
                            <span className="text-[10px] text-slate-400 font-sans block uppercase font-semibold">
                              Due Date
                            </span>
                            <span className="font-bold text-slate-800 block">
                              {cheque.due_date_bs || '—'} <span className="text-[9px] font-sans text-slate-400">BS</span>
                            </span>
                            <span className="text-[11px] text-slate-400 block">
                              {cheque.due_date_ad || '—'} <span className="text-[9px] font-sans">AD</span>
                            </span>
                          </div>
                        </div>

                        {/* Amount & Balance Tracking */}
                        <div className="min-w-[170px] text-right font-mono space-y-0.5">
                          <div className="font-bold text-slate-900 text-base">
                            रू {formatCurrency(cheque.amount)}
                          </div>
                          <div className="text-xs flex items-center justify-end gap-1">
                            <span className="text-slate-400 font-sans text-[11px]">Remaining:</span>
                            <span
                              className={`font-semibold ${
                                cheque.remaining_amount > 0 ? 'text-amber-700' : 'text-emerald-600'
                              }`}
                            >
                              रू {formatCurrency(cheque.remaining_amount)}
                            </span>
                          </div>
                          {cheque.status === 'Partially Paid' && (
                            <div className="w-24 ml-auto bg-slate-100 rounded-full h-1.5 overflow-hidden">
                              <div
                                className="bg-emerald-600 h-full rounded-full"
                                style={{ width: `${progressPct}%` }}
                              />
                            </div>
                          )}
                        </div>

                        {/* Actions: Includes "+ Pay" */}
                        <div className="flex items-center justify-end gap-1.5 shrink-0 pt-2 md:pt-0 border-t md:border-t-0 border-slate-100">
                          {cheque.status !== 'Cleared' && (
                            <button
                              onClick={() => onRecordPayment(cheque)}
                              className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-lg transition shadow-2xs"
                              title="Record payment"
                            >
                              <Plus className="w-3.5 h-3.5" />
                              <span>+ Pay</span>
                            </button>
                          )}
                          <button
                            onClick={() => onViewDetails(cheque)}
                            className="p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition"
                            title="View details"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => onEditCheque(cheque)}
                            className="p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition"
                            title="Edit"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => onDeleteCheque(cheque.id)}
                            className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                            title="Delete"
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
