// Standalone dummy audit logger module to prevent missing module errors in builds
export const auditLogger = {
  log: async (...args: any[]) => {
    if (typeof process !== 'undefined' && process.env && process.env.NODE_ENV !== 'production') {
      console.log('[AuditLog]', ...args);
    }
  },
  info: async (...args: any[]) => {
    if (typeof process !== 'undefined' && process.env && process.env.NODE_ENV !== 'production') {
      console.info('[AuditInfo]', ...args);
    }
  },
  warn: async (...args: any[]) => {
    console.warn('[AuditWarn]', ...args);
  },
  error: async (...args: any[]) => {
    console.error('[AuditError]', ...args);
  },
  recordAction: async (..._args: any[]) => {},
  audit: async (..._args: any[]) => {},
};

export default auditLogger;
