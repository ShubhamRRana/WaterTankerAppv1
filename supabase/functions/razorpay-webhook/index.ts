import {
  activateSubscriptionPayment,
  completeBookingPayment,
  failBookingPayment,
  failPaymentTransaction,
  failSubscriptionPayment,
  recordDeliveryTransfer,
  updateAgencyRazorpayAccountStatus,
} from "../_shared/activation.ts";
import { errorResponse, handleCors, jsonResponse } from "../_shared/http.ts";
import { verifyWebhookSignature } from "../_shared/razorpay.ts";
import { getServiceClient } from "../_shared/supabase.ts";

interface RazorpayWebhookPayload {
  event?: string;
  payload?: {
    payment?: {
      entity?: {
        id?: string;
        order_id?: string;
        method?: string;
        bank?: string;
        error_description?: string;
        notes?: Record<string, string>;
      };
    };
    account?: {
      entity?: {
        id?: string;
        status?: string;
        notes?: Record<string, string>;
      };
    };
    transfer?: {
      entity?: {
        id?: string;
        source?: string;
        status?: string;
        notes?: Record<string, string>;
      };
    };
  };
}

function mapAccountStatus(razorpayStatus?: string): string {
  switch (razorpayStatus) {
    case "activated":
      return "active";
    case "suspended":
      return "suspended";
    case "rejected":
      return "rejected";
    case "under_review":
      return "under_review";
    default:
      return "created";
  }
}

Deno.serve(async (req: Request) => {
  const cors = handleCors(req);
  if (cors) return cors;

  try {
    if (req.method !== "POST") {
      return errorResponse("Method not allowed", 405);
    }

    const rawBody = await req.text();
    const signature = req.headers.get("X-Razorpay-Signature");

    let valid = false;
    try {
      valid = await verifyWebhookSignature(rawBody, signature);
    } catch (sigError) {
      const msg = sigError instanceof Error ? sigError.message : "";
      if (msg.includes("RAZORPAY_WEBHOOK_SECRET")) {
        return errorResponse(
          "Webhook secret not configured in Supabase secrets",
          503,
          { code: "webhook_not_configured" }
        );
      }
      throw sigError;
    }
    if (!valid) {
      return errorResponse("Invalid webhook signature", 401);
    }

    let payload: RazorpayWebhookPayload;
    try {
      payload = JSON.parse(rawBody) as RazorpayWebhookPayload;
    } catch {
      return errorResponse("Invalid JSON body", 400);
    }
    const event = payload.event ?? "";

    if (event === "account.activated" || event === "account.updated") {
      const account = payload.payload?.account?.entity;
      const agencyId = account?.notes?.agency_id;
      if (agencyId && account?.id) {
        await updateAgencyRazorpayAccountStatus(
          agencyId,
          mapAccountStatus(account.status),
          account.id
        );
      }
      return jsonResponse({ received: true });
    }

    if (event === "transfer.processed" || event === "transfer.failed") {
      const transfer = payload.payload?.transfer?.entity;
      if (transfer?.id) {
        const transferStatus = event === "transfer.processed"
          ? "processed"
          : transfer.status ?? "failed";
        const notes = transfer.notes ?? {};
        const orderId = notes.order_id ?? null;
        await recordDeliveryTransfer({
          transferId: transfer.id,
          paymentId: transfer.source ?? null,
          orderId: typeof orderId === "string" ? orderId : null,
          status: transferStatus,
          settledAt: event === "transfer.processed" ? new Date().toISOString() : null,
        });
      }
      return jsonResponse({ received: true });
    }

    const payment = payload.payload?.payment?.entity;
    if (!payment?.id || !payment.order_id) {
      return jsonResponse({ received: true, skipped: "no_payment_entity" });
    }

    const admin = getServiceClient();
    const { data: existingTx } = await admin
      .from("payment_transactions")
      .select("id, status, metadata, subscription_id, user_id")
      .eq("gateway_order_id", payment.order_id)
      .maybeSingle();

    if (existingTx?.status === "success" && event === "payment.captured") {
      return jsonResponse({ received: true, alreadyProcessed: true });
    }

    const notes = payment.notes ?? {};
    const dbMeta = (existingTx?.metadata as Record<string, unknown> | null) ?? {};
    const flow = notes.flow ?? dbMeta.flow;

    if (event === "payment.captured") {
      if (
        flow === "customer_subscription" ||
        flow === "agency_subscription"
      ) {
        const subscriptionId = notes.subscription_id ??
          (existingTx?.subscription_id as string | undefined);
        const userId = notes.user_id ?? (existingTx?.user_id as string | undefined);
        if (subscriptionId && userId) {
          await activateSubscriptionPayment({
            subscriptionId,
            userId,
            orderId: payment.order_id,
            paymentId: payment.id,
            paymentMethod: payment.method ?? null,
            bankName: payment.bank ?? null,
          });
        }
      } else if (
        flow === "customer_booking" ||
        flow === "driver_delivery"
      ) {
        const notesBookingId = typeof notes.booking_id === "string" ? notes.booking_id : null;
        const dbBookingId = typeof dbMeta.booking_id === "string" ? dbMeta.booking_id : null;

        // If both sources have a booking_id they must agree; a mismatch means
        // the webhook notes and the DB record have diverged — skip rather than
        // completing the wrong booking.
        if (notesBookingId && dbBookingId && notesBookingId !== dbBookingId) {
          console.error(`Booking ID mismatch: notes=${notesBookingId} db=${dbBookingId} order=${payment.order_id}`);
          return jsonResponse({ received: true, skipped: "booking_id_mismatch" });
        }

        const bookingId = notesBookingId ?? dbBookingId;
        if (bookingId) {
          await completeBookingPayment({
            bookingId,
            orderId: payment.order_id,
            paymentId: payment.id,
            paymentMethod: payment.method ?? null,
            bankName: payment.bank ?? null,
            markDelivered: flow === "driver_delivery",
          });
        }
      }
    } else if (event === "payment.failed") {
      await failPaymentTransaction(
        payment.order_id,
        payment.id,
        payment.error_description
      );
      if (
        (flow === "customer_booking" || flow === "driver_delivery") &&
        notes.booking_id
      ) {
        await failBookingPayment(notes.booking_id, payment.id);
      }
      if (flow === "agency_subscription" || flow === "customer_subscription") {
        await failSubscriptionPayment(payment.order_id);
      }
    }

    return jsonResponse({ received: true });
  } catch (e) {
    console.error(e);
    const message = e instanceof Error ? e.message : "Internal error";
    return errorResponse(message, 500);
  }
});
