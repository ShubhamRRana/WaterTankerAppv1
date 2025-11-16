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
import { UserService } from '../../user.service';
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

describe('AuthService Integration Tests', () => {
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
    it('should register a new user with Supabase', async () => {
      const testPhone = generateTestPhone('98765');
      const testName = 'Integration Test User';
      
      const result = await AuthService.register(
        testPhone,
        'TestPassword123',
        testName,
        'customer'
      );

      expect(result.success).toBe(true);
      expect(result.user).toBeDefined();
      if (result.user) {
        createdTestUsers.push(result.user.uid);
        expect(result.user.phone).toBe(testPhone);
        expect(result.user.name).toBe(testName);
        expect(result.user.role).toBe('customer');
        
        // Wait for registration to process
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Login after registration to establish session
        const loginResult = await AuthService.login(testPhone, 'TestPassword123');
        expect(loginResult.success).toBe(true);
      }
    });

    it('should login with registered user', async () => {
      // First register a user
      const testPhone = generateTestPhone('98766');
      const password = 'TestPassword123';
      
      const registerResult = await AuthService.register(
        testPhone,
        password,
        'Test User',
        'customer'
      );

      expect(registerResult.success).toBe(true);
      if (registerResult.user) {
        createdTestUsers.push(registerResult.user.uid);
      }

      // Wait a bit for Supabase to process
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Then try to login
      const loginResult = await AuthService.login(testPhone, password);

      expect(loginResult.success).toBe(true);
      expect(loginResult.user).toBeDefined();
      expect(loginResult.user?.phone).toBe(testPhone);
      
      // Verify session is established
      const sessionEstablished = await waitForSession();
      expect(sessionEstablished).toBe(true);
    });

    it('should reject login with wrong password', async () => {
      const testPhone = generateTestPhone('98767');
      const password = 'TestPassword123';
      
      // Register user
      const registerResult = await AuthService.register(testPhone, password, 'Test User', 'customer');
      expect(registerResult.success).toBe(true);
      if (registerResult.user) {
        createdTestUsers.push(registerResult.user.uid);
      }
      
      // Wait for Supabase
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Try login with wrong password
      const loginResult = await AuthService.login(testPhone, 'WrongPassword');

      expect(loginResult.success).toBe(false);
      expect(loginResult.error).toBeDefined();
    });

    it('should prevent duplicate registration', async () => {
      const testPhone = generateTestPhone('98768');
      
      // Register first time
      const result1 = await AuthService.register(
        testPhone,
        'Password123',
        'Test User',
        'customer'
      );

      expect(result1.success).toBe(true);
      if (result1.user) {
        createdTestUsers.push(result1.user.uid);
      }
      
      // Wait for registration to process
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Login after first registration
      if (result1.success) {
        const loginResult = await AuthService.login(testPhone, 'Password123');
        expect(loginResult.success).toBe(true);
      }

      // Wait for Supabase
      await new Promise(resolve => setTimeout(resolve, 1000));

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
      const testPhone = generateTestPhone('98769');
      const password = 'TestPassword123';
      
      // Register and login
      const registerResult = await AuthService.register(testPhone, password, 'Test User', 'customer');
      expect(registerResult.success).toBe(true);
      if (registerResult.user) {
        createdTestUsers.push(registerResult.user.uid);
      }
      
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      const loginResult = await AuthService.login(testPhone, password);
      expect(loginResult.success).toBe(true);
      
      // Verify session is established before logout
      const sessionBeforeLogout = await waitForSession();
      expect(sessionBeforeLogout).toBe(true);

      // Logout (returns void, throws on error)
      await AuthService.logout();

      // Wait a bit for logout to complete
      await new Promise(resolve => setTimeout(resolve, 500));

      // Verify session is cleared
      const userData = await AuthService.getCurrentUserData();
      expect(userData).toBeNull();
    });
  });
});

