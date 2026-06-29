import { AIGatewayService } from '../AIGatewayService';
import { logger } from '../../utils/logger';
import { agentConfigs } from '../../config/scroll-library.config';
import {
  FormattedContent,
  FormatStyle,
  Diagram,
  DiagramType,
  Table,
  TableRow,
  TableCell,
  TableStyle,
  VisualSummary,
  Chapter,
  KeyPoint,
  Infographic,
  MindMap,
  Timeline,
  ValidationResult
} from '../../types/scroll-library.types';

/**
 * ScrollScribeGPT Service for content formatting and visual element generation
 * Specializes in creating diagrams, tables, and visual summaries with scroll tone
 */
export class ScrollScribeGPTService {
  private aiGateway: AIGatewayService;
  private scrollFormattingPrompt: string;

  constructor() {
    this.aiGateway = new AIGatewayService();
    this.scrollFormattingPrompt = this.buildScrollFormattingPrompt();
  }

  /**
   * Formats raw content according to specified style guidelines
   */
  async formatContent(rawContent: string, style: FormatStyle): Promise<FormattedContent> {
    try {
      logger.info('Starting content formatting', { 
        contentLength: rawContent.length, 
        formatType: style.type 
      });

      const prompt = this.buildFormattingPrompt(rawContent, style);
      
      const response = await this.aiGateway.generateContent({
        model: agentConfigs.scrollScribeGPT.model,
        prompt,
        maxTokens: agentConfigs.scrollScribeGPT.maxTokens,
        temperature: agentConfigs.scrollScribeGPT.temperature,
        systemPrompt: this.scrollFormattingPrompt
      });

      const formattedContent: FormattedContent = {
        id: `formatted_${Date.now()}`,
        originalContent: rawContent,
        formattedContent: response.content,
        style,
        metadata: {
          wordCount: this.countWords(response.content),
          pageCount: this.estimatePageCount(response.content, style),
          readingTime: this.calculateReadingTime(response.content),
          complexity: await this.assessComplexity(response.content),
          formattingAgent: 'ScrollScribeGPT'
        },
        createdAt: new Date()
      };

      logger.info('Content formatting completed', { 
        formattedContentId: formattedContent.id,
        wordCount: formattedContent.metadata.wordCount
      });

      return formattedContent;
    } catch (error) {
      logger.error('Content formatting failed', { error, style });
      throw error;
    }
  }

  /**
   * Generates diagrams using Mermaid.js syntax
   */
  async generateDiagram(description: string, type: DiagramType): Promise<Diagram> {
    try {
      logger.info('Starting diagram generation', { description, type });

      const prompt = this.buildDiagramPrompt(description, type);
      
      const response = await this.aiGateway.generateContent({
        model: agentConfigs.scrollScribeGPT.model,
        prompt,
        maxTokens: 1500,
        temperature: 0.4,
        systemPrompt: this.scrollFormattingPrompt
      });

      // Validate Mermaid syntax
      const mermaidContent = this.extractMermaidContent(response.content);
      const isValidMermaid = await this.validateMermaidSyntax(mermaidContent);
      
      if (!isValidMermaid) {
        logger.warn('Invalid Mermaid syntax detected, regenerating...', { description });
        
        const retryPrompt = this.buildDiagramPrompt(description, type, true);
        const retryResponse = await this.aiGateway.generateContent({
          model: agentConfigs.scrollScribeGPT.model,
          prompt: retryPrompt,
          maxTokens: 1500,
          temperature: 0.3,
          systemPrompt: this.scrollFormattingPrompt
        });
        
        response.content = retryResponse.content;
      }

      const diagram: Diagram = {
        id: `diagram_${Date.now()}`,
        type,
        content: this.extractMermaidContent(response.content),
        caption: this.extractCaption(response.content, description)
      };

      logger.info('Diagram generation completed', { diagramId: diagram.id, type });
      return diagram;
    } catch (error) {
      logger.error('Diagram generation failed', { error, description, type });
      throw error;
    }
  }

  /**
   * Generates structured tables from data and headers
   */
  async generateTable(data: any[], headers: string[]): Promise<Table> {
    try {
      logger.info('Starting table generation', { 
        dataRows: data.length, 
        headerCount: headers.length 
      });

      const prompt = this.buildTablePrompt(data, headers);
      
      const response = await this.aiGateway.generateContent({
        model: agentConfigs.scrollScribeGPT.model,
        prompt,
        maxTokens: 2000,
        temperature: 0.3,
        systemPrompt: this.scrollFormattingPrompt
      });

      // Parse the AI response to extract table structure
      const tableStructure = await this.parseTableResponse(response.content);
      
      const table: Table = {
        id: `table_${Date.now()}`,
        title: tableStructure.title,
        headers,
        rows: this.processTableRows(data, headers, tableStructure.formatting),
        style: this.getDefaultTableStyle(),
        caption: tableStructure.caption,
        createdAt: new Date()
      };

      logger.info('Table generation completed', { 
        tableId: table.id, 
        rowCount: table.rows.length 
      });

      return table;
    } catch (error) {
      logger.error('Table generation failed', { error, headers });
      throw error;
    }
  }

  /**
   * Generates comprehensive visual summary for a chapter
   */
  async generateVisualSummary(chapter: Chapter): Promise<VisualSummary> {
    try {
      logger.info('Starting visual summary generation', { 
        chapterId: chapter.id, 
        chapterTitle: chapter.title 
      });

      const prompt = this.buildVisualSummaryPrompt(chapter);
      
      const response = await this.aiGateway.generateContent({
        model: agentConfigs.scrollScribeGPT.model,
        prompt,
        maxTokens: agentConfigs.scrollScribeGPT.maxTokens,
        temperature: 0.6,
        systemPrompt: this.scrollFormattingPrompt
      });

      // Parse the comprehensive visual summary response
      const summaryData = await this.parseVisualSummaryResponse(response.content);
      
      // Generate supporting diagrams
      const diagrams = await this.generateSupportingDiagrams(summaryData.diagramDescriptions);
      
      const visualSummary: VisualSummary = {
        id: `visual_summary_${Date.now()}`,
        chapterId: chapter.id,
        title: `Visual Summary: ${chapter.title}`,
        keyPoints: summaryData.keyPoints,
        diagrams,
        infographics: summaryData.infographics,
        mindMap: summaryData.mindMap,
        timeline: summaryData.timeline,
        createdAt: new Date()
      };

      logger.info('Visual summary generation completed', { 
        visualSummaryId: visualSummary.id,
        keyPointsCount: visualSummary.keyPoints.length,
        diagramsCount: visualSummary.diagrams.length
      });

      return visualSummary;
    } catch (error) {
      logger.error('Visual summary generation failed', { error, chapterId: chapter.id });
      throw error;
    }
  }

  private buildScrollFormattingPrompt(): string {
    return `
      You are ScrollScribeGPT, an AI agent specializing in content formatting and visual element creation.
      You operate under Scroll Context-Constitutional Prompting (SCCP) principles.
      
      CORE RESPONSIBILITIES:
      1. Format content with scroll tone: warm, wise, accessible, prophetic but grounded
      2. Create clear, educational diagrams using Mermaid.js syntax
      3. Design structured tables that enhance learning
      4. Generate visual summaries that aid comprehension and retention
      
      FORMATTING PRINCIPLES:
      - Maintain scroll tone throughout all formatting decisions
      - Prioritize clarity and accessibility over complexity
      - Use visual elements to support spiritual and academic formation
      - Ensure all content serves kingdom purposes and divine governance
      
      VISUAL DESIGN STANDARDS:
      - Clean, professional layouts that reflect ScrollUniversity's excellence
      - Consistent styling that supports the scroll aesthetic
      - Accessible design following WCAG guidelines
      - Integration of biblical and academic elements naturally
      
      TECHNICAL REQUIREMENTS:
      - Use valid Mermaid.js syntax for all diagrams
      - Generate responsive, semantic HTML structures
      - Include proper accessibility attributes
      - Optimize for both digital and print formats
      
      NEVER compromise on scroll tone or theological accuracy for visual appeal.
    `;
  }

  private buildFormattingPrompt(content: string, style: FormatStyle): string {
    return `
      Format the following content according to ${style.type} style guidelines:
      
      CONTENT TO FORMAT:
      ${content}
      
      FORMATTING REQUIREMENTS:
      - Style Type: ${style.type}
      - Include Headers: ${style.options.includeHeaders || false}
      - Include TOC: ${style.options.includeTOC || false}
      - Font Size: ${style.options.fontSize || 12}pt
      - Line Height: ${style.options.lineHeight || 1.5}
      
      FORMAT SPECIFICATIONS:
      1. Apply appropriate heading hierarchy (H1-H6)
      2. Use proper paragraph spacing and indentation
      3. Add emphasis (bold/italic) for key concepts
      4. Include callout boxes for important information
      5. Format citations and references properly
      6. Maintain scroll tone throughout
      
      OUTPUT REQUIREMENTS:
      - Return formatted content in Markdown format
      - Include metadata comments for styling hints
      - Preserve all theological and academic content
      - Enhance readability without changing meaning
      
      Generate the formatted content now.
    `;
  }

  private buildDiagramPrompt(description: string, type: DiagramType, isRetry: boolean = false): string {
    const retryInstructions = isRetry ? `
      CRITICAL: The previous attempt had invalid Mermaid syntax. 
      Please ensure strict adherence to Mermaid.js syntax rules.
      Validate each node, edge, and syntax element before responding.
    ` : '';

    return `
      Generate a ${type} diagram using Mermaid.js syntax for the following description:
      
      DESCRIPTION: ${description}
      
      ${retryInstructions}
      
      DIAGRAM REQUIREMENTS:
      - Use valid Mermaid.js syntax only
      - Create clear, educational visualization
      - Include appropriate labels and connections
      - Maintain scroll tone in all text elements
      - Ensure diagram supports learning objectives
      
      MERMAID SYNTAX GUIDELINES:
      - Start with proper diagram type declaration
      - Use consistent node naming conventions
      - Include meaningful labels and descriptions
      - Apply appropriate styling where supported
      
      OUTPUT FORMAT:
      \`\`\`mermaid
      [Your Mermaid diagram code here]
      \`\`\`
      
      CAPTION: [Descriptive caption explaining the diagram's purpose and key insights]
      
      Generate the diagram now.
    `;
  }

  private buildTablePrompt(data: any[], headers: string[]): string {
    return `
      Generate a well-structured table with the following specifications:
      
      HEADERS: ${headers.join(', ')}
      DATA SAMPLE: ${JSON.stringify(data.slice(0, 3), null, 2)}
      TOTAL ROWS: ${data.length}
      
      TABLE REQUIREMENTS:
      1. Create appropriate title reflecting the data content
      2. Suggest optimal formatting for each column type
      3. Recommend alignment (left/center/right) for each column
      4. Identify which cells should have special formatting (bold, italic, etc.)
      5. Provide descriptive caption explaining the table's significance
      6. Maintain scroll tone in all text elements
      
      FORMATTING CONSIDERATIONS:
      - Ensure readability across different screen sizes
      - Use appropriate data types (text, number, date, etc.)
      - Highlight important values or patterns
      - Include totals or summaries where relevant
      
      OUTPUT FORMAT (JSON):
      {
        "title": "Table title",
        "caption": "Descriptive caption",
        "formatting": {
          "columnAlignments": ["left", "center", "right"],
          "specialFormatting": [
            {"row": 0, "column": 1, "style": "bold"},
            {"row": 2, "column": 0, "style": "italic"}
          ]
        }
      }
      
      Generate the table structure now.
    `;
  }

  private buildVisualSummaryPrompt(chapter: Chapter): string {
    return `
      Create a comprehensive visual summary for the following chapter:
      
      CHAPTER TITLE: ${chapter.title}
      CHAPTER CONTENT: ${chapter.content.substring(0, 2000)}...
      READING TIME: ${chapter.readingTime} minutes
      
      VISUAL SUMMARY REQUIREMENTS:
      1. Extract 5-8 key points with importance levels (critical/important/supplementary)
      2. Identify concepts suitable for diagram visualization
      3. Design infographic elements that enhance understanding
      4. Create mind map structure if applicable
      5. Develop timeline if chronological elements exist
      6. Maintain scroll tone throughout all visual elements
      
      KEY POINTS CRITERIA:
      - Focus on transformational insights, not just information
      - Connect academic concepts to spiritual formation
      - Highlight practical applications for ministry and service
      - Include biblical integration points
      
      DIAGRAM DESCRIPTIONS:
      - Provide 2-3 diagram concepts with detailed descriptions
      - Specify diagram types (flowchart, concept map, process, etc.)
      - Include Mermaid.js implementation hints
      
      OUTPUT FORMAT (JSON):
      {
        "keyPoints": [
          {
            "text": "Key insight text",
            "importance": "critical|important|supplementary",
            "category": "concept|application|integration"
          }
        ],
        "diagramDescriptions": [
          {
            "description": "Detailed diagram description",
            "type": "mermaid|chart|illustration",
            "purpose": "Educational purpose"
          }
        ],
        "infographics": [
          {
            "title": "Infographic title",
            "type": "process|comparison|hierarchy",
            "elements": ["element1", "element2"]
          }
        ],
        "mindMap": {
          "centralTopic": "Main concept",
          "branches": ["branch1", "branch2", "branch3"]
        },
        "timeline": {
          "title": "Timeline title",
          "events": [
            {"title": "Event", "description": "Description", "order": 1}
          ]
        }
      }
      
      Generate the visual summary structure now.
    `;
  }

  private extractMermaidContent(response: string): string {
    const mermaidMatch = response.match(/```mermaid\n([\s\S]*?)\n```/);
    return mermaidMatch ? mermaidMatch[1].trim() : response.trim();
  }

  private extractCaption(response: string, fallbackDescription: string): string {
    const captionMatch = response.match(/CAPTION:\s*(.*?)(?:\n|$)/i);
    return captionMatch ? captionMatch[1].trim() : `Diagram illustrating: ${fallbackDescription}`;
  }

  private async validateMermaidSyntax(mermaidCode: string): Promise<boolean> {
    try {
      // Basic syntax validation - check for common Mermaid patterns
      const validPatterns = [
        /^(graph|flowchart|sequenceDiagram|classDiagram|stateDiagram|erDiagram|journey|gantt|pie|gitgraph)/,
        /-->/,
        /\[.*\]/,
        /\(.*\)/
      ];

      const hasValidStart = validPatterns[0].test(mermaidCode);
      const hasValidElements = validPatterns.slice(1).some(pattern => pattern.test(mermaidCode));

      return hasValidStart && hasValidElements;
    } catch (error) {
      logger.error('Mermaid syntax validation failed', { error });
      return false;
    }
  }

  private async parseTableResponse(response: string): Promise<any> {
    try {
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
      
      // Fallback parsing if JSON format is not found
      return {
        title: 'Generated Table',
        caption: 'Table generated by ScrollScribeGPT',
        formatting: {
          columnAlignments: ['left'],
          specialFormatting: []
        }
      };
    } catch (error) {
      logger.error('Table response parsing failed', { error });
      return {
        title: 'Generated Table',
        caption: 'Table generated by ScrollScribeGPT',
        formatting: {
          columnAlignments: ['left'],
          specialFormatting: []
        }
      };
    }
  }

  private async parseVisualSummaryResponse(response: string): Promise<any> {
    try {
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
      
      // Fallback structure
      return {
        keyPoints: [],
        diagramDescriptions: [],
        infographics: [],
        mindMap: null,
        timeline: null
      };
    } catch (error) {
      logger.error('Visual summary response parsing failed', { error });
      return {
        keyPoints: [],
        diagramDescriptions: [],
        infographics: [],
        mindMap: null,
        timeline: null
      };
    }
  }

  private processTableRows(data: any[], headers: string[], formatting: any): TableRow[] {
    return data.map((rowData, rowIndex) => ({
      cells: headers.map((header, colIndex) => ({
        content: String(rowData[header] || ''),
        type: this.inferCellType(rowData[header]),
        alignment: formatting.columnAlignments?.[colIndex] || 'left',
        formatting: this.getSpecialFormatting(rowIndex, colIndex, formatting.specialFormatting)
      }))
    }));
  }

  private inferCellType(value: any): 'text' | 'number' | 'date' | 'boolean' | 'link' {
    if (typeof value === 'boolean') return 'boolean';
    if (typeof value === 'number') return 'number';
    if (value instanceof Date) return 'date';
    if (typeof value === 'string' && value.startsWith('http')) return 'link';
    return 'text';
  }

  private getSpecialFormatting(row: number, col: number, specialFormatting: any[]): any {
    const formatting = specialFormatting?.find(f => f.row === row && f.column === col);
    return formatting ? { [formatting.style]: true } : {};
  }

  private getDefaultTableStyle(): TableStyle {
    return {
      borderStyle: 'solid',
      headerStyle: {
        backgroundColor: '#f8f9fa',
        textColor: '#212529',
        bold: true,
        fontSize: 14
      },
      alternateRowColors: true,
      responsive: true
    };
  }

  private async generateSupportingDiagrams(descriptions: any[]): Promise<Diagram[]> {
    const diagrams: Diagram[] = [];
    
    for (const desc of descriptions) {
      try {
        const diagram = await this.generateDiagram(desc.description, desc.type);
        diagrams.push(diagram);
      } catch (error) {
        logger.error('Supporting diagram generation failed', { error, description: desc });
      }
    }
    
    return diagrams;
  }

  private countWords(text: string): number {
    return text.split(/\s+/).filter(word => word.length > 0).length;
  }

  private estimatePageCount(text: string, style: FormatStyle): number {
    const wordsPerPage = style.type === 'textbook' ? 300 : 250;
    return Math.ceil(this.countWords(text) / wordsPerPage);
  }

  private calculateReadingTime(text: string): number {
    const wordCount = this.countWords(text);
    return Math.ceil(wordCount / 225); // 225 words per minute average
  }

  private async assessComplexity(text: string): Promise<number> {
    try {
      // Simple complexity assessment based on sentence length and vocabulary
      const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);
      const avgSentenceLength = sentences.reduce((sum, s) => sum + s.split(/\s+/).length, 0) / sentences.length;
      
      // Normalize to 0-1 scale (assuming 15 words per sentence as baseline)
      const complexity = Math.min(avgSentenceLength / 30, 1);
      return Math.round(complexity * 100) / 100;
    } catch (error) {
      logger.error('Complexity assessment failed', { error });
      return 0.5; // Default medium complexity
    }
  }
}

export default ScrollScribeGPTService;