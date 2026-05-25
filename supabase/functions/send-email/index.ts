/**
 * Edge Function: send-email
 *
 * Supabase Auth Send Email hook — sends branded auth emails via Resend.
 * Deploy with: supabase functions deploy send-email --no-verify-jwt
 */

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import React from "npm:react@18.3.1";
import { Webhook } from "https://esm.sh/standardwebhooks@1.0.0";
import { Resend } from "npm:resend@4.0.0";
import { renderAsync } from "npm:@react-email/components@0.0.22";
import { ConfirmationEmail } from "./_templates/confirmation-email.tsx";
import { OtpEmail } from "./_templates/otp-email.tsx";
import { NotificationEmail } from "./_templates/notification-email.tsx";
import {
  CONFIRMATION_EMAILS,
  NOTIFICATION_EMAILS,
  REAUTH_EMAIL,
} from "./_templates/email-config.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, webhook-id, webhook-timestamp, webhook-signature",
};

interface HookUser {
  email: string;
  new_email?: string;
}

interface EmailData {
  token: string;
  token_hash: string;
  redirect_to: string;
  email_action_type: string;
  site_url: string;
  token_new: string;
  token_hash_new: string;
}

interface HookPayload {
  user: HookUser;
  email_data: EmailData;
}

function hookError(message: string, httpCode = 500): Response {
  return new Response(
    JSON.stringify({ error: { http_code: httpCode, message } }),
    { status: httpCode >= 400 && httpCode < 600 ? httpCode : 500, headers: { "Content-Type": "application/json" } },
  );
}

export function buildConfirmationUrl(
  supabaseUrl: string,
  tokenHash: string,
  actionType: string,
  redirectTo?: string,
  siteUrl?: string,
): string {
  const redirect =
    redirectTo?.trim() ||
    Deno.env.get("AUTH_REDIRECT_URL")?.trim() ||
    siteUrl?.trim() ||
    "";
  const params: Record<string, string> = {
    token: tokenHash,
    type: actionType,
  };
  if (redirect) params.redirect_to = redirect;
  return `${supabaseUrl}/auth/v1/verify?${new URLSearchParams(params)}`;
}

function getResendClient(): Resend {
  const apiKey = Deno.env.get("RESEND_API_KEY");
  if (!apiKey) throw new Error("RESEND_API_KEY is not configured");
  return new Resend(apiKey);
}

function getFromAddress(): string {
  return Deno.env.get("RESEND_FROM_EMAIL") ?? "WTA <onboarding@resend.dev>";
}

async function sendHtmlEmail(
  resend: Resend,
  to: string,
  subject: string,
  html: string,
): Promise<void> {
  const { error } = await resend.emails.send({
    from: getFromAddress(),
    to: [to],
    subject,
    html,
  });
  if (error) {
    const err = error as { message?: string; statusCode?: number };
    throw Object.assign(new Error(err.message ?? "Resend send failed"), {
      http_code: err.statusCode ?? 500,
    });
  }
}

async function renderConfirmation(
  content: (typeof CONFIRMATION_EMAILS)[string],
  confirmationUrl: string,
): Promise<string> {
  return renderAsync(
    React.createElement(ConfirmationEmail, {
      preview: content.preview,
      heading: content.heading,
      bodyText: content.bodyText,
      ctaLabel: content.ctaLabel,
      confirmationUrl,
    }),
  );
}

async function handleEmailChange(
  resend: Resend,
  supabaseUrl: string,
  user: HookUser,
  emailData: EmailData,
): Promise<void> {
  const content = CONFIRMATION_EMAILS.email_change;
  const { redirect_to, site_url, email_action_type } = emailData;

  if (emailData.token_hash_new && user.email) {
    const url = buildConfirmationUrl(
      supabaseUrl,
      emailData.token_hash_new,
      email_action_type,
      redirect_to,
      site_url,
    );
    const html = await renderConfirmation(content, url);
    await sendHtmlEmail(resend, user.email, content.subject, html);
  }

  const newEmail = user.new_email?.trim();
  if (emailData.token_hash && newEmail) {
    const url = buildConfirmationUrl(
      supabaseUrl,
      emailData.token_hash,
      email_action_type,
      redirect_to,
      site_url,
    );
    const html = await renderConfirmation(content, url);
    await sendHtmlEmail(resend, newEmail, content.subject, html);
    return;
  }

  if (emailData.token_hash && user.email) {
    const url = buildConfirmationUrl(
      supabaseUrl,
      emailData.token_hash,
      email_action_type,
      redirect_to,
      site_url,
    );
    const html = await renderConfirmation(content, url);
    await sendHtmlEmail(resend, user.email, content.subject, html);
  }
}

async function dispatchAuthEmail(
  resend: Resend,
  supabaseUrl: string,
  user: HookUser,
  emailData: EmailData,
): Promise<void> {
  const { email_action_type, redirect_to, site_url, token, token_hash } = emailData;

  if (email_action_type === "email_change") {
    await handleEmailChange(resend, supabaseUrl, user, emailData);
    return;
  }

  if (email_action_type === "reauthentication") {
    const html = await renderAsync(
      React.createElement(OtpEmail, {
        preview: REAUTH_EMAIL.preview,
        heading: REAUTH_EMAIL.heading,
        bodyText: REAUTH_EMAIL.bodyText,
        otp: token,
      }),
    );
    await sendHtmlEmail(resend, user.email, REAUTH_EMAIL.subject, html);
    return;
  }

  const notification = NOTIFICATION_EMAILS[email_action_type];
  if (notification) {
    const html = await renderAsync(
      React.createElement(NotificationEmail, {
        preview: notification.preview,
        heading: notification.heading,
        bodyText: notification.bodyText,
      }),
    );
    await sendHtmlEmail(resend, user.email, notification.subject, html);
    return;
  }

  const content = CONFIRMATION_EMAILS[email_action_type];
  if (!content) {
    throw new Error(`Unsupported email_action_type: ${email_action_type}`);
  }

  const confirmationUrl = buildConfirmationUrl(
    supabaseUrl,
    token_hash,
    email_action_type,
    redirect_to,
    site_url,
  );
  const html = await renderConfirmation(content, confirmationUrl);
  await sendHtmlEmail(resend, user.email, content.subject, html);
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405, headers: corsHeaders });
  }

  const hookSecretRaw = Deno.env.get("SEND_EMAIL_HOOK_SECRET");
  if (!hookSecretRaw) {
    return hookError("SEND_EMAIL_HOOK_SECRET is not configured", 500);
  }
  const hookSecret = hookSecretRaw.replace(/^v1,whsec_/, "");

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  if (!supabaseUrl) {
    return hookError("SUPABASE_URL is not configured", 500);
  }

  const payload = await req.text();
  const headers = Object.fromEntries(req.headers);

  let verified: HookPayload;
  try {
    const wh = new Webhook(hookSecret);
    verified = wh.verify(payload, headers) as HookPayload;
  } catch (e) {
    const message = e instanceof Error ? e.message : "Webhook verification failed";
    return hookError(message, 401);
  }

  try {
    const resend = getResendClient();
    await dispatchAuthEmail(resend, supabaseUrl, verified.user, verified.email_data);
  } catch (e) {
    const message = e instanceof Error ? e.message : "Failed to send email";
    const httpCode =
      typeof (e as { http_code?: number }).http_code === "number"
        ? (e as { http_code: number }).http_code
        : 500;
    console.error("send-email error:", message);
    return hookError(message, httpCode);
  }

  return new Response(JSON.stringify({}), {
    status: 200,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
