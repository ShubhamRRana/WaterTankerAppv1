import { ERROR_MESSAGES } from '../constants/config';

export function mapPaymentErrorCode(code?: string, fallback?: string): string {
  switch (code) {
    case 'agency_not_onboarded':
      return ERROR_MESSAGES.payment.agencyNotOnboarded;
    case 'signature_mismatch':
      return ERROR_MESSAGES.payment.signatureMismatch;
    case 'booking_already_paid':
      return ERROR_MESSAGES.payment.bookingAlreadyPaid;
    case 'subscription_not_eligible':
      return ERROR_MESSAGES.payment.subscriptionNotEligible;
    case 'payment_in_progress':
      return ERROR_MESSAGES.payment.paymentInProgress;
    default:
      return fallback ?? ERROR_MESSAGES.payment.failed;
  }
}
