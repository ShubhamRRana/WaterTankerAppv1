import { create } from 'zustand';
import { User, UserRole } from '../types/index';
import { AuthService } from '../services/auth.service';
import { supabase } from '../services/supabase';

interface AuthState {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  unsubscribeAuth: (() => void) | null;
  login: (phone: string, password: string) => Promise<void>;
  loginWithRole: (phone: string, role: UserRole) => Promise<void>;
  register: (
    phone: string,
    password: string,
    name: string,
    role: UserRole
  ) => Promise<void>;
  logout: () => Promise<void>;
  updateUser: (updates: Partial<User>) => Promise<void>;
  setUser: (user: User | null) => void;
  setLoading: (loading: boolean) => void;
  initializeAuth: () => Promise<void>;
  subscribeToAuthChanges: () => void;
  unsubscribeFromAuthChanges: () => void;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  isLoading: false,
  isAuthenticated: false,
  unsubscribeAuth: null,

  initializeAuth: async () => {
    set({ isLoading: true });
    try {
      await AuthService.initializeApp();
      const userData = await AuthService.getCurrentUserData();
      set({
        user: userData,
        isAuthenticated: !!userData,
        isLoading: false,
      });
      
      // Subscribe to auth changes after initialization
      get().subscribeToAuthChanges();
    } catch (error) {
      set({ isLoading: false });
      console.error('Failed to initialize auth:', error);
    }
  },

  login: async (phone: string, password: string) => {
    set({ isLoading: true });
    try {
      const result = await AuthService.login(phone, password);
      if (result.success) {
        if (result.requiresRoleSelection) {
          // This will be handled by the navigation system
          // The login screen will navigate to role selection
          set({ isLoading: false });
          throw new Error('ROLE_SELECTION_REQUIRED');
        } else if (result.user) {
          set({
            user: result.user,
            isAuthenticated: true,
            isLoading: false,
          });
        } else {
          set({ isLoading: false });
          throw new Error(result.error || 'Login failed');
        }
      } else {
        set({ isLoading: false });
        throw new Error(result.error || 'Login failed');
      }
    } catch (error) {
      set({ isLoading: false });
      throw error;
    }
  },

  loginWithRole: async (phone: string, role: UserRole) => {
    set({ isLoading: true });
    try {
      const result = await AuthService.loginWithRole(phone, role);
      if (result.success && result.user) {
        set({
          user: result.user,
          isAuthenticated: true,
          isLoading: false,
        });
      } else {
        set({ isLoading: false });
        throw new Error(result.error || 'Login failed');
      }
    } catch (error) {
      set({ isLoading: false });
      throw error;
    }
  },

  register: async (
    phone: string,
    password: string,
    name: string,
    role: UserRole
  ) => {
    set({ isLoading: true });
    try {
      const result = await AuthService.register(phone, password, name, role);
      if (result.success && result.user) {
        set({
          user: result.user,
          isAuthenticated: true,
          isLoading: false,
        });
      } else {
        set({ isLoading: false });
        throw new Error(result.error || 'Registration failed');
      }
    } catch (error) {
      set({ isLoading: false });
      throw error;
    }
  },

  logout: async () => {
    set({ isLoading: true });
    try {
      await AuthService.logout();
      set({
        user: null,
        isAuthenticated: false,
        isLoading: false,
      });
    } catch (error) {
      set({ isLoading: false });
      throw error;
    }
  },

  updateUser: async (updates: Partial<User>) => {
    const { user } = get();
    if (!user) return;

    set({ isLoading: true });
    try {
      await AuthService.updateUserProfile(user.uid, updates);
      const updatedUser = { ...user, ...updates };
      set({
        user: updatedUser,
        isLoading: false,
      });
    } catch (error) {
      set({ isLoading: false });
      throw error;
    }
  },

  setUser: (user: User | null) => {
    set({
      user,
      isAuthenticated: !!user,
    });
  },

  setLoading: (loading: boolean) => {
    set({ isLoading: loading });
  },

  subscribeToAuthChanges: () => {
    const { unsubscribeAuth } = get();
    // Clean up existing subscription if any
    if (unsubscribeAuth) {
      unsubscribeAuth();
    }

    // Subscribe to auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
          // User signed in or session refreshed - fetch user data
          try {
            const userData = await AuthService.getCurrentUserData();
            set({
              user: userData,
              isAuthenticated: !!userData,
            });
          } catch (error) {
            console.error('Failed to fetch user data on auth change:', error);
          }
        } else if (event === 'SIGNED_OUT') {
          // User signed out
          set({
            user: null,
            isAuthenticated: false,
          });
        } else if (event === 'USER_UPDATED') {
          // User data updated - refresh user data
          try {
            const userData = await AuthService.getCurrentUserData();
            set({
              user: userData,
              isAuthenticated: !!userData,
            });
          } catch (error) {
            console.error('Failed to fetch user data on user update:', error);
          }
        }
      }
    );

    set({ unsubscribeAuth: () => subscription.unsubscribe() });
  },

  unsubscribeFromAuthChanges: () => {
    const { unsubscribeAuth } = get();
    if (unsubscribeAuth) {
      unsubscribeAuth();
      set({ unsubscribeAuth: null });
    }
  },
}));
