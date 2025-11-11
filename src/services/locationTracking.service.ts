/**
 * Location Tracking Service
 * 
 * Handles real-time location tracking for drivers during active bookings.
 * Stores location updates in Supabase and provides real-time subscriptions.
 */

import { supabase } from './supabase';
import { LocationService } from './location.service';
import * as Location from 'expo-location';
import { SubscriptionManager } from '../utils/subscriptionManager';

export interface DriverLocation {
  id: string;
  driverId: string;
  bookingId: string | null;
  latitude: number;
  longitude: number;
  accuracy?: number;
  heading?: number;
  speed?: number;
  timestamp: Date;
}

export interface LocationUpdate {
  driverId: string;
  bookingId: string | null;
  latitude: number;
  longitude: number;
  accuracy?: number;
  heading?: number;
  speed?: number;
}

/**
 * Location Tracking Service for driver location updates
 */
export class LocationTrackingService {
  private static activeWatchers = new Map<string, Location.LocationSubscription>();
  private static updateIntervals = new Map<string, NodeJS.Timeout>();

  /**
   * Start tracking location for a driver
   * @param driverId - The driver's user ID
   * @param bookingId - Optional booking ID if tracking for a specific booking
   * @param updateInterval - How often to update location (in milliseconds, default: 10 seconds)
   */
  static async startTracking(
    driverId: string,
    bookingId: string | null = null,
    updateInterval: number = 10000
  ): Promise<void> {
    try {
      // Check if already tracking
      if (this.activeWatchers.has(driverId)) {
        console.warn(`Location tracking already active for driver ${driverId}`);
        return;
      }

      // Request permissions
      const hasPermission = await LocationService.hasPermissions();
      if (!hasPermission) {
        const granted = await LocationService.requestPermissions();
        if (!granted) {
          throw new Error('Location permission denied. Cannot start tracking.');
        }
      }

      // Start watching position
      const subscription = await LocationService.watchPositionAsync(
        async (location) => {
          await this.updateLocation({
            driverId,
            bookingId,
            latitude: location.latitude,
            longitude: location.longitude,
          });
        },
        {
          accuracy: Location.Accuracy.High,
          timeInterval: updateInterval,
          distanceInterval: 10, // Update every 10 meters
        }
      );

      this.activeWatchers.set(driverId, subscription);

      // Also set up periodic updates as backup
      const interval = setInterval(async () => {
        try {
          const currentLocation = await LocationService.getCurrentLocation();
          await this.updateLocation({
            driverId,
            bookingId,
            latitude: currentLocation.latitude,
            longitude: currentLocation.longitude,
          });
        } catch (error) {
          console.error('Error in periodic location update:', error);
        }
      }, updateInterval);

      this.updateIntervals.set(driverId, interval);

      // Send initial location
      const initialLocation = await LocationService.getCurrentLocation();
      await this.updateLocation({
        driverId,
        bookingId,
        latitude: initialLocation.latitude,
        longitude: initialLocation.longitude,
      });
    } catch (error) {
      console.error('Error starting location tracking:', error);
      throw error;
    }
  }

  /**
   * Stop tracking location for a driver
   */
  static async stopTracking(driverId: string): Promise<void> {
    try {
      // Stop watcher
      const watcher = this.activeWatchers.get(driverId);
      if (watcher) {
        watcher.remove();
        this.activeWatchers.delete(driverId);
      }

      // Clear interval
      const interval = this.updateIntervals.get(driverId);
      if (interval) {
        clearInterval(interval);
        this.updateIntervals.delete(driverId);
      }
    } catch (error) {
      console.error('Error stopping location tracking:', error);
      throw error;
    }
  }

  /**
   * Update driver location in database
   */
  static async updateLocation(update: LocationUpdate): Promise<void> {
    try {
      const { error } = await supabase
        .from('driver_locations')
        .upsert(
          {
            driver_id: update.driverId,
            booking_id: update.bookingId,
            latitude: update.latitude,
            longitude: update.longitude,
            accuracy: update.accuracy,
            heading: update.heading,
            speed: update.speed,
            updated_at: new Date().toISOString(),
          },
          {
            onConflict: 'driver_id,booking_id',
          }
        );

      if (error) {
        throw error;
      }
    } catch (error) {
      console.error('Error updating location:', error);
      throw error;
    }
  }

  /**
   * Get current location for a driver
   */
  static async getDriverLocation(driverId: string): Promise<DriverLocation | null> {
    try {
      const { data, error } = await supabase
        .from('driver_locations')
        .select('*')
        .eq('driver_id', driverId)
        .order('updated_at', { ascending: false })
        .limit(1)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          // No location found
          return null;
        }
        throw error;
      }

      if (!data) return null;

      return {
        id: data.id,
        driverId: data.driver_id,
        bookingId: data.booking_id,
        latitude: data.latitude,
        longitude: data.longitude,
        accuracy: data.accuracy,
        heading: data.heading,
        speed: data.speed,
        timestamp: new Date(data.updated_at),
      };
    } catch (error) {
      console.error('Error getting driver location:', error);
      throw error;
    }
  }

  /**
   * Get location for a specific booking
   */
  static async getBookingLocation(bookingId: string): Promise<DriverLocation | null> {
    try {
      const { data, error } = await supabase
        .from('driver_locations')
        .select('*')
        .eq('booking_id', bookingId)
        .order('updated_at', { ascending: false })
        .limit(1)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          return null;
        }
        throw error;
      }

      if (!data) return null;

      return {
        id: data.id,
        driverId: data.driver_id,
        bookingId: data.booking_id,
        latitude: data.latitude,
        longitude: data.longitude,
        accuracy: data.accuracy,
        heading: data.heading,
        speed: data.speed,
        timestamp: new Date(data.updated_at),
      };
    } catch (error) {
      console.error('Error getting booking location:', error);
      throw error;
    }
  }

  /**
   * Subscribe to real-time location updates for a driver
   */
  static subscribeToDriverLocation(
    driverId: string,
    callback: (location: DriverLocation | null) => void
  ): () => void {
    return SubscriptionManager.subscribe(
      {
        channelName: `driver-location:${driverId}`,
        table: 'driver_locations',
        filter: `driver_id=eq.${driverId}`,
        event: 'UPDATE',
        onError: (error) => {
          console.error(`Error in driver location subscription for ${driverId}:`, error);
        },
      },
      async (payload) => {
        try {
          if (payload.eventType === 'UPDATE' && payload.new) {
            const location: DriverLocation = {
              id: payload.new.id,
              driverId: payload.new.driver_id,
              bookingId: payload.new.booking_id,
              latitude: payload.new.latitude,
              longitude: payload.new.longitude,
              accuracy: payload.new.accuracy,
              heading: payload.new.heading,
              speed: payload.new.speed,
              timestamp: new Date(payload.new.updated_at),
            };
            callback(location);
          }
        } catch (error) {
          console.error('Error processing location update:', error);
          callback(null);
        }
      }
    );
  }

  /**
   * Subscribe to real-time location updates for a booking
   */
  static subscribeToBookingLocation(
    bookingId: string,
    callback: (location: DriverLocation | null) => void
  ): () => void {
    return SubscriptionManager.subscribe(
      {
        channelName: `booking-location:${bookingId}`,
        table: 'driver_locations',
        filter: `booking_id=eq.${bookingId}`,
        event: 'UPDATE',
        onError: (error) => {
          console.error(`Error in booking location subscription for ${bookingId}:`, error);
        },
      },
      async (payload) => {
        try {
          if (payload.eventType === 'UPDATE' && payload.new) {
            const location: DriverLocation = {
              id: payload.new.id,
              driverId: payload.new.driver_id,
              bookingId: payload.new.booking_id,
              latitude: payload.new.latitude,
              longitude: payload.new.longitude,
              accuracy: payload.new.accuracy,
              heading: payload.new.heading,
              speed: payload.new.speed,
              timestamp: new Date(payload.new.updated_at),
            };
            callback(location);
          }
        } catch (error) {
          console.error('Error processing location update:', error);
          callback(null);
        }
      }
    );
  }

  /**
   * Check if tracking is active for a driver
   */
  static isTracking(driverId: string): boolean {
    return this.activeWatchers.has(driverId);
  }

  /**
   * Stop all active tracking
   */
  static async stopAllTracking(): Promise<void> {
    const driverIds = Array.from(this.activeWatchers.keys());
    await Promise.all(driverIds.map((id) => this.stopTracking(id)));
  }
}

