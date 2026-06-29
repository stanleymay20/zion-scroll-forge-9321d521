/**
 * ScrollUniversity Admissions Routes
 * "Many are called, but few are chosen" - Matthew 22:14
 * 
 * API routes for the comprehensive admissions application system
 */

import express, { Request, Response } from 'express';
import { authenticate as auth } from '../middleware/auth';
import { AdmissionsService } from '../services/AdmissionsService';
import { ApplicationFormBuilderService } from '../services/ApplicationFormBuilderService';
import { DocumentUploadService } from '../services/DocumentUploadService';
import { EligibilityAssessmentService } from '../services/EligibilityAssessmentService';
import { SpiritualEvaluationService } from '../services/SpiritualEvaluationService';
import { InterviewSchedulingService } from '../services/InterviewSchedulingService';
import { DecisionManagementService } from '../services/DecisionManagementService';
import { AdmissionsNotificationService } from '../services/AdmissionsNotificationService';
import { logger } from '../utils/logger';

const router = express.Router();

// Initialize services
const admissionsService = new AdmissionsService();
const formBuilderService = new ApplicationFormBuilderService();
const documentService = new DocumentUploadService();
const eligibilityService = new EligibilityAssessmentService();
const spiritualService = new SpiritualEvaluationService();
const interviewService = new InterviewSchedulingService();
const decisionService = new DecisionManagementService();
const notificationService = new AdmissionsNotificationService();

// ============================================================================
// APPLICATION MANAGEMENT
// ============================================================================

/**
 * Create new application
 * POST /api/admissions/applications
 */
router.post('/applications', auth, async (req: Request, res: Response) => {
  try {
    const { programApplied, intendedStartDate } = req.body;
    const applicantId = (req as any).user.userId;

    const application = await admissionsService.createApplication({
      applicantId,
      programApplied,
      intendedStartDate: new Date(intendedStartDate)
    });

    res.status(201).json({
      success: true,
      data: application
    });
  } catch (error) {
    logger.error('Error creating application:', error);
    res.status(500).json({
      success: false,
      error: (error as Error).message
    });
  }
});

/**
 * Get application by ID
 * GET /api/admissions/applications/:id
 */
router.get('/applications/:id', auth, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const application = await admissionsService.getApplicationById(id);

    res.json({
      success: true,
      data: application
    });
  } catch (error) {
    logger.error('Error fetching application:', error);
    res.status(500).json({
      success: false,
      error: (error as Error).message
    });
  }
});

/**
 * Get applications by applicant
 * GET /api/admissions/applications/applicant/:applicantId
 */
router.get('/applications/applicant/:applicantId', auth, async (req: Request, res: Response) => {
  try {
    const { applicantId } = req.params;
    const applications = await admissionsService.getApplicationsByApplicant(applicantId);

    res.json({
      success: true,
      data: applications
    });
  } catch (error) {
    logger.error('Error fetching applications:', error);
    res.status(500).json({
      success: false,
      error: (error as Error).message
    });
  }
});

/**
 * Update application status
 * PATCH /api/admissions/applications/:id/status
 */
router.patch('/applications/:id/status', auth, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { status, reason } = req.body;
    const updatedBy = (req as any).user.userId;

    const statusUpdate = await admissionsService.updateApplicationStatus(
      id,
      status,
      updatedBy,
      reason
    );

    res.json({
      success: true,
      data: statusUpdate
    });
  } catch (error) {
    logger.error('Error updating application status:', error);
    res.status(500).json({
      success: false,
      error: (error as Error).message
    });
  }
});

/**
 * Save application form data
 * POST /api/admissions/applications/:id/form-data
 */
router.post('/applications/:id/form-data', auth, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const formData = req.body;

    await admissionsService.saveApplicationFormData(id, formData);

    res.json({
      success: true,
      message: 'Form data saved successfully'
    });
  } catch (error) {
    logger.error('Error saving form data:', error);
    res.status(500).json({
      success: false,
      error: (error as Error).message
    });
  }
});

// ============================================================================
// FORM BUILDER
// ============================================================================

/**
 * Get form template by program
 * GET /api/admissions/forms/template/:programType
 */
router.get('/forms/template/:programType', auth, async (req: Request, res: Response) => {
  try {
    const { programType } = req.params;
    const template = await formBuilderService.getFormTemplateByProgram(programType as any);

    res.json({
      success: true,
      data: template
    });
  } catch (error) {
    logger.error('Error fetching form template:', error);
    res.status(500).json({
      success: false,
      error: (error as Error).message
    });
  }
});

/**
 * Validate form data
 * POST /api/admissions/forms/validate
 */
router.post('/forms/validate', auth, async (req: Request, res: Response) => {
  try {
    const { formData, template } = req.body;
    const validation = await formBuilderService.validateFormData(formData, template);

    res.json({
      success: true,
      data: validation
    });
  } catch (error) {
    logger.error('Error validating form data:', error);
    res.status(500).json({
      success: false,
      error: (error as Error).message
    });
  }
});

// ============================================================================
// DOCUMENT MANAGEMENT
// ============================================================================

/**
 * Upload document
 * POST /api/admissions/documents/upload
 */
router.post('/documents/upload', auth, async (req: Request, res: Response) => {
  try {
    const uploadRequest = req.body;
    const result = await documentService.uploadDocument(uploadRequest);

    res.status(201).json({
      success: true,
      data: result
    });
  } catch (error) {
    logger.error('Error uploading document:', error);
    res.status(500).json({
      success: false,
      error: (error as Error).message
    });
  }
});

/**
 * Get application documents
 * GET /api/admissions/documents/application/:applicationId
 */
router.get('/documents/application/:applicationId', auth, async (req: Request, res: Response) => {
  try {
    const { applicationId } = req.params;
    const documents = await documentService.getApplicationDocuments(applicationId);

    res.json({
      success: true,
      data: documents
    });
  } catch (error) {
    logger.error('Error fetching documents:', error);
    res.status(500).json({
      success: false,
      error: (error as Error).message
    });
  }
});

// ============================================================================
// ELIGIBILITY ASSESSMENT
// ============================================================================

/**
 * Assess eligibility
 * POST /api/admissions/eligibility/assess
 */
router.post('/eligibility/assess', auth, async (req: Request, res: Response) => {
  try {
    const assessmentRequest = req.body;
    const result = await eligibilityService.assessEligibility(assessmentRequest);

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    logger.error('Error assessing eligibility:', error);
    res.status(500).json({
      success: false,
      error: (error as Error).message
    });
  }
});

/**
 * Get eligibility assessment
 * GET /api/admissions/eligibility/:applicationId
 */
router.get('/eligibility/:applicationId', auth, async (req: Request, res: Response) => {
  try {
    const { applicationId } = req.params;
    const assessment = await eligibilityService.getEligibilityAssessment(applicationId);

    res.json({
      success: true,
      data: assessment
    });
  } catch (error) {
    logger.error('Error fetching eligibility assessment:', error);
    res.status(500).json({
      success: false,
      error: (error as Error).message
    });
  }
});

// ============================================================================
// SPIRITUAL EVALUATION
// ============================================================================

/**
 * Evaluate spiritual maturity
 * POST /api/admissions/spiritual/evaluate
 */
router.post('/spiritual/evaluate', auth, async (req: Request, res: Response) => {
  try {
    const evaluationRequest = req.body;
    const result = await spiritualService.evaluateSpiritual(evaluationRequest);

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    logger.error('Error evaluating spiritual maturity:', error);
    res.status(500).json({
      success: false,
      error: (error as Error).message
    });
  }
});

// ============================================================================
// INTERVIEW SCHEDULING
// ============================================================================

/**
 * Schedule interview
 * POST /api/admissions/interviews/schedule
 */
router.post('/interviews/schedule', auth, async (req: Request, res: Response) => {
  try {
    const schedulingRequest = req.body;
    const result = await interviewService.scheduleInterview(schedulingRequest);

    res.status(201).json({
      success: true,
      data: result
    });
  } catch (error) {
    logger.error('Error scheduling interview:', error);
    res.status(500).json({
      success: false,
      error: (error as Error).message
    });
  }
});

/**
 * Conduct interview
 * POST /api/admissions/interviews/:id/conduct
 */
router.post('/interviews/:id/conduct', auth, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const conductRequest = { ...req.body, interviewId: id };
    await interviewService.conductInterview(conductRequest);

    res.json({
      success: true,
      message: 'Interview results recorded successfully'
    });
  } catch (error) {
    logger.error('Error conducting interview:', error);
    res.status(500).json({
      success: false,
      error: (error as Error).message
    });
  }
});

/**
 * Get interviews by application
 * GET /api/admissions/interviews/application/:applicationId
 */
router.get('/interviews/application/:applicationId', auth, async (req: Request, res: Response) => {
  try {
    const { applicationId } = req.params;
    const interviews = await interviewService.getInterviewsByApplication(applicationId);

    res.json({
      success: true,
      data: interviews
    });
  } catch (error) {
    logger.error('Error fetching interviews:', error);
    res.status(500).json({
      success: false,
      error: (error as Error).message
    });
  }
});

// ============================================================================
// DECISION MANAGEMENT
// ============================================================================

/**
 * Make admission decision
 * POST /api/admissions/decisions/make
 */
router.post('/decisions/make', auth, async (req: Request, res: Response) => {
  try {
    const decisionRequest = req.body;
    const result = await decisionService.makeDecision(decisionRequest);

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    logger.error('Error making decision:', error);
    res.status(500).json({
      success: false,
      error: (error as Error).message
    });
  }
});

// ============================================================================
// APPLICANT PORTAL
// ============================================================================

/**
 * Get applicant portal dashboard
 * GET /api/admissions/portal/dashboard/:applicantId
 */
router.get('/portal/dashboard/:applicantId', auth, async (req: Request, res: Response) => {
  try {
    const { applicantId } = req.params;
    const dashboard = await admissionsService.getApplicantPortalDashboard(applicantId);

    res.json({
      success: true,
      data: dashboard
    });
  } catch (error) {
    logger.error('Error fetching portal dashboard:', error);
    res.status(500).json({
      success: false,
      error: (error as Error).message
    });
  }
});

// ============================================================================
// ANALYTICS AND REPORTING
// ============================================================================

/**
 * Get admissions metrics
 * GET /api/admissions/analytics/metrics
 */
router.get('/analytics/metrics', auth, async (req: Request, res: Response) => {
  try {
    const { startDate, endDate } = req.query;
    const metrics = await admissionsService.getAdmissionsMetrics(
      startDate ? new Date(startDate as string) : undefined,
      endDate ? new Date(endDate as string) : undefined
    );

    res.json({
      success: true,
      data: metrics
    });
  } catch (error) {
    logger.error('Error fetching metrics:', error);
    res.status(500).json({
      success: false,
      error: (error as Error).message
    });
  }
});

/**
 * Get application processing metrics
 * GET /api/admissions/analytics/processing/:applicationId
 */
router.get('/analytics/processing/:applicationId', auth, async (req: Request, res: Response) => {
  try {
    const { applicationId } = req.params;
    const metrics = await admissionsService.getApplicationProcessingMetrics(applicationId);

    res.json({
      success: true,
      data: metrics
    });
  } catch (error) {
    logger.error('Error fetching processing metrics:', error);
    res.status(500).json({
      success: false,
      error: (error as Error).message
    });
  }
});

export default router;
