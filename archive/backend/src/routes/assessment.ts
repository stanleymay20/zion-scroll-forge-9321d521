import { Router, Request, Response } from 'express';
import { body, param, query, validationResult } from 'express-validator';

const router = Router();

// Mock data stores (in production, these would be database operations)
const assessmentFrameworks = new Map();
const assessmentResults = new Map();
const competencyProfiles = new Map();
const peerEvaluations = new Map();

/**
 * @route POST /api/assessment/frameworks
 * @desc Create a new assessment framework
 * @access Private
 */
router.post('/frameworks',
  [
    body('name').notEmpty().withMessage('Framework name is required'),
    body('type').isIn(['academic', 'spiritual', 'competency', 'peer_evaluation', 'comprehensive', 'prophetic_alignment'])
      .withMessage('Invalid assessment type'),
    body('courseId').notEmpty().withMessage('Course ID is required'),
    body('aiGradingEnabled').isBoolean().optional(),
    body('propheticAlignment').isBoolean().optional(),
    body('kingdomRelevance').isBoolean().optional()
  ],
  async (req: Request, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          errors: errors.array()
        });
      }

      const frameworkData = {
        id: generateId(),
        name: req.body.name,
        type: req.body.type,
        courseId: req.body.courseId,
        academicComponents: req.body.academicComponents || [],
        spiritualComponents: req.body.spiritualComponents || [],
        competencyComponents: req.body.competencyComponents || [],
        peerEvaluationComponents: req.body.peerEvaluationComponents || [],
        aiGradingEnabled: req.body.aiGradingEnabled ?? true,
        propheticAlignment: req.body.propheticAlignment ?? true,
        kingdomRelevance: req.body.kingdomRelevance ?? true,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      assessmentFrameworks.set(frameworkData.id, frameworkData);

      res.status(201).json({
        success: true,
        data: frameworkData,
        message: 'Assessment framework created successfully'
      });
    } catch (error) {
      console.error('Error creating assessment framework:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }
);

/**
 * @route GET /api/assessment/frameworks/:courseId
 * @desc Get assessment frameworks for a course
 * @access Private
 */
router.get('/frameworks/:courseId',
  [
    param('courseId').notEmpty().withMessage('Course ID is required')
  ],
  async (req: Request, res: Response) => {
    try {
      const { courseId } = req.params;
      
      const courseFrameworks = Array.from(assessmentFrameworks.values())
        .filter((framework: any) => framework.courseId === courseId);

      res.json({
        success: true,
        data: courseFrameworks,
        count: courseFrameworks.length
      });
    } catch (error) {
      console.error('Error fetching assessment frameworks:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }
);

/**
 * @route POST /api/assessment/submit
 * @desc Submit assessment responses for grading
 * @access Private
 */
router.post('/submit',
  [
    body('assessmentId').notEmpty().withMessage('Assessment ID is required'),
    body('studentId').notEmpty().withMessage('Student ID is required'),
    body('responses').isArray().withMessage('Responses must be an array'),
    body('submissionType').isIn(['academic', 'spiritual', 'competency', 'peer_evaluation'])
      .withMessage('Invalid submission type')
  ],
  async (req: Request, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          errors: errors.array()
        });
      }

      const { assessmentId, studentId, responses, submissionType } = req.body;

      // Simulate AI grading process
      const gradingResult = await simulateAIGrading(responses, submissionType);

      const assessmentResult = {
        id: generateId(),
        assessmentId,
        studentId,
        submissionType,
        responses,
        academicScore: gradingResult.academicScore,
        spiritualScore: gradingResult.spiritualScore,
        competencyScores: gradingResult.competencyScores,
        peerEvaluationScores: gradingResult.peerEvaluationScores || [],
        aiFeedback: gradingResult.aiFeedback,
        humanFeedback: {
          instructorId: '',
          writtenFeedback: '',
          spiritualEncouragement: '',
          mentorshipRecommendations: [],
          prayerRequests: []
        },
        overallGrade: calculateOverallGrade(gradingResult.academicScore, gradingResult.spiritualScore),
        scrollCoinEarned: calculateScrollCoinReward(gradingResult.academicScore, gradingResult.spiritualScore),
        areasForGrowth: gradingResult.aiFeedback.areas_for_improvement,
        strengthsIdentified: gradingResult.aiFeedback.strengths,
        nextSteps: gradingResult.aiFeedback.next_learning_steps,
        propheticInsights: gradingResult.propheticInsights,
        kingdomImpactPotential: calculateKingdomImpactPotential(gradingResult.spiritualScore),
        submittedAt: new Date(),
        gradedAt: new Date()
      };

      assessmentResults.set(assessmentResult.id, assessmentResult);

      res.status(201).json({
        success: true,
        data: assessmentResult,
        message: 'Assessment submitted and graded successfully'
      });
    } catch (error) {
      console.error('Error submitting assessment:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }
);

/**
 * @route GET /api/assessment/results/:studentId
 * @desc Get assessment results for a student
 * @access Private
 */
router.get('/results/:studentId',
  [
    param('studentId').notEmpty().withMessage('Student ID is required'),
    query('courseId').optional(),
    query('assessmentType').optional(),
    query('limit').isInt({ min: 1, max: 100 }).optional(),
    query('offset').isInt({ min: 0 }).optional()
  ],
  async (req: Request, res: Response) => {
    try {
      const { studentId } = req.params;
      const { courseId, assessmentType, limit = 20, offset = 0 } = req.query;

      let studentResults = Array.from(assessmentResults.values())
        .filter((result: any) => result.studentId === studentId);

      // Apply filters
      if (courseId) {
        studentResults = studentResults.filter((result: any) => {
          const framework = assessmentFrameworks.get(result.assessmentId);
          return framework && framework.courseId === courseId;
        });
      }

      if (assessmentType) {
        studentResults = studentResults.filter((result: any) => result.submissionType === assessmentType);
      }

      // Sort by submission date (newest first)
      studentResults.sort((a: any, b: any) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime());

      // Apply pagination
      const paginatedResults = studentResults.slice(Number(offset), Number(offset) + Number(limit));

      res.json({
        success: true,
        data: paginatedResults,
        pagination: {
          total: studentResults.length,
          limit: Number(limit),
          offset: Number(offset),
          hasMore: Number(offset) + Number(limit) < studentResults.length
        }
      });
    } catch (error) {
      console.error('Error fetching assessment results:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }
);

/**
 * @route POST /api/assessment/peer-evaluation
 * @desc Submit peer evaluation
 * @access Private
 */
router.post('/peer-evaluation',
  [
    body('evaluationId').notEmpty().withMessage('Evaluation ID is required'),
    body('evaluatorId').notEmpty().withMessage('Evaluator ID is required'),
    body('evaluatedId').notEmpty().withMessage('Evaluated student ID is required'),
    body('scores').isObject().withMessage('Scores must be an object'),
    body('qualitativeFeedback').notEmpty().withMessage('Qualitative feedback is required'),
    body('spiritualEncouragement').notEmpty().withMessage('Spiritual encouragement is required'),
    body('areasOfStrength').isArray().withMessage('Areas of strength must be an array'),
    body('areasForGrowth').isArray().withMessage('Areas for growth must be an array')
  ],
  async (req: Request, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          errors: errors.array()
        });
      }

      const {
        evaluationId,
        evaluatorId,
        evaluatedId,
        scores,
        qualitativeFeedback,
        spiritualEncouragement,
        areasOfStrength,
        areasForGrowth,
        prayerRequests = [],
        kingdomImpactObservations = []
      } = req.body;

      // Validate feedback content
      const validationResult = validatePeerFeedback({
        qualitativeFeedback,
        spiritualEncouragement,
        areasOfStrength,
        areasForGrowth
      });

      if (!validationResult.isValid) {
        return res.status(400).json({
          success: false,
          message: 'Feedback validation failed',
          errors: validationResult.errors
        });
      }

      const peerFeedback = {
        id: generateId(),
        evaluationId,
        evaluatorId,
        evaluatedId,
        scores,
        qualitativeFeedback,
        spiritualEncouragement,
        areasOfStrength,
        areasForGrowth,
        prayerRequests,
        kingdomImpactObservations,
        submissionDate: new Date(),
        anonymous: false // This would come from evaluation settings
      };

      peerEvaluations.set(peerFeedback.id, peerFeedback);

      res.status(201).json({
        success: true,
        data: peerFeedback,
        message: 'Peer evaluation submitted successfully'
      });
    } catch (error) {
      console.error('Error submitting peer evaluation:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }
);

/**
 * @route GET /api/assessment/peer-evaluation/:studentId
 * @desc Get peer evaluation results for a student
 * @access Private
 */
router.get('/peer-evaluation/:studentId',
  [
    param('studentId').notEmpty().withMessage('Student ID is required'),
    query('evaluationId').optional()
  ],
  async (req: Request, res: Response) => {
    try {
      const { studentId } = req.params;
      const { evaluationId } = req.query;

      let studentPeerEvaluations = Array.from(peerEvaluations.values())
        .filter((evaluation: any) => evaluation.evaluatedId === studentId);

      if (evaluationId) {
        studentPeerEvaluations = studentPeerEvaluations.filter(
          (evaluation: any) => evaluation.evaluationId === evaluationId
        );
      }

      // Process and aggregate peer evaluation results
      const aggregatedResults = processPeerEvaluationResults(studentPeerEvaluations);

      res.json({
        success: true,
        data: {
          rawEvaluations: studentPeerEvaluations,
          aggregatedResults
        }
      });
    } catch (error) {
      console.error('Error fetching peer evaluations:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }
);

/**
 * @route POST /api/assessment/competency
 * @desc Submit competency assessment
 * @access Private
 */
router.post('/competency',
  [
    body('studentId').notEmpty().withMessage('Student ID is required'),
    body('competencyType').isIn(['technical_skills', 'leadership', 'communication', 'problem_solving', 'creativity', 'entrepreneurship', 'ministry_skills', 'cultural_competency'])
      .withMessage('Invalid competency type'),
    body('evidenceItems').isArray().withMessage('Evidence items must be an array'),
    body('practicalDemonstration').optional().isObject()
  ],
  async (req: Request, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          errors: errors.array()
        });
      }

      const {
        studentId,
        competencyType,
        evidenceItems,
        practicalDemonstration,
        peerValidations = [],
        industryFeedback = []
      } = req.body;

      // Assess competency based on evidence and demonstrations
      const competencyAssessment = await assessCompetency({
        studentId,
        competencyType,
        evidenceItems,
        practicalDemonstration,
        peerValidations,
        industryFeedback
      });

      // Update or create competency profile
      let profile = competencyProfiles.get(studentId) || {
        studentId,
        competencies: [],
        overallLevel: 'novice',
        kingdomReadiness: 0,
        industryAlignment: 0,
        portfolioCompleteness: 0,
        practicalDemonstrations: [],
        certifications: [],
        lastUpdated: new Date()
      };

      // Update competency record
      const existingCompetencyIndex = profile.competencies.findIndex(
        (c: any) => c.competencyType === competencyType
      );

      if (existingCompetencyIndex >= 0) {
        profile.competencies[existingCompetencyIndex] = competencyAssessment;
      } else {
        profile.competencies.push(competencyAssessment);
      }

      profile.lastUpdated = new Date();
      competencyProfiles.set(studentId, profile);

      res.status(201).json({
        success: true,
        data: {
          competencyAssessment,
          updatedProfile: profile
        },
        message: 'Competency assessment completed successfully'
      });
    } catch (error) {
      console.error('Error processing competency assessment:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }
);

/**
 * @route GET /api/assessment/competency/:studentId
 * @desc Get competency profile for a student
 * @access Private
 */
router.get('/competency/:studentId',
  [
    param('studentId').notEmpty().withMessage('Student ID is required')
  ],
  async (req: Request, res: Response) => {
    try {
      const { studentId } = req.params;
      
      const profile = competencyProfiles.get(studentId);
      
      if (!profile) {
        return res.status(404).json({
          success: false,
          message: 'Competency profile not found'
        });
      }

      // Generate comprehensive competency report
      const competencyReport = generateCompetencyReport(profile);

      res.json({
        success: true,
        data: {
          profile,
          report: competencyReport
        }
      });
    } catch (error) {
      console.error('Error fetching competency profile:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }
);

/**
 * @route GET /api/assessment/analytics/:courseId
 * @desc Get assessment analytics for a course
 * @access Private (Instructor/Admin)
 */
router.get('/analytics/:courseId',
  [
    param('courseId').notEmpty().withMessage('Course ID is required')
  ],
  async (req: Request, res: Response) => {
    try {
      const { courseId } = req.params;

      // Get all assessment results for the course
      const courseResults = Array.from(assessmentResults.values())
        .filter((result: any) => {
          const framework = assessmentFrameworks.get(result.assessmentId);
          return framework && framework.courseId === courseId;
        });

      const analytics = generateAssessmentAnalytics(courseResults);

      res.json({
        success: true,
        data: analytics
      });
    } catch (error) {
      console.error('Error generating assessment analytics:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }
);

// Helper functions
function generateId(): string {
  return Math.random().toString(36).substr(2, 9);
}

async function simulateAIGrading(responses: any[], submissionType: string) {
  // Simulate AI grading process
  const academicScore = Math.floor(Math.random() * 30) + 70; // 70-100
  const spiritualScore = Math.floor(Math.random() * 30) + 70; // 70-100

  return {
    academicScore,
    spiritualScore,
    competencyScores: [
      {
        competency: 'Technical Skills',
        score: Math.floor(Math.random() * 30) + 70,
        level_achieved: 'competent',
        evidence: ['Completed assignment', 'Peer validation'],
        growth_recommendations: ['Advanced techniques', 'Mentorship']
      }
    ],
    aiFeedback: {
      strengths: ['Strong biblical foundation', 'Clear analytical thinking'],
      areas_for_improvement: ['Cultural sensitivity', 'Communication skills'],
      personalized_recommendations: ['Cross-cultural training', 'Public speaking practice'],
      spiritual_insights: ['Growing in wisdom', 'Developing servant heart'],
      cultural_considerations: ['Consider global perspectives'],
      next_learning_steps: ['Advanced courses', 'Practical application']
    },
    propheticInsights: [
      {
        insight: 'God is developing your teaching gift',
        scripture_reference: '1 Timothy 4:14',
        application: 'Look for opportunities to teach others',
        confirmation_level: 0.8,
        source: 'ai_prophetic_intelligence'
      }
    ]
  };
}

function calculateOverallGrade(academicScore: number, spiritualScore: number): string {
  const average = (academicScore + spiritualScore) / 2;
  if (average >= 90) return 'A';
  if (average >= 80) return 'B';
  if (average >= 70) return 'C';
  if (average >= 60) return 'D';
  return 'F';
}

function calculateScrollCoinReward(academicScore: number, spiritualScore: number): number {
  const baseReward = 50;
  const bonusMultiplier = ((academicScore + spiritualScore) / 200);
  return Math.floor(baseReward * bonusMultiplier);
}

function calculateKingdomImpactPotential(spiritualScore: number): number {
  return spiritualScore / 100;
}

function validatePeerFeedback(feedback: any): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!feedback.qualitativeFeedback || feedback.qualitativeFeedback.length < 10) {
    errors.push('Qualitative feedback must be at least 10 characters');
  }

  if (!feedback.spiritualEncouragement || feedback.spiritualEncouragement.length < 5) {
    errors.push('Spiritual encouragement is required');
  }

  if (!feedback.areasOfStrength || feedback.areasOfStrength.length === 0) {
    errors.push('At least one area of strength must be identified');
  }

  // Check for inappropriate language
  const inappropriateWords = ['hate', 'stupid', 'worthless', 'failure'];
  const allText = [
    feedback.qualitativeFeedback,
    feedback.spiritualEncouragement,
    ...feedback.areasOfStrength,
    ...feedback.areasForGrowth
  ].join(' ').toLowerCase();

  for (const word of inappropriateWords) {
    if (allText.includes(word)) {
      errors.push(`Feedback contains inappropriate language: ${word}`);
    }
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

function processPeerEvaluationResults(evaluations: any[]) {
  if (evaluations.length === 0) {
    return null;
  }

  // Aggregate scores
  const aggregatedScores: { [criterion: string]: number } = {};
  const allCriteria = new Set();

  evaluations.forEach(evaluation => {
    Object.keys(evaluation.scores).forEach(criterion => {
      allCriteria.add(criterion);
    });
  });

  Array.from(allCriteria).forEach((criterion: any) => {
    const scores = evaluations.map(e => e.scores[criterion] || 0);
    aggregatedScores[criterion] = scores.reduce((sum, score) => sum + score, 0) / scores.length;
  });

  // Aggregate qualitative feedback
  const allStrengths = evaluations.flatMap(e => e.areasOfStrength);
  const allGrowthAreas = evaluations.flatMap(e => e.areasForGrowth);
  const allEncouragement = evaluations.map(e => e.spiritualEncouragement).filter(e => e.length > 0);

  return {
    aggregatedScores,
    feedbackSummary: `Based on ${evaluations.length} peer evaluations`,
    spiritualEncouragement: allEncouragement,
    strengthsConsensus: findConsensus(allStrengths),
    growthAreasConsensus: findConsensus(allGrowthAreas),
    overallPeerRating: Object.values(aggregatedScores).reduce((sum: number, score: number) => sum + score, 0) / Object.values(aggregatedScores).length,
    collaborationEffectiveness: aggregatedScores['Collaboration'] || 0,
    spiritualMaturityObserved: aggregatedScores['Character'] || 0
  };
}

function findConsensus(items: string[]): string[] {
  const itemCounts: { [item: string]: number } = {};
  
  items.forEach(item => {
    const normalized = item.toLowerCase().trim();
    itemCounts[normalized] = (itemCounts[normalized] || 0) + 1;
  });

  return Object.entries(itemCounts)
    .filter(([_, count]) => count >= 2)
    .map(([item, _]) => item);
}

async function assessCompetency(data: any) {
  // Simulate competency assessment
  return {
    competencyType: data.competencyType,
    currentLevel: 'competent',
    skillAreas: [],
    evidencePortfolio: data.evidenceItems,
    assessmentHistory: [],
    growthTrajectory: {
      startingLevel: 'novice',
      currentLevel: 'competent',
      targetLevel: 'proficient',
      progressRate: 5,
      estimatedTimeToTarget: 3,
      growthPlan: [],
      milestones: []
    },
    kingdomApplication: {
      applicationArea: data.competencyType,
      impactDescription: 'Positive kingdom impact',
      communitiesBenefited: ['Local church'],
      discipleshipMultiplication: true,
      propheticAlignment: true,
      culturalTransformation: false,
      sustainabilityPlan: 'Continue development',
      measurableOutcomes: ['Skills improved']
    },
    industryValidation: []
  };
}

function generateCompetencyReport(profile: any) {
  const competencyBreakdown: { [key: string]: string } = {};
  const strengthAreas: string[] = [];
  const growthAreas: string[] = [];

  profile.competencies.forEach((competency: any) => {
    competencyBreakdown[competency.competencyType] = competency.currentLevel;
    
    if (competency.currentLevel === 'expert' || competency.currentLevel === 'proficient') {
      strengthAreas.push(competency.competencyType);
    } else if (competency.currentLevel === 'novice' || competency.currentLevel === 'advanced_beginner') {
      growthAreas.push(competency.competencyType);
    }
  });

  return {
    overallCompetencyLevel: profile.overallLevel,
    competencyBreakdown,
    strengthAreas,
    growthAreas,
    kingdomReadiness: profile.kingdomReadiness,
    industryAlignment: profile.industryAlignment,
    careerRecommendations: ['Software Developer', 'Ministry Leader'],
    ministryOpportunities: ['Church IT', 'Digital Ministry'],
    nextSteps: ['Advanced training', 'Mentorship'],
    mentorshipNeeds: ['Technical mentor', 'Spiritual guide']
  };
}

function generateAssessmentAnalytics(results: any[]) {
  if (results.length === 0) {
    return {
      totalAssessments: 0,
      averageAcademicScore: 0,
      averageSpiritualScore: 0,
      gradeDistribution: {},
      commonStrengths: [],
      commonWeaknesses: [],
      spiritualGrowthTrends: [],
      recommendedInterventions: []
    };
  }

  const academicScores = results.map(r => r.academicScore);
  const spiritualScores = results.map(r => r.spiritualScore);
  const grades = results.map(r => r.overallGrade);

  const gradeDistribution: { [grade: string]: number } = {};
  grades.forEach(grade => {
    gradeDistribution[grade] = (gradeDistribution[grade] || 0) + 1;
  });

  return {
    totalAssessments: results.length,
    averageAcademicScore: academicScores.reduce((sum, score) => sum + score, 0) / academicScores.length,
    averageSpiritualScore: spiritualScores.reduce((sum, score) => sum + score, 0) / spiritualScores.length,
    gradeDistribution,
    commonStrengths: ['Biblical foundation', 'Critical thinking'],
    commonWeaknesses: ['Cultural sensitivity', 'Communication'],
    spiritualGrowthTrends: ['Increasing biblical knowledge', 'Growing in character'],
    recommendedInterventions: ['Cultural competency training', 'Communication workshops']
  };
}

export default router;