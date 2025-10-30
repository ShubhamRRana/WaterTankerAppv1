import { LocalStorageService } from './localStorage';
import { User as AppUser, UserAccount } from '../types/index';
import { ERROR_MESSAGES } from '../constants/config';

export interface AuthResult {
  success: boolean;
  user?: AppUser;
  error?: string;
  availableRoles?: ('customer' | 'driver' | 'admin')[];
  requiresRoleSelection?: boolean;
}

export class AuthService {
  static async register(
    phone: string,
    password: string,
    name: string,
    role: 'customer' | 'driver' | 'admin',
    additionalData?: Partial<AppUser>
  ): Promise<AuthResult> {
    try {
      // Check if user already exists with same phone AND role
      const users = await LocalStorageService.getUsers();
      const existingUser = users.find(user => user.phone === phone && user.role === role);
      
      if (existingUser) {
        return {
          success: false,
          error: `User already exists with this phone number as ${role}`
        };
      }

      // Create new user
      const uid = LocalStorageService.generateId();
      const userData: AppUser = {
        uid,
        role,
        phone,
        password: '', // Don't store password in local storage for security
        name,
        createdAt: new Date(),
        ...additionalData,
      };

      // Save user to collection
      await LocalStorageService.saveUserToCollection(userData);
      
      // Set as current user
      await LocalStorageService.saveUser(userData);

      return {
        success: true,
        user: userData
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Registration failed'
      };
    }
  }

  static async login(phone: string, password: string): Promise<AuthResult> {
    try {
      const users = await LocalStorageService.getUsers();
      const userAccounts = users.filter(u => u.phone === phone);
      
      if (userAccounts.length === 0) {
        return {
          success: false,
          error: 'User not found'
        };
      }

      // For local storage, we'll skip password validation for now
      // In a real app, you'd hash and compare passwords
      
      if (userAccounts.length === 1) {
        // Single account - check if driver was created by admin
        const user = userAccounts[0];
        
        // Check if it's a driver that wasn't created by admin
        if (user.role === 'driver' && !user.createdByAdmin) {
          return {
            success: false,
            error: ERROR_MESSAGES.auth.adminCreatedDriverOnly
          };
        }
        
        await LocalStorageService.saveUser(user);
        return {
          success: true,
          user
        };
      } else {
        // Multiple accounts - filter out drivers not created by admin
        const validAccounts = userAccounts.filter(account => {
          if (account.role === 'driver' && !account.createdByAdmin) {
            return false; // Exclude drivers not created by admin
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
          // Only one valid account - proceed normally
          const user = validAccounts[0];
          await LocalStorageService.saveUser(user);
          return {
            success: true,
            user
          };
        } else {
          // Multiple valid accounts - require role selection
          const availableRoles = validAccounts.map(account => account.role);
          return {
            success: true,
            requiresRoleSelection: true,
            availableRoles,
            user: undefined
          };
        }
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Login failed'
      };
    }
  }

  static async loginWithRole(phone: string, role: 'customer' | 'driver' | 'admin'): Promise<AuthResult> {
    try {
      const users = await LocalStorageService.getUsers();
      const user = users.find(u => u.phone === phone && u.role === role);
      
      if (!user) {
        return {
          success: false,
          error: 'User not found with selected role'
        };
      }

      // Check if it's a driver that wasn't created by admin
      if (user.role === 'driver' && !user.createdByAdmin) {
        return {
          success: false,
          error: ERROR_MESSAGES.auth.adminCreatedDriverOnly
        };
      }

      // Set as current user
      await LocalStorageService.saveUser(user);

      return {
        success: true,
        user
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Login failed'
      };
    }
  }

  static async logout(): Promise<void> {
    try {
      await LocalStorageService.removeUser();
    } catch (error) {
      throw error;
    }
  }

  static async getCurrentUserData(): Promise<AppUser | null> {
    try {
      return await LocalStorageService.getCurrentUser();
    } catch (error) {
      throw error;
    }
  }

  static async updateUserProfile(uid: string, updates: Partial<AppUser>): Promise<void> {
    try {
      const users = await LocalStorageService.getUsers();
      const userIndex = users.findIndex(u => u.uid === uid);
      
      if (userIndex >= 0) {
        users[userIndex] = { ...users[userIndex], ...updates };
        await LocalStorageService.setItem('users_collection', users);
        
        // Update current user if it's the same user
        const currentUser = await LocalStorageService.getCurrentUser();
        if (currentUser && currentUser.uid === uid) {
          await LocalStorageService.saveUser(users[userIndex]);
        }
      }
    } catch (error) {
      throw error;
    }
  }

  // Initialize sample data for development
  static async initializeApp(): Promise<void> {
    try {
      await LocalStorageService.initializeSampleData();
    } catch (error) {
      console.error('Failed to initialize app:', error);
    }
  }
}