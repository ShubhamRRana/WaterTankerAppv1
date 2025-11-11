/**
 * Test helper utilities for common testing patterns
 */

import { User, UserRole } from '../../types';

// Jest globals are now properly typed via @types/jest
// No manual declarations needed

/**
 * Creates a mock user for testing
 */
export function createMockUser(
  role: UserRole = 'customer',
  overrides?: Partial<User>
): User {
  const baseUser = {
    uid: `test-${role}-${Date.now()}`,
    phone: '9876543210',
    password: 'hashed-password-123',
    name: `Test ${role}`,
    role,
    createdAt: new Date()
  };

  if (role === 'customer') {
    return {
      ...baseUser,
      role: 'customer',
      ...overrides
    } as User;
  }

  if (role === 'driver') {
    return {
      ...baseUser,
      role: 'driver',
      licenseNumber: 'DL1234567890',
      vehicleNumber: 'DL-01-AB-1234',
      createdByAdmin: true,
      ...overrides
    } as User;
  }

  if (role === 'admin') {
    return {
      ...baseUser,
      role: 'admin',
      ...overrides
    } as User;
  }

  return baseUser as User;
}

/**
 * Creates a mock booking for testing
 */
export function createMockBooking(overrides?: any) {
  return {
    id: `booking-${Date.now()}`,
    customerId: 'customer-1',
    driverId: null,
    agencyId: 'agency-1',
    tankerSize: 1000,
    sourceAddress: {
      id: 'addr-1',
      text: '123 Test Street',
      latitude: 28.6139,
      longitude: 77.2090
    },
    destinationAddress: {
      id: 'addr-2',
      text: '456 Test Avenue',
      latitude: 28.7041,
      longitude: 77.1025
    },
    distance: 10.5,
    price: 500,
    status: 'pending',
    paymentStatus: 'pending',
    scheduledDate: new Date().toISOString(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...overrides
  };
}

/**
 * Waits for async operations to complete
 */
export function waitForAsync(ms: number = 0): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Mocks console methods to suppress output in tests
 */
export function mockConsole() {
  const originalConsole = { ...console };
  
  beforeEach(() => {
    console.log = jest.fn();
    console.warn = jest.fn();
    console.error = jest.fn();
  });

  afterEach(() => {
    console.log = originalConsole.log;
    console.warn = originalConsole.warn;
    console.error = originalConsole.error;
  });
}

