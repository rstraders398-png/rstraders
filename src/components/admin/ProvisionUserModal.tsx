import React, { useState } from 'react';
import { X, UserPlus, Building, ShieldCheck, Mail } from 'lucide-react';
import { Company, UserRole } from '../../types';
import { provisionUser } from '../../lib/adminService';

interface ProvisionUserModalProps {
  isOpen: boolean;
  onClose: () => void;
  companies: Company[];
  onSuccess: (message: string) => void;
}

export const ProvisionUserModal: React.FC<ProvisionUserModalProps> = ({
  isOpen,
  onClose,
  companies,
  onSuccess,
}) => {
  if (!isOpen) return null;

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [companyId, setCompanyId] = useState(companies[0]?.id || 'default-company-101');
  const [role, setRole] = useState<UserRole>('accountant');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const selectedCompany = companies.find((c) => c.id === companyId);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim()) return;

    try {
      setIsSubmitting(true);
      await provisionUser({
        name: name.trim(),
        email: email.trim(),
        role,
        company_id: companyId,
        company_name: selectedCompany?.name || 'Company',
      });
      onSuccess(`Provisioned user "${name}" for ${selectedCompany?.name || companyId} with role [${role}].`);
      onClose();
    } catch (err: any) {
      alert(err?.message || 'Failed to provision user');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-md w-full overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-blue-50/70">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center shadow-xs">
              <UserPlus className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-sm">Provision Platform User</h3>
              <p className="text-[11px] text-slate-500">Cross-Company Global User Access</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4 text-xs">
          <div>
            <label className="font-semibold text-slate-700 block mb-1">Full Name *</label>
            <input
              type="text"
              required
              placeholder="e.g. Suman Bhattarai"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="font-semibold text-slate-700 block mb-1">User Email *</label>
            <input
              type="email"
              required
              placeholder="suman@business.com.np"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="font-semibold text-slate-700 block mb-1">Assign to Client Company *</label>
            <select
              value={companyId}
              onChange={(e) => setCompanyId(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg font-semibold focus:ring-2 focus:ring-blue-500 focus:outline-none"
            >
              {companies.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} ({c.subscription_plan || 'Plan'})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="font-semibold text-slate-700 block mb-1">Platform Role & Access Scope *</label>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value as UserRole)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg font-semibold focus:ring-2 focus:ring-blue-500 focus:outline-none"
            >
              <option value="company_admin">Company Admin (Manage Company, Settings & Ledger)</option>
              <option value="accountant">Accountant (Issue Cheques, Record Payments, Export)</option>
              <option value="viewer">Viewer (Read-Only Cheque Logs & Timelines)</option>
              <option value="super_admin">Super Admin / Developer (Platform-Wide Master Access)</option>
            </select>
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
              type="submit"
              disabled={isSubmitting}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold transition disabled:opacity-50 shadow-xs"
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span>{isSubmitting ? 'Provisioning...' : 'Provision Account'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
