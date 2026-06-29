/**
 * Comprehensive tests for Calling Discernment and Scroll Alignment Assessment
 * Tests for task 4.2: Develop calling discernment and scroll alignment assessment
 */

import { PrismaClient } from '@prisma/client';
import { CallingDiscerner, CallingType, CallingReadinessLevel } from '../CallingDiscerner';
import { ScrollAlignmentEvaluator, AlignmentLevel } from '../ScrollAlignmentEvaluator';
import { SpiritualRecommendationGenerator, OverallRecommendationType } from '../SpiritualRecommendationGenerator';
import { PropheticInputIntegrator, PropheticInputType, PropheticSource } from '../PropheticInputIntegrator';

describe('Calling Discernment and Scroll Alignment Assessment', () => {
  let prisma: PrismaClient;
  let callingDiscerner: CallingDiscerner;
  let scrollAlignmentEvaluator: ScrollAlignmentEvaluator;
  let spiritualRecommendationGenerator: SpiritualRecommendationGenerator;
  let propheticInputIntegrator: PropheticInputIntegrator;

  beforeAll(async () => {
    prisma = new PrismaClient();
    callingDiscerner = new CallingDiscerner(prisma);
    scrollAlignmentEvaluator = new ScrollAlignmentEvaluator(prisma);
    spiritualRecommendationGenerator = new SpiritualRecommendationGenerator(prisma);
    propheticInputIntegrator = new PropheticInputIntegrator(prisma);
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  describe('Ministry Calling Identification and Clarity Assessment', () => {
    test('should assess calling clarity from testimony', async () => {
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

      expect(assessment.callingClarity).toBeGreaterThan(70);
      expect(assessment.callingType).toBe(CallingType.TEACHING);
      expect(assessment.readinessLevel).toEqual(expect.stringMatching(/confirmed|mature/));
    });

    test('should identify prophetic calling type', async () => {
      const testimony = "The Lord has given me prophetic dreams and visions since childhood. I have been confirmed by multiple prophetic ministers as having a strong prophetic calling.";
      const ministryExperience = [
        {
          role: 'Prophetic Team Member',
          organization: 'Prophetic Ministry',
          duration: '3 years',
          achievements: ['Accurate prophetic words', 'Spiritual discernment']
        }
      ];

      const assessment = await callingDiscerner.assessMinistryCallingClarity(
        testimony,
        ministryExperience,
        []
      );

      expect(assessment.callingType).toBe(CallingType.PROPHETIC);
      expect(assessment.divineConfirmation).toBeGreaterThan(60);
    });

    test('should generate calling evidence summary', async () => {
      const testimony = "God has called me to marketplace ministry to transform business culture with kingdom principles.";
      const ministryExperience = [
        {
          role: 'Business Leader',
          organization: 'Christian Business Network',
          duration: '5 years',
          achievements: ['Led prayer meetings', 'Mentored Christian entrepreneurs']
        }
      ];
      const references = [
        {
          relationship: 'Business Mentor',
          content: 'Sarah demonstrates exceptional calling to marketplace ministry with proven leadership and kingdom impact.'
        }
      ];

      const evidence = await callingDiscerner.generateCallingEvidence(
        testimony,
        ministryExperience,
        references
      );

      expect(evidence.personalTestimony).toContain('Mentions divine calling or purpose in testimony');
      expect(evidence.ministryExperience.length).toBeGreaterThan(0);
      expect(evidence.fruitfulness.length).toBeGreaterThan(0);
    });
  });

  describe('Scroll Alignment Evaluation and Scoring', () => {
    test('should evaluate kingdom mindset alignment', async () => {
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

      expect(assessment.kingdomMindset).toBeGreaterThan(70);
      expect(assessment.transformationalLearning).toBeGreaterThan(60);
      expect(assessment.alignmentLevel).toEqual(expect.stringMatching(/strong|exceptional/));
    });

    test('should assess prophetic education openness', async () => {
      const testimony = "I believe in the prophetic ministry and am open to receiving divine revelation and wisdom through spiritual education.";
      const personalStatement = "I seek to grow in prophetic sensitivity and spiritual discernment through comprehensive biblical education.";
      const references = [
        {
          content: 'Shows remarkable openness to prophetic ministry and spiritual discernment.'
        }
      ];

      const assessment = await scrollAlignmentEvaluator.evaluateScrollAlignment(
        testimony,
        personalStatement,
        [],
        references
      );

      expect(assessment.propheticEducation).toBeGreaterThan(65);
    });

    test('should generate alignment evidence', async () => {
      const testimony = "My heart burns for global transformation through kingdom education that impacts every nation.";
      const personalStatement = "I am committed to innovative, transformational learning approaches that demonstrate God's excellence.";
      const references = [
        {
          content: 'Demonstrates innovative thinking and global kingdom perspective.'
        }
      ];

      const evidence = await scrollAlignmentEvaluator.generateAlignmentEvidence(
        testimony,
        personalStatement,
        references
      );

      expect(evidence.kingdomLanguage.length).toBeGreaterThan(0);
      expect(evidence.globalPerspective.length).toBeGreaterThan(0);
      expect(evidence.transformationalThinking.length).toBeGreaterThan(0);
    });
  });

  describe('Spiritual Recommendation Generation and Validation', () => {
    test('should generate comprehensive recommendations', async () => {
      const callingAssessment = {
        callingClarity: 75,
        divineConfirmation: 80,
        ministryReadiness: 70,
        kingdomVision: 85,
        overallCallingScore: 77,
        callingType: CallingType.TEACHING,
        readinessLevel: CallingReadinessLevel.CONFIRMED
      };

      const alignmentAssessment = {
        kingdomMindset: 80,
        scrollPhilosophy: 70,
        transformationalLearning: 75,
        propheticEducation: 65,
        globalImpact: 78,
        overallAlignment: 74,
        alignmentLevel: AlignmentLevel.STRONG
      };

      const recommendations = await spiritualRecommendationGenerator.generateComprehensiveRecommendations(
        callingAssessment,
        alignmentAssessment,
        'MATURE',
        75,
        'test-application-id'
      );

      expect(recommendations.overallRecommendation).toBe(OverallRecommendationType.CONDITIONAL_ADMISSION);
      expect(recommendations.spiritualRecommendations.length).toBeGreaterThan(0);
      expect(recommendations.preparationPlan).toBeDefined();
      expect(recommendations.followUpActions.length).toBeGreaterThan(0);
    });

    test('should validate recommendations consistency', async () => {
      const mockRecommendations = [
        {
          id: 'test-1',
          type: 'spiritual_formation' as any,
          priority: 'high' as any,
          title: 'Spiritual Formation',
          description: 'Basic spiritual development',
          rationale: 'Needs foundation',
          developmentAreas: ['Prayer', 'Bible study'],
          actionSteps: ['Daily devotions', 'Join study group'],
          resources: ['Bible study materials'],
          timeframe: '3 months',
          successMetrics: ['Consistent devotions']
        }
      ];

      const validation = await spiritualRecommendationGenerator.validateRecommendations(
        mockRecommendations,
        { spiritualMaturity: 'GROWING' }
      );

      expect(validation.isValid).toBe(true);
      expect(validation.validationScore).toBeGreaterThan(70);
    });
  });

  describe('Prophetic Input Integration and Elder Review Coordination', () => {
    test('should integrate prophetic input into assessment', async () => {
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

      expect(integration.integratedAssessment.verifiedInputs).toBe(1);
      expect(integration.integratedAssessment.overallConfidence).toBeGreaterThan(70);
      expect(integration.recommendations.length).toBeGreaterThan(0);
    });

    test('should coordinate elder review process', async () => {
      const propheticInputs = [
        {
          id: 'prophetic-2',
          source: PropheticSource.PROPHETIC_TEAM,
          prophetId: 'team-1',
          prophetName: 'Prophetic Team',
          prophetCredentials: 'Church prophetic ministry team',
          inputType: PropheticInputType.WARNING_CAUTION,
          content: 'Exercise caution regarding timing. More preparation needed before ministry launch.',
          receivedDate: new Date(),
          context: 'During ministry assessment',
          confidence: 'medium' as any,
          verification: {
            isVerified: true,
            verificationMethod: 'witness_confirmation' as any,
            verifiedBy: 'Ministry Team',
            verificationDate: new Date(),
            verificationNotes: 'Confirmed by team consensus',
            witnessCount: 2,
            scriptualAlignment: 75
          }
        }
      ];

      const elderReviews = await propheticInputIntegrator.coordinateElderReview(
        'test-application-id',
        propheticInputs,
        'comprehensive_review' as any
      );

      expect(elderReviews.length).toBeGreaterThan(0);
      expect(elderReviews[0].assessment).toBeDefined();
      expect(elderReviews[0].recommendation).toBeDefined();
    });

    test('should verify prophetic input authenticity', async () => {
      const propheticInput = {
        id: 'prophetic-3',
        source: PropheticSource.ELDER_COUNCIL,
        prophetId: 'elder-council',
        prophetName: 'Elder Council',
        prophetCredentials: 'Senior church leadership with 30+ years combined experience',
        inputType: PropheticInputType.CALLING_CONFIRMATION,
        content: 'The Lord has confirmed this person\'s calling to kingdom education ministry. We see divine favor and preparation for this season.',
        receivedDate: new Date(),
        context: 'During elder prayer meeting',
        confidence: 'high' as any,
        verification: {
          isVerified: false,
          verificationMethod: 'scriptural_alignment' as any,
          verifiedBy: '',
          verificationDate: new Date(),
          verificationNotes: '',
          witnessCount: 0,
          scriptualAlignment: 0
        }
      };

      const verification = await propheticInputIntegrator.verifyPropheticInput(propheticInput);

      expect(verification.isVerified).toBe(true);
      expect(verification.scriptualAlignment).toBeGreaterThan(70);
      expect(verification.verificationNotes).toContain('credible');
    });
  });

  describe('Integration Testing - Complete Workflow', () => {
    test('should complete full calling discernment and alignment assessment workflow', async () => {
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
      expect(callingAssessment.readinessLevel).toEqual(expect.stringMatching(/confirmed|mature/));
      
      expect(alignmentAssessment.alignmentLevel).toEqual(expect.stringMatching(/strong|exceptional|adequate/));
      
      expect(propheticIntegration.integratedAssessment.overallConfidence).toBeGreaterThan(75);
      
      expect(comprehensiveRecommendations.overallRecommendation).toEqual(expect.stringMatching(/immediate_admission|conditional_admission/));
      
      expect(comprehensiveRecommendations.spiritualRecommendations.length).toBeGreaterThan(0);
      expect(comprehensiveRecommendations.preparationPlan.totalDuration).toBeDefined();
    });
  });
});