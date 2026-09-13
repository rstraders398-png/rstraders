import React, { useState } from 'react';
import { X, Building2, Plus, Trash2, Edit2, Search } from 'lucide-react';
import { Bank, Cheque } from '../types';
import { addBank, updateBank, deleteBank } from '../lib/chequeService';

interface BanksModalProps {
  isOpen: boolean;
  onClose: () => void;
  banks: Bank[];
  cheques: Cheque[];
  companyId: string;
}

export const BanksModal: React.FC<BanksModalProps> = ({
  isOpen,
  onClose,
  banks,
  cheques,
  companyId,
}) => {
  if (!isOpen) return null;

  const [searchTerm, setSearchTerm] = useState('');
  const [editingBankId, setEditingBankId] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Bank stats
  const bankStats = (bankId: string) => {
    const bankCheques = cheques.filter((c) => c.bank_id === bankId);
    return { count: bankCheques.length };
  };

  const handleStartEdit = (b: Bank) => {
    setEditingBankId(b.id);
    setName(b.name);
    setCode(b.code || '');
    setError(null);
  };

  const handleCancelEdit = () => {
    setEditingBankId(null);
    setName('');
    setCode('');
    setError(null);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Bank name is required.');
      return;
    }
    try {
      setIsSaving(true);
      setError(null);
      if (editingBankId) {
        await updateBank(editingBankId, name, code);
        setEditingBankId(null);
      } else {
        await addBank(companyId, name, code);
      }
      setName('');
      setCode('');
    } catch (err: any) {
      setError(err?.message || 'Failed to save bank');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (bank: Bank) => {
    const { count } = bankStats(bank.id);
    if (count > 0) {
      if (!confirm(`This bank is associated with ${count} cheques. Deleting will set their bank references to null. Proceed?`)) {
        return;
      }
    } else {
      if (!confirm(`Delete bank "${bank.name}"?`)) return;
    }
    try {
      await deleteBank(bank.id);
    } catch (err: any) {
      alert(err?.message || 'Failed to delete bank');
    }
  };

  const filteredBanks = banks.filter((b) =>
    b.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (b.code && b.code.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
      <div
        id="modal-banks-manager"
        className="bg-white rounded-2xl max-w-xl w-full shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]"
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-indigo-50 border border-indigo-200 flex items-center justify-center text-indigo-700">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">Manage Drawee Banks</h2>
              <p className="text-xs text-slate-500">public.banks table registry</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 rounded-lg transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Add/Edit Bank Form */}
        <div className="p-4 bg-indigo-50/40 border-b border-indigo-100">
          <form onSubmit={handleSave} className="space-y-3">
            <div className="text-xs font-bold text-slate-800 uppercase tracking-wide">
              {editingBankId ? 'Edit Bank' : 'Register New Bank'}
            </div>

            {error && (
              <div className="p-2 bg-rose-50 border border-rose-200 rounded text-xs text-rose-700">
                {error}
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <input
                id="input-bank-name"
                type="text"
                placeholder="Bank Name (e.g. Nabil Bank Ltd.)"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-3 py-1.5 text-xs bg-white border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                required
              />
              <input
                id="input-bank-code"
                type="text"
                placeholder="Bank Code (e.g. NABIL, GBIME)"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                className="w-full px-3 py-1.5 text-xs bg-white border border-slate-300 rounded-lg text-slate-900 uppercase font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div className="flex items-center justify-end gap-2">
              {editingBankId && (
                <button
                  type="button"
                  onClick={handleCancelEdit}
                  className="px-3 py-1 text-xs font-semibold text-slate-600 hover:bg-slate-200/60 rounded-md transition"
                >
                  Cancel
                </button>
              )}
              <button
                type="submit"
                disabled={isSaving}
                id="btn-save-bank"
                className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-md transition shadow-2xs"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>{isSaving ? 'Saving...' : editingBankId ? 'Update Bank' : 'Add Bank'}</span>
              </button>
            </div>
          </form>
        </div>

        {/* Search & Banks List */}
        <div className="p-4 flex-1 overflow-y-auto space-y-3">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              placeholder="Search banks by name or code..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-800 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden">
            {filteredBanks.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-400">
                No banks found. Register your first bank above.
              </div>
            ) : (
              filteredBanks.map((b) => {
                const { count } = bankStats(b.id);
                return (
                  <div
                    key={b.id}
                    id={`bank-row-${b.id}`}
                    className="p-3 flex items-center justify-between gap-3 hover:bg-slate-50/70 transition"
                  >
                    <div className="min-w-0">
                      <div className="font-semibold text-xs text-slate-900 truncate">{b.name}</div>
                      <div className="flex items-center gap-2 text-[11px] text-slate-500 mt-0.5">
                        {b.code ? (
                          <span className="font-mono px-1.5 py-0.2 bg-slate-100 text-slate-700 font-semibold rounded text-[10px]">
                            {b.code}
                          </span>
                        ) : (
                          <span className="text-slate-400 italic">No code</span>
                        )}
                        <span>•</span>
                        <span>{count} cheques linked</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleStartEdit(b)}
                        className="p-1 text-slate-400 hover:text-indigo-600 rounded transition"
                        title="Edit bank"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDelete(b)}
                        className="p-1 text-slate-400 hover:text-rose-600 rounded transition"
                        title="Delete bank"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-slate-200 bg-slate-50 flex items-center justify-between">
          <span className="text-xs text-slate-500">
            Total {banks.length} registered banks
          </span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-200/70 rounded-lg transition"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
