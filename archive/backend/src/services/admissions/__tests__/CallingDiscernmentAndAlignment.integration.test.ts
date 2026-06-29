/**
 * Integration tests for Calling Discernment and Scroll Alignment Assessment
 * Tests for task 4.2: Develop calling discernment and scroll alignment assessment
 */

import { PrismaClient } from '@prisma/client';
import { CallingDiscerner, CallingType } from '../CallingDiscerner';
import { ScrollAlignmentEvaluator } from '../ScrollAlignmentEvaluator';
import { SpiritualRecommendationGenerator } from '../SpiritualRecommendationGenerator';
import { PropheticInputIntegrator, PropheticInputType, PropheticSource } from '../PropheticInputIntegrator';

describe('Calling Discernment and Scroll Alignment Integration', () => {
  let prisma: PrismaClient;

  beforeAll(async () => {
    prisma = new PrismaClient();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('should complete full calling discernment workflow', async () => {
    const callingDiscerner = new CallingDiscerner(prisma);
    const scrollAlignmentEvaluator = new ScrollAlignmentEvaluator(prisma);
    const spiritualRecommendationGenerator = new SpiritualRecommendationGenerator(prisma);
    const propheticInputIntegrator = new PropheticInputIntegrator(prisma);

    // Step 1: Assess ministry calling
    const testimony = "God has called me to prophetic ministry and kingdom education. I have received multiple confirmations and have been serving in prophetic ministry for several years.";
    const ministryExperience = [
      {
        role: 'Prophetic Minister',
        organization: 'Kingdom Church',
        duration: '4 years',
        achievements: ['Accurate prophetic ministry', 'Trained emerging prophets'],
        responsibilities: ['Prophetic ministry', 'Teaching', 'Mentoring']
      }
    ];
    const references = [
      {
        relationship: 'Senior Pastor',
        content: 'Has demonstrated exceptional prophetic gifting with high accuracy and strong character. Called to higher levels of ministry and education.'
      }
    ];

    const callingAssessment = await callingDiscerner.assessMinistryCallingClarity(
      testimony,
      ministryExperience,
      references
    );

    // Step 2: Evaluate scroll alignment
    const personalStatement = "I am passionate about transformational kingdom education that integrates prophetic insight with academic excellence to impact nations.";
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
        prophetCredentials: 'Recognized prophetic minister, 15 years experience',
        inputType: PropheticInputType.CALLING_CONFIRMATION,
        content: 'I see a strong anointing for prophetic education ministry. The Lord is preparing this person for a significant role in kingdom education.',
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

    // Step 4: Generate comprehensive recommendations
    const comprehensiveRecommendations = await spiritualRecommendationGenerator.generateComprehensiveRecommendations(
      callingAssessment,
      alignmentAssessment,
      'MATURE',
      80,
      'workflow-test-id'
    );

    // Verify complete workflow results
    expect(callingAssessment.callingType).toBe(CallingType.PROPHETIC);
    expect(callingAssessment.overallCallingScore).toBeGreaterThan(55);
    expect(alignmentAssessment.overallAlignment).toBeGreaterThan(50);
    expect(propheticIntegration.integratedAssessment.overallConfidence).toBeGreaterThan(70);
    expect(comprehensiveRecommendations.spiritualRecommendations.length).toBeGreaterThan(0);
    expect(comprehensiveRecommendations.preparationPlan.totalDuration).toBeDefined();
  });

  it('should assess calling clarity and generate evidence', async () => {
    const callingDiscerner = new CallingDiscerner(prisma);
    
    const testimony = "God has called me to teach and equip the saints for ministry. Through prayer and confirmation from spiritual leaders, I have received clear direction to pursue theological education to fulfill this calling.";
    const ministryExperience = [
      {
        role: 'Bible Study Leader',
        organization: 'Local Church',
        duration: '2 years',
        achievements: ['Led 3 successful Bible studies', 'Mentored 5 new believers']
      }
    ];
    const references = [
      {
        relationship: 'Pastor',
        content: 'John has demonstrated a clear calling to teaching ministry with excellent biblical knowledge and communication skills.'
      }
    ];

    const assessment = await callingDiscerner.assessMinistryCallingClarity(
      testimony,
      ministryExperience,
      references
    );

    const evidence = await callingDiscerner.generateCallingEvidence(
      testimony,
      ministryExperience,
      references
    );

    expect(assessment.callingClarity).toBeGreaterThan(70);
    expect(assessment.callingType).toBe(CallingType.TEACHING);
    expect(evidence.personalTestimony.length).toBeGreaterThan(0);
    expect(evidence.ministryExperience.length).toBeGreaterThan(0);
  });

  it('should evaluate scroll alignment and generate evidence', async () => {
    const scrollAlignmentEvaluator = new ScrollAlignmentEvaluator(prisma);
    
    const testimony = "I am passionate about advancing God's kingdom through transformational education that impacts nations.";
    const personalStatement = "My vision is to see kingdom principles transform educational systems globally, bringing divine wisdom into learning environments.";
    const academicHistory = [
      {
        institution: 'Christian University',
        degree: 'Biblical Studies',
        gpa: 3.8
      }
    ];
    const references = [
      {
        content: 'Demonstrates strong kingdom mindset and transformational thinking in all endeavors.'
      }
    ];

    const assessment = await scrollAlignmentEvaluator.evaluateScrollAlignment(
      testimony,
      personalStatement,
      academicHistory,
      references
    );

    const evidence = await scrollAlignmentEvaluator.generateAlignmentEvidence(
      testimony,
      personalStatement,
      references
    );

    expect(assessment.kingdomMindset).toBeGreaterThan(70);
    expect(assessment.transformationalLearning).toBeGreaterThan(60);
    expect(evidence.kingdomLanguage.length).toBeGreaterThan(0);
    expect(evidence.transformationalThinking.length).toBeGreaterThan(0);
  });

  it('should integrate prophetic input and coordinate elder review', async () => {
    const propheticInputIntegrator = new PropheticInputIntegrator(prisma);
    
    const propheticInputs = [
      {
        id: 'prophetic-1',
        source: PropheticSource.RECOGNIZED_PROPHET,
        prophetId: 'prophet-1',
        prophetName: 'Prophet John',
        prophetCredentials: 'Recognized prophet with 20 years ministry',
        inputType: PropheticInputType.CALLING_CONFIRMATION,
        content: 'I see a strong calling to teaching ministry with kingdom impact. The Lord confirms this person is ready for advanced training.',
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

    const elderReviews = await propheticInputIntegrator.coordinateElderReview(
      'test-application-id',
      propheticInputs
    );

    expect(integration.integratedAssessment.verifiedInputs).toBe(1);
    expect(integration.integratedAssessment.overallConfidence).toBeGreaterThan(70);
    expect(integration.recommendations.length).toBeGreaterThan(0);
    expect(elderReviews.length).toBeGreaterThan(0);
    expect(elderReviews[0].assessment).toBeDefined();
    expect(elderReviews[0].recommendation).toBeDefined();
  });
});