#!/usr/bin/env node
/**
 * Sends a signed test payload to razorpay-webhook (no DB side effects — skipped payment entity).
 */

import { createHmac } from 'crypto';
import { readFileSync, existsSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

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

async function main() {
  const fnEnv = loadEnvFile(
    join(dirname(fileURLToPath(import.meta.url)), '..', 'supabase', 'functions', '.env')
  );
  const secret = fnEnv.RAZORPAY_WEBHOOK_SECRET;
  if (!secret) {
    console.error('Missing RAZORPAY_WEBHOOK_SECRET in supabase/functions/.env');
    process.exit(1);
  }

  const body = JSON.stringify({ event: 'test.ping', payload: {} });
  const signature = createHmac('sha256', secret).update(body).digest('hex');

  const res = await fetch(WEBHOOK_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Razorpay-Signature': signature,
    },
    body,
  });
  const text = await res.text();
  console.log(`Status: ${res.status}`);
  console.log(`Body: ${text}`);

  if (res.status !== 200) {
    process.exit(1);
  }
  console.log('Signed webhook accepted by Supabase Edge Function.');
}

main();
