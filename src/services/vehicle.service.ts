// src/services/vehicle.service.ts

import { LocalStorageService } from './localStorage';
import { Vehicle } from '../types/index';

/**
 * VehicleService - Handles vehicle CRUD operations with local storage
 */
export class VehicleService {
  /**
   * Get all vehicles from local storage
   */
  static async getAllVehicles(): Promise<Vehicle[]> {
    try {
      const vehicles = await LocalStorageService.getVehicles();
      return vehicles as Vehicle[];
    } catch (error) {
      throw error;
    }
  }

  /**
   * Get vehicles by agency ID
   * Note: agencyId should be uid value
   */
  static async getVehiclesByAgency(agencyId: string): Promise<Vehicle[]> {
    try {
      const allVehicles = await LocalStorageService.getVehicles();
      return allVehicles.filter(v => v.agencyId === agencyId) as Vehicle[];
    } catch (error) {
      throw error;
    }
  }

  /**
   * Get a single vehicle by ID
   */
  static async getVehicleById(vehicleId: string): Promise<Vehicle | null> {
    try {
      const vehicle = await LocalStorageService.getVehicleById(vehicleId);
      return vehicle as Vehicle | null;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Create a new vehicle
   * Note: vehicleData.agencyId should be uid value
   */
  static async createVehicle(vehicleData: Omit<Vehicle, 'id' | 'createdAt' | 'updatedAt'>): Promise<Vehicle> {
    try {
      const id = LocalStorageService.generateId();
      const newVehicle: Vehicle = {
        ...vehicleData,
        id,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      await LocalStorageService.saveVehicle(newVehicle);
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
      await LocalStorageService.updateVehicle(vehicleId, updates);
    } catch (error) {
      throw error;
    }
  }

  /**
   * Delete a vehicle
   */
  static async deleteVehicle(vehicleId: string): Promise<void> {
    try {
      await LocalStorageService.deleteVehicle(vehicleId);
    } catch (error) {
      throw error;
    }
  }

  /**
   * Subscribe to real-time vehicle updates for a specific vehicle
   * Note: Real-time subscriptions are not available with local storage
   * This is a placeholder that returns a no-op unsubscribe function
   */
  static subscribeToVehicleUpdates(
    vehicleId: string,
    callback: (vehicle: Vehicle | null) => void
  ): () => void {
    // Local storage doesn't support real-time updates
    // This is a placeholder for compatibility
    return () => {};
  }

  /**
   * Subscribe to real-time updates for all vehicles in an agency
   * Note: Real-time subscriptions are not available with local storage
   * This is a placeholder that returns a no-op unsubscribe function
   */
  static subscribeToAgencyVehiclesUpdates(
    agencyId: string,
    callback: (vehicles: Vehicle[]) => void
  ): () => void {
    // Local storage doesn't support real-time updates
    // This is a placeholder for compatibility
    return () => {};
  }

  /**
   * Subscribe to real-time updates for all vehicles (admin only)
   * Note: Real-time subscriptions are not available with local storage
   * This is a placeholder that returns a no-op unsubscribe function
   */
  static subscribeToAllVehiclesUpdates(
    callback: (vehicles: Vehicle[]) => void
  ): () => void {
    // Local storage doesn't support real-time updates
    // This is a placeholder for compatibility
    return () => {};
  }
}
