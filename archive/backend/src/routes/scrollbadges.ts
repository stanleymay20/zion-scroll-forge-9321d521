/**
 * ScrollBadge API Routes
 * RESTful API endpoints for ScrollBadge NFT Certification System
 */

import express from 'express';
import { Request, Response } from 'express';
import { scrollBadgeSystem } from '../../../src/services/ScrollBadgeSystem';
import { BadgeMintRequest, BadgeType } from '../../../src/types/scrollbadge';
import { authMiddleware } from '../middleware/auth';
import { validateRequest } from '../middleware/validation';
import Joi from 'joi';

const router = express.Router();

// Validation schemas
const mintBadgeSchema = Joi.object({
  studentId: Joi.string().required(),
  courseId: Joi.string().required(),
  achievementData: Joi.object({
    completionDate: Joi.date().required(),
    finalGrade: Joi.number().min(0).max(100).required(),
    skillsAcquired: Joi.array().items(Joi.object({
      skillId: Joi.string().required(),
      name: Joi.string().required(),
      level: Joi.string().valid('novice', 'apprentice', 'practitioner', 'expert', 'master').required(),
      verifiedAt: Joi.date().required(),
      verifiedBy: Joi.string().required()
    })).required(),
    spiritualGrowth: Joi.object({
      spiritualGrowth: Joi.number().min(0).max(100).required(),
      kingdomAlignment: Joi.number().min(0).max(100).required(),
      propheticSensitivity: Joi.number().min(0).max(100).required(),
      characterDevelopment: Joi.number().min(0).max(100).required(),
      callingClarity: Joi.number().min(0).max(100).required()
    }).required(),
    projectsCompleted: Joi.array().items(Joi.string()),
    assessmentScores: Joi.array().items(Joi.object({
      assessmentId: Joi.string().required(),
      score: Joi.number().required(),
      maxScore: Joi.number().required(),
      completedAt: Joi.date().required()
    }))
  }).required(),
  verificationProof: Joi.object({
    courseCompletionHash: Joi.string().required(),
    facultySignature: Joi.string().required(),
    aiDeanVerification: Joi.string().required(),
    blockchainProof: Joi.string().optional()
  }).required()
});

const specialBadgeSchema = Joi.object({
  studentId: Joi.string().required(),
  badgeType: Joi.string().valid(
    'course_completion',
    'skill_mastery',
    'spiritual_milestone',
    'prophetic_achievement',
    'kingdom_impact',
    'scroll_certification'
  ).required(),
  achievementDetails: Joi.object().required()
});

// Badge Minting Endpoints

/**
 * POST /api/scrollbadges/mint
 * Mint a course completion badge
 */
router.post('/mint', 
  authMiddleware,
  validateRequest(mintBadgeSchema),
  async (req: Request, res: Response) => {
    try {
      const mintRequest: BadgeMintRequest = req.body;
      
      // Verify user has permission to mint badges for this student
      if (req.user.role !== 'ADMIN' && req.user.role !== 'FACULTY' && req.user.id !== mintRequest.studentId) {
        return res.status(403).json({
          success: false,
          error: 'Insufficient permissions to mint badge'
        });
      }

      const badge = await scrollBadgeSystem.mintCourseCompletionBadge(mintRequest);

      res.status(201).json({
        success: true,
        data: {
          badge,
          message: 'ScrollBadge minted successfully'
        }
      });
    } catch (error) {
      console.error('Error minting badge:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to mint badge'
      });
    }
  }
);

/**
 * POST /api/scrollbadges/mint/special
 * Mint a special achievement badge
 */
router.post('/mint/special',
  authMiddleware,
  validateRequest(specialBadgeSchema),
  async (req: Request, res: Response) => {
    try {
      const { studentId, badgeType, achievementDetails } = req.body;

      // Only admins and faculty can mint special badges
      if (req.user.role !== 'ADMIN' && req.user.role !== 'FACULTY') {
        return res.status(403).json({
          success: false,
          error: 'Only faculty and administrators can mint special badges'
        });
      }

      const badge = await scrollBadgeSystem.mintSpecialAchievementBadge(
        studentId,
        badgeType as BadgeType,
        achievementDetails
      );

      res.status(201).json({
        success: true,
        data: {
          badge,
          message: 'Special achievement badge minted successfully'
        }
      });
    } catch (error) {
      console.error('Error minting special badge:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to mint special badge'
      });
    }
  }
);

/**
 * POST /api/scrollbadges/mint/batch
 * Batch mint badges for multiple students
 */
router.post('/mint/batch',
  authMiddleware,
  async (req: Request, res: Response) => {
    try {
      const { requests } = req.body;

      // Only admins and faculty can batch mint
      if (req.user.role !== 'ADMIN' && req.user.role !== 'FACULTY') {
        return res.status(403).json({
          success: false,
          error: 'Only faculty and administrators can batch mint badges'
        });
      }

      if (!Array.isArray(requests) || requests.length === 0) {
        return res.status(400).json({
          success: false,
          error: 'Requests array is required and must not be empty'
        });
      }

      const badges = await scrollBadgeSystem.batchMintBadges(requests);

      res.status(201).json({
        success: true,
        data: {
          badges,
          count: badges.length,
          message: `Successfully minted ${badges.length} badges`
        }
      });
    } catch (error) {
      console.error('Error batch minting badges:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to batch mint badges'
      });
    }
  }
);

// Badge Verification Endpoints

/**
 * GET /api/scrollbadges/verify/:tokenId
 * Verify a badge by token ID
 */
router.get('/verify/:tokenId', async (req: Request, res: Response) => {
  try {
    const { tokenId } = req.params;
    
    const verificationResult = await scrollBadgeSystem.verifyBadge(tokenId);

    res.json({
      success: true,
      data: verificationResult
    });
  } catch (error) {
    console.error('Error verifying badge:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to verify badge'
    });
  }
});

/**
 * GET /api/scrollbadges/verify/hash/:hash
 * Verify a badge by verification hash
 */
router.get('/verify/hash/:hash', async (req: Request, res: Response) => {
  try {
    const { hash } = req.params;
    
    const verificationResult = await scrollBadgeSystem.verifyBadgeByHash(hash);

    res.json({
      success: true,
      data: verificationResult
    });
  } catch (error) {
    console.error('Error verifying badge by hash:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to verify badge'
    });
  }
});

/**
 * GET /api/scrollbadges/student/:studentId/verify
 * Verify all badges for a student
 */
router.get('/student/:studentId/verify',
  authMiddleware,
  async (req: Request, res: Response) => {
    try {
      const { studentId } = req.params;

      // Users can only verify their own badges unless they're admin/faculty
      if (req.user.role !== 'ADMIN' && req.user.role !== 'FACULTY' && req.user.id !== studentId) {
        return res.status(403).json({
          success: false,
          error: 'Insufficient permissions to verify student badges'
        });
      }

      const verificationResults = await scrollBadgeSystem.verifyStudentBadges(studentId);

      res.json({
        success: true,
        data: {
          studentId,
          verifications: verificationResults,
          totalBadges: verificationResults.length,
          validBadges: verificationResults.filter(v => v.isValid).length
        }
      });
    } catch (error) {
      console.error('Error verifying student badges:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to verify student badges'
      });
    }
  }
);

// Public Display Endpoints

/**
 * GET /api/scrollbadges/student/:studentId/collection
 * Get badge collection for a student
 */
router.get('/student/:studentId/collection', async (req: Request, res: Response) => {
  try {
    const { studentId } = req.params;
    
    const collection = await scrollBadgeSystem.getStudentBadgeCollection(studentId);

    res.json({
      success: true,
      data: collection
    });
  } catch (error) {
    console.error('Error getting badge collection:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to get badge collection'
    });
  }
});

/**
 * GET /api/scrollbadges/student/:studentId/profile
 * Create shareable profile for a student
 */
router.get('/student/:studentId/profile', async (req: Request, res: Response) => {
  try {
    const { studentId } = req.params;
    const { public: isPublic = 'true' } = req.query;
    
    const profile = await scrollBadgeSystem.createShareableProfile(
      studentId, 
      isPublic === 'true'
    );

    res.json({
      success: true,
      data: profile
    });
  } catch (error) {
    console.error('Error creating shareable profile:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to create shareable profile'
    });
  }
});

/**
 * GET /api/scrollbadges/:badgeId/widget
 * Generate embeddable widget for a badge
 */
router.get('/:badgeId/widget', async (req: Request, res: Response) => {
  try {
    const { badgeId } = req.params;
    
    const widget = await scrollBadgeSystem.generateEmbeddableWidget(badgeId);

    res.setHeader('Content-Type', 'text/html');
    res.send(widget);
  } catch (error) {
    console.error('Error generating embeddable widget:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to generate embeddable widget'
    });
  }
});

// System Management Endpoints

/**
 * GET /api/scrollbadges/system/status
 * Get system status and statistics
 */
router.get('/system/status',
  authMiddleware,
  async (req: Request, res: Response) => {
    try {
      // Only admins can view system status
      if (req.user.role !== 'ADMIN') {
        return res.status(403).json({
          success: false,
          error: 'Only administrators can view system status'
        });
      }

      const status = await scrollBadgeSystem.getSystemStatus();

      res.json({
        success: true,
        data: status
      });
    } catch (error) {
      console.error('Error getting system status:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to get system status'
      });
    }
  }
);

/**
 * DELETE /api/scrollbadges/:tokenId/revoke
 * Revoke a badge
 */
router.delete('/:tokenId/revoke',
  authMiddleware,
  async (req: Request, res: Response) => {
    try {
      const { tokenId } = req.params;
      const { reason } = req.body;

      // Only admins can revoke badges
      if (req.user.role !== 'ADMIN') {
        return res.status(403).json({
          success: false,
          error: 'Only administrators can revoke badges'
        });
      }

      if (!reason) {
        return res.status(400).json({
          success: false,
          error: 'Reason for revocation is required'
        });
      }

      const revoked = await scrollBadgeSystem.revokeBadge(tokenId, reason);

      if (revoked) {
        res.json({
          success: true,
          data: {
            tokenId,
            revoked: true,
            reason,
            message: 'Badge revoked successfully'
          }
        });
      } else {
        res.status(500).json({
          success: false,
          error: 'Failed to revoke badge'
        });
      }
    } catch (error) {
      console.error('Error revoking badge:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to revoke badge'
      });
    }
  }
);

export default router;