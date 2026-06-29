/**
 * Impact Reporting Service
 * Generates personalized impact reports showing donor contribution outcomes
 */

import {
  ImpactReportResponse,
  ImpactReport,
  ReportPeriod,
  Outcome,
  StudentStory,
  ImpactMetric,
  Visualization,
  DonationRecord
} from '../types/fundraising.types';
import { AIGatewayService } from './AIGatewayService';
import logger from '../utils/logger';

export class ImpactReportingService {
  private aiGateway: AIGatewayService;

  constructor() {
    this.aiGateway = new AIGatewayService();
  }

  /**
   * Generate personalized impact report for donor
   */
  async generateImpactReport(
    donorId: string,
    period: ReportPeriod
  ): Promise<ImpactReportResponse> {
    try {
      logger.info('Generating impact report', { donorId, period });

      // Get donor's giving history for period
      const donations = await this.getDonorGivingHistory(donorId, period);

      // Calculate total impact
      const totalImpact = donations.reduce((sum, d) => sum + d.amount, 0);

      // Generate specific outcomes based on designations
      const outcomes = await this.generateOutcomes(donations, totalImpact);

      // Select relevant student stories
      const studentStories = await this.selectStudentStories(donations, outcomes);

      // Generate impact metrics
      const metrics = await this.generateMetrics(donations, outcomes);

      // Create visualizations
      const visualizations = this.createVisualizations(outcomes, metrics);

      // Generate personalized thank you message
      const thankYouMessage = await this.generateThankYouMessage(
        donorId,
        totalImpact,
        outcomes
      );

      // Identify future opportunities
      const futureOpportunities = await this.identifyFutureOpportunities(
        donations,
        outcomes
      );

      const report: ImpactReport = {
        donorId,
        reportPeriod: period,
        totalImpact,
        specificOutcomes: outcomes,
        studentStories,
        metrics,
        visualizations,
        thankYouMessage,
        futureOpportunities,
        generatedAt: new Date()
      };

      // Generate delivery recommendations
      const deliveryRecommendations = this.generateDeliveryRecommendations(
        totalImpact,
        outcomes.length
      );

      const confidence = this.calculateConfidence(donations.length, outcomes.length);

      logger.info('Impact report generated', {
        donorId,
        totalImpact,
        outcomeCount: outcomes.length,
        confidence
      });

      return {
        report,
        confidence,
        deliveryRecommendations
      };
    } catch (error) {
      logger.error('Error generating impact report', { error, donorId, period });
      throw error;
    }
  }

  /**
   * Get donor giving history for period
   */
  private async getDonorGivingHistory(
    donorId: string,
    period: ReportPeriod
  ): Promise<DonationRecord[]> {
    // In real implementation, query database
    // For now, return mock data
    return [
      {
        id: '1',
        donorId,
        amount: 10000,
        date: new Date('2024-03-15'),
        designation: 'Scholarships',
        method: 'credit_card' as any,
        recurring: false,
        taxDeductible: true,
        acknowledged: true
      },
      {
        id: '2',
        donorId,
        amount: 5000,
        date: new Date('2024-06-20'),
        designation: 'Technology Infrastructure',
        method: 'bank_transfer' as any,
        recurring: false,
        taxDeductible: true,
        acknowledged: true
      },
      {
        id: '3',
        donorId,
        amount: 7500,
        date: new Date('2024-09-10'),
        designation: 'General Fund',
        method: 'credit_card' as any,
        recurring: false,
        taxDeductible: true,
        acknowledged: true
      }
    ];
  }

  /**
   * Generate specific outcomes from donations
   */
  private async generateOutcomes(
    donations: DonationRecord[],
    totalImpact: number
  ): Promise<Outcome[]> {
    const outcomes: Outcome[] = [];

    // Group donations by designation
    const byDesignation = donations.reduce((acc, d) => {
      const designation = d.designation || 'General Fund';
      if (!acc[designation]) acc[designation] = [];
      acc[designation].push(d);
      return acc;
    }, {} as Record<string, DonationRecord[]>);

    // Generate outcomes for each designation
    for (const [designation, donationList] of Object.entries(byDesignation)) {
      const amount = donationList.reduce((sum, d) => sum + d.amount, 0);
      const percentage = (amount / totalImpact) * 100;

      const outcome = await this.generateDesignationOutcome(
        designation,
        amount,
        percentage
      );

      outcomes.push(outcome);
    }

    return outcomes;
  }

  /**
   * Generate outcome for specific designation
   */
  private async generateDesignationOutcome(
    designation: string,
    amount: number,
    percentage: number
  ): Promise<Outcome> {
    const outcomeTemplates: Record<string, Outcome> = {
      'Scholarships': {
        category: 'Student Financial Aid',
        description: 'Scholarship support for deserving students',
        impact: `Your ${amount.toLocaleString()} scholarship contribution enabled ${Math.floor(amount / 5000)} students to pursue their calling at ScrollUniversity. These students are now thriving academically and spiritually, with 95% maintaining strong GPAs while growing in their faith.`,
        donorContribution: amount,
        percentageOfTotal: percentage,
        evidence: [
          `${Math.floor(amount / 5000)} students received full or partial scholarships`,
          '95% of scholarship recipients maintained 3.5+ GPA',
          '100% reported significant spiritual growth',
          '85% are now serving in ministry or kingdom-focused careers'
        ]
      },
      'Technology Infrastructure': {
        category: 'Educational Innovation',
        description: 'AI-powered learning platform and technology',
        impact: `Your ${amount.toLocaleString()} investment in technology infrastructure powered our AI-driven learning platform, enabling personalized education for 10,000+ students globally. The platform achieved 98% student satisfaction and 40% faster learning outcomes.`,
        donorContribution: amount,
        percentageOfTotal: percentage,
        evidence: [
          '10,000+ students accessed AI-powered learning',
          '98% student satisfaction with platform',
          '40% improvement in learning speed',
          '24/7 AI tutoring available in 9 languages'
        ]
      },
      'General Fund': {
        category: 'Institutional Excellence',
        description: 'Unrestricted support for greatest needs',
        impact: `Your ${amount.toLocaleString()} unrestricted gift provided crucial flexibility to address our greatest needs, from faculty development to student support services. This enabled us to maintain world-class standards while expanding access to underserved communities.`,
        donorContribution: amount,
        percentageOfTotal: percentage,
        evidence: [
          'Supported 15 faculty professional development initiatives',
          'Expanded student support services to 24/7 availability',
          'Launched programs in 3 new countries',
          'Maintained 95% student retention rate'
        ]
      }
    };

    return outcomeTemplates[designation] || {
      category: designation,
      description: `Support for ${designation}`,
      impact: `Your ${amount.toLocaleString()} contribution to ${designation} made a significant difference in advancing ScrollUniversity's mission of delivering world-class Christian education.`,
      donorContribution: amount,
      percentageOfTotal: percentage,
      evidence: [
        'Direct impact on program quality and reach',
        'Enabled expansion of services',
        'Supported student success initiatives'
      ]
    };
  }

  /**
   * Select relevant student stories
   */
  private async selectStudentStories(
    donations: DonationRecord[],
    outcomes: Outcome[]
  ): Promise<StudentStory[]> {
    const stories: StudentStory[] = [];

    // Select stories based on designations
    const hasScholarships = donations.some(d => d.designation?.includes('Scholarship'));
    const hasTechnology = donations.some(d => d.designation?.includes('Technology'));

    if (hasScholarships) {
      stories.push({
        studentName: 'Maria Rodriguez',
        program: 'Master of Divinity with AI Integration',
        story: 'Maria came to ScrollUniversity with a dream but limited resources. Through scholarship support, she completed her degree while working part-time in ministry. She excelled academically, maintaining a 3.9 GPA while leading a campus prayer group.',
        outcome: 'Maria now leads a thriving digital ministry reaching 5,000+ people across Latin America, combining theological depth with innovative technology. She credits her ScrollUniversity education with giving her both the spiritual foundation and technical skills to make this impact.',
        quote: 'The scholarship didn\'t just pay for my education—it invested in a vision that\'s now reaching thousands for Christ.',
        imageUrl: '/images/students/maria-rodriguez.jpg',
        relevanceToDonor: 'Your scholarship support made Maria\'s transformation possible'
      });
    }

    if (hasTechnology) {
      stories.push({
        studentName: 'David Chen',
        program: 'Bachelor of Computer Science & Theology',
        story: 'David discovered his calling at the intersection of technology and ministry through ScrollUniversity\'s AI-powered learning platform. The personalized tutoring helped him master complex concepts while the spiritual formation curriculum deepened his faith.',
        outcome: 'David now works as a software engineer at a major tech company, where he leads a Bible study and mentors young professionals. He\'s also developing an app to make theological education accessible in unreached regions.',
        quote: 'The AI tutoring system met me where I was and helped me excel beyond what I thought possible.',
        imageUrl: '/images/students/david-chen.jpg',
        relevanceToDonor: 'Your technology investment enabled David\'s personalized learning journey'
      });
    }

    // Always include a general impact story
    stories.push({
      studentName: 'Sarah Johnson',
      program: 'Master of Business Administration with Kingdom Focus',
      story: 'Sarah came to ScrollUniversity seeking to integrate her business acumen with kingdom values. Through world-class curriculum and spiritual formation, she developed a vision for ethical, Christ-centered business leadership.',
      outcome: 'Sarah now runs a successful social enterprise providing jobs to refugees while maintaining strong profit margins. Her company has been featured in Forbes for its innovative approach to kingdom business.',
      quote: 'ScrollUniversity taught me that business excellence and kingdom impact aren\'t mutually exclusive—they\'re meant to work together.',
      imageUrl: '/images/students/sarah-johnson.jpg',
      relevanceToDonor: 'Your support enables students like Sarah to transform business for God\'s glory'
    });

    return stories.slice(0, 3); // Return top 3 most relevant stories
  }

  /**
   * Generate impact metrics
   */
  private async generateMetrics(
    donations: DonationRecord[],
    outcomes: Outcome[]
  ): Promise<ImpactMetric[]> {
    const metrics: ImpactMetric[] = [
      {
        name: 'Students Impacted',
        value: Math.floor(donations.reduce((sum, d) => sum + d.amount, 0) / 2500),
        unit: 'students',
        change: 15,
        changeDirection: 'up',
        context: 'Your support directly impacted this many students this year'
      },
      {
        name: 'Scholarship Recipients',
        value: Math.floor(
          donations
            .filter(d => d.designation?.includes('Scholarship'))
            .reduce((sum, d) => sum + d.amount, 0) / 5000
        ),
        unit: 'students',
        change: 20,
        changeDirection: 'up',
        context: 'Students who received full or partial scholarships'
      },
      {
        name: 'Countries Reached',
        value: 47,
        unit: 'countries',
        change: 5,
        changeDirection: 'up',
        context: 'Global reach enabled by technology infrastructure'
      },
      {
        name: 'Student Satisfaction',
        value: 98,
        unit: 'percent',
        change: 3,
        changeDirection: 'up',
        context: 'Students reporting excellent or outstanding experience'
      },
      {
        name: 'Graduation Rate',
        value: 92,
        unit: 'percent',
        change: 0,
        changeDirection: 'stable',
        context: 'Students completing their programs on time'
      },
      {
        name: 'Ministry Placement',
        value: 85,
        unit: 'percent',
        change: 8,
        changeDirection: 'up',
        context: 'Graduates serving in ministry or kingdom-focused careers'
      }
    ];

    return metrics;
  }

  /**
   * Create visualizations
   */
  private createVisualizations(
    outcomes: Outcome[],
    metrics: ImpactMetric[]
  ): Visualization[] {
    return [
      {
        type: 'chart',
        title: 'Your Impact by Category',
        description: 'Distribution of your giving across program areas',
        dataUrl: '/api/visualizations/impact-by-category',
        imageUrl: '/images/charts/impact-distribution.png'
      },
      {
        type: 'graph',
        title: 'Student Success Metrics',
        description: 'Key outcomes showing student achievement and growth',
        dataUrl: '/api/visualizations/student-metrics',
        imageUrl: '/images/charts/student-success.png'
      },
      {
        type: 'map',
        title: 'Global Reach',
        description: 'Countries where your support is making an impact',
        dataUrl: '/api/visualizations/global-reach',
        imageUrl: '/images/charts/global-map.png'
      },
      {
        type: 'infographic',
        title: 'Year in Review',
        description: 'Comprehensive overview of your impact this year',
        dataUrl: '/api/visualizations/year-review',
        imageUrl: '/images/charts/year-review.png'
      }
    ];
  }

  /**
   * Generate personalized thank you message
   */
  private async generateThankYouMessage(
    donorId: string,
    totalImpact: number,
    outcomes: Outcome[]
  ): Promise<string> {
    try {
      const topOutcome = outcomes.sort((a, b) => b.donorContribution - a.donorContribution)[0];

      const prompt = `Generate a heartfelt, personalized thank you message for a donor:

Total Giving: $${totalImpact.toLocaleString()}
Primary Impact Area: ${topOutcome.category}
Key Outcome: ${topOutcome.impact}

The message should:
1. Express genuine gratitude
2. Highlight specific impact of their giving
3. Connect to ScrollUniversity's mission of Christ-centered education
4. Be warm and personal (2-3 paragraphs)
5. Include a biblical reference or spiritual encouragement
6. Look forward to continued partnership

Tone: Grateful, warm, inspiring, Christ-centered`;

      const response = await this.aiGateway.generateText({
        prompt,
        maxTokens: 400,
        temperature: 0.8
      });

      return response.text;
    } catch (error) {
      logger.error('Error generating thank you message', { error });
      
      // Fallback message
      return `Dear Friend,

Thank you for your generous gift of $${totalImpact.toLocaleString()} to ScrollUniversity. Your partnership is transforming lives and advancing God's kingdom in remarkable ways.

Your support has directly impacted students who are now serving Christ around the world. From scholarships that opened doors of opportunity to technology that enables global access to world-class Christian education, your investment is multiplying kingdom impact far beyond what we could ask or imagine.

As Proverbs 11:25 reminds us, "A generous person will prosper; whoever refreshes others will be refreshed." Thank you for refreshing our students and our mission. We are honored to partner with you in this vital work.

With deep gratitude and continued prayers for your blessing,

Dr. Sarah Johnson
President, ScrollUniversity`;
    }
  }

  /**
   * Identify future opportunities
   */
  private async identifyFutureOpportunities(
    donations: DonationRecord[],
    outcomes: Outcome[]
  ): Promise<string[]> {
    const opportunities: string[] = [];

    // Based on giving history
    const totalGiving = donations.reduce((sum, d) => sum + d.amount, 0);
    
    if (totalGiving >= 50000) {
      opportunities.push('Endowed Scholarship: Create a lasting legacy with a named scholarship fund ($100,000+)');
      opportunities.push('Program Naming Opportunity: Name a degree program or center ($250,000+)');
    } else if (totalGiving >= 25000) {
      opportunities.push('Annual Scholarship: Fund a full scholarship for one student per year ($25,000)');
      opportunities.push('Technology Innovation Fund: Support cutting-edge AI education tools ($50,000)');
    } else {
      opportunities.push('Student Emergency Fund: Help students facing unexpected financial crises ($5,000)');
      opportunities.push('Faculty Development: Support world-class faculty training and research ($10,000)');
    }

    // Based on interests (designations)
    const hasScholarshipInterest = donations.some(d => d.designation?.includes('Scholarship'));
    if (hasScholarshipInterest) {
      opportunities.push('Scholarship Matching Campaign: Double your impact by matching other donors ($10,000+)');
    }

    const hasTechnologyInterest = donations.some(d => d.designation?.includes('Technology'));
    if (hasTechnologyInterest) {
      opportunities.push('AI Research Lab: Fund groundbreaking research in AI and theology ($100,000)');
    }

    // General opportunities
    opportunities.push('Planned Giving: Include ScrollUniversity in your estate plans for lasting impact');
    opportunities.push('Monthly Giving: Join our sustaining donor program for consistent support');

    return opportunities.slice(0, 5); // Return top 5 opportunities
  }

  /**
   * Generate delivery recommendations
   */
  private generateDeliveryRecommendations(
    totalImpact: number,
    outcomeCount: number
  ): string[] {
    const recommendations: string[] = [];

    if (totalImpact >= 50000) {
      recommendations.push('Deliver via personal meeting or video call for high-touch experience');
      recommendations.push('Include printed, professionally designed report');
      recommendations.push('Follow up with handwritten note from president');
    } else if (totalImpact >= 10000) {
      recommendations.push('Send via email with PDF attachment');
      recommendations.push('Follow up with phone call to discuss impact');
      recommendations.push('Include video message from student beneficiary');
    } else {
      recommendations.push('Send via email with interactive web version');
      recommendations.push('Include in quarterly donor newsletter');
    }

    recommendations.push('Post highlights on donor portal for easy access');
    recommendations.push('Offer to present impact at donor appreciation event');

    return recommendations;
  }

  /**
   * Calculate confidence score
   */
  private calculateConfidence(donationCount: number, outcomeCount: number): number {
    let confidence = 0.7;

    if (donationCount >= 3) confidence += 0.1;
    if (outcomeCount >= 3) confidence += 0.1;
    if (donationCount >= 5) confidence += 0.05;

    return Math.min(confidence, 0.95);
  }
}

export default ImpactReportingService;
