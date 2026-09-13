import React, { useState } from 'react';
import { X, Sliders, CheckCircle2, ShieldCheck, Check, AlertCircle, Sparkles } from 'lucide-react';
import { Company, CompanyFeatures, SystemFeature, DEFAULT_COMPANY_FEATURES } from '../../types';
import { updateCompanyFeatures } from '../../lib/adminService';
import { BUILTIN_SYSTEM_FEATURES } from '../../lib/featureRegistry';

interface FeatureMatrixModalProps {
  isOpen: boolean;
  onClose: () => void;
  company: Company | null;
  onSuccess: (message: string) => void;
  systemFeatures?: SystemFeature[];
}

export const FeatureMatrixModal: React.FC<FeatureMatrixModalProps> = ({
  isOpen,
  onClose,
  company,
  onSuccess,
  systemFeatures = BUILTIN_SYSTEM_FEATURES,
}) => {
  if (!isOpen || !company) return null;

  const [features, setFeatures] = useState<CompanyFeatures>(
    company.features || { ...DEFAULT_COMPANY_FEATURES }
  );
  const [isSaving, setIsSaving] = useState(false);

  const toggleFeature = (key: string) => {
    setFeatures((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  const handleSelectAll = () => {
    const updated: Record<string, boolean> = {};
    systemFeatures.forEach((sf) => {
      updated[sf.key] = true;
    });
    setFeatures(updated);
  };

  const handleSelectStarterPreset = () => {
    const updated: Record<string, boolean> = {};
    systemFeatures.forEach((sf) => {
      if (['partial_payments', 'nepali_bs_calendar', 'bank_reconciliation'].includes(sf.key)) {
        updated[sf.key] = true;
      } else {
        updated[sf.key] = false;
      }
    });
    setFeatures(updated);
  };

  const handleSave = async () => {
    try {
      setIsSaving(true);
      await updateCompanyFeatures(company.id, company.name, features);
      onSuccess(`Feature matrix updated for ${company.name} (Code: #${company.company_code || 'N/A'})`);
      onClose();
    } catch (err: any) {
      alert(err?.message || 'Failed to update features');
    } finally {
      setIsSaving(false);
    }
  };

  const activeCount = systemFeatures.filter((sf) => Boolean(features[sf.key])).length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-2xl w-full overflow-hidden animate-in fade-in zoom-in-95 duration-150 flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-indigo-50/70 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-indigo-600 text-white flex items-center justify-center shadow-xs">
              <Sliders className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-slate-900 text-sm">Feature Matrix Control</h3>
                <span className="font-mono text-xs font-bold px-2 py-0.5 bg-indigo-100 text-indigo-800 rounded-md border border-indigo-200">
                  Code: #{company.company_code || '1001'}
                </span>
              </div>
              <p className="text-[11px] text-slate-500">
                Turn features ON/OFF per company: <span className="font-semibold text-slate-800">{company.name}</span>
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Quick Presets Toolbar */}
        <div className="px-6 py-2.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between text-xs shrink-0">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-slate-600">Quick Presets:</span>
            <button
              onClick={handleSelectAll}
              className="px-2 py-1 bg-white border border-slate-200 rounded-md text-[11px] font-bold text-indigo-700 hover:bg-indigo-50 transition"
            >
              Enterprise (All ON)
            </button>
            <button
              onClick={handleSelectStarterPreset}
              className="px-2 py-1 bg-white border border-slate-200 rounded-md text-[11px] font-medium text-slate-700 hover:bg-slate-100 transition"
            >
              Starter Preset (3 Core)
            </button>
          </div>
          <div className="font-bold text-xs">
            <span className={activeCount === systemFeatures.length ? 'text-emerald-700' : 'text-slate-700'}>
              {activeCount} of {systemFeatures.length} Features Active
            </span>
          </div>
        </div>

        {/* Features List */}
        <div className="p-6 overflow-y-auto divide-y divide-slate-100 flex-1">
          {systemFeatures.map((feat) => {
            const isEnabled = Boolean(features[feat.key]);

            return (
              <div
                key={feat.key}
                onClick={() => toggleFeature(feat.key)}
                className={`py-3.5 px-3 -mx-3 rounded-xl cursor-pointer transition flex items-start justify-between gap-4 ${
                  isEnabled ? 'hover:bg-indigo-50/50' : 'hover:bg-slate-50 opacity-75'
                }`}
              >
                <div className="flex items-start gap-3 min-w-0">
                  <div
                    className={`w-6 h-6 rounded-md flex items-center justify-center shrink-0 mt-0.5 transition ${
                      isEnabled
                        ? 'bg-indigo-600 text-white shadow-xs'
                        : 'bg-slate-100 text-slate-400 border border-slate-300'
                    }`}
                  >
                    {isEnabled ? <Check className="w-3.5 h-3.5 stroke-[3]" /> : null}
                  </div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-slate-900 text-xs">{feat.name}</span>
                      <span className="text-[10px] font-mono text-slate-400 bg-slate-100 px-1 rounded-sm">
                        {feat.key}
                      </span>
                      <span
                        className={`text-[9px] uppercase tracking-wider font-bold px-1.5 py-0.2 rounded-xs ${
                          feat.category === 'security'
                            ? 'bg-purple-100 text-purple-700'
                            : feat.category === 'analytics'
                            ? 'bg-blue-100 text-blue-700'
                            : feat.category === 'communication'
                            ? 'bg-emerald-100 text-emerald-700'
                            : 'bg-slate-100 text-slate-700'
                        }`}
                      >
                        {feat.category}
                      </span>
                      {feat.badge && (
                        <span className="text-[9px] font-bold px-1.5 py-0.2 rounded-xs bg-amber-100 text-amber-800">
                          {feat.badge}
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-slate-500 mt-0.5 leading-relaxed">{feat.description}</p>
                  </div>
                </div>

                <div className="shrink-0 pt-0.5">
                  <span
                    className={`inline-block px-2.5 py-1 rounded-full text-[10px] font-bold transition ${
                      isEnabled
                        ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                        : 'bg-slate-100 text-slate-500 border border-slate-200'
                    }`}
                  >
                    {isEnabled ? 'ENABLED [✓]' : 'DISABLED [✗]'}
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 border-t border-slate-200 bg-slate-50 flex items-center justify-between shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 transition"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={isSaving}
            className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-xs font-bold rounded-xl transition shadow-xs flex items-center gap-1.5"
          >
            {isSaving ? 'Updating...' : 'Save & Deploy to Tenant'}
          </button>
        </div>
      </div>
    </div>
  );
};
