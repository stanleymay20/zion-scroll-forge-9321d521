/**
 * Profile Service Tests
 * "Test everything; hold fast what is good" - 1 Thessalonians 5:21
 */

import { profileService } from '../ProfileService';
import { PrismaClient } from '@prisma/client';

// Get the mocked Prisma instance
const prisma = new PrismaClient();

describe('ProfileService', () => {
  let testUserId: string;

  beforeEach(() => {
    jest.clearAllMocks();
    testUserId = 'test-user-123';
  });

  describe('getProfile', () => {
    it('should retrieve user profile', async () => {
      const mockUser = {
        id: testUserId,
        email: 'profile.test@scrolluniversity.com',
        username: 'profiletest',
        firstName: 'Profile',
        lastName: 'Test',
        bio: null,
        avatarUrl: null,
        dateOfBirth: null,
        phoneNumber: null,
        location: null,
        role: 'STUDENT',
        academicLevel: 'SCROLL_OPEN',
        enrollmentStatus: 'ACTIVE',
        scrollCalling: null,
        spiritualGifts: [],
        kingdomVision: null,
        scrollAlignment: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
        lastLoginAt: null,
      };

      (prisma.user.findUnique as jest.Mock).mockResolvedValueOnce(mockUser);

      const profile = await profileService.getProfile(testUserId);

      expect(profile).toBeDefined();
      expect(profile.id).toBe(testUserId);
      expect(profile.email).toBe('profile.test@scrolluniversity.com');
      expect(profile.firstName).toBe('Profile');
      expect(profile.lastName).toBe('Test');
      expect(prisma.user.findUnique).toHaveBeenCalledWith({
        where: { id: testUserId },
        select: expect.any(Object),
      });
    });

    it('should throw error for non-existent user', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValueOnce(null);

      await expect(profileService.getProfile('non-existent-id')).rejects.toThrow('User not found');
    });
  });

  describe('updateProfile', () => {
    it('should update profile successfully', async () => {
      const updates = {
        bio: 'Test bio for profile',
        location: 'Test City',
        scrollCalling: 'To serve in the kingdom',
      };

      const updatedUser = {
        id: testUserId,
        email: 'profile.test@scrolluniversity.com',
        username: 'profiletest',
        firstName: 'Profile',
        lastName: 'Test',
        bio: updates.bio,
        avatarUrl: null,
        dateOfBirth: null,
        phoneNumber: null,
        location: updates.location,
        role: 'STUDENT',
        academicLevel: 'SCROLL_OPEN',
        enrollmentStatus: 'ACTIVE',
        scrollCalling: updates.scrollCalling,
        spiritualGifts: [],
        kingdomVision: null,
        scrollAlignment: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
        lastLoginAt: null,
      };

      (prisma.user.update as jest.Mock).mockResolvedValueOnce(updatedUser);

      const updatedProfile = await profileService.updateProfile(testUserId, updates);

      expect(updatedProfile.bio).toBe(updates.bio);
      expect(updatedProfile.location).toBe(updates.location);
      expect(updatedProfile.scrollCalling).toBe(updates.scrollCalling);
    });

    it('should validate profile updates', async () => {
      const invalidUpdates = {
        firstName: 'A', // Too short
      };

      await expect(profileService.updateProfile(testUserId, invalidUpdates)).rejects.toThrow();
    });
  });

  describe('getCompletionStatus', () => {
    it('should calculate completion percentage', async () => {
      const mockUser = {
        id: testUserId,
        firstName: 'Profile',
        lastName: 'Test',
        bio: 'Test bio',
        avatarUrl: 'http://example.com/avatar.jpg',
        dateOfBirth: new Date('1990-01-01'),
        phoneNumber: '+1234567890',
        location: 'Test City',
        scrollCalling: 'To serve',
        spiritualGifts: ['Teaching'],
        kingdomVision: 'To build the kingdom',
      };

      (prisma.user.findUnique as jest.Mock).mockResolvedValueOnce(mockUser);

      const status = await profileService.getCompletionStatus(testUserId);

      expect(status).toBeDefined();
      expect(status.userId).toBe(testUserId);
      expect(status.completionPercentage).toBeGreaterThanOrEqual(0);
      expect(status.completionPercentage).toBeLessThanOrEqual(100);
      expect(Array.isArray(status.missingFields)).toBe(true);
      expect(Array.isArray(status.recommendations)).toBe(true);
    });
  });

  describe('searchProfiles', () => {
    it('should search profiles by query', async () => {
      const mockResults = [
        {
          id: testUserId,
          email: 'profile.test@scrolluniversity.com',
          username: 'profiletest',
          firstName: 'Profile',
          lastName: 'Test',
          bio: null,
          avatarUrl: null,
          dateOfBirth: null,
          phoneNumber: null,
          location: null,
          role: 'STUDENT',
          academicLevel: 'SCROLL_OPEN',
          enrollmentStatus: 'ACTIVE',
          scrollCalling: null,
          spiritualGifts: [],
          kingdomVision: null,
          scrollAlignment: 0,
          createdAt: new Date(),
          updatedAt: new Date(),
          lastLoginAt: null,
        },
      ];

      (prisma.user.findMany as jest.Mock).mockResolvedValueOnce(mockResults);

      const results = await profileService.searchProfiles('Profile', 10);

      expect(Array.isArray(results)).toBe(true);
      expect(results.length).toBeGreaterThan(0);
      expect(results[0].firstName).toBe('Profile');
    });

    it('should return empty array for no matches', async () => {
      (prisma.user.findMany as jest.Mock).mockResolvedValueOnce([]);

      const results = await profileService.searchProfiles('NonExistentUser12345', 10);

      expect(Array.isArray(results)).toBe(true);
      expect(results.length).toBe(0);
    });
  });

  describe('getPublicProfile', () => {
    it('should return limited profile information', async () => {
      const mockPublicProfile = {
        id: testUserId,
        username: 'profiletest',
        firstName: 'Profile',
        lastName: 'Test',
        bio: null,
        avatarUrl: null,
        location: null,
        scrollCalling: null,
        spiritualGifts: [],
        scrollAlignment: 0,
        createdAt: new Date(),
      };

      (prisma.user.findUnique as jest.Mock).mockResolvedValueOnce(mockPublicProfile);

      const publicProfile = await profileService.getPublicProfile(testUserId);

      expect(publicProfile).toBeDefined();
      expect(publicProfile.id).toBe(testUserId);
      expect(publicProfile.username).toBeDefined();
      expect(publicProfile.firstName).toBeDefined();
      // Should not include sensitive information
      expect(publicProfile.email).toBeUndefined();
      expect(publicProfile.phoneNumber).toBeUndefined();
    });
  });
});
