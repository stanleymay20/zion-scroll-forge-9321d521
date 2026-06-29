import { PrismaClient } from '@prisma/client';
import { logger } from '../../utils/logger';
import { SkillAssessment, SupportRequirement } from './AcademicEvaluator';
import { ReadinessAssessment } from './IntellectualReadinessAssessor';
import { CredentialValidation } from './CredentialValidator';

export interface SupportNeedsAssessment {
  id: string;
  applicationId: string;
  applicantId: string;
  academicSupport: AcademicSupportNeeds;
  learningSupport: LearningSupportNeeds;
  accessibilitySupport: AccessibilitySupportNeeds;
  technicalSupport: TechnicalSupportNeeds;
  financialSupport: FinancialSupportNeeds;
  culturalSupport: CulturalSupportNeeds;
  remedialRequirements: RemedialRequirement[];
  accommodationPlan: AccommodationPlan;
  supportPriority: SupportPriority;
  estimatedCosts: SupportCostEstimate;
  recommendedServices: RecommendedService[];
  monitoringPlan: MonitoringPlan;
  assessedAt: Date;
}

export interface AcademicSupportNeeds {
  tutoringNeeds: TutoringNeed[];
  studySkillsSupport: boolean;
  writingCenterSupport: boolean;
  mathLabSupport: boolean;
  librarySkillsTraining: boolean;
  academicCoaching: boolean;
  timeManagementSupport: boolean;
  testTakingStrategies: boolean;
  noteSkillsTraining: boolean;
  researchSkillsSupport: boolean;
}

export interface TutoringNeed {
  subject: string;
  intensity: 'light' | 'moderate' | 'intensive';
  frequency: string; // e.g., "2 hours per week"
  duration: string; // e.g., "one semester"
  groupSize: 'individual' | 'small_group' | 'large_group';
  specialization: string[];
}

export interface LearningSupportNeeds {
  learningDisabilitySupport: boolean;
  adhd_support: boolean;
  memorySupport: boolean;
  processingSpeedSupport: boolean;
  executiveFunctionSupport: boolean;
  cognitiveRehabilitationNeeds: boolean;
  learningStrategiesTraining: boolean;
  metacognitionSupport: boolean;
  motivationSupport: boolean;
  confidenceBuildingSupport: boolean;
}

export interface AccessibilitySupportNeeds {
  physicalDisabilitySupport: PhysicalSupportNeed[];
  visualImpairmentSupport: VisualSupportNeed[];
  hearingImpairmentSupport: HearingSupportNeed[];
  cognitiveDisabilitySupport: CognitiveSupportNeed[];
  mentalHealthSupport: MentalHealthSupportNeed[];
  chronicIllnessSupport: ChronicIllnessSupportNeed[];
  temporaryDisabilitySupport: TemporarySupportNeed[];
}

export interface PhysicalSupportNeed {
  type: 'mobility' | 'dexterity' | 'strength' | 'endurance';
  accommodations: string[];
  assistiveTechnology: string[];
  environmentalModifications: string[];
  personalAssistance: boolean;
}

export interface VisualSupportNeed {
  type: 'blindness' | 'low_vision' | 'color_blindness';
  accommodations: string[];
  assistiveTechnology: string[];
  materialFormats: string[];
  navigationSupport: boolean;
}

export interface HearingSupportNeed {
  type: 'deafness' | 'hard_of_hearing' | 'auditory_processing';
  accommodations: string[];
  assistiveTechnology: string[];
  communicationSupport: string[];
  interpreterServices: boolean;
}

export interface CognitiveSupportNeed {
  type: 'learning_disability' | 'intellectual_disability' | 'autism_spectrum' | 'brain_injury';
  accommodations: string[];
  supportServices: string[];
  behavioralSupport: boolean;
  socialSkillsSupport: boolean;
}

export interface MentalHealthSupportNeed {
  type: 'anxiety' | 'depression' | 'bipolar' | 'ptsd' | 'other';
  accommodations: string[];
  counselingServices: boolean;
  medicationManagement: boolean;
  crisisSupport: boolean;
  peerSupport: boolean;
}

export interface ChronicIllnessSupportNeed {
  condition: string;
  accommodations: string[];
  medicalSupport: boolean;
  flexibleScheduling: boolean;
  attendanceModifications: boolean;
}

export interface TemporarySupportNeed {
  condition: string;
  duration: string;
  accommodations: string[];
  recoverySupport: boolean;
}

export interface TechnicalSupportNeeds {
  computerSkillsTraining: boolean;
  softwareTraining: string[];
  internetConnectivitySupport: boolean;
  deviceSupport: DeviceSupport[];
  digitalLiteracyTraining: boolean;
  onlineLearningSupport: boolean;
  technicalTroubleshooting: boolean;
}

export interface DeviceSupport {
  deviceType: 'laptop' | 'tablet' | 'smartphone' | 'desktop' | 'assistive_device';
  provided: boolean;
  training: boolean;
  maintenance: boolean;
  replacement: boolean;
}

export interface FinancialSupportNeeds {
  tuitionAssistance: boolean;
  scholarshipEligibility: ScholarshipEligibility[];
  workStudyEligibility: boolean;
  emergencyFundEligibility: boolean;
  textbookVouchers: boolean;
  transportationAssistance: boolean;
  housingAssistance: boolean;
  mealPlanAssistance: boolean;
  childcareAssistance: boolean;
  healthInsuranceSupport: boolean;
}

export interface ScholarshipEligibility {
  scholarshipType: string;
  eligibilityScore: number; // 0-100
  requirements: string[];
  applicationDeadline: Date;
  estimatedAmount: number;
}

export interface CulturalSupportNeeds {
  languageSupport: LanguageSupport;
  culturalOrientationNeeds: boolean;
  internationalStudentSupport: boolean;
  religiousAccommodations: string[];
  dietaryAccommodations: string[];
  culturalMentorship: boolean;
  communityConnection: boolean;
  familySupport: boolean;
}

export interface LanguageSupport {
  eslSupport: boolean;
  languageTutoring: boolean;
  conversationPartners: boolean;
  writingSupport: boolean;
  pronunciationSupport: boolean;
  academicLanguageSupport: boolean;
}

export interface RemedialRequirement {
  area: string;
  currentLevel: string;
  targetLevel: string;
  coursework: RemedialCoursework[];
  timeline: string;
  prerequisites: string[];
  assessmentMethod: string;
  successCriteria: string[];
}

export interface RemedialCoursework {
  courseTitle: string;
  courseCode: string;
  creditHours: number;
  duration: string;
  format: 'online' | 'in_person' | 'hybrid';
  intensity: 'self_paced' | 'regular' | 'accelerated';
  cost: number;
}

export interface AccommodationPlan {
  academicAccommodations: AcademicAccommodation[];
  testingAccommodations: TestingAccommodation[];
  classroomAccommodations: ClassroomAccommodation[];
  technologyAccommodations: TechnologyAccommodation[];
  housingAccommodations: HousingAccommodation[];
  diningAccommodations: DiningAccommodation[];
  transportationAccommodations: TransportationAccommodation[];
}

export interface AcademicAccommodation {
  type: string;
  description: string;
  implementation: string;
  frequency: string;
  duration: string;
  responsibleParty: string;
}

export interface TestingAccommodation {
  type: string;
  description: string;
  timeExtension: number; // percentage
  alternateFormat: boolean;
  separateRoom: boolean;
  assistiveTechnology: string[];
}

export interface ClassroomAccommodation {
  type: string;
  description: string;
  seatingArrangement: string;
  materialFormat: string;
  communicationSupport: string[];
}

export interface TechnologyAccommodation {
  type: string;
  description: string;
  software: string[];
  hardware: string[];
  training: boolean;
}

export interface HousingAccommodation {
  type: string;
  description: string;
  roomType: string;
  location: string;
  modifications: string[];
}

export interface DiningAccommodation {
  type: string;
  description: string;
  dietaryRestrictions: string[];
  mealPlanModifications: string[];
}

export interface TransportationAccommodation {
  type: string;
  description: string;
  serviceType: string;
  frequency: string;
  accessibility: string[];
}

export enum SupportPriority {
  CRITICAL = 'critical',
  HIGH = 'high',
  MEDIUM = 'medium',
  LOW = 'low'
}

export interface SupportCostEstimate {
  totalEstimatedCost: number;
  academicSupportCost: number;
  accessibilitySupportCost: number;
  technicalSupportCost: number;
  remedialCourseworkCost: number;
  accommodationCost: number;
  ongoingMonthlyCost: number;
  oneTimeCosts: number;
}

export interface RecommendedService {
  serviceName: string;
  serviceType: 'academic' | 'accessibility' | 'technical' | 'financial' | 'cultural' | 'remedial';
  provider: string;
  description: string;
  frequency: string;
  duration: string;
  cost: number;
  priority: SupportPriority;
  prerequisites: string[];
  expectedOutcomes: string[];
}

export interface MonitoringPlan {
  checkInFrequency: string;
  assessmentSchedule: AssessmentSchedule[];
  progressMetrics: ProgressMetric[];
  alertTriggers: AlertTrigger[];
  reviewSchedule: ReviewSchedule[];
  adjustmentProtocol: string;
}

export interface AssessmentSchedule {
  assessmentType: string;
  frequency: string;
  method: string;
  responsibleParty: string;
  reportingSchedule: string;
}

export interface ProgressMetric {
  metric: string;
  measurementMethod: string;
  targetValue: number;
  currentValue: number;
  trend: 'improving' | 'stable' | 'declining';
}

export interface AlertTrigger {
  condition: string;
  threshold: number;
  action: string;
  responsibleParty: string;
  escalationProcedure: string;
}

export interface ReviewSchedule {
  reviewType: string;
  frequency: string;
  participants: string[];
  agenda: string[];
  outcomes: string[];
}

export class SupportNeedsAssessor {
  private prisma: PrismaClient;

  constructor(prisma: PrismaClient) {
    this.prisma = prisma;
  }

  async assessSupportNeeds(
    applicationId: string,
    skills: SkillAssessment[],
    readiness: ReadinessAssessment,
    credentials: CredentialValidation
  ): Promise<SupportNeedsAssessment> {
    try {
      logger.info(`Starting support needs assessment for application ${applicationId}`);

      const application = await this.prisma.application.findUnique({
        where: { id: applicationId },
        include: {
          applicant: true,
          documents: true
        }
      });

      if (!application) {
        throw new Error(`Application ${applicationId} not found`);
      }

      // Assess different types of support needs
      const academicSupport = this.assessAcademicSupportNeeds(skills, readiness, application.applicationData);
      const learningSupport = this.assessLearningSupportNeeds(readiness, application.applicationData);
      const accessibilitySupport = this.assessAccessibilitySupportNeeds(application.applicationData);
      const technicalSupport = this.assessTechnicalSupportNeeds(application.applicationData);
      const financialSupport = this.assessFinancialSupportNeeds(application.applicationData);
      const culturalSupport = this.assessCulturalSupportNeeds(application.applicationData);

      // Determine remedial requirements
      const remedialRequirements = this.determineRemedialRequirements(skills, readiness, credentials);

      // Create accommodation plan
      const accommodationPlan = this.createAccommodationPlan(
        academicSupport,
        learningSupport,
        accessibilitySupport,
        application.applicationData
      );

      // Determine support priority
      const supportPriority = this.determineSupportPriority(
        academicSupport,
        learningSupport,
        accessibilitySupport,
        readiness
      );

      // Estimate costs
      const estimatedCosts = this.estimateSupportCosts(
        academicSupport,
        accessibilitySupport,
        technicalSupport,
        remedialRequirements,
        accommodationPlan
      );

      // Recommend services
      const recommendedServices = this.recommendServices(
        academicSupport,
        learningSupport,
        accessibilitySupport,
        technicalSupport,
        culturalSupport,
        remedialRequirements
      );

      // Create monitoring plan
      const monitoringPlan = this.createMonitoringPlan(supportPriority, recommendedServices);

      const assessment: SupportNeedsAssessment = {
        id: `support_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        applicationId,
        applicantId: application.applicantId,
        academicSupport,
        learningSupport,
        accessibilitySupport,
        technicalSupport,
        financialSupport,
        culturalSupport,
        remedialRequirements,
        accommodationPlan,
        supportPriority,
        estimatedCosts,
        recommendedServices,
        monitoringPlan,
        assessedAt: new Date()
      };

      // Store assessment
      await this.storeSupportNeedsAssessment(assessment);

      logger.info(`Support needs assessment completed for application ${applicationId}`);
      return assessment;

    } catch (error) {
      logger.error(`Support needs assessment failed for application ${applicationId}:`, error);
      throw error;
    }
  }

  private assessAcademicSupportNeeds(
    skills: SkillAssessment[],
    readiness: ReadinessAssessment,
    applicationData: any
  ): AcademicSupportNeeds {
    const tutoringNeeds: TutoringNeed[] = [];

    // Identify tutoring needs based on skill assessments
    skills.forEach(skill => {
      if (skill.assessment.score < 60) {
        const intensity = skill.assessment.score < 40 ? 'intensive' : 
                         skill.assessment.score < 50 ? 'moderate' : 'light';
        
        tutoringNeeds.push({
          subject: skill.skill.replace('_', ' '),
          intensity,
          frequency: intensity === 'intensive' ? '4 hours per week' : 
                    intensity === 'moderate' ? '2 hours per week' : '1 hour per week',
          duration: 'one semester',
          groupSize: intensity === 'intensive' ? 'individual' : 'small_group',
          specialization: skill.developmentPlan.resources
        });
      }
    });

    return {
      tutoringNeeds,
      studySkillsSupport: readiness.academicPreparation.studySkills < 60,
      writingCenterSupport: skills.find(s => s.skill === 'written_communication')?.assessment.score < 65 || false,
      mathLabSupport: skills.find(s => s.skill === 'mathematics')?.assessment.score < 65 || false,
      librarySkillsTraining: readiness.academicPreparation.researchCapabilities < 60,
      academicCoaching: readiness.overallReadiness === 'conditionally_ready' || readiness.overallReadiness === 'not_ready',
      timeManagementSupport: applicationData.timeManagement !== true,
      testTakingStrategies: readiness.cognitiveReadiness.overallCognitive < 65,
      noteSkillsTraining: applicationData.noteTaking !== true,
      researchSkillsSupport: skills.find(s => s.skill === 'research_methodology')?.assessment.score < 65 || false
    };
  }

  private assessLearningSupportNeeds(
    readiness: ReadinessAssessment,
    applicationData: any
  ): LearningSupportNeeds {
    return {
      learningDisabilitySupport: applicationData.learningDisability === true,
      adhd_support: applicationData.adhd === true,
      memorySupport: readiness.cognitiveReadiness.memoryAndRetention < 60,
      processingSpeedSupport: readiness.cognitiveReadiness.informationProcessing < 60,
      executiveFunctionSupport: readiness.cognitiveReadiness.attentionAndFocus < 60,
      cognitiveRehabilitationNeeds: readiness.cognitiveReadiness.overallCognitive < 50,
      learningStrategiesTraining: readiness.intellectualMaturity.metacognition < 60,
      metacognitionSupport: readiness.intellectualMaturity.metacognition < 65,
      motivationSupport: readiness.learningReadiness.motivationLevel < 60,
      confidenceBuildingSupport: applicationData.lowConfidence === true
    };
  }

  private assessAccessibilitySupportNeeds(applicationData: any): AccessibilitySupportNeeds {
    const physicalDisabilitySupport: PhysicalSupportNeed[] = [];
    const visualImpairmentSupport: VisualSupportNeed[] = [];
    const hearingImpairmentSupport: HearingSupportNeed[] = [];
    const cognitiveDisabilitySupport: CognitiveSupportNeed[] = [];
    const mentalHealthSupport: MentalHealthSupportNeed[] = [];
    const chronicIllnessSupport: ChronicIllnessSupportNeed[] = [];
    const temporaryDisabilitySupport: TemporarySupportNeed[] = [];

    // Process disability information from application data
    const disabilities = applicationData.disabilities || [];

    disabilities.forEach((disability: any) => {
      switch (disability.type) {
        case 'physical':
          physicalDisabilitySupport.push({
            type: disability.subtype || 'mobility',
            accommodations: disability.accommodations || [],
            assistiveTechnology: disability.assistiveTechnology || [],
            environmentalModifications: disability.environmentalModifications || [],
            personalAssistance: disability.personalAssistance || false
          });
          break;
        case 'visual':
          visualImpairmentSupport.push({
            type: disability.subtype || 'low_vision',
            accommodations: disability.accommodations || [],
            assistiveTechnology: disability.assistiveTechnology || [],
            materialFormats: disability.materialFormats || [],
            navigationSupport: disability.navigationSupport || false
          });
          break;
        case 'hearing':
          hearingImpairmentSupport.push({
            type: disability.subtype || 'hard_of_hearing',
            accommodations: disability.accommodations || [],
            assistiveTechnology: disability.assistiveTechnology || [],
            communicationSupport: disability.communicationSupport || [],
            interpreterServices: disability.interpreterServices || false
          });
          break;
        case 'cognitive':
          cognitiveDisabilitySupport.push({
            type: disability.subtype || 'learning_disability',
            accommodations: disability.accommodations || [],
            supportServices: disability.supportServices || [],
            behavioralSupport: disability.behavioralSupport || false,
            socialSkillsSupport: disability.socialSkillsSupport || false
          });
          break;
        case 'mental_health':
          mentalHealthSupport.push({
            type: disability.subtype || 'anxiety',
            accommodations: disability.accommodations || [],
            counselingServices: disability.counselingServices || false,
            medicationManagement: disability.medicationManagement || false,
            crisisSupport: disability.crisisSupport || false,
            peerSupport: disability.peerSupport || false
          });
          break;
        case 'chronic_illness':
          chronicIllnessSupport.push({
            condition: disability.condition || 'unspecified',
            accommodations: disability.accommodations || [],
            medicalSupport: disability.medicalSupport || false,
            flexibleScheduling: disability.flexibleScheduling || false,
            attendanceModifications: disability.attendanceModifications || false
          });
          break;
        case 'temporary':
          temporaryDisabilitySupport.push({
            condition: disability.condition || 'unspecified',
            duration: disability.duration || 'unknown',
            accommodations: disability.accommodations || [],
            recoverySupport: disability.recoverySupport || false
          });
          break;
      }
    });

    return {
      physicalDisabilitySupport,
      visualImpairmentSupport,
      hearingImpairmentSupport,
      cognitiveDisabilitySupport,
      mentalHealthSupport,
      chronicIllnessSupport,
      temporaryDisabilitySupport
    };
  }

  private assessTechnicalSupportNeeds(applicationData: any): TechnicalSupportNeeds {
    const technologySkills = applicationData.technologySkills || [];
    const deviceSupport: DeviceSupport[] = [];

    // Assess device needs
    if (!applicationData.hasLaptop) {
      deviceSupport.push({
        deviceType: 'laptop',
        provided: true,
        training: true,
        maintenance: true,
        replacement: true
      });
    }

    if (applicationData.needsTablet) {
      deviceSupport.push({
        deviceType: 'tablet',
        provided: true,
        training: false,
        maintenance: true,
        replacement: false
      });
    }

    return {
      computerSkillsTraining: technologySkills.length < 3,
      softwareTraining: this.identifyNeededSoftwareTraining(applicationData),
      internetConnectivitySupport: applicationData.limitedInternet === true,
      deviceSupport,
      digitalLiteracyTraining: applicationData.digitalLiteracy !== true,
      onlineLearningSupport: applicationData.onlineLearningExperience !== true,
      technicalTroubleshooting: applicationData.techSavvy !== true
    };
  }

  private identifyNeededSoftwareTraining(applicationData: any): string[] {
    const training: string[] = [];
    const skills = applicationData.technologySkills || [];

    if (!skills.includes('Microsoft Office')) {
      training.push('Microsoft Office Suite');
    }

    if (!skills.includes('Google Workspace')) {
      training.push('Google Workspace');
    }

    if (applicationData.fieldOfStudy?.includes('Engineering') && !skills.includes('CAD')) {
      training.push('CAD Software');
    }

    if (applicationData.fieldOfStudy?.includes('Statistics') && !skills.includes('SPSS')) {
      training.push('Statistical Software');
    }

    return training;
  }

  private assessFinancialSupportNeeds(applicationData: any): FinancialSupportNeeds {
    const scholarshipEligibility: ScholarshipEligibility[] = [];

    // Assess scholarship eligibility based on various criteria
    if (applicationData.gpa >= 3.5) {
      scholarshipEligibility.push({
        scholarshipType: 'Academic Merit Scholarship',
        eligibilityScore: 85,
        requirements: ['Maintain 3.5 GPA', 'Full-time enrollment'],
        applicationDeadline: new Date('2024-03-01'),
        estimatedAmount: 5000
      });
    }

    if (applicationData.financialNeed === 'high') {
      scholarshipEligibility.push({
        scholarshipType: 'Need-Based Grant',
        eligibilityScore: 90,
        requirements: ['FAFSA completion', 'Income verification'],
        applicationDeadline: new Date('2024-02-15'),
        estimatedAmount: 8000
      });
    }

    return {
      tuitionAssistance: applicationData.financialNeed === 'high' || applicationData.financialNeed === 'medium',
      scholarshipEligibility,
      workStudyEligibility: applicationData.workStudyInterest === true,
      emergencyFundEligibility: applicationData.financialNeed === 'high',
      textbookVouchers: applicationData.financialNeed !== 'low',
      transportationAssistance: applicationData.transportationNeeds === true,
      housingAssistance: applicationData.housingNeeds === true,
      mealPlanAssistance: applicationData.financialNeed === 'high',
      childcareAssistance: applicationData.hasChildren === true,
      healthInsuranceSupport: applicationData.needsHealthInsurance === true
    };
  }

  private assessCulturalSupportNeeds(applicationData: any): CulturalSupportNeeds {
    const languageSupport: LanguageSupport = {
      eslSupport: applicationData.nativeLanguage !== 'English',
      languageTutoring: applicationData.languageProficiency < 80,
      conversationPartners: applicationData.nativeLanguage !== 'English',
      writingSupport: applicationData.writingProficiency < 70,
      pronunciationSupport: applicationData.pronunciationNeeds === true,
      academicLanguageSupport: applicationData.academicEnglish < 75
    };

    return {
      languageSupport,
      culturalOrientationNeeds: applicationData.internationalStudent === true,
      internationalStudentSupport: applicationData.internationalStudent === true,
      religiousAccommodations: applicationData.religiousAccommodations || [],
      dietaryAccommodations: applicationData.dietaryRestrictions || [],
      culturalMentorship: applicationData.internationalStudent === true || applicationData.firstGeneration === true,
      communityConnection: applicationData.socialSupport === 'low',
      familySupport: applicationData.familySupport === 'low'
    };
  }

  private determineRemedialRequirements(
    skills: SkillAssessment[],
    readiness: ReadinessAssessment,
    credentials: CredentialValidation
  ): RemedialRequirement[] {
    const requirements: RemedialRequirement[] = [];

    // Check for skill-based remedial needs
    skills.forEach(skill => {
      if (skill.assessment.score < 50) {
        const coursework: RemedialCoursework[] = skill.developmentPlan.recommendedCourses.map(course => ({
          courseTitle: course,
          courseCode: `REM_${skill.skill.toUpperCase()}_101`,
          creditHours: 3,
          duration: '16 weeks',
          format: 'hybrid',
          intensity: 'regular',
          cost: 800
        }));

        requirements.push({
          area: skill.skill.replace('_', ' '),
          currentLevel: skill.currentLevel,
          targetLevel: skill.developmentPlan.targetLevel,
          coursework,
          timeline: skill.developmentPlan.estimatedTimeframe,
          prerequisites: skill.developmentPlan.prerequisites,
          assessmentMethod: 'comprehensive_exam',
          successCriteria: ['Score 70% or higher on final assessment', 'Complete all coursework', 'Demonstrate practical application']
        });
      }
    });

    // Check for credential-based remedial needs
    credentials.educationRecords.forEach(record => {
      if (record.equivalencyAssessment.additionalRequirements.length > 0) {
        record.equivalencyAssessment.additionalRequirements.forEach(req => {
          if (!requirements.find(r => r.area === req)) {
            requirements.push({
              area: req,
              currentLevel: 'deficient',
              targetLevel: 'proficient',
              coursework: [{
                courseTitle: `${req} Fundamentals`,
                courseCode: 'REM_CRED_101',
                creditHours: 3,
                duration: '16 weeks',
                format: 'online',
                intensity: 'self_paced',
                cost: 600
              }],
              timeline: '1 semester',
              prerequisites: [],
              assessmentMethod: 'portfolio_review',
              successCriteria: ['Complete all modules', 'Pass final assessment', 'Submit portfolio']
            });
          }
        });
      }
    });

    return requirements;
  }

  private createAccommodationPlan(
    academicSupport: AcademicSupportNeeds,
    learningSupport: LearningSupportNeeds,
    accessibilitySupport: AccessibilitySupportNeeds,
    applicationData: any
  ): AccommodationPlan {
    const academicAccommodations: AcademicAccommodation[] = [];
    const testingAccommodations: TestingAccommodation[] = [];
    const classroomAccommodations: ClassroomAccommodation[] = [];
    const technologyAccommodations: TechnologyAccommodation[] = [];
    const housingAccommodations: HousingAccommodation[] = [];
    const diningAccommodations: DiningAccommodation[] = [];
    const transportationAccommodations: TransportationAccommodation[] = [];

    // Academic accommodations
    if (learningSupport.learningDisabilitySupport) {
      academicAccommodations.push({
        type: 'Extended Time',
        description: 'Additional time for assignments and projects',
        implementation: '50% additional time for all assignments',
        frequency: 'ongoing',
        duration: 'throughout enrollment',
        responsibleParty: 'Academic Affairs'
      });
    }

    // Testing accommodations
    if (learningSupport.processingSpeedSupport) {
      testingAccommodations.push({
        type: 'Extended Testing Time',
        description: 'Additional time for examinations',
        timeExtension: 50,
        alternateFormat: false,
        separateRoom: true,
        assistiveTechnology: []
      });
    }

    // Technology accommodations
    if (accessibilitySupport.visualImpairmentSupport.length > 0) {
      technologyAccommodations.push({
        type: 'Screen Reader Software',
        description: 'Text-to-speech software for digital materials',
        software: ['JAWS', 'NVDA'],
        hardware: ['Braille display'],
        training: true
      });
    }

    return {
      academicAccommodations,
      testingAccommodations,
      classroomAccommodations,
      technologyAccommodations,
      housingAccommodations,
      diningAccommodations,
      transportationAccommodations
    };
  }

  private determineSupportPriority(
    academicSupport: AcademicSupportNeeds,
    learningSupport: LearningSupportNeeds,
    accessibilitySupport: AccessibilitySupportNeeds,
    readiness: ReadinessAssessment
  ): SupportPriority {
    let priorityScore = 0;

    // Academic support factors
    if (academicSupport.tutoringNeeds.some(need => need.intensity === 'intensive')) {
      priorityScore += 3;
    }

    // Learning support factors
    if (learningSupport.learningDisabilitySupport || learningSupport.adhd_support) {
      priorityScore += 2;
    }

    // Accessibility factors
    const hasAccessibilityNeeds = [
      accessibilitySupport.physicalDisabilitySupport,
      accessibilitySupport.visualImpairmentSupport,
      accessibilitySupport.hearingImpairmentSupport,
      accessibilitySupport.cognitiveDisabilitySupport
    ].some(support => support.length > 0);

    if (hasAccessibilityNeeds) {
      priorityScore += 3;
    }

    // Readiness factors
    if (readiness.overallReadiness === 'not_ready') {
      priorityScore += 4;
    } else if (readiness.overallReadiness === 'conditionally_ready') {
      priorityScore += 2;
    }

    // Determine priority level
    if (priorityScore >= 7) return SupportPriority.CRITICAL;
    if (priorityScore >= 5) return SupportPriority.HIGH;
    if (priorityScore >= 3) return SupportPriority.MEDIUM;
    return SupportPriority.LOW;
  }

  private estimateSupportCosts(
    academicSupport: AcademicSupportNeeds,
    accessibilitySupport: AccessibilitySupportNeeds,
    technicalSupport: TechnicalSupportNeeds,
    remedialRequirements: RemedialRequirement[],
    accommodationPlan: AccommodationPlan
  ): SupportCostEstimate {
    let academicSupportCost = 0;
    let accessibilitySupportCost = 0;
    let technicalSupportCost = 0;
    let remedialCourseworkCost = 0;
    let accommodationCost = 0;

    // Academic support costs
    academicSupport.tutoringNeeds.forEach(need => {
      const hourlyRate = need.groupSize === 'individual' ? 50 : 25;
      const hoursPerWeek = parseInt(need.frequency.split(' ')[0]);
      const weeks = 16; // semester length
      academicSupportCost += hourlyRate * hoursPerWeek * weeks;
    });

    if (academicSupport.academicCoaching) academicSupportCost += 2000;
    if (academicSupport.writingCenterSupport) academicSupportCost += 500;

    // Technical support costs
    technicalSupport.deviceSupport.forEach(device => {
      if (device.provided) {
        switch (device.deviceType) {
          case 'laptop': technicalSupportCost += 1200; break;
          case 'tablet': technicalSupportCost += 400; break;
          case 'assistive_device': technicalSupportCost += 2000; break;
        }
      }
    });

    if (technicalSupport.softwareTraining.length > 0) {
      technicalSupportCost += technicalSupport.softwareTraining.length * 200;
    }

    // Remedial coursework costs
    remedialCourseworkCost = remedialRequirements.reduce((total, req) => {
      return total + req.coursework.reduce((courseTotal, course) => courseTotal + course.cost, 0);
    }, 0);

    // Accessibility support costs
    if (accessibilitySupport.visualImpairmentSupport.length > 0) {
      accessibilitySupportCost += 3000; // Screen reader and training
    }
    if (accessibilitySupport.hearingImpairmentSupport.length > 0) {
      accessibilitySupportCost += 5000; // Interpreter services per semester
    }

    // Accommodation costs
    accommodationCost = accommodationPlan.technologyAccommodations.length * 1000;

    const totalEstimatedCost = academicSupportCost + accessibilitySupportCost + 
                              technicalSupportCost + remedialCourseworkCost + accommodationCost;

    const ongoingMonthlyCost = (academicSupportCost + accessibilitySupportCost) / 4; // per semester
    const oneTimeCosts = technicalSupportCost + accommodationCost;

    return {
      totalEstimatedCost,
      academicSupportCost,
      accessibilitySupportCost,
      technicalSupportCost,
      remedialCourseworkCost,
      accommodationCost,
      ongoingMonthlyCost,
      oneTimeCosts
    };
  }

  private recommendServices(
    academicSupport: AcademicSupportNeeds,
    learningSupport: LearningSupportNeeds,
    accessibilitySupport: AccessibilitySupportNeeds,
    technicalSupport: TechnicalSupportNeeds,
    culturalSupport: CulturalSupportNeeds,
    remedialRequirements: RemedialRequirement[]
  ): RecommendedService[] {
    const services: RecommendedService[] = [];

    // Academic services
    if (academicSupport.studySkillsSupport) {
      services.push({
        serviceName: 'Study Skills Workshop',
        serviceType: 'academic',
        provider: 'Academic Success Center',
        description: 'Comprehensive study skills training program',
        frequency: 'weekly',
        duration: '8 weeks',
        cost: 400,
        priority: SupportPriority.HIGH,
        prerequisites: [],
        expectedOutcomes: ['Improved study efficiency', 'Better time management', 'Enhanced note-taking skills']
      });
    }

    // Learning support services
    if (learningSupport.learningDisabilitySupport) {
      services.push({
        serviceName: 'Learning Disability Support Services',
        serviceType: 'accessibility',
        provider: 'Disability Services Office',
        description: 'Comprehensive support for students with learning disabilities',
        frequency: 'ongoing',
        duration: 'throughout enrollment',
        cost: 0, // Covered by institution
        priority: SupportPriority.CRITICAL,
        prerequisites: ['Documentation of learning disability'],
        expectedOutcomes: ['Academic accommodations', 'Assistive technology', 'Advocacy support']
      });
    }

    // Technical services
    if (technicalSupport.computerSkillsTraining) {
      services.push({
        serviceName: 'Computer Skills Training',
        serviceType: 'technical',
        provider: 'IT Training Center',
        description: 'Basic computer and software skills training',
        frequency: 'twice weekly',
        duration: '6 weeks',
        cost: 300,
        priority: SupportPriority.MEDIUM,
        prerequisites: [],
        expectedOutcomes: ['Basic computer proficiency', 'Software competency', 'Digital literacy']
      });
    }

    // Cultural services
    if (culturalSupport.languageSupport.eslSupport) {
      services.push({
        serviceName: 'English as Second Language Support',
        serviceType: 'cultural',
        provider: 'International Student Services',
        description: 'English language support for non-native speakers',
        frequency: 'three times weekly',
        duration: 'ongoing',
        cost: 800,
        priority: SupportPriority.HIGH,
        prerequisites: ['English proficiency assessment'],
        expectedOutcomes: ['Improved English proficiency', 'Academic language skills', 'Communication confidence']
      });
    }

    // Remedial services
    remedialRequirements.forEach(req => {
      services.push({
        serviceName: `${req.area} Remedial Program`,
        serviceType: 'remedial',
        provider: 'Academic Preparation Center',
        description: `Remedial coursework in ${req.area}`,
        frequency: 'as per course schedule',
        duration: req.timeline,
        cost: req.coursework.reduce((total, course) => total + course.cost, 0),
        priority: SupportPriority.HIGH,
        prerequisites: req.prerequisites,
        expectedOutcomes: req.successCriteria
      });
    });

    return services;
  }

  private createMonitoringPlan(
    supportPriority: SupportPriority,
    recommendedServices: RecommendedService[]
  ): MonitoringPlan {
    const checkInFrequency = supportPriority === SupportPriority.CRITICAL ? 'weekly' :
                            supportPriority === SupportPriority.HIGH ? 'bi-weekly' :
                            supportPriority === SupportPriority.MEDIUM ? 'monthly' : 'quarterly';

    const assessmentSchedule: AssessmentSchedule[] = [
      {
        assessmentType: 'Academic Progress Review',
        frequency: 'monthly',
        method: 'grade_analysis',
        responsibleParty: 'Academic Advisor',
        reportingSchedule: 'monthly'
      },
      {
        assessmentType: 'Support Services Utilization',
        frequency: 'bi-weekly',
        method: 'attendance_tracking',
        responsibleParty: 'Support Services Coordinator',
        reportingSchedule: 'monthly'
      }
    ];

    const progressMetrics: ProgressMetric[] = [
      {
        metric: 'GPA',
        measurementMethod: 'grade_tracking',
        targetValue: 2.5,
        currentValue: 0,
        trend: 'stable'
      },
      {
        metric: 'Course Completion Rate',
        measurementMethod: 'enrollment_tracking',
        targetValue: 90,
        currentValue: 0,
        trend: 'stable'
      }
    ];

    const alertTriggers: AlertTrigger[] = [
      {
        condition: 'GPA below 2.0',
        threshold: 2.0,
        action: 'immediate_intervention',
        responsibleParty: 'Academic Advisor',
        escalationProcedure: 'Dean notification within 24 hours'
      },
      {
        condition: 'Service non-attendance',
        threshold: 3, // missed sessions
        action: 'outreach_contact',
        responsibleParty: 'Support Services Coordinator',
        escalationProcedure: 'Academic advisor notification'
      }
    ];

    const reviewSchedule: ReviewSchedule[] = [
      {
        reviewType: 'Comprehensive Support Review',
        frequency: 'semester',
        participants: ['Student', 'Academic Advisor', 'Support Services Coordinator'],
        agenda: ['Progress assessment', 'Service effectiveness', 'Plan adjustments'],
        outcomes: ['Updated support plan', 'Service modifications', 'Goal adjustments']
      }
    ];

    return {
      checkInFrequency,
      assessmentSchedule,
      progressMetrics,
      alertTriggers,
      reviewSchedule,
      adjustmentProtocol: 'Support plan adjustments based on progress data and student feedback'
    };
  }

  private async storeSupportNeedsAssessment(assessment: SupportNeedsAssessment): Promise<void> {
    try {
      await this.prisma.supportNeedsAssessment.create({
        data: {
          id: assessment.id,
          applicationId: assessment.applicationId,
          applicantId: assessment.applicantId,
          academicSupport: assessment.academicSupport,
          learningSupport: assessment.learningSupport,
          accessibilitySupport: assessment.accessibilitySupport,
          technicalSupport: assessment.technicalSupport,
          financialSupport: assessment.financialSupport,
          culturalSupport: assessment.culturalSupport,
          remedialRequirements: assessment.remedialRequirements,
          accommodationPlan: assessment.accommodationPlan,
          supportPriority: assessment.supportPriority,
          estimatedCosts: assessment.estimatedCosts,
          recommendedServices: assessment.recommendedServices,
          monitoringPlan: assessment.monitoringPlan,
          assessedAt: assessment.assessedAt
        }
      });
    } catch (error) {
      logger.error('Failed to store support needs assessment:', error);
      // Don't throw error - assessment can still be returned even if storage fails
    }
  }
}