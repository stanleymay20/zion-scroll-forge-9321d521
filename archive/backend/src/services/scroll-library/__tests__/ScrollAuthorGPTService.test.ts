import { ScrollAuthorGPTService, ChapterContext, BookSummary } from '../ScrollAuthorGPTService';
import { AIGatewayService } from '../../AIGatewayService';
import { CourseOutline } from '../AgentOrchestrationService';
import { logger } from '../../../utils/logger';
import { it } from 'node:test';
import { describe } from 'node:test';
import { it } from 'node:test';
import { describe } from 'node:test';
import { it } from 'node:test';
import { describe } from 'node:test';
import { it } from 'node:test';
import { it } from 'node:test';
import { describe } from 'node:test';
import { it } from 'node:test';
import { it } from 'node:test';
import { describe } from 'node:test';
import { afterEach } from 'node:test';
import { beforeEach } from 'node:test';
import { describe } from 'node:test';

// Mock dependencies
jest.mock('../../AIGatewayService');
jest.mock('../../../utils/logger');

describe('ScrollAuthorGPTService', () => {
  let service: ScrollAuthorGPTService;
  let mockAIGateway: jest.Mocked<AIGatewayService>;

  beforeEach(() => {
    mockAIGateway = new AIGatewayService() as jest.Mocked<AIGatewayService>;
    service = new ScrollAuthorGPTService();
    (service as any).aiGateway = mockAIGateway;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('generateTextbook', () => {
    it('should generate complete textbook from outline', async () => {
      // Arrange
      const outline: CourseOutline = {
        title: 'Biblical Foundations',
        subject: 'Theology',
        level: 'intermediate',
        chapters: [
          {
            title: 'Scripture and Revelation',
            orderIndex: 1,
            topics: ['Inspiration', 'Authority'],
            learningObjectives: ['Understand biblical inspiration']
          },
          {
            title: 'The Nature of God',
            orderIndex: 2,
            topics: ['Trinity', 'Attributes'],
            learningObjectives: ['Comprehend divine nature']
          }
        ]
      };

      // Mock chapter generation
      mockAIGateway.generateContent
        .mockResolvedValueOnce({
          content: 'Generated chapter content with scroll tone and biblical integration.',
          usage: { totalTokens: 1000 }
        })
        // Mock validation response for first chapter
        .mockResolvedValueOnce({
          content: JSON.stringify({
            success: true,
            errors: [],
            warnings: [],
            qualityScore: 0.9,
            theologicalAlignment: 0.95
          }),
          usage: { totalTokens: 200 }
        })
        // Mock chapter generation for second chapter
        .mockResolvedValueOnce({
          content: 'Generated chapter content with scroll tone and biblical integration.',
          usage: { totalTokens: 1000 }
        })
        // Mock validation response for second chapter
        .mockResolvedValueOnce({
          content: JSON.stringify({
            success: true,
            errors: [],
            warnings: [],
            qualityScore: 0.9,
            theologicalAlignment: 0.95
          }),
          usage: { totalTokens: 200 }
        });

      // Act
      const result = await service.generateTextbook(outline);

      // Assert
      expect(result).toBeDefined();
      expect(result.title).toBe(outline.title);
      expect(result.chapters).toHaveLength(2);
      expect(result.metadata.authorAgent).toBe('ScrollAuthorGPT');
      // Each chapter generation now includes validation calls (2 chapters * 2 calls each)
      expect(mockAIGateway.generateContent).toHaveBeenCalledTimes(4);
      expect(logger.info).toHaveBeenCalledWith(
        'Starting textbook generation',
        { outline }
      );
    });

    it('should maintain chapter order during generation', async () => {
      // Arrange
      const outline: CourseOutline = {
        title: 'Test Course',
        subject: 'Test',
        level: 'beginner',
        chapters: [
          {
            title: 'Chapter 1',
            orderIndex: 1,
            topics: ['Topic 1'],
            learningObjectives: ['Objective 1']
          },
          {
            title: 'Chapter 2',
            orderIndex: 2,
            topics: ['Topic 2'],
            learningObjectives: ['Objective 2']
          }
        ]
      };

      // Mock chapter generation and validation for both chapters
      mockAIGateway.generateContent
        .mockResolvedValue({
          content: 'Chapter content',
          usage: { totalTokens: 500 }
        })
        .mockResolvedValue({
          content: JSON.stringify({
            success: true,
            errors: [],
            warnings: [],
            qualityScore: 0.9,
            theologicalAlignment: 0.95
          }),
          usage: { totalTokens: 200 }
        });

      // Act
      const result = await service.generateTextbook(outline);

      // Assert
      expect(result.chapters[0].orderIndex).toBe(1);
      expect(result.chapters[1].orderIndex).toBe(2);
      expect(result.chapters[0].title).toBe('Chapter 1');
      expect(result.chapters[1].title).toBe('Chapter 2');
    });
  });

  describe('generateChapter', () => {
    it('should generate chapter with scroll tone', async () => {
      // Arrange
      const topic = 'The Trinity';
      const context: ChapterContext = {
        bookTitle: 'Systematic Theology',
        chapterNumber: 3,
        previousChapters: ['Introduction', 'Scripture'],
        learningObjectives: ['Understand Trinitarian doctrine'],
        targetAudience: 'intermediate'
      };

      const mockContent = `
        # The Trinity

        The doctrine of the Trinity stands as one of the most profound mysteries of our faith...
        
        ## Biblical Foundation
        
        Scripture reveals the Triune nature of God through...
        
        ## Practical Application
        
        Understanding the Trinity transforms how we...
        
        ## Reflection Questions
        
        1. How does the Trinity impact your prayer life?
        2. What does this reveal about God's nature?
      `;

      mockAIGateway.generateContent.mockResolvedValue({
        content: mockContent,
        usage: { totalTokens: 2000 }
      });

      // Act
      const result = await service.generateChapter(topic, context);

      // Assert
      expect(result).toBeDefined();
      expect(result.title).toBe(topic);
      expect(result.orderIndex).toBe(context.chapterNumber);
      expect(result.content).toContain('Trinity');
      expect(result.content).toContain('Biblical Foundation');
      expect(result.readingTime).toBeGreaterThan(0);
      expect(mockAIGateway.generateContent).toHaveBeenCalledWith(
        expect.objectContaining({
          model: 'gpt-4',
          maxTokens: 4000,
          temperature: 0.7
        })
      );
    });

    it('should calculate reading time correctly', async () => {
      // Arrange
      const topic = 'Test Chapter';
      const context: ChapterContext = {
        bookTitle: 'Test Book',
        chapterNumber: 1,
        previousChapters: [],
        learningObjectives: ['Test objective'],
        targetAudience: 'beginner'
      };

      // Create content with approximately 450 words (2 minutes reading time)
      const words = Array(450).fill('word').join(' ');
      mockAIGateway.generateContent.mockResolvedValue({
        content: words,
        usage: { totalTokens: 600 }
      });

      // Act
      const result = await service.generateChapter(topic, context);

      // Assert
      expect(result.readingTime).toBe(2); // 450 words / 225 words per minute = 2 minutes
    });
  });

  describe('generateIntroduction', () => {
    it('should generate scroll-aligned introduction', async () => {
      // Arrange
      const bookMetadata = {
        authorAgent: 'ScrollAuthorGPT',
        version: '1.0.0',
        scrollIntegrityHash: 'hash123',
        generationDate: new Date(),
        lastValidated: new Date(),
        qualityScore: 0.95,
        theologicalAlignment: 0.98
      };

      const mockIntroduction = `
        Welcome to this journey of discovery and transformation...
        
        As you embark on this learning adventure, may the Lord guide your understanding...
        
        This textbook has been crafted with both academic rigor and spiritual sensitivity...
        
        May God bless your studies and use them for His kingdom purposes.
      `;

      mockAIGateway.generateContent.mockResolvedValue({
        content: mockIntroduction,
        usage: { totalTokens: 800 }
      });

      // Act
      const result = await service.generateIntroduction(bookMetadata);

      // Assert
      expect(result).toBeDefined();
      expect(result).toContain('journey');
      expect(result).toContain('Lord');
      expect(result).toContain('kingdom');
      expect(mockAIGateway.generateContent).toHaveBeenCalledWith(
        expect.objectContaining({
          model: 'gpt-4',
          temperature: 0.8
        })
      );
    });
  });

  describe('generateConclusion', () => {
    it('should generate prophetic conclusion with commissioning', async () => {
      // Arrange
      const bookSummary: BookSummary = {
        mainThemes: ['Divine sovereignty', 'Human responsibility', 'Kingdom purpose'],
        keyLearnings: ['God\'s character', 'Biblical worldview', 'Practical application'],
        practicalApplications: ['Prayer life', 'Ministry service', 'Leadership development']
      };

      const mockConclusion = `
        As we conclude this transformative journey together...
        
        The themes of divine sovereignty, human responsibility, and kingdom purpose...
        
        Now go forth, equipped with these truths, to transform the systems...
        
        May the Lord commission you for the work ahead. Amen.
      `;

      mockAIGateway.generateContent.mockResolvedValue({
        content: mockConclusion,
        usage: { totalTokens: 900 }
      });

      // Act
      const result = await service.generateConclusion(bookSummary);

      // Assert
      expect(result).toBeDefined();
      expect(result).toContain('sovereignty');
      expect(result).toContain('commission');
      expect(result).toContain('transform');
      expect(result).toContain('Amen');
    });
  });

  describe('scroll constitutional prompting', () => {
    it('should use scroll constitutional system prompt', async () => {
      // Arrange
      const topic = 'Test Topic';
      const context: ChapterContext = {
        bookTitle: 'Test Book',
        chapterNumber: 1,
        previousChapters: [],
        learningObjectives: ['Test'],
        targetAudience: 'beginner'
      };

      mockAIGateway.generateContent.mockResolvedValue({
        content: 'Test content',
        usage: { totalTokens: 100 }
      });

      // Act
      await service.generateChapter(topic, context);

      // Assert
      expect(mockAIGateway.generateContent).toHaveBeenCalledWith(
        expect.objectContaining({
          systemPrompt: expect.stringContaining('ScrollAuthorGPT')
        })
      );
      
      const systemPrompt = mockAIGateway.generateContent.mock.calls[0][0].systemPrompt;
      expect(systemPrompt).toContain('scroll tone');
      expect(systemPrompt).toContain('biblical worldview');
      expect(systemPrompt).toContain('theological accuracy');
      expect(systemPrompt).toContain('Scripture is the ultimate authority');
    });
  });
});