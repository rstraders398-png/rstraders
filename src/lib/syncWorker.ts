import { useState, useEffect, useCallback } from 'react';
import {
  getPendingSyncQueue,
  removePendingSyncItem,
  bulkUpsertLocal,
  SyncQueueItem,
  getLocalCheques,
  getLocalParties,
  getLocalBanks,
  getLocalPaymentLogs,
} from './offlineDb';
import { createCloudSnapshotBackup } from './backupEngine';
import { db } from './firebase';
import {
  collection,
  doc,
  setDoc,
  updateDoc,
  deleteDoc,
  getDocs,
  query,
  where,
} from 'firebase/firestore';
import { Cheque, Party, Bank, PaymentLog } from '../types';

export interface SyncState {
  isOnline: boolean;
  isSimulatedOffline: boolean;
  isSyncing: boolean;
  pendingCount: number;
  lastSyncedAt: string | null;
  lastError: string | null;
}

// Global in-memory sync manager
class SyncWorkerManager {
  private isOnlineInternal: boolean = typeof navigator !== 'undefined' ? navigator.onLine : true;
  private isSimulatedOffline: boolean = false;
  private isSyncing: boolean = false;
  private pendingCount: number = 0;
  private lastSyncedAt: string | null = null;
  private lastError: string | null = null;
  private listeners: Array<(state: SyncState) => void> = [];
  private syncTimer: NodeJS.Timeout | null = null;

  constructor() {
    if (typeof window !== 'undefined') {
      // Check saved simulation state
      const sim = localStorage.getItem('chequedesk_simulated_offline');
      this.isSimulatedOffline = sim === 'true';

      const savedSyncAt = localStorage.getItem('chequedesk_last_synced_at');
      this.lastSyncedAt = savedSyncAt || null;

      window.addEventListener('online', () => this.handleNetworkChange(true));
      window.addEventListener('offline', () => this.handleNetworkChange(false));
      window.addEventListener('chequedesk:sync_queue_changed', () => this.refreshPendingCount());

      // Periodic check
      this.syncTimer = setInterval(() => {
        if (this.getEffectiveOnline() && !this.isSyncing) {
          this.checkAndSync();
        }
      }, 45000);

      this.refreshPendingCount();
    }
  }

  public getEffectiveOnline(): boolean {
    return this.isOnlineInternal && !this.isSimulatedOffline;
  }

  public getState(): SyncState {
    return {
      isOnline: this.getEffectiveOnline(),
      isSimulatedOffline: this.isSimulatedOffline,
      isSyncing: this.isSyncing,
      pendingCount: this.pendingCount,
      lastSyncedAt: this.lastSyncedAt,
      lastError: this.lastError,
    };
  }

  public subscribe(listener: (state: SyncState) => void) {
    this.listeners.push(listener);
    listener(this.getState());
    return () => {
      this.listeners = this.listeners.filter((l) => l !== listener);
    };
  }

  private notify() {
    const state = this.getState();
    this.listeners.forEach((l) => l(state));
  }

  public setSimulatedOffline(simulated: boolean) {
    this.isSimulatedOffline = simulated;
    if (typeof window !== 'undefined') {
      localStorage.setItem('chequedesk_simulated_offline', simulated ? 'true' : 'false');
    }
    this.notify();
    if (!simulated && this.isOnlineInternal) {
      this.triggerSync();
    }
  }

  private handleNetworkChange(online: boolean) {
    this.isOnlineInternal = online;
    this.notify();
    if (this.getEffectiveOnline()) {
      this.triggerSync();
    }
  }

  public async refreshPendingCount() {
    const queue = await getPendingSyncQueue();
    this.pendingCount = queue.length;
    this.notify();
  }

  public async checkAndSync() {
    const queue = await getPendingSyncQueue();
    this.pendingCount = queue.length;
    if (queue.length > 0) {
      await this.triggerSync();
    }
  }

  /**
   * Main Two-Way Sync Routine
   */
  public async triggerSync(companyId?: string): Promise<{ success: boolean; pushedCount: number; message: string }> {
    if (!this.getEffectiveOnline()) {
      return {
        success: false,
        pushedCount: 0,
        message: 'System is running in Offline Mode. Working locally.',
      };
    }

    if (this.isSyncing) {
      return { success: true, pushedCount: 0, message: 'Sync already in progress' };
    }

    this.isSyncing = true;
    this.lastError = null;
    this.notify();

    let pushed = 0;

    try {
      // STEP 1: Push pending offline mutations
      const queue = await getPendingSyncQueue(companyId);

      for (const item of queue) {
        try {
          await this.processQueueItem(item);
          await removePendingSyncItem(item.id);
          pushed++;
        } catch (itemErr: any) {
          console.warn('[SyncWorker] Error syncing item', item.id, itemErr);
          // If permission or document issue, break or keep in queue
        }
      }

      // STEP 2: Pull latest cloud data if companyId provided
      if (companyId) {
        await this.pullCloudData(companyId);
        // STEP 3: Create instant cloud snapshot
        await createCloudSnapshotBackup(companyId);
      }

      this.lastSyncedAt = new Date().toISOString();
      if (typeof window !== 'undefined') {
        localStorage.setItem('chequedesk_last_synced_at', this.lastSyncedAt);
      }
      this.pendingCount = (await getPendingSyncQueue(companyId)).length;
      this.isSyncing = false;
      this.notify();

      // Broadcast sync completion
      window.dispatchEvent(
        new CustomEvent('chequedesk:sync_completed', {
          detail: { pushedCount: pushed, syncedAt: this.lastSyncedAt },
        })
      );

      return {
        success: true,
        pushedCount: pushed,
        message: `Sync successful! ${pushed} local mutations uploaded. Cloud snapshot created.`,
      };
    } catch (err: any) {
      console.error('[SyncWorker] Sync failure:', err);
      this.lastError = err.message || 'Sync failed';
      this.isSyncing = false;
      this.notify();
      return {
        success: false,
        pushedCount: pushed,
        message: this.lastError || 'Synchronization error',
      };
    }
  }

  private async processQueueItem(item: SyncQueueItem) {
    const { entity, action, docId, data } = item;

    if (entity === 'cheque') {
      const ref = doc(db, 'cheques', docId);
      if (action === 'create' || action === 'update') {
        await setDoc(ref, data, { merge: true });
      } else if (action === 'delete') {
        await deleteDoc(ref);
      }
    } else if (entity === 'party') {
      const ref = doc(db, 'parties', docId);
      if (action === 'create' || action === 'update') {
        await setDoc(ref, data, { merge: true });
      } else if (action === 'delete') {
        await deleteDoc(ref);
      }
    } else if (entity === 'bank') {
      const ref = doc(db, 'banks', docId);
      if (action === 'create' || action === 'update') {
        await setDoc(ref, data, { merge: true });
      } else if (action === 'delete') {
        await deleteDoc(ref);
      }
    } else if (entity === 'payment_log') {
      const ref = doc(db, 'payment_logs', docId);
      if (action === 'create' || action === 'update') {
        await setDoc(ref, data, { merge: true });
      } else if (action === 'delete') {
        await deleteDoc(ref);
      }
    }
  }

  private async pullCloudData(companyId: string) {
    try {
      // Pull cheques
      const chequesQuery = query(collection(db, 'cheques'), where('company_id', '==', companyId));
      const chequesSnap = await getDocs(chequesQuery);
      const cloudCheques: Cheque[] = [];
      chequesSnap.forEach((d) => {
        cloudCheques.push({ id: d.id, ...d.data() } as Cheque);
      });
      if (cloudCheques.length > 0) {
        await bulkUpsertLocal('cheques', cloudCheques);
      }

      // Pull parties
      const partiesQuery = query(collection(db, 'parties'), where('company_id', '==', companyId));
      const partiesSnap = await getDocs(partiesQuery);
      const cloudParties: Party[] = [];
      partiesSnap.forEach((d) => {
        cloudParties.push({ id: d.id, ...d.data() } as Party);
      });
      if (cloudParties.length > 0) {
        await bulkUpsertLocal('parties', cloudParties);
      }

      // Pull banks
      const banksQuery = query(collection(db, 'banks'), where('company_id', '==', companyId));
      const banksSnap = await getDocs(banksQuery);
      const cloudBanks: Bank[] = [];
      banksSnap.forEach((d) => {
        cloudBanks.push({ id: d.id, ...d.data() } as Bank);
      });
      if (cloudBanks.length > 0) {
        await bulkUpsertLocal('banks', cloudBanks);
      }

      // Pull payment logs
      const logsQuery = query(collection(db, 'payment_logs'), where('company_id', '==', companyId));
      const logsSnap = await getDocs(logsQuery);
      const cloudLogs: PaymentLog[] = [];
      logsSnap.forEach((d) => {
        cloudLogs.push({ id: d.id, ...d.data() } as PaymentLog);
      });
      if (cloudLogs.length > 0) {
        await bulkUpsertLocal('payment_logs', cloudLogs);
      }
    } catch (err) {
      console.warn('[SyncWorker] Could not pull cloud data:', err);
    }
  }
}

export const syncManager = new SyncWorkerManager();

/**
 * React Hook to subscribe to real-time sync & online status
 */
export function useSyncStatus(companyId?: string) {
  const [status, setStatus] = useState<SyncState>(syncManager.getState());

  useEffect(() => {
    const unsub = syncManager.subscribe((newStatus) => {
      setStatus(newStatus);
    });
    return unsub;
  }, []);

  const triggerManualSync = useCallback(() => {
    return syncManager.triggerSync(companyId);
  }, [companyId]);

  const toggleSimulatedOffline = useCallback(() => {
    syncManager.setSimulatedOffline(!status.isSimulatedOffline);
  }, [status.isSimulatedOffline]);

  return {
    ...status,
    triggerManualSync,
    toggleSimulatedOffline,
  };
}
