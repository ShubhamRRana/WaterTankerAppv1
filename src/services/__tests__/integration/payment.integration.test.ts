/**
 * Integration tests for Payment Service with Supabase
 * 
 * NOTE: These tests require a test Supabase instance.
 * Set SUPABASE_TEST_URL and SUPABASE_TEST_KEY environment variables.
 * 
 * To run integration tests:
 * npm test -- --testPathPattern=integration
 */

import { PaymentService } from '../../payment.service';
import { BookingService } from '../../booking.service';
import { AuthService } from '../../auth.service';
import { Booking } from '../../../types';

// Skip integration tests if test credentials are not provided
const shouldRunIntegrationTests = process.env.SUPABASE_TEST_URL && process.env.SUPABASE_TEST_KEY;

describe('PaymentService Integration Tests', () => {
  let testCustomerId: string;
  let testAgencyId: string;
  let testBookingId: string;

  beforeAll(async () => {
    if (!shouldRunIntegrationTests) {
      console.warn('Skipping integration tests - SUPABASE_TEST_URL and SUPABASE_TEST_KEY not set');
      return;
    }

    // Create test users
    const timestamp = Date.now().toString().slice(-5);
    
    // Create customer
    const customerResult = await AuthService.register(
      `98765${timestamp}`,
      'TestPassword123',
      'Test Customer',
      'customer'
    );
    if (customerResult.success && customerResult.user) {
      testCustomerId = customerResult.user.uid;
    }

    // Create agency
    const agencyResult = await AuthService.register(
      `98766${timestamp}`,
      'TestPassword123',
      'Test Agency',
      'admin'
    );
    if (agencyResult.success && agencyResult.user) {
      testAgencyId = agencyResult.user.uid;
    }

    await new Promise(resolve => setTimeout(resolve, 2000));
  });

  beforeEach(async () => {
    if (!shouldRunIntegrationTests) return;
    
    // Create a test booking for payment tests
    const bookingData: Omit<Booking, 'id' | 'createdAt' | 'updatedAt'> = {
      customerId: testCustomerId,
      customerName: 'Test Customer',
      customerPhone: '9876500000',
      agencyId: testAgencyId,
      agencyName: 'Test Agency',
      agencyPhone: '9876600000',
      tankerSize: 1000,
      quantity: 1,
      basePrice: 200,
      distanceCharge: 50,
      totalPrice: 500,
      deliveryAddress: {
        id: 'test-address',
        street: '123 Test St',
        city: 'Test City',
        state: 'Test State',
        pincode: '123456',
        latitude: 28.6139,
        longitude: 77.2090,
        isDefault: false,
      },
      distance: 10,
      isImmediate: true,
      status: 'pending',
      paymentStatus: 'pending',
      canCancel: true,
    };

    testBookingId = await BookingService.createBooking(bookingData);
    await new Promise(resolve => setTimeout(resolve, 1000));
  });

  afterEach(async () => {
    if (!shouldRunIntegrationTests) return;
    // Clean up test data after each test
  });

  (shouldRunIntegrationTests ? describe : describe.skip)('Real Supabase Integration', () => {
    it('should process COD payment', async () => {
      const amount = 500;
      const result = await PaymentService.processCODPayment(testBookingId, amount);

      expect(result.success).toBe(true);
      expect(result.paymentId).toBeDefined();
      expect(typeof result.paymentId).toBe('string');
      expect(result.paymentId).toContain('cod_');

      // Verify booking payment status was updated
      await new Promise(resolve => setTimeout(resolve, 1000));
      const booking = await BookingService.getBookingById(testBookingId);
      expect(booking?.paymentStatus).toBe('pending');
      expect(booking?.paymentId).toBeDefined();
    });

    it('should confirm COD payment', async () => {
      // First process COD payment
      await PaymentService.processCODPayment(testBookingId, 500);
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Then confirm payment
      const result = await PaymentService.confirmCODPayment(testBookingId);

      expect(result.success).toBe(true);
      expect(result.paymentId).toBeDefined();
      expect(typeof result.paymentId).toBe('string');
      expect(result.paymentId).toContain('cod_confirmed_');

      // Verify booking payment status was updated
      await new Promise(resolve => setTimeout(resolve, 1000));
      const booking = await BookingService.getBookingById(testBookingId);
      expect(booking?.paymentStatus).toBe('completed');
      expect(booking?.paymentId).toBeDefined();
    });

    it('should fail for non-existent booking', async () => {
      const result = await PaymentService.processCODPayment('non-existent-booking-id', 500);

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('should reject online payment (not implemented)', async () => {
      await expect(
        PaymentService.processOnlinePayment(testBookingId, 500, 'razorpay')
      ).rejects.toThrow('Online payments not implemented in MVP. Use COD instead.');
    });
  });
});

