import React, { useState, useEffect } from 'react';
import { X, Users, Plus, Phone, Trash2, Edit2, Search, Building, ShieldCheck, LogIn } from 'lucide-react';
import { Cheque, Party } from '../types';
import { addParty, updateParty, deleteParty, getCurrentUserCompanyId } from '../lib/chequeService';
import { formatCurrency } from '../lib/dateUtils';
import { auth, signInWithGoogle } from '../lib/firebase';
import { User } from 'firebase/auth';

interface PartiesModalProps {
  isOpen: boolean;
  onClose: () => void;
  parties: Party[];
  cheques: Cheque[];
  companyId: string;
}

export const PartiesModal: React.FC<PartiesModalProps> = ({
  isOpen,
  onClose,
  parties,
  cheques,
  companyId,
}) => {
  if (!isOpen) return null;

  const [searchTerm, setSearchTerm] = useState('');
  const [editingPartyId, setEditingPartyId] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentUser, setCurrentUser] = useState<User | null>(auth.currentUser);

  useEffect(() => {
    const unsub = auth.onAuthStateChanged((user) => {
      setCurrentUser(user);
    });
    return () => unsub();
  }, []);

  // Stats per party
  const partyStats = (partyId: string) => {
    const partyCheques = cheques.filter((c) => c.party_id === partyId);
    const count = partyCheques.length;
    const balance = partyCheques.reduce((sum, c) => sum + (c.remaining_amount ?? c.amount ?? 0), 0);
    return { count, balance };
  };

  const handleStartEdit = (p: Party) => {
    setEditingPartyId(p.id);
    setName(p.name);
    setPhone(p.phone || '');
    setError(null);
  };

  const handleCancelEdit = () => {
    setEditingPartyId(null);
    setName('');
    setPhone('');
    setError(null);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Party name is required.');
      return;
    }
    try {
      setIsSaving(true);
      setError(null);
      if (editingPartyId) {
        await updateParty(editingPartyId, name, phone);
        setEditingPartyId(null);
      } else {
        // Explicitly attach current user's company_id
        const targetCompanyId = companyId || getCurrentUserCompanyId();
        await addParty({
          name: name.trim(),
          phone: phone.trim(),
          company_id: targetCompanyId,
        });
      }
      setName('');
      setPhone('');
    } catch (err: any) {
      console.error('Error saving party:', err);
      if (err?.code === 'permission-denied' || err?.message?.includes('Missing or insufficient permissions')) {
        setError('Missing or insufficient permissions. Please sign in to verify authentication.');
      } else {
        setError(err?.message || 'Failed to save party');
      }
    } finally {
      setIsSaving(false);
    }
  };

  const handleGoogleSignIn = async () => {
    try {
      setError(null);
      await signInWithGoogle();
    } catch (err: any) {
      setError(err?.message || 'Sign in failed');
    }
  };

  const handleDelete = async (party: Party) => {
    const { count } = partyStats(party.id);
    if (count > 0) {
      if (!confirm(`This party is associated with ${count} cheques. Deleting will set their party references to null. Proceed?`)) {
        return;
      }
    } else {
      if (!confirm(`Delete party "${party.name}"?`)) return;
    }
    try {
      await deleteParty(party.id);
    } catch (err: any) {
      alert(err?.message || 'Failed to delete party');
    }
  };

  const filteredParties = parties.filter((p) =>
    p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (p.phone && p.phone.includes(searchTerm))
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
      <div
        id="modal-parties-manager"
        className="bg-white rounded-2xl max-w-xl w-full shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]"
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-indigo-50 border border-indigo-200 flex items-center justify-center text-indigo-700">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">Manage Parties / Vendors</h2>
              <p className="text-xs text-slate-500">public.parties table registry</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 rounded-lg transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Add/Edit Party Form */}
        <div className="p-4 bg-indigo-50/40 border-b border-indigo-100">
          <form onSubmit={handleSave} className="space-y-3">
            <div className="text-xs font-bold text-slate-800 uppercase tracking-wide">
              {editingPartyId ? 'Edit Party' : 'Add New Party / Vendor'}
            </div>

            {error && (
              <div className="p-2.5 bg-rose-50 border border-rose-200 rounded-lg text-xs text-rose-700 flex items-center justify-between gap-2">
                <span>{error}</span>
                <button
                  type="button"
                  onClick={handleGoogleSignIn}
                  className="inline-flex items-center gap-1 px-2.5 py-1 bg-rose-600 hover:bg-rose-700 text-white font-medium rounded text-[11px] shrink-0 transition shadow-xs"
                >
                  <LogIn className="w-3.5 h-3.5" /> Sign In
                </button>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <input
                id="input-party-name"
                type="text"
                placeholder="Party Name (e.g. Everest Trading)"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-3 py-1.5 text-xs bg-white border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                required
              />
              <input
                id="input-party-phone"
                type="text"
                placeholder="Phone / Mobile (e.g. 9841234567)"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full px-3 py-1.5 text-xs bg-white border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div className="flex items-center justify-end gap-2">
              {editingPartyId && (
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
                id="btn-save-party"
                className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-md transition shadow-2xs"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>{isSaving ? 'Saving...' : editingPartyId ? 'Update Party' : 'Add Party'}</span>
              </button>
            </div>
          </form>
        </div>

        {/* Search & Parties List */}
        <div className="p-4 flex-1 overflow-y-auto space-y-3">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              placeholder="Search party by name or phone..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-800 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden">
            {filteredParties.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-400">
                No parties found. Add your first party above.
              </div>
            ) : (
              filteredParties.map((p) => {
                const { count, balance } = partyStats(p.id);
                return (
                  <div
                    key={p.id}
                    id={`party-row-${p.id}`}
                    className="p-3 flex items-center justify-between gap-3 hover:bg-slate-50/70 transition"
                  >
                    <div className="min-w-0">
                      <div className="font-semibold text-xs text-slate-900 truncate">{p.name}</div>
                      <div className="flex items-center gap-2 text-[11px] text-slate-500 mt-0.5">
                        {p.phone ? (
                          <span className="flex items-center gap-1 font-mono">
                            <Phone className="w-2.5 h-2.5 text-slate-400" />
                            {p.phone}
                          </span>
                        ) : (
                          <span className="text-slate-400 italic">No phone</span>
                        )}
                        <span>•</span>
                        <span>{count} cheques</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 shrink-0">
                      <div className="text-right">
                        <div className="text-[10px] text-slate-400 uppercase font-semibold">
                          Balance
                        </div>
                        <div
                          className={`text-xs font-mono font-bold ${
                            balance > 0 ? 'text-amber-700' : 'text-emerald-700'
                          }`}
                        >
                          ₹{formatCurrency(balance)}
                        </div>
                      </div>

                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handleStartEdit(p)}
                          className="p-1 text-slate-400 hover:text-indigo-600 rounded transition"
                          title="Edit party"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDelete(p)}
                          className="p-1 text-slate-400 hover:text-rose-600 rounded transition"
                          title="Delete party"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
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
            Total {parties.length} registered parties
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
