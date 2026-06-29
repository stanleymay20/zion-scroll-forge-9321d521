/**
 * Content Scanning Service
 * Scans user-generated content for policy violations, inappropriate language,
 * bullying, harassment, and other community guideline violations
 */

import { 
  UserContent, 
  Violation, 
  ViolationType, 
  ViolationSeverity,
  CommunityGuideline 
} from '../types/moderation.types';
import { AIGatewayService } from './AIGatewayService';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export default class ContentScanningService {
  private aiGateway: AIGatewayService;

  constructor() {
    this.aiGateway = new AIGatewayService();
  }

  /**
   * Scan content for all types of violations
   */
  async scanContent(content: UserContent): Promise<Violation[]> {
    const violations: Violation[] = [];

    // Load community guidelines
    const guidelines = await this.loadCommunityGuidelines();

    // Parallel scanning for different violation types
    const [
      languageViolations,
      bullyingViolations,
      harassmentViolations,
      policyViolations,
      urgentIssues
    ] = await Promise.all([
      this.detectInappropriateLanguage(content),
      this.detectBullying(content),
      this.detectHarassment(content),
      this.checkPolicyViolations(content, guidelines),
      this.flagUrgentIssues(content)
    ]);

    violations.push(
      ...languageViolations,
      ...bullyingViolations,
      ...harassmentViolations,
      ...policyViolations,
      ...urgentIssues
    );

    // Categorize severity for each violation
    const categorizedViolations = violations.map(v => 
      this.categorizeSeverity(v, content)
    );

    return categorizedViolations;
  }

  /**
   * Detect inappropriate language including profanity, vulgarity, and offensive content
   */
  private async detectInappropriateLanguage(content: UserContent): Promise<Violation[]> {
    const violations: Violation[] = [];

    const prompt = `Analyze the following content for inappropriate language including profanity, vulgarity, sexually explicit content, or offensive language.

Content: "${content.content}"

Identify any inappropriate language and provide:
1. The specific words or phrases that are inappropriate
2. Why they are inappropriate
3. The severity (low, medium, high, critical)

Return a JSON array of violations in this format:
[
  {
    "text": "inappropriate phrase",
    "reason": "explanation",
    "severity": "high",
    "startIndex": 0,
    "endIndex": 10
  }
]

If no inappropriate language is found, return an empty array.`;

    try {
      const response = await this.aiGateway.generateCompletion({
        model: 'gpt-4-turbo',
        messages: [
          { role: 'system', content: 'You are a content moderation expert for a Christian educational platform. Be thorough but fair in identifying inappropriate language.' },
          { role: 'user', content: prompt }
        ],
        maxTokens: 500,
        temperature: 0.3
      });

      const detections = this.parseAIResponse(response.content);

      for (const detection of detections) {
        violations.push({
          type: 'inappropriate_language',
          severity: detection.severity as ViolationSeverity,
          description: `Inappropriate language detected: ${detection.reason}`,
          evidence: [detection.text],
          confidence: response.confidence || 0.85,
          flaggedSections: [{
            text: detection.text,
            startIndex: detection.startIndex,
            endIndex: detection.endIndex,
            reason: detection.reason
          }]
        });
      }
    } catch (error) {
      console.error('Error detecting inappropriate language:', error);
    }

    return violations;
  }

  /**
   * Detect bullying behavior in content
   */
  private async detectBullying(content: UserContent): Promise<Violation[]> {
    const violations: Violation[] = [];

    const prompt = `Analyze the following content for bullying behavior including:
- Personal attacks or insults
- Mocking or ridiculing others
- Intimidation or threats
- Exclusionary behavior
- Repeated negative targeting

Content: "${content.content}"

Identify any bullying behavior and provide:
1. The specific text that constitutes bullying
2. Why it is considered bullying
3. The severity (low, medium, high, critical)

Return a JSON array of violations. If no bullying is found, return an empty array.`;

    try {
      const response = await this.aiGateway.generateCompletion({
        model: 'gpt-4-turbo',
        messages: [
          { role: 'system', content: 'You are a content moderation expert specializing in identifying bullying behavior. Consider context and intent.' },
          { role: 'user', content: prompt }
        ],
        maxTokens: 500,
        temperature: 0.3
      });

      const detections = this.parseAIResponse(response.content);

      for (const detection of detections) {
        violations.push({
          type: 'bullying',
          severity: detection.severity as ViolationSeverity,
          description: `Bullying behavior detected: ${detection.reason}`,
          evidence: [detection.text],
          confidence: response.confidence || 0.80,
          flaggedSections: [{
            text: detection.text,
            startIndex: detection.startIndex || 0,
            endIndex: detection.endIndex || detection.text.length,
            reason: detection.reason
          }]
        });
      }
    } catch (error) {
      console.error('Error detecting bullying:', error);
    }

    return violations;
  }

  /**
   * Detect harassment in content
   */
  private async detectHarassment(content: UserContent): Promise<Violation[]> {
    const violations: Violation[] = [];

    const prompt = `Analyze the following content for harassment including:
- Unwanted sexual advances or comments
- Discriminatory remarks based on race, gender, religion, etc.
- Persistent unwanted contact or attention
- Threats or intimidation
- Hate speech

Content: "${content.content}"

Identify any harassment and provide:
1. The specific text that constitutes harassment
2. The type of harassment
3. The severity (low, medium, high, critical)

Return a JSON array of violations. If no harassment is found, return an empty array.`;

    try {
      const response = await this.aiGateway.generateCompletion({
        model: 'gpt-4-turbo',
        messages: [
          { role: 'system', content: 'You are a content moderation expert specializing in identifying harassment. Be sensitive to context and cultural differences.' },
          { role: 'user', content: prompt }
        ],
        maxTokens: 500,
        temperature: 0.3
      });

      const detections = this.parseAIResponse(response.content);

      for (const detection of detections) {
        const violationType: ViolationType = 
          detection.reason.toLowerCase().includes('hate') ? 'hate_speech' : 'harassment';

        violations.push({
          type: violationType,
          severity: detection.severity as ViolationSeverity,
          description: `Harassment detected: ${detection.reason}`,
          evidence: [detection.text],
          confidence: response.confidence || 0.82,
          flaggedSections: [{
            text: detection.text,
            startIndex: detection.startIndex || 0,
            endIndex: detection.endIndex || detection.text.length,
            reason: detection.reason
          }]
        });
      }
    } catch (error) {
      console.error('Error detecting harassment:', error);
    }

    return violations;
  }

  /**
   * Check content against community policy guidelines
   */
  private async checkPolicyViolations(
    content: UserContent, 
    guidelines: CommunityGuideline[]
  ): Promise<Violation[]> {
    const violations: Violation[] = [];

    const guidelinesText = guidelines
      .map(g => `- ${g.category}: ${g.guideline}`)
      .join('\n');

    const prompt = `Check if the following content violates any of our community guidelines:

Community Guidelines:
${guidelinesText}

Content: "${content.content}"

Identify any policy violations and provide:
1. Which guideline was violated
2. How it was violated
3. The severity (low, medium, high, critical)

Return a JSON array of violations. If no violations are found, return an empty array.`;

    try {
      const response = await this.aiGateway.generateCompletion({
        model: 'gpt-4-turbo',
        messages: [
          { role: 'system', content: 'You are a content moderation expert for a Christian educational platform. Apply guidelines fairly and consistently.' },
          { role: 'user', content: prompt }
        ],
        maxTokens: 500,
        temperature: 0.3
      });

      const detections = this.parseAIResponse(response.content);

      for (const detection of detections) {
        violations.push({
          type: 'policy_violation',
          severity: detection.severity as ViolationSeverity,
          description: `Policy violation: ${detection.reason}`,
          evidence: [detection.text || content.content],
          confidence: response.confidence || 0.78,
          flaggedSections: detection.text ? [{
            text: detection.text,
            startIndex: detection.startIndex || 0,
            endIndex: detection.endIndex || detection.text.length,
            reason: detection.reason
          }] : undefined
        });
      }
    } catch (error) {
      console.error('Error checking policy violations:', error);
    }

    return violations;
  }

  /**
   * Flag urgent issues that require immediate attention
   */
  private async flagUrgentIssues(content: UserContent): Promise<Violation[]> {
    const violations: Violation[] = [];

    const urgentKeywords = [
      'suicide', 'kill myself', 'end my life', 'self-harm',
      'hurt myself', 'want to die', 'bomb', 'weapon',
      'attack', 'violence', 'threat', 'harm others'
    ];

    const contentLower = content.content.toLowerCase();
    const hasUrgentKeyword = urgentKeywords.some(keyword => 
      contentLower.includes(keyword)
    );

    if (hasUrgentKeyword) {
      const prompt = `Analyze the following content for urgent safety concerns including:
- Threats of self-harm or suicide
- Threats of violence against others
- Plans for harmful activities
- Crisis situations requiring immediate intervention

Content: "${content.content}"

Determine if this is a genuine urgent issue or a false positive (e.g., academic discussion, metaphorical language).

Return JSON:
{
  "isUrgent": true/false,
  "reason": "explanation",
  "severity": "critical/high",
  "recommendedAction": "immediate action needed"
}`;

      try {
        const response = await this.aiGateway.generateCompletion({
          model: 'gpt-4-turbo',
          messages: [
            { role: 'system', content: 'You are a crisis assessment expert. Err on the side of caution for safety concerns.' },
            { role: 'user', content: prompt }
          ],
          maxTokens: 300,
          temperature: 0.2
        });

        const analysis = this.parseAIResponse(response.content);

        if (analysis.isUrgent) {
          violations.push({
            type: 'policy_violation',
            severity: 'critical',
            description: `URGENT: ${analysis.reason}`,
            evidence: [content.content],
            confidence: response.confidence || 0.90,
            flaggedSections: [{
              text: content.content,
              startIndex: 0,
              endIndex: content.content.length,
              reason: analysis.reason
            }]
          });
        }
      } catch (error) {
        console.error('Error flagging urgent issues:', error);
        // Err on the side of caution - flag for human review
        violations.push({
          type: 'policy_violation',
          severity: 'critical',
          description: 'Potential urgent issue detected - requires immediate human review',
          evidence: [content.content],
          confidence: 0.60
        });
      }
    }

    return violations;
  }

  /**
   * Categorize the severity of a violation based on context
   */
  private categorizeSeverity(violation: Violation, content: UserContent): Violation {
    // Adjust severity based on context
    if (violation.severity === 'critical') {
      return violation; // Critical stays critical
    }

    // Check for repeat offenses (would need user history)
    // Check for context that might mitigate or escalate severity

    return violation;
  }

  /**
   * Load active community guidelines from database
   */
  private async loadCommunityGuidelines(): Promise<CommunityGuideline[]> {
    try {
      const guidelines = await prisma.$queryRaw<any[]>`
        SELECT id, category, guideline, examples, violation_type, severity
        FROM community_guidelines
        WHERE active = true
      `;

      return guidelines.map(g => ({
        id: g.id,
        category: g.category,
        guideline: g.guideline,
        examples: g.examples,
        violationType: g.violation_type,
        severity: g.severity
      }));
    } catch (error) {
      console.error('Error loading community guidelines:', error);
      return [];
    }
  }

  /**
   * Parse AI response into structured format
   */
  private parseAIResponse(content: string): any {
    try {
      // Try to extract JSON from the response
      const jsonMatch = content.match(/\[[\s\S]*\]|\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        return Array.isArray(parsed) ? parsed : [parsed];
      }
      return [];
    } catch (error) {
      console.error('Error parsing AI response:', error);
      return [];
    }
  }
}
