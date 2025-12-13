import { dataAccess } from '../lib/index';
import { Booking, BookingStatus } from '../types/index';

/**
 * Booking Service
 * 
 * Handles all booking-related operations including creation, updates, status changes,
 * and retrieval of bookings. Uses dataAccess layer for data persistence.
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
      const id = dataAccess.generateId();
      const newBooking: Booking = {
        ...bookingData,
        id,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      await dataAccess.bookings.saveBooking(newBooking);
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

      await dataAccess.bookings.updateBooking(bookingId, updates);
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
      const bookings = await dataAccess.bookings.getBookingsByCustomer(customerId);
      // Note: options (limit, offset, sortBy, sortOrder) are not yet supported in dataAccess interface
      // This is a limitation that may need to be addressed in future updates
      return bookings;
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
      const bookings = await dataAccess.bookings.getAvailableBookings();
      // Note: options (limit, offset, sortBy, sortOrder) are not yet supported in dataAccess interface
      // This is a limitation that may need to be addressed in future updates
      return bookings;
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
      const bookings = await dataAccess.bookings.getBookingsByDriver(driverId);
      // Note: options (status, limit, offset, sortBy, sortOrder) are not yet supported in dataAccess interface
      // This is a limitation that may need to be addressed in future updates
      return bookings;
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
      // Get all bookings for driver and filter client-side
      const allBookings = await dataAccess.bookings.getBookingsByDriver(driverId);
      
      // Filter by status (default to completed/delivered for earnings)
      const statusFilter = options?.status || ['delivered', 'completed'];
      let filtered = allBookings.filter(b => statusFilter.includes(b.status));
      
      // Filter by date range if provided
      if (options?.startDate) {
        filtered = filtered.filter(b => b.deliveredAt && b.deliveredAt >= options.startDate!);
      }
      if (options?.endDate) {
        filtered = filtered.filter(b => b.deliveredAt && b.deliveredAt <= options.endDate!);
      }
      
      return filtered;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Get all bookings (admin only)
   */
  static async getAllBookings(): Promise<Booking[]> {
    try {
      const bookings = await dataAccess.bookings.getBookings();
      return bookings;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Get a single booking by ID
   */
  static async getBookingById(bookingId: string): Promise<Booking | null> {
    try {
      const booking = await dataAccess.bookings.getBookingById(bookingId);
      return booking;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Subscribe to real-time booking updates
   * Uses the dataAccess layer which supports real-time subscriptions with Supabase
   */
  static subscribeToBookingUpdates(
    bookingId: string,
    callback: (booking: Booking | null) => void
  ): () => void {
    return dataAccess.bookings.subscribeToBookingUpdates(bookingId, callback);
  }

  /**
   * Cancel a booking
   */
  static async cancelBooking(bookingId: string, reason: string): Promise<void> {
    try {
      await dataAccess.bookings.updateBooking(bookingId, {
        status: 'cancelled',
        cancellationReason: reason,
        updatedAt: new Date(),
      });
    } catch (error) {
      throw error;
    }
  }
}
