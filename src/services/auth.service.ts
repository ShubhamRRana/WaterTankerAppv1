import { supabase } from './supabase';
import { User as AppUser, UserRole } from '../types/index';
import { ERROR_MESSAGES } from '../constants/config';
import { transformSupabaseUserToAppUser, transformAppUserToSupabaseUser } from '../utils/supabaseTransformers';

export interface AuthResult {
  success: boolean;
  user?: AppUser;
  error?: string;
  availableRoles?: UserRole[];
  requiresRoleSelection?: boolean;
}

export class AuthService {
  /**
   * Register a new user with Supabase Auth and create profile in users table
   */
  static async register(
    phone: string,
    password: string,
    name: string,
    role: UserRole,
    additionalData?: Partial<AppUser>
  ): Promise<AuthResult> {
    try {
      // Prevent driver self-registration - only admin-created drivers are allowed
      if (role === 'driver' && !additionalData?.createdByAdmin) {
        return {
          success: false,
          error: ERROR_MESSAGES.auth.adminCreatedDriverOnly
        };
      }

      // Check if user already exists with same phone AND role
      const { data: existingUsers, error: checkError } = await supabase
        .from('users')
        .select('*')
        .eq('phone', phone)
        .eq('role', role);

      if (checkError) {
        return {
          success: false,
          error: `Failed to check existing users: ${checkError.message}`
        };
      }

      if (existingUsers && existingUsers.length > 0) {
        return {
          success: false,
          error: `User already exists with this phone number as ${role}`
        };
      }

      // Create user in Supabase Auth
      // Use phone as email for now (Supabase Auth requires email, we'll use phone@temp.com format)
      const tempEmail = `${phone}@watertanker.temp`;
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: tempEmail,
        password: password,
        options: {
          data: {
            phone: phone,
            name: name,
            role: role,
          }
        }
      });

      if (authError || !authData.user) {
        return {
          success: false,
          error: authError?.message || 'Failed to create authentication account'
        };
      }

      // Create user profile in users table
      const userData: AppUser = {
        uid: authData.user.id, // Use auth user ID
        role,
        phone,
        password: '', // Password is handled by Supabase Auth
        name,
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

      return {
        success: true,
        user: appUser
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Registration failed'
      };
    }
  }

  /**
   * Login with phone and password using Supabase Auth
   */
  static async login(phone: string, password: string): Promise<AuthResult> {
    try {
      // Find all users with this phone number
      const { data: userAccounts, error: fetchError } = await supabase
        .from('users')
        .select('*')
        .eq('phone', phone);

      if (fetchError) {
        return {
          success: false,
          error: `Failed to fetch users: ${fetchError.message}`
        };
      }

      if (!userAccounts || userAccounts.length === 0) {
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
        return {
          success: false,
          error: ERROR_MESSAGES.auth.adminCreatedDriverOnly
        };
      }

      if (validAccounts.length === 1) {
        // Single account - login with the auth account
        const dbUser = validAccounts[0];
        
        // Use the same email format as registration: phone@watertanker.temp
        const tempEmail = `${phone}@watertanker.temp`;

        // Sign in with Supabase Auth
        const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
          email: tempEmail,
          password: password,
        });

        if (authError || !authData.user) {
          return {
            success: false,
            error: authError?.message || 'Invalid phone number or password'
          };
        }

        // Verify the auth user matches the db user
        if (authData.user.id !== dbUser.auth_id) {
          await supabase.auth.signOut();
          return {
            success: false,
            error: 'Authentication mismatch'
          };
        }

        const appUser = transformSupabaseUserToAppUser(dbUser);
        return {
          success: true,
          user: appUser
        };
      } else {
        // Multiple valid accounts - require role selection
        const availableRoles = validAccounts.map(account => account.role) as UserRole[];
        return {
          success: true,
          requiresRoleSelection: true,
          availableRoles,
          user: undefined
        };
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Login failed'
      };
    }
  }

  /**
   * Login with phone and selected role (used after role selection)
   * Note: This assumes the user has already authenticated via login()
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
   * Logout from Supabase Auth
   */
  static async logout(): Promise<void> {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) {
        throw error;
      }
    } catch (error) {
      throw error;
    }
  }

  /**
   * Get current authenticated user data from Supabase
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
   * Update user profile in Supabase users table
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
   * Initialize app - check Supabase connection and restore session
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