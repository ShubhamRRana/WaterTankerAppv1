import { LocalStorageService } from './localStorage';
import { Booking, BookingStatus } from '../types/index';

export class BookingService {
  /**
   * Create a new booking in local storage
   * Note: bookingData.customerId, agencyId, driverId should be uid values
   */
  static async createBooking(bookingData: Omit<Booking, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
    try {
      const id = LocalStorageService.generateId();
      const newBooking: Booking = {
        ...bookingData,
        id,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      await LocalStorageService.saveBooking(newBooking);
      return id;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Update booking status in local storage
   */
  static async updateBookingStatus(
    bookingId: string,
    status: BookingStatus,
    additionalData?: Partial<Booking>
  ): Promise<void> {
    try {
      const updates: any = {
        status,
        updatedAt: new Date(),
      };

      if (status === 'accepted') {
        updates.acceptedAt = new Date();
      } else if (status === 'delivered') {
        updates.deliveredAt = new Date();
      }

      // Merge additional data
      if (additionalData) {
        Object.assign(updates, additionalData);
      }

      await LocalStorageService.updateBooking(bookingId, updates);
    } catch (error) {
      throw error;
    }
  }

  /**
   * Get all bookings for a customer by uid
   */
  static async getBookingsByCustomer(customerUid: string): Promise<Booking[]> {
    try {
      const bookings = await LocalStorageService.getBookingsByCustomer(customerUid);
      return bookings as Booking[];
    } catch (error) {
      throw error;
    }
  }

  /**
   * Get all available bookings (pending status, no driver assigned)
   */
  static async getAvailableBookings(): Promise<Booking[]> {
    try {
      const bookings = await LocalStorageService.getAvailableBookings();
      return bookings as Booking[];
    } catch (error) {
      throw error;
    }
  }

  /**
   * Get all bookings for a driver by uid
   */
  static async getBookingsByDriver(driverUid: string): Promise<Booking[]> {
    try {
      const bookings = await LocalStorageService.getBookingsByDriver(driverUid);
      return bookings as Booking[];
    } catch (error) {
      throw error;
    }
  }

  /**
   * Get all bookings (admin only)
   */
  static async getAllBookings(): Promise<Booking[]> {
    try {
      const bookings = await LocalStorageService.getBookings();
      return bookings as Booking[];
    } catch (error) {
      throw error;
    }
  }

  /**
   * Get a single booking by ID
   */
  static async getBookingById(bookingId: string): Promise<Booking | null> {
    try {
      const booking = await LocalStorageService.getBookingById(bookingId);
      return booking as Booking | null;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Subscribe to real-time booking updates using local storage
   * Note: Real-time subscriptions are not available with local storage
   * This is a placeholder that returns a no-op unsubscribe function
   */
  static subscribeToBookingUpdates(
    bookingId: string,
    callback: (booking: Booking | null) => void
  ): () => void {
    // Local storage doesn't support real-time updates
    // This is a placeholder for compatibility
    return () => {};
  }

  /**
   * Cancel a booking
   */
  static async cancelBooking(bookingId: string, reason: string): Promise<void> {
    try {
      await LocalStorageService.updateBooking(bookingId, {
        status: 'cancelled',
        cancellationReason: reason,
        updatedAt: new Date(),
      });
    } catch (error) {
      throw error;
    }
  }
}
