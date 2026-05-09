/**
 * AI Course Recommendations Component
 * "The Spirit of truth will guide you into all truth" - John 16:13
 * 
 * Student-facing course recommendations and degree planning
 */

import React, { useState, useEffect } from 'react';
import { legacyApiCall } from "@/lib/legacyApi";
import {
  BookOpen,
  Calendar,
  Target,
  TrendingUp,
  Clock,
  Award,
  CheckCircle,
  AlertCircle,
  Star
} from 'lucide-react';

interface CourseRecommendation {
  courseId: string;
  courseCode: string;
  courseName: string;
  credits: number;
  relevanceScore: number;
  difficultyMatch: number;
  careerAlignment: number;
  prerequisitesMet: boolean;
  reasoning: string;
  professor: string;
  schedule: string;
}

interface DegreePlan {
  major: string;
  totalCredits: number;
  completedCredits: number;
  remainingCredits: number;
  estimatedGraduation: string;
  semesters: Semester[];
}

interface Semester {
  term: string;
  year: number;
  courses: string[];
  totalCredits: number;
}

export const AICourseRecommendations: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'recommendations' | 'plan'>('recommendations');
  const [recommendations, setRecommendations] = useState<CourseRecommendation[]>([]);
  const [degreePlan, setDegreePlan] = useState<DegreePlan | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedCourses, setSelectedCourses] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [recommendationsRes, planRes] = await Promise.all([
        legacyApiCall('/api/ai-unified/course-recommendation/recommendations', {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        }),
        legacyApiCall('/api/ai-unified/course-recommendation/degree-plan', {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        })
      ]);

      const recommendationsData = await recommendationsRes.json();
      const planData = await planRes.json();

      if (recommendationsData.success) {
        setRecommendations(recommendationsData.data.recommendations);
      }

      if (planData.success) {
        setDegreePlan(planData.data);
      }
    } catch (error) {
      console.error('Failed to fetch course data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleCourse = (courseId: string) => {
    const newSelected = new Set(selectedCourses);
    if (newSelected.has(courseId)) {
      newSelected.delete(courseId);
    } else {
      newSelected.add(courseId);
    }
    setSelectedCourses(newSelected);
  };

  const handleEnroll = async () => {
    if (selectedCourses.size === 0) return;

    try {
      const response = await legacyApiCall('/api/ai-unified/course-recommendation/enroll', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          courseIds: Array.from(selectedCourses)
        })
      });

      const result = await response.json();

      if (result.success) {
        // Refresh data
        fetchData();
        setSelectedCourses(new Set());
      }
    } catch (error) {
      console.error('Failed to enroll:', error);
    }
  };

  const getMatchColor = (score: number) => {
    if (score >= 0.9) return 'text-green-600 bg-green-100';
    if (score >= 0.7) return 'text-blue-600 bg-blue-100';
    if (score >= 0.5) return 'text-yellow-600 bg-yellow-100';
    return 'text-gray-600 bg-gray-100';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg p-6">
        <div className="flex items-center gap-3">
          <BookOpen className="w-8 h-8" />
          <div>
            <h1 className="text-3xl font-bold">Course Recommendations</h1>
            <p className="text-sm opacity-90 mt-1">
              AI-powered course selection tailored to your goals
            </p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2">
        <button
          onClick={() => setActiveTab('recommendations')}
          className={`flex-1 py-3 px-4 rounded-lg font-medium transition-colors ${
            activeTab === 'recommendations'
              ? 'bg-blue-600 text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          <Star className="w-5 h-5 mx-auto mb-1" />
          Recommendations
        </button>
        <button
          onClick={() => setActiveTab('plan')}
          className={`flex-1 py-3 px-4 rounded-lg font-medium transition-colors ${
            activeTab === 'plan'
              ? 'bg-blue-600 text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          <Calendar className="w-5 h-5 mx-auto mb-1" />
          Degree Plan
        </button>
      </div>

      {/* Recommendations Tab */}
      {activeTab === 'recommendations' && (
        <div className="space-y-6">
          {/* Selected Courses Summary */}
          {selectedCourses.size > 0 && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-semibold text-blue-900">
                    {selectedCourses.size} course{selectedCourses.size !== 1 ? 's' : ''} selected
                  </p>
                  <p className="text-sm text-blue-700">
                    Total credits: {recommendations
                      .filter(r => selectedCourses.has(r.courseId))
                      .reduce((sum, r) => sum + r.credits, 0)}
                  </p>
                </div>
                <button
                  onClick={handleEnroll}
                  className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Enroll in Selected
                </button>
              </div>
            </div>
          )}

          {/* Course Cards */}
          <div className="space-y-4">
            {recommendations.map((course) => (
              <div
                key={course.courseId}
                className={`bg-white rounded-lg shadow-lg p-6 border-2 transition-all ${
                  selectedCourses.has(course.courseId)
                    ? 'border-blue-500'
                    : 'border-transparent hover:shadow-xl'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <input
                        type="checkbox"
                        checked={selectedCourses.has(course.courseId)}
                        onChange={() => handleToggleCourse(course.courseId)}
                        className="w-5 h-5 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                      />
                      <div>
                        <h3 className="text-xl font-semibold text-gray-900">
                          {course.courseCode}: {course.courseName}
                        </h3>
                        <p className="text-sm text-gray-600">
                          {course.professor} • {course.schedule} • {course.credits} credits
                        </p>
                      </div>
                    </div>

                    {/* Match Scores */}
                    <div className="flex gap-3 mb-3">
                      <div className={`px-3 py-1 rounded-full text-xs font-medium ${getMatchColor(course.relevanceScore)}`}>
                        {(course.relevanceScore * 100).toFixed(0)}% Relevance
                      </div>
                      <div className={`px-3 py-1 rounded-full text-xs font-medium ${getMatchColor(course.difficultyMatch)}`}>
                        {(course.difficultyMatch * 100).toFixed(0)}% Difficulty Match
                      </div>
                      <div className={`px-3 py-1 rounded-full text-xs font-medium ${getMatchColor(course.careerAlignment)}`}>
                        {(course.careerAlignment * 100).toFixed(0)}% Career Alignment
                      </div>
                    </div>

                    {/* Prerequisites Status */}
                    <div className="flex items-center gap-2 mb-3">
                      {course.prerequisitesMet ? (
                        <>
                          <CheckCircle className="w-5 h-5 text-green-600" />
                          <span className="text-sm text-green-700">Prerequisites met</span>
                        </>
                      ) : (
                        <>
                          <AlertCircle className="w-5 h-5 text-yellow-600" />
                          <span className="text-sm text-yellow-700">Prerequisites required</span>
                        </>
                      )}
                    </div>

                    {/* AI Reasoning */}
                    <div className="p-3 bg-gray-50 rounded-lg">
                      <p className="text-sm text-gray-700">
                        <strong>Why this course?</strong> {course.reasoning}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Degree Plan Tab */}
      {activeTab === 'plan' && degreePlan && (
        <div className="space-y-6">
          {/* Progress Overview */}
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h2 className="text-xl font-semibold mb-4">Degree Progress</h2>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
              <div className="text-center">
                <p className="text-sm text-gray-600">Major</p>
                <p className="text-2xl font-bold text-blue-600">{degreePlan.major}</p>
              </div>
              <div className="text-center">
                <p className="text-sm text-gray-600">Completed</p>
                <p className="text-2xl font-bold text-green-600">{degreePlan.completedCredits}</p>
              </div>
              <div className="text-center">
                <p className="text-sm text-gray-600">Remaining</p>
                <p className="text-2xl font-bold text-yellow-600">{degreePlan.remainingCredits}</p>
              </div>
              <div className="text-center">
                <p className="text-sm text-gray-600">Est. Graduation</p>
                <p className="text-2xl font-bold text-purple-600">{degreePlan.estimatedGraduation}</p>
              </div>
            </div>

            {/* Progress Bar */}
            <div className="w-full bg-gray-200 rounded-full h-4">
              <div
                className="bg-gradient-to-r from-blue-600 to-purple-600 h-4 rounded-full flex items-center justify-center text-xs text-white font-medium"
                style={{
                  width: `${(degreePlan.completedCredits / degreePlan.totalCredits) * 100}%`
                }}
              >
                {((degreePlan.completedCredits / degreePlan.totalCredits) * 100).toFixed(0)}%
              </div>
            </div>
          </div>

          {/* Semester Plan */}
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h2 className="text-xl font-semibold mb-4">Semester-by-Semester Plan</h2>
            <div className="space-y-4">
              {degreePlan.semesters.map((semester, idx) => (
                <div key={idx} className="p-4 border rounded-lg">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-semibold text-gray-900">
                      {semester.term} {semester.year}
                    </h3>
                    <span className="text-sm text-gray-600">
                      {semester.totalCredits} credits
                    </span>
                  </div>
                  <ul className="space-y-2">
                    {semester.courses.map((course, courseIdx) => (
                      <li key={courseIdx} className="flex items-center gap-2 text-sm text-gray-700">
                        <BookOpen className="w-4 h-4 text-blue-600" />
                        {course}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>

          {/* Career Alignment */}
          <div className="bg-gradient-to-r from-green-100 to-blue-100 rounded-lg p-6 border border-green-200">
            <div className="flex items-center gap-3 mb-3">
              <Target className="w-6 h-6 text-green-600" />
              <h3 className="text-lg font-semibold text-green-900">
                Career Pathway Alignment
              </h3>
            </div>
            <p className="text-green-800">
              Your degree plan is optimized for your career goals. The AI has balanced course load, prerequisites, and career relevance to help you graduate on time and job-ready.
            </p>
          </div>
        </div>
      )}

      {/* Spiritual Encouragement */}
      <div className="bg-gradient-to-r from-purple-100 to-blue-100 rounded-lg p-6 border border-purple-200">
        <h3 className="text-lg font-semibold mb-2 text-purple-900">
          Your Academic Journey
        </h3>
        <p className="text-purple-800 italic mb-3">
          "Trust in the LORD with all your heart and lean not on your own understanding" - Proverbs 3:5
        </p>
        <p className="text-purple-700">
          These recommendations are AI-powered, but remember that God has a unique plan for your education and calling. Pray about your course selections and seek wisdom from advisors.
        </p>
      </div>
    </div>
  );
};
