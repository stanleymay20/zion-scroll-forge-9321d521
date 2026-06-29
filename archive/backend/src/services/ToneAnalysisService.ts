/**
 * Tone Analysis Service
 * Analyzes message sentiment, detects hostile or divisive tone,
 * identifies constructive vs destructive criticism, and encourages positive dialogue
 */

import { 
  UserContent, 
  ToneAnalysis,
  ToneSentiment
} from '../types/moderation.types';
import { AIGatewayService } from './AIGatewayService';

export default class ToneAnalysisService {
  private aiGateway: AIGatewayService;

  constructor() {
    this.aiGateway = new AIGatewayService();
  }

  /**
   * Perform comprehensive tone analysis on content
   */
  async analyzeTone(content: UserContent): Promise<ToneAnalysis> {
    // Parallel analysis of different tone aspects
    const [
      sentiment,
      emotionalTone,
      constructivenessAnalysis,
      divisivenessCheck,
      hostilityCheck
    ] = await Promise.all([
      this.analyzeSentiment(content),
      this.analyzeEmotionalTone(content),
      this.analyzeConstructiveness(content),
      this.checkDivisiveness(content),
      this.checkHostility(content)
    ]);

    // Calculate scores
    const encouragementScore = this.calculateEncouragementScore(content, emotionalTone);
    const respectScore = this.calculateRespectScore(content, hostilityCheck);
    const clarityScore = this.calculateClarityScore(content);

    // Generate suggestions for improvement
    const suggestions = await this.generateToneSuggestions(
      content,
      sentiment,
      constructivenessAnalysis,
      divisivenessCheck,
      hostilityCheck
    );

    return {
      contentId: content.id,
      sentiment,
      emotionalTone,
      isConstructive: constructivenessAnalysis.isConstructive,
      isDivisive: divisivenessCheck.isDivisive,
      isHostile: hostilityCheck.isHostile,
      encouragementScore,
      respectScore,
      clarityScore,
      suggestions,
      confidence: this.calculateConfidence(sentiment, emotionalTone)
    };
  }

  /**
   * Analyze overall sentiment of the message
   */
  private async analyzeSentiment(content: UserContent): Promise<ToneSentiment> {
    const prompt = `Analyze the overall sentiment and tone of the following message:

Message: "${content.content}"

Classify the sentiment as one of:
- positive: Encouraging, supportive, uplifting
- neutral: Factual, informative, balanced
- negative: Critical, discouraging, pessimistic
- hostile: Aggressive, attacking, confrontational
- constructive: Critical but helpful and solution-oriented
- destructive: Critical in a harmful, unhelpful way

Return JSON:
{
  "sentiment": "one of the above categories",
  "explanation": "brief explanation of why"
}`;

    try {
      const response = await this.aiGateway.generateCompletion({
        model: 'gpt-4-turbo',
        messages: [
          { role: 'system', content: 'You are an expert in analyzing communication tone and sentiment.' },
          { role: 'user', content: prompt }
        ],
        maxTokens: 200,
        temperature: 0.3
      });

      const analysis = this.parseAIResponse(response.content);
      return analysis.sentiment as ToneSentiment || 'neutral';
    } catch (error) {
      console.error('Error analyzing sentiment:', error);
      return 'neutral';
    }
  }

  /**
   * Analyze emotional tone using emotion detection
   */
  private async analyzeEmotionalTone(content: UserContent): Promise<ToneAnalysis['emotionalTone']> {
    const prompt = `Analyze the emotional tone of the following message and rate the presence of each emotion on a scale of 0.0 to 1.0:

Message: "${content.content}"

Rate these emotions:
- anger: How much anger or frustration is expressed
- joy: How much happiness or positivity is expressed
- sadness: How much sadness or disappointment is expressed
- fear: How much fear or anxiety is expressed
- disgust: How much disgust or contempt is expressed

Return JSON:
{
  "anger": 0.0-1.0,
  "joy": 0.0-1.0,
  "sadness": 0.0-1.0,
  "fear": 0.0-1.0,
  "disgust": 0.0-1.0
}`;

    try {
      const response = await this.aiGateway.generateCompletion({
        model: 'gpt-4-turbo',
        messages: [
          { role: 'system', content: 'You are an expert in emotional intelligence and tone analysis.' },
          { role: 'user', content: prompt }
        ],
        maxTokens: 150,
        temperature: 0.2
      });

      const emotions = this.parseAIResponse(response.content);
      return {
        anger: emotions.anger || 0,
        joy: emotions.joy || 0,
        sadness: emotions.sadness || 0,
        fear: emotions.fear || 0,
        disgust: emotions.disgust || 0
      };
    } catch (error) {
      console.error('Error analyzing emotional tone:', error);
      return { anger: 0, joy: 0, sadness: 0, fear: 0, disgust: 0 };
    }
  }

  /**
   * Analyze if criticism is constructive or destructive
   */
  private async analyzeConstructiveness(content: UserContent): Promise<{
    isConstructive: boolean;
    explanation: string;
  }> {
    const prompt = `Analyze whether the following message contains constructive or destructive criticism:

Message: "${content.content}"

Constructive criticism:
- Offers specific, actionable feedback
- Focuses on behavior or ideas, not personal attacks
- Includes suggestions for improvement
- Maintains respectful tone
- Aims to help and build up

Destructive criticism:
- Vague or general attacks
- Personal insults or character attacks
- No suggestions for improvement
- Disrespectful or demeaning tone
- Aims to tear down or discourage

Return JSON:
{
  "isConstructive": true/false,
  "explanation": "brief explanation",
  "hasConstructiveElements": true/false,
  "hasDestructiveElements": true/false
}`;

    try {
      const response = await this.aiGateway.generateCompletion({
        model: 'gpt-4-turbo',
        messages: [
          { role: 'system', content: 'You are an expert in communication and feedback analysis.' },
          { role: 'user', content: prompt }
        ],
        maxTokens: 250,
        temperature: 0.3
      });

      const analysis = this.parseAIResponse(response.content);
      return {
        isConstructive: analysis.isConstructive || false,
        explanation: analysis.explanation || ''
      };
    } catch (error) {
      console.error('Error analyzing constructiveness:', error);
      return { isConstructive: true, explanation: '' };
    }
  }

  /**
   * Check if content is divisive
   */
  private async checkDivisiveness(content: UserContent): Promise<{
    isDivisive: boolean;
    reasons: string[];
  }> {
    const prompt = `Analyze whether the following message is divisive or promotes division within the community:

Message: "${content.content}"

Divisive content includes:
- Us vs. them mentality
- Inflammatory statements designed to provoke
- Attempts to create factions or sides
- Undermining community unity
- Promoting conflict between groups

Return JSON:
{
  "isDivisive": true/false,
  "reasons": ["reason 1", "reason 2"],
  "severity": "low/medium/high"
}`;

    try {
      const response = await this.aiGateway.generateCompletion({
        model: 'gpt-4-turbo',
        messages: [
          { role: 'system', content: 'You are an expert in community dynamics and conflict analysis.' },
          { role: 'user', content: prompt }
        ],
        maxTokens: 250,
        temperature: 0.3
      });

      const analysis = this.parseAIResponse(response.content);
      return {
        isDivisive: analysis.isDivisive || false,
        reasons: analysis.reasons || []
      };
    } catch (error) {
      console.error('Error checking divisiveness:', error);
      return { isDivisive: false, reasons: [] };
    }
  }

  /**
   * Check if content is hostile
   */
  private async checkHostility(content: UserContent): Promise<{
    isHostile: boolean;
    indicators: string[];
  }> {
    const prompt = `Analyze whether the following message has a hostile tone:

Message: "${content.content}"

Hostile indicators:
- Aggressive language
- Threatening statements
- Sarcasm or mockery
- Dismissive attitude
- Confrontational approach
- Lack of respect

Return JSON:
{
  "isHostile": true/false,
  "indicators": ["indicator 1", "indicator 2"],
  "hostilityLevel": "none/mild/moderate/severe"
}`;

    try {
      const response = await this.aiGateway.generateCompletion({
        model: 'gpt-4-turbo',
        messages: [
          { role: 'system', content: 'You are an expert in conflict resolution and hostile communication detection.' },
          { role: 'user', content: prompt }
        ],
        maxTokens: 250,
        temperature: 0.3
      });

      const analysis = this.parseAIResponse(response.content);
      return {
        isHostile: analysis.isHostile || false,
        indicators: analysis.indicators || []
      };
    } catch (error) {
      console.error('Error checking hostility:', error);
      return { isHostile: false, indicators: [] };
    }
  }

  /**
   * Calculate encouragement score (0-1)
   */
  private calculateEncouragementScore(
    content: UserContent,
    emotionalTone: ToneAnalysis['emotionalTone']
  ): number {
    // Base score on joy and lack of negative emotions
    const positiveScore = emotionalTone.joy;
    const negativeScore = (emotionalTone.anger + emotionalTone.sadness + emotionalTone.disgust) / 3;

    // Check for encouraging keywords
    const encouragingKeywords = [
      'great', 'excellent', 'wonderful', 'amazing', 'proud',
      'well done', 'keep going', 'you can', 'believe in',
      'support', 'encourage', 'inspire', 'hope', 'faith'
    ];

    const contentLower = content.content.toLowerCase();
    const keywordCount = encouragingKeywords.filter(keyword => 
      contentLower.includes(keyword)
    ).length;

    const keywordBonus = Math.min(keywordCount * 0.1, 0.3);

    const score = (positiveScore - negativeScore + keywordBonus);
    return Math.max(0, Math.min(1, score));
  }

  /**
   * Calculate respect score (0-1)
   */
  private calculateRespectScore(
    content: UserContent,
    hostilityCheck: { isHostile: boolean; indicators: string[] }
  ): number {
    if (hostilityCheck.isHostile) {
      return Math.max(0, 0.5 - (hostilityCheck.indicators.length * 0.1));
    }

    // Check for respectful language
    const respectfulKeywords = [
      'please', 'thank you', 'appreciate', 'respect',
      'understand', 'consider', 'perspective', 'agree to disagree'
    ];

    const contentLower = content.content.toLowerCase();
    const keywordCount = respectfulKeywords.filter(keyword => 
      contentLower.includes(keyword)
    ).length;

    return Math.min(1, 0.7 + (keywordCount * 0.1));
  }

  /**
   * Calculate clarity score (0-1)
   */
  private calculateClarityScore(content: UserContent): number {
    // Simple heuristics for clarity
    const text = content.content;
    const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);
    const words = text.split(/\s+/).filter(w => w.length > 0);

    if (sentences.length === 0 || words.length === 0) {
      return 0.5;
    }

    const avgWordsPerSentence = words.length / sentences.length;
    
    // Optimal: 15-20 words per sentence
    let clarityScore = 1.0;
    if (avgWordsPerSentence < 5) {
      clarityScore = 0.7; // Too choppy
    } else if (avgWordsPerSentence > 30) {
      clarityScore = 0.6; // Too complex
    } else if (avgWordsPerSentence > 25) {
      clarityScore = 0.8;
    }

    return clarityScore;
  }

  /**
   * Generate suggestions for improving tone
   */
  private async generateToneSuggestions(
    content: UserContent,
    sentiment: ToneSentiment,
    constructiveness: { isConstructive: boolean; explanation: string },
    divisiveness: { isDivisive: boolean; reasons: string[] },
    hostility: { isHostile: boolean; indicators: string[] }
  ): Promise<string[]> {
    const suggestions: string[] = [];

    // Generate suggestions based on issues found
    if (hostility.isHostile) {
      suggestions.push('Consider rephrasing in a more respectful and calm manner');
      suggestions.push('Focus on the issue rather than attacking the person');
    }

    if (divisiveness.isDivisive) {
      suggestions.push('Try to find common ground and promote unity');
      suggestions.push('Avoid "us vs. them" language that creates division');
    }

    if (!constructiveness.isConstructive && sentiment === 'negative') {
      suggestions.push('If offering criticism, include specific suggestions for improvement');
      suggestions.push('Balance critique with acknowledgment of positive aspects');
    }

    if (sentiment === 'negative' || sentiment === 'hostile') {
      suggestions.push('Consider starting with something positive or encouraging');
      suggestions.push('Use "I" statements to express your perspective without blame');
    }

    // If no issues, provide positive reinforcement
    if (suggestions.length === 0) {
      suggestions.push('Your tone is respectful and constructive - keep it up!');
    }

    return suggestions;
  }

  /**
   * Calculate confidence in tone analysis
   */
  private calculateConfidence(
    sentiment: ToneSentiment,
    emotionalTone: ToneAnalysis['emotionalTone']
  ): number {
    // Higher confidence when emotions are clear and strong
    const maxEmotion = Math.max(
      emotionalTone.anger,
      emotionalTone.joy,
      emotionalTone.sadness,
      emotionalTone.fear,
      emotionalTone.disgust
    );

    if (maxEmotion > 0.7) {
      return 0.90; // Strong clear emotion
    } else if (maxEmotion > 0.4) {
      return 0.80; // Moderate emotion
    } else {
      return 0.70; // Subtle or neutral tone
    }
  }

  /**
   * Parse AI response into structured format
   */
  private parseAIResponse(content: string): any {
    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
      return {};
    } catch (error) {
      console.error('Error parsing AI response:', error);
      return {};
    }
  }
}
