/**
 * ScrollCritical Thinking API Routes
 * Revolutionary reasoning and innovation endpoints
 */

import express from 'express';
import { PrismaClient } from '@prisma/client';
import Joi from 'joi';
import { ScrollCriticalThinkingEngine, ScrollXPActivity } from '../services/ScrollCriticalThinking';
import { logger } from '../utils/logger';
import { ScrollValidationError } from '../middleware/errorHandler';

const router = express.Router();
const prisma = new PrismaClient();
const criticalThinkingEngine = new ScrollCriticalThinkingEngine();

// Validation schemas
const reasoningSubmissionSchema = Joi.object({
  challengeId: Joi.string().required(),
  argument: Joi.string().min(100).max(5000).required(),
  evidence: Joi.array().items(Joi.object({
    type: Joi.string().valid('scriptural', 'statistical', 'historical', 'experiential', 'prophetic').required(),
    source: Joi.string().required(),
    content: Joi.string().required(),
    reliability: Joi.number().min(0).max(1).required(),
    spiritualAlignment: Joi.number().min(0).max(1).required()
  })).min(1).required(),
  spiritualInsights: Joi.array().items(Joi.string()).optional(),
  aiToolsUsed: Joi.array().items(Joi.object({
    name: Joi.string().required(),
    purpose: Joi.string().required(),
    outputUsed: Joi.string().required(),
    hallucinationCheck: Joi.boolean().required(),
    ethicalUsage: Joi.boolean().required()
  })).optional()
});

const innovationChallengeSchema = Joi.object({
  title: Joi.string().min(10).max(200).required(),
  scrollPrompt: Joi.string().min(50).max(1000).required(),
  realWorldContext: Joi.string().min(100).max(2000).required(),
  kingdomImpactTarget: Joi.string().min(50).max(500).required()
});

// Submit reasoning for critical thinking challenge
router.post('/reasoning/submit', async (req, res, next) => {
  try {
    // Validate input
    const { error, value } = reasoningSubmissionSchema.validate(req.body);
    if (error) {
      throw new ScrollValidationError(
        error.details[0].message,
        'Your reasoning submission needs proper divine formatting',
        'Ensure all evidence is properly cited and spiritual insights are included'
      );
    }
    
    const userId = req.user!.id;
    const submission = {
      userId,
      ...value,
      submittedAt: new Date()
    };
    
    // Evaluate reasoning through ScrollCritical Thinking Engine
    const assessment = await criticalThinkingEngine.evaluateReasoning(submission);
    
    // Store submission and assessment in database
    // (This would be implemented with proper database schema)
    
    logger.scroll('Critical thinking submission evaluated', {
      userId,
      challengeId: submission.challengeId,
      scrollXPAwarded: assessment.scrollXPAwarded,
      spiritualAlignment: assessment.spiritualAlignment
    });
    
    res.json({
      message: 'Reasoning submission successfully evaluated',
      scrollMessage: 'Your prophetic reasoning has been assessed by the kingdom',
      assessment,
      kingdomGuidance: 'Continue developing your ability to reason with both wisdom and truth'
    });
    
  } catch (error) {
    next(error);
  }
});

// Create weekly innovation challenge (Admin/Faculty only)
router.post('/challenges/create', async (req, res, next) => {
  try {
    // Check if user has authority to create challenges
    if (!['FACULTY', 'ADMIN', 'SCROLL_ELDER'].includes(req.user!.role)) {
      return res.status(403).json({
        error: 'Insufficient authority',
        scrollMessage: 'Only ScrollFaculty and Elders can create innovation challenges',
        kingdomGuidance: 'Seek greater anointing for challenge creation authority'
      });
    }
    
    // Validate input
    const { error, value } = innovationChallengeSchema.validate(req.body);
    if (error) {
      throw new ScrollValidationError(
        error.details[0].message,
        'Innovation challenge requires proper kingdom formatting',
        'Ensure the challenge has clear spiritual and practical dimensions'
      );
    }
    
    // Create challenge through engine
    const challenge = await criticalThinkingEngine.createWeeklyChallenge(
      value.title,
      value.scrollPrompt,
      value.realWorldContext,
      value.kingdomImpactTarget
    );
    
    logger.scroll('Innovation challenge created', {
      challengeId: challenge.id,
      title: challenge.title,
      createdBy: req.user!.id
    });
    
    res.status(201).json({
      message: 'Innovation challenge successfully created',
      scrollMessage: 'A new kingdom challenge has been released to the nations',
      challenge,
      kingdomGuidance: 'May this challenge produce solutions that transform the earth'
    });
    
  } catch (error) {
    next(error);
  }
});

// Get active innovation challenges
router.get('/challenges/active', async (req, res, next) => {
  try {
    // This would fetch active challenges from database
    const activeChallenges = [
      {
        id: 'challenge_ai_ethics_2025',
        title: 'Design AI to Interpret Dreams Ethically',
        description: 'Create an AI system that can help interpret dreams while maintaining biblical principles and avoiding occult practices',
        scrollPrompt: 'How can we use AI to help people understand divine communication through dreams without replacing the Holy Spirit?',
        realWorldContext: 'Many people receive dreams from God but lack understanding. AI could help, but must be built with kingdom principles.',
        deadline: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000),
        scrollCoinReward: 100,
        participantCount: 47,
        kingdomImpactTarget: 'Help believers understand divine communication while protecting against deception'
      },
      {
        id: 'challenge_climate_solutions_2025',
        title: 'Prophetic Climate Solutions for Africa',
        description: 'Develop climate adaptation strategies that integrate indigenous wisdom with modern technology',
        scrollPrompt: 'What climate solutions emerge when we combine prophetic insight with environmental science?',
        realWorldContext: 'Africa faces severe climate challenges but also has deep spiritual wisdom about creation stewardship.',
        deadline: new Date(Date.now() + 6 * 24 * 60 * 60 * 1000),
        scrollCoinReward: 150,
        participantCount: 23,
        kingdomImpactTarget: 'Create sustainable solutions that honor both creation and Creator'
      }
    ];
    
    res.json({
      message: 'Active innovation challenges retrieved',
      scrollMessage: 'Kingdom challenges await your prophetic solutions',
      challenges: activeChallenges,
      kingdomGuidance: 'Choose a challenge that aligns with your calling and gifts'
    });
    
  } catch (error) {
    next(error);
  }
});

// Award ScrollXP for critical thinking activities
router.post('/xp/award', async (req, res, next) => {
  try {
    const { activity, description, evidence } = req.body;
    const userId = req.user!.id;
    
    // Validate activity type
    if (!Object.values(ScrollXPActivity).includes(activity)) {
      throw new ScrollValidationError(
        'Invalid ScrollXP activity type',
        'The kingdom does not recognize this activity for XP rewards',
        'Choose from valid critical thinking activities'
      );
    }
    
    // Determine XP amount based on activity
    let xpAmount = 10; // Default
    switch (activity) {
      case ScrollXPActivity.CHALLENGE_FALSE_DOCTRINE:
        xpAmount = 15;
        break;
      case ScrollXPActivity.ASK_PROPHETIC_QUESTION:
        xpAmount = 10;
        break;
      case ScrollXPActivity.BUILD_LOCAL_SOLUTION:
        xpAmount = 50;
        break;
      case ScrollXPActivity.PROPOSE_NEW_THEORY:
        xpAmount = 25;
        break;
      case ScrollXPActivity.DISCERN_AI_HALLUCINATION:
        xpAmount = 20;
        break;
      case ScrollXPActivity.PARTICIPATE_DEBATE:
        xpAmount = 15;
        break;
      case ScrollXPActivity.MENTOR_PEER:
        xpAmount = 15;
        break;
    }
    
    // Award XP through engine
    await criticalThinkingEngine.awardScrollXP(userId, xpAmount, activity, description);
    
    logger.scroll('ScrollXP awarded for critical thinking', {
      userId,
      activity,
      xpAmount,
      description
    });
    
    res.json({
      message: 'ScrollXP successfully awarded',
      scrollMessage: 'Your critical thinking has been rewarded by the kingdom',
      xpAwarded: xpAmount,
      activity,
      kingdomGuidance: 'Continue growing in wisdom and understanding'
    });
    
  } catch (error) {
    next(error);
  }
});

// Get student's critical thinking profile
router.get('/profile', async (req, res, next) => {
  try {
    const userId = req.user!.id;
    
    // This would fetch comprehensive critical thinking profile from database
    const profile = {
      userId,
      reasoningLevel: 'INTERMEDIATE',
      discernmentScore: 0.75,
      innovationCapacity: 0.68,
      collaborationSkills: 0.82,
      propheticMaturity: 0.71,
      
      // Recent Activities
      recentChallenges: [
        {
          challengeId: 'challenge_ai_ethics_2025',
          title: 'Design AI to Interpret Dreams Ethically',
          submittedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
          score: 0.85,
          xpEarned: 25
        }
      ],
      
      // XP Breakdown
      totalXP: 340,
      xpByCategory: {
        criticalThinking: 120,
        innovation: 85,
        collaboration: 75,
        spiritualGrowth: 60
      },
      
      // Growth Metrics
      weeklyGrowth: 0.12,
      monthlyGrowth: 0.34,
      strongestSkills: ['Evidence Evaluation', 'Spiritual Discernment'],
      growthAreas: ['Innovative Thinking', 'Cross-Cultural Collaboration']
    };
    
    res.json({
      message: 'Critical thinking profile retrieved',
      scrollMessage: 'Your kingdom reasoning development is tracked and celebrated',
      profile,
      kingdomGuidance: 'Continue growing in wisdom, stature, and favor with God and man'
    });
    
  } catch (error) {
    next(error);
  }
});

// Join innovation challenge team
router.post('/challenges/:challengeId/join', async (req, res, next) => {
  try {
    const { challengeId } = req.params;
    const userId = req.user!.id;
    
    // This would implement team formation logic
    const teamAssignment = {
      teamId: `team_${challengeId}_${Math.floor(Math.random() * 100)}`,
      challengeId,
      members: [
        { userId, name: req.user!.firstName + ' ' + req.user!.lastName, location: 'Current User' },
        { userId: 'user2', name: 'Amara Okafor', location: 'Lagos, Nigeria' },
        { userId: 'user3', name: 'David Kim', location: 'Seoul, South Korea' },
        { userId: 'user4', name: 'Sarah Johnson', location: 'London, UK' }
      ],
      culturalDiversity: {
        continents: 4,
        languages: 3,
        timeZones: 4
      },
      collaborationTools: [
        'ScrollChat (Real-time messaging)',
        'ScrollMeet (Video conferencing)',
        'ScrollDocs (Collaborative documents)',
        'ScrollCode (Shared development environment)'
      ],
      mentor: {
        name: 'Dr. Emmanuel Adebayo',
        expertise: 'AI Ethics & Prophetic Technology',
        availability: 'Daily 2-4 PM GMT'
      }
    };
    
    logger.scroll('Student joined innovation challenge team', {
      userId,
      challengeId,
      teamId: teamAssignment.teamId
    });
    
    res.json({
      message: 'Successfully joined innovation challenge team',
      scrollMessage: 'You have been assigned to a diverse kingdom team',
      teamAssignment,
      kingdomGuidance: 'Work together in unity to produce solutions that glorify God and serve humanity'
    });
    
  } catch (error) {
    next(error);
  }
});

export default router;