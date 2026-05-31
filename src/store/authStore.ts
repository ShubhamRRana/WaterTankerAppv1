import { create } from 'zustand';
import { Linking } from 'react-native';
import { User, UserRole, AdminUser } from '../types/index';
import { AuthService } from '../services/auth.service';
import { supabase } from '../lib/supabaseClient';
import { handleError } from '../utils/errorHandler';
import { ErrorSeverity } from '../utils/errorLogger';
import { clearInvalidAuthSession, isInvalidRefreshTokenError } from '../utils/authSessionErrors';
import { parseRecoveryTokensFromUrl } from '../utils/authDeepLink';
import { ERROR_MESSAGES } from '../constants/config';

/** Returns true if the error is a network failure (e.g. device can't reach Supabase). */
function isNetworkFailure(error: unknown): boolean {
  if (error instanceof TypeError && error.message === 'Network request failed') return true;
  const msg = error && typeof (error as Error).message === 'string' ? (error as Error).message : '';
  return msg.includes('Network request failed') || msg.includes('network') || msg.includes('fetch failed');
}

async function userHasAdminRole(userId: string): Promise<boolean> {
  const { data: roles, error } = await supabase
    .from('user_roles')
    .select('role')
    .eq('user_id', userId);

  if (error || !roles) return false;
  return roles.some((r: { role: string }) => r.role === 'admin');
}

let recoveryLinkSubscription: { remove: () => void } | null = null;

/**
 * Authentication store state interface
 */
interface AuthState {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  needsPasswordReset: boolean;
  unsubscribeAuth: (() => void) | null;
  pendingLoginRole: UserRole | null;
  login: (email: string, password: string) => Promise<void>;
  loginWithRole: (email: string, role: UserRole) => Promise<void>;
  loginWithCredentialsAndRole: (email: string, password: string, role: UserRole) => Promise<void>;
  setPendingLoginRole: (role: UserRole | null) => void;
  register: (
    email: string,
    password: string,
    name: string,
    role: UserRole,
    phone: string,
    businessName?: string
  ) => Promise<{ requiresEmailConfirmation?: boolean }>;
  logout: () => Promise<void>;
  updateUser: (updates: Partial<User>) => Promise<void>;
  setUser: (user: User | null) => void;
  setLoading: (loading: boolean) => void;
  initializeAuth: () => Promise<void>;
  subscribeToAuthChanges: () => void;
  unsubscribeFromAuthChanges: () => void;
  requestPasswordReset: (email: string) => Promise<void>;
  completePasswordReset: (newPassword: string) => Promise<void>;
  changePassword: (currentPassword: string, newPassword: string) => Promise<void>;
  clearNeedsPasswordReset: () => void;
  applyRecoverySessionFromUrl: (url: string) => Promise<boolean>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  isLoading: false,
  isAuthenticated: false,
  needsPasswordReset: false,
  unsubscribeAuth: null,
  pendingLoginRole: null,

  clearNeedsPasswordReset: () => {
    set({ needsPasswordReset: false });
  },

  applyRecoverySessionFromUrl: async (url: string) => {
    const tokens = parseRecoveryTokensFromUrl(url);
    if (!tokens) return false;

    const { error: sessionError } = await supabase.auth.setSession({
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token,
    });

    if (sessionError) {
      await supabase.auth.signOut();
      return false;
    }

    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) return false;

    const isAdmin = await userHasAdminRole(session.user.id);
    if (!isAdmin) {
      await supabase.auth.signOut();
      set({
        user: null,
        isAuthenticated: false,
        needsPasswordReset: false,
        pendingLoginRole: null,
      });
      throw new Error(ERROR_MESSAGES.auth.passwordResetNotAdmin);
    }

    set({
      user: null,
      isAuthenticated: false,
      needsPasswordReset: true,
      pendingLoginRole: null,
    });
    return true;
  },

  requestPasswordReset: async (email: string) => {
    set({ isLoading: true });
    try {
      const result = await AuthService.requestPasswordReset(email);
      if (!result.success) {
        throw new Error(result.error || 'Failed to send reset email');
      }
    } finally {
      set({ isLoading: false });
    }
  },

  completePasswordReset: async (newPassword: string) => {
    set({ isLoading: true });
    try {
      const result = await AuthService.completePasswordReset(newPassword);
      if (!result.success) {
        throw new Error(result.error || 'Failed to reset password');
      }
      set({
        user: null,
        isAuthenticated: false,
        needsPasswordReset: false,
        pendingLoginRole: null,
      });
    } finally {
      set({ isLoading: false });
    }
  },

  changePassword: async (currentPassword: string, newPassword: string) => {
    set({ isLoading: true });
    try {
      const result = await AuthService.changeOwnPassword(currentPassword, newPassword);
      if (!result.success) {
        throw new Error(result.error || 'Failed to change password');
      }
    } finally {
      set({ isLoading: false });
    }
  },

  initializeAuth: async () => {
    set({ isLoading: true });
    try {
      await AuthService.initializeApp();

      let session = null;
      try {
        const result = await supabase.auth.getSession();
        if (result.error && isInvalidRefreshTokenError(result.error)) {
          await clearInvalidAuthSession();
          set({ user: null, isAuthenticated: false, isLoading: false, needsPasswordReset: false });
          get().subscribeToAuthChanges();
          return;
        }
        session = result.data?.session ?? null;
      } catch (sessionError) {
        if (isInvalidRefreshTokenError(sessionError)) {
          await clearInvalidAuthSession();
          set({ user: null, isAuthenticated: false, isLoading: false, needsPasswordReset: false });
          get().subscribeToAuthChanges();
          return;
        }
        if (isNetworkFailure(sessionError)) {
          set({ user: null, isAuthenticated: false, isLoading: false });
          get().subscribeToAuthChanges();
          return;
        }
        throw sessionError;
      }

      if (!session?.user) {
        try {
          const initialUrl = await Linking.getInitialURL();
          if (initialUrl) {
            await get().applyRecoverySessionFromUrl(initialUrl);
          }
        } catch (recoveryError) {
          handleError(recoveryError, {
            context: { operation: 'initializeAuth.recoveryLink' },
            userFacing: false,
            severity: ErrorSeverity.LOW,
          });
        }
      }

      if (get().needsPasswordReset) {
        set({ isLoading: false });
        get().subscribeToAuthChanges();
        return;
      }

      if (session?.user) {
        let userData = null;
        try {
          userData = await AuthService.getCurrentUserData(session.user.id);
        } catch (userError) {
          if (isNetworkFailure(userError)) {
            set({ user: null, isAuthenticated: false, isLoading: false });
            get().subscribeToAuthChanges();
            return;
          }
          throw userError;
        }
        if (userData === null) {
          await supabase.auth.signOut();
        }
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

      get().subscribeToAuthChanges();
    } catch (error) {
      if (isNetworkFailure(error)) {
        set({ user: null, isAuthenticated: false, isLoading: false });
        get().subscribeToAuthChanges();
        return;
      }
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
          set({ isLoading: false });
          throw new Error('ROLE_SELECTION_REQUIRED');
        } else if (result.user) {
          set({
            user: result.user,
            isAuthenticated: true,
            isLoading: false,
            needsPasswordReset: false,
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
    set({ isLoading: true, pendingLoginRole: role });
    try {
      const result = await AuthService.loginWithRole(email, role);
      if (result.success && result.user) {
        set({
          user: result.user,
          isAuthenticated: true,
          isLoading: false,
          pendingLoginRole: null,
          needsPasswordReset: false,
        });
      } else {
        set({ isLoading: false, pendingLoginRole: null });
        throw new Error(result.error || 'Login failed');
      }
    } catch (error) {
      handleError(error, {
        context: { operation: 'loginWithRole', email, role },
        userFacing: false,
        severity: ErrorSeverity.MEDIUM,
      });
      set({ isLoading: false, pendingLoginRole: null });
      throw error;
    }
  },

  loginWithCredentialsAndRole: async (email: string, password: string, role: UserRole) => {
    set({ isLoading: true, pendingLoginRole: role });
    try {
      const result = await AuthService.login(email, password, role);
      if (result.success && result.user) {
        set({
          user: result.user,
          isAuthenticated: true,
          isLoading: false,
          pendingLoginRole: null,
          needsPasswordReset: false,
        });
      } else {
        await AuthService.logout();
        set({ isLoading: false, pendingLoginRole: null });
        throw new Error(result.error || 'Login failed');
      }
    } catch (error) {
      try {
        await AuthService.logout();
      } catch {
        /* ignore */
      }
      handleError(error, {
        context: { operation: 'loginWithCredentialsAndRole', email, role },
        userFacing: false,
        severity: ErrorSeverity.MEDIUM,
      });
      set({ isLoading: false, pendingLoginRole: null });
      throw error;
    }
  },

  setPendingLoginRole: (role: UserRole | null) => {
    set({ pendingLoginRole: role });
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
        (additionalData as Partial<AdminUser>).businessName = businessName;
      }
      const result = await AuthService.register(email, password, name, role, additionalData);
      if (result.requiresEmailConfirmation) {
        set({ isLoading: false });
        return { requiresEmailConfirmation: true };
      }
      if (result.success && result.user) {
        set({
          user: result.user,
          isAuthenticated: true,
          isLoading: false,
        });
        return {};
      }
      set({ isLoading: false });
      throw new Error(result.error || 'Registration failed');
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
        needsPasswordReset: false,
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
    if (unsubscribeAuth) {
      unsubscribeAuth();
    }

    if (recoveryLinkSubscription) {
      recoveryLinkSubscription.remove();
    }

    recoveryLinkSubscription = Linking.addEventListener('url', ({ url }) => {
      get()
        .applyRecoverySessionFromUrl(url)
        .catch((err) => {
          handleError(err, {
            context: { operation: 'recoveryDeepLink' },
            userFacing: false,
            severity: ErrorSeverity.LOW,
          });
        });
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event: string, session: { user: { id: string } } | null) => {
        if (event === 'PASSWORD_RECOVERY' && session?.user) {
          const isAdmin = await userHasAdminRole(session.user.id);
          if (!isAdmin) {
            await supabase.auth.signOut();
            set({
              user: null,
              isAuthenticated: false,
              needsPasswordReset: false,
              pendingLoginRole: null,
            });
            return;
          }
          set({
            user: null,
            isAuthenticated: false,
            needsPasswordReset: true,
            pendingLoginRole: null,
          });
          return;
        }

        const fetchAndSetUser = async (userId: string) => {
          if (get().needsPasswordReset) return;
          try {
            const userData = await AuthService.getCurrentUserData(userId);
            if (userData) set({ user: userData, isAuthenticated: true });
          } catch (err) {
            if (!isNetworkFailure(err)) {
              handleError(err, {
                context: { operation: 'onAuthStateChange' },
                userFacing: false,
                severity: ErrorSeverity.MEDIUM,
              });
            }
          }
        };

        if (event === 'SIGNED_IN' && session?.user) {
          const { pendingLoginRole, user: currentUser, needsPasswordReset } = get();
          if (needsPasswordReset || pendingLoginRole || currentUser) return;
          await fetchAndSetUser(session.user.id);
        } else if (event === 'SIGNED_OUT') {
          set({ user: null, isAuthenticated: false, pendingLoginRole: null });
        } else if (event === 'TOKEN_REFRESHED' && session?.user) {
          const { pendingLoginRole, needsPasswordReset } = get();
          if (needsPasswordReset || pendingLoginRole) return;
          await fetchAndSetUser(session.user.id);
        }
      }
    );

    set({
      unsubscribeAuth: () => {
        subscription.unsubscribe();
        if (recoveryLinkSubscription) {
          recoveryLinkSubscription.remove();
          recoveryLinkSubscription = null;
        }
      },
    });
  },

  unsubscribeFromAuthChanges: () => {
    const { unsubscribeAuth } = get();
    if (unsubscribeAuth) {
      unsubscribeAuth();
      set({ unsubscribeAuth: null });
    }
  },
}));
