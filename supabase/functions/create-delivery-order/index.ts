import {
  assertAgencySubscriptionActive,
  assertDriverForBooking,
  AgencySubscriptionInactiveError,
  hasPendingBookingPayment,
} from "../_shared/activation.ts";
import { errorResponse, handleCors, jsonResponse } from "../_shared/http.ts";
import {
  createOrder,
  getRazorpayConfig,
  rupeesToPaise,
} from "../_shared/razorpay.ts";
import { getServiceClient, getUserFromRequest } from "../_shared/supabase.ts";

Deno.serve(async (req: Request) => {
  const cors = handleCors(req);
  if (cors) return cors;

  try {
    if (req.method !== "POST") {
      return errorResponse("Method not allowed", 405);
    }

    const user = await getUserFromRequest(req);
    if (!user) {
      return errorResponse("Unauthorized", 401);
    }

    const body = await req.json().catch(() => ({}));
    const bookingId = typeof body.bookingId === "string" ? body.bookingId : null;
    if (!bookingId) {
      return errorResponse("bookingId is required", 400);
    }

    const admin = getServiceClient();

    const { data: booking, error: bookingError } = await admin
      .from("bookings")
      .select(
        "id, customer_id, agency_id, total_price, delivered_amount, payment_status, status"
      )
      .eq("id", bookingId)
      .single();

    if (bookingError || !booking) {
      return errorResponse("Booking not found", 404);
    }

    await assertAgencySubscriptionActive(booking.agency_id);

    await assertDriverForBooking(user.id, booking.agency_id);

    if (booking.payment_status === "completed") {
      return errorResponse("Booking is already paid", 400, {
        code: "booking_already_paid",
      });
    }

    if (await hasPendingBookingPayment(bookingId)) {
      return errorResponse("A payment is already in progress for this booking", 409, {
        code: "payment_in_progress",
      });
    }

    if (!booking.agency_id) {
      return errorResponse("Booking has no assigned agency", 400);
    }

    const amountRupees = Number(
      booking.delivered_amount ?? booking.total_price
    );
    if (!amountRupees || amountRupees <= 0) {
      return errorResponse("Delivery amount must be set before collecting payment", 400);
    }

    const { data: agencyAccount, error: agencyError } = await admin
      .from("agency_razorpay_accounts")
      .select("razorpay_account_id, status, default_collection_method")
      .eq("agency_id", booking.agency_id)
      .eq("status", "active")
      .maybeSingle();

    if (agencyError?.code === "42P01") {
      return errorResponse(
        "Agency Razorpay onboarding is not configured yet",
        422,
        { code: "agency_not_onboarded" }
      );
    }

    if (agencyError) {
      throw new Error(agencyError.message);
    }

    if (!agencyAccount?.razorpay_account_id) {
      return errorResponse(
        "Agency is not onboarded for online payments",
        422,
        { code: "agency_not_onboarded" }
      );
    }

    const amountPaise = rupeesToPaise(amountRupees);
    const currency = "INR";
    const receipt = `drv_${bookingId.slice(0, 8)}_${Date.now()}`;

    const order = await createOrder({
      amountPaise,
      currency,
      receipt,
      notes: {
        booking_id: bookingId,
        agency_id: booking.agency_id,
        customer_id: booking.customer_id,
        driver_id: user.id,
        flow: "driver_delivery",
      },
      transfers: [
        {
          account: agencyAccount.razorpay_account_id,
          amount: amountPaise,
          currency,
        },
      ],
    });

    const { error: txError } = await admin.from("payment_transactions").insert({
      user_id: user.id,
      subscription_id: null,
      amount: amountRupees,
      currency,
      payment_gateway: "razorpay",
      gateway_order_id: order.id,
      status: "pending",
      metadata: {
        flow: "driver_delivery",
        booking_id: bookingId,
        agency_id: booking.agency_id,
        customer_id: booking.customer_id,
        driver_id: user.id,
      },
    });

    if (txError) {
      throw new Error(txError.message);
    }

    const { keyId } = getRazorpayConfig();

    return jsonResponse({
      orderId: order.id,
      amount: amountPaise,
      currency,
      keyId,
    });
  } catch (e) {
    console.error(e);
    if (e instanceof AgencySubscriptionInactiveError) {
      return errorResponse(e.message, 403, { code: e.code });
    }
    const message = e instanceof Error ? e.message : "Internal error";
    return errorResponse(message, 500);
  }
});
