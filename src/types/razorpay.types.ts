export type PaymentFlow =
  | 'agency_subscription'
  | 'driver_delivery'
  | 'customer_subscription'
  | 'customer_booking';

export interface RazorpayCheckoutPrefill {
  email?: string;
  contact?: string;
  name?: string;
}

export interface RazorpayCheckoutParams {
  orderId: string;
  amount: number;
  currency: string;
  keyId: string;
  prefill?: RazorpayCheckoutPrefill;
  description?: string;
  name?: string;
}

export interface RazorpayVerifyPayload {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
}

export type RazorpayCheckoutResult =
  | { status: 'success'; data: RazorpayVerifyPayload }
  | { status: 'cancelled' }
  | { status: 'error'; message: string; code?: string | number };

export interface RazorpayOrderResponse {
  orderId: string;
  amount: number;
  currency: string;
  keyId: string;
}

export interface SubscriptionPaymentVerifyResult {
  success: boolean;
  alreadyCompleted?: boolean;
  subscriptionId?: string;
  error?: string;
  code?: string;
}

export type PaymentResultScreenParams = {
  type: 'subscription' | 'delivery';
  status: 'success' | 'failed' | 'pending';
  referenceId?: string;
  message?: string;
};
