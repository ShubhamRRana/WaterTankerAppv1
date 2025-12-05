import { LocalStorageService } from './localStorage';
import { Booking, BookingStatus } from '../types/index';

/**
 * Booking Service
 * 
 * Handles all booking-related operations including creation, updates, status changes,
 * and retrieval of bookings. Uses LocalStorageService for data persistence.
 * 
 * @example
 * ```typescript
 * // Create a new booking
 * const bookingId = await BookingService.createBooking({
 *   customerId: 'customer-123',
 *   agencyId: 'agency-456',
 *   // ... other booking data
 * });
 * 
 * // Update booking status
 * await BookingService.updateBookingStatus(bookingId, 'accepted');
 * ```
 */
export class BookingService {
  /**
   * Create a new booking in local storage
   * Note: bookingData.customerId, agencyId, driverId should be id values
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
      const updates: Partial<Booking> = {
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
   * Get all bookings for a customer by id
   * @param options - Optional pagination and sorting options
   */
  static async getBookingsByCustomer(
    customerId: string, 
    options?: { limit?: number; offset?: number; sortBy?: 'createdAt' | 'updatedAt'; sortOrder?: 'asc' | 'desc' }
  ): Promise<Booking[]> {
    try {
      const bookings = await LocalStorageService.getBookingsByCustomer(customerId, options);
      return bookings as Booking[];
    } catch (error) {
      throw error;
    }
  }

  /**
   * Get all available bookings (pending status, no driver assigned)
   * @param options - Optional pagination and sorting options
   */
  static async getAvailableBookings(
    options?: { limit?: number; offset?: number; sortBy?: 'createdAt'; sortOrder?: 'asc' | 'desc' }
  ): Promise<Booking[]> {
    try {
      const bookings = await LocalStorageService.getAvailableBookings(options);
      return bookings as Booking[];
    } catch (error) {
      throw error;
    }
  }

  /**
   * Get bookings for a driver by id with optional filtering
   * @param driverId - The driver's ID
   * @param options - Optional filtering, pagination and sorting options
   */
  static async getBookingsByDriver(
    driverId: string, 
    options?: { 
      status?: BookingStatus[]; 
      limit?: number; 
      offset?: number; 
      sortBy?: 'createdAt' | 'updatedAt' | 'deliveredAt'; 
      sortOrder?: 'asc' | 'desc' 
    }
  ): Promise<Booking[]> {
    try {
      const bookings = await LocalStorageService.getBookingsByDriver(driverId, options);
      return bookings as Booking[];
    } catch (error) {
      throw error;
    }
  }

  /**
   * Get bookings for earnings calculation with date filtering
   * Optimized to only fetch completed bookings within date range
   */
  static async getBookingsForEarnings(
    driverId: string,
    options?: { 
      startDate?: Date; 
      endDate?: Date; 
      status?: BookingStatus[];
    }
  ): Promise<Booking[]> {
    try {
      const bookings = await LocalStorageService.getBookingsForEarnings(driverId, options);
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
