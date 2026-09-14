import { Bank, Cheque, Party, PaymentLog, BackupConfig, BackupHistoryItem } from '../types';

const DB_NAME = 'chequedesk_offline_v2';
const DB_VERSION = 1;

export interface SyncQueueItem {
  id: string;
  entity: 'cheque' | 'party' | 'bank' | 'payment_log';
  action: 'create' | 'update' | 'delete';
  docId: string;
  companyId: string;
  data?: any;
  timestamp: string;
  attempts: number;
  lastError?: string;
}

export const DEFAULT_BACKUP_CONFIG: BackupConfig = {
  localDiskPath: 'D:\\ChequeDesk_Backups\\',
  autoLocalBackup: true,
  backupTime: '18:00',
  backupOnExit: true,
  autoEmailBackup: true,
  emailRecipient: 'rstraders398@gmail.com',
  emailFrequency: 'daily',
  cloudSnapshotEnabled: true,
  encryptionEnabled: true,
  lastLocalBackupAt: null,
  lastEmailBackupAt: null,
  lastCloudSnapshotAt: null,
};

let dbPromise: Promise<IDBDatabase> | null = null;

function openDB(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise;

  dbPromise = new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !window.indexedDB) {
      reject(new Error('IndexedDB is not supported in this environment'));
      return;
    }

    const request = window.indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;

      // Cheques store
      if (!db.objectStoreNames.contains('cheques')) {
        const chequesStore = db.createObjectStore('cheques', { keyPath: 'id' });
        chequesStore.createIndex('company_id', 'company_id', { unique: false });
        chequesStore.createIndex('created_at', 'created_at', { unique: false });
        chequesStore.createIndex('status', 'status', { unique: false });
      }

      // Parties store
      if (!db.objectStoreNames.contains('parties')) {
        const partiesStore = db.createObjectStore('parties', { keyPath: 'id' });
        partiesStore.createIndex('company_id', 'company_id', { unique: false });
        partiesStore.createIndex('name', 'name', { unique: false });
      }

      // Banks store
      if (!db.objectStoreNames.contains('banks')) {
        const banksStore = db.createObjectStore('banks', { keyPath: 'id' });
        banksStore.createIndex('company_id', 'company_id', { unique: false });
        banksStore.createIndex('name', 'name', { unique: false });
      }

      // Payment Logs store
      if (!db.objectStoreNames.contains('payment_logs')) {
        const logsStore = db.createObjectStore('payment_logs', { keyPath: 'id' });
        logsStore.createIndex('company_id', 'company_id', { unique: false });
        logsStore.createIndex('cheque_id', 'cheque_id', { unique: false });
        logsStore.createIndex('created_at', 'created_at', { unique: false });
      }

      // Pending Sync Queue (for mutations created while offline)
      if (!db.objectStoreNames.contains('sync_queue')) {
        const queueStore = db.createObjectStore('sync_queue', { keyPath: 'id' });
        queueStore.createIndex('timestamp', 'timestamp', { unique: false });
        queueStore.createIndex('companyId', 'companyId', { unique: false });
      }

      // Backup History store
      if (!db.objectStoreNames.contains('backup_history')) {
        const backupStore = db.createObjectStore('backup_history', { keyPath: 'id' });
        backupStore.createIndex('timestamp', 'timestamp', { unique: false });
      }

      // Settings store
      if (!db.objectStoreNames.contains('settings')) {
        db.createObjectStore('settings', { keyPath: 'key' });
      }
    };

    request.onsuccess = () => {
      resolve(request.result);
    };

    request.onerror = () => {
      reject(request.error);
    };
  });

  return dbPromise;
}

// Generic transaction helpers
async function executeTransaction<T>(
  storeName: string,
  mode: IDBTransactionMode,
  operation: (store: IDBObjectStore) => IDBRequest<T> | void
): Promise<T> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    try {
      const tx = db.transaction(storeName, mode);
      const store = tx.objectStore(storeName);
      const request = operation(store);

      if (request) {
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      } else {
        tx.oncomplete = () => resolve(undefined as unknown as T);
      }

      tx.onerror = () => reject(tx.error);
    } catch (err) {
      reject(err);
    }
  });
}

// ==========================================
// 1. CHEQUES (Local Offline Storage)
// ==========================================
export async function getLocalCheques(companyId?: string): Promise<Cheque[]> {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('cheques', 'readonly');
      const store = tx.objectStore('cheques');
      const request = store.getAll();

      request.onsuccess = () => {
        let items: Cheque[] = request.result || [];
        if (companyId) {
          items = items.filter((c) => c.company_id === companyId);
        }
        items.sort(
          (a, b) => new Date(b.created_at || '').getTime() - new Date(a.created_at || '').getTime()
        );
        resolve(items);
      };
      request.onerror = () => reject(request.error);
    });
  } catch (err) {
    console.warn('[OfflineDB] Could not read local cheques from IndexedDB:', err);
    return [];
  }
}

export async function saveLocalCheque(cheque: Cheque, enqueue = false): Promise<void> {
  try {
    await executeTransaction('cheques', 'readwrite', (store) => store.put(cheque));
    if (enqueue) {
      await enqueueSyncMutation({
        id: `sync_chk_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
        entity: 'cheque',
        action: 'create',
        docId: cheque.id,
        companyId: cheque.company_id,
        data: cheque,
        timestamp: new Date().toISOString(),
        attempts: 0,
      });
    }
  } catch (err) {
    console.error('[OfflineDB] Error saving local cheque:', err);
  }
}

export async function deleteLocalCheque(id: string, companyId: string = 'default-company-101', enqueue = false): Promise<void> {
  try {
    await executeTransaction('cheques', 'readwrite', (store) => store.delete(id));
    if (enqueue) {
      await enqueueSyncMutation({
        id: `sync_del_chk_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
        entity: 'cheque',
        action: 'delete',
        docId: id,
        companyId,
        timestamp: new Date().toISOString(),
        attempts: 0,
      });
    }
  } catch (err) {
    console.error('[OfflineDB] Error deleting local cheque:', err);
  }
}

// ==========================================
// 2. PARTIES (Local Offline Storage)
// ==========================================
export async function getLocalParties(companyId?: string): Promise<Party[]> {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('parties', 'readonly');
      const store = tx.objectStore('parties');
      const request = store.getAll();

      request.onsuccess = () => {
        let items: Party[] = request.result || [];
        if (companyId) {
          items = items.filter((p) => p.company_id === companyId);
        }
        items.sort((a, b) => a.name.localeCompare(b.name));
        resolve(items);
      };
      request.onerror = () => reject(request.error);
    });
  } catch (err) {
    console.warn('[OfflineDB] Could not read local parties:', err);
    return [];
  }
}

export async function saveLocalParty(party: Party, enqueue = false): Promise<void> {
  try {
    await executeTransaction('parties', 'readwrite', (store) => store.put(party));
    if (enqueue) {
      await enqueueSyncMutation({
        id: `sync_pty_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
        entity: 'party',
        action: 'create',
        docId: party.id,
        companyId: party.company_id,
        data: party,
        timestamp: new Date().toISOString(),
        attempts: 0,
      });
    }
  } catch (err) {
    console.error('[OfflineDB] Error saving local party:', err);
  }
}

export async function deleteLocalParty(id: string, companyId: string = 'default-company-101', enqueue = false): Promise<void> {
  try {
    await executeTransaction('parties', 'readwrite', (store) => store.delete(id));
    if (enqueue) {
      await enqueueSyncMutation({
        id: `sync_del_pty_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
        entity: 'party',
        action: 'delete',
        docId: id,
        companyId,
        timestamp: new Date().toISOString(),
        attempts: 0,
      });
    }
  } catch (err) {
    console.error('[OfflineDB] Error deleting local party:', err);
  }
}

// ==========================================
// 3. BANKS (Local Offline Storage)
// ==========================================
export async function getLocalBanks(companyId?: string): Promise<Bank[]> {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('banks', 'readonly');
      const store = tx.objectStore('banks');
      const request = store.getAll();

      request.onsuccess = () => {
        let items: Bank[] = request.result || [];
        if (companyId) {
          items = items.filter((b) => b.company_id === companyId);
        }
        items.sort((a, b) => a.name.localeCompare(b.name));
        resolve(items);
      };
      request.onerror = () => reject(request.error);
    });
  } catch (err) {
    console.warn('[OfflineDB] Could not read local banks:', err);
    return [];
  }
}

export async function saveLocalBank(bank: Bank, enqueue = false): Promise<void> {
  try {
    await executeTransaction('banks', 'readwrite', (store) => store.put(bank));
    if (enqueue) {
      await enqueueSyncMutation({
        id: `sync_bnk_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
        entity: 'bank',
        action: 'create',
        docId: bank.id,
        companyId: bank.company_id,
        data: bank,
        timestamp: new Date().toISOString(),
        attempts: 0,
      });
    }
  } catch (err) {
    console.error('[OfflineDB] Error saving local bank:', err);
  }
}

export async function deleteLocalBank(id: string, companyId: string = 'default-company-101', enqueue = false): Promise<void> {
  try {
    await executeTransaction('banks', 'readwrite', (store) => store.delete(id));
    if (enqueue) {
      await enqueueSyncMutation({
        id: `sync_del_bnk_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
        entity: 'bank',
        action: 'delete',
        docId: id,
        companyId,
        timestamp: new Date().toISOString(),
        attempts: 0,
      });
    }
  } catch (err) {
    console.error('[OfflineDB] Error deleting local bank:', err);
  }
}

// ==========================================
// 4. PAYMENT LOGS (Local Offline Storage)
// ==========================================
export async function getLocalPaymentLogs(companyId?: string, chequeId?: string): Promise<PaymentLog[]> {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('payment_logs', 'readonly');
      const store = tx.objectStore('payment_logs');
      const request = store.getAll();

      request.onsuccess = () => {
        let items: PaymentLog[] = request.result || [];
        if (companyId) {
          items = items.filter((l) => l.company_id === companyId);
        }
        if (chequeId) {
          items = items.filter((l) => l.cheque_id === chequeId);
        }
        items.sort(
          (a, b) => new Date(b.created_at || '').getTime() - new Date(a.created_at || '').getTime()
        );
        resolve(items);
      };
      request.onerror = () => reject(request.error);
    });
  } catch (err) {
    console.warn('[OfflineDB] Could not read local payment logs:', err);
    return [];
  }
}

export async function saveLocalPaymentLog(log: PaymentLog, enqueue = false): Promise<void> {
  try {
    await executeTransaction('payment_logs', 'readwrite', (store) => store.put(log));
    if (enqueue) {
      await enqueueSyncMutation({
        id: `sync_log_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
        entity: 'payment_log',
        action: 'create',
        docId: log.id,
        companyId: log.company_id || 'default-company-101',
        data: log,
        timestamp: new Date().toISOString(),
        attempts: 0,
      });
    }
  } catch (err) {
    console.error('[OfflineDB] Error saving local payment log:', err);
  }
}

export async function deleteLocalPaymentLog(id: string, companyId: string = 'default-company-101', enqueue = false): Promise<void> {
  try {
    await executeTransaction('payment_logs', 'readwrite', (store) => store.delete(id));
    if (enqueue) {
      await enqueueSyncMutation({
        id: `sync_del_log_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
        entity: 'payment_log',
        action: 'delete',
        docId: id,
        companyId,
        timestamp: new Date().toISOString(),
        attempts: 0,
      });
    }
  } catch (err) {
    console.error('[OfflineDB] Error deleting local payment log:', err);
  }
}

export interface SyncItemEnqueueInput {
  entity_type: string;
  operation: 'create' | 'update' | 'delete';
  data: any;
  company_id?: string;
}

export async function enqueueSyncItem(input: SyncItemEnqueueInput): Promise<void> {
  let entity: 'cheque' | 'party' | 'bank' | 'payment_log' = 'cheque';
  if (input.entity_type === 'parties') entity = 'party';
  else if (input.entity_type === 'banks') entity = 'bank';
  else if (input.entity_type === 'payment_logs') entity = 'payment_log';

  const docId = input.data?.id || input.data?.cheque_id || `doc_${Date.now()}`;
  await enqueueSyncMutation({
    id: `sync_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    entity,
    action: input.operation,
    docId,
    companyId: input.company_id || input.data?.company_id || 'default-company-101',
    data: input.data,
    timestamp: new Date().toISOString(),
    attempts: 0,
  });
}

// Bulk store entities received from cloud or restore
export async function bulkUpsertLocal<T extends { id: string }>(
  storeName: 'cheques' | 'parties' | 'banks' | 'payment_logs',
  items: T[]
): Promise<void> {
  if (!items || items.length === 0) return;
  try {
    const db = await openDB();
    const tx = db.transaction(storeName, 'readwrite');
    const store = tx.objectStore(storeName);
    items.forEach((item) => store.put(item));
    return new Promise((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch (err) {
    console.error(`[OfflineDB] Error in bulkUpsertLocal for ${storeName}:`, err);
  }
}

// ==========================================
// 5. PENDING SYNC QUEUE
// ==========================================
export async function enqueueSyncMutation(mutation: SyncQueueItem): Promise<void> {
  try {
    await executeTransaction('sync_queue', 'readwrite', (store) => store.put(mutation));
    window.dispatchEvent(new CustomEvent('chequedesk:sync_queue_changed'));
  } catch (err) {
    console.error('[OfflineDB] Error enqueuing sync mutation:', err);
  }
}

export async function getPendingSyncQueue(companyId?: string): Promise<SyncQueueItem[]> {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('sync_queue', 'readonly');
      const store = tx.objectStore('sync_queue');
      const request = store.getAll();

      request.onsuccess = () => {
        let items: SyncQueueItem[] = request.result || [];
        if (companyId) {
          items = items.filter((i) => i.companyId === companyId);
        }
        items.sort(
          (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
        );
        resolve(items);
      };
      request.onerror = () => reject(request.error);
    });
  } catch (err) {
    console.warn('[OfflineDB] Error getting pending sync queue:', err);
    return [];
  }
}

export async function removePendingSyncItem(id: string): Promise<void> {
  try {
    await executeTransaction('sync_queue', 'readwrite', (store) => store.delete(id));
    window.dispatchEvent(new CustomEvent('chequedesk:sync_queue_changed'));
  } catch (err) {
    console.error('[OfflineDB] Error removing sync queue item:', err);
  }
}

export async function clearAllPendingSync(): Promise<void> {
  try {
    await executeTransaction('sync_queue', 'readwrite', (store) => store.clear());
    window.dispatchEvent(new CustomEvent('chequedesk:sync_queue_changed'));
  } catch (err) {
    console.error('[OfflineDB] Error clearing sync queue:', err);
  }
}

// ==========================================
// 6. BACKUP CONFIG & HISTORY
// ==========================================
export function getBackupConfig(companyId: string): BackupConfig {
  if (typeof window !== 'undefined') {
    const saved = localStorage.getItem(`chequedesk_backup_cfg_${companyId}`);
    if (saved) {
      try {
        return { ...DEFAULT_BACKUP_CONFIG, ...JSON.parse(saved) };
      } catch (e) {
        console.warn('Failed to parse backup config, using defaults:', e);
      }
    }
  }
  return DEFAULT_BACKUP_CONFIG;
}

export function saveBackupConfig(companyId: string, config: Partial<BackupConfig>): BackupConfig {
  const current = getBackupConfig(companyId);
  const updated = { ...current, ...config };
  if (typeof window !== 'undefined') {
    localStorage.setItem(`chequedesk_backup_cfg_${companyId}`, JSON.stringify(updated));
    window.dispatchEvent(new CustomEvent('chequedesk:backup_config_changed', { detail: updated }));
  }
  return updated;
}

export async function getBackupHistory(): Promise<BackupHistoryItem[]> {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('backup_history', 'readonly');
      const store = tx.objectStore('backup_history');
      const request = store.getAll();

      request.onsuccess = () => {
        const items: BackupHistoryItem[] = request.result || [];
        items.sort(
          (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
        );
        resolve(items);
      };
      request.onerror = () => reject(request.error);
    });
  } catch (err) {
    console.warn('[OfflineDB] Could not read backup history:', err);
    return [];
  }
}

export async function addBackupHistoryItem(item: BackupHistoryItem): Promise<void> {
  try {
    await executeTransaction('backup_history', 'readwrite', (store) => store.put(item));
    window.dispatchEvent(new CustomEvent('chequedesk:backup_history_changed', { detail: item }));
  } catch (err) {
    console.error('[OfflineDB] Error saving backup history item:', err);
  }
}

// ==========================================
// 7. DATABASE STATS & STORAGE ENGINE OVERVIEW
// ==========================================
export interface DatabaseStats {
  chequesCount: number;
  partiesCount: number;
  banksCount: number;
  logsCount: number;
  pendingSyncCount: number;
  totalStorageBytes: number;
  indexedDbSupported: boolean;
  engineName: string;
}

export async function getDatabaseStats(companyId?: string): Promise<DatabaseStats> {
  try {
    const [cheques, parties, banks, logs, pending] = await Promise.all([
      getLocalCheques(companyId),
      getLocalParties(companyId),
      getLocalBanks(companyId),
      getLocalPaymentLogs(companyId),
      getPendingSyncQueue(companyId),
    ]);

    // Estimate storage size in bytes
    const samplePayload = JSON.stringify({ cheques, parties, banks, logs, pending });
    const bytes = new Blob([samplePayload]).size;

    return {
      chequesCount: cheques.length,
      partiesCount: parties.length,
      banksCount: banks.length,
      logsCount: logs.length,
      pendingSyncCount: pending.length,
      totalStorageBytes: bytes,
      indexedDbSupported: typeof window !== 'undefined' && 'indexedDB' in window,
      engineName: 'IndexedDB (SQLite Desktop Parity)',
    };
  } catch (err) {
    return {
      chequesCount: 0,
      partiesCount: 0,
      banksCount: 0,
      logsCount: 0,
      pendingSyncCount: 0,
      totalStorageBytes: 0,
      indexedDbSupported: false,
      engineName: 'Fallback Memory Cache',
    };
  }
}
