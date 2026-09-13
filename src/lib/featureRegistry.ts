import {
  collection,
  doc,
  setDoc,
  deleteDoc,
  onSnapshot,
  getDocs,
} from 'firebase/firestore';
import { db, auth } from './firebase';
import { SystemFeature, Company, SystemRelease, CompanyFeatures } from '../types';
import { logAuditEvent } from './adminService';

export const BUILTIN_SYSTEM_FEATURES: SystemFeature[] = [
  {
    id: 'cheque_printing',
    key: 'cheque_printing',
    name: 'Cheque Leaf Printing & Alignment',
    description: 'Custom payee placement, amount in words conversion, dot-matrix & thermal cheque leaf printing.',
    category: 'core',
    icon: 'Printer',
    badge: 'Core Engine',
    default_enabled: true,
    source_module: 'v2.0 Core Platform',
    created_at: '2024-01-01T00:00:00Z',
  },
  {
    id: 'partial_payments',
    key: 'partial_payments',
    name: 'Partial Payments & Installment Terminal',
    description: 'Split payment vouchers, installment logging, and balance deduction per cheque.',
    category: 'core',
    icon: 'Receipt',
    badge: 'Core Engine',
    default_enabled: true,
    source_module: 'v2.0 Core Platform',
    created_at: '2024-01-01T00:00:00Z',
  },
  {
    id: 'nepali_bs_calendar',
    key: 'nepali_bs_calendar',
    name: 'Nepali Bikram Sambat (BS) Dual Calendar',
    description: 'Automatic AD/BS dual date synchronization with 32-day Nepali month accounting.',
    category: 'core',
    icon: 'CalendarDays',
    badge: 'Nepal Standard',
    default_enabled: true,
    source_module: 'v2.1 Localization Engine',
    created_at: '2024-02-01T00:00:00Z',
  },
  {
    id: 'bank_reconciliation',
    key: 'bank_reconciliation',
    name: 'Multi-Bank Reconciliation & Statements',
    description: 'Real-time account balance calculation against issued and cleared cheques across all Nepali banks.',
    category: 'finance',
    icon: 'Landmark',
    badge: 'Finance',
    default_enabled: true,
    source_module: 'v2.2 Banking Module',
    created_at: '2024-03-01T00:00:00Z',
  },
  {
    id: 'sms_notifications',
    key: 'sms_notifications',
    name: 'SMS & WhatsApp Due-Date Reminders',
    description: 'Automated SMS and WhatsApp alerts dispatched to payees on cheque issue and 3-days prior to maturity.',
    category: 'communication',
    icon: 'Smartphone',
    badge: 'Automated',
    default_enabled: false,
    source_module: 'v2.4 Communication Hub',
    created_at: '2024-04-01T00:00:00Z',
  },
  {
    id: 'advanced_reports',
    key: 'advanced_reports',
    name: 'Advanced Reports & Cash Flow Forecasting',
    description: 'Multi-dimensional financial analytics, party credit risk scoring, and monthly cash outflow projections.',
    category: 'analytics',
    icon: 'BarChart3',
    badge: 'Analytics',
    default_enabled: false,
    source_module: 'v2.4 Analytics Engine',
    created_at: '2024-04-01T00:00:00Z',
  },
  {
    id: 'bulk_cheque_import',
    key: 'bulk_cheque_import',
    name: 'Bulk Cheque Import (Excel / CSV)',
    description: 'Mass cheque batch uploading from accounting software exports (Tally, Busy, Swastik).',
    category: 'integration',
    icon: 'FileSpreadsheet',
    badge: 'Fast Ingestion',
    default_enabled: false,
    source_module: 'v2.4 Data Pipeline',
    created_at: '2024-04-01T00:00:00Z',
  },
  {
    id: 'connectips_gateway',
    key: 'connectips_gateway',
    name: 'ConnectIPS Electronic Settlement Gateway',
    description: 'Direct integration with Nepal Clearing House Ltd (NCHL) for real-time electronic fund transfer sync.',
    category: 'finance',
    icon: 'Layers',
    badge: 'NCHL Verified',
    default_enabled: false,
    source_module: 'v2.4 Gateway Suite',
    created_at: '2024-04-01T00:00:00Z',
  },
  {
    id: 'audit_logs',
    key: 'audit_logs',
    name: 'Security Audit & Activity Logs',
    description: 'Immutable trail of user logins, voucher edits, cheque clearances, and security events.',
    category: 'security',
    icon: 'ShieldCheck',
    badge: 'Compliance',
    default_enabled: true,
    source_module: 'v2.3 Security Hardening',
    created_at: '2024-03-15T00:00:00Z',
  },
  {
    id: 'multi_user_rbac',
    key: 'multi_user_rbac',
    name: 'Multi-User RBAC & Staff Permissions',
    description: 'Role-based access control for Accountants, Auditors, Cashiers, and Branch Managers.',
    category: 'security',
    icon: 'Users',
    badge: 'Enterprise',
    default_enabled: true,
    source_module: 'v2.3 Security Hardening',
    created_at: '2024-03-15T00:00:00Z',
  },
  {
    id: 'export_reports',
    key: 'export_reports',
    name: 'Excel & PDF Ledger Export Engine',
    description: 'Export pending, cleared, and bounced cheque registers with Nepali date columns and tax summaries.',
    category: 'core',
    icon: 'FileText',
    badge: 'Reports',
    default_enabled: true,
    source_module: 'v2.0 Core Platform',
    created_at: '2024-01-01T00:00:00Z',
  },
  {
    id: 'custom_theme_customizer',
    key: 'custom_theme_customizer',
    name: 'Custom Theme Customizer',
    description: 'Enables tenant users to switch between 10 eye-friendly dark and light visual palettes from their sidebar.',
    category: 'core',
    icon: 'Palette',
    badge: '10 Palettes',
    default_enabled: true,
    source_module: 'v2.5 Theme Suite',
    created_at: '2024-05-01T00:00:00Z',
  },
  {
    id: 'offline_backup_system',
    key: 'offline_backup_system',
    name: 'Offline-First & Auto-Backup Engine',
    description: 'Tally/Busy-style offline database, background cloud synchronization, and multi-location backups (Local Disk, Email, Cloud).',
    category: 'advanced',
    icon: 'HardDrive',
    badge: 'Offline/Backup',
    default_enabled: true,
    source_module: 'v2.6 Desktop Engine',
    created_at: '2024-06-01T00:00:00Z',
  },
];

export function normalizeFeatureKey(rawKey: string): string {
  return rawKey
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_]/g, '_')
    .replace(/_+/g, '_');
}

/**
 * Initializes and listens to the real-time FeatureRegistry in Firestore.
 * Automatically discovers built-in system features if the collection is newly initialized.
 */
export function subscribeToFeatureRegistry(callback: (features: SystemFeature[]) => void) {
  const collectionRef = collection(db, 'system_features');

  // Listen in real time
  return onSnapshot(
    collectionRef,
    async (snapshot) => {
      if (snapshot.empty) {
        // Auto-seed built-in features to Firestore on first run
        try {
          for (const feat of BUILTIN_SYSTEM_FEATURES) {
            await setDoc(doc(db, 'system_features', feat.id), feat, { merge: true });
          }
        } catch (err) {
          console.warn('Feature registry auto-seed non-fatal warning:', err);
        }
        callback(BUILTIN_SYSTEM_FEATURES);
        return;
      }

      const list: SystemFeature[] = [];
      snapshot.forEach((d) => {
        const data = d.data();
        list.push({
          id: d.id,
          key: data.key || d.id,
          name: data.name || d.id,
          description: data.description || '',
          category: data.category || 'core',
          icon: data.icon || 'Sliders',
          badge: data.badge,
          default_enabled: Boolean(data.default_enabled),
          source_module: data.source_module || 'System Module',
          created_at: data.created_at || new Date().toISOString(),
        });
      });

      // Sort: Core first, then Communication, Finance, Analytics, Security, Integration
      const categoryOrder: Record<string, number> = {
        core: 1,
        communication: 2,
        finance: 3,
        analytics: 4,
        security: 5,
        integration: 6,
      };

      list.sort((a, b) => {
        const orderA = categoryOrder[a.category] || 99;
        const orderB = categoryOrder[b.category] || 99;
        if (orderA !== orderB) return orderA - orderB;
        return a.name.localeCompare(b.name);
      });

      callback(list);
    },
    (error) => {
      console.error('Feature Registry subscription error:', error);
      // Fallback to builtin features if Firestore subscription has issues
      callback(BUILTIN_SYSTEM_FEATURES);
    }
  );
}

/**
 * Dynamic Feature Registration: Adds a new feature key/module to the system.
 * Automatically broadcasts to all company matrices and developer consoles.
 */
export async function registerFeatureModule(
  featureInput: Omit<SystemFeature, 'created_at'>
): Promise<SystemFeature> {
  const normalizedKey = normalizeFeatureKey(featureInput.key);
  const docId = normalizedKey;

  const newFeature: SystemFeature = {
    ...featureInput,
    id: docId,
    key: normalizedKey,
    created_at: new Date().toISOString(),
  };

  const featureDocRef = doc(db, 'system_features', docId);
  await setDoc(featureDocRef, newFeature, { merge: true });

  await logAuditEvent({
    company_id: 'system',
    company_name: 'System Feature Registry',
    user_email: auth.currentUser?.email || 'admin@chequedesk.com',
    event_type: 'FEATURE_MODULE_REGISTERED',
    severity: 'info',
    details: `Discovered and registered system module: [${newFeature.name}] (Key: ${newFeature.key}) under category [${newFeature.category}]`,
  });

  return newFeature;
}

/**
 * Removes a custom module from the feature registry.
 */
export async function unregisterFeatureModule(featureId: string): Promise<void> {
  const featureDocRef = doc(db, 'system_features', featureId);
  await deleteDoc(featureDocRef);

  await logAuditEvent({
    company_id: 'system',
    company_name: 'System Feature Registry',
    user_email: auth.currentUser?.email || 'admin@chequedesk.com',
    event_type: 'FEATURE_MODULE_REGISTERED',
    severity: 'warning',
    details: `Unregistered system module with ID: [${featureId}]`,
  });
}

/**
 * Instantly toggles or sets a single feature for a client company in Firestore.
 * No manual schema migrations or code redeployment required!
 */
export async function updateSingleCompanyFeature(
  companyId: string,
  companyName: string,
  companyCode: string | undefined,
  featureKey: string,
  enabled: boolean
): Promise<void> {
  const normKey = normalizeFeatureKey(featureKey);
  const compRef = doc(db, 'companies', companyId);

  // Use Firestore nested map path updates for instant real-time mutation
  const updatePayload: Record<string, any> = {
    [`features.${normKey}`]: enabled,
  };

  // Backwards compatibility mappings for legacy keys
  if (normKey === 'sms_notifications') {
    updatePayload['features.sms_whatsapp_alerts'] = enabled;
  } else if (normKey === 'sms_whatsapp_alerts') {
    updatePayload['features.sms_notifications'] = enabled;
  }

  const { updateDoc } = await import('firebase/firestore');
  await updateDoc(compRef, updatePayload);

  await logAuditEvent({
    company_id: companyId,
    company_name: companyName,
    user_email: auth.currentUser?.email || 'admin@chequedesk.com',
    event_type: 'FEATURE_TOGGLED',
    severity: 'info',
    details: `Toggled feature [${normKey}] -> ${enabled ? 'ACTIVATED (ON)' : 'DISABLED (OFF)'} for company "${companyName}" (#${companyCode || 'N/A'})`,
  });
}

/**
 * Automated Feature Discovery: scans software updates/releases and automatically
 * registers newly discovered modules if not already present in the registry.
 */
export async function autoDiscoverModulesFromReleases(
  releases: SystemRelease[],
  existingFeatures: SystemFeature[]
): Promise<number> {
  const existingKeys = new Set(existingFeatures.map((f) => f.key.toLowerCase()));
  let discoveredCount = 0;

  for (const rel of releases) {
    const text = `${rel.title} ${rel.description}`.toLowerCase();

    // Check for SMS notifications
    if ((text.includes('sms') || text.includes('whatsapp')) && !existingKeys.has('sms_notifications')) {
      await registerFeatureModule({
        id: 'sms_notifications',
        key: 'sms_notifications',
        name: 'SMS & WhatsApp Due-Date Reminders',
        description: 'Automated SMS and WhatsApp alerts dispatched to payees on cheque issue and maturity.',
        category: 'communication',
        icon: 'Smartphone',
        badge: 'Discovered',
        default_enabled: false,
        source_module: `Software Release ${rel.version}`,
      });
      existingKeys.add('sms_notifications');
      discoveredCount++;
    }

    // Check for advanced reports / forecasting
    if ((text.includes('advanced report') || text.includes('forecast') || text.includes('analytics')) && !existingKeys.has('advanced_reports')) {
      await registerFeatureModule({
        id: 'advanced_reports',
        key: 'advanced_reports',
        name: 'Advanced Reports & Cash Flow Forecasting',
        description: 'Multi-dimensional analytics, party credit risk scoring, and monthly cash outflow projections.',
        category: 'analytics',
        icon: 'BarChart3',
        badge: 'Discovered',
        default_enabled: false,
        source_module: `Software Release ${rel.version}`,
      });
      existingKeys.add('advanced_reports');
      discoveredCount++;
    }

    // Check for bulk import
    if ((text.includes('bulk') || text.includes('csv') || text.includes('import')) && !existingKeys.has('bulk_cheque_import')) {
      await registerFeatureModule({
        id: 'bulk_cheque_import',
        key: 'bulk_cheque_import',
        name: 'Bulk Cheque Import (Excel / CSV)',
        description: 'Mass cheque batch uploading from accounting software exports.',
        category: 'integration',
        icon: 'FileSpreadsheet',
        badge: 'Discovered',
        default_enabled: false,
        source_module: `Software Release ${rel.version}`,
      });
      existingKeys.add('bulk_cheque_import');
      discoveredCount++;
    }

    // Check for ConnectIPS gateway
    if ((text.includes('connectips') || text.includes('nchl') || text.includes('gateway')) && !existingKeys.has('connectips_gateway')) {
      await registerFeatureModule({
        id: 'connectips_gateway',
        key: 'connectips_gateway',
        name: 'ConnectIPS Electronic Settlement Gateway',
        description: 'Real-time settlement synchronization via NCHL ConnectIPS.',
        category: 'finance',
        icon: 'Layers',
        badge: 'Discovered',
        default_enabled: false,
        source_module: `Software Release ${rel.version}`,
      });
      existingKeys.add('connectips_gateway');
      discoveredCount++;
    }
  }

  return discoveredCount;
}

/**
 * Checks if a specific feature is enabled for a company or features object, with safe defaults.
 * Supports both (companyOrFeatures, featureKey) and (featureKey, companyOrFeatures).
 */
export function isCompanyFeatureEnabled(
  param1: Company | CompanyFeatures | string | null | undefined,
  param2?: string | Company | CompanyFeatures | null | undefined,
  defaultValue = true
): boolean {
  let companyOrFeatures: Company | CompanyFeatures | null | undefined;
  let featureKey: string;

  if (typeof param1 === 'string') {
    featureKey = param1;
    companyOrFeatures = param2 as Company | CompanyFeatures | null | undefined;
  } else {
    companyOrFeatures = param1;
    featureKey = param2 as string;
  }

  if (!companyOrFeatures || !featureKey) return defaultValue;

  const features: CompanyFeatures | undefined =
    typeof companyOrFeatures === 'object' && companyOrFeatures !== null && 'features' in companyOrFeatures
      ? (companyOrFeatures as Company).features
      : (companyOrFeatures as CompanyFeatures);

  if (!features) return defaultValue;

  const normKey = normalizeFeatureKey(featureKey);

  // Check direct key
  if (features[normKey] !== undefined) {
    return Boolean(features[normKey]);
  }

  // Cross-compatibility mappings
  if (normKey === 'sms_notifications' && features.sms_whatsapp_alerts !== undefined) {
    return Boolean(features.sms_whatsapp_alerts);
  }
  if (normKey === 'sms_whatsapp_alerts' && features.sms_notifications !== undefined) {
    return Boolean(features.sms_notifications);
  }
  if (normKey === 'custom_theme_customizer' && features.theme_customizer !== undefined) {
    return Boolean(features.theme_customizer);
  }
  if (normKey === 'theme_customizer' && features.custom_theme_customizer !== undefined) {
    return Boolean(features.custom_theme_customizer);
  }
  if (normKey === 'backup_settings' && features.offline_backup_system !== undefined) {
    return Boolean(features.offline_backup_system);
  }
  if (normKey === 'offline_backup_system' && features.backup_settings !== undefined) {
    return Boolean(features.backup_settings);
  }

  return defaultValue;
}
