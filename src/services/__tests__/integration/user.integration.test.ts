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

// Skip integration tests if test credentials are not provided
const shouldRunIntegrationTests = process.env.EXPO_PUBLIC_SUPABASE_URL && process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

// Increase timeout for integration tests (real API calls take longer)
jest.setTimeout(30000); // 30 seconds

describe('UserService Integration Tests', () => {
  beforeAll(() => {
    if (!shouldRunIntegrationTests) {
      console.warn('Skipping integration tests - EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY not set');
    }
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
    it('should get all users', async () => {
      // Create a test user first
      const timestamp = Date.now().toString().slice(-5);
      const registerResult = await AuthService.register(
        `98765${timestamp}`,
        'TestPassword123',
        'Test User',
        'customer'
      );
      
      // Login as admin to access all users (getAllUsers requires admin role)
      // For testing, we'll create an admin user
      const adminTimestamp = Date.now().toString().slice(-5);
      const adminResult = await AuthService.register(
        `98799${adminTimestamp}`,
        'TestPassword123',
        'Test Admin',
        'admin'
      );
      
      if (adminResult.success) {
        await AuthService.login(`98799${adminTimestamp}`, 'TestPassword123');
      }
      
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Get all users
      const users = await UserService.getAllUsers();

      expect(Array.isArray(users)).toBe(true);
      expect(users.length).toBeGreaterThan(0);
    });

    it('should get users by role', async () => {
      // Create test users with different roles
      const timestamp = Date.now().toString().slice(-5);
      
      await AuthService.register(
        `98766${timestamp}`,
        'TestPassword123',
        'Test Customer',
        'customer'
      );
      
      await AuthService.register(
        `98767${timestamp}`,
        'TestPassword123',
        'Test Driver',
        'driver'
      );
      
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
      const timestamp = Date.now().toString().slice(-5);
      const registerResult = await AuthService.register(
        `98768${timestamp}`,
        'TestPassword123',
        'Test User',
        'customer'
      );
      
      await new Promise(resolve => setTimeout(resolve, 1000));

      if (registerResult.success && registerResult.user) {
        // Get user by ID
        const user = await UserService.getUserById(registerResult.user.uid);

        expect(user).toBeDefined();
        expect(user?.uid).toBe(registerResult.user.uid);
        expect(user?.phone).toBe(`98768${timestamp}`);
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
      const timestamp = Date.now().toString().slice(-5);
      const registerResult = await AuthService.register(
        `98769${timestamp}`,
        'TestPassword123',
        'Test User',
        'customer'
      );
      
      await new Promise(resolve => setTimeout(resolve, 1000));

      if (registerResult.success && registerResult.user) {
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
      const timestamp = Date.now().toString().slice(-5);
      const registerResult = await AuthService.register(
        `98770${timestamp}`,
        'TestPassword123',
        'Test User',
        'customer'
      );
      
      await new Promise(resolve => setTimeout(resolve, 1000));

      if (registerResult.success && registerResult.user) {
        // Delete user
        await UserService.deleteUser(registerResult.user.uid);

        // Verify deletion
        const user = await UserService.getUserById(registerResult.user.uid);
        expect(user).toBeNull();
      }
    });
  });
});

