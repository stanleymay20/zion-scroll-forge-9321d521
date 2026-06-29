/**
 * Curriculum Grid API Routes
 * RESTful API endpoints for the Master Course Catalog Infrastructure
 */

import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { MasterCourseCatalogService } from '../../services/MasterCourseCatalogService';
import { SupremeScrollFaculty, CourseSearchCriteria } from '../../types/curriculum-grid';

const router = Router();
const prisma = new PrismaClient();
const catalogService = new MasterCourseCatalogService(prisma);

/**
 * GET /api/curriculum-grid/faculties
 * Get all Supreme Scroll Faculties
 */
router.get('/faculties', async (req, res) => {
  try {
    const faculties = catalogService.getAllFaculties();
    res.json({
      success: true,
      data: faculties,
      message: 'Faculties retrieved successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
      message: 'Failed to retrieve faculties'
    });
  }
});

/**
 * GET /api/curriculum-grid/statistics
 * Get catalog statistics
 */
router.get('/statistics', async (req, res) => {
  try {
    const stats = await catalogService.getCatalogStatistics();
    res.json({
      success: true,
      data: stats,
      message: 'Statistics retrieved successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
      message: 'Failed to retrieve statistics'
    });
  }
});

/**
 * GET /api/curriculum-grid/courses/search
 * Search courses with advanced filtering
 */
router.get('/courses/search', async (req, res) => {
  try {
    const criteria: CourseSearchCriteria = {
      query: req.query.q as string,
      faculty: req.query.faculty ? (req.query.faculty as string).split(',') as SupremeScrollFaculty[] : undefined,
      level: req.query.level ? (req.query.level as string).split(',') as any[] : undefined,
      status: req.query.status ? (req.query.status as string).split(',') as any[] : undefined
    };

    // Get student profile if user is authenticated
    let studentProfile;
    if (req.query.userId) {
      studentProfile = await catalogService.getStudentProfile(req.query.userId as string);
    }

    const results = await catalogService.searchCourses(criteria, studentProfile);
    
    res.json({
      success: true,
      data: results,
      message: 'Search completed successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
      message: 'Search failed'
    });
  }
});

/**
 * GET /api/curriculum-grid/courses/:id
 * Get course by ID
 */
router.get('/courses/:id', async (req, res) => {
  try {
    const course = await catalogService.getCourseById(req.params.id);
    
    if (!course) {
      return res.status(404).json({
        success: false,
        message: 'Course not found'
      });
    }

    res.json({
      success: true,
      data: course,
      message: 'Course retrieved successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
      message: 'Failed to retrieve course'
    });
  }
});

/**
 * POST /api/curriculum-grid/courses
 * Create a new course
 */
router.post('/courses', async (req, res) => {
  try {
    const course = await catalogService.addCourse(req.body);
    
    res.status(201).json({
      success: true,
      data: course,
      message: 'Course created successfully'
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message,
      message: 'Failed to create course'
    });
  }
});

/**
 * PUT /api/curriculum-grid/courses/:id
 * Update a course
 */
router.put('/courses/:id', async (req, res) => {
  try {
    const course = await catalogService.updateCourse(req.params.id, req.body);
    
    res.json({
      success: true,
      data: course,
      message: 'Course updated successfully'
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message,
      message: 'Failed to update course'
    });
  }
});

/**
 * DELETE /api/curriculum-grid/courses/:id
 * Delete a course
 */
router.delete('/courses/:id', async (req, res) => {
  try {
    await catalogService.deleteCourse(req.params.id);
    
    res.json({
      success: true,
      message: 'Course deleted successfully'
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message,
      message: 'Failed to delete course'
    });
  }
});

/**
 * GET /api/curriculum-grid/faculties/:faculty/courses
 * Get courses by faculty
 */
router.get('/faculties/:faculty/courses', async (req, res) => {
  try {
    const faculty = req.params.faculty as SupremeScrollFaculty;
    const courses = await catalogService.getCoursesByFaculty(faculty);
    
    res.json({
      success: true,
      data: courses,
      message: `Courses for ${faculty} retrieved successfully`
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
      message: 'Failed to retrieve faculty courses'
    });
  }
});

/**
 * POST /api/curriculum-grid/courses/generate
 * Generate a new course dynamically
 */
router.post('/courses/generate', async (req, res) => {
  try {
    const generatedCourse = await catalogService.generateCourse(req.body);
    
    res.json({
      success: true,
      data: generatedCourse,
      message: 'Course generated successfully'
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message,
      message: 'Failed to generate course'
    });
  }
});

/**
 * GET /api/curriculum-grid/students/:userId/profile
 * Get student profile for recommendations
 */
router.get('/students/:userId/profile', async (req, res) => {
  try {
    const profile = await catalogService.getStudentProfile(req.params.userId);
    
    if (!profile) {
      return res.status(404).json({
        success: false,
        message: 'Student profile not found'
      });
    }

    res.json({
      success: true,
      data: profile,
      message: 'Student profile retrieved successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
      message: 'Failed to retrieve student profile'
    });
  }
});

/**
 * POST /api/curriculum-grid/initialize
 * Initialize database faculties (admin only)
 */
router.post('/initialize', async (req, res) => {
  try {
    await catalogService.initializeDatabaseFaculties();
    
    res.json({
      success: true,
      message: 'Database faculties initialized successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
      message: 'Failed to initialize database faculties'
    });
  }
});

export default router;