import React, { useState, useEffect } from 'react';
import { Calendar as CalendarIcon, ArrowRightLeft } from 'lucide-react';
import { adToBs, bsToAd, formatBsDateFriendly } from '../lib/dateUtils';

interface DualDatePickerProps {
  id?: string;
  label: string;
  adDate: string;
  bsDate: string;
  onDateChange: (adDate: string, bsDate: string) => void;
  required?: boolean;
}

export const DualDatePicker: React.FC<DualDatePickerProps> = ({
  id,
  label,
  adDate,
  bsDate,
  onDateChange,
  required = false,
}) => {
  const [localAd, setLocalAd] = useState(adDate || '');
  const [localBs, setLocalBs] = useState(bsDate || '');

  useEffect(() => {
    setLocalAd(adDate || '');
  }, [adDate]);

  useEffect(() => {
    setLocalBs(bsDate || '');
  }, [bsDate]);

  const handleAdChange = (newAd: string) => {
    setLocalAd(newAd);
    if (newAd) {
      const convertedBs = adToBs(newAd);
      setLocalBs(convertedBs);
      onDateChange(newAd, convertedBs);
    } else {
      onDateChange('', '');
    }
  };

  const handleBsChange = (newBs: string) => {
    setLocalBs(newBs);
    // If valid YYYY-MM-DD pattern
    if (/^\d{4}-\d{2}-\d{2}$/.test(newBs)) {
      const convertedAd = bsToAd(newBs);
      if (convertedAd) {
        setLocalAd(convertedAd);
        onDateChange(convertedAd, newBs);
        return;
      }
    }
    onDateChange(localAd, newBs);
  };

  return (
    <div className="space-y-1.5" id={id || `dual-date-picker-${label.toLowerCase().replace(/\s+/g, '-')}`}>
      <div className="flex items-center justify-between">
        <label className="text-xs font-semibold text-slate-700 tracking-wide uppercase">
          {label} {required && <span className="text-rose-500">*</span>}
        </label>
        {localBs && (
          <span className="text-[11px] font-medium text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
            {formatBsDateFriendly(localBs)}
          </span>
        )}
      </div>

      <div className="grid grid-cols-2 gap-2">
        {/* BS Date Input */}
        <div>
          <div className="text-[10px] text-slate-500 font-medium mb-1 flex items-center gap-1">
            <span>Bikram Sambat (BS)</span>
            <span className="text-slate-400 font-normal">YYYY-MM-DD</span>
          </div>
          <div className="relative">
            <input
              type="text"
              placeholder="e.g. 2081-05-20"
              value={localBs}
              onChange={(e) => handleBsChange(e.target.value)}
              className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 font-mono transition"
              required={required}
            />
          </div>
        </div>

        {/* AD Date Input with native date picker */}
        <div>
          <div className="text-[10px] text-slate-500 font-medium mb-1 flex items-center gap-1">
            <span>Gregorian (AD)</span>
            <span className="text-slate-400 font-normal">YYYY-MM-DD</span>
          </div>
          <div className="relative">
            <input
              type="date"
              value={localAd}
              onChange={(e) => handleAdChange(e.target.value)}
              className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 font-mono transition"
              required={required}
            />
          </div>
        </div>
      </div>
    </div>
  );
};
