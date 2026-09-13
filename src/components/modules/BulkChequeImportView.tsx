import React, { useState } from 'react';
import { FileSpreadsheet, Upload, CheckCircle2, AlertCircle, RefreshCw, FileText } from 'lucide-react';
import { Party, Bank, CreateChequeInput } from '../../types';

interface BulkChequeImportViewProps {
  parties: Party[];
  banks: Bank[];
  companyId: string;
  companyName: string;
  onImportCheques: (cheques: CreateChequeInput[]) => Promise<void>;
}

export const BulkChequeImportView: React.FC<BulkChequeImportViewProps> = ({
  parties,
  banks,
  companyId,
  companyName,
  onImportCheques,
}) => {
  const [csvText, setCsvText] = useState(
    `009841, 125000, 2081-01-10, 2081-02-10, Everest Suppliers, Nabil Bank, Batch Payment #1\n009842, 45000, 2081-01-12, 2081-02-15, Himalayan Traders, Global IME, Software Renewal`
  );
  const [isImporting, setIsImporting] = useState(false);
  const [importResult, setImportResult] = useState<string | null>(null);

  const handleProcessImport = async () => {
    try {
      setIsImporting(true);
      const lines = csvText.trim().split('\n');
      const prepared: CreateChequeInput[] = [];

      for (const line of lines) {
        const parts = line.split(',').map((p) => p.trim());
        if (parts.length >= 4) {
          const cheque_number = parts[0];
          const amount = parseFloat(parts[1]) || 10000;
          const issue_date_bs = parts[2] || '2081-01-01';
          const due_date_bs = parts[3] || '2081-02-01';
          const partyName = parts[4] || '';
          const bankName = parts[5] || '';
          const notes = parts[6] || 'Imported via Bulk Wizard';

          const party = parties.find((p) => p.name.toLowerCase().includes(partyName.toLowerCase())) || parties[0];
          const bank = banks.find((b) => b.name.toLowerCase().includes(bankName.toLowerCase())) || banks[0];

          prepared.push({
            company_id: companyId,
            cheque_number,
            amount,
            issue_date_bs,
            issue_date_ad: '2024-04-15',
            due_date_bs,
            due_date_ad: '2024-05-15',
            party_id: party?.id || null,
            bank_id: bank?.id || null,
            status: 'Pending',
            notes,
          });
        }
      }

      await onImportCheques(prepared);
      setImportResult(`Successfully imported ${prepared.length} cheques into ${companyName}!`);
    } catch (err: any) {
      setImportResult(`Import failed: ${err?.message || 'Check CSV format'}`);
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto p-4 sm:p-6 animate-in fade-in duration-150">
      <div className="bg-gradient-to-r from-emerald-950 via-slate-900 to-slate-900 text-white p-6 rounded-2xl border border-emerald-800/40 shadow-md">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center shadow-xs">
            <FileSpreadsheet className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight">Bulk Cheque Import Wizard</h1>
            <p className="text-xs text-slate-300 mt-1">
              Mass ingestion pipeline for importing hundreds of cheque records directly from Tally, Busy, or CSV files.
            </p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <label className="font-bold text-slate-800 text-xs">
            CSV / Raw Cheque Data (ChequeNo, Amount, IssueDateBS, DueDateBS, PartyName, BankName, Notes):
          </label>
          <span className="text-[11px] text-slate-400 font-mono">Format: CSV comma-separated</span>
        </div>

        <textarea
          rows={6}
          value={csvText}
          onChange={(e) => setCsvText(e.target.value)}
          className="w-full p-3 font-mono text-xs bg-slate-50 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500"
        />

        {importResult && (
          <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{importResult}</span>
          </div>
        )}

        <div className="flex justify-end gap-3 pt-2">
          <button
            onClick={handleProcessImport}
            disabled={isImporting || !csvText.trim()}
            className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition flex items-center gap-2 shadow-xs"
          >
            {isImporting ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
            <span>{isImporting ? 'Processing Import...' : 'Import Batch into System'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
