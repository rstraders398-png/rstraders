import React, { useState, useEffect } from 'react';
import {
  HardDrive,
  Cloud,
  Mail,
  ShieldCheck,
  RefreshCw,
  Download,
  Upload,
  Folder,
  Clock,
  CheckCircle2,
  AlertTriangle,
  FileSpreadsheet,
  FileCode,
  Archive,
  Laptop,
  ArrowDownToLine,
  Lock,
  ExternalLink,
  Wifi,
  WifiOff,
  Database,
  History,
  Info,
} from 'lucide-react';
import {
  getBackupConfig,
  saveBackupConfig,
  getBackupHistory,
  getDatabaseStats,
  DatabaseStats,
} from '../lib/offlineDb';
import {
  executeLocalDiskBackup,
  executeEmailBackup,
  createCloudSnapshotBackup,
  restoreFromBackupFile,
  triggerBrowserDownload,
} from '../lib/backupEngine';
import { useSyncStatus } from '../lib/syncWorker';
import { BackupConfig, BackupHistoryItem } from '../types';

interface BackupSettingsViewProps {
  companyId: string;
  companyName: string;
  onToast: (text: string, type?: 'success' | 'info' | 'error') => void;
  onRefreshData?: () => void;
}

export const BackupSettingsView: React.FC<BackupSettingsViewProps> = ({
  companyId,
  companyName,
  onToast,
  onRefreshData,
}) => {
  const syncStatus = useSyncStatus(companyId);
  const [config, setConfig] = useState<BackupConfig>(getBackupConfig(companyId));
  const [history, setHistory] = useState<BackupHistoryItem[]>([]);
  const [dbStats, setDbStats] = useState<DatabaseStats | null>(null);
  const [activeSubTab, setActiveSubTab] = useState<'overview' | 'local_disk' | 'email' | 'cloud_restore' | 'history'>('overview');

  // Loading / Action states
  const [isBackingUpLocal, setIsBackingUpLocal] = useState(false);
  const [isBackingUpEmail, setIsBackingUpEmail] = useState(false);
  const [isBackingUpCloud, setIsBackingUpCloud] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);
  const [restoreFile, setRestoreFile] = useState<File | null>(null);
  const [restorePreview, setRestorePreview] = useState<{
    filename: string;
    size: string;
    format: string;
  } | null>(null);

  // Local disk form states
  const [customPath, setCustomPath] = useState(config.localDiskPath);
  const [autoLocalBackup, setAutoLocalBackup] = useState(config.autoLocalBackup);
  const [backupTime, setBackupTime] = useState(config.backupTime);
  const [backupOnExit, setBackupOnExit] = useState(config.backupOnExit);
  const [selectedFormat, setSelectedFormat] = useState<'zip' | 'bak' | 'json' | 'xlsx'>('zip');

  // Email form states
  const [emailRecipient, setEmailRecipient] = useState(config.emailRecipient || 'rstraders398@gmail.com');
  const [autoEmailBackup, setAutoEmailBackup] = useState(config.autoEmailBackup);
  const [emailFrequency, setEmailFrequency] = useState(config.emailFrequency);

  // Load initial stats & history
  const loadStatsAndHistory = async () => {
    const stats = await getDatabaseStats(companyId);
    setDbStats(stats);
    const hist = await getBackupHistory();
    setHistory(hist);
  };

  useEffect(() => {
    loadStatsAndHistory();

    const handleHistoryChange = () => loadStatsAndHistory();
    const handleSyncComplete = () => loadStatsAndHistory();
    const handleDataRestored = () => {
      loadStatsAndHistory();
      if (onRefreshData) onRefreshData();
    };

    window.addEventListener('chequedesk:backup_history_changed', handleHistoryChange);
    window.addEventListener('chequedesk:sync_completed', handleSyncComplete);
    window.addEventListener('chequedesk:data_restored', handleDataRestored);

    return () => {
      window.removeEventListener('chequedesk:backup_history_changed', handleHistoryChange);
      window.removeEventListener('chequedesk:sync_completed', handleSyncComplete);
      window.removeEventListener('chequedesk:data_restored', handleDataRestored);
    };
  }, [companyId]);

  // Save updated configurations
  const handleSaveConfig = () => {
    const updated = saveBackupConfig(companyId, {
      localDiskPath: customPath,
      autoLocalBackup,
      backupTime,
      backupOnExit,
      emailRecipient,
      autoEmailBackup,
      emailFrequency,
    });
    setConfig(updated);
    onToast('Backup & Data Safety configurations saved successfully', 'success');
  };

  // Trigger Manual Local Backup
  const handleTriggerLocalBackup = async (formatOverride?: 'zip' | 'bak' | 'json' | 'xlsx') => {
    try {
      setIsBackingUpLocal(true);
      const fmt = formatOverride || selectedFormat;
      const res = await executeLocalDiskBackup(companyId, companyName, fmt, customPath);
      onToast(`Local backup created: ${res.filename} (${res.size})`, 'success');
      loadStatsAndHistory();
    } catch (err: any) {
      onToast(`Backup failed: ${err.message || 'Unknown error'}`, 'error');
    } finally {
      setIsBackingUpLocal(false);
    }
  };

  // Trigger Manual Email Backup
  const handleTriggerEmailBackup = async () => {
    if (!emailRecipient || !emailRecipient.includes('@')) {
      onToast('Please provide a valid recipient email address', 'error');
      return;
    }
    try {
      setIsBackingUpEmail(true);
      const res = await executeEmailBackup(companyId, emailRecipient, companyName);
      onToast(`Backup archive (${res.size}) dispatched to ${res.recipient}`, 'success');
      loadStatsAndHistory();
    } catch (err: any) {
      onToast(`Email backup failed: ${err.message || 'Unknown error'}`, 'error');
    } finally {
      setIsBackingUpEmail(false);
    }
  };

  // Trigger Instant Cloud Snapshot
  const handleTriggerCloudSnapshot = async () => {
    if (!syncStatus.isOnline) {
      onToast('Cannot create cloud snapshot while offline. Please connect to internet.', 'error');
      return;
    }
    try {
      setIsBackingUpCloud(true);
      const id = await createCloudSnapshotBackup(companyId, companyName);
      if (id) {
        onToast('Cloud Snapshot successfully stored in secure database', 'success');
        loadStatsAndHistory();
      } else {
        onToast('Could not store cloud snapshot', 'error');
      }
    } catch (err: any) {
      onToast(`Cloud snapshot failed: ${err.message}`, 'error');
    } finally {
      setIsBackingUpCloud(false);
    }
  };

  // File selection for restore
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setRestoreFile(file);
      setRestorePreview({
        filename: file.name,
        size: (file.size / 1024).toFixed(1) + ' KB',
        format: file.name.endsWith('.bak') ? 'Encrypted Snapshot (.bak)' : 'Structured JSON (.json)',
      });
    }
  };

  // Execute Disaster Recovery Restore
  const handleExecuteRestore = async () => {
    if (!restoreFile) {
      onToast('Please select a valid .bak or .json backup file first', 'error');
      return;
    }
    if (!confirm(`Are you sure you want to restore data from "${restoreFile.name}"? This will import all cheques, parties, banks, and payment logs.`)) {
      return;
    }

    try {
      setIsRestoring(true);
      const res = await restoreFromBackupFile(restoreFile, companyId);
      if (res.success) {
        onToast(res.message, 'success');
        setRestoreFile(null);
        setRestorePreview(null);
        loadStatsAndHistory();
        if (onRefreshData) onRefreshData();
      } else {
        onToast(res.message, 'error');
      }
    } catch (err: any) {
      onToast(`Restore failed: ${err.message || 'Integrity error'}`, 'error');
    } finally {
      setIsRestoring(false);
    }
  };

  return (
    <div className="space-y-6 pb-12" id="backup-data-safety-container">
      {/* Top Header & Overview Banner */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-2xs">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5">
              <span className="p-2.5 bg-emerald-50 text-emerald-700 rounded-xl border border-emerald-100 shadow-2xs">
                <HardDrive className="w-6 h-6" />
              </span>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-xl font-extrabold text-slate-900 tracking-tight">
                    Backup & Data Safety Center
                  </h1>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-100 text-emerald-800 border border-emerald-200">
                    Offline-First Engine
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-0.5">
                  Tally / Busy ERP-grade local offline resilience, automatic cloud sync, and multi-destination data vault.
                </p>
              </div>
            </div>
          </div>

          {/* Quick Trigger Buttons */}
          <div className="flex flex-wrap items-center gap-2.5">
            <button
              onClick={() => syncStatus.toggleSimulatedOffline()}
              className={`px-3 py-1.5 text-xs font-bold rounded-xl border transition flex items-center gap-1.5 ${
                syncStatus.isSimulatedOffline
                  ? 'bg-amber-100 text-amber-900 border-amber-300'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-200'
              }`}
              title="Test offline behavior"
            >
              {syncStatus.isSimulatedOffline ? <WifiOff className="w-3.5 h-3.5 text-amber-600" /> : <Wifi className="w-3.5 h-3.5 text-emerald-600" />}
              <span>{syncStatus.isSimulatedOffline ? 'Simulating Offline' : 'Network Active'}</span>
            </button>

            <button
              onClick={() => syncStatus.triggerManualSync()}
              disabled={syncStatus.isSyncing || !syncStatus.isOnline}
              className="px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl shadow-xs transition flex items-center gap-1.5 disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${syncStatus.isSyncing ? 'animate-spin text-emerald-400' : ''}`} />
              <span>{syncStatus.isSyncing ? 'Syncing...' : 'Sync Now'}</span>
            </button>

            <button
              onClick={() => handleTriggerLocalBackup('zip')}
              disabled={isBackingUpLocal}
              className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 active:bg-emerald-900 text-white text-xs font-bold rounded-xl shadow-xs transition flex items-center gap-2 disabled:opacity-50"
            >
              <Archive className="w-4 h-4 text-emerald-200" />
              <span>{isBackingUpLocal ? 'Compressing...' : 'Instant Full Backup (.zip)'}</span>
            </button>
          </div>
        </div>

        {/* Sync & Connection Telemetry Bar */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mt-6 pt-5 border-t border-slate-100">
          {/* 1. Connection Status */}
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80 flex items-center justify-between">
            <div>
              <div className="text-[11px] text-slate-400 font-bold uppercase">System Status</div>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className={`w-2.5 h-2.5 rounded-full ${syncStatus.isOnline ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'}`} />
                <span className="text-xs font-extrabold text-slate-800">
                  {syncStatus.isOnline ? '🟢 Online (Synced)' : '🟠 Offline Mode'}
                </span>
              </div>
            </div>
            <span className="text-[10px] font-mono text-slate-400">
              {syncStatus.pendingCount > 0 ? `${syncStatus.pendingCount} pending` : 'Ready'}
            </span>
          </div>

          {/* 2. Local Database Records */}
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80 flex items-center justify-between">
            <div>
              <div className="text-[11px] text-slate-400 font-bold uppercase">Local IndexedDB</div>
              <div className="text-xs font-extrabold text-slate-800 mt-0.5">
                {dbStats ? `${dbStats.chequesCount} Cheques, ${dbStats.partiesCount} Parties` : 'Loading...'}
              </div>
            </div>
            <Database className="w-4 h-4 text-emerald-600" />
          </div>

          {/* 3. Last Local Backup */}
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80 flex items-center justify-between">
            <div>
              <div className="text-[11px] text-slate-400 font-bold uppercase">Last Local Backup</div>
              <div className="text-xs font-extrabold text-slate-800 mt-0.5 truncate max-w-[130px]" title={config.lastLocalBackupAt || 'Not backed up yet'}>
                {config.lastLocalBackupAt ? new Date(config.lastLocalBackupAt).toLocaleDateString() : 'Never'}
              </div>
            </div>
            <HardDrive className="w-4 h-4 text-blue-600" />
          </div>

          {/* 4. Last Cloud Snapshot */}
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80 flex items-center justify-between">
            <div>
              <div className="text-[11px] text-slate-400 font-bold uppercase">Cloud Snapshot</div>
              <div className="text-xs font-extrabold text-slate-800 mt-0.5 truncate max-w-[130px]" title={config.lastCloudSnapshotAt || 'Pending sync'}>
                {config.lastCloudSnapshotAt ? new Date(config.lastCloudSnapshotAt).toLocaleTimeString() : 'Auto on sync'}
              </div>
            </div>
            <Cloud className="w-4 h-4 text-purple-600" />
          </div>
        </div>
      </div>

      {/* Sub-Navigation Tabs */}
      <div className="flex border-b border-slate-200 gap-2 overflow-x-auto text-xs font-bold">
        <button
          onClick={() => setActiveSubTab('overview')}
          className={`pb-3 px-3 transition border-b-2 flex items-center gap-2 whitespace-nowrap cursor-pointer ${
            activeSubTab === 'overview'
              ? 'border-emerald-600 text-emerald-700'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Laptop className="w-4 h-4" />
          <span>Desktop Architecture & Status</span>
        </button>

        <button
          onClick={() => setActiveSubTab('local_disk')}
          className={`pb-3 px-3 transition border-b-2 flex items-center gap-2 whitespace-nowrap cursor-pointer ${
            activeSubTab === 'local_disk'
              ? 'border-emerald-600 text-emerald-700'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <HardDrive className="w-4 h-4" />
          <span>Automated Local Disk Backup</span>
        </button>

        <button
          onClick={() => setActiveSubTab('email')}
          className={`pb-3 px-3 transition border-b-2 flex items-center gap-2 whitespace-nowrap cursor-pointer ${
            activeSubTab === 'email'
              ? 'border-emerald-600 text-emerald-700'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Mail className="w-4 h-4" />
          <span>Automated Email Backup</span>
        </button>

        <button
          onClick={() => setActiveSubTab('cloud_restore')}
          className={`pb-3 px-3 transition border-b-2 flex items-center gap-2 whitespace-nowrap cursor-pointer ${
            activeSubTab === 'cloud_restore'
              ? 'border-emerald-600 text-emerald-700'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Upload className="w-4 h-4" />
          <span>Cloud Snapshot & Disaster Recovery</span>
        </button>

        <button
          onClick={() => setActiveSubTab('history')}
          className={`pb-3 px-3 transition border-b-2 flex items-center gap-2 whitespace-nowrap cursor-pointer ${
            activeSubTab === 'history'
              ? 'border-emerald-600 text-emerald-700'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <History className="w-4 h-4" />
          <span>Backup History & Audit Log ({history.length})</span>
        </button>
      </div>

      {/* ========================================================
          TAB 1: OVERVIEW & OFFLINE DESKTOP ARCHITECTURE
         ======================================================== */}
      {activeSubTab === 'overview' && (
        <div className="space-y-6">
          {/* Offline-First Engine Explanation */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 p-6 shadow-2xs space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <ShieldCheck className="w-5 h-5 text-emerald-600" />
                  <span>Offline-First Engine (Tally / Busy Accounting Parity)</span>
                </h3>
                <span className="text-xs px-2.5 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-lg font-bold">
                  Active
                </span>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">
                ChequeDesk functions identically to traditional enterprise accounting suites (like Tally ERP, Busy, or Marg).
                Every write operation is saved <strong>instantly to local IndexedDB/SQLite storage</strong>.
                If your internet connection drops or you are operating in remote areas without connectivity, ChequeDesk continues running 100% offline.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
                <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200">
                  <div className="text-emerald-700 font-bold text-xs">100% Zero Latency</div>
                  <p className="text-[11px] text-slate-500 mt-1">
                    Instant cheque entry, search, printing, and ledger calculations without server lag.
                  </p>
                </div>
                <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200">
                  <div className="text-blue-700 font-bold text-xs">Background Sync Queue</div>
                  <p className="text-[11px] text-slate-500 mt-1">
                    Pending offline edits are queued and synced to the cloud server when internet is restored.
                  </p>
                </div>
                <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200">
                  <div className="text-purple-700 font-bold text-xs">Zero Data Loss</div>
                  <p className="text-[11px] text-slate-500 mt-1">
                    Multi-destination auto-backups guard against power loss, browser crashes, or disk corruption.
                  </p>
                </div>
              </div>

              {/* Tally/Busy Style Keyboard Shortcuts for Fast Desk Entry */}
              <div className="pt-4 border-t border-slate-100">
                <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-2.5 flex items-center gap-2">
                  <Laptop className="w-4 h-4 text-slate-500" />
                  <span>Desktop Quick Key Shortcuts (Tally / Busy Compatible)</span>
                </h4>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                  <div className="p-2 bg-slate-100 rounded-lg flex items-center justify-between">
                    <span className="text-slate-600">Issue Cheque</span>
                    <kbd className="px-1.5 py-0.5 bg-white border border-slate-300 rounded text-[10px] font-mono font-bold shadow-2xs">Alt + C</kbd>
                  </div>
                  <div className="p-2 bg-slate-100 rounded-lg flex items-center justify-between">
                    <span className="text-slate-600">Change Date</span>
                    <kbd className="px-1.5 py-0.5 bg-white border border-slate-300 rounded text-[10px] font-mono font-bold shadow-2xs">F2</kbd>
                  </div>
                  <div className="p-2 bg-slate-100 rounded-lg flex items-center justify-between">
                    <span className="text-slate-600">Sync Data</span>
                    <kbd className="px-1.5 py-0.5 bg-white border border-slate-300 rounded text-[10px] font-mono font-bold shadow-2xs">F5</kbd>
                  </div>
                  <div className="p-2 bg-slate-100 rounded-lg flex items-center justify-between">
                    <span className="text-slate-600">Close / Esc</span>
                    <kbd className="px-1.5 py-0.5 bg-white border border-slate-300 rounded text-[10px] font-mono font-bold shadow-2xs">Esc</kbd>
                  </div>
                </div>
              </div>
            </div>

            {/* Desktop App Installation / Package Card */}
            <div className="bg-gradient-to-br from-slate-900 to-slate-800 text-white rounded-2xl p-6 shadow-md flex flex-col justify-between space-y-4">
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Laptop className="w-6 h-6 text-emerald-400" />
                  <span className="text-xs font-mono font-bold uppercase tracking-wider text-emerald-300">
                    Standalone Desktop App
                  </span>
                </div>
                <h3 className="text-lg font-bold text-white">
                  Windows (.exe) & macOS Desktop Setup
                </h3>
                <p className="text-xs text-slate-300 leading-relaxed">
                  Install ChequeDesk as a standalone desktop software on your workstation. Launches from Start Menu or Applications folder with dedicated taskbar icon and offline engine.
                </p>

                <div className="p-3 bg-white/10 rounded-xl border border-white/10 space-y-1.5">
                  <div className="text-[11px] font-bold text-white flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Works 100% Offline without Internet</span>
                  </div>
                  <div className="text-[11px] font-bold text-white flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Auto-launches on PC boot (optional)</span>
                  </div>
                  <div className="text-[11px] font-bold text-white flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Direct printer access for Cheque Printing</span>
                  </div>
                </div>
              </div>

              <div className="space-y-2 pt-2">
                <button
                  onClick={() => {
                    handleTriggerLocalBackup('zip');
                    onToast('Packaging ChequeDesk desktop offline bundle and database...', 'info');
                  }}
                  className="w-full py-2.5 bg-emerald-500 hover:bg-emerald-400 active:bg-emerald-600 text-slate-950 font-bold text-xs rounded-xl transition flex items-center justify-center gap-2 shadow-xs"
                >
                  <ArrowDownToLine className="w-4 h-4" />
                  <span>Download Desktop Offline Package</span>
                </button>
                <div className="text-center text-[10px] text-slate-400">
                  Compatible with Windows 10/11 & macOS Sonoma/Sequoia
                </div>
              </div>
            </div>
          </div>

          {/* Pending Sync Queue Monitor */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-2xs space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <RefreshCw className="w-4 h-4 text-slate-600" />
                  <span>Pending Offline Sync Queue</span>
                  <span className="px-2 py-0.5 text-[10px] font-mono rounded bg-slate-100 text-slate-700">
                    {syncStatus.pendingCount} Operations
                  </span>
                </h3>
                <p className="text-xs text-slate-500">
                  Transactions performed while offline are held here securely and automatically uploaded upon reconnecting.
                </p>
              </div>

              {syncStatus.pendingCount > 0 && (
                <button
                  onClick={() => syncStatus.triggerManualSync()}
                  disabled={syncStatus.isSyncing || !syncStatus.isOnline}
                  className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg shadow-xs transition flex items-center gap-1.5 disabled:opacity-50"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${syncStatus.isSyncing ? 'animate-spin' : ''}`} />
                  <span>Upload Pending Now</span>
                </button>
              )}
            </div>

            {syncStatus.pendingCount === 0 ? (
              <div className="p-4 bg-emerald-50/50 rounded-xl border border-emerald-100 flex items-center gap-3">
                <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                <div>
                  <div className="text-xs font-bold text-emerald-900">All local records are 100% synchronized!</div>
                  <div className="text-[11px] text-emerald-700">No pending offline mutations in the queue.</div>
                </div>
              </div>
            ) : (
              <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-xs text-amber-900 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-600" />
                  <span>{syncStatus.pendingCount} pending local transaction(s) will sync once internet is available.</span>
                </div>
                <button
                  onClick={() => syncStatus.triggerManualSync()}
                  className="font-bold underline hover:text-amber-950"
                >
                  Retry Sync
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================
          TAB 2: AUTOMATED LOCAL DISK BACKUP
         ======================================================== */}
      {activeSubTab === 'local_disk' && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-2xs space-y-6">
          <div>
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <HardDrive className="w-5 h-5 text-emerald-600" />
              <span>Automated Local Disk & USB Drive Backup</span>
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              Configure automatic daily backups stored directly onto your computer's hard disk (e.g. D: drive) or an external USB thumb drive.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
            {/* Custom Storage Path */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                <Folder className="w-3.5 h-3.5 text-slate-500" />
                <span>Local Storage Folder / USB Path</span>
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={customPath}
                  onChange={(e) => setCustomPath(e.target.value)}
                  placeholder="e.g. D:\ChequeDesk_Backups\ or E:\USB_Vault\"
                  className="w-full px-3 py-2 text-xs font-mono bg-slate-50 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
              <p className="text-[11px] text-slate-500">
                You can specify any secondary disk partition, network shared drive, or external storage path.
              </p>
            </div>

            {/* Scheduled Backup Time */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-slate-500" />
                <span>Daily Scheduled Backup Time</span>
              </label>
              <input
                type="time"
                value={backupTime}
                onChange={(e) => setBackupTime(e.target.value)}
                className="w-full px-3 py-2 text-xs font-mono bg-slate-50 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
              <p className="text-[11px] text-slate-500">
                ChequeDesk automatically takes a full snapshot at end-of-day (EOD) business hours.
              </p>
            </div>
          </div>

          {/* Backup Options & Automation Switches */}
          <div className="space-y-3 pt-2">
            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between">
              <div>
                <div className="text-xs font-bold text-slate-900">Enable Automated Daily Local Backup</div>
                <div className="text-[11px] text-slate-500">Automatically creates encrypted backups daily at scheduled time.</div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={autoLocalBackup}
                  onChange={(e) => setAutoLocalBackup(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-slate-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600"></div>
              </label>
            </div>

            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between">
              <div>
                <div className="text-xs font-bold text-slate-900">Backup on Application Exit</div>
                <div className="text-[11px] text-slate-500">Guarantees all day's cheques are backed up before closing ChequeDesk.</div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={backupOnExit}
                  onChange={(e) => setBackupOnExit(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-slate-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600"></div>
              </label>
            </div>
          </div>

          {/* Format Selector */}
          <div className="space-y-2 pt-2">
            <label className="text-xs font-bold text-slate-700">Backup Format Selection</label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <button
                type="button"
                onClick={() => setSelectedFormat('zip')}
                className={`p-3 rounded-xl border text-left transition ${
                  selectedFormat === 'zip'
                    ? 'bg-emerald-50 border-emerald-500 ring-2 ring-emerald-500/20'
                    : 'bg-slate-50 border-slate-200 hover:bg-slate-100'
                }`}
              >
                <div className="flex items-center gap-1.5 text-emerald-800 font-bold text-xs">
                  <Archive className="w-4 h-4" />
                  <span>Full ZIP Archive</span>
                </div>
                <p className="text-[10px] text-slate-500 mt-1">Contains .bak, .json, and .xlsx sheets</p>
              </button>

              <button
                type="button"
                onClick={() => setSelectedFormat('bak')}
                className={`p-3 rounded-xl border text-left transition ${
                  selectedFormat === 'bak'
                    ? 'bg-emerald-50 border-emerald-500 ring-2 ring-emerald-500/20'
                    : 'bg-slate-50 border-slate-200 hover:bg-slate-100'
                }`}
              >
                <div className="flex items-center gap-1.5 text-emerald-800 font-bold text-xs">
                  <Lock className="w-4 h-4" />
                  <span>Encrypted (.bak)</span>
                </div>
                <p className="text-[10px] text-slate-500 mt-1">Tally/Busy binary restore format</p>
              </button>

              <button
                type="button"
                onClick={() => setSelectedFormat('json')}
                className={`p-3 rounded-xl border text-left transition ${
                  selectedFormat === 'json'
                    ? 'bg-emerald-50 border-emerald-500 ring-2 ring-emerald-500/20'
                    : 'bg-slate-50 border-slate-200 hover:bg-slate-100'
                }`}
              >
                <div className="flex items-center gap-1.5 text-emerald-800 font-bold text-xs">
                  <FileCode className="w-4 h-4" />
                  <span>Structured (.json)</span>
                </div>
                <p className="text-[10px] text-slate-500 mt-1">Human readable database dump</p>
              </button>

              <button
                type="button"
                onClick={() => setSelectedFormat('xlsx')}
                className={`p-3 rounded-xl border text-left transition ${
                  selectedFormat === 'xlsx'
                    ? 'bg-emerald-50 border-emerald-500 ring-2 ring-emerald-500/20'
                    : 'bg-slate-50 border-slate-200 hover:bg-slate-100'
                }`}
              >
                <div className="flex items-center gap-1.5 text-emerald-800 font-bold text-xs">
                  <FileSpreadsheet className="w-4 h-4" />
                  <span>Excel (.xlsx)</span>
                </div>
                <p className="text-[10px] text-slate-500 mt-1">Multi-tab audit workbook for CA</p>
              </button>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={handleSaveConfig}
              className="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl shadow-xs transition"
            >
              Save Local Disk Settings
            </button>

            <button
              type="button"
              onClick={() => handleTriggerLocalBackup()}
              disabled={isBackingUpLocal}
              className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-xs transition flex items-center gap-2 disabled:opacity-50"
            >
              <Download className="w-4 h-4" />
              <span>{isBackingUpLocal ? 'Generating...' : `Generate Backup (${selectedFormat.toUpperCase()}) Now`}</span>
            </button>
          </div>
        </div>
      )}

      {/* ========================================================
          TAB 3: AUTOMATED EMAIL BACKUP
         ======================================================== */}
      {activeSubTab === 'email' && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-2xs space-y-6">
          <div>
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Mail className="w-5 h-5 text-emerald-600" />
              <span>Automated Email Backup System</span>
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              Automatically dispatch encrypted backup ZIP archives to your company email address.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
            {/* Registered Email */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                <Mail className="w-3.5 h-3.5 text-slate-500" />
                <span>Company Registered Email ID</span>
              </label>
              <input
                type="email"
                value={emailRecipient}
                onChange={(e) => setEmailRecipient(e.target.value)}
                placeholder="e.g. rstraders398@gmail.com"
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
              <p className="text-[11px] text-slate-500">
                Backup archives containing all cheques, parties, and banks will be sent to this email.
              </p>
            </div>

            {/* Email Frequency */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-slate-500" />
                <span>Email Backup Frequency</span>
              </label>
              <select
                value={emailFrequency}
                onChange={(e) => setEmailFrequency(e.target.value as any)}
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                <option value="daily">Daily End-of-Day Dispatch</option>
                <option value="weekly">Weekly Friday Digest</option>
                <option value="on_sync">Upon Every Successful Cloud Sync</option>
              </select>
              <p className="text-[11px] text-slate-500">
                Frequency for automated email archive delivery.
              </p>
            </div>
          </div>

          <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between">
            <div>
              <div className="text-xs font-bold text-slate-900">Enable Automated Email Dispatch</div>
              <div className="text-[11px] text-slate-500">
                Sends backup zip package automatically when system is online.
              </div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={autoEmailBackup}
                onChange={(e) => setAutoEmailBackup(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-slate-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600"></div>
            </label>
          </div>

          <div className="p-4 bg-emerald-50 rounded-xl border border-emerald-200 text-xs text-emerald-900 space-y-1">
            <div className="font-bold flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-emerald-700" />
              <span>Security & Tamper-Proof Encryption</span>
            </div>
            <p className="text-[11px] text-emerald-800">
              Email attachments are compressed into a secure, checksum-verified ZIP archive that includes an audit manifest so unauthorized modifications can be detected immediately upon restore.
            </p>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={handleSaveConfig}
              className="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl shadow-xs transition"
            >
              Save Email Settings
            </button>

            <button
              type="button"
              onClick={handleTriggerEmailBackup}
              disabled={isBackingUpEmail}
              className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-xs transition flex items-center gap-2 disabled:opacity-50"
            >
              <Mail className="w-4 h-4" />
              <span>{isBackingUpEmail ? 'Packaging & Dispatching...' : 'Send Test Email Backup Now'}</span>
            </button>
          </div>
        </div>
      )}

      {/* ========================================================
          TAB 4: CLOUD SNAPSHOT & DISASTER RECOVERY RESTORE
         ======================================================== */}
      {activeSubTab === 'cloud_restore' && (
        <div className="space-y-6">
          {/* Cloud Snapshot Card */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-2xs space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <Cloud className="w-5 h-5 text-purple-600" />
                  <span>Cloud Snapshot Vault</span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Instant cloud snapshot backup generated automatically on every two-way sync completion.
                </p>
              </div>

              <button
                onClick={handleTriggerCloudSnapshot}
                disabled={isBackingUpCloud || !syncStatus.isOnline}
                className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs rounded-xl shadow-xs transition flex items-center gap-1.5 disabled:opacity-50"
              >
                <Cloud className="w-4 h-4" />
                <span>{isBackingUpCloud ? 'Taking Snapshot...' : 'Take Cloud Snapshot Now'}</span>
              </button>
            </div>

            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between text-xs">
              <span className="text-slate-600">Last Successful Cloud Snapshot:</span>
              <span className="font-mono font-bold text-slate-900">
                {config.lastCloudSnapshotAt ? new Date(config.lastCloudSnapshotAt).toLocaleString() : 'Pending sync'}
              </span>
            </div>
          </div>

          {/* Disaster Recovery / Restore File */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-2xs space-y-5">
            <div>
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Upload className="w-5 h-5 text-emerald-600" />
                <span>Disaster Recovery: Restore from Backup File</span>
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                Recover your database in case of hardware failure or computer replacement. Upload any valid <strong>.bak</strong> or <strong>.json</strong> backup file to restore all cheques, payees, and banks.
              </p>
            </div>

            {/* Drag & Drop / File Input Box */}
            <div className="border-2 border-dashed border-slate-300 hover:border-emerald-500 rounded-2xl p-6 text-center bg-slate-50/50 transition">
              <input
                type="file"
                id="restore-file-input"
                accept=".bak,.json"
                onChange={handleFileChange}
                className="hidden"
              />
              <label
                htmlFor="restore-file-input"
                className="flex flex-col items-center justify-center cursor-pointer space-y-2"
              >
                <span className="p-3 bg-white rounded-full border border-slate-200 shadow-2xs text-emerald-600">
                  <ArrowDownToLine className="w-6 h-6" />
                </span>
                <span className="text-xs font-bold text-slate-800">
                  Click to select or drag & drop backup file (.bak / .json)
                </span>
                <span className="text-[11px] text-slate-400">
                  ChequeDesk Binary Snapshots (.bak) or Structured Audits (.json)
                </span>
              </label>
            </div>

            {/* Selected File Preview */}
            {restorePreview && (
              <div className="p-4 bg-emerald-50 rounded-xl border border-emerald-200 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <FileCode className="w-5 h-5 text-emerald-700" />
                  <div>
                    <div className="text-xs font-bold text-slate-900">{restorePreview.filename}</div>
                    <div className="text-[11px] text-slate-500">
                      Size: {restorePreview.size} • Format: {restorePreview.format}
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleExecuteRestore}
                  disabled={isRestoring}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-xs transition flex items-center gap-1.5 disabled:opacity-50"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isRestoring ? 'animate-spin' : ''}`} />
                  <span>{isRestoring ? 'Restoring Data...' : 'Confirm & Restore Now'}</span>
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================
          TAB 5: BACKUP HISTORY & AUDIT LOG
         ======================================================== */}
      {activeSubTab === 'history' && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-2xs space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <History className="w-5 h-5 text-slate-600" />
                <span>Backup History & Multi-Location Audit Logs</span>
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Complete log of automated local disk backups, email dispatches, and cloud snapshots.
              </p>
            </div>

            <button
              onClick={() => handleTriggerLocalBackup('zip')}
              className="px-3.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold rounded-xl transition flex items-center gap-1.5"
            >
              <Download className="w-3.5 h-3.5" />
              <span>New Backup</span>
            </button>
          </div>

          {history.length === 0 ? (
            <div className="text-center py-12 text-slate-400 text-xs">
              No backups recorded yet. Click "Instant Full Backup" to generate your first snapshot.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase">
                    <th className="pb-3 px-3">Date & Time</th>
                    <th className="pb-3 px-3">Destination</th>
                    <th className="pb-3 px-3">Filename / Identifier</th>
                    <th className="pb-3 px-3">Format & Size</th>
                    <th className="pb-3 px-3">Records Stored</th>
                    <th className="pb-3 px-3">Status</th>
                    <th className="pb-3 px-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {history.map((item) => (
                    <tr key={item.id} className="hover:bg-slate-50/80 transition">
                      <td className="py-3 px-3 font-mono text-slate-600">
                        {new Date(item.timestamp).toLocaleString()}
                      </td>
                      <td className="py-3 px-3">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          item.destination === 'local_disk'
                            ? 'bg-blue-100 text-blue-800'
                            : item.destination === 'email'
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-purple-100 text-purple-800'
                        }`}>
                          {item.destination === 'local_disk' && <HardDrive className="w-3 h-3" />}
                          {item.destination === 'email' && <Mail className="w-3 h-3" />}
                          {item.destination === 'cloud' && <Cloud className="w-3 h-3" />}
                          <span className="capitalize">{item.destination.replace('_', ' ')}</span>
                        </span>
                      </td>
                      <td className="py-3 px-3 font-mono text-slate-800 font-medium truncate max-w-[200px]" title={item.filename}>
                        {item.filename}
                      </td>
                      <td className="py-3 px-3">
                        <span className="uppercase font-bold text-slate-700">{item.format}</span>
                        <span className="text-slate-400 ml-1">({item.fileSize})</span>
                      </td>
                      <td className="py-3 px-3 text-slate-600 text-[11px]">
                        {item.recordsCount ? (
                          <span>
                            {item.recordsCount.cheques} chq, {item.recordsCount.parties} pty, {item.recordsCount.banks} bnk
                          </span>
                        ) : 'N/A'}
                      </td>
                      <td className="py-3 px-3">
                        <span className="inline-flex items-center gap-1 text-emerald-700 font-bold text-[11px]">
                          <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                          <span>Success</span>
                        </span>
                      </td>
                      <td className="py-3 px-3 text-right">
                        <button
                          onClick={() => handleTriggerLocalBackup(item.format)}
                          className="p-1 hover:bg-slate-200 rounded text-slate-600 transition"
                          title="Generate fresh copy"
                        >
                          <Download className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
