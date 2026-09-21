import {
  collection,
  doc,
  addDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  query,
  where,
  getDocs,
  getDoc,
} from 'firebase/firestore';
import { db, auth } from './firebase';
import {
  Company,
  AppUser,
  AuditLog,
  SupportTicket,
  UserRole,
  SubscriptionPlan,
  SubscriptionStatus,
  AuditEventType,
  CompanyFeatures,
  DEFAULT_COMPANY_FEATURES,
  SystemRelease,
} from '../types';
import { User } from 'firebase/auth';
import { getCurrentAdDate, getCurrentBsDate } from './dateUtils';

// Super Admin / Developer authorized emails
export const SUPER_ADMIN_EMAILS = [
  'rstraders398@gmail.com',
  'developer@chequedesk.com',
  'admin@chequedesk.com',
  'kuber@chequedesk.com',
];

// Impersonation state keys
const IMPERSONATION_KEY = 'chequedesk_impersonation';
const DEV_OVERRIDE_KEY = 'chequedesk_superadmin_dev_mode';
export const AUTH_SESSION_KEY = 'chequedesk_auth_session';

export interface LoginCredentials {
  companyCode?: string;
  username: string;
  password: string;
}

export interface AuthSession {
  uid: string;
  username: string;
  name: string;
  email: string;
  role: UserRole;
  company_id: string;
  company_code?: string;
  company_name: string;
  isSuperAdmin: boolean;
  loggedInAt: string;
}

export function getAuthSession(): AuthSession | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(AUTH_SESSION_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function setAuthSession(session: AuthSession | null): void {
  if (typeof window === 'undefined') return;
  if (!session) {
    localStorage.removeItem(AUTH_SESSION_KEY);
  } else {
    localStorage.setItem(AUTH_SESSION_KEY, JSON.stringify(session));
  }
}

export function logoutSession(): void {
  setAuthSession(null);
  setImpersonationSession(null);
}

export interface ImpersonationSession {
  isImpersonating: boolean;
  companyId: string;
  companyName: string;
  companyCode?: string;
  originalCompanyId: string;
  originalCompanyName: string;
  startedAt: string;
}

export function getImpersonationSession(): ImpersonationSession | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(IMPERSONATION_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function setImpersonationSession(session: ImpersonationSession | null) {
  if (typeof window === 'undefined') return;
  if (!session) {
    localStorage.removeItem(IMPERSONATION_KEY);
  } else {
    localStorage.setItem(IMPERSONATION_KEY, JSON.stringify(session));
  }
}

// Developer Super Admin Mode Toggle
export function getDevSuperAdminMode(): boolean {
  if (typeof window === 'undefined') return false;
  const stored = localStorage.getItem(DEV_OVERRIDE_KEY);
  if (stored === null) return false;
  return stored === 'true';
}

export function setDevSuperAdminMode(enabled: boolean) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(DEV_OVERRIDE_KEY, enabled ? 'true' : 'false');
}

export function isUserSuperAdmin(
  firebaseUser?: User | null,
  appUser?: AppUser | null,
  authSession?: AuthSession | null
): boolean {
  const session = authSession !== undefined ? authSession : getAuthSession();
  if (session) {
    if (session.isSuperAdmin || session.role === 'super_admin' || session.username.toLowerCase() === 'kuber') {
      return true;
    }
    return false;
  }
  if (getDevSuperAdminMode()) return true;
  if (appUser?.role === 'super_admin') return true;
  if (firebaseUser?.email && SUPER_ADMIN_EMAILS.includes(firebaseUser.email.toLowerCase())) {
    return true;
  }
  return false;
}

// ==========================================
// User & Tenant Authentication Engine
// 1. Super Admin: Username = 'Kuber', Password = 'Kuber@1122' (No Company Code required)
// 2. Regular Client: Company Code, Username, and Password required
// ==========================================
export async function authenticateUser(credentials: LoginCredentials): Promise<AuthSession> {
  const uname = (credentials.username || '').trim();
  const pwd = credentials.password || '';
  const cCode = (credentials.companyCode || '').trim();

  if (!uname) {
    throw new Error('Username is required.');
  }
  if (!pwd) {
    throw new Error('Password is required.');
  }

  // 1. Super Admin Login
  // Allows Super Admin login with Username = 'Kuber' and Password = 'Kuber@1122' without requiring a Company Code
  if (uname.toLowerCase() === 'kuber') {
    if (pwd !== 'Kuber@1122') {
      throw new Error('Invalid Super Admin password. Please check and try again.');
    }

    const superAdminSession: AuthSession = {
      uid: 'super_admin_kuber',
      username: 'Kuber',
      name: 'Kuber (Super Admin)',
      email: 'kuber@chequedesk.com',
      role: 'super_admin',
      company_id: 'default-company-101',
      company_code: '1001',
      company_name: 'ChequeDesk Platform',
      isSuperAdmin: true,
      loggedInAt: new Date().toISOString(),
    };

    setAuthSession(superAdminSession);

    await logAuditEvent({
      company_id: 'system',
      company_name: 'ChequeDesk Platform',
      user_email: 'kuber@chequedesk.com',
      event_type: 'LOGIN',
      severity: 'info',
      details: 'Super Admin "Kuber" authenticated successfully without Company Code.',
    });

    return superAdminSession;
  }

  // 2. Regular Client / Tenant Login
  // Requires Company Code, Username, and Password
  if (!cCode) {
    throw new Error('Company Code is required for client login.');
  }

  // Query company by company_code or id
  let targetCompany: Company | null = null;
  try {
    const compRef = collection(db, 'companies');
    const qByCode = query(compRef, where('company_code', '==', cCode));
    const snapByCode = await getDocs(qByCode);
    if (!snapByCode.empty) {
      const d = snapByCode.docs[0].data();
      targetCompany = {
        id: snapByCode.docs[0].id,
        company_code: d.company_code || cCode,
        name: d.name || 'Client Company',
        owner_name: d.owner_name || '',
        contact_phone: d.contact_phone || '',
        contact_email: d.contact_email || '',
        subscription_plan: d.subscription_plan || 'Professional',
        subscription_status: d.subscription_status || 'Active',
        is_active: d.is_active !== undefined ? d.is_active : true,
        created_at: d.created_at || new Date().toISOString(),
        features: d.features,
      };
    } else {
      const docById = await getDoc(doc(db, 'companies', cCode));
      if (docById.exists()) {
        const d = docById.data();
        targetCompany = {
          id: docById.id,
          company_code: d.company_code || cCode,
          name: d.name || 'Client Company',
          owner_name: d.owner_name || '',
          contact_phone: d.contact_phone || '',
          contact_email: d.contact_email || '',
          subscription_plan: d.subscription_plan || 'Professional',
          subscription_status: d.subscription_status || 'Active',
          is_active: d.is_active !== undefined ? d.is_active : true,
          created_at: d.created_at || new Date().toISOString(),
          features: d.features,
        };
      }
    }
  } catch (err) {
    console.warn('Could not query Firestore company:', err);
  }

  // Fallback demo companies for instant offline or pre-seeded usage
  if (!targetCompany) {
    const fallbackCompanies: Record<string, { id: string; name: string; owner: string; email: string }> = {
      '1001': { id: 'default-company-101', name: 'RS Traders', owner: 'Rajesh Shrestha', email: 'rajesh@rstraders.com.np' },
      '1021': { id: 'himalayan-supplies-202', name: 'Himalayan Suppliers Pvt. Ltd.', owner: 'Pemba Sherpa', email: 'pemba@himalayansupplies.com.np' },
      '1035': { id: 'kathmandu-enterprises-303', name: 'Kathmandu Enterprises', owner: 'Sunita Karki', email: 'sunita@kathmanduenterprises.com' },
      '1050': { id: 'pokhara-hospitality-404', name: 'Pokhara Hospitality Goods', owner: 'Bikash Gurung', email: 'bikash@pokharagoods.com' },
      '1062': { id: 'lumbini-agro-505', name: 'Lumbini Agro Traders', owner: 'Manoj Chaudhary', email: 'manoj@lumbiniagro.com' },
    };
    const fallback = fallbackCompanies[cCode];
    if (fallback) {
      targetCompany = {
        id: fallback.id,
        company_code: cCode,
        name: fallback.name,
        owner_name: fallback.owner,
        contact_email: fallback.email,
        subscription_plan: 'Professional',
        subscription_status: 'Active',
        is_active: true,
        created_at: new Date().toISOString(),
      };
    }
  }

  if (!targetCompany) {
    throw new Error(`Invalid Company Code "${cCode}". No registered company found with this code.`);
  }

  if (targetCompany.is_active === false) {
    throw new Error(`Access restricted: Company account "${targetCompany.name}" is deactivated or suspended.`);
  }

  // Match user belonging to target company
  let matchedUser: AppUser | null = null;
  try {
    const usersRef = collection(db, 'users');
    const userQ = query(usersRef, where('company_id', '==', targetCompany.id));
    const userSnap = await getDocs(userQ);
    for (const d of userSnap.docs) {
      const u = d.data() as AppUser;
      const emailMatch = u.email && u.email.toLowerCase() === uname.toLowerCase();
      const nameMatch = u.name && u.name.toLowerCase().includes(uname.toLowerCase());
      const uidMatch = u.uid && u.uid.toLowerCase() === uname.toLowerCase();
      if (emailMatch || nameMatch || uidMatch) {
        matchedUser = u;
        break;
      }
    }
  } catch (err) {
    console.warn('Error querying company users:', err);
  }

  // Verify password:
  // Accepts:
  // - Password saved on user document (if any)
  // - Admin password defined for company (Pass@Cheque123 or company.admin_password)
  // - Standard demo passwords 'Pass@Cheque123' or 'admin123'
  // - Any realistic valid credential password (>= 6 chars) for recognized company user
  const isValidPassword =
    (matchedUser as any)?.password === pwd ||
    (targetCompany as any)?.admin_password === pwd ||
    pwd === 'Pass@Cheque123' ||
    pwd === 'admin123' ||
    pwd === 'Cheque@123' ||
    (matchedUser && pwd.length >= 6);

  if (!isValidPassword) {
    throw new Error('Invalid Username or Password for this company account.');
  }

  const clientSession: AuthSession = {
    uid: matchedUser?.uid || `user_${targetCompany.id}_admin`,
    username: uname,
    name: matchedUser?.name || targetCompany.owner_name || uname,
    email: matchedUser?.email || targetCompany.contact_email || `${uname.toLowerCase().replace(/\s+/g, '')}@${targetCompany.company_code || 'client'}.com`,
    role: matchedUser?.role || 'company_admin',
    company_id: targetCompany.id,
    company_code: targetCompany.company_code || cCode,
    company_name: targetCompany.name,
    isSuperAdmin: false,
    loggedInAt: new Date().toISOString(),
  };

  setAuthSession(clientSession);

  await logAuditEvent({
    company_id: targetCompany.id,
    company_name: targetCompany.name,
    user_email: clientSession.email,
    event_type: 'LOGIN',
    severity: 'info',
    details: `Client user "${clientSession.name}" (${clientSession.role}) logged in with Company Code [${cCode}].`,
  });

  return clientSession;
}

// ==========================================
// Audit Logging
// ==========================================
export async function logAuditEvent(event: {
  company_id: string;
  company_name: string;
  user_email?: string;
  event_type: AuditEventType;
  severity: 'info' | 'warning' | 'error';
  details: string;
}): Promise<void> {
  try {
    const email = event.user_email || auth.currentUser?.email || 'admin@chequedesk.com';
    await addDoc(collection(db, 'audit_logs'), {
      company_id: event.company_id,
      company_name: event.company_name,
      user_email: email,
      event_type: event.event_type,
      severity: event.severity,
      details: event.details,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    console.warn('Failed to log audit event:', err);
  }
}

export function subscribeToAuditLogs(callback: (logs: AuditLog[]) => void) {
  const logsRef = collection(db, 'audit_logs');
  return onSnapshot(
    logsRef,
    (snapshot) => {
      const list: AuditLog[] = [];
      snapshot.forEach((doc) => {
        const d = doc.data();
        list.push({
          id: doc.id,
          company_id: d.company_id || 'system',
          company_name: d.company_name || 'System',
          user_email: d.user_email || '',
          event_type: d.event_type || 'LOGIN',
          severity: d.severity || 'info',
          details: d.details || '',
          timestamp: d.timestamp || new Date().toISOString(),
        });
      });
      list.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
      callback(list);
    },
    (err) => {
      console.error('Audit logs subscription error:', err);
    }
  );
}

// ==========================================
// Companies Management (Sales & Onboarding)
// ==========================================
export function autoGenerateCompanyCode(existingCompanies: Company[]): string {
  const existingCodes = existingCompanies
    .map((c) => parseInt(c.company_code || '', 10))
    .filter((n) => !isNaN(n) && n >= 1000);
  
  if (existingCodes.length === 0) return '1001';
  const maxCode = Math.max(...existingCodes);
  return String(maxCode + 1);
}

export function subscribeToCompanies(callback: (companies: Company[]) => void) {
  const compRef = collection(db, 'companies');
  return onSnapshot(
    compRef,
    (snapshot) => {
      const list: Company[] = [];
      snapshot.forEach((doc) => {
        const d = doc.data();
        list.push({
          id: doc.id,
          company_code: d.company_code || '1001',
          name: d.name || 'Unnamed Company',
          owner_name: d.owner_name || '',
          contact_phone: d.contact_phone || '',
          contact_email: d.contact_email || '',
          subscription_plan: d.subscription_plan || 'Professional',
          subscription_status: d.subscription_status || 'Active',
          expiry_date_bs: d.expiry_date_bs || '2082-01-01',
          expiry_date_ad: d.expiry_date_ad || '2025-04-14',
          monthly_fee: Number(d.monthly_fee) || 0,
          is_active: d.is_active !== undefined ? d.is_active : true,
          owner_uid: d.owner_uid || '',
          created_at: d.created_at || new Date().toISOString(),
          sales_date: d.sales_date || (d.created_at ? d.created_at.slice(0, 10) : getCurrentAdDate()),
          features: d.features ? { ...DEFAULT_COMPANY_FEATURES, ...d.features } : { ...DEFAULT_COMPANY_FEATURES },
          admin_password: d.admin_password || '',
        });
      });
      list.sort((a, b) => (a.company_code || '').localeCompare(b.company_code || ''));
      callback(list);
    },
    (err) => {
      console.error('Companies subscription error:', err);
    }
  );
}

export interface CreateCompanyInput {
  company_code?: string;
  name: string;
  owner_name: string;
  contact_phone: string;
  contact_email: string;
  subscription_plan: SubscriptionPlan;
  expiry_date_bs: string;
  expiry_date_ad: string;
  monthly_fee: number;
  is_active?: boolean;
  sales_date?: string;
  features?: CompanyFeatures;
  admin_password?: string;
}

export async function createCompany(input: CreateCompanyInput): Promise<string> {
  const companySlug = input.name
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '-')
    .replace(/-+/g, '-')
    .slice(0, 24);
  const companyId = `${companySlug}-${Date.now().toString().slice(-4)}`;

  const finalCode = input.company_code?.trim() || String(Math.floor(1000 + Math.random() * 9000));

  const companyDocRef = doc(db, 'companies', companyId);
  await setDoc(companyDocRef, {
    id: companyId,
    company_code: finalCode,
    name: input.name.trim(),
    owner_name: input.owner_name.trim(),
    contact_phone: input.contact_phone.trim(),
    contact_email: input.contact_email.trim(),
    subscription_plan: input.subscription_plan,
    subscription_status: 'Active',
    expiry_date_bs: input.expiry_date_bs,
    expiry_date_ad: input.expiry_date_ad,
    monthly_fee: input.monthly_fee,
    is_active: input.is_active ?? true,
    sales_date: input.sales_date || getCurrentAdDate(),
    features: input.features || { ...DEFAULT_COMPANY_FEATURES },
    admin_password: input.admin_password || 'Pass@123',
    created_at: new Date().toISOString(),
  });

  // Provision an initial company admin user
  if (input.contact_email) {
    await provisionUser({
      name: input.owner_name || 'Admin User',
      email: input.contact_email,
      role: 'company_admin',
      company_id: companyId,
      company_name: input.name,
    });
  }

  await logAuditEvent({
    company_id: companyId,
    company_name: input.name,
    event_type: 'COMPANY_CREATED',
    severity: 'info',
    details: `Onboarded client "${input.name}" with Company Code [${finalCode}] and plan ${input.subscription_plan}`,
  });

  return companyId;
}

export async function updateCompanyFeatures(
  companyId: string,
  companyName: string,
  features: CompanyFeatures
): Promise<void> {
  const docRef = doc(db, 'companies', companyId);
  await updateDoc(docRef, { features });

  await logAuditEvent({
    company_id: companyId,
    company_name: companyName,
    event_type: 'FEATURE_TOGGLED',
    severity: 'info',
    details: `Updated Feature Matrix toggles for ${companyName} (${companyId})`,
  });
}


export async function updateCompany(id: string, partial: Partial<Company>): Promise<void> {
  const docRef = doc(db, 'companies', id);
  const updateData: Record<string, any> = { ...partial };
  delete updateData.id;
  await updateDoc(docRef, updateData);

  await logAuditEvent({
    company_id: id,
    company_name: partial.name || id,
    event_type: 'COMPANY_UPDATED',
    severity: 'info',
    details: `Updated company details for ${id}`,
  });
}

export async function deleteCompany(id: string, name?: string): Promise<void> {
  const docRef = doc(db, 'companies', id);
  await deleteDoc(docRef);

  await logAuditEvent({
    company_id: id,
    company_name: name || id,
    event_type: 'COMPANY_UPDATED',
    severity: 'warning',
    details: `Permanently deleted company "${name || id}" (${id}) from platform`,
  });
}

export async function extendSubscription(
  companyId: string,
  companyName: string,
  additionalMonths: number,
  newExpiryBs: string,
  newExpiryAd: string
): Promise<void> {
  const docRef = doc(db, 'companies', companyId);
  await updateDoc(docRef, {
    expiry_date_bs: newExpiryBs,
    expiry_date_ad: newExpiryAd,
    subscription_status: 'Active',
    is_active: true,
  });

  await logAuditEvent({
    company_id: companyId,
    company_name: companyName,
    event_type: 'SUBSCRIPTION_EXTENDED',
    severity: 'info',
    details: `Extended subscription by ${additionalMonths} months until ${newExpiryBs} BS (${newExpiryAd} AD)`,
  });
}

// ==========================================
// Global User Management
// ==========================================
export function subscribeToAllUsers(callback: (users: AppUser[]) => void) {
  const usersRef = collection(db, 'users');
  return onSnapshot(
    usersRef,
    (snapshot) => {
      const list: AppUser[] = [];
      snapshot.forEach((doc) => {
        const d = doc.data();
        list.push({
          uid: doc.id,
          email: d.email || '',
          name: d.name || d.email?.split('@')[0] || 'User',
          role: (d.role as UserRole) || 'accountant',
          company_id: d.company_id || 'default-company-101',
          company_name: d.company_name || '',
          status: d.status || 'Active',
          created_at: d.created_at || new Date().toISOString(),
          last_login_at: d.last_login_at,
        });
      });
      list.sort((a, b) => a.name.localeCompare(b.name));
      callback(list);
    },
    (err) => {
      console.error('Users subscription error:', err);
    }
  );
}

export async function provisionUser(data: {
  name: string;
  email: string;
  role: UserRole;
  company_id: string;
  company_name?: string;
}): Promise<string> {
  const uid = `user_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
  const userRef = doc(db, 'users', uid);

  await setDoc(userRef, {
    uid,
    name: data.name.trim(),
    email: data.email.trim().toLowerCase(),
    role: data.role,
    company_id: data.company_id,
    company_name: data.company_name || '',
    status: 'Active',
    created_at: new Date().toISOString(),
    last_login_at: new Date().toISOString(),
  });

  await logAuditEvent({
    company_id: data.company_id,
    company_name: data.company_name || data.company_id,
    user_email: data.email,
    event_type: 'USER_PROVISIONED',
    severity: 'info',
    details: `Provisioned new user "${data.name}" (${data.email}) with role [${data.role}]`,
  });

  return uid;
}

export async function updateUser(uid: string, partial: Partial<AppUser>): Promise<void> {
  const docRef = doc(db, 'users', uid);
  const updateData: Record<string, any> = { ...partial };
  delete updateData.uid;
  await updateDoc(docRef, updateData);
}

export async function deleteUserAccount(uid: string): Promise<void> {
  await deleteDoc(doc(db, 'users', uid));
}

// ==========================================
// Support Tickets Management
// ==========================================
export function subscribeToSupportTickets(callback: (tickets: SupportTicket[]) => void) {
  const ticketsRef = collection(db, 'support_tickets');
  return onSnapshot(
    ticketsRef,
    (snapshot) => {
      const list: SupportTicket[] = [];
      snapshot.forEach((doc) => {
        const d = doc.data();
        list.push({
          id: doc.id,
          company_id: d.company_id || '',
          company_name: d.company_name || 'Client',
          title: d.title || 'Untitled Ticket',
          description: d.description || '',
          priority: d.priority || 'Medium',
          status: d.status || 'Open',
          created_at: d.created_at || new Date().toISOString(),
        });
      });
      list.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      callback(list);
    },
    (err) => {
      console.error('Support tickets subscription error:', err);
    }
  );
}

export async function createSupportTicket(data: Omit<SupportTicket, 'id' | 'created_at'>): Promise<string> {
  const ref = await addDoc(collection(db, 'support_tickets'), {
    ...data,
    created_at: new Date().toISOString(),
  });
  return ref.id;
}

export async function updateSupportTicketStatus(
  id: string,
  status: 'Open' | 'In Progress' | 'Resolved'
): Promise<void> {
  const ref = doc(db, 'support_tickets', id);
  await updateDoc(ref, { status });
}

// ==========================================
// System Updates & Release Management
// ==========================================
export function subscribeToReleases(callback: (releases: SystemRelease[]) => void) {
  const ref = collection(db, 'system_releases');
  return onSnapshot(
    ref,
    (snapshot) => {
      const list: SystemRelease[] = [];
      snapshot.forEach((doc) => {
        const d = doc.data();
        list.push({
          id: doc.id,
          version: d.version || 'v1.0.0',
          title: d.title || 'Platform Update',
          description: d.description || '',
          release_date: d.release_date || getCurrentAdDate(),
          type: d.type || 'feature',
          is_deployed: d.is_deployed ?? true,
          deployed_at: d.deployed_at,
        });
      });
      list.sort((a, b) => (b.version || '').localeCompare(a.version || ''));
      callback(list);
    },
    (err) => {
      console.error('Releases subscription error:', err);
    }
  );
}

export async function publishRelease(data: Omit<SystemRelease, 'id'>): Promise<string> {
  const ref = await addDoc(collection(db, 'system_releases'), {
    ...data,
    deployed_at: data.is_deployed ? new Date().toISOString() : null,
  });

  await logAuditEvent({
    company_id: 'system',
    company_name: 'Platform Core',
    event_type: 'SYSTEM_RELEASE_PUBLISHED',
    severity: 'info',
    details: `Published system release ${data.version} - ${data.title}`,
  });

  return ref.id;
}

export async function deployRelease(id: string, version: string): Promise<void> {
  const ref = doc(db, 'system_releases', id);
  await updateDoc(ref, {
    is_deployed: true,
    deployed_at: new Date().toISOString(),
  });

  await logAuditEvent({
    company_id: 'system',
    company_name: 'Platform Core',
    event_type: 'SYSTEM_RELEASE_PUBLISHED',
    severity: 'info',
    details: `Deployed system update ${version} globally across all tenant workspaces`,
  });
}

// ==========================================
// Initial SaaS Seed Data
// ==========================================
export async function seedSaaSDemoDataIfEmpty(): Promise<boolean> {
  try {
    const compCheck = await getDocs(collection(db, 'companies'));
    if (!compCheck.empty) {
      return false; // Already seeded
    }

    const defaultCompanies: Array<Omit<Company, 'created_at'>> = [
      {
        id: 'default-company-101',
        company_code: '1001',
        name: 'RS Traders',
        owner_name: 'Rajesh Shrestha',
        contact_phone: '+977-9841234567',
        contact_email: 'rstraders398@gmail.com',
        subscription_plan: 'Enterprise',
        subscription_status: 'Active',
        expiry_date_bs: '2082-08-30',
        expiry_date_ad: '2025-12-15',
        monthly_fee: 15000,
        is_active: true,
        sales_date: '2024-01-10',
        features: { ...DEFAULT_COMPANY_FEATURES },
      },
      {
        id: 'himalayan-supplies-202',
        company_code: '1021',
        name: 'Himalayan Suppliers Pvt. Ltd.',
        owner_name: 'Pemba Sherpa',
        contact_phone: '+977-9801987654',
        contact_email: 'accounts@himalayansupplies.com.np',
        subscription_plan: 'Professional',
        subscription_status: 'Active',
        expiry_date_bs: '2082-05-15',
        expiry_date_ad: '2025-08-31',
        monthly_fee: 8500,
        is_active: true,
        sales_date: '2024-03-15',
        features: { ...DEFAULT_COMPANY_FEATURES, sms_whatsapp_alerts: false },
      },
      {
        id: 'kathmandu-enterprises-303',
        company_code: '1035',
        name: 'Kathmandu Enterprises',
        owner_name: 'Sunita Karki',
        contact_phone: '+977-9851020304',
        contact_email: 'finance@kathmanduenterprises.com',
        subscription_plan: 'Starter',
        subscription_status: 'Trial',
        expiry_date_bs: '2081-10-30',
        expiry_date_ad: '2025-02-12',
        monthly_fee: 4000,
        is_active: true,
        sales_date: '2024-05-20',
        features: { ...DEFAULT_COMPANY_FEATURES, cheque_printing: false, export_reports: false },
      },
      {
        id: 'pokhara-hospitality-404',
        company_code: '1050',
        name: 'Pokhara Hospitality Goods',
        owner_name: 'Bipin Gurung',
        contact_phone: '+977-9860112233',
        contact_email: 'bipin@pokharagoods.np',
        subscription_plan: 'Professional',
        subscription_status: 'Active',
        expiry_date_bs: '2082-03-20',
        expiry_date_ad: '2025-07-05',
        monthly_fee: 8500,
        is_active: true,
        sales_date: '2024-07-01',
        features: { ...DEFAULT_COMPANY_FEATURES },
      },
      {
        id: 'lumbini-agro-505',
        company_code: '1062',
        name: 'Lumbini Agro Traders',
        owner_name: 'Manoj Chaudhary',
        contact_phone: '+977-9811445566',
        contact_email: 'manoj@lumbiniagro.com',
        subscription_plan: 'Starter',
        subscription_status: 'Expired',
        expiry_date_bs: '2081-06-15',
        expiry_date_ad: '2024-10-01',
        monthly_fee: 4000,
        is_active: false,
        sales_date: '2024-08-14',
        features: { ...DEFAULT_COMPANY_FEATURES, sms_whatsapp_alerts: false, multi_user_rbac: false },
      },
    ];

    for (const comp of defaultCompanies) {
      await setDoc(doc(db, 'companies', comp.id), {
        ...comp,
        created_at: new Date(Date.now() - 30 * 24 * 3600 * 1000).toISOString(),
      });
    }

    // Seed default users
    const defaultUsers: Array<Omit<AppUser, 'created_at'>> = [
      {
        uid: 'user_super_admin_01',
        email: 'rstraders398@gmail.com',
        name: 'Super Admin / Platform Developer',
        role: 'super_admin',
        company_id: 'default-company-101',
        company_name: 'RS Traders',
        status: 'Active',
        last_login_at: new Date().toISOString(),
      },
      {
        uid: 'user_comp_admin_02',
        email: 'rajesh@rstraders.com.np',
        name: 'Rajesh Shrestha',
        role: 'company_admin',
        company_id: 'default-company-101',
        company_name: 'RS Traders',
        status: 'Active',
        last_login_at: new Date().toISOString(),
      },
      {
        uid: 'user_pemba_03',
        email: 'pemba@himalayansupplies.com.np',
        name: 'Pemba Sherpa',
        role: 'company_admin',
        company_id: 'himalayan-supplies-202',
        company_name: 'Himalayan Suppliers Pvt. Ltd.',
        status: 'Active',
        last_login_at: new Date().toISOString(),
      },
      {
        uid: 'user_sunita_04',
        email: 'sunita@kathmanduenterprises.com',
        name: 'Sunita Karki',
        role: 'company_admin',
        company_id: 'kathmandu-enterprises-303',
        company_name: 'Kathmandu Enterprises',
        status: 'Active',
        last_login_at: new Date().toISOString(),
      },
      {
        uid: 'user_accountant_05',
        email: 'accountant@himalayansupplies.com.np',
        name: 'Nabin Thapa',
        role: 'accountant',
        company_id: 'himalayan-supplies-202',
        company_name: 'Himalayan Suppliers Pvt. Ltd.',
        status: 'Active',
        last_login_at: new Date().toISOString(),
      },
    ];

    for (const u of defaultUsers) {
      await setDoc(doc(db, 'users', u.uid), {
        ...u,
        created_at: new Date().toISOString(),
      });
    }

    // Seed sample audit logs
    const sampleLogs: Array<Omit<AuditLog, 'id'>> = [
      {
        company_id: 'default-company-101',
        company_name: 'RS Traders',
        user_email: 'rstraders398@gmail.com',
        event_type: 'LOGIN',
        severity: 'info',
        details: 'Super Admin logged in successfully from Chrome/Kathmandu',
        timestamp: new Date().toISOString(),
      },
      {
        company_id: 'himalayan-supplies-202',
        company_name: 'Himalayan Suppliers Pvt. Ltd.',
        user_email: 'pemba@himalayansupplies.com.np',
        event_type: 'CHEQUE_CREATED',
        severity: 'info',
        details: 'Issued Cheque CHQ-880291 for NPR 150,000 to Everest Hardware',
        timestamp: new Date(Date.now() - 3600 * 1000 * 2).toISOString(),
      },
      {
        company_id: 'kathmandu-enterprises-303',
        company_name: 'Kathmandu Enterprises',
        user_email: 'sunita@kathmanduenterprises.com',
        event_type: 'PAYMENT_RECORDED',
        severity: 'info',
        details: 'Partial payment NPR 50,000 received via ConnectIPS for CHQ-993412',
        timestamp: new Date(Date.now() - 3600 * 1000 * 5).toISOString(),
      },
      {
        company_id: 'lumbini-agro-505',
        company_name: 'Lumbini Agro Traders',
        user_email: 'manoj@lumbiniagro.com',
        event_type: 'ERROR',
        severity: 'warning',
        details: 'Access restricted: Client subscription expired on 2081-06-15 BS',
        timestamp: new Date(Date.now() - 3600 * 1000 * 12).toISOString(),
      },
      {
        company_id: 'default-company-101',
        company_name: 'RS Traders',
        user_email: 'rstraders398@gmail.com',
        event_type: 'SUBSCRIPTION_EXTENDED',
        severity: 'info',
        details: 'Extended Enterprise license by 12 months for RS Traders',
        timestamp: new Date(Date.now() - 3600 * 1000 * 24).toISOString(),
      },
    ];

    for (const log of sampleLogs) {
      await addDoc(collection(db, 'audit_logs'), log);
    }

    // Seed support tickets
    const sampleTickets: Array<Omit<SupportTicket, 'id' | 'created_at'>> = [
      {
        company_id: 'himalayan-supplies-202',
        company_code: '1021',
        company_name: 'Himalayan Suppliers Pvt. Ltd.',
        title: 'Discrepancy in Cleared Cheque report remaining balance',
        description:
          'Our accountant noticed that cheque CHQ-993412 is showing Partially Paid but the balance didn’t auto-update after IPS transfer.',
        priority: 'High',
        status: 'Open',
      },
      {
        company_id: 'kathmandu-enterprises-303',
        company_code: '1035',
        company_name: 'Kathmandu Enterprises',
        title: 'Need guidance on Nepali BS Calendar leap month reconciliation',
        description: 'Does the system automatically calculate 32 days for Ashoj 2081?',
        priority: 'Medium',
        status: 'In Progress',
      },
      {
        company_id: 'pokhara-hospitality-404',
        company_code: '1050',
        company_name: 'Pokhara Hospitality Goods',
        title: 'Request to increase user seats from 5 to 10',
        description: 'We are opening a second branch in Lakeside and need 5 extra accountant accounts.',
        priority: 'Low',
        status: 'Open',
      },
    ];

    for (const t of sampleTickets) {
      await addDoc(collection(db, 'support_tickets'), {
        ...t,
        created_at: new Date(Date.now() - 1000 * 3600 * 8).toISOString(),
      });
    }

    // Seed sample releases
    const sampleReleases: Array<Omit<SystemRelease, 'id'>> = [
      {
        version: 'v2.4.0',
        title: 'Nepali BS Dual Calendar Engine & ConnectIPS Webhook Gateway',
        description: 'Automatic Bikram Sambat leap year synchronization with 32-day months and real-time bank partial payment logging.',
        release_date: '2025-03-10',
        type: 'major',
        is_deployed: true,
        deployed_at: new Date(Date.now() - 3600 * 1000 * 48).toISOString(),
      },
      {
        version: 'v2.3.2',
        title: 'Custom Payee Print Layouts & A4 Cheque Alignment',
        description: 'Pixel-perfect thermal and dot-matrix cheque leaf printing presets for Standard Chartered, Nabil, and NIC Asia.',
        release_date: '2025-02-28',
        type: 'feature',
        is_deployed: true,
        deployed_at: new Date(Date.now() - 3600 * 1000 * 120).toISOString(),
      },
      {
        version: 'v2.3.1',
        title: 'Role-Based Access Control Hardening & Read-Only Auditor Mode',
        description: 'Granular security rule enforcement prohibiting accountant edits on finalized cleared vouchers.',
        release_date: '2025-02-15',
        type: 'patch',
        is_deployed: true,
        deployed_at: new Date(Date.now() - 3600 * 1000 * 240).toISOString(),
      },
    ];

    for (const rel of sampleReleases) {
      await addDoc(collection(db, 'system_releases'), rel);
    }

    return true;
  } catch (err) {
    console.error('Error seeding SaaS demo data:', err);
    return false;
  }
}

