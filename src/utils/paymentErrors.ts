import { ERROR_MESSAGES } from '../constants/config';

export function mapPaymentErrorCode(code?: string, fallback?: string): string {
  switch (code) {
    case 'signature_mismatch':
      return ERROR_MESSAGES.payment.signatureMismatch;
    case 'subscription_not_eligible':
      return ERROR_MESSAGES.payment.subscriptionNotEligible;
    case 'agency_subscription_inactive':
      return ERROR_MESSAGES.payment.agencySubscriptionInactive;
    case 'payment_in_progress':
      return ERROR_MESSAGES.payment.paymentInProgress;
    default:
      return fallback ?? ERROR_MESSAGES.payment.failed;
  }
}
