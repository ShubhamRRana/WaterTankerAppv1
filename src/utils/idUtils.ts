/**
 * Generate a cryptographically secure unique ID.
 * Uses crypto.randomUUID() when available (Node 19+, modern browsers, Expo).
 * Falls back to a timestamp + random suffix for older environments.
 */
export function generateId(): string {
  if (typeof globalThis !== 'undefined' && typeof (globalThis as any).crypto?.randomUUID === 'function') {
    return (globalThis as any).crypto.randomUUID();
  }
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
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
