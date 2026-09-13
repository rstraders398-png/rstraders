import React, { useState, useMemo } from 'react';
import {
  Printer,
  FileText,
  Landmark,
  User,
  Calendar,
  DollarSign,
  CheckCircle2,
  Clock,
  ChevronDown,
  ShieldAlert,
} from 'lucide-react';
import { Bank, Cheque, Party } from '../types';
import { formatCurrency, formatBsDateFriendly } from '../lib/dateUtils';

interface PrintChequeViewProps {
  cheques: Cheque[];
  parties: Party[];
  banks: Bank[];
  onRecordPayment: (cheque: Cheque) => void;
  onViewDetails: (cheque: Cheque) => void;
}

// Convert numbers into words for Indian / Nepalese numbering
function numberToWords(num: number): string {
  if (num === 0) return 'Zero';

  const a = [
    '',
    'One',
    'Two',
    'Three',
    'Four',
    'Five',
    'Six',
    'Seven',
    'Eight',
    'Nine',
    'Ten',
    'Eleven',
    'Twelve',
    'Thirteen',
    'Fourteen',
    'Fifteen',
    'Sixteen',
    'Seventeen',
    'Eighteen',
    'Nineteen',
  ];
  const b = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

  function convertGroup(n: number): string {
    let str = '';
    if (n >= 100) {
      str += a[Math.floor(n / 100)] + ' Hundred ';
      n %= 100;
    }
    if (n >= 20) {
      str += b[Math.floor(n / 10)] + ' ';
      n %= 10;
    }
    if (n > 0) {
      str += a[n] + ' ';
    }
    return str.trim();
  }

  const crore = Math.floor(num / 10000000);
  num %= 10000000;
  const lakh = Math.floor(num / 100000);
  num %= 100000;
  const thousand = Math.floor(num / 1000);
  num %= 1000;
  const hundred = num;

  let res = '';
  if (crore > 0) res += convertGroup(crore) + ' Crore ';
  if (lakh > 0) res += convertGroup(lakh) + ' Lakh ';
  if (thousand > 0) res += convertGroup(thousand) + ' Thousand ';
  if (hundred > 0) res += convertGroup(hundred) + ' ';

  return res.trim();
}

export const PrintChequeView: React.FC<PrintChequeViewProps> = ({
  cheques,
  parties,
  banks,
  onRecordPayment,
  onViewDetails,
}) => {
  const [selectedChequeId, setSelectedChequeId] = useState<string>(
    cheques.length > 0 ? cheques[0].id : ''
  );
  const [isCrossed, setIsCrossed] = useState<boolean>(true);
  const [useBsDate, setUseBsDate] = useState<boolean>(true);

  const selectedCheque = useMemo(() => {
    return cheques.find((c) => c.id === selectedChequeId) || cheques[0] || null;
  }, [cheques, selectedChequeId]);

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

  const activeParty = selectedCheque?.party_id ? partyMap.get(selectedCheque.party_id) : null;
  const activeBank = selectedCheque?.bank_id ? bankMap.get(selectedCheque.bank_id) : null;

  const dateToDisplay = selectedCheque
    ? useBsDate
      ? selectedCheque.issue_date_bs || selectedCheque.due_date_bs
      : selectedCheque.issue_date_ad || selectedCheque.due_date_ad
    : '';

  // Extract individual digits for date boxes: DD MM YYYY
  const dateParts = useMemo(() => {
    if (!dateToDisplay) return ['D', 'D', 'M', 'M', 'Y', 'Y', 'Y', 'Y'];
    // standard YYYY-MM-DD
    const pieces = dateToDisplay.split('-');
    if (pieces.length === 3) {
      const yyyy = pieces[0];
      const mm = pieces[1].padStart(2, '0');
      const dd = pieces[2].padStart(2, '0');
      const combined = `${dd}${mm}${yyyy}`;
      return combined.split('');
    }
    return ['D', 'D', 'M', 'M', 'Y', 'Y', 'Y', 'Y'];
  }, [dateToDisplay]);

  const amountInWords = useMemo(() => {
    if (!selectedCheque) return '';
    const whole = Math.floor(selectedCheque.amount);
    return `Rupees ${numberToWords(whole)} Only /-`;
  }, [selectedCheque]);

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      {/* Top Controls */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <Printer className="w-5 h-5 text-emerald-600" />
            <span>Print Cheque</span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Standard Nepal Banking cheque preview with account payee crossing and formatted amount in words.
          </p>
        </div>

        {/* Cheque selector & options */}
        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          <div className="relative flex-1 md:w-64">
            <select
              value={selectedChequeId}
              onChange={(e) => setSelectedChequeId(e.target.value)}
              className="w-full text-xs font-semibold px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
              {cheques.length === 0 && <option value="">No cheques available</option>}
              {cheques.map((c) => {
                const p = c.party_id ? partyMap.get(c.party_id)?.name : 'Unassigned';
                return (
                  <option key={c.id} value={c.id}>
                    #{c.cheque_number} - {p} (₹{formatCurrency(c.amount)})
                  </option>
                );
              })}
            </select>
          </div>

          <label className="flex items-center gap-1.5 text-xs text-slate-700 cursor-pointer font-medium select-none bg-slate-50 px-3 py-2 rounded-lg border border-slate-200">
            <input
              type="checkbox"
              checked={isCrossed}
              onChange={(e) => setIsCrossed(e.target.checked)}
              className="rounded text-emerald-600 focus:ring-emerald-500 w-3.5 h-3.5"
            />
            <span>Cross Cheque (A/C PAYEE)</span>
          </label>

          <button
            type="button"
            onClick={() => setUseBsDate(!useBsDate)}
            className="text-xs font-semibold px-3 py-2 bg-slate-100 hover:bg-slate-200 rounded-lg text-slate-700 transition"
          >
            Date: {useBsDate ? 'B.S. (Bikram Sambat)' : 'A.D. (Gregorian)'}
          </button>

          <button
            type="button"
            onClick={handlePrint}
            disabled={!selectedCheque}
            className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs rounded-lg shadow-sm transition disabled:opacity-50"
          >
            <Printer className="w-4 h-4" />
            <span>Print Now</span>
          </button>
        </div>
      </div>

      {selectedCheque ? (
        <div className="space-y-6">
          {/* Selected Cheque Status & Partial Payment Banner */}
          <div className="bg-white rounded-2xl border border-slate-200 p-4 flex flex-wrap items-center justify-between gap-4 shadow-xs">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-emerald-50 text-emerald-700 rounded-xl">
                <FileText className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-slate-900 text-sm">
                    Cheque #{selectedCheque.cheque_number}
                  </span>
                  <span
                    className={`text-xs px-2.5 py-0.5 rounded-full font-semibold border ${
                      selectedCheque.status === 'Cleared'
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                        : selectedCheque.status === 'Partially Paid'
                        ? 'bg-blue-50 text-blue-700 border-blue-200'
                        : 'bg-amber-50 text-amber-700 border-amber-200'
                    }`}
                  >
                    {selectedCheque.status}
                  </span>
                </div>
                <p className="text-xs text-slate-500">
                  Total: ₹{formatCurrency(selectedCheque.amount)} | Balance Due: ₹
                  {formatCurrency(selectedCheque.remaining_amount)}
                </p>
              </div>
            </div>

            {/* Retain Partial Payment Button */}
            <div className="flex items-center gap-2">
              {selectedCheque.status !== 'Cleared' && (
                <button
                  onClick={() => onRecordPayment(selectedCheque)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-lg transition"
                >
                  <DollarSign className="w-3.5 h-3.5" />
                  <span>+ Record Payment</span>
                </button>
              )}
              <button
                onClick={() => onViewDetails(selectedCheque)}
                className="px-3 py-1.5 text-xs font-semibold text-slate-600 hover:text-slate-800 bg-slate-100 rounded-lg transition"
              >
                View Details & Logs
              </button>
            </div>
          </div>

          {/* Printable Cheque Leaf Preview */}
          <div className="p-4 sm:p-8 bg-slate-100 rounded-2xl flex justify-center">
            <div
              id="printable-cheque-leaf"
              className="w-full max-w-3xl bg-gradient-to-br from-[#fbfbfa] to-[#f4f3ec] border-2 border-slate-300 rounded-xl p-6 sm:p-8 shadow-md relative text-slate-800 font-serif min-h-[300px] flex flex-col justify-between"
              style={{
                backgroundImage:
                  'radial-gradient(#e5e7eb 0.75px, transparent 0.75px), radial-gradient(#e5e7eb 0.75px, #fbfbfa 0.75px)',
                backgroundSize: '24px 24px',
                backgroundPosition: '0 0, 12px 12px',
              }}
            >
              {/* Crossed Stamp if enabled */}
              {isCrossed && (
                <div className="absolute top-4 left-4 border-y-2 border-slate-800 px-3 py-1 -rotate-12 bg-white/90 shadow-2xs">
                  <span className="font-mono text-xs font-black tracking-widest text-slate-900 block">
                    A/C PAYEE ONLY
                  </span>
                  <span className="text-[9px] font-sans font-bold tracking-wider text-slate-600 block text-center">
                    NOT NEGOTIABLE
                  </span>
                </div>
              )}

              {/* Header: Bank Name & Date Boxes */}
              <div className="flex items-start justify-between gap-4">
                <div className="pl-28 sm:pl-32">
                  <h3 className="font-bold text-lg text-slate-900 tracking-wide uppercase font-sans">
                    {activeBank?.name || 'NEPAL COMMERCIAL BANK LIMITED'}
                  </h3>
                  <p className="text-xs text-slate-600 font-sans">
                    Main Branch, Kathmandu, Nepal {activeBank?.code ? `[Code: ${activeBank.code}]` : ''}
                  </p>
                </div>

                {/* Date Boxes */}
                <div className="space-y-1 text-right">
                  <span className="text-[10px] font-sans font-bold text-slate-500 uppercase tracking-wider block">
                    DATE ({useBsDate ? 'BS' : 'AD'})
                  </span>
                  <div className="flex items-center gap-1 font-mono text-sm font-bold">
                    {dateParts.map((digit, idx) => (
                      <div
                        key={idx}
                        className={`w-6 h-7 border border-slate-400 bg-white/90 flex items-center justify-center text-slate-900 ${
                          idx === 1 || idx === 3 ? 'mr-1' : ''
                        }`}
                      >
                        {digit}
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Cheque Body: Payee, Amount In Words */}
              <div className="my-6 space-y-4 font-sans">
                {/* Payee line */}
                <div className="flex items-baseline gap-2">
                  <span className="text-xs font-bold text-slate-700 shrink-0 uppercase tracking-wider">
                    PAY TO
                  </span>
                  <div className="flex-1 border-b-2 border-dashed border-slate-400 pb-1 font-semibold text-slate-900 text-sm px-2">
                    {activeParty?.name || 'Self / Cash'}
                  </div>
                  <span className="text-xs font-bold text-slate-500 shrink-0 font-mono">OR BEARER</span>
                </div>

                {/* Amount in words and Amount in figures box */}
                <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-4">
                  <div className="flex-1 flex items-baseline gap-2">
                    <span className="text-xs font-bold text-slate-700 shrink-0 uppercase tracking-wider">
                      RUPEES
                    </span>
                    <div className="flex-1 border-b-2 border-dashed border-slate-400 pb-1 font-semibold text-slate-900 text-sm px-2">
                      {amountInWords}
                    </div>
                  </div>

                  {/* Figure Box */}
                  <div className="border-2 border-slate-700 bg-white px-4 py-2 rounded flex items-center gap-2 font-mono font-bold text-base text-slate-900 shrink-0 shadow-2xs">
                    <span className="text-slate-500 text-sm">Rs.</span>
                    <span>₹{formatCurrency(selectedCheque.amount)} /-</span>
                  </div>
                </div>
              </div>

              {/* Footer: Account number, Signatory, MICR Band */}
              <div className="pt-4 border-t border-slate-300 flex flex-col sm:flex-row items-end justify-between gap-6 font-sans">
                <div className="space-y-1">
                  <div className="text-[11px] text-slate-600 font-mono">
                    A/C NO: <span className="font-bold text-slate-900">01902837482910</span>
                  </div>
                  <div className="text-[10px] text-slate-500 font-mono">
                    CHEQUE NO: <span className="font-bold text-slate-800">{selectedCheque.cheque_number}</span>
                  </div>
                </div>

                {/* Signatory Box */}
                <div className="text-center w-48 border-t border-slate-400 pt-1">
                  <span className="text-[11px] font-bold text-slate-600 uppercase block tracking-wider">
                    AUTHORIZED SIGNATORY
                  </span>
                  <span className="text-[9px] text-slate-400 block">Please sign above</span>
                </div>
              </div>

              {/* Bottom Simulated MICR Strip */}
              <div className="mt-4 pt-2 border-t border-dashed border-slate-300 text-center font-mono text-xs tracking-widest text-slate-500">
                ⑈{selectedCheque.cheque_number}⑈ 446012002⑆ 01902837482910⑈ 10
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="p-12 text-center bg-white rounded-2xl border border-slate-200 text-slate-400">
          <FileText className="w-10 h-10 mx-auto text-slate-300 mb-2" />
          <p className="text-sm font-medium text-slate-600">No cheques found</p>
          <p className="text-xs text-slate-400 mt-1">
            Create or issue a cheque first to preview and print.
          </p>
        </div>
      )}
    </div>
  );
};
