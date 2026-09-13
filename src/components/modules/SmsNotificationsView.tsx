import React, { useState } from 'react';
import {
  Smartphone,
  Send,
  CheckCircle2,
  Clock,
  AlertCircle,
  MessageSquare,
  Sparkles,
  RefreshCw,
  Bell,
  Settings,
  Calendar,
} from 'lucide-react';
import { Cheque, Party, Bank } from '../../types';
import { formatCurrency } from '../../lib/dateUtils';

interface SmsNotificationsViewProps {
  cheques: Cheque[];
  parties: Party[];
  banks: Bank[];
  companyName: string;
  companyCode?: string;
}

export const SmsNotificationsView: React.FC<SmsNotificationsViewProps> = ({
  cheques,
  parties,
  companyName,
  companyCode,
}) => {
  const [template, setTemplate] = useState<'nepali' | 'english'>('nepali');
  const [selectedDaysBefore, setSelectedDaysBefore] = useState<number>(3);
  const [isSending, setIsSending] = useState<string | null>(null);
  const [dispatchLog, setDispatchLog] = useState<
    { id: string; partyName: string; phone: string; chequeNo: string; amount: number; time: string; status: 'Sent' | 'Delivered' }[]
  >([
    {
      id: 'log-1',
      partyName: parties[0]?.name || 'Everest Suppliers',
      phone: '+977-9841234567',
      chequeNo: '009821',
      amount: 145000,
      time: 'Today at 09:30 AM',
      status: 'Delivered',
    },
    {
      id: 'log-2',
      partyName: parties[1]?.name || 'Himalayan Distributors',
      phone: '+977-9851098765',
      chequeNo: '009823',
      amount: 85000,
      time: 'Yesterday at 04:15 PM',
      status: 'Delivered',
    },
  ]);

  const pendingCheques = cheques.filter((c) => c.status !== 'Cleared');

  const handleSendManualReminder = (chq: Cheque, partyName: string, phone: string) => {
    setIsSending(chq.id);
    setTimeout(() => {
      setIsSending(null);
      setDispatchLog((prev) => [
        {
          id: `log-${Date.now()}`,
          partyName,
          phone,
          chequeNo: chq.cheque_number,
          amount: chq.remaining_amount,
          time: 'Just now',
          status: 'Delivered',
        },
        ...prev,
      ]);
    }, 900);
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto p-4 sm:p-6 animate-in fade-in duration-150">
      {/* Module Header Banner */}
      <div className="bg-gradient-to-r from-indigo-900 via-slate-900 to-indigo-950 text-white p-6 rounded-2xl border border-indigo-500/30 shadow-md">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 flex items-center justify-center shadow-xs">
              <Smartphone className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold tracking-tight">SMS & WhatsApp Notification Hub</h1>
                <span className="px-2 py-0.5 text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 rounded-full">
                  Real-Time Active
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-1">
                Automated due-date alerts dispatched via Nepal SMS Gateway and WhatsApp Business API.
              </p>
            </div>
          </div>
          <div className="text-right font-mono text-xs text-indigo-300 bg-indigo-950/60 px-3 py-1.5 rounded-xl border border-indigo-800">
            Tenant: <span className="font-bold text-white">{companyName}</span> (#{companyCode || '1021'})
          </div>
        </div>
      </div>

      {/* Grid: Automation Settings + Dispatch Queue */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Configuration & Templates */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-4">
          <div className="flex items-center gap-2 font-bold text-slate-800 text-sm">
            <Settings className="w-4 h-4 text-indigo-600" />
            <span>Reminder Automation Rules</span>
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-700 block mb-1">
              Trigger Timing Before Due Date (BS):
            </label>
            <div className="grid grid-cols-3 gap-2 text-xs">
              {[1, 3, 7].map((days) => (
                <button
                  key={days}
                  onClick={() => setSelectedDaysBefore(days)}
                  className={`py-2 px-3 rounded-xl border font-bold transition ${
                    selectedDaysBefore === days
                      ? 'bg-indigo-600 text-white border-indigo-600'
                      : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  {days} {days === 1 ? 'Day' : 'Days'} Prior
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-700 block mb-1">
              Template Language:
            </label>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <button
                onClick={() => setTemplate('nepali')}
                className={`py-2 px-3 rounded-xl border font-bold transition ${
                  template === 'nepali'
                    ? 'bg-indigo-600 text-white border-indigo-600'
                    : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                }`}
              >
                नेपाली (Unicode)
              </button>
              <button
                onClick={() => setTemplate('english')}
                className={`py-2 px-3 rounded-xl border font-bold transition ${
                  template === 'english'
                    ? 'bg-indigo-600 text-white border-indigo-600'
                    : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                }`}
              >
                English
              </button>
            </div>
          </div>

          {/* Sample Preview */}
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1.5">
            <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Message Preview
            </div>
            <p className="text-xs text-slate-700 font-sans leading-relaxed">
              {template === 'nepali'
                ? `नमस्ते [Party Name], ${companyName} द्वारा जारी गरिएको चेक नं. [ChequeNo] रकम रु. [Amount] मिति [DueDateBS] मा भुक्तानी हुन बाँकी छ। धन्यवाद।`
                : `Dear [Party Name], Cheque #[ChequeNo] for Rs. [Amount] issued by ${companyName} is scheduled for due date [DueDateBS]. Thank you.`}
            </p>
          </div>
        </div>

        {/* Center & Right: Ready to Send Queue & Recent Dispatch Logs */}
        <div className="lg:col-span-2 space-y-6">
          {/* Pending Cheques Alert Queue */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 font-bold text-slate-800 text-sm">
                <Bell className="w-4 h-4 text-amber-500" />
                <span>Pending Cheques Eligible for Reminder ({pendingCheques.length})</span>
              </div>
              <span className="text-xs text-slate-400">Auto-synced</span>
            </div>

            <div className="divide-y divide-slate-100 max-h-60 overflow-y-auto">
              {pendingCheques.slice(0, 5).map((chq) => {
                const party = parties.find((p) => p.id === chq.party_id);
                const partyName = party?.name || 'Party';
                const phone = party?.phone || '+977-98XXXXXXXX';
                const isItemSending = isSending === chq.id;

                return (
                  <div key={chq.id} className="py-3 flex items-center justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-xs text-slate-900">{partyName}</span>
                        <span className="font-mono text-[11px] text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded-sm">
                          #{chq.cheque_number}
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-500 flex items-center gap-2 mt-0.5">
                        <span>Due: {chq.due_date_bs} BS</span>
                        <span>•</span>
                        <span className="font-semibold text-slate-700">{formatCurrency(chq.remaining_amount)}</span>
                        <span>•</span>
                        <span className="text-slate-400">{phone}</span>
                      </div>
                    </div>

                    <button
                      onClick={() => handleSendManualReminder(chq, partyName, phone)}
                      disabled={isItemSending}
                      className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition shadow-2xs flex items-center gap-1.5"
                    >
                      {isItemSending ? (
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Send className="w-3.5 h-3.5" />
                      )}
                      <span>{isItemSending ? 'Sending...' : 'Send Alert'}</span>
                    </button>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Dispatch Logs */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-3">
            <div className="flex items-center justify-between">
              <div className="font-bold text-slate-800 text-sm flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>Recent Gateway Dispatch Logs</span>
              </div>
              <span className="text-xs text-emerald-700 font-semibold bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                Gateway 100% Online
              </span>
            </div>

            <div className="divide-y divide-slate-100">
              {dispatchLog.map((log) => (
                <div key={log.id} className="py-2.5 flex items-center justify-between text-xs">
                  <div>
                    <span className="font-bold text-slate-800">{log.partyName}</span>
                    <span className="text-slate-500 text-[11px] ml-2">({log.phone})</span>
                    <div className="text-[11px] text-slate-400">
                      Cheque #{log.chequeNo} • {formatCurrency(log.amount)}
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md">
                      <CheckCircle2 className="w-3 h-3" />
                      {log.status}
                    </span>
                    <div className="text-[10px] text-slate-400 mt-0.5">{log.time}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
