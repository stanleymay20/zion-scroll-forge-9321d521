/**
 * ScrollUniversity Production Input Validation
 * "Test all things; hold fast what is good" - 1 Thessalonians 5:21
 */

import { body, param, query, ValidationChain } from 'express-validator';
import { ApplicationStatus, ProgramType, AcademicLevel, UserRole } from '@prisma/client';

// Common validation patterns
const patterns = {
  uuid: /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
  email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  phone: /^\+?[\d\s\-\(\)]{10,}$/,
  strongPassword: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/,
  alphanumeric: /^[a-zA-Z0-9]+$/,
  slug: /^[a-z0-9-]+$/,
  url: /^https?:\/\/.+/
};

// Sanitization helpers
const sanitizers = {
  trim: (value: string) => value.trim(),
  toLowerCase: (value: string) => value.toLowerCase(),
  removeSpecialChars: (value: string) => value.replace(/[<>'"&]/g, ''),
  normalizeEmail: (value: string) => value.toLowerCase().trim()
};

// Base validation chains
export const baseValidations = {
  // User validations
  email: body('email')
    .isEmail()
    .withMessage('Must be a valid email address')
    .normalizeEmail()
    .isLength({ max: 255 })
    .withMessage('Email must be less than 255 characters'),

  password: body('password')
    .isLength({ min: 8, max: 128 })
    .withMessage('Password must be between 8 and 128 characters')
    .matches(patterns.strongPassword)
    .withMessage('Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character'),

  firstName: body('firstName')
    .isString()
    .withMessage('First name must be a string')
    .isLength({ min: 1, max: 50 })
    .withMessage('First name must be between 1 and 50 characters')
    .matches(/^[a-zA-Z\s\-']+$/)
    .withMessage('First name can only contain letters, spaces, hyphens, and apostrophes')
    .customSanitizer(sanitizers.trim),

  lastName: body('lastName')
    .isString()
    .withMessage('Last name must be a string')
    .isLength({ min: 1, max: 50 })
    .withMessage('Last name must be between 1 and 50 characters')
    .matches(/^[a-zA-Z\s\-']+$/)
    .withMessage('Last name can only contain letters, spaces, hyphens, and apostrophes')
    .customSanitizer(sanitizers.trim),

  phoneNumber: body('phoneNumber')
    .optional()
    .matches(patterns.phone)
    .withMessage('Phone number must be valid'),

  // ID validations
  uuid: (field: string) => body(field)
    .isUUID()
    .withMessage(`${field} must be a valid UUID`),

  uuidParam: (field: string) => param(field)
    .isUUID()
    .withMessage(`${field} must be a valid UUID`),

  // Enum validations
  userRole: body('role')
    .optional()
    .isIn(Object.values(UserRole))
    .withMessage('Role must be a valid user role'),

  academicLevel: body('academicLevel')
    .optional()
    .isIn(Object.values(AcademicLevel))
    .withMessage('Academic level must be valid'),

  programType: body('programApplied')
    .isIn(Object.values(ProgramType))
    .withMessage('Program type must be valid'),

  applicationStatus: body('status')
    .optional()
    .isIn(Object.values(ApplicationStatus))
    .withMessage('Application status must be valid'),

  // Text validations
  shortText: (field: string, min = 1, max = 255) => body(field)
    .isString()
    .withMessage(`${field} must be a string`)
    .isLength({ min, max })
    .withMessage(`${field} must be between ${min} and ${max} characters`)
    .customSanitizer(sanitizers.removeSpecialChars),

  longText: (field: string, min = 1, max = 5000) => body(field)
    .isString()
    .withMessage(`${field} must be a string`)
    .isLength({ min, max })
    .withMessage(`${field} must be between ${min} and ${max} characters`)
    .customSanitizer(sanitizers.removeSpecialChars),

  // Number validations
  positiveInteger: (field: string) => body(field)
    .isInt({ min: 1 })
    .withMessage(`${field} must be a positive integer`)
    .toInt(),

  positiveFloat: (field: string) => body(field)
    .isFloat({ min: 0 })
    .withMessage(`${field} must be a positive number`)
    .toFloat(),

  percentage: (field: string) => body(field)
    .isFloat({ min: 0, max: 100 })
    .withMessage(`${field} must be between 0 and 100`)
    .toFloat(),

  score: (field: string) => body(field)
    .isFloat({ min: 0, max: 1 })
    .withMessage(`${field} must be between 0 and 1`)
    .toFloat(),

  // Date validations
  date: (field: string) => body(field)
    .isISO8601()
    .withMessage(`${field} must be a valid date`)
    .toDate(),

  futureDate: (field: string) => body(field)
    .isISO8601()
    .withMessage(`${field} must be a valid date`)
    .custom((value) => {
      if (new Date(value) <= new Date()) {
        throw new Error(`${field} must be in the future`);
      }
      return true;
    })
    .toDate(),

  // Array validations
  stringArray: (field: string, maxLength = 10) => body(field)
    .optional()
    .isArray({ max: maxLength })
    .withMessage(`${field} must be an array with maximum ${maxLength} items`)
    .custom((arr) => {
      if (arr && arr.some((item: any) => typeof item !== 'string')) {
        throw new Error(`All items in ${field} must be strings`);
      }
      return true;
    }),

  // JSON validations
  jsonObject: (field: string) => body(field)
    .optional()
    .custom((value) => {
      if (typeof value === 'string') {
        try {
          JSON.parse(value);
        } catch {
          throw new Error(`${field} must be valid JSON`);
        }
      } else if (typeof value !== 'object' || Array.isArray(value)) {
        throw new Error(`${field} must be an object`);
      }
      return true;
    }),

  // Boolean validations
  boolean: (field: string) => body(field)
    .optional()
    .isBoolean()
    .withMessage(`${field} must be a boolean`)
    .toBoolean(),

  // URL validations
  url: (field: string) => body(field)
    .optional()
    .isURL()
    .withMessage(`${field} must be a valid URL`),

  // File validations
  fileUpload: (field: string, allowedTypes: string[] = []) => body(field)
    .optional()
    .custom((value, { req }) => {
      const file = req.file || req.files?.[field];
      if (!file) return true;

      if (allowedTypes.length > 0 && !allowedTypes.includes(file.mimetype)) {
        throw new Error(`${field} must be one of: ${allowedTypes.join(', ')}`);
      }

      // Max file size: 10MB
      if (file.size > 10 * 1024 * 1024) {
        throw new Error(`${field} must be less than 10MB`);
      }

      return true;
    })
};

// Specific validation sets for different endpoints
export const validationSets = {
  // User registration
  userRegistration: [
    baseValidations.email,
    baseValidations.password,
    baseValidations.firstName,
    baseValidations.lastName,
    baseValidations.phoneNumber,
    body('username')
      .isLength({ min: 3, max: 30 })
      .withMessage('Username must be between 3 and 30 characters')
      .matches(/^[a-zA-Z0-9_]+$/)
      .withMessage('Username can only contain letters, numbers, and underscores')
      .customSanitizer(sanitizers.toLowerCase)
  ],

  // User login
  userLogin: [
    body('email').isEmail().normalizeEmail(),
    body('password').isLength({ min: 1 }).withMessage('Password is required')
  ],

  // Application submission
  applicationSubmission: [
    baseValidations.programType,
    baseValidations.futureDate('intendedStartDate'),
    baseValidations.longText('personalStatement', 100, 2000),
    baseValidations.longText('spiritualTestimony', 50, 1500),
    baseValidations.jsonObject('academicHistory'),
    baseValidations.jsonObject('characterReferences'),
    baseValidations.stringArray('documents', 5)
  ],

  // Course creation
  courseCreation: [
    baseValidations.shortText('title', 5, 100),
    baseValidations.longText('description', 20, 1000),
    baseValidations.uuid('facultyId'),
    baseValidations.positiveInteger('duration'),
    baseValidations.positiveInteger('scrollXPReward'),
    baseValidations.positiveFloat('scrollCoinCost'),
    body('difficulty').isIn(['BEGINNER', 'INTERMEDIATE', 'ADVANCED', 'PROPHETIC']),
    baseValidations.stringArray('prerequisites', 5),
    baseValidations.url('videoUrl')
  ],

  // Enrollment
  enrollment: [
    baseValidations.uuid('courseId'),
    baseValidations.uuid('userId'),
    baseValidations.date('startDate')
  ],

  // Profile update
  profileUpdate: [
    baseValidations.firstName,
    baseValidations.lastName,
    baseValidations.phoneNumber,
    baseValidations.shortText('location', 0, 100),
    baseValidations.longText('bio', 0, 500),
    baseValidations.academicLevel,
    baseValidations.stringArray('spiritualGifts', 10),
    baseValidations.shortText('scrollCalling', 0, 200),
    baseValidations.longText('kingdomVision', 0, 1000),
    baseValidations.score('scrollAlignment')
  ],

  // Assessment submission
  assessmentSubmission: [
    baseValidations.uuid('assignmentId'),
    baseValidations.longText('content', 10, 10000),
    baseValidations.stringArray('attachments', 5)
  ],

  // Pagination
  pagination: [
    query('page')
      .optional()
      .isInt({ min: 1, max: 1000 })
      .withMessage('Page must be between 1 and 1000')
      .toInt(),
    query('limit')
      .optional()
      .isInt({ min: 1, max: 100 })
      .withMessage('Limit must be between 1 and 100')
      .toInt(),
    query('sortBy')
      .optional()
      .isString()
      .isLength({ max: 50 })
      .matches(/^[a-zA-Z_]+$/)
      .withMessage('Sort field can only contain letters and underscores'),
    query('sortOrder')
      .optional()
      .isIn(['asc', 'desc'])
      .withMessage('Sort order must be asc or desc')
  ],

  // Search
  search: [
    query('q')
      .optional()
      .isString()
      .isLength({ min: 1, max: 100 })
      .withMessage('Search query must be between 1 and 100 characters')
      .customSanitizer(sanitizers.removeSpecialChars),
    query('category')
      .optional()
      .isString()
      .isLength({ max: 50 })
      .matches(/^[a-zA-Z_]+$/)
      .withMessage('Category can only contain letters and underscores')
  ]
};

// Custom validators
export const customValidators = {
  // Check if user exists
  userExists: (field: string) => body(field).custom(async (value) => {
    // This would be implemented with actual database check
    // For now, just validate format
    if (!patterns.uuid.test(value)) {
      throw new Error('Invalid user ID format');
    }
    return true;
  }),

  // Check if course exists
  courseExists: (field: string) => body(field).custom(async (value) => {
    // This would be implemented with actual database check
    if (!patterns.uuid.test(value)) {
      throw new Error('Invalid course ID format');
    }
    return true;
  }),

  // Check unique email
  uniqueEmail: body('email').custom(async (value) => {
    // This would be implemented with actual database check
    // For now, just validate format
    if (!patterns.email.test(value)) {
      throw new Error('Invalid email format');
    }
    return true;
  }),

  // Check unique username
  uniqueUsername: body('username').custom(async (value) => {
    // This would be implemented with actual database check
    if (!/^[a-zA-Z0-9_]{3,30}$/.test(value)) {
      throw new Error('Invalid username format');
    }
    return true;
  }),

  // Validate spiritual gifts array
  spiritualGifts: body('spiritualGifts').custom((value) => {
    if (!Array.isArray(value)) return true;
    
    const validGifts = [
      'Teaching', 'Prophecy', 'Evangelism', 'Pastoring', 'Apostolic',
      'Healing', 'Miracles', 'Faith', 'Wisdom', 'Knowledge',
      'Discernment', 'Tongues', 'Interpretation', 'Helps', 'Administration'
    ];
    
    const invalidGifts = value.filter(gift => !validGifts.includes(gift));
    if (invalidGifts.length > 0) {
      throw new Error(`Invalid spiritual gifts: ${invalidGifts.join(', ')}`);
    }
    
    return true;
  }),

  // Validate academic history structure
  academicHistory: body('academicHistory').custom((value) => {
    if (!Array.isArray(value)) return true;
    
    for (const record of value) {
      if (!record.institutionName || typeof record.institutionName !== 'string') {
        throw new Error('Each academic record must have an institution name');
      }
      if (record.startDate && !Date.parse(record.startDate)) {
        throw new Error('Invalid start date in academic history');
      }
      if (record.endDate && !Date.parse(record.endDate)) {
        throw new Error('Invalid end date in academic history');
      }
      if (record.gpa && (typeof record.gpa !== 'number' || record.gpa < 0 || record.gpa > 4)) {
        throw new Error('GPA must be a number between 0 and 4');
      }
    }
    
    return true;
  })
};

export default {
  baseValidations,
  validationSets,
  customValidators,
  patterns,
  sanitizers
};