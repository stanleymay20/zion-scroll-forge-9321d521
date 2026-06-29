/**
 * ScrollUniversity Admissions AI Service Tests
 * "Many are called, but few are chosen" - Matthew 22:14
 */

import { AdmissionsAIService } from '../AdmissionsAIService';
import { AIGatewayService } from '../AIGatewayService';
import { VectorStoreService } from '../VectorStoreService';

// Mock dependencies
jest.mock('../AIGatewayService');
jest.mock('../VectorStoreService');

describe('AdmissionsAIService', () => {
    let admissionsAIService: AdmissionsAIService;
    let mockAIGateway: jest.Mocked<AIGatewayService>;
    let mockVectorStore: jest.Mocked<VectorStoreService>;

    beforeEach(() => {
        jest.clearAllMocks();
        admissionsAIService = new AdmissionsAIService();
        mockAIGateway = (admissionsAIService as any).aiGateway;
        mockVectorStore = (admissionsAIService as any).vectorStore;
    });

    describe('Document Extraction', () => {
        describe('extractDocumentData', () => {
            it('should extract transcript data successfully', async () => {
                const mockTranscriptData = {
                    institution: 'Test University',
                    studentName: 'John Doe',
                    studentId: '12345',
                    degreeProgram: 'Computer Science',
                    gpa: 3.8,
                    gradeScale: '4.0',
                    courses: [
                        {
                            code: 'CS101',
                            name: 'Introduction to Programming',
                            credits: 3,
                            grade: 'A',
                            semester: 'Fall',
                            year: 2023
                        }
                    ],
                    graduationDate: new Date('2024-05-15'),
                    honors: ['Dean\'s List'],
                    academicStanding: 'Good Standing'
                };

                mockAIGateway.generateCompletion = jest.fn().mockResolvedValue({
                    content: JSON.stringify(mockTranscriptData),
                    usage: { promptTokens: 100, completionTokens: 200, totalTokens: 300 },
                    cost: { inputCost: 0.001, outputCost: 0.006, totalCost: 0.007 }
                });

                const request = {
                    documentId: 'doc-123',
                    documentType: 'TRANSCRIPT' as const,
                    documentUrl: 'https://storage.example.com/transcript.pdf',
                    applicationId: 'app-123'
                };

                const result = await admissionsAIService.extractDocumentData(request);

                expect(result.documentId).toBe('doc-123');
                expect(result.documentType).toBe('TRANSCRIPT');
                expect(result.extractedData).toEqual(mockTranscriptData);
                expect(result.confidence).toBeGreaterThan(0);
                expect(result.validationErrors).toEqual([]);
                expect(mockAIGateway.generateCompletion).toHaveBeenCalledWith(
                    expect.objectContaining({
                        model: 'gpt-4-turbo',
                        temperature: 0.1
                    })
                );
            });

            it('should extract essay data successfully', async () => {
                const mockEssayData = {
                    wordCount: 650,
                    mainThemes: ['Faith journey', 'Academic goals', 'Service to others'],
                    spiritualElements: ['Prayer', 'Bible study', 'Church involvement'],
                    personalExperiences: ['Mission trip to Kenya', 'Youth group leadership'],
                    careerGoals: ['Christian counseling', 'Ministry leadership'],
                    motivations: ['Desire to serve God', 'Passion for helping others'],
                    challenges: ['Overcoming doubt', 'Financial struggles'],
                    strengths: ['Perseverance', 'Compassion', 'Leadership']
                };

                mockAIGateway.generateCompletion = jest.fn().mockResolvedValue({
                    content: JSON.stringify(mockEssayData),
                    usage: { promptTokens: 500, completionTokens: 150, totalTokens: 650 },
                    cost: { inputCost: 0.005, outputCost: 0.0045, totalCost: 0.0095 }
                });

                const request = {
                    documentId: 'doc-456',
                    documentType: 'ESSAY' as const,
                    documentUrl: 'https://storage.example.com/essay.pdf',
                    applicationId: 'app-123'
                };

                const result = await admissionsAIService.extractDocumentData(request);

                expect(result.documentType).toBe('ESSAY');
                expect(result.extractedData).toEqual(mockEssayData);
                expect(result.confidence).toBeGreaterThan(0);
            });

            it('should handle extraction errors gracefully', async () => {
                mockAIGateway.generateCompletion = jest.fn().mockRejectedValue(
                    new Error('AI service unavailable')
                );

                const request = {
                    documentId: 'doc-789',
                    documentType: 'TRANSCRIPT' as const,
                    documentUrl: 'https://storage.example.com/transcript.pdf',
                    applicationId: 'app-123'
                };

                await expect(admissionsAIService.extractDocumentData(request))
                    .rejects.toThrow('Document extraction failed');
            });

            it('should validate extracted data and flag errors', async () => {
                const incompleteTranscriptData = {
                    institution: 'Test University',
                    // Missing required fields
                    courses: []
                };

                mockAIGateway.generateCompletion = jest.fn().mockResolvedValue({
                    content: JSON.stringify(incompleteTranscriptData),
                    usage: { promptTokens: 100, completionTokens: 100, totalTokens: 200 },
                    cost: { inputCost: 0.001, outputCost: 0.003, totalCost: 0.004 }
                });

                const request = {
                    documentId: 'doc-999',
                    documentType: 'TRANSCRIPT' as const,
                    documentUrl: 'https://storage.example.com/transcript.pdf',
                    applicationId: 'app-123'
                };

                const result = await admissionsAIService.extractDocumentData(request);

                expect(result.validationErrors.length).toBeGreaterThan(0);
                expect(result.confidence).toBeLessThan(100);
            });
        });
    });

    describe('Application Scoring', () => {
        describe('scoreApplication', () => {
            it('should score application comprehensively', async () => {
                // Mock scoring responses
                mockAIGateway.generateCompletion = jest.fn()
                    .mockResolvedValueOnce({
                        content: JSON.stringify({
                            gpa: 85,
                            courseRigor: 80,
                            relevantCoursework: 90,
                            academicAchievements: 75,
                            overallScore: 82.5,
                            reasoning: 'Strong academic performance with relevant coursework'
                        })
                    })
                    .mockResolvedValueOnce({
                        content: JSON.stringify({
                            faithDepth: 90,
                            biblicalKnowledge: 85,
                            ministryExperience: 80,
                            spiritualGrowth: 88,
                            kingdomFocus: 92,
                            overallScore: 87,
                            reasoning: 'Excellent spiritual maturity and kingdom focus'
                        })
                    })
                    .mockResolvedValueOnce({
                        content: JSON.stringify({
                            leadershipExperience: 75,
                            impactDemonstrated: 80,
                            servantLeadership: 85,
                            teamCollaboration: 78,
                            overallScore: 79.5,
                            reasoning: 'Good leadership with servant heart'
                        })
                    })
                    .mockResolvedValueOnce({
                        content: JSON.stringify({
                            scrollUniversityFit: 88,
                            callingClarity: 85,
                            visionAlignment: 90,
                            culturalFit: 87,
                            overallScore: 87.5,
                            reasoning: 'Strong alignment with ScrollUniversity mission'
                        })
                    });

                const request = {
                    applicationId: 'app-123',
                    extractedData: {
                        transcripts: [{
                            institution: 'Test University',
                            studentName: 'John Doe',
                            gpa: 3.8,
                            courses: []
                        }],
                        essays: [{
                            wordCount: 650,
                            mainThemes: ['Faith', 'Service'],
                            spiritualElements: ['Prayer'],
                            personalExperiences: [],
                            careerGoals: [],
                            motivations: [],
                            challenges: [],
                            strengths: []
                        }],
                        resume: {
                            personalInfo: { name: 'John Doe' },
                            education: [],
                            workExperience: [],
                            ministryExperience: [],
                            skills: [],
                            certifications: [],
                            languages: []
                        },
                        recommendations: []
                    },
                    personalStatement: 'Test statement',
                    spiritualTestimony: 'Test testimony'
                };

                const result = await admissionsAIService.scoreApplication(request);

                expect(result.applicationId).toBe('app-123');
                expect(result.overallScore).toBeGreaterThan(0);
                expect(result.recommendation).toBeDefined();
                expect(['ACCEPT', 'INTERVIEW', 'WAITLIST', 'REJECT']).toContain(result.recommendation);
                expect(result.academicScore).toBeDefined();
                expect(result.spiritualMaturityScore).toBeDefined();
                expect(result.leadershipScore).toBeDefined();
                expect(result.missionAlignmentScore).toBeDefined();
                expect(result.strengths).toBeInstanceOf(Array);
                expect(result.concerns).toBeInstanceOf(Array);
            });

            it('should recommend ACCEPT for high-scoring applications', async () => {
                // Mock high scores
                mockAIGateway.generateCompletion = jest.fn()
                    .mockResolvedValueOnce({
                        content: JSON.stringify({
                            gpa: 95, courseRigor: 90, relevantCoursework: 92,
                            academicAchievements: 88, overallScore: 91.25, reasoning: 'Excellent'
                        })
                    })
                    .mockResolvedValueOnce({
                        content: JSON.stringify({
                            faithDepth: 95, biblicalKnowledge: 90, ministryExperience: 88,
                            spiritualGrowth: 92, kingdomFocus: 94, overallScore: 91.8, reasoning: 'Outstanding'
                        })
                    })
                    .mockResolvedValueOnce({
                        content: JSON.stringify({
                            leadershipExperience: 85, impactDemonstrated: 88,
                            servantLeadership: 90, teamCollaboration: 87, overallScore: 87.5, reasoning: 'Strong'
                        })
                    })
                    .mockResolvedValueOnce({
                        content: JSON.stringify({
                            scrollUniversityFit: 92, callingClarity: 90,
                            visionAlignment: 94, culturalFit: 91, overallScore: 91.75, reasoning: 'Excellent fit'
                        })
                    });

                const request = {
                    applicationId: 'app-456',
                    extractedData: {
                        transcripts: [{ institution: 'Test', studentName: 'Jane', gpa: 4.0, courses: [] }],
                        essays: [{ wordCount: 700, mainThemes: [], spiritualElements: [], personalExperiences: [], careerGoals: [], motivations: [], challenges: [], strengths: [] }],
                        resume: { personalInfo: { name: 'Jane' }, education: [], workExperience: [], ministryExperience: [], skills: [], certifications: [], languages: [] }
                    }
                };

                const result = await admissionsAIService.scoreApplication(request);

                expect(result.overallScore).toBeGreaterThan(85);
                expect(result.recommendation).toBe('ACCEPT');
            });

            it('should recommend REJECT for low-scoring applications', async () => {
                // Mock low scores
                mockAIGateway.generateCompletion = jest.fn()
                    .mockResolvedValueOnce({
                        content: JSON.stringify({
                            gpa: 50, courseRigor: 45, relevantCoursework: 48,
                            academicAchievements: 40, overallScore: 45.75, reasoning: 'Below standards'
                        })
                    })
                    .mockResolvedValueOnce({
                        content: JSON.stringify({
                            faithDepth: 55, biblicalKnowledge: 50, ministryExperience: 45,
                            spiritualGrowth: 52, kingdomFocus: 48, overallScore: 50, reasoning: 'Needs development'
                        })
                    })
                    .mockResolvedValueOnce({
                        content: JSON.stringify({
                            leadershipExperience: 40, impactDemonstrated: 45,
                            servantLeadership: 50, teamCollaboration: 42, overallScore: 44.25, reasoning: 'Limited'
                        })
                    })
                    .mockResolvedValueOnce({
                        content: JSON.stringify({
                            scrollUniversityFit: 48, callingClarity: 45,
                            visionAlignment: 50, culturalFit: 47, overallScore: 47.5, reasoning: 'Unclear fit'
                        })
                    });

                const request = {
                    applicationId: 'app-789',
                    extractedData: {}
                };

                const result = await admissionsAIService.scoreApplication(request);

                expect(result.overallScore).toBeLessThan(55);
                expect(result.recommendation).toBe('REJECT');
            });
        });
    });

    describe('Essay Evaluation', () => {
        describe('evaluateEssay', () => {
            it('should evaluate essay comprehensively', async () => {
                const mockEvaluation = {
                    writingQuality: {
                        grammar: 85,
                        clarity: 88,
                        organization: 90,
                        vocabulary: 82,
                        overallScore: 86.25
                    },
                    authenticity: {
                        genuineness: 90,
                        personalVoice: 88,
                        specificExamples: 85,
                        overallScore: 87.67
                    },
                    spiritualDepth: {
                        biblicalIntegration: 88,
                        spiritualInsight: 85,
                        faithJourney: 90,
                        transformation: 87,
                        overallScore: 87.5
                    },
                    scrollAlignment: {
                        visionAlignment: 90,
                        kingdomFocus: 88,
                        callingClarity: 85,
                        overallScore: 87.67
                    },
                    overallScore: 87.27,
                    strengths: ['Clear writing', 'Authentic voice', 'Strong spiritual depth'],
                    weaknesses: ['Could expand on specific examples'],
                    feedback: 'Excellent essay with strong spiritual foundation and clear calling.'
                };

                mockAIGateway.generateCompletion = jest.fn().mockResolvedValue({
                    content: JSON.stringify(mockEvaluation)
                });

                const request = {
                    applicationId: 'app-123',
                    essayText: 'This is a test essay about my faith journey...',
                    essayType: 'PERSONAL_STATEMENT' as const,
                    wordLimit: 750
                };

                const result = await admissionsAIService.evaluateEssay(request);

                expect(result.applicationId).toBe('app-123');
                expect(result.essayType).toBe('PERSONAL_STATEMENT');
                expect(result.overallScore).toBeGreaterThan(0);
                expect(result.writingQuality).toBeDefined();
                expect(result.authenticity).toBeDefined();
                expect(result.spiritualDepth).toBeDefined();
                expect(result.scrollAlignment).toBeDefined();
                expect(result.strengths).toBeInstanceOf(Array);
                expect(result.weaknesses).toBeInstanceOf(Array);
                expect(result.feedback).toBeDefined();
                expect(result.confidence).toBeGreaterThan(0);
            });

            it('should handle short essays with lower confidence', async () => {
                const mockEvaluation = {
                    writingQuality: { grammar: 70, clarity: 65, organization: 68, vocabulary: 72, overallScore: 68.75 },
                    authenticity: { genuineness: 75, personalVoice: 70, specificExamples: 65, overallScore: 70 },
                    spiritualDepth: { biblicalIntegration: 68, spiritualInsight: 70, faithJourney: 72, transformation: 69, overallScore: 69.75 },
                    scrollAlignment: { visionAlignment: 70, kingdomFocus: 68, callingClarity: 65, overallScore: 67.67 },
                    overallScore: 69.04,
                    strengths: ['Sincere'],
                    weaknesses: ['Too brief', 'Lacks detail'],
                    feedback: 'Essay is too short and needs more development.'
                };

                mockAIGateway.generateCompletion = jest.fn().mockResolvedValue({
                    content: JSON.stringify(mockEvaluation)
                });

                const request = {
                    applicationId: 'app-456',
                    essayText: 'Short essay with only 150 words.',
                    essayType: 'SPIRITUAL_TESTIMONY' as const
                };

                const result = await admissionsAIService.evaluateEssay(request);

                expect(result.confidence).toBeLessThan(90);
            });
        });
    });

    describe('Decision Recommendation', () => {
        describe('generateDecisionRecommendation', () => {
            it('should generate ACCEPT recommendation for strong applications', async () => {
                const mockRecommendation = {
                    decision: 'ACCEPT',
                    confidence: 95,
                    reasoning: 'Exceptional candidate with strong scores across all areas',
                    strengths: ['Academic excellence', 'Spiritual maturity', 'Clear calling'],
                    concerns: [],
                    recommendations: ['Assign to honors program', 'Consider for scholarship'],
                    scholarshipEligibility: {
                        eligible: true,
                        amount: 10000,
                        type: 'Merit Scholarship',
                        reasoning: 'Outstanding academic and spiritual qualifications'
                    },
                    alternativePathways: []
                };

                mockAIGateway.generateCompletion = jest.fn().mockResolvedValue({
                    content: JSON.stringify(mockRecommendation)
                });

                const request = {
                    applicationId: 'app-123',
                    overallScore: 90,
                    componentScores: {
                        academic: 88,
                        spiritual: 92,
                        leadership: 85,
                        missionAlignment: 90
                    },
                    essayEvaluations: []
                };

                const result = await admissionsAIService.generateDecisionRecommendation(request);

                expect(result.decision).toBe('ACCEPT');
                expect(result.confidence).toBeGreaterThan(90);
                expect(result.scholarshipEligibility?.eligible).toBe(true);
                expect(result.strengths.length).toBeGreaterThan(0);
            });

            it('should generate REJECT recommendation with alternative pathways', async () => {
                const mockRecommendation = {
                    decision: 'REJECT',
                    confidence: 85,
                    reasoning: 'Does not currently meet admission standards',
                    strengths: ['Sincere faith'],
                    concerns: ['Academic preparation', 'Unclear calling'],
                    recommendations: ['Strengthen academic foundation', 'Seek spiritual mentorship'],
                    scholarshipEligibility: null,
                    alternativePathways: [
                        'Complete prerequisite courses at community college',
                        'Gain ministry experience',
                        'Reapply after spiritual formation'
                    ]
                };

                mockAIGateway.generateCompletion = jest.fn().mockResolvedValue({
                    content: JSON.stringify(mockRecommendation)
                });

                const request = {
                    applicationId: 'app-789',
                    overallScore: 50,
                    componentScores: {
                        academic: 45,
                        spiritual: 55,
                        leadership: 48,
                        missionAlignment: 52
                    },
                    essayEvaluations: []
                };

                const result = await admissionsAIService.generateDecisionRecommendation(request);

                expect(result.decision).toBe('REJECT');
                expect(result.alternativePathways).toBeDefined();
                expect(result.alternativePathways!.length).toBeGreaterThan(0);
            });
        });
    });

    describe('Decision Letter Generation', () => {
        describe('generateDecisionLetter', () => {
            it('should generate acceptance letter with scholarship info', async () => {
                const mockLetter = {
                    subject: 'Congratulations! Welcome to ScrollUniversity',
                    body: 'Dear John,\n\nWe are thrilled to offer you admission...',
                    personalizedElements: ['Mentioned leadership experience', 'Referenced spiritual testimony']
                };

                mockAIGateway.generateCompletion = jest.fn().mockResolvedValue({
                    content: JSON.stringify(mockLetter)
                });

                const request = {
                    applicationId: 'app-123',
                    applicantName: 'John Doe',
                    decision: 'ACCEPT' as const,
                    overallScore: 90,
                    strengths: ['Academic excellence', 'Spiritual maturity'],
                    scholarshipInfo: {
                        amount: 10000,
                        type: 'Merit Scholarship'
                    },
                    programApplied: 'Bachelor of Theology'
                };

                const result = await admissionsAIService.generateDecisionLetter(request);

                expect(result.letterType).toBe('ACCEPTANCE');
                expect(result.tone).toBe('CONGRATULATORY');
                expect(result.subject).toBeDefined();
                expect(result.body).toBeDefined();
                expect(result.body).toContain('John');
                expect(result.personalizedElements.length).toBeGreaterThan(0);
            });

            it('should generate rejection letter with constructive feedback', async () => {
                const mockLetter = {
                    subject: 'ScrollUniversity Application Decision',
                    body: 'Dear Jane,\n\nThank you for your application...',
                    personalizedElements: ['Acknowledged strengths', 'Provided growth areas']
                };

                mockAIGateway.generateCompletion = jest.fn().mockResolvedValue({
                    content: JSON.stringify(mockLetter)
                });

                const request = {
                    applicationId: 'app-789',
                    applicantName: 'Jane Smith',
                    decision: 'REJECT' as const,
                    overallScore: 50,
                    strengths: ['Sincere faith'],
                    concerns: ['Academic preparation'],
                    alternativePathways: ['Complete prerequisite courses'],
                    programApplied: 'Bachelor of Ministry'
                };

                const result = await admissionsAIService.generateDecisionLetter(request);

                expect(result.letterType).toBe('REJECTION');
                expect(result.tone).toBe('CONSTRUCTIVE');
                expect(result.subject).toBeDefined();
                expect(result.body).toBeDefined();
                expect(result.body).toContain('Jane');
            });

            it('should generate waitlist letter with encouragement', async () => {
                const mockLetter = {
                    subject: 'ScrollUniversity Application Update - Waitlist',
                    body: 'Dear Alex,\n\nThank you for your application...',
                    personalizedElements: ['Highlighted strengths', 'Explained waitlist process']
                };

                mockAIGateway.generateCompletion = jest.fn().mockResolvedValue({
                    content: JSON.stringify(mockLetter)
                });

                const request = {
                    applicationId: 'app-456',
                    applicantName: 'Alex Johnson',
                    decision: 'WAITLIST' as const,
                    overallScore: 70,
                    strengths: ['Good academic record', 'Growing faith'],
                    programApplied: 'Bachelor of Christian Leadership'
                };

                const result = await admissionsAIService.generateDecisionLetter(request);

                expect(result.letterType).toBe('WAITLIST');
                expect(result.tone).toBe('ENCOURAGING');
                expect(result.subject).toBeDefined();
                expect(result.body).toBeDefined();
            });
        });
    });

    describe('Metrics', () => {
        describe('getMetrics', () => {
            it('should return admissions AI metrics', async () => {
                const startDate = new Date('2024-01-01');
                const endDate = new Date('2024-01-31');

                const metrics = await admissionsAIService.getMetrics(startDate, endDate);

                expect(metrics).toBeDefined();
                expect(metrics.period.start).toEqual(startDate);
                expect(metrics.period.end).toEqual(endDate);
                expect(typeof metrics.totalApplicationsProcessed).toBe('number');
                expect(typeof metrics.averageProcessingTime).toBe('number');
                expect(typeof metrics.averageConfidence).toBe('number');
            });
        });
    });
});
