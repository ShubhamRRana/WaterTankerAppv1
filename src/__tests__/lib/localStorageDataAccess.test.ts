/**
 * LocalStorage Data Access Layer Tests
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { LocalStorageDataAccess } from '../../lib/localStorageDataAccess';
import { User, Booking, Vehicle, UserRole } from '../../types/index';
import { NotFoundError, DataAccessError } from '../../utils/errors';

// Clear AsyncStorage before each test
beforeEach(async () => {
  await AsyncStorage.clear();
});

describe('LocalStorageDataAccess', () => {
  let dataAccess: LocalStorageDataAccess;

  beforeEach(() => {
    dataAccess = new LocalStorageDataAccess();
  });

  describe('Initialization', () => {
    it('should initialize successfully', async () => {
      await expect(dataAccess.initialize()).resolves.not.toThrow();
    });

    it('should generate unique IDs', () => {
      const id1 = dataAccess.generateId();
      const id2 = dataAccess.generateId();
      
      expect(id1).toBeTruthy();
      expect(id2).toBeTruthy();
      expect(id1).not.toBe(id2);
    });
  });

  describe('User Data Access', () => {
    const mockUser: User = {
      id: 'test-user-1',
      email: 'test@example.com',
      password: 'hashed-password',
      name: 'Test User',
      role: 'customer',
      createdAt: new Date(),
    };

    it('should save and retrieve current user', async () => {
      await dataAccess.users.saveUser(mockUser);
      const retrieved = await dataAccess.users.getCurrentUser();
      
      expect(retrieved).toEqual(mockUser);
    });

    it('should remove current user', async () => {
      await dataAccess.users.saveUser(mockUser);
      await dataAccess.users.removeUser();
      const retrieved = await dataAccess.users.getCurrentUser();
      
      expect(retrieved).toBeNull();
    });

    it('should save user to collection', async () => {
      await dataAccess.users.saveUserToCollection(mockUser);
      const users = await dataAccess.users.getUsers();
      
      expect(users).toHaveLength(1);
      expect(users[0]).toEqual(mockUser);
    });

    it('should get user by ID', async () => {
      await dataAccess.users.saveUserToCollection(mockUser);
      const retrieved = await dataAccess.users.getUserById(mockUser.uid);
      
      expect(retrieved).toEqual(mockUser);
    });

    it('should return null for non-existent user', async () => {
      const retrieved = await dataAccess.users.getUserById('non-existent');
      expect(retrieved).toBeNull();
    });

    it('should update user profile', async () => {
      await dataAccess.users.saveUserToCollection(mockUser);
      await dataAccess.users.updateUserProfile(mockUser.uid, { name: 'Updated Name' });
      
      const updated = await dataAccess.users.getUserById(mockUser.uid);
      expect(updated?.name).toBe('Updated Name');
    });

    it('should throw NotFoundError when updating non-existent user', async () => {
      await expect(
        dataAccess.users.updateUserProfile('non-existent', { name: 'Test' })
      ).rejects.toThrow(NotFoundError);
    });

    it('should subscribe to user updates (no-op for LocalStorage)', () => {
      const unsubscribe = dataAccess.users.subscribeToUserUpdates('test-id', () => {});
      expect(typeof unsubscribe).toBe('function');
      expect(() => unsubscribe()).not.toThrow();
    });
  });

  describe('Booking Data Access', () => {
    const mockBooking: Booking = {
      id: 'test-booking-1',
      customerId: 'customer-1',
      customerName: 'Test Customer',
      customerPhone: '1234567890',
      status: 'pending',
      tankerSize: 1000,
      basePrice: 500,
      distanceCharge: 100,
      totalPrice: 600,
      deliveryAddress: {
        street: '123 Test St',
        city: 'Test City',
        state: 'Test State',
        pincode: '123456',
        latitude: 0,
        longitude: 0,
      },
      distance: 10,
      isImmediate: true,
      paymentStatus: 'pending',
      canCancel: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    it('should save and retrieve booking', async () => {
      await dataAccess.bookings.saveBooking(mockBooking);
      const retrieved = await dataAccess.bookings.getBookingById(mockBooking.id);
      
      expect(retrieved).toEqual(mockBooking);
    });

    it('should get all bookings', async () => {
      await dataAccess.bookings.saveBooking(mockBooking);
      const bookings = await dataAccess.bookings.getBookings();
      
      expect(bookings).toHaveLength(1);
      expect(bookings[0]).toEqual(mockBooking);
    });

    it('should get bookings by customer', async () => {
      await dataAccess.bookings.saveBooking(mockBooking);
      const bookings = await dataAccess.bookings.getBookingsByCustomer('customer-1');
      
      expect(bookings).toHaveLength(1);
      expect(bookings[0].customerId).toBe('customer-1');
    });

    it('should get bookings by driver', async () => {
      const bookingWithDriver = { ...mockBooking, driverId: 'driver-1' };
      await dataAccess.bookings.saveBooking(bookingWithDriver);
      const bookings = await dataAccess.bookings.getBookingsByDriver('driver-1');
      
      expect(bookings).toHaveLength(1);
      expect(bookings[0].driverId).toBe('driver-1');
    });

    it('should get available bookings', async () => {
      await dataAccess.bookings.saveBooking(mockBooking);
      const bookings = await dataAccess.bookings.getAvailableBookings();
      
      expect(bookings).toHaveLength(1);
      expect(bookings[0].status).toBe('pending');
    });

    it('should update booking', async () => {
      await dataAccess.bookings.saveBooking(mockBooking);
      await dataAccess.bookings.updateBooking(mockBooking.id, { status: 'accepted' });
      
      const updated = await dataAccess.bookings.getBookingById(mockBooking.id);
      expect(updated?.status).toBe('accepted');
    });
  });

  describe('Vehicle Data Access', () => {
    const mockVehicle: Vehicle = {
      id: 'test-vehicle-1',
      agencyId: 'agency-1',
      vehicleNumber: 'DL01AB1234',
      insuranceCompanyName: 'Test Insurance',
      insuranceExpiryDate: new Date('2025-12-31'),
      vehicleCapacity: 5000,
      amount: 10000,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    it('should save and retrieve vehicle', async () => {
      await dataAccess.vehicles.saveVehicle(mockVehicle);
      const retrieved = await dataAccess.vehicles.getVehicleById(mockVehicle.id);
      
      expect(retrieved).toEqual(mockVehicle);
    });

    it('should get vehicles by agency', async () => {
      await dataAccess.vehicles.saveVehicle(mockVehicle);
      const vehicles = await dataAccess.vehicles.getVehiclesByAgency('agency-1');
      
      expect(vehicles).toHaveLength(1);
      expect(vehicles[0].agencyId).toBe('agency-1');
    });

    it('should update vehicle', async () => {
      await dataAccess.vehicles.saveVehicle(mockVehicle);
      await dataAccess.vehicles.updateVehicle(mockVehicle.id, { amount: 12000 });
      
      const updated = await dataAccess.vehicles.getVehicleById(mockVehicle.id);
      expect(updated?.amount).toBe(12000);
    });

    it('should delete vehicle', async () => {
      await dataAccess.vehicles.saveVehicle(mockVehicle);
      await dataAccess.vehicles.deleteVehicle(mockVehicle.id);
      
      const retrieved = await dataAccess.vehicles.getVehicleById(mockVehicle.id);
      expect(retrieved).toBeNull();
    });
  });
});

