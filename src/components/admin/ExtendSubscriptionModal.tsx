import React, { useState } from 'react';
import { X, CalendarPlus, Clock, Sparkles, CheckCircle2 } from 'lucide-react';
import { Company } from '../../types';
import { extendSubscription } from '../../lib/adminService';
import { adToBs, bsToAd, getCurrentAdDate, getCurrentBsDate } from '../../lib/dateUtils';

interface ExtendSubscriptionModalProps {
  isOpen: boolean;
  onClose: () => void;
  company: Company | null;
  onSuccess: (message: string) => void;
}

export const ExtendSubscriptionModal: React.FC<ExtendSubscriptionModalProps> = ({
  isOpen,
  onClose,
  company,
  onSuccess,
}) => {
  if (!isOpen || !company) return null;

  const [monthsToAdd, setMonthsToAdd] = useState<number>(3);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Calculate new projected expiry dates
  const currentExpiryAd = company.expiry_date_ad || getCurrentAdDate();
  const baseDate = new Date(currentExpiryAd);
  const validBaseDate = isNaN(baseDate.getTime()) ? new Date() : baseDate;

  // Add months
  const projectedAdDate = new Date(validBaseDate);
  projectedAdDate.setMonth(projectedAdDate.getMonth() + monthsToAdd);
  const projectedAdStr = projectedAdDate.toISOString().split('T')[0];
  const projectedBsStr = adToBs(projectedAdStr);

  const handleConfirm = async () => {
    try {
      setIsSubmitting(true);
      await extendSubscription(
        company.id,
        company.name,
        monthsToAdd,
        projectedBsStr,
        projectedAdStr
      );
      onSuccess(
        `Extended ${company.name} subscription by ${monthsToAdd} months until ${projectedBsStr} BS (${projectedAdStr} AD).`
      );
      onClose();
    } catch (err: any) {
      alert(err?.message || 'Failed to extend subscription');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-md w-full overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-emerald-50/50">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center">
              <CalendarPlus className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-sm">Extend Subscription</h3>
              <p className="text-[11px] text-slate-500 truncate max-w-[240px]">{company.name}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-6 space-y-4 text-xs">
          {/* Current Expiry */}
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80 flex items-center justify-between">
            <span className="text-slate-500 font-medium">Current Expiry:</span>
            <span className="font-mono font-bold text-slate-800">
              {company.expiry_date_bs || 'N/A'} BS{' '}
              <span className="text-slate-400 font-normal">({company.expiry_date_ad || 'N/A'} AD)</span>
            </span>
          </div>

          {/* Quick Month Select */}
          <div className="space-y-2">
            <label className="font-semibold text-slate-700 block">Select Extension Period:</label>
            <div className="grid grid-cols-4 gap-2">
              {[1, 3, 6, 12].map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setMonthsToAdd(m)}
                  className={`py-2 px-1 text-center font-bold rounded-xl border transition ${
                    monthsToAdd === m
                      ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                      : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  +{m} {m === 1 ? 'Month' : 'Mos'}
                </button>
              ))}
            </div>
          </div>

          {/* Projected Expiry Preview */}
          <div className="p-4 bg-emerald-50/70 rounded-xl border border-emerald-200/80 space-y-1.5">
            <div className="flex items-center gap-1.5 text-emerald-800 font-bold">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Projected New License Validity:</span>
            </div>
            <div className="text-sm font-bold text-slate-900 font-mono">
              {projectedBsStr} BS
            </div>
            <div className="text-[11px] text-slate-500 font-mono">
              Gregorian equivalent: {projectedAdStr} AD
            </div>
            <div className="text-[10px] text-emerald-700 font-semibold pt-1">
              • Status will be reset to Active with full access unblocked.
            </div>
          </div>

          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-lg font-medium transition"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleConfirm}
              disabled={isSubmitting}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-semibold transition disabled:opacity-50 shadow-xs"
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>{isSubmitting ? 'Extending...' : 'Apply Extension'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
