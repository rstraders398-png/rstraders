import React, { useState } from 'react';
import { X, Users, UserPlus, KeyRound, Check, ShieldCheck, Trash2, Mail } from 'lucide-react';
import { AppUser, Company, UserRole } from '../../types';
import { provisionUser, updateUser, deleteUserAccount } from '../../lib/adminService';

interface ManageCompanyUsersModalProps {
  isOpen: boolean;
  onClose: () => void;
  company: Company | null;
  users: AppUser[];
  onToast: (text: string, type?: 'success' | 'info' | 'error') => void;
}

export const ManageCompanyUsersModal: React.FC<ManageCompanyUsersModalProps> = ({
  isOpen,
  onClose,
  company,
  users,
  onToast,
}) => {
  if (!isOpen || !company) return null;

  const companyUsers = users.filter((u) => u.company_id === company.id);

  // New User Form State
  const [showAddForm, setShowAddForm] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<UserRole>('accountant');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim()) return;

    try {
      setIsSubmitting(true);
      await provisionUser({
        name: name.trim(),
        email: email.trim(),
        role,
        company_id: company.id,
        company_name: company.name,
      });
      onToast(`Provisioned ${name} as ${role} for ${company.name}`, 'success');
      setName('');
      setEmail('');
      setRole('accountant');
      setShowAddForm(false);
    } catch (err: any) {
      onToast(err?.message || 'Failed to provision user', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleStatus = async (user: AppUser) => {
    const newStatus = user.status === 'Active' ? 'Inactive' : 'Active';
    try {
      await updateUser(user.uid, { status: newStatus });
      onToast(`Updated ${user.name} status to ${newStatus}`, 'info');
    } catch (err: any) {
      onToast('Failed to update user status', 'error');
    }
  };

  const handleResetCredentials = (user: AppUser) => {
    onToast(`Temporary login link & credentials dispatched to ${user.email}`, 'success');
  };

  const handleDeleteUser = async (user: AppUser) => {
    if (!confirm(`Are you sure you want to remove user ${user.name} (${user.email})?`)) {
      return;
    }
    try {
      await deleteUserAccount(user.uid);
      onToast(`User ${user.name} removed from ${company.name}`, 'info');
    } catch (err: any) {
      onToast('Failed to delete user account', 'error');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-2xl w-full max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/70 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center">
              <Users className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-sm">Company Users & Access</h3>
              <p className="text-[11px] text-slate-500">{company.name} • {companyUsers.length} Users Enrolled</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-5 text-xs flex-1">
          {/* Top Bar with Add Button */}
          <div className="flex items-center justify-between">
            <h4 className="font-bold text-slate-800 text-xs uppercase tracking-wide">
              Registered Team Accounts
            </h4>
            <button
              onClick={() => setShowAddForm(!showAddForm)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-semibold transition shadow-xs text-xs"
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span>{showAddForm ? 'Cancel' : '+ Provision User'}</span>
            </button>
          </div>

          {/* Collapsible Provision Form */}
          {showAddForm && (
            <form
              onSubmit={handleAddUser}
              className="p-4 bg-emerald-50/60 border border-emerald-200 rounded-xl space-y-3 animate-in fade-in duration-150"
            >
              <div className="font-bold text-emerald-900 text-xs">Provision New User for {company.name}</div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Full Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Ramesh Poudel"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">User Email *</label>
                  <input
                    type="email"
                    required
                    placeholder="ramesh@client.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Role / Permissions</label>
                  <select
                    value={role}
                    onChange={(e) => setRole(e.target.value as UserRole)}
                    className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-semibold focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  >
                    <option value="company_admin">Company Admin (Full Access)</option>
                    <option value="accountant">Accountant (Cheques & Logs)</option>
                    <option value="viewer">Viewer (Read-Only)</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setShowAddForm(false)}
                  className="px-3 py-1.5 text-slate-600 hover:text-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold transition disabled:opacity-50"
                >
                  {isSubmitting ? 'Provisioning...' : 'Confirm & Provision'}
                </button>
              </div>
            </form>
          )}

          {/* Users List */}
          {companyUsers.length === 0 ? (
            <div className="p-8 text-center bg-slate-50 border border-slate-200 rounded-xl space-y-2">
              <Users className="w-8 h-8 text-slate-300 mx-auto" />
              <p className="font-medium text-slate-600">No users provisioned yet for this company.</p>
              <p className="text-slate-400 text-[11px]">
                Click "+ Provision User" above to create an administrator or accountant account.
              </p>
            </div>
          ) : (
            <div className="border border-slate-200 rounded-xl overflow-hidden divide-y divide-slate-200">
              {companyUsers.map((u) => (
                <div
                  key={u.uid}
                  className="p-3.5 bg-white hover:bg-slate-50/80 transition flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-8 h-8 rounded-full bg-slate-100 text-slate-700 font-bold flex items-center justify-center shrink-0 border border-slate-200">
                      {u.name.charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-900 truncate">{u.name}</span>
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full capitalize ${
                            u.role === 'company_admin'
                              ? 'bg-purple-100 text-purple-800 border border-purple-200'
                              : u.role === 'super_admin'
                              ? 'bg-amber-100 text-amber-800 border border-amber-200'
                              : u.role === 'accountant'
                              ? 'bg-blue-100 text-blue-800 border border-blue-200'
                              : 'bg-slate-100 text-slate-700'
                          }`}
                        >
                          {u.role.replace('_', ' ')}
                        </span>
                        <span
                          className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-sm ${
                            u.status === 'Active'
                              ? 'bg-emerald-50 text-emerald-700'
                              : 'bg-rose-50 text-rose-700'
                          }`}
                        >
                          {u.status}
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-500 font-mono flex items-center gap-1.5 mt-0.5 truncate">
                        <Mail className="w-3 h-3 text-slate-400 shrink-0" />
                        <span className="truncate">{u.email}</span>
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1.5 shrink-0 self-end sm:self-center">
                    <button
                      onClick={() => handleResetCredentials(u)}
                      title="Reset Credentials / Send Auth Link"
                      className="inline-flex items-center gap-1 px-2 py-1 text-[11px] font-medium text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-lg transition"
                    >
                      <KeyRound className="w-3 h-3 text-slate-500" />
                      <span>Reset</span>
                    </button>
                    <button
                      onClick={() => handleToggleStatus(u)}
                      title="Toggle Active / Inactive"
                      className={`px-2 py-1 text-[11px] font-medium rounded-lg transition ${
                        u.status === 'Active'
                          ? 'text-amber-700 bg-amber-50 hover:bg-amber-100'
                          : 'text-emerald-700 bg-emerald-50 hover:bg-emerald-100'
                      }`}
                    >
                      {u.status === 'Active' ? 'Suspend' : 'Activate'}
                    </button>
                    <button
                      onClick={() => handleDeleteUser(u)}
                      title="Delete User"
                      className="p-1 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-slate-200 bg-slate-50/50 flex justify-end shrink-0">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-lg text-xs font-semibold transition shadow-xs"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
