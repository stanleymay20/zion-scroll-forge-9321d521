import { AIGatewayService } from '../AIGatewayService';
import { logger } from '../../utils/logger';
import { agentConfigs } from '../../config/scroll-library.config';
import { ValidationResult, Source, SourceType } from '../../types/scroll-library.types';

export interface FactCheckResult {
  id: string;
  claim: string;
  isVerified: boolean;
  confidence: number; // 0-1
  sources: Source[];
  contradictingSources?: Source[];
  explanation: string;
  recommendations: string[];
  createdAt: Date;
}

export interface Citation {
  id: string;
  type: CitationType;
  author: string;
  title: string;
  publication?: string;
  year?: number;
  url?: string;
  pages?: string;
  doi?: string;
  isbn?: string;
  isValid: boolean;
  credibilityScore: number; // 0-1
}

export interface Reference {
  id: string;
  content: string;
  citations: Citation[];
  relatedConcepts: string[];
  academicLevel: AcademicLevel;
  createdAt: Date;
}

export interface ScholarSearchResult {
  title: string;
  authors: string[];
  publication: string;
  year: number;
  citationCount: number;
  url?: string;
  doi?: string;
  abstract?: string;
  relevanceScore: number;
}

export type CitationType = 'academic' | 'biblical' | 'book' | 'journal' | 'web' | 'conference';
export type AcademicLevel = 'beginner' | 'intermediate' | 'advanced';

/**
 * ScrollResearcherGPT Service for fact-checking and source validation
 * Maintains academic integrity while ensuring scroll-constitutional alignment
 */
export class ScrollResearcherGPTService {
  private aiGateway: AIGatewayService;
  private scrollResearchPrompt: string;
  private googleScholarApiKey: string;
  private crossRefApiUrl: string;
  private bibleApiUrl: string;

  constructor() {
    this.aiGateway = new AIGatewayService();
    this.scrollResearchPrompt = this.buildScrollResearchPrompt();
    this.googleScholarApiKey = process.env.GOOGLE_SCHOLAR_API_KEY || '';
    this.crossRefApiUrl = process.env.CROSSREF_API_URL || 'https://api.crossref.org/works';
    this.bibleApiUrl = process.env.BIBLE_API_URL || 'https://api.scripture.api.bible/v1';
  }

  /**
   * Fact-checks a claim against trusted sources
   */
  async factCheck(claim: string): Promise<FactCheckResult> {
    try {
      logger.info('Starting fact check', { claim });

      // First, identify the type of claim and relevant domains
      const claimAnalysis = await this.analyzeClaim(claim);
      
      // Find relevant sources based on claim type
      const sources = await this.findSources(claimAnalysis.topic);
      
      // Perform fact-checking using AI with sources
      const factCheckPrompt = this.buildFactCheckPrompt(claim, sources);
      
      const response = await this.aiGateway.generateContent({
        model: agentConfigs.scrollResearcherGPT.model,
        prompt: factCheckPrompt,
        maxTokens: agentConfigs.scrollResearcherGPT.maxTokens,
        temperature: agentConfigs.scrollResearcherGPT.temperature,
        systemPrompt: this.scrollResearchPrompt
      });

      const parsedResult = await this.parseFactCheckResponse(response.content);
      
      // Map source IDs to actual Source objects
      const supportingSources = sources.filter(s => 
        parsedResult.supportingSources && parsedResult.supportingSources.includes(s.id)
      );
      
      const contradictingSources = sources.filter(s =>
        parsedResult.contradictingSources && parsedResult.contradictingSources.includes(s.id)
      );
      
      const factCheckResult: FactCheckResult = {
        id: `factcheck_${Date.now()}`,
        claim,
        isVerified: parsedResult.isVerified,
        confidence: parsedResult.confidence,
        sources: supportingSources.length > 0 ? supportingSources : sources.slice(0, 3), // Use found sources if mapping fails
        contradictingSources: contradictingSources,
        explanation: parsedResult.explanation,
        recommendations: parsedResult.recommendations,
        createdAt: new Date()
      };

      // Validate that we have sufficient sources for the confidence level
      if (factCheckResult.confidence > 0.8 && factCheckResult.sources.length < 2) {
        logger.warn('High confidence claim with insufficient sources', { 
          claim, 
          confidence: factCheckResult.confidence,
          sourceCount: factCheckResult.sources.length 
        });
        factCheckResult.confidence = Math.min(factCheckResult.confidence, 0.7);
      }

      logger.info('Fact check completed', { 
        factCheckId: factCheckResult.id,
        isVerified: factCheckResult.isVerified,
        confidence: factCheckResult.confidence
      });
      
      return factCheckResult;
    } catch (error) {
      logger.error('Fact check failed', { error, claim });
      throw error;
    }
  }

  /**
   * Finds academic sources using Google Scholar API
   */
  async findSources(topic: string): Promise<Source[]> {
    try {
      logger.info('Finding sources for topic', { topic });

      const sources: Source[] = [];
      
      // Search Google Scholar if API key is available
      if (this.googleScholarApiKey) {
        const scholarResults = await this.searchGoogleScholar(topic);
        sources.push(...scholarResults);
      }
      
      // Search CrossRef for academic papers
      const crossRefResults = await this.searchCrossRef(topic);
      sources.push(...crossRefResults);
      
      // Search for biblical sources if topic has theological relevance
      if (await this.hasTheologicalRelevance(topic)) {
        const biblicalSources = await this.findBiblicalSources(topic);
        sources.push(...biblicalSources);
      }
      
      // Use AI to find additional credible sources
      const aiSources = await this.findAISources(topic);
      sources.push(...aiSources);
      
      // Rank sources by credibility and relevance
      const rankedSources = await this.rankSources(sources, topic);
      
      logger.info('Sources found and ranked', { 
        topic, 
        totalSources: rankedSources.length,
        highCredibilitySources: rankedSources.filter(s => s.credibilityScore > 0.8).length
      });
      
      return rankedSources.slice(0, 10); // Return top 10 sources
    } catch (error) {
      logger.error('Source finding failed', { error, topic });
      throw error;
    }
  }

  /**
   * Validates a citation for accuracy and accessibility
   */
  async validateCitation(citation: Citation): Promise<boolean> {
    try {
      logger.info('Validating citation', { citationId: citation.id });

      let isValid = false;
      let credibilityScore = 0;

      switch (citation.type) {
        case 'academic':
        case 'journal':
          const academicValidation = await this.validateAcademicCitation(citation);
          isValid = academicValidation.isValid;
          credibilityScore = academicValidation.credibilityScore;
          break;
          
        case 'biblical':
          const biblicalValidation = await this.validateBiblicalCitation(citation);
          isValid = biblicalValidation.isValid;
          credibilityScore = biblicalValidation.credibilityScore;
          break;
          
        case 'book':
          const bookValidation = await this.validateBookCitation(citation);
          isValid = bookValidation.isValid;
          credibilityScore = bookValidation.credibilityScore;
          break;
          
        case 'web':
          const webValidation = await this.validateWebCitation(citation);
          isValid = webValidation.isValid;
          credibilityScore = webValidation.credibilityScore;
          break;
          
        default:
          // Basic validation for other types
          isValid = !!(citation.author && citation.title);
          credibilityScore = 0.5;
      }

      // Update citation with validation results
      citation.isValid = isValid;
      citation.credibilityScore = credibilityScore;

      logger.info('Citation validation completed', { 
        citationId: citation.id,
        isValid,
        credibilityScore
      });
      
      return isValid;
    } catch (error) {
      logger.error('Citation validation failed', { error, citationId: citation.id });
      return false;
    }
  }

  /**
   * Cross-references content with multiple sources
   */
  async crossReference(content: string): Promise<Reference[]> {
    try {
      logger.info('Starting cross-reference analysis', { contentLength: content.length });

      // Extract key claims and concepts from content
      const claims = await this.extractClaims(content);
      const concepts = await this.extractConcepts(content);
      
      const references: Reference[] = [];
      
      // Cross-reference each major claim
      for (const claim of claims) {
        const sources = await this.findSources(claim);
        const citations = await this.convertSourcesToCitations(sources);
        
        const reference: Reference = {
          id: `reference_${Date.now()}_${references.length}`,
          content: claim,
          citations: citations.filter(c => c.credibilityScore > 0.6),
          relatedConcepts: concepts.filter(concept => 
            this.isConceptRelated(concept, claim)
          ),
          academicLevel: await this.determineAcademicLevel(claim),
          createdAt: new Date()
        };
        
        if (reference.citations.length > 0) {
          references.push(reference);
        }
      }
      
      // Validate cross-references for consistency
      const validatedReferences = await this.validateCrossReferences(references);
      
      logger.info('Cross-reference analysis completed', { 
        totalClaims: claims.length,
        referencesFound: validatedReferences.length
      });
      
      return validatedReferences;
    } catch (error) {
      logger.error('Cross-reference analysis failed', { error });
      throw error;
    }
  }

  private buildScrollResearchPrompt(): string {
    return `
      You are ScrollResearcherGPT, an AI agent operating under Scroll Context-Constitutional Prompting (SCCP).
      You specialize in fact-checking and source validation while maintaining scroll principles.
      
      CORE PRINCIPLES:
      1. Maintain absolute commitment to truth and accuracy
      2. Prioritize Scripture as the ultimate authority for theological claims
      3. Use rigorous academic standards for all fact-checking
      4. Integrate biblical worldview in evaluation of sources and claims
      5. Provide balanced, fair assessment while maintaining scroll tone
      
      FACT-CHECKING STANDARDS:
      - Require multiple credible sources for verification (minimum 2-3)
      - Prioritize peer-reviewed academic sources for scholarly claims
      - Use Scripture and trusted theological sources for biblical claims
      - Evaluate source credibility, bias, and methodology
      - Distinguish between facts, interpretations, and opinions
      
      SOURCE EVALUATION CRITERIA:
      - Academic credentials and institutional affiliation of authors
      - Publication venue reputation and peer-review process
      - Recency and relevance of information
      - Consistency with established scholarly consensus
      - Theological alignment with orthodox Christian doctrine
      
      BIBLICAL INTEGRATION:
      - Scripture takes precedence over human scholarship in theological matters
      - Evaluate all claims through biblical lens while respecting academic rigor
      - Distinguish between biblical truth and cultural/historical context
      - Maintain respect for both revelation and reason
      
      OUTPUT REQUIREMENTS:
      - Provide clear, evidence-based conclusions
      - Include confidence levels based on source quality and quantity
      - Offer specific recommendations for strengthening claims
      - Maintain warm, wise tone while being academically rigorous
      - Flag potential conflicts between sources or worldviews
      
      NEVER compromise truth for convenience or accept claims without proper verification.
    `;
  }

  private async analyzeClaim(claim: string): Promise<{ topic: string; type: string; domains: string[] }> {
    try {
      const analysisPrompt = `
        Analyze the following claim to identify:
        1. The main topic or subject area
        2. The type of claim (factual, theological, historical, scientific, etc.)
        3. Relevant academic domains for research
        
        Claim: "${claim}"
        
        Respond in JSON format:
        {
          "topic": "main subject area",
          "type": "claim type",
          "domains": ["domain1", "domain2", "domain3"]
        }
      `;

      const response = await this.aiGateway.generateContent({
        model: 'gpt-4',
        prompt: analysisPrompt,
        maxTokens: 500,
        temperature: 0.3,
        systemPrompt: 'You are a research analyst. Provide structured analysis of claims.'
      });

      return JSON.parse(response.content);
    } catch (error) {
      logger.error('Claim analysis failed', { error, claim });
      return {
        topic: claim.substring(0, 50),
        type: 'general',
        domains: ['general']
      };
    }
  }

  private buildFactCheckPrompt(claim: string, sources: Source[]): string {
    const sourceList = sources.map(s => 
      `- ${s.title} by ${s.author} (${s.type}, credibility: ${s.credibilityScore})`
    ).join('\n');

    return `
      Fact-check the following claim using the provided sources and your knowledge:
      
      CLAIM: "${claim}"
      
      AVAILABLE SOURCES:
      ${sourceList}
      
      ANALYSIS REQUIREMENTS:
      1. Evaluate the claim's accuracy based on available evidence
      2. Identify supporting and contradicting sources
      3. Assess confidence level based on source quality and consensus
      4. Provide clear explanation of findings
      5. Offer recommendations for strengthening the claim if needed
      
      Respond in JSON format:
      {
        "isVerified": boolean,
        "confidence": number (0-1),
        "explanation": "detailed explanation of findings",
        "supportingSources": [array of source IDs that support the claim],
        "contradictingSources": [array of source IDs that contradict the claim],
        "recommendations": ["recommendation 1", "recommendation 2"]
      }
      
      Be thorough, fair, and maintain high standards for verification.
    `;
  }

  private async parseFactCheckResponse(content: string): Promise<any> {
    try {
      return JSON.parse(content);
    } catch (error) {
      logger.error('Failed to parse fact check response', { error, content });
      throw new Error('Failed to parse fact check response');
    }
  }

  private async searchGoogleScholar(topic: string): Promise<Source[]> {
    try {
      // Note: This is a placeholder for Google Scholar API integration
      // In production, you would implement actual API calls
      logger.info('Searching Google Scholar', { topic });
      
      // Mock implementation - replace with actual API calls
      const mockResults: ScholarSearchResult[] = [
        {
          title: `Academic Research on ${topic}`,
          authors: ['Dr. Academic Author'],
          publication: 'Journal of Academic Studies',
          year: 2023,
          citationCount: 45,
          relevanceScore: 0.9,
          abstract: `Comprehensive study on ${topic}...`
        }
      ];
      
      return mockResults.map(result => {
        // Ensure credibilityScore is always defined and within valid range
        const citationScore = result.citationCount ? Math.min(0.9, 0.5 + (result.citationCount / 100)) : 0.7;
        return {
          id: `scholar_${Date.now()}_${Math.random()}`,
          title: result.title,
          author: result.authors.join(', '),
          type: 'academic' as SourceType,
          url: result.url,
          credibilityScore: citationScore
        };
      });
    } catch (error) {
      logger.error('Google Scholar search failed', { error, topic });
      return [];
    }
  }

  private async searchCrossRef(topic: string): Promise<Source[]> {
    try {
      logger.info('Searching CrossRef', { topic });
      
      // Mock implementation - replace with actual CrossRef API calls
      const mockResults = [
        {
          title: `CrossRef Study on ${topic}`,
          author: 'Research Author',
          type: 'academic' as SourceType,
          credibilityScore: 0.85
        }
      ];
      
      return mockResults.map(result => ({
        id: `crossref_${Date.now()}_${Math.random()}`,
        title: result.title,
        author: result.author,
        type: result.type,
        credibilityScore: result.credibilityScore || 0.75 // Ensure credibilityScore is always defined
      }));
    } catch (error) {
      logger.error('CrossRef search failed', { error, topic });
      return [];
    }
  }

  private async hasTheologicalRelevance(topic: string): Promise<boolean> {
    const theologicalKeywords = [
      'god', 'jesus', 'christ', 'bible', 'scripture', 'theology', 'church',
      'faith', 'prayer', 'salvation', 'gospel', 'christian', 'biblical',
      'spiritual', 'holy', 'divine', 'kingdom', 'ministry', 'worship'
    ];
    
    const topicLower = topic.toLowerCase();
    return theologicalKeywords.some(keyword => topicLower.includes(keyword));
  }

  private async findBiblicalSources(topic: string): Promise<Source[]> {
    try {
      logger.info('Finding biblical sources', { topic });
      
      // Mock implementation - replace with actual Bible API calls
      const biblicalSources: Source[] = [
        {
          id: `biblical_${Date.now()}`,
          title: `Biblical Perspective on ${topic}`,
          author: 'Scripture',
          type: 'biblical' as SourceType,
          credibilityScore: 1.0 // Scripture has highest credibility in theological matters
        }
      ];
      
      return biblicalSources;
    } catch (error) {
      logger.error('Biblical source search failed', { error, topic });
      return [];
    }
  }

  private async findAISources(topic: string): Promise<Source[]> {
    try {
      const prompt = `
        Identify 3-5 credible academic sources for research on: "${topic}"
        
        Include:
        - Peer-reviewed journal articles
        - Authoritative books by recognized experts
        - Reputable institutional publications
        
        Format as JSON array:
        [
          {
            "title": "source title",
            "author": "author name",
            "type": "academic|book|journal",
            "publication": "publication venue",
            "year": 2023,
            "credibilityScore": 0.85
          }
        ]
        
        Ensure all sources are real and credible.
      `;

      const response = await this.aiGateway.generateContent({
        model: 'gpt-4',
        prompt,
        maxTokens: 1500,
        temperature: 0.3,
        systemPrompt: 'You are an academic research assistant. Provide only real, credible sources.'
      });

      const aiSources = JSON.parse(response.content);
      return aiSources.map((source: any, index: number) => ({
        id: `ai_source_${Date.now()}_${index}`,
        title: source.title || 'Untitled Source',
        author: source.author || 'Unknown Author',
        type: (source.type as SourceType) || 'academic',
        url: source.url,
        credibilityScore: typeof source.credibilityScore === 'number' ? source.credibilityScore : 0.7 // Ensure credibilityScore is always a number
      }));
    } catch (error) {
      logger.error('AI source finding failed', { error, topic });
      return [];
    }
  }

  private async rankSources(sources: Source[], topic: string): Promise<Source[]> {
    // Sort by credibility score and relevance
    return sources.sort((a, b) => {
      // Prioritize biblical sources for theological topics
      if (a.type === 'biblical' && b.type !== 'biblical' && 
          this.hasTheologicalRelevance(topic)) {
        return -1;
      }
      if (b.type === 'biblical' && a.type !== 'biblical' && 
          this.hasTheologicalRelevance(topic)) {
        return 1;
      }
      
      // Otherwise sort by credibility score
      return b.credibilityScore - a.credibilityScore;
    });
  }

  private async validateAcademicCitation(citation: Citation): Promise<{ isValid: boolean; credibilityScore: number }> {
    // Mock implementation - in production, validate against academic databases
    const hasRequiredFields = !!(citation.author && citation.title && citation.publication);
    const hasYear = citation.year && citation.year > 1900 && citation.year <= new Date().getFullYear();
    
    return {
      isValid: hasRequiredFields && hasYear,
      credibilityScore: hasRequiredFields && hasYear ? 0.8 : 0.3
    };
  }

  private async validateBiblicalCitation(citation: Citation): Promise<{ isValid: boolean; credibilityScore: number }> {
    // Biblical citations have high credibility if properly formatted
    const isBibleReference = citation.title.match(/\b\d*\s*[A-Za-z]+\s+\d+:\d+/);
    
    return {
      isValid: !!isBibleReference,
      credibilityScore: isBibleReference ? 1.0 : 0.5
    };
  }

  private async validateBookCitation(citation: Citation): Promise<{ isValid: boolean; credibilityScore: number }> {
    const hasRequiredFields = !!(citation.author && citation.title);
    const hasISBN = !!citation.isbn;
    
    return {
      isValid: hasRequiredFields,
      credibilityScore: hasRequiredFields ? (hasISBN ? 0.8 : 0.6) : 0.3
    };
  }

  private async validateWebCitation(citation: Citation): Promise<{ isValid: boolean; credibilityScore: number }> {
    const hasUrl = !!citation.url;
    const isReputableDomain = citation.url ? 
      /\.(edu|gov|org)$/.test(new URL(citation.url).hostname) : false;
    
    return {
      isValid: hasUrl,
      credibilityScore: hasUrl ? (isReputableDomain ? 0.7 : 0.4) : 0.2
    };
  }

  private async extractClaims(content: string): Promise<string[]> {
    try {
      const prompt = `
        Extract the main factual claims from the following content.
        Focus on statements that can be verified or fact-checked.
        
        Content: ${content.substring(0, 2000)}...
        
        Return as JSON array of strings:
        ["claim 1", "claim 2", "claim 3"]
      `;

      const response = await this.aiGateway.generateContent({
        model: 'gpt-4',
        prompt,
        maxTokens: 1000,
        temperature: 0.3,
        systemPrompt: 'Extract factual claims that can be verified.'
      });

      return JSON.parse(response.content);
    } catch (error) {
      logger.error('Claim extraction failed', { error });
      return [];
    }
  }

  private async extractConcepts(content: string): Promise<string[]> {
    try {
      const prompt = `
        Extract the key concepts and topics from the following content.
        
        Content: ${content.substring(0, 2000)}...
        
        Return as JSON array of strings:
        ["concept 1", "concept 2", "concept 3"]
      `;

      const response = await this.aiGateway.generateContent({
        model: 'gpt-4',
        prompt,
        maxTokens: 800,
        temperature: 0.3,
        systemPrompt: 'Extract key concepts and topics.'
      });

      return JSON.parse(response.content);
    } catch (error) {
      logger.error('Concept extraction failed', { error });
      return [];
    }
  }

  private async convertSourcesToCitations(sources: Source[]): Promise<Citation[]> {
    return sources.map((source, index) => ({
      id: `citation_${Date.now()}_${index}`,
      type: source.type === 'academic' ? 'academic' as CitationType : 
            source.type === 'biblical' ? 'biblical' as CitationType :
            source.type === 'book' ? 'book' as CitationType : 'web' as CitationType,
      author: source.author,
      title: source.title,
      url: source.url,
      isValid: true,
      credibilityScore: source.credibilityScore
    }));
  }

  private isConceptRelated(concept: string, claim: string): boolean {
    const conceptWords = concept.toLowerCase().split(/\s+/);
    const claimLower = claim.toLowerCase();
    
    return conceptWords.some(word => 
      word.length > 3 && claimLower.includes(word)
    );
  }

  private async determineAcademicLevel(claim: string): Promise<AcademicLevel> {
    // Simple heuristic - in production, use more sophisticated analysis
    const complexityIndicators = [
      'theoretical', 'paradigm', 'methodology', 'epistemological',
      'hermeneutical', 'exegetical', 'systematic', 'comprehensive'
    ];
    
    const claimLower = claim.toLowerCase();
    const complexityScore = complexityIndicators.filter(indicator => 
      claimLower.includes(indicator)
    ).length;
    
    if (complexityScore >= 2) return 'advanced';
    if (complexityScore >= 1) return 'intermediate';
    return 'beginner';
  }

  private async validateCrossReferences(references: Reference[]): Promise<Reference[]> {
    // Filter out references with insufficient citations
    return references.filter(ref => 
      ref.citations.length >= 1 && 
      ref.citations.some(c => c.credibilityScore > 0.6)
    );
  }
}

export default ScrollResearcherGPTService;