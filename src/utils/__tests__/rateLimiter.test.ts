import { rateLimiter, RateLimitConfig } from '../rateLimiter';

describe('RateLimiter', () => {
  beforeEach(() => {
    rateLimiter.resetAll();
  });

  describe('isAllowed', () => {
    it('should allow first request', () => {
      const result = rateLimiter.isAllowed('login', 'user1');
      expect(result.allowed).toBe(true);
      expect(result.remaining).toBeGreaterThan(0);
    });

    it('should track requests per identifier', () => {
      rateLimiter.isAllowed('login', 'user1');
      rateLimiter.isAllowed('login', 'user2');
      
      const result1 = rateLimiter.isAllowed('login', 'user1');
      const result2 = rateLimiter.isAllowed('login', 'user2');
      
      expect(result1.remaining).toBeLessThan(5);
      expect(result2.remaining).toBeLessThan(5);
    });

    it('should block after max requests', () => {
      const maxRequests = 5;
      for (let i = 0; i < maxRequests; i++) {
        rateLimiter.isAllowed('login', 'user1');
      }
      
      const result = rateLimiter.isAllowed('login', 'user1');
      expect(result.allowed).toBe(false);
      expect(result.remaining).toBe(0);
    });

    it('should use custom config when provided', () => {
      const customConfig: RateLimitConfig = {
        maxRequests: 2,
        windowMs: 1000
      };
      
      rateLimiter.isAllowed('test', 'user1', customConfig);
      const result = rateLimiter.isAllowed('test', 'user1', customConfig);
      
      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(0);
    });

    it('should reset after window expires', (done) => {
      const customConfig: RateLimitConfig = {
        maxRequests: 1,
        windowMs: 100 // 100ms window
      };
      
      rateLimiter.isAllowed('test', 'user1', customConfig);
      
      setTimeout(() => {
        const result = rateLimiter.isAllowed('test', 'user1', customConfig);
        expect(result.allowed).toBe(true);
        expect(result.remaining).toBe(0); // 1 max - 1 used = 0 remaining
        done();
      }, 150);
    });
  });

  describe('record', () => {
    it('should increment counter for action', () => {
      rateLimiter.record('login', 'user1');
      const remaining = rateLimiter.getRemaining('login', 'user1');
      expect(remaining).toBeLessThan(5);
    });

    it('should create new entry if none exists', () => {
      rateLimiter.record('new_action', 'user1');
      const remaining = rateLimiter.getRemaining('new_action', 'user1');
      expect(remaining).toBeLessThan(5);
    });
  });

  describe('getRemaining', () => {
    it('should return max requests for new action', () => {
      const remaining = rateLimiter.getRemaining('login', 'user1');
      expect(remaining).toBe(5); // Default login limit
    });

    it('should return correct remaining after requests', () => {
      rateLimiter.isAllowed('login', 'user1');
      rateLimiter.isAllowed('login', 'user1');
      
      const remaining = rateLimiter.getRemaining('login', 'user1');
      expect(remaining).toBe(3); // 5 - 2 = 3
    });

    it('should return 0 when limit exceeded', () => {
      for (let i = 0; i < 5; i++) {
        rateLimiter.isAllowed('login', 'user1');
      }
      
      const remaining = rateLimiter.getRemaining('login', 'user1');
      expect(remaining).toBe(0);
    });
  });

  describe('getResetTime', () => {
    it('should return null for new action', () => {
      const resetTime = rateLimiter.getResetTime('login', 'user1');
      expect(resetTime).toBeNull();
    });

    it('should return future timestamp after request', () => {
      rateLimiter.isAllowed('login', 'user1');
      const resetTime = rateLimiter.getResetTime('login', 'user1');
      expect(resetTime).toBeGreaterThan(Date.now());
    });
  });

  describe('reset', () => {
    it('should reset rate limit for specific action and identifier', () => {
      rateLimiter.isAllowed('login', 'user1');
      rateLimiter.reset('login', 'user1');
      
      const remaining = rateLimiter.getRemaining('login', 'user1');
      expect(remaining).toBe(5);
    });

    it('should not affect other identifiers', () => {
      rateLimiter.isAllowed('login', 'user1');
      rateLimiter.isAllowed('login', 'user2');
      
      rateLimiter.reset('login', 'user1');
      
      const remaining1 = rateLimiter.getRemaining('login', 'user1');
      const remaining2 = rateLimiter.getRemaining('login', 'user2');
      
      expect(remaining1).toBe(5);
      expect(remaining2).toBeLessThan(5);
    });
  });

  describe('resetAll', () => {
    it('should reset all rate limits', () => {
      rateLimiter.isAllowed('login', 'user1');
      rateLimiter.isAllowed('register', 'user1');
      
      rateLimiter.resetAll();
      
      expect(rateLimiter.getRemaining('login', 'user1')).toBe(5);
      expect(rateLimiter.getRemaining('register', 'user1')).toBe(3);
    });
  });

  describe('setConfig and getConfig', () => {
    it('should set and retrieve custom config', () => {
      const customConfig: RateLimitConfig = {
        maxRequests: 10,
        windowMs: 60000
      };
      
      rateLimiter.setConfig('custom_action', customConfig);
      const retrieved = rateLimiter.getConfig('custom_action');
      
      expect(retrieved.maxRequests).toBe(10);
      expect(retrieved.windowMs).toBe(60000);
    });

    it('should return default config for unknown action', () => {
      const config = rateLimiter.getConfig('unknown_action');
      expect(config.maxRequests).toBe(5);
      expect(config.windowMs).toBe(15 * 60 * 1000);
    });
  });

  describe('cleanup', () => {
    it('should remove expired entries', () => {
      const customConfig: RateLimitConfig = {
        maxRequests: 1,
        windowMs: 50
      };
      
      rateLimiter.isAllowed('test', 'user1', customConfig);
      
      // Wait for window to expire
      setTimeout(() => {
        rateLimiter.cleanup();
        const activeLimits = rateLimiter.getActiveLimits();
        // Entry should be cleaned up
        expect(activeLimits.size).toBe(0);
      }, 100);
    });
  });

  describe('predefined configurations', () => {
    it('should have correct login limit', () => {
      const config = rateLimiter.getConfig('login');
      expect(config.maxRequests).toBe(5);
      expect(config.windowMs).toBe(15 * 60 * 1000);
    });

    it('should have correct register limit', () => {
      const config = rateLimiter.getConfig('register');
      expect(config.maxRequests).toBe(3);
      expect(config.windowMs).toBe(60 * 60 * 1000);
    });

    it('should have correct booking_create limit', () => {
      const config = rateLimiter.getConfig('booking_create');
      expect(config.maxRequests).toBe(10);
      expect(config.windowMs).toBe(60 * 60 * 1000);
    });
  });
});

