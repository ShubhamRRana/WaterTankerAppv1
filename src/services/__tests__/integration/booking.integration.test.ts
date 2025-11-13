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
import { Booking, BookingStatus } from '../../../types';

// Skip integration tests if test credentials are not provided
const shouldRunIntegrationTests = process.env.EXPO_PUBLIC_SUPABASE_URL && process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

// Increase timeout for integration tests (real API calls take longer)
jest.setTimeout(30000); // 30 seconds

describe('BookingService Integration Tests', () => {
  let testCustomerId: string;
  let testAgencyId: string;
  let testDriverId: string;

  beforeAll(async () => {
    if (!shouldRunIntegrationTests) {
      console.warn('Skipping integration tests - EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY not set');
      return;
    }

    // Create test users for booking operations
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
      // Login as customer to establish authenticated session for RLS policies
      await AuthService.login(`98765${timestamp}`, 'TestPassword123');
    }

    // Create agency
    const agencyResult = await AuthService.register(
      `98766${timestamp}`,
      'TestPassword123',
      'Test Agency',
      'admin' // Admin role for agency
    );
    if (agencyResult.success && agencyResult.user) {
      testAgencyId = agencyResult.user.uid;
      // Login as agency/admin to establish authenticated session for RLS policies
      await AuthService.login(`98766${timestamp}`, 'TestPassword123');
    }

    // Create driver (note: driver registration may fail due to business logic)
    // For testing, we'll try to register but handle failure gracefully
    const driverResult = await AuthService.register(
      `98767${timestamp}`,
      'TestPassword123',
      'Test Driver',
      'driver'
    );
    if (driverResult.success && driverResult.user) {
      testDriverId = driverResult.user.uid;
      // Login as driver to establish authenticated session for RLS policies
      await AuthService.login(`98767${timestamp}`, 'TestPassword123');
    }

    // Wait for Supabase to process
    await new Promise(resolve => setTimeout(resolve, 2000));
  });

  beforeEach(async () => {
    if (!shouldRunIntegrationTests) return;
    // Clean up test bookings before each test if needed
  });

  afterEach(async () => {
    if (!shouldRunIntegrationTests) return;
    // Clean up test data after each test
  });

  (shouldRunIntegrationTests ? describe : describe.skip)('Real Supabase Integration', () => {
    it('should create a new booking', async () => {
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

      const bookingId = await BookingService.createBooking(bookingData);

      expect(bookingId).toBeDefined();
      expect(typeof bookingId).toBe('string');
    });

    it('should get bookings by customer', async () => {
      // First create a booking
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
        customerPhone: '9876500000',
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
        customerPhone: '9876500000',
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
        driverPhone: '9876700000',
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
        customerPhone: '9876500000',
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
        driverPhone: '9876700000',
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
        customerPhone: '9876500000',
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

