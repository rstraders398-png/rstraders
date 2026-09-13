import React, { useState, useEffect, useMemo } from 'react';
import {
  Receipt,
  Search,
  Plus,
  Calendar,
  Building,
  Landmark,
  Clock,
  CheckCircle2,
  FileSpreadsheet,
  FileText,
  Printer,
  Trash2,
  Filter,
  DollarSign,
  TrendingUp,
  X,
  CreditCard,
  ChevronDown,
  ChevronUp,
  RotateCcw,
} from 'lucide-react';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import { Cheque, Party, Bank, PaymentLog, PaymentMode } from '../types';
import {
  recordPayment,
  deletePaymentLog,
  subscribeToAllPaymentLogs,
} from '../lib/chequeService';
import {
  formatCurrency,
  getCurrentAdDate,
  getCurrentBsDate,
  adToBs,
  bsToAd,
} from '../lib/dateUtils';

interface PartialPaymentsViewProps {
  cheques: Cheque[];
  parties: Party[];
  banks: Bank[];
  companyId: string;
  companyName: string;
  initialSelectedChequeId?: string | null;
  onOpenNewCheque?: () => void;
}

export const PartialPaymentsView: React.FC<PartialPaymentsViewProps> = ({
  cheques,
  parties,
  banks,
  companyId,
  companyName,
  initialSelectedChequeId,
}) => {
  // Maps for fast lookups
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

  // Real-time Payment Logs from Firestore
  const [allCompanyLogs, setAllCompanyLogs] = useState<PaymentLog[]>([]);
  const [isLoadingLogs, setIsLoadingLogs] = useState(true);

  useEffect(() => {
    if (!companyId) return;
    setIsLoadingLogs(true);
    const unsub = subscribeToAllPaymentLogs(companyId, (logs) => {
      setAllCompanyLogs(logs);
      setIsLoadingLogs(false);
    });
    return () => unsub();
  }, [companyId]);

  // Group logs by cheque ID
  const logsByChequeId = useMemo(() => {
    const map = new Map<string, PaymentLog[]>();
    allCompanyLogs.forEach((log) => {
      const existing = map.get(log.cheque_id) || [];
      existing.push(log);
      map.set(log.cheque_id, existing);
    });
    // Sort each group by date descending
    map.forEach((logs) => {
      logs.sort(
        (a, b) =>
          new Date(b.created_at || b.payment_date_ad).getTime() -
          new Date(a.created_at || a.payment_date_ad).getTime()
      );
    });
    return map;
  }, [allCompanyLogs]);

  // Filter States
  const [fromDateBs, setFromDateBs] = useState<string>('');
  const [toDateBs, setToDateBs] = useState<string>('');
  const [fromDateAd, setFromDateAd] = useState<string>('');
  const [toDateAd, setToDateAd] = useState<string>('');
  const [dateFilterType, setDateFilterType] = useState<'payment_date' | 'cheque_due' | 'cheque_issue'>('payment_date');
  const [statusFilter, setStatusFilter] = useState<'all' | 'partial' | 'unsettled' | 'cleared'>('all');
  const [searchTerm, setSearchTerm] = useState<string>('');

  // Synchronize BS <-> AD date range
  const handleFromBsChange = (bs: string) => {
    setFromDateBs(bs);
    const ad = bsToAd(bs);
    setFromDateAd(ad || '');
  };

  const handleFromAdChange = (ad: string) => {
    setFromDateAd(ad);
    const bs = adToBs(ad);
    setFromDateBs(bs || '');
  };

  const handleToBsChange = (bs: string) => {
    setToDateBs(bs);
    const ad = bsToAd(bs);
    setToDateAd(ad || '');
  };

  const handleToAdChange = (ad: string) => {
    setToDateAd(ad);
    const bs = adToBs(ad);
    setToDateBs(bs || '');
  };

  // Date Presets
  const applyPreset = (preset: 'all' | 'today' | 'this_month' | 'last_month' | 'fy2081') => {
    const todayBs = getCurrentBsDate();
    const todayAd = getCurrentAdDate();

    if (preset === 'all') {
      setFromDateBs('');
      setToDateBs('');
      setFromDateAd('');
      setToDateAd('');
      return;
    }

    if (preset === 'today') {
      setFromDateBs(todayBs);
      setToDateBs(todayBs);
      setFromDateAd(todayAd);
      setToDateAd(todayAd);
      return;
    }

    const parts = todayBs.split('-');
    const currentYear = parseInt(parts[0], 10) || 2081;
    const currentMonth = parseInt(parts[1], 10) || 1;

    if (preset === 'this_month') {
      const startBs = `${currentYear}-${String(currentMonth).padStart(2, '0')}-01`;
      const endBs = `${currentYear}-${String(currentMonth).padStart(2, '0')}-32`;
      setFromDateBs(startBs);
      setToDateBs(endBs);
      setFromDateAd(bsToAd(startBs) || '');
      setToDateAd(bsToAd(endBs) || '');
      return;
    }

    if (preset === 'last_month') {
      let prevYear = currentYear;
      let prevMonth = currentMonth - 1;
      if (prevMonth < 1) {
        prevMonth = 12;
        prevYear -= 1;
      }
      const startBs = `${prevYear}-${String(prevMonth).padStart(2, '0')}-01`;
      const endBs = `${prevYear}-${String(prevMonth).padStart(2, '0')}-32`;
      setFromDateBs(startBs);
      setToDateBs(endBs);
      setFromDateAd(bsToAd(startBs) || '');
      setToDateAd(bsToAd(endBs) || '');
      return;
    }

    if (preset === 'fy2081') {
      const startBs = '2081-04-01';
      const endBs = '2082-03-31';
      setFromDateBs(startBs);
      setToDateBs(endBs);
      setFromDateAd(bsToAd(startBs) || '');
      setToDateAd(bsToAd(endBs) || '');
      return;
    }
  };

  // Human-readable date range description for Header & Reports
  const dateRangeDescription = useMemo(() => {
    if (!fromDateBs && !toDateBs) {
      return 'All Time Records (Full Ledger)';
    }
    const fromStr = fromDateBs ? `${fromDateBs} BS` : 'Earliest';
    const toStr = toDateBs ? `${toDateBs} BS` : 'Latest';
    const adInfo = fromDateAd || toDateAd ? ` (${fromDateAd || '—'} to ${toDateAd || '—'} AD)` : '';
    return `${fromStr} to ${toStr}${adInfo}`;
  }, [fromDateBs, toDateBs, fromDateAd, toDateAd]);

  // Filtered Cheques and associated payment logs
  const filteredData = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();

    return cheques.filter((cheque) => {
      // 1. Status Filter
      if (statusFilter === 'partial') {
        const isPartial =
          cheque.status === 'Partially Paid' ||
          (cheque.remaining_amount < cheque.amount && cheque.remaining_amount > 0);
        if (!isPartial) return false;
      } else if (statusFilter === 'unsettled') {
        if (cheque.status === 'Cleared') return false;
      } else if (statusFilter === 'cleared') {
        if (cheque.status !== 'Cleared') return false;
      }

      // 2. Search Term Filter (Cheque No, Bill No, Party, Bank)
      if (q) {
        const partyName = cheque.party_id ? partyMap.get(cheque.party_id)?.name.toLowerCase() || '' : '';
        const bankName = cheque.bank_id ? bankMap.get(cheque.bank_id)?.name.toLowerCase() || '' : '';
        const chqNo = (cheque.cheque_number || '').toLowerCase();
        const billNo = (cheque.bill_number || '').toLowerCase();
        const matches =
          chqNo.includes(q) ||
          billNo.includes(q) ||
          partyName.includes(q) ||
          bankName.includes(q);

        if (!matches) return false;
      }

      // 3. Date Range Filter
      if (fromDateBs || toDateBs) {
        if (dateFilterType === 'payment_date') {
          // Cheque matches if it has at least one payment log within the date range
          const logs = logsByChequeId.get(cheque.id) || [];
          if (logs.length === 0) {
            // If no logs, also match if cheque due date is within range
            const due = cheque.due_date_bs || '';
            if (fromDateBs && due < fromDateBs) return false;
            if (toDateBs && due > toDateBs) return false;
            return true;
          }
          const hasLogInRange = logs.some((l) => {
            const pDate = l.payment_date_bs || '';
            if (fromDateBs && pDate < fromDateBs) return false;
            if (toDateBs && pDate > toDateBs) return false;
            return true;
          });
          if (!hasLogInRange) return false;
        } else if (dateFilterType === 'cheque_due') {
          const due = cheque.due_date_bs || '';
          if (fromDateBs && due < fromDateBs) return false;
          if (toDateBs && due > toDateBs) return false;
        } else if (dateFilterType === 'cheque_issue') {
          const issue = cheque.issue_date_bs || '';
          if (fromDateBs && issue < fromDateBs) return false;
          if (toDateBs && issue > toDateBs) return false;
        }
      }

      return true;
    });
  }, [cheques, statusFilter, searchTerm, partyMap, bankMap, fromDateBs, toDateBs, dateFilterType, logsByChequeId]);

  // Payment Logs relevant to filtered cheques (filtered by date if dateFilterType is payment_date)
  const filteredLogs = useMemo(() => {
    const matchedChequeIds = new Set(filteredData.map((c) => c.id));
    return allCompanyLogs.filter((log) => {
      if (!matchedChequeIds.has(log.cheque_id)) return false;
      if ((fromDateBs || toDateBs) && dateFilterType === 'payment_date') {
        const pDate = log.payment_date_bs || '';
        if (fromDateBs && pDate < fromDateBs) return false;
        if (toDateBs && pDate > toDateBs) return false;
      }
      return true;
    });
  }, [filteredData, allCompanyLogs, fromDateBs, toDateBs, dateFilterType]);

  // Summary Metrics Bar
  const totalChequeValue = useMemo(() => {
    return filteredData.reduce((sum, c) => sum + (c.amount || 0), 0);
  }, [filteredData]);

  const totalRemainingBalance = useMemo(() => {
    return filteredData.reduce(
      (sum, c) => sum + (c.remaining_amount ?? c.amount ?? 0),
      0
    );
  }, [filteredData]);

  const totalReceivedAmount = useMemo(() => {
    return filteredLogs.reduce((sum, l) => sum + (l.amount || 0), 0);
  }, [filteredLogs]);

  const totalTransactionsCount = filteredLogs.length;

  const recoveryRate = useMemo(() => {
    if (totalChequeValue <= 0) return 0;
    const rate = (totalReceivedAmount / totalChequeValue) * 100;
    return Math.min(100, Math.round(rate * 10) / 10);
  }, [totalReceivedAmount, totalChequeValue]);

  // Payment Entry Modal State
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [targetCheque, setTargetCheque] = useState<Cheque | null>(null);
  const [paymentAmount, setPaymentAmount] = useState<string>('');
  const [paymentMode, setPaymentMode] = useState<PaymentMode>('Cash');
  const [entryDateBs, setEntryDateBs] = useState<string>(getCurrentBsDate());
  const [entryDateAd, setEntryDateAd] = useState<string>(getCurrentAdDate());
  const [paymentNotes, setPaymentNotes] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);
  const [modalSuccess, setModalSuccess] = useState<string | null>(null);

  // Open modal with pre-selected cheque
  const openPaymentModal = (cheque?: Cheque) => {
    const chq = cheque || (filteredData.length > 0 ? filteredData[0] : null);
    setTargetCheque(chq);
    setPaymentAmount('');
    setPaymentMode('Cash');
    setEntryDateBs(getCurrentBsDate());
    setEntryDateAd(getCurrentAdDate());
    setPaymentNotes('');
    setModalError(null);
    setModalSuccess(null);
    setIsPaymentModalOpen(true);
  };

  useEffect(() => {
    if (initialSelectedChequeId) {
      const found = cheques.find((c) => c.id === initialSelectedChequeId);
      if (found) {
        openPaymentModal(found);
      }
    }
  }, [initialSelectedChequeId, cheques]);

  const handleEntryBsChange = (bs: string) => {
    setEntryDateBs(bs);
    const ad = bsToAd(bs);
    if (ad) setEntryDateAd(ad);
  };

  const handleEntryAdChange = (ad: string) => {
    setEntryDateAd(ad);
    const bs = adToBs(ad);
    if (bs) setEntryDateBs(bs);
  };

  // Submit payment entry
  const handleSubmitPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetCheque) {
      setModalError('Please select a valid cheque to log payment.');
      return;
    }

    const num = parseFloat(paymentAmount);
    if (isNaN(num) || num <= 0) {
      setModalError('Please enter a valid payment amount greater than 0.');
      return;
    }

    if (num > targetCheque.remaining_amount + 0.001) {
      setModalError(
        `Payment amount (रू ${formatCurrency(num)}) cannot exceed remaining balance (रू ${formatCurrency(
          targetCheque.remaining_amount
        )}).`
      );
      return;
    }

    setIsSubmitting(true);
    setModalError(null);

    try {
      await recordPayment({
        cheque_id: targetCheque.id,
        company_id: companyId,
        amount: num,
        payment_mode: paymentMode,
        payment_date_bs: entryDateBs,
        payment_date_ad: entryDateAd,
        notes: paymentNotes.trim(),
      });

      setModalSuccess(
        `Successfully logged रू ${formatCurrency(num)} (${paymentMode}) for Cheque #${targetCheque.cheque_number}!`
      );
      setPaymentAmount('');
      setPaymentNotes('');
      setTimeout(() => {
        setIsPaymentModalOpen(false);
        setModalSuccess(null);
      }, 1200);
    } catch (err: any) {
      setModalError(err?.message || 'Failed to record payment entry.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Delete payment log
  const handleDeleteLog = async (log: PaymentLog) => {
    if (
      !confirm(
        `Are you sure you want to revert this payment of रू ${formatCurrency(
          log.amount
        )} (${log.payment_mode})? The cheque balance will be automatically restored.`
      )
    ) {
      return;
    }

    try {
      await deletePaymentLog(log);
    } catch (err: any) {
      alert(err?.message || 'Failed to revert payment log.');
    }
  };

  // ==========================================
  // EXPORT 1: Real Excel (.xlsx) Export
  // ==========================================
  const handleExportXLSX = () => {
    const activeCompany = companyName || "rstraders's Company";
    const reportTitle = 'Partial Payment Ledger Report';
    const genDate = `${getCurrentBsDate()} BS (${getCurrentAdDate()} AD)`;

    // Construct Sheet Data (AoA)
    const sheetData: (string | number)[][] = [
      ['COMPANY NAME:', activeCompany],
      ['REPORT TITLE:', reportTitle],
      ['GENERATED ON:', genDate],
      ['APPLIED DATE FILTER:', dateRangeDescription],
      ['STATUS FILTER:', statusFilter.toUpperCase()],
      [],
      [
        'Cheque No',
        'Bill No',
        'Party Name',
        'Bank Name',
        'Original Amount (NPR)',
        'Entry Date (BS)',
        'Entry Date (AD)',
        'Amount Received (NPR)',
        'Payment Mode',
        'Voucher / Notes',
        'Remaining Balance (NPR)',
        'Status',
      ],
    ];

    let totalOriginal = 0;
    let totalReceived = 0;
    let totalRemaining = 0;

    filteredData.forEach((c) => {
      const p = c.party_id ? partyMap.get(c.party_id)?.name || 'Unassigned' : 'Unassigned';
      const b = c.bank_id ? bankMap.get(c.bank_id)?.name || '—' : '—';
      const logs = logsByChequeId.get(c.id) || [];

      totalOriginal += c.amount;
      totalRemaining += c.remaining_amount;

      if (logs.length === 0) {
        sheetData.push([
          c.cheque_number,
          c.bill_number || '—',
          p,
          b,
          c.amount,
          '—',
          '—',
          0,
          '—',
          c.notes || '—',
          c.remaining_amount,
          c.status,
        ]);
      } else {
        logs.forEach((log, idx) => {
          totalReceived += log.amount;
          sheetData.push([
            idx === 0 ? c.cheque_number : `"${c.cheque_number}"`,
            c.bill_number || '—',
            p,
            b,
            idx === 0 ? c.amount : '',
            log.payment_date_bs || '—',
            log.payment_date_ad || '—',
            log.amount,
            log.payment_mode,
            log.notes || '—',
            idx === 0 ? c.remaining_amount : '',
            c.status,
          ]);
        });
      }
    });

    // Grand Totals Summary Row
    sheetData.push([]);
    sheetData.push([
      'GRAND TOTALS',
      '',
      '',
      '',
      totalOriginal,
      '',
      '',
      totalReceived,
      '',
      '',
      totalRemaining,
      '',
    ]);

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet(sheetData);

    // Set column widths
    ws['!cols'] = [
      { wch: 15 }, // Cheque No
      { wch: 14 }, // Bill No
      { wch: 24 }, // Party Name
      { wch: 20 }, // Bank Name
      { wch: 18 }, // Original Amount
      { wch: 15 }, // Date BS
      { wch: 15 }, // Date AD
      { wch: 18 }, // Amount Received
      { wch: 16 }, // Payment Mode
      { wch: 28 }, // Notes
      { wch: 18 }, // Remaining Balance
      { wch: 14 }, // Status
    ];

    XLSX.utils.book_append_sheet(wb, ws, 'Partial Payments Ledger');

    const cleanName = activeCompany.replace(/[^a-zA-Z0-9]/g, '_');
    XLSX.writeFile(wb, `${cleanName}_Partial_Payment_Ledger_${getCurrentBsDate()}.xlsx`);
  };

  // ==========================================
  // EXPORT 2: Real PDF (.pdf) Export
  // ==========================================
  const handleExportPDF = () => {
    const activeCompany = companyName || "rstraders's Company";
    const doc = new jsPDF({ orientation: 'landscape', unit: 'pt', format: 'a4' });

    // Document Header
    doc.setFontSize(16);
    doc.setTextColor(15, 67, 43); // Dark forest green
    doc.text(activeCompany, 40, 40);

    doc.setFontSize(12);
    doc.setTextColor(51, 65, 85);
    doc.text('Partial Payment Ledger Report', 40, 58);

    doc.setFontSize(9);
    doc.setTextColor(100, 116, 139);
    doc.text(
      `Generated: ${getCurrentBsDate()} BS (${getCurrentAdDate()} AD)  |  Filter: ${dateRangeDescription}  |  Status: ${statusFilter.toUpperCase()}`,
      40,
      74
    );

    // Summary Box
    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(226, 232, 240);
    doc.roundedRect(40, 85, 762, 32, 4, 4, 'FD');

    doc.setFontSize(9);
    doc.setTextColor(15, 23, 42);
    doc.text(
      `Total Cheque Value: NPR ${formatCurrency(totalChequeValue)}   |   Total Received: NPR ${formatCurrency(
        totalReceivedAmount
      )}   |   Remaining Due: NPR ${formatCurrency(totalRemainingBalance)}   |   Installments: ${totalTransactionsCount} (${recoveryRate}% recovered)`,
      50,
      105
    );

    // Prepare table body
    const tableRows: any[] = [];
    filteredData.forEach((c) => {
      const p = c.party_id ? partyMap.get(c.party_id)?.name || 'Unassigned' : 'Unassigned';
      const b = c.bank_id ? bankMap.get(c.bank_id)?.name || '—' : '—';
      const logs = logsByChequeId.get(c.id) || [];

      let paymentsText = 'No payments recorded';
      if (logs.length > 0) {
        paymentsText = logs
          .map(
            (l) =>
              `${l.payment_date_bs || l.payment_date_ad}: NPR ${formatCurrency(l.amount)} [${l.payment_mode}]${
                l.notes ? ` (${l.notes})` : ''
              }`
          )
          .join('\n');
      }

      tableRows.push([
        c.cheque_number,
        c.bill_number || '—',
        p,
        b,
        `NPR ${formatCurrency(c.amount)}`,
        paymentsText,
        `NPR ${formatCurrency(c.remaining_amount)}`,
        c.status,
      ]);
    });

    autoTable(doc, {
      startY: 128,
      head: [
        [
          'Cheque #',
          'Bill #',
          'Party Name',
          'Bank Name',
          'Total Amount',
          'Date-wise Payment Entries (Date, Amount, Mode)',
          'Remaining Balance',
          'Status',
        ],
      ],
      body: tableRows,
      foot: [
        [
          'GRAND TOTALS',
          '',
          `${filteredData.length} Cheques`,
          '',
          `NPR ${formatCurrency(totalChequeValue)}`,
          `${totalTransactionsCount} Installments: NPR ${formatCurrency(totalReceivedAmount)}`,
          `NPR ${formatCurrency(totalRemainingBalance)}`,
          `${recoveryRate}% Paid`,
        ],
      ],
      theme: 'grid',
      styles: {
        fontSize: 8,
        cellPadding: 4,
        overflow: 'linebreak',
        textColor: [30, 41, 59],
      },
      headStyles: {
        fillColor: [15, 67, 43], // #0F432B
        textColor: [255, 255, 255],
        fontStyle: 'bold',
      },
      footStyles: {
        fillColor: [241, 245, 249],
        textColor: [15, 23, 42],
        fontStyle: 'bold',
      },
      columnStyles: {
        0: { cellWidth: 70, fontStyle: 'bold' },
        1: { cellWidth: 65 },
        2: { cellWidth: 100 },
        3: { cellWidth: 80 },
        4: { cellWidth: 75, halign: 'right' },
        5: { cellWidth: 220 },
        6: { cellWidth: 80, halign: 'right', fontStyle: 'bold' },
        7: { cellWidth: 72, halign: 'center' },
      },
      didDrawPage: (data) => {
        // Footer Signatures on the final page
        const pageCount = doc.getNumberOfPages();
        doc.setFontSize(8);
        doc.setTextColor(148, 163, 184);
        doc.text(
          `Page ${data.pageNumber} of ${pageCount}  •  ChequeDesk Nepal`,
          data.settings.margin.left,
          doc.internal.pageSize.height - 20
        );
      },
    });

    // Add Signature Footer on last page
    const finalY = (doc as any).lastAutoTable?.finalY || 450;
    if (finalY + 60 < doc.internal.pageSize.height) {
      doc.setFontSize(8);
      doc.setTextColor(100, 116, 139);
      doc.text('Prepared By: __________________________', 50, finalY + 40);
      doc.text('Authorized Signature: __________________________', 500, finalY + 40);
    }

    const cleanName = activeCompany.replace(/[^a-zA-Z0-9]/g, '_');
    doc.save(`${cleanName}_Partial_Payment_Ledger_${getCurrentBsDate()}.pdf`);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6" id="partial-payments-ledger-view">
      {/* 1. Top Header with Active Company Name & Applied Date Filter */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
        <div className="space-y-1.5">
          <div className="flex flex-wrap items-center gap-2">
            <span className="p-2 bg-emerald-50 text-emerald-800 rounded-xl border border-emerald-200">
              <Receipt className="w-5 h-5" />
            </span>
            <h2 className="text-xl font-bold text-slate-900 tracking-tight">
              {companyName || "rstraders's Company"}
            </h2>
            <span className="text-xs px-2.5 py-0.5 rounded-full font-semibold bg-blue-50 text-blue-700 border border-blue-200">
              Partial Payment Ledger
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
            <span className="flex items-center gap-1 text-slate-600 font-medium">
              <Calendar className="w-3.5 h-3.5 text-slate-400" />
              Active Range:
            </span>
            <span className="font-mono bg-slate-100 text-slate-800 px-2 py-0.5 rounded-md font-semibold border border-slate-200">
              {dateRangeDescription}
            </span>
            <span>•</span>
            <span>Showing {filteredData.length} cheques ({totalTransactionsCount} payment entries)</span>
          </div>
        </div>

        {/* Action Buttons: Excel, PDF, Print, + Add Payment */}
        <div className="flex flex-wrap items-center gap-2 w-full lg:w-auto">
          <button
            onClick={handleExportXLSX}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 rounded-xl text-xs font-semibold transition shadow-2xs cursor-pointer"
            title="Download formatted Excel (.xlsx) file"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-700" />
            <span>Export Excel (.xlsx)</span>
          </button>

          <button
            onClick={handleExportPDF}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-rose-50 hover:bg-rose-100 text-rose-800 border border-rose-300 rounded-xl text-xs font-semibold transition shadow-2xs cursor-pointer"
            title="Download formatted vector PDF report"
          >
            <FileText className="w-4 h-4 text-rose-700" />
            <span>Export PDF (.pdf)</span>
          </button>

          <button
            onClick={handlePrint}
            className="inline-flex items-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 rounded-xl text-xs font-semibold transition shadow-2xs cursor-pointer"
            title="Print report or save via browser"
          >
            <Printer className="w-4 h-4 text-slate-600" />
            <span>Print</span>
          </button>

          <button
            onClick={() => openPaymentModal()}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-semibold transition shadow-2xs cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>+ Log Payment</span>
          </button>
        </div>
      </div>

      {/* 2. Filters Bar: BS & AD Date Range + Search */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs space-y-3">
        <div className="flex flex-col xl:flex-row items-start xl:items-center justify-between gap-3">
          {/* Quick Date Presets */}
          <div className="flex flex-wrap items-center gap-1.5 text-xs">
            <span className="text-slate-500 font-semibold mr-1 flex items-center gap-1">
              <Filter className="w-3.5 h-3.5" /> Date Presets:
            </span>
            <button
              type="button"
              onClick={() => applyPreset('all')}
              className={`px-2.5 py-1 rounded-lg transition font-medium ${
                !fromDateBs && !toDateBs
                  ? 'bg-emerald-700 text-white font-semibold'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              All Time
            </button>
            <button
              type="button"
              onClick={() => applyPreset('today')}
              className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition font-medium"
            >
              Today
            </button>
            <button
              type="button"
              onClick={() => applyPreset('this_month')}
              className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition font-medium"
            >
              This Month (BS)
            </button>
            <button
              type="button"
              onClick={() => applyPreset('last_month')}
              className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition font-medium"
            >
              Last Month (BS)
            </button>
            <button
              type="button"
              onClick={() => applyPreset('fy2081')}
              className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition font-medium"
            >
              FY 2081/82
            </button>
          </div>

          {/* Status Segmented Control */}
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl text-xs font-semibold">
            <button
              type="button"
              onClick={() => setStatusFilter('all')}
              className={`px-3 py-1 rounded-lg transition ${
                statusFilter === 'all'
                  ? 'bg-white text-slate-900 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              All Cheques ({cheques.length})
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter('partial')}
              className={`px-3 py-1 rounded-lg transition ${
                statusFilter === 'partial'
                  ? 'bg-white text-blue-700 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Partials
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter('unsettled')}
              className={`px-3 py-1 rounded-lg transition ${
                statusFilter === 'unsettled'
                  ? 'bg-white text-amber-700 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Unsettled
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter('cleared')}
              className={`px-3 py-1 rounded-lg transition ${
                statusFilter === 'cleared'
                  ? 'bg-white text-emerald-700 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Cleared
            </button>
          </div>
        </div>

        {/* Date Inputs & Search Field Row */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-3 items-center pt-2 border-t border-slate-100 text-xs">
          {/* From Date (BS / AD) */}
          <div className="lg:col-span-3 flex items-center gap-2">
            <span className="text-slate-500 font-semibold w-10 shrink-0">From:</span>
            <div className="flex-1 flex gap-1.5">
              <input
                type="text"
                placeholder="YYYY-MM-DD (BS)"
                value={fromDateBs}
                onChange={(e) => handleFromBsChange(e.target.value)}
                className="w-1/2 px-2.5 py-1.5 text-xs font-mono bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                title="Filter From Date in BS"
              />
              <input
                type="date"
                value={fromDateAd}
                onChange={(e) => handleFromAdChange(e.target.value)}
                className="w-1/2 px-2 py-1.5 text-xs font-mono bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 text-slate-600"
                title="Filter From Date in AD"
              />
            </div>
          </div>

          {/* To Date (BS / AD) */}
          <div className="lg:col-span-3 flex items-center gap-2">
            <span className="text-slate-500 font-semibold w-8 shrink-0">To:</span>
            <div className="flex-1 flex gap-1.5">
              <input
                type="text"
                placeholder="YYYY-MM-DD (BS)"
                value={toDateBs}
                onChange={(e) => handleToBsChange(e.target.value)}
                className="w-1/2 px-2.5 py-1.5 text-xs font-mono bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                title="Filter To Date in BS"
              />
              <input
                type="date"
                value={toDateAd}
                onChange={(e) => handleToAdChange(e.target.value)}
                className="w-1/2 px-2 py-1.5 text-xs font-mono bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 text-slate-600"
                title="Filter To Date in AD"
              />
            </div>
          </div>

          {/* Date Type */}
          <div className="lg:col-span-2">
            <select
              value={dateFilterType}
              onChange={(e: any) => setDateFilterType(e.target.value)}
              className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
              <option value="payment_date">Filter by Payment Date</option>
              <option value="cheque_due">Filter by Cheque Due Date</option>
              <option value="cheque_issue">Filter by Cheque Issue Date</option>
            </select>
          </div>

          {/* Search Box */}
          <div className="lg:col-span-4 relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search by Cheque #, Bill #, Party, Bank..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-8 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* 3. Summary Metrics Bar: 4 Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Cheque Value */}
        <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Total Cheque Value</span>
            <span className="p-1.5 bg-slate-100 text-slate-700 rounded-lg">
              <CreditCard className="w-4 h-4" />
            </span>
          </div>
          <div className="text-2xl font-bold text-slate-900 mt-2 font-mono">
            रू {formatCurrency(totalChequeValue)}
          </div>
          <span className="text-[11px] text-slate-400 mt-1 block">
            Across {filteredData.length} matched cheques
          </span>
        </div>

        {/* Total Received Amount */}
        <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Total Received Amount</span>
            <span className="p-1.5 bg-emerald-50 text-emerald-700 rounded-lg">
              <TrendingUp className="w-4 h-4" />
            </span>
          </div>
          <div className="text-2xl font-bold text-emerald-700 mt-2 font-mono">
            रू {formatCurrency(totalReceivedAmount)}
          </div>
          <span className="text-[11px] text-emerald-600 font-semibold mt-1 block">
            {recoveryRate}% Recovery Rate achieved
          </span>
        </div>

        {/* Total Remaining Balance */}
        <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Total Remaining Balance</span>
            <span className="p-1.5 bg-amber-50 text-amber-700 rounded-lg">
              <Clock className="w-4 h-4" />
            </span>
          </div>
          <div className="text-2xl font-bold text-amber-700 mt-2 font-mono">
            रू {formatCurrency(totalRemainingBalance)}
          </div>
          <span className="text-[11px] text-slate-400 mt-1 block">
            Unsettled / pending collection
          </span>
        </div>

        {/* Total Partial Transactions Count */}
        <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Total Partial Transactions</span>
            <span className="p-1.5 bg-blue-50 text-blue-700 rounded-lg">
              <Receipt className="w-4 h-4" />
            </span>
          </div>
          <div className="text-2xl font-bold text-blue-700 mt-2 font-mono">
            {totalTransactionsCount}
          </div>
          <span className="text-[11px] text-slate-400 mt-1 block">
            Cash, IPS & Bank installment logs
          </span>
        </div>
      </div>

      {/* 4. Comprehensive Detailed Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-4 border-b border-slate-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 bg-slate-50/60">
          <div>
            <h3 className="text-sm font-bold text-slate-900">
              Detailed Partial Payment Ledger
            </h3>
            <p className="text-xs text-slate-500">
              Complete breakdown of cheques, bills, party, bank, and date-wise received installments.
            </p>
          </div>
          <div className="text-xs font-mono text-slate-500">
            Showing <span className="font-bold text-slate-800">{filteredData.length}</span> records
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-100/80 border-b border-slate-200 text-slate-700 uppercase tracking-wider font-semibold">
                <th className="py-3 px-4">Cheque No</th>
                <th className="py-3 px-3">Bill No</th>
                <th className="py-3 px-4">Party Name</th>
                <th className="py-3 px-3">Bank Name</th>
                <th className="py-3 px-4 text-right">Total Amount</th>
                <th className="py-3 px-4 min-w-[320px]">Date-wise Payment Entries</th>
                <th className="py-3 px-4 text-right">Remaining Balance</th>
                <th className="py-3 px-3 text-center">Status</th>
                <th className="py-3 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredData.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-400">
                    <Receipt className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                    <p className="text-sm font-medium">No cheque records match current filters.</p>
                    <p className="text-xs mt-0.5">Try clearing date ranges or search terms.</p>
                  </td>
                </tr>
              ) : (
                filteredData.map((cheque) => {
                  const party = cheque.party_id ? partyMap.get(cheque.party_id) : null;
                  const bank = cheque.bank_id ? bankMap.get(cheque.bank_id) : null;
                  const logs = logsByChequeId.get(cheque.id) || [];
                  const totalPaid = cheque.amount - cheque.remaining_amount;
                  const paidPct = Math.min(
                    100,
                    Math.max(0, Math.round((totalPaid / cheque.amount) * 100))
                  );

                  return (
                    <tr
                      key={cheque.id}
                      className="hover:bg-slate-50/80 transition-colors align-top"
                    >
                      {/* 1. Cheque No */}
                      <td className="py-3.5 px-4 font-mono">
                        <span className="font-bold text-slate-900 block text-xs">
                          #{cheque.cheque_number}
                        </span>
                        <span className="text-[11px] text-slate-400 font-sans block mt-0.5">
                          Due: {cheque.due_date_bs || cheque.due_date_ad || '—'}
                        </span>
                      </td>

                      {/* 2. Bill No */}
                      <td className="py-3.5 px-3">
                        {cheque.bill_number ? (
                          <span className="inline-block px-2 py-0.5 rounded-md font-mono text-[11px] bg-slate-100 text-slate-800 font-semibold border border-slate-200">
                            {cheque.bill_number}
                          </span>
                        ) : (
                          <span className="text-slate-400 font-mono text-xs">—</span>
                        )}
                      </td>

                      {/* 3. Party Name */}
                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-slate-900 truncate max-w-[160px]">
                          {party?.name || 'Unassigned Party'}
                        </div>
                        {party?.phone && (
                          <span className="text-[11px] text-slate-400 font-mono block">
                            {party.phone}
                          </span>
                        )}
                      </td>

                      {/* 4. Bank Name */}
                      <td className="py-3.5 px-3">
                        <div className="text-slate-800 truncate max-w-[140px]">
                          {bank?.name || '—'}
                        </div>
                        {bank?.code && (
                          <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-slate-100 text-slate-500 font-medium">
                            {bank.code}
                          </span>
                        )}
                      </td>

                      {/* 5. Total Amount */}
                      <td className="py-3.5 px-4 text-right font-mono font-bold text-slate-900 whitespace-nowrap">
                        रू {formatCurrency(cheque.amount)}
                      </td>

                      {/* 6. Date-wise Payment Entries */}
                      <td className="py-3.5 px-4">
                        {logs.length === 0 ? (
                          <div className="flex items-center justify-between gap-2 py-1 text-slate-400">
                            <span className="italic text-[11px]">No payments recorded yet</span>
                            {cheque.status !== 'Cleared' && (
                              <button
                                type="button"
                                onClick={() => openPaymentModal(cheque)}
                                className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 hover:text-emerald-800 hover:underline cursor-pointer"
                              >
                                <Plus className="w-3 h-3" />
                                <span>Add Payment</span>
                              </button>
                            )}
                          </div>
                        ) : (
                          <div className="space-y-1.5">
                            {logs.map((log) => (
                              <div
                                key={log.id}
                                className="flex items-center justify-between gap-2 p-1.5 rounded-lg bg-slate-50 border border-slate-200/80 text-[11px]"
                              >
                                <div className="flex items-center gap-2 min-w-0">
                                  <span className="font-mono text-slate-600 font-medium whitespace-nowrap">
                                    {log.payment_date_bs || log.payment_date_ad}
                                  </span>
                                  <span
                                    className={`px-1.5 py-0.5 rounded text-[10px] font-bold uppercase shrink-0 ${
                                      log.payment_mode === 'Cash'
                                        ? 'bg-emerald-100 text-emerald-800'
                                        : log.payment_mode === 'IPS'
                                        ? 'bg-blue-100 text-blue-800'
                                        : 'bg-purple-100 text-purple-800'
                                    }`}
                                  >
                                    {log.payment_mode}
                                  </span>
                                  {log.notes && (
                                    <span className="text-slate-500 truncate max-w-[130px] italic">
                                      "{log.notes}"
                                    </span>
                                  )}
                                </div>

                                <div className="flex items-center gap-2 shrink-0 font-mono">
                                  <span className="font-bold text-emerald-700">
                                    +रू {formatCurrency(log.amount)}
                                  </span>
                                  <button
                                    type="button"
                                    onClick={() => handleDeleteLog(log)}
                                    className="text-slate-400 hover:text-rose-600 p-0.5 rounded transition"
                                    title="Revert payment entry"
                                  >
                                    <Trash2 className="w-3 h-3" />
                                  </button>
                                </div>
                              </div>
                            ))}

                            {cheque.status !== 'Cleared' && (
                              <div className="pt-0.5 flex justify-end">
                                <button
                                  type="button"
                                  onClick={() => openPaymentModal(cheque)}
                                  className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 hover:text-emerald-800 hover:underline cursor-pointer"
                                >
                                  <Plus className="w-3 h-3" />
                                  <span>+ Log Another Installment</span>
                                </button>
                              </div>
                            )}
                          </div>
                        )}
                      </td>

                      {/* 7. Remaining Balance */}
                      <td className="py-3.5 px-4 text-right font-mono whitespace-nowrap">
                        <span
                          className={`font-bold text-xs ${
                            cheque.remaining_amount > 0 ? 'text-amber-700' : 'text-emerald-700'
                          }`}
                        >
                          रू {formatCurrency(cheque.remaining_amount)}
                        </span>

                        {/* Progress Bar */}
                        <div className="w-24 ml-auto mt-1 bg-slate-200 h-1.5 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all ${
                              cheque.status === 'Cleared'
                                ? 'bg-emerald-500'
                                : paidPct > 0
                                ? 'bg-blue-600'
                                : 'bg-slate-300'
                            }`}
                            style={{ width: `${paidPct}%` }}
                          />
                        </div>
                        <span className="text-[10px] text-slate-400 font-sans block mt-0.5">
                          {paidPct}% Collected
                        </span>
                      </td>

                      {/* 8. Status */}
                      <td className="py-3.5 px-3 text-center whitespace-nowrap">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                            cheque.status === 'Cleared'
                              ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                              : cheque.status === 'Partially Paid'
                              ? 'bg-blue-100 text-blue-800 border border-blue-200'
                              : 'bg-amber-100 text-amber-800 border border-amber-200'
                          }`}
                        >
                          {cheque.status === 'Cleared' && <CheckCircle2 className="w-2.5 h-2.5" />}
                          {cheque.status === 'Partially Paid' && <Clock className="w-2.5 h-2.5" />}
                          {cheque.status}
                        </span>
                      </td>

                      {/* 9. Action Button */}
                      <td className="py-3.5 px-4 text-right whitespace-nowrap">
                        {cheque.status !== 'Cleared' ? (
                          <button
                            type="button"
                            onClick={() => openPaymentModal(cheque)}
                            className="inline-flex items-center gap-1 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold transition shadow-2xs cursor-pointer"
                          >
                            <Plus className="w-3.5 h-3.5" />
                            <span>Pay</span>
                          </button>
                        ) : (
                          <span className="text-slate-400 text-[11px] font-medium">Settled</span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
            {/* Grand Summary Footer inside Table */}
            {filteredData.length > 0 && (
              <tfoot>
                <tr className="bg-slate-100/90 font-bold border-t-2 border-slate-300 text-slate-900 text-xs">
                  <td colSpan={4} className="py-3 px-4">
                    Grand Totals ({filteredData.length} Cheques)
                  </td>
                  <td className="py-3 px-4 text-right font-mono whitespace-nowrap">
                    रू {formatCurrency(totalChequeValue)}
                  </td>
                  <td className="py-3 px-4 text-emerald-800 font-mono">
                    Total Received: रू {formatCurrency(totalReceivedAmount)} ({totalTransactionsCount} logs)
                  </td>
                  <td className="py-3 px-4 text-right font-mono text-amber-800 whitespace-nowrap">
                    रू {formatCurrency(totalRemainingBalance)}
                  </td>
                  <td colSpan={2} className="py-3 px-4 text-center text-slate-500 font-sans">
                    {recoveryRate}% Paid
                  </td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>

      {/* 5. Payment Entry Modal */}
      {isPaymentModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xl max-w-lg w-full overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/70">
              <div className="flex items-center gap-2">
                <span className="p-1.5 bg-emerald-100 text-emerald-800 rounded-lg">
                  <Plus className="w-4 h-4" />
                </span>
                <h3 className="font-bold text-slate-900 text-sm">
                  Record Partial Payment Entry
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsPaymentModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSubmitPayment} className="p-5 space-y-4">
              {modalError && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 font-medium">
                  {modalError}
                </div>
              )}

              {modalSuccess && (
                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 font-medium flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>{modalSuccess}</span>
                </div>
              )}

              {/* Target Cheque Selector */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Select Cheque *
                </label>
                <select
                  value={targetCheque?.id || ''}
                  onChange={(e) => {
                    const found = cheques.find((c) => c.id === e.target.value);
                    if (found) setTargetCheque(found);
                  }}
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  {cheques.map((c) => {
                    const p = c.party_id ? partyMap.get(c.party_id)?.name : 'Unassigned';
                    return (
                      <option key={c.id} value={c.id}>
                        Cheque #{c.cheque_number} — {p} (Due: रू {formatCurrency(c.remaining_amount)})
                      </option>
                    );
                  })}
                </select>
              </div>

              {/* Active Cheque Summary Pill */}
              {targetCheque && (
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between text-xs font-mono">
                  <div>
                    <span className="text-slate-500 block text-[10px] font-sans">Party Name</span>
                    <span className="font-bold text-slate-900 font-sans">
                      {targetCheque.party_id
                        ? partyMap.get(targetCheque.party_id)?.name || 'Unassigned'
                        : 'Unassigned'}
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="text-slate-500 block text-[10px] font-sans">Remaining Due</span>
                    <span className="font-bold text-amber-700">
                      रू {formatCurrency(targetCheque.remaining_amount)}
                    </span>
                  </div>
                </div>
              )}

              {/* Payment Amount */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Amount Received (NPR / रू) *
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-mono text-xs font-bold">
                    रू
                  </span>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="e.g. 25000"
                    value={paymentAmount}
                    onChange={(e) => setPaymentAmount(e.target.value)}
                    max={targetCheque?.remaining_amount || undefined}
                    className="w-full pl-8 pr-3 py-2 text-xs font-mono font-bold bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                {/* Quick Fill Pills */}
                {targetCheque && (
                  <div className="flex items-center gap-1.5 mt-1.5">
                    <button
                      type="button"
                      onClick={() =>
                        setPaymentAmount(Math.min(10000, targetCheque.remaining_amount).toString())
                      }
                      className="px-2 py-0.5 text-[10px] font-mono bg-slate-100 hover:bg-slate-200 text-slate-700 rounded transition"
                    >
                      +10k
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        setPaymentAmount(Math.min(50000, targetCheque.remaining_amount).toString())
                      }
                      className="px-2 py-0.5 text-[10px] font-mono bg-slate-100 hover:bg-slate-200 text-slate-700 rounded transition"
                    >
                      +50k
                    </button>
                    <button
                      type="button"
                      onClick={() => setPaymentAmount(targetCheque.remaining_amount.toString())}
                      className="px-2 py-0.5 text-[10px] font-mono bg-emerald-100 hover:bg-emerald-200 text-emerald-800 font-bold rounded transition"
                    >
                      Full Balance (रू {formatCurrency(targetCheque.remaining_amount)})
                    </button>
                  </div>
                )}
              </div>

              {/* Payment Mode Selector */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Payment Mode *
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {(['Cash', 'IPS', 'Bank Deposit'] as PaymentMode[]).map((mode) => (
                    <button
                      key={mode}
                      type="button"
                      onClick={() => setPaymentMode(mode)}
                      className={`py-2 text-center rounded-xl text-xs font-semibold border transition cursor-pointer ${
                        paymentMode === mode
                          ? 'bg-emerald-700 border-emerald-700 text-white shadow-2xs'
                          : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                      }`}
                    >
                      {mode}
                    </button>
                  ))}
                </div>
              </div>

              {/* Date Inputs BS & AD */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Payment Date (BS) *
                  </label>
                  <input
                    type="text"
                    placeholder="YYYY-MM-DD"
                    value={entryDateBs}
                    onChange={(e) => handleEntryBsChange(e.target.value)}
                    className="w-full px-3 py-2 text-xs font-mono bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Payment Date (AD) *
                  </label>
                  <input
                    type="date"
                    value={entryDateAd}
                    onChange={(e) => handleEntryAdChange(e.target.value)}
                    className="w-full px-3 py-2 text-xs font-mono bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 text-slate-600"
                  />
                </div>
              </div>

              {/* Voucher / Transaction Notes */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Voucher # / Reference Notes (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Counter deposit slip #5021, ConnectIPS Ref 92831"
                  value={paymentNotes}
                  onChange={(e) => setPaymentNotes(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsPaymentModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="inline-flex items-center gap-1.5 px-5 py-2 text-xs font-semibold text-white bg-emerald-700 hover:bg-emerald-800 rounded-xl transition shadow-2xs disabled:opacity-50 cursor-pointer"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>{isSubmitting ? 'Logging...' : 'Save Payment Entry'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 6. Printable Layout for Browser Print Dialog */}
      <div className="hidden print:block p-8 bg-white text-black font-sans">
        <div className="border-b-2 border-black pb-4 mb-4">
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-2xl font-bold">{companyName || "rstraders's Company"}</h1>
              <h2 className="text-lg font-semibold text-gray-800">Partial Payment Ledger Report</h2>
              <p className="text-xs text-gray-600 mt-1">Date Range: {dateRangeDescription}</p>
            </div>
            <div className="text-right text-xs">
              <p className="font-semibold">Report Generated On:</p>
              <p className="font-mono">{getCurrentBsDate()} BS ({getCurrentAdDate()} AD)</p>
            </div>
          </div>
        </div>

        {/* Printable Summary KPI Boxes */}
        <div className="grid grid-cols-4 gap-3 mb-6 text-xs font-mono">
          <div className="border border-gray-400 p-2.5 rounded">
            <span className="block text-gray-600 text-[10px] font-sans">Total Cheque Value</span>
            <span className="text-sm font-bold">NPR {formatCurrency(totalChequeValue)}</span>
          </div>
          <div className="border border-gray-400 p-2.5 rounded">
            <span className="block text-gray-600 text-[10px] font-sans">Total Received</span>
            <span className="text-sm font-bold">NPR {formatCurrency(totalReceivedAmount)}</span>
          </div>
          <div className="border border-gray-400 p-2.5 rounded">
            <span className="block text-gray-600 text-[10px] font-sans">Remaining Due</span>
            <span className="text-sm font-bold">NPR {formatCurrency(totalRemainingBalance)}</span>
          </div>
          <div className="border border-gray-400 p-2.5 rounded">
            <span className="block text-gray-600 text-[10px] font-sans">Installments Logged</span>
            <span className="text-sm font-bold">{totalTransactionsCount} ({recoveryRate}% Paid)</span>
          </div>
        </div>

        {/* Printable Table */}
        <table className="w-full text-xs border-collapse border border-gray-400 mb-6">
          <thead>
            <tr className="bg-gray-100">
              <th className="border border-gray-400 p-2 text-left">Cheque #</th>
              <th className="border border-gray-400 p-2 text-left">Bill #</th>
              <th className="border border-gray-400 p-2 text-left">Party Name</th>
              <th className="border border-gray-400 p-2 text-left">Bank</th>
              <th className="border border-gray-400 p-2 text-right">Total (NPR)</th>
              <th className="border border-gray-400 p-2 text-left">Payment Entries</th>
              <th className="border border-gray-400 p-2 text-right">Remaining (NPR)</th>
              <th className="border border-gray-400 p-2 text-center">Status</th>
            </tr>
          </thead>
          <tbody>
            {filteredData.map((c) => {
              const p = c.party_id ? partyMap.get(c.party_id)?.name : '—';
              const b = c.bank_id ? bankMap.get(c.bank_id)?.name : '—';
              const logs = logsByChequeId.get(c.id) || [];

              return (
                <tr key={c.id} className="align-top">
                  <td className="border border-gray-400 p-2 font-mono font-semibold">
                    {c.cheque_number}
                  </td>
                  <td className="border border-gray-400 p-2 font-mono">{c.bill_number || '—'}</td>
                  <td className="border border-gray-400 p-2">{p}</td>
                  <td className="border border-gray-400 p-2">{b}</td>
                  <td className="border border-gray-400 p-2 text-right font-mono">
                    {formatCurrency(c.amount)}
                  </td>
                  <td className="border border-gray-400 p-2">
                    {logs.length === 0 ? (
                      <span className="text-gray-400 italic">No payments</span>
                    ) : (
                      logs.map((l, i) => (
                        <div key={i} className="text-[11px] font-mono">
                          {l.payment_date_bs}: +{formatCurrency(l.amount)} [{l.payment_mode}]
                          {l.notes ? ` (${l.notes})` : ''}
                        </div>
                      ))
                    )}
                  </td>
                  <td className="border border-gray-400 p-2 text-right font-mono font-bold">
                    {formatCurrency(c.remaining_amount)}
                  </td>
                  <td className="border border-gray-400 p-2 text-center">{c.status}</td>
                </tr>
              );
            })}
          </tbody>
          <tfoot>
            <tr className="bg-gray-100 font-bold">
              <td colSpan={4} className="border border-gray-400 p-2">
                Grand Totals ({filteredData.length} Cheques)
              </td>
              <td className="border border-gray-400 p-2 text-right font-mono">
                {formatCurrency(totalChequeValue)}
              </td>
              <td className="border border-gray-400 p-2 font-mono">
                Received: {formatCurrency(totalReceivedAmount)} ({totalTransactionsCount} logs)
              </td>
              <td className="border border-gray-400 p-2 text-right font-mono">
                {formatCurrency(totalRemainingBalance)}
              </td>
              <td className="border border-gray-400 p-2 text-center">{recoveryRate}%</td>
            </tr>
          </tfoot>
        </table>

        {/* Signature lines */}
        <div className="mt-12 pt-6 border-t border-gray-300 flex justify-between text-xs text-gray-700">
          <div>
            <span>Prepared By: __________________________</span>
          </div>
          <div>
            <span>Verified By: __________________________</span>
          </div>
          <div>
            <span>Authorized Signature: __________________________</span>
          </div>
        </div>
      </div>
    </div>
  );
};
