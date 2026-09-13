import React, { useState } from 'react';
import { Sparkles, CheckCircle2, ShieldCheck, Sliders, RefreshCw, Bell, Layers } from 'lucide-react';
import { SystemFeature } from '../../types';

interface DynamicModulePlaceholderViewProps {
  feature: SystemFeature;
  companyName: string;
  companyCode?: string;
}

export const DynamicModulePlaceholderView: React.FC<DynamicModulePlaceholderViewProps> = ({
  feature,
  companyName,
  companyCode,
}) => {
  const [isRunning, setIsRunning] = useState(false);
  const [lastExecuted, setLastExecuted] = useState<string | null>(null);

  const handleExecuteAction = () => {
    setIsRunning(true);
    setTimeout(() => {
      setIsRunning(false);
      setLastExecuted(new Date().toLocaleTimeString());
    }, 600);
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto p-4 sm:p-6 animate-in fade-in duration-150">
      <div className="bg-gradient-to-r from-indigo-950 via-slate-900 to-slate-900 text-white p-6 rounded-2xl border border-indigo-800/40 shadow-md">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 flex items-center justify-center shadow-xs">
              <Sparkles className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold tracking-tight">{feature.name}</h1>
                <span className="px-2 py-0.5 text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 rounded-full">
                  Instant Activated
                </span>
                {feature.badge && (
                  <span className="px-2 py-0.5 text-[10px] font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 rounded-full">
                    {feature.badge}
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-300 mt-1">{feature.description}</p>
            </div>
          </div>
          <div className="text-right font-mono text-xs text-indigo-300 bg-indigo-950/60 px-3 py-1.5 rounded-xl border border-indigo-800">
            Tenant: <span className="font-bold text-white">{companyName}</span> (#{companyCode || '1001'})
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <div className="font-bold text-slate-900 text-sm">Automated Feature Registry Module Control</div>
            <div className="text-xs text-slate-500">
              Discovered from module source: <span className="font-semibold text-slate-700">{feature.source_module || 'System Update'}</span> (Feature Key: <span className="font-mono text-indigo-600 font-bold">{feature.key}</span>)
            </div>
          </div>
          <span className="text-xs text-emerald-700 font-bold bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-lg">
            Status: LIVE
          </span>
        </div>

        <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-600 leading-relaxed">
          This module was deployed dynamically by the Super Admin Developer Console. When toggled ON, the client dashboard immediately provisions this workspace without requiring code redeployment or database migrations.
        </div>

        <div className="pt-2 flex items-center justify-between border-t border-slate-100">
          <div className="text-xs text-slate-500">
            {lastExecuted ? `Last executed: ${lastExecuted}` : 'Module operational and listening'}
          </div>
          <button
            onClick={handleExecuteAction}
            disabled={isRunning}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-2 shadow-xs"
          >
            {isRunning ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
            <span>{isRunning ? 'Processing...' : 'Run Module Routine'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
