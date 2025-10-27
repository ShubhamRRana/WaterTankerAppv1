import { create } from 'zustand';
import { User } from '../types/index';
import { AuthService } from '../services/auth.service';

interface AuthState {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (phone: string, password: string) => Promise<void>;
  loginWithRole: (phone: string, role: 'customer' | 'driver' | 'admin') => Promise<void>;
  register: (
    phone: string,
    password: string,
    name: string,
    role: 'customer' | 'driver' | 'admin'
  ) => Promise<void>;
  logout: () => Promise<void>;
  updateUser: (updates: Partial<User>) => Promise<void>;
  setUser: (user: User | null) => void;
  setLoading: (loading: boolean) => void;
  initializeAuth: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  isLoading: false,
  isAuthenticated: false,

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

  loginWithRole: async (phone: string, role: 'customer' | 'driver' | 'admin') => {
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
    role: 'customer' | 'driver' | 'admin'
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
}));
