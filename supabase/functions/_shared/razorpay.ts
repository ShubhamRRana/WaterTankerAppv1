const RAZORPAY_API_BASE = "https://api.razorpay.com/v1";
const RAZORPAY_ROUTE_API_BASE = "https://api.razorpay.com/v2";

export interface RazorpayConfig {
  keyId: string;
  keySecret: string;
  webhookSecret: string;
}

export interface CreateOrderParams {
  amountPaise: number;
  currency?: string;
  receipt: string;
  notes: Record<string, string>;
  transfers?: Array<{ account: string; amount: number; currency: string }>;
}

export interface RazorpayOrder {
  id: string;
  amount: number;
  currency: string;
  receipt: string;
  notes: Record<string, string>;
}

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return result === 0;
}

async function hmacSha256Hex(secret: string, message: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const sig = await crypto.subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode(message)
  );
  return Array.from(new Uint8Array(sig))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export function getRazorpayConfig(): RazorpayConfig {
  const keyId = Deno.env.get("RAZORPAY_KEY_ID") ?? "";
  const keySecret = Deno.env.get("RAZORPAY_KEY_SECRET") ?? "";
  const webhookSecret = Deno.env.get("RAZORPAY_WEBHOOK_SECRET") ?? "";
  if (!keyId || !keySecret) {
    throw new Error("Missing RAZORPAY_KEY_ID or RAZORPAY_KEY_SECRET");
  }
  return { keyId, keySecret, webhookSecret };
}

function basicAuthHeader(keyId: string, keySecret: string): string {
  const token = btoa(`${keyId}:${keySecret}`);
  return `Basic ${token}`;
}

export async function createOrder(params: CreateOrderParams): Promise<RazorpayOrder> {
  const { keyId, keySecret } = getRazorpayConfig();
  const body: Record<string, unknown> = {
    amount: params.amountPaise,
    currency: params.currency ?? "INR",
    receipt: params.receipt,
    notes: params.notes,
  };
  if (params.transfers?.length) {
    body.transfers = params.transfers;
  }

  const res = await fetch(`${RAZORPAY_API_BASE}/orders`, {
    method: "POST",
    headers: {
      Authorization: basicAuthHeader(keyId, keySecret),
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  const data = await res.json();
  if (!res.ok) {
    const msg = (data as { error?: { description?: string } })?.error?.description ??
      "Razorpay order creation failed";
    throw new Error(msg);
  }
  return data as RazorpayOrder;
}

export interface CreateLinkedAccountParams {
  email: string;
  phone: string;
  legalBusinessName: string;
  contactName: string;
  referenceId: string;
  businessType?: string;
  customerFacingBusinessName?: string;
  pan: string;
  registeredStreet: string;
  registeredStreet2?: string;
  registeredCity: string;
  registeredState: string;
  registeredPostalCode: string;
  notes?: Record<string, string>;
}

export interface RouteSettlementParams {
  accountNumber: string;
  ifsc: string;
  beneficiaryName: string;
}

export interface CreateStakeholderParams {
  accountId: string;
  name: string;
  email: string;
  phone: string;
  pan: string;
  street: string;
  city: string;
  state: string;
  postalCode: string;
}

function parseRazorpayError(data: unknown, fallback: string): string {
  const err = (data as {
    error?: { description?: string; reason?: string; field?: string };
  })?.error;
  const base = err?.description ?? err?.reason ?? fallback;
  if (err?.field && !base.toLowerCase().includes(err.field.toLowerCase())) {
    return `${base} (field: ${err.field})`;
  }
  return base;
}

const PAN_ENTITY_BUSINESS_TYPE: Record<string, string> = {
  // Personal PAN (P) must use "individual" — Razorpay rejects personal PAN in
  // legal_info when business_type is "proprietorship" ("company pan" validation).
  P: "individual",
  C: "private_limited",
  F: "partnership",
  H: "not_for_profit",
  T: "trust",
  A: "partnership",
  B: "partnership",
};

/** Personal PAN cards have P as the 4th character (e.g. ABCDE1234F). */
export function isPersonalPan(pan: string): boolean {
  return pan.trim().toUpperCase()[3] === "P";
}

/** Maps the PAN 4th character (entity type) to Razorpay Route business_type. */
export function inferBusinessTypeFromPan(pan: string): string {
  const normalized = pan.trim().toUpperCase();
  const entityChar = normalized[3];
  const businessType = PAN_ENTITY_BUSINESS_TYPE[entityChar];
  if (!businessType) {
    throw new Error(
      "Could not determine business type from PAN. Use your registered business PAN (company/partnership) or personal PAN for sole proprietorship."
    );
  }
  return businessType;
}

export function mapRazorpayRouteError(message: string): string {
  const lower = message.toLowerCase();
  if (
    lower.includes("not found on the server") ||
    lower.includes("marketplace feature is not enabled") ||
    lower.includes("invalid type: route")
  ) {
    return "Razorpay Route is not enabled on your merchant account. Enable Route in Razorpay Dashboard, then try again.";
  }
  if (lower.includes("merchant email already exists")) {
    return "This email is already registered with Razorpay from a previous setup attempt. Submit again to continue that account.";
  }
  if (lower.includes("already in use")) {
    return "A previous Route setup attempt is still registered with Razorpay. Submit again to continue it.";
  }
  if (lower.includes("company pan") && lower.includes("individual")) {
    return "Razorpay rejected the account-level PAN for Individual registration. Retry submission — personal PAN is verified via your stakeholder details.";
  }
  if (lower.includes("company pan") && lower.includes("proprietorship")) {
    return "Personal PAN cannot be placed in account legal_info for Proprietorship. Retry with your personal PAN — it is registered under Individual via stakeholder KYC.";
  }
  if (lower.includes("pan") && lower.includes("invalid")) {
    return `${message}. Use your personal PAN for sole operation, enter your name exactly as on the PAN card, and use the mobile number linked to Aadhaar/CKYC.`;
  }
  return message;
}

export class RazorpayRouteApiError extends Error {
  constructor(
    message: string,
    readonly rawMessage: string,
    readonly existingAccountId?: string
  ) {
    super(message);
    this.name = "RazorpayRouteApiError";
  }
}

export function extractLinkedAccountIdFromError(message: string): string | undefined {
  const match = message.match(/acc_[A-Za-z0-9]+/);
  return match?.[0];
}

export function isDuplicateLinkedAccountError(message: string): boolean {
  const lower = message.toLowerCase();
  return lower.includes("already in use") ||
    lower.includes("merchant email already exists");
}

async function razorpayRouteRequest(
  path: string,
  options: { method?: string; body?: Record<string, unknown> } = {}
): Promise<Record<string, unknown>> {
  const { keyId, keySecret } = getRazorpayConfig();
  const res = await fetch(`${RAZORPAY_ROUTE_API_BASE}${path}`, {
    method: options.method ?? "GET",
    headers: {
      Authorization: basicAuthHeader(keyId, keySecret),
      "Content-Type": "application/json",
    },
    body: options.body ? JSON.stringify(options.body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const rawMessage = parseRazorpayError(data, "Razorpay Route request failed");
    const mapped = mapRazorpayRouteError(rawMessage);
    throw new RazorpayRouteApiError(
      mapped,
      rawMessage,
      extractLinkedAccountIdFromError(rawMessage)
    );
  }
  return data as Record<string, unknown>;
}

export async function findLinkedAccountByEmail(
  email: string
): Promise<Record<string, unknown> | null> {
  try {
    const data = await razorpayRouteRequest("/accounts?count=100");
    const items = (data as { items?: Array<Record<string, unknown>> }).items ?? [];
    const normalized = email.trim().toLowerCase();
    return items.find((account) =>
      String(account.email ?? "").toLowerCase() === normalized
    ) ?? null;
  } catch {
    return null;
  }
}

export async function createOrReuseLinkedAccount(
  params: CreateLinkedAccountParams
): Promise<Record<string, unknown>> {
  try {
    return await createLinkedAccount(params);
  } catch (error) {
    if (!(error instanceof RazorpayRouteApiError) ||
      !isDuplicateLinkedAccountError(error.rawMessage)) {
      throw error;
    }

    if (error.existingAccountId) {
      return fetchLinkedAccount(error.existingAccountId);
    }

    const existing = await findLinkedAccountByEmail(params.email);
    if (existing) return existing;

    throw error;
  }
}

export async function createLinkedAccount(
  params: CreateLinkedAccountParams
): Promise<Record<string, unknown>> {
  const businessType = params.businessType ?? inferBusinessTypeFromPan(params.pan);
  const body: Record<string, unknown> = {
    email: params.email,
    phone: params.phone,
    type: "route",
    reference_id: params.referenceId,
    legal_business_name: params.legalBusinessName,
    customer_facing_business_name:
      params.customerFacingBusinessName ?? params.legalBusinessName,
    business_type: businessType,
    contact_name: params.contactName,
    profile: {
      category: "others",
      subcategory: "others",
      addresses: {
        registered: {
          street1: params.registeredStreet,
          street2: params.registeredStreet2?.trim() || params.registeredCity,
          city: params.registeredCity,
          state: params.registeredState.toUpperCase(),
          postal_code: params.registeredPostalCode,
          country: "IN",
        },
      },
    },
    notes: params.notes ?? {},
  };

  // Account-level legal_info.pan is for registered business PANs only.
  // Personal PAN (4th char P) is submitted on the stakeholder KYC record.
  if (!isPersonalPan(params.pan)) {
    body.legal_info = { pan: params.pan.toUpperCase() };
  }

  return razorpayRouteRequest("/accounts", {
    method: "POST",
    body,
  });
}

export async function createLinkedAccountStakeholder(
  params: CreateStakeholderParams
): Promise<Record<string, unknown>> {
  const phoneDigits = params.phone.replace(/\D/g, "");
  return razorpayRouteRequest(`/accounts/${params.accountId}/stakeholders`, {
    method: "POST",
    body: {
      name: params.name,
      email: params.email,
      phone: {
        primary: phoneDigits.length === 12 && phoneDigits.startsWith("91")
          ? phoneDigits.slice(2)
          : phoneDigits,
      },
      percentage_ownership: 100,
      relationship: { executive: true },
      addresses: {
        residential: {
          street: params.street,
          city: params.city,
          state: params.state,
          postal_code: params.postalCode,
          country: "IN",
        },
      },
      kyc: {
        pan: params.pan.toUpperCase(),
      },
    },
  });
}

export function isStakeholderAlreadyExistsError(message: string): boolean {
  const lower = message.toLowerCase();
  return lower.includes("stakeholders cannot be more than one") ||
    lower.includes("stakeholder already");
}

export async function requestRouteProduct(
  accountId: string
): Promise<Record<string, unknown>> {
  return razorpayRouteRequest(`/accounts/${accountId}/products`, {
    method: "POST",
    body: {
      product_name: "route",
      tnc_accepted: true,
    },
  });
}

export async function updateRouteProductSettlement(
  accountId: string,
  productId: string,
  params: RouteSettlementParams
): Promise<Record<string, unknown>> {
  return razorpayRouteRequest(`/accounts/${accountId}/products/${productId}`, {
    method: "PATCH",
    body: {
      settlements: {
        account_number: params.accountNumber,
        ifsc_code: params.ifsc.toUpperCase(),
        beneficiary_name: params.beneficiaryName,
      },
      tnc_accepted: true,
    },
  });
}

export async function fetchLinkedAccount(
  accountId: string
): Promise<Record<string, unknown>> {
  return razorpayRouteRequest(`/accounts/${accountId}`);
}

export async function verifyPaymentSignature(
  orderId: string,
  paymentId: string,
  signature: string
): Promise<boolean> {
  const { keySecret } = getRazorpayConfig();
  const expected = await hmacSha256Hex(keySecret, `${orderId}|${paymentId}`);
  return timingSafeEqual(expected, signature);
}

export async function verifyWebhookSignature(
  rawBody: string,
  signatureHeader: string | null
): Promise<boolean> {
  const { webhookSecret } = getRazorpayConfig();
  if (!webhookSecret) {
    throw new Error("Missing RAZORPAY_WEBHOOK_SECRET");
  }
  if (!signatureHeader) return false;
  const expected = await hmacSha256Hex(webhookSecret, rawBody);
  return timingSafeEqual(expected, signatureHeader);
}

export function rupeesToPaise(rupees: number): number {
  return Math.round(Number(rupees) * 100);
}
