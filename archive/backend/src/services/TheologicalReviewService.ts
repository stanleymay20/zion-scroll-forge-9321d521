/**
 * Theological Review Service
 * Detects doctrinal errors and concerning theological statements
 * Checks content against Statement of Faith
 */

import { 
  UserContent, 
  TheologicalReview,
  StatementOfFaith,
  ViolationSeverity
} from '../types/moderation.types';
import { AIGatewayService } from './AIGatewayService';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export default class TheologicalReviewService {
  private aiGateway: AIGatewayService;

  constructor() {
    this.aiGateway = new AIGatewayService();
  }

  /**
   * Review content for theological accuracy and doctrinal alignment
   */
  async reviewTheology(content: UserContent): Promise<TheologicalReview> {
    // Load Statement of Faith
    const statementOfFaith = await this.loadStatementOfFaith();

    // Detect doctrinal errors
    const concerns = await this.detectDoctrinalErrors(content, statementOfFaith);

    // Calculate overall alignment score
    const overallAlignment = this.calculateAlignmentScore(concerns);

    // Determine if advisor review is needed
    const requiresAdvisorReview = this.requiresAdvisorReview(concerns, overallAlignment);

    // Generate suggested corrections
    const suggestedCorrections = await this.generateCorrections(content, concerns);

    return {
      contentId: content.id,
      hasDoctrinalError: concerns.length > 0,
      concerns,
      overallAlignment,
      requiresAdvisorReview,
      suggestedCorrections,
      confidence: this.calculateConfidence(concerns)
    };
  }

  /**
   * Detect doctrinal errors in content
   */
  private async detectDoctrinalErrors(
    content: UserContent,
    statementOfFaith: StatementOfFaith[]
  ): Promise<TheologicalReview['concerns']> {
    const concerns: TheologicalReview['concerns'] = [];

    const faithStatements = statementOfFaith
      .map(s => `${s.section}: ${s.statement}`)
      .join('\n\n');

    const prompt = `You are a theological expert for a Christian educational institution. Review the following content for doctrinal accuracy and alignment with our Statement of Faith.

Statement of Faith:
${faithStatements}

Content to Review: "${content.content}"

Identify any theological concerns including:
1. Statements that contradict our Statement of Faith
2. Heretical or unorthodox teachings
3. Misrepresentations of biblical doctrine
4. Concerning theological claims that need clarification

For each concern, provide:
- The specific statement from the content
- The theological issue
- The severity (low, medium, high, critical)
- Relevant Scripture references if applicable
- Which section of our Statement of Faith it relates to

Return a JSON array of concerns:
[
  {
    "statement": "the concerning statement",
    "issue": "explanation of the theological problem",
    "severity": "medium",
    "scriptureReference": "John 3:16",
    "statementOfFaithReference": "Salvation"
  }
]

If no theological concerns are found, return an empty array.

Important: Be discerning but gracious. Not every theological discussion or question is a doctrinal error. Focus on clear contradictions or harmful teachings.`;

    try {
      const response = await this.aiGateway.generateCompletion({
        model: 'gpt-4-turbo',
        messages: [
          { role: 'system', content: 'You are a theological expert with deep knowledge of Christian doctrine. Be thorough but fair in your assessment.' },
          { role: 'user', content: prompt }
        ],
        maxTokens: 800,
        temperature: 0.2
      });

      const detections = this.parseAIResponse(response.content);

      for (const detection of detections) {
        concerns.push({
          statement: detection.statement,
          issue: detection.issue,
          severity: detection.severity as ViolationSeverity,
          scriptureReference: detection.scriptureReference,
          statementOfFaithReference: detection.statementOfFaithReference
        });
      }
    } catch (error) {
      console.error('Error detecting doctrinal errors:', error);
    }

    return concerns;
  }

  /**
   * Check for specific heretical teachings
   */
  private async checkForHeresy(content: UserContent): Promise<TheologicalReview['concerns']> {
    const concerns: TheologicalReview['concerns'] = [];

    const hereticalTeachings = [
      'Denial of the Trinity',
      'Denial of Christ\'s divinity',
      'Denial of Christ\'s humanity',
      'Salvation by works alone',
      'Denial of biblical authority',
      'Universalism (all paths lead to God)',
      'Prosperity gospel (health and wealth guaranteed)',
      'Gnosticism (secret knowledge for salvation)'
    ];

    const prompt = `Analyze the following content for heretical teachings or serious doctrinal errors.

Known heresies to check for:
${hereticalTeachings.map(h => `- ${h}`).join('\n')}

Content: "${content.content}"

Determine if the content promotes any heretical teachings. Be careful to distinguish between:
- Genuine heresy vs. theological questions or discussions
- Clear false teaching vs. imprecise language
- Intentional heresy vs. misunderstanding

Return JSON:
{
  "hasHeresy": true/false,
  "heresies": [
    {
      "type": "name of heresy",
      "statement": "the problematic statement",
      "explanation": "why this is heretical",
      "severity": "critical"
    }
  ]
}`;

    try {
      const response = await this.aiGateway.generateCompletion({
        model: 'gpt-4-turbo',
        messages: [
          { role: 'system', content: 'You are a theological expert specializing in identifying heretical teachings. Be precise and fair.' },
          { role: 'user', content: prompt }
        ],
        maxTokens: 600,
        temperature: 0.2
      });

      const analysis = this.parseAIResponse(response.content);

      if (analysis.hasHeresy && analysis.heresies) {
        for (const heresy of analysis.heresies) {
          concerns.push({
            statement: heresy.statement,
            issue: `Heretical teaching detected: ${heresy.type}. ${heresy.explanation}`,
            severity: 'critical',
            statementOfFaithReference: this.mapHeresyToFaith(heresy.type)
          });
        }
      }
    } catch (error) {
      console.error('Error checking for heresy:', error);
    }

    return concerns;
  }

  /**
   * Flag concerning theological statements that need spiritual advisor review
   */
  private async flagConcerningStatements(content: UserContent): Promise<TheologicalReview['concerns']> {
    const concerns: TheologicalReview['concerns'] = [];

    const prompt = `Review the following content for theological statements that, while not necessarily heretical, are concerning and should be reviewed by a spiritual advisor.

Look for:
- Unusual or unorthodox interpretations of Scripture
- Statements that could lead others astray
- Confusion about core doctrines
- Syncretism (mixing Christianity with other religions)
- Extreme or unbalanced theological positions

Content: "${content.content}"

Return a JSON array of concerning statements that warrant spiritual advisor review.`;

    try {
      const response = await this.aiGateway.generateCompletion({
        model: 'gpt-4-turbo',
        messages: [
          { role: 'system', content: 'You are a discerning theological reviewer. Flag statements that need human expert review.' },
          { role: 'user', content: prompt }
        ],
        maxTokens: 500,
        temperature: 0.3
      });

      const detections = this.parseAIResponse(response.content);

      for (const detection of detections) {
        concerns.push({
          statement: detection.statement,
          issue: detection.issue,
          severity: detection.severity || 'medium'
        });
      }
    } catch (error) {
      console.error('Error flagging concerning statements:', error);
    }

    return concerns;
  }

  /**
   * Calculate overall theological alignment score (0-1)
   */
  private calculateAlignmentScore(concerns: TheologicalReview['concerns']): number {
    if (concerns.length === 0) {
      return 1.0; // Perfect alignment
    }

    // Weight concerns by severity
    const severityWeights = {
      low: 0.05,
      medium: 0.15,
      high: 0.30,
      critical: 0.50
    };

    let totalDeduction = 0;
    for (const concern of concerns) {
      totalDeduction += severityWeights[concern.severity];
    }

    // Cap at 0 (worst alignment)
    const alignmentScore = Math.max(0, 1.0 - totalDeduction);

    return Math.round(alignmentScore * 10000) / 10000; // Round to 4 decimal places
  }

  /**
   * Determine if spiritual advisor review is required
   */
  private requiresAdvisorReview(
    concerns: TheologicalReview['concerns'],
    alignmentScore: number
  ): boolean {
    // Require review if:
    // 1. Any critical severity concerns
    // 2. Multiple high severity concerns
    // 3. Alignment score below 0.70

    const hasCritical = concerns.some(c => c.severity === 'critical');
    const highSeverityCount = concerns.filter(c => c.severity === 'high').length;

    return hasCritical || highSeverityCount >= 2 || alignmentScore < 0.70;
  }

  /**
   * Generate suggested corrections for theological errors
   */
  private async generateCorrections(
    content: UserContent,
    concerns: TheologicalReview['concerns']
  ): Promise<string[]> {
    if (concerns.length === 0) {
      return [];
    }

    const concernsSummary = concerns
      .map(c => `- ${c.statement}: ${c.issue}`)
      .join('\n');

    const prompt = `Given the following theological concerns in a user's content, suggest gracious and educational corrections.

Concerns:
${concernsSummary}

Original Content: "${content.content}"

Provide 2-3 suggested corrections that:
1. Address the theological error
2. Provide the correct biblical teaching
3. Include relevant Scripture references
4. Are gracious and educational in tone

Return a JSON array of correction suggestions as strings.`;

    try {
      const response = await this.aiGateway.generateCompletion({
        model: 'gpt-4-turbo',
        messages: [
          { role: 'system', content: 'You are a gracious theological educator. Provide corrections that teach truth with love.' },
          { role: 'user', content: prompt }
        ],
        maxTokens: 600,
        temperature: 0.4
      });

      const corrections = this.parseAIResponse(response.content);
      return Array.isArray(corrections) ? corrections : [];
    } catch (error) {
      console.error('Error generating corrections:', error);
      return [];
    }
  }

  /**
   * Calculate confidence score for theological review
   */
  private calculateConfidence(concerns: TheologicalReview['concerns']): number {
    // Higher confidence when concerns are clear and severe
    // Lower confidence when concerns are subtle or ambiguous

    if (concerns.length === 0) {
      return 0.95; // High confidence in no issues
    }

    const hasCritical = concerns.some(c => c.severity === 'critical');
    if (hasCritical) {
      return 0.90; // High confidence in critical issues
    }

    const hasHigh = concerns.some(c => c.severity === 'high');
    if (hasHigh) {
      return 0.85;
    }

    // Medium or low severity concerns
    return 0.75;
  }

  /**
   * Load Statement of Faith from database
   */
  private async loadStatementOfFaith(): Promise<StatementOfFaith[]> {
    try {
      const statements = await prisma.$queryRaw<any[]>`
        SELECT id, section, statement, scripture_references, keywords
        FROM statement_of_faith
        ORDER BY section
      `;

      return statements.map(s => ({
        id: s.id,
        section: s.section,
        statement: s.statement,
        scriptureReferences: s.scripture_references,
        keywords: s.keywords
      }));
    } catch (error) {
      console.error('Error loading Statement of Faith:', error);
      return [];
    }
  }

  /**
   * Map heresy type to Statement of Faith section
   */
  private mapHeresyToFaith(heresyType: string): string {
    const mapping: Record<string, string> = {
      'Denial of the Trinity': 'Trinity',
      'Denial of Christ\'s divinity': 'Trinity',
      'Denial of Christ\'s humanity': 'Trinity',
      'Salvation by works alone': 'Salvation',
      'Denial of biblical authority': 'Scripture',
      'Universalism': 'Salvation',
      'Prosperity gospel': 'Salvation',
      'Gnosticism': 'Salvation'
    };

    return mapping[heresyType] || 'General';
  }

  /**
   * Parse AI response into structured format
   */
  private parseAIResponse(content: string): any {
    try {
      const jsonMatch = content.match(/\[[\s\S]*\]|\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        return Array.isArray(parsed) ? parsed : parsed;
      }
      return [];
    } catch (error) {
      console.error('Error parsing AI response:', error);
      return [];
    }
  }
}
