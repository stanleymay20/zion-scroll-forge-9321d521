import { ScrollScribeGPTService } from '../ScrollScribeGPTService';
import { AIGatewayService } from '../../AIGatewayService';
import { logger } from '../../../utils/logger';
import {
  FormatStyle,
  DiagramType,
  Chapter
} from '../../../types/scroll-library.types';

// Mock dependencies
jest.mock('../../AIGatewayService');
jest.mock('../../../utils/logger');

describe('ScrollScribeGPTService', () => {
  let service: ScrollScribeGPTService;
  let mockAIGateway: jest.Mocked<AIGatewayService>;

  beforeEach(() => {
    mockAIGateway = new AIGatewayService() as jest.Mocked<AIGatewayService>;
    service = new ScrollScribeGPTService();
    (service as any).aiGateway = mockAIGateway;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('formatContent', () => {
    it('should format content according to specified style', async () => {
      // Arrange
      const rawContent = 'This is raw content that needs formatting for academic presentation.';
      const style: FormatStyle = {
        type: 'academic',
        options: {
          fontSize: 12,
          lineHeight: 1.5,
          includeHeaders: true,
          includeTOC: true
        }
      };

      const mockFormattedContent = `
        # Academic Content

        ## Table of Contents
        1. Introduction
        2. Main Content
        3. Conclusion

        ## Introduction
        This is **formatted content** that maintains *scroll tone* while providing academic rigor.

        ## Main Content
        The content has been structured with proper headings and emphasis for enhanced readability.

        ## Conclusion
        May this formatted content serve kingdom purposes in your learning journey.
      `;

      mockAIGateway.generateContent.mockResolvedValue({
        content: mockFormattedContent,
        usage: { totalTokens: 800 }
      });

      // Act
      const result = await service.formatContent(rawContent, style);

      // Assert
      expect(result).toBeDefined();
      expect(result.originalContent).toBe(rawContent);
      expect(result.formattedContent).toContain('# Academic Content');
      expect(result.style).toEqual(style);
      expect(result.metadata.formattingAgent).toBe('ScrollScribeGPT');
      expect(result.metadata.wordCount).toBeGreaterThan(0);
      expect(result.metadata.readingTime).toBeGreaterThan(0);
      expect(mockAIGateway.generateContent).toHaveBeenCalledWith(
        expect.objectContaining({
          model: 'gpt-4',
          maxTokens: 2000,
          temperature: 0.5
        })
      );
    });

    it('should calculate metadata correctly', async () => {
      // Arrange
      const rawContent = 'Short content for testing.';
      const style: FormatStyle = {
        type: 'textbook',
        options: {}
      };

      // Create content with approximately 225 words (1 minute reading time)
      const words = Array(225).fill('word').join(' ');
      mockAIGateway.generateContent.mockResolvedValue({
        content: words,
        usage: { totalTokens: 300 }
      });

      // Act
      const result = await service.formatContent(rawContent, style);

      // Assert
      expect(result.metadata.wordCount).toBe(225);
      expect(result.metadata.readingTime).toBe(1);
      expect(result.metadata.pageCount).toBe(1); // 225 words / 300 words per page for textbook
    });
  });

  describe('generateDiagram', () => {
    it('should generate valid Mermaid diagram', async () => {
      // Arrange
      const description = 'Create a flowchart showing the process of spiritual formation';
      const type: DiagramType = 'mermaid';

      const mockDiagramResponse = `
        \`\`\`mermaid
        flowchart TD
            A[Prayer & Scripture] --> B[Spiritual Disciplines]
            B --> C[Character Formation]
            C --> D[Kingdom Service]
            D --> E[Multiplication]
        \`\`\`

        CAPTION: This flowchart illustrates the progressive stages of spiritual formation in the believer's journey.
      `;

      mockAIGateway.generateContent.mockResolvedValue({
        content: mockDiagramResponse,
        usage: { totalTokens: 400 }
      });

      // Act
      const result = await service.generateDiagram(description, type);

      // Assert
      expect(result).toBeDefined();
      expect(result.type).toBe(type);
      expect(result.content).toContain('flowchart TD');
      expect(result.content).toContain('Prayer & Scripture');
      expect(result.caption).toContain('spiritual formation');
      expect(mockAIGateway.generateContent).toHaveBeenCalledWith(
        expect.objectContaining({
          model: 'gpt-4',
          maxTokens: 1500,
          temperature: 0.4
        })
      );
    });

    it('should retry on invalid Mermaid syntax', async () => {
      // Arrange
      const description = 'Create a simple process diagram';
      const type: DiagramType = 'mermaid';

      const invalidMermaidResponse = `
        Invalid mermaid syntax without proper structure
        CAPTION: Invalid diagram
      `;

      const validMermaidResponse = `
        \`\`\`mermaid
        graph LR
            A[Start] --> B[Process]
            B --> C[End]
        \`\`\`

        CAPTION: Valid process diagram
      `;

      mockAIGateway.generateContent
        .mockResolvedValueOnce({
          content: invalidMermaidResponse,
          usage: { totalTokens: 200 }
        })
        .mockResolvedValueOnce({
          content: validMermaidResponse,
          usage: { totalTokens: 300 }
        });

      // Act
      const result = await service.generateDiagram(description, type);

      // Assert
      expect(result.content).toContain('graph LR');
      expect(mockAIGateway.generateContent).toHaveBeenCalledTimes(2);
      expect(logger.warn).toHaveBeenCalledWith(
        'Invalid Mermaid syntax detected, regenerating...',
        { description }
      );
    });
  });

  describe('generateTable', () => {
    it('should generate structured table from data', async () => {
      // Arrange
      const headers = ['Course', 'Credits', 'Level', 'Prerequisites'];
      const data = [
        { Course: 'Biblical Theology', Credits: 3, Level: 'Intermediate', Prerequisites: 'Intro to Theology' },
        { Course: 'Church History', Credits: 3, Level: 'Beginner', Prerequisites: 'None' },
        { Course: 'Systematic Theology', Credits: 4, Level: 'Advanced', Prerequisites: 'Biblical Theology' }
      ];

      const mockTableResponse = `
        {
          "title": "ScrollUniversity Course Catalog",
          "caption": "Overview of core theology courses with credit requirements and prerequisites",
          "formatting": {
            "columnAlignments": ["left", "center", "center", "left"],
            "specialFormatting": [
              {"row": 0, "column": 0, "style": "bold"},
              {"row": 2, "column": 2, "style": "italic"}
            ]
          }
        }
      `;

      mockAIGateway.generateContent.mockResolvedValue({
        content: mockTableResponse,
        usage: { totalTokens: 600 }
      });

      // Act
      const result = await service.generateTable(data, headers);

      // Assert
      expect(result).toBeDefined();
      expect(result.headers).toEqual(headers);
      expect(result.rows).toHaveLength(3);
      expect(result.title).toBe('ScrollUniversity Course Catalog');
      expect(result.caption).toContain('theology courses');
      expect(result.style.responsive).toBe(true);
      expect(result.rows[0].cells[0].content).toBe('Biblical Theology');
      expect(result.rows[0].cells[1].content).toBe('3');
    });

    it('should handle parsing errors gracefully', async () => {
      // Arrange
      const headers = ['Name', 'Value'];
      const data = [{ Name: 'Test', Value: 'Data' }];

      const invalidResponse = 'Invalid JSON response that cannot be parsed';

      mockAIGateway.generateContent.mockResolvedValue({
        content: invalidResponse,
        usage: { totalTokens: 100 }
      });

      // Act
      const result = await service.generateTable(data, headers);

      // Assert
      expect(result).toBeDefined();
      expect(result.title).toBe('Generated Table');
      expect(result.caption).toBe('Table generated by ScrollScribeGPT');
      expect(result.headers).toEqual(headers);
      expect(result.rows).toHaveLength(1);
    });
  });

  describe('generateVisualSummary', () => {
    it('should generate comprehensive visual summary for chapter', async () => {
      // Arrange
      const chapter: Chapter = {
        id: 'chapter_1',
        bookId: 'book_1',
        title: 'The Nature of Scripture',
        orderIndex: 1,
        content: `
          Scripture stands as the foundational authority for Christian faith and practice.
          The doctrine of inspiration reveals how God breathed His truth through human authors.
          Understanding biblical authority transforms how we approach theology and ministry.
          Practical application includes daily Bible study, sermon preparation, and counseling.
        `,
        diagrams: [],
        references: [],
        summaries: [],
        exercises: [],
        readingTime: 15,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      const mockVisualSummaryResponse = `
        {
          "keyPoints": [
            {
              "text": "Scripture is the foundational authority for Christian faith",
              "importance": "critical",
              "category": "concept"
            },
            {
              "text": "Divine inspiration through human authors",
              "importance": "important",
              "category": "concept"
            },
            {
              "text": "Practical application in ministry and counseling",
              "importance": "important",
              "category": "application"
            }
          ],
          "diagramDescriptions": [
            {
              "description": "Process of biblical inspiration showing divine-human cooperation",
              "type": "mermaid",
              "purpose": "Illustrate the doctrine of inspiration"
            }
          ],
          "infographics": [
            {
              "title": "Biblical Authority Framework",
              "type": "hierarchy",
              "elements": ["Scripture", "Tradition", "Reason", "Experience"]
            }
          ],
          "mindMap": {
            "centralTopic": "Scripture",
            "branches": ["Inspiration", "Authority", "Interpretation", "Application"]
          },
          "timeline": null
        }
      `;

      const mockDiagramResponse = `
        \`\`\`mermaid
        flowchart TD
            A[Divine Initiative] --> B[Human Authors]
            B --> C[Written Scripture]
            C --> D[Preserved Truth]
        \`\`\`

        CAPTION: The process of biblical inspiration
      `;

      mockAIGateway.generateContent.mockResolvedValue({
        content: mockVisualSummaryResponse,
        usage: { totalTokens: 1000 }
      });

      // Mock the generateDiagram method to return expected diagram
      const mockDiagram = {
        id: 'diagram_test',
        type: 'mermaid' as DiagramType,
        content: 'flowchart TD\n    A[Divine Initiative] --> B[Human Authors]\n    B --> C[Written Scripture]\n    C --> D[Preserved Truth]',
        caption: 'The process of biblical inspiration'
      };
      
      jest.spyOn(service, 'generateDiagram').mockResolvedValue(mockDiagram);

      // Act
      const result = await service.generateVisualSummary(chapter);

      // Assert
      expect(result).toBeDefined();
      expect(result.chapterId).toBe(chapter.id);
      expect(result.title).toContain('The Nature of Scripture');
      expect(result.keyPoints).toHaveLength(3);
      expect(result.keyPoints[0].importance).toBe('critical');
      expect(result.diagrams).toHaveLength(1);
      expect(result.diagrams[0].content).toContain('flowchart TD');
      expect(result.mindMap?.centralTopic).toBe('Scripture');
      expect(mockAIGateway.generateContent).toHaveBeenCalledTimes(1);
    });

    it('should handle empty diagram descriptions', async () => {
      // Arrange
      const chapter: Chapter = {
        id: 'chapter_2',
        bookId: 'book_1',
        title: 'Simple Chapter',
        orderIndex: 2,
        content: 'Simple content without complex concepts.',
        diagrams: [],
        references: [],
        summaries: [],
        exercises: [],
        readingTime: 5,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      const mockResponse = `
        {
          "keyPoints": [],
          "diagramDescriptions": [],
          "infographics": [],
          "mindMap": null,
          "timeline": null
        }
      `;

      mockAIGateway.generateContent.mockResolvedValue({
        content: mockResponse,
        usage: { totalTokens: 200 }
      });

      // Act
      const result = await service.generateVisualSummary(chapter);

      // Assert
      expect(result).toBeDefined();
      expect(result.keyPoints).toHaveLength(0);
      expect(result.diagrams).toHaveLength(0);
      expect(result.infographics).toHaveLength(0);
    });
  });

  describe('scroll constitutional prompting', () => {
    it('should use scroll constitutional system prompt', async () => {
      // Arrange
      const rawContent = 'Test content';
      const style: FormatStyle = {
        type: 'textbook',
        options: {}
      };

      mockAIGateway.generateContent.mockResolvedValue({
        content: 'Formatted content',
        usage: { totalTokens: 100 }
      });

      // Act
      await service.formatContent(rawContent, style);

      // Assert
      expect(mockAIGateway.generateContent).toHaveBeenCalledWith(
        expect.objectContaining({
          systemPrompt: expect.stringContaining('ScrollScribeGPT')
        })
      );
      
      const systemPrompt = mockAIGateway.generateContent.mock.calls[0][0].systemPrompt;
      expect(systemPrompt).toContain('scroll tone');
      expect(systemPrompt).toContain('Mermaid.js syntax');
      expect(systemPrompt).toContain('kingdom purposes');
      expect(systemPrompt).toContain('theological accuracy');
    });
  });

  describe('error handling', () => {
    it('should handle AI gateway errors gracefully', async () => {
      // Arrange
      const rawContent = 'Test content';
      const style: FormatStyle = {
        type: 'academic',
        options: {}
      };

      mockAIGateway.generateContent.mockRejectedValue(new Error('AI service unavailable'));

      // Act & Assert
      await expect(service.formatContent(rawContent, style)).rejects.toThrow('AI service unavailable');
      expect(logger.error).toHaveBeenCalledWith(
        'Content formatting failed',
        expect.objectContaining({
          error: expect.any(Error),
          style
        })
      );
    });

    it('should handle diagram generation errors', async () => {
      // Arrange
      const description = 'Test diagram';
      const type: DiagramType = 'mermaid';

      mockAIGateway.generateContent.mockRejectedValue(new Error('Diagram generation failed'));

      // Act & Assert
      await expect(service.generateDiagram(description, type)).rejects.toThrow('Diagram generation failed');
      expect(logger.error).toHaveBeenCalledWith(
        'Diagram generation failed',
        expect.objectContaining({
          error: expect.any(Error),
          description,
          type
        })
      );
    });
  });
});