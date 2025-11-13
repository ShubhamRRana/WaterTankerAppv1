import { AuthService } from '../auth.service';
import { supabase } from '../supabase';
import { UserRole } from '../../types';
import { rateLimiter } from '../../utils/rateLimiter';
import { securityLogger } from '../../utils/securityLogger';

// Mock dependencies
jest.mock('../supabase');
jest.mock('../../utils/rateLimiter');
jest.mock('../../utils/securityLogger');

const mockSupabase = supabase as jest.Mocked<typeof supabase>;

describe('AuthService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (rateLimiter.isAllowed as jest.Mock).mockReturnValue({ allowed: true, remaining: 5, resetTime: Date.now() + 900000 });
  });

  describe('register', () => {
    it('should successfully register a new customer', async () => {
      const mockUser = {
        id: 'user-123',
        email: 'phone_9876543210@watertanker.app',
        phone: '9876543210'
      };

      const mockProfile = {
        id: 'user-123',
        auth_id: 'user-123',
        phone: '9876543210',
        name: 'Test User',
        role: 'customer'
      };

      // Mock: First call checks for existing users (returns empty array)
      // Second call checks existing user by auth_id (returns null - user doesn't exist yet)
      // Third call inserts user (returns inserted data)
      let callCount = 0;
      mockSupabase.from.mockImplementation(() => {
        if (callCount === 0) {
          // First call: check existing users (phone and role)
          callCount++;
          let eqCallCount = 0;
          return {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockImplementation(() => {
              eqCallCount++;
              if (eqCallCount === 1) {
                // First eq() call (for phone) - return object with another eq()
                return {
                  eq: jest.fn().mockResolvedValue({
                    data: [],
                    error: null
                  })
                };
              }
              // This shouldn't be reached, but just in case
              return Promise.resolve({ data: [], error: null });
            })
          } as any;
        } else if (callCount === 1) {
          // Second call: check existing user by auth_id (maybeSingle)
          callCount++;
          return {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            maybeSingle: jest.fn().mockResolvedValue({
              data: null,
              error: null
            })
          } as any;
        } else if (callCount === 2) {
          // Third call: insert user with select and single
          callCount++;
          return {
            insert: jest.fn().mockReturnThis(),
            select: jest.fn().mockReturnThis(),
            single: jest.fn().mockResolvedValue({
              data: mockProfile,
              error: null
            })
          } as any;
        } else {
          // Any additional calls: fetch created user (auth_id) - fallback
          return {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            maybeSingle: jest.fn().mockResolvedValue({
              data: mockProfile,
              error: null
            })
          } as any;
        }
      });

      (mockSupabase.auth.signUp as jest.Mock).mockResolvedValue({
        data: { user: mockUser as any, session: null },
        error: null
      });

      (mockSupabase.auth.getSession as jest.Mock).mockResolvedValue({
        data: { session: null },
        error: null
      });

      const result = await AuthService.register('9876543210', 'password123', 'Test User', 'customer');

      expect(result.success).toBe(true);
      expect(result.user).toBeDefined();
      expect(mockSupabase.auth.signUp).toHaveBeenCalled();
    });

    it('should reject driver registration without admin creation', async () => {
      const result = await AuthService.register('9876543210', 'password123', 'Test Driver', 'driver');

      expect(result.success).toBe(false);
      expect(result.error).toContain('admin');
      expect(mockSupabase.auth.signUp).not.toHaveBeenCalled();
    });

    it('should allow driver registration when createdByAdmin is true', async () => {
      const mockUser = {
        id: 'user-123',
        email: 'phone_9876543210@watertanker.app',
        phone: '9876543210'
      };

      const mockProfile = {
        id: 'user-123',
        auth_id: 'user-123',
        phone: '9876543210',
        name: 'Test Driver',
        role: 'driver',
        created_by_admin: true
      };

      // Mock: First call checks for existing users (returns empty array)
      // Second call checks existing user by auth_id (returns null - user doesn't exist yet)
      // Third call inserts user (returns inserted data)
      let callCount = 0;
      mockSupabase.from.mockImplementation(() => {
        if (callCount === 0) {
          // First call: check existing users (phone and role)
          callCount++;
          let eqCallCount = 0;
          return {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockImplementation(() => {
              eqCallCount++;
              if (eqCallCount === 1) {
                // First eq() call (for phone) - return object with another eq()
                return {
                  eq: jest.fn().mockResolvedValue({
                    data: [],
                    error: null
                  })
                };
              }
              // This shouldn't be reached, but just in case
              return Promise.resolve({ data: [], error: null });
            })
          } as any;
        } else if (callCount === 1) {
          // Second call: check existing user by auth_id (maybeSingle)
          callCount++;
          return {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            maybeSingle: jest.fn().mockResolvedValue({
              data: null,
              error: null
            })
          } as any;
        } else if (callCount === 2) {
          // Third call: insert user with select and single
          callCount++;
          return {
            insert: jest.fn().mockReturnThis(),
            select: jest.fn().mockReturnThis(),
            single: jest.fn().mockResolvedValue({
              data: mockProfile,
              error: null
            })
          } as any;
        } else {
          // Any additional calls: fetch created user (auth_id) - fallback
          return {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            maybeSingle: jest.fn().mockResolvedValue({
              data: mockProfile,
              error: null
            })
          } as any;
        }
      });

      (mockSupabase.auth.signUp as jest.Mock).mockResolvedValue({
        data: { user: mockUser as any, session: null },
        error: null
      });

      (mockSupabase.auth.getSession as jest.Mock).mockResolvedValue({
        data: { session: null },
        error: null
      });

      const result = await AuthService.register(
        '9876543210',
        'password123',
        'Test Driver',
        'driver',
        { createdByAdmin: true }
      );

      expect(result.success).toBe(true);
    });

    it('should check rate limit before registration', async () => {
      (rateLimiter.isAllowed as jest.Mock).mockReturnValue({
        allowed: false,
        remaining: 0,
        resetTime: Date.now() + 3600000
      });

      const result = await AuthService.register('9876543210', 'password123', 'Test User', 'customer');

      expect(result.success).toBe(false);
      expect(result.error).toContain('Too many');
      expect(mockSupabase.auth.signUp).not.toHaveBeenCalled();
    });

    it('should sanitize inputs before processing', async () => {
      const mockUser = {
        id: 'user-123',
        email: '9876543210@watertanker.temp'
      };

      const mockProfile = {
        id: 'user-123',
        auth_id: 'user-123',
        phone: '9876543210',
        name: 'Test User',
        role: 'customer'
      };

      // Mock: First call checks for existing users (returns empty array)
      // Second call checks existing user by auth_id (returns null - user doesn't exist yet)
      // Third call inserts user (returns inserted data)
      let callCount = 0;
      mockSupabase.from.mockImplementation(() => {
        if (callCount === 0) {
          // First call: check existing users (phone and role)
          callCount++;
          let eqCallCount = 0;
          return {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockImplementation(() => {
              eqCallCount++;
              if (eqCallCount === 1) {
                // First eq() call (for phone) - return object with another eq()
                return {
                  eq: jest.fn().mockResolvedValue({
                    data: [],
                    error: null
                  })
                };
              }
              // This shouldn't be reached, but just in case
              return Promise.resolve({ data: [], error: null });
            })
          } as any;
        } else if (callCount === 1) {
          // Second call: check existing user by auth_id (maybeSingle)
          callCount++;
          return {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            maybeSingle: jest.fn().mockResolvedValue({
              data: null,
              error: null
            })
          } as any;
        } else if (callCount === 2) {
          // Third call: insert user with select and single
          callCount++;
          return {
            insert: jest.fn().mockReturnThis(),
            select: jest.fn().mockReturnThis(),
            single: jest.fn().mockResolvedValue({
              data: mockProfile,
              error: null
            })
          } as any;
        } else {
          // Any additional calls: fetch created user (auth_id) - fallback
          return {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            maybeSingle: jest.fn().mockResolvedValue({
              data: mockProfile,
              error: null
            })
          } as any;
        }
      });

      (mockSupabase.auth.signUp as jest.Mock).mockResolvedValue({
        data: { user: mockUser as any, session: null },
        error: null
      });

      (mockSupabase.auth.getSession as jest.Mock).mockResolvedValue({
        data: { session: null },
        error: null
      });

      await AuthService.register('+91 98765-43210', 'password123', '  Test User  ', 'customer');

      // Verify sanitized phone was used
      expect(mockSupabase.auth.signUp).toHaveBeenCalledWith(
        expect.objectContaining({
          email: expect.stringContaining('9876543210')
        })
      );
    });
  });

  describe('login', () => {
    it('should successfully login with valid credentials', async () => {
      const mockUser = {
        id: 'user-123',
        email: 'phone_9876543210@watertanker.app',
        phone: '9876543210'
      };

      const mockSession = {
        access_token: 'token',
        refresh_token: 'refresh',
        user: mockUser
      };

      const mockProfile = {
        id: 'user-123',
        auth_id: 'user-123',
        phone: '9876543210',
        name: 'Test User',
        role: 'customer'
      };

      // Mock: First query returns user profile, then signInWithPassword is called
      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockResolvedValue({
          data: [mockProfile],
          error: null
        })
      } as any);

      (mockSupabase.auth.signInWithPassword as jest.Mock).mockResolvedValue({
        data: { user: mockUser as any, session: mockSession as any },
        error: null
      });

      const result = await AuthService.login('9876543210', 'password123');

      expect(result.success).toBe(true);
      expect(result.user).toBeDefined();
      expect(mockSupabase.auth.signInWithPassword).toHaveBeenCalled();
    });

    it('should reject login with invalid credentials', async () => {
      const mockProfile = {
        id: 'user-123',
        auth_id: 'user-123',
        phone: '9876543210',
        name: 'Test User',
        role: 'customer'
      };

      // Mock: First query returns user profile
      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockResolvedValue({
          data: [mockProfile],
          error: null
        })
      } as any);

      (mockSupabase.auth.signInWithPassword as jest.Mock).mockResolvedValue({
        data: { user: null, session: null },
        error: { message: 'Invalid credentials', status: 400 } as any
      });

      const result = await AuthService.login('9876543210', 'wrongpassword');

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('should check rate limit before login', async () => {
      (rateLimiter.isAllowed as jest.Mock).mockReturnValue({
        allowed: false,
        remaining: 0,
        resetTime: Date.now() + 900000
      });

      const result = await AuthService.login('9876543210', 'password123');

      expect(result.success).toBe(false);
      expect(result.error).toContain('Too many');
    });

    it('should handle multi-role users', async () => {
      const mockProfiles = [
        { id: 'user-123', auth_id: 'user-123', phone: '9876543210', name: 'Test User', role: 'customer' },
        { id: 'user-123', auth_id: 'user-123', phone: '9876543210', name: 'Test User', role: 'driver', created_by_admin: true }
      ];

      // Mock: Query returns multiple profiles (multi-role user)
      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockResolvedValue({
          data: mockProfiles,
          error: null
        })
      } as any);

      // signInWithPassword should NOT be called for multi-role users
      // The service should return available roles without authenticating
      const result = await AuthService.login('9876543210', 'password123');

      expect(result.success).toBe(true);
      expect(result.requiresRoleSelection).toBe(true);
      expect(result.availableRoles).toBeDefined();
      expect(result.availableRoles?.length).toBe(2);
      expect(result.availableRoles).toContain('customer');
      expect(result.availableRoles).toContain('driver');
      expect(mockSupabase.auth.signInWithPassword).not.toHaveBeenCalled();
    });
  });

  describe('logout', () => {
    it('should successfully logout', async () => {
      (mockSupabase.auth.getUser as jest.Mock).mockResolvedValue({
        data: { user: { id: 'user-123' } as any },
        error: null
      });
      (mockSupabase.auth.signOut as jest.Mock).mockResolvedValue({ error: null });

      await AuthService.logout();

      expect(mockSupabase.auth.signOut).toHaveBeenCalled();
    });

    it('should handle logout errors', async () => {
      (mockSupabase.auth.getUser as jest.Mock).mockResolvedValue({
        data: { user: { id: 'user-123' } as any },
        error: null
      });
      (mockSupabase.auth.signOut as jest.Mock).mockResolvedValue({
        error: { message: 'Logout failed', status: 500 } as any
      });

      await expect(AuthService.logout()).rejects.toBeDefined();
    });
  });

  describe('getCurrentUserData', () => {
    it('should return current user data when session exists', async () => {
      const mockUser = {
        id: 'user-123',
        email: '9876543210@watertanker.temp'
      };

      const mockProfile = {
        id: 'user-123',
        auth_id: 'user-123',
        phone: '9876543210',
        name: 'Test User',
        role: 'customer'
      };

      (mockSupabase.auth.getUser as jest.Mock).mockResolvedValue({
        data: { user: mockUser as any },
        error: null
      });

      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: mockProfile,
          error: null
        })
      } as any);

      const result = await AuthService.getCurrentUserData();

      expect(result).toBeDefined();
      expect(result?.phone).toBe('9876543210');
    });

    it('should return null when no session exists', async () => {
      (mockSupabase.auth.getUser as jest.Mock).mockResolvedValue({
        data: { user: null },
        error: null
      });

      const result = await AuthService.getCurrentUserData();

      expect(result).toBeNull();
    });
  });
});

