/**
 * Partner Integration API Routes
 * Backend endpoints for partner institution integration
 * Requirements 5.2 and 6.3: API endpoints for partner management
 */

import { Router, Request, Response } from 'express';
import { body, param, query, validationResult } from 'express-validator';

const router = Router();

// Mock data stores (in production, these would be database operations)
const partners = new Map();
const lecturers = new Map();
const sessions = new Map();
const credentials = new Map();

/**
 * GET /api/partners
 * Get all partner institutions
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const { status, type, integrationLevel } = req.query;
    
    let partnerList = Array.from(partners.values());
    
    // Apply filters
    if (status) {
      partnerList = partnerList.filter(p => p.status === status);
    }
    if (type) {
      partnerList = partnerList.filter(p => p.type === type);
    }
    if (integrationLevel) {
      partnerList = partnerList.filter(p => p.integrationLevel === integrationLevel);
    }

    res.json({
      success: true,
      data: partnerList,
      total: partnerList.length
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to fetch partners',
      details: error.message
    });
  }
});

/**
 * GET /api/partners/:id
 * Get specific partner institution
 */
router.get('/:id', [
  param('id').notEmpty().withMessage('Partner ID is required')
], async (req: Request, res: Response) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: errors.array()
      });
    }

    const partner = partners.get(req.params.id);
    if (!partner) {
      return res.status(404).json({
        success: false,
        error: 'Partner not found'
      });
    }

    res.json({
      success: true,
      data: partner
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to fetch partner',
      details: error.message
    });
  }
});

/**
 * POST /api/partners
 * Create new partner institution
 */
router.post('/', [
  body('name').notEmpty().withMessage('Partner name is required'),
  body('type').isIn(['academic_institution', 'research_center', 'tech_alliance', 'kingdom_organization', 'ngo', 'startup_incubator'])
    .withMessage('Invalid partner type'),
  body('country').notEmpty().withMessage('Country is required'),
  body('apiEndpoint').isURL().withMessage('Valid API endpoint URL is required'),
  body('contactInfo.email').isEmail().withMessage('Valid contact email is required')
], async (req: Request, res: Response) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: errors.array()
      });
    }

    const partnerId = `partner_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const partner = {
      id: partnerId,
      ...req.body,
      status: 'pending',
      integrationLevel: 'basic',
      supportedServices: [],
      credentials: {
        authType: 'api_key',
        credentials: {},
        lastVerified: new Date()
      },
      createdAt: new Date(),
      updatedAt: new Date()
    };

    partners.set(partnerId, partner);

    res.status(201).json({
      success: true,
      data: partner,
      message: 'Partner created successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to create partner',
      details: error.message
    });
  }
});

/**
 * PUT /api/partners/:id
 * Update partner institution
 */
router.put('/:id', [
  param('id').notEmpty().withMessage('Partner ID is required')
], async (req: Request, res: Response) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: errors.array()
      });
    }

    const partner = partners.get(req.params.id);
    if (!partner) {
      return res.status(404).json({
        success: false,
        error: 'Partner not found'
      });
    }

    const updatedPartner = {
      ...partner,
      ...req.body,
      updatedAt: new Date()
    };

    partners.set(req.params.id, updatedPartner);

    res.json({
      success: true,
      data: updatedPartner,
      message: 'Partner updated successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to update partner',
      details: error.message
    });
  }
});

/**
 * POST /api/partners/:id/test-connection
 * Test connection to partner API
 */
router.post('/:id/test-connection', [
  param('id').notEmpty().withMessage('Partner ID is required')
], async (req: Request, res: Response) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: errors.array()
      });
    }

    const partner = partners.get(req.params.id);
    if (!partner) {
      return res.status(404).json({
        success: false,
        error: 'Partner not found'
      });
    }

    // Mock connection test - in production, this would actually test the API
    const connectionResult = {
      connected: Math.random() > 0.2, // 80% success rate for demo
      responseTime: Math.floor(Math.random() * 1000) + 100,
      lastTested: new Date(),
      apiVersion: partner.apiVersion || '1.0',
      status: 'active'
    };

    res.json({
      success: true,
      data: connectionResult,
      message: connectionResult.connected ? 'Connection successful' : 'Connection failed'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to test connection',
      details: error.message
    });
  }
});

/**
 * GET /api/partners/:id/lecturers
 * Get guest lecturers from specific partner
 */
router.get('/:id/lecturers', [
  param('id').notEmpty().withMessage('Partner ID is required')
], async (req: Request, res: Response) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: errors.array()
      });
    }

    const partner = partners.get(req.params.id);
    if (!partner) {
      return res.status(404).json({
        success: false,
        error: 'Partner not found'
      });
    }

    const partnerLecturers = Array.from(lecturers.values())
      .filter(lecturer => lecturer.partnerId === req.params.id);

    const { expertise, availability, spiritualAlignment } = req.query;
    
    let filteredLecturers = partnerLecturers;
    
    if (expertise) {
      const expertiseArray = Array.isArray(expertise) ? expertise : [expertise];
      filteredLecturers = filteredLecturers.filter(lecturer =>
        lecturer.expertise.some(exp => expertiseArray.includes(exp))
      );
    }

    if (spiritualAlignment === 'true') {
      filteredLecturers = filteredLecturers.filter(lecturer =>
        lecturer.spiritualAlignment.christianWorldview &&
        lecturer.spiritualAlignment.scrollPrinciplesAlignment >= 7
      );
    }

    res.json({
      success: true,
      data: filteredLecturers,
      total: filteredLecturers.length
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to fetch lecturers',
      details: error.message
    });
  }
});

/**
 * POST /api/partners/sessions
 * Schedule a guest lecture session
 */
router.post('/sessions', [
  body('lecturerId').notEmpty().withMessage('Lecturer ID is required'),
  body('courseId').notEmpty().withMessage('Course ID is required'),
  body('title').notEmpty().withMessage('Session title is required'),
  body('scheduledDate').isISO8601().withMessage('Valid scheduled date is required'),
  body('duration').isInt({ min: 30, max: 480 }).withMessage('Duration must be between 30 and 480 minutes'),
  body('format').isIn(['live_virtual', 'recorded', 'hybrid', 'in_person', 'xr_immersive'])
    .withMessage('Invalid session format'),
  body('maxAttendees').isInt({ min: 1 }).withMessage('Max attendees must be at least 1')
], async (req: Request, res: Response) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: errors.array()
      });
    }

    const lecturer = lecturers.get(req.body.lecturerId);
    if (!lecturer) {
      return res.status(404).json({
        success: false,
        error: 'Lecturer not found'
      });
    }

    const sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const session = {
      id: sessionId,
      ...req.body,
      scheduledDate: new Date(req.body.scheduledDate),
      registeredStudents: [],
      status: 'scheduled',
      materials: [],
      createdAt: new Date(),
      updatedAt: new Date()
    };

    sessions.set(sessionId, session);

    res.status(201).json({
      success: true,
      data: session,
      message: 'Session scheduled successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to schedule session',
      details: error.message
    });
  }
});

/**
 * GET /api/partners/sessions
 * Get all sessions
 */
router.get('/sessions', async (req: Request, res: Response) => {
  try {
    const { status, lecturerId, courseId, upcoming } = req.query;
    
    let sessionList = Array.from(sessions.values());
    
    // Apply filters
    if (status) {
      sessionList = sessionList.filter(s => s.status === status);
    }
    if (lecturerId) {
      sessionList = sessionList.filter(s => s.lecturerId === lecturerId);
    }
    if (courseId) {
      sessionList = sessionList.filter(s => s.courseId === courseId);
    }
    if (upcoming === 'true') {
      const now = new Date();
      sessionList = sessionList.filter(s => new Date(s.scheduledDate) > now);
    }

    // Sort by scheduled date
    sessionList.sort((a, b) => new Date(a.scheduledDate).getTime() - new Date(b.scheduledDate).getTime());

    res.json({
      success: true,
      data: sessionList,
      total: sessionList.length
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to fetch sessions',
      details: error.message
    });
  }
});

/**
 * POST /api/partners/credentials/submit
 * Submit credential for recognition
 */
router.post('/credentials/submit', [
  body('partnerId').notEmpty().withMessage('Partner ID is required'),
  body('scrollCredentialId').notEmpty().withMessage('ScrollUniversity credential ID is required'),
  body('credentialType').notEmpty().withMessage('Credential type is required')
], async (req: Request, res: Response) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: errors.array()
      });
    }

    const partner = partners.get(req.body.partnerId);
    if (!partner) {
      return res.status(404).json({
        success: false,
        error: 'Partner not found'
      });
    }

    const recognitionId = `rec_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const recognition = {
      id: recognitionId,
      partnerId: req.body.partnerId,
      scrollCredentialId: req.body.scrollCredentialId,
      credentialType: req.body.credentialType,
      partnerCredentialType: `${req.body.credentialType} (Partner Recognized)`,
      recognitionLevel: 'full_recognition',
      equivalentCredits: 120,
      validityPeriod: 60,
      requirements: [
        {
          type: 'spiritual_assessment',
          description: 'Demonstrate spiritual alignment with partner mission',
          completed: false
        },
        {
          type: 'portfolio_review',
          description: 'Submit portfolio for review',
          completed: false
        }
      ],
      status: 'pending',
      submittedAt: new Date(),
      updatedAt: new Date()
    };

    credentials.set(recognitionId, recognition);

    res.status(201).json({
      success: true,
      data: recognition,
      message: 'Credential submitted for recognition'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to submit credential',
      details: error.message
    });
  }
});

/**
 * GET /api/partners/credentials/:id
 * Get credential recognition status
 */
router.get('/credentials/:id', [
  param('id').notEmpty().withMessage('Recognition ID is required')
], async (req: Request, res: Response) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: errors.array()
      });
    }

    const recognition = credentials.get(req.params.id);
    if (!recognition) {
      return res.status(404).json({
        success: false,
        error: 'Credential recognition not found'
      });
    }

    res.json({
      success: true,
      data: recognition
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to fetch credential recognition',
      details: error.message
    });
  }
});

/**
 * GET /api/partners/analytics
 * Get partnership analytics
 */
router.get('/analytics', async (req: Request, res: Response) => {
  try {
    const partnerList = Array.from(partners.values());
    const sessionList = Array.from(sessions.values());
    const credentialList = Array.from(credentials.values());

    const analytics = {
      totalPartners: partnerList.length,
      activePartners: partnerList.filter(p => p.status === 'active').length,
      totalSessions: sessionList.length,
      completedSessions: sessionList.filter(s => s.status === 'completed').length,
      upcomingSessions: sessionList.filter(s => s.status === 'scheduled' && new Date(s.scheduledDate) > new Date()).length,
      totalCredentials: credentialList.length,
      approvedCredentials: credentialList.filter(c => c.status === 'approved').length,
      pendingCredentials: credentialList.filter(c => c.status === 'pending').length,
      partnerDistribution: partnerList.reduce((acc, partner) => {
        acc[partner.type] = (acc[partner.type] || 0) + 1;
        return acc;
      }, {}),
      sessionFormats: sessionList.reduce((acc, session) => {
        acc[session.format] = (acc[session.format] || 0) + 1;
        return acc;
      }, {}),
      monthlyTrends: {
        sessions: generateMonthlyTrends(sessionList, 'scheduledDate'),
        credentials: generateMonthlyTrends(credentialList, 'submittedAt')
      }
    };

    res.json({
      success: true,
      data: analytics
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to fetch analytics',
      details: error.message
    });
  }
});

/**
 * Helper function to generate monthly trends
 */
function generateMonthlyTrends(items: any[], dateField: string) {
  const trends = {};
  const now = new Date();
  
  for (let i = 5; i >= 0; i--) {
    const month = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const monthKey = month.toISOString().substr(0, 7); // YYYY-MM format
    trends[monthKey] = 0;
  }

  items.forEach(item => {
    const itemDate = new Date(item[dateField]);
    const monthKey = itemDate.toISOString().substr(0, 7);
    if (trends.hasOwnProperty(monthKey)) {
      trends[monthKey]++;
    }
  });

  return trends;
}

export default router;