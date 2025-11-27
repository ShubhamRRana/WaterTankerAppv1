import { create } from 'zustand';
import { User, UserRole } from '../types/index';
import { AuthService } from '../services/auth.service';

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
    phone?: string
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
      set({ isLoading: false });
      throw error;
    }
  },

  register: async (
    email: string,
    password: string,
    name: string,
    role: UserRole,
    phone?: string
  ) => {
    set({ isLoading: true });
    try {
      const result = await AuthService.register(email, password, name, role, phone ? { phone } : undefined);
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

    // Note: Implement auth state change subscription based on your authentication system
    // This is a placeholder - subscribe to your auth system's state changes here
    
    set({ unsubscribeAuth: () => {} });
  },

  unsubscribeFromAuthChanges: () => {
    const { unsubscribeAuth } = get();
    if (unsubscribeAuth) {
      unsubscribeAuth();
      set({ unsubscribeAuth: null });
    }
  },
}));
