/**
 * Comprehensive Course Detail View Component
 * Shows complete course information with all modules, lectures, and assessments
 */

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { 
  BookOpen, 
  Clock, 
  Award, 
  Users, 
  Brain, 
  Heart, 
  Star,
  Play,
  CheckCircle,
  Zap,
  Video,
  FileText,
  MessageCircle,
  Target,
  Calendar,
  Trophy,
  Shield,
  Download
} from 'lucide-react';
import { ComprehensiveCourse, StudentEnrollment, CourseModule, Lecture, Assessment } from '../../types/course-comprehensive';
import ComprehensiveCourseService from '../../services/ComprehensiveCourseService';
import { usePrerequisiteCheck } from '@/hooks/usePrerequisiteCheck';
import { PrerequisiteBlock } from './PrerequisiteBlock';
import { Lock } from 'lucide-react';

interface CourseDetailViewProps {
  courseId: string;
  studentId?: string;
  onEnroll?: (courseId: string) => void;
  onStartLecture?: (courseId: string, lectureId: string) => void;
  onStartAssessment?: (courseId: string, assessmentId: string) => void;
}

export const CourseDetailView: React.FC<CourseDetailViewProps> = ({
  courseId,
  studentId,
  onEnroll,
  onStartLecture,
  onStartAssessment
}) => {
  const [course, setCourse] = useState<ComprehensiveCourse | null>(null);
  const [enrollment, setEnrollment] = useState<StudentEnrollment | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const courseService = new ComprehensiveCourseService();

  useEffect(() => {
    loadCourseData();
  }, [courseId, studentId]);

  const loadCourseData = async () => {
    try {
      setLoading(true);
      const courseData = await courseService.getCourseDetails(courseId);
      setCourse(courseData);

      if (studentId) {
        try {
          const enrollmentData = await courseService.getStudentEnrollment(courseId, studentId);
          setEnrollment(enrollmentData);
        } catch (enrollmentError) {
          // Student not enrolled yet, which is fine
          setEnrollment(null);
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load course data');
    } finally {
      setLoading(false);
    }
  };

  const handleEnroll = async () => {
    if (!studentId || !onEnroll) return;
    
    try {
      await onEnroll(courseId);
      // Reload enrollment data after successful enrollment
      await loadCourseData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to enroll in course');
    }
  };

  const isLectureCompleted = (lectureId: string): boolean => {
    return enrollment?.completed_lectures.includes(lectureId) || false;
  };

  const isAssessmentCompleted = (assessmentId: string): boolean => {
    return enrollment?.completed_assessments.some(a => a.assessment_id === assessmentId) || false;
  };

  const getAssessmentScore = (assessmentId: string): number | null => {
    const completion = enrollment?.completed_assessments.find(a => a.assessment_id === assessmentId);
    return completion?.score || null;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-scroll-primary mx-auto"></div>
          <p className="mt-4 text-scroll-primary">Loading course details...</p>
        </div>
      </div>
    );
  }

  if (error || !course) {
    return (
      <div className="text-center py-12">
        <p className="text-red-600 mb-4">{error || 'Course not found'}</p>
        <Button onClick={loadCourseData} variant="outline">
          Try Again
        </Button>
      </div>
    );
  }

  const isEnrolled = !!enrollment;
  const progressPercentage = enrollment?.progress_percentage || 0;
  // Hard prereq enforcement — disables Enroll/Start when unmet.
  const { data: prereq, isLoading: prereqLoading, isError: prereqError, refetch: refetchPrereq } =
    usePrerequisiteCheck(courseId, 'CourseDetailView');
  const prereqEligible = !!prereq?.eligible;
  const enrollDisabled = !studentId || prereqLoading || prereqError || !prereqEligible;

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Course Header */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-start mb-4">
            <div className="flex gap-2">
              <Badge className={`bg-${course.difficulty_level === 'basic' ? 'green' : course.difficulty_level === 'intermediate' ? 'yellow' : 'red'}-100 text-${course.difficulty_level === 'basic' ? 'green' : course.difficulty_level === 'intermediate' ? 'yellow' : 'red'}-800`}>
                {course.difficulty_level.toUpperCase()}
              </Badge>
              <Badge variant="secondary">
                {course.scroll_field}
              </Badge>
              {course.gpt_tutor_enabled && (
                <Badge variant="outline">
                  <Brain className="h-3 w-3 mr-1" />
                  AI Tutor
                </Badge>
              )}
            </div>
            
            {!isEnrolled ? (
              <Button onClick={handleEnroll} size="lg" disabled={enrollDisabled}>
                {prereqLoading ? (
                  <>Checking prerequisites…</>
                ) : !prereqEligible && prereq ? (
                  <><Lock className="h-4 w-4 mr-2" /> Prerequisites required</>
                ) : (
                  <><Play className="h-4 w-4 mr-2" /> Enroll Now</>
                )}
              </Button>
            ) : (

              <div className="text-right">
                <div className="text-sm text-muted-foreground mb-1">Progress</div>
                <div className="text-2xl font-bold">{Math.round(progressPercentage)}%</div>
              </div>
            )}
          </div>

          <CardTitle className="text-3xl font-bold mb-2">{course.title}</CardTitle>
          <CardDescription className="text-lg">{course.description}</CardDescription>

          {/* Course Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
            <div className="flex items-center gap-2">
              <BookOpen className="h-5 w-5 text-blue-600" />
              <div>
                <div className="font-semibold">{course.modules.length}</div>
                <div className="text-sm text-muted-foreground">Modules</div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-green-600" />
              <div>
                <div className="font-semibold">{course.estimated_hours}h</div>
                <div className="text-sm text-muted-foreground">Duration</div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Award className="h-5 w-5 text-yellow-600" />
              <div>
                <div className="font-semibold">{course.total_assessments}</div>
                <div className="text-sm text-muted-foreground">Assessments</div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5 text-purple-600" />
              <div>
                <div className="font-semibold">{course.total_lectures}</div>
                <div className="text-sm text-muted-foreground">Lectures</div>
              </div>
            </div>
          </div>

          {/* Progress Bar (if enrolled) */}
          {isEnrolled && (
            <div className="mt-6">
              <Progress value={progressPercentage} className="h-3" />
              <div className="flex justify-between mt-2 text-sm text-muted-foreground">
                <span>Progress: {Math.round(progressPercentage)}%</span>
                <span>{enrollment?.total_xp_earned} XP • {enrollment?.total_scrollcoin_earned} ScrollCoins</span>
              </div>
            </div>
          )}
        </CardHeader>
      </Card>

      {/* Course Content Tabs */}
      <Tabs defaultValue="curriculum" className="w-full">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="curriculum">Curriculum</TabsTrigger>
          <TabsTrigger value="objectives">Objectives</TabsTrigger>
          <TabsTrigger value="spiritual">Spiritual Formation</TabsTrigger>
          <TabsTrigger value="rewards">Rewards</TabsTrigger>
          <TabsTrigger value="details">Details</TabsTrigger>
        </TabsList>

        {/* Curriculum Tab */}
        <TabsContent value="curriculum" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BookOpen className="h-5 w-5" />
                Course Modules
              </CardTitle>
              <CardDescription>
                Complete all modules to finish the course and earn your certificate
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Accordion type="single" collapsible className="w-full">
                {course.modules.map((module, moduleIndex) => (
                  <AccordionItem key={module.module_id} value={module.module_id}>
                    <AccordionTrigger className="text-left">
                      <div className="flex items-center justify-between w-full mr-4">
                        <div>
                          <div className="font-semibold">
                            Module {moduleIndex + 1}: {module.title}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {module.lectures.length} lectures • {module.assessments.length} assessments • {module.estimated_hours}h
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline">
                            <Zap className="h-3 w-3 mr-1" />
                            {module.xp_reward} XP
                          </Badge>
                        </div>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent className="space-y-4">
                      <p className="text-muted-foreground">{module.description}</p>
                      
                      {/* Lectures */}
                      <div className="space-y-2">
                        <h4 className="font-semibold flex items-center gap-2">
                          <Video className="h-4 w-4" />
                          Lectures
                        </h4>
                        {module.lectures.map((lecture, lectureIndex) => (
                          <div key={lecture.lecture_id} className="flex items-center justify-between p-3 border rounded-lg">
                            <div className="flex items-center gap-3">
                              {isLectureCompleted(lecture.lecture_id) ? (
                                <CheckCircle className="h-5 w-5 text-green-600" />
                              ) : (
                                <Play className="h-5 w-5 text-blue-600" />
                              )}
                              <div>
                                <div className="font-medium">
                                  Lecture {lectureIndex + 1}: {lecture.title}
                                </div>
                                <div className="text-sm text-muted-foreground flex items-center gap-4">
                                  {lecture.video_duration && (
                                    <span className="flex items-center gap-1">
                                      <Clock className="h-3 w-3" />
                                      {lecture.video_duration}min
                                    </span>
                                  )}
                                  <span className="flex items-center gap-1">
                                    <Zap className="h-3 w-3" />
                                    {lecture.xp_reward} XP
                                  </span>
                                  <span className="flex items-center gap-1">
                                    <FileText className="h-3 w-3" />
                                    Notes Available
                                  </span>
                                </div>
                              </div>
                            </div>
                            {isEnrolled && (
                              <Button
                                onClick={() => onStartLecture?.(courseId, lecture.lecture_id)}
                                variant={isLectureCompleted(lecture.lecture_id) ? "outline" : "default"}
                                size="sm"
                              >
                                {isLectureCompleted(lecture.lecture_id) ? "Review" : "Start"}
                              </Button>
                            )}
                          </div>
                        ))}
                      </div>

                      {/* Assessments */}
                      {module.assessments.length > 0 && (
                        <div className="space-y-2">
                          <h4 className="font-semibold flex items-center gap-2">
                            <Award className="h-4 w-4" />
                            Assessments
                          </h4>
                          {module.assessments.map((assessment) => (
                            <div key={assessment.assessment_id} className="flex items-center justify-between p-3 border rounded-lg">
                              <div className="flex items-center gap-3">
                                {isAssessmentCompleted(assessment.assessment_id) ? (
                                  <CheckCircle className="h-5 w-5 text-green-600" />
                                ) : (
                                  <Award className="h-5 w-5 text-yellow-600" />
                                )}
                                <div>
                                  <div className="font-medium">{assessment.title}</div>
                                  <div className="text-sm text-muted-foreground flex items-center gap-4">
                                    <span>Type: {assessment.type}</span>
                                    <span className="flex items-center gap-1">
                                      <Zap className="h-3 w-3" />
                                      {assessment.xp_reward} XP
                                    </span>
                                    <span className="flex items-center gap-1">
                                      <Star className="h-3 w-3" />
                                      {assessment.scrollcoin_reward} Coins
                                    </span>
                                    {getAssessmentScore(assessment.assessment_id) && (
                                      <span className="flex items-center gap-1 text-green-600">
                                        <Trophy className="h-3 w-3" />
                                        Score: {getAssessmentScore(assessment.assessment_id)}%
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </div>
                              {isEnrolled && (
                                <Button
                                  onClick={() => onStartAssessment?.(courseId, assessment.assessment_id)}
                                  variant={isAssessmentCompleted(assessment.assessment_id) ? "outline" : "default"}
                                  size="sm"
                                >
                                  {isAssessmentCompleted(assessment.assessment_id) ? "Retake" : "Start"}
                                </Button>
                              )}
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Spiritual Formation Component */}
                      {module.spiritual_formation_component && (
                        <div className="space-y-2">
                          <h4 className="font-semibold flex items-center gap-2">
                            <Heart className="h-4 w-4 text-red-600" />
                            Spiritual Formation
                          </h4>
                          <div className="p-3 border rounded-lg bg-red-50">
                            <div className="font-medium">{module.spiritual_formation_component.title}</div>
                            <p className="text-sm text-muted-foreground mt-1">
                              {module.spiritual_formation_component.description}
                            </p>
                            {module.spiritual_formation_component.prayer_points.length > 0 && (
                              <div className="mt-2">
                                <div className="text-sm font-medium">Prayer Focus:</div>
                                <ul className="text-sm text-muted-foreground list-disc list-inside">
                                  {module.spiritual_formation_component.prayer_points.slice(0, 2).map((point, index) => (
                                    <li key={index}>{point}</li>
                                  ))}
                                </ul>
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Objectives Tab */}
        <TabsContent value="objectives" className="space-y-4">
          <div className="grid md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Target className="h-5 w-5" />
                  Learning Objectives
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-3">
                  {course.learning_objectives.map((objective, index) => (
                    <li key={index} className="flex items-start gap-2">
                      <CheckCircle className="h-4 w-4 mt-0.5 text-green-600 flex-shrink-0" />
                      <span className="text-sm">{objective}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>

            {course.spiritual_objectives && course.spiritual_objectives.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Heart className="h-5 w-5 text-red-600" />
                    Spiritual Objectives
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-3">
                    {course.spiritual_objectives.map((objective, index) => (
                      <li key={index} className="flex items-start gap-2">
                        <Heart className="h-4 w-4 mt-0.5 text-red-600 flex-shrink-0" />
                        <span className="text-sm">{objective}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>

        {/* Spiritual Formation Tab */}
        <TabsContent value="spiritual" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Heart className="h-5 w-5 text-red-600" />
                Spiritual Formation Track
              </CardTitle>
              <CardDescription>
                Integrated spiritual development alongside academic learning
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <h3 className="font-semibold mb-2">{course.spiritual_formation_track.name}</h3>
                <p className="text-muted-foreground">{course.spiritual_formation_track.description}</p>
              </div>

              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <h4 className="font-medium mb-3">Character Development Milestones</h4>
                  <ul className="space-y-2">
                    {course.spiritual_formation_track.character_development_milestones.map((milestone, index) => (
                      <li key={index} className="flex items-center gap-2 text-sm">
                        <Shield className="h-4 w-4 text-blue-600" />
                        {milestone}
                      </li>
                    ))}
                  </ul>
                </div>

                <div>
                  <h4 className="font-medium mb-3">Ministry Readiness Indicators</h4>
                  <ul className="space-y-2">
                    {course.spiritual_formation_track.ministry_readiness_indicators.map((indicator, index) => (
                      <li key={index} className="flex items-center gap-2 text-sm">
                        <Star className="h-4 w-4 text-yellow-600" />
                        {indicator}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4 p-4 bg-gray-50 rounded-lg">
                <div className="text-center">
                  <div className="font-semibold">Divine Scorecard</div>
                  <div className="text-sm text-muted-foreground">
                    {course.spiritual_formation_track.divine_scorecard_integration ? 'Integrated' : 'Not Available'}
                  </div>
                </div>
                <div className="text-center">
                  <div className="font-semibold">Prophetic Check-ins</div>
                  <div className="text-sm text-muted-foreground">
                    {course.spiritual_formation_track.prophetic_checkins_required ? 'Required' : 'Optional'}
                  </div>
                </div>
                <div className="text-center">
                  <div className="font-semibold">Intercession Prayer</div>
                  <div className="text-sm text-muted-foreground">
                    {course.spiritual_formation_track.intercession_prayer_component ? 'Included' : 'Not Available'}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Rewards Tab */}
        <TabsContent value="rewards" className="space-y-4">
          <div className="grid md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Trophy className="h-5 w-5 text-yellow-600" />
                  Milestone Rewards
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {course.milestone_rewards.map((reward) => (
                    <div key={reward.milestone_id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div>
                        <div className="font-medium">{reward.percentage}% Complete</div>
                        <div className="text-sm text-muted-foreground">{reward.spiritual_milestone}</div>
                      </div>
                      <div className="text-right">
                        <div className="flex items-center gap-2 text-sm">
                          <span className="flex items-center gap-1">
                            <Zap className="h-3 w-3" />
                            {reward.xp_reward}
                          </span>
                          <span className="flex items-center gap-1">
                            <Star className="h-3 w-3" />
                            {reward.scrollcoin_reward}
                          </span>
                        </div>
                        {reward.badge_unlock && (
                          <div className="text-xs text-muted-foreground mt-1">
                            Badge: {reward.badge_unlock}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Award className="h-5 w-5 text-blue-600" />
                  Completion Certificate
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="p-4 border rounded-lg">
                  <div className="font-medium mb-2">Certificate Type</div>
                  <Badge className="mb-3">{course.completion_certificate.template_type}</Badge>
                  
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center justify-between">
                      <span>Blockchain Verification</span>
                      <span className={course.completion_certificate.blockchain_verification ? 'text-green-600' : 'text-gray-500'}>
                        {course.completion_certificate.blockchain_verification ? 'Yes' : 'No'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>NFT Badge Creation</span>
                      <span className={course.completion_certificate.nft_badge_creation ? 'text-green-600' : 'text-gray-500'}>
                        {course.completion_certificate.nft_badge_creation ? 'Yes' : 'No'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>Ministry Endorsement</span>
                      <span className={course.completion_certificate.ministry_endorsement ? 'text-green-600' : 'text-gray-500'}>
                        {course.completion_certificate.ministry_endorsement ? 'Yes' : 'No'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>Accreditation Value</span>
                      <span className="font-medium">{course.completion_certificate.accreditation_value} Credits</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Details Tab */}
        <TabsContent value="details" className="space-y-4">
          <div className="grid md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Course Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <div className="font-medium">Difficulty Level</div>
                    <div className="text-muted-foreground">{course.difficulty_level}</div>
                  </div>
                  <div>
                    <div className="font-medium">Scroll Field</div>
                    <div className="text-muted-foreground">{course.scroll_field}</div>
                  </div>
                  <div>
                    <div className="font-medium">XP Multiplier</div>
                    <div className="text-muted-foreground">{course.xp_multiplier}x</div>
                  </div>
                  <div>
                    <div className="font-medium">ScrollCoin Multiplier</div>
                    <div className="text-muted-foreground">{course.scrollcoin_multiplier}x</div>
                  </div>
                  <div>
                    <div className="font-medium">Final Project</div>
                    <div className="text-muted-foreground">{course.final_project_required ? 'Required' : 'Not Required'}</div>
                  </div>
                  <div>
                    <div className="font-medium">Mentorship</div>
                    <div className="text-muted-foreground">{course.mentorship_required ? 'Required' : 'Optional'}</div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Prerequisites</CardTitle>
              </CardHeader>
              <CardContent>
                {course.prerequisites.length > 0 ? (
                  <ul className="space-y-2">
                    {course.prerequisites.map((prereq, index) => (
                      <li key={index} className="flex items-center gap-2 text-sm">
                        <CheckCircle className="h-4 w-4 text-green-600" />
                        {prereq}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-muted-foreground text-sm">No prerequisites required</p>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default CourseDetailView;