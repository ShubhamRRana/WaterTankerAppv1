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
import { UserService } from '../../user.service';
import { supabase } from '../../supabase';
import { Booking } from '../../../types';

// Skip integration tests if test credentials are not provided
const shouldRunIntegrationTests = process.env.EXPO_PUBLIC_SUPABASE_URL && process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

// Increase timeout for integration tests (real API calls take longer)
jest.setTimeout(30000); // 30 seconds

// Track created test users for cleanup
const createdTestUsers: string[] = [];
const createdTestBookings: string[] = [];

// Helper function to generate unique phone number
const generateTestPhone = (prefix: string = '987'): string => {
  const timestamp = Date.now().toString();
  const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
  return `${prefix}${timestamp.slice(-6)}${random}`;
};

// Helper function to wait for session establishment
const waitForSession = async (maxWaitMs: number = 3000): Promise<boolean> => {
  const startTime = Date.now();
  while (Date.now() - startTime < maxWaitMs) {
    const { data: { session } } = await supabase.auth.getSession();
    if (session) {
      return true;
    }
    await new Promise(resolve => setTimeout(resolve, 200));
  }
  return false;
};

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
    testCustomerPhone = generateTestPhone('98765');
    testAgencyPhone = generateTestPhone('98766');
    
    // Create customer
    const customerResult = await AuthService.register(
      testCustomerPhone,
      'TestPassword123',
      'Test Customer',
      'customer'
    );
    if (customerResult.success && customerResult.user) {
      createdTestUsers.push(customerResult.user.uid);
      
      // Wait for user profile to be created in users table
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Verify user exists in users table before proceeding
      let retries = 0;
      let userExists = false;
      while (retries < 5 && !userExists) {
        const userTableId = await UserService.getUsersTableIdByAuthId(customerResult.user.uid);
        if (userTableId) {
          userExists = true;
        } else {
          retries++;
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }
      
      if (!userExists) {
        throw new Error('Failed to create user profile in users table');
      }
      
      // Login as customer to establish authenticated session for RLS policies
      await AuthService.login(testCustomerPhone, 'TestPassword123');
      // Wait for session to be established
      await waitForSession();
      // Get current user data to ensure we have the correct users table ID (not auth_id)
      const currentUser = await AuthService.getCurrentUserData();
      if (currentUser) {
        testCustomerId = currentUser.uid; // This is the users table id, which is what bookings need
      } else {
        // Fallback to the user from registration result
        testCustomerId = customerResult.user.uid;
      }
    }

    // Create agency
    const agencyResult = await AuthService.register(
      testAgencyPhone,
      'TestPassword123',
      'Test Agency',
      'admin'
    );
    if (agencyResult.success && agencyResult.user) {
      createdTestUsers.push(agencyResult.user.uid);
      
      // Wait for user profile to be created in users table
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Verify user exists in users table before proceeding
      let retries = 0;
      let userExists = false;
      while (retries < 5 && !userExists) {
        const userTableId = await UserService.getUsersTableIdByAuthId(agencyResult.user.uid);
        if (userTableId) {
          userExists = true;
        } else {
          retries++;
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }
      
      if (!userExists) {
        throw new Error('Failed to create user profile in users table');
      }
      
      // Login as agency/admin to establish authenticated session for RLS policies
      await AuthService.login(testAgencyPhone, 'TestPassword123');
      // Wait for session to be established
      await waitForSession();
      // Get current user data to ensure we have the correct users table ID
      const currentAgency = await AuthService.getCurrentUserData();
      if (currentAgency) {
        testAgencyId = currentAgency.uid; // This is the users table id
      } else {
        // Fallback to the user from registration result
        testAgencyId = agencyResult.user.uid;
      }
    }

    await new Promise(resolve => setTimeout(resolve, 2000));
  });

  beforeEach(async () => {
    if (!shouldRunIntegrationTests) return;
    
    // Reset rate limiter to prevent test failures due to rate limiting
    const { rateLimiter } = require('../../../utils/rateLimiter');
    rateLimiter.resetAll();
    
    // Ensure we're logged in as customer for creating bookings
    if (testCustomerPhone) {
      await AuthService.login(testCustomerPhone, 'TestPassword123');
      await waitForSession();
    }
    
    // Create a test booking for payment tests
    const bookingData: Omit<Booking, 'id' | 'createdAt' | 'updatedAt'> = {
      customerId: testCustomerId,
      customerName: 'Test Customer',
      customerPhone: testCustomerPhone,
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
    createdTestBookings.push(testBookingId);
    await new Promise(resolve => setTimeout(resolve, 1000));
  });

  afterEach(async () => {
    if (!shouldRunIntegrationTests) return;
    // Clean up test bookings
    for (const bookingId of createdTestBookings) {
      try {
        // Bookings will be cascade deleted when users are deleted
      } catch (error) {
        // Ignore cleanup errors
      }
    }
    createdTestBookings.length = 0;
  });

  afterAll(async () => {
    if (!shouldRunIntegrationTests) return;
    // Clean up all created test users
    for (const userId of createdTestUsers) {
      try {
        await UserService.deleteUser(userId);
      } catch (error) {
        // Ignore cleanup errors
      }
    }
    createdTestUsers.length = 0;
    // Logout
    try {
      await AuthService.logout();
    } catch (error) {
      // Ignore logout errors
    }
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

