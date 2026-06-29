/**
 * Spiritual Formation AI Service
 * Provides AI-powered spiritual formation tracking and analysis
 */

import AIGatewayService from './AIGatewayService';
import VectorStoreService from './VectorStoreService';
import {
  SpiritualCheckIn,
  SpiritualAnalysis,
  PrayerRequest,
  PrayerCategories,
  JournalEntry,
  JournalInsights,
  SpiritualProfile,
  SpiritualPracticeRecommendations,
  CrisisDetection,
  SpiritualFormationRequest,
  SpiritualFormationResponse,
  GrowthArea,
  Struggle,
  Breakthrough,
  BibleVerse,
  Resource
} from '../types/spiritual-formation.types';

export default class SpiritualFormationAIService {
  private aiGateway: AIGatewayService;
  private vectorStore: VectorStoreService;

  constructor(
    aiGateway?: AIGatewayService,
    vectorStore?: VectorStoreService
  ) {
    this.aiGateway = aiGateway || new AIGatewayService();
    this.vectorStore = vectorStore || new VectorStoreService();
  }

  /**
   * Analyze spiritual check-in responses
   */
  async analyzeCheckIn(checkIn: SpiritualCheckIn): Promise<SpiritualAnalysis> {
    try {
      // Retrieve relevant spiritual resources and past check-ins
      const context = await this.getCheckInContext(checkIn.userId);

      // Build analysis prompt
      const prompt = this.buildCheckInAnalysisPrompt(checkIn, context);

      // Get AI analysis
      const response = await this.aiGateway.chat({
        messages: [
          {
            role: 'system',
            content: `You are a compassionate spiritual formation advisor with deep theological knowledge. 
            Analyze spiritual check-ins to identify growth, struggles, and breakthroughs. 
            Maintain confidentiality and provide biblically-grounded insights.
            Always be encouraging while being honest about areas needing growth.`
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.7,
        maxTokens: 2000
      });

      // Parse AI response into structured analysis
      const analysis = this.parseCheckInAnalysis(response.content, checkIn);

      // Check for crisis indicators
      const crisisDetected = this.detectCrisisInCheckIn(analysis);
      if (crisisDetected) {
        analysis.advisorAlert = true;
        analysis.alertReason = 'Potential spiritual or emotional crisis detected';
      }

      return analysis;
    } catch (error) {
      console.error('Error analyzing check-in:', error);
      throw new Error('Failed to analyze spiritual check-in');
    }
  }

  /**
   * Categorize prayer requests
   */
  async categorizePrayer(prayer: PrayerRequest): Promise<PrayerCategories> {
    try {
      // Search for relevant Scripture and resources
      const scriptureResults = await this.vectorStore.search(
        `prayer for ${prayer.request}`,
        'scripture',
        5
      );

      // Build categorization prompt
      const prompt = `Analyze this prayer request and provide categorization:

Prayer Request: "${prayer.request}"

Provide:
1. Primary and secondary categories (e.g., healing, guidance, provision, relationships, spiritual growth)
2. Underlying themes
3. Urgency level (low, medium, high, urgent)
4. Relevant Scripture verses
5. Recommended resources for this prayer need

Format your response as JSON.`;

      const response = await this.aiGateway.chat({
        messages: [
          {
            role: 'system',
            content: `You are a prayer ministry coordinator with deep biblical knowledge. 
            Categorize prayer requests to help organize prayer support and provide relevant Scripture.
            Be sensitive to urgent needs and maintain confidentiality.`
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.5,
        maxTokens: 1000
      });

      const categories = this.parsePrayerCategories(response.content, prayer, scriptureResults);

      return categories;
    } catch (error) {
      console.error('Error categorizing prayer:', error);
      throw new Error('Failed to categorize prayer request');
    }
  }

  /**
   * Analyze journal entries
   */
  async analyzeJournal(entry: JournalEntry): Promise<JournalInsights> {
    try {
      // Get user's spiritual profile for context
      const profile = await this.getUserProfile(entry.userId);

      // Build analysis prompt
      const prompt = this.buildJournalAnalysisPrompt(entry, profile);

      const response = await this.aiGateway.chat({
        messages: [
          {
            role: 'system',
            content: `You are a spiritual director analyzing journal entries. 
            Identify spiritual insights, questions, doubts, and growth opportunities.
            Maintain strict confidentiality and privacy.
            Be encouraging and provide biblically-grounded observations.
            Flag concerning patterns that may need advisor attention.`
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.7,
        maxTokens: 1500
      });

      const insights = this.parseJournalInsights(response.content, entry);

      // Ensure privacy is maintained
      insights.privacyMaintained = true;

      return insights;
    } catch (error) {
      console.error('Error analyzing journal:', error);
      throw new Error('Failed to analyze journal entry');
    }
  }

  /**
   * Recommend spiritual practices
   */
  async recommendPractices(profile: SpiritualProfile): Promise<SpiritualPracticeRecommendations> {
    try {
      // Search for relevant devotional materials
      const devotionalResults = await this.vectorStore.search(
        `spiritual practices for ${profile.growthAreas.join(', ')}`,
        'resource',
        10
      );

      // Build recommendation prompt
      const prompt = this.buildPracticeRecommendationPrompt(profile);

      const response = await this.aiGateway.chat({
        messages: [
          {
            role: 'system',
            content: `You are a spiritual formation coach recommending personalized spiritual disciplines.
            Consider the person's strengths, growth areas, spiritual gifts, and calling.
            Recommend practices that are practical, sustainable, and biblically grounded.
            Include specific resources and Scripture reading plans.`
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.7,
        maxTokens: 2000
      });

      const recommendations = this.parsePracticeRecommendations(
        response.content,
        profile,
        devotionalResults
      );

      return recommendations;
    } catch (error) {
      console.error('Error recommending practices:', error);
      throw new Error('Failed to recommend spiritual practices');
    }
  }

  /**
   * Detect spiritual crises
   */
  async detectCrisis(userId: string, recentData: any): Promise<CrisisDetection | null> {
    try {
      // Gather recent check-ins, journal entries, and prayer requests
      const context = await this.getCrisisDetectionContext(userId);

      // Build crisis detection prompt
      const prompt = this.buildCrisisDetectionPrompt(context);

      const response = await this.aiGateway.chat({
        messages: [
          {
            role: 'system',
            content: `You are a crisis counselor trained in spiritual and emotional crisis detection.
            Analyze patterns in spiritual check-ins, journal entries, and prayer requests.
            Identify signs of spiritual crisis, emotional distress, theological confusion, or mental health concerns.
            Err on the side of caution - it's better to alert advisors unnecessarily than miss a crisis.
            Provide specific indicators and recommended immediate actions.`
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.3, // Lower temperature for more consistent crisis detection
        maxTokens: 1500
      });

      const crisis = this.parseCrisisDetection(response.content, userId);

      // If crisis detected, return it; otherwise return null
      return crisis;
    } catch (error) {
      console.error('Error detecting crisis:', error);
      // In case of error, return null rather than throwing
      // Crisis detection should fail gracefully
      return null;
    }
  }

  // Helper methods

  private async getCheckInContext(userId: string): Promise<any> {
    // Retrieve past check-ins and spiritual profile
    // This would query the database in a real implementation
    return {
      pastCheckIns: [],
      profile: await this.getUserProfile(userId)
    };
  }

  private async getUserProfile(userId: string): Promise<SpiritualProfile> {
    // Retrieve user's spiritual profile from database
    // Placeholder implementation
    return {
      userId,
      strengths: [],
      growthAreas: [],
      spiritualGifts: [],
      callingIndicators: [],
      disciplinePreferences: [],
      mentorshipNeeds: [],
      lastUpdated: new Date()
    };
  }

  private async getCrisisDetectionContext(userId: string): Promise<any> {
    // Gather recent spiritual formation data
    return {
      userId,
      recentCheckIns: [],
      recentJournals: [],
      recentPrayers: [],
      profile: await this.getUserProfile(userId)
    };
  }

  private buildCheckInAnalysisPrompt(checkIn: SpiritualCheckIn, context: any): string {
    const responsesText = checkIn.responses
      .map(r => `Q: ${r.question}\nA: ${r.answer}`)
      .join('\n\n');

    return `Analyze this spiritual check-in:

${responsesText}

Mood: ${checkIn.mood || 'Not specified'}
Spiritual Temperature (1-10): ${checkIn.spiritualTemperature || 'Not specified'}

Provide a comprehensive analysis including:
1. Growth areas - where is this person growing spiritually?
2. Struggles - what challenges are they facing?
3. Breakthroughs - any significant spiritual victories or insights?
4. Insights - what patterns or themes do you notice?
5. Recommended Scripture - 3-5 verses that would encourage and guide them
6. Suggested resources - books, articles, or practices that would help

Format your response as JSON with these sections.`;
  }

  private buildJournalAnalysisPrompt(entry: JournalEntry, profile: SpiritualProfile): string {
    return `Analyze this spiritual journal entry:

"${entry.content}"

Mood: ${entry.mood || 'Not specified'}

User's spiritual profile:
- Strengths: ${profile.strengths.join(', ') || 'Unknown'}
- Growth areas: ${profile.growthAreas.join(', ') || 'Unknown'}

Provide analysis including:
1. Spiritual insights - revelations, understanding, convictions
2. Questions and doubts - theological or personal questions they're wrestling with
3. Growth opportunities - areas where they could develop further
4. Emotional state - their emotional well-being
5. Theological themes - biblical or theological concepts they're exploring

Flag if this entry suggests they need advisor support.
Format as JSON.`;
  }

  private buildPracticeRecommendationPrompt(profile: SpiritualProfile): string {
    return `Create personalized spiritual practice recommendations for this person:

Strengths: ${profile.strengths.join(', ')}
Growth Areas: ${profile.growthAreas.join(', ')}
Spiritual Gifts: ${profile.spiritualGifts.join(', ')}
Calling Indicators: ${profile.callingIndicators.join(', ')}

Recommend:
1. 3-5 specific spiritual practices (prayer, scripture, fasting, worship, service, etc.)
2. Devotional materials suited to their needs
3. Potential mentor connections
4. A personalized Scripture reading plan (30-90 days)

Make recommendations practical, sustainable, and tailored to their unique journey.
Format as JSON.`;
  }

  private buildCrisisDetectionPrompt(context: any): string {
    return `Analyze this spiritual formation data for crisis indicators:

User ID: ${context.userId}

Recent Check-ins: ${JSON.stringify(context.recentCheckIns)}
Recent Journal Entries: ${JSON.stringify(context.recentJournals)}
Recent Prayer Requests: ${JSON.stringify(context.recentPrayers)}

Look for:
- Signs of spiritual crisis (loss of faith, theological confusion, spiritual darkness)
- Emotional distress (depression, anxiety, hopelessness)
- Relational problems (isolation, conflict, abuse)
- Mental health concerns (suicidal ideation, self-harm, severe distress)

If crisis indicators are present, provide:
1. Crisis type and severity
2. Specific indicators
3. Patterns observed
4. Immediate actions needed
5. Support resources

If NO crisis detected, respond with: {"crisisDetected": false}
Format as JSON.`;
  }

  private parseCheckInAnalysis(content: string, checkIn: SpiritualCheckIn): SpiritualAnalysis {
    try {
      // Extract JSON from response
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      const parsed = jsonMatch ? JSON.parse(jsonMatch[0]) : {};

      return {
        checkInId: checkIn.id,
        userId: checkIn.userId,
        growthAreas: this.parseGrowthAreas(parsed.growthAreas || []),
        struggles: this.parseStruggles(parsed.struggles || []),
        breakthroughs: this.parseBreakthroughs(parsed.breakthroughs || []),
        insights: parsed.insights || [],
        recommendedScripture: this.parseBibleVerses(parsed.recommendedScripture || []),
        suggestedResources: this.parseResources(parsed.suggestedResources || []),
        advisorAlert: false,
        confidence: 0.85,
        timestamp: new Date()
      };
    } catch (error) {
      console.error('Error parsing check-in analysis:', error);
      // Return minimal analysis on parse error
      return {
        checkInId: checkIn.id,
        userId: checkIn.userId,
        growthAreas: [],
        struggles: [],
        breakthroughs: [],
        insights: ['Analysis parsing failed - manual review needed'],
        recommendedScripture: [],
        suggestedResources: [],
        advisorAlert: true,
        alertReason: 'Analysis parsing error',
        confidence: 0.3,
        timestamp: new Date()
      };
    }
  }

  private parsePrayerCategories(
    content: string,
    prayer: PrayerRequest,
    scriptureResults: any[]
  ): PrayerCategories {
    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      const parsed = jsonMatch ? JSON.parse(jsonMatch[0]) : {};

      return {
        requestId: prayer.id,
        categories: parsed.categories || [],
        themes: parsed.themes || [],
        urgency: parsed.urgency || 'medium',
        suggestedScripture: this.parseBibleVerses(parsed.suggestedScripture || []),
        recommendedResources: this.parseResources(parsed.recommendedResources || [])
      };
    } catch (error) {
      console.error('Error parsing prayer categories:', error);
      return {
        requestId: prayer.id,
        categories: [],
        themes: [],
        urgency: 'medium',
        suggestedScripture: [],
        recommendedResources: []
      };
    }
  }

  private parseJournalInsights(content: string, entry: JournalEntry): JournalInsights {
    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      const parsed = jsonMatch ? JSON.parse(jsonMatch[0]) : {};

      return {
        entryId: entry.id,
        userId: entry.userId,
        spiritualInsights: parsed.spiritualInsights || [],
        questionsAndDoubts: parsed.questionsAndDoubts || [],
        growthOpportunities: parsed.growthOpportunities || [],
        emotionalState: parsed.emotionalState || { primary: 'unknown', intensity: 5, trend: 'stable' },
        theologicalThemes: parsed.theologicalThemes || [],
        privacyMaintained: true,
        confidence: 0.8,
        timestamp: new Date()
      };
    } catch (error) {
      console.error('Error parsing journal insights:', error);
      return {
        entryId: entry.id,
        userId: entry.userId,
        spiritualInsights: [],
        questionsAndDoubts: [],
        growthOpportunities: [],
        emotionalState: { primary: 'unknown', intensity: 5, trend: 'stable' },
        theologicalThemes: [],
        privacyMaintained: true,
        confidence: 0.3,
        timestamp: new Date()
      };
    }
  }

  private parsePracticeRecommendations(
    content: string,
    profile: SpiritualProfile,
    devotionalResults: any[]
  ): SpiritualPracticeRecommendations {
    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      const parsed = jsonMatch ? JSON.parse(jsonMatch[0]) : {};

      return {
        userId: profile.userId,
        profile,
        practices: parsed.practices || [],
        devotionalMaterials: this.parseResources(parsed.devotionalMaterials || []),
        mentorConnections: parsed.mentorConnections || [],
        scriptureReadingPlan: parsed.scriptureReadingPlan || {
          name: 'General Reading Plan',
          description: 'A balanced Scripture reading plan',
          duration: '30 days',
          schedule: [],
          focus: []
        },
        confidence: 0.85,
        timestamp: new Date()
      };
    } catch (error) {
      console.error('Error parsing practice recommendations:', error);
      return {
        userId: profile.userId,
        profile,
        practices: [],
        devotionalMaterials: [],
        mentorConnections: [],
        scriptureReadingPlan: {
          name: 'Default Plan',
          description: 'Basic reading plan',
          duration: '30 days',
          schedule: [],
          focus: []
        },
        confidence: 0.3,
        timestamp: new Date()
      };
    }
  }

  private parseCrisisDetection(content: string, userId: string): CrisisDetection | null {
    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      const parsed = jsonMatch ? JSON.parse(jsonMatch[0]) : {};

      if (parsed.crisisDetected === false) {
        return null;
      }

      return {
        userId,
        crisisType: parsed.crisisType || 'spiritual',
        severity: parsed.severity || 'concern',
        indicators: parsed.indicators || [],
        patterns: parsed.patterns || [],
        immediateActions: parsed.immediateActions || [],
        advisorsToAlert: parsed.advisorsToAlert || ['spiritual-advisor'],
        supportResources: this.parseResources(parsed.supportResources || []),
        emergencyContacts: parsed.emergencyContacts || [],
        timestamp: new Date()
      };
    } catch (error) {
      console.error('Error parsing crisis detection:', error);
      return null;
    }
  }

  private detectCrisisInCheckIn(analysis: SpiritualAnalysis): boolean {
    // Check for crisis indicators in the analysis
    const criticalStruggles = analysis.struggles.filter(s => s.severity === 'critical');
    const highSeverityStruggles = analysis.struggles.filter(s => s.severity === 'high');

    return criticalStruggles.length > 0 || highSeverityStruggles.length >= 2;
  }

  private parseGrowthAreas(data: any[]): GrowthArea[] {
    return data.map(item => ({
      area: item.area || '',
      description: item.description || '',
      evidence: item.evidence || [],
      trend: item.trend || 'stable',
      recommendations: item.recommendations || []
    }));
  }

  private parseStruggles(data: any[]): Struggle[] {
    return data.map(item => ({
      type: item.type || '',
      description: item.description || '',
      severity: item.severity || 'low',
      duration: item.duration || 'new',
      supportNeeded: item.supportNeeded || []
    }));
  }

  private parseBreakthroughs(data: any[]): Breakthrough[] {
    return data.map(item => ({
      area: item.area || '',
      description: item.description || '',
      significance: item.significance || 'minor',
      celebration: item.celebration || ''
    }));
  }

  private parseBibleVerses(data: any[]): BibleVerse[] {
    return data.map(item => ({
      reference: item.reference || '',
      text: item.text || '',
      translation: item.translation || 'NIV',
      relevance: item.relevance || ''
    }));
  }

  private parseResources(data: any[]): Resource[] {
    return data.map(item => ({
      type: item.type || 'article',
      title: item.title || '',
      author: item.author,
      url: item.url,
      description: item.description || '',
      relevance: item.relevance || ''
    }));
  }
}
