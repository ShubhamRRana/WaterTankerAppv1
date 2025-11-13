/**
 * Integration tests for Payment Service with Supabase
 * 
 * NOTE: These tests require a test Supabase instance.
 * Set EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY environment variables.
 * 
 * To run integration tests:
 * npm test -- --testPathPattern=integration
 */

// Unmock Supabase to use real client for integration tests
jest.unmock('../../supabase');

import { PaymentService } from '../../payment.service';
import { BookingService } from '../../booking.service';
import { AuthService } from '../../auth.service';
import { Booking } from '../../../types';

// Skip integration tests if test credentials are not provided
const shouldRunIntegrationTests = process.env.EXPO_PUBLIC_SUPABASE_URL && process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

// Increase timeout for integration tests (real API calls take longer)
jest.setTimeout(30000); // 30 seconds

describe('PaymentService Integration Tests', () => {
  let testCustomerId: string;
  let testAgencyId: string;
  let testBookingId: string;
  let testCustomerPhone: string;
  let testAgencyPhone: string;

  beforeAll(async () => {
    if (!shouldRunIntegrationTests) {
      console.warn('Skipping integration tests - EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY not set');
      return;
    }

    // Create test users
    const timestamp = Date.now().toString().slice(-5);
    testCustomerPhone = `98765${timestamp}`;
    testAgencyPhone = `98766${timestamp}`;
    
    // Create customer
    const customerResult = await AuthService.register(
      testCustomerPhone,
      'TestPassword123',
      'Test Customer',
      'customer'
    );
    if (customerResult.success && customerResult.user) {
      testCustomerId = customerResult.user.uid;
      // Login as customer to establish authenticated session for RLS policies
      await AuthService.login(testCustomerPhone, 'TestPassword123');
    }

    // Create agency
    const agencyResult = await AuthService.register(
      testAgencyPhone,
      'TestPassword123',
      'Test Agency',
      'admin'
    );
    if (agencyResult.success && agencyResult.user) {
      testAgencyId = agencyResult.user.uid;
      // Login as agency/admin to establish authenticated session for RLS policies
      await AuthService.login(testAgencyPhone, 'TestPassword123');
    }

    await new Promise(resolve => setTimeout(resolve, 2000));
  });

  beforeEach(async () => {
    if (!shouldRunIntegrationTests) return;
    
    // Ensure we're logged in as customer for creating bookings
    if (testCustomerPhone) {
      await AuthService.login(testCustomerPhone, 'TestPassword123');
    }
    
    // Create a test booking for payment tests
    const bookingData: Omit<Booking, 'id' | 'createdAt' | 'updatedAt'> = {
      customerId: testCustomerId,
      customerName: 'Test Customer',
      customerPhone: '9876500000',
      agencyId: testAgencyId,
      agencyName: 'Test Agency',
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

