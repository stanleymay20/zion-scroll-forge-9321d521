import { AIGatewayService } from '../AIGatewayService';
import { logger } from '../../utils/logger';
import { Chapter } from './AgentOrchestrationService';
import { agentConfigs } from '../../config/scroll-library.config';
import { ValidationResult, AcademicLevel } from '../../types/scroll-library.types';

export interface Explanation {
  id: string;
  concept: string;
  level: AcademicLevel;
  content: string;
  examples: string[];
  biblicalConnections: string[];
  practicalApplications: string[];
  citations: Citation[];
  createdAt: Date;
}

export interface ProblemSet {
  id: string;
  topic: string;
  difficulty: Difficulty;
  problems: Problem[];
  solutions: Solution[];
  rubric: GradingRubric;
  estimatedTime: number; // minutes
  createdAt: Date;
}

export interface Problem {
  id: string;
  type: ProblemType;
  statement: string;
  context?: string;
  hints?: string[];
  resources?: string[];
}

export interface Solution {
  problemId: string;
  approach: string;
  steps: string[];
  explanation: string;
  alternativeMethods?: string[];
  commonMistakes?: string[];
}

export interface ReadingGuide {
  id: string;
  chapterId: string;
  title: string;
  overview: string;
  keyQuestions: Question[];
  discussionPrompts: DiscussionPrompt[];
  reflectionExercises: ReflectionExercise[];
  additionalResources: Resource[];
  estimatedTime: number; // minutes
  createdAt: Date;
}

export interface Question {
  id: string;
  type: QuestionType;
  text: string;
  purpose: string;
  expectedResponse?: string;
  followUpQuestions?: string[];
}

export interface DiscussionPrompt {
  id: string;
  prompt: string;
  context: string;
  objectives: string[];
  facilitationTips: string[];
}

export interface ReflectionExercise {
  id: string;
  title: string;
  instructions: string;
  spiritualFocus: string;
  practicalApplication: string;
  timeRequired: number; // minutes
}

export interface Resource {
  id: string;
  title: string;
  type: ResourceType;
  url?: string;
  description: string;
  relevance: string;
  difficulty: AcademicLevel;
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
}

export interface GradingRubric {
  criteria: RubricCriterion[];
  totalPoints: number;
  passingScore: number;
}

export interface RubricCriterion {
  name: string;
  description: string;
  points: number;
  levels: RubricLevel[];
}

export interface RubricLevel {
  name: string;
  description: string;
  points: number;
}

export type Difficulty = 'beginner' | 'intermediate' | 'advanced' | 'expert';
export type ProblemType = 'analytical' | 'practical' | 'case-study' | 'research' | 'reflection';
export type QuestionType = 'comprehension' | 'analysis' | 'synthesis' | 'evaluation' | 'application';
export type ResourceType = 'book' | 'article' | 'video' | 'website' | 'podcast' | 'scripture';
export type CitationType = 'academic' | 'biblical' | 'book' | 'journal' | 'web' | 'conference';

/**
 * ScrollProfessorGPT Service for generating academic explanations and problem sets
 * Maintains scroll-constitutional principles while providing rigorous academic content
 */
export class ScrollProfessorGPTService {
  private aiGateway: AIGatewayService;
  private scrollAcademicPrompt: string;

  constructor() {
    this.aiGateway = new AIGatewayService();
    this.scrollAcademicPrompt = this.buildScrollAcademicPrompt();
  }

  /**
   * Generates comprehensive academic explanation for a concept
   */
  async generateExplanation(concept: string, level: AcademicLevel): Promise<Explanation> {
    try {
      logger.info('Starting explanation generation', { concept, level });

      const prompt = this.buildExplanationPrompt(concept, level);
      
      const response = await this.aiGateway.generateContent({
        model: agentConfigs.scrollProfessorGPT.model,
        prompt,
        maxTokens: agentConfigs.scrollProfessorGPT.maxTokens,
        temperature: agentConfigs.scrollProfessorGPT.temperature,
        systemPrompt: this.scrollAcademicPrompt
      });

      // Parse the structured response
      const parsedContent = await this.parseExplanationResponse(response.content);
      
      const explanation: Explanation = {
        id: `explanation_${Date.now()}`,
        concept,
        level,
        content: parsedContent.content,
        examples: parsedContent.examples,
        biblicalConnections: parsedContent.biblicalConnections,
        practicalApplications: parsedContent.practicalApplications,
        citations: parsedContent.citations,
        createdAt: new Date()
      };

      // Validate citation presence
      const citationValidation = await this.validateCitationPresence(explanation);
      if (!citationValidation.success) {
        logger.warn('Citation validation failed, enhancing citations...', { 
          errors: citationValidation.errors,
          concept 
        });
        
        // Enhance citations
        explanation.citations = await this.enhanceCitations(concept, explanation.citations);
      }

      logger.info('Explanation generation completed', { explanationId: explanation.id });
      return explanation;
    } catch (error) {
      logger.error('Explanation generation failed', { error, concept });
      throw error;
    }
  }

  /**
   * Generates problem set with solutions and rubric
   */
  async generateProblemSet(topic: string, difficulty: Difficulty): Promise<ProblemSet> {
    try {
      logger.info('Starting problem set generation', { topic, difficulty });

      const prompt = this.buildProblemSetPrompt(topic, difficulty);
      
      const response = await this.aiGateway.generateContent({
        model: agentConfigs.scrollProfessorGPT.model,
        prompt,
        maxTokens: agentConfigs.scrollProfessorGPT.maxTokens,
        temperature: agentConfigs.scrollProfessorGPT.temperature,
        systemPrompt: this.scrollAcademicPrompt
      });

      const parsedContent = await this.parseProblemSetResponse(response.content);
      
      const problemSet: ProblemSet = {
        id: `problemset_${Date.now()}`,
        topic,
        difficulty,
        problems: parsedContent.problems,
        solutions: parsedContent.solutions,
        rubric: parsedContent.rubric,
        estimatedTime: parsedContent.estimatedTime,
        createdAt: new Date()
      };

      logger.info('Problem set generation completed', { problemSetId: problemSet.id });
      return problemSet;
    } catch (error) {
      logger.error('Problem set generation failed', { error, topic });
      throw error;
    }
  }

  /**
   * Generates comprehensive reading guide for a chapter
   */
  async generateReadingGuide(chapter: Chapter): Promise<ReadingGuide> {
    try {
      logger.info('Starting reading guide generation', { chapterId: chapter.id });

      const prompt = this.buildReadingGuidePrompt(chapter);
      
      const response = await this.aiGateway.generateContent({
        model: agentConfigs.scrollProfessorGPT.model,
        prompt,
        maxTokens: agentConfigs.scrollProfessorGPT.maxTokens,
        temperature: agentConfigs.scrollProfessorGPT.temperature,
        systemPrompt: this.scrollAcademicPrompt
      });

      const parsedContent = await this.parseReadingGuideResponse(response.content);
      
      const readingGuide: ReadingGuide = {
        id: `readingguide_${Date.now()}`,
        chapterId: chapter.id,
        title: `Reading Guide: ${chapter.title}`,
        overview: parsedContent.overview,
        keyQuestions: parsedContent.keyQuestions,
        discussionPrompts: parsedContent.discussionPrompts,
        reflectionExercises: parsedContent.reflectionExercises,
        additionalResources: parsedContent.additionalResources,
        estimatedTime: parsedContent.estimatedTime,
        createdAt: new Date()
      };

      logger.info('Reading guide generation completed', { readingGuideId: readingGuide.id });
      return readingGuide;
    } catch (error) {
      logger.error('Reading guide generation failed', { error, chapterId: chapter.id });
      throw error;
    }
  }

  /**
   * Generates discussion questions for content
   */
  async generateDiscussionQuestions(content: string): Promise<Question[]> {
    try {
      logger.info('Starting discussion questions generation');

      const prompt = `
        Generate 5-8 thought-provoking discussion questions for the following content.
        Questions should:
        - Encourage critical thinking and analysis
        - Connect academic concepts to spiritual formation
        - Promote meaningful dialogue and reflection
        - Include both comprehension and application levels
        - Integrate biblical worldview naturally
        
        Content: ${content.substring(0, 2000)}...
        
        Format as JSON array with structure:
        {
          "questions": [
            {
              "type": "comprehension|analysis|synthesis|evaluation|application",
              "text": "question text",
              "purpose": "learning objective",
              "followUpQuestions": ["optional follow-up questions"]
            }
          ]
        }
      `;

      const response = await this.aiGateway.generateContent({
        model: agentConfigs.scrollProfessorGPT.model,
        prompt,
        maxTokens: 1500,
        temperature: 0.7,
        systemPrompt: this.scrollAcademicPrompt
      });

      const parsed = JSON.parse(response.content);
      return parsed.questions.map((q: any, index: number) => ({
        id: `question_${Date.now()}_${index}`,
        type: q.type,
        text: q.text,
        purpose: q.purpose,
        followUpQuestions: q.followUpQuestions || []
      }));
    } catch (error) {
      logger.error('Discussion questions generation failed', { error });
      throw error;
    }
  }

  private buildScrollAcademicPrompt(): string {
    return `
      You are ScrollProfessorGPT, an AI agent operating under Scroll Context-Constitutional Prompting (SCCP).
      You specialize in creating rigorous academic content that maintains scroll principles.
      
      CORE PRINCIPLES:
      1. Maintain academic excellence while integrating biblical worldview
      2. Create content that develops both intellect and character
      3. Use scroll tone: warm, wise, encouraging, prophetic but grounded
      4. Connect theoretical concepts to practical ministry applications
      5. Include proper academic citations and references
      
      ACADEMIC STANDARDS:
      - Cite credible academic sources (minimum 3 per major concept)
      - Include biblical references naturally integrated
      - Provide multiple examples and case studies
      - Create assessments that measure both knowledge and wisdom
      - Maintain intellectual rigor appropriate to academic level
      
      PEDAGOGICAL APPROACH:
      - Use progressive revelation: simple to complex concepts
      - Include both conceptual and practical explanations
      - Provide scaffolding for different learning styles
      - Create opportunities for reflection and application
      - Connect learning to calling and spiritual formation
      
      CITATION REQUIREMENTS:
      - Always include proper academic citations
      - Use APA format for academic sources
      - Include Scripture references with context
      - Provide URLs for accessible online resources
      - Verify source credibility and relevance
      
      NEVER compromise academic integrity or citation standards for convenience.
    `;
  }

  private buildExplanationPrompt(concept: string, level: AcademicLevel): string {
    return `
      Generate a comprehensive academic explanation for the concept: "${concept}"
      Target audience: ${level} level students
      
      STRUCTURE REQUIRED:
      1. Clear definition with academic precision
      2. Historical context and development
      3. Key principles and components
      4. Multiple concrete examples
      5. Biblical connections and theological implications
      6. Practical applications for ministry/service
      7. Academic citations (minimum 3 credible sources)
      
      FORMAT AS JSON:
      {
        "content": "main explanation text (1500-2000 words)",
        "examples": ["example 1", "example 2", "example 3"],
        "biblicalConnections": ["connection 1", "connection 2"],
        "practicalApplications": ["application 1", "application 2"],
        "citations": [
          {
            "type": "academic|biblical|book|journal",
            "author": "author name",
            "title": "source title",
            "publication": "publication name",
            "year": 2023,
            "url": "if available",
            "pages": "if applicable"
          }
        ]
      }
      
      Ensure all citations are real, credible sources relevant to the concept.
    `;
  }

  private buildProblemSetPrompt(topic: string, difficulty: Difficulty): string {
    return `
      Generate a comprehensive problem set for: "${topic}"
      Difficulty level: ${difficulty}
      
      CREATE 5-7 PROBLEMS INCLUDING:
      - 2 analytical problems (theory application)
      - 2 practical problems (real-world scenarios)
      - 1-2 case studies (complex situations)
      - 1 reflection problem (spiritual formation connection)
      
      FORMAT AS JSON:
      {
        "problems": [
          {
            "type": "analytical|practical|case-study|reflection",
            "statement": "problem statement",
            "context": "background information",
            "hints": ["hint 1", "hint 2"],
            "resources": ["resource 1", "resource 2"]
          }
        ],
        "solutions": [
          {
            "problemId": "matches problem index",
            "approach": "solution approach",
            "steps": ["step 1", "step 2"],
            "explanation": "detailed explanation",
            "alternativeMethods": ["method 1", "method 2"],
            "commonMistakes": ["mistake 1", "mistake 2"]
          }
        ],
        "rubric": {
          "criteria": [
            {
              "name": "criterion name",
              "description": "what this measures",
              "points": 25,
              "levels": [
                {"name": "Excellent", "description": "criteria", "points": 25},
                {"name": "Good", "description": "criteria", "points": 20},
                {"name": "Satisfactory", "description": "criteria", "points": 15},
                {"name": "Needs Improvement", "description": "criteria", "points": 10}
              ]
            }
          ],
          "totalPoints": 100,
          "passingScore": 70
        },
        "estimatedTime": 90
      }
    `;
  }

  private buildReadingGuidePrompt(chapter: Chapter): string {
    return `
      Generate a comprehensive reading guide for the chapter: "${chapter.title}"
      
      Chapter content preview: ${chapter.content.substring(0, 1000)}...
      
      CREATE GUIDE WITH:
      1. Overview (200-300 words)
      2. 8-10 key questions (various cognitive levels)
      3. 3-4 discussion prompts for group study
      4. 2-3 reflection exercises connecting to spiritual formation
      5. 5-7 additional resources for deeper study
      
      FORMAT AS JSON:
      {
        "overview": "chapter overview and learning objectives",
        "keyQuestions": [
          {
            "type": "comprehension|analysis|synthesis|evaluation|application",
            "text": "question text",
            "purpose": "learning objective",
            "expectedResponse": "brief guidance for instructors"
          }
        ],
        "discussionPrompts": [
          {
            "prompt": "discussion prompt",
            "context": "when/how to use",
            "objectives": ["objective 1", "objective 2"],
            "facilitationTips": ["tip 1", "tip 2"]
          }
        ],
        "reflectionExercises": [
          {
            "title": "exercise title",
            "instructions": "what students should do",
            "spiritualFocus": "spiritual formation aspect",
            "practicalApplication": "real-world connection",
            "timeRequired": 20
          }
        ],
        "additionalResources": [
          {
            "title": "resource title",
            "type": "book|article|video|website|scripture",
            "description": "what this resource provides",
            "relevance": "why it's helpful",
            "difficulty": "beginner|intermediate|advanced",
            "url": "if available"
          }
        ],
        "estimatedTime": 45
      }
    `;
  }

  private async parseExplanationResponse(content: string): Promise<any> {
    try {
      const parsed = JSON.parse(content);
      
      // Add IDs to citations if they don't exist
      if (parsed.citations && Array.isArray(parsed.citations)) {
        parsed.citations = parsed.citations.map((citation: any, index: number) => ({
          ...citation,
          id: citation.id || `citation_${Date.now()}_${index}`
        }));
      }
      
      return parsed;
    } catch (error) {
      logger.error('Failed to parse explanation response', { error, content });
      // Fallback parsing or regeneration logic could go here
      throw new Error('Failed to parse explanation response');
    }
  }

  private async parseProblemSetResponse(content: string): Promise<any> {
    try {
      const parsed = JSON.parse(content);
      // Add IDs to problems and solutions
      parsed.problems = parsed.problems.map((p: any, index: number) => ({
        ...p,
        id: `problem_${Date.now()}_${index}`
      }));
      parsed.solutions = parsed.solutions.map((s: any, index: number) => ({
        ...s,
        problemId: parsed.problems[index]?.id || `problem_${Date.now()}_${index}`
      }));
      return parsed;
    } catch (error) {
      logger.error('Failed to parse problem set response', { error, content });
      throw new Error('Failed to parse problem set response');
    }
  }

  private async parseReadingGuideResponse(content: string): Promise<any> {
    try {
      const parsed = JSON.parse(content);
      // Add IDs to all items
      parsed.keyQuestions = parsed.keyQuestions.map((q: any, index: number) => ({
        ...q,
        id: `question_${Date.now()}_${index}`
      }));
      parsed.discussionPrompts = parsed.discussionPrompts.map((p: any, index: number) => ({
        ...p,
        id: `prompt_${Date.now()}_${index}`
      }));
      parsed.reflectionExercises = parsed.reflectionExercises.map((e: any, index: number) => ({
        ...e,
        id: `exercise_${Date.now()}_${index}`
      }));
      parsed.additionalResources = parsed.additionalResources.map((r: any, index: number) => ({
        ...r,
        id: `resource_${Date.now()}_${index}`
      }));
      return parsed;
    } catch (error) {
      logger.error('Failed to parse reading guide response', { error, content });
      throw new Error('Failed to parse reading guide response');
    }
  }

  /**
   * Validates that proper citations are present in academic content
   */
  private async validateCitationPresence(explanation: Explanation): Promise<ValidationResult> {
    try {
      const hasAcademicCitations = explanation.citations.some(c => c.type === 'academic' || c.type === 'journal');
      const hasBiblicalCitations = explanation.citations.some(c => c.type === 'biblical');
      const hasMinimumCitations = explanation.citations.length >= 3;
      
      const errors: string[] = [];
      if (!hasAcademicCitations) errors.push('Missing academic citations');
      if (!hasBiblicalCitations) errors.push('Missing biblical citations');
      if (!hasMinimumCitations) errors.push('Insufficient number of citations (minimum 3 required)');
      
      return {
        success: errors.length === 0,
        errors,
        warnings: [],
        qualityScore: hasMinimumCitations ? 0.8 : 0.5,
        theologicalAlignment: hasBiblicalCitations ? 0.9 : 0.6
      };
    } catch (error) {
      logger.error('Citation validation failed', { error });
      return {
        success: false,
        errors: ['Citation validation service unavailable'],
        warnings: [],
        qualityScore: 0,
        theologicalAlignment: 0
      };
    }
  }

  /**
   * Enhances citations by adding more credible sources
   */
  private async enhanceCitations(concept: string, existingCitations: Citation[]): Promise<Citation[]> {
    try {
      const prompt = `
        Generate 3-5 additional credible academic citations for the concept: "${concept}"
        
        Include:
        - At least 2 peer-reviewed academic sources
        - 1 biblical reference with context
        - 1-2 authoritative books or resources
        
        Format as JSON array:
        [
          {
            "type": "academic|biblical|book|journal",
            "author": "author name",
            "title": "source title",
            "publication": "publication name",
            "year": 2020,
            "url": "if available",
            "pages": "if applicable",
            "doi": "if available",
            "isbn": "if applicable"
          }
        ]
        
        Ensure all sources are real and credible.
      `;

      const response = await this.aiGateway.generateContent({
        model: 'gpt-4',
        prompt,
        maxTokens: 1000,
        temperature: 0.3,
        systemPrompt: 'You are an academic research assistant. Provide only real, credible citations.'
      });

      const newCitations = JSON.parse(response.content).map((c: any, index: number) => ({
        ...c,
        id: `citation_${Date.now()}_${index}`
      }));

      return [...existingCitations, ...newCitations];
    } catch (error) {
      logger.error('Citation enhancement failed', { error });
      return existingCitations; // Return original citations if enhancement fails
    }
  }
}

export default ScrollProfessorGPTService;