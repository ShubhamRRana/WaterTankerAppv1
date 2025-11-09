import { create } from 'zustand';
import { User, UserRole } from '../types';
import { LocalStorageService } from '../services/localStorage';

interface UserState {
  users: User[];
  selectedUser: User | null;
  isLoading: boolean;
  error: string | null;
  
  // Actions
  fetchAllUsers: () => Promise<void>;
  fetchUsersByRole: (role: UserRole) => Promise<void>;
  addUser: (userData: Omit<User, 'uid' | 'createdAt'>) => Promise<void>;
  updateUser: (userId: string, updates: Partial<User>) => Promise<void>;
  deleteUser: (userId: string) => Promise<void>;
  setSelectedUser: (user: User | null) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  clearError: () => void;
}

export const useUserStore = create<UserState>((set, get) => ({
  users: [],
  selectedUser: null,
  isLoading: false,
  error: null,

  fetchAllUsers: async () => {
    set({ isLoading: true, error: null });
    try {
      const users = await LocalStorageService.getUsers();
      set({ users, isLoading: false });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to fetch users';
      set({ isLoading: false, error: errorMessage });
      throw error;
    }
  },

  fetchUsersByRole: async (role) => {
    set({ isLoading: true, error: null });
    try {
      const allUsers = await LocalStorageService.getUsers();
      const users = allUsers.filter(user => user.role === role);
      set({ users, isLoading: false });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to fetch users by role';
      set({ isLoading: false, error: errorMessage });
      throw error;
    }
  },

  addUser: async (userData) => {
    set({ isLoading: true, error: null });
    try {
      const newUser: User = {
        ...userData,
        uid: LocalStorageService.generateId(),
        createdAt: new Date(),
      };
      
      await LocalStorageService.saveUserToCollection(newUser);
      
      // Update local state
      const { users } = get();
      set({ users: [...users, newUser], isLoading: false });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to add user';
      set({ isLoading: false, error: errorMessage });
      throw error;
    }
  },

  updateUser: async (userId, updates) => {
    set({ isLoading: true, error: null });
    try {
      await LocalStorageService.updateUserProfile(userId, updates);
      
      // Update local state
      const { users } = get();
      const updatedUsers = users.map(user =>
        user.uid === userId ? { ...user, ...updates } : user
      );
      set({ users: updatedUsers, isLoading: false });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to update user';
      set({ isLoading: false, error: errorMessage });
      throw error;
    }
  },

  deleteUser: async (userId) => {
    set({ isLoading: true, error: null });
    try {
      const users = await LocalStorageService.getUsers();
      const updatedUsers = users.filter(user => user.uid !== userId);
      await LocalStorageService.setItem('users_collection', updatedUsers);
      
      // Update local state
      set({ 
        users: updatedUsers, 
        selectedUser: get().selectedUser?.uid === userId ? null : get().selectedUser,
        isLoading: false 
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to delete user';
      set({ isLoading: false, error: errorMessage });
      throw error;
    }
  },

  setSelectedUser: (user) => {
    set({ selectedUser: user });
  },

  setLoading: (loading) => {
    set({ isLoading: loading });
  },

  setError: (error) => {
    set({ error });
  },

  clearError: () => {
    set({ error: null });
  },
}));
