import React, { useEffect, useState } from 'react';
import {
  X,
  Receipt,
  Calendar,
  DollarSign,
  Trash2,
  Plus,
  CheckCircle2,
  Clock,
  Building,
  User,
  Phone,
  Printer,
} from 'lucide-react';
import { Bank, Cheque, Party, PaymentLog } from '../types';
import { deletePaymentLog, subscribeToPaymentLogs } from '../lib/chequeService';
import { formatCurrency, formatBsDateFriendly } from '../lib/dateUtils';

interface ChequeDetailModalProps {
  cheque: Cheque | null;
  party?: Party | null;
  bank?: Bank | null;
  isOpen: boolean;
  onClose: () => void;
  onOpenPayment: (cheque: Cheque) => void;
}

export const ChequeDetailModal: React.FC<ChequeDetailModalProps> = ({
  cheque,
  party,
  bank,
  isOpen,
  onClose,
  onOpenPayment,
}) => {
  const [logs, setLogs] = useState<PaymentLog[]>([]);
  const [isDeletingLogId, setIsDeletingLogId] = useState<string | null>(null);

  useEffect(() => {
    if (!cheque || !isOpen) return;
    const unsubscribe = subscribeToPaymentLogs(cheque.id, (paymentLogs) => {
      setLogs(paymentLogs);
    });
    return () => unsubscribe();
  }, [cheque?.id, isOpen]);

  if (!isOpen || !cheque) return null;

  const totalPaid = cheque.amount - (cheque.remaining_amount ?? cheque.amount);
  const paidPct = Math.min(100, Math.max(0, Math.round((totalPaid / cheque.amount) * 100)));

  const handleDeleteLog = async (log: PaymentLog) => {
    if (!confirm(`Remove payment of ₹${formatCurrency(log.amount)} and restore remaining balance?`)) {
      return;
    }
    try {
      setIsDeletingLogId(log.id);
      await deletePaymentLog(log);
    } catch (err) {
      console.error('Error removing payment log:', err);
    } finally {
      setIsDeletingLogId(null);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
      <div
        id="modal-cheque-details"
        className="bg-white rounded-2xl max-w-2xl w-full shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]"
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-50 border border-indigo-200 flex items-center justify-center text-indigo-700">
              <Receipt className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-slate-900 font-mono">
                  {cheque.cheque_number}
                </h2>
                <span
                  className={`px-2 py-0.5 rounded text-[11px] font-semibold ${
                    cheque.status === 'Cleared'
                      ? 'bg-emerald-100 text-emerald-800'
                      : cheque.status === 'Partially Paid'
                      ? 'bg-blue-100 text-blue-800'
                      : 'bg-amber-100 text-amber-800'
                  }`}
                >
                  {cheque.status}
                </span>
              </div>
              <p className="text-xs text-slate-500">
                Created: {new Date(cheque.created_at).toLocaleDateString()}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-200/60 rounded-lg transition"
              title="Print Cheque Voucher"
            >
              <Printer className="w-4 h-4" />
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 rounded-lg transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Cheque Info Breakdown */}
        <div className="p-6 overflow-y-auto space-y-6">
          {/* Key Metrics Strip */}
          <div className="grid grid-cols-3 gap-3 p-4 bg-slate-50 border border-slate-200 rounded-xl">
            <div>
              <span className="text-[11px] uppercase tracking-wider text-slate-500 font-medium">
                Cheque Amount
              </span>
              <div className="text-lg font-bold text-slate-900 font-mono">
                ₹{formatCurrency(cheque.amount)}
              </div>
            </div>
            <div>
              <span className="text-[11px] uppercase tracking-wider text-slate-500 font-medium">
                Total Paid
              </span>
              <div className="text-lg font-bold text-emerald-600 font-mono">
                ₹{formatCurrency(totalPaid)}
              </div>
            </div>
            <div>
              <span className="text-[11px] uppercase tracking-wider text-slate-500 font-medium">
                Remaining Balance
              </span>
              <div className="text-lg font-bold text-amber-700 font-mono">
                ₹{formatCurrency(cheque.remaining_amount)}
              </div>
            </div>
          </div>

          {/* Progress Bar */}
          <div>
            <div className="flex justify-between text-xs text-slate-600 mb-1">
              <span>Settlement Progress</span>
              <span className="font-semibold">{paidPct}% Completed</span>
            </div>
            <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
              <div
                className={`h-full transition-all duration-300 ${
                  cheque.status === 'Cleared' ? 'bg-emerald-500' : 'bg-indigo-600'
                }`}
                style={{ width: `${paidPct}%` }}
              />
            </div>
          </div>

          {/* Party & Bank Details */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div className="p-3.5 border border-slate-200 rounded-xl bg-white space-y-1.5">
              <div className="flex items-center gap-1.5 text-slate-500 font-semibold uppercase tracking-wider text-[10px]">
                <User className="w-3.5 h-3.5" />
                <span>Party / Payee</span>
              </div>
              <div className="font-bold text-sm text-slate-900">
                {party?.name || 'Unassigned Party'}
              </div>
              {party?.phone && (
                <div className="text-slate-500 flex items-center gap-1">
                  <Phone className="w-3 h-3 text-slate-400" />
                  <span>{party.phone}</span>
                </div>
              )}
            </div>

            <div className="p-3.5 border border-slate-200 rounded-xl bg-white space-y-1.5">
              <div className="flex items-center gap-1.5 text-slate-500 font-semibold uppercase tracking-wider text-[10px]">
                <Building className="w-3.5 h-3.5" />
                <span>Drawee Bank</span>
              </div>
              <div className="font-bold text-sm text-slate-900">
                {bank?.name || 'Unassigned Bank'}
              </div>
              {bank?.code && (
                <div className="text-slate-500">
                  Code: <span className="font-mono font-semibold text-slate-700">{bank.code}</span>
                </div>
              )}
            </div>
          </div>

          {/* Dates & Reference Details */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            {/* Issue Date */}
            <div className="p-3 border border-slate-200 rounded-xl">
              <span className="text-[10px] uppercase font-semibold text-slate-400">Issue Date</span>
              <div className="font-mono font-semibold text-slate-800 text-sm mt-0.5">
                {cheque.issue_date_bs || '—'} <span className="text-xs font-sans text-slate-400">BS</span>
              </div>
              <div className="text-slate-500 font-mono text-[11px]">
                {cheque.issue_date_ad || '—'} (AD)
              </div>
            </div>

            {/* Due Date */}
            <div className="p-3 border border-slate-200 rounded-xl">
              <span className="text-[10px] uppercase font-semibold text-slate-400">Due Date</span>
              <div className="font-mono font-semibold text-slate-800 text-sm mt-0.5">
                {cheque.due_date_bs || '—'} <span className="text-xs font-sans text-slate-400">BS</span>
              </div>
              <div className="text-slate-500 font-mono text-[11px]">
                {cheque.due_date_ad || '—'} (AD)
              </div>
            </div>
          </div>

          {/* Bill Number and Notes */}
          {(cheque.bill_number || cheque.notes) && (
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs space-y-1">
              {cheque.bill_number && (
                <div>
                  <span className="text-slate-500 font-medium">Invoice / Bill #: </span>
                  <span className="font-mono font-bold text-slate-800">{cheque.bill_number}</span>
                </div>
              )}
              {cheque.notes && (
                <div>
                  <span className="text-slate-500 font-medium">Remarks: </span>
                  <span className="text-slate-700">{cheque.notes}</span>
                </div>
              )}
            </div>
          )}

          {/* Payment Logs Section (Table: payment_logs) */}
          <div className="border-t border-slate-200 pt-5">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                  <DollarSign className="w-4 h-4 text-emerald-600" />
                  Partial Payment History ({logs.length})
                </h3>
                <p className="text-xs text-slate-500">
                  Direct ledger from public.payment_logs
                </p>
              </div>

              {cheque.status !== 'Cleared' && (
                <button
                  onClick={() => onOpenPayment(cheque)}
                  className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg transition shadow-2xs"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Payment</span>
                </button>
              )}
            </div>

            {logs.length === 0 ? (
              <div className="p-6 text-center bg-slate-50 border border-slate-200 rounded-xl text-slate-400 text-xs">
                No payments logged yet for this cheque. Click "Add Payment" to record a partial or full payment.
              </div>
            ) : (
              <div className="border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200 text-[11px] uppercase">
                    <tr>
                      <th className="px-3 py-2.5">Date (BS / AD)</th>
                      <th className="px-3 py-2.5">Payment Mode</th>
                      <th className="px-3 py-2.5 text-right">Amount</th>
                      <th className="px-3 py-2.5">Notes</th>
                      <th className="px-3 py-2.5 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {logs.map((log) => (
                      <tr key={log.id} className="hover:bg-slate-50/70 transition">
                        <td className="px-3 py-2.5 font-mono">
                          <div className="font-semibold text-slate-800">{log.payment_date_bs} BS</div>
                          <div className="text-[10px] text-slate-400">{log.payment_date_ad} AD</div>
                        </td>
                        <td className="px-3 py-2.5">
                          <span
                            className={`inline-block px-2 py-0.5 rounded text-[10px] font-semibold ${
                              log.payment_mode === 'IPS'
                                ? 'bg-purple-50 text-purple-700 border border-purple-200'
                                : log.payment_mode === 'Bank Deposit'
                                ? 'bg-blue-50 text-blue-700 border border-blue-200'
                                : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            }`}
                          >
                            {log.payment_mode}
                          </span>
                        </td>
                        <td className="px-3 py-2.5 text-right font-mono font-bold text-emerald-700">
                          ₹{formatCurrency(log.amount)}
                        </td>
                        <td className="px-3 py-2.5 text-slate-600 max-w-[150px] truncate">
                          {log.notes || '—'}
                        </td>
                        <td className="px-3 py-2.5 text-right">
                          <button
                            onClick={() => handleDeleteLog(log)}
                            disabled={isDeletingLogId === log.id}
                            className="p-1 text-slate-400 hover:text-rose-600 rounded transition"
                            title="Delete this payment record & restore balance"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-slate-200 bg-slate-50 flex items-center justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-200/70 rounded-lg transition"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
