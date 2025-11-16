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
import { UserService } from '../../user.service';
import { supabase } from '../../supabase';
import { Vehicle } from '../../../types';

// Skip integration tests if test credentials are not provided
const shouldRunIntegrationTests = process.env.EXPO_PUBLIC_SUPABASE_URL && process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

// Increase timeout for integration tests (real API calls take longer)
jest.setTimeout(30000); // 30 seconds

// Track created test users for cleanup
const createdTestUsers: string[] = [];

// Helper function to generate unique phone number
const generateTestPhone = (prefix: string = '987'): string => {
  const timestamp = Date.now().toString();
  const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
  return `${prefix}${timestamp.slice(-6)}${random}`;
};

// Helper function to wait for session establishment
const waitForSession = async (maxWaitMs: number = 3000): Promise<boolean> => {
  const startTime = Date.now();
  while (Date.now() - startTime < maxWaitMs) {
    const { data: { session } } = await supabase.auth.getSession();
    if (session) {
      return true;
    }
    await new Promise(resolve => setTimeout(resolve, 200));
  }
  return false;
};

describe('VehicleService Integration Tests', () => {
  let testAgencyId: string;
  let testAgencyPhone: string;

  beforeAll(async () => {
    if (!shouldRunIntegrationTests) {
      console.warn('Skipping integration tests - EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY not set');
      return;
    }

    // Create test agency user
    testAgencyPhone = generateTestPhone('98765');
    const agencyResult = await AuthService.register(
      testAgencyPhone,
      'TestPassword123',
      'Test Agency',
      'admin' // Admin role for agency
    );

    if (agencyResult.success && agencyResult.user) {
      testAgencyId = agencyResult.user.uid;
      createdTestUsers.push(testAgencyId);
      
      // Wait for user profile to be created in users table
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Verify user exists in users table before proceeding
      let retries = 0;
      let userExists = false;
      while (retries < 5 && !userExists) {
        const userTableId = await UserService.getUsersTableIdByAuthId(testAgencyId);
        if (userTableId) {
          userExists = true;
        } else {
          retries++;
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }
      
      if (!userExists) {
        throw new Error('Failed to create user profile in users table');
      }
      
      // Login to establish authenticated session for RLS policies
      await AuthService.login(testAgencyPhone, 'TestPassword123');
      await waitForSession();
    }

    await new Promise(resolve => setTimeout(resolve, 2000));
  });

  beforeEach(async () => {
    if (!shouldRunIntegrationTests) return;
    
    // Reset rate limiter to prevent test failures due to rate limiting
    const { rateLimiter } = require('../../../utils/rateLimiter');
    rateLimiter.resetAll();
    
    // Ensure we're logged in as agency
    if (testAgencyPhone) {
      try {
        await AuthService.login(testAgencyPhone, 'TestPassword123');
        await waitForSession();
      } catch (error) {
        // Ignore login errors
      }
    }
  });

  afterEach(async () => {
    if (!shouldRunIntegrationTests) return;
    // Clean up test data after each test
  });

  afterAll(async () => {
    if (!shouldRunIntegrationTests) return;
    // Clean up all created test users
    for (const userId of createdTestUsers) {
      try {
        await UserService.deleteUser(userId);
      } catch (error) {
        // Ignore cleanup errors
      }
    }
    createdTestUsers.length = 0;
    // Logout
    try {
      await AuthService.logout();
    } catch (error) {
      // Ignore logout errors
    }
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

