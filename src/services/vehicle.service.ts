// src/services/vehicle.service.ts

import { dataAccess } from '../lib';
import { Vehicle } from '../types/index';

/**
 * VehicleService - Handles vehicle CRUD operations using the data access layer
 */
export class VehicleService {
  /**
   * Get all vehicles
   */
  static async getAllVehicles(): Promise<Vehicle[]> {
    try {
      return await dataAccess.vehicles.getVehicles();
    } catch (error) {
      throw error;
    }
  }

  /**
   * Get vehicles by agency ID
   * Note: agencyId should be id value
   */
  static async getVehiclesByAgency(agencyId: string): Promise<Vehicle[]> {
    try {
      return await dataAccess.vehicles.getVehiclesByAgency(agencyId);
    } catch (error) {
      throw error;
    }
  }

  /**
   * Get a single vehicle by ID
   */
  static async getVehicleById(vehicleId: string): Promise<Vehicle | null> {
    try {
      return await dataAccess.vehicles.getVehicleById(vehicleId);
    } catch (error) {
      throw error;
    }
  }

  /**
   * Create a new vehicle
   * Note: vehicleData.agencyId should be id value
   */
  static async createVehicle(vehicleData: Omit<Vehicle, 'id' | 'createdAt' | 'updatedAt'>): Promise<Vehicle> {
    try {
      const id = dataAccess.generateId();
      const newVehicle: Vehicle = {
        ...vehicleData,
        id,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      await dataAccess.vehicles.saveVehicle(newVehicle);
      return newVehicle;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Update a vehicle
   */
  static async updateVehicle(vehicleId: string, updates: Partial<Vehicle>): Promise<void> {
    try {
      await dataAccess.vehicles.updateVehicle(vehicleId, updates);
    } catch (error) {
      throw error;
    }
  }

  /**
   * Delete a vehicle
   */
  static async deleteVehicle(vehicleId: string): Promise<void> {
    try {
      await dataAccess.vehicles.deleteVehicle(vehicleId);
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
    return dataAccess.vehicles.subscribeToVehicleUpdates(vehicleId, callback);
  }

  /**
   * Subscribe to real-time updates for all vehicles in an agency
   */
  static subscribeToAgencyVehiclesUpdates(
    agencyId: string,
    callback: (vehicles: Vehicle[]) => void
  ): () => void {
    // The data access layer expects a CollectionSubscriptionCallback
    // We need to adapt it to the simpler callback signature
    // When any vehicle changes, fetch all vehicles for the agency and pass them to the callback
    const adaptedCallback = async (vehicle: Vehicle | null, eventType: 'INSERT' | 'UPDATE' | 'DELETE') => {
      // Fetch all vehicles for the agency whenever there's a change
      const vehicles = await this.getVehiclesByAgency(agencyId);
      callback(vehicles);
    };
    return dataAccess.vehicles.subscribeToAgencyVehiclesUpdates(agencyId, adaptedCallback);
  }

  /**
   * Subscribe to real-time updates for all vehicles (admin only)
   * Note: This method is not directly supported by the data access layer
   * This is a placeholder that returns a no-op unsubscribe function
   */
  static subscribeToAllVehiclesUpdates(
    callback: (vehicles: Vehicle[]) => void
  ): () => void {
    // Not directly supported by the data access layer
    // This is a placeholder for compatibility
    return () => {};
  }
}
