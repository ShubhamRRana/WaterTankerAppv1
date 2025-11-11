import { supabase } from './supabase';
import { Booking, BookingStatus } from '../types/index';
import { transformAppBookingToSupabaseBooking, transformSupabaseBookingToAppBooking } from '../utils/supabaseTransformers';

export class BookingService {
  /**
   * Create a new booking in Supabase
   */
  static async createBooking(bookingData: Omit<Booking, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
    try {
      const supabaseBooking = transformAppBookingToSupabaseBooking(bookingData);

      const { data, error } = await supabase
        .from('bookings')
        .insert([supabaseBooking])
        .select('id')
        .single();

      if (error || !data) {
        throw new Error(error?.message || 'Failed to create booking');
      }

      return data.id;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Update booking status in Supabase
   */
  static async updateBookingStatus(
    bookingId: string,
    status: BookingStatus,
    additionalData?: Partial<Booking>
  ): Promise<void> {
    try {
      const updateData: any = {
        status,
      };

      if (status === 'accepted') {
        updateData.accepted_at = new Date().toISOString();
      } else if (status === 'delivered') {
        updateData.delivered_at = new Date().toISOString();
      }

      // Map additional data fields to Supabase format
      if (additionalData) {
        if (additionalData.driverId !== undefined) updateData.driver_id = additionalData.driverId;
        if (additionalData.driverName !== undefined) updateData.driver_name = additionalData.driverName;
        if (additionalData.driverPhone !== undefined) updateData.driver_phone = additionalData.driverPhone;
        if (additionalData.paymentStatus !== undefined) updateData.payment_status = additionalData.paymentStatus;
        if (additionalData.paymentId !== undefined) updateData.payment_id = additionalData.paymentId;
        if (additionalData.canCancel !== undefined) updateData.can_cancel = additionalData.canCancel;
      }

      const { error } = await supabase
        .from('bookings')
        .update(updateData)
        .eq('id', bookingId);

      if (error) {
        throw new Error(error.message);
      }
    } catch (error) {
      throw error;
    }
  }

  /**
   * Get all bookings for a customer
   */
  static async getBookingsByCustomer(customerId: string): Promise<Booking[]> {
    try {
      const { data, error } = await supabase
        .from('bookings')
        .select('*')
        .eq('customer_id', customerId)
        .order('created_at', { ascending: false });

      if (error) {
        throw new Error(error.message);
      }

      return (data || []).map(transformSupabaseBookingToAppBooking);
    } catch (error) {
      throw error;
    }
  }

  /**
   * Get all available bookings (pending status, no driver assigned)
   */
  static async getAvailableBookings(): Promise<Booking[]> {
    try {
      const { data, error } = await supabase
        .from('bookings')
        .select('*')
        .eq('status', 'pending')
        .is('driver_id', null)
        .order('created_at', { ascending: false });

      if (error) {
        throw new Error(error.message);
      }

      return (data || []).map(transformSupabaseBookingToAppBooking);
    } catch (error) {
      throw error;
    }
  }

  /**
   * Get all bookings for a driver
   */
  static async getBookingsByDriver(driverId: string): Promise<Booking[]> {
    try {
      const { data, error } = await supabase
        .from('bookings')
        .select('*')
        .eq('driver_id', driverId)
        .order('created_at', { ascending: false });

      if (error) {
        throw new Error(error.message);
      }

      return (data || []).map(transformSupabaseBookingToAppBooking);
    } catch (error) {
      throw error;
    }
  }

  /**
   * Get all bookings (admin only)
   */
  static async getAllBookings(): Promise<Booking[]> {
    try {
      const { data, error } = await supabase
        .from('bookings')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        throw new Error(error.message);
      }

      return (data || []).map(transformSupabaseBookingToAppBooking);
    } catch (error) {
      throw error;
    }
  }

  /**
   * Get a single booking by ID
   */
  static async getBookingById(bookingId: string): Promise<Booking | null> {
    try {
      const { data, error } = await supabase
        .from('bookings')
        .select('*')
        .eq('id', bookingId)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          // No rows returned
          return null;
        }
        throw new Error(error.message);
      }

      return data ? transformSupabaseBookingToAppBooking(data) : null;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Subscribe to real-time booking updates using Supabase Realtime
   * Uses SubscriptionManager for optimized subscription handling
   */
  static subscribeToBookingUpdates(
    bookingId: string,
    callback: (booking: Booking | null) => void
  ): () => void {
    const { SubscriptionManager } = require('../utils/subscriptionManager');
    
    return SubscriptionManager.subscribe(
      {
        channelName: `booking:${bookingId}`,
        table: 'bookings',
        filter: `id=eq.${bookingId}`,
        event: '*',
        onError: (error) => {
          console.error(`Error in booking subscription for ${bookingId}:`, error);
        },
      },
      async (payload: any) => {
        try {
          if (payload.eventType === 'DELETE') {
            callback(null);
          } else {
            // Fetch the updated booking to get all fields
            const booking = await this.getBookingById(bookingId);
            callback(booking);
          }
        } catch (error) {
          console.error('Error handling booking update:', error);
          callback(null);
        }
      }
    );
  }

  /**
   * Cancel a booking
   */
  static async cancelBooking(bookingId: string, reason: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('bookings')
        .update({
          status: 'cancelled',
          cancellation_reason: reason,
        })
        .eq('id', bookingId);

      if (error) {
        throw new Error(error.message);
      }
    } catch (error) {
      throw error;
    }
  }
}