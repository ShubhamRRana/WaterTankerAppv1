export interface RecoveryTokens {
  access_token: string;
  refresh_token: string;
}

/** Production web reset page (matches customer app). Override with wta://reset-password for in-app dev. */
const DEFAULT_PASSWORD_RESET_REDIRECT_URL =
  'https://tankerhub.in/auth/reset-password';

export function getPasswordResetRedirectUrl(): string {
  return (
    process.env.EXPO_PUBLIC_PASSWORD_RESET_REDIRECT_URL?.trim() ||
    DEFAULT_PASSWORD_RESET_REDIRECT_URL
  );
}

function parseHashParams(fragment: string): Record<string, string> {
  const params: Record<string, string> = {};
  fragment.split('&').forEach((pair) => {
    const eqIndex = pair.indexOf('=');
    if (eqIndex === -1) return;
    const key = decodeURIComponent(pair.slice(0, eqIndex));
    const value = decodeURIComponent(pair.slice(eqIndex + 1));
    params[key] = value;
  });
  return params;
}

/** Parse Supabase recovery redirect: wta://reset-password#access_token=...&refresh_token=...&type=recovery */
export function parseRecoveryTokensFromUrl(url: string): RecoveryTokens | null {
  const hashIndex = url.indexOf('#');
  if (hashIndex === -1) return null;

  const fragment = url.slice(hashIndex + 1);
  const params = parseHashParams(fragment);
  const access_token = params.access_token;
  const refresh_token = params.refresh_token;
  const type = params.type;

  if (!access_token || !refresh_token || type !== 'recovery') {
    return null;
  }

  return { access_token, refresh_token };
}
