import { create } from 'zustand';
import { Vehicle } from '../types';
import { LocalStorageService } from '../services/localStorage';

interface VehicleState {
  vehicles: Vehicle[];
  selectedVehicle: Vehicle | null;
  isLoading: boolean;
  error: string | null;
  
  // Actions
  fetchAllVehicles: () => Promise<void>;
  fetchVehiclesByAgency: (agencyId: string) => Promise<Vehicle[]>;
  addVehicle: (vehicleData: Omit<Vehicle, 'id' | 'createdAt' | 'updatedAt'>) => Promise<void>;
  updateVehicle: (vehicleId: string, updates: Partial<Vehicle>) => Promise<void>;
  deleteVehicle: (vehicleId: string) => Promise<void>;
  setSelectedVehicle: (vehicle: Vehicle | null) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  clearError: () => void;
}

export const useVehicleStore = create<VehicleState>((set, get) => ({
  vehicles: [],
  selectedVehicle: null,
  isLoading: false,
  error: null,

  fetchAllVehicles: async () => {
    set({ isLoading: true, error: null });
    try {
      const vehicles = await LocalStorageService.getVehicles();
      set({ vehicles, isLoading: false });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to fetch vehicles';
      set({ isLoading: false, error: errorMessage });
      throw error;
    }
  },

  fetchVehiclesByAgency: async (agencyId: string) => {
    try {
      const vehicles = await LocalStorageService.getVehicles();
      return vehicles.filter((vehicle: Vehicle) => vehicle.agencyId === agencyId);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to fetch vehicles by agency';
      throw new Error(errorMessage);
    }
  },

  addVehicle: async (vehicleData) => {
    set({ isLoading: true, error: null });
    try {
      const newVehicle: Vehicle = {
        ...vehicleData,
        id: LocalStorageService.generateId(),
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      
      await LocalStorageService.saveVehicle(newVehicle);
      
      // Update local state
      const { vehicles } = get();
      set({ vehicles: [...vehicles, newVehicle], isLoading: false });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to add vehicle';
      set({ isLoading: false, error: errorMessage });
      throw error;
    }
  },

  updateVehicle: async (vehicleId, updates) => {
    set({ isLoading: true, error: null });
    try {
      await LocalStorageService.updateVehicle(vehicleId, updates);
      
      // Update local state
      const { vehicles } = get();
      const updatedVehicles = vehicles.map(vehicle =>
        vehicle.id === vehicleId ? { ...vehicle, ...updates, updatedAt: new Date() } : vehicle
      );
      set({ vehicles: updatedVehicles, isLoading: false });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to update vehicle';
      set({ isLoading: false, error: errorMessage });
      throw error;
    }
  },

  deleteVehicle: async (vehicleId) => {
    set({ isLoading: true, error: null });
    try {
      await LocalStorageService.deleteVehicle(vehicleId);
      
      // Update local state
      const { vehicles } = get();
      set({ 
        vehicles: vehicles.filter(v => v.id !== vehicleId), 
        selectedVehicle: get().selectedVehicle?.id === vehicleId ? null : get().selectedVehicle,
        isLoading: false 
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to delete vehicle';
      set({ isLoading: false, error: errorMessage });
      throw error;
    }
  },

  setSelectedVehicle: (vehicle) => {
    set({ selectedVehicle: vehicle });
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

