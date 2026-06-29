/**
 * Appeal Generation Service
 * Generates personalized donation appeals using AI
 */

import {
  AppealRequest,
  AppealGenerationResponse,
  PersonalizedAppeal,
  DonorIntelligence,
  ImpactStory,
  Testimonial
} from '../types/fundraising.types';
import { AIGatewayService } from './AIGatewayService';
import logger from '../utils/logger';

export class AppealGenerationService {
  private aiGateway: AIGatewayService;

  constructor() {
    this.aiGateway = new AIGatewayService();
  }

  /**
   * Generate personalized donation appeal
   */
  async generateAppeal(
    request: AppealRequest,
    intelligence: DonorIntelligence
  ): Promise<AppealGenerationResponse> {
    try {
      logger.info('Generating donation appeal', { donorId: request.donorId });

      // Determine ask amount
      const suggestedAmount = request.askAmount || intelligence.optimalAskAmount;
      const alternativeAmounts = this.calculateAlternativeAmounts(suggestedAmount);

      // Get impact story if requested
      let impactStory: ImpactStory | undefined;
      if (request.includeImpactStory) {
        impactStory = await this.selectImpactStory(intelligence.interests);
      }

      // Get testimonial if requested
      let testimonial: Testimonial | undefined;
      if (request.includeTestimonial) {
        testimonial = await this.selectTestimonial(intelligence.interests);
      }

      // Generate main appeal content
      const appeal = await this.generateAppealContent(
        request,
        intelligence,
        suggestedAmount,
        alternativeAmounts,
        impactStory,
        testimonial
      );

      // Generate alternative versions
      const alternatives = await this.generateAlternativeAppeals(
        request,
        intelligence,
        appeal
      );

      const confidence = this.calculateConfidence(intelligence, appeal);

      logger.info('Appeal generated', {
        donorId: request.donorId,
        confidence,
        suggestedAmount
      });

      return {
        appeal,
        confidence,
        alternatives
      };
    } catch (error) {
      logger.error('Error generating appeal', { error, request });
      throw error;
    }
  }

  /**
   * Generate main appeal content using AI
   */
  private async generateAppealContent(
    request: AppealRequest,
    intelligence: DonorIntelligence,
    suggestedAmount: number,
    alternativeAmounts: number[],
    impactStory?: ImpactStory,
    testimonial?: Testimonial
  ): Promise<PersonalizedAppeal> {
    try {
      const prompt = this.buildAppealPrompt(
        request,
        intelligence,
        suggestedAmount,
        impactStory,
        testimonial
      );

      const response = await this.aiGateway.generateText({
        prompt,
        maxTokens: 1500,
        temperature: 0.7
      });

      const content = JSON.parse(response.text);

      return {
        donorId: request.donorId,
        subject: content.subject,
        greeting: content.greeting,
        opening: content.opening,
        body: content.body,
        impactStory,
        testimonial,
        askStatement: content.askStatement,
        suggestedAmount,
        alternativeAmounts,
        callToAction: content.callToAction,
        closing: content.closing,
        signature: content.signature || 'Dr. Sarah Johnson\nPresident, ScrollUniversity',
        postscript: content.postscript,
        confidence: 0.85,
        reasoning: content.reasoning || 'Generated based on donor intelligence and interests',
        generatedAt: new Date()
      };
    } catch (error) {
      logger.error('Error generating appeal content', { error });
      
      // Fallback to template-based appeal
      return this.generateTemplateAppeal(
        request,
        intelligence,
        suggestedAmount,
        alternativeAmounts,
        impactStory,
        testimonial
      );
    }
  }

  /**
   * Build AI prompt for appeal generation
   */
  private buildAppealPrompt(
    request: AppealRequest,
    intelligence: DonorIntelligence,
    suggestedAmount: number,
    impactStory?: ImpactStory,
    testimonial?: Testimonial
  ): string {
    const interestsList = intelligence.interests
      .slice(0, 3)
      .map(i => i.category)
      .join(', ');

    return `Generate a personalized donation appeal for ScrollUniversity with these parameters:

DONOR PROFILE:
- Engagement Score: ${intelligence.engagementScore}/100
- Engagement Trend: ${intelligence.engagementTrend}
- Primary Interests: ${interestsList}
- Estimated Capacity: $${intelligence.estimatedCapacity.toLocaleString()}
- Preferred Contact: ${intelligence.bestContactMethod}

APPEAL PARAMETERS:
- Suggested Ask: $${suggestedAmount.toLocaleString()}
- Urgency: ${request.urgency}
- Tone: ${request.tone}
- Designation: ${request.designation || 'General Fund'}

${impactStory ? `IMPACT STORY TO INCLUDE:
Title: ${impactStory.title}
Story: ${impactStory.story}
Outcome: ${impactStory.outcome}
` : ''}

${testimonial ? `TESTIMONIAL TO INCLUDE:
From: ${testimonial.author}, ${testimonial.role}
Quote: "${testimonial.quote}"
` : ''}

SCROLLUNIVERSITY MISSION:
ScrollUniversity is a revolutionary Christian educational platform combining divine revelation with cutting-edge technology to deliver "Zion's Academic Government on Earth." We integrate spiritual formation with academic excellence.

Generate a compelling, personalized donation appeal that:
1. Acknowledges the donor's past support and interests
2. Connects to their specific interests (${interestsList})
3. ${impactStory ? 'Incorporates the impact story naturally' : 'Includes a relevant impact example'}
4. ${testimonial ? 'Weaves in the testimonial' : 'Includes a brief student success story'}
5. Makes a clear, specific ask for $${suggestedAmount.toLocaleString()}
6. Maintains a ${request.tone} tone
7. Includes biblical/spiritual elements appropriate for Christian education
8. Creates urgency without being pushy (${request.urgency} urgency level)

Provide response as JSON:
{
  "subject": "<email subject line>",
  "greeting": "<personalized greeting>",
  "opening": "<opening paragraph acknowledging donor>",
  "body": "<main appeal body with impact story and testimonial>",
  "askStatement": "<clear, specific ask>",
  "callToAction": "<compelling call to action>",
  "closing": "<warm closing paragraph>",
  "postscript": "<optional P.S. with additional impact or urgency>",
  "reasoning": "<brief explanation of personalization choices>"
}`;
  }

  /**
   * Generate template-based appeal as fallback
   */
  private generateTemplateAppeal(
    request: AppealRequest,
    intelligence: DonorIntelligence,
    suggestedAmount: number,
    alternativeAmounts: number[],
    impactStory?: ImpactStory,
    testimonial?: Testimonial
  ): PersonalizedAppeal {
    const topInterest = intelligence.interests[0]?.category || 'education';

    return {
      donorId: request.donorId,
      subject: `Your Impact on ${topInterest} at ScrollUniversity`,
      greeting: 'Dear Friend of ScrollUniversity,',
      opening: `Thank you for your faithful support of ScrollUniversity. Your previous gifts have made a tremendous difference in the lives of our students, particularly in ${topInterest}.`,
      body: `As we continue our mission to deliver world-class Christian education that combines spiritual formation with academic excellence, we're seeing incredible results. ${impactStory ? impactStory.story : 'Students are thriving academically and spiritually, with 95% reporting significant growth in both areas.'}\n\n${testimonial ? `${testimonial.author}, a ${testimonial.role}, shares: "${testimonial.quote}"` : 'Our students consistently report that ScrollUniversity has transformed their understanding of how faith and learning integrate.'}`,
      impactStory,
      testimonial,
      askStatement: `Would you consider a gift of $${suggestedAmount.toLocaleString()} to help us continue this vital work? Your support directly impacts students pursuing their calling in ${topInterest}.`,
      suggestedAmount,
      alternativeAmounts,
      callToAction: 'Click here to make your gift today and join us in transforming lives through Christ-centered education.',
      closing: 'Thank you for prayerfully considering this opportunity to invest in the next generation of kingdom leaders. Your partnership means everything to us.',
      signature: 'Dr. Sarah Johnson\nPresident, ScrollUniversity',
      postscript: request.urgency === 'high' 
        ? 'P.S. We have a matching gift opportunity that doubles your impact if you give by the end of this month!'
        : undefined,
      confidence: 0.7,
      reasoning: 'Template-based appeal customized with donor interests',
      generatedAt: new Date()
    };
  }

  /**
   * Calculate alternative ask amounts
   */
  private calculateAlternativeAmounts(suggestedAmount: number): number[] {
    return [
      Math.round(suggestedAmount * 0.5),
      Math.round(suggestedAmount * 0.75),
      suggestedAmount,
      Math.round(suggestedAmount * 1.5),
      Math.round(suggestedAmount * 2)
    ].filter((amount, index, self) => self.indexOf(amount) === index)
     .sort((a, b) => b - a);
  }

  /**
   * Select relevant impact story based on donor interests
   */
  private async selectImpactStory(
    interests: DonorIntelligence['interests']
  ): Promise<ImpactStory> {
    // In real implementation, query database for relevant stories
    const topInterest = interests[0]?.category || 'education';

    const stories: Record<string, ImpactStory> = {
      'Scholarships': {
        title: 'From Struggling Student to Ministry Leader',
        story: 'Maria came to ScrollUniversity with a dream but no resources. Through scholarship support, she completed her degree in Theology and AI Integration. Today, she leads a thriving digital ministry reaching thousands across Latin America.',
        outcome: 'Maria now mentors 50+ students and has planted 3 digital churches',
        relevance: 'Your scholarship support makes stories like Maria\'s possible',
        imageUrl: '/images/impact/maria-story.jpg'
      },
      'Education': {
        title: 'Transforming Education Through Technology',
        story: 'Our AI-powered learning platform has enabled students in 47 countries to access world-class Christian education. Students report 40% faster learning and 95% satisfaction with spiritual formation integration.',
        outcome: '10,000+ students educated globally with 98% completion rate',
        relevance: 'Your support advances educational innovation',
        imageUrl: '/images/impact/global-education.jpg'
      },
      'default': {
        title: 'Building Kingdom Leaders',
        story: 'ScrollUniversity graduates are making an impact worldwide. From tech startups with kingdom values to mission fields leveraging AI, our students are changing the world for Christ.',
        outcome: '500+ graduates serving in 30+ countries',
        relevance: 'Your investment multiplies kingdom impact',
        imageUrl: '/images/impact/graduates.jpg'
      }
    };

    return stories[topInterest] || stories['default'];
  }

  /**
   * Select relevant testimonial based on donor interests
   */
  private async selectTestimonial(
    interests: DonorIntelligence['interests']
  ): Promise<Testimonial> {
    // In real implementation, query database for relevant testimonials
    const topInterest = interests[0]?.category || 'education';

    const testimonials: Record<string, Testimonial> = {
      'Scholarships': {
        author: 'David Chen',
        role: 'Scholarship Recipient, Class of 2024',
        quote: 'Without scholarship support, I never could have afforded this education. Now I\'m using AI to advance Bible translation in unreached languages.',
        context: 'David received full scholarship support',
        relevance: 'Shows direct impact of scholarship giving'
      },
      'Education': {
        author: 'Dr. James Wilson',
        role: 'Professor of Theology and Technology',
        quote: 'ScrollUniversity is pioneering a new model of Christian education that doesn\'t compromise on either academic excellence or spiritual depth.',
        context: 'Faculty perspective on educational innovation',
        relevance: 'Validates educational approach'
      },
      'default': {
        author: 'Sarah Martinez',
        role: 'Student, Master of Divinity',
        quote: 'This isn\'t just education—it\'s transformation. I\'m learning to integrate my faith with cutting-edge technology in ways I never imagined possible.',
        context: 'Current student experience',
        relevance: 'Shows ongoing student impact'
      }
    };

    return testimonials[topInterest] || testimonials['default'];
  }

  /**
   * Generate alternative appeal versions
   */
  private async generateAlternativeAppeals(
    request: AppealRequest,
    intelligence: DonorIntelligence,
    primaryAppeal: PersonalizedAppeal
  ): Promise<PersonalizedAppeal[]> {
    // Generate 1-2 alternative versions with different tones or approaches
    const alternatives: PersonalizedAppeal[] = [];

    // Alternative 1: More urgent tone
    if (request.urgency !== 'high') {
      const urgentRequest = { ...request, urgency: 'high' as const };
      try {
        const urgentAppeal = await this.generateAppealContent(
          urgentRequest,
          intelligence,
          primaryAppeal.suggestedAmount,
          primaryAppeal.alternativeAmounts,
          primaryAppeal.impactStory,
          primaryAppeal.testimonial
        );
        alternatives.push(urgentAppeal);
      } catch (error) {
        logger.error('Error generating urgent alternative', { error });
      }
    }

    // Alternative 2: Different tone
    if (request.tone !== 'personal') {
      const personalRequest = { ...request, tone: 'personal' as const };
      try {
        const personalAppeal = await this.generateAppealContent(
          personalRequest,
          intelligence,
          primaryAppeal.suggestedAmount,
          primaryAppeal.alternativeAmounts,
          primaryAppeal.impactStory,
          primaryAppeal.testimonial
        );
        alternatives.push(personalAppeal);
      } catch (error) {
        logger.error('Error generating personal alternative', { error });
      }
    }

    return alternatives;
  }

  /**
   * Calculate confidence score for appeal
   */
  private calculateConfidence(
    intelligence: DonorIntelligence,
    appeal: PersonalizedAppeal
  ): number {
    let confidence = 0.7; // Base confidence

    // Higher confidence with more donor intelligence
    if (intelligence.capacityConfidence > 0.8) confidence += 0.1;
    if (intelligence.interests.length >= 3) confidence += 0.1;
    if (intelligence.engagementScore > 70) confidence += 0.1;

    return Math.min(confidence, 0.95);
  }
}

export default AppealGenerationService;
