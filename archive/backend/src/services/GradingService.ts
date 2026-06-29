/**
 * ScrollUniversity Grading Service
 * "Whatever you do, work at it with all your heart, as working for the Lord" - Colossians 3:23
 * 
 * Automated grading system for code, essays, and math with AI-powered evaluation
 */

import { aiGatewayService } from './AIGatewayService';
import { gradingConfidenceService } from './GradingConfidenceService';
import { logger } from '../utils/productionLogger';
import { v4 as uuidv4 } from 'uuid';
import { AIModel } from '../types/ai.types';

// Grading Types
export interface GradingRubric {
    criteria: RubricCriterion[];
    maxPoints: number;
    passingScore: number;
}

export interface RubricCriterion {
    name: string;
    description: string;
    maxPoints: number;
    weight: number;
}

export interface CodeSubmission {
    code: string;
    language: string;
    testCases?: TestCase[];
    requirements?: string[];
}

export interface TestCase {
    input: string;
    expectedOutput: string;
    description?: string;
}

export interface CodeGrade {
    correctness: number;
    efficiency: number;
    style: number;
    documentation: number;
    overallScore: number;
    lineByLineFeedback: CodeFeedback[];
    suggestions: string[];
    confidence: number;
    testResults?: TestResult[];
}

export interface CodeFeedback {
    lineNumber: number;
    severity: 'error' | 'warning' | 'info' | 'suggestion';
    message: string;
    category: 'correctness' | 'style' | 'efficiency' | 'documentation';
}

export interface TestResult {
    testCase: TestCase;
    passed: boolean;
    actualOutput?: string;
    error?: string;
}

export interface EssaySubmission {
    text: string;
    prompt: string;
    wordLimit?: number;
    citationStyle?: 'APA' | 'MLA' | 'Chicago';
}

export interface EssayGrade {
    thesisClarity: number;
    argumentStructure: number;
    evidenceQuality: number;
    writingQuality: number;
    citationAccuracy: number;
    overallScore: number;
    paragraphFeedback: ParagraphFeedback[];
    suggestions: string[];
    confidence: number;
}

export interface ParagraphFeedback {
    paragraphNumber: number;
    strengths: string[];
    weaknesses: string[];
    suggestions: string[];
}

export interface MathSubmission {
    problem: string;
    solution: string;
    workShown: string;
    expectedAnswer?: string;
}

export interface MathGrade {
    methodology: number;
    correctness: number;
    conceptualUnderstanding: number;
    overallScore: number;
    stepByStepFeedback: StepFeedback[];
    hints: string[];
    confidence: number;
}

export interface StepFeedback {
    stepNumber: number;
    isCorrect: boolean;
    feedback: string;
    conceptError?: string;
}

export interface GradeResult {
    submissionId: string;
    grade: CodeGrade | EssayGrade | MathGrade;
    confidence: number;
    requiresHumanReview: boolean;
    reviewReason?: string;
    gradedAt: Date;
    cost: number;
}

export class GradingService {
    private readonly CONFIDENCE_THRESHOLD = 0.85;
    private readonly DEFAULT_MODEL: AIModel = 'gpt-4-turbo';

    /**
     * Grade code submission
     */
    async gradeCode(
        submission: CodeSubmission,
        rubric: GradingRubric,
        submissionId?: string,
        assignmentId?: string,
        studentId?: string
    ): Promise<GradeResult> {
        const id = submissionId || uuidv4();
        const startTime = Date.now();

        try {
            logger.info('Starting code grading', {
                submissionId: id,
                language: submission.language,
                hasTestCases: !!submission.testCases
            });

            // Run test cases if provided
            let testResults: TestResult[] | undefined;
            if (submission.testCases && submission.testCases.length > 0) {
                testResults = await this.runTestCases(submission);
            }

            // Generate AI evaluation
            const aiEvaluation = await this.evaluateCodeWithAI(submission, rubric, testResults);

            // Calculate confidence
            const confidence = this.calculateCodeConfidence(aiEvaluation, testResults);

            // Analyze confidence with detailed factors
            const confidenceAnalysis = gradingConfidenceService.analyzeConfidence(
                id,
                aiEvaluation,
                confidence,
                'code'
            );

            // Determine if human review is needed
            const requiresHumanReview = confidence < this.CONFIDENCE_THRESHOLD;
            const reviewReason = requiresHumanReview 
                ? confidenceAnalysis.reasoning
                : undefined;

            // Add to review queue if needed
            if (requiresHumanReview && assignmentId && studentId) {
                await gradingConfidenceService.addToReviewQueue(
                    id,
                    assignmentId,
                    studentId,
                    'code',
                    aiEvaluation,
                    confidence,
                    reviewReason!
                );
            }

            const result: GradeResult = {
                submissionId: id,
                grade: aiEvaluation,
                confidence,
                requiresHumanReview,
                reviewReason,
                gradedAt: new Date(),
                cost: 0 // Will be updated by AI gateway
            };

            logger.info('Code grading completed', {
                submissionId: id,
                overallScore: aiEvaluation.overallScore,
                confidence,
                requiresHumanReview,
                duration: Date.now() - startTime
            });

            return result;

        } catch (error: any) {
            logger.error('Code grading error', {
                submissionId: id,
                error: error.message
            });
            throw error;
        }
    }

    /**
     * Run test cases for code submission
     */
    private async runTestCases(submission: CodeSubmission): Promise<TestResult[]> {
        // Note: This is a simplified implementation
        // In production, this would use a secure sandbox environment
        const results: TestResult[] = [];

        for (const testCase of submission.testCases || []) {
            try {
                // Use AI to simulate code execution for safety
                const executionResult = await this.simulateCodeExecution(
                    submission.code,
                    submission.language,
                    testCase
                );

                results.push({
                    testCase,
                    passed: executionResult.passed,
                    actualOutput: executionResult.output,
                    error: executionResult.error
                });
            } catch (error: any) {
                results.push({
                    testCase,
                    passed: false,
                    error: error.message
                });
            }
        }

        return results;
    }

    /**
     * Simulate code execution using AI
     */
    private async simulateCodeExecution(
        code: string,
        language: string,
        testCase: TestCase
    ): Promise<{ passed: boolean; output?: string; error?: string }> {
        const prompt = `You are a code execution simulator. Analyze this ${language} code and determine what output it would produce for the given input.

Code:
\`\`\`${language}
${code}
\`\`\`

Test Input: ${testCase.input}
Expected Output: ${testCase.expectedOutput}

Simulate the execution and respond in JSON format:
{
  "output": "actual output the code would produce",
  "passed": true/false (whether output matches expected),
  "error": "error message if code would fail, null otherwise"
}`;

        const response = await aiGatewayService.generateCompletion({
            model: this.DEFAULT_MODEL,
            messages: [
                {
                    role: 'system',
                    content: 'You are a code execution simulator. Analyze code and predict its output accurately.'
                },
                {
                    role: 'user',
                    content: prompt
                }
            ],
            temperature: 0.1,
            maxTokens: 1000
        });

        try {
            const result = JSON.parse(response.content);
            return {
                passed: result.passed,
                output: result.output,
                error: result.error
            };
        } catch {
            return {
                passed: false,
                error: 'Failed to parse execution result'
            };
        }
    }

    /**
     * Evaluate code with AI
     */
    private async evaluateCodeWithAI(
        submission: CodeSubmission,
        rubric: GradingRubric,
        testResults?: TestResult[]
    ): Promise<CodeGrade> {
        const testResultsSummary = testResults 
            ? `\n\nTest Results:\n${testResults.map((r, i) => 
                `Test ${i + 1}: ${r.passed ? 'PASSED' : 'FAILED'}${r.error ? ` - ${r.error}` : ''}`
              ).join('\n')}`
            : '';

        const prompt = `You are an expert code reviewer and educator. Grade this ${submission.language} code submission according to the rubric.

Code:
\`\`\`${submission.language}
${submission.code}
\`\`\`

Requirements:
${submission.requirements?.map((r, i) => `${i + 1}. ${r}`).join('\n') || 'None specified'}
${testResultsSummary}

Rubric:
${rubric.criteria.map(c => `- ${c.name} (${c.maxPoints} points): ${c.description}`).join('\n')}

Provide a detailed evaluation in JSON format:
{
  "correctness": 0-100 (does the code work correctly?),
  "efficiency": 0-100 (is the code efficient?),
  "style": 0-100 (does it follow best practices?),
  "documentation": 0-100 (is it well-documented?),
  "overallScore": 0-100 (weighted average),
  "lineByLineFeedback": [
    {
      "lineNumber": 1,
      "severity": "error|warning|info|suggestion",
      "message": "specific feedback",
      "category": "correctness|style|efficiency|documentation"
    }
  ],
  "suggestions": ["specific improvement suggestions"],
  "testResults": ${JSON.stringify(testResults || [])}
}

Be constructive, specific, and educational in your feedback.`;

        const response = await aiGatewayService.generateCompletion({
            model: this.DEFAULT_MODEL,
            messages: [
                {
                    role: 'system',
                    content: 'You are an expert code reviewer with world-class standards. Provide detailed, constructive feedback that helps students learn.'
                },
                {
                    role: 'user',
                    content: prompt
                }
            ],
            temperature: 0.3,
            maxTokens: 2000
        });

        try {
            const grade = JSON.parse(response.content);
            return {
                ...grade,
                testResults
            };
        } catch (error) {
            logger.error('Failed to parse code grading response', { error });
            throw new Error('Failed to parse grading response');
        }
    }

    /**
     * Calculate confidence score for code grading
     */
    private calculateCodeConfidence(grade: CodeGrade, testResults?: TestResult[]): number {
        let confidence = 0.7; // Base confidence

        // Increase confidence if test cases passed
        if (testResults && testResults.length > 0) {
            const passRate = testResults.filter(r => r.passed).length / testResults.length;
            confidence += passRate * 0.2;
        }

        // Decrease confidence for edge cases
        if (grade.overallScore < 40 || grade.overallScore > 95) {
            confidence -= 0.1;
        }

        // Decrease confidence if many critical issues
        const criticalIssues = grade.lineByLineFeedback.filter(f => f.severity === 'error').length;
        if (criticalIssues > 5) {
            confidence -= 0.15;
        }

        return Math.max(0, Math.min(1, confidence));
    }

    /**
     * Get reason for human review
     */
    private getReviewReason(confidence: number, grade: any): string {
        if (confidence < 0.5) {
            return 'Low confidence in automated grading';
        }
        if (grade.overallScore < 40) {
            return 'Very low score requires verification';
        }
        if (grade.overallScore > 95) {
            return 'Exceptionally high score requires verification';
        }
        return 'Confidence below threshold';
    }

    /**
     * Grade essay submission
     */
    async gradeEssay(
        submission: EssaySubmission,
        rubric: GradingRubric,
        submissionId?: string,
        assignmentId?: string,
        studentId?: string
    ): Promise<GradeResult> {
        const id = submissionId || uuidv4();
        const startTime = Date.now();

        try {
            logger.info('Starting essay grading', {
                submissionId: id,
                wordCount: submission.text.split(/\s+/).length,
                citationStyle: submission.citationStyle
            });

            // Generate AI evaluation
            const aiEvaluation = await this.evaluateEssayWithAI(submission, rubric);

            // Calculate confidence
            const confidence = this.calculateEssayConfidence(aiEvaluation, submission);

            // Analyze confidence with detailed factors
            const confidenceAnalysis = gradingConfidenceService.analyzeConfidence(
                id,
                aiEvaluation,
                confidence,
                'essay'
            );

            // Determine if human review is needed
            const requiresHumanReview = confidence < this.CONFIDENCE_THRESHOLD;
            const reviewReason = requiresHumanReview 
                ? confidenceAnalysis.reasoning
                : undefined;

            // Add to review queue if needed
            if (requiresHumanReview && assignmentId && studentId) {
                await gradingConfidenceService.addToReviewQueue(
                    id,
                    assignmentId,
                    studentId,
                    'essay',
                    aiEvaluation,
                    confidence,
                    reviewReason!
                );
            }

            const result: GradeResult = {
                submissionId: id,
                grade: aiEvaluation,
                confidence,
                requiresHumanReview,
                reviewReason,
                gradedAt: new Date(),
                cost: 0
            };

            logger.info('Essay grading completed', {
                submissionId: id,
                overallScore: aiEvaluation.overallScore,
                confidence,
                requiresHumanReview,
                duration: Date.now() - startTime
            });

            return result;

        } catch (error: any) {
            logger.error('Essay grading error', {
                submissionId: id,
                error: error.message
            });
            throw error;
        }
    }

    /**
     * Evaluate essay with AI
     */
    private async evaluateEssayWithAI(
        submission: EssaySubmission,
        rubric: GradingRubric
    ): Promise<EssayGrade> {
        const wordCount = submission.text.split(/\s+/).length;
        const wordLimitNote = submission.wordLimit 
            ? `\nWord Limit: ${submission.wordLimit} (Actual: ${wordCount})`
            : '';

        const prompt = `You are an expert essay grader with world-class academic standards. Grade this essay according to the rubric.

Essay Prompt:
${submission.prompt}

Essay:
${submission.text}
${wordLimitNote}

Citation Style: ${submission.citationStyle || 'Not specified'}

Rubric:
${rubric.criteria.map(c => `- ${c.name} (${c.maxPoints} points): ${c.description}`).join('\n')}

Provide a detailed evaluation in JSON format:
{
  "thesisClarity": 0-100 (is the thesis clear and well-articulated?),
  "argumentStructure": 0-100 (is the argument logical and well-organized?),
  "evidenceQuality": 0-100 (is evidence strong and relevant?),
  "writingQuality": 0-100 (grammar, style, clarity),
  "citationAccuracy": 0-100 (are citations correct and properly formatted?),
  "overallScore": 0-100 (weighted average based on rubric),
  "paragraphFeedback": [
    {
      "paragraphNumber": 1,
      "strengths": ["specific strengths"],
      "weaknesses": ["specific weaknesses"],
      "suggestions": ["specific improvements"]
    }
  ],
  "suggestions": ["overall improvement suggestions"]
}

Be constructive, specific, and educational. Focus on helping the student improve.`;

        const response = await aiGatewayService.generateCompletion({
            model: this.DEFAULT_MODEL,
            messages: [
                {
                    role: 'system',
                    content: 'You are an expert essay grader with Harvard/MIT-level standards. Provide detailed, constructive feedback that helps students develop critical thinking and writing skills.'
                },
                {
                    role: 'user',
                    content: prompt
                }
            ],
            temperature: 0.3,
            maxTokens: 3000
        });

        try {
            const grade = JSON.parse(response.content);
            return grade;
        } catch (error) {
            logger.error('Failed to parse essay grading response', { error });
            throw new Error('Failed to parse grading response');
        }
    }

    /**
     * Calculate confidence score for essay grading
     */
    private calculateEssayConfidence(grade: EssayGrade, submission: EssaySubmission): number {
        let confidence = 0.75; // Base confidence for essays

        // Check word count compliance
        if (submission.wordLimit) {
            const wordCount = submission.text.split(/\s+/).length;
            const deviation = Math.abs(wordCount - submission.wordLimit) / submission.wordLimit;
            if (deviation > 0.2) {
                confidence -= 0.1; // Significant deviation from word limit
            }
        }

        // Check for very short or very long essays
        const wordCount = submission.text.split(/\s+/).length;
        if (wordCount < 100) {
            confidence -= 0.2; // Too short
        } else if (wordCount > 5000) {
            confidence -= 0.1; // Very long
        }

        // Decrease confidence for edge scores
        if (grade.overallScore < 40 || grade.overallScore > 95) {
            confidence -= 0.1;
        }

        // Check for consistency across criteria
        const scores = [
            grade.thesisClarity,
            grade.argumentStructure,
            grade.evidenceQuality,
            grade.writingQuality,
            grade.citationAccuracy
        ];
        const variance = this.calculateVariance(scores);
        if (variance > 400) {
            confidence -= 0.1; // High variance suggests inconsistency
        }

        return Math.max(0, Math.min(1, confidence));
    }

    /**
     * Calculate variance of scores
     */
    private calculateVariance(scores: number[]): number {
        const mean = scores.reduce((a, b) => a + b, 0) / scores.length;
        const squaredDiffs = scores.map(score => Math.pow(score - mean, 2));
        return squaredDiffs.reduce((a, b) => a + b, 0) / scores.length;
    }

    /**
     * Grade math submission
     */
    async gradeMath(
        submission: MathSubmission,
        rubric: GradingRubric,
        submissionId?: string,
        assignmentId?: string,
        studentId?: string
    ): Promise<GradeResult> {
        const id = submissionId || uuidv4();
        const startTime = Date.now();

        try {
            logger.info('Starting math grading', {
                submissionId: id,
                hasSolution: !!submission.solution,
                hasWork: !!submission.workShown
            });

            // Generate AI evaluation
            const aiEvaluation = await this.evaluateMathWithAI(submission, rubric);

            // Calculate confidence
            const confidence = this.calculateMathConfidence(aiEvaluation, submission);

            // Analyze confidence with detailed factors
            const confidenceAnalysis = gradingConfidenceService.analyzeConfidence(
                id,
                aiEvaluation,
                confidence,
                'math'
            );

            // Determine if human review is needed
            const requiresHumanReview = confidence < this.CONFIDENCE_THRESHOLD;
            const reviewReason = requiresHumanReview 
                ? confidenceAnalysis.reasoning
                : undefined;

            // Add to review queue if needed
            if (requiresHumanReview && assignmentId && studentId) {
                await gradingConfidenceService.addToReviewQueue(
                    id,
                    assignmentId,
                    studentId,
                    'math',
                    aiEvaluation,
                    confidence,
                    reviewReason!
                );
            }

            const result: GradeResult = {
                submissionId: id,
                grade: aiEvaluation,
                confidence,
                requiresHumanReview,
                reviewReason,
                gradedAt: new Date(),
                cost: 0
            };

            logger.info('Math grading completed', {
                submissionId: id,
                overallScore: aiEvaluation.overallScore,
                confidence,
                requiresHumanReview,
                duration: Date.now() - startTime
            });

            return result;

        } catch (error: any) {
            logger.error('Math grading error', {
                submissionId: id,
                error: error.message
            });
            throw error;
        }
    }

    /**
     * Evaluate math submission with AI
     */
    private async evaluateMathWithAI(
        submission: MathSubmission,
        rubric: GradingRubric
    ): Promise<MathGrade> {
        const expectedAnswerNote = submission.expectedAnswer 
            ? `\nExpected Answer: ${submission.expectedAnswer}`
            : '';

        const prompt = `You are an expert mathematics educator and grader. Grade this math solution according to the rubric.

Problem:
${submission.problem}
${expectedAnswerNote}

Student's Solution:
${submission.solution}

Work Shown:
${submission.workShown}

Rubric:
${rubric.criteria.map(c => `- ${c.name} (${c.maxPoints} points): ${c.description}`).join('\n')}

Provide a detailed evaluation in JSON format:
{
  "methodology": 0-100 (is the approach correct and well-reasoned?),
  "correctness": 0-100 (is the final answer correct?),
  "conceptualUnderstanding": 0-100 (does the student understand the concepts?),
  "overallScore": 0-100 (weighted average based on rubric),
  "stepByStepFeedback": [
    {
      "stepNumber": 1,
      "isCorrect": true/false,
      "feedback": "specific feedback on this step",
      "conceptError": "conceptual error if any, null otherwise"
    }
  ],
  "hints": ["hints for improvement without giving away the answer"]
}

Be educational and help the student understand where they went wrong and how to improve.`;

        const response = await aiGatewayService.generateCompletion({
            model: this.DEFAULT_MODEL,
            messages: [
                {
                    role: 'system',
                    content: 'You are an expert mathematics educator. Evaluate mathematical work with precision and provide constructive feedback that helps students understand concepts deeply.'
                },
                {
                    role: 'user',
                    content: prompt
                }
            ],
            temperature: 0.2,
            maxTokens: 2000
        });

        try {
            const grade = JSON.parse(response.content);
            return grade;
        } catch (error) {
            logger.error('Failed to parse math grading response', { error });
            throw new Error('Failed to parse grading response');
        }
    }

    /**
     * Calculate confidence score for math grading
     */
    private calculateMathConfidence(grade: MathGrade, submission: MathSubmission): number {
        let confidence = 0.8; // Base confidence for math (more objective)

        // Check if work is shown
        if (!submission.workShown || submission.workShown.trim().length < 50) {
            confidence -= 0.2; // No work shown reduces confidence
        }

        // Check if expected answer is provided for verification
        if (submission.expectedAnswer) {
            confidence += 0.1; // Can verify against expected answer
        }

        // Decrease confidence for edge scores
        if (grade.overallScore < 40 || grade.overallScore > 95) {
            confidence -= 0.1;
        }

        // Check for conceptual errors
        const conceptualErrors = grade.stepByStepFeedback.filter(f => f.conceptError).length;
        if (conceptualErrors > 2) {
            confidence -= 0.15; // Multiple conceptual errors need human review
        }

        // Check consistency between methodology and correctness
        const scoreDiff = Math.abs(grade.methodology - grade.correctness);
        if (scoreDiff > 30) {
            confidence -= 0.1; // Large discrepancy suggests complexity
        }

        return Math.max(0, Math.min(1, confidence));
    }
}

// Singleton instance
export const gradingService = new GradingService();
