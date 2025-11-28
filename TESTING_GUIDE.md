# Testing Guide

## Overview

This project uses Jest for unit testing with React Native/Expo support. The testing infrastructure is set up to test services, utilities, and components.

## Setup

The testing infrastructure has been configured with:

- **Jest** - Testing framework
- **jest-expo** - Expo-specific Jest preset
- **@testing-library/react-native** - React Native testing utilities
- **@testing-library/jest-native** - Additional Jest matchers

## Running Tests

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage report
npm run test:coverage
```

## Test Structure

Tests are located in `src/__tests__/` directory, mirroring the source code structure:

```
src/
  __tests__/
    utils/
      errors.test.ts
    lib/
      localStorageDataAccess.test.ts
    services/
      (service tests)
```

## Writing Tests

### Example: Testing Error Utilities

```typescript
import { AppError, isAppError } from '../../utils/errors';

describe('AppError', () => {
  it('should create an error with all properties', () => {
    const error = new AppError('Test', 'TEST_CODE', 400);
    expect(error.message).toBe('Test');
    expect(error.code).toBe('TEST_CODE');
  });
});
```

### Example: Testing Data Access Layer

```typescript
import { LocalStorageDataAccess } from '../../lib/localStorageDataAccess';
import AsyncStorage from '@react-native-async-storage/async-storage';

beforeEach(async () => {
  await AsyncStorage.clear();
});

describe('LocalStorageDataAccess', () => {
  let dataAccess: LocalStorageDataAccess;

  beforeEach(() => {
    dataAccess = new LocalStorageDataAccess();
  });

  it('should save and retrieve data', async () => {
    // Test implementation
  });
});
```

## Mocking

### AsyncStorage

AsyncStorage is automatically mocked in `jest.setup.js`. The mock provides a simple in-memory storage implementation.

### Custom Mocks

Create mock files in `src/__mocks__/` directory:

```typescript
// src/__mocks__/myService.ts
export const MyService = {
  getData: jest.fn(),
};
```

## Test Coverage

The project is configured to collect coverage from:
- All TypeScript files in `src/`
- Excludes type definition files (`.d.ts`)
- Excludes test files and mocks

View coverage report:
```bash
npm run test:coverage
```

Coverage reports are generated in the `coverage/` directory.

## Best Practices

1. **Test Isolation**: Each test should be independent and not rely on other tests
2. **Clear Test Names**: Use descriptive test names that explain what is being tested
3. **Arrange-Act-Assert**: Structure tests with clear sections
4. **Mock External Dependencies**: Mock AsyncStorage, network calls, etc.
5. **Test Error Cases**: Don't just test happy paths, test error scenarios too

## Example Test Patterns

### Testing Async Operations

```typescript
it('should handle async operations', async () => {
  const result = await someAsyncFunction();
  expect(result).toBeDefined();
});
```

### Testing Error Handling

```typescript
it('should throw error on failure', async () => {
  await expect(failingFunction()).rejects.toThrow(Error);
});
```

### Testing with Mocks

```typescript
it('should call service method', () => {
  const mockFn = jest.fn();
  myFunction(mockFn);
  expect(mockFn).toHaveBeenCalled();
});
```

## Continuous Integration

Tests should be run in CI/CD pipelines. Add to your CI configuration:

```yaml
# Example GitHub Actions
- name: Run tests
  run: npm test
```

## Troubleshooting

### Tests not finding modules

- Check `jest.config.js` module name mapper
- Ensure `node_modules` is in `transformIgnorePatterns`

### AsyncStorage not working in tests

- AsyncStorage is automatically mocked
- Clear storage in `beforeEach` if needed: `await AsyncStorage.clear()`

### TypeScript errors in tests

- Ensure `@types/jest` is installed
- Check `tsconfig.json` includes test files

## Next Steps

1. Add more test coverage for services
2. Add integration tests for critical flows
3. Set up test coverage thresholds
4. Add E2E tests with Detox (optional)

