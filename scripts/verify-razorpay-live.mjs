#!/usr/bin/env node
/**
 * Post go-live checks: Razorpay Live API, webhook endpoint, DB readiness.
 */

import { readFileSync, existsSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const WEBHOOK_URL =
  'https://ajdcmqbljypgvbhkiwvw.supabase.co/functions/v1/razorpay-webhook';

function loadEnvFile(path) {
  if (!existsSync(path)) return {};
  const out = {};
  for (const line of readFileSync(path, 'utf8').split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq === -1) continue;
    out[trimmed.slice(0, eq).trim()] = trimmed.slice(eq + 1).trim();
  }
  return out;
}

function basicAuth(keyId, keySecret) {
  return `Basic ${Buffer.from(`${keyId}:${keySecret}`).toString('base64')}`;
}

async function check(label, fn) {
  try {
    await fn();
    console.log(`✓ ${label}`);
    return true;
  } catch (e) {
    console.error(`✗ ${label}: ${e.message ?? e}`);
    return false;
  }
}

async function main() {
  const fnEnv = loadEnvFile(join(ROOT, 'supabase', 'functions', '.env'));
  const rootEnv = loadEnvFile(join(ROOT, '.env'));
  const keyId = fnEnv.RAZORPAY_KEY_ID ?? '';
  const keySecret = fnEnv.RAZORPAY_KEY_SECRET ?? '';
  const appKeyId = rootEnv.EXPO_PUBLIC_RAZORPAY_KEY_ID ?? '';
  const eas = JSON.parse(readFileSync(join(ROOT, 'eas.json'), 'utf8'));
  const prodKeyId = eas.build?.production?.env?.EXPO_PUBLIC_RAZORPAY_KEY_ID ?? '';

  let ok = true;

  ok =
    (await check('Live Key ID in supabase/functions/.env', () => {
      if (!keyId.startsWith('rzp_live_')) throw new Error(`Expected rzp_live_, got ${keyId.slice(0, 12)}`);
    })) && ok;

  ok =
    (await check('Key Secret present', () => {
      if (!keySecret || keySecret.length < 8) throw new Error('Missing RAZORPAY_KEY_SECRET');
    })) && ok;

  ok =
    (await check('Webhook secret present', () => {
      if (!fnEnv.RAZORPAY_WEBHOOK_SECRET) throw new Error('Missing RAZORPAY_WEBHOOK_SECRET');
    })) && ok;

  ok =
    (await check('Razorpay Live API auth', async () => {
      const res = await fetch('https://api.razorpay.com/v1/orders?count=1', {
        headers: { Authorization: basicAuth(keyId, keySecret) },
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body?.error?.description ?? `HTTP ${res.status}`);
      }
    })) && ok;

  ok =
    (await check('Live webhook registered at Razorpay', async () => {
      const res = await fetch('https://api.razorpay.com/v1/webhooks', {
        headers: { Authorization: basicAuth(keyId, keySecret) },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error?.description ?? `HTTP ${res.status}`);
      const hit = (data.items ?? []).some((w) => w.url === WEBHOOK_URL && w.active !== false);
      if (!hit) throw new Error(`No active webhook for ${WEBHOOK_URL}`);
    })) && ok;

  ok =
    (await check('Supabase webhook endpoint reachable (expects 401 without signature)', async () => {
      const res = await fetch(WEBHOOK_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: '{}',
      });
      const text = await res.text();
      if (res.status === 503 && text.includes('webhook_not_configured')) {
        throw new Error('RAZORPAY_WEBHOOK_SECRET not set on Supabase');
      }
      if (res.status !== 401) {
        throw new Error(`Expected 401, got ${res.status}: ${text.slice(0, 120)}`);
      }
    })) && ok;

  {
    const res = await fetch('https://api.razorpay.com/v1/accounts', {
      method: 'POST',
      headers: {
        Authorization: basicAuth(keyId, keySecret),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: 'route-healthcheck@tankerhub.in',
        phone: '9999999999',
        type: 'route',
        legal_business_name: 'Route Healthcheck',
        business_type: 'individual',
        contact_name: 'Healthcheck',
      }),
    });
    const data = await res.json().catch(() => ({}));
    const desc = data?.error?.description ?? '';
    if (res.status === 404 || desc.includes('not found on the server')) {
      console.warn(
        '⚠ Route not enabled — enable Razorpay Dashboard → Route, then complete Payments → Razorpay Account Setup in the app (Flow B).'
      );
    } else if (!res.ok && res.status !== 400) {
      ok = false;
      console.error(`✗ Razorpay Route API: ${desc || `HTTP ${res.status}`}`);
    } else {
      console.log('✓ Razorpay Route API reachable (linked accounts)');
    }
  }

  ok =
    (await check('.env app key matches live Key ID', () => {
      if (appKeyId !== keyId) throw new Error(`.env has ${appKeyId.slice(0, 12)}..., expected ${keyId.slice(0, 12)}...`);
    })) && ok;

  ok =
    (await check('eas.json production key matches live Key ID', () => {
      if (prodKeyId !== keyId) throw new Error(`production profile has ${prodKeyId.slice(0, 12)}...`);
    })) && ok;

  console.log(ok ? '\nAll checks passed.' : '\nSome checks failed — review output above.');
  process.exit(ok ? 0 : 1);
}

main();
