/**
 * LocalStorage Data Access Layer Implementation
 * 
 * Implements IDataAccessLayer using LocalStorageService.
 * This provides a clean abstraction that can be easily swapped
 * with SupabaseDataAccess when ready.
 */

import { LocalStorageService } from '../services/localStorage';
import {
  IDataAccessLayer,
  IUserDataAccess,
  IBookingDataAccess,
  IVehicleDataAccess,
  SubscriptionCallback,
  CollectionSubscriptionCallback,
  Unsubscribe,
} from './dataAccess.interface';
import { User, Booking, Vehicle } from '../types/index';
import { DataAccessError, NotFoundError } from '../utils/errors';

/**
 * User Data Access implementation using LocalStorage
 */
class LocalStorageUserDataAccess implements IUserDataAccess {
  async getCurrentUser(): Promise<User | null> {
    try {
      return await LocalStorageService.getCurrentUser();
    } catch (error) {
      throw new DataAccessError('Failed to get current user', 'getCurrentUser', { error });
    }
  }

  async saveUser(user: User): Promise<void> {
    try {
      await LocalStorageService.saveUser(user);
    } catch (error) {
      throw new DataAccessError('Failed to save user', 'saveUser', { error });
    }
  }

  async removeUser(): Promise<void> {
    try {
      await LocalStorageService.removeUser();
    } catch (error) {
      throw new DataAccessError('Failed to remove user', 'removeUser', { error });
    }
  }

  async getUserById(id: string): Promise<User | null> {
    try {
      return await LocalStorageService.getUserById(id);
    } catch (error) {
      throw new DataAccessError('Failed to get user by id', 'getUserById', { error, id });
    }
  }

  async getUsers(): Promise<User[]> {
    try {
      return await LocalStorageService.getUsers();
    } catch (error) {
      throw new DataAccessError('Failed to get users', 'getUsers', { error });
    }
  }

  async saveUserToCollection(user: User): Promise<void> {
    try {
      await LocalStorageService.saveUserToCollection(user);
    } catch (error) {
      throw new DataAccessError('Failed to save user to collection', 'saveUserToCollection', { error });
    }
  }

  async updateUserProfile(id: string, updates: Partial<User>): Promise<void> {
    try {
      await LocalStorageService.updateUserProfile(id, updates);
    } catch (error) {
      if (error instanceof Error && error.message === 'User not found') {
        throw new NotFoundError('User', id);
      }
      throw new DataAccessError('Failed to update user profile', 'updateUserProfile', { error, id });
    }
  }

  subscribeToUserUpdates(id: string, callback: SubscriptionCallback<User>): Unsubscribe {
    // LocalStorage doesn't support real-time updates
    // Return no-op unsubscribe function
    // When migrating to Supabase, this will use Supabase Realtime
    return () => {};
  }

  subscribeToAllUsersUpdates(callback: CollectionSubscriptionCallback<User>): Unsubscribe {
    // LocalStorage doesn't support real-time updates
    // Return no-op unsubscribe function
    // When migrating to Supabase, this will use Supabase Realtime
    return () => {};
  }
}

/**
 * Booking Data Access implementation using LocalStorage
 */
class LocalStorageBookingDataAccess implements IBookingDataAccess {
  async saveBooking(booking: Booking): Promise<void> {
    try {
      await LocalStorageService.saveBooking(booking);
    } catch (error) {
      throw new DataAccessError('Failed to save booking', 'saveBooking', { error });
    }
  }

  async updateBooking(bookingId: string, updates: Partial<Booking>): Promise<void> {
    try {
      await LocalStorageService.updateBooking(bookingId, updates);
    } catch (error) {
      throw new DataAccessError('Failed to update booking', 'updateBooking', { error, bookingId });
    }
  }

  async getBookings(): Promise<Booking[]> {
    try {
      return await LocalStorageService.getBookings();
    } catch (error) {
      throw new DataAccessError('Failed to get bookings', 'getBookings', { error });
    }
  }

  async getBookingById(bookingId: string): Promise<Booking | null> {
    try {
      return await LocalStorageService.getBookingById(bookingId);
    } catch (error) {
      throw new DataAccessError('Failed to get booking by id', 'getBookingById', { error, bookingId });
    }
  }

  async getBookingsByCustomer(customerId: string): Promise<Booking[]> {
    try {
      return await LocalStorageService.getBookingsByCustomer(customerId);
    } catch (error) {
      throw new DataAccessError('Failed to get bookings by customer', 'getBookingsByCustomer', { error, customerId });
    }
  }

  async getBookingsByDriver(driverId: string): Promise<Booking[]> {
    try {
      return await LocalStorageService.getBookingsByDriver(driverId);
    } catch (error) {
      throw new DataAccessError('Failed to get bookings by driver', 'getBookingsByDriver', { error, driverId });
    }
  }

  async getAvailableBookings(): Promise<Booking[]> {
    try {
      return await LocalStorageService.getAvailableBookings();
    } catch (error) {
      throw new DataAccessError('Failed to get available bookings', 'getAvailableBookings', { error });
    }
  }

  subscribeToBookingUpdates(bookingId: string, callback: SubscriptionCallback<Booking>): Unsubscribe {
    // LocalStorage doesn't support real-time updates
    // Return no-op unsubscribe function
    // When migrating to Supabase, this will use Supabase Realtime
    return () => {};
  }
}

/**
 * Vehicle Data Access implementation using LocalStorage
 */
class LocalStorageVehicleDataAccess implements IVehicleDataAccess {
  async saveVehicle(vehicle: Vehicle): Promise<void> {
    try {
      await LocalStorageService.saveVehicle(vehicle);
    } catch (error) {
      throw new DataAccessError('Failed to save vehicle', 'saveVehicle', { error });
    }
  }

  async updateVehicle(vehicleId: string, updates: Partial<Vehicle>): Promise<void> {
    try {
      await LocalStorageService.updateVehicle(vehicleId, updates);
    } catch (error) {
      if (error instanceof Error && error.message === 'Vehicle not found') {
        throw new NotFoundError('Vehicle', vehicleId);
      }
      throw new DataAccessError('Failed to update vehicle', 'updateVehicle', { error, vehicleId });
    }
  }

  async getVehicles(): Promise<Vehicle[]> {
    try {
      return await LocalStorageService.getVehicles();
    } catch (error) {
      throw new DataAccessError('Failed to get vehicles', 'getVehicles', { error });
    }
  }

  async getVehicleById(vehicleId: string): Promise<Vehicle | null> {
    try {
      return await LocalStorageService.getVehicleById(vehicleId);
    } catch (error) {
      throw new DataAccessError('Failed to get vehicle by id', 'getVehicleById', { error, vehicleId });
    }
  }

  async deleteVehicle(vehicleId: string): Promise<void> {
    try {
      await LocalStorageService.deleteVehicle(vehicleId);
    } catch (error) {
      throw new DataAccessError('Failed to delete vehicle', 'deleteVehicle', { error, vehicleId });
    }
  }

  async getVehiclesByAgency(agencyId: string): Promise<Vehicle[]> {
    try {
      const allVehicles = await LocalStorageService.getVehicles();
      return allVehicles.filter(v => v.agencyId === agencyId);
    } catch (error) {
      throw new DataAccessError('Failed to get vehicles by agency', 'getVehiclesByAgency', { error, agencyId });
    }
  }

  subscribeToVehicleUpdates(vehicleId: string, callback: SubscriptionCallback<Vehicle>): Unsubscribe {
    // LocalStorage doesn't support real-time updates
    // Return no-op unsubscribe function
    // When migrating to Supabase, this will use Supabase Realtime
    return () => {};
  }

  subscribeToAgencyVehiclesUpdates(agencyId: string, callback: CollectionSubscriptionCallback<Vehicle>): Unsubscribe {
    // LocalStorage doesn't support real-time updates
    // Return no-op unsubscribe function
    // When migrating to Supabase, this will use Supabase Realtime
    return () => {};
  }
}

/**
 * Complete LocalStorage Data Access Layer
 */
export class LocalStorageDataAccess implements IDataAccessLayer {
  users: IUserDataAccess;
  bookings: IBookingDataAccess;
  vehicles: IVehicleDataAccess;

  constructor() {
    this.users = new LocalStorageUserDataAccess();
    this.bookings = new LocalStorageBookingDataAccess();
    this.vehicles = new LocalStorageVehicleDataAccess();
  }

  generateId(): string {
    return LocalStorageService.generateId();
  }

  async initialize(): Promise<void> {
    try {
      await LocalStorageService.initializeSampleData();
    } catch (error) {
      throw new DataAccessError('Failed to initialize data', 'initialize', { error });
    }
  }
}

/**
 * Singleton instance of LocalStorageDataAccess
 * This can be swapped with SupabaseDataAccess when ready
 */
export const dataAccess: IDataAccessLayer = new LocalStorageDataAccess();

