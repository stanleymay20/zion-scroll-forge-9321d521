/**
 * ScrollUniversity Admissions - Application Processing Routes
 * "Many are called, but few are chosen" - Matthew 22:14
 * 
 * Application submission and document processing system
 */

import express from 'express';
import { PrismaClient } from '@prisma/client';
import { logger } from '../../utils/logger';
import { ApplicationService } from '../../services/admissions/ApplicationService';
import { DocumentProcessor } from '../../services/admissions/DocumentProcessor';
import { StatusTracker } from '../../services/admissions/StatusTracker';
import { NotificationManager } from '../../services/admissions/NotificationManager';

const router = express.Router();
const prisma = new PrismaClient();

// Initialize services
const applicationService = new ApplicationService(prisma);
const documentProcessor = new DocumentProcessor();
const statusTracker = new StatusTracker(prisma);
const notificationManager = new NotificationManager();

/**
 * GET /api/admissions/applications
 * Get all applications for the authenticated user or admin view
 */
router.get('/', async (req, res) => {
  try {
    const { userId, role } = req.user as any;
    const { status, program, page = 1, limit = 10 } = req.query;

    let applications;
    
    if (role === 'ADMISSIONS_OFFICER' || role === 'ADMIN') {
      // Admin view - get all applications with filters
      applications = await applicationService.getAllApplications({
        status: status as string,
        program: program as string,
        page: parseInt(page as string),
        limit: parseInt(limit as string)
      });
    } else {
      // User view - get only their applications
      applications = await applicationService.getUserApplications(userId);
    }

    res.json({
      success: true,
      data: applications,
      message: 'Applications retrieved successfully'
    });

  } catch (error) {
    logger.error('Error retrieving applications:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve applications',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * GET /api/admissions/applications/:id
 * Get specific application details
 */
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { userId, role } = req.user as any;

    const application = await applicationService.getApplicationById(id);
    
    if (!application) {
      return res.status(404).json({
        success: false,
        error: 'Application not found'
      });
    }

    // Check authorization
    if (application.applicantId !== userId && 
        !['ADMISSIONS_OFFICER', 'ADMIN', 'ADMISSIONS_COMMITTEE'].includes(role)) {
      return res.status(403).json({
        success: false,
        error: 'Unauthorized to view this application'
      });
    }

    res.json({
      success: true,
      data: application,
      message: 'Application retrieved successfully'
    });

  } catch (error) {
    logger.error('Error retrieving application:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve application',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * POST /api/admissions/applications
 * Create new application
 */
router.post('/', async (req, res) => {
  try {
    const { userId } = req.user as any;
    const applicationData = req.body;

    // Validate required fields
    const requiredFields = ['programApplied', 'intendedStartDate', 'personalStatement'];
    const missingFields = requiredFields.filter(field => !applicationData[field]);
    
    if (missingFields.length > 0) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields',
        missingFields
      });
    }

    // Create application
    const application = await applicationService.createApplication({
      ...applicationData,
      applicantId: userId
    });

    // Initialize status tracking
    await statusTracker.initializeTimeline(application.id);

    // Send confirmation notification
    await notificationManager.sendApplicationConfirmation(application);

    res.status(201).json({
      success: true,
      data: application,
      message: 'Application submitted successfully'
    });

  } catch (error) {
    logger.error('Error creating application:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create application',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * PUT /api/admissions/applications/:id
 * Update application (only if in draft or under review status)
 */
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { userId, role } = req.user as any;
    const updateData = req.body;

    const application = await applicationService.getApplicationById(id);
    
    if (!application) {
      return res.status(404).json({
        success: false,
        error: 'Application not found'
      });
    }

    // Check authorization
    if (application.applicantId !== userId && 
        !['ADMISSIONS_OFFICER', 'ADMIN'].includes(role)) {
      return res.status(403).json({
        success: false,
        error: 'Unauthorized to update this application'
      });
    }

    // Check if application can be updated
    const updatableStatuses = ['SUBMITTED', 'UNDER_REVIEW'];
    if (!updatableStatuses.includes(application.status)) {
      return res.status(400).json({
        success: false,
        error: 'Application cannot be updated in current status',
        currentStatus: application.status
      });
    }

    const updatedApplication = await applicationService.updateApplication(id, updateData);

    // Track status change if status was updated
    if (updateData.status && updateData.status !== application.status) {
      await statusTracker.updateStatus(id, updateData.status, userId);
      await notificationManager.sendStatusUpdate(updatedApplication);
    }

    res.json({
      success: true,
      data: updatedApplication,
      message: 'Application updated successfully'
    });

  } catch (error) {
    logger.error('Error updating application:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update application',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * POST /api/admissions/applications/:id/documents
 * Upload documents for application
 */
router.post('/:id/documents', async (req, res) => {
  try {
    const { id } = req.params;
    const { userId } = req.user as any;
    const { documentType, fileName, fileData, fileSize } = req.body;

    const application = await applicationService.getApplicationById(id);
    
    if (!application) {
      return res.status(404).json({
        success: false,
        error: 'Application not found'
      });
    }

    // Check authorization
    if (application.applicantId !== userId) {
      return res.status(403).json({
        success: false,
        error: 'Unauthorized to upload documents for this application'
      });
    }

    // Process and validate document
    const processedDocument = await documentProcessor.processDocument({
      applicationId: id,
      documentType,
      fileName,
      fileData,
      fileSize,
      uploadedBy: userId
    });

    // Update application with new document
    await applicationService.addDocument(id, processedDocument);

    // Track document upload
    await statusTracker.addTimelineEvent(id, 'DOCUMENT_UPLOADED', {
      documentType,
      fileName,
      uploadedBy: userId
    });

    res.json({
      success: true,
      data: processedDocument,
      message: 'Document uploaded successfully'
    });

  } catch (error) {
    logger.error('Error uploading document:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to upload document',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * GET /api/admissions/applications/:id/status
 * Get application status and timeline
 */
router.get('/:id/status', async (req, res) => {
  try {
    const { id } = req.params;
    const { userId, role } = req.user as any;

    const application = await applicationService.getApplicationById(id);
    
    if (!application) {
      return res.status(404).json({
        success: false,
        error: 'Application not found'
      });
    }

    // Check authorization
    if (application.applicantId !== userId && 
        !['ADMISSIONS_OFFICER', 'ADMIN', 'ADMISSIONS_COMMITTEE'].includes(role)) {
      return res.status(403).json({
        success: false,
        error: 'Unauthorized to view this application status'
      });
    }

    const statusInfo = await statusTracker.getApplicationStatus(id);

    res.json({
      success: true,
      data: statusInfo,
      message: 'Application status retrieved successfully'
    });

  } catch (error) {
    logger.error('Error retrieving application status:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve application status',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * POST /api/admissions/applications/:id/withdraw
 * Withdraw application
 */
router.post('/:id/withdraw', async (req, res) => {
  try {
    const { id } = req.params;
    const { userId } = req.user as any;
    const { reason } = req.body;

    const application = await applicationService.getApplicationById(id);
    
    if (!application) {
      return res.status(404).json({
        success: false,
        error: 'Application not found'
      });
    }

    // Check authorization
    if (application.applicantId !== userId) {
      return res.status(403).json({
        success: false,
        error: 'Unauthorized to withdraw this application'
      });
    }

    // Check if application can be withdrawn
    const withdrawableStatuses = ['SUBMITTED', 'UNDER_REVIEW', 'ASSESSMENT_PENDING'];
    if (!withdrawableStatuses.includes(application.status)) {
      return res.status(400).json({
        success: false,
        error: 'Application cannot be withdrawn in current status',
        currentStatus: application.status
      });
    }

    const withdrawnApplication = await applicationService.withdrawApplication(id, reason);

    // Track withdrawal
    await statusTracker.updateStatus(id, 'WITHDRAWN', userId, { reason });

    // Send withdrawal notification
    await notificationManager.sendWithdrawalConfirmation(withdrawnApplication);

    res.json({
      success: true,
      data: withdrawnApplication,
      message: 'Application withdrawn successfully'
    });

  } catch (error) {
    logger.error('Error withdrawing application:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to withdraw application',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export default router;