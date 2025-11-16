// src/services/vehicle.service.ts

import { supabase } from './supabase';
import { Vehicle } from '../types/index';
import { transformSupabaseVehicleToAppVehicle, transformAppVehicleToSupabaseVehicle } from '../utils/supabaseTransformers';
import { UserService } from './user.service';

/**
 * VehicleService - Handles vehicle CRUD operations with Supabase
 */
export class VehicleService {
  /**
   * Get all vehicles from Supabase
   */
  static async getAllVehicles(): Promise<Vehicle[]> {
    try {
      const { data, error } = await supabase
        .from('vehicles')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        throw new Error(error.message);
      }

      return (data || []).map(transformSupabaseVehicleToAppVehicle);
    } catch (error) {
      throw error;
    }
  }

  /**
   * Get vehicles by agency ID
   * Note: agencyId should be auth_id value
   * This function converts it to users.id for querying
   */
  static async getVehiclesByAgency(agencyId: string): Promise<Vehicle[]> {
    try {
      // Convert auth_id to users.id for querying
      const agencyTableId = await UserService.getUsersTableIdByAuthId(agencyId);
      if (!agencyTableId) {
        // If agency not found, return empty array
        return [];
      }

      const { data, error } = await supabase
        .from('vehicles')
        .select('*')
        .eq('agency_id', agencyTableId)
        .order('created_at', { ascending: false });

      if (error) {
        throw new Error(error.message);
      }

      return (data || []).map(transformSupabaseVehicleToAppVehicle);
    } catch (error) {
      throw error;
    }
  }

  /**
   * Get a single vehicle by ID
   */
  static async getVehicleById(vehicleId: string): Promise<Vehicle | null> {
    try {
      // Validate UUID format before querying
      const { ValidationUtils } = require('../utils/validation');
      const uuidValidation = ValidationUtils.validateUUID(vehicleId);
      if (!uuidValidation.isValid) {
        return null;
      }

      const { data, error } = await supabase
        .from('vehicles')
        .select('*')
        .eq('id', vehicleId)
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

      return data ? transformSupabaseVehicleToAppVehicle(data) : null;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Create a new vehicle
   * Note: vehicleData.agencyId should be auth_id value
   * This function converts it to users.id for foreign key relationships
   */
  static async createVehicle(vehicleData: Omit<Vehicle, 'id' | 'createdAt' | 'updatedAt'>): Promise<Vehicle> {
    try {
      // Convert auth_id to users.id for foreign key
      const agencyTableId = await UserService.getUsersTableIdByAuthId(vehicleData.agencyId);
      if (!agencyTableId) {
        throw new Error('Agency not found');
      }

      // Create vehicle data with converted ID
      const vehicleDataWithTableId = {
        ...vehicleData,
        agencyId: agencyTableId,
      };

      const supabaseVehicleData = transformAppVehicleToSupabaseVehicle(vehicleDataWithTableId);

      const { data, error } = await supabase
        .from('vehicles')
        .insert([supabaseVehicleData])
        .select('*')
        .single();

      if (error || !data) {
        throw new Error(error?.message || 'Failed to create vehicle');
      }

      return transformSupabaseVehicleToAppVehicle(data);
    } catch (error) {
      throw error;
    }
  }

  /**
   * Update a vehicle
   */
  static async updateVehicle(vehicleId: string, updates: Partial<Vehicle>): Promise<void> {
    try {
      // Get current vehicle to merge updates
      const { data: currentVehicle, error: fetchError } = await supabase
        .from('vehicles')
        .select('*')
        .eq('id', vehicleId)
        .single();

      if (fetchError || !currentVehicle) {
        throw new Error('Vehicle not found');
      }

      // Transform current vehicle to app type, apply updates, then transform back
      const appVehicle = transformSupabaseVehicleToAppVehicle(currentVehicle);
      const updatedVehicle = { ...appVehicle, ...updates };
      const supabaseUpdates = transformAppVehicleToSupabaseVehicle(updatedVehicle);

      const { error: updateError } = await supabase
        .from('vehicles')
        .update(supabaseUpdates)
        .eq('id', vehicleId);

      if (updateError) {
        throw updateError;
      }
    } catch (error) {
      throw error;
    }
  }

  /**
   * Delete a vehicle
   */
  static async deleteVehicle(vehicleId: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('vehicles')
        .delete()
        .eq('id', vehicleId);

      if (error) {
        throw new Error(error.message);
      }
    } catch (error) {
      throw error;
    }
  }

  /**
   * Subscribe to real-time vehicle updates for a specific vehicle
   */
  static subscribeToVehicleUpdates(
    vehicleId: string,
    callback: (vehicle: Vehicle | null) => void
  ): () => void {
    const channel = supabase
      .channel(`vehicle:${vehicleId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'vehicles',
          filter: `id=eq.${vehicleId}`,
        },
        async (payload) => {
          try {
            if (payload.eventType === 'DELETE') {
              callback(null);
            } else {
              const vehicle = await this.getVehicleById(vehicleId);
              callback(vehicle);
            }
          } catch (error) {
            console.error('Error handling vehicle update:', error);
            callback(null);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }

  /**
   * Subscribe to real-time updates for all vehicles in an agency
   */
  static subscribeToAgencyVehiclesUpdates(
    agencyId: string,
    callback: (vehicles: Vehicle[]) => void
  ): () => void {
    const channel = supabase
      .channel(`vehicles:agency:${agencyId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'vehicles',
          filter: `agency_id=eq.${agencyId}`,
        },
        async () => {
          try {
            const vehicles = await this.getVehiclesByAgency(agencyId);
            callback(vehicles);
          } catch (error) {
            console.error('Error handling vehicles update:', error);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }

  /**
   * Subscribe to real-time updates for all vehicles (admin only)
   */
  static subscribeToAllVehiclesUpdates(
    callback: (vehicles: Vehicle[]) => void
  ): () => void {
    const channel = supabase
      .channel('vehicles:all')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'vehicles',
        },
        async () => {
          try {
            const vehicles = await this.getAllVehicles();
            callback(vehicles);
          } catch (error) {
            console.error('Error handling vehicles update:', error);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }
}

