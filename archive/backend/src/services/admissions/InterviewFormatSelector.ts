/**
 * InterviewFormatSelector - Creates interview format selection and preparation resources
 * "For we walk by faith, not by sight" (2 Corinthians 5:7)
 */

import { InterviewFormat, InterviewType } from '@prisma/client';

export interface FormatRecommendation {
  format: InterviewFormat;
  score: number;
  advantages: string[];
  disadvantages: string[];
  requirements: string[];
  preparationResources: PreparationResource[];
}

export interface PreparationResource {
  type: 'document' | 'video' | 'checklist' | 'template';
  title: string;
  description: string;
  url?: string;
  content?: string;
  priority: 'high' | 'medium' | 'low';
}

export interface FormatSelectionCriteria {
  interviewType: InterviewType;
  applicantLocation: string;
  applicantTimeZone: string;
  interviewerLocation: string;
  interviewerTimeZone: string;
  applicantPreferences: string[];
  specialRequirements: string[];
  technologyAccess: TechnologyAccess;
  accessibilityNeeds: string[];
}

export interface TechnologyAccess {
  hasReliableInternet: boolean;
  hasWebcam: boolean;
  hasMicrophone: boolean;
  hasSmartphone: boolean;
  preferredPlatforms: string[];
  technicalSkillLevel: 'beginner' | 'intermediate' | 'advanced';
}

export interface InterviewPreparationGuide {
  format: InterviewFormat;
  interviewType: InterviewType;
  timeline: PreparationTimeline[];
  resources: PreparationResource[];
  technicalRequirements: TechnicalRequirement[];
  spiritualPreparation: SpiritualPreparation[];
}

export interface PreparationTimeline {
  timeframe: string;
  tasks: string[];
  priority: 'critical' | 'important' | 'recommended';
}

export interface TechnicalRequirement {
  requirement: string;
  description: string;
  testInstructions: string;
  troubleshooting: string[];
}

export interface SpiritualPreparation {
  activity: string;
  description: string;
  scriptureReference?: string;
  duration: string;
}

export class InterviewFormatSelector {
  /**
   * Recommend the best interview format based on criteria
   */
  async recommendFormat(criteria: FormatSelectionCriteria): Promise<FormatRecommendation[]> {
    try {
      const recommendations: FormatRecommendation[] = [];

      // Evaluate each format
      recommendations.push(await this.evaluateVideoConference(criteria));
      recommendations.push(await this.evaluatePhoneCall(criteria));
      recommendations.push(await this.evaluateInPerson(criteria));
      recommendations.push(await this.evaluateAsynchronousVideo(criteria));

      // Sort by score (highest first)
      recommendations.sort((a, b) => b.score - a.score);

      return recommendations;
    } catch (error) {
      console.error('Error recommending format:', error);
      throw new Error(`Failed to recommend format: ${error.message}`);
    }
  }

  /**
   * Evaluate video conference format
   */
  private async evaluateVideoConference(criteria: FormatSelectionCriteria): Promise<FormatRecommendation> {
    let score = 0.7; // Base score
    const advantages: string[] = [];
    const disadvantages: string[] = [];
    const requirements: string[] = [];

    // Technology access evaluation
    if (criteria.technologyAccess.hasReliableInternet && 
        criteria.technologyAccess.hasWebcam && 
        criteria.technologyAccess.hasMicrophone) {
      score += 0.2;
      advantages.push('Full visual and audio communication');
      advantages.push('Screen sharing capabilities');
      advantages.push('Recording possible for review');
    } else {
      score -= 0.3;
      disadvantages.push('Requires reliable internet, webcam, and microphone');
    }

    // Geographic considerations
    if (this.calculateDistance(criteria.applicantLocation, criteria.interviewerLocation) > 100) {
      score += 0.1;
      advantages.push('Eliminates travel requirements');
    }

    // Interview type suitability
    const typeBonus = this.getFormatTypeBonus(InterviewFormat.VIDEO_CONFERENCE, criteria.interviewType);
    score += typeBonus;

    // Accessibility considerations
    if (criteria.accessibilityNeeds.includes('mobility')) {
      score += 0.1;
      advantages.push('Accessible from home environment');
    }

    if (criteria.accessibilityNeeds.includes('hearing_impaired')) {
      advantages.push('Visual communication available');
      requirements.push('Closed captioning capability');
    }

    // Technical skill level
    if (criteria.technologyAccess.technicalSkillLevel === 'beginner') {
      score -= 0.1;
      disadvantages.push('May require technical support');
    }

    requirements.push('Stable internet connection (minimum 1 Mbps upload/download)');
    requirements.push('Webcam and microphone');
    requirements.push('Quiet, well-lit environment');
    requirements.push('Backup communication method');

    return {
      format: InterviewFormat.VIDEO_CONFERENCE,
      score: Math.max(0, Math.min(1, score)),
      advantages,
      disadvantages,
      requirements,
      preparationResources: this.getVideoConferenceResources(criteria.interviewType)
    };
  }

  /**
   * Evaluate phone call format
   */
  private async evaluatePhoneCall(criteria: FormatSelectionCriteria): Promise<FormatRecommendation> {
    let score = 0.6; // Base score
    const advantages: string[] = [];
    const disadvantages: string[] = [];
    const requirements: string[] = [];

    // Technology simplicity
    advantages.push('Simple technology requirements');
    advantages.push('Works with basic phone service');
    advantages.push('No internet dependency');

    // Limitations
    disadvantages.push('No visual communication');
    disadvantages.push('Limited non-verbal cues');
    disadvantages.push('Difficult to share documents');

    // Interview type suitability
    const typeBonus = this.getFormatTypeBonus(InterviewFormat.PHONE_CALL, criteria.interviewType);
    score += typeBonus;

    // Accessibility considerations
    if (criteria.accessibilityNeeds.includes('visual_impaired')) {
      score += 0.2;
      advantages.push('Excellent for visually impaired applicants');
    }

    if (criteria.accessibilityNeeds.includes('hearing_impaired')) {
      score -= 0.3;
      disadvantages.push('Not suitable for hearing impaired without TTY');
    }

    // Technology access
    if (!criteria.technologyAccess.hasReliableInternet) {
      score += 0.2;
      advantages.push('No internet required');
    }

    requirements.push('Reliable phone service');
    requirements.push('Quiet environment');
    requirements.push('Good phone reception');

    return {
      format: InterviewFormat.PHONE_CALL,
      score: Math.max(0, Math.min(1, score)),
      advantages,
      disadvantages,
      requirements,
      preparationResources: this.getPhoneCallResources(criteria.interviewType)
    };
  }

  /**
   * Evaluate in-person format
   */
  private async evaluateInPerson(criteria: FormatSelectionCriteria): Promise<FormatRecommendation> {
    let score = 0.8; // Base score - generally preferred for important interviews
    const advantages: string[] = [];
    const disadvantages: string[] = [];
    const requirements: string[] = [];

    advantages.push('Full personal interaction');
    advantages.push('Best non-verbal communication');
    advantages.push('No technology dependencies');
    advantages.push('Professional environment');

    // Distance considerations
    const distance = this.calculateDistance(criteria.applicantLocation, criteria.interviewerLocation);
    if (distance > 500) {
      score -= 0.4;
      disadvantages.push('Significant travel required');
      disadvantages.push('Travel costs and time');
    } else if (distance > 100) {
      score -= 0.2;
      disadvantages.push('Moderate travel required');
    }

    // Interview type suitability
    const typeBonus = this.getFormatTypeBonus(InterviewFormat.IN_PERSON, criteria.interviewType);
    score += typeBonus;

    // Accessibility considerations
    if (criteria.accessibilityNeeds.includes('mobility')) {
      score -= 0.2;
      disadvantages.push('May require accessibility accommodations');
      requirements.push('Accessible venue');
    }

    // Special requirements
    if (criteria.specialRequirements.includes('committee_interview')) {
      score += 0.1;
      advantages.push('Ideal for committee interviews');
    }

    requirements.push('Travel arrangements');
    requirements.push('Professional attire');
    requirements.push('Punctual arrival');
    requirements.push('Physical documents/portfolio');

    return {
      format: InterviewFormat.IN_PERSON,
      score: Math.max(0, Math.min(1, score)),
      advantages,
      disadvantages,
      requirements,
      preparationResources: this.getInPersonResources(criteria.interviewType)
    };
  }

  /**
   * Evaluate asynchronous video format
   */
  private async evaluateAsynchronousVideo(criteria: FormatSelectionCriteria): Promise<FormatRecommendation> {
    let score = 0.5; // Base score
    const advantages: string[] = [];
    const disadvantages: string[] = [];
    const requirements: string[] = [];

    advantages.push('Flexible timing');
    advantages.push('Opportunity to prepare responses');
    advantages.push('Can re-record if needed');
    advantages.push('Reduces scheduling conflicts');

    disadvantages.push('No real-time interaction');
    disadvantages.push('Limited follow-up questions');
    disadvantages.push('Less personal connection');

    // Interview type suitability
    const typeBonus = this.getFormatTypeBonus(InterviewFormat.ASYNCHRONOUS_VIDEO, criteria.interviewType);
    score += typeBonus;

    // Time zone benefits
    const timeZoneDiff = this.calculateTimeZoneDifference(
      criteria.applicantTimeZone,
      criteria.interviewerTimeZone
    );
    if (Math.abs(timeZoneDiff) > 6) {
      score += 0.2;
      advantages.push('Eliminates time zone conflicts');
    }

    // Technology requirements
    if (criteria.technologyAccess.hasWebcam && criteria.technologyAccess.hasMicrophone) {
      score += 0.1;
    } else {
      score -= 0.2;
      disadvantages.push('Requires webcam and microphone');
    }

    requirements.push('Video recording capability');
    requirements.push('Good lighting and audio');
    requirements.push('Stable internet for upload');
    requirements.push('Video editing basic skills (optional)');

    return {
      format: InterviewFormat.ASYNCHRONOUS_VIDEO,
      score: Math.max(0, Math.min(1, score)),
      advantages,
      disadvantages,
      requirements,
      preparationResources: this.getAsynchronousVideoResources(criteria.interviewType)
    };
  }

  /**
   * Get format bonus based on interview type
   */
  private getFormatTypeBonus(format: InterviewFormat, interviewType: InterviewType): number {
    const bonusMatrix = {
      [InterviewFormat.VIDEO_CONFERENCE]: {
        [InterviewType.INITIAL_SCREENING]: 0.1,
        [InterviewType.ACADEMIC_ASSESSMENT]: 0.15,
        [InterviewType.SPIRITUAL_EVALUATION]: 0.1,
        [InterviewType.CHARACTER_INTERVIEW]: 0.15,
        [InterviewType.FINAL_INTERVIEW]: 0.05,
        [InterviewType.COMMITTEE_INTERVIEW]: 0.1
      },
      [InterviewFormat.PHONE_CALL]: {
        [InterviewType.INITIAL_SCREENING]: 0.15,
        [InterviewType.ACADEMIC_ASSESSMENT]: -0.1,
        [InterviewType.SPIRITUAL_EVALUATION]: 0.05,
        [InterviewType.CHARACTER_INTERVIEW]: -0.05,
        [InterviewType.FINAL_INTERVIEW]: -0.2,
        [InterviewType.COMMITTEE_INTERVIEW]: -0.3
      },
      [InterviewFormat.IN_PERSON]: {
        [InterviewType.INITIAL_SCREENING]: 0.05,
        [InterviewType.ACADEMIC_ASSESSMENT]: 0.1,
        [InterviewType.SPIRITUAL_EVALUATION]: 0.2,
        [InterviewType.CHARACTER_INTERVIEW]: 0.2,
        [InterviewType.FINAL_INTERVIEW]: 0.25,
        [InterviewType.COMMITTEE_INTERVIEW]: 0.3
      },
      [InterviewFormat.ASYNCHRONOUS_VIDEO]: {
        [InterviewType.INITIAL_SCREENING]: 0.1,
        [InterviewType.ACADEMIC_ASSESSMENT]: 0.05,
        [InterviewType.SPIRITUAL_EVALUATION]: -0.1,
        [InterviewType.CHARACTER_INTERVIEW]: -0.15,
        [InterviewType.FINAL_INTERVIEW]: -0.3,
        [InterviewType.COMMITTEE_INTERVIEW]: -0.4
      }
    };

    return bonusMatrix[format]?.[interviewType] || 0;
  }

  /**
   * Generate comprehensive preparation guide
   */
  async generatePreparationGuide(
    format: InterviewFormat,
    interviewType: InterviewType
  ): Promise<InterviewPreparationGuide> {
    return {
      format,
      interviewType,
      timeline: this.getPreparationTimeline(format, interviewType),
      resources: this.getFormatResources(format, interviewType),
      technicalRequirements: this.getTechnicalRequirements(format),
      spiritualPreparation: this.getSpiritualPreparation(interviewType)
    };
  }

  /**
   * Get preparation timeline
   */
  private getPreparationTimeline(format: InterviewFormat, interviewType: InterviewType): PreparationTimeline[] {
    const baseTimeline: PreparationTimeline[] = [
      {
        timeframe: '1 week before',
        tasks: [
          'Review application materials',
          'Research ScrollUniversity mission and values',
          'Prepare testimony and calling statement',
          'Gather required documents'
        ],
        priority: 'critical'
      },
      {
        timeframe: '2-3 days before',
        tasks: [
          'Test technology setup',
          'Prepare interview environment',
          'Review common interview questions',
          'Practice responses aloud'
        ],
        priority: 'important'
      },
      {
        timeframe: 'Day of interview',
        tasks: [
          'Final technology check',
          'Arrive/login 10 minutes early',
          'Have water and tissues available',
          'Pray for wisdom and peace'
        ],
        priority: 'critical'
      }
    ];

    // Add format-specific tasks
    if (format === InterviewFormat.VIDEO_CONFERENCE) {
      baseTimeline[1].tasks.push('Test video and audio quality');
      baseTimeline[1].tasks.push('Ensure good lighting setup');
    } else if (format === InterviewFormat.IN_PERSON) {
      baseTimeline[1].tasks.push('Plan travel route and timing');
      baseTimeline[1].tasks.push('Prepare professional attire');
    }

    return baseTimeline;
  }

  /**
   * Get format-specific resources
   */
  private getFormatResources(format: InterviewFormat, interviewType: InterviewType): PreparationResource[] {
    const baseResources = this.getBaseResources(interviewType);
    
    switch (format) {
      case InterviewFormat.VIDEO_CONFERENCE:
        return [...baseResources, ...this.getVideoConferenceResources(interviewType)];
      case InterviewFormat.PHONE_CALL:
        return [...baseResources, ...this.getPhoneCallResources(interviewType)];
      case InterviewFormat.IN_PERSON:
        return [...baseResources, ...this.getInPersonResources(interviewType)];
      case InterviewFormat.ASYNCHRONOUS_VIDEO:
        return [...baseResources, ...this.getAsynchronousVideoResources(interviewType)];
      default:
        return baseResources;
    }
  }

  /**
   * Get base preparation resources
   */
  private getBaseResources(interviewType: InterviewType): PreparationResource[] {
    return [
      {
        type: 'document',
        title: 'ScrollUniversity Mission and Values',
        description: 'Understanding our kingdom-focused educational approach',
        content: 'ScrollUniversity exists to train kingdom builders through scroll-aligned education...',
        priority: 'high'
      },
      {
        type: 'checklist',
        title: 'Interview Preparation Checklist',
        description: 'Complete preparation checklist for your interview',
        content: '□ Review application\n□ Prepare testimony\n□ Research programs\n□ Practice responses',
        priority: 'high'
      },
      {
        type: 'document',
        title: 'Common Interview Questions',
        description: 'Typical questions asked during admissions interviews',
        content: 'Tell us about your calling...\nWhy ScrollUniversity?...\nDescribe your spiritual journey...',
        priority: 'medium'
      }
    ];
  }

  /**
   * Get video conference specific resources
   */
  private getVideoConferenceResources(interviewType: InterviewType): PreparationResource[] {
    return [
      {
        type: 'video',
        title: 'Video Interview Best Practices',
        description: 'How to present yourself professionally on video',
        url: 'https://scrolluniversity.edu/resources/video-interview-guide',
        priority: 'high'
      },
      {
        type: 'checklist',
        title: 'Technical Setup Checklist',
        description: 'Ensure your technology is ready',
        content: '□ Test camera and microphone\n□ Check internet speed\n□ Set up lighting\n□ Test platform access',
        priority: 'high'
      },
      {
        type: 'template',
        title: 'Virtual Background Guidelines',
        description: 'Appropriate backgrounds for video interviews',
        content: 'Use neutral, professional backgrounds. Avoid distracting elements...',
        priority: 'medium'
      }
    ];
  }

  /**
   * Get phone call specific resources
   */
  private getPhoneCallResources(interviewType: InterviewType): PreparationResource[] {
    return [
      {
        type: 'document',
        title: 'Phone Interview Excellence',
        description: 'Maximizing communication without visual cues',
        content: 'Speak clearly and at appropriate pace. Use vocal variety to convey enthusiasm...',
        priority: 'high'
      },
      {
        type: 'checklist',
        title: 'Phone Interview Setup',
        description: 'Preparing your environment for phone interviews',
        content: '□ Find quiet location\n□ Test phone reception\n□ Have water nearby\n□ Prepare notes',
        priority: 'high'
      }
    ];
  }

  /**
   * Get in-person specific resources
   */
  private getInPersonResources(interviewType: InterviewType): PreparationResource[] {
    return [
      {
        type: 'document',
        title: 'Professional Presentation Guide',
        description: 'Dressing and presenting professionally in person',
        content: 'Business professional attire is recommended. Arrive 10-15 minutes early...',
        priority: 'high'
      },
      {
        type: 'document',
        title: 'Campus Visit Information',
        description: 'Making the most of your campus visit',
        content: 'Take time to explore our facilities and meet current students...',
        priority: 'medium'
      }
    ];
  }

  /**
   * Get asynchronous video specific resources
   */
  private getAsynchronousVideoResources(interviewType: InterviewType): PreparationResource[] {
    return [
      {
        type: 'video',
        title: 'Recording Your Video Response',
        description: 'Creating compelling asynchronous video responses',
        url: 'https://scrolluniversity.edu/resources/async-video-guide',
        priority: 'high'
      },
      {
        type: 'template',
        title: 'Video Response Structure',
        description: 'Organizing your thoughts for video responses',
        content: 'Introduction (30 sec) → Main Content (2-3 min) → Conclusion (30 sec)',
        priority: 'high'
      }
    ];
  }

  /**
   * Get technical requirements for format
   */
  private getTechnicalRequirements(format: InterviewFormat): TechnicalRequirement[] {
    switch (format) {
      case InterviewFormat.VIDEO_CONFERENCE:
        return [
          {
            requirement: 'Internet Speed',
            description: 'Minimum 1 Mbps upload/download speed',
            testInstructions: 'Visit speedtest.net to test your connection',
            troubleshooting: ['Move closer to router', 'Close other applications', 'Use ethernet cable']
          },
          {
            requirement: 'Camera and Microphone',
            description: 'Working webcam and microphone',
            testInstructions: 'Test in your video platform settings',
            troubleshooting: ['Check device permissions', 'Update drivers', 'Try different USB port']
          }
        ];
      case InterviewFormat.PHONE_CALL:
        return [
          {
            requirement: 'Phone Service',
            description: 'Reliable phone connection',
            testInstructions: 'Make a test call to verify quality',
            troubleshooting: ['Move to area with better reception', 'Use landline if available']
          }
        ];
      default:
        return [];
    }
  }

  /**
   * Get spiritual preparation activities
   */
  private getSpiritualPreparation(interviewType: InterviewType): SpiritualPreparation[] {
    const basePreparation: SpiritualPreparation[] = [
      {
        activity: 'Prayer for Wisdom',
        description: 'Ask God for wisdom and clarity in your responses',
        scriptureReference: 'James 1:5',
        duration: '10-15 minutes'
      },
      {
        activity: 'Testimony Review',
        description: 'Reflect on your salvation and calling testimony',
        scriptureReference: 'Revelation 12:11',
        duration: '20-30 minutes'
      }
    ];

    if (interviewType === InterviewType.SPIRITUAL_EVALUATION) {
      basePreparation.push({
        activity: 'Spiritual Inventory',
        description: 'Examine your spiritual growth and areas for development',
        scriptureReference: '2 Corinthians 13:5',
        duration: '30-45 minutes'
      });
    }

    return basePreparation;
  }

  /**
   * Calculate distance between locations (simplified)
   */
  private calculateDistance(location1: string, location2: string): number {
    // Simplified distance calculation - in reality would use geolocation APIs
    if (location1 === location2) return 0;
    
    // Mock distances for common scenarios
    const mockDistances: { [key: string]: number } = {
      'same_city': 25,
      'same_state': 150,
      'same_country': 500,
      'international': 2000
    };

    return mockDistances['same_state'] || 150;
  }

  /**
   * Calculate time zone difference
   */
  private calculateTimeZoneDifference(tz1: string, tz2: string): number {
    // Simplified time zone calculation
    const timeZoneOffsets: { [key: string]: number } = {
      'UTC': 0,
      'EST': -5,
      'CST': -6,
      'MST': -7,
      'PST': -8,
      'GMT': 0
    };

    const offset1 = timeZoneOffsets[tz1] || 0;
    const offset2 = timeZoneOffsets[tz2] || 0;

    return offset1 - offset2;
  }
}