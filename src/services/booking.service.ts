import { LocalStorageService } from './localStorage';
import { Booking, BookingStatus } from '../types/index';

export class BookingService {
  static async createBooking(bookingData: Omit<Booking, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
    try {
      const booking: Booking = {
        ...bookingData,
        id: LocalStorageService.generateId(),
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      await LocalStorageService.saveBooking(booking);
      return booking.id;
    } catch (error) {
      throw error;
    }
  }

  static async updateBookingStatus(
    bookingId: string,
    status: BookingStatus,
    additionalData?: Partial<Booking>
  ): Promise<void> {
    try {
      const booking = await LocalStorageService.getBookingById(bookingId);
      if (!booking) {
        throw new Error('Booking not found');
      }

      const updateData: any = {
        status,
        updatedAt: new Date(),
        ...additionalData,
      };

      if (status === 'accepted') {
        updateData.acceptedAt = new Date();
      } else if (status === 'delivered') {
        updateData.deliveredAt = new Date();
      }

      await LocalStorageService.updateBooking(bookingId, updateData);
    } catch (error) {
      throw error;
    }
  }

  static async getBookingsByCustomer(customerId: string): Promise<Booking[]> {
    try {
      const bookings = await LocalStorageService.getBookingsByCustomer(customerId);
      return bookings.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    } catch (error) {
      throw error;
    }
  }

  static async getAvailableBookings(): Promise<Booking[]> {
    try {
      const bookings = await LocalStorageService.getAvailableBookings();
      return bookings.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    } catch (error) {
      throw error;
    }
  }

  static async getBookingsByDriver(driverId: string): Promise<Booking[]> {
    try {
      const bookings = await LocalStorageService.getBookingsByDriver(driverId);
      return bookings.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    } catch (error) {
      throw error;
    }
  }

  static async getAllBookings(): Promise<Booking[]> {
    try {
      const bookings = await LocalStorageService.getBookings();
      return bookings.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    } catch (error) {
      throw error;
    }
  }

  static async getBookingById(bookingId: string): Promise<Booking | null> {
    try {
      return await LocalStorageService.getBookingById(bookingId);
    } catch (error) {
      throw error;
    }
  }

  static subscribeToBookingUpdates(
    bookingId: string,
    callback: (booking: Booking | null) => void
  ): () => void {
    // For local storage, we'll simulate real-time updates with polling
    // In a real app, you might use WebSockets or Server-Sent Events
    const interval = setInterval(async () => {
      try {
        const booking = await LocalStorageService.getBookingById(bookingId);
        callback(booking);
      } catch (error) {
        console.error('Error fetching booking updates:', error);
        callback(null);
      }
    }, 5000); // Poll every 5 seconds

    // Return cleanup function
    return () => clearInterval(interval);
  }

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