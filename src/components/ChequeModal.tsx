import React, { useState, useEffect } from 'react';
import { X, CreditCard, Plus, Building2, Users } from 'lucide-react';
import { Bank, Cheque, Party } from '../types';
import { DualDatePicker } from './DualDatePicker';
import { getCurrentAdDate, getCurrentBsDate } from '../lib/dateUtils';
import { CreateChequeInput } from '../lib/chequeService';

interface ChequeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: CreateChequeInput) => Promise<void>;
  onUpdate?: (id: string, data: Partial<Cheque>) => Promise<void>;
  initialCheque?: Cheque | null;
  parties: Party[];
  banks: Bank[];
  onOpenNewParty: () => void;
  onOpenNewBank: () => void;
  companyId: string;
}

export const ChequeModal: React.FC<ChequeModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  onUpdate,
  initialCheque,
  parties,
  banks,
  onOpenNewParty,
  onOpenNewBank,
  companyId,
}) => {
  if (!isOpen) return null;

  const isEditing = !!initialCheque;

  const [chequeNumber, setChequeNumber] = useState('');
  const [billNumber, setBillNumber] = useState('');
  const [bankId, setBankId] = useState<string>('');
  const [partyId, setPartyId] = useState<string>('');
  const [amount, setAmount] = useState<string>('');
  const [issueDateAd, setIssueDateAd] = useState(getCurrentAdDate());
  const [issueDateBs, setIssueDateBs] = useState(getCurrentBsDate());
  const [dueDateAd, setDueDateAd] = useState(getCurrentAdDate());
  const [dueDateBs, setDueDateBs] = useState(getCurrentBsDate());
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (initialCheque) {
      setChequeNumber(initialCheque.cheque_number || '');
      setBillNumber(initialCheque.bill_number || '');
      setBankId(initialCheque.bank_id || '');
      setPartyId(initialCheque.party_id || '');
      setAmount(initialCheque.amount ? initialCheque.amount.toString() : '');
      setIssueDateAd(initialCheque.issue_date_ad || getCurrentAdDate());
      setIssueDateBs(initialCheque.issue_date_bs || getCurrentBsDate());
      setDueDateAd(initialCheque.due_date_ad || getCurrentAdDate());
      setDueDateBs(initialCheque.due_date_bs || getCurrentBsDate());
      setNotes(initialCheque.notes || '');
    } else {
      setChequeNumber('');
      setBillNumber('');
      setBankId(banks[0]?.id || '');
      setPartyId(parties[0]?.id || '');
      setAmount('');
      const todayAd = getCurrentAdDate();
      const todayBs = getCurrentBsDate();
      setIssueDateAd(todayAd);
      setIssueDateBs(todayBs);
      setDueDateAd(todayAd);
      setDueDateBs(todayBs);
      setNotes('');
    }
    setError(null);
  }, [initialCheque, isOpen, banks, parties]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chequeNumber.trim()) {
      setError('Please provide a cheque number.');
      return;
    }
    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      setError('Please enter a valid amount greater than 0.');
      return;
    }
    if (!issueDateBs || !issueDateAd) {
      setError('Please provide valid issue dates (BS & AD).');
      return;
    }
    if (!dueDateBs || !dueDateAd) {
      setError('Please provide valid due dates (BS & AD).');
      return;
    }

    try {
      setIsSubmitting(true);
      setError(null);

      if (isEditing && onUpdate && initialCheque) {
        await onUpdate(initialCheque.id, {
          cheque_number: chequeNumber.trim(),
          bill_number: billNumber.trim(),
          bank_id: bankId || null,
          party_id: partyId || null,
          amount: numAmount,
          issue_date_bs: issueDateBs,
          issue_date_ad: issueDateAd,
          due_date_bs: dueDateBs,
          due_date_ad: dueDateAd,
          notes: notes.trim(),
        });
      } else {
        await onSubmit({
          company_id: companyId,
          cheque_number: chequeNumber.trim(),
          bill_number: billNumber.trim(),
          bank_id: bankId || null,
          party_id: partyId || null,
          amount: numAmount,
          issue_date_bs: issueDateBs,
          issue_date_ad: issueDateAd,
          due_date_bs: dueDateBs,
          due_date_ad: dueDateAd,
          notes: notes.trim(),
        });
      }
      onClose();
    } catch (err: any) {
      setError(err?.message || 'Failed to save cheque.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
      <div
        id="modal-cheque-form"
        className="bg-white rounded-2xl max-w-xl w-full shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]"
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-xs">
              <CreditCard className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">
                {isEditing ? 'Edit Cheque Record' : 'Issue / Record New Cheque'}
              </h2>
              <p className="text-xs text-slate-500">
                Direct entry into public.cheques with BS & AD tracking
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 rounded-lg transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto">
          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-xs text-rose-700">
              {error}
            </div>
          )}

          {/* Cheque # and Bill # */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wide mb-1">
                Cheque Number <span className="text-rose-500">*</span>
              </label>
              <input
                id="input-cheque-number"
                type="text"
                placeholder="e.g. CHQ-880192"
                value={chequeNumber}
                onChange={(e) => setChequeNumber(e.target.value)}
                className="w-full px-3 py-2 text-sm font-mono font-bold bg-white border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wide mb-1">
                Bill / Invoice Number
              </label>
              <input
                id="input-bill-number"
                type="text"
                placeholder="e.g. INV-2081-104"
                value={billNumber}
                onChange={(e) => setBillNumber(e.target.value)}
                className="w-full px-3 py-2 text-sm font-mono bg-white border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>

          {/* Amount */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wide mb-1">
              Cheque Amount (₹) <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold">₹</span>
              <input
                id="input-cheque-amount"
                type="number"
                step="any"
                min="0.01"
                placeholder="0.00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-full pl-8 pr-3 py-2 text-base font-mono font-bold bg-white border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                required
              />
            </div>
          </div>

          {/* Party and Bank Selectors with quick inline adds */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Party Selector */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-semibold text-slate-700 uppercase tracking-wide">
                  Party / Payee
                </label>
                <button
                  type="button"
                  onClick={onOpenNewParty}
                  className="text-[11px] text-indigo-600 hover:text-indigo-800 font-semibold flex items-center gap-0.5"
                >
                  <Plus className="w-3 h-3" /> New
                </button>
              </div>
              <select
                id="select-cheque-party"
                value={partyId}
                onChange={(e) => setPartyId(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="">Select Party / Payee</option>
                {parties.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} {p.phone ? `(${p.phone})` : ''}
                  </option>
                ))}
              </select>
            </div>

            {/* Bank Selector */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-semibold text-slate-700 uppercase tracking-wide">
                  Drawee Bank
                </label>
                <button
                  type="button"
                  onClick={onOpenNewBank}
                  className="text-[11px] text-indigo-600 hover:text-indigo-800 font-semibold flex items-center gap-0.5"
                >
                  <Plus className="w-3 h-3" /> New
                </button>
              </div>
              <select
                id="select-cheque-bank"
                value={bankId}
                onChange={(e) => setBankId(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="">Select Bank</option>
                {banks.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name} {b.code ? `(${b.code})` : ''}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Issue Date (BS & AD) */}
          <DualDatePicker
            id="cheque-issue-date"
            label="Issue Date"
            adDate={issueDateAd}
            bsDate={issueDateBs}
            onDateChange={(ad, bs) => {
              setIssueDateAd(ad);
              setIssueDateBs(bs);
            }}
            required
          />

          {/* Due Date (BS & AD) */}
          <DualDatePicker
            id="cheque-due-date"
            label="Due Date (Maturity)"
            adDate={dueDateAd}
            bsDate={dueDateBs}
            onDateChange={(ad, bs) => {
              setDueDateAd(ad);
              setDueDateBs(bs);
            }}
            required
          />

          {/* Notes */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wide mb-1">
              Notes / Purpose
            </label>
            <textarea
              rows={2}
              placeholder="e.g. Order #884 advance, goods received, or specific security terms"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
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
              disabled={isSubmitting}
              id="btn-save-cheque"
              className="px-5 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 rounded-lg transition shadow-sm disabled:opacity-50"
            >
              {isSubmitting ? 'Saving...' : isEditing ? 'Update Cheque' : 'Create Cheque'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
