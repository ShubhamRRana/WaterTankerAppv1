# Functions Used in user.integration.test.ts

This document explains all functions used in the `user.integration.test.ts` file, organized by category.

## Table of Contents
1. [Test Helper Functions](#test-helper-functions)
2. [UserService Methods](#userservice-methods)
3. [AuthService Methods](#authservice-methods)
4. [Supabase Client Methods](#supabase-client-methods)
5. [Rate Limiter Utility Methods](#rate-limiter-utility-methods)
6. [Jest Testing Functions](#jest-testing-functions)

---

## Test Helper Functions

### `generateTestPhone(prefix?: string): string`
**Location:** Defined in the test file (lines 29-33)

**Purpose:** Generates a unique phone number for testing purposes to avoid conflicts with existing users.

**Parameters:**
- `prefix` (optional): A string prefix for the phone number. Defaults to `'987'`.

**Returns:** A string containing a unique phone number.

**How it works:**
- Combines the prefix with the last 6 digits of the current timestamp
- Adds a random 3-digit number (padded with zeros)
- Format: `{prefix}{last6DigitsOfTimestamp}{random3Digits}`

**Example:**
```typescript
const phone = generateTestPhone('98765'); // Returns something like "98765123456789"
```

---

### `waitForSession(maxWaitMs?: number): Promise<boolean>`
**Location:** Defined in the test file (lines 36-46)

**Purpose:** Waits for a Supabase authentication session to be established after login or registration.

**Parameters:**
- `maxWaitMs` (optional): Maximum time to wait in milliseconds. Defaults to `3000` (3 seconds).

**Returns:** A Promise that resolves to `true` if a session is found, `false` if timeout occurs.

**How it works:**
- Polls the Supabase session every 200ms
- Returns `true` immediately when a session is detected
- Returns `false` if the maximum wait time is exceeded

**Why it's needed:** Supabase sessions may take a moment to establish after authentication, and some operations require an active session to work correctly.

---

## UserService Methods

The `UserService` class provides methods for managing user data in the Supabase database. All methods are static and can be called directly on the class.

### `UserService.getAllUsers(): Promise<User[]>`
**Location:** `src/services/user.service.ts` (lines 39-54)

**Purpose:** Retrieves all users from the database, ordered by creation date (newest first).

**Returns:** A Promise that resolves to an array of `User` objects.

**How it works:**
- Queries the `users` table in Supabase
- Orders results by `created_at` in descending order
- Transforms Supabase user data to app user format using `transformSupabaseUserToAppUser`
- Throws an error if the database query fails

**Use case in test:** Verifies that the service can retrieve all users, typically requiring admin authentication.

---

### `UserService.getUsersByRole(role: UserRole): Promise<User[]>`
**Location:** `src/services/user.service.ts` (lines 59-75)

**Purpose:** Retrieves all users with a specific role from the database.

**Parameters:**
- `role`: A `UserRole` value (`'customer'`, `'driver'`, or `'admin'`)

**Returns:** A Promise that resolves to an array of `User` objects matching the specified role.

**How it works:**
- Queries the `users` table filtered by the `role` column
- Orders results by `created_at` in descending order
- Transforms Supabase user data to app user format
- Throws an error if the database query fails

**Use case in test:** Verifies that users can be filtered by role correctly.

---

### `UserService.getUserById(authId: string): Promise<User | null>`
**Location:** `src/services/user.service.ts` (lines 80-111)

**Purpose:** Retrieves a single user by their authentication ID (auth_id).

**Parameters:**
- `authId`: The user's authentication ID (UUID format)

**Returns:** A Promise that resolves to a `User` object if found, or `null` if the user doesn't exist.

**How it works:**
- Validates the UUID format before querying
- Queries the `users` table for a user with matching `auth_id`
- Returns `null` if no user is found (handles `PGRST116` error code)
- Returns `null` for invalid UUID syntax
- Transforms Supabase user data to app user format
- Throws an error for other database errors

**Use case in test:** Verifies that individual users can be retrieved by ID, and that non-existent users return `null`.

---

### `UserService.updateUser(authId: string, updates: Partial<User>): Promise<void>`
**Location:** `src/services/user.service.ts` (lines 143-176)

**Purpose:** Updates a user's profile information in the database.

**Parameters:**
- `authId`: The user's authentication ID
- `updates`: A partial `User` object containing the fields to update

**Returns:** A Promise that resolves when the update is complete.

**How it works:**
- Fetches the current user data
- Merges the updates with existing user data
- Transforms the updated data to Supabase format
- Removes protected fields (`auth_id`, `role`) that cannot be updated
- Updates the user record in the database
- Throws an error if the user is not found or the update fails

**Use case in test:** Verifies that user profiles can be updated and changes persist correctly.

---

### `UserService.deleteUser(authId: string): Promise<void>`
**Location:** `src/services/user.service.ts` (lines 182-195)

**Purpose:** Deletes a user from the database by their authentication ID.

**Parameters:**
- `authId`: The user's authentication ID

**Returns:** A Promise that resolves when the deletion is complete.

**How it works:**
- Deletes the user record from the `users` table
- Related records are automatically deleted due to foreign key constraints (cascade delete)
- Throws an error if the deletion fails

**Note:** This is an admin-only operation. Deleting a user will also delete related bookings, addresses, and other associated data.

**Use case in test:** Verifies that users can be deleted and that deletion is permanent.

---

## AuthService Methods

The `AuthService` class handles user authentication, registration, and session management with Supabase Auth.

### `AuthService.register(phone, password, name, role, additionalData?): Promise<AuthResult>`
**Location:** `src/services/auth.service.ts` (lines 77-344)

**Purpose:** Registers a new user account with Supabase Auth and creates a user profile in the database.

**Parameters:**
- `phone`: User's phone number (will be sanitized)
- `password`: User's password (will be hashed by Supabase)
- `name`: User's full name (will be sanitized)
- `role`: User role (`'customer'`, `'driver'`, or `'admin'`)
- `additionalData` (optional): Additional user data (e.g., `createdByAdmin` flag for drivers)

**Returns:** A Promise that resolves to an `AuthResult` object containing:
- `success`: Boolean indicating if registration succeeded
- `user`: User object if successful
- `error`: Error message if failed

**How it works:**
1. Sanitizes phone and name inputs
2. Checks rate limiting for registration attempts
3. Prevents driver self-registration (only admin-created drivers allowed)
4. Checks if user already exists with the same phone and role
5. Creates authentication account in Supabase Auth
6. Creates user profile in the `users` table using a database function
7. Logs security events for monitoring
8. Returns success or error result

**Special handling:**
- Uses `phone_{phone}@watertanker.app` as email format (Supabase requires email)
- Handles duplicate key errors gracefully
- Waits for session establishment before creating profile

**Use case in test:** Creates test users for integration testing.

---

### `AuthService.login(phone, password): Promise<AuthResult>`
**Location:** `src/services/auth.service.ts` (lines 371-500)

**Purpose:** Authenticates a user with their phone number and password.

**Parameters:**
- `phone`: User's phone number (will be sanitized)
- `password`: User's password

**Returns:** A Promise that resolves to an `AuthResult` object containing:
- `success`: Boolean indicating if login succeeded
- `user`: User object if successful
- `error`: Error message if failed
- `requiresRoleSelection`: Boolean indicating if user has multiple roles
- `availableRoles`: Array of available roles if multiple exist

**How it works:**
1. Sanitizes phone input
2. Checks rate limiting for login attempts
3. Finds all user accounts with the matching phone number
4. Filters out invalid driver accounts (not created by admin)
5. If single account: authenticates with Supabase Auth
6. If multiple accounts: returns role selection requirement
7. Verifies authentication matches database user
8. Logs security events and records rate limit
9. Returns success or error result

**Use case in test:** Authenticates test users to perform operations that require authentication.

---

### `AuthService.logout(): Promise<void>`
**Location:** `src/services/auth.service.ts` (lines 586-609)

**Purpose:** Signs out the current user from Supabase Auth.

**Returns:** A Promise that resolves when logout is complete.

**How it works:**
1. Gets the current user before logout (for logging)
2. Signs out from Supabase Auth
3. Logs the logout event for security monitoring
4. Throws an error if logout fails

**Use case in test:** Cleans up authentication state between tests to ensure test isolation.

---

## Supabase Client Methods

### `supabase.auth.getSession(): Promise<{ data: { session: Session | null } }>`
**Location:** Supabase Auth client

**Purpose:** Retrieves the current authentication session from Supabase.

**Returns:** A Promise that resolves to an object containing:
- `data.session`: The current session object if authenticated, or `null` if not authenticated

**How it works:**
- Checks for an existing session in Supabase Auth
- Returns the session if available, or `null` if no session exists
- Session includes user information and access tokens

**Use case in test:** Used by `waitForSession()` helper to verify that a session has been established after login/registration.

---

## Rate Limiter Utility Methods

### `rateLimiter.resetAll(): void`
**Location:** `src/utils/rateLimiter.ts` (lines 164-166)

**Purpose:** Clears all rate limit entries, resetting all tracked actions.

**Returns:** `void`

**How it works:**
- Clears the internal Map that stores all rate limit entries
- Effectively resets all rate limit counters to zero

**Use case in test:** Called in `beforeEach` to prevent test failures due to rate limiting from previous tests. Ensures each test starts with a clean rate limit state.

---

## Jest Testing Functions

### `jest.unmock(moduleName: string)`
**Purpose:** Tells Jest to use the real implementation of a module instead of any mocks.

**Parameters:**
- `moduleName`: The path to the module to unmock

**Use case in test:** Unmocks the Supabase client so integration tests use the real Supabase instance instead of mocked responses.

---

### `jest.setTimeout(timeout: number)`
**Purpose:** Sets the default timeout for all tests in the file.

**Parameters:**
- `timeout`: Timeout in milliseconds

**Use case in test:** Sets timeout to 30 seconds (30000ms) because integration tests make real API calls which take longer than unit tests.

---

### `describe(name: string, fn: () => void)`
**Purpose:** Groups related test cases together.

**Parameters:**
- `name`: A string describing the test suite
- `fn`: A function containing the test cases

**Use case in test:** 
- Main describe block: `'UserService Integration Tests'`
- Conditional describe block: `'Real Supabase Integration'` (only runs if test credentials are available)

---

### `describe.skip(name: string, fn: () => void)`
**Purpose:** Skips a test suite (marks it as pending).

**Use case in test:** Used conditionally - if test credentials are not available, the inner describe block is skipped using `describe.skip`.

---

### `it(name: string, fn: () => Promise<void> | void)`
**Purpose:** Defines a single test case.

**Parameters:**
- `name`: A string describing what the test verifies
- `fn`: A function containing the test logic (can be async)

**Use case in test:** Defines individual test cases like:
- `'should get all users'`
- `'should get users by role'`
- `'should get user by ID'`
- etc.

---

### `beforeAll(fn: () => void | Promise<void>)`
**Purpose:** Runs a function once before all tests in the describe block.

**Use case in test:** Logs a warning if integration test credentials are not set, but doesn't prevent tests from running (they'll be skipped conditionally).

---

### `beforeEach(fn: () => void | Promise<void>)`
**Purpose:** Runs a function before each test case.

**Use case in test:** 
- Resets rate limiter to prevent test interference
- Clears the `createdTestUsers` tracking array
- Logs out any existing session to ensure test isolation

---

### `afterEach(fn: () => void | Promise<void>)`
**Purpose:** Runs a function after each test case.

**Use case in test:**
- Cleans up all test users created during the test
- Logs out to ensure clean state for the next test

---

### `expect(value: any)`
**Purpose:** Creates an assertion about a value.

**Returns:** An object with matcher methods like:
- `.toBe(expected)` - Strict equality
- `.toBeDefined()` - Checks value is not undefined
- `.toBeNull()` - Checks value is null
- `.toBeGreaterThan(number)` - Checks value is greater than number
- `.toBe(true/false)` - Checks boolean value
- `.toBeGreaterThanOrEqual(number)` - Checks value is >= number

**Use case in test:** Used throughout to verify:
- Registration/login success
- User data correctness
- Array properties
- Null values for non-existent users
- etc.

---

## Test Flow Summary

1. **Setup (`beforeEach`)**: Reset rate limiter, clear tracking, logout
2. **Test Execution**: 
   - Create test users via `AuthService.register()`
   - Wait for session establishment
   - Perform operations (get users, update, delete)
   - Verify results with `expect()`
3. **Cleanup (`afterEach`)**: Delete all created test users, logout

---

## Notes

- All integration tests require valid Supabase credentials (`EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_ANON_KEY`)
- Tests are skipped if credentials are not provided
- Test users are automatically cleaned up after each test
- Rate limiting is reset before each test to prevent interference
- Tests use unique phone numbers to avoid conflicts
- Session establishment is waited for to ensure operations work correctly

