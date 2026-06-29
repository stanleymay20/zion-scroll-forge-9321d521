/**
 * Community Service Tests
 * "Test everything; hold fast what is good" - 1 Thessalonians 5:21
 */

import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import { PrismaClient } from '@prisma/client';
import CommunityService from '../CommunityService';
import { PostType, PostVisibility } from '../../types/community.types';

const prisma = new PrismaClient();

describe('CommunityService', () => {
  let testUserId: string;
  let testPostId: string;

  beforeAll(async () => {
    // Create a test user
    const user = await prisma.$queryRaw<any[]>`
      INSERT INTO users (email, username, password_hash, first_name, last_name, role)
      VALUES ('test@scrolluniversity.com', 'testuser', 'hashedpassword', 'Test', 'User', 'STUDENT')
      RETURNING id
    `;
    testUserId = user[0].id;
  });

  afterAll(async () => {
    // Clean up test data
    if (testPostId) {
      await prisma.$executeRaw`DELETE FROM posts WHERE id = ${testPostId}`;
    }
    if (testUserId) {
      await prisma.$executeRaw`DELETE FROM users WHERE id = ${testUserId}`;
    }
    await prisma.$disconnect();
  });

  describe('createPost', () => {
    it('should create a post successfully', async () => {
      const postData = {
        content: 'This is a test post #testing @testuser',
        type: PostType.TEXT,
        visibility: PostVisibility.PUBLIC
      };

      const post = await CommunityService.createPost(testUserId, postData);

      expect(post).toBeDefined();
      expect(post.content).toBe(postData.content);
      expect(post.authorId).toBe(testUserId);
      expect(post.hashtags).toContain('testing');
      expect(post.mentions).toContain('testuser');

      testPostId = post.id;
    });

    it('should extract hashtags from content', async () => {
      const postData = {
        content: 'Testing #hashtag1 and #hashtag2',
        type: PostType.TEXT
      };

      const post = await CommunityService.createPost(testUserId, postData);

      expect(post.hashtags).toContain('hashtag1');
      expect(post.hashtags).toContain('hashtag2');
      expect(post.hashtags.length).toBe(2);

      // Clean up
      await prisma.$executeRaw`DELETE FROM posts WHERE id = ${post.id}`;
    });
  });

  describe('getFeed', () => {
    it('should retrieve feed posts', async () => {
      const result = await CommunityService.getFeed(testUserId, {
        limit: 10,
        offset: 0
      });

      expect(result).toBeDefined();
      expect(result.posts).toBeInstanceOf(Array);
      expect(result.total).toBeGreaterThanOrEqual(0);
      expect(typeof result.hasMore).toBe('boolean');
    });

    it('should filter feed by post type', async () => {
      const result = await CommunityService.getFeed(testUserId, {
        type: PostType.TEXT,
        limit: 10,
        offset: 0
      });

      expect(result.posts.every(post => post.type === PostType.TEXT)).toBe(true);
    });
  });

  describe('searchPosts', () => {
    it('should search posts by content', async () => {
      const result = await CommunityService.searchPosts(testUserId, 'test', {
        limit: 10,
        offset: 0
      });

      expect(result).toBeDefined();
      expect(result.posts).toBeInstanceOf(Array);
      expect(result.total).toBeGreaterThanOrEqual(0);
    });
  });

  describe('updatePost', () => {
    it('should update a post successfully', async () => {
      if (!testPostId) {
        // Create a post first
        const postData = {
          content: 'Original content',
          type: PostType.TEXT
        };
        const post = await CommunityService.createPost(testUserId, postData);
        testPostId = post.id;
      }

      const updatedPost = await CommunityService.updatePost(testUserId, testPostId, {
        postId: testPostId,
        content: 'Updated content #updated'
      });

      expect(updatedPost.content).toBe('Updated content #updated');
      expect(updatedPost.isEdited).toBe(true);
      expect(updatedPost.hashtags).toContain('updated');
    });

    it('should throw error when updating non-existent post', async () => {
      await expect(
        CommunityService.updatePost(testUserId, 'non-existent-id', {
          postId: 'non-existent-id',
          content: 'Updated'
        })
      ).rejects.toThrow();
    });
  });
});
