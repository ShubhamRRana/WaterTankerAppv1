/**
 * Payment Service Tests — Razorpay + cash ledger
 */

jest.mock('../../lib/supabaseClient', () => ({
  supabase: {
    auth: { getUser: jest.fn() },
    functions: { invoke: jest.fn() },
    from: jest.fn(),
  },
}));

jest.mock('../../lib/index', () => ({
  dataAccess: {
    bookings: {
      getBookingById: jest.fn(),
      updateBooking: jest.fn(),
    },
  },
}));

import { supabase } from '../../lib/supabaseClient';
import { dataAccess } from '../../lib/index';
import { PaymentService } from '../../services/payment.service';

const mockBooking = {
  id: 'booking-1',
  agencyId: 'agency-1',
  deliveredAmount: 500,
  totalPrice: 500,
  paymentStatus: 'pending' as const,
  status: 'in_transit' as const,
};

describe('PaymentService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (supabase.auth.getUser as jest.Mock).mockResolvedValue({
      data: { user: { id: 'driver-1' } },
    });
    const insertMock = jest.fn().mockResolvedValue({ error: null });
    (supabase.from as jest.Mock).mockReturnValue({ insert: insertMock });
  });

  describe('recordCashPayment', () => {
    it('marks booking delivered and inserts cash ledger row', async () => {
      (dataAccess.bookings.getBookingById as jest.Mock).mockResolvedValue(mockBooking);
      (dataAccess.bookings.updateBooking as jest.Mock).mockResolvedValue(undefined);

      const result = await PaymentService.recordCashPayment('booking-1', 'driver_cash');

      expect(result.success).toBe(true);
      expect(result.paymentId).toMatch(/^cash_booking-1_/);
      expect(dataAccess.bookings.updateBooking).toHaveBeenCalledWith(
        'booking-1',
        expect.objectContaining({
          paymentStatus: 'completed',
          status: 'delivered',
        })
      );
      expect(supabase.from).toHaveBeenCalledWith('payment_transactions');
    });

    it('returns error when booking not found', async () => {
      (dataAccess.bookings.getBookingById as jest.Mock).mockResolvedValue(null);

      const result = await PaymentService.recordCashPayment('missing');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Booking not found');
    });
  });

  describe('recordQrPayment', () => {
    it('marks booking delivered and inserts qr ledger row', async () => {
      (dataAccess.bookings.getBookingById as jest.Mock).mockResolvedValue(mockBooking);
      (dataAccess.bookings.updateBooking as jest.Mock).mockResolvedValue(undefined);
      const insertMock = jest.fn().mockResolvedValue({ error: null });
      (supabase.from as jest.Mock).mockReturnValue({ insert: insertMock });

      const result = await PaymentService.recordQrPayment('booking-1', 'driver_qr');

      expect(result.success).toBe(true);
      expect(result.paymentId).toMatch(/^qr_booking-1_/);
      expect(dataAccess.bookings.updateBooking).toHaveBeenCalledWith(
        'booking-1',
        expect.objectContaining({
          paymentStatus: 'completed',
          status: 'delivered',
        })
      );
      expect(insertMock).toHaveBeenCalledWith(
        expect.objectContaining({
          payment_gateway: 'manual_qr',
          payment_method: 'qr',
        })
      );
    });

    it('returns error when booking not found', async () => {
      (dataAccess.bookings.getBookingById as jest.Mock).mockResolvedValue(null);

      const result = await PaymentService.recordQrPayment('missing');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Booking not found');
    });
  });

  describe('createSubscriptionPayment', () => {
    it('invokes create-subscription-order edge function', async () => {
      (supabase.functions.invoke as jest.Mock).mockResolvedValue({
        data: {
          orderId: 'order_1',
          amount: 99900,
          currency: 'INR',
          keyId: 'rzp_test',
        },
        error: null,
      });

      const order = await PaymentService.createSubscriptionPayment('sub-1', 'plan-1');

      expect(supabase.functions.invoke).toHaveBeenCalledWith('create-subscription-order', {
        body: { subscriptionId: 'sub-1', planId: 'plan-1' },
      });
      expect(order.orderId).toBe('order_1');
    });
  });

  describe('verifyDeliveryPayment', () => {
    it('returns success from edge function', async () => {
      (supabase.functions.invoke as jest.Mock).mockResolvedValue({
        data: { success: true, bookingId: 'booking-1' },
        error: null,
      });

      const result = await PaymentService.verifyDeliveryPayment('booking-1', {
        razorpay_order_id: 'order_1',
        razorpay_payment_id: 'pay_1',
        razorpay_signature: 'sig',
      });

      expect(result.success).toBe(true);
      expect(result.bookingId).toBe('booking-1');
    });
  });

  describe('confirmCODPayment', () => {
    it('delegates to recordCashPayment', async () => {
      (dataAccess.bookings.getBookingById as jest.Mock).mockResolvedValue(mockBooking);
      (dataAccess.bookings.updateBooking as jest.Mock).mockResolvedValue(undefined);

      const result = await PaymentService.confirmCODPayment('booking-1');

      expect(result.success).toBe(true);
      expect(result.paymentId).toMatch(/^cash_/);
    });
  });
});
