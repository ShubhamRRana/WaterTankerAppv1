import { supabase } from './supabase';
import { Booking, BookingStatus } from '../types/index';
import { transformAppBookingToSupabaseBooking, transformSupabaseBookingToAppBooking } from '../utils/supabaseTransformers';
import { UserService } from './user.service';

export class BookingService {
  /**
   * Helper function to convert users.id to auth_id in booking objects
   */
  private static async convertBookingIdsToAuthIds(booking: Booking): Promise<Booking> {
    // Get auth_id for customer
    const { data: customerUser } = await supabase
      .from('users')
      .select('auth_id')
      .eq('id', booking.customerId)
      .single();
    if (customerUser) booking.customerId = customerUser.auth_id;

    // Get auth_id for agency if exists
    if (booking.agencyId) {
      const { data: agencyUser } = await supabase
        .from('users')
        .select('auth_id')
        .eq('id', booking.agencyId)
        .single();
      if (agencyUser) booking.agencyId = agencyUser.auth_id;
    }

    // Get auth_id for driver if exists
    if (booking.driverId) {
      const { data: driverUser } = await supabase
        .from('users')
        .select('auth_id')
        .eq('id', booking.driverId)
        .single();
      if (driverUser) booking.driverId = driverUser.auth_id;
    }

    return booking;
  }
  /**
   * Create a new booking in Supabase
   * Note: bookingData.customerId, agencyId, driverId should be auth_id values
   * This function converts them to users.id for foreign key relationships
   */
  static async createBooking(bookingData: Omit<Booking, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
    try {
      // Convert auth_id values to users.id for foreign keys
      const customerTableId = await UserService.getUsersTableIdByAuthId(bookingData.customerId);
      if (!customerTableId) {
        throw new Error('Customer not found');
      }

      let agencyTableId: string | null = null;
      if (bookingData.agencyId) {
        agencyTableId = await UserService.getUsersTableIdByAuthId(bookingData.agencyId);
        if (!agencyTableId) {
          throw new Error('Agency not found');
        }
      }

      let driverTableId: string | null = null;
      if (bookingData.driverId) {
        driverTableId = await UserService.getUsersTableIdByAuthId(bookingData.driverId);
        if (!driverTableId) {
          throw new Error('Driver not found');
        }
      }

      // Create booking data with converted IDs
      const bookingDataWithTableIds = {
        ...bookingData,
        customerId: customerTableId,
        agencyId: agencyTableId || undefined,
        driverId: driverTableId || undefined,
      };

      const supabaseBooking = transformAppBookingToSupabaseBooking(bookingDataWithTableIds);

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
        // Convert driverId from auth_id to users.id if provided
        if (additionalData.driverId !== undefined) {
          const driverTableId = await UserService.getUsersTableIdByAuthId(additionalData.driverId);
          if (driverTableId) {
            updateData.driver_id = driverTableId;
          }
        }
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
   * Get all bookings for a customer by auth_id
   */
  static async getBookingsByCustomer(customerAuthId: string): Promise<Booking[]> {
    try {
      // Convert auth_id to users.id for querying
      const customerTableId = await UserService.getUsersTableIdByAuthId(customerAuthId);
      if (!customerTableId) {
        return [];
      }

      const { data, error } = await supabase
        .from('bookings')
        .select('*')
        .eq('customer_id', customerTableId)
        .order('created_at', { ascending: false });

      if (error) {
        throw new Error(error.message);
      }

      // Transform bookings and convert users.id back to auth_id
      const bookings = (data || []).map(transformSupabaseBookingToAppBooking);
      const convertedBookings = await Promise.all(
        bookings.map(booking => this.convertBookingIdsToAuthIds(booking))
      );

      return convertedBookings;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Get all available bookings (pending status, no driver assigned)
   * Returns bookings with auth_id values for customerId, agencyId, driverId
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

      // Transform bookings and convert users.id back to auth_id
      const bookings = (data || []).map(transformSupabaseBookingToAppBooking);
      const convertedBookings = await Promise.all(
        bookings.map(booking => this.convertBookingIdsToAuthIds(booking))
      );

      return convertedBookings;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Get all bookings for a driver by auth_id
   */
  static async getBookingsByDriver(driverAuthId: string): Promise<Booking[]> {
    try {
      // Convert auth_id to users.id for querying
      const driverTableId = await UserService.getUsersTableIdByAuthId(driverAuthId);
      if (!driverTableId) {
        return [];
      }

      const { data, error } = await supabase
        .from('bookings')
        .select('*')
        .eq('driver_id', driverTableId)
        .order('created_at', { ascending: false });

      if (error) {
        throw new Error(error.message);
      }

      // Transform bookings and convert users.id back to auth_id
      const bookings = (data || []).map(transformSupabaseBookingToAppBooking);
      const convertedBookings = await Promise.all(
        bookings.map(booking => this.convertBookingIdsToAuthIds(booking))
      );

      return convertedBookings;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Get all bookings (admin only)
   * Returns bookings with auth_id values for customerId, agencyId, driverId
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

      // Transform bookings and convert users.id back to auth_id
      const bookings = (data || []).map(transformSupabaseBookingToAppBooking);
      const convertedBookings = await Promise.all(
        bookings.map(booking => this.convertBookingIdsToAuthIds(booking))
      );

      return convertedBookings;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Get a single booking by ID
   * Returns booking with auth_id values for customerId, agencyId, driverId
   */
  static async getBookingById(bookingId: string): Promise<Booking | null> {
    try {
      // Validate UUID format before querying
      const { ValidationUtils } = require('../utils/validation');
      const uuidValidation = ValidationUtils.validateUUID(bookingId);
      if (!uuidValidation.isValid) {
        return null;
      }

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
        // Handle invalid UUID syntax errors
        if (error.message && error.message.includes('invalid input syntax for type uuid')) {
          return null;
        }
        throw new Error(error.message);
      }

      if (!data) {
        return null;
      }

      // Transform and convert users.id to auth_id
      const booking = transformSupabaseBookingToAppBooking(data);
      return await this.convertBookingIdsToAuthIds(booking);
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
        onError: (error: Error) => {
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