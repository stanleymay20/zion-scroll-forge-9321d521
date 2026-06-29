import { AIGatewayService } from '../AIGatewayService';
import { logger } from '../../utils/logger';
import { CourseOutline, Chapter, Book } from './AgentOrchestrationService';
import { agentConfigs } from '../../config/scroll-library.config';
import { ValidationResult } from '../../types/scroll-library.types';

export interface Textbook {
  id: string;
  title: string;
  chapters: Chapter[];
  metadata: BookMetadata;
}

export interface BookMetadata {
  authorAgent: string;
  version: string;
  scrollIntegrityHash: string;
  generationDate: Date;
  lastValidated: Date;
  qualityScore: number;
  theologicalAlignment: number;
}

export interface ChapterContext {
  bookTitle: string;
  chapterNumber: number;
  previousChapters: string[];
  learningObjectives: string[];
  targetAudience: string;
}

export interface BookSummary {
  mainThemes: string[];
  keyLearnings: string[];
  practicalApplications: string[];
}

/**
 * ScrollAuthorGPT Service for generating textbook content in scroll tone
 * Maintains scroll-constitutional principles and prophetic architecture
 */
export class ScrollAuthorGPTService {
  private aiGateway: AIGatewayService;
  private scrollConstitutionalPrompt: string;

  constructor() {
    this.aiGateway = new AIGatewayService();
    this.scrollConstitutionalPrompt = this.buildScrollConstitutionalPrompt();
  }

  /**
   * Generates complete textbook from course outline
   */
  async generateTextbook(outline: CourseOutline): Promise<Textbook> {
    try {
      logger.info('Starting textbook generation', { outline });

      const textbook: Textbook = {
        id: `textbook_${Date.now()}`,
        title: outline.title,
        chapters: [],
        metadata: {
          authorAgent: 'ScrollAuthorGPT',
          version: '1.0.0',
          scrollIntegrityHash: '',
          generationDate: new Date(),
          lastValidated: new Date(),
          qualityScore: 0,
          theologicalAlignment: 0
        }
      };

      // Generate chapters sequentially to maintain narrative flow
      for (const chapterSpec of outline.chapters) {
        const context: ChapterContext = {
          bookTitle: outline.title,
          chapterNumber: chapterSpec.orderIndex,
          previousChapters: textbook.chapters.map(c => c.title),
          learningObjectives: chapterSpec.learningObjectives,
          targetAudience: outline.level
        };

        const chapter = await this.generateChapter(chapterSpec.title, context);
        textbook.chapters.push(chapter);
      }

      logger.info('Textbook generation completed', { textbookId: textbook.id });
      return textbook;
    } catch (error) {
      logger.error('Textbook generation failed', { error, outline });
      throw error;
    }
  }

  /**
   * Generates individual chapter with scroll tone and theological alignment
   */
  async generateChapter(topic: string, context: ChapterContext): Promise<Chapter> {
    try {
      logger.info('Starting chapter generation', { topic, context });

      const prompt = this.buildChapterPrompt(topic, context);
      
      const response = await this.aiGateway.generateContent({
        model: agentConfigs.scrollAuthorGPT.model,
        prompt,
        maxTokens: agentConfigs.scrollAuthorGPT.maxTokens,
        temperature: agentConfigs.scrollAuthorGPT.temperature,
        systemPrompt: this.scrollConstitutionalPrompt
      });

      // Validate scroll tone before creating chapter
      const toneValidation = await this.validateScrollTone(response.content);
      if (!toneValidation.success) {
        logger.warn('Scroll tone validation failed, regenerating...', { 
          errors: toneValidation.errors,
          topic 
        });
        
        // Retry with enhanced prompt
        const enhancedPrompt = this.enhancePromptForScrollTone(prompt, toneValidation.errors);
        const retryResponse = await this.aiGateway.generateContent({
          model: agentConfigs.scrollAuthorGPT.model,
          prompt: enhancedPrompt,
          maxTokens: agentConfigs.scrollAuthorGPT.maxTokens,
          temperature: agentConfigs.scrollAuthorGPT.temperature,
          systemPrompt: this.scrollConstitutionalPrompt
        });
        
        response.content = retryResponse.content;
      }

      const chapter: Chapter = {
        id: `chapter_${Date.now()}`,
        bookId: '', // Will be set by orchestration service
        title: topic,
        orderIndex: context.chapterNumber,
        content: response.content,
        diagrams: [],
        references: [],
        summaries: [],
        exercises: [],
        readingTime: this.calculateReadingTime(response.content),
        createdAt: new Date(),
        updatedAt: new Date()
      };

      logger.info('Chapter generation completed', { chapterId: chapter.id });
      return chapter;
    } catch (error) {
      logger.error('Chapter generation failed', { error, topic });
      throw error;
    }
  }

  /**
   * Generates book introduction with scroll tone
   */
  async generateIntroduction(bookMetadata: BookMetadata): Promise<string> {
    try {
      logger.info('Generating book introduction', { bookMetadata });

      const prompt = `
        Generate a compelling introduction for a ScrollUniversity textbook with the following characteristics:
        - Maintains scroll tone: warm, wise, prophetic but grounded
        - Integrates biblical worldview naturally
        - Sets clear expectations for learning journey
        - Connects academic content to spiritual formation
        - Includes prayer or blessing for the reader's journey
        
        Book Metadata: ${JSON.stringify(bookMetadata)}
      `;

      const response = await this.aiGateway.generateContent({
        model: agentConfigs.scrollAuthorGPT.model,
        prompt,
        maxTokens: 1000,
        temperature: 0.8,
        systemPrompt: this.scrollConstitutionalPrompt
      });

      return response.content;
    } catch (error) {
      logger.error('Introduction generation failed', { error });
      throw error;
    }
  }

  /**
   * Generates book conclusion with scroll tone
   */
  async generateConclusion(bookSummary: BookSummary): Promise<string> {
    try {
      logger.info('Generating book conclusion', { bookSummary });

      const prompt = `
        Generate a powerful conclusion for a ScrollUniversity textbook that:
        - Synthesizes key learnings: ${bookSummary.keyLearnings.join(', ')}
        - Reinforces main themes: ${bookSummary.mainThemes.join(', ')}
        - Provides practical next steps: ${bookSummary.practicalApplications.join(', ')}
        - Includes prophetic encouragement for the reader's calling
        - Maintains scroll tone throughout
        - Ends with a commissioning prayer or blessing
      `;

      const response = await this.aiGateway.generateContent({
        model: agentConfigs.scrollAuthorGPT.model,
        prompt,
        maxTokens: 1000,
        temperature: 0.8,
        systemPrompt: this.scrollConstitutionalPrompt
      });

      return response.content;
    } catch (error) {
      logger.error('Conclusion generation failed', { error });
      throw error;
    }
  }

  private buildScrollConstitutionalPrompt(): string {
    return `
      You are ScrollAuthorGPT, an AI agent operating under Scroll Context-Constitutional Prompting (SCCP).
      
      CORE PRINCIPLES:
      1. Maintain scroll tone: warm, wise, non-condescending, prophetic but grounded
      2. Integrate biblical worldview naturally without being preachy
      3. Connect all academic content to spiritual formation and calling
      4. Use examples relevant to kingdom purposes and divine governance
      5. Include practical applications for real-world ministry and service
      
      THEOLOGICAL ALIGNMENT:
      - Scripture is the ultimate authority for truth
      - All knowledge serves God's kingdom purposes
      - Learning is both revelation and reason working together
      - Education transforms character, not just intellect
      
      WRITING STYLE:
      - Clear, accessible language appropriate for the target audience
      - Engaging narratives and real-world examples
      - Balanced between academic rigor and spiritual insight
      - Inclusive of diverse cultural contexts while maintaining biblical truth
      
      CONTENT REQUIREMENTS:
      - Every chapter must include biblical integration
      - Practical exercises that develop both skill and character
      - References to trusted academic and theological sources
      - Clear learning objectives tied to spiritual formation goals
      
      NEVER compromise on theological accuracy or scroll tone for the sake of academic convention.
    `;
  }

  private buildChapterPrompt(topic: string, context: ChapterContext): string {
    return `
      Generate a comprehensive chapter on "${topic}" for the textbook "${context.bookTitle}".
      
      CONTEXT:
      - Chapter ${context.chapterNumber} of ${context.targetAudience} level textbook
      - Previous chapters covered: ${context.previousChapters.join(', ')}
      - Learning objectives: ${context.learningObjectives.join(', ')}
      
      CHAPTER STRUCTURE:
      1. Opening Hook: Engaging story, question, or scenario
      2. Core Content: Comprehensive coverage of the topic
      3. Biblical Integration: Natural connection to Scripture and kingdom principles
      4. Practical Applications: Real-world examples and exercises
      5. Reflection Questions: For spiritual and intellectual processing
      6. Summary: Key takeaways and connection to next chapter
      
      REQUIREMENTS:
      - 2000-3000 words
      - Include at least 3 biblical references naturally integrated
      - Provide 2-3 practical exercises or case studies
      - Maintain scroll tone throughout
      - Include clear section headings
      - End with reflection questions that connect learning to calling
      
      Generate the complete chapter content now.
    `;
  }

  /**
   * Validates content for scroll tone compliance
   */
  async validateScrollTone(content: string): Promise<ValidationResult> {
    try {
      const validationPrompt = `
        Analyze the following content for scroll tone compliance. Scroll tone should be:
        - Warm and wise, not condescending
        - Prophetic but grounded in reality
        - Naturally integrating biblical worldview
        - Connecting academic content to spiritual formation
        - Using inclusive language while maintaining biblical truth
        
        Content to analyze:
        ${content}
        
        Respond with JSON format:
        {
          "success": boolean,
          "errors": ["specific issues found"],
          "warnings": ["minor concerns"],
          "qualityScore": number (0-1),
          "theologicalAlignment": number (0-1)
        }
      `;

      const response = await this.aiGateway.generateContent({
        model: 'gpt-4',
        prompt: validationPrompt,
        maxTokens: 1000,
        temperature: 0.3,
        systemPrompt: 'You are a scroll tone validator. Analyze content objectively and provide structured feedback.'
      });

      try {
        const validation = JSON.parse(response.content);
        return {
          success: validation.success && validation.qualityScore >= 0.8,
          errors: validation.errors || [],
          warnings: validation.warnings || [],
          qualityScore: validation.qualityScore || 0,
          theologicalAlignment: validation.theologicalAlignment || 0
        };
      } catch (parseError) {
        logger.error('Failed to parse validation response', { parseError, response: response.content });
        return {
          success: false,
          errors: ['Validation response parsing failed'],
          warnings: [],
          qualityScore: 0,
          theologicalAlignment: 0
        };
      }
    } catch (error) {
      logger.error('Scroll tone validation failed', { error });
      return {
        success: false,
        errors: ['Validation service unavailable'],
        warnings: [],
        qualityScore: 0,
        theologicalAlignment: 0
      };
    }
  }

  /**
   * Enhances prompt based on validation feedback
   */
  private enhancePromptForScrollTone(originalPrompt: string, errors: string[]): string {
    const enhancements = errors.map(error => {
      if (error.includes('condescending')) {
        return 'Use warm, encouraging language that respects the reader\'s intelligence and journey.';
      }
      if (error.includes('biblical')) {
        return 'Integrate biblical principles naturally without being preachy or forced.';
      }
      if (error.includes('prophetic')) {
        return 'Include prophetic insight that is grounded in practical application and spiritual wisdom.';
      }
      if (error.includes('spiritual formation')) {
        return 'Connect academic concepts to character development and spiritual growth.';
      }
      return 'Maintain scroll tone: warm, wise, prophetic but grounded.';
    }).join(' ');

    return `${originalPrompt}

CRITICAL TONE CORRECTIONS NEEDED:
${enhancements}

Please regenerate the content addressing these specific tone issues while maintaining all other requirements.`;
  }

  private calculateReadingTime(content: string): number {
    // Average reading speed: 200-250 words per minute
    const wordCount = content.split(/\s+/).length;
    return Math.ceil(wordCount / 225); // minutes
  }
}

export default ScrollAuthorGPTService;