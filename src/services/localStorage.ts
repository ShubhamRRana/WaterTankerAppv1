import AsyncStorage from '@react-native-async-storage/async-storage';

// Local storage service to replace Firebase functionality
export class LocalStorageService {
  // Generic methods for storing and retrieving data
  static async setItem(key: string, value: any): Promise<void> {
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
  static async saveUser(user: any): Promise<void> {
    await this.setItem('current_user', user);
  }

  static async getCurrentUser(): Promise<any | null> {
    return await this.getItem('current_user');
  }

  static async removeUser(): Promise<void> {
    await this.removeItem('current_user');
  }

  // Booking management methods
  static async saveBooking(booking: any): Promise<void> {
    const bookings = await this.getBookings();
    const updatedBookings = [...bookings, booking];
    await this.setItem('bookings', updatedBookings);
  }

  static async updateBooking(bookingId: string, updates: any): Promise<void> {
    const bookings = await this.getBookings();
    const updatedBookings = bookings.map(booking => 
      booking.id === bookingId ? { ...booking, ...updates } : booking
    );
    await this.setItem('bookings', updatedBookings);
  }

  static async getBookings(): Promise<any[]> {
    const bookings = await this.getItem<any[]>('bookings');
    return bookings || [];
  }

  static async getBookingById(bookingId: string): Promise<any | null> {
    const bookings = await this.getBookings();
    return bookings.find(booking => booking.id === bookingId) || null;
  }

  static async getBookingsByCustomer(customerId: string): Promise<any[]> {
    const bookings = await this.getBookings();
    return bookings.filter(booking => booking.customerId === customerId);
  }

  static async getBookingsByDriver(driverId: string): Promise<any[]> {
    const bookings = await this.getBookings();
    return bookings.filter(booking => booking.driverId === driverId);
  }

  static async getAvailableBookings(): Promise<any[]> {
    const bookings = await this.getBookings();
    return bookings.filter(booking => booking.status === 'pending');
  }

  // User collection management
  static async saveUserToCollection(user: any): Promise<void> {
    const users = await this.getUsers();
    const existingUserIndex = users.findIndex(u => u.uid === user.uid);
    
    if (existingUserIndex >= 0) {
      users[existingUserIndex] = user;
    } else {
      users.push(user);
    }
    
    await this.setItem('users_collection', users);
  }

  static async getUsers(): Promise<any[]> {
    const users = await this.getItem<any[]>('users_collection');
    return users || [];
  }

  static async getUserById(uid: string): Promise<any | null> {
    const users = await this.getUsers();
    return users.find(user => user.uid === uid) || null;
  }

  static async updateUserProfile(uid: string, updates: any): Promise<void> {
    const users = await this.getUsers();
    const userIndex = users.findIndex(user => user.uid === uid);
    
    if (userIndex >= 0) {
      users[userIndex] = { ...users[userIndex], ...updates };
      await this.setItem('users_collection', users);
    } else {
      throw new Error('User not found');
    }
  }

  // Vehicle management methods
  static async saveVehicle(vehicle: any): Promise<void> {
    const vehicles = await this.getVehicles();
    const existingVehicleIndex = vehicles.findIndex(v => v.id === vehicle.id);
    
    if (existingVehicleIndex >= 0) {
      vehicles[existingVehicleIndex] = { ...vehicle, updatedAt: new Date() };
    } else {
      vehicles.push({ ...vehicle, createdAt: new Date(), updatedAt: new Date() });
    }
    
    await this.setItem('vehicles_collection', vehicles);
  }

  static async getVehicles(): Promise<any[]> {
    const vehicles = await this.getItem<any[]>('vehicles_collection');
    return vehicles || [];
  }

  static async getVehicleById(vehicleId: string): Promise<any | null> {
    const vehicles = await this.getVehicles();
    return vehicles.find(vehicle => vehicle.id === vehicleId) || null;
  }

  static async updateVehicle(vehicleId: string, updates: any): Promise<void> {
    const vehicles = await this.getVehicles();
    const vehicleIndex = vehicles.findIndex(vehicle => vehicle.id === vehicleId);
    
    if (vehicleIndex >= 0) {
      vehicles[vehicleIndex] = { ...vehicles[vehicleIndex], ...updates, updatedAt: new Date() };
      await this.setItem('vehicles_collection', vehicles);
    } else {
      throw new Error('Vehicle not found');
    }
  }

  static async deleteVehicle(vehicleId: string): Promise<void> {
    const vehicles = await this.getVehicles();
    const updatedVehicles = vehicles.filter(vehicle => vehicle.id !== vehicleId);
    await this.setItem('vehicles_collection', updatedVehicles);
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
    const sampleUsers = [
      {
        uid: 'admin_001',
        role: 'admin',
        phone: '9999999999',
        name: 'Admin User',
        createdAt: new Date(),
      },
      {
        uid: 'driver_001',
        role: 'driver',
        phone: '8888888888',
        name: 'John Driver',
        vehicleNumber: 'DL01AB1234',
        licenseNumber: 'DL123456789',
        createdAt: new Date(),
        createdByAdmin: false, // Regular driver - should not be able to login
      },
      {
        uid: 'driver_admin_001',
        role: 'driver',
        phone: '6666666666',
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
        phone: '7777777777',
        name: 'Jane Customer',
        createdAt: new Date(),
      },
      // Multi-role user example - same phone number with different roles
      {
        uid: 'multi_customer_001',
        role: 'customer',
        phone: '5555555555',
        name: 'Multi Role User',
        createdAt: new Date(),
      },
      {
        uid: 'multi_driver_001',
        role: 'driver',
        phone: '5555555555',
        name: 'Multi Role User',
        vehicleNumber: 'DL02CD5678',
        licenseNumber: 'DL987654321',
        createdAt: new Date(),
        createdByAdmin: false, // Regular driver - should not be able to login
      }
    ];

    await this.setItem('users_collection', sampleUsers);
    await this.setItem('initialized', true);
  }
}
