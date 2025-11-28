import AsyncStorage from '@react-native-async-storage/async-storage';
import { User, Booking, Vehicle } from '../types/index';
import {
  serializeUserDates,
  deserializeUserDates,
  serializeBookingDates,
  deserializeBookingDates,
  serializeVehicleDates,
  deserializeVehicleDates,
} from '../utils/dateSerialization';

// Local storage service to replace Firebase functionality
export class LocalStorageService {
  // Generic methods for storing and retrieving data
  static async setItem<T>(key: string, value: T): Promise<void> {
    try {
      const jsonValue = JSON.stringify(value);
      await AsyncStorage.setItem(key, jsonValue);
    } catch (error) {
      throw new Error(`Failed to store data: ${error}`);
    }
  }

  static async getItem<T>(key: string): Promise<T | null> {
    try {
      const jsonValue = await AsyncStorage.getItem(key);
      return jsonValue != null ? JSON.parse(jsonValue) : null;
    } catch (error) {
      throw new Error(`Failed to retrieve data: ${error}`);
    }
  }

  static async removeItem(key: string): Promise<void> {
    try {
      await AsyncStorage.removeItem(key);
    } catch (error) {
      throw new Error(`Failed to remove data: ${error}`);
    }
  }

  static async clear(): Promise<void> {
    try {
      await AsyncStorage.clear();
    } catch (error) {
      throw new Error(`Failed to clear storage: ${error}`);
    }
  }

  // User management methods
  static async saveUser(user: User): Promise<void> {
    const serialized = serializeUserDates(user as any);
    await this.setItem('current_user', serialized);
  }

  static async getCurrentUser(): Promise<User | null> {
    const user = await this.getItem<any>('current_user');
    return user ? (deserializeUserDates(user) as unknown as User) : null;
  }

  static async removeUser(): Promise<void> {
    await this.removeItem('current_user');
  }

  // Booking management methods
  static async saveBooking(booking: Booking): Promise<void> {
    const bookings = await this.getBookings();
    const updatedBookings = [...bookings, booking];
    const serialized = updatedBookings.map(b => serializeBookingDates(b as any));
    await this.setItem('bookings', serialized);
  }

  static async updateBooking(bookingId: string, updates: Partial<Booking>): Promise<void> {
    const bookings = await this.getBookings();
    const updatedBookings = bookings.map(booking => {
      if (booking.id === bookingId) {
        return { ...booking, ...updates };
      }
      return booking;
    });
    const serialized = updatedBookings.map(b => serializeBookingDates(b as any));
    await this.setItem('bookings', serialized);
  }

  static async getBookings(): Promise<Booking[]> {
    const bookings = await this.getItem<any[]>('bookings');
    if (!bookings) return [];
    return bookings.map(booking => deserializeBookingDates(booking) as unknown as Booking);
  }

  static async getBookingById(bookingId: string): Promise<Booking | null> {
    const bookings = await this.getBookings();
    return bookings.find(booking => booking.id === bookingId) || null;
  }

  static async getBookingsByCustomer(customerId: string): Promise<Booking[]> {
    const bookings = await this.getBookings();
    return bookings.filter(booking => booking.customerId === customerId);
  }

  static async getBookingsByDriver(driverId: string): Promise<Booking[]> {
    const bookings = await this.getBookings();
    return bookings.filter(booking => booking.driverId === driverId);
  }

  static async getAvailableBookings(): Promise<Booking[]> {
    const bookings = await this.getBookings();
    return bookings.filter(booking => booking.status === 'pending');
  }

  // User collection management
  static async saveUserToCollection(user: User): Promise<void> {
    const users = await this.getUsers();
    const existingUserIndex = users.findIndex(u => u.uid === user.uid);
    
    if (existingUserIndex >= 0) {
      users[existingUserIndex] = user;
    } else {
      users.push(user);
    }
    
    const serialized = users.map(u => serializeUserDates(u as any));
    await this.setItem('users_collection', serialized);
  }

  static async getUsers(): Promise<User[]> {
    const users = await this.getItem<any[]>('users_collection');
    if (!users) return [];
    return users.map(user => deserializeUserDates(user) as unknown as User);
  }

  static async getUserById(uid: string): Promise<User | null> {
    const users = await this.getUsers();
    return users.find(user => user.uid === uid) || null;
  }

  static async updateUserProfile(uid: string, updates: Partial<User>): Promise<void> {
    const users = await this.getUsers();
    const userIndex = users.findIndex(user => user.uid === uid);
    
    if (userIndex >= 0) {
      users[userIndex] = { ...users[userIndex], ...updates } as User;
      const serialized = users.map(u => serializeUserDates(u as any));
      await this.setItem('users_collection', serialized);
    } else {
      throw new Error('User not found');
    }
  }

  // Vehicle management methods
  static async saveVehicle(vehicle: Vehicle): Promise<void> {
    const vehicles = await this.getVehicles();
    const existingVehicleIndex = vehicles.findIndex(v => v.id === vehicle.id);
    
    if (existingVehicleIndex >= 0) {
      vehicles[existingVehicleIndex] = { ...vehicle, updatedAt: new Date() };
    } else {
      // Preserve existing dates if provided, otherwise create new ones
      const vehicleToAdd = {
        ...vehicle,
        createdAt: vehicle.createdAt || new Date(),
        updatedAt: vehicle.updatedAt || new Date(),
      };
      vehicles.push(vehicleToAdd);
    }
    
    const serialized = vehicles.map(v => serializeVehicleDates(v as any));
    await this.setItem('vehicles_collection', serialized);
  }

  static async getVehicles(): Promise<Vehicle[]> {
    const vehicles = await this.getItem<any[]>('vehicles_collection');
    if (!vehicles) return [];
    return vehicles.map(vehicle => deserializeVehicleDates(vehicle) as unknown as Vehicle);
  }

  static async getVehicleById(vehicleId: string): Promise<Vehicle | null> {
    const vehicles = await this.getVehicles();
    return vehicles.find(vehicle => vehicle.id === vehicleId) || null;
  }

  static async updateVehicle(vehicleId: string, updates: Partial<Vehicle>): Promise<void> {
    const vehicles = await this.getVehicles();
    const vehicleIndex = vehicles.findIndex(vehicle => vehicle.id === vehicleId);
    
    if (vehicleIndex >= 0) {
      vehicles[vehicleIndex] = { ...vehicles[vehicleIndex], ...updates, updatedAt: new Date() } as Vehicle;
      const serialized = vehicles.map(v => serializeVehicleDates(v as any));
      await this.setItem('vehicles_collection', serialized);
    } else {
      throw new Error('Vehicle not found');
    }
  }

  static async deleteVehicle(vehicleId: string): Promise<void> {
    const vehicles = await this.getVehicles();
    const updatedVehicles = vehicles.filter(vehicle => vehicle.id !== vehicleId);
    const serialized = updatedVehicles.map(vehicle => serializeVehicleDates(vehicle as any));
    await this.setItem('vehicles_collection', serialized);
  }

  // Generate unique IDs
  static generateId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  }

  // Initialize with sample data for development
  static async initializeSampleData(): Promise<void> {
    const hasInitialized = await this.getItem('initialized');
    if (hasInitialized) return;

    // Sample users - including multi-role example
    // Note: Email is now the primary identifier for authentication
    // Phone numbers are kept for contact purposes only
    const sampleUsers = [
      {
        uid: 'admin_001',
        role: 'admin',
        email: 'admin@watertanker.app',
        password: 'admin123', // In production, this should be hashed
        phone: '9999999999', // Optional: for contact purposes
        name: 'Admin User',
        createdAt: new Date(),
      },
      {
        uid: 'driver_001',
        role: 'driver',
        email: 'driver@watertanker.app',
        password: 'driver123', // In production, this should be hashed
        phone: '8888888888', // Optional: for contact purposes
        name: 'John Driver',
        vehicleNumber: 'DL01AB1234',
        licenseNumber: 'DL123456789',
        createdAt: new Date(),
        createdByAdmin: false, // Regular driver - should not be able to login
      },
      {
        uid: 'driver_admin_001',
        role: 'driver',
        email: 'admin.driver@watertanker.app',
        password: 'driver123', // In production, this should be hashed
        phone: '6666666666', // Optional: for contact purposes
        name: 'Admin Created Driver',
        vehicleNumber: 'DL03EF9012',
        licenseNumber: 'DL111222333',
        createdAt: new Date(),
        createdByAdmin: true, // Admin-created driver - should be able to login
        isApproved: true,
        isAvailable: true,
        totalEarnings: 0,
        completedOrders: 0,
      },
      {
        uid: 'customer_001',
        role: 'customer',
        email: 'customer@watertanker.app',
        password: 'customer123', // In production, this should be hashed
        phone: '7777777777', // Optional: for contact purposes
        name: 'Jane Customer',
        createdAt: new Date(),
      },
      // Multi-role user example - same email with different roles
      {
        uid: 'multi_customer_001',
        role: 'customer',
        email: 'multirole@watertanker.app',
        password: 'multi123', // In production, this should be hashed
        phone: '5555555555', // Optional: for contact purposes
        name: 'Multi Role User',
        createdAt: new Date(),
      },
      {
        uid: 'multi_driver_001',
        role: 'driver',
        email: 'multirole@watertanker.app',
        password: 'multi123', // In production, this should be hashed
        phone: '5555555555', // Optional: for contact purposes
        name: 'Multi Role User',
        vehicleNumber: 'DL02CD5678',
        licenseNumber: 'DL987654321',
        createdAt: new Date(),
        createdByAdmin: true, // Admin-created driver - should be able to login for multi-role test
        isApproved: true,
        isAvailable: true,
        totalEarnings: 0,
        completedOrders: 0,
      }
    ];

    // Serialize dates before storing
    const serializedUsers = sampleUsers.map(user => serializeUserDates(user as any));
    await this.setItem('users_collection', serializedUsers);
    await this.setItem('initialized', true);
  }
}
