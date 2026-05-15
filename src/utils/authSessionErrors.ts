import { supabase } from '../lib/supabaseClient';

/**
 * Detects Supabase auth errors where the persisted refresh token is no longer valid.
 * Common causes: password reset elsewhere, revoked sessions, project/db reset, stale storage.
 */
export function isInvalidRefreshTokenError(error: unknown): boolean {
  if (error == null || typeof error !== 'object') return false;
  const e = error as { message?: string; code?: string };
  const msg = (e.message ?? '').toLowerCase();
  const code = (e.code ?? '').toLowerCase();
  return (
    code === 'refresh_token_not_found' ||
    msg.includes('refresh token not found') ||
    msg.includes('invalid refresh token')
  );
}

/** Clears locally persisted auth without requiring a server revoke (refresh may already be invalid). */
export async function clearInvalidAuthSession(): Promise<void> {
  try {
    await supabase.auth.signOut({ scope: 'local' });
  } catch {
    // Ignore — storage may already be inconsistent.
  }
}
