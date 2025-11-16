/**
 * Integration tests for Booking Service with Supabase
 * 
 * NOTE: These tests require a test Supabase instance.
 * Set EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY environment variables.
 * 
 * To run integration tests:
 * npm test -- --testPathPattern=integration
 */

// Unmock Supabase to use real client for integration tests
jest.unmock('../../supabase');

import { BookingService } from '../../booking.service';
import { AuthService } from '../../auth.service';
import { UserService } from '../../user.service';
import { supabase } from '../../supabase';
import { Booking, BookingStatus } from '../../../types';

// Skip integration tests if test credentials are not provided
const shouldRunIntegrationTests = process.env.EXPO_PUBLIC_SUPABASE_URL && process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

// Increase timeout for integration tests (real API calls take longer)
jest.setTimeout(30000); // 30 seconds

// Track created test users for cleanup
const createdTestUsers: string[] = [];

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

describe('BookingService Integration Tests', () => {
  let testCustomerId: string;
  let testAgencyId: string;
  let testDriverId: string;
  let testCustomerPhone: string;
  let testAgencyPhone: string;
  let testDriverPhone: string;

  beforeAll(async () => {
    if (!shouldRunIntegrationTests) {
      console.warn('Skipping integration tests - EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY not set');
      return;
    }

    // Create test users for booking operations
    testCustomerPhone = generateTestPhone('98765');
    testAgencyPhone = generateTestPhone('98766');
    testDriverPhone = generateTestPhone('98767');
    
    // Create customer
    const customerResult = await AuthService.register(
      testCustomerPhone,
      'TestPassword123',
      'Test Customer',
      'customer'
    );
    if (customerResult.success && customerResult.user) {
      testCustomerId = customerResult.user.uid;
      createdTestUsers.push(testCustomerId);
      
      // Wait for user profile to be created in users table
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Verify user exists in users table before proceeding
      let retries = 0;
      let userExists = false;
      while (retries < 5 && !userExists) {
        const userTableId = await UserService.getUsersTableIdByAuthId(testCustomerId);
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
      await waitForSession();
    }

    // Create agency
    const agencyResult = await AuthService.register(
      testAgencyPhone,
      'TestPassword123',
      'Test Agency',
      'admin' // Admin role for agency
    );
    if (agencyResult.success && agencyResult.user) {
      testAgencyId = agencyResult.user.uid;
      createdTestUsers.push(testAgencyId);
      
      // Wait for user profile to be created in users table
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Verify user exists in users table before proceeding
      let retries = 0;
      let userExists = false;
      while (retries < 5 && !userExists) {
        const userTableId = await UserService.getUsersTableIdByAuthId(testAgencyId);
        if (userTableId) {
          userExists = true;
        } else {
          retries++;
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }
      
      if (!userExists) {
        throw new Error('Failed to create agency user profile in users table');
      }
      
      // Login as agency/admin to establish authenticated session for RLS policies
      await AuthService.login(testAgencyPhone, 'TestPassword123');
      await waitForSession();
    }

    // Create driver (note: driver registration may fail due to business logic)
    // For testing, we'll try to register but handle failure gracefully
    const driverResult = await AuthService.register(
      testDriverPhone,
      'TestPassword123',
      'Test Driver',
      'driver',
      { createdByAdmin: true } as any
    );
    if (driverResult.success && driverResult.user) {
      testDriverId = driverResult.user.uid;
      createdTestUsers.push(testDriverId);
      
      // Wait for user profile to be created in users table
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Verify user exists in users table before proceeding
      let retries = 0;
      let userExists = false;
      while (retries < 5 && !userExists) {
        const userTableId = await UserService.getUsersTableIdByAuthId(testDriverId);
        if (userTableId) {
          userExists = true;
        } else {
          retries++;
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }
      
      if (!userExists) {
        throw new Error('Failed to create driver user profile in users table');
      }
      
      // Login as driver to establish authenticated session for RLS policies
      await AuthService.login(testDriverPhone, 'TestPassword123');
      await waitForSession();
    }

    // Wait for Supabase to process
    await new Promise(resolve => setTimeout(resolve, 2000));
  });

  beforeEach(async () => {
    if (!shouldRunIntegrationTests) return;
    
    // Reset rate limiter to prevent test failures due to rate limiting
    const { rateLimiter } = require('../../../utils/rateLimiter');
    rateLimiter.resetAll();
    
    // Ensure we're logged in as customer for creating bookings
    if (testCustomerPhone) {
      try {
        await AuthService.login(testCustomerPhone, 'TestPassword123');
        await waitForSession();
      } catch (error) {
        // Ignore login errors
      }
    }
  });

  afterEach(async () => {
    if (!shouldRunIntegrationTests) return;
    // Clean up test data after each test
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
    it('should create a new booking', async () => {
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

      const bookingId = await BookingService.createBooking(bookingData);

      expect(bookingId).toBeDefined();
      expect(typeof bookingId).toBe('string');
    });

    it('should get bookings by customer', async () => {
      // First create a booking
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
          id: 'test-address-2',
          street: '456 Test St',
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

      await BookingService.createBooking(bookingData);
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Get bookings for customer
      const bookings = await BookingService.getBookingsByCustomer(testCustomerId);

      expect(Array.isArray(bookings)).toBe(true);
      expect(bookings.length).toBeGreaterThan(0);
      expect(bookings[0].customerId).toBe(testCustomerId);
    });

    it('should get available bookings (pending, no driver)', async () => {
      // Create a pending booking
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
          id: 'test-address-3',
          street: '789 Test St',
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

      await BookingService.createBooking(bookingData);
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Get available bookings
      const availableBookings = await BookingService.getAvailableBookings();

      expect(Array.isArray(availableBookings)).toBe(true);
      availableBookings.forEach(booking => {
        expect(booking.status).toBe('pending');
        expect(booking.driverId).toBeUndefined();
      });
    });

    it('should update booking status', async () => {
      // Create a booking
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
          id: 'test-address-4',
          street: '321 Test St',
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

      const bookingId = await BookingService.createBooking(bookingData);
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Update status to accepted
      await BookingService.updateBookingStatus(bookingId, 'accepted', {
        driverId: testDriverId,
        driverName: 'Test Driver',
        driverPhone: testDriverPhone,
      });

      await new Promise(resolve => setTimeout(resolve, 1000));

      // Verify update
      const bookings = await BookingService.getBookingsByCustomer(testCustomerId);
      const updatedBooking = bookings.find(b => b.id === bookingId);

      expect(updatedBooking).toBeDefined();
      expect(updatedBooking?.status).toBe('accepted');
      expect(updatedBooking?.driverId).toBe(testDriverId);
    });

    it('should get bookings by driver', async () => {
      // Create and assign a booking to driver
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
          id: 'test-address-5',
          street: '654 Test St',
          city: 'Test City',
          state: 'Test State',
          pincode: '123456',
          latitude: 28.6139,
          longitude: 77.2090,
          isDefault: false,
        },
        distance: 10,
        isImmediate: true,
        status: 'accepted',
        paymentStatus: 'pending',
        canCancel: false,
        driverId: testDriverId,
        driverName: 'Test Driver',
        driverPhone: testDriverPhone,
      };

      const bookingId = await BookingService.createBooking(bookingData);
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Get bookings for driver
      const driverBookings = await BookingService.getBookingsByDriver(testDriverId);

      expect(Array.isArray(driverBookings)).toBe(true);
      expect(driverBookings.length).toBeGreaterThan(0);
      expect(driverBookings[0].driverId).toBe(testDriverId);
    });

    it('should get booking by ID', async () => {
      // Create a booking
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
          id: 'test-address-6',
          street: '987 Test St',
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

      const bookingId = await BookingService.createBooking(bookingData);
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Get booking by ID
      const booking = await BookingService.getBookingById(bookingId);

      expect(booking).toBeDefined();
      expect(booking?.id).toBe(bookingId);
      expect(booking?.customerId).toBe(testCustomerId);
    });
  });
});

