import { PrismaClient } from '@prisma/client';
import { Logger } from '../../utils/logger';
import { AccessibilityAssessment, CheckStatus } from './EligibilityChecker';

export interface AccessibilityNeed {
  category: string;
  description: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  accommodations: string[];
  assistiveTechnology: string[];
  cost: number;
}

export interface AccommodationPlan {
  applicationId: string;
  needs: AccessibilityNeed[];
  recommendedAccommodations: RecommendedAccommodation[];
  assistiveTechnologySupport: AssistiveTechnologySupport[];
  totalEstimatedCost: number;
  implementationTimeline: string;
  status: CheckStatus;
}

export interface RecommendedAccommodation {
  type: string;
  description: string;
  provider: string;
  cost: number;
  implementationTime: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
}

export interface AssistiveTechnologySupport {
  technology: string;
  compatibility: boolean;
  supportLevel: 'full' | 'partial' | 'limited' | 'none';
  additionalSetup: string[];
  cost: number;
}

export interface SpecialCircumstance {
  type: string;
  description: string;
  impact: 'low' | 'medium' | 'high';
  accommodationsRequired: string[];
  documentation: string[];
  reviewRequired: boolean;
}

export class AccessibilityAssessmentService {
  private prisma: PrismaClient;
  private logger: Logger;
  private supportedAccommodations: RecommendedAccommodation[];
  private supportedTechnologies: AssistiveTechnologySupport[];

  constructor() {
    this.prisma = new PrismaClient();
    this.logger = new Logger('AccessibilityAssessmentService');
    this.initializeSupportedAccommodations();
    this.initializeSupportedTechnologies();
  }

  /**
   * Initialize supported accommodations
   */
  private initializeSupportedAccommodations(): void {
    this.supportedAccommodations = [
      {
        type: 'Extended Time',
        description: 'Additional time for assignments and assessments',
        provider: 'ScrollUniversity Academic Support',
        cost: 0,
        implementationTime: 'Immediate',
        priority: 'high'
      },
      {
        type: 'Alternative Format Materials',
        description: 'Course materials in accessible formats (large print, audio, braille)',
        provider: 'ScrollUniversity Accessibility Services',
        cost: 50,
        implementationTime: '1-2 weeks',
        priority: 'high'
      },
      {
        type: 'Sign Language Interpretation',
        description: 'ASL interpretation for live sessions and events',
        provider: 'Professional Interpretation Services',
        cost: 150,
        implementationTime: '2-3 weeks',
        priority: 'critical'
      },
      {
        type: 'Note-Taking Services',
        description: 'Professional note-taking assistance for lectures',
        provider: 'ScrollUniversity Student Services',
        cost: 75,
        implementationTime: '1 week',
        priority: 'medium'
      },
      {
        type: 'Captioning Services',
        description: 'Real-time captioning for video content and live sessions',
        provider: 'ScrollUniversity Media Services',
        cost: 100,
        implementationTime: '1 week',
        priority: 'high'
      },
      {
        type: 'Mobility Accommodations',
        description: 'Physical accessibility support for campus visits',
        provider: 'ScrollUniversity Facilities',
        cost: 0,
        implementationTime: 'Immediate',
        priority: 'medium'
      },
      {
        type: 'Cognitive Support Services',
        description: 'Learning strategy support and cognitive accommodations',
        provider: 'ScrollUniversity Learning Center',
        cost: 125,
        implementationTime: '1-2 weeks',
        priority: 'medium'
      }
    ];
  }

  /**
   * Initialize supported assistive technologies
   */
  private initializeSupportedTechnologies(): void {
    this.supportedTechnologies = [
      {
        technology: 'Screen Readers (JAWS, NVDA, VoiceOver)',
        compatibility: true,
        supportLevel: 'full',
        additionalSetup: ['Platform accessibility testing', 'Custom navigation training'],
        cost: 0
      },
      {
        technology: 'Voice Recognition Software (Dragon NaturallySpeaking)',
        compatibility: true,
        supportLevel: 'full',
        additionalSetup: ['Voice command customization', 'Platform integration'],
        cost: 25
      },
      {
        technology: 'Magnification Software (ZoomText, MAGic)',
        compatibility: true,
        supportLevel: 'full',
        additionalSetup: ['Display optimization', 'Font size configuration'],
        cost: 0
      },
      {
        technology: 'Alternative Keyboards and Input Devices',
        compatibility: true,
        supportLevel: 'partial',
        additionalSetup: ['Device configuration', 'Custom key mapping'],
        cost: 50
      },
      {
        technology: 'Eye-Tracking Systems',
        compatibility: true,
        supportLevel: 'limited',
        additionalSetup: ['Specialized software integration', 'Calibration support'],
        cost: 200
      },
      {
        technology: 'Switch Access Devices',
        compatibility: true,
        supportLevel: 'partial',
        additionalSetup: ['Switch configuration', 'Navigation customization'],
        cost: 75
      },
      {
        technology: 'Communication Devices (AAC)',
        compatibility: true,
        supportLevel: 'limited',
        additionalSetup: ['Communication board setup', 'Symbol integration'],
        cost: 100
      }
    ];
  }

  /**
   * Conducts comprehensive accessibility needs assessment
   */
  async assessAccessibilityNeeds(applicationId: string): Promise<AccommodationPlan> {
    try {
      this.logger.info(`Conducting accessibility assessment for application ${applicationId}`);

      // Get application data
      const application = await this.prisma.applications.findUnique({
        where: { id: applicationId }
      });

      if (!application) {
        throw new Error(`Application ${applicationId} not found`);
      }

      const accessibilityData = application.application_data?.accessibility;
      
      // Analyze accessibility needs
      const needs = await this.analyzeAccessibilityNeeds(accessibilityData);
      
      // Generate accommodation recommendations
      const recommendedAccommodations = await this.generateAccommodationRecommendations(needs);
      
      // Assess assistive technology support
      const assistiveTechnologySupport = await this.assessAssistiveTechnologySupport(accessibilityData);
      
      // Calculate total cost
      const totalEstimatedCost = this.calculateTotalCost(recommendedAccommodations, assistiveTechnologySupport);
      
      // Determine implementation timeline
      const implementationTimeline = this.determineImplementationTimeline(recommendedAccommodations);
      
      // Determine overall status
      const status = this.determineAccommodationStatus(needs, recommendedAccommodations);

      const plan: AccommodationPlan = {
        applicationId,
        needs,
        recommendedAccommodations,
        assistiveTechnologySupport,
        totalEstimatedCost,
        implementationTimeline,
        status
      };

      // Save accommodation plan
      await this.saveAccommodationPlan(plan);

      this.logger.info(`Accessibility assessment completed for application ${applicationId}: ${status}`);
      return plan;

    } catch (error) {
      this.logger.error(`Error conducting accessibility assessment for application ${applicationId}:`, error);
      throw error;
    }
  }

  /**
   * Analyzes accessibility needs from application data
   */
  private async analyzeAccessibilityNeeds(accessibilityData: any): Promise<AccessibilityNeed[]> {
    const needs: AccessibilityNeed[] = [];

    if (!accessibilityData || !accessibilityData.hasSpecialNeeds) {
      return needs;
    }

    // Process documented disabilities
    if (accessibilityData.disabilities) {
      for (const disability of accessibilityData.disabilities) {
        const need = await this.categorizeDisability(disability);
        needs.push(need);
      }
    }

    // Process specific accommodation requests
    if (accessibilityData.accommodationsRequested) {
      for (const request of accessibilityData.accommodationsRequested) {
        const need = await this.categorizeAccommodationRequest(request);
        needs.push(need);
      }
    }

    // Process assistive technology needs
    if (accessibilityData.assistiveTechnologyUsed) {
      for (const technology of accessibilityData.assistiveTechnologyUsed) {
        const need = await this.categorizeTechnologyNeed(technology);
        needs.push(need);
      }
    }

    return needs;
  }

  /**
   * Categorizes disability into accessibility need
   */
  private async categorizeDisability(disability: any): Promise<AccessibilityNeed> {
    const category = disability.type || 'General';
    const severity = disability.severity || 'medium';

    const accommodationMap: { [key: string]: string[] } = {
      'Visual': ['Alternative Format Materials', 'Screen Reader Support', 'Magnification Services'],
      'Hearing': ['Sign Language Interpretation', 'Captioning Services', 'Audio Enhancement'],
      'Mobility': ['Mobility Accommodations', 'Alternative Input Devices', 'Flexible Scheduling'],
      'Cognitive': ['Extended Time', 'Note-Taking Services', 'Cognitive Support Services'],
      'Learning': ['Extended Time', 'Alternative Format Materials', 'Learning Strategy Support']
    };

    const technologyMap: { [key: string]: string[] } = {
      'Visual': ['Screen Readers', 'Magnification Software', 'Voice Recognition'],
      'Hearing': ['Captioning Software', 'Audio Enhancement', 'Visual Alerts'],
      'Mobility': ['Alternative Keyboards', 'Eye-Tracking Systems', 'Switch Access'],
      'Cognitive': ['Memory Aids', 'Organization Tools', 'Focus Enhancement'],
      'Learning': ['Text-to-Speech', 'Study Tools', 'Time Management Apps']
    };

    return {
      category,
      description: disability.description || `${category} disability requiring accommodation`,
      severity: severity as 'low' | 'medium' | 'high' | 'critical',
      accommodations: accommodationMap[category] || ['General Support Services'],
      assistiveTechnology: technologyMap[category] || ['Standard Accessibility Tools'],
      cost: this.estimateNeedCost(category, severity)
    };
  }

  /**
   * Categorizes accommodation request into accessibility need
   */
  private async categorizeAccommodationRequest(request: any): Promise<AccessibilityNeed> {
    return {
      category: 'Requested Accommodation',
      description: request.description || request.type,
      severity: request.priority || 'medium',
      accommodations: [request.type],
      assistiveTechnology: request.technologyNeeded || [],
      cost: request.estimatedCost || 50
    };
  }

  /**
   * Categorizes technology need
   */
  private async categorizeTechnologyNeed(technology: any): Promise<AccessibilityNeed> {
    return {
      category: 'Assistive Technology',
      description: `Support for ${technology.name || technology.type}`,
      severity: technology.essential ? 'high' : 'medium',
      accommodations: ['Technology Integration Support'],
      assistiveTechnology: [technology.name || technology.type],
      cost: technology.supportCost || 25
    };
  }

  /**
   * Estimates cost for accessibility need
   */
  private estimateNeedCost(category: string, severity: string): number {
    const baseCosts: { [key: string]: number } = {
      'Visual': 100,
      'Hearing': 150,
      'Mobility': 75,
      'Cognitive': 125,
      'Learning': 100
    };

    const severityMultipliers: { [key: string]: number } = {
      'low': 0.5,
      'medium': 1.0,
      'high': 1.5,
      'critical': 2.0
    };

    const baseCost = baseCosts[category] || 75;
    const multiplier = severityMultipliers[severity] || 1.0;

    return Math.round(baseCost * multiplier);
  }

  /**
   * Generates accommodation recommendations based on needs
   */
  private async generateAccommodationRecommendations(needs: AccessibilityNeed[]): Promise<RecommendedAccommodation[]> {
    const recommendations: RecommendedAccommodation[] = [];
    const requestedAccommodations = new Set<string>();

    for (const need of needs) {
      for (const accommodationType of need.accommodations) {
        if (!requestedAccommodations.has(accommodationType)) {
          const accommodation = this.supportedAccommodations.find(
            acc => acc.type === accommodationType
          );
          
          if (accommodation) {
            recommendations.push({
              ...accommodation,
              priority: this.determinePriority(need.severity, accommodation.priority)
            });
            requestedAccommodations.add(accommodationType);
          }
        }
      }
    }

    return recommendations.sort((a, b) => this.priorityWeight(b.priority) - this.priorityWeight(a.priority));
  }

  /**
   * Determines priority based on need severity and accommodation priority
   */
  private determinePriority(needSeverity: string, accommodationPriority: string): 'low' | 'medium' | 'high' | 'critical' {
    const severityWeight = { 'low': 1, 'medium': 2, 'high': 3, 'critical': 4 };
    const priorityWeight = { 'low': 1, 'medium': 2, 'high': 3, 'critical': 4 };
    
    const combinedWeight = severityWeight[needSeverity as keyof typeof severityWeight] + 
                          priorityWeight[accommodationPriority as keyof typeof priorityWeight];
    
    if (combinedWeight >= 7) return 'critical';
    if (combinedWeight >= 5) return 'high';
    if (combinedWeight >= 3) return 'medium';
    return 'low';
  }

  /**
   * Gets numeric weight for priority sorting
   */
  private priorityWeight(priority: string): number {
    const weights = { 'low': 1, 'medium': 2, 'high': 3, 'critical': 4 };
    return weights[priority as keyof typeof weights] || 1;
  }

  /**
   * Assesses assistive technology support requirements
   */
  private async assessAssistiveTechnologySupport(accessibilityData: any): Promise<AssistiveTechnologySupport[]> {
    const support: AssistiveTechnologySupport[] = [];

    if (!accessibilityData?.assistiveTechnologyUsed) {
      return support;
    }

    for (const userTechnology of accessibilityData.assistiveTechnologyUsed) {
      const supportedTech = this.supportedTechnologies.find(tech =>
        tech.technology.toLowerCase().includes(userTechnology.name?.toLowerCase() || userTechnology.type?.toLowerCase())
      );

      if (supportedTech) {
        support.push({
          ...supportedTech,
          cost: supportedTech.cost + (userTechnology.additionalSupportCost || 0)
        });
      } else {
        // Technology not directly supported - create custom support plan
        support.push({
          technology: userTechnology.name || userTechnology.type,
          compatibility: false,
          supportLevel: 'limited',
          additionalSetup: ['Compatibility assessment', 'Custom integration'],
          cost: 200
        });
      }
    }

    return support;
  }

  /**
   * Calculates total estimated cost for accommodations
   */
  private calculateTotalCost(
    accommodations: RecommendedAccommodation[], 
    technologySupport: AssistiveTechnologySupport[]
  ): number {
    const accommodationCost = accommodations.reduce((sum, acc) => sum + acc.cost, 0);
    const technologyCost = technologySupport.reduce((sum, tech) => sum + tech.cost, 0);
    
    return accommodationCost + technologyCost;
  }

  /**
   * Determines implementation timeline
   */
  private determineImplementationTimeline(accommodations: RecommendedAccommodation[]): string {
    const timelineWeights: { [key: string]: number } = {
      'Immediate': 0,
      '1 week': 1,
      '1-2 weeks': 2,
      '2-3 weeks': 3,
      '1 month': 4
    };

    const maxWeight = Math.max(...accommodations.map(acc => 
      timelineWeights[acc.implementationTime] || 0
    ));

    const timelineMap: { [key: number]: string } = {
      0: 'Immediate',
      1: '1 week',
      2: '1-2 weeks',
      3: '2-3 weeks',
      4: '1 month'
    };

    return timelineMap[maxWeight] || '2-3 weeks';
  }

  /**
   * Determines overall accommodation status
   */
  private determineAccommodationStatus(
    needs: AccessibilityNeed[], 
    accommodations: RecommendedAccommodation[]
  ): CheckStatus {
    if (needs.length === 0) {
      return CheckStatus.PASSED;
    }

    // Check if all critical needs can be accommodated
    const criticalNeeds = needs.filter(need => need.severity === 'critical');
    const criticalAccommodations = accommodations.filter(acc => acc.priority === 'critical');

    if (criticalNeeds.length > 0 && criticalAccommodations.length === 0) {
      return CheckStatus.FAILED;
    }

    // Check if most needs can be accommodated
    const accommodatedNeeds = needs.filter(need => 
      need.accommodations.some(reqAcc => 
        accommodations.some(acc => acc.type === reqAcc)
      )
    );

    const accommodationRate = accommodatedNeeds.length / needs.length;

    if (accommodationRate >= 0.8) {
      return CheckStatus.PASSED;
    } else if (accommodationRate >= 0.5) {
      return CheckStatus.PENDING;
    } else {
      return CheckStatus.FAILED;
    }
  }

  /**
   * Saves accommodation plan to database
   */
  private async saveAccommodationPlan(plan: AccommodationPlan): Promise<void> {
    try {
      await this.prisma.accommodation_plans.create({
        data: {
          application_id: plan.applicationId,
          needs: plan.needs,
          recommended_accommodations: plan.recommendedAccommodations,
          assistive_technology_support: plan.assistiveTechnologySupport,
          total_estimated_cost: plan.totalEstimatedCost,
          implementation_timeline: plan.implementationTimeline,
          status: plan.status,
          created_at: new Date()
        }
      });
    } catch (error) {
      this.logger.error('Error saving accommodation plan:', error);
      throw error;
    }
  }

  /**
   * Evaluates special circumstances
   */
  async evaluateSpecialCircumstances(applicationId: string, circumstances: any[]): Promise<SpecialCircumstance[]> {
    const evaluatedCircumstances: SpecialCircumstance[] = [];

    for (const circumstance of circumstances) {
      const evaluated = await this.evaluateIndividualCircumstance(circumstance);
      evaluatedCircumstances.push(evaluated);
    }

    return evaluatedCircumstances;
  }

  /**
   * Evaluates individual special circumstance
   */
  private async evaluateIndividualCircumstance(circumstance: any): Promise<SpecialCircumstance> {
    const type = circumstance.type || 'General';
    const description = circumstance.description || '';
    
    // Determine impact level
    const impact = this.determineCircumstanceImpact(type, circumstance);
    
    // Determine required accommodations
    const accommodationsRequired = this.determineCircumstanceAccommodations(type, impact);
    
    // Determine required documentation
    const documentation = this.determineRequiredDocumentation(type);
    
    // Determine if manual review is required
    const reviewRequired = impact === 'high' || type === 'Medical' || type === 'Legal';

    return {
      type,
      description,
      impact,
      accommodationsRequired,
      documentation,
      reviewRequired
    };
  }

  /**
   * Determines impact level of circumstance
   */
  private determineCircumstanceImpact(type: string, circumstance: any): 'low' | 'medium' | 'high' {
    const highImpactTypes = ['Medical Emergency', 'Family Crisis', 'Legal Issues', 'Financial Hardship'];
    const mediumImpactTypes = ['Work Schedule Conflict', 'Childcare Issues', 'Transportation Problems'];
    
    if (highImpactTypes.includes(type)) return 'high';
    if (mediumImpactTypes.includes(type)) return 'medium';
    
    // Check severity indicators in description
    if (circumstance.severity === 'high' || circumstance.urgent) return 'high';
    if (circumstance.severity === 'medium' || circumstance.ongoing) return 'medium';
    
    return 'low';
  }

  /**
   * Determines accommodations required for circumstance
   */
  private determineCircumstanceAccommodations(type: string, impact: string): string[] {
    const accommodationMap: { [key: string]: string[] } = {
      'Medical Emergency': ['Extended Deadlines', 'Flexible Scheduling', 'Medical Leave Option'],
      'Family Crisis': ['Flexible Scheduling', 'Extended Deadlines', 'Counseling Support'],
      'Financial Hardship': ['Payment Plan Options', 'Financial Aid Review', 'Work-Study Opportunities'],
      'Work Schedule Conflict': ['Flexible Class Times', 'Recorded Sessions', 'Alternative Assessment'],
      'Childcare Issues': ['Flexible Scheduling', 'Extended Deadlines', 'Childcare Resources'],
      'Transportation Problems': ['Online Learning Options', 'Flexible Scheduling', 'Local Resources']
    };

    const baseAccommodations = accommodationMap[type] || ['Case-by-Case Review'];
    
    if (impact === 'high') {
      baseAccommodations.push('Priority Support', 'Regular Check-ins');
    }
    
    return baseAccommodations;
  }

  /**
   * Determines required documentation for circumstance
   */
  private determineRequiredDocumentation(type: string): string[] {
    const documentationMap: { [key: string]: string[] } = {
      'Medical Emergency': ['Medical Documentation', 'Healthcare Provider Statement'],
      'Family Crisis': ['Supporting Documentation', 'Third-Party Verification'],
      'Financial Hardship': ['Financial Statements', 'Income Documentation'],
      'Legal Issues': ['Legal Documentation', 'Court Orders if applicable'],
      'Work Schedule Conflict': ['Employment Verification', 'Schedule Documentation'],
      'Childcare Issues': ['Childcare Documentation', 'Family Situation Statement']
    };

    return documentationMap[type] || ['Written Statement', 'Supporting Documentation'];
  }

  /**
   * Gets supported accommodations list
   */
  getSupportedAccommodations(): RecommendedAccommodation[] {
    return [...this.supportedAccommodations];
  }

  /**
   * Gets supported assistive technologies list
   */
  getSupportedTechnologies(): AssistiveTechnologySupport[] {
    return [...this.supportedTechnologies];
  }
}