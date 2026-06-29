/**
 * ScrollUniversity User Management Routes
 * "Let every scroll son be properly registered in the kingdom database"
 */

import express from 'express';
import { UserRole } from '@prisma/client';
import { userManagementService } from '../../../src/services/UserManagementService';
import { authMiddleware, requireRole, requireScrollAlignment } from '../middleware/auth';
import { logger } from '../utils/logger';

const router = express.Router();

/**
 * POST /api/users/register
 * Register a new user account
 */
router.post('/register', async (req, res) => {
  try {
    const userData = req.body;
    const user = await userManagementService.createUser(userData);
    
    logger.info(`New ScrollStudent registered: ${user.email}`);
    
    res.status(201).json({
      success: true,
      message: 'Welcome to ScrollUniversity! Your kingdom journey begins now.',
      user,
      scrollMessage: 'The scroll has been opened for you. Walk worthy of your calling.'
    });
  } catch (error) {
    logger.error('User registration error:', error);
    res.status(400).json({
      success: false,
      error: error instanceof Error ? error.message : 'Registration failed',
      scrollMessage: 'The kingdom gates require proper preparation. Please review your submission.'
    });
  }
});

/**
 * POST /api/users/login
 * Authenticate user and return JWT token
 */
router.post('/login', async (req, res) => {
  try {
    const loginData = req.body;
    const result = await userManagementService.loginUser(loginData);
    
    logger.info(`ScrollStudent logged in: ${result.user.email}`);
    
    res.json({
      success: true,
      message: 'Welcome back to ScrollUniversity!',
      user: result.user,
      token: result.token,
      scrollMessage: 'The scroll recognizes you. Continue your kingdom journey.'
    });
  } catch (error) {
    logger.error('User login error:', error);
    res.status(401).json({
      success: false,
      error: error instanceof Error ? error.message : 'Login failed',
      scrollMessage: 'The kingdom gates remain closed. Verify your credentials.'
    });
  }
});

/**
 * GET /api/users/profile
 * Get current user's profile
 */
router.get('/profile', authMiddleware, async (req, res) => {
  try {
    const user = await userManagementService.getUserProfile(req.user!.id);
    
    res.json({
      success: true,
      user,
      scrollMessage: 'Your scroll profile reflects your kingdom journey.'
    });
  } catch (error) {
    logger.error('Get profile error:', error);
    res.status(404).json({
      success: false,
      error: error instanceof Error ? error.message : 'Profile not found',
      scrollMessage: 'Your scroll record could not be retrieved.'
    });
  }
});

/**
 * PUT /api/users/profile
 * Update current user's profile
 */
router.put('/profile', authMiddleware, async (req, res) => {
  try {
    const updateData = req.body;
    const user = await userManagementService.updateUserProfile(req.user!.id, updateData);
    
    logger.info(`ScrollStudent profile updated: ${user.email}`);
    
    res.json({
      success: true,
      message: 'Profile updated successfully',
      user,
      scrollMessage: 'Your scroll record has been updated in the kingdom database.'
    });
  } catch (error) {
    logger.error('Update profile error:', error);
    res.status(400).json({
      success: false,
      error: error instanceof Error ? error.message : 'Profile update failed',
      scrollMessage: 'The scroll could not be updated. Please review your changes.'
    });
  }
});

/**
 * PUT /api/users/spiritual-formation
 * Update spiritual formation metrics
 */
router.put('/spiritual-formation', authMiddleware, async (req, res) => {
  try {
    const spiritualData = req.body;
    const user = await userManagementService.updateSpiritualFormation(req.user!.id, spiritualData);
    
    logger.info(`Spiritual formation updated for: ${user.email}`);
    
    res.json({
      success: true,
      message: 'Spiritual formation updated successfully',
      user,
      scrollMessage: 'Your spiritual growth has been recorded in the heavenly ledger.'
    });
  } catch (error) {
    logger.error('Spiritual formation update error:', error);
    res.status(400).json({
      success: false,
      error: error instanceof Error ? error.message : 'Spiritual formation update failed',
      scrollMessage: 'The spiritual metrics could not be updated. Seek divine guidance.'
    });
  }
});

/**
 * GET /api/users/dashboard
 * Get user dashboard with statistics
 */
router.get('/dashboard', authMiddleware, async (req, res) => {
  try {
    const dashboard = await userManagementService.getUserDashboard(req.user!.id);
    
    res.json({
      success: true,
      dashboard,
      scrollMessage: 'Behold your kingdom progress and divine assignments.'
    });
  } catch (error) {
    logger.error('Dashboard error:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Dashboard loading failed',
      scrollMessage: 'The kingdom dashboard could not be displayed.'
    });
  }
});

/**
 * GET /api/users/search
 * Search users (admin/faculty only)
 */
router.get('/search', 
  authMiddleware, 
  requireRole([UserRole.ADMIN, UserRole.FACULTY, UserRole.CHANCELLOR]),
  async (req, res) => {
    try {
      const { q: query, page = '1', limit = '20' } = req.query;
      
      if (!query || typeof query !== 'string') {
        return res.status(400).json({
          success: false,
          error: 'Search query is required',
          scrollMessage: 'Provide a search term to find scroll students.'
        });
      }
      
      const result = await userManagementService.searchUsers(
        query,
        parseInt(page as string),
        parseInt(limit as string)
      );
      
      res.json({
        success: true,
        ...result,
        scrollMessage: `Found ${result.total} scroll students matching your search.`
      });
    } catch (error) {
      logger.error('User search error:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Search failed',
        scrollMessage: 'The kingdom database search encountered an error.'
      });
    }
  }
);

/**
 * GET /api/users/role/:role
 * Get users by role (admin only)
 */
router.get('/role/:role',
  authMiddleware,
  requireRole([UserRole.ADMIN, UserRole.CHANCELLOR]),
  async (req, res) => {
    try {
      const { role } = req.params;
      const { page = '1', limit = '20' } = req.query;
      
      // Validate role
      if (!Object.values(UserRole).includes(role as UserRole)) {
        return res.status(400).json({
          success: false,
          error: 'Invalid role specified',
          scrollMessage: 'The specified kingdom role does not exist.'
        });
      }
      
      const result = await userManagementService.getUsersByRole(
        role as UserRole,
        parseInt(page as string),
        parseInt(limit as string)
      );
      
      res.json({
        success: true,
        ...result,
        scrollMessage: `Retrieved ${result.total} scroll students with ${role} authority.`
      });
    } catch (error) {
      logger.error('Get users by role error:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to retrieve users',
        scrollMessage: 'The kingdom role query encountered an error.'
      });
    }
  }
);

/**
 * PUT /api/users/:userId/role
 * Update user role (admin only)
 */
router.put('/:userId/role',
  authMiddleware,
  requireRole([UserRole.ADMIN, UserRole.CHANCELLOR]),
  async (req, res) => {
    try {
      const { userId } = req.params;
      const { role } = req.body;
      
      if (!Object.values(UserRole).includes(role)) {
        return res.status(400).json({
          success: false,
          error: 'Invalid role specified',
          scrollMessage: 'The specified kingdom role does not exist.'
        });
      }
      
      const user = await userManagementService.updateUserRole(userId, role, req.user!.id);
      
      logger.info(`User role updated: ${user.email} -> ${role} by ${req.user!.email}`);
      
      res.json({
        success: true,
        message: 'User role updated successfully',
        user,
        scrollMessage: `Kingdom authority has been granted: ${role}`
      });
    } catch (error) {
      logger.error('Update user role error:', error);
      res.status(400).json({
        success: false,
        error: error instanceof Error ? error.message : 'Role update failed',
        scrollMessage: 'The kingdom authority could not be updated.'
      });
    }
  }
);

/**
 * PUT /api/users/:userId/status
 * Update user enrollment status (admin only)
 */
router.put('/:userId/status',
  authMiddleware,
  requireRole([UserRole.ADMIN, UserRole.CHANCELLOR]),
  async (req, res) => {
    try {
      const { userId } = req.params;
      const { status } = req.body;
      
      const user = await userManagementService.updateUserStatus(userId, status, req.user!.id);
      
      logger.info(`User status updated: ${user.email} -> ${status} by ${req.user!.email}`);
      
      res.json({
        success: true,
        message: 'User status updated successfully',
        user,
        scrollMessage: `Enrollment status updated: ${status}`
      });
    } catch (error) {
      logger.error('Update user status error:', error);
      res.status(400).json({
        success: false,
        error: error instanceof Error ? error.message : 'Status update failed',
        scrollMessage: 'The enrollment status could not be updated.'
      });
    }
  }
);

/**
 * GET /api/users/:userId
 * Get specific user profile (admin/faculty only)
 */
router.get('/:userId',
  authMiddleware,
  requireRole([UserRole.ADMIN, UserRole.FACULTY, UserRole.CHANCELLOR]),
  async (req, res) => {
    try {
      const { userId } = req.params;
      const user = await userManagementService.getUserProfile(userId);
      
      res.json({
        success: true,
        user,
        scrollMessage: 'ScrollStudent profile retrieved from kingdom database.'
      });
    } catch (error) {
      logger.error('Get user profile error:', error);
      res.status(404).json({
        success: false,
        error: error instanceof Error ? error.message : 'User not found',
        scrollMessage: 'The requested scroll student could not be found.'
      });
    }
  }
);

export default router;