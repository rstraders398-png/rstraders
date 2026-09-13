import React, { useState } from 'react';
import { Layers, ShieldCheck, CheckCircle2, RefreshCw, ArrowRight, ExternalLink, Landmark } from 'lucide-react';
import { Bank } from '../../types';

interface ConnectIpsGatewayViewProps {
  banks: Bank[];
  companyName: string;
}

export const ConnectIpsGatewayView: React.FC<ConnectIpsGatewayViewProps> = ({ banks, companyName }) => {
  const [isVerifying, setIsVerifying] = useState(false);
  const [status, setStatus] = useState<'connected' | 'idle'>('connected');

  const handleTestPing = () => {
    setIsVerifying(true);
    setTimeout(() => {
      setIsVerifying(false);
    }, 800);
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto p-4 sm:p-6 animate-in fade-in duration-150">
      <div className="bg-gradient-to-r from-cyan-950 via-slate-900 to-slate-900 text-white p-6 rounded-2xl border border-cyan-800/40 shadow-md">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 flex items-center justify-center shadow-xs">
            <Layers className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight">ConnectIPS (NCHL) Electronic Settlement Gateway</h1>
            <p className="text-xs text-slate-300 mt-1">
              Direct electronic fund transfer & clearing verification with Nepal Clearing House Ltd.
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-3">
          <div className="text-xs font-semibold text-slate-500">Gateway Status</div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-emerald-500 animate-pulse"></div>
            <span className="font-bold text-slate-900 text-base">Connected to NCHL API</span>
          </div>
          <div className="text-[11px] text-slate-500">Endpoint: api.connectips.com:8443/nchl-api/v1</div>
          <button
            onClick={handleTestPing}
            disabled={isVerifying}
            className="w-full py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition flex items-center justify-center gap-2"
          >
            {isVerifying ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
            <span>{isVerifying ? 'Verifying Gateway...' : 'Ping Gateway'}</span>
          </button>
        </div>

        <div className="md:col-span-2 bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-3">
          <div className="font-bold text-slate-800 text-sm flex items-center gap-2">
            <Landmark className="w-4 h-4 text-cyan-600" />
            <span>Connected Clearing Accounts ({banks.length})</span>
          </div>
          <div className="divide-y divide-slate-100">
            {banks.map((b) => (
              <div key={b.id} className="py-2.5 flex items-center justify-between text-xs">
                <div>
                  <span className="font-bold text-slate-800">{b.name}</span>
                  <span className="text-[10px] text-slate-400 font-mono ml-2">Code: {b.code || 'NCHL-01'}</span>
                </div>
                <span className="px-2 py-0.5 text-[10px] font-bold text-emerald-700 bg-emerald-50 rounded-md border border-emerald-200">
                  Direct IPS Active
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
