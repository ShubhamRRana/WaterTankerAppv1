#!/usr/bin/env node
/**
 * Razorpay Live go-live: create Live webhook, sync Supabase secrets, update app env.
 *
 * Usage (from project root):
 *   1. Copy supabase/functions/.env.example → supabase/functions/.env
 *   2. Fill RAZORPAY_KEY_ID (rzp_live_...) and RAZORPAY_KEY_SECRET
 *   3. node scripts/razorpay-go-live.mjs
 *
 * Or pass inline (PowerShell):
 *   $env:RAZORPAY_KEY_ID="rzp_live_..."; $env:RAZORPAY_KEY_SECRET="..."; node scripts/razorpay-go-live.mjs
 */

import { readFileSync, writeFileSync, existsSync } from 'fs';
import { execSync } from 'child_process';
import { randomBytes } from 'crypto';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const WEBHOOK_URL =
  'https://ajdcmqbljypgvbhkiwvw.supabase.co/functions/v1/razorpay-webhook';
const WEBHOOK_EVENTS = {
  'payment.captured': true,
  'payment.failed': true,
};

function loadEnvFile(path) {
  if (!existsSync(path)) return {};
  const out = {};
  for (const line of readFileSync(path, 'utf8').split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    let val = trimmed.slice(eq + 1).trim();
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }
    out[key] = val;
  }
  return out;
}

function basicAuth(keyId, keySecret) {
  return `Basic ${Buffer.from(`${keyId}:${keySecret}`).toString('base64')}`;
}

async function razorpayFetch(keyId, keySecret, path, options = {}) {
  const res = await fetch(`https://api.razorpay.com/v1${path}`, {
    ...options,
    headers: {
      Authorization: basicAuth(keyId, keySecret),
      'Content-Type': 'application/json',
      ...(options.headers ?? {}),
    },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const msg =
      data?.error?.description ?? data?.error?.reason ?? JSON.stringify(data);
    throw new Error(`Razorpay API ${path}: ${msg}`);
  }
  return data;
}

async function ensureWebhook(keyId, keySecret) {
  const list = await razorpayFetch(keyId, keySecret, '/webhooks');
  const items = list.items ?? [];
  const existing = items.find((w) => w.url === WEBHOOK_URL && w.active !== false);
  if (existing) {
    console.log(`Webhook already exists (id=${existing.id}).`);
    console.log(
      'If you need a new secret, regenerate it in Razorpay Dashboard and set RAZORPAY_WEBHOOK_SECRET in supabase/functions/.env before re-running.'
    );
    return process.env.RAZORPAY_WEBHOOK_SECRET ?? null;
  }

  const created = await razorpayFetch(keyId, keySecret, '/webhooks', {
    method: 'POST',
    body: JSON.stringify({
      url: WEBHOOK_URL,
      active: true,
      secret: randomBytes(24).toString('hex'),
      events: WEBHOOK_EVENTS,
    }),
  });
  console.log(`Created Live webhook (id=${created.id}).`);
  const secret = created.secret;
  if (!secret) {
    throw new Error(
      'Webhook created but no secret returned — copy it from Razorpay Dashboard → Webhooks.'
    );
  }
  return secret;
}

function patchEnvVar(content, key, value) {
  const line = `${key}=${value}`;
  const re = new RegExp(`^${key}=.*$`, 'm');
  if (re.test(content)) return content.replace(re, line);
  return `${content.trimEnd()}\n${line}\n`;
}

function updateRootEnv(liveKeyId) {
  const envPath = join(ROOT, '.env');
  if (!existsSync(envPath)) {
    console.warn('.env not found — skipping root env update.');
    return;
  }
  let content = readFileSync(envPath, 'utf8');
  content = patchEnvVar(content, 'EXPO_PUBLIC_RAZORPAY_KEY_ID', liveKeyId);
  writeFileSync(envPath, content, 'utf8');
  console.log('Updated .env EXPO_PUBLIC_RAZORPAY_KEY_ID');
}

function updateEasJson(liveKeyId) {
  const easPath = join(ROOT, 'eas.json');
  const eas = JSON.parse(readFileSync(easPath, 'utf8'));
  for (const profile of ['development', 'preview', 'production']) {
    if (eas.build?.[profile]?.env) {
      eas.build[profile].env.EXPO_PUBLIC_RAZORPAY_KEY_ID = liveKeyId;
    }
  }
  writeFileSync(easPath, `${JSON.stringify(eas, null, 2)}\n`, 'utf8');
  console.log('Updated eas.json for all build profiles');
}

function writeFunctionsEnv(secrets, preserve) {
  const envPath = join(ROOT, 'supabase', 'functions', '.env');
  const lines = [];
  const merged = { ...preserve, ...secrets };
  for (const [k, v] of Object.entries(merged)) {
    if (v) lines.push(`${k}=${v}`);
  }
  writeFileSync(envPath, `${lines.join('\n')}\n`, 'utf8');
  console.log('Wrote supabase/functions/.env');
}

async function main() {
  const fileEnv = loadEnvFile(join(ROOT, 'supabase', 'functions', '.env'));
  const keyId = process.env.RAZORPAY_KEY_ID ?? fileEnv.RAZORPAY_KEY_ID ?? '';
  const keySecret =
    process.env.RAZORPAY_KEY_SECRET ?? fileEnv.RAZORPAY_KEY_SECRET ?? '';
  let webhookSecret =
    process.env.RAZORPAY_WEBHOOK_SECRET ?? fileEnv.RAZORPAY_WEBHOOK_SECRET ?? '';

  if (!keyId || !keySecret) {
    console.error(
      'Missing RAZORPAY_KEY_ID or RAZORPAY_KEY_SECRET.\n' +
        'Set them in supabase/functions/.env or pass as environment variables.'
    );
    process.exit(1);
  }

  if (!keyId.startsWith('rzp_live_')) {
    console.error(
      `Expected live Key ID (rzp_live_...), got: ${keyId.slice(0, 16)}...`
    );
    process.exit(1);
  }

  console.log('Verifying Razorpay Live credentials…');
  await razorpayFetch(keyId, keySecret, '/orders?count=1');

  if (!webhookSecret) {
    console.log('Creating or locating Live webhook…');
    webhookSecret = await ensureWebhook(keyId, keySecret);
  }

  if (!webhookSecret) {
    console.error(
      'RAZORPAY_WEBHOOK_SECRET is required. Add it to supabase/functions/.env and re-run.'
    );
    process.exit(1);
  }

  const preserve = loadEnvFile(join(ROOT, 'supabase', 'functions', '.env'));
  writeFunctionsEnv(
    {
      RAZORPAY_KEY_ID: keyId,
      RAZORPAY_KEY_SECRET: keySecret,
      RAZORPAY_WEBHOOK_SECRET: webhookSecret,
    },
    preserve
  );

  console.log('Syncing Supabase Edge Function secrets…');
  execSync('npx supabase secrets set --env-file supabase/functions/.env', {
    cwd: ROOT,
    stdio: 'inherit',
  });

  updateRootEnv(keyId);
  updateEasJson(keyId);

  console.log('\nDone. Next steps:');
  console.log('  1. eas build --profile production --platform android');
  console.log('  2. Admin: Payments → Razorpay Account Setup (Live Route KYC)');
  console.log('  3. node scripts/verify-razorpay-live.mjs');
}

main().catch((err) => {
  console.error(err.message ?? err);
  process.exit(1);
});
