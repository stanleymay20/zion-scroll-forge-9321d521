/**
 * Research Assistant Service Tests
 * "The Spirit of truth will guide you into all truth" - John 16:13
 */

import { researchAssistantService } from '../ResearchAssistantService';
import { aiGatewayService } from '../AIGatewayService';
import axios from 'axios';
import {
    ResearchScope,
    AcademicPaper,
    ResearchProposal,
    Citation,
    CitationStyle,
    ResearchPaper
} from '../../types/research.types';

// Mock dependencies
jest.mock('../AIGatewayService');
jest.mock('axios');

describe('ResearchAssistantService', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('Literature Review', () => {
        it('should conduct comprehensive literature review', async () => {
            const mockPapers: AcademicPaper[] = [
                {
                    paperId: '1',
                    title: 'AI in Education',
                    authors: [{ authorId: 'a1', name: 'John Doe' }],
                    year: 2023,
                    abstract: 'This paper explores AI applications in education...',
                    citationCount: 50,
                    influentialCitationCount: 10
                },
                {
                    paperId: '2',
                    title: 'Machine Learning for Students',
                    authors: [{ authorId: 'a2', name: 'Jane Smith' }],
                    year: 2022,
                    abstract: 'Machine learning techniques for personalized learning...',
                    citationCount: 30,
                    influentialCitationCount: 5
                }
            ];

            (axios.get as jest.Mock).mockResolvedValue({
                data: {
                    total: 2,
                    data: mockPapers
                }
            });

            (aiGatewayService.generateCompletion as jest.Mock).mockResolvedValue({
                content: JSON.stringify({
                    keyFindings: ['Finding 1', 'Finding 2'],
                    methodology: 'Quantitative analysis',
                    limitations: ['Limited sample size'],
                    connections: ['Related to ML'],
                    relevanceScore: 85,
                    summary: 'This paper discusses AI in education'
                })
            });

            const scope: ResearchScope = {
                topic: 'AI in Education',
                keywords: ['machine learning', 'personalized learning'],
                maxPapers: 10
            };

            const review = await researchAssistantService.conductLiteratureReview(scope);

            expect(review).toBeDefined();
            expect(review.topic).toBe('AI in Education');
            expect(review.keyPapers.length).toBeGreaterThan(0);
            expect(review.researchGaps).toBeDefined();
            expect(review.methodologies).toBeDefined();
            expect(review.recommendations).toBeDefined();
        });

        it('should search academic papers with filters', async () => {
            const mockResponse = {
                data: {
                    total: 5,
                    data: [
                        {
                            paperId: '1',
                            title: 'Test Paper',
                            authors: [{ authorId: 'a1', name: 'Author' }],
                            year: 2023,
                            abstract: 'Abstract',
                            citationCount: 100,
                            influentialCitationCount: 20
                        }
                    ]
                }
            };

            (axios.get as jest.Mock).mockResolvedValue(mockResponse);

            const scope: ResearchScope = {
                topic: 'Machine Learning',
                keywords: ['neural networks'],
                yearRange: { start: 2020, end: 2023 },
                minCitations: 50,
                maxPapers: 20
            };

            const papers = await researchAssistantService.searchAcademicPapers(scope);

            expect(papers).toBeDefined();
            expect(papers.length).toBeGreaterThan(0);
            expect(axios.get).toHaveBeenCalled();
        });
    });

    describe('Paper Summarization', () => {
        it('should summarize academic paper', async () => {
            const paper: AcademicPaper = {
                paperId: '123',
                title: 'Deep Learning in Healthcare',
                authors: [
                    { authorId: 'a1', name: 'Dr. Smith' },
                    { authorId: 'a2', name: 'Dr. Jones' }
                ],
                year: 2023,
                abstract: 'This paper presents a novel deep learning approach for medical diagnosis...',
                citationCount: 75,
                influentialCitationCount: 15
            };

            (aiGatewayService.generateCompletion as jest.Mock).mockResolvedValue({
                content: JSON.stringify({
                    keyFindings: [
                        'Novel CNN architecture for diagnosis',
                        '95% accuracy on test set',
                        'Outperforms traditional methods'
                    ],
                    methodology: 'Convolutional Neural Networks with transfer learning',
                    limitations: [
                        'Limited to specific disease types',
                        'Requires large labeled dataset'
                    ],
                    connections: [
                        'Computer vision',
                        'Medical imaging',
                        'Transfer learning'
                    ],
                    relevanceScore: 90,
                    summary: 'This paper introduces a deep learning model for medical diagnosis achieving 95% accuracy.'
                })
            });

            const summary = await researchAssistantService.summarizePaper(paper);

            expect(summary).toBeDefined();
            expect(summary.paperId).toBe('123');
            expect(summary.title).toBe('Deep Learning in Healthcare');
            expect(summary.keyFindings.length).toBeGreaterThan(0);
            expect(summary.methodology).toBeTruthy();
            expect(summary.relevanceScore).toBeGreaterThan(0);
        });

        it('should handle summarization errors gracefully', async () => {
            const paper: AcademicPaper = {
                paperId: '456',
                title: 'Test Paper',
                authors: [{ authorId: 'a1', name: 'Author' }],
                year: 2023,
                abstract: 'Short abstract',
                citationCount: 10,
                influentialCitationCount: 2
            };

            (aiGatewayService.generateCompletion as jest.Mock).mockRejectedValue(
                new Error('AI service error')
            );

            const summary = await researchAssistantService.summarizePaper(paper);

            expect(summary).toBeDefined();
            expect(summary.paperId).toBe('456');
            expect(summary.summary).toContain('Short abstract');
        });
    });

    describe('Methodology Suggestions', () => {
        it('should suggest research methodology', async () => {
            const proposal: ResearchProposal = {
                title: 'Impact of AI on Student Learning',
                researchQuestion: 'How does AI tutoring affect student outcomes?',
                objectives: [
                    'Measure learning gains',
                    'Assess student satisfaction',
                    'Identify best practices'
                ],
                background: 'AI tutoring systems are becoming prevalent in education...'
            };

            (aiGatewayService.generateCompletion as jest.Mock).mockResolvedValue({
                content: JSON.stringify({
                    researchType: 'mixed-methods',
                    recommendedMethods: [
                        {
                            name: 'Randomized Controlled Trial',
                            description: 'Compare AI tutoring vs traditional instruction',
                            appropriateFor: ['Causal inference', 'Effectiveness studies'],
                            strengths: ['High internal validity', 'Clear causation'],
                            limitations: ['May lack external validity'],
                            examples: ['Educational intervention studies']
                        }
                    ],
                    statisticalAnalyses: [
                        {
                            name: 'ANOVA',
                            description: 'Compare means across groups',
                            whenToUse: 'Multiple treatment groups',
                            assumptions: ['Normal distribution', 'Homogeneity of variance'],
                            interpretation: 'F-statistic indicates group differences'
                        }
                    ],
                    confoundingVariables: [
                        'Prior knowledge',
                        'Motivation',
                        'Access to technology'
                    ],
                    dataCollectionStrategies: [
                        'Pre/post tests',
                        'Student surveys',
                        'Usage analytics'
                    ],
                    sampleSizeRecommendation: 'Minimum 100 students per group for 80% power',
                    ethicalConsiderations: [
                        'Informed consent',
                        'Data privacy',
                        'Equitable access'
                    ],
                    templates: [
                        {
                            title: 'Methodology Section Template',
                            sections: ['Participants', 'Procedure', 'Measures', 'Analysis'],
                            content: 'This study employed a mixed-methods approach...'
                        }
                    ]
                })
            });

            const suggestion = await researchAssistantService.suggestMethodology(proposal);

            expect(suggestion).toBeDefined();
            expect(suggestion.researchType).toBe('mixed-methods');
            expect(suggestion.recommendedMethods.length).toBeGreaterThan(0);
            expect(suggestion.statisticalAnalyses.length).toBeGreaterThan(0);
            expect(suggestion.confoundingVariables.length).toBeGreaterThan(0);
        });
    });

    describe('Citation Formatting', () => {
        const testCitation: Citation = {
            type: 'article',
            authors: ['Smith, J.', 'Doe, A.'],
            title: 'Machine Learning in Education',
            year: 2023,
            journal: 'Journal of Educational Technology',
            volume: '45',
            issue: '3',
            pages: '123-145',
            doi: '10.1234/jet.2023.001'
        };

        it('should format citation in APA style', () => {
            const formatted = researchAssistantService.formatCitation(testCitation);

            expect(formatted.apa).toContain('Smith, J., & Doe, A.');
            expect(formatted.apa).toContain('(2023)');
            expect(formatted.apa).toContain('Machine Learning in Education');
            expect(formatted.apa).toContain('Journal of Educational Technology');
            expect(formatted.apa).toContain('45(3)');
            expect(formatted.apa).toContain('123-145');
        });

        it('should format citation in MLA style', () => {
            const formatted = researchAssistantService.formatCitation(testCitation);

            expect(formatted.mla).toContain('Smith, J., and Doe, A.');
            expect(formatted.mla).toContain('"Machine Learning in Education"');
            expect(formatted.mla).toContain('Journal of Educational Technology');
            expect(formatted.mla).toContain('vol. 45');
            expect(formatted.mla).toContain('no. 3');
        });

        it('should format citation in Chicago style', () => {
            const formatted = researchAssistantService.formatCitation(testCitation);

            expect(formatted.chicago).toContain('Smith, J. and Doe, A.');
            expect(formatted.chicago).toContain('"Machine Learning in Education."');
            expect(formatted.chicago).toContain('Journal of Educational Technology');
            expect(formatted.chicago).toContain('45, no. 3');
        });

        it('should format book citation', () => {
            const bookCitation: Citation = {
                type: 'book',
                authors: ['Johnson, M.'],
                title: 'AI in Higher Education',
                year: 2022,
                publisher: 'Academic Press'
            };

            const formatted = researchAssistantService.formatCitation(bookCitation);

            expect(formatted.apa).toContain('Johnson, M.');
            expect(formatted.apa).toContain('(2022)');
            expect(formatted.apa).toContain('AI in Higher Education');
            expect(formatted.apa).toContain('Academic Press');
        });

        it('should generate bibliography', () => {
            const citations: Citation[] = [
                testCitation,
                {
                    type: 'book',
                    authors: ['Brown, T.'],
                    title: 'Educational Technology',
                    year: 2021,
                    publisher: 'Tech Publishers'
                }
            ];

            const bibliography = researchAssistantService.generateBibliography(
                citations,
                'APA'
            );

            expect(bibliography.style).toBe('APA');
            expect(bibliography.citations.length).toBe(2);
            expect(bibliography.formatted).toContain('Smith, J., & Doe, A.');
            expect(bibliography.formatted).toContain('Brown, T.');
        });

        it('should validate citation accuracy', async () => {
            const validCitation: Citation = {
                type: 'article',
                authors: ['Author, A.'],
                title: 'Valid Paper',
                year: 2023,
                journal: 'Journal Name',
                volume: '10',
                pages: '1-10'
            };

            const result = await researchAssistantService.validateCitation(validCitation);

            expect(result.valid).toBe(true);
            expect(result.issues.length).toBe(0);
        });

        it('should identify citation issues', async () => {
            const invalidCitation: Citation = {
                type: 'article',
                authors: [],
                title: '',
                year: 1800,
                journal: 'Journal'
            };

            const result = await researchAssistantService.validateCitation(invalidCitation);

            expect(result.valid).toBe(false);
            expect(result.issues.length).toBeGreaterThan(0);
            expect(result.issues).toContain('Missing authors');
            expect(result.issues).toContain('Missing title');
        });
    });

    describe('Research Feedback', () => {
        it('should provide comprehensive feedback on research paper', async () => {
            const paper: ResearchPaper = {
                title: 'AI-Powered Learning Systems',
                abstract: 'This study investigates the effectiveness of AI tutoring...',
                introduction: 'Artificial intelligence is transforming education...',
                methodology: 'We conducted a randomized controlled trial...',
                results: 'Students in the AI group showed 25% improvement...',
                discussion: 'These findings suggest that AI tutoring is effective...',
                conclusion: 'AI tutoring systems can significantly enhance learning...',
                references: []
            };

            (aiGatewayService.generateCompletion as jest.Mock).mockResolvedValue({
                content: JSON.stringify({
                    overallScore: 85,
                    strengths: [
                        'Clear research question',
                        'Rigorous methodology',
                        'Significant findings'
                    ],
                    weaknesses: [
                        'Limited sample size',
                        'Short intervention period'
                    ],
                    argumentStructure: {
                        score: 88,
                        thesisClarity: 90,
                        logicalFlow: 85,
                        counterarguments: 80,
                        conclusion: 90,
                        comments: ['Strong thesis statement', 'Good logical progression']
                    },
                    evidenceQuality: {
                        score: 82,
                        sourceQuality: 85,
                        sourceRelevance: 90,
                        citationAccuracy: 75,
                        dataInterpretation: 85,
                        comments: ['Need more recent sources', 'Data well-interpreted']
                    },
                    writingQuality: {
                        score: 87,
                        clarity: 90,
                        academicTone: 85,
                        grammar: 90,
                        organization: 85,
                        comments: ['Clear writing', 'Professional tone']
                    },
                    recommendations: [
                        'Expand sample size',
                        'Include longer follow-up',
                        'Add more recent citations'
                    ],
                    detailedComments: [
                        {
                            section: 'Introduction',
                            type: 'strength',
                            comment: 'Well-motivated research question',
                            priority: 'high'
                        }
                    ]
                })
            });

            const feedback = await researchAssistantService.provideFeedback(paper);

            expect(feedback).toBeDefined();
            expect(feedback.overallScore).toBeGreaterThan(0);
            expect(feedback.strengths.length).toBeGreaterThan(0);
            expect(feedback.weaknesses.length).toBeGreaterThan(0);
            expect(feedback.argumentStructure).toBeDefined();
            expect(feedback.evidenceQuality).toBeDefined();
            expect(feedback.writingQuality).toBeDefined();
            expect(feedback.recommendations.length).toBeGreaterThan(0);
        });
    });

    describe('Missing Citations', () => {
        it('should identify statements needing citations', async () => {
            const text = `
                Studies show that AI improves learning outcomes.
                Machine learning algorithms can personalize education.
                Research indicates that students prefer adaptive systems.
            `;

            const citations: Citation[] = [
                {
                    type: 'article',
                    authors: ['Smith, J.'],
                    title: 'AI in Education',
                    year: 2023
                }
            ];

            (aiGatewayService.generateCompletion as jest.Mock).mockResolvedValue({
                content: JSON.stringify([
                    'Statement about AI improving learning outcomes needs citation',
                    'Claim about student preferences requires supporting evidence'
                ])
            });

            const missing = await researchAssistantService.checkMissingCitations(
                text,
                citations
            );

            expect(missing).toBeDefined();
            expect(Array.isArray(missing)).toBe(true);
        });
    });
});
