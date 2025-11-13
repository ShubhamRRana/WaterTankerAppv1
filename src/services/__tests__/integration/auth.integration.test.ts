/**
 * Integration tests for Auth Service with Supabase
 * 
 * NOTE: These tests require a test Supabase instance.
 * Set EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY environment variables.
 * 
 * To run integration tests:
 * npm test -- --testPathPatterns=integration
 */

// Unmock Supabase to use real client for integration tests
jest.unmock('../../supabase');

import { AuthService } from '../../auth.service';
import { supabase } from '../../supabase';

// Skip integration tests if test credentials are not provided
const shouldRunIntegrationTests = process.env.EXPO_PUBLIC_SUPABASE_URL && process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

// Increase timeout for integration tests (real API calls take longer)
jest.setTimeout(30000); // 30 seconds

describe('AuthService Integration Tests', () => {
  beforeAll(() => {
    if (!shouldRunIntegrationTests) {
      console.warn('Skipping integration tests - EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY not set');
    }
  });

  beforeEach(async () => {
    if (!shouldRunIntegrationTests) return;
    
    // Clean up test data before each test
    // Note: In a real scenario, you'd want to use a test database
    // or clean up specific test users
  });

  afterEach(async () => {
    if (!shouldRunIntegrationTests) return;
    
    // Clean up test data after each test
  });

  (shouldRunIntegrationTests ? describe : describe.skip)('Real Supabase Integration', () => {
    it('should register a new user with Supabase', async () => {
      const testPhone = `98765${Date.now().toString().slice(-5)}`; // Unique phone
      const testName = 'Integration Test User';
      
      const result = await AuthService.register(
        testPhone,
        'TestPassword123',
        testName,
        'customer'
      );

      expect(result.success).toBe(true);
      expect(result.user).toBeDefined();
      expect(result.user?.phone).toBe(testPhone);
      expect(result.user?.name).toBe(testName);
      expect(result.user?.role).toBe('customer');
      
      // Login after registration to establish session
      if (result.success) {
        await AuthService.login(testPhone, 'TestPassword123');
      }
    });

    it('should login with registered user', async () => {
      // First register a user
      const testPhone = `98765${Date.now().toString().slice(-5)}`;
      const password = 'TestPassword123';
      
      const registerResult = await AuthService.register(
        testPhone,
        password,
        'Test User',
        'customer'
      );

      expect(registerResult.success).toBe(true);

      // Wait a bit for Supabase to process
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Then try to login
      const loginResult = await AuthService.login(testPhone, password);

      expect(loginResult.success).toBe(true);
      expect(loginResult.user).toBeDefined();
      expect(loginResult.user?.phone).toBe(testPhone);
    });

    it('should reject login with wrong password', async () => {
      const testPhone = `98765${Date.now().toString().slice(-5)}`;
      const password = 'TestPassword123';
      
      // Register user
      await AuthService.register(testPhone, password, 'Test User', 'customer');
      
      // Wait for Supabase
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Try login with wrong password
      const loginResult = await AuthService.login(testPhone, 'WrongPassword');

      expect(loginResult.success).toBe(false);
      expect(loginResult.error).toBeDefined();
    });

    it('should prevent duplicate registration', async () => {
      const testPhone = `98765${Date.now().toString().slice(-5)}`;
      
      // Register first time
      const result1 = await AuthService.register(
        testPhone,
        'Password123',
        'Test User',
        'customer'
      );

      expect(result1.success).toBe(true);
      
      // Login after first registration
      if (result1.success) {
        await AuthService.login(testPhone, 'Password123');
      }

      // Wait for Supabase
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Try to register again with same phone and role
      const result2 = await AuthService.register(
        testPhone,
        'Password123',
        'Test User 2',
        'customer'
      );

      expect(result2.success).toBe(false);
      expect(result2.error).toContain('already exists');
    });

    it('should logout successfully', async () => {
      const testPhone = `98765${Date.now().toString().slice(-5)}`;
      const password = 'TestPassword123';
      
      // Register and login
      await AuthService.register(testPhone, password, 'Test User', 'customer');
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const loginResult = await AuthService.login(testPhone, password);
      expect(loginResult.success).toBe(true);

      // Logout (returns void, throws on error)
      await AuthService.logout();

      // Verify session is cleared
      const userData = await AuthService.getCurrentUserData();
      expect(userData).toBeNull();
    });
  });
});

