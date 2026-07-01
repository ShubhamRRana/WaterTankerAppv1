import { getServiceClient } from "./supabase.ts";

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
  if (
    flow &&
    flow !== "agency_subscription" &&
    flow !== "customer_subscription"
  ) {
    throw new Error("Invalid payment flow for subscription activation");
  }

  if (tx.status === "success") {
    return { alreadyCompleted: true };
  }

  const now = new Date().toISOString();

  await admin
    .from("payment_transactions")
    .update({
      status: "success",
      gateway_transaction_id: params.paymentId,
      payment_method: params.paymentMethod ?? null,
      bank_name: params.bankName ?? null,
      completed_at: now,
      updated_at: now,
    })
    .eq("id", tx.id);

  const { data: sub, error: subError } = await admin
    .from("subscriptions")
    .select("id, plan_id, user_id")
    .eq("id", params.subscriptionId)
    .single();

  if (subError || !sub || sub.user_id !== params.userId) {
    throw new Error("Subscription not found");
  }

  const { data: plan, error: planError } = await admin
    .from("subscription_plans")
    .select("duration_months")
    .eq("id", sub.plan_id)
    .single();

  if (planError || !plan) {
    throw new Error("Plan not found");
  }

  const startDate = new Date();
  const endDate = new Date(startDate);
  endDate.setMonth(endDate.getMonth() + Number(plan.duration_months));

  await admin
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

  return { alreadyCompleted: false };
}

export interface CompleteBookingParams {
  bookingId: string;
  orderId: string;
  paymentId: string;
  paymentMethod?: string | null;
  bankName?: string | null;
  markDelivered?: boolean;
  paymentMethodOverride?: string | null;
}

export async function completeBookingPayment(
  params: CompleteBookingParams
): Promise<{ alreadyCompleted: boolean }> {
  const admin = getServiceClient();

  const { data: booking, error: bookingError } = await admin
    .from("bookings")
    .select("id, payment_status, payment_id, status")
    .eq("id", params.bookingId)
    .single();

  if (bookingError || !booking) {
    throw new Error("Booking not found");
  }

  if (booking.payment_status === "completed") {
    return { alreadyCompleted: true };
  }

  const now = new Date().toISOString();
  const bookingUpdate: Record<string, unknown> = {
    payment_status: "completed",
    payment_id: params.paymentId,
    updated_at: now,
  };

  if (params.markDelivered) {
    bookingUpdate.status = "delivered";
    bookingUpdate.delivered_at = now;
  }

  await admin.from("bookings").update(bookingUpdate).eq("id", params.bookingId);

  const { data: tx } = await admin
    .from("payment_transactions")
    .select("id, status")
    .eq("gateway_order_id", params.orderId)
    .maybeSingle();

  if (tx && tx.status !== "success") {
    await admin
      .from("payment_transactions")
      .update({
        status: "success",
        gateway_transaction_id: params.paymentId,
        payment_method: params.paymentMethodOverride ?? params.paymentMethod ?? null,
        bank_name: params.bankName ?? null,
        completed_at: now,
        updated_at: now,
      })
      .eq("id", tx.id);
  }

  return { alreadyCompleted: false };
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

export async function failBookingPayment(
  bookingId: string,
  paymentId: string
): Promise<void> {
  const admin = getServiceClient();
  const now = new Date().toISOString();
  await admin
    .from("bookings")
    .update({
      payment_status: "failed",
      payment_id: paymentId,
      updated_at: now,
    })
    .eq("id", bookingId)
    .neq("payment_status", "completed");
}

export interface RecordTransferParams {
  transferId: string;
  paymentId?: string | null;
  orderId?: string | null;
  status: string;
  settledAt?: string | null;
}

export async function recordDeliveryTransfer(
  params: RecordTransferParams
): Promise<{ updated: boolean }> {
  const admin = getServiceClient();
  const now = new Date().toISOString();

  let query = admin
    .from("payment_transactions")
    .select("id, metadata, gateway_order_id, gateway_transaction_id");

  if (params.paymentId) {
    query = query.eq("gateway_transaction_id", params.paymentId);
  } else if (params.orderId) {
    query = query.eq("gateway_order_id", params.orderId);
  } else {
    return { updated: false };
  }

  const { data: tx, error } = await query.maybeSingle();
  if (error || !tx) {
    return { updated: false };
  }

  const existingMeta = (tx.metadata as Record<string, unknown> | null) ?? {};
  const flow = existingMeta.flow;
  if (flow !== "driver_delivery" && flow !== "customer_booking") {
    return { updated: false };
  }

  const existingTransferId = existingMeta.transfer_id;
  if (
    existingTransferId === params.transferId &&
    existingMeta.transfer_status === params.status
  ) {
    return { updated: false };
  }

  const metadata: Record<string, unknown> = {
    ...existingMeta,
    transfer_id: params.transferId,
    transfer_status: params.status,
  };
  if (params.settledAt) {
    metadata.transfer_settled_at = params.settledAt;
  }

  await admin
    .from("payment_transactions")
    .update({
      metadata,
      updated_at: now,
    })
    .eq("id", tx.id);

  return { updated: true };
}

export async function updateAgencyRazorpayAccountStatus(
  agencyId: string,
  status: string,
  razorpayAccountId?: string,
  rejectionReason?: string
): Promise<void> {
  const admin = getServiceClient();
  const now = new Date().toISOString();
  const update: Record<string, unknown> = { status, updated_at: now };
  if (razorpayAccountId) update.razorpay_account_id = razorpayAccountId;
  if (rejectionReason) update.rejection_reason = rejectionReason;

  await admin
    .from("agency_razorpay_accounts")
    .update(update)
    .eq("agency_id", agencyId);
}
