import { getServiceClient } from "./supabase.ts";

export class AgencySubscriptionInactiveError extends Error {
  code = "agency_subscription_inactive";

  constructor(message = "Agency subscription inactive") {
    super(message);
    this.name = "AgencySubscriptionInactiveError";
  }
}

export async function assertAgencySubscriptionActive(agencyId: string): Promise<void> {
  const admin = getServiceClient();
  const { data, error } = await admin.rpc("has_active_subscription", {
    p_user_id: agencyId,
  });

  if (error) {
    throw new Error(`Subscription check failed: ${error.message}`);
  }

  if (!data) {
    throw new AgencySubscriptionInactiveError();
  }
}

export async function assertAdminUser(userId: string): Promise<void> {
  const admin = getServiceClient();
  const { data: roleRow, error: roleError } = await admin
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .eq("role", "admin")
    .maybeSingle();

  if (roleError || !roleRow) {
    throw new Error("Only admin accounts can use this endpoint");
  }
}

export async function assertDriverForBooking(
  userId: string,
  bookingAgencyId: string
): Promise<void> {
  const admin = getServiceClient();
  const { data: roleRow, error: roleError } = await admin
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .eq("role", "driver")
    .maybeSingle();

  if (roleError || !roleRow) {
    throw new Error("Only driver accounts can use this endpoint");
  }

  const { data: driverRow, error: driverError } = await admin
    .from("users")
    .select("created_by_admin_id")
    .eq("id", userId)
    .single();

  if (driverError || !driverRow?.created_by_admin_id) {
    throw new Error("Driver agency not found");
  }

  if (driverRow.created_by_admin_id !== bookingAgencyId) {
    throw new Error("Driver does not belong to this booking agency");
  }
}

export async function hasPendingBookingPayment(bookingId: string): Promise<boolean> {
  const admin = getServiceClient();
  const { data } = await admin
    .from("payment_transactions")
    .select("id")
    .eq("status", "pending")
    .contains("metadata", { booking_id: bookingId })
    .limit(1);
  return (data?.length ?? 0) > 0;
}

export interface ActivateSubscriptionParams {
  subscriptionId: string;
  userId: string;
  orderId: string;
  paymentId: string;
  paymentMethod?: string | null;
  bankName?: string | null;
}

export async function activateSubscriptionPayment(
  params: ActivateSubscriptionParams
): Promise<{ alreadyCompleted: boolean }> {
  const admin = getServiceClient();

  const { data: tx, error: txError } = await admin
    .from("payment_transactions")
    .select("id, status, subscription_id, user_id, metadata")
    .eq("gateway_order_id", params.orderId)
    .maybeSingle();

  if (txError || !tx) {
    throw new Error("Payment transaction not found");
  }
  if (tx.user_id !== params.userId) {
    throw new Error("Unauthorized payment transaction");
  }
  if (tx.subscription_id && tx.subscription_id !== params.subscriptionId) {
    throw new Error("Subscription mismatch");
  }

  const flow = (tx.metadata as Record<string, unknown> | null)?.flow;
  // Reject absent flow — all subscription payments must carry an explicit flow tag.
  if (flow !== "agency_subscription" && flow !== "customer_subscription") {
    throw new Error("Invalid payment flow for subscription activation");
  }

  // Validate subscription ownership and plan before touching any records.
  const { data: sub, error: subError } = await admin
    .from("subscriptions")
    .select("id, plan_id, user_id, status")
    .eq("id", params.subscriptionId)
    .single();

  if (subError || !sub || sub.user_id !== params.userId) {
    throw new Error("Subscription not found");
  }

  // Guard on subscription status rather than payment_transaction status so that
  // a partial-commit (tx=success but sub still pending) is recoverable on retry
  // instead of being permanently blocked by the old tx-status early-return.
  if (sub.status === "active") {
    return { alreadyCompleted: true };
  }

  const { data: plan, error: planError } = await admin
    .from("subscription_plans")
    .select("duration_months")
    .eq("id", sub.plan_id)
    .single();

  if (planError || !plan) {
    throw new Error("Plan not found");
  }

  const now = new Date().toISOString();

  // WHERE status='pending' makes the UPDATE atomic against concurrent webhook
  // retries: only one request matches and writes 'success'; the rest see zero
  // updated rows and return alreadyCompleted, preventing double-activation.
  const { data: updatedTx, error: txUpdateError } = await admin
    .from("payment_transactions")
    .update({
      status: "success",
      gateway_transaction_id: params.paymentId,
      payment_method: params.paymentMethod ?? null,
      bank_name: params.bankName ?? null,
      completed_at: now,
      updated_at: now,
    })
    .eq("id", tx.id)
    .eq("status", "pending")
    .select("id");

  if (txUpdateError) {
    throw new Error(`Failed to record payment: ${txUpdateError.message}`);
  }

  if (!updatedTx || updatedTx.length === 0) {
    return { alreadyCompleted: true };
  }

  const startDate = new Date();
  const endDate = new Date(startDate);
  endDate.setMonth(endDate.getMonth() + Number(plan.duration_months));

  const { error: subUpdateError } = await admin
    .from("subscriptions")
    .update({
      status: "active",
      is_trial: false,
      trial_end_date: null,
      start_date: startDate.toISOString(),
      end_date: endDate.toISOString(),
      updated_at: now,
    })
    .eq("id", params.subscriptionId);

  if (subUpdateError) {
    throw new Error(`Failed to activate subscription: ${subUpdateError.message}`);
  }

  return { alreadyCompleted: false };
}

export async function failSubscriptionPayment(orderId: string): Promise<void> {
  const admin = getServiceClient();
  const now = new Date().toISOString();

  const { data: tx } = await admin
    .from("payment_transactions")
    .select("subscription_id")
    .eq("gateway_order_id", orderId)
    .maybeSingle();

  if (!tx?.subscription_id) return;

  await admin
    .from("subscriptions")
    .update({ status: "failed", updated_at: now })
    .eq("id", tx.subscription_id)
    .neq("status", "active");
}

export async function failPaymentTransaction(
  orderId: string,
  paymentId: string,
  message?: string
): Promise<void> {
  const admin = getServiceClient();
  const now = new Date().toISOString();
  await admin
    .from("payment_transactions")
    .update({
      status: "failed",
      gateway_transaction_id: paymentId,
      gateway_response_message: message ?? null,
      completed_at: now,
      updated_at: now,
    })
    .eq("gateway_order_id", orderId)
    .neq("status", "success");
}

