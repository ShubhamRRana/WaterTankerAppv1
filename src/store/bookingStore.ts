import { create } from 'zustand';
import { Booking, BookingStatus } from '../types';
import { BookingService } from '../services/booking.service';

interface BookingState {
  bookings: Booking[];
  currentBooking: Booking | null;
  isLoading: boolean;
  error: string | null;
  
  // Actions
  createBooking: (bookingData: Omit<Booking, 'id' | 'createdAt' | 'updatedAt'>) => Promise<string>;
  updateBookingStatus: (bookingId: string, status: BookingStatus, additionalData?: Partial<Booking>) => Promise<void>;
  fetchCustomerBookings: (customerId: string) => Promise<void>;
  fetchAvailableBookings: () => Promise<void>;
  fetchDriverBookings: (driverId: string) => Promise<void>;
  fetchAllBookings: () => Promise<void>;
  getBookingById: (bookingId: string) => Promise<Booking | null>;
  cancelBooking: (bookingId: string, reason: string) => Promise<void>;
  setCurrentBooking: (booking: Booking | null) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  clearError: () => void;
}

export const useBookingStore = create<BookingState>((set, get) => ({
  bookings: [],
  currentBooking: null,
  isLoading: false,
  error: null,

  createBooking: async (bookingData) => {
    set({ isLoading: true, error: null });
    try {
      const bookingId = await BookingService.createBooking(bookingData);
      set({ isLoading: false });
      return bookingId;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to create booking';
      set({ isLoading: false, error: errorMessage });
      throw error;
    }
  },

  updateBookingStatus: async (bookingId, status, additionalData) => {
    set({ isLoading: true, error: null });
    try {
      await BookingService.updateBookingStatus(bookingId, status, additionalData);
      
      // Update local state
      const { bookings } = get();
      const updatedBookings = bookings.map(booking =>
        booking.id === bookingId
          ? { ...booking, status, ...additionalData, updatedAt: new Date() }
          : booking
      );
      
      set({ bookings: updatedBookings, isLoading: false });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to update booking status';
      set({ isLoading: false, error: errorMessage });
      throw error;
    }
  },

  fetchCustomerBookings: async (customerId) => {
    set({ isLoading: true, error: null });
    try {
      const bookings = await BookingService.getBookingsByCustomer(customerId);
      set({ bookings, isLoading: false });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to fetch customer bookings';
      set({ isLoading: false, error: errorMessage });
      throw error;
    }
  },

  fetchAvailableBookings: async () => {
    set({ isLoading: true, error: null });
    try {
      const bookings = await BookingService.getAvailableBookings();
      set({ bookings, isLoading: false });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to fetch available bookings';
      set({ isLoading: false, error: errorMessage });
      throw error;
    }
  },

  fetchDriverBookings: async (driverId) => {
    set({ isLoading: true, error: null });
    try {
      const bookings = await BookingService.getBookingsByDriver(driverId);
      set({ bookings, isLoading: false });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to fetch driver bookings';
      set({ isLoading: false, error: errorMessage });
      throw error;
    }
  },

  fetchAllBookings: async () => {
    set({ isLoading: true, error: null });
    try {
      const bookings = await BookingService.getAllBookings();
      set({ bookings, isLoading: false });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to fetch all bookings';
      set({ isLoading: false, error: errorMessage });
      throw error;
    }
  },

  getBookingById: async (bookingId) => {
    set({ isLoading: true, error: null });
    try {
      const booking = await BookingService.getBookingById(bookingId);
      set({ isLoading: false });
      return booking;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to fetch booking';
      set({ isLoading: false, error: errorMessage });
      throw error;
    }
  },

  cancelBooking: async (bookingId, reason) => {
    set({ isLoading: true, error: null });
    try {
      await BookingService.cancelBooking(bookingId, reason);
      
      // Update local state
      const { bookings } = get();
      const updatedBookings = bookings.map(booking =>
        booking.id === bookingId
          ? { ...booking, status: 'cancelled', cancellationReason: reason, updatedAt: new Date() }
          : booking
      );
      
      set({ bookings: updatedBookings, isLoading: false });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to cancel booking';
      set({ isLoading: false, error: errorMessage });
      throw error;
    }
  },

  setCurrentBooking: (booking) => {
    set({ currentBooking: booking });
  },

  setLoading: (loading) => {
    set({ isLoading: loading });
  },

  setError: (error) => {
    set({ error });
  },

  clearError: () => {
    set({ error: null });
  },
}));
