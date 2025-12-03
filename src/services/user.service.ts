// src/services/user.service.ts

import { LocalStorageService } from './localStorage';
import { User, UserRole } from '../types/index';

/**
 * UserService - Handles user management operations for admin users
 * 
 * Note: Authentication operations are handled by AuthService.
 * This service is for admin operations like fetching all users, managing user profiles, etc.
 * Uses LocalStorageService for data persistence.
 */
export class UserService {
  /**
   * Helper function to convert auth_id to users table id
   * In local storage, id is the primary identifier, so this just returns the id
   */
  static async getUsersTableIdByAuthId(authId: string): Promise<string | null> {
    try {
      const user = await LocalStorageService.getUserById(authId);
      return user ? user.id : null;
    } catch (error) {
      return null;
    }
  }

  /**
   * Get all users from local storage
   */
  static async getAllUsers(): Promise<User[]> {
    try {
      const users = await LocalStorageService.getUsers();
      return users as User[];
    } catch (error) {
      throw error;
    }
  }

  /**
   * Get users by role
   */
  static async getUsersByRole(role: UserRole): Promise<User[]> {
    try {
      const allUsers = await LocalStorageService.getUsers();
      return allUsers.filter(u => u.role === role) as User[];
    } catch (error) {
      throw error;
    }
  }

  /**
   * Get a single user by id (primary key for fetching users)
   */
  static async getUserById(id: string): Promise<User | null> {
    try {
      const user = await LocalStorageService.getUserById(id);
      return user as User | null;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Create a new user (typically used by admin to create drivers)
   * Note: This creates the user profile only. Auth account should be created via AuthService.register()
   */
  static async createUser(userData: Omit<User, 'id' | 'createdAt'>): Promise<User> {
    try {
      const id = LocalStorageService.generateId();
      const newUser: User = {
        ...userData,
        id,
        createdAt: new Date(),
      };

      await LocalStorageService.saveUserToCollection(newUser);
      return newUser;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Update user profile by id
   */
  static async updateUser(id: string, updates: Partial<User>): Promise<void> {
    try {
      const currentUser = await LocalStorageService.getUserById(id);
      
      if (!currentUser) {
        throw new Error('User not found');
      }

      // Merge updates (excluding id and role)
      const { id: userId, role, ...allowedUpdates } = updates;
      const updatedUser = { ...currentUser, ...allowedUpdates };

      await LocalStorageService.updateUserProfile(id, updatedUser);
    } catch (error) {
      throw error;
    }
  }

  /**
   * Delete a user by id (admin only)
   */
  static async deleteUser(id: string): Promise<void> {
    try {
      const users = await LocalStorageService.getUsers();
      const updatedUsers = users.filter(u => u.id !== id);
      await LocalStorageService.setItem('users_collection', updatedUsers);
    } catch (error) {
      throw error;
    }
  }

  /**
   * Subscribe to real-time user updates by id
   * Note: Real-time subscriptions are not available with local storage
   * This is a placeholder that returns a no-op unsubscribe function
   */
  static subscribeToUserUpdates(
    id: string,
    callback: (user: User | null) => void
  ): () => void {
    // Local storage doesn't support real-time updates
    // This is a placeholder for compatibility
    return () => {};
  }

  /**
   * Subscribe to real-time updates for all users (admin only)
   * Note: Real-time subscriptions are not available with local storage
   * This is a placeholder that returns a no-op unsubscribe function
   */
  static subscribeToAllUsersUpdates(
    callback: (users: User[]) => void
  ): () => void {
    // Local storage doesn't support real-time updates
    // This is a placeholder for compatibility
    return () => {};
  }
}
