/**
 * Generate a cryptographically secure unique ID.
 * Uses crypto.randomUUID() when available (Node 19+, modern browsers, Expo).
 * Falls back to a RFC 4122-compliant UUID v4 for older environments (e.g. React Native).
 */
export function generateId(): string {
  if (typeof globalThis !== 'undefined' && typeof (globalThis as any).crypto?.randomUUID === 'function') {
    return (globalThis as any).crypto.randomUUID();
  }
  // RFC 4122 UUID v4 fallback — required because Postgres uuid columns reject non-UUID strings
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

/**
 * Generate a short unique suffix (e.g. for payment IDs).
 * Prefers crypto.randomUUID(); fallback for older environments.
 */
export function generateShortId(): string {
  if (typeof globalThis !== 'undefined' && typeof (globalThis as any).crypto?.randomUUID === 'function') {
    return (globalThis as any).crypto.randomUUID().replace(/-/g, '').slice(0, 12);
  }
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 11);
}
