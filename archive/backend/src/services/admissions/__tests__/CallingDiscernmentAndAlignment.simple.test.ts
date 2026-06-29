/**
 * Simple tests for Calling Discernment and Scroll Alignment Assessment
 * Tests for task 4.2: Develop calling discernment and scroll alignment assessment
 */

import { PrismaClient } from '@prisma/client';
import { CallingDiscerner, CallingType } from '../CallingDiscerner';
import { ScrollAlignmentEvaluator } from '../ScrollAlignmentEvaluator';
import { SpiritualRecommendationGenerator } from '../SpiritualRecommendationGenerator';
import { PropheticInputIntegrator, PropheticInputType, PropheticSource } from '../PropheticInputIntegrator';

describe('Calling Discernment and Scroll Alignment - Simple Tests', () => {
  let prisma: PrismaClient;

  beforeAll(async () => {
    prisma = new PrismaClient();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  test('CallingDiscerner should identify teaching calling', async () => {
    const callingDiscerner = new CallingDiscerner(prisma);
    
    const testimony = "God has called me to teach and equip the saints for ministry.";
    const ministryExperience = [
      {
        role: 'Bible Study Leader',
        organization: 'Local Church',
        duration: '2 years',
        achievements: ['Led Bible studies']
      }
    ];
    const references = [
      {
        relationship: 'Pastor',
        content: 'Has demonstrated teaching calling with biblical knowledge.'
      }
    ];

    const assessment = await callingDiscerner.assessMinistryCallingClarity(
      testimony,
      ministryExperience,
      references
    );

    expect(assessment.callingClarity).toBeGreaterThan(50);
    expect(assessment.callingType).toBe(CallingType.TEACHING);
    expect(assessment.overallCallingScore).toBeGreaterThan(40);
  });

  test('ScrollAlignmentEvaluator should assess kingdom mindset', async () => {
    const scrollAlignmentEvaluator = new ScrollAlignmentEvaluator(prisma);
    
    const testimony = "I am passionate about advancing God's kingdom through education.";
    const personalStatement = "My vision is to see kingdom principles transform education.";
    const academicHistory = [];
    const references = [];

    const assessment = await scrollAlignmentEvaluator.evaluateScrollAlignment(
      testimony,
      personalStatement,
      academicHistory,
      references
    );

    expect(assessment.kingdomMindset).toBeGreaterThan(50);
    expect(assessment.overallAlignment).toBeGreaterThan(40);
  });

  test('SpiritualRecommendationGenerator should generate recommendations', async () => {
    const spiritualRecommendationGenerator = new SpiritualRecommendationGenerator(prisma);
    
    const callingAssessment = {
      callingClarity: 70,
      divineConfirmation: 65,
      ministryReadiness: 60,
      kingdomVision: 75,
      overallCallingScore: 67,
      callingType: CallingType.TEACHING,
      readinessLevel: 'confirmed' as any
    };

    const alignmentAssessment = {
      kingdomMindset: 70,
      scrollPhilosophy: 65,
      transformationalLearning: 68,
      propheticEducation: 60,
      globalImpact: 72,
      overallAlignment: 67,
      alignmentLevel: 'adequate' as any
    };

    const recommendations = await spiritualRecommendationGenerator.generateComprehensiveRecommendations(
      callingAssessment,
      alignmentAssessment,
      'MATURE',
      70,
      'test-application-id'
    );

    expect(recommendations.spiritualRecommendations.length).toBeGreaterThan(0);
    expect(recommendations.preparationPlan).toBeDefined();
    expect(recommendations.followUpActions.length).toBeGreaterThan(0);
  });

  test('PropheticInputIntegrator should integrate prophetic input', async () => {
    const propheticInputIntegrator = new PropheticInputIntegrator(prisma);
    
    const propheticInputs = [
      {
        id: 'prophetic-1',
        source: PropheticSource.RECOGNIZED_PROPHET,
        prophetId: 'prophet-1',
        prophetName: 'Prophet John',
        prophetCredentials: 'Recognized prophet with 20 years ministry',
        inputType: PropheticInputType.CALLING_CONFIRMATION,
        content: 'I see a strong calling to teaching ministry with kingdom impact.',
        receivedDate: new Date(),
        context: 'During prayer for applicant',
        confidence: 'high' as any,
        verification: {
          isVerified: true,
          verificationMethod: 'elder_confirmation' as any,
          verifiedBy: 'Elder Council',
          verificationDate: new Date(),
          verificationNotes: 'Confirmed by multiple witnesses',
          witnessCount: 3,
          scriptualAlignment: 85
        }
      }
    ];

    const integration = await propheticInputIntegrator.integratePropheticInput(
      'test-application-id',
      propheticInputs
    );

    expect(integration.integratedAssessment.verifiedInputs).toBe(1);
    expect(integration.integratedAssessment.overallConfidence).toBeGreaterThan(60);
    expect(integration.recommendations.length).toBeGreaterThan(0);
  });

  test('Complete workflow integration should work', async () => {
    const callingDiscerner = new CallingDiscerner(prisma);
    const scrollAlignmentEvaluator = new ScrollAlignmentEvaluator(prisma);
    const spiritualRecommendationGenerator = new SpiritualRecommendationGenerator(prisma);
    const propheticInputIntegrator = new PropheticInputIntegrator(prisma);

    // Step 1: Assess calling
    const testimony = "God has called me to prophetic ministry and kingdom education.";
    const ministryExperience = [
      {
        role: 'Prophetic Minister',
        organization: 'Kingdom Church',
        duration: '4 years',
        achievements: ['Accurate prophetic ministry'],
        responsibilities: ['Prophetic ministry', 'Teaching']
      }
    ];
    const references = [
      {
        relationship: 'Senior Pastor',
        content: 'Has demonstrated exceptional prophetic gifting with strong character.'
      }
    ];

    const callingAssessment = await callingDiscerner.assessMinistryCallingClarity(
      testimony,
      ministryExperience,
      references
    );

    // Step 2: Evaluate alignment
    const personalStatement = "I am passionate about transformational kingdom education.";
    const academicHistory = [
      {
        institution: 'Bible College',
        degree: 'Theology',
        gpa: 3.7
      }
    ];

    const alignmentAssessment = await scrollAlignmentEvaluator.evaluateScrollAlignment(
      testimony,
      personalStatement,
      academicHistory,
      references
    );

    // Step 3: Integrate prophetic input
    const propheticInputs = [
      {
        id: 'prophetic-workflow',
        source: PropheticSource.RECOGNIZED_PROPHET,
        prophetId: 'prophet-workflow',
        prophetName: 'Prophet Sarah',
        prophetCredentials: 'Recognized prophetic minister',
        inputType: PropheticInputType.CALLING_CONFIRMATION,
        content: 'I see a strong anointing for prophetic education ministry.',
        receivedDate: new Date(),
        context: 'During prophetic ministry session',
        confidence: 'high' as any,
        verification: {
          isVerified: true,
          verificationMethod: 'elder_confirmation' as any,
          verifiedBy: 'Elder Team',
          verificationDate: new Date(),
          verificationNotes: 'Confirmed by elder team',
          witnessCount: 2,
          scriptualAlignment: 88
        }
      }
    ];

    const propheticIntegration = await propheticInputIntegrator.integratePropheticInput(
      'workflow-test-id',
      propheticInputs
    );

    // Step 4: Generate recommendations
    const comprehensiveRecommendations = await spiritualRecommendationGenerator.generateComprehensiveRecommendations(
      callingAssessment,
      alignmentAssessment,
      'MATURE',
      80,
      'workflow-test-id'
    );

    // Verify results
    expect(callingAssessment.callingType).toBe(CallingType.PROPHETIC);
    expect(alignmentAssessment.overallAlignment).toBeGreaterThan(40);
    expect(propheticIntegration.integratedAssessment.overallConfidence).toBeGreaterThan(60);
    expect(comprehensiveRecommendations.spiritualRecommendations.length).toBeGreaterThan(0);
  });
});