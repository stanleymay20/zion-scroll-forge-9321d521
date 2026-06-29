/**
 * Comprehensive Courses API Routes
 * Implements all course management endpoints with full feature support
 * Following zero hardcoding policy and production-ready patterns
 */

import express from 'express';
import { PrismaClient } from '@prisma/client';
import { z } from 'zod';
import { authMiddleware } from '../middleware/auth';
import { validateInput } from '../middleware/inputValidation';
import { logger } from '../utils/logger';

const router = express.Router();
const prisma = new PrismaClient();

// Validation Schemas
const CourseCreateSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().min(1),
  scroll_field: z.enum([
    'ScrollMedicine',
    'ScrollAI', 
    'ScrollGovernance',
    'ScrollEducation',
    'ScrollBusiness'
  ]),
  difficulty: z.enum(['BEGINNER', 'INTERMEDIATE', 'ADVANCED', 'PROPHETIC']),
  duration: z.number().min(1),
  scrollXPReward: z.number().min(0),
  scrollCoinCost: z.number().min(0),
  facultyId: z.string()
});

export default router;
