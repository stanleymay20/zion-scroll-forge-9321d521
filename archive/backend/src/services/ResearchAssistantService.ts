/**
 * ScrollUniversity Research Assistant Service
 * "The Spirit of truth will guide you into all truth" - John 16:13
 * 
 * Provides AI-powered research assistance including literature review,
 * paper summarization, methodology suggestions, and citation formatting
 */

import axios from 'axios';
import { aiGatewayService } from './AIGatewayService';
import { logger } from '../utils/productionLogger';
import {
    AcademicPaper,
    PaperSummary,
    LiteratureReview,
    ResearchScope,
    MethodologySuggestion,
    ResearchProposal,
    Citation,
    FormattedCitation,
    Bibliography,
    CitationStyle,
    ResearchFeedback,
    ResearchPaper,
    SemanticScholarResponse,
    SemanticScholarSearchParams,
    ConceptMap
} from '../types/research.types';

export class ResearchAssistantService {
    private semanticScholarApiKey: string;
    private semanticScholarBaseUrl: string;

    constructor() {
        this.semanticScholarApiKey = process.env.SEMANTIC_SCHOLAR_API_KEY || '';
        this.semanticScholarBaseUrl = 'https://api.semanticscholar.org/graph/v1';
        
        logger.info('Research Assistant Service initialized', {
            semanticScholarConfigured: !!this.semanticScholarApiKey
        });
    }

    /**
     * Conduct comprehensive literature review
     */
    async conductLiteratureReview(scope: ResearchScope): Promise<LiteratureReview> {
        try {
            logger.info('Starting literature review', { topic: scope.topic });

            // Search for relevant papers
            const papers = await this.searchAcademicPapers(scope);

            // Summarize key papers
            const keyPapers = await this.summarizeMultiplePapers(
                papers.slice(0, scope.maxPapers || 20)
            );

            // Identify research gaps using AI
            const researchGaps = await this.identifyResearchGaps(keyPapers, scope.topic);

            // Extract methodologies
            const methodologies = await this.extractMethodologies(keyPapers);

            // Identify theoretical frameworks
            const theoreticalFrameworks = await this.identifyTheoreticalFrameworks(keyPapers);

            // Generate concept map
            const synthesisMap = await this.generateConceptMap(keyPapers, scope.topic);

            // Generate recommendations
            const recommendations = await this.generateRecommendations(
                keyPapers,
                researchGaps,
                scope.topic
            );

            const review: LiteratureReview = {
                topic: scope.topic,
                searchQuery: this.buildSearchQuery(scope),
                totalPapers: papers.length,
                keyPapers,
                researchGaps,
                methodologies,
                theoreticalFrameworks,
                synthesisMap,
                recommendations,
                generatedAt: new Date()
            };

            logger.info('Literature review completed', {
                topic: scope.topic,
                papersAnalyzed: keyPapers.length,
                gapsIdentified: researchGaps.length
            });

            return review;

        } catch (error: any) {
            logger.error('Literature review error', {
                topic: scope.topic,
                error: error.message
            });
            throw new Error(`Failed to conduct literature review: ${error.message}`);
        }
    }

    /**
     * Search academic databases for papers
     */
    async searchAcademicPapers(scope: ResearchScope): Promise<AcademicPaper[]> {
        try {
            const searchParams: SemanticScholarSearchParams = {
                query: this.buildSearchQuery(scope),
                limit: scope.maxPapers || 100,
                fields: [
                    'paperId',
                    'title',
                    'authors',
                    'year',
                    'abstract',
                    'url',
                    'citationCount',
                    'influentialCitationCount',
                    'venue',
                    'publicationTypes',
                    'fieldsOfStudy'
                ]
            };

            // Add year filter if specified
            if (scope.yearRange) {
                searchParams.year = `${scope.yearRange.start}-${scope.yearRange.end}`;
            }

            // Add fields of study filter
            if (scope.fieldsOfStudy && scope.fieldsOfStudy.length > 0) {
                searchParams.fieldsOfStudy = scope.fieldsOfStudy;
            }

            const response = await axios.get<SemanticScholarResponse>(
                `${this.semanticScholarBaseUrl}/paper/search`,
                {
                    params: searchParams,
                    headers: this.semanticScholarApiKey ? {
                        'x-api-key': this.semanticScholarApiKey
                    } : {}
                }
            );

            let papers = response.data.data || [];

            // Filter by minimum citations if specified
            if (scope.minCitations) {
                papers = papers.filter(p => p.citationCount >= scope.minCitations!);
            }

            // Sort by citation count
            papers.sort((a, b) => b.citationCount - a.citationCount);

            logger.info('Academic papers retrieved', {
                query: searchParams.query,
                count: papers.length
            });

            return papers;

        } catch (error: any) {
            logger.error('Paper search error', {
                scope,
                error: error.message
            });
            throw new Error(`Failed to search papers: ${error.message}`);
        }
    }

    /**
     * Summarize a single paper
     */
    async summarizePaper(paper: AcademicPaper): Promise<PaperSummary> {
        try {
            const prompt = `Analyze this academic paper and provide a structured summary:

Title: ${paper.title}
Authors: ${paper.authors.map(a => a.name).join(', ')}
Year: ${paper.year}
Abstract: ${paper.abstract}

Provide:
1. Key findings (3-5 bullet points)
2. Methodology used
3. Limitations identified
4. Connections to other research areas
5. Overall relevance score (0-100)
6. Brief summary (2-3 sentences)

Format as JSON with keys: keyFindings, methodology, limitations, connections, relevanceScore, summary`;

            const response = await aiGatewayService.generateCompletion({
                model: 'gpt-4-turbo',
                messages: [
                    {
                        role: 'system',
                        content: 'You are an expert research assistant helping to analyze academic papers. Provide structured, insightful analysis.'
                    },
                    {
                        role: 'user',
                        content: prompt
                    }
                ],
                temperature: 0.3,
                maxTokens: 1500
            });

            const analysis = JSON.parse(response.content);

            const summary: PaperSummary = {
                paperId: paper.paperId,
                title: paper.title,
                authors: paper.authors.map(a => a.name),
                year: paper.year,
                keyFindings: analysis.keyFindings || [],
                methodology: analysis.methodology || '',
                limitations: analysis.limitations || [],
                connections: analysis.connections || [],
                relevanceScore: analysis.relevanceScore || 50,
                summary: analysis.summary || ''
            };

            return summary;

        } catch (error: any) {
            logger.error('Paper summarization error', {
                paperId: paper.paperId,
                error: error.message
            });
            
            // Return basic summary on error
            return {
                paperId: paper.paperId,
                title: paper.title,
                authors: paper.authors.map(a => a.name),
                year: paper.year,
                keyFindings: [],
                methodology: 'Unable to extract',
                limitations: [],
                connections: [],
                relevanceScore: 50,
                summary: paper.abstract.substring(0, 200) + '...'
            };
        }
    }

    /**
     * Summarize multiple papers
     */
    async summarizeMultiplePapers(papers: AcademicPaper[]): Promise<PaperSummary[]> {
        const summaries: PaperSummary[] = [];

        for (const paper of papers) {
            try {
                const summary = await this.summarizePaper(paper);
                summaries.push(summary);
            } catch (error: any) {
                logger.warn('Skipping paper due to error', {
                    paperId: paper.paperId,
                    error: error.message
                });
            }
        }

        return summaries;
    }

    /**
     * Identify research gaps
     */
    private async identifyResearchGaps(papers: PaperSummary[], topic: string): Promise<string[]> {
        try {
            const papersContext = papers.map(p => 
                `${p.title} (${p.year}): ${p.summary}`
            ).join('\n\n');

            const prompt = `Based on these research papers about "${topic}", identify 5-7 significant research gaps or unexplored areas:

${papersContext}

Provide research gaps as a JSON array of strings.`;

            const response = await aiGatewayService.generateCompletion({
                model: 'gpt-4-turbo',
                messages: [
                    {
                        role: 'system',
                        content: 'You are an expert research analyst identifying gaps in academic literature.'
                    },
                    {
                        role: 'user',
                        content: prompt
                    }
                ],
                temperature: 0.4,
                maxTokens: 1000
            });

            return JSON.parse(response.content);

        } catch (error: any) {
            logger.error('Research gap identification error', { error: error.message });
            return ['Unable to identify research gaps due to analysis error'];
        }
    }

    /**
     * Extract methodologies from papers
     */
    private async extractMethodologies(papers: PaperSummary[]): Promise<string[]> {
        const methodologies = new Set<string>();

        papers.forEach(paper => {
            if (paper.methodology && paper.methodology !== 'Unable to extract') {
                methodologies.add(paper.methodology);
            }
        });

        return Array.from(methodologies);
    }

    /**
     * Identify theoretical frameworks
     */
    private async identifyTheoreticalFrameworks(papers: PaperSummary[]): Promise<string[]> {
        try {
            const papersContext = papers.slice(0, 10).map(p => 
                `${p.title}: ${p.summary}`
            ).join('\n\n');

            const prompt = `Identify the main theoretical frameworks used in these research papers:

${papersContext}

Provide frameworks as a JSON array of strings (framework names only).`;

            const response = await aiGatewayService.generateCompletion({
                model: 'gpt-4-turbo',
                messages: [
                    {
                        role: 'system',
                        content: 'You are an expert at identifying theoretical frameworks in academic research.'
                    },
                    {
                        role: 'user',
                        content: prompt
                    }
                ],
                temperature: 0.3,
                maxTokens: 500
            });

            return JSON.parse(response.content);

        } catch (error: any) {
            logger.error('Framework identification error', { error: error.message });
            return [];
        }
    }

    /**
     * Generate concept map
     */
    private async generateConceptMap(papers: PaperSummary[], topic: string): Promise<ConceptMap> {
        try {
            const papersContext = papers.slice(0, 15).map(p => 
                `${p.paperId}: ${p.title} - ${p.keyFindings.join('; ')}`
            ).join('\n');

            const prompt = `Create a concept map for research on "${topic}" based on these papers:

${papersContext}

Generate a JSON object with:
- nodes: array of {id, label, type (theme/methodology/finding/gap), papers: [paperIds]}
- edges: array of {source, target, relationship}

Focus on key themes, methodologies, and connections between papers.`;

            const response = await aiGatewayService.generateCompletion({
                model: 'gpt-4-turbo',
                messages: [
                    {
                        role: 'system',
                        content: 'You are an expert at creating research concept maps and identifying connections.'
                    },
                    {
                        role: 'user',
                        content: prompt
                    }
                ],
                temperature: 0.4,
                maxTokens: 2000
            });

            return JSON.parse(response.content);

        } catch (error: any) {
            logger.error('Concept map generation error', { error: error.message });
            return { nodes: [], edges: [] };
        }
    }

    /**
     * Generate recommendations
     */
    private async generateRecommendations(
        papers: PaperSummary[],
        gaps: string[],
        topic: string
    ): Promise<string[]> {
        try {
            const prompt = `Based on this literature review of "${topic}":

Key Papers: ${papers.slice(0, 5).map(p => p.title).join(', ')}
Research Gaps: ${gaps.join('; ')}

Provide 5-7 actionable recommendations for future research as a JSON array of strings.`;

            const response = await aiGatewayService.generateCompletion({
                model: 'gpt-4-turbo',
                messages: [
                    {
                        role: 'system',
                        content: 'You are an expert research advisor providing strategic recommendations.'
                    },
                    {
                        role: 'user',
                        content: prompt
                    }
                ],
                temperature: 0.5,
                maxTokens: 800
            });

            return JSON.parse(response.content);

        } catch (error: any) {
            logger.error('Recommendations generation error', { error: error.message });
            return ['Continue exploring identified research gaps'];
        }
    }

    /**
     * Suggest research methodology
     */
    async suggestMethodology(proposal: ResearchProposal): Promise<MethodologySuggestion> {
        try {
            logger.info('Generating methodology suggestions', { title: proposal.title });

            const prompt = `Analyze this research proposal and suggest appropriate methodology:

Title: ${proposal.title}
Research Question: ${proposal.researchQuestion}
Objectives: ${proposal.objectives.join('; ')}
Background: ${proposal.background}

Provide comprehensive methodology suggestions as JSON with:
- researchType: "quantitative" | "qualitative" | "mixed-methods"
- recommendedMethods: array of {name, description, appropriateFor, strengths, limitations, examples}
- statisticalAnalyses: array of {name, description, whenToUse, assumptions, interpretation}
- confoundingVariables: array of strings
- dataCollectionStrategies: array of strings
- sampleSizeRecommendation: string
- ethicalConsiderations: array of strings
- templates: array of {title, sections, content}`;

            const response = await aiGatewayService.generateCompletion({
                model: 'gpt-4-turbo',
                messages: [
                    {
                        role: 'system',
                        content: 'You are an expert research methodologist providing detailed methodology guidance.'
                    },
                    {
                        role: 'user',
                        content: prompt
                    }
                ],
                temperature: 0.4,
                maxTokens: 3000
            });

            const suggestion = JSON.parse(response.content);

            logger.info('Methodology suggestions generated', {
                title: proposal.title,
                researchType: suggestion.researchType
            });

            return suggestion;

        } catch (error: any) {
            logger.error('Methodology suggestion error', {
                title: proposal.title,
                error: error.message
            });
            throw new Error(`Failed to suggest methodology: ${error.message}`);
        }
    }

    /**
     * Format citation in multiple styles
     */
    formatCitation(citation: Citation): FormattedCitation {
        const apa = this.formatAPA(citation);
        const mla = this.formatMLA(citation);
        const chicago = this.formatChicago(citation);

        return {
            citation,
            apa,
            mla,
            chicago
        };
    }

    /**
     * Format citation in APA style
     */
    private formatAPA(citation: Citation): string {
        const authors = this.formatAuthorsAPA(citation.authors);
        const year = citation.year;
        const title = citation.title;

        switch (citation.type) {
            case 'article':
                return `${authors} (${year}). ${title}. ${citation.journal}, ${citation.volume}${citation.issue ? `(${citation.issue})` : ''}, ${citation.pages}. ${citation.doi ? `https://doi.org/${citation.doi}` : ''}`.trim();
            
            case 'book':
                return `${authors} (${year}). ${title}. ${citation.publisher}.`.trim();
            
            case 'website':
                return `${authors} (${year}). ${title}. Retrieved from ${citation.url}`.trim();
            
            case 'conference':
                return `${authors} (${year}). ${title}. In ${citation.journal} (pp. ${citation.pages}). ${citation.publisher}.`.trim();
            
            case 'thesis':
                return `${authors} (${year}). ${title} [Doctoral dissertation, ${citation.publisher}].`.trim();
            
            default:
                return `${authors} (${year}). ${title}.`;
        }
    }

    /**
     * Format citation in MLA style
     */
    private formatMLA(citation: Citation): string {
        const authors = this.formatAuthorsMLA(citation.authors);
        const title = `"${citation.title}"`;

        switch (citation.type) {
            case 'article':
                return `${authors} ${title} ${citation.journal}, vol. ${citation.volume}, no. ${citation.issue}, ${citation.year}, pp. ${citation.pages}.`.trim();
            
            case 'book':
                return `${authors} ${citation.title}. ${citation.publisher}, ${citation.year}.`.trim();
            
            case 'website':
                return `${authors} ${title} ${citation.publisher}, ${citation.year}, ${citation.url}.`.trim();
            
            default:
                return `${authors} ${title} ${citation.year}.`;
        }
    }

    /**
     * Format citation in Chicago style
     */
    private formatChicago(citation: Citation): string {
        const authors = this.formatAuthorsChicago(citation.authors);
        const title = citation.title;

        switch (citation.type) {
            case 'article':
                return `${authors} "${title}." ${citation.journal} ${citation.volume}, no. ${citation.issue} (${citation.year}): ${citation.pages}.`.trim();
            
            case 'book':
                return `${authors} ${title}. ${citation.publisher}, ${citation.year}.`.trim();
            
            case 'website':
                return `${authors} "${title}." ${citation.publisher}. Accessed ${citation.accessDate?.toLocaleDateString()}. ${citation.url}.`.trim();
            
            default:
                return `${authors} ${title}. ${citation.year}.`;
        }
    }

    /**
     * Format authors for APA
     */
    private formatAuthorsAPA(authors: string[]): string {
        if (authors.length === 0) return '';
        if (authors.length === 1) return authors[0];
        if (authors.length === 2) return `${authors[0]} & ${authors[1]}`;
        
        const lastAuthor = authors[authors.length - 1];
        const otherAuthors = authors.slice(0, -1).join(', ');
        return `${otherAuthors}, & ${lastAuthor}`;
    }

    /**
     * Format authors for MLA
     */
    private formatAuthorsMLA(authors: string[]): string {
        if (authors.length === 0) return '';
        if (authors.length === 1) return `${authors[0]}.`;
        if (authors.length === 2) return `${authors[0]}, and ${authors[1]}.`;
        
        return `${authors[0]}, et al.`;
    }

    /**
     * Format authors for Chicago
     */
    private formatAuthorsChicago(authors: string[]): string {
        if (authors.length === 0) return '';
        if (authors.length === 1) return `${authors[0]}.`;
        if (authors.length === 2) return `${authors[0]} and ${authors[1]}.`;
        if (authors.length === 3) return `${authors[0]}, ${authors[1]}, and ${authors[2]}.`;
        
        return `${authors[0]} et al.`;
    }

    /**
     * Generate bibliography
     */
    generateBibliography(citations: Citation[], style: CitationStyle): Bibliography {
        const formattedCitations = citations.map(c => this.formatCitation(c));
        
        let formatted = '';
        formattedCitations.forEach(fc => {
            switch (style) {
                case 'APA':
                    formatted += fc.apa + '\n\n';
                    break;
                case 'MLA':
                    formatted += fc.mla + '\n\n';
                    break;
                case 'Chicago':
                    formatted += fc.chicago + '\n\n';
                    break;
            }
        });

        return {
            style,
            citations: formattedCitations,
            formatted: formatted.trim()
        };
    }

    /**
     * Validate citation accuracy
     */
    async validateCitation(citation: Citation): Promise<{ valid: boolean; issues: string[] }> {
        const issues: string[] = [];

        // Check required fields
        if (!citation.authors || citation.authors.length === 0) {
            issues.push('Missing authors');
        }
        if (!citation.title) {
            issues.push('Missing title');
        }
        if (!citation.year || citation.year < 1900 || citation.year > new Date().getFullYear()) {
            issues.push('Invalid or missing year');
        }

        // Type-specific validation
        switch (citation.type) {
            case 'article':
                if (!citation.journal) issues.push('Missing journal name');
                if (!citation.volume) issues.push('Missing volume');
                if (!citation.pages) issues.push('Missing pages');
                break;
            
            case 'book':
                if (!citation.publisher) issues.push('Missing publisher');
                break;
            
            case 'website':
                if (!citation.url) issues.push('Missing URL');
                break;
        }

        return {
            valid: issues.length === 0,
            issues
        };
    }

    /**
     * Check for missing citations in text
     */
    async checkMissingCitations(text: string, citations: Citation[]): Promise<string[]> {
        try {
            const citedAuthors = citations.flatMap(c => c.authors);
            
            const prompt = `Analyze this academic text and identify statements that need citations but don't have them:

${text}

Known citations: ${citedAuthors.join(', ')}

Return a JSON array of strings describing statements that need citations.`;

            const response = await aiGatewayService.generateCompletion({
                model: 'gpt-4-turbo',
                messages: [
                    {
                        role: 'system',
                        content: 'You are an expert at identifying statements in academic writing that require citations.'
                    },
                    {
                        role: 'user',
                        content: prompt
                    }
                ],
                temperature: 0.3,
                maxTokens: 1000
            });

            return JSON.parse(response.content);

        } catch (error: any) {
            logger.error('Missing citation check error', { error: error.message });
            return [];
        }
    }

    /**
     * Provide feedback on research paper
     */
    async provideFeedback(paper: ResearchPaper): Promise<ResearchFeedback> {
        try {
            logger.info('Generating research feedback', { title: paper.title });

            const prompt = `Provide comprehensive feedback on this research paper:

Title: ${paper.title}
Abstract: ${paper.abstract}
Introduction: ${paper.introduction.substring(0, 500)}...
Methodology: ${paper.methodology.substring(0, 500)}...

Provide detailed feedback as JSON with:
- overallScore: number (0-100)
- strengths: array of strings
- weaknesses: array of strings
- argumentStructure: {score, thesisClarity, logicalFlow, counterarguments, conclusion, comments}
- evidenceQuality: {score, sourceQuality, sourceRelevance, citationAccuracy, dataInterpretation, comments}
- writingQuality: {score, clarity, academicTone, grammar, organization, comments}
- recommendations: array of strings
- detailedComments: array of {section, type, comment, priority}`;

            const response = await aiGatewayService.generateCompletion({
                model: 'gpt-4-turbo',
                messages: [
                    {
                        role: 'system',
                        content: 'You are an expert academic reviewer providing constructive feedback on research papers.'
                    },
                    {
                        role: 'user',
                        content: prompt
                    }
                ],
                temperature: 0.4,
                maxTokens: 3000
            });

            const feedback = JSON.parse(response.content);
            feedback.paperId = paper.title;

            logger.info('Research feedback generated', {
                title: paper.title,
                overallScore: feedback.overallScore
            });

            return feedback;

        } catch (error: any) {
            logger.error('Research feedback error', {
                title: paper.title,
                error: error.message
            });
            throw new Error(`Failed to provide feedback: ${error.message}`);
        }
    }

    /**
     * Build search query from scope
     */
    private buildSearchQuery(scope: ResearchScope): string {
        let query = scope.topic;
        
        if (scope.keywords && scope.keywords.length > 0) {
            query += ' ' + scope.keywords.join(' ');
        }
        
        return query;
    }
}

// Singleton instance
export const researchAssistantService = new ResearchAssistantService();
