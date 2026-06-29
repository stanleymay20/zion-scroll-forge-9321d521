/**
 * Faculty Support System API Routes
 * Endpoints for AI teaching assistant, discussion grading, quiz generation,
 * extension management, and office hours scheduling
 */

import express, { Request, Response } from 'express';
import FacultyAssistantService from '../services/FacultyAssistantService';
import {
  TeachingAssistantQuery,
  ProfessorTeachingStyle,
  DiscussionPost,
  DiscussionGradingCriteria,
  QuizGenerationRequest,
  ExtensionRequest,
  ExtensionPolicy,
  OfficeHoursAppointment,
  MeetingOutcome
} from '../types/faculty-support.types';

const router = express.Router();
const facultyAssistant = new FacultyAssistantService();

// ============================================================================
// Teaching Assistant Endpoints
// ============================================================================

/**
 * POST /api/faculty-support/teaching-assistant/answer
 * Answer student question using course materials
 */
router.post('/teaching-assistant/answer', async (req: Request, res: Response): Promise<void> => {
  try {
    const query: TeachingAssistantQuery = req.body.query;
    const teachingStyle: ProfessorTeachingStyle = req.body.teachingStyle || {
      tone: 'encouraging',
      responseLength: 'detailed',
      exampleUsage: 'frequent',
      scriptureIntegration: 'contextual'
    };

    if (!query || !query.question || !query.courseId || !query.studentId) {
      res.status(400).json({
        success: false,
        error: 'Missing required fields: question, courseId, studentId'
      });
      return;
    }

    const response = await facultyAssistant.answerStudentQuestion(query, teachingStyle);

    res.json({
      success: true,
      data: response
    });
  } catch (error) {
    console.error('Error answering student question:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to answer question'
    });
  }
});

// ============================================================================
// Discussion Grading Endpoints
// ============================================================================

/**
 * POST /api/faculty-support/discussion/grade
 * Grade student discussion participation
 */
router.post('/discussion/grade', async (req: Request, res: Response): Promise<void> => {
  try {
    const { posts, criteria, studentId } = req.body;

    if (!posts || !Array.isArray(posts) || !criteria || !studentId) {
      res.status(400).json({
        success: false,
        error: 'Missing required fields: posts, criteria, studentId'
      });
      return;
    }

    const grade = await facultyAssistant.gradeDiscussionParticipation(
      posts as DiscussionPost[],
      criteria as DiscussionGradingCriteria,
      studentId
    );

    res.json({
      success: true,
      data: grade
    });
  } catch (error) {
    console.error('Error grading discussion:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to grade discussion'
    });
  }
});

/**
 * POST /api/faculty-support/discussion/grade-all
 * Grade all students in a discussion
 */
router.post('/discussion/grade-all', async (req: Request, res: Response): Promise<void> => {
  try {
    const { posts, criteria, studentIds } = req.body;

    if (!posts || !Array.isArray(posts) || !criteria || !studentIds || !Array.isArray(studentIds)) {
      res.status(400).json({
        success: false,
        error: 'Missing required fields: posts, criteria, studentIds'
      });
      return;
    }

    const grades = await Promise.all(
      studentIds.map(studentId =>
        facultyAssistant.gradeDiscussionParticipation(
          posts as DiscussionPost[],
          criteria as DiscussionGradingCriteria,
          studentId
        )
      )
    );

    res.json({
      success: true,
      data: grades
    });
  } catch (error) {
    console.error('Error grading discussions:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to grade discussions'
    });
  }
});

// ============================================================================
// Quiz Generation Endpoints
// ============================================================================

/**
 * POST /api/faculty-support/quiz/generate
 * Generate quiz questions
 */
router.post('/quiz/generate', async (req: Request, res: Response): Promise<void> => {
  try {
    const request: QuizGenerationRequest = req.body;

    if (!request.courseId || !request.topics || !request.learningObjectives || !request.questionTypes) {
      res.status(400).json({
        success: false,
        error: 'Missing required fields: courseId, topics, learningObjectives, questionTypes'
      });
      return;
    }

    const quiz = await facultyAssistant.generateQuiz(request);

    res.json({
      success: true,
      data: quiz
    });
  } catch (error) {
    console.error('Error generating quiz:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to generate quiz'
    });
  }
});

// ============================================================================
// Extension Management Endpoints
// ============================================================================

/**
 * POST /api/faculty-support/extension/evaluate
 * Evaluate extension request
 */
router.post('/extension/evaluate', async (req: Request, res: Response): Promise<void> => {
  try {
    const { request, policy, studentHistory } = req.body;

    if (!request || !policy || !studentHistory) {
      res.status(400).json({
        success: false,
        error: 'Missing required fields: request, policy, studentHistory'
      });
      return;
    }

    // Convert date strings to Date objects
    const extensionRequest: ExtensionRequest = {
      ...request,
      requestDate: new Date(request.requestDate),
      originalDueDate: new Date(request.originalDueDate),
      requestedDueDate: new Date(request.requestedDueDate)
    };

    const decision = await facultyAssistant.evaluateExtensionRequest(
      extensionRequest,
      policy as ExtensionPolicy,
      studentHistory
    );

    res.json({
      success: true,
      data: decision
    });
  } catch (error) {
    console.error('Error evaluating extension:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to evaluate extension'
    });
  }
});

// ============================================================================
// Office Hours Endpoints
// ============================================================================

/**
 * POST /api/faculty-support/office-hours/schedule
 * Schedule office hours appointment
 */
router.post('/office-hours/schedule', async (req: Request, res: Response): Promise<void> => {
  try {
    const appointment = req.body;

    if (!appointment.studentId || !appointment.facultyId || !appointment.scheduledTime) {
      res.status(400).json({
        success: false,
        error: 'Missing required fields: studentId, facultyId, scheduledTime'
      });
      return;
    }

    // Convert date string to Date object
    appointment.scheduledTime = new Date(appointment.scheduledTime);

    const scheduled = await facultyAssistant.scheduleAppointment(appointment);

    res.json({
      success: true,
      data: scheduled
    });
  } catch (error) {
    console.error('Error scheduling appointment:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to schedule appointment'
    });
  }
});

/**
 * POST /api/faculty-support/office-hours/reminder/:appointmentId
 * Send appointment reminder
 */
router.post('/office-hours/reminder/:appointmentId', async (req: Request, res: Response): Promise<void> => {
  try {
    const { appointmentId } = req.params;

    const reminder = await facultyAssistant.sendAppointmentReminder(appointmentId);

    res.json({
      success: true,
      data: reminder
    });
  } catch (error) {
    console.error('Error sending reminder:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to send reminder'
    });
  }
});

/**
 * GET /api/faculty-support/office-hours/briefing/:studentId/:facultyId
 * Get student briefing for office hours
 */
router.get('/office-hours/briefing/:studentId/:facultyId', async (req: Request, res: Response): Promise<void> => {
  try {
    const { studentId, facultyId } = req.params;

    const briefing = await facultyAssistant.prepareStudentBriefing(studentId, facultyId);

    res.json({
      success: true,
      data: briefing
    });
  } catch (error) {
    console.error('Error preparing briefing:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to prepare briefing'
    });
  }
});

/**
 * POST /api/faculty-support/office-hours/outcome
 * Record meeting outcome
 */
router.post('/office-hours/outcome', async (req: Request, res: Response): Promise<void> => {
  try {
    const outcome: MeetingOutcome = req.body;

    if (!outcome.appointmentId || !outcome.attendanceStatus) {
      res.status(400).json({
        success: false,
        error: 'Missing required fields: appointmentId, attendanceStatus'
      });
      return;
    }

    await facultyAssistant.recordMeetingOutcome(outcome);

    res.json({
      success: true,
      message: 'Meeting outcome recorded successfully'
    });
  } catch (error) {
    console.error('Error recording outcome:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to record outcome'
    });
  }
});

// ============================================================================
// Metrics and Configuration Endpoints
// ============================================================================

/**
 * GET /api/faculty-support/metrics/:facultyId/:courseId
 * Get faculty assistant metrics
 */
router.get('/metrics/:facultyId/:courseId', async (req: Request, res: Response): Promise<void> => {
  try {
    const { facultyId, courseId } = req.params;

    const metrics = await facultyAssistant.getMetrics(facultyId, courseId);

    res.json({
      success: true,
      data: metrics
    });
  } catch (error) {
    console.error('Error getting metrics:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get metrics'
    });
  }
});

/**
 * PUT /api/faculty-support/config
 * Update faculty assistant configuration
 */
router.put('/config', async (req: Request, res: Response): Promise<void> => {
  try {
    const config = req.body;

    if (!config.facultyId || !config.courseId || !config.teachingStyle) {
      res.status(400).json({
        success: false,
        error: 'Missing required fields: facultyId, courseId, teachingStyle'
      });
      return;
    }

    await facultyAssistant.updateConfig(config);

    res.json({
      success: true,
      message: 'Configuration updated successfully'
    });
  } catch (error) {
    console.error('Error updating config:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to update configuration'
    });
  }
});

export default router;
