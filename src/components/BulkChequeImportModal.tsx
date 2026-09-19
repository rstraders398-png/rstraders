import React, { useState, useRef } from 'react';
import {
  FileSpreadsheet,
  Upload,
  CheckCircle2,
  AlertCircle,
  X,
  Download,
  FileText,
  HelpCircle,
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { Party, Bank, CreateChequeInput } from '../types';

interface BulkChequeImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  parties: Party[];
  banks: Bank[];
  companyId: string;
  onImportCheques: (cheques: CreateChequeInput[]) => Promise<void>;
  onToast: (text: string, type?: 'success' | 'info' | 'error') => void;
}

export const BulkChequeImportModal: React.FC<BulkChequeImportModalProps> = ({
  isOpen,
  onClose,
  parties,
  banks,
  companyId,
  onImportCheques,
  onToast,
}) => {
  const [activeTab, setActiveTab] = useState<'file' | 'text'>('file');
  const [dragActive, setDragActive] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);
  const [csvText, setCsvText] = useState<string>(
    `Cheque No,Amount,Issue Date (BS),Due Date (BS),Party Name,Bank Name,Remarks\n009851,150000,2081-01-10,2081-02-15,Everest Suppliers,Nabil Bank,Hardware Invoice #102\n009852,65000,2081-01-12,2081-02-20,Himalayan Traders,Global IME,IT Services\n009853,240000,2081-01-15,2081-03-01,Nepal Tech Solutions,NIC Asia Bank,Server Equipment`
  );
  const [parsedRows, setParsedRows] = useState<CreateChequeInput[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [parseError, setParseError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const parseRowData = (data: any[][]): CreateChequeInput[] => {
    if (!data || data.length === 0) return [];

    // Check if header row exists
    let startIndex = 0;
    const firstRow = data[0].map((c) => String(c || '').toLowerCase().trim());
    if (
      firstRow.some((c) => c.includes('cheque') || c.includes('amount') || c.includes('party'))
    ) {
      startIndex = 1;
    }

    const items: CreateChequeInput[] = [];

    for (let i = startIndex; i < data.length; i++) {
      const row = data[i];
      if (!row || row.length === 0) continue;

      const cheque_number = String(row[0] || '').trim();
      const rawAmount = String(row[1] || '').replace(/[^0-9.]/g, '');
      const amount = parseFloat(rawAmount) || 0;
      const issue_date_bs = String(row[2] || '2081-01-01').trim();
      const due_date_bs = String(row[3] || '2081-02-01').trim();
      const partyName = String(row[4] || '').trim();
      const bankName = String(row[5] || '').trim();
      const notes = String(row[6] || 'Imported via External Software').trim();

      if (!cheque_number && amount === 0) continue;

      const matchedParty =
        parties.find((p) => p.name.toLowerCase().includes(partyName.toLowerCase())) ||
        parties[0];
      const matchedBank =
        banks.find((b) => b.name.toLowerCase().includes(bankName.toLowerCase())) ||
        banks[0];

      items.push({
        company_id: companyId,
        cheque_number: cheque_number || `IMP-${Date.now().toString().slice(-5)}`,
        amount: amount || 10000,
        issue_date_bs: issue_date_bs || '2081-01-01',
        issue_date_ad: '2024-04-15',
        due_date_bs: due_date_bs || '2081-02-01',
        due_date_ad: '2024-05-15',
        party_id: matchedParty?.id || null,
        bank_id: matchedBank?.id || null,
        status: 'Pending',
        notes,
      });
    }

    return items;
  };

  const handleFileUpload = (file: File) => {
    setParseError(null);
    setFileName(file.name);
    setIsProcessing(true);

    const reader = new FileReader();

    if (file.name.endsWith('.csv')) {
      reader.onload = (e) => {
        try {
          const text = e.target?.result as string;
          const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
          const data = lines.map((l) => l.split(',').map((c) => c.trim()));
          const results = parseRowData(data);
          setParsedRows(results);
          if (results.length === 0) {
            setParseError('No valid rows found in CSV file.');
          }
        } catch (err: any) {
          setParseError(err.message || 'Failed to parse CSV file.');
        } finally {
          setIsProcessing(false);
        }
      };
      reader.readAsText(file);
    } else {
      reader.onload = (e) => {
        try {
          const data = new Uint8Array(e.target?.result as ArrayBuffer);
          const workbook = XLSX.read(data, { type: 'array' });
          const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
          const jsonData: any[][] = XLSX.utils.sheet_to_json(firstSheet, { header: 1 });
          const results = parseRowData(jsonData);
          setParsedRows(results);
          if (results.length === 0) {
            setParseError('No valid cheque rows found in Excel sheet.');
          }
        } catch (err: any) {
          setParseError(err.message || 'Failed to parse Excel file.');
        } finally {
          setIsProcessing(false);
        }
      };
      reader.readAsArrayBuffer(file);
    }
  };

  const handleParseText = () => {
    setParseError(null);
    try {
      const lines = csvText.split(/\r?\n/).filter((l) => l.trim().length > 0);
      const data = lines.map((l) => l.split(',').map((c) => c.trim()));
      const results = parseRowData(data);
      setParsedRows(results);
      if (results.length === 0) {
        setParseError('No valid cheque data found in text.');
      }
    } catch (err: any) {
      setParseError(err.message || 'Failed to parse text.');
    }
  };

  const handleDownloadTemplate = () => {
    const csvContent =
      'data:text/csv;charset=utf-8,' +
      'Cheque No,Amount,Issue Date (BS),Due Date (BS),Party Name,Bank Name,Remarks\n' +
      '009851,150000,2081-01-10,2081-02-15,Everest Suppliers,Nabil Bank,Hardware Invoice #102\n' +
      '009852,65000,2081-01-12,2081-02-20,Himalayan Traders,Global IME,IT Services\n' +
      '009853,240000,2081-01-15,2081-03-01,Nepal Tech Solutions,NIC Asia Bank,Server Equipment\n';

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', 'ChequeDesk_Import_Template.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    onToast('Downloaded ChequeDesk CSV template!', 'info');
  };

  const handleConfirmImport = async () => {
    if (parsedRows.length === 0) {
      onToast('No cheques parsed to import.', 'error');
      return;
    }

    try {
      setIsSubmitting(true);
      await onImportCheques(parsedRows);
      onToast(`Successfully imported ${parsedRows.length} cheques into ledger!`, 'success');
      onClose();
    } catch (err: any) {
      console.error('Import error:', err);
      onToast('Failed to import cheques: ' + err.message, 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full max-h-[90vh] flex flex-col border border-slate-200 overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/80">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-purple-100 text-purple-700 rounded-xl">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-800">
                Import Cheques from External Software
              </h2>
              <p className="text-xs text-slate-500">
                Supports Excel (.xlsx, .xls) and CSV exports from Tally, Busy, Swastik, or Excel
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-5 flex-1">
          {/* Tabs & Template Download */}
          <div className="flex items-center justify-between gap-2 border-b border-slate-200 pb-3">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setActiveTab('file')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                  activeTab === 'file'
                    ? 'bg-purple-600 text-white shadow-xs'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                Upload Excel / CSV File
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('text')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                  activeTab === 'text'
                    ? 'bg-purple-600 text-white shadow-xs'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                Paste CSV Text
              </button>
            </div>

            <button
              type="button"
              onClick={handleDownloadTemplate}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-purple-700 hover:bg-purple-50 rounded-lg border border-purple-200 transition"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Sample CSV Template</span>
            </button>
          </div>

          {/* Tab 1: File Upload */}
          {activeTab === 'file' && (
            <div
              onDragOver={(e) => {
                e.preventDefault();
                setDragActive(true);
              }}
              onDragLeave={() => setDragActive(false)}
              onDrop={(e) => {
                e.preventDefault();
                setDragActive(false);
                if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                  handleFileUpload(e.dataTransfer.files[0]);
                }
              }}
              className={`border-2 border-dashed rounded-xl p-8 text-center transition ${
                dragActive
                  ? 'border-purple-500 bg-purple-50/50'
                  : 'border-slate-300 hover:border-purple-400 bg-slate-50/50'
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx, .xls, .csv"
                className="hidden"
                onChange={(e) => {
                  if (e.target.files && e.target.files[0]) {
                    handleFileUpload(e.target.files[0]);
                  }
                }}
              />
              <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-purple-100 text-purple-600 flex items-center justify-center">
                <Upload className="w-6 h-6" />
              </div>
              <p className="text-sm font-semibold text-slate-700 mb-1">
                {fileName ? fileName : 'Drag & drop Excel or CSV file here'}
              </p>
              <p className="text-xs text-slate-500 mb-4">
                Works with XLSX, XLS, or CSV formats exported from any accounting tool
              </p>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white text-xs font-semibold rounded-xl shadow-xs transition"
              >
                Choose File from Computer
              </button>
            </div>
          )}

          {/* Tab 2: Raw Text Input */}
          {activeTab === 'text' && (
            <div className="space-y-3">
              <label className="block text-xs font-bold text-slate-700">
                Paste Raw CSV Records (Comma Separated):
              </label>
              <textarea
                value={csvText}
                onChange={(e) => setCsvText(e.target.value)}
                rows={5}
                className="w-full p-3 text-xs font-mono bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-purple-500 focus:outline-none"
                placeholder="Cheque No, Amount, Issue Date, Due Date, Party Name, Bank Name, Remarks"
              />
              <button
                type="button"
                onClick={handleParseText}
                className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white text-xs font-semibold rounded-xl shadow-xs transition"
              >
                Parse Text Data
              </button>
            </div>
          )}

          {/* Error Banner */}
          {parseError && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{parseError}</span>
            </div>
          )}

          {/* Preview Table */}
          {parsedRows.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-700">
                  Detected Cheques for Import ({parsedRows.length})
                </span>
                <span className="text-xs text-purple-700 font-semibold">
                  Total Value: Rs.{' '}
                  {parsedRows
                    .reduce((acc, curr) => acc + (curr.amount || 0), 0)
                    .toLocaleString('en-IN')}
                </span>
              </div>
              <div className="border border-slate-200 rounded-xl overflow-x-auto max-h-52">
                <table className="w-full text-left text-xs text-slate-600">
                  <thead className="bg-slate-50 text-slate-700 uppercase tracking-wider text-[10px] font-bold border-b border-slate-200 sticky top-0">
                    <tr>
                      <th className="px-3 py-2">Cheque #</th>
                      <th className="px-3 py-2">Party</th>
                      <th className="px-3 py-2">Bank</th>
                      <th className="px-3 py-2 text-right">Amount</th>
                      <th className="px-3 py-2">Due Date (BS)</th>
                      <th className="px-3 py-2">Remarks</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {parsedRows.map((row, idx) => {
                      const party = parties.find((p) => p.id === row.party_id);
                      const bank = banks.find((b) => b.id === row.bank_id);
                      return (
                        <tr key={idx} className="hover:bg-slate-50">
                          <td className="px-3 py-2 font-mono font-semibold text-slate-800">
                            {row.cheque_number}
                          </td>
                          <td className="px-3 py-2">{party?.name || 'Standard Payee'}</td>
                          <td className="px-3 py-2">{bank?.name || 'Default Bank'}</td>
                          <td className="px-3 py-2 text-right font-mono font-bold text-slate-800">
                            Rs. {row.amount.toLocaleString('en-IN')}
                          </td>
                          <td className="px-3 py-2 font-mono text-slate-600">
                            {row.due_date_bs}
                          </td>
                          <td className="px-3 py-2 text-slate-500 truncate max-w-[150px]">
                            {row.notes}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 border-t border-slate-200 bg-slate-50/80 flex items-center justify-between">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition"
          >
            Cancel
          </button>
          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={parsedRows.length === 0 || isSubmitting || isProcessing}
              onClick={handleConfirmImport}
              className={`inline-flex items-center gap-1.5 px-5 py-2 text-xs font-bold rounded-xl shadow-xs transition ${
                parsedRows.length === 0 || isSubmitting || isProcessing
                  ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
                  : 'bg-purple-600 hover:bg-purple-700 text-white cursor-pointer'
              }`}
            >
              {isSubmitting ? (
                <>Importing...</>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Import {parsedRows.length} Cheques into Ledger</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
