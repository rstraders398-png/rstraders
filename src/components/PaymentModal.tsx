import React, { useState } from 'react';
import { X, DollarSign, ArrowRight, CheckCircle2, Building, CreditCard } from 'lucide-react';
import { Bank, Cheque, Party, PaymentMode } from '../types';
import { DualDatePicker } from './DualDatePicker';
import { formatCurrency, getCurrentAdDate, getCurrentBsDate } from '../lib/dateUtils';

interface PaymentModalProps {
  cheque: Cheque | null;
  party?: Party | null;
  bank?: Bank | null;
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: {
    cheque_id: string;
    amount: number;
    payment_mode: PaymentMode;
    payment_date_bs: string;
    payment_date_ad: string;
    notes?: string;
  }) => Promise<void>;
}

export const PaymentModal: React.FC<PaymentModalProps> = ({
  cheque,
  party,
  bank,
  isOpen,
  onClose,
  onSubmit,
}) => {
  if (!isOpen || !cheque) return null;

  const [amountStr, setAmountStr] = useState<string>('');
  const [paymentMode, setPaymentMode] = useState<PaymentMode>('IPS');
  const [dateAd, setDateAd] = useState<string>(getCurrentAdDate());
  const [dateBs, setDateBs] = useState<string>(getCurrentBsDate());
  const [notes, setNotes] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const remaining = cheque.remaining_amount ?? cheque.amount;
  const paymentAmount = parseFloat(amountStr) || 0;
  const newRemaining = Math.max(0, remaining - paymentAmount);
  const willClear = paymentAmount >= remaining && paymentAmount > 0;

  const handleFillFullAmount = () => {
    setAmountStr(remaining.toString());
    setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (paymentAmount <= 0) {
      setError('Please enter a valid payment amount greater than zero.');
      return;
    }
    if (paymentAmount > remaining + 0.01) {
      setError(`Payment cannot exceed remaining amount of ₹${formatCurrency(remaining)}.`);
      return;
    }
    if (!dateBs || !dateAd) {
      setError('Both BS and AD payment dates are required.');
      return;
    }

    try {
      setIsSubmitting(true);
      setError(null);
      await onSubmit({
        cheque_id: cheque.id,
        amount: paymentAmount,
        payment_mode: paymentMode,
        payment_date_bs: dateBs,
        payment_date_ad: dateAd,
        notes,
      });
      onClose();
    } catch (err: any) {
      setError(err?.message || 'Failed to record payment');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
      <div
        id="modal-record-payment"
        className="bg-white rounded-2xl max-w-lg w-full shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]"
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/70">
          <div>
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <DollarSign className="w-5 h-5 text-emerald-600" />
              Record Cheque Payment
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Cheque <span className="font-mono font-semibold text-slate-700">{cheque.cheque_number}</span>
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 rounded-lg transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Cheque Summary Card */}
        <div className="px-6 py-3 bg-indigo-50/50 border-b border-indigo-100/70">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
            <div>
              <span className="text-slate-500 block text-[11px]">Party:</span>
              <span className="font-semibold text-slate-800 truncate block">
                {party?.name || 'Unassigned'}
              </span>
            </div>
            <div>
              <span className="text-slate-500 block text-[11px]">Bank:</span>
              <span className="font-semibold text-slate-800 truncate block">
                {bank?.name || 'Unassigned'}
              </span>
            </div>
            <div>
              <span className="text-slate-500 block text-[11px]">Total Amount:</span>
              <span className="font-mono font-semibold text-slate-800">
                ₹{formatCurrency(cheque.amount)}
              </span>
            </div>
          </div>
          <div className="mt-2.5 pt-2 border-t border-indigo-100 flex items-center justify-between">
            <span className="text-xs font-medium text-slate-700">Remaining Balance:</span>
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold font-mono text-amber-700">
                ₹{formatCurrency(remaining)}
              </span>
              <button
                type="button"
                onClick={handleFillFullAmount}
                className="text-[11px] font-semibold text-indigo-700 bg-indigo-100 hover:bg-indigo-200 px-2 py-0.5 rounded transition"
              >
                Full Pay
              </button>
            </div>
          </div>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto">
          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-xs text-rose-700">
              {error}
            </div>
          )}

          {/* Amount input */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wide mb-1">
              Payment Amount (₹) <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold">₹</span>
              <input
                id="input-payment-amount"
                type="number"
                step="any"
                min="0.01"
                max={remaining}
                placeholder="0.00"
                value={amountStr}
                onChange={(e) => {
                  setAmountStr(e.target.value);
                  setError(null);
                }}
                className="w-full pl-8 pr-3 py-2 text-base font-mono font-bold bg-white border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                required
                autoFocus
              />
            </div>
          </div>

          {/* Balance Preview Card */}
          {paymentAmount > 0 && (
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1.5 text-xs">
              <div className="flex items-center justify-between text-slate-600">
                <span>New Remaining Balance:</span>
                <span className="font-mono font-bold text-slate-800">
                  ₹{formatCurrency(newRemaining)}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-600">Expected Cheque Status:</span>
                <span
                  className={`font-semibold px-2 py-0.5 rounded text-[11px] ${
                    willClear
                      ? 'bg-emerald-100 text-emerald-800'
                      : 'bg-blue-100 text-blue-800'
                  }`}
                >
                  {willClear ? 'Cleared (Settled)' : 'Partially Paid'}
                </span>
              </div>
            </div>
          )}

          {/* Payment Mode Selector */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wide mb-1.5">
              Payment Mode <span className="text-rose-500">*</span>
            </label>
            <div className="grid grid-cols-3 gap-2" id="payment-mode-buttons">
              {(['IPS', 'Bank Deposit', 'Cash'] as PaymentMode[]).map((mode) => (
                <button
                  type="button"
                  key={mode}
                  id={`btn-mode-${mode.toLowerCase().replace(/\s+/g, '-')}`}
                  onClick={() => setPaymentMode(mode)}
                  className={`py-2 px-3 text-xs font-semibold rounded-lg border text-center transition ${
                    paymentMode === mode
                      ? 'bg-emerald-600 text-white border-emerald-600 shadow-2xs'
                      : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  {mode}
                </button>
              ))}
            </div>
          </div>

          {/* Payment Dates (BS & AD) */}
          <DualDatePicker
            id="payment-date-picker"
            label="Payment Date"
            adDate={dateAd}
            bsDate={dateBs}
            onDateChange={(ad, bs) => {
              setDateAd(ad);
              setDateBs(bs);
            }}
            required
          />

          {/* Notes */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wide mb-1">
              Payment Remarks / Ref #
            </label>
            <input
              type="text"
              placeholder="e.g. Counter slip #, ConnectIPS UTR #, or Cash voucher"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          {/* Actions */}
          <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || paymentAmount <= 0}
              id="btn-confirm-payment"
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 rounded-lg transition shadow-sm disabled:opacity-50"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>{isSubmitting ? 'Recording...' : 'Confirm Payment'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
