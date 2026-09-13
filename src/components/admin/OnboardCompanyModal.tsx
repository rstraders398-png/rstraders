import React, { useState, useEffect } from 'react';
import { X, Building2, Sparkles, CheckCircle2, KeyRound, Hash, RefreshCw, Sliders } from 'lucide-react';
import { Company, SubscriptionPlan, CompanyFeatures, DEFAULT_COMPANY_FEATURES } from '../../types';
import { createCompany, autoGenerateCompanyCode } from '../../lib/adminService';
import { adToBs, getCurrentAdDate } from '../../lib/dateUtils';

interface OnboardCompanyModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (message: string) => void;
  existingCompanies?: Company[];
}

export const OnboardCompanyModal: React.FC<OnboardCompanyModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  existingCompanies = [],
}) => {
  if (!isOpen) return null;

  const [companyCode, setCompanyCode] = useState<string>('');
  const [companyName, setCompanyName] = useState('');
  const [ownerName, setOwnerName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [adminPassword, setAdminPassword] = useState('Pass@Cheque123');
  const [salesDate, setSalesDate] = useState(getCurrentAdDate());
  const [plan, setPlan] = useState<SubscriptionPlan>('Professional');
  const [durationMonths, setDurationMonths] = useState<number>(12);
  const [fee, setFee] = useState<number>(8500);
  const [features, setFeatures] = useState<CompanyFeatures>({ ...DEFAULT_COMPANY_FEATURES });
  const [showFeatureCustomizer, setShowFeatureCustomizer] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Auto generate company code on mount
  useEffect(() => {
    const code = autoGenerateCompanyCode(existingCompanies);
    setCompanyCode(code);
  }, [existingCompanies]);

  const handleRegenerateCode = () => {
    const code = autoGenerateCompanyCode(existingCompanies);
    setCompanyCode(code);
  };

  // Plan presets default fees & features
  const handlePlanChange = (newPlan: SubscriptionPlan) => {
    setPlan(newPlan);
    if (newPlan === 'Starter') {
      setFee(4000);
      setFeatures({
        cheque_printing: false,
        partial_payments: true,
        nepali_bs_calendar: true,
        sms_whatsapp_alerts: false,
        bank_reconciliation: true,
        audit_logs: false,
        multi_user_rbac: false,
        export_reports: false,
      });
    } else if (newPlan === 'Professional') {
      setFee(8500);
      setFeatures({
        ...DEFAULT_COMPANY_FEATURES,
        sms_whatsapp_alerts: false,
      });
    } else if (newPlan === 'Enterprise') {
      setFee(15000);
      setFeatures({ ...DEFAULT_COMPANY_FEATURES });
    }
  };

  // Calculate projected expiry date
  const now = new Date();
  const projectedAd = new Date(now);
  projectedAd.setMonth(projectedAd.getMonth() + durationMonths);
  const projectedAdStr = projectedAd.toISOString().split('T')[0];
  const projectedBsStr = adToBs(projectedAdStr);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!companyName.trim() || !ownerName.trim() || !email.trim()) return;

    try {
      setIsSubmitting(true);
      const newId = await createCompany({
        company_code: companyCode.trim() || autoGenerateCompanyCode(existingCompanies),
        name: companyName.trim(),
        owner_name: ownerName.trim(),
        contact_phone: phone.trim(),
        contact_email: email.trim(),
        subscription_plan: plan,
        expiry_date_bs: projectedBsStr,
        expiry_date_ad: projectedAdStr,
        monthly_fee: Number(fee),
        is_active: true,
        sales_date: salesDate,
        features: features,
        admin_password: adminPassword,
      });

      onSuccess(
        `Successfully onboarded "${companyName}"! Company Code: #${companyCode}. Admin login created for ${email}.`
      );
      onClose();
    } catch (err: any) {
      alert(err?.message || 'Failed to onboard company');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-2xl w-full max-h-[92vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-emerald-50/70 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-600 text-white flex items-center justify-center shadow-xs">
              <Building2 className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-sm">Sales & Onboarding: New Client Company</h3>
              <p className="text-[11px] text-slate-500">Dynamic Company Code, Admin Provisioning & Feature Matrix</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Scrollable Form Content */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 text-xs overflow-y-auto flex-1">
          {/* Company Code Bar */}
          <div className="p-3.5 bg-indigo-50/80 border border-indigo-200/80 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-md bg-indigo-600 text-white flex items-center justify-center shrink-0">
                <Hash className="w-4 h-4" />
              </div>
              <div>
                <label className="font-bold text-indigo-950 block text-[11px]">
                  Assigned Company Code (Developer Control)
                </label>
                <p className="text-[10px] text-indigo-800/80">
                  Unique identifier used for support lookup, database binding, and impersonation.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1.5">
              <input
                type="text"
                required
                value={companyCode}
                onChange={(e) => setCompanyCode(e.target.value)}
                placeholder="e.g. 1021"
                className="w-24 px-2.5 py-1.5 bg-white border border-indigo-300 rounded-lg font-mono font-bold text-indigo-900 text-center text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              />
              <button
                type="button"
                onClick={handleRegenerateCode}
                title="Auto-Generate Next Code"
                className="p-1.5 bg-white hover:bg-indigo-100 border border-indigo-200 text-indigo-700 rounded-lg transition"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Company Details */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="font-semibold text-slate-700 block mb-1">Company Trade Name *</label>
              <input
                type="text"
                required
                placeholder="e.g. Himalayan Suppliers Pvt. Ltd."
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="font-semibold text-slate-700 block mb-1">Owner / Primary Contact *</label>
              <input
                type="text"
                required
                placeholder="e.g. Pemba Sherpa"
                value={ownerName}
                onChange={(e) => setOwnerName(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="font-semibold text-slate-700 block mb-1">Owner Phone</label>
              <input
                type="text"
                placeholder="+977-9801987654"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="font-semibold text-slate-700 block mb-1">Sales Onboarding Date</label>
              <input
                type="date"
                value={salesDate}
                onChange={(e) => setSalesDate(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg font-mono focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              />
            </div>
          </div>

          {/* Admin Credentials Provisioning Section */}
          <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
            <div className="flex items-center gap-2">
              <KeyRound className="w-4 h-4 text-emerald-700" />
              <span className="font-bold text-slate-900 text-xs">Create Client Admin Credentials</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="font-semibold text-slate-600 block mb-1">Admin Email (Login ID) *</label>
                <input
                  type="email"
                  required
                  placeholder="admin@himalayansupplies.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-600 block mb-1">Initial Password</label>
                <input
                  type="text"
                  value={adminPassword}
                  onChange={(e) => setAdminPassword(e.target.value)}
                  className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg font-mono focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>
            </div>
          </div>

          {/* Subscription Plan & Duration */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2 border-t border-slate-100">
            <div>
              <label className="font-semibold text-slate-700 block mb-1">Subscription Plan</label>
              <select
                value={plan}
                onChange={(e) => handlePlanChange(e.target.value as SubscriptionPlan)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg font-semibold focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              >
                <option value="Starter">Starter Plan</option>
                <option value="Professional">Professional Plan</option>
                <option value="Enterprise">Enterprise Plan</option>
              </select>
            </div>

            <div>
              <label className="font-semibold text-slate-700 block mb-1">Initial Validity</label>
              <select
                value={durationMonths}
                onChange={(e) => setDurationMonths(Number(e.target.value))}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg font-semibold focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              >
                <option value={1}>1 Month (Trial)</option>
                <option value={3}>3 Months</option>
                <option value={6}>6 Months</option>
                <option value={12}>12 Months (Annual)</option>
              </select>
            </div>

            <div>
              <label className="font-semibold text-slate-700 block mb-1">Agreed Monthly Fee (NPR)</label>
              <input
                type="number"
                value={fee}
                onChange={(e) => setFee(Number(e.target.value))}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg font-mono font-semibold focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              />
            </div>
          </div>

          {/* Feature Matrix Control Toggles Accordion */}
          <div className="border border-slate-200 rounded-xl overflow-hidden">
            <button
              type="button"
              onClick={() => setShowFeatureCustomizer(!showFeatureCustomizer)}
              className="w-full px-4 py-2.5 bg-slate-50 hover:bg-slate-100/80 flex items-center justify-between text-xs font-bold text-slate-800 transition"
            >
              <div className="flex items-center gap-2">
                <Sliders className="w-3.5 h-3.5 text-indigo-600" />
                <span>Feature Matrix Preset ({Object.values(features).filter(Boolean).length}/8 Active)</span>
              </div>
              <span className="text-indigo-600 font-semibold text-[11px]">
                {showFeatureCustomizer ? 'Hide Details ▲' : 'Customize Toggles ▼'}
              </span>
            </button>

            {showFeatureCustomizer && (
              <div className="p-4 bg-white grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs border-t border-slate-200">
                {Object.keys(DEFAULT_COMPANY_FEATURES).map((k) => {
                  const key = k as keyof CompanyFeatures;
                  const isChecked = features[key];

                  return (
                    <label
                      key={key}
                      className="flex items-center gap-2.5 p-2 rounded-lg hover:bg-slate-50 cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => setFeatures((prev) => ({ ...prev, [key]: !prev[key] }))}
                        className="rounded-sm text-indigo-600 focus:ring-indigo-500 h-4 w-4"
                      />
                      <span className="font-medium text-slate-700 capitalize">
                        {String(key).replace(/_/g, ' ')}
                      </span>
                    </label>
                  );
                })}
              </div>
            )}
          </div>

          {/* Expiry & Provisioning Callout */}
          <div className="p-3 bg-emerald-50/60 border border-emerald-200/80 rounded-xl space-y-1">
            <div className="flex items-center justify-between text-xs">
              <span className="text-emerald-900 font-medium">Subscription Valid Until:</span>
              <span className="font-mono font-bold text-emerald-800">
                {projectedBsStr} BS <span className="text-slate-500 font-normal">({projectedAdStr} AD)</span>
              </span>
            </div>
            <div className="flex items-center gap-1 text-[11px] text-emerald-700 pt-0.5">
              <Sparkles className="w-3.5 h-3.5 shrink-0" />
              <span>
                Isolated tenant workspace bound to Code #{companyCode || '...'} with initial bank and ledger data.
              </span>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-lg font-medium transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="inline-flex items-center gap-1.5 px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold transition disabled:opacity-50 shadow-xs"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>{isSubmitting ? 'Onboarding...' : 'Onboard Client Company'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
