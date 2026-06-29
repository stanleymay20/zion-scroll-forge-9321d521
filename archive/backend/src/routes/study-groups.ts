/**
 * Study Groups API Routes
 * "As iron sharpens iron, so one person sharpens another" - Proverbs 27:17
 */

import express, { Request, Response } from 'express';
import { authenticate } from '../middleware/auth';
import StudyGroupService from '../services/StudyGroupService';
import GroupAssignmentService from '../services/GroupAssignmentService';
import CollaborativeDocumentService from '../services/CollaborativeDocumentService';
import GroupEventService from '../services/GroupEventService';
import GroupAnalyticsService from '../services/GroupAnalyticsService';
import { logger } from '../utils/logger';

const router = express.Router();

// ============================================================================
// Study Group Management
// ============================================================================

/**
 * Create a new study group
 */
router.post('/', authenticate, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.userId;
    const group = await StudyGroupService.createStudyGroup(userId, req.body);
    
    res.status(201).json({
      success: true,
      group
    });
  } catch (error: any) {
    logger.error('Error creating study group:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to create study group'
    });
  }
});

/**
 * Update a study group
 */
router.put('/:groupId', authenticate, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.userId;
    const group = await StudyGroupService.updateStudyGroup(userId, {
      groupId: req.params.groupId,
      ...req.body
    });
    
    res.json({
      success: true,
      group
    });
  } catch (error: any) {
    logger.error('Error updating study group:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to update study group'
    });
  }
});

/**
 * Get study group by ID
 */
router.get('/:groupId', authenticate, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.userId;
    const group = await StudyGroupService.getStudyGroupById(req.params.groupId, userId);
    
    res.json({
      success: true,
      group
    });
  } catch (error: any) {
    logger.error('Error getting study group:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to get study group'
    });
  }
});

/**
 * Get all study groups with filters
 */
router.get('/', authenticate, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.userId;
    const result = await StudyGroupService.getStudyGroups(userId, {
      courseId: req.query.courseId as string,
      tags: req.query.tags ? (req.query.tags as string).split(',') : undefined,
      interests: req.query.interests ? (req.query.interests as string).split(',') : undefined,
      academicLevel: req.query.academicLevel as string,
      status: req.query.status as any,
      limit: req.query.limit ? parseInt(req.query.limit as string) : undefined,
      offset: req.query.offset ? parseInt(req.query.offset as string) : undefined
    });
    
    res.json({
      success: true,
      ...result
    });
  } catch (error: any) {
    logger.error('Error getting study groups:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to get study groups'
    });
  }
});

/**
 * Search study groups
 */
router.get('/search', authenticate, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.userId;
    const result = await StudyGroupService.searchStudyGroups(userId, {
      query: req.query.q as string,
      courseId: req.query.courseId as string,
      tags: req.query.tags ? (req.query.tags as string).split(',') : undefined,
      limit: req.query.limit ? parseInt(req.query.limit as string) : undefined,
      offset: req.query.offset ? parseInt(req.query.offset as string) : undefined
    });
    
    res.json({
      success: true,
      ...result
    });
  } catch (error: any) {
    logger.error('Error searching study groups:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to search study groups'
    });
  }
});

/**
 * Get user's study groups
 */
router.get('/user/my-groups', authenticate, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.userId;
    const groups = await StudyGroupService.getUserStudyGroups(userId);
    
    res.json({
      success: true,
      groups
    });
  } catch (error: any) {
    logger.error('Error getting user study groups:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to get user study groups'
    });
  }
});

/**
 * Join a study group
 */
router.post('/:groupId/join', authenticate, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.userId;
    const result = await StudyGroupService.joinStudyGroup(userId, {
      groupId: req.params.groupId
    });
    
    res.json({
      success: true,
      ...result
    });
  } catch (error: any) {
    logger.error('Error joining study group:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to join study group'
    });
  }
});

/**
 * Leave a study group
 */
router.post('/:groupId/leave', authenticate, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.userId;
    await StudyGroupService.leaveStudyGroup(userId, req.params.groupId);
    
    res.json({
      success: true,
      message: 'Successfully left the study group'
    });
  } catch (error: any) {
    logger.error('Error leaving study group:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to leave study group'
    });
  }
});

/**
 * Delete a study group
 */
router.delete('/:groupId', authenticate, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.userId;
    await StudyGroupService.deleteStudyGroup(userId, req.params.groupId);
    
    res.json({
      success: true,
      message: 'Study group deleted successfully'
    });
  } catch (error: any) {
    logger.error('Error deleting study group:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to delete study group'
    });
  }
});

/**
 * Get group members
 */
router.get('/:groupId/members', authenticate, async (req: Request, res: Response) => {
  try {
    const members = await StudyGroupService.getGroupMembers(req.params.groupId);
    
    res.json({
      success: true,
      members
    });
  } catch (error: any) {
    logger.error('Error getting group members:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to get group members'
    });
  }
});

/**
 * Update member role
 */
router.put('/:groupId/members/:userId/role', authenticate, async (req: Request, res: Response) => {
  try {
    const requesterId = (req as any).user.userId;
    const member = await StudyGroupService.updateMemberRole(requesterId, {
      groupId: req.params.groupId,
      userId: req.params.userId,
      role: req.body.role
    });
    
    res.json({
      success: true,
      member
    });
  } catch (error: any) {
    logger.error('Error updating member role:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to update member role'
    });
  }
});

/**
 * Remove member from group
 */
router.delete('/:groupId/members/:userId', authenticate, async (req: Request, res: Response) => {
  try {
    const requesterId = (req as any).user.userId;
    await StudyGroupService.removeMember(requesterId, {
      groupId: req.params.groupId,
      userId: req.params.userId
    });
    
    res.json({
      success: true,
      message: 'Member removed successfully'
    });
  } catch (error: any) {
    logger.error('Error removing member:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to remove member'
    });
  }
});

// ============================================================================
// Group Assignments
// ============================================================================

/**
 * Create group assignment
 */
router.post('/:groupId/assignments', authenticate, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.userId;
    const assignment = await GroupAssignmentService.createAssignment(userId, {
      groupId: req.params.groupId,
      ...req.body
    });
    
    res.status(201).json({
      success: true,
      assignment
    });
  } catch (error: any) {
    logger.error('Error creating assignment:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to create assignment'
    });
  }
});

/**
 * Get group assignments
 */
router.get('/:groupId/assignments', authenticate, async (req: Request, res: Response) => {
  try {
    const assignments = await GroupAssignmentService.getGroupAssignments(req.params.groupId);
    
    res.json({
      success: true,
      assignments
    });
  } catch (error: any) {
    logger.error('Error getting assignments:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to get assignments'
    });
  }
});

/**
 * Submit group assignment
 */
router.post('/assignments/:assignmentId/submit', authenticate, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.userId;
    const submission = await GroupAssignmentService.submitAssignment(
      userId,
      {
        assignmentId: req.params.assignmentId,
        content: req.body.content
      },
      (req as any).files
    );
    
    res.json({
      success: true,
      submission
    });
  } catch (error: any) {
    logger.error('Error submitting assignment:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to submit assignment'
    });
  }
});

/**
 * Get assignment submissions
 */
router.get('/assignments/:assignmentId/submissions', authenticate, async (req: Request, res: Response) => {
  try {
    const submissions = await GroupAssignmentService.getAssignmentSubmissions(req.params.assignmentId);
    
    res.json({
      success: true,
      submissions
    });
  } catch (error: any) {
    logger.error('Error getting submissions:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to get submissions'
    });
  }
});

/**
 * Grade assignment submission
 */
router.post('/assignments/submissions/:submissionId/grade', authenticate, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.userId;
    const submission = await GroupAssignmentService.gradeSubmission(
      userId,
      req.params.submissionId,
      req.body.grade,
      req.body.feedback
    );
    
    res.json({
      success: true,
      submission
    });
  } catch (error: any) {
    logger.error('Error grading submission:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to grade submission'
    });
  }
});

/**
 * Update assignment status
 */
router.put('/assignments/:assignmentId/status', authenticate, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.userId;
    const assignment = await GroupAssignmentService.updateAssignmentStatus(
      userId,
      req.params.assignmentId,
      req.body.status
    );
    
    res.json({
      success: true,
      assignment
    });
  } catch (error: any) {
    logger.error('Error updating assignment status:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to update assignment status'
    });
  }
});

/**
 * Delete assignment
 */
router.delete('/assignments/:assignmentId', authenticate, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.userId;
    await GroupAssignmentService.deleteAssignment(userId, req.params.assignmentId);
    
    res.json({
      success: true,
      message: 'Assignment deleted successfully'
    });
  } catch (error: any) {
    logger.error('Error deleting assignment:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to delete assignment'
    });
  }
});

// ============================================================================
// Collaborative Documents
// ============================================================================

/**
 * Create collaborative document
 */
router.post('/:groupId/documents', authenticate, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.userId;
    const document = await CollaborativeDocumentService.createDocument(userId, {
      groupId: req.params.groupId,
      ...req.body
    });
    
    res.status(201).json({
      success: true,
      document
    });
  } catch (error: any) {
    logger.error('Error creating document:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to create document'
    });
  }
});

/**
 * Get group documents
 */
router.get('/:groupId/documents', authenticate, async (req: Request, res: Response) => {
  try {
    const documents = await CollaborativeDocumentService.getGroupDocuments(req.params.groupId);
    
    res.json({
      success: true,
      documents
    });
  } catch (error: any) {
    logger.error('Error getting documents:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to get documents'
    });
  }
});

/**
 * Get document by ID
 */
router.get('/documents/:documentId', authenticate, async (req: Request, res: Response) => {
  try {
    const document = await CollaborativeDocumentService.getDocumentById(req.params.documentId);
    
    res.json({
      success: true,
      document
    });
  } catch (error: any) {
    logger.error('Error getting document:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to get document'
    });
  }
});

/**
 * Update collaborative document
 */
router.put('/documents/:documentId', authenticate, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.userId;
    const result = await CollaborativeDocumentService.updateDocument(userId, {
      documentId: req.params.documentId,
      content: req.body.content,
      lockDocument: req.body.lockDocument
    });
    
    res.json({
      success: true,
      ...result
    });
  } catch (error: any) {
    logger.error('Error updating document:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to update document'
    });
  }
});

/**
 * Lock document
 */
router.post('/documents/:documentId/lock', authenticate, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.userId;
    const document = await CollaborativeDocumentService.lockDocument(userId, req.params.documentId);
    
    res.json({
      success: true,
      document
    });
  } catch (error: any) {
    logger.error('Error locking document:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to lock document'
    });
  }
});

/**
 * Unlock document
 */
router.post('/documents/:documentId/unlock', authenticate, async (req: Request, res: Response) => {
  try {
    const document = await CollaborativeDocumentService.unlockDocument(req.params.documentId);
    
    res.json({
      success: true,
      document
    });
  } catch (error: any) {
    logger.error('Error unlocking document:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to unlock document'
    });
  }
});

/**
 * Get document history
 */
router.get('/documents/:documentId/history', authenticate, async (req: Request, res: Response) => {
  try {
    const history = await CollaborativeDocumentService.getDocumentHistory(req.params.documentId);
    
    res.json({
      success: true,
      history
    });
  } catch (error: any) {
    logger.error('Error getting document history:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to get document history'
    });
  }
});

/**
 * Delete document
 */
router.delete('/documents/:documentId', authenticate, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.userId;
    await CollaborativeDocumentService.deleteDocument(userId, req.params.documentId);
    
    res.json({
      success: true,
      message: 'Document deleted successfully'
    });
  } catch (error: any) {
    logger.error('Error deleting document:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to delete document'
    });
  }
});

// ============================================================================
// Group Events and Calendar
// ============================================================================

/**
 * Create group event
 */
router.post('/:groupId/events', authenticate, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.userId;
    const event = await GroupEventService.createEvent(userId, {
      groupId: req.params.groupId,
      ...req.body
    });
    
    res.status(201).json({
      success: true,
      event
    });
  } catch (error: any) {
    logger.error('Error creating event:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to create event'
    });
  }
});

/**
 * Get group events
 */
router.get('/:groupId/events', authenticate, async (req: Request, res: Response) => {
  try {
    const startDate = req.query.startDate ? new Date(req.query.startDate as string) : undefined;
    const endDate = req.query.endDate ? new Date(req.query.endDate as string) : undefined;
    
    const events = await GroupEventService.getGroupEvents(req.params.groupId, startDate, endDate);
    
    res.json({
      success: true,
      events
    });
  } catch (error: any) {
    logger.error('Error getting events:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to get events'
    });
  }
});

/**
 * Update event attendance
 */
router.post('/events/:eventId/attendance', authenticate, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.userId;
    const attendance = await GroupEventService.updateAttendance(userId, {
      eventId: req.params.eventId,
      status: req.body.status
    });
    
    res.json({
      success: true,
      attendance
    });
  } catch (error: any) {
    logger.error('Error updating attendance:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to update attendance'
    });
  }
});

/**
 * Get event attendance
 */
router.get('/events/:eventId/attendance', authenticate, async (req: Request, res: Response) => {
  try {
    const attendance = await GroupEventService.getEventAttendance(req.params.eventId);
    
    res.json({
      success: true,
      attendance
    });
  } catch (error: any) {
    logger.error('Error getting attendance:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to get attendance'
    });
  }
});

/**
 * Delete event
 */
router.delete('/events/:eventId', authenticate, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.userId;
    await GroupEventService.deleteEvent(userId, req.params.eventId);
    
    res.json({
      success: true,
      message: 'Event deleted successfully'
    });
  } catch (error: any) {
    logger.error('Error deleting event:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to delete event'
    });
  }
});

// ============================================================================
// Video Conferencing
// ============================================================================

/**
 * Start video conference
 */
router.post('/:groupId/video-conference/start', authenticate, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.userId;
    const result = await GroupEventService.startVideoConference(userId, {
      groupId: req.params.groupId,
      eventId: req.body.eventId,
      provider: req.body.provider
    });
    
    res.json({
      success: true,
      ...result
    });
  } catch (error: any) {
    logger.error('Error starting video conference:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to start video conference'
    });
  }
});

/**
 * End video conference
 */
router.post('/video-conference/:sessionId/end', authenticate, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.userId;
    const session = await GroupEventService.endVideoConference(userId, req.params.sessionId);
    
    res.json({
      success: true,
      session
    });
  } catch (error: any) {
    logger.error('Error ending video conference:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to end video conference'
    });
  }
});

// ============================================================================
// Analytics and Recommendations
// ============================================================================

/**
 * Get group analytics
 */
router.get('/:groupId/analytics', authenticate, async (req: Request, res: Response) => {
  try {
    const startDate = req.query.startDate ? new Date(req.query.startDate as string) : undefined;
    const endDate = req.query.endDate ? new Date(req.query.endDate as string) : undefined;
    
    const analytics = await GroupAnalyticsService.getGroupAnalytics({
      groupId: req.params.groupId,
      startDate,
      endDate
    });
    
    res.json({
      success: true,
      analytics
    });
  } catch (error: any) {
    logger.error('Error getting analytics:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to get analytics'
    });
  }
});

/**
 * Get group recommendations
 */
router.get('/recommendations', authenticate, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.userId;
    const recommendations = await GroupAnalyticsService.getGroupRecommendations({
      userId,
      limit: req.query.limit ? parseInt(req.query.limit as string) : undefined
    });
    
    res.json({
      success: true,
      recommendations
    });
  } catch (error: any) {
    logger.error('Error getting recommendations:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to get recommendations'
    });
  }
});

/**
 * Get group health score
 */
router.get('/:groupId/health-score', authenticate, async (req: Request, res: Response) => {
  try {
    const healthScore = await GroupAnalyticsService.calculateGroupHealthScore(req.params.groupId);
    
    res.json({
      success: true,
      healthScore
    });
  } catch (error: any) {
    logger.error('Error calculating health score:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to calculate health score'
    });
  }
});

export default router; 