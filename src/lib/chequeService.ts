import {
  collection,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  query,
  where,
  orderBy,
  runTransaction,
  getDocs,
  getDoc,
  setDoc,
} from 'firebase/firestore';
import { db, auth } from './firebase';
import {
  Bank,
  Cheque,
  ChequeStatus,
  Party,
  PartyType,
  PaymentLog,
  PaymentMode,
  CreateChequeInput,
  RecordPaymentInput,
} from '../types';
import { User } from 'firebase/auth';
import {
  getLocalParties,
  saveLocalParty,
  deleteLocalParty,
  getLocalBanks,
  saveLocalBank,
  deleteLocalBank,
  getLocalCheques,
  saveLocalCheque,
  deleteLocalCheque,
  getLocalPaymentLogs,
  saveLocalPaymentLog,
  deleteLocalPaymentLog,
  bulkUpsertLocal,
  enqueueSyncItem,
} from './offlineDb';
import { syncManager } from './syncWorker';
import { createClient } from '@supabase/supabase-js';

// Initialize and export Supabase client directly without external module dependencies
const supabaseUrl: string =
  (typeof import.meta !== 'undefined' && (import.meta as any).env && (import.meta as any).env.VITE_SUPABASE_URL) ||
  'https://placeholder.supabase.co';
const supabaseAnonKey: string =
  (typeof import.meta !== 'undefined' && (import.meta as any).env && (import.meta as any).env.VITE_SUPABASE_ANON_KEY) ||
  'placeholder';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

/**
 * Inline dummy audit logger mock to prevent missing module errors during Vercel builds
 */
export const auditLogger = {
  log: async (event: any, meta?: any) => {
    if (typeof process !== 'undefined' && process.env?.NODE_ENV !== 'production') {
      console.log('[AuditLog]', event, meta ?? '');
    }
  },
  info: async (msg: string, meta?: any) => {
    if (typeof process !== 'undefined' && process.env?.NODE_ENV !== 'production') {
      console.info('[AuditInfo]', msg, meta ?? '');
    }
  },
  warn: async (warning: string, meta?: any) => {
    console.warn('[AuditWarn]', warning, meta ?? '');
  },
  error: async (err: string, meta?: any) => {
    console.error('[AuditError]', err, meta ?? '');
  },
  recordAction: async (_action: string, _meta?: any) => {},
  audit: async (_action: string, _meta?: any) => {},
};

// Re-export core types for consumers
export type {
  Bank,
  Cheque,
  ChequeStatus,
  Party,
  PaymentLog,
  PaymentMode,
  CreateChequeInput,
  RecordPaymentInput,
};

export const DEFAULT_COMPANY_ID = 'default-company-101';
export const DEFAULT_COMPANY_NAME = 'RS Traders';

// Active in-memory and persisted company tracking
let activeCompanyId: string = (() => {
  if (typeof window !== 'undefined') {
    return localStorage.getItem('active_company_id') || DEFAULT_COMPANY_ID;
  }
  return DEFAULT_COMPANY_ID;
})();

export function setActiveCompanyId(id: string, name?: string) {
  if (!id) return;
  activeCompanyId = id;
  if (typeof window !== 'undefined') {
    localStorage.setItem('active_company_id', id);
    if (name) localStorage.setItem('active_company_name', name);
  }
}

/**
 * Returns the active company_id for the current user session.
 */
export function getCurrentUserCompanyId(): string {
  if (activeCompanyId) return activeCompanyId;
  if (typeof window !== 'undefined') {
    const saved = localStorage.getItem('active_company_id');
    if (saved) {
      activeCompanyId = saved;
      return saved;
    }
  }
  const user = auth.currentUser;
  if (user && user.uid) {
    return `company_${user.uid.slice(0, 10)}`;
  }
  return DEFAULT_COMPANY_ID;
}

/**
 * Synchronize user profile in Firestore and link or retrieve company_id
 */
export async function syncUserCompanyProfile(user: User): Promise<string> {
  try {
    const userDocRef = doc(db, 'users', user.uid);
    const snap = await getDoc(userDocRef);
    if (snap.exists() && snap.data()?.company_id) {
      const cid = snap.data().company_id;
      setActiveCompanyId(cid);
      return cid;
    }
    const currentCid = getCurrentUserCompanyId();
    await setDoc(
      userDocRef,
      {
        uid: user.uid,
        email: user.email || '',
        company_id: currentCid,
        updated_at: new Date().toISOString(),
      },
      { merge: true }
    );
    return currentCid;
  } catch (err) {
    console.warn('Could not sync user profile in firestore:', err);
    return getCurrentUserCompanyId();
  }
}

// Subscriptions: Parties
export function subscribeToParties(
  companyId: string,
  callback: (parties: Party[]) => void
) {
  getLocalParties(companyId)
    .then((cached) => {
      if (cached && cached.length > 0) {
        callback(cached);
      }
    })
    .catch((err) => console.warn('Offline parties read error:', err));

  const partiesRef = collection(db, 'parties');
  const q = query(partiesRef, where('company_id', '==', companyId));
  return onSnapshot(
    q,
    (snapshot) => {
      const parties: Party[] = [];
      snapshot.forEach((docSnap) => {
        const data = docSnap.data();
        parties.push({
          id: docSnap.id,
          company_id: data.company_id,
          name: data.name,
          phone: data.phone || '',
          pan_vat: data.pan_vat || '',
          email: data.email || '',
          created_at: data.created_at || new Date().toISOString(),
        });
      });
      parties.sort((a, b) => a.name.localeCompare(b.name));
      callback(parties);
      bulkUpsertLocal('parties', parties).catch(() => {});
    },
    (err) => {
      console.warn('Network subscriber for parties disconnected (offline mode active):', err);
    }
  );
}

// Subscriptions: Banks
export function subscribeToBanks(
  companyId: string,
  callback: (banks: Bank[]) => void
) {
  getLocalBanks(companyId)
    .then((cached) => {
      if (cached && cached.length > 0) {
        callback(cached);
      }
    })
    .catch((err) => console.warn('Offline banks read error:', err));

  const banksRef = collection(db, 'banks');
  const q = query(banksRef, where('company_id', '==', companyId));
  return onSnapshot(
    q,
    (snapshot) => {
      const banks: Bank[] = [];
      snapshot.forEach((docSnap) => {
        const data = docSnap.data();
        banks.push({
          id: docSnap.id,
          company_id: data.company_id,
          name: data.name,
          code: data.code || '',
          created_at: data.created_at || new Date().toISOString(),
        });
      });
      banks.sort((a, b) => a.name.localeCompare(b.name));
      callback(banks);
      bulkUpsertLocal('banks', banks).catch(() => {});
    },
    (err) => {
      console.warn('Network subscriber for banks disconnected (offline mode active):', err);
    }
  );
}

// Subscriptions: Cheques
export function subscribeToCheques(
  companyId: string,
  callback: (cheques: Cheque[]) => void
) {
  getLocalCheques(companyId)
    .then((cached) => {
      if (cached && cached.length > 0) {
        callback(cached);
      }
    })
    .catch((err) => console.warn('Offline cheques read error:', err));

  const chequesRef = collection(db, 'cheques');
  const q = query(chequesRef, where('company_id', '==', companyId));
  return onSnapshot(
    q,
    (snapshot) => {
      const cheques: Cheque[] = [];
      snapshot.forEach((docSnap) => {
        const data = docSnap.data();
        cheques.push({
          id: docSnap.id,
          company_id: data.company_id,
          cheque_number: data.cheque_number,
          bill_number: data.bill_number || '',
          bank_id: data.bank_id || null,
          party_id: data.party_id || null,
          amount: Number(data.amount) || 0,
          remaining_amount: Number(data.remaining_amount) ?? Number(data.amount) ?? 0,
          issue_date_bs: data.issue_date_bs || '',
          issue_date_ad: data.issue_date_ad || '',
          due_date_bs: data.due_date_bs || '',
          due_date_ad: data.due_date_ad || '',
          status: (data.status as ChequeStatus) || 'Pending',
          notes: data.notes || '',
          created_at: data.created_at || new Date().toISOString(),
        });
      });
      cheques.sort(
        (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );
      callback(cheques);
      bulkUpsertLocal('cheques', cheques).catch(() => {});
    },
    (err) => {
      console.warn('Network subscriber for cheques disconnected (offline mode active):', err);
    }
  );
}

// Cross-tenant cheque subscriber
export function subscribeToAllCheques(callback: (cheques: Cheque[]) => void) {
  const chequesRef = collection(db, 'cheques');
  return onSnapshot(
    chequesRef,
    (snapshot) => {
      const cheques: Cheque[] = [];
      snapshot.forEach((docSnap) => {
        const data = docSnap.data();
        cheques.push({
          id: docSnap.id,
          company_id: data.company_id,
          cheque_number: data.cheque_number,
          bill_number: data.bill_number || '',
          bank_id: data.bank_id || null,
          party_id: data.party_id || null,
          amount: Number(data.amount) || 0,
          remaining_amount: Number(data.remaining_amount) ?? Number(data.amount) ?? 0,
          issue_date_bs: data.issue_date_bs || '',
          issue_date_ad: data.issue_date_ad || '',
          due_date_bs: data.due_date_bs || '',
          due_date_ad: data.due_date_ad || '',
          status: (data.status as ChequeStatus) || 'Pending',
          notes: data.notes || '',
          created_at: data.created_at || new Date().toISOString(),
        });
      });
      callback(cheques);
    },
    (err) => {
      console.error('Error fetching all cheques:', err);
    }
  );
}

// Payment logs subscribers
export function subscribeToPaymentLogs(
  chequeId: string,
  callback: (logs: PaymentLog[]) => void
) {
  const logsRef = collection(db, 'payment_logs');
  const q = query(logsRef, where('cheque_id', '==', chequeId));
  return onSnapshot(
    q,
    (snapshot) => {
      const logs: PaymentLog[] = [];
      snapshot.forEach((docSnap) => {
        const data = docSnap.data();
        logs.push({
          id: docSnap.id,
          cheque_id: data.cheque_id,
          company_id: data.company_id,
          amount: Number(data.amount) || 0,
          payment_mode: data.payment_mode as PaymentMode,
          payment_date_bs: data.payment_date_bs || '',
          payment_date_ad: data.payment_date_ad || '',
          notes: data.notes || '',
          created_at: data.created_at || new Date().toISOString(),
        });
      });
      logs.sort(
        (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );
      callback(logs);
    },
    (err) => {
      console.error('Error fetching payment logs:', err);
    }
  );
}

export function subscribeToAllPaymentLogs(
  companyId: string,
  callback: (logs: PaymentLog[]) => void
) {
  const logsRef = collection(db, 'payment_logs');
  const q = query(logsRef, where('company_id', '==', companyId));
  return onSnapshot(
    q,
    (snapshot) => {
      const logs: PaymentLog[] = [];
      snapshot.forEach((docSnap) => {
        const data = docSnap.data();
        logs.push({
          id: docSnap.id,
          cheque_id: data.cheque_id,
          company_id: data.company_id,
          amount: Number(data.amount) || 0,
          payment_mode: data.payment_mode as PaymentMode,
          payment_date_bs: data.payment_date_bs || '',
          payment_date_ad: data.payment_date_ad || '',
          notes: data.notes || '',
          created_at: data.created_at || new Date().toISOString(),
        });
      });
      logs.sort(
        (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );
      callback(logs);
    },
    (err) => {
      console.error('Error fetching all payment logs:', err);
    }
  );
}

// Actions: Parties
export interface AddPartyInput {
  name: string;
  phone?: string;
  address?: string;
  pan_vat?: string;
  party_type?: PartyType;
  company_id?: string;
}

export async function addParty(
  companyIdOrNameOrInput: string | AddPartyInput,
  nameOrPhone?: string,
  phoneArg?: string
): Promise<string> {
  let finalCompanyId = '';
  let finalName = '';
  let finalPhone = '';
  let finalAddress = '';
  let finalPanVat = '';
  let finalPartyType: PartyType = 'Sundry Debtors';

  if (typeof companyIdOrNameOrInput === 'object' && companyIdOrNameOrInput !== null) {
    finalName = companyIdOrNameOrInput.name || '';
    finalPhone = companyIdOrNameOrInput.phone || '';
    finalAddress = companyIdOrNameOrInput.address || '';
    finalPanVat = companyIdOrNameOrInput.pan_vat || '';
    finalPartyType = companyIdOrNameOrInput.party_type || 'Sundry Debtors';
    finalCompanyId = companyIdOrNameOrInput.company_id || getCurrentUserCompanyId();
  } else if (typeof companyIdOrNameOrInput === 'string' && nameOrPhone !== undefined && phoneArg !== undefined) {
    finalCompanyId = companyIdOrNameOrInput || getCurrentUserCompanyId();
    finalName = nameOrPhone;
    finalPhone = phoneArg;
  } else if (typeof companyIdOrNameOrInput === 'string' && nameOrPhone !== undefined && phoneArg === undefined) {
    if (
      companyIdOrNameOrInput.startsWith('comp') ||
      companyIdOrNameOrInput.startsWith('default') ||
      companyIdOrNameOrInput === getCurrentUserCompanyId()
    ) {
      finalCompanyId = companyIdOrNameOrInput;
      finalName = nameOrPhone;
      finalPhone = '';
    } else {
      finalCompanyId = getCurrentUserCompanyId();
      finalName = companyIdOrNameOrInput;
      finalPhone = nameOrPhone;
    }
  } else if (typeof companyIdOrNameOrInput === 'string') {
    finalCompanyId = getCurrentUserCompanyId();
    finalName = companyIdOrNameOrInput;
    finalPhone = '';
  }

  if (!finalCompanyId || !finalCompanyId.trim()) {
    finalCompanyId = getCurrentUserCompanyId();
  }

  const newId = `party_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const party: Party = {
    id: newId,
    company_id: finalCompanyId.trim(),
    name: finalName.trim(),
    phone: (finalPhone || '').trim(),
    address: (finalAddress || '').trim(),
    pan_vat: (finalPanVat || '').trim(),
    party_type: finalPartyType,
    created_at: new Date().toISOString(),
  };

  const isOnline = syncManager.getEffectiveOnline();
  await saveLocalParty(party, !isOnline);

  if (isOnline) {
    try {
      await setDoc(doc(db, 'parties', newId), {
        company_id: party.company_id,
        name: party.name,
        phone: party.phone,
        pan_vat: party.pan_vat,
        party_type: party.party_type,
        created_at: party.created_at,
      });
    } catch (err) {
      console.warn('Network party creation failed; queued for sync worker:', err);
      await enqueueSyncItem({
        entity_type: 'parties',
        operation: 'create',
        data: party,
        company_id: party.company_id,
      });
    }
  } else {
    await enqueueSyncItem({
      entity_type: 'parties',
      operation: 'create',
      data: party,
      company_id: party.company_id,
    });
  }

  return newId;
}

export async function updateParty(
  id: string,
  name: string,
  phone: string = '',
  pan_vat: string = '',
  party_type?: PartyType,
  address?: string
) {
  const isOnline = syncManager.getEffectiveOnline();
  const parties = await getLocalParties(activeCompanyId);
  const found = parties.find((p) => p.id === id);
  const resolvedPartyType = party_type || found?.party_type || 'Sundry Debtors';
  const resolvedAddress = address !== undefined ? address.trim() : (found?.address || '');
  if (found) {
    await saveLocalParty({
      ...found,
      name: name.trim(),
      phone: phone.trim(),
      address: resolvedAddress,
      pan_vat: pan_vat.trim(),
      party_type: resolvedPartyType,
    }, !isOnline);
  }

  if (isOnline) {
    try {
      const partyRef = doc(db, 'parties', id);
      await updateDoc(partyRef, {
        name: name.trim(),
        phone: phone.trim(),
        address: resolvedAddress,
        pan_vat: pan_vat.trim(),
        party_type: resolvedPartyType,
      });
    } catch (err) {
      await enqueueSyncItem({
        entity_type: 'parties',
        operation: 'update',
        data: { id, name: name.trim(), phone: phone.trim(), address: resolvedAddress, pan_vat: pan_vat.trim(), party_type: resolvedPartyType },
        company_id: activeCompanyId,
      });
    }
  } else {
    await enqueueSyncItem({
      entity_type: 'parties',
      operation: 'update',
      data: { id, name: name.trim(), phone: phone.trim(), address: resolvedAddress, pan_vat: pan_vat.trim(), party_type: resolvedPartyType },
      company_id: activeCompanyId,
    });
  }
}

export async function deleteParty(id: string) {
  await deleteLocalParty(id);
  const isOnline = syncManager.getEffectiveOnline();
  if (isOnline) {
    try {
      await deleteDoc(doc(db, 'parties', id));
    } catch (err) {
      await enqueueSyncItem({
        entity_type: 'parties',
        operation: 'delete',
        data: { id },
        company_id: activeCompanyId,
      });
    }
  } else {
    await enqueueSyncItem({
      entity_type: 'parties',
      operation: 'delete',
      data: { id },
      company_id: activeCompanyId,
    });
  }
}

// Actions: Banks
export async function addBank(companyId: string, name: string, code: string = ''): Promise<string> {
  const newId = `bank_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const bank: Bank = {
    id: newId,
    company_id: companyId,
    name: name.trim(),
    code: code.trim().toUpperCase(),
    created_at: new Date().toISOString(),
  };

  const isOnline = syncManager.getEffectiveOnline();
  await saveLocalBank(bank, !isOnline);

  if (isOnline) {
    try {
      await setDoc(doc(db, 'banks', newId), {
        company_id: bank.company_id,
        name: bank.name,
        code: bank.code,
        created_at: bank.created_at,
      });
    } catch (err) {
      console.warn('Network bank creation failed; queued for sync worker:', err);
      await enqueueSyncItem({
        entity_type: 'banks',
        operation: 'create',
        data: bank,
        company_id: bank.company_id,
      });
    }
  } else {
    await enqueueSyncItem({
      entity_type: 'banks',
      operation: 'create',
      data: bank,
      company_id: bank.company_id,
    });
  }

  return newId;
}

export async function updateBank(id: string, name: string, code: string = '') {
  const isOnline = syncManager.getEffectiveOnline();
  const banks = await getLocalBanks(activeCompanyId);
  const found = banks.find((b) => b.id === id);
  if (found) {
    await saveLocalBank({ ...found, name: name.trim(), code: code.trim().toUpperCase() }, !isOnline);
  }

  if (isOnline) {
    try {
      const bankRef = doc(db, 'banks', id);
      await updateDoc(bankRef, {
        name: name.trim(),
        code: code.trim().toUpperCase(),
      });
    } catch (err) {
      await enqueueSyncItem({
        entity_type: 'banks',
        operation: 'update',
        data: { id, name: name.trim(), code: code.trim().toUpperCase() },
        company_id: activeCompanyId,
      });
    }
  } else {
    await enqueueSyncItem({
      entity_type: 'banks',
      operation: 'update',
      data: { id, name: name.trim(), code: code.trim().toUpperCase() },
      company_id: activeCompanyId,
    });
  }
}

export async function deleteBank(id: string) {
  await deleteLocalBank(id);
  const isOnline = syncManager.getEffectiveOnline();
  if (isOnline) {
    try {
      await deleteDoc(doc(db, 'banks', id));
    } catch (err) {
      await enqueueSyncItem({
        entity_type: 'banks',
        operation: 'delete',
        data: { id },
        company_id: activeCompanyId,
      });
    }
  } else {
    await enqueueSyncItem({
      entity_type: 'banks',
      operation: 'delete',
      data: { id },
      company_id: activeCompanyId,
    });
  }
}

// Actions: Cheques
export async function createCheque(input: CreateChequeInput): Promise<string> {
  const newId = `chq_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const cheque: Cheque = {
    id: newId,
    company_id: input.company_id,
    cheque_number: input.cheque_number.trim(),
    bill_number: (input.bill_number || '').trim(),
    account_number: (input.account_number || '').trim(),
    bank_id: input.bank_id || null,
    party_id: input.party_id || null,
    amount: input.amount,
    remaining_amount: input.amount,
    issue_date_bs: input.issue_date_bs,
    issue_date_ad: input.issue_date_ad,
    due_date_bs: input.due_date_bs,
    due_date_ad: input.due_date_ad,
    status: input.status || 'Pending',
    notes: (input.notes || '').trim(),
    entered_by: input.entered_by || undefined,
    created_at: new Date().toISOString(),
  };

  const isOnline = syncManager.getEffectiveOnline();
  await saveLocalCheque(cheque, !isOnline);

  if (isOnline) {
    try {
      await setDoc(doc(db, 'cheques', newId), {
        company_id: cheque.company_id,
        cheque_number: cheque.cheque_number,
        bill_number: cheque.bill_number,
        account_number: cheque.account_number,
        bank_id: cheque.bank_id,
        party_id: cheque.party_id,
        amount: cheque.amount,
        remaining_amount: cheque.remaining_amount,
        issue_date_bs: cheque.issue_date_bs,
        issue_date_ad: cheque.issue_date_ad,
        due_date_bs: cheque.due_date_bs,
        due_date_ad: cheque.due_date_ad,
        status: cheque.status,
        notes: cheque.notes,
        entered_by: cheque.entered_by || null,
        created_at: cheque.created_at,
      });
    } catch (err) {
      console.warn('Network cheque creation failed; queued for sync worker:', err);
      await enqueueSyncItem({
        entity_type: 'cheques',
        operation: 'create',
        data: cheque,
        company_id: cheque.company_id,
      });
    }
  } else {
    await enqueueSyncItem({
      entity_type: 'cheques',
      operation: 'create',
      data: cheque,
      company_id: cheque.company_id,
    });
  }

  await auditLogger.log('CREATE_CHEQUE', {
    cheque_id: newId,
    company_id: input.company_id,
    cheque_number: input.cheque_number,
    amount: input.amount,
  });

  return newId;
}

export async function updateCheque(id: string, partial: Partial<Cheque>): Promise<void> {
  const isOnline = syncManager.getEffectiveOnline();
  const cheques = await getLocalCheques(activeCompanyId);
  const found = cheques.find((c) => c.id === id);
  if (found) {
    const updated = { ...found, ...partial };
    await saveLocalCheque(updated, !isOnline);
  }

  if (isOnline) {
    try {
      const chequeRef = doc(db, 'cheques', id);
      const dataToUpdate: Record<string, any> = { ...partial };
      delete dataToUpdate.id;
      await updateDoc(chequeRef, dataToUpdate);
    } catch (err) {
      await enqueueSyncItem({
        entity_type: 'cheques',
        operation: 'update',
        data: { id, ...partial },
        company_id: activeCompanyId,
      });
    }
  } else {
    await enqueueSyncItem({
      entity_type: 'cheques',
      operation: 'update',
      data: { id, ...partial },
      company_id: activeCompanyId,
    });
  }

  await auditLogger.log('UPDATE_CHEQUE', {
    cheque_id: id,
    company_id: activeCompanyId,
    partial,
  });
}

export async function updateChequeStatus(id: string, status: ChequeStatus): Promise<void> {
  await updateCheque(id, { status });
}

export async function getCheques(companyId?: string): Promise<Cheque[]> {
  const cid = companyId || getCurrentUserCompanyId();
  try {
    const local = await getLocalCheques(cid);
    if (local && local.length > 0) {
      return local;
    }
  } catch (e) {
    console.warn('Local cheques retrieval warning:', e);
  }

  try {
    const chequesRef = collection(db, 'cheques');
    const q = query(chequesRef, where('company_id', '==', cid));
    const snap = await getDocs(q);
    const cheques: Cheque[] = [];
    snap.forEach((docSnap) => {
      const data = docSnap.data();
      cheques.push({
        id: docSnap.id,
        company_id: data.company_id,
        cheque_number: data.cheque_number,
        bill_number: data.bill_number || '',
        bank_id: data.bank_id || null,
        party_id: data.party_id || null,
        amount: Number(data.amount) || 0,
        remaining_amount: Number(data.remaining_amount) ?? Number(data.amount) ?? 0,
        issue_date_bs: data.issue_date_bs || '',
        issue_date_ad: data.issue_date_ad || '',
        due_date_bs: data.due_date_bs || '',
        due_date_ad: data.due_date_ad || '',
        status: (data.status as ChequeStatus) || 'Pending',
        notes: data.notes || '',
        created_at: data.created_at || new Date().toISOString(),
      });
    });
    return cheques;
  } catch (err) {
    console.error('Error fetching cheques from remote:', err);
    return [];
  }
}

export async function deleteCheque(id: string): Promise<void> {
  await deleteLocalCheque(id);
  const isOnline = syncManager.getEffectiveOnline();

  if (isOnline) {
    try {
      const logsQuery = query(collection(db, 'payment_logs'), where('cheque_id', '==', id));
      const snap = await getDocs(logsQuery);
      const deletePromises = snap.docs.map((d) => deleteDoc(d.ref));
      await Promise.all(deletePromises);
      await deleteDoc(doc(db, 'cheques', id));
    } catch (err) {
      await enqueueSyncItem({
        entity_type: 'cheques',
        operation: 'delete',
        data: { id },
        company_id: activeCompanyId,
      });
    }
  } else {
    await enqueueSyncItem({
      entity_type: 'cheques',
      operation: 'delete',
      data: { id },
      company_id: activeCompanyId,
    });
  }

  await auditLogger.log('DELETE_CHEQUE', {
    cheque_id: id,
    company_id: activeCompanyId,
  });
}

// Actions: Partial Payment Logs
export async function recordPayment(
  input: RecordPaymentInput
): Promise<{ remaining_amount: number; status: ChequeStatus }> {
  const isOnline = syncManager.getEffectiveOnline();

  let finalRemaining = 0;
  let finalStatus: ChequeStatus = 'Pending';

  const localCheques = await getLocalCheques(input.company_id);
  const matchedCheque = localCheques.find((c) => c.id === input.cheque_id);
  if (matchedCheque) {
    const currentRemaining = Number(matchedCheque.remaining_amount) ?? Number(matchedCheque.amount);
    const newRemaining = Math.max(0, currentRemaining - input.amount);
    const newStatus: ChequeStatus = newRemaining <= 0.001 ? 'Cleared' : 'Partially Paid';
    finalRemaining = newRemaining;
    finalStatus = newStatus;

    const updatedCheque: Cheque = {
      ...matchedCheque,
      remaining_amount: Math.round(newRemaining * 100) / 100,
      status: newStatus,
    };
    await saveLocalCheque(updatedCheque, !isOnline);

    const logId = `pay_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const newLog: PaymentLog = {
      id: logId,
      cheque_id: input.cheque_id,
      company_id: input.company_id,
      party_id: input.party_id || matchedCheque.party_id || undefined,
      amount: input.amount,
      payment_mode: input.payment_mode,
      payment_type: input.payment_type || 'Received',
      payment_date_bs: input.payment_date_bs,
      payment_date_ad: input.payment_date_ad,
      notes: (input.notes || '').trim(),
      recorded_by: input.recorded_by || 'Staff',
      created_at: new Date().toISOString(),
    };
    await saveLocalPaymentLog(newLog, !isOnline);
  }

  if (isOnline) {
    try {
      const chequeRef = doc(db, 'cheques', input.cheque_id);
      await runTransaction(db, async (transaction) => {
        const chequeDoc = await transaction.get(chequeRef);
        if (!chequeDoc.exists()) {
          throw new Error('Cheque document does not exist!');
        }

        const chequeData = chequeDoc.data();
        const currentRemaining = Number(chequeData.remaining_amount) ?? Number(chequeData.amount);
        const totalAmount = Number(chequeData.amount);

        if (input.amount <= 0) {
          throw new Error('Payment amount must be greater than zero.');
        }
        if (input.amount > currentRemaining + 0.001) {
          throw new Error(`Payment amount cannot exceed remaining balance.`);
        }

        const newRemaining = Math.max(0, currentRemaining - input.amount);
        let newStatus: ChequeStatus = 'Partially Paid';
        if (newRemaining <= 0.001) {
          newStatus = 'Cleared';
        } else if (newRemaining === totalAmount) {
          newStatus = 'Pending';
        }
        finalRemaining = newRemaining;
        finalStatus = newStatus;

        const logRef = doc(collection(db, 'payment_logs'));
        transaction.set(logRef, {
          cheque_id: input.cheque_id,
          company_id: input.company_id,
          party_id: input.party_id || chequeData.party_id || null,
          amount: input.amount,
          payment_mode: input.payment_mode,
          payment_type: input.payment_type || 'Received',
          payment_date_bs: input.payment_date_bs,
          payment_date_ad: input.payment_date_ad,
          notes: (input.notes || '').trim(),
          recorded_by: input.recorded_by || 'Staff',
          created_at: new Date().toISOString(),
        });

        transaction.update(chequeRef, {
          remaining_amount: Math.round(newRemaining * 100) / 100,
          status: newStatus,
        });
      });
    } catch (err) {
      console.warn('Network payment record failed, queued for sync worker:', err);
      await enqueueSyncItem({
        entity_type: 'payment_logs',
        operation: 'create',
        data: input,
        company_id: input.company_id,
      });
    }
  } else {
    await enqueueSyncItem({
      entity_type: 'payment_logs',
      operation: 'create',
      data: input,
      company_id: input.company_id,
    });
  }

  await auditLogger.log('RECORD_PAYMENT', {
    cheque_id: input.cheque_id,
    company_id: input.company_id,
    amount: input.amount,
    payment_mode: input.payment_mode,
    remaining: finalRemaining,
    status: finalStatus,
  });

  return {
    remaining_amount: Math.round(finalRemaining * 100) / 100,
    status: finalStatus,
  };
}

export async function deletePaymentLog(log: PaymentLog): Promise<void> {
  const chequeRef = doc(db, 'cheques', log.cheque_id);
  await runTransaction(db, async (transaction) => {
    const chequeDoc = await transaction.get(chequeRef);
    if (chequeDoc.exists()) {
      const data = chequeDoc.data();
      const currentRemaining = Number(data.remaining_amount) ?? 0;
      const totalAmount = Number(data.amount) ?? 0;
      const restoredRemaining = Math.min(totalAmount, currentRemaining + log.amount);

      let newStatus: ChequeStatus = 'Partially Paid';
      if (restoredRemaining >= totalAmount - 0.001) {
        newStatus = 'Pending';
      } else if (restoredRemaining <= 0.001) {
        newStatus = 'Cleared';
      }

      transaction.update(chequeRef, {
        remaining_amount: Math.round(restoredRemaining * 100) / 100,
        status: newStatus,
      });
    }
    transaction.delete(doc(db, 'payment_logs', log.id));
  });

  await auditLogger.log('DELETE_PAYMENT_LOG', {
    log_id: log.id,
    cheque_id: log.cheque_id,
  });
}

// Optional chequeService object bundle for callers using object syntax
export const chequeService = {
  getCheques,
  createCheque,
  updateCheque,
  updateChequeStatus,
  deleteCheque,
  recordPayment,
  deletePaymentLog,
};

// Seed initial database demo records
export async function seedDemoDataIfEmpty(companyId: string): Promise<boolean> {
  try {
    const partiesCheck = await getDocs(query(collection(db, 'parties'), where('company_id', '==', companyId)));
    if (!partiesCheck.empty) {
      return false;
    }

    const bank1 = await addBank(companyId, 'Nabil Bank Ltd.', 'NABIL');
    const bank2 = await addBank(companyId, 'Global IME Bank', 'GBIME');
    const bank3 = await addBank(companyId, 'NIC Asia Bank', 'NICA');

    const party1 = await addParty(companyId, 'Everest Hardware & Sanitary', '9841234567');
    const party2 = await addParty(companyId, 'Annapurna Trade International', '9801987654');
    const party3 = await addParty(companyId, 'Himalaya Distributors Pvt. Ltd.', '9851020304');

    const chq1Id = await createCheque({
      company_id: companyId,
      cheque_number: 'CHQ-880291',
      bill_number: 'INV-2081-441',
      bank_id: bank1,
      party_id: party1,
      amount: 150000,
      issue_date_bs: '2081-05-15',
      issue_date_ad: '2024-08-31',
      due_date_bs: '2081-06-25',
      due_date_ad: '2024-10-11',
      notes: 'Advance payment for sanitary pipe fittings order',
    });

    const chq2Id = await createCheque({
      company_id: companyId,
      cheque_number: 'CHQ-993412',
      bill_number: 'INV-2081-508',
      bank_id: bank2,
      party_id: party2,
      amount: 280000,
      issue_date_bs: '2081-05-10',
      issue_date_ad: '2024-08-26',
      due_date_bs: '2081-06-15',
      due_date_ad: '2024-10-01',
      notes: 'Bulk paint consignment delivery payment',
    });

    await recordPayment({
      cheque_id: chq2Id,
      company_id: companyId,
      amount: 100000,
      payment_mode: 'IPS',
      payment_date_bs: '2081-05-20',
      payment_date_ad: '2024-09-05',
      notes: '1st installment via ConnectIPS',
    });

    const chq3Id = await createCheque({
      company_id: companyId,
      cheque_number: 'CHQ-445102',
      bill_number: 'INV-2081-312',
      bank_id: bank3,
      party_id: party3,
      amount: 75000,
      issue_date_bs: '2081-04-20',
      issue_date_ad: '2024-08-05',
      due_date_bs: '2081-05-20',
      due_date_ad: '2024-09-05',
      notes: 'Office stationery supplies',
    });

    await recordPayment({
      cheque_id: chq3Id,
      company_id: companyId,
      amount: 75000,
      payment_mode: 'Bank Deposit',
      payment_date_bs: '2081-05-20',
      payment_date_ad: '2024-09-05',
      notes: 'Fully cleared via counter deposit slip #4102',
    });

    return true;
  } catch (err) {
    console.error('Error seeding demo data:', err);
    return false;
  }
}
