import { create } from 'zustand';
import { User, UserRole } from '../types/index';
import { AuthService } from '../services/auth.service';
import { supabase } from '../lib/supabaseClient';
import { handleError } from '../utils/errorHandler';
import { ErrorSeverity } from '../utils/errorLogger';

/**
 * Authentication store state interface
 * 
 * Manages user authentication state, loading states, and authentication operations.
 * Uses Zustand for state management.
 */
interface AuthState {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  unsubscribeAuth: (() => void) | null;
  login: (email: string, password: string) => Promise<void>;
  loginWithRole: (email: string, role: UserRole) => Promise<void>;
  register: (
    email: string,
    password: string,
    name: string,
    role: UserRole,
    phone: string,
    businessName?: string
  ) => Promise<void>;
  logout: () => Promise<void>;
  updateUser: (updates: Partial<User>) => Promise<void>;
  setUser: (user: User | null) => void;
  setLoading: (loading: boolean) => void;
  initializeAuth: () => Promise<void>;
  subscribeToAuthChanges: () => void;
  unsubscribeFromAuthChanges: () => void;
}

/**
 * Authentication store using Zustand
 * 
 * Provides global authentication state management including:
 * - User data and authentication status
 * - Login, logout, and registration operations
 * - User profile updates
 * - Real-time auth state subscriptions (placeholder for Supabase)
 * 
 * @example
 * ```tsx
 * const { user, login, logout, isAuthenticated } = useAuthStore();
 * 
 * await login('user@example.com', 'password');
 * ```
 */
export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  isLoading: false,
  isAuthenticated: false,
  unsubscribeAuth: null,

  initializeAuth: async () => {
    set({ isLoading: true });
    try {
      await AuthService.initializeApp();
      
      // Check for existing Supabase session
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        const userData = await AuthService.getCurrentUserData(session.user.id);
        set({
          user: userData,
          isAuthenticated: !!userData,
          isLoading: false,
        });
      } else {
        set({
          user: null,
          isAuthenticated: false,
          isLoading: false,
        });
      }
      
      // Subscribe to auth changes after initialization
      get().subscribeToAuthChanges();
    } catch (error) {
      handleError(error, {
        context: { operation: 'initializeAuth' },
        userFacing: false,
        severity: ErrorSeverity.MEDIUM,
      });
      set({ isLoading: false });
    }
  },

  login: async (email: string, password: string) => {
    set({ isLoading: true });
    try {
      const result = await AuthService.login(email, password);
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
      handleError(error, {
        context: { operation: 'login', email },
        userFacing: false,
        severity: ErrorSeverity.MEDIUM,
      });
      set({ isLoading: false });
      throw error;
    }
  },

  loginWithRole: async (email: string, role: UserRole) => {
    set({ isLoading: true });
    try {
      const result = await AuthService.loginWithRole(email, role);
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
      handleError(error, {
        context: { operation: 'loginWithRole', email, role },
        userFacing: false,
        severity: ErrorSeverity.MEDIUM,
      });
      set({ isLoading: false });
      throw error;
    }
  },

  register: async (
    email: string,
    password: string,
    name: string,
    role: UserRole,
    phone: string,
    businessName?: string
  ) => {
    set({ isLoading: true });
    try {
      const additionalData: Partial<User> = { phone };
      if (role === 'admin' && businessName) {
        additionalData.businessName = businessName;
      }
      const result = await AuthService.register(email, password, name, role, additionalData);
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
      handleError(error, {
        context: { operation: 'register', email, role },
        userFacing: false,
        severity: ErrorSeverity.MEDIUM,
      });
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
      handleError(error, {
        context: { operation: 'logout' },
        userFacing: false,
        severity: ErrorSeverity.MEDIUM,
      });
      set({ isLoading: false });
      throw error;
    }
  },

  updateUser: async (updates: Partial<User>) => {
    const { user } = get();
    if (!user) return;

    set({ isLoading: true });
    try {
      await AuthService.updateUserProfile(user.id, updates);
      const updatedUser = { ...user, ...updates };
      set({
        user: updatedUser,
        isLoading: false,
      });
    } catch (error) {
      handleError(error, {
        context: { operation: 'updateUser', userId: user.id },
        userFacing: false,
        severity: ErrorSeverity.MEDIUM,
      });
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

    // Subscribe to Supabase Auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_IN' && session?.user) {
        // Fetch user data with first available role
        const userData = await AuthService.getCurrentUserData(session.user.id);
        if (userData) {
          set({
            user: userData,
            isAuthenticated: true,
          });
        }
      } else if (event === 'SIGNED_OUT') {
        set({
          user: null,
          isAuthenticated: false,
        });
      } else if (event === 'TOKEN_REFRESHED' && session?.user) {
        // Token refreshed, user still authenticated
        const userData = await AuthService.getCurrentUserData(session.user.id);
        if (userData) {
          set({
            user: userData,
            isAuthenticated: true,
          });
        }
      }
    });
    
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
