import { LocalStorageService } from './localStorage';
import { User as AppUser, UserRole, DriverUser } from '../types/index';
import { ERROR_MESSAGES } from '../constants/config';
import { securityLogger, SecurityEventType, SecuritySeverity } from '../utils/securityLogger';
import { rateLimiter } from '../utils/rateLimiter';
import { SanitizationUtils } from '../utils/sanitization';

/**
 * Result of authentication operations
 */
export interface AuthResult {
  /** Whether the operation was successful */
  success: boolean;
  /** Authenticated user data (if successful) */
  user?: AppUser;
  /** Error message (if failed) */
  error?: string;
  /** Available roles for user (if multiple roles exist) */
  availableRoles?: UserRole[];
  /** Whether user needs to select a role */
  requiresRoleSelection?: boolean;
}

/**
 * Authentication Service
 * 
 * Handles user authentication, registration, and session management.
 * Includes security features like rate limiting, input sanitization, and brute force protection.
 * Uses LocalStorageService for data persistence.
 * 
 * @example
 * ```typescript
 * // Register a new user
 * const result = await AuthService.register('9876543210', 'password123', 'John Doe', 'customer');
 * if (result.success) {
 *   console.log('User registered:', result.user);
 * }
 * 
 * // Login
 * const loginResult = await AuthService.login('9876543210', 'password123');
 * if (loginResult.success && loginResult.user) {
 *   // User logged in successfully
 * }
 * ```
 */
export class AuthService {
  /**
   * Register a new user and save to local storage.
   * 
   * Includes input sanitization, rate limiting, and security event logging.
   * Prevents driver self-registration (only admin-created drivers allowed).
   * 
   * @param phone - User's phone number (will be sanitized automatically)
   * @param password - User's password
   * @param name - User's name (will be sanitized automatically)
   * @param role - User role ('customer' | 'driver' | 'admin')
   * @param additionalData - Optional additional user data
   * @returns Promise resolving to AuthResult with success status and user data
   * @throws Never throws - returns error in AuthResult.error instead
   * 
   * @example
   * ```typescript
   * const result = await AuthService.register(
   *   '9876543210',
   *   'password123',
   *   'John Doe',
   *   'customer'
   * );
   * 
   * if (result.success) {
   *   console.log('User registered:', result.user);
   * } else {
   *   console.error('Registration failed:', result.error);
   * }
   * ```
   */
  static async register(
    phone: string,
    password: string,
    name: string,
    role: UserRole,
    additionalData?: Partial<AppUser>
  ): Promise<AuthResult> {
    try {
      // Sanitize inputs
      const sanitizedPhone = SanitizationUtils.sanitizePhone(phone);
      const sanitizedName = SanitizationUtils.sanitizeName(name);

      // Check rate limit for registration
      const rateLimitCheck = rateLimiter.isAllowed('register', sanitizedPhone);
      if (!rateLimitCheck.allowed) {
        securityLogger.logRateLimitExceeded('register');
        return {
          success: false,
          error: `Too many registration attempts. Please try again after ${new Date(rateLimitCheck.resetTime).toLocaleTimeString()}`
        };
      }

      // Prevent driver self-registration - only admin-created drivers are allowed
      if (role === 'driver' && !(additionalData as Partial<DriverUser>)?.createdByAdmin) {
        securityLogger.logRegistrationAttempt(sanitizedPhone, role, false, ERROR_MESSAGES.auth.adminCreatedDriverOnly);
        return {
          success: false,
          error: ERROR_MESSAGES.auth.adminCreatedDriverOnly
        };
      }

      // Check if user already exists with same phone AND role
      const existingUsers = await LocalStorageService.getUsers();
      const existingUser = existingUsers.find(
        u => u.phone === sanitizedPhone && u.role === role
      );

      if (existingUser) {
        securityLogger.logRegistrationAttempt(sanitizedPhone, role, false, 'User already exists');
        return {
          success: false,
          error: `User already exists with this phone number as ${role}`
        };
      }

      // Record rate limit
      rateLimiter.record('register', sanitizedPhone);

      // Generate a unique uid for the user
      const uid = LocalStorageService.generateId();

      // Create user object
      const newUser: AppUser = {
        uid,
        phone: sanitizedPhone,
        password, // Store password in local storage (in production, this should be hashed)
        name: sanitizedName,
        role,
        createdAt: new Date(),
        ...(role === 'customer' && { savedAddresses: [] }),
        ...(role === 'driver' && {
          vehicleNumber: (additionalData as Partial<DriverUser>)?.vehicleNumber,
          licenseNumber: (additionalData as Partial<DriverUser>)?.licenseNumber,
          licenseExpiry: (additionalData as Partial<DriverUser>)?.licenseExpiry,
          driverLicenseImage: (additionalData as Partial<DriverUser>)?.driverLicenseImage,
          vehicleRegistrationImage: (additionalData as Partial<DriverUser>)?.vehicleRegistrationImage,
          isApproved: (additionalData as Partial<DriverUser>)?.isApproved ?? false,
          isAvailable: (additionalData as Partial<DriverUser>)?.isAvailable ?? true,
          totalEarnings: (additionalData as Partial<DriverUser>)?.totalEarnings ?? 0,
          completedOrders: (additionalData as Partial<DriverUser>)?.completedOrders ?? 0,
          createdByAdmin: (additionalData as Partial<DriverUser>)?.createdByAdmin ?? false,
          emergencyContactName: (additionalData as Partial<DriverUser>)?.emergencyContactName,
          emergencyContactPhone: (additionalData as Partial<DriverUser>)?.emergencyContactPhone,
        }),
        ...(role === 'admin' && {
          businessName: additionalData?.businessName,
        }),
        ...(additionalData?.email && { email: additionalData.email }),
        ...(additionalData?.profileImage && { profileImage: additionalData.profileImage }),
      };

      // Save user to collection
      await LocalStorageService.saveUserToCollection(newUser);

      // Log successful registration
      securityLogger.logRegistrationAttempt(sanitizedPhone, role, true, undefined, newUser.uid);

      return {
        success: true,
        user: newUser
      };
    } catch (error) {
      securityLogger.logRegistrationAttempt(
        SanitizationUtils.sanitizePhone(phone),
        role,
        false,
        error instanceof Error ? error.message : 'Registration failed'
      );
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Registration failed'
      };
    }
  }

  /**
   * Login with phone and password.
   * 
   * Supports multi-role users - if user has multiple roles, returns requiresRoleSelection flag.
   * Includes rate limiting, brute force detection, and security event logging.
   * 
   * @param phone - User's phone number (will be sanitized automatically)
   * @param password - User's password
   * @returns Promise resolving to AuthResult with success status and user data
   * @throws Never throws - returns error in AuthResult.error instead
   * 
   * @example
   * ```typescript
   * const result = await AuthService.login('9876543210', 'password123');
   * 
   * if (result.success && result.user) {
   *   // User logged in successfully
   * } else if (result.requiresRoleSelection) {
   *   // User has multiple roles, need to select
   *   const roles = result.availableRoles || [];
   * } else {
   *   console.error('Login failed:', result.error);
   * }
   * ```
   */
  static async login(phone: string, password: string): Promise<AuthResult> {
    try {
      // Sanitize phone input
      const sanitizedPhone = SanitizationUtils.sanitizePhone(phone);

      // Check rate limit for login
      const rateLimitCheck = rateLimiter.isAllowed('login', sanitizedPhone);
      if (!rateLimitCheck.allowed) {
        securityLogger.logRateLimitExceeded('login');
        securityLogger.logBruteForceAttempt(sanitizedPhone, 5); // Assume 5+ attempts
        return {
          success: false,
          error: `Too many login attempts. Please try again after ${new Date(rateLimitCheck.resetTime).toLocaleTimeString()}`
        };
      }

      // Log login attempt
      securityLogger.logAuthAttempt(sanitizedPhone, false);

      // Find all users with this phone number
      const allUsers = await LocalStorageService.getUsers();
      const userAccounts = allUsers.filter(u => u.phone === sanitizedPhone);

      if (!userAccounts || userAccounts.length === 0) {
        securityLogger.logAuthAttempt(sanitizedPhone, false, 'User not found');
        rateLimiter.record('login', sanitizedPhone);
        return {
          success: false,
          error: 'User not found'
        };
      }

      // Filter out drivers not created by admin
      const validAccounts = userAccounts.filter(account => {
        if (account.role === 'driver' && !account.createdByAdmin) {
          return false;
        }
        return true;
      });

      if (validAccounts.length === 0) {
        securityLogger.logAuthAttempt(sanitizedPhone, false, ERROR_MESSAGES.auth.adminCreatedDriverOnly);
        rateLimiter.record('login', sanitizedPhone);
        return {
          success: false,
          error: ERROR_MESSAGES.auth.adminCreatedDriverOnly
        };
      }

      // Verify password (simple comparison - in production, use hashed passwords)
      const matchingAccounts = validAccounts.filter(account => account.password === password);

      if (matchingAccounts.length === 0) {
        securityLogger.logAuthAttempt(sanitizedPhone, false, 'Invalid password');
        rateLimiter.record('login', sanitizedPhone);
        return {
          success: false,
          error: 'Invalid password'
        };
      }

      if (matchingAccounts.length === 1) {
        // Single account - return user data
        const appUser = matchingAccounts[0] as AppUser;

        // Record successful login
        rateLimiter.record('login', sanitizedPhone);
        securityLogger.logAuthAttempt(sanitizedPhone, true, undefined, appUser.uid);

        return {
          success: true,
          user: appUser
        };
      } else {
        // Multiple valid accounts - require role selection
        // Don't record rate limit yet - wait for role selection
        const availableRoles = matchingAccounts.map(account => account.role) as UserRole[];
        return {
          success: true,
          requiresRoleSelection: true,
          availableRoles,
          user: undefined
        };
      }
    } catch (error) {
      securityLogger.logAuthAttempt(
        SanitizationUtils.sanitizePhone(phone),
        false,
        error instanceof Error ? error.message : 'Login failed'
      );
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Login failed'
      };
    }
  }

  /**
   * Login with phone and selected role (used after role selection).
   * 
   * This method should be called after login() when user has multiple roles.
   * It selects the specific role for the user.
   * 
   * @param phone - User's phone number
   * @param role - Selected user role
   * @returns Promise resolving to AuthResult with success status and user data
   * @throws Never throws - returns error in AuthResult.error instead
   * 
   * @example
   * ```typescript
   * // First login
   * const loginResult = await AuthService.login('9876543210', 'password123');
   * 
   * if (loginResult.requiresRoleSelection) {
   *   // User selected 'customer' role
   *   const roleResult = await AuthService.loginWithRole('9876543210', 'customer');
   *   if (roleResult.success && roleResult.user) {
   *     // User logged in as customer
   *   }
   * }
   * ```
   */
  static async loginWithRole(phone: string, role: UserRole): Promise<AuthResult> {
    try {
      const allUsers = await LocalStorageService.getUsers();
      const dbUser = allUsers.find(
        u => u.phone === phone && u.role === role
      );

      if (!dbUser) {
        return {
          success: false,
          error: 'User not found with selected role'
        };
      }

      // Check if it's a driver that wasn't created by admin
      if (dbUser.role === 'driver' && !dbUser.createdByAdmin) {
        return {
          success: false,
          error: ERROR_MESSAGES.auth.adminCreatedDriverOnly
        };
      }

      const appUser = dbUser as AppUser;
      return {
        success: true,
        user: appUser
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Login failed'
      };
    }
  }

  /**
   * Logout the current user.
   * 
   * Signs out the current user and logs the logout event for security monitoring.
   * 
   * @returns Promise that resolves when logout is complete
   * @throws Error if logout fails
   * 
   * @example
   * ```typescript
   * await AuthService.logout();
   * ```
   */
  static async logout(): Promise<void> {
    try {
      const currentUser = await LocalStorageService.getCurrentUser();
      const userId = currentUser?.uid || 'unknown';
      
      // Remove current user from storage
      await LocalStorageService.removeUser();
      
      // Log logout event
      securityLogger.log(
        SecurityEventType.LOGOUT,
        SecuritySeverity.INFO,
        {},
        userId
      );
    } catch (error) {
      throw error;
    }
  }

  /**
   * Get current authenticated user data.
   * 
   * Fetches the user profile from local storage based on the current session.
   * 
   * @param uid - Optional user ID to fetch user by. If not provided, gets from current session.
   * @returns Promise resolving to User object if authenticated, null otherwise
   * @throws Never throws - returns null on error
   * 
   * @example
   * ```typescript
   * const user = await AuthService.getCurrentUserData();
   * if (user) {
   *   console.log('Current user:', user);
   * } else {
   *   console.log('No user logged in');
   * }
   * ```
   */
  static async getCurrentUserData(uid?: string): Promise<AppUser | null> {
    try {
      if (uid) {
        // Fetch by uid
        const user = await LocalStorageService.getUserById(uid);
        return user as AppUser | null;
      } else {
        // Get from current session
        const user = await LocalStorageService.getCurrentUser();
        return user as AppUser | null;
      }
    } catch (error) {
      console.error('Failed to get current user:', error);
      return null;
    }
  }

  /**
   * Update user profile in local storage.
   * 
   * Updates user profile data. Note: role and uid cannot be updated via this method.
   * 
   * @param uid - User ID to update
   * @param updates - Partial user object with fields to update
   * @returns Promise that resolves when update is complete
   * @throws Error if user not found or update fails
   * 
   * @example
   * ```typescript
   * await AuthService.updateUserProfile('user-123', {
   *   name: 'John Updated',
   *   email: 'john@example.com'
   * });
   * ```
   */
  static async updateUserProfile(uid: string, updates: Partial<AppUser>): Promise<void> {
    try {
      // Get current user
      const currentUser = await LocalStorageService.getUserById(uid);
      
      if (!currentUser) {
        throw new Error('User not found');
      }

      // Merge updates (excluding role and uid)
      const { role, uid: userId, ...allowedUpdates } = updates;
      const updatedUser = { ...currentUser, ...allowedUpdates };

      // Update in collection
      await LocalStorageService.updateUserProfile(uid, updatedUser);
      
      // Also update current user if it's the same user
      const currentSessionUser = await LocalStorageService.getCurrentUser();
      if (currentSessionUser?.uid === uid) {
        await LocalStorageService.saveUser(updatedUser);
      }
    } catch (error) {
      throw error;
    }
  }

  /**
   * Initialize app - restore session if available.
   * 
   * Should be called on app startup to restore any existing authentication session.
   * 
   * @returns Promise that resolves when initialization is complete
   * @throws Never throws - errors are logged to console
   * 
   * @example
   * ```typescript
   * await AuthService.initializeApp();
   * const user = await AuthService.getCurrentUserData();
   * if (user) {
   *   // User session was restored
   * }
   * ```
   */
  static async initializeApp(): Promise<void> {
    try {
      // Initialize sample data if needed
      await LocalStorageService.initializeSampleData();
      console.log('Auth service initialized');
    } catch (error) {
      console.error('Failed to initialize app:', error);
    }
  }
}
