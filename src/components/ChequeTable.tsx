import React, { useState, useMemo } from 'react';
import {
  Search,
  Filter,
  Plus,
  ArrowUpDown,
  FileText,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Receipt,
  MoreHorizontal,
  CreditCard,
  Trash2,
  Edit2,
  Eye,
  DollarSign,
  Building2,
  User,
  Phone,
} from 'lucide-react';
import { Bank, Cheque, ChequeStatus, Party } from '../types';
import { formatCurrency, formatBsDateFriendly, getCurrentAdDate } from '../lib/dateUtils';

interface ChequeTableProps {
  cheques: Cheque[];
  parties: Party[];
  banks: Bank[];
  statusFilter: string;
  onStatusFilterChange: (status: string) => void;
  onRecordPayment: (cheque: Cheque) => void;
  onViewDetails: (cheque: Cheque) => void;
  onEditCheque: (cheque: Cheque) => void;
  onDeleteCheque: (id: string) => void;
  onNewCheque: () => void;
}

export const ChequeTable: React.FC<ChequeTableProps> = ({
  cheques,
  parties,
  banks,
  statusFilter,
  onStatusFilterChange,
  onRecordPayment,
  onViewDetails,
  onEditCheque,
  onDeleteCheque,
  onNewCheque,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedBankId, setSelectedBankId] = useState<string>('all');
  const [selectedPartyId, setSelectedPartyId] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'due_date' | 'issue_date' | 'amount' | 'created_at'>('created_at');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  const todayAd = getCurrentAdDate();

  // Maps for fast party/bank lookup
  const partyMap = useMemo(() => {
    const map = new Map<string, Party>();
    parties.forEach((p) => map.set(p.id, p));
    return map;
  }, [parties]);

  const bankMap = useMemo(() => {
    const map = new Map<string, Bank>();
    banks.forEach((b) => map.set(b.id, b));
    return map;
  }, [banks]);

  // Filtering
  const filteredCheques = useMemo(() => {
    return cheques.filter((c) => {
      // Status filter
      if (statusFilter !== 'All' && c.status !== statusFilter) {
        return false;
      }
      // Bank filter
      if (selectedBankId !== 'all' && c.bank_id !== selectedBankId) {
        return false;
      }
      // Party filter
      if (selectedPartyId !== 'all' && c.party_id !== selectedPartyId) {
        return false;
      }
      // Search term
      if (searchTerm.trim()) {
        const query = searchTerm.toLowerCase();
        const partyName = c.party_id ? (partyMap.get(c.party_id)?.name || '').toLowerCase() : '';
        const bankName = c.bank_id ? (bankMap.get(c.bank_id)?.name || '').toLowerCase() : '';
        const chqNum = (c.cheque_number || '').toLowerCase();
        const billNum = (c.bill_number || '').toLowerCase();
        const notes = (c.notes || '').toLowerCase();

        return (
          chqNum.includes(query) ||
          billNum.includes(query) ||
          partyName.includes(query) ||
          bankName.includes(query) ||
          notes.includes(query)
        );
      }
      return true;
    });
  }, [cheques, statusFilter, selectedBankId, selectedPartyId, searchTerm, partyMap, bankMap]);

  // Sorting
  const sortedCheques = useMemo(() => {
    return [...filteredCheques].sort((a, b) => {
      let comparison = 0;
      if (sortBy === 'due_date') {
        comparison = (a.due_date_ad || '').localeCompare(b.due_date_ad || '');
      } else if (sortBy === 'issue_date') {
        comparison = (a.issue_date_ad || '').localeCompare(b.issue_date_ad || '');
      } else if (sortBy === 'amount') {
        comparison = (a.amount || 0) - (b.amount || 0);
      } else {
        comparison = new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
      }
      return sortOrder === 'asc' ? comparison : -comparison;
    });
  }, [filteredCheques, sortBy, sortOrder]);

  const toggleSort = (field: 'due_date' | 'issue_date' | 'amount' | 'created_at') => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('desc');
    }
  };

  const renderStatusBadge = (status: ChequeStatus) => {
    switch (status) {
      case 'Pending':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
            <Clock className="w-3 h-3 text-amber-600" />
            Pending
          </span>
        );
      case 'Partially Paid':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200">
            <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
            Partially Paid
          </span>
        );
      case 'Cleared':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
            Cleared
          </span>
        );
    }
  };

  const getDueDateAlert = (dueDateAd: string, status: ChequeStatus) => {
    if (status === 'Cleared' || !dueDateAd) return null;
    if (dueDateAd < todayAd) {
      return (
        <span className="inline-flex items-center gap-0.5 text-[10px] font-bold text-rose-600 bg-rose-50 px-1.5 py-0.5 rounded border border-rose-200">
          <AlertTriangle className="w-2.5 h-2.5" /> Overdue
        </span>
      );
    }
    if (dueDateAd === todayAd) {
      return (
        <span className="inline-flex items-center gap-0.5 text-[10px] font-bold text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200">
          Due Today
        </span>
      );
    }
    return null;
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden" id="cheque-register-card">
      {/* Controls Bar */}
      <div className="p-4 border-b border-slate-200 space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          {/* Status Filter Tabs */}
          <div className="flex items-center gap-1 overflow-x-auto pb-1 sm:pb-0" id="status-filter-group">
            {['All', 'Pending', 'Partially Paid', 'Cleared'].map((status) => (
              <button
                key={status}
                id={`btn-filter-${status.toLowerCase().replace(/\s+/g, '-')}`}
                onClick={() => onStatusFilterChange(status)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition whitespace-nowrap ${
                  statusFilter === status
                    ? 'bg-indigo-600 text-white shadow-2xs'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                {status}
              </button>
            ))}
          </div>

          {/* Search Input */}
          <div className="relative w-full sm:w-64">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              id="input-search-cheques"
              type="text"
              placeholder="Search cheques, party, bank..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-800 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition"
            />
          </div>
        </div>

        {/* Secondary Filters (Bank & Party Dropdowns) */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-1 text-xs">
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-1 text-slate-500">
              <Filter className="w-3.5 h-3.5 text-slate-400" />
              <span className="font-medium">Filter by:</span>
            </div>

            {/* Bank Filter */}
            <select
              id="select-filter-bank"
              value={selectedBankId}
              onChange={(e) => setSelectedBankId(e.target.value)}
              className="px-2.5 py-1 bg-white border border-slate-200 rounded-md text-slate-700 text-xs focus:ring-1 focus:ring-indigo-500"
            >
              <option value="all">All Banks ({banks.length})</option>
              {banks.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name} {b.code ? `(${b.code})` : ''}
                </option>
              ))}
            </select>

            {/* Party Filter */}
            <select
              id="select-filter-party"
              value={selectedPartyId}
              onChange={(e) => setSelectedPartyId(e.target.value)}
              className="px-2.5 py-1 bg-white border border-slate-200 rounded-md text-slate-700 text-xs focus:ring-1 focus:ring-indigo-500"
            >
              <option value="all">All Parties ({parties.length})</option>
              {parties.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>

            {(selectedBankId !== 'all' || selectedPartyId !== 'all' || searchTerm) && (
              <button
                onClick={() => {
                  setSelectedBankId('all');
                  setSelectedPartyId('all');
                  setSearchTerm('');
                }}
                className="text-xs text-indigo-600 hover:text-indigo-800 font-medium px-2 py-0.5 hover:underline"
              >
                Reset Filters
              </button>
            )}
          </div>

          <div className="text-slate-500 text-xs font-medium">
            Showing <span className="font-bold text-slate-800">{sortedCheques.length}</span> of{' '}
            {cheques.length} cheques
          </div>
        </div>
      </div>

      {/* Table Content */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs text-slate-600">
          <thead className="bg-slate-50/80 text-slate-700 uppercase tracking-wider font-semibold text-[11px] border-b border-slate-200 select-none">
            <tr>
              <th scope="col" className="px-4 py-3">
                Cheque & Bill #
              </th>
              <th scope="col" className="px-4 py-3">
                Party
              </th>
              <th scope="col" className="px-4 py-3">
                Bank
              </th>
              <th
                scope="col"
                className="px-4 py-3 cursor-pointer hover:text-indigo-600"
                onClick={() => toggleSort('issue_date')}
              >
                <div className="flex items-center gap-1">
                  <span>Issue Date</span>
                  <ArrowUpDown className="w-3 h-3 text-slate-400" />
                </div>
              </th>
              <th
                scope="col"
                className="px-4 py-3 cursor-pointer hover:text-indigo-600"
                onClick={() => toggleSort('due_date')}
              >
                <div className="flex items-center gap-1">
                  <span>Due Date</span>
                  <ArrowUpDown className="w-3 h-3 text-slate-400" />
                </div>
              </th>
              <th
                scope="col"
                className="px-4 py-3 cursor-pointer hover:text-indigo-600 text-right"
                onClick={() => toggleSort('amount')}
              >
                <div className="flex items-center justify-end gap-1">
                  <span>Amount & Balance</span>
                  <ArrowUpDown className="w-3 h-3 text-slate-400" />
                </div>
              </th>
              <th scope="col" className="px-4 py-3 text-center">
                Status
              </th>
              <th scope="col" className="px-4 py-3 text-right">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {sortedCheques.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-4 py-12 text-center text-slate-400">
                  <div className="flex flex-col items-center justify-center gap-2">
                    <Receipt className="w-8 h-8 text-slate-300" />
                    <p className="text-sm font-medium text-slate-600">No cheques found</p>
                    <p className="text-xs text-slate-400 max-w-sm">
                      {searchTerm || statusFilter !== 'All'
                        ? 'Try modifying your search or clearing the active filters.'
                        : 'Get started by creating your first cheque or generating sample data.'}
                    </p>
                    {cheques.length === 0 && (
                      <button
                        onClick={onNewCheque}
                        className="mt-2 inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-white bg-indigo-600 rounded-lg shadow-sm hover:bg-indigo-700"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        Issue First Cheque
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ) : (
              sortedCheques.map((cheque) => {
                const party = cheque.party_id ? partyMap.get(cheque.party_id) : null;
                const bank = cheque.bank_id ? bankMap.get(cheque.bank_id) : null;
                const paidAmount = cheque.amount - cheque.remaining_amount;
                const progressPct = Math.min(100, Math.max(0, Math.round((paidAmount / cheque.amount) * 100)));
                const dueAlert = getDueDateAlert(cheque.due_date_ad, cheque.status);

                return (
                  <tr
                    key={cheque.id}
                    id={`cheque-row-${cheque.id}`}
                    className="hover:bg-slate-50/75 transition-colors group"
                  >
                    {/* Cheque & Bill # */}
                    <td className="px-4 py-3 font-mono">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-900">{cheque.cheque_number}</span>
                      </div>
                      {cheque.bill_number && (
                        <div className="text-[11px] text-slate-400 font-sans">
                          Bill: <span className="font-medium text-slate-600 font-mono">{cheque.bill_number}</span>
                        </div>
                      )}
                    </td>

                    {/* Party */}
                    <td className="px-4 py-3">
                      <div className="font-medium text-slate-800 truncate max-w-[170px]" title={party?.name || 'Unassigned'}>
                        {party ? party.name : <span className="text-slate-400 italic">Unassigned</span>}
                      </div>
                      {party?.phone && (
                        <div className="text-[11px] text-slate-400 flex items-center gap-1">
                          <Phone className="w-2.5 h-2.5 text-slate-300" />
                          <span>{party.phone}</span>
                        </div>
                      )}
                    </td>

                    {/* Bank */}
                    <td className="px-4 py-3">
                      <div className="font-medium text-slate-800 truncate max-w-[150px]" title={bank?.name || 'Unassigned'}>
                        {bank ? bank.name : <span className="text-slate-400 italic">Unassigned</span>}
                      </div>
                      {bank?.code && (
                        <span className="inline-block px-1.5 py-0.2 bg-slate-100 text-slate-600 rounded text-[10px] font-mono font-semibold">
                          {bank.code}
                        </span>
                      )}
                    </td>

                    {/* Issue Date */}
                    <td className="px-4 py-3">
                      <div className="font-medium text-slate-800 font-mono">
                        {cheque.issue_date_bs || '—'}{' '}
                        <span className="text-[10px] text-slate-400 font-sans">BS</span>
                      </div>
                      <div className="text-[11px] text-slate-400 font-mono">
                        {cheque.issue_date_ad || '—'} <span className="font-sans">AD</span>
                      </div>
                    </td>

                    {/* Due Date */}
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5">
                        <span className="font-medium text-slate-800 font-mono">
                          {cheque.due_date_bs || '—'} <span className="text-[10px] text-slate-400 font-sans">BS</span>
                        </span>
                        {dueAlert}
                      </div>
                      <div className="text-[11px] text-slate-400 font-mono">
                        {cheque.due_date_ad || '—'} <span className="font-sans">AD</span>
                      </div>
                    </td>

                    {/* Amount & Remaining */}
                    <td className="px-4 py-3 text-right font-mono">
                      <div className="font-bold text-slate-900 text-sm">
                        ₹{formatCurrency(cheque.amount)}
                      </div>
                      <div className="text-[11px] text-slate-500 flex items-center justify-end gap-1">
                        <span>Bal:</span>
                        <span className={`font-semibold ${cheque.remaining_amount > 0 ? 'text-amber-700' : 'text-emerald-600'}`}>
                          ₹{formatCurrency(cheque.remaining_amount)}
                        </span>
                      </div>
                      {cheque.status === 'Partially Paid' && (
                        <div className="w-24 ml-auto mt-1 bg-slate-100 rounded-full h-1.5 overflow-hidden">
                          <div
                            className="bg-blue-600 h-full rounded-full"
                            style={{ width: `${progressPct}%` }}
                            title={`${progressPct}% paid`}
                          />
                        </div>
                      )}
                    </td>

                    {/* Status Badge */}
                    <td className="px-4 py-3 text-center whitespace-nowrap">
                      {renderStatusBadge(cheque.status)}
                    </td>

                    {/* Actions */}
                    <td className="px-4 py-3 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-1">
                        {cheque.status !== 'Cleared' && (
                          <button
                            id={`btn-pay-${cheque.id}`}
                            onClick={() => onRecordPayment(cheque)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-md transition shadow-2xs"
                            title="Record partial or full payment"
                          >
                            <DollarSign className="w-3 h-3" />
                            <span>Pay</span>
                          </button>
                        )}

                        <button
                          id={`btn-view-${cheque.id}`}
                          onClick={() => onViewDetails(cheque)}
                          className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-md transition"
                          title="View cheque details & payment logs"
                        >
                          <Eye className="w-4 h-4" />
                        </button>

                        <button
                          id={`btn-edit-${cheque.id}`}
                          onClick={() => onEditCheque(cheque)}
                          className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-md transition"
                          title="Edit cheque"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>

                        <button
                          id={`btn-delete-${cheque.id}`}
                          onClick={() => onDeleteCheque(cheque.id)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-md transition"
                          title="Delete cheque"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
