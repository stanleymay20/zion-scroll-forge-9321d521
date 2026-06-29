/**
 * Career Services AI Service Tests
 * Comprehensive tests for AI-powered career services
 */

import CareerServicesAIService from '../CareerServicesAIService';
import {
  StudentProfile,
  Resume,
  JobRole,
  Timeframe,
} from '../../types/career-services.types';

describe('CareerServicesAIService', () => {
  let service: CareerServicesAIService;
  let mockStudentProfile: StudentProfile;
  let mockResume: Resume;
  let mockJobRole: JobRole;
  let mockTimeframe: Timeframe;

  beforeEach(() => {
    service = new CareerServicesAIService();

    mockStudentProfile = {
      studentId: 'student_123',
      skills: [
        {
          name: 'JavaScript',
          category: 'technical',
          proficiencyLevel: 'advanced',
          yearsOfExperience: 3,
          verified: true,
        },
        {
          name: 'Leadership',
          category: 'leadership',
          proficiencyLevel: 'intermediate',
          verified: true,
        },
      ],
      interests: ['Technology', 'Ministry', 'Education'],
      values: ['Faith', 'Service', 'Excellence'],
      education: [
        {
          institution: 'ScrollUniversity',
          degree: 'Bachelor of Science',
          major: 'Computer Science',
          gpa: 3.8,
          graduationDate: new Date('2024-05-15'),
          honors: ['Cum Laude'],
        },
      ],
      experience: [
        {
          company: 'Tech Ministry',
          position: 'Software Developer Intern',
          startDate: new Date('2023-06-01'),
          endDate: new Date('2023-08-31'),
          description: 'Developed web applications for ministry organizations',
          achievements: ['Built 3 production applications', 'Improved performance by 40%'],
          skills: ['JavaScript', 'React', 'Node.js'],
        },
      ],
      achievements: [
        {
          title: 'Hackathon Winner',
          description: 'Won first place in faith-tech hackathon',
          date: new Date('2023-10-15'),
          category: 'professional',
        },
      ],
      careerGoals: ['Software Engineer', 'Tech Lead', 'Ministry Technology'],
      preferredIndustries: ['Technology', 'Ministry', 'Education'],
      preferredLocations: ['Remote', 'Nashville'],
    };

    mockResume = {
      studentId: 'student_123',
      content: `John Doe
Software Developer
john@example.com | (555) 123-4567

SUMMARY
Passionate software developer with 3 years of experience building web applications.

EXPERIENCE
Software Developer Intern - Tech Ministry (Jun 2023 - Aug 2023)
- Developed web applications for ministry organizations
- Improved application performance by 40%

EDUCATION
Bachelor of Science in Computer Science - ScrollUniversity (2024)
GPA: 3.8, Cum Laude

SKILLS
JavaScript, React, Node.js, Python, Leadership`,
      format: 'txt',
      sections: [],
    };

    mockJobRole = {
      title: 'Software Engineer',
      level: 'entry',
      industry: 'Technology',
      description: 'Build innovative software solutions for ministry organizations',
    };

    mockTimeframe = {
      startDate: new Date('2023-01-01'),
      endDate: new Date('2024-12-31'),
      period: 'yearly',
    };
  });

  describe('Career Matching', () => {
    it('should match student to career paths', async () => {
      const response = await service.matchCareers({
        studentId: mockStudentProfile.studentId,
        profile: mockStudentProfile,
      });

      expect(response).toBeDefined();
      expect(response.matches).toBeDefined();
      expect(Array.isArray(response.matches)).toBe(true);
      expect(response.matches.length).toBeGreaterThan(0);
      expect(response.confidence).toBeGreaterThan(0);
      expect(response.timestamp).toBeInstanceOf(Date);

      // Check match structure
      const firstMatch = response.matches[0];
      expect(firstMatch.career).toBeDefined();
      expect(firstMatch.matchScore).toBeGreaterThanOrEqual(0);
      expect(firstMatch.matchScore).toBeLessThanOrEqual(100);
      expect(firstMatch.skillGaps).toBeDefined();
      expect(firstMatch.pathwaySteps).toBeDefined();
      expect(firstMatch.reasoning).toBeDefined();
    }, 30000);

    it('should consider preferences in career matching', async () => {
      const response = await service.matchCareers({
        studentId: mockStudentProfile.studentId,
        profile: mockStudentProfile,
        preferences: {
          industries: ['Technology', 'Ministry'],
          ministryFocus: true,
        },
      });

      expect(response.matches).toBeDefined();
      expect(response.matches.length).toBeGreaterThan(0);

      // Matches should align with preferences
      const hasPreferredIndustry = response.matches.some(match =>
        ['Technology', 'Ministry'].includes(match.career.industry)
      );
      expect(hasPreferredIndustry).toBe(true);
    }, 30000);

    it('should identify skill gaps', async () => {
      const response = await service.matchCareers({
        studentId: mockStudentProfile.studentId,
        profile: mockStudentProfile,
      });

      const matchWithGaps = response.matches.find(m => m.skillGaps.length > 0);
      if (matchWithGaps) {
        const gap = matchWithGaps.skillGaps[0];
        expect(gap.skill).toBeDefined();
        expect(gap.currentLevel).toBeDefined();
        expect(gap.requiredLevel).toBeDefined();
        expect(gap.priority).toBeDefined();
        expect(gap.recommendedResources).toBeDefined();
      }
    }, 30000);
  });

  describe('Resume Review', () => {
    it('should review resume and provide feedback', async () => {
      const response = await service.reviewResume({
        resume: mockResume,
        targetRole: 'Software Engineer',
        targetIndustry: 'Technology',
      });

      expect(response).toBeDefined();
      expect(response.feedback).toBeDefined();
      expect(response.feedback.overallScore).toBeGreaterThanOrEqual(0);
      expect(response.feedback.overallScore).toBeLessThanOrEqual(100);
      expect(response.feedback.contentScore).toBeGreaterThanOrEqual(0);
      expect(response.feedback.formattingScore).toBeGreaterThanOrEqual(0);
      expect(response.feedback.atsCompatibility).toBeGreaterThanOrEqual(0);
      expect(response.feedback.strengths).toBeDefined();
      expect(response.feedback.weaknesses).toBeDefined();
      expect(response.feedback.suggestions).toBeDefined();
      expect(response.timestamp).toBeInstanceOf(Date);
    }, 30000);

    it('should provide actionable suggestions', async () => {
      const response = await service.reviewResume({
        resume: mockResume,
      });

      expect(response.feedback.suggestions).toBeDefined();
      expect(Array.isArray(response.feedback.suggestions)).toBe(true);

      if (response.feedback.suggestions.length > 0) {
        const suggestion = response.feedback.suggestions[0];
        expect(suggestion.section).toBeDefined();
        expect(suggestion.priority).toBeDefined();
        expect(suggestion.issue).toBeDefined();
        expect(suggestion.recommendation).toBeDefined();
      }
    }, 30000);

    it('should analyze keyword optimization', async () => {
      const response = await service.reviewResume({
        resume: mockResume,
        targetRole: 'Software Engineer',
      });

      expect(response.feedback.keywordOptimization).toBeDefined();
      expect(response.feedback.keywordOptimization.atsScore).toBeGreaterThanOrEqual(0);
      expect(response.feedback.keywordOptimization.atsScore).toBeLessThanOrEqual(100);
    }, 30000);
  });

  describe('Mock Interview', () => {
    it('should create mock interview session', async () => {
      const response = await service.conductMockInterview({
        studentId: mockStudentProfile.studentId,
        role: mockJobRole,
        questionCount: 5,
        difficulty: 'medium',
      });

      expect(response).toBeDefined();
      expect(response.session).toBeDefined();
      expect(response.session.sessionId).toBeDefined();
      expect(response.session.studentId).toBe(mockStudentProfile.studentId);
      expect(response.session.role).toEqual(mockJobRole);
      expect(response.session.questions).toBeDefined();
      expect(response.session.questions.length).toBeGreaterThan(0);
      expect(response.session.status).toBe('in_progress');
      expect(response.timestamp).toBeInstanceOf(Date);
    }, 30000);

    it('should generate appropriate interview questions', async () => {
      const response = await service.conductMockInterview({
        studentId: mockStudentProfile.studentId,
        role: mockJobRole,
        questionCount: 10,
      });

      expect(response.session.questions.length).toBeGreaterThan(0);

      const question = response.session.questions[0];
      expect(question.questionId).toBeDefined();
      expect(question.type).toBeDefined();
      expect(question.question).toBeDefined();
      expect(question.category).toBeDefined();
      expect(question.difficulty).toBeDefined();
      expect(question.expectedElements).toBeDefined();
    }, 30000);

    it('should include spiritual/ministry questions for Christian roles', async () => {
      const christianRole: JobRole = {
        ...mockJobRole,
        description: 'Build technology solutions for ministry organizations',
      };

      const response = await service.conductMockInterview({
        studentId: mockStudentProfile.studentId,
        role: christianRole,
        questionCount: 10,
      });

      // Should include at least one spiritual or ministry-related question
      const hasSpiritual = response.session.questions.some(
        q => q.type === 'spiritual' || q.category === 'ministry_alignment'
      );
      expect(hasSpiritual).toBe(true);
    }, 30000);
  });

  describe('Employer Matching', () => {
    it('should match student to employers', async () => {
      const response = await service.matchEmployers({
        studentId: mockStudentProfile.studentId,
        profile: mockStudentProfile,
      });

      expect(response).toBeDefined();
      expect(response.matches).toBeDefined();
      expect(Array.isArray(response.matches)).toBe(true);
      expect(response.matches.length).toBeGreaterThan(0);
      expect(response.confidence).toBeGreaterThan(0);
      expect(response.timestamp).toBeInstanceOf(Date);

      // Check match structure
      const firstMatch = response.matches[0];
      expect(firstMatch.employer).toBeDefined();
      expect(firstMatch.position).toBeDefined();
      expect(firstMatch.matchScore).toBeGreaterThanOrEqual(0);
      expect(firstMatch.matchScore).toBeLessThanOrEqual(100);
      expect(firstMatch.fitAnalysis).toBeDefined();
      expect(firstMatch.applicationStrategy).toBeDefined();
      expect(firstMatch.reasoning).toBeDefined();
    }, 30000);

    it('should analyze fit comprehensively', async () => {
      const response = await service.matchEmployers({
        studentId: mockStudentProfile.studentId,
        profile: mockStudentProfile,
      });

      const match = response.matches[0];
      const fit = match.fitAnalysis;

      expect(fit.skillsMatch).toBeGreaterThanOrEqual(0);
      expect(fit.skillsMatch).toBeLessThanOrEqual(100);
      expect(fit.cultureMatch).toBeGreaterThanOrEqual(0);
      expect(fit.valuesMatch).toBeGreaterThanOrEqual(0);
      expect(fit.locationMatch).toBeGreaterThanOrEqual(0);
      expect(fit.salaryMatch).toBeGreaterThanOrEqual(0);
      expect(fit.overallFit).toBeGreaterThanOrEqual(0);
      expect(fit.strengths).toBeDefined();
      expect(fit.concerns).toBeDefined();
    }, 30000);

    it('should provide application strategy', async () => {
      const response = await service.matchEmployers({
        studentId: mockStudentProfile.studentId,
        profile: mockStudentProfile,
      });

      const strategy = response.matches[0].applicationStrategy;

      expect(strategy.priority).toBeDefined();
      expect(['low', 'medium', 'high']).toContain(strategy.priority);
      expect(strategy.recommendedApproach).toBeDefined();
      expect(strategy.keyPointsToHighlight).toBeDefined();
      expect(strategy.potentialChallenges).toBeDefined();
      expect(strategy.timeline).toBeDefined();
    }, 30000);
  });

  describe('Career Analytics', () => {
    it('should generate career analytics', async () => {
      const response = await service.getCareerAnalytics({
        timeframe: mockTimeframe,
      });

      expect(response).toBeDefined();
      expect(response.analytics).toBeDefined();
      expect(response.analytics.employmentOutcomes).toBeDefined();
      expect(response.analytics.salaryData).toBeDefined();
      expect(response.analytics.successfulPathways).toBeDefined();
      expect(response.analytics.industryTrends).toBeDefined();
      expect(response.analytics.curriculumRecommendations).toBeDefined();
      expect(response.timestamp).toBeInstanceOf(Date);
    }, 30000);

    it('should provide employment outcomes', async () => {
      const response = await service.getCareerAnalytics({
        timeframe: mockTimeframe,
        major: 'Computer Science',
      });

      expect(response.analytics.employmentOutcomes.length).toBeGreaterThan(0);

      const outcome = response.analytics.employmentOutcomes[0];
      expect(outcome.graduationYear).toBeDefined();
      expect(outcome.major).toBeDefined();
      expect(outcome.employmentRate).toBeGreaterThanOrEqual(0);
      expect(outcome.employmentRate).toBeLessThanOrEqual(100);
      expect(outcome.averageTimeToEmployment).toBeGreaterThan(0);
      expect(outcome.topEmployers).toBeDefined();
      expect(outcome.topIndustries).toBeDefined();
      expect(outcome.averageSalary).toBeGreaterThan(0);
    }, 30000);

    it('should analyze salary data', async () => {
      const response = await service.getCareerAnalytics({
        timeframe: mockTimeframe,
        major: 'Computer Science',
        industry: 'Technology',
      });

      const salaryData = response.analytics.salaryData;

      expect(salaryData.averageSalary).toBeGreaterThan(0);
      expect(salaryData.medianSalary).toBeGreaterThan(0);
      expect(salaryData.salaryRange).toBeDefined();
      expect(salaryData.salaryRange.min).toBeGreaterThan(0);
      expect(salaryData.salaryRange.max).toBeGreaterThan(salaryData.salaryRange.min);
      expect(salaryData.growthRate).toBeDefined();
    }, 30000);

    it('should identify successful pathways', async () => {
      const response = await service.getCareerAnalytics({
        timeframe: mockTimeframe,
      });

      expect(response.analytics.successfulPathways.length).toBeGreaterThan(0);

      const pathway = response.analytics.successfulPathways[0];
      expect(pathway.pathway).toBeDefined();
      expect(pathway.successRate).toBeGreaterThanOrEqual(0);
      expect(pathway.successRate).toBeLessThanOrEqual(100);
      expect(pathway.averageSalary).toBeGreaterThan(0);
      expect(pathway.requiredSkills).toBeDefined();
      expect(pathway.requiredCourses).toBeDefined();
    }, 30000);

    it('should provide curriculum recommendations', async () => {
      const response = await service.getCareerAnalytics({
        timeframe: mockTimeframe,
      });

      expect(response.analytics.curriculumRecommendations.length).toBeGreaterThan(0);

      const recommendation = response.analytics.curriculumRecommendations[0];
      expect(recommendation.major).toBeDefined();
      expect(recommendation.recommendation).toBeDefined();
      expect(recommendation.priority).toBeDefined();
      expect(recommendation.rationale).toBeDefined();
      expect(recommendation.expectedImpact).toBeDefined();
      expect(recommendation.implementationCost).toBeDefined();
    }, 30000);
  });

  describe('Error Handling', () => {
    it('should handle missing student profile', async () => {
      await expect(
        service.matchCareers({
          studentId: 'invalid',
          profile: null as any,
        })
      ).rejects.toThrow();
    });

    it('should handle missing resume', async () => {
      await expect(
        service.reviewResume({
          resume: null as any,
        })
      ).rejects.toThrow();
    });

    it('should handle invalid timeframe', async () => {
      await expect(
        service.getCareerAnalytics({
          timeframe: null as any,
        })
      ).rejects.toThrow();
    });
  });
});
