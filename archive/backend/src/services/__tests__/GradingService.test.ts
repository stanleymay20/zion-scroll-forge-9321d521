/**
 * ScrollUniversity Grading Service Tests
 * "Test everything; hold fast what is good" - 1 Thessalonians 5:21
 */

import { gradingService } from '../GradingService';
import { gradingConfidenceService } from '../GradingConfidenceService';
import {
    CodeSubmission,
    EssaySubmission,
    MathSubmission,
    GradingRubric
} from '../GradingService';

describe('GradingService', () => {
    // Sample rubric
    const sampleRubric: GradingRubric = {
        criteria: [
            {
                name: 'Correctness',
                description: 'Does the solution work correctly?',
                maxPoints: 40,
                weight: 0.4
            },
            {
                name: 'Quality',
                description: 'Is the solution well-written?',
                maxPoints: 30,
                weight: 0.3
            },
            {
                name: 'Documentation',
                description: 'Is the solution well-documented?',
                maxPoints: 30,
                weight: 0.3
            }
        ],
        maxPoints: 100,
        passingScore: 70
    };

    describe('Code Grading', () => {
        it('should grade a simple code submission', async () => {
            const submission: CodeSubmission = {
                code: `
function fibonacci(n) {
    if (n <= 1) return n;
    return fibonacci(n - 1) + fibonacci(n - 2);
}
                `,
                language: 'javascript',
                requirements: [
                    'Implement a recursive Fibonacci function',
                    'Handle base cases correctly'
                ]
            };

            const result = await gradingService.gradeCode(submission, sampleRubric);

            expect(result).toBeDefined();
            expect(result.submissionId).toBeDefined();
            expect(result.grade).toBeDefined();
            expect(result.grade.overallScore).toBeGreaterThanOrEqual(0);
            expect(result.grade.overallScore).toBeLessThanOrEqual(100);
            expect(result.confidence).toBeGreaterThanOrEqual(0);
            expect(result.confidence).toBeLessThanOrEqual(1);
            expect(typeof result.requiresHumanReview).toBe('boolean');
        }, 30000);

        it('should grade code with test cases', async () => {
            const submission: CodeSubmission = {
                code: `
function add(a, b) {
    return a + b;
}
                `,
                language: 'javascript',
                testCases: [
                    {
                        input: 'add(2, 3)',
                        expectedOutput: '5',
                        description: 'Add two positive numbers'
                    },
                    {
                        input: 'add(-1, 1)',
                        expectedOutput: '0',
                        description: 'Add negative and positive'
                    }
                ]
            };

            const result = await gradingService.gradeCode(submission, sampleRubric);

            expect(result).toBeDefined();
            expect(result.grade.testResults).toBeDefined();
            expect(result.grade.testResults?.length).toBe(2);
        }, 30000);

        it('should flag low-quality code for review', async () => {
            const submission: CodeSubmission = {
                code: `
function x(a,b){return a+b}
                `,
                language: 'javascript',
                requirements: [
                    'Write clean, well-documented code',
                    'Use meaningful variable names'
                ]
            };

            const result = await gradingService.gradeCode(submission, sampleRubric);

            expect(result).toBeDefined();
            // Low quality code should have lower confidence
            expect(result.confidence).toBeLessThan(0.9);
        }, 30000);
    });

    describe('Essay Grading', () => {
        it('should grade a well-structured essay', async () => {
            const submission: EssaySubmission = {
                text: `
The impact of artificial intelligence on modern education is profound and multifaceted. 
This essay will explore three key areas: personalized learning, accessibility, and the 
changing role of educators.

First, AI enables unprecedented personalization in education. Through adaptive learning 
systems, students can receive instruction tailored to their individual pace and learning 
style. Research by Smith (2023) demonstrates that personalized AI tutoring can improve 
learning outcomes by up to 30%.

Second, AI dramatically improves accessibility. Students with disabilities can benefit 
from AI-powered assistive technologies, while those in remote areas gain access to 
world-class educational resources. This democratization of education has the potential 
to reduce global inequality.

Finally, AI is transforming the role of educators from information providers to learning 
facilitators. Teachers can focus on mentorship and critical thinking development while 
AI handles routine tasks like grading and content delivery.

In conclusion, AI represents a transformative force in education that promises to make 
learning more personalized, accessible, and effective for all students.
                `,
                prompt: 'Discuss the impact of AI on modern education',
                wordLimit: 300,
                citationStyle: 'APA'
            };

            const result = await gradingService.gradeEssay(submission, sampleRubric);

            expect(result).toBeDefined();
            expect(result.grade.thesisClarity).toBeGreaterThanOrEqual(0);
            expect(result.grade.argumentStructure).toBeGreaterThanOrEqual(0);
            expect(result.grade.evidenceQuality).toBeGreaterThanOrEqual(0);
            expect(result.grade.writingQuality).toBeGreaterThanOrEqual(0);
            expect(result.grade.citationAccuracy).toBeGreaterThanOrEqual(0);
            expect(result.grade.paragraphFeedback).toBeDefined();
            expect(result.grade.suggestions).toBeDefined();
        }, 30000);

        it('should flag very short essays for review', async () => {
            const submission: EssaySubmission = {
                text: 'AI is good for education.',
                prompt: 'Discuss the impact of AI on modern education',
                wordLimit: 300
            };

            const result = await gradingService.gradeEssay(submission, sampleRubric);

            expect(result).toBeDefined();
            expect(result.requiresHumanReview).toBe(true);
            expect(result.confidence).toBeLessThan(0.85);
        }, 30000);
    });

    describe('Math Grading', () => {
        it('should grade a math solution with work shown', async () => {
            const submission: MathSubmission = {
                problem: 'Solve for x: 2x + 5 = 13',
                solution: 'x = 4',
                workShown: `
2x + 5 = 13
2x = 13 - 5
2x = 8
x = 8 / 2
x = 4
                `,
                expectedAnswer: 'x = 4'
            };

            const result = await gradingService.gradeMath(submission, sampleRubric);

            expect(result).toBeDefined();
            expect(result.grade.methodology).toBeGreaterThanOrEqual(0);
            expect(result.grade.correctness).toBeGreaterThanOrEqual(0);
            expect(result.grade.conceptualUnderstanding).toBeGreaterThanOrEqual(0);
            expect(result.grade.stepByStepFeedback).toBeDefined();
            expect(result.grade.hints).toBeDefined();
        }, 30000);

        it('should flag solutions without work for review', async () => {
            const submission: MathSubmission = {
                problem: 'Solve for x: 2x + 5 = 13',
                solution: 'x = 4',
                workShown: ''
            };

            const result = await gradingService.gradeMath(submission, sampleRubric);

            expect(result).toBeDefined();
            expect(result.confidence).toBeLessThan(0.85);
        }, 30000);
    });

    describe('Confidence System', () => {
        it('should analyze confidence with detailed factors', () => {
            const grade = {
                overallScore: 85,
                correctness: 90,
                efficiency: 80,
                style: 85,
                documentation: 85,
                lineByLineFeedback: [],
                suggestions: [],
                confidence: 0.9
            };

            const analysis = gradingConfidenceService.analyzeConfidence(
                'test-submission-1',
                grade,
                0.9,
                'code'
            );

            expect(analysis).toBeDefined();
            expect(analysis.confidence).toBe(0.9);
            expect(analysis.factors).toBeDefined();
            expect(analysis.factors.length).toBeGreaterThan(0);
            expect(analysis.recommendation).toBe('auto_grade');
            expect(analysis.reasoning).toBeDefined();
        });

        it('should recommend human review for low confidence', () => {
            const grade = {
                overallScore: 45,
                correctness: 40,
                efficiency: 50,
                style: 45,
                documentation: 45,
                lineByLineFeedback: [
                    { lineNumber: 1, severity: 'error' as const, message: 'Critical error', category: 'correctness' as const },
                    { lineNumber: 2, severity: 'error' as const, message: 'Critical error', category: 'correctness' as const }
                ],
                suggestions: [],
                confidence: 0.6
            };

            const analysis = gradingConfidenceService.analyzeConfidence(
                'test-submission-2',
                grade,
                0.6,
                'code'
            );

            expect(analysis.recommendation).toBe('human_review');
        });

        it('should escalate very low confidence submissions', () => {
            const grade = {
                overallScore: 25,
                correctness: 20,
                efficiency: 30,
                style: 25,
                documentation: 25,
                lineByLineFeedback: [],
                suggestions: [],
                confidence: 0.4
            };

            const analysis = gradingConfidenceService.analyzeConfidence(
                'test-submission-3',
                grade,
                0.4,
                'code'
            );

            expect(analysis.recommendation).toBe('escalate');
        });
    });

    describe('Review Queue Management', () => {
        it('should add submission to review queue', async () => {
            const queueItem = await gradingConfidenceService.addToReviewQueue(
                'submission-1',
                'assignment-1',
                'student-1',
                'code',
                { overallScore: 75 },
                0.7,
                'Moderate confidence requires review'
            );

            expect(queueItem).toBeDefined();
            expect(queueItem.id).toBeDefined();
            expect(queueItem.submissionId).toBe('submission-1');
            expect(queueItem.priority).toBeDefined();
            expect(queueItem.status).toBe('pending');
        });

        it('should retrieve review queue items', async () => {
            // Add a few items
            await gradingConfidenceService.addToReviewQueue(
                'submission-2',
                'assignment-1',
                'student-2',
                'essay',
                { overallScore: 80 },
                0.75,
                'Review needed'
            );

            const queue = await gradingConfidenceService.getReviewQueue();

            expect(queue).toBeDefined();
            expect(Array.isArray(queue)).toBe(true);
        });

        it('should assign review to faculty', async () => {
            const queueItem = await gradingConfidenceService.addToReviewQueue(
                'submission-3',
                'assignment-1',
                'student-3',
                'math',
                { overallScore: 70 },
                0.65,
                'Low confidence'
            );

            const assigned = await gradingConfidenceService.assignReview(
                queueItem.id,
                'faculty-1'
            );

            expect(assigned).toBeDefined();
            expect(assigned.assignedReviewerId).toBe('faculty-1');
            expect(assigned.status).toBe('in_review');
        });

        it('should submit faculty override', async () => {
            const queueItem = await gradingConfidenceService.addToReviewQueue(
                'submission-4',
                'assignment-1',
                'student-4',
                'code',
                { overallScore: 75 },
                0.7,
                'Review needed'
            );

            await gradingConfidenceService.assignReview(queueItem.id, 'faculty-1');

            const override = await gradingConfidenceService.submitFacultyOverride(
                queueItem.id,
                'faculty-1',
                { overallScore: 80 },
                'AI underestimated code quality',
                'Good work with minor improvements needed'
            );

            expect(override).toBeDefined();
            expect(override.facultyId).toBe('faculty-1');
            expect(override.overriddenGrade.overallScore).toBe(80);
            expect(typeof override.agreedWithAI).toBe('boolean');
        });
    });

    describe('Accuracy Metrics', () => {
        it('should track and retrieve accuracy metrics', async () => {
            const metrics = await gradingConfidenceService.getAccuracyMetrics();

            expect(metrics).toBeDefined();
            expect(metrics.totalGrades).toBeGreaterThanOrEqual(0);
            expect(metrics.humanReviewedGrades).toBeGreaterThanOrEqual(0);
            expect(metrics.bySubmissionType).toBeDefined();
            expect(metrics.bySubmissionType.code).toBeDefined();
            expect(metrics.bySubmissionType.essay).toBeDefined();
            expect(metrics.bySubmissionType.math).toBeDefined();
        });
    });
});
