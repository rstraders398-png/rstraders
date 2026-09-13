import React, { useState, useMemo, useRef } from 'react';
import {
  Users,
  Plus,
  Phone,
  Trash2,
  Edit2,
  Search,
  DollarSign,
  Receipt,
  Eye,
  Download,
  Upload,
  FileSpreadsheet,
  CheckCircle2,
  Clock,
  ChevronDown,
  ChevronUp,
  X,
} from 'lucide-react';
import { Cheque, Party } from '../types';
import { addParty, updateParty, deleteParty, getCurrentUserCompanyId } from '../lib/chequeService';
import { formatCurrency, getCurrentBsDate } from '../lib/dateUtils';
import { exportTableToPDF, exportTableToExcel } from '../lib/exportUtils';
import { FileText } from 'lucide-react';

interface PartiesViewProps {
  parties: Party[];
  cheques: Cheque[];
  companyId: string;
  companyName?: string;
  onRecordPayment: (cheque: Cheque) => void;
  onViewDetails: (cheque: Cheque) => void;
}

export const PartiesView: React.FC<PartiesViewProps> = ({
  parties,
  cheques,
  companyId,
  companyName = "rstraders's Company",
  onRecordPayment,
  onViewDetails,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [editingPartyId, setEditingPartyId] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedPartyId, setSelectedPartyId] = useState<string | null>(null);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [importText, setImportText] = useState('');
  const [importSuccess, setImportSuccess] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const partyStats = (partyId: string) => {
    const partyCheques = cheques.filter((c) => c.party_id === partyId);
    const count = partyCheques.length;
    const totalAmount = partyCheques.reduce((s, c) => s + c.amount, 0);
    const balance = partyCheques.reduce((sum, c) => sum + (c.remaining_amount ?? c.amount ?? 0), 0);
    const pendingCount = partyCheques.filter((c) => c.status !== 'Cleared').length;
    const clearedCount = partyCheques.filter((c) => c.status === 'Cleared').length;
    return { count, totalAmount, balance, pendingCount, clearedCount };
  };

  const filteredParties = useMemo(() => {
    const q = searchTerm.toLowerCase().trim();
    if (!q) return parties;
    return parties.filter(
      (p) => p.name.toLowerCase().includes(q) || (p.phone && p.phone.toLowerCase().includes(q))
    );
  }, [parties, searchTerm]);

  const handleStartEdit = (p: Party) => {
    setEditingPartyId(p.id);
    setName(p.name);
    setPhone(p.phone || '');
    setError(null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
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
    setIsSaving(true);
    setError(null);
    try {
      if (editingPartyId) {
        await updateParty(editingPartyId, name, phone);
        setEditingPartyId(null);
      } else {
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
      setError(err?.message || 'Failed to save party');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (party: Party) => {
    const { count } = partyStats(party.id);
    if (count > 0) {
      alert(`Cannot delete ${party.name} because they have ${count} linked cheques in the system.`);
      return;
    }
    if (!confirm(`Are you sure you want to delete ${party.name}?`)) {
      return;
    }
    try {
      await deleteParty(party.id);
      if (selectedPartyId === party.id) setSelectedPartyId(null);
    } catch (err: any) {
      alert(err?.message || 'Failed to delete party');
    }
  };

  // Unified Parties Excel (.xlsx) Export
  const handleExportExcel = () => {
    const headers = [
      'Party Name',
      'Phone Number',
      'Total Cheques',
      'Pending Cheques',
      'Cleared Cheques',
      'Total Volume (NPR)',
      'Outstanding Balance (NPR)',
    ];

    let grandTotalVolume = 0;
    let grandOutstandingBalance = 0;

    const rows = filteredParties.map((p) => {
      const stats = partyStats(p.id);
      grandTotalVolume += stats.totalAmount;
      grandOutstandingBalance += stats.balance;
      return [
        p.name,
        p.phone || '—',
        stats.count,
        stats.pendingCount,
        stats.clearedCount,
        stats.totalAmount,
        stats.balance,
      ];
    });

    exportTableToExcel({
      fileName: `${companyName.replace(/[^a-zA-Z0-9]/g, '_')}_Parties_Directory_${getCurrentBsDate()}`,
      companyName,
      reportTitle: 'Parties & Vendors Directory Ledger',
      dateRange: 'Full Directory Statement',
      summaryMetrics: [
        { label: 'Total Registered Parties', value: filteredParties.length },
        { label: 'Total Portfolio Volume', value: `रू ${formatCurrency(grandTotalVolume)}` },
        { label: 'Total Outstanding Balance', value: `रू ${formatCurrency(grandOutstandingBalance)}` },
      ],
      headers,
      rows,
      footers: [
        'GRAND TOTALS',
        `${filteredParties.length} Parties`,
        '',
        '',
        '',
        grandTotalVolume,
        grandOutstandingBalance,
      ],
    });
  };

  // Unified Parties PDF (.pdf) Export
  const handleExportPDF = () => {
    const headers = [
      'Party Name',
      'Phone Number',
      'Total Cheques',
      'Pending',
      'Cleared',
      'Total Volume',
      'Balance Due',
    ];

    let grandTotalVolume = 0;
    let grandOutstandingBalance = 0;

    const rows = filteredParties.map((p) => {
      const stats = partyStats(p.id);
      grandTotalVolume += stats.totalAmount;
      grandOutstandingBalance += stats.balance;
      return [
        p.name,
        p.phone || '—',
        stats.count,
        stats.pendingCount,
        stats.clearedCount,
        `रू ${formatCurrency(stats.totalAmount)}`,
        `रू ${formatCurrency(stats.balance)}`,
      ];
    });

    exportTableToPDF({
      fileName: `${companyName.replace(/[^a-zA-Z0-9]/g, '_')}_Parties_Directory_${getCurrentBsDate()}`,
      companyName,
      reportTitle: 'Parties & Vendors Directory Ledger',
      dateRange: 'Full Directory Statement',
      summaryMetrics: [
        { label: 'Total Registered Parties', value: filteredParties.length },
        { label: 'Total Portfolio Volume', value: `रू ${formatCurrency(grandTotalVolume)}` },
        { label: 'Total Outstanding Balance', value: `रू ${formatCurrency(grandOutstandingBalance)}` },
      ],
      headers,
      rows,
      footers: [
        'GRAND TOTALS',
        `${filteredParties.length} Parties`,
        '',
        '',
        '',
        `रू ${formatCurrency(grandTotalVolume)}`,
        `रू ${formatCurrency(grandOutstandingBalance)}`,
      ],
    });
  };

  // Handle CSV file upload or text import
  const handleProcessImport = async (csvText: string) => {
    const lines = csvText.split(/\r?\n/).filter((l) => l.trim().length > 0);
    if (lines.length === 0) return;

    let successCount = 0;
    const targetCompanyId = companyId || getCurrentUserCompanyId();

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      // Skip header if present
      if (i === 0 && (line.toLowerCase().includes('party') || line.toLowerCase().includes('name'))) {
        continue;
      }
      const parts = line.split(',').map((p) => p.trim().replace(/^"|"$/g, ''));
      const partyName = parts[0];
      const partyPhone = parts[1] || '';

      if (partyName) {
        try {
          await addParty({
            name: partyName,
            phone: partyPhone,
            company_id: targetCompanyId,
          });
          successCount++;
        } catch {
          // continue on conflict
        }
      }
    }

    setImportSuccess(`Successfully imported ${successCount} parties.`);
    setTimeout(() => {
      setIsImportModalOpen(false);
      setImportText('');
      setImportSuccess(null);
    }, 1500);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      if (text) handleProcessImport(text);
    };
    reader.readAsText(file);
  };

  const activePartyCheques = selectedPartyId
    ? cheques.filter((c) => c.party_id === selectedPartyId)
    : [];

  const selectedParty = parties.find((p) => p.id === selectedPartyId);

  return (
    <div className="space-y-6">
      {/* Header Banner & Summary */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-slate-900 tracking-tight">
                  Parties & Clients Ledger
                </h2>
                {/* Count badge matching user request */}
                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-200 font-mono">
                  {parties.length} Parties Registered
                </span>
              </div>
              <p className="text-xs text-slate-500">
                Directory of vendors, clients, and payees with individual volume and pending balance tracking.
              </p>
            </div>
          </div>
        </div>

        {/* Action Buttons: Import / Export */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setIsImportModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-xl transition shadow-2xs cursor-pointer"
            title="Import parties from CSV"
          >
            <Upload className="w-3.5 h-3.5 text-blue-600" />
            <span>Import CSV</span>
          </button>

          <button
            onClick={handleExportExcel}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 rounded-xl transition shadow-2xs cursor-pointer"
            title="Export parties directory to Excel (.xlsx)"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-700" />
            <span>Export Excel</span>
          </button>

          <button
            onClick={handleExportPDF}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold bg-rose-50 hover:bg-rose-100 text-rose-800 border border-rose-300 rounded-xl transition shadow-2xs cursor-pointer"
            title="Export parties directory to PDF (.pdf)"
          >
            <FileText className="w-4 h-4 text-rose-700" />
            <span>Export PDF</span>
          </button>
        </div>
      </div>

      {/* Add / Quick Edit Form */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-2xs">
        <h3 className="font-bold text-xs text-slate-900 mb-2 flex items-center gap-1.5">
          <Plus className="w-4 h-4 text-emerald-600" />
          <span>{editingPartyId ? 'Edit Party Details' : 'Quick Register New Party'}</span>
        </h3>

        {error && (
          <div className="mb-3 p-2.5 bg-rose-50 border border-rose-200 rounded-lg text-xs text-rose-700">
            {error}
          </div>
        )}

        <form onSubmit={handleSave} className="flex flex-col sm:flex-row items-center gap-3">
          <div className="flex-1 w-full">
            <input
              type="text"
              placeholder="Party / Vendor Name (e.g. Nepal Trading Co.)"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full text-xs px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
            />
          </div>
          <div className="w-full sm:w-60">
            <input
              type="tel"
              placeholder="Phone (optional)"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="w-full text-xs px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
            />
          </div>
          <div className="flex items-center gap-2 w-full sm:w-auto shrink-0">
            {editingPartyId && (
              <button
                type="button"
                onClick={handleCancelEdit}
                className="px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition"
              >
                Cancel
              </button>
            )}
            <button
              type="submit"
              disabled={isSaving}
              className="w-full sm:w-auto px-4 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl transition shadow-xs disabled:opacity-50"
            >
              {isSaving ? 'Saving...' : editingPartyId ? 'Update Party' : 'Add Party'}
            </button>
          </div>
        </form>
      </div>

      {/* Search Filter Bar */}
      <div className="bg-white rounded-xl border border-slate-200/80 p-3.5 shadow-2xs flex items-center justify-between gap-3">
        <div className="relative flex-1 sm:max-w-xs">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search party name or phone number..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500"
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-slate-600"
            >
              ×
            </button>
          )}
        </div>

        <div className="text-xs text-slate-500 font-mono">
          Showing <strong className="text-slate-800">{filteredParties.length}</strong> parties
        </div>
      </div>

      {/* Full Table Listing Matching User Request */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50/80 border-b border-slate-200 text-slate-600 uppercase font-semibold text-[10px] tracking-wider">
              <tr>
                <th className="py-3 px-4">Party / Vendor Name</th>
                <th className="py-3 px-4">Contact Phone</th>
                <th className="py-3 px-4 text-center">Cheques Count Badge</th>
                <th className="py-3 px-4 text-right">Total Cheque Volume</th>
                <th className="py-3 px-4 text-right">Outstanding Balance</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredParties.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400">
                    <p className="text-sm font-medium">No parties found</p>
                    <p className="text-xs text-slate-400 mt-1">
                      Register a party above or import from CSV.
                    </p>
                  </td>
                </tr>
              ) : (
                filteredParties.map((party) => {
                  const stats = partyStats(party.id);
                  const isSelected = selectedPartyId === party.id;

                  return (
                    <React.Fragment key={party.id}>
                      <tr
                        className={`hover:bg-slate-50/80 transition-colors ${
                          isSelected ? 'bg-emerald-50/40' : ''
                        }`}
                      >
                        {/* Party Name */}
                        <td className="py-3.5 px-4">
                          <button
                            type="button"
                            onClick={() =>
                              setSelectedPartyId(isSelected ? null : party.id)
                            }
                            className="text-left font-bold text-slate-900 text-sm hover:text-emerald-700 transition flex items-center gap-1.5"
                          >
                            <span>{party.name}</span>
                            {isSelected ? (
                              <ChevronUp className="w-3.5 h-3.5 text-emerald-600" />
                            ) : (
                              <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
                            )}
                          </button>
                        </td>

                        {/* Phone */}
                        <td className="py-3.5 px-4 font-mono text-slate-600">
                          {party.phone ? (
                            <span className="flex items-center gap-1">
                              <Phone className="w-3 h-3 text-slate-400" />
                              {party.phone}
                            </span>
                          ) : (
                            <span className="text-slate-300 italic">—</span>
                          )}
                        </td>

                        {/* Count Badges */}
                        <td className="py-3.5 px-4 text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold bg-slate-100 text-slate-700 border border-slate-200 font-mono">
                              {stats.count} Cheques
                            </span>
                            {stats.pendingCount > 0 && (
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200 font-mono">
                                {stats.pendingCount} Pending
                              </span>
                            )}
                            {stats.clearedCount > 0 && (
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200 font-mono">
                                {stats.clearedCount} Cleared
                              </span>
                            )}
                          </div>
                        </td>

                        {/* Total Cheque Volume */}
                        <td className="py-3.5 px-4 text-right font-mono font-medium text-slate-800">
                          रू {formatCurrency(stats.totalAmount)}
                        </td>

                        {/* Outstanding Balance */}
                        <td className="py-3.5 px-4 text-right font-mono">
                          <span
                            className={`font-bold text-sm ${
                              stats.balance > 0 ? 'text-amber-700' : 'text-emerald-700'
                            }`}
                          >
                            रू {formatCurrency(stats.balance)}
                          </span>
                        </td>

                        {/* Actions */}
                        <td className="py-3.5 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() =>
                                setSelectedPartyId(isSelected ? null : party.id)
                              }
                              className="px-2.5 py-1 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition"
                              title="View cheques"
                            >
                              {isSelected ? 'Hide' : 'Cheques'}
                            </button>

                            <button
                              onClick={() => handleStartEdit(party)}
                              className="p-1.5 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition"
                              title="Edit party"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>

                            <button
                              onClick={() => handleDelete(party)}
                              disabled={stats.count > 0}
                              className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-slate-400"
                              title={
                                stats.count > 0
                                  ? 'Cannot delete party with existing cheques'
                                  : 'Delete party'
                              }
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>

                      {/* Expandable Sub-Ledger for Party Cheques with "+ Pay" button */}
                      {isSelected && (
                        <tr>
                          <td colSpan={6} className="bg-slate-50/70 p-4 border-b border-slate-200">
                            <div className="space-y-3">
                              <div className="flex items-center justify-between">
                                <h4 className="font-bold text-xs text-slate-800 flex items-center gap-1.5">
                                  <Receipt className="w-4 h-4 text-emerald-600" />
                                  <span>Cheques Ledger for {party.name}</span>
                                </h4>
                                <span className="text-xs text-slate-500 font-mono">
                                  Outstanding Due: <strong className="text-amber-800">रू {formatCurrency(stats.balance)}</strong>
                                </span>
                              </div>

                              {activePartyCheques.length === 0 ? (
                                <p className="text-xs text-slate-400 italic py-2">
                                  No cheques recorded for this party yet.
                                </p>
                              ) : (
                                <div className="border border-slate-200 rounded-xl overflow-hidden bg-white shadow-2xs">
                                  <table className="w-full text-xs">
                                    <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 text-[10px] uppercase font-semibold">
                                      <tr>
                                        <th className="p-2.5 text-left">Cheque #</th>
                                        <th className="p-2.5 text-left">Bill #</th>
                                        <th className="p-2.5 text-left">Due Date (BS)</th>
                                        <th className="p-2.5 text-right">Face Amount</th>
                                        <th className="p-2.5 text-right">Balance Due</th>
                                        <th className="p-2.5 text-center">Status</th>
                                        <th className="p-2.5 text-right">Action</th>
                                      </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                      {activePartyCheques.map((chq) => (
                                        <tr key={chq.id} className="hover:bg-slate-50/80">
                                          <td className="p-2.5 font-mono font-bold text-slate-900">
                                            #{chq.cheque_number}
                                          </td>
                                          <td className="p-2.5 text-slate-500 font-mono">
                                            {chq.bill_number || '—'}
                                          </td>
                                          <td className="p-2.5 font-mono text-slate-700">
                                            {chq.due_date_bs || '—'}
                                          </td>
                                          <td className="p-2.5 text-right font-mono text-slate-600">
                                            रू {formatCurrency(chq.amount)}
                                          </td>
                                          <td className="p-2.5 text-right font-mono font-bold text-amber-800">
                                            रू {formatCurrency(chq.remaining_amount)}
                                          </td>
                                          <td className="p-2.5 text-center">
                                            <span
                                              className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                                                chq.status === 'Cleared'
                                                  ? 'bg-emerald-100 text-emerald-800'
                                                  : chq.status === 'Partially Paid'
                                                  ? 'bg-blue-100 text-blue-800'
                                                  : 'bg-amber-100 text-amber-800'
                                              }`}
                                            >
                                              {chq.status}
                                            </span>
                                          </td>
                                          <td className="p-2.5 text-right">
                                            <div className="flex items-center justify-end gap-1.5">
                                              {chq.status !== 'Cleared' && (
                                                <button
                                                  onClick={() => onRecordPayment(chq)}
                                                  className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-md transition"
                                                >
                                                  <Plus className="w-3 h-3" />
                                                  <span>+ Pay</span>
                                                </button>
                                              )}
                                              <button
                                                onClick={() => onViewDetails(chq)}
                                                className="p-1 text-slate-500 hover:text-slate-800 rounded-md"
                                                title="View details"
                                              >
                                                <Eye className="w-3.5 h-3.5" />
                                              </button>
                                            </div>
                                          </td>
                                        </tr>
                                      ))}
                                    </tbody>
                                  </table>
                                </div>
                              )}
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* CSV Import Modal */}
      {isImportModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4 border border-slate-200">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Upload className="w-5 h-5 text-emerald-600" />
                <span>Import Parties from CSV</span>
              </h3>
              <button
                onClick={() => setIsImportModalOpen(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-500">
              Upload a CSV file or paste party records. Format: <code>Party Name, Phone Number</code> per line.
            </p>

            {importSuccess && (
              <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs font-medium">
                {importSuccess}
              </div>
            )}

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Upload CSV File:
                </label>
                <input
                  type="file"
                  ref={fileInputRef}
                  accept=".csv,.txt"
                  onChange={handleFileUpload}
                  className="w-full text-xs text-slate-500 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-emerald-50 file:text-emerald-700 hover:file:bg-emerald-100 cursor-pointer"
                />
              </div>

              <div className="text-center text-xs text-slate-400 font-semibold uppercase tracking-wider">
                — OR PASTE TEXT —
              </div>

              <div>
                <textarea
                  rows={4}
                  placeholder={`Nepal Traders, 9841234567\nEverest Suppliers, 9801122334\nHimalaya Cement, 014234567`}
                  value={importText}
                  onChange={(e) => setImportText(e.target.value)}
                  className="w-full p-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-emerald-500 font-mono"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsImportModalOpen(false)}
                  className="px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => handleProcessImport(importText)}
                  disabled={!importText.trim()}
                  className="px-4 py-1.5 text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg disabled:opacity-50"
                >
                  Import Pasted Rows
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
