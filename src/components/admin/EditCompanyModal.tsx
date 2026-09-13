import React, { useState, useEffect } from 'react';
import { X, Building, Save, Hash, Calendar } from 'lucide-react';
import { Company, SubscriptionPlan, SubscriptionStatus } from '../../types';

interface EditCompanyModalProps {
  isOpen: boolean;
  onClose: () => void;
  company: Company | null;
  onUpdate: (id: string, partial: Partial<Company>) => Promise<void>;
}

export const EditCompanyModal: React.FC<EditCompanyModalProps> = ({
  isOpen,
  onClose,
  company,
  onUpdate,
}) => {
  if (!isOpen || !company) return null;

  const [companyCode, setCompanyCode] = useState(company.company_code || '1001');
  const [salesDate, setSalesDate] = useState(company.sales_date || '2024-01-15');
  const [name, setName] = useState(company.name);
  const [ownerName, setOwnerName] = useState(company.owner_name || '');
  const [phone, setPhone] = useState(company.contact_phone || '');
  const [email, setEmail] = useState(company.contact_email || '');
  const [plan, setPlan] = useState<SubscriptionPlan>(company.subscription_plan || 'Professional');
  const [status, setStatus] = useState<SubscriptionStatus>(company.subscription_status || 'Active');
  const [fee, setFee] = useState<number>(company.monthly_fee || 0);
  const [isActive, setIsActive] = useState<boolean>(company.is_active ?? true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    setCompanyCode(company.company_code || '1001');
    setSalesDate(company.sales_date || (company.created_at ? company.created_at.slice(0, 10) : '2024-01-15'));
    setName(company.name);
    setOwnerName(company.owner_name || '');
    setPhone(company.contact_phone || '');
    setEmail(company.contact_email || '');
    setPlan(company.subscription_plan || 'Professional');
    setStatus(company.subscription_status || 'Active');
    setFee(company.monthly_fee || 0);
    setIsActive(company.is_active ?? true);
  }, [company]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    try {
      setIsSubmitting(true);
      await onUpdate(company.id, {
        company_code: companyCode.trim(),
        sales_date: salesDate,
        name: name.trim(),
        owner_name: ownerName.trim(),
        contact_phone: phone.trim(),
        contact_email: email.trim(),
        subscription_plan: plan,
        subscription_status: status,
        monthly_fee: Number(fee),
        is_active: isActive,
      });
      onClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-lg w-full overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center">
              <Building className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-sm">Edit Client Company Details</h3>
              <p className="text-[11px] font-mono text-slate-400">
                Code: #{companyCode} • ID: {company.id}
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

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 text-xs">
          {/* Company Code & Sales Date */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-3 bg-indigo-50/60 border border-indigo-100 rounded-xl">
            <div>
              <label className="font-bold text-indigo-950 block mb-1">Company Code</label>
              <div className="relative">
                <Hash className="w-3.5 h-3.5 text-indigo-500 absolute left-2.5 top-2.5" />
                <input
                  type="text"
                  required
                  value={companyCode}
                  onChange={(e) => setCompanyCode(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 bg-white border border-indigo-200 rounded-lg font-mono font-bold text-indigo-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>

            <div>
              <label className="font-bold text-indigo-950 block mb-1">Sales Onboarding Date</label>
              <div className="relative">
                <Calendar className="w-3.5 h-3.5 text-indigo-500 absolute left-2.5 top-2.5" />
                <input
                  type="date"
                  value={salesDate}
                  onChange={(e) => setSalesDate(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 bg-white border border-indigo-200 rounded-lg font-mono text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="font-semibold text-slate-700 block mb-1">Company Name *</label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <div>
              <label className="font-semibold text-slate-700 block mb-1">Owner / Primary Contact</label>
              <input
                type="text"
                value={ownerName}
                onChange={(e) => setOwnerName(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <div>
              <label className="font-semibold text-slate-700 block mb-1">Phone Number</label>
              <input
                type="text"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <div>
              <label className="font-semibold text-slate-700 block mb-1">Billing Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2 border-t border-slate-100">
            <div>
              <label className="font-semibold text-slate-700 block mb-1">Subscription Plan</label>
              <select
                value={plan}
                onChange={(e) => setPlan(e.target.value as SubscriptionPlan)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium"
              >
                <option value="Starter">Starter (1-2 Users)</option>
                <option value="Professional">Professional (Up to 10)</option>
                <option value="Enterprise">Enterprise (Unlimited)</option>
              </select>
            </div>

            <div>
              <label className="font-semibold text-slate-700 block mb-1">Account Status</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as SubscriptionStatus)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium"
              >
                <option value="Active">Active</option>
                <option value="Trial">Trial</option>
                <option value="Expired">Expired</option>
                <option value="Suspended">Suspended</option>
              </select>
            </div>

            <div>
              <label className="font-semibold text-slate-700 block mb-1">Monthly Fee (NPR)</label>
              <input
                type="number"
                value={fee}
                onChange={(e) => setFee(Number(e.target.value))}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 font-mono"
              />
            </div>
          </div>

          <div className="flex items-center gap-2 pt-2">
            <input
              type="checkbox"
              id="edit-company-active"
              checked={isActive}
              onChange={(e) => setIsActive(e.target.checked)}
              className="w-4 h-4 text-emerald-600 rounded-sm border-slate-300 focus:ring-emerald-500"
            />
            <label htmlFor="edit-company-active" className="font-semibold text-slate-700 cursor-pointer">
              Company Workspace Enabled (Active Login Access)
            </label>
          </div>

          <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-slate-100">
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
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-semibold transition disabled:opacity-50 shadow-xs"
            >
              <Save className="w-3.5 h-3.5" />
              <span>{isSubmitting ? 'Saving...' : 'Save Changes'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
