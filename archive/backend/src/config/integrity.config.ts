/**
 * Academic Integrity System Configuration
 * "The LORD detests dishonest scales, but accurate weights find favor with him" - Proverbs 11:1
 */

import { IntegrityConfig } from '../types/integrity.types';

export const integrityConfig: IntegrityConfig = {
  plagiarism: {
    turnitinEnabled: process.env.TURNITIN_ENABLED === 'true',
    turnitinApiKey: process.env.TURNITIN_API_KEY,
    similarityThreshold: parseFloat(process.env.PLAGIARISM_SIMILARITY_THRESHOLD || '20'),
    flagThreshold: parseFloat(process.env.PLAGIARISM_FLAG_THRESHOLD || '30'),
  },
  aiDetection: {
    gptZeroEnabled: process.env.GPTZERO_ENABLED === 'true',
    gptZeroApiKey: process.env.GPTZERO_API_KEY,
    customModelEnabled: process.env.CUSTOM_AI_DETECTION_ENABLED === 'true',
    probabilityThreshold: parseFloat(process.env.AI_DETECTION_THRESHOLD || '0.7'),
  },
  collusion: {
    enabled: process.env.COLLUSION_DETECTION_ENABLED !== 'false',
    similarityThreshold: parseFloat(process.env.COLLUSION_SIMILARITY_THRESHOLD || '0.85'),
    timingThreshold: parseInt(process.env.COLLUSION_TIMING_THRESHOLD || '30', 10),
  },
  proctoring: {
    enabled: process.env.PROCTORING_ENABLED === 'true',
    requireIdVerification: process.env.PROCTORING_REQUIRE_ID === 'true',
    requireEnvironmentScan: process.env.PROCTORING_REQUIRE_ENV_SCAN === 'true',
    flagThreshold: parseInt(process.env.PROCTORING_FLAG_THRESHOLD || '3', 10),
  },
  general: {
    autoFlagEnabled: process.env.AUTO_FLAG_ENABLED !== 'false',
    humanReviewThreshold: parseFloat(process.env.HUMAN_REVIEW_THRESHOLD || '0.85'),
    confidenceThreshold: parseFloat(process.env.INTEGRITY_CONFIDENCE_THRESHOLD || '0.8'),
  },
};

// Thresholds for risk level determination
export const RISK_THRESHOLDS = {
  low: 0.3,
  medium: 0.6,
  high: 0.85,
  critical: 0.95,
};

// Scoring weights for overall integrity score
export const INTEGRITY_SCORE_WEIGHTS = {
  plagiarism: 0.35,
  aiContent: 0.25,
  styleDeviation: 0.15,
  collusion: 0.25,
};

// Proctoring flag severity scores
export const PROCTORING_FLAG_SCORES = {
  low: 1,
  medium: 3,
  high: 5,
  critical: 10,
};

// Maximum allowed flags before requiring review
export const MAX_PROCTORING_FLAGS = 5;

// Time window for collusion detection (in minutes)
export const COLLUSION_TIME_WINDOW = 60;

// Minimum similarity for collusion flag
export const MIN_COLLUSION_SIMILARITY = 0.75;

// AI content probability thresholds
export const AI_CONTENT_THRESHOLDS = {
  clear: 0.3,
  review: 0.5,
  flag: 0.7,
};

// Style deviation thresholds (standard deviations)
export const STYLE_DEVIATION_THRESHOLDS = {
  normal: 1.5,
  suspicious: 2.0,
  flagged: 2.5,
};
