/**
 * Data Access Layer Interface
 * 
 * This interface abstracts the data persistence layer to allow easy migration
 * from LocalStorage to Supabase (or any other backend service).
 * 
 * All services should use these interfaces instead of directly calling
 * LocalStorageService or Supabase client.
 */

import { User, Booking, Vehicle } from '../types/index';

/**
 * Generic subscription callback type
 */
export type SubscriptionCallback<T> = (data: T | null) => void;
export type CollectionSubscriptionCallback<T> = (data: T | null, eventType: 'INSERT' | 'UPDATE' | 'DELETE') => void;

/**
 * Unsubscribe function returned by subscription methods
 */
export type Unsubscribe = () => void;

/**
 * User data access interface
 */
export interface IUserDataAccess {
  getCurrentUser(): Promise<User | null>;
  saveUser(user: User): Promise<void>;
  removeUser(): Promise<void>;
  getUserById(id: string): Promise<User | null>;
  getUsers(): Promise<User[]>;
  saveUserToCollection(user: User): Promise<void>;
  updateUserProfile(id: string, updates: Partial<User>): Promise<void>;
  subscribeToUserUpdates(id: string, callback: SubscriptionCallback<User>): Unsubscribe;
  subscribeToAllUsersUpdates(callback: CollectionSubscriptionCallback<User>): Unsubscribe;
}

/**
 * Booking data access interface
 */
export interface IBookingDataAccess {
  saveBooking(booking: Booking): Promise<void>;
  updateBooking(bookingId: string, updates: Partial<Booking>): Promise<void>;
  getBookings(): Promise<Booking[]>;
  getBookingById(bookingId: string): Promise<Booking | null>;
  getBookingsByCustomer(customerId: string): Promise<Booking[]>;
  getBookingsByDriver(driverId: string): Promise<Booking[]>;
  getAvailableBookings(): Promise<Booking[]>;
  subscribeToBookingUpdates(bookingId: string, callback: SubscriptionCallback<Booking>): Unsubscribe;
}

/**
 * Vehicle data access interface
 */
export interface IVehicleDataAccess {
  saveVehicle(vehicle: Vehicle): Promise<void>;
  updateVehicle(vehicleId: string, updates: Partial<Vehicle>): Promise<void>;
  getVehicles(): Promise<Vehicle[]>;
  getVehicleById(vehicleId: string): Promise<Vehicle | null>;
  deleteVehicle(vehicleId: string): Promise<void>;
  getVehiclesByAgency(agencyId: string): Promise<Vehicle[]>;
  subscribeToVehicleUpdates(vehicleId: string, callback: SubscriptionCallback<Vehicle>): Unsubscribe;
  subscribeToAgencyVehiclesUpdates(agencyId: string, callback: CollectionSubscriptionCallback<Vehicle>): Unsubscribe;
}

/**
 * Complete data access layer interface
 */
export interface IDataAccessLayer {
  users: IUserDataAccess;
  bookings: IBookingDataAccess;
  vehicles: IVehicleDataAccess;
  generateId(): string;
  initialize(): Promise<void>;
}

