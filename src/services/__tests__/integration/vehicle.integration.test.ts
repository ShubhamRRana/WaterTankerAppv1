/**
 * Integration tests for Vehicle Service with Supabase
 * 
 * NOTE: These tests require a test Supabase instance.
 * Set EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY environment variables.
 * 
 * To run integration tests:
 * npm test -- --testPathPattern=integration
 */

// Unmock Supabase to use real client for integration tests
jest.unmock('../../supabase');

import { VehicleService } from '../../vehicle.service';
import { AuthService } from '../../auth.service';
import { Vehicle } from '../../../types';

// Skip integration tests if test credentials are not provided
const shouldRunIntegrationTests = process.env.EXPO_PUBLIC_SUPABASE_URL && process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

// Increase timeout for integration tests (real API calls take longer)
jest.setTimeout(30000); // 30 seconds

describe('VehicleService Integration Tests', () => {
  let testAgencyId: string;

  beforeAll(async () => {
    if (!shouldRunIntegrationTests) {
      console.warn('Skipping integration tests - EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY not set');
      return;
    }

    // Create test agency user
    const timestamp = Date.now().toString().slice(-5);
    const agencyResult = await AuthService.register(
      `98765${timestamp}`,
      'TestPassword123',
      'Test Agency',
      'admin' // Admin role for agency
    );

    if (agencyResult.success && agencyResult.user) {
      testAgencyId = agencyResult.user.uid;
      
      // Login to establish authenticated session for RLS policies
      await AuthService.login(`98765${timestamp}`, 'TestPassword123');
    }

    await new Promise(resolve => setTimeout(resolve, 1000));
  });

  beforeEach(async () => {
    if (!shouldRunIntegrationTests) return;
    // Clean up test data before each test
  });

  afterEach(async () => {
    if (!shouldRunIntegrationTests) return;
    // Clean up test data after each test
  });

  (shouldRunIntegrationTests ? describe : describe.skip)('Real Supabase Integration', () => {
    it('should create a new vehicle', async () => {
      const vehicleData: Omit<Vehicle, 'id' | 'createdAt' | 'updatedAt'> = {
        agencyId: testAgencyId,
        vehicleNumber: `TEST${Date.now().toString().slice(-6)}`,
        insuranceCompanyName: 'Test Insurance Co',
        insuranceExpiryDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
        vehicleCapacity: 1000,
        amount: 5000,
      };

      const vehicle = await VehicleService.createVehicle(vehicleData);

      expect(vehicle).toBeDefined();
      expect(vehicle.agencyId).toBe(testAgencyId);
      expect(vehicle.vehicleNumber).toBe(vehicleData.vehicleNumber);
      expect(vehicle.vehicleCapacity).toBe(vehicleData.vehicleCapacity);
    });

    it('should get all vehicles', async () => {
      // Create a test vehicle first
      const vehicleData: Omit<Vehicle, 'id' | 'createdAt' | 'updatedAt'> = {
        agencyId: testAgencyId,
        vehicleNumber: `TEST${Date.now().toString().slice(-6)}`,
        insuranceCompanyName: 'Test Insurance Co',
        insuranceExpiryDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
        vehicleCapacity: 2000,
        amount: 5000,
      };

      await VehicleService.createVehicle(vehicleData);
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Get all vehicles
      const vehicles = await VehicleService.getAllVehicles();

      expect(Array.isArray(vehicles)).toBe(true);
      expect(vehicles.length).toBeGreaterThan(0);
    });

    it('should get vehicles by agency', async () => {
      // Create a test vehicle
      const vehicleData: Omit<Vehicle, 'id' | 'createdAt' | 'updatedAt'> = {
        agencyId: testAgencyId,
        vehicleNumber: `TEST${Date.now().toString().slice(-6)}`,
        insuranceCompanyName: 'Test Insurance Co',
        insuranceExpiryDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
        vehicleCapacity: 3000,
        amount: 5000,
      };

      await VehicleService.createVehicle(vehicleData);
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Get vehicles by agency
      const vehicles = await VehicleService.getVehiclesByAgency(testAgencyId);

      expect(Array.isArray(vehicles)).toBe(true);
      expect(vehicles.length).toBeGreaterThan(0);
      vehicles.forEach(vehicle => {
        expect(vehicle.agencyId).toBe(testAgencyId);
      });
    });

    it('should get vehicle by ID', async () => {
      // Create a test vehicle
      const vehicleData: Omit<Vehicle, 'id' | 'createdAt' | 'updatedAt'> = {
        agencyId: testAgencyId,
        vehicleNumber: `TEST${Date.now().toString().slice(-6)}`,
        insuranceCompanyName: 'Test Insurance Co',
        insuranceExpiryDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
        vehicleCapacity: 4000,
        amount: 5000,
      };

      const createdVehicle = await VehicleService.createVehicle(vehicleData);
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Get vehicle by ID
      const vehicle = await VehicleService.getVehicleById(createdVehicle.id);

      expect(vehicle).toBeDefined();
      expect(vehicle?.id).toBe(createdVehicle.id);
      expect(vehicle?.vehicleNumber).toBe(vehicleData.vehicleNumber);
    });

    it('should return null for non-existent vehicle', async () => {
      // Use a valid UUID format for non-existent ID test
      const nonExistentId = '00000000-0000-4000-8000-000000000000';
      const vehicle = await VehicleService.getVehicleById(nonExistentId);

      expect(vehicle).toBeNull();
    });

    it('should update vehicle', async () => {
      // Create a test vehicle
      const vehicleData: Omit<Vehicle, 'id' | 'createdAt' | 'updatedAt'> = {
        agencyId: testAgencyId,
        vehicleNumber: `TEST${Date.now().toString().slice(-6)}`,
        insuranceCompanyName: 'Test Insurance Co',
        insuranceExpiryDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
        vehicleCapacity: 5000,
        amount: 5000,
      };

      const createdVehicle = await VehicleService.createVehicle(vehicleData);
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Update vehicle
      await VehicleService.updateVehicle(createdVehicle.id, {
        vehicleCapacity: 6000,
        amount: 6000,
      });

      // Fetch updated vehicle to verify changes
      const updatedVehicle = await VehicleService.getVehicleById(createdVehicle.id);
      expect(updatedVehicle).toBeDefined();
      expect(updatedVehicle?.vehicleCapacity).toBe(6000);
      expect(updatedVehicle?.amount).toBe(6000);
    });

    it('should delete vehicle', async () => {
      // Create a test vehicle
      const vehicleData: Omit<Vehicle, 'id' | 'createdAt' | 'updatedAt'> = {
        agencyId: testAgencyId,
        vehicleNumber: `TEST${Date.now().toString().slice(-6)}`,
        insuranceCompanyName: 'Test Insurance Co',
        insuranceExpiryDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
        vehicleCapacity: 7000,
        amount: 5000,
      };

      const createdVehicle = await VehicleService.createVehicle(vehicleData);
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Delete vehicle
      await VehicleService.deleteVehicle(createdVehicle.id);

      // Verify deletion
      const vehicle = await VehicleService.getVehicleById(createdVehicle.id);
      expect(vehicle).toBeNull();
    });
  });
});

