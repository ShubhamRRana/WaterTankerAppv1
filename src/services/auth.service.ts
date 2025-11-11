import { supabase } from './supabase';
import { User as AppUser, UserRole, DriverUser } from '../types/index';
import { ERROR_MESSAGES } from '../constants/config';
import { transformSupabaseUserToAppUser, transformAppUserToSupabaseUser } from '../utils/supabaseTransformers';
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
 * Handles user authentication, registration, and session management with Supabase Auth.
 * Includes security features like rate limiting, input sanitization, and brute force protection.
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
   * Register a new user with Supabase Auth and create profile in users table.
   * 
   * Includes input sanitization, rate limiting, and security event logging.
   * Prevents driver self-registration (only admin-created drivers allowed).
   * 
   * @param phone - User's phone number (will be sanitized automatically)
   * @param password - User's password (will be hashed by Supabase)
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

      // Log registration attempt
      securityLogger.logRegistrationAttempt(sanitizedPhone, role, false);

      // Prevent driver self-registration - only admin-created drivers are allowed
      if (role === 'driver' && !(additionalData as Partial<DriverUser>)?.createdByAdmin) {
        securityLogger.logRegistrationAttempt(sanitizedPhone, role, false, ERROR_MESSAGES.auth.adminCreatedDriverOnly);
        return {
          success: false,
          error: ERROR_MESSAGES.auth.adminCreatedDriverOnly
        };
      }

      // Check if user already exists with same phone AND role
      const { data: existingUsers, error: checkError } = await supabase
        .from('users')
        .select('*')
        .eq('phone', sanitizedPhone)
        .eq('role', role);

      if (checkError) {
        return {
          success: false,
          error: `Failed to check existing users: ${checkError.message}`
        };
      }

      if (existingUsers && existingUsers.length > 0) {
        securityLogger.logRegistrationAttempt(sanitizedPhone, role, false, 'User already exists');
        return {
          success: false,
          error: `User already exists with this phone number as ${role}`
        };
      }

      // Record rate limit
      rateLimiter.record('register', sanitizedPhone);

      // Create user in Supabase Auth
      // Use phone as email for now (Supabase Auth requires email, we'll use phone@temp.com format)
      const tempEmail = `${sanitizedPhone}@watertanker.temp`;
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: tempEmail,
        password: password,
        options: {
          data: {
            phone: sanitizedPhone,
            name: sanitizedName,
            role: role,
          }
        }
      });

      if (authError || !authData.user) {
        securityLogger.logRegistrationAttempt(sanitizedPhone, role, false, authError?.message);
        return {
          success: false,
          error: authError?.message || 'Failed to create authentication account'
        };
      }

      // Create user profile in users table
      const userData: AppUser = {
        uid: authData.user.id, // Use auth user ID
        role,
        phone: sanitizedPhone,
        password: '', // Password is handled by Supabase Auth
        name: sanitizedName,
        createdAt: new Date(),
        ...additionalData,
      };

      const supabaseUserData = transformAppUserToSupabaseUser(userData);
      supabaseUserData.auth_id = authData.user.id;

      const { error: profileError } = await supabase
        .from('users')
        .insert([supabaseUserData]);

      if (profileError) {
        // If profile creation fails, we can't clean up auth user from client
        // This should be handled by a server-side cleanup function or manually
        console.error('Failed to create user profile, auth user may need manual cleanup:', authData.user.id);
        return {
          success: false,
          error: `Failed to create user profile: ${profileError.message}`
        };
      }

      // Fetch the created user to return complete data
      const { data: createdUser, error: fetchError } = await supabase
        .from('users')
        .select('*')
        .eq('auth_id', authData.user.id)
        .single();

      if (fetchError || !createdUser) {
        return {
          success: false,
          error: `Failed to fetch created user: ${fetchError?.message || 'Unknown error'}`
        };
      }

      const appUser = transformSupabaseUserToAppUser(createdUser);

      // Log successful registration
      securityLogger.logRegistrationAttempt(sanitizedPhone, role, true, undefined, appUser.uid);

      return {
        success: true,
        user: appUser
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
   * Login with phone and password using Supabase Auth.
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
      const { data: userAccounts, error: fetchError } = await supabase
        .from('users')
        .select('*')
        .eq('phone', sanitizedPhone);

      if (fetchError) {
        return {
          success: false,
          error: `Failed to fetch users: ${fetchError.message}`
        };
      }

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
        if (account.role === 'driver' && !account.created_by_admin) {
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

      if (validAccounts.length === 1) {
        // Single account - login with the auth account
        const dbUser = validAccounts[0];
        
        // Use the same email format as registration: phone@watertanker.temp
        const tempEmail = `${sanitizedPhone}@watertanker.temp`;

        // Sign in with Supabase Auth
        const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
          email: tempEmail,
          password: password,
        });

        if (authError || !authData.user) {
          securityLogger.logAuthAttempt(sanitizedPhone, false, authError?.message || 'Invalid credentials');
          rateLimiter.record('login', sanitizedPhone);
          return {
            success: false,
            error: authError?.message || 'Invalid phone number or password'
          };
        }

        // Verify the auth user matches the db user
        if (authData.user.id !== dbUser.auth_id) {
          await supabase.auth.signOut();
          securityLogger.logAuthAttempt(sanitizedPhone, false, 'Authentication mismatch');
          securityLogger.log(
            SecurityEventType.SESSION_HIJACK_ATTEMPT,
            SecuritySeverity.CRITICAL,
            { userId: dbUser.auth_id, authUserId: authData.user.id },
            dbUser.auth_id,
            dbUser.role
          );
          return {
            success: false,
            error: 'Authentication mismatch'
          };
        }

        // Record successful login
        rateLimiter.record('login', sanitizedPhone);
        securityLogger.logAuthAttempt(sanitizedPhone, true, undefined, dbUser.auth_id);

        const appUser = transformSupabaseUserToAppUser(dbUser);
        return {
          success: true,
          user: appUser
        };
      } else {
        // Multiple valid accounts - require role selection
        // Don't record rate limit yet - wait for role selection
        const availableRoles = validAccounts.map(account => account.role) as UserRole[];
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
   * It verifies the user is already authenticated and selects the specific role.
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
      const { data: dbUser, error: fetchError } = await supabase
        .from('users')
        .select('*')
        .eq('phone', phone)
        .eq('role', role)
        .single();

      if (fetchError || !dbUser) {
        return {
          success: false,
          error: 'User not found with selected role'
        };
      }

      // Check if it's a driver that wasn't created by admin
      if (dbUser.role === 'driver' && !dbUser.created_by_admin) {
        return {
          success: false,
          error: ERROR_MESSAGES.auth.adminCreatedDriverOnly
        };
      }

      // Verify the user is already authenticated (login() should be called first)
      const { data: session } = await supabase.auth.getSession();
      if (!session.session || session.session.user.id !== dbUser.auth_id) {
        return {
          success: false,
          error: 'Please login first with your password'
        };
      }

      const appUser = transformSupabaseUserToAppUser(dbUser);
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
   * Logout from Supabase Auth.
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
      // Get current user before logout for logging
      const { data: { user } } = await supabase.auth.getUser();
      const userId = user?.id;

      const { error } = await supabase.auth.signOut();
      if (error) {
        throw error;
      }

      // Log logout
      if (userId) {
        securityLogger.log(
          SecurityEventType.LOGOUT,
          SecuritySeverity.INFO,
          {},
          userId
        );
      }
    } catch (error) {
      throw error;
    }
  }

  /**
   * Get current authenticated user data from Supabase.
   * 
   * Fetches the user profile from the users table based on the current Supabase Auth session.
   * 
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
  static async getCurrentUserData(): Promise<AppUser | null> {
    try {
      const { data: { user: authUser } } = await supabase.auth.getUser();
      
      if (!authUser) {
        return null;
      }

      const { data: dbUser, error } = await supabase
        .from('users')
        .select('*')
        .eq('auth_id', authUser.id)
        .single();

      if (error || !dbUser) {
        return null;
      }

      return transformSupabaseUserToAppUser(dbUser);
    } catch (error) {
      console.error('Failed to get current user:', error);
      return null;
    }
  }

  /**
   * Update user profile in Supabase users table.
   * 
   * Updates user profile data. Note: role and auth_id cannot be updated via this method.
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
      // Get current user to merge updates
      const { data: currentUser, error: fetchError } = await supabase
        .from('users')
        .select('*')
        .eq('id', uid)
        .single();

      if (fetchError || !currentUser) {
        throw new Error('User not found');
      }

      // Transform current user to app type, apply updates, then transform back
      const appUser = transformSupabaseUserToAppUser(currentUser);
      const updatedUser = { ...appUser, ...updates };
      const supabaseUpdates = transformAppUserToSupabaseUser(updatedUser);

      // Remove fields that shouldn't be updated directly
      delete supabaseUpdates.auth_id;
      delete supabaseUpdates.role; // Role shouldn't be changed via profile update

      const { error: updateError } = await supabase
        .from('users')
        .update(supabaseUpdates)
        .eq('id', uid);

      if (updateError) {
        throw updateError;
      }
    } catch (error) {
      throw error;
    }
  }

  /**
   * Initialize app - check Supabase connection and restore session.
   * 
   * Should be called on app startup to restore any existing authentication session.
   * Checks for existing Supabase Auth session and restores it if available.
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
      // Check if there's an existing session
      const { data: { session } } = await supabase.auth.getSession();
      
      if (session) {
        // Session exists, user is already authenticated
        // The session will be automatically refreshed by Supabase
        console.log('Existing session found');
      }
    } catch (error) {
      console.error('Failed to initialize app:', error);
    }
  }
}