export interface EmailDataForUrl {
  token_hash: string;
  email_action_type: string;
  redirect_to?: string;
  site_url?: string;
  token_hash_new?: string;
}

export function buildConfirmationUrl(
  supabaseUrl: string,
  emailData: EmailDataForUrl,
  fallbackRedirect?: string,
): string {
  const redirectTo =
    emailData.redirect_to?.trim() ||
    fallbackRedirect?.trim() ||
    emailData.site_url?.trim() ||
    "";

  const params = new URLSearchParams({
    token: emailData.token_hash,
    type: emailData.email_action_type,
  });
  if (redirectTo) {
    params.set("redirect_to", redirectTo);
  }

  return `${supabaseUrl.replace(/\/$/, "")}/auth/v1/verify?${params.toString()}`;
}

export function buildConfirmationUrlNew(
  supabaseUrl: string,
  emailData: EmailDataForUrl,
  fallbackRedirect?: string,
): string | null {
  if (!emailData.token_hash_new?.trim()) {
    return null;
  }
  return buildConfirmationUrl(
    supabaseUrl,
    {
      ...emailData,
      token_hash: emailData.token_hash_new,
      email_action_type: "email_change",
    },
    fallbackRedirect,
  );
}
