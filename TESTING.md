# Testing Guide

This document provides comprehensive information about the testing infrastructure for the Water Tanker App.

## Overview

The project uses **Jest** as the testing framework with **React Native Testing Library** for component testing. The testing infrastructure supports:

- **Unit Tests**: Testing individual utility functions and services in isolation
- **Integration Tests**: Testing service interactions with Supabase
- **Component Tests**: Testing React Native components (future)

## Setup

### Dependencies

The following testing dependencies are installed:

- `jest`: Testing framework
- `jest-expo`: Expo-specific Jest configuration
- `@testing-library/react-native`: React Native component testing utilities
- `@types/jest`: TypeScript definitions for Jest
- `ts-jest`: TypeScript support for Jest

### Configuration

- **Jest Config**: `jest.config.js` - Main Jest configuration
- **Jest Setup**: `jest.setup.js` - Global test setup and mocks
- **Test Scripts**: Defined in `package.json`

## Running Tests

### Run All Tests
```bash
npm test
```

### Run Tests in Watch Mode
```bash
npm run test:watch
```

### Run Tests with Coverage
```bash
npm run test:coverage
```

### Run Tests for CI
```bash
npm run test:ci
```

### Run Specific Test File
```bash
npm test -- validation.test.ts
```

### Run Tests Matching Pattern
```bash
npm test -- --testPathPatterns=validation
```

## Test Structure

### Directory Structure

```
src/
├── __tests__/
│   └── utils/
│       ├── testHelpers.ts          # Test utility functions
│       └── __mocks__/
│           └── supabase.ts         # Supabase mocks
├── utils/
│   └── __tests__/
│       ├── validation.test.ts      # Validation utility tests
│       ├── sanitization.test.ts    # Sanitization utility tests
│       ├── pricing.test.ts         # Pricing utility tests
│       └── rateLimiter.test.ts    # Rate limiter tests
└── services/
    └── __tests__/
        └── (auth service tests removed - Supabase auth no longer used)
```

## Test Categories

### 1. Unit Tests

Unit tests focus on testing individual functions and utilities in isolation.

#### Validation Utilities (`src/utils/__tests__/validation.test.ts`)

Tests for input validation functions:
- Phone number validation
- Password validation
- Email validation
- Name validation
- Date/time validation
- Amount validation
- Address validation

**Example:**
```typescript
describe('validatePhone', () => {
  it('should validate a valid 10-digit Indian phone number', () => {
    const result = ValidationUtils.validatePhone('9876543210');
    expect(result.isValid).toBe(true);
  });
});
```

#### Sanitization Utilities (`src/utils/__tests__/sanitization.test.ts`)

Tests for input sanitization functions:
- String sanitization (XSS prevention)
- Phone number sanitization
- Email sanitization
- Address sanitization
- Number sanitization

**Example:**
```typescript
describe('sanitizeString', () => {
  it('should remove script tags', () => {
    const input = '<script>alert("xss")</script>Hello';
    const result = SanitizationUtils.sanitizeString(input);
    expect(result).toBe('Hello');
  });
});
```

#### Pricing Utilities (`src/utils/__tests__/pricing.test.ts`)

Tests for pricing calculation functions:
- Price calculation
- Price breakdown
- Price formatting (Indian numbering system)
- Delivery time calculation
- Pricing validation

#### Rate Limiter (`src/utils/__tests__/rateLimiter.test.ts`)

Tests for rate limiting functionality:
- Request tracking
- Rate limit enforcement
- Window expiration
- Custom configurations

### 2. Service Tests

Service tests verify business logic and Supabase interactions.

#### Auth Service Tests

Auth service tests have been removed as Supabase authentication is no longer used. New tests should be written when implementing a replacement authentication system.
- Rate limiting integration
- Input sanitization

**Example:**
```typescript
describe('register', () => {
  it('should successfully register a new customer', async () => {
    // Mock Supabase responses
    mockSupabase.auth.signUp.mockResolvedValue({...});
    
    const result = await AuthService.register(
      '9876543210',
      'password123',
      'Test User',
      'customer'
    );
    
    expect(result.success).toBe(true);
  });
});
```

## Mocking

### Supabase Mocks

Supabase client is mocked in `src/__tests__/utils/__mocks__/supabase.ts` to avoid actual database calls during testing.

**Usage:**
```typescript
import { supabase } from '../supabase';
jest.mock('../supabase');

const mockSupabase = supabase as jest.Mocked<typeof supabase>;
```

### Expo Module Mocks

Expo modules are mocked in `jest.setup.js`:
- `expo-location`: Location services
- `expo-notifications`: Push notifications
- `@react-native-async-storage/async-storage`: AsyncStorage

## Test Utilities

### Test Helpers (`src/__tests__/utils/testHelpers.ts`)

Utility functions for creating test data:

- `createMockUser(role, overrides)`: Creates a mock user object
- `createMockBooking(overrides)`: Creates a mock booking object
- `waitForAsync(ms)`: Waits for async operations
- `mockConsole()`: Mocks console methods

**Example:**
```typescript
import { createMockUser } from '../__tests__/utils/testHelpers';

const mockUser = createMockUser('customer', {
  name: 'Test User',
  phone: '9876543210'
});
```

## Writing New Tests

### Unit Test Template

```typescript
import { UtilityClass } from '../utility';

describe('UtilityClass', () => {
  beforeEach(() => {
    // Setup before each test
  });

  describe('methodName', () => {
    it('should do something when condition is met', () => {
      // Arrange
      const input = 'test';
      
      // Act
      const result = UtilityClass.methodName(input);
      
      // Assert
      expect(result).toBe('expected');
    });

    it('should handle error cases', () => {
      // Test error handling
    });
  });
});
```

### Service Test Template

```typescript
import { ServiceClass } from '../service';
import { supabase } from '../supabase';

jest.mock('../supabase');

const mockSupabase = supabase as jest.Mocked<typeof supabase>;

describe('ServiceClass', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('methodName', () => {
    it('should handle successful operation', async () => {
      // Mock Supabase response
      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockResolvedValue({
          data: mockData,
          error: null
        })
      } as any);

      const result = await ServiceClass.methodName();

      expect(result).toBeDefined();
      expect(mockSupabase.from).toHaveBeenCalled();
    });
  });
});
```

## Best Practices

### 1. Test Isolation
- Each test should be independent
- Use `beforeEach` to reset state
- Clear mocks between tests

### 2. Descriptive Test Names
- Use clear, descriptive test names
- Follow pattern: "should [expected behavior] when [condition]"

### 3. Arrange-Act-Assert Pattern
```typescript
it('should calculate price correctly', () => {
  // Arrange
  const tankerSize = { capacity: 1000, basePrice: 200 };
  const distance = 10;
  const pricing = { pricePerKm: 5, minimumCharge: 50 };
  
  // Act
  const result = PricingUtils.calculatePrice(tankerSize, distance, pricing);
  
  // Assert
  expect(result.totalPrice).toBe(250);
});
```

### 4. Test Edge Cases
- Test with empty inputs
- Test with invalid inputs
- Test boundary conditions
- Test error scenarios

### 5. Mock External Dependencies
- Always mock Supabase calls
- Mock Expo modules
- Mock external APIs

### 6. Coverage Goals
- Aim for >80% code coverage
- Focus on critical business logic
- Test error handling paths

## Integration Testing with Supabase

Integration tests verify that services work correctly with actual Supabase database connections. These tests require a test Supabase instance.

### Setup

1. **Create a test Supabase project** (separate from production)
2. **Set environment variables**:
   ```bash
   export SUPABASE_TEST_URL=https://your-test-project.supabase.co
   export SUPABASE_TEST_KEY=your-test-anon-key
   ```
3. **Run integration tests**:
   ```bash
   npm run test:integration
   ```

### Integration Test Structure

Integration tests are located in `src/services/__tests__/integration/`:

- Auth integration tests removed (Supabase auth no longer used)
- `booking.integration.test.ts` - Booking service integration tests
- `user.integration.test.ts` - User service integration tests
- `vehicle.integration.test.ts` - Vehicle service integration tests
- `payment.integration.test.ts` - Payment service integration tests
- `notification.integration.test.ts` - Notification service integration tests

### Example Integration Test

```typescript
import { AuthService } from '../../auth.service';

const shouldRunIntegrationTests = 
  process.env.SUPABASE_TEST_URL && process.env.SUPABASE_TEST_KEY;

(shouldRunIntegrationTests ? describe : describe.skip)('Real Supabase Integration', () => {
  it('should register a new user with Supabase', async () => {
    const result = await AuthService.register(
      '9876543210',
      'TestPassword123',
      'Test User',
      'customer'
    );

    expect(result.success).toBe(true);
    expect(result.user).toBeDefined();
  });
});
```

### Best Practices

- Tests automatically skip if test credentials are not provided
- Each test creates unique test data (using timestamps)
- Tests clean up after themselves when possible
- Use `describe.skip` pattern to conditionally run tests

## E2E Testing with Maestro

End-to-end (E2E) tests verify complete user flows on real devices/emulators using [Maestro](https://maestro.mobile.dev/).

### Setup

1. **Install Maestro CLI**:
   ```bash
   curl -Ls "https://get.maestro.mobile.dev" | bash
   ```

   Or on macOS:
   ```bash
   brew tap mobile-dev-inc/tap
   brew install maestro
   ```

2. **Start your Expo app**:
   ```bash
   npm start
   ```

3. **Run E2E tests**:
   ```bash
   npm run test:e2e              # Run all E2E tests
   npm run test:e2e:auth          # Run auth flow tests
   npm run test:e2e:booking       # Run booking flow tests
   npm run test:e2e:driver        # Run driver flow tests
   npm run test:e2e:admin         # Run admin flow tests
   ```

### E2E Test Structure

E2E tests are located in `e2e/`:

- `auth-flow.yaml` - Authentication flow (login, registration, logout)
- `booking-flow.yaml` - Booking creation and tracking
- `driver-flow.yaml` - Driver acceptance and delivery
- `admin-flow.yaml` - Admin management features

### Example E2E Test

```yaml
appId: com.watertanker.app
---
- launchApp
- assertVisible: "Login"
- tapOn: "Login"
- inputText: "9876543210"
- tapOn: "Password"
- inputText: "password123"
- tapOn: "Sign In"
- assertVisible: "Home"
```

### Test Data

E2E tests use dedicated test accounts in the test Supabase instance:
- Test Customer: `9876500001` / `TestPassword123`
- Test Driver: `9876500002` / `TestPassword123`
- Test Admin: `9876500003` / `TestPassword123`

### Running on Specific Devices

```bash
# List available devices
maestro devices

# Run on specific device
maestro test e2e/ --device "emulator-5554"  # Android
maestro test e2e/ --device "iPhone 14"       # iOS
```

### CI/CD Integration

E2E tests can be integrated into CI/CD pipelines using Maestro Cloud:

```yaml
# Example GitHub Actions workflow
- name: Run E2E Tests
  run: |
    maestro cloud --apiKey ${{ secrets.MAESTRO_API_KEY }} e2e/
```

For more details, see `e2e/README.md`.

## Continuous Integration

Tests run automatically in CI/CD pipelines:
- All tests must pass before merging
- Coverage reports are generated
- Test results are reported

## Troubleshooting

### Common Issues

1. **Module not found errors**
   - Check `transformIgnorePatterns` in `jest.config.js`
   - Ensure all dependencies are installed

2. **Expo module errors**
   - Verify mocks in `jest.setup.js`
   - Check Expo version compatibility

3. **Supabase mock issues**
   - Ensure mocks match actual Supabase API
   - Check mock return values

4. **TypeScript errors**
   - Verify `tsconfig.json` settings
   - Check type definitions

## Resources

- [Jest Documentation](https://jestjs.io/docs/getting-started)
- [React Native Testing Library](https://callstack.github.io/react-native-testing-library/)
- [Jest Expo](https://github.com/expo/expo/tree/main/packages/jest-expo)

## Test Coverage

Current test coverage includes:

### Unit Tests ✅
- ✅ Utility functions (validation, sanitization, pricing, rate limiting)
- ✅ Auth service (registration, login, logout, multi-role handling)

### Integration Tests ✅
- ✅ Auth service integration tests
- ✅ Booking service integration tests
- ✅ User service integration tests
- ✅ Vehicle service integration tests
- ✅ Payment service integration tests
- ✅ Notification service integration tests

### E2E Tests ✅
- ✅ Authentication flow (login, registration, logout)
- ✅ Booking creation and tracking flow
- ✅ Driver acceptance and delivery flow
- ✅ Admin management features

### Future Enhancements
- 🚧 Component tests (React Native Testing Library)
- 🚧 Location service unit tests
- 🚧 Store tests (Zustand stores)

## Contributing

When adding new features:
1. Write tests first (TDD approach)
2. Ensure all tests pass
3. Maintain or improve coverage
4. Update this documentation if needed

---

*Last Updated: 2024-12-19*
*Testing Infrastructure: Phase 3, Item 3 - Complete ✅*

