import { FunctionsHttpError } from '@supabase/supabase-js';
import { supabase } from '../lib/supabaseClient';
import { subscriptionDataAccess } from '../lib/subscriptionDataAccess';
import { dataAccess } from '../lib/index';
import { ERROR_MESSAGES } from '../constants/config';
import { handleError } from '../utils/errorHandler';
import { getErrorMessage } from '../utils/errors';
import { mapPaymentErrorCode } from '../utils/paymentErrors';
import { generateShortId } from '../utils/idUtils';
import type {
  BookingPaymentVerifyResult,
  PaymentFlow,
  RazorpayOrderResponse,
  RazorpayVerifyPayload,
  SubscriptionPaymentVerifyResult,
} from '../types/razorpay.types';
import type { PaymentTransaction, PaymentTransactionStatus } from '../types/subscription.types';

export interface PaymentResult {
  success: boolean;
  paymentId?: string;
  error?: string;
}

export interface PaymentHistoryOptions {
  flow?: PaymentFlow;
  status?: PaymentTransactionStatus;
}

export interface PaymentHistoryItem extends PaymentTransaction {
  flow: PaymentFlow | null;
  flowLabel: string;
  bookingId: string | null;
}

async function parseEdgeFunctionErrorBody(
  error: unknown,
  fallback: string
): Promise<{ message: string; code?: string }> {
  if (error instanceof FunctionsHttpError) {
    try {
      const body = (await error.context.json()) as { error?: string; code?: string };
      if (body?.error) {
        return body.code ? { message: body.error, code: body.code } : { message: body.error };
      }
    } catch {
      // ignore
    }
  }
  if (error && typeof error === 'object' && 'message' in error) {
    const message = (error as { message?: string }).message;
    if (message) return { message };
  }
  return { message: fallback };
}

function inferPaymentFlow(tx: PaymentTransaction): PaymentFlow | null {
  const metaFlow = tx.metadata?.flow;
  if (
    metaFlow === 'agency_subscription' ||
    metaFlow === 'driver_delivery' ||
    metaFlow === 'customer_subscription' ||
    metaFlow === 'customer_booking'
  ) {
    return metaFlow as PaymentFlow;
  }
  if (tx.subscriptionId) return 'agency_subscription';
  const bookingId = tx.metadata?.booking_id;
  if (typeof bookingId === 'string' && bookingId.length > 0) return 'driver_delivery';
  return null;
}

function flowLabel(flow: PaymentFlow | null): string {
  switch (flow) {
    case 'agency_subscription':
      return 'Platform subscription';
    case 'driver_delivery':
      return 'Delivery';
    case 'customer_subscription':
      return 'Customer subscription';
    case 'customer_booking':
      return 'Customer delivery';
    default:
      return 'Payment';
  }
}

export class PaymentService {
  static async createSubscriptionPayment(
    subscriptionId: string,
    planId: string
  ): Promise<RazorpayOrderResponse> {
    const { data, error } = await supabase.functions.invoke('create-subscription-order', {
      body: { subscriptionId, planId },
    });
    if (error) {
      const parsed = await parseEdgeFunctionErrorBody(error, ERROR_MESSAGES.payment.failed);
      throw new Error(mapPaymentErrorCode(parsed.code, parsed.message));
    }
    if (!data || typeof data !== 'object' || 'error' in (data as object)) {
      throw new Error((data as { error?: string })?.error ?? ERROR_MESSAGES.payment.failed);
    }
    return data as RazorpayOrderResponse;
  }

  static async verifySubscriptionPayment(
    subscriptionId: string,
    payload: RazorpayVerifyPayload
  ): Promise<SubscriptionPaymentVerifyResult> {
    const { data, error } = await supabase.functions.invoke('verify-subscription-payment', {
      body: { subscriptionId, ...payload },
    });
    if (error) {
      const parsed = await parseEdgeFunctionErrorBody(error, ERROR_MESSAGES.payment.failed);
      const result: SubscriptionPaymentVerifyResult = {
        success: false,
        error: mapPaymentErrorCode(parsed.code, parsed.message),
      };
      if (parsed.code) result.code = parsed.code;
      return result;
    }
    const body = data as SubscriptionPaymentVerifyResult & { error?: string };
    if (body?.error) {
      return { success: false, error: body.error };
    }
    const ok: SubscriptionPaymentVerifyResult = { success: true, subscriptionId };
    if (body.alreadyCompleted !== undefined) ok.alreadyCompleted = body.alreadyCompleted;
    return ok;
  }

  static async createDeliveryPayment(bookingId: string): Promise<RazorpayOrderResponse> {
    const { data, error } = await supabase.functions.invoke('create-delivery-order', {
      body: { bookingId },
    });
    if (error) {
      const parsed = await parseEdgeFunctionErrorBody(error, ERROR_MESSAGES.payment.failed);
      throw new Error(mapPaymentErrorCode(parsed.code, parsed.message));
    }
    if (!data || typeof data !== 'object' || 'error' in (data as object)) {
      throw new Error((data as { error?: string })?.error ?? ERROR_MESSAGES.payment.failed);
    }
    return data as RazorpayOrderResponse;
  }

  static async verifyDeliveryPayment(
    bookingId: string,
    payload: RazorpayVerifyPayload
  ): Promise<BookingPaymentVerifyResult> {
    const { data, error } = await supabase.functions.invoke('verify-delivery-payment', {
      body: { bookingId, ...payload },
    });
    if (error) {
      const parsed = await parseEdgeFunctionErrorBody(error, ERROR_MESSAGES.payment.failed);
      const result: BookingPaymentVerifyResult = {
        success: false,
        error: mapPaymentErrorCode(parsed.code, parsed.message),
      };
      if (parsed.code) result.code = parsed.code;
      return result;
    }
    const body = data as BookingPaymentVerifyResult & { error?: string };
    if (body?.error) {
      return { success: false, error: body.error };
    }
    const ok: BookingPaymentVerifyResult = { success: true, bookingId };
    if (body.alreadyCompleted !== undefined) ok.alreadyCompleted = body.alreadyCompleted;
    return ok;
  }

  static async recordCashPayment(bookingId: string, note?: string): Promise<PaymentResult> {
    try {
      const booking = await dataAccess.bookings.getBookingById(bookingId);
      if (!booking) return { success: false, error: 'Booking not found' };
      const paymentId = `cash_${bookingId}_${Date.now()}_${generateShortId()}`;
      const amount = booking.deliveredAmount ?? booking.totalPrice;
      const agencyId = booking.agencyId;
      const { data: authData } = await supabase.auth.getUser();
      const driverId = authData.user?.id;

      await dataAccess.bookings.updateBooking(bookingId, {
        paymentStatus: 'completed',
        paymentId,
        status: 'delivered',
        deliveredAt: new Date(),
      });

      if (driverId && agencyId) {
        await supabase.from('payment_transactions').insert({
          user_id: driverId,
          amount,
          currency: 'INR',
          payment_gateway: 'cash',
          gateway_transaction_id: paymentId,
          status: 'success',
          payment_method: 'cash',
          metadata: {
            flow: 'driver_delivery',
            booking_id: bookingId,
            agency_id: agencyId,
            note: note ?? 'driver_cash',
          },
          initiated_at: new Date().toISOString(),
          completed_at: new Date().toISOString(),
        });
      }

      return { success: true, paymentId };
    } catch (error) {
      handleError(error, { context: { operation: 'recordCashPayment', bookingId, note } });
      return { success: false, error: getErrorMessage(error, 'Cash payment failed') };
    }
  }

  static async getPaymentHistory(
    userId: string,
    options?: PaymentHistoryOptions
  ): Promise<PaymentHistoryItem[]> {
    const rows = await subscriptionDataAccess.getPaymentTransactionsByUser(userId);
    return rows
      .map((tx) => {
        const flow = inferPaymentFlow(tx);
        const bookingIdRaw = tx.metadata?.booking_id;
        const bookingId =
          typeof bookingIdRaw === 'string' && bookingIdRaw.length > 0 ? bookingIdRaw : null;
        return { ...tx, flow, flowLabel: flowLabel(flow), bookingId };
      })
      .filter((item) => {
        if (options?.flow && item.flow !== options.flow) return false;
        if (options?.status && item.status !== options.status) return false;
        return true;
      });
  }

  static async getAgencyDeliveryPayments(agencyId: string): Promise<PaymentHistoryItem[]> {
    const rows = await subscriptionDataAccess.getDeliveryPaymentsByAgency(agencyId);
    return rows.map((tx) => {
      const flow = inferPaymentFlow(tx);
      const bookingIdRaw = tx.metadata?.booking_id;
      const bookingId =
        typeof bookingIdRaw === 'string' && bookingIdRaw.length > 0 ? bookingIdRaw : null;
      return { ...tx, flow, flowLabel: flowLabel(flow), bookingId };
    });
  }

  static async confirmCODPayment(bookingId: string): Promise<PaymentResult> {
    return this.recordCashPayment(bookingId);
  }

  static async processCODPayment(bookingId: string, _amount: number): Promise<PaymentResult> {
    try {
      const paymentId = `cod_${bookingId}_${Date.now()}_${generateShortId()}`;
      await dataAccess.bookings.updateBooking(bookingId, {
        paymentStatus: 'pending',
        paymentId,
      });
      return { success: true, paymentId };
    } catch (error) {
      return { success: false, error: getErrorMessage(error, 'Payment processing failed') };
    }
  }
}
