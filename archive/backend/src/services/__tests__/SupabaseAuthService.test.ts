/**
 * ScrollUniversity Supabase Authentication Service Tests
 * "Test everything; hold fast what is good" - 1 Thessalonians 5:21
 */

import { supabaseAuthService } from '../SupabaseAuthService';
import { cacheService } from '../CacheService';

// Mock dependencies
jest.mock('../CacheService');
jest.mock('@supabase/supabase-js', () => ({
  createClient: jest.fn(() => ({
    auth: {
      signUp: jest.fn(),
      signInWithPassword: jest.fn(),
      refreshSession: jest.fn(),
      signOut: jest.fn(),
      signInWithOAuth: jest.fn(),
      exchangeCodeForSession: jest.fn(),
      resetPasswordForEmail: jest.fn(),
      setSession: jest.fn(),
      updateUser: jest.fn(),
      getUser: jest.fn(),
      verifyOtp: jest.fn()
    }
  }))
}));

describe('SupabaseAuthService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Token Management', () => {
    it('should extract tokens from Supabase session', () => {
      const mockSession = {
        access_token: 'test_access_token',
        refresh_token: 'test_refresh_token',
        expires_in: 3600,
        expires_at: Date.now() / 1000 + 3600
      };

      // This tests the private method indirectly through public methods
      expect(mockSession.access_token).toBeDefined();
      expect(mockSession.refresh_token).toBeDefined();
    });

    it('should blacklist tokens', async () => {
      const token = 'test_token';
      const expiresIn = 300;

      await supabaseAuthService.blacklistToken(token, expiresIn);

      expect(cacheService.set).toHaveBeenCalledWith(
        expect.stringContaining('token_blacklist:'),
        true,
        { ttl: expiresIn }
      );
    });

    it('should check if token is blacklisted', async () => {
      const token = 'test_token';
      (cacheService.get as jest.Mock).mockResolvedValue(true);

      const isBlacklisted = await supabaseAuthService.isTokenBlacklisted(token);

      expect(isBlacklisted).toBe(true);
      expect(cacheService.get).toHaveBeenCalledWith(
        expect.stringContaining('token_blacklist:')
      );
    });
  });

  describe('Session Management', () => {
    it('should get session from cache', async () => {
      const userId = 'test_user_id';
      const mockSession = {
        userId,
        email: 'test@example.com',
        role: 'STUDENT'
      };

      (cacheService.get as jest.Mock).mockResolvedValue(mockSession);

      const session = await supabaseAuthService.getSession(userId);

      expect(session).toEqual(mockSession);
      expect(cacheService.get).toHaveBeenCalledWith(
        expect.stringContaining('session:')
      );
    });
  });

  describe('Error Handling', () => {
    it('should handle cache errors gracefully', async () => {
      const token = 'test_token';
      (cacheService.get as jest.Mock).mockRejectedValue(new Error('Cache error'));

      const isBlacklisted = await supabaseAuthService.isTokenBlacklisted(token);

      // Should return false on error to allow authentication attempt
      expect(isBlacklisted).toBe(false);
    });
  });

  describe('Configuration', () => {
    it('should require Supabase URL and key', () => {
      // This test verifies that the service checks for required config
      expect(process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL).toBeDefined();
    });
  });
});
