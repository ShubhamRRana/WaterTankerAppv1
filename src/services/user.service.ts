// src/services/user.service.ts

import { supabase } from './supabase';
import { User, UserRole } from '../types/index';
import { transformSupabaseUserToAppUser, transformAppUserToSupabaseUser } from '../utils/supabaseTransformers';

/**
 * UserService - Handles user management operations for admin users
 * 
 * Note: Authentication operations are handled by AuthService.
 * This service is for admin operations like fetching all users, managing user profiles, etc.
 */
export class UserService {
  /**
   * Helper function to convert auth_id to users table id
   * Needed for foreign key relationships that reference users.id
   */
  static async getUsersTableIdByAuthId(authId: string): Promise<string | null> {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('id')
        .eq('auth_id', authId)
        .single();

      if (error || !data) {
        return null;
      }

      return data.id;
    } catch (error) {
      return null;
    }
  }

  /**
   * Get all users from Supabase
   */
  static async getAllUsers(): Promise<User[]> {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        throw new Error(error.message);
      }

      return (data || []).map(transformSupabaseUserToAppUser);
    } catch (error) {
      throw error;
    }
  }

  /**
   * Get users by role
   */
  static async getUsersByRole(role: UserRole): Promise<User[]> {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('role', role)
        .order('created_at', { ascending: false });

      if (error) {
        throw new Error(error.message);
      }

      return (data || []).map(transformSupabaseUserToAppUser);
    } catch (error) {
      throw error;
    }
  }

  /**
   * Get a single user by auth_id (primary key for fetching users)
   */
  static async getUserById(authId: string): Promise<User | null> {
    try {
      // Validate UUID format before querying
      const { ValidationUtils } = require('../utils/validation');
      const uuidValidation = ValidationUtils.validateUUID(authId);
      if (!uuidValidation.isValid) {
        return null;
      }

      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('auth_id', authId)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          // No rows returned
          return null;
        }
        // Handle invalid UUID syntax errors
        if (error.message && error.message.includes('invalid input syntax for type uuid')) {
          return null;
        }
        throw new Error(error.message);
      }

      return data ? transformSupabaseUserToAppUser(data) : null;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Create a new user (typically used by admin to create drivers)
   * Note: This creates the user profile only. Auth account should be created via AuthService.register()
   */
  static async createUser(userData: Omit<User, 'uid' | 'createdAt'>): Promise<User> {
    try {
      const supabaseUserData = transformAppUserToSupabaseUser(userData as User);
      
      // Remove auth_id as it should be set when creating auth account
      delete supabaseUserData.auth_id;

      const { data, error } = await supabase
        .from('users')
        .insert([supabaseUserData])
        .select('*')
        .single();

      if (error || !data) {
        throw new Error(error?.message || 'Failed to create user');
      }

      return transformSupabaseUserToAppUser(data);
    } catch (error) {
      throw error;
    }
  }

  /**
   * Update user profile by auth_id
   */
  static async updateUser(authId: string, updates: Partial<User>): Promise<void> {
    try {
      // Get current user to merge updates
      const { data: currentUser, error: fetchError } = await supabase
        .from('users')
        .select('*')
        .eq('auth_id', authId)
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
        .eq('auth_id', authId);

      if (updateError) {
        throw updateError;
      }
    } catch (error) {
      throw error;
    }
  }

  /**
   * Delete a user by auth_id (admin only)
   * Note: This will cascade delete related records due to foreign key constraints
   */
  static async deleteUser(authId: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('users')
        .delete()
        .eq('auth_id', authId);

      if (error) {
        throw new Error(error.message);
      }
    } catch (error) {
      throw error;
    }
  }

  /**
   * Subscribe to real-time user updates by auth_id
   */
  static subscribeToUserUpdates(
    authId: string,
    callback: (user: User | null) => void
  ): () => void {
    const channel = supabase
      .channel(`user:${authId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'users',
          filter: `auth_id=eq.${authId}`,
        },
        async (payload) => {
          try {
            if (payload.eventType === 'DELETE') {
              callback(null);
            } else {
              const user = await this.getUserById(authId);
              callback(user);
            }
          } catch (error) {
            console.error('Error handling user update:', error);
            callback(null);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }

  /**
   * Subscribe to real-time updates for all users (admin only)
   */
  static subscribeToAllUsersUpdates(
    callback: (users: User[]) => void
  ): () => void {
    const channel = supabase
      .channel('users:all')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'users',
        },
        async () => {
          try {
            const users = await this.getAllUsers();
            callback(users);
          } catch (error) {
            console.error('Error handling users update:', error);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }
}

