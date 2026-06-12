import type { Booking } from '../types';
import { FEATURE_FLAGS } from '../constants/config';

export type BookingPaymentChip = 'paid' | 'unpaid' | 'failed' | 'cash' | 'refunded';

export function getBookingPaymentChip(booking: Booking): BookingPaymentChip {
  if (booking.paymentStatus === 'completed') {
    if (booking.paymentId?.startsWith('cash_') || booking.paymentId?.startsWith('cod_')) {
      return 'cash';
    }
    return 'paid';
  }
  if (booking.paymentStatus === 'failed') return 'failed';
  if (booking.paymentStatus === 'refunded') return 'refunded';
  if ((booking.deliveredAmount ?? booking.totalPrice) <= 0) return 'cash';
  return 'unpaid';
}

export function getBookingPaymentChipLabel(chip: BookingPaymentChip): string {
  switch (chip) {
    case 'paid':
      return 'Paid';
    case 'unpaid':
      return 'Unpaid';
    case 'failed':
      return 'Failed';
    case 'cash':
      return 'Cash';
    case 'refunded':
      return 'Refunded';
    default:
      return 'Unknown';
  }
}

export function canCollectOnlinePayment(booking: Booking): boolean {
  if (!FEATURE_FLAGS.enableOnlinePayment) return false;
  if (booking.status === 'cancelled' || booking.status === 'delivered') return false;
  const amount = booking.deliveredAmount ?? booking.totalPrice;
  if (amount <= 0) return false;
  return booking.paymentStatus === 'pending' || booking.paymentStatus === 'failed';
}
