import React, { useState } from 'react';
import {
  X,
  Sparkles,
  Sliders,
  Check,
  AlertCircle,
  Smartphone,
  BarChart3,
  FileSpreadsheet,
  Layers,
  ShieldCheck,
  Printer,
  CalendarDays,
  Landmark,
  FileText,
  Users,
} from 'lucide-react';
import { SystemFeature, FeatureCategory } from '../../types';
import { registerFeatureModule, normalizeFeatureKey } from '../../lib/featureRegistry';

interface RegisterFeatureModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (message: string) => void;
  existingKeys: string[];
}

const CATEGORY_OPTIONS: { id: FeatureCategory; label: string; description: string }[] = [
  { id: 'core', label: 'Core Platform', description: 'Essential cheque register, date, and leaf modules' },
  { id: 'communication', label: 'Communication Hub', description: 'SMS, WhatsApp, and automated client alerts' },
  { id: 'finance', label: 'Banking & Finance', description: 'Bank recon, clearing pipelines, and electronic gateways' },
  { id: 'analytics', label: 'Analytics & Reports', description: 'Forecasting, party risk analysis, and export engines' },
  { id: 'security', label: 'Security & Access', description: 'Audit trails, RBAC, and multi-user permissions' },
  { id: 'integration', label: 'Integrations & API', description: 'Third-party accounting, imports, and webhooks' },
];

const ICON_OPTIONS = [
  { name: 'Smartphone', icon: Smartphone, label: 'Phone / SMS' },
  { name: 'BarChart3', icon: BarChart3, label: 'Analytics' },
  { name: 'FileSpreadsheet', icon: FileSpreadsheet, label: 'Spreadsheet' },
  { name: 'Layers', icon: Layers, label: 'Gateway' },
  { name: 'ShieldCheck', icon: ShieldCheck, label: 'Security' },
  { name: 'Printer', icon: Printer, label: 'Printer' },
  { name: 'CalendarDays', icon: CalendarDays, label: 'Calendar' },
  { name: 'Landmark', icon: Landmark, label: 'Bank' },
  { name: 'Users', icon: Users, label: 'RBAC' },
  { name: 'FileText', icon: FileText, label: 'Document' },
];

export const RegisterFeatureModal: React.FC<RegisterFeatureModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  existingKeys,
}) => {
  const [key, setKey] = useState('');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<FeatureCategory>('communication');
  const [icon, setIcon] = useState('Smartphone');
  const [badge, setBadge] = useState('v2.4 Discovered');
  const [defaultEnabled, setDefaultEnabled] = useState(false);
  const [sourceModule, setSourceModule] = useState('Dynamic Feature Registry');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const normalized = normalizeFeatureKey(key);
  const isDuplicate = existingKeys.map((k) => k.toLowerCase()).includes(normalized);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!key.trim()) {
      setError('Please provide a feature key (e.g. SMS_NOTIFICATIONS or ADVANCED_REPORTS)');
      return;
    }

    if (!name.trim()) {
      setError('Please enter a user-friendly feature name');
      return;
    }

    if (isDuplicate) {
      setError(`Feature key "${normalized}" already exists in the system registry.`);
      return;
    }

    try {
      setIsSubmitting(true);
      await registerFeatureModule({
        id: normalized,
        key: normalized,
        name: name.trim(),
        description: description.trim() || `Modular system capability for ${name.trim()}`,
        category,
        icon,
        badge: badge.trim() || undefined,
        default_enabled: defaultEnabled,
        source_module: sourceModule.trim() || 'Software Update Discovery',
      });

      onSuccess(`New system feature "${name.trim()}" successfully registered! Toggle checkboxes are now available across all company profiles.`);
      onClose();
      // Reset form
      setKey('');
      setName('');
      setDescription('');
    } catch (err: any) {
      console.error('Error registering feature module:', err);
      setError(err?.message || 'Failed to register feature module');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xs">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl max-w-xl w-full overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 flex items-center justify-center shadow-xs">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <span>Register New System Feature / Module</span>
              </h2>
              <p className="text-xs text-slate-400">
                Instantly generates real-time toggle checkboxes for all client companies
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 flex items-center justify-center transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 text-xs">
          {error && (
            <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl flex items-center gap-2 text-rose-400">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Feature Key & Name */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block font-semibold text-slate-300 mb-1">
                Feature Key / Identifier <span className="text-rose-400">*</span>
              </label>
              <input
                type="text"
                value={key}
                onChange={(e) => setKey(e.target.value)}
                placeholder="e.g. SMS_NOTIFICATIONS"
                className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white font-mono text-xs placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                required
              />
              <p className="text-[10px] text-slate-400 mt-1 font-mono">
                Normalized key: <span className="text-indigo-400 font-bold">{normalized || 'none'}</span>
              </p>
            </div>

            <div>
              <label className="block font-semibold text-slate-300 mb-1">
                Feature Display Name <span className="text-rose-400">*</span>
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. SMS & WhatsApp Notifications"
                className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white text-xs placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                required
              />
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block font-semibold text-slate-300 mb-1">Module Description & Purpose</label>
            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="e.g. Automated SMS and WhatsApp due-date reminders dispatched to payees."
              className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white text-xs placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
          </div>

          {/* Category */}
          <div>
            <label className="block font-semibold text-slate-300 mb-1.5">Module Category</label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {CATEGORY_OPTIONS.map((cat) => (
                <button
                  type="button"
                  key={cat.id}
                  onClick={() => setCategory(cat.id)}
                  className={`p-2.5 rounded-xl border text-left transition flex flex-col justify-between ${
                    category === cat.id
                      ? 'bg-indigo-600/20 border-indigo-500 text-white shadow-2xs'
                      : 'bg-slate-800/60 border-slate-700/80 text-slate-400 hover:bg-slate-800'
                  }`}
                >
                  <span className="font-bold text-xs">{cat.label}</span>
                  <span className="text-[10px] text-slate-400 line-clamp-1 mt-0.5">{cat.description}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Icon Selection & Source Module */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block font-semibold text-slate-300 mb-1">Visual Icon</label>
              <div className="flex items-center gap-1.5 flex-wrap">
                {ICON_OPTIONS.map((item) => {
                  const IconComp = item.icon;
                  const isSelected = icon === item.name;
                  return (
                    <button
                      type="button"
                      key={item.name}
                      onClick={() => setIcon(item.name)}
                      title={item.label}
                      className={`p-2 rounded-lg border transition ${
                        isSelected
                          ? 'bg-indigo-600 text-white border-indigo-500'
                          : 'bg-slate-800 text-slate-400 border-slate-700 hover:text-white'
                      }`}
                    >
                      <IconComp className="w-4 h-4" />
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <label className="block font-semibold text-slate-300 mb-1">Release / Source Badge</label>
              <input
                type="text"
                value={badge}
                onChange={(e) => setBadge(e.target.value)}
                placeholder="e.g. New v2.4 or Beta"
                className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white text-xs placeholder-slate-500 focus:outline-none"
              />
            </div>
          </div>

          {/* Default state */}
          <div className="p-3 bg-slate-950/40 rounded-xl border border-slate-800 flex items-center justify-between">
            <div>
              <div className="font-semibold text-white">Default Initial State for Companies</div>
              <div className="text-[11px] text-slate-400">
                {defaultEnabled
                  ? 'Feature will start ON (checked) by default for new accounts.'
                  : 'Feature starts OFF (unchecked); developers manually activate per company code.'}
              </div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={defaultEnabled}
                onChange={(e) => setDefaultEnabled(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-9 h-5 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-600"></div>
            </label>
          </div>

          {/* Quick presets for common requested modules */}
          <div className="pt-1">
            <span className="text-[11px] text-slate-400 block mb-1.5 font-medium">
              Quick Suggestions from Software Releases:
            </span>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => {
                  setKey('SMS_NOTIFICATIONS');
                  setName('SMS & WhatsApp Due-Date Reminders');
                  setDescription('Automated SMS and WhatsApp alerts dispatched to payees 3 days prior to cheque due dates.');
                  setCategory('communication');
                  setIcon('Smartphone');
                  setBadge('Automated');
                }}
                className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-indigo-300 border border-indigo-500/30 rounded-lg text-[11px] transition"
              >
                + SMS_NOTIFICATIONS
              </button>

              <button
                type="button"
                onClick={() => {
                  setKey('ADVANCED_REPORTS');
                  setName('Advanced Reports & Cash Flow Forecasting');
                  setDescription('Multi-dimensional analytics, party credit risk scoring, and monthly cash outflow projections.');
                  setCategory('analytics');
                  setIcon('BarChart3');
                  setBadge('Analytics');
                }}
                className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-indigo-300 border border-indigo-500/30 rounded-lg text-[11px] transition"
              >
                + ADVANCED_REPORTS
              </button>

              <button
                type="button"
                onClick={() => {
                  setKey('BULK_CHEQUE_IMPORT');
                  setName('Bulk Cheque Import Wizard');
                  setDescription('Mass Excel/CSV cheque batch uploading from accounting packages.');
                  setCategory('integration');
                  setIcon('FileSpreadsheet');
                  setBadge('Integration');
                }}
                className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-indigo-300 border border-indigo-500/30 rounded-lg text-[11px] transition"
              >
                + BULK_CHEQUE_IMPORT
              </button>
            </div>
          </div>

          {/* Action Footer */}
          <div className="pt-3 border-t border-slate-800 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !key.trim() || !name.trim()}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-bold rounded-xl text-xs transition shadow-xs flex items-center gap-1.5"
            >
              {isSubmitting ? (
                <span>Registering...</span>
              ) : (
                <>
                  <Check className="w-4 h-4" />
                  <span>Register & Deploy to Matrix</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
