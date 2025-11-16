/**
 * Integration tests for User Service with Supabase
 * 
 * NOTE: These tests require a test Supabase instance.
 * Set EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY environment variables.
 * 
 * To run integration tests:
 * npm test -- --testPathPattern=integration
 */

// Unmock Supabase to use real client for integration tests
jest.unmock('../../supabase');

import { UserService } from '../../user.service';
import { AuthService } from '../../auth.service';
import { UserRole } from '../../../types';
import { supabase } from '../../supabase';

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

describe('UserService Integration Tests', () => {
  beforeAll(() => {
    if (!shouldRunIntegrationTests) {
      console.warn('Skipping integration tests - EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY not set');
    }
  });

  beforeEach(async () => {
    if (!shouldRunIntegrationTests) return;
    
    // Reset rate limiter to prevent test failures due to rate limiting
    const { rateLimiter } = require('../../../utils/rateLimiter');
    rateLimiter.resetAll();
    
    // Clear the tracking array for each test
    createdTestUsers.length = 0;
    // Ensure we're logged out before each test
    try {
      await AuthService.logout();
    } catch (error) {
      // Ignore logout errors
    }
  });

  afterEach(async () => {
    if (!shouldRunIntegrationTests) return;
    // Clean up all created test users
    for (const userId of createdTestUsers) {
      try {
        await UserService.deleteUser(userId);
      } catch (error) {
        // Ignore cleanup errors - user might already be deleted
      }
    }
    // Clear the array
    createdTestUsers.length = 0;
    // Logout after each test
    try {
      await AuthService.logout();
    } catch (error) {
      // Ignore logout errors
    }
  });

  (shouldRunIntegrationTests ? describe : describe.skip)('Real Supabase Integration', () => {
    it('should get all users', async () => {
      // Create a test user first
      const testPhone = generateTestPhone('98765');
      const registerResult = await AuthService.register(
        testPhone,
        'TestPassword123',
        'Test User',
        'customer'
      );
      
      // Verify registration was successful
      expect(registerResult.success).toBe(true);
      expect(registerResult.user).toBeDefined();
      if (registerResult.user) {
        createdTestUsers.push(registerResult.user.uid);
      }
      
      // Wait for Supabase to process registration
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Note: Admin registration may be restricted. For this test, we'll just verify
      // that getAllUsers works with any authenticated user (or without auth if RLS allows)
      // If admin registration fails, we'll test with the customer user we created
      const adminPhone = generateTestPhone('98799');
      const adminResult = await AuthService.register(
        adminPhone,
        'TestPassword123',
        'Test Admin',
        'admin'
      );
      
      let loginPhone = testPhone;
      if (adminResult.success && adminResult.user) {
        createdTestUsers.push(adminResult.user.uid);
        loginPhone = adminPhone;
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
      
      // Login (as admin if registration succeeded, otherwise as customer)
      const loginResult = await AuthService.login(loginPhone, 'TestPassword123');
      expect(loginResult.success).toBe(true);
      
      // Wait for session to be fully established
      const sessionEstablished = await waitForSession();
      expect(sessionEstablished).toBe(true);

      // Get all users
      const users = await UserService.getAllUsers();

      expect(Array.isArray(users)).toBe(true);
      expect(users.length).toBeGreaterThan(0);
    });

    it('should get users by role', async () => {
      // Create test users with different roles
      const customerPhone = generateTestPhone('98766');
      const customerResult = await AuthService.register(
        customerPhone,
        'TestPassword123',
        'Test Customer',
        'customer'
      );
      
      expect(customerResult.success).toBe(true);
      if (customerResult.user) {
        createdTestUsers.push(customerResult.user.uid);
      }
      
      // Drivers can only be created by admins, so we need to set createdByAdmin flag
      const driverPhone = generateTestPhone('98767');
      const driverResult = await AuthService.register(
        driverPhone,
        'TestPassword123',
        'Test Driver',
        'driver',
        { createdByAdmin: true } as any
      );
      
      expect(driverResult.success).toBe(true);
      if (driverResult.user) {
        createdTestUsers.push(driverResult.user.uid);
      }
      
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Get customers
      const customers = await UserService.getUsersByRole('customer');
      expect(Array.isArray(customers)).toBe(true);
      customers.forEach(user => {
        expect(user.role).toBe('customer');
      });

      // Get drivers
      const drivers = await UserService.getUsersByRole('driver');
      expect(Array.isArray(drivers)).toBe(true);
      drivers.forEach(user => {
        expect(user.role).toBe('driver');
      });
    });

    it('should get user by ID', async () => {
      // Create a test user
      const testPhone = generateTestPhone('98768');
      const registerResult = await AuthService.register(
        testPhone,
        'TestPassword123',
        'Test User',
        'customer'
      );
      
      expect(registerResult.success).toBe(true);
      expect(registerResult.user).toBeDefined();
      
      if (registerResult.user) {
        createdTestUsers.push(registerResult.user.uid);
        await new Promise(resolve => setTimeout(resolve, 1000));

        // Get user by ID
        const user = await UserService.getUserById(registerResult.user.uid);

        expect(user).toBeDefined();
        expect(user?.uid).toBe(registerResult.user.uid);
        expect(user?.phone).toBe(testPhone);
      }
    });

    it('should return null for non-existent user', async () => {
      // Use a valid UUID format for non-existent ID test
      const nonExistentId = '00000000-0000-4000-8000-000000000000';
      const user = await UserService.getUserById(nonExistentId);

      expect(user).toBeNull();
    });

    it('should update user profile', async () => {
      // Create a test user
      const testPhone = generateTestPhone('98769');
      const registerResult = await AuthService.register(
        testPhone,
        'TestPassword123',
        'Test User',
        'customer'
      );
      
      expect(registerResult.success).toBe(true);
      expect(registerResult.user).toBeDefined();
      
      if (registerResult.user) {
        createdTestUsers.push(registerResult.user.uid);
        await new Promise(resolve => setTimeout(resolve, 1000));

        // Update user
        await UserService.updateUser(registerResult.user.uid, {
          name: 'Updated Test User',
        });

        // Fetch updated user to verify changes
        const updatedUser = await UserService.getUserById(registerResult.user.uid);
        expect(updatedUser).toBeDefined();
        expect(updatedUser?.name).toBe('Updated Test User');
      }
    });

    it('should delete user', async () => {
      // Create a test user
      const testPhone = generateTestPhone('98770');
      const registerResult = await AuthService.register(
        testPhone,
        'TestPassword123',
        'Test User',
        'customer'
      );
      
      expect(registerResult.success).toBe(true);
      expect(registerResult.user).toBeDefined();
      
      if (registerResult.user) {
        const userId = registerResult.user.uid;
        // Don't add to cleanup array since we're testing deletion
        await new Promise(resolve => setTimeout(resolve, 1000));

        // Delete user
        await UserService.deleteUser(userId);

        // Verify deletion
        const user = await UserService.getUserById(userId);
        expect(user).toBeNull();
      }
    });
  });
});

