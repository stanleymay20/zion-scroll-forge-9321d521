import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { PageTemplate } from "@/components/layout/PageTemplate";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import {
  ArrowLeft, Play, Clock, Star, BookOpen,
  CheckCircle, Lock, Trophy, Loader2, AlertCircle,
  FileText, MessageSquare, Award, Heart
} from "lucide-react";
import { useEnrollInCourse, useUserEnrollments } from "@/hooks/useCourses";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useMemo, useState } from "react";
import { CourseReviews } from "@/components/course/CourseReviews";
import { CoursePreviewVideo } from "@/components/course/CoursePreviewVideo";
import { InstructorProfileCard } from "@/components/course/InstructorProfileCard";
import { CourseEnrollmentFlow } from "@/components/course/CourseEnrollmentFlow";
import { toast } from "sonner";
import { BackButton } from "@/components/layout/BackButton";
import { getAcademicCourseProfile } from "@/lib/academicRigor";
import { useCourseAccess } from "@/hooks/useCourseAccess";

export default function CourseDetail() {
  const { courseId } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const enrollMutation = useEnrollInCourse();
  const { data: enrollments } = useUserEnrollments();
  const { access } = useCourseAccess(courseId);
  const [showEnrollmentFlow, setShowEnrollmentFlow] = useState(false);

  const { data: courseData, isLoading, error } = useQuery({
    queryKey: ['course-detail', courseId],
    queryFn: async () => {
      const { data: course, error: courseError } = await supabase
        .from('courses')
        .select(`
          id,
          title,
          description,
          faculty,
          faculty_id,
          level,
          rating,
          xr_enabled,
          thumbnail_url,
          preview_video_url,
          price,
          price_cents,
          scroll_coin_cost,
          scholarship_eligible,
          duration,
          students,
          credit_hours,
          estimated_duration_hours,
          learning_outcomes,
          course_modules(id, title, content_md, order_index, duration_minutes, learning_objectives)
        `)
        .eq('id', courseId!)
        .single();
      
      if (courseError) throw courseError;
      
      const { data: assignments } = await supabase
        .from('teaching_assignments')
        .select('faculty_user_id, role')
        .eq('course_id', courseId!);

      const facultyUserIds = Array.from(new Set((assignments || [])
        .map((assignment: any) => assignment.faculty_user_id)
        .filter(Boolean)));

      let facultyProfiles: any[] = [];
      if (facultyUserIds.length > 0) {
        const { data: profiles } = await supabase
          .from('faculty_profiles')
          .select('user_id, full_name, title, bio')
          .in('user_id', facultyUserIds);
        facultyProfiles = profiles || [];
      }

      return {
        course,
        modules: course.course_modules || [],
        assignments: assignments || [],
        facultyProfiles,
      };
    },
    enabled: !!courseId
  });

  const enrollment = useMemo(() => 
    enrollments?.find((e: any) => e.course_id === courseId),
    [enrollments, courseId]
  );
  const isEnrolled =
    !!enrollment ||
    access?.access_level === "enrolled" ||
    access?.access_level === "credit" ||
    access?.access_level === "faculty" ||
    access?.access_level === "admin";

  const previewVideoUrl = useMemo(() => {
    const course: any = courseData?.course;
    return course?.preview_video_url || undefined;
  }, [courseData]);

  const handleEnroll = () => {
    setShowEnrollmentFlow(true);
  };

  const handleStartLearning = () => {
    navigate(`/courses/${courseId}/learn`);
  };

  if (isLoading) {
    return (
      <PageTemplate title="Loading..." description="">
      <div className="mb-2"><BackButton fallbackTo="/dashboard" /></div>
        <div className="flex justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </PageTemplate>
    );
  }

  if (error || !courseData) {
    return (
      <PageTemplate title="Course Not Found" description="">
        <div className="text-center py-12">
          <AlertCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
          <p className="text-lg text-muted-foreground mb-4">
            {error ? 'Failed to load course details' : 'Course not found'}
          </p>
          <Button onClick={() => navigate("/courses")}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Courses
          </Button>
        </div>
      </PageTemplate>
    );
  }

  const { course, modules, assignments, facultyProfiles } = courseData;
  const academicProfile = getAcademicCourseProfile(course, modules.length);
  const compactList = (...items: Array<string | null | undefined>) =>
    items.filter((item): item is string => Boolean(item));
  const primaryAssignment = assignments.find((assignment: any) => assignment.role === 'instructor') || assignments[0];
  const primaryFacultyProfile = primaryAssignment
    ? facultyProfiles.find((profile: any) => profile.user_id === primaryAssignment.faculty_user_id)
    : facultyProfiles[0];
  const instructorData = primaryFacultyProfile
    ? {
        id: primaryFacultyProfile.user_id || primaryFacultyProfile.id || course.id,
        name: primaryFacultyProfile.full_name || "Faculty Member",
        title: primaryFacultyProfile.title || `${primaryAssignment?.role || "Instructor"} - ${course.faculty || "ScrollUniversity"}`,
        bio: primaryFacultyProfile.bio || "This faculty profile is published from ScrollUniversity records. A full biography will be added by Academic Affairs.",
        faculty: course.faculty,
        specializations: compactList(course.faculty, course.level, "Course mentorship"),
        credentials: [
          "Verified faculty appointment",
          "Course-level teaching assignment",
          "Academic Affairs profile on record",
        ],
      }
    : {
        id: course.id,
        name: "Faculty Appointment Pending",
        title: `${course.faculty || "ScrollUniversity"} Instructional Team`,
        bio: "The faculty profile for this course is being verified by Academic Affairs. Learners may preview the curriculum now; confirmed instructor credentials should be published before production enrollment scale.",
        faculty: course.faculty,
        specializations: compactList(course.faculty, course.level, "Guided academic support"),
        credentials: [
          "Instructor record pending publication",
          "Course support available through advising and AI tutor channels",
        ],
      };

  console.info('✝️ ScrollUniversity: Course materials loaded — Christ is Lord over every scroll');

  return (
    <PageTemplate
      title={course.title}
      description={course.faculty || 'ScrollUniversity Course'}
      actions={
        <Button variant="outline" onClick={() => navigate("/courses")}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Courses
        </Button>
      }
    >
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-4 md:space-y-6">
          {/* Course Header */}
          <Card>
            <CardHeader>
              <div className="flex flex-col sm:flex-row items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <CardTitle className="text-xl sm:text-2xl break-words">{course.title}</CardTitle>
                  <CardDescription className="mt-2 break-words">
                    {course.description}
                  </CardDescription>
                </div>
              </div>
              <div className="flex flex-wrap gap-2 mt-4">
                <Badge variant="secondary">{course.faculty}</Badge>
                <Badge variant="outline">{course.level}</Badge>
                <div className="flex items-center space-x-1">
                  <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                  <span className="text-sm font-medium">{course.rating}</span>
                </div>
                {course.xr_enabled && (
                  <Badge variant="outline" className="bg-gradient-to-r from-purple-500 to-pink-500 text-white">
                    XR Enabled
                  </Badge>
                )}
              </div>
            </CardHeader>
          </Card>

          {/* Preview Video */}
          <CoursePreviewVideo
            videoUrl={previewVideoUrl}
            thumbnailUrl={course.thumbnail_url}
            title={course.title}
            duration="5:30"
          />

          {enrollment && (
            <Card>
              <CardHeader>
                <CardTitle>Your Progress</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Course Completion</span>
                    <span>{enrollment.progress}%</span>
                  </div>
                  <Progress value={enrollment.progress} className="h-2" />
                </div>
              </CardContent>
            </Card>
          )}

          <Tabs defaultValue="curriculum" className="w-full">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="curriculum">Curriculum</TabsTrigger>
              <TabsTrigger value="instructor">Instructor</TabsTrigger>
              <TabsTrigger value="spiritual">Spiritual Focus</TabsTrigger>
              <TabsTrigger value="reviews">Reviews</TabsTrigger>
            </TabsList>
            
            <TabsContent value="curriculum" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Course Modules</CardTitle>
                  <CardDescription>
                    {isEnrolled
                      ? `${modules.length} comprehensive modules with lectures, assessments, and practical applications`
                      : "Detailed modules, lectures, assessments, and materials unlock after enrollment"}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {!isEnrolled && modules.length === 0 ? (
                    <div className="rounded-lg border border-dashed bg-muted/30 p-4 text-sm text-muted-foreground">
                      This is a course catalog preview. Enrolled students enter the live AI avatar lecture room and receive the full curriculum, study materials, assignments, quizzes, and academic progress tracking.
                    </div>
                  ) : (
                    <Accordion type="single" collapsible className="w-full">
                      {modules.map((module, index) => (
                      <AccordionItem key={module.id} value={`module-${index}`}>
                        <AccordionTrigger className="hover:no-underline">
                          <div className="flex items-center space-x-3 flex-1 text-left">
                            <div className="p-2 bg-primary/10 rounded-full">
                              {isEnrolled ? (
                                <BookOpen className="h-4 w-4 text-primary" />
                              ) : (
                                <Lock className="h-4 w-4 text-muted-foreground" />
                              )}
                            </div>
                            <div className="flex-1">
                              <p className="font-medium">Module {index + 1}: {module.title}</p>
                              <div className="flex items-center space-x-4 mt-1">
                                <span className="text-xs text-muted-foreground">
                                  <Clock className="h-3 w-3 inline mr-1" />
                                  {module.duration_minutes || 45} minutes
                                </span>
                                {isEnrolled && module.learning_materials && (
                                  <span className="text-xs text-muted-foreground">
                                    {module.learning_materials.length} materials
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        </AccordionTrigger>
                        <AccordionContent className="space-y-4 pt-4">
                          {!isEnrolled && (
                            <div className="rounded-lg border border-dashed bg-muted/30 p-3 text-sm text-muted-foreground">
                              Course-room content is available only after enrollment. Enrolled students get the live AI avatar lecture, full study materials, assignments, quizzes, and academic record tracking.
                            </div>
                          )}

                          {/* Module Summary */}
                          {isEnrolled && (module.content as any)?.summary && (
                            <p className="text-sm text-muted-foreground">
                              {(module.content as any).summary}
                            </p>
                          )}

                          {/* Learning Objectives — prefer top-level column, fallback to JSONB blob */}
                          {(() => {
                            const objectives: string[] = Array.isArray((module as any).learning_objectives) && (module as any).learning_objectives.length > 0
                              ? (module as any).learning_objectives
                              : isEnrolled && Array.isArray((module.content as any)?.learning_objectives)
                                ? (module.content as any).learning_objectives
                                : [];
                            if (objectives.length === 0) return null;
                            return (
                              <div className="bg-muted/50 rounded-lg p-3">
                                <h4 className="font-medium text-sm mb-2">Learning Objectives:</h4>
                                <ul className="space-y-1">
                                  {objectives.map((objective: string, objIndex: number) => (
                                    <li key={objIndex} className="text-sm flex items-start space-x-2">
                                      <CheckCircle className="h-3 w-3 text-primary mt-0.5 flex-shrink-0" />
                                      <span>{objective}</span>
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            );
                          })()}

                          {/* Learning Materials */}
                          {isEnrolled && module.learning_materials && module.learning_materials.length > 0 && (
                            <div className="space-y-2">
                              <h4 className="font-medium text-sm">Course Materials:</h4>
                              <div className="space-y-2">
                                {module.learning_materials.map((material: any) => (
                                  <div key={material.id} className="flex items-center justify-between p-3 bg-muted/30 rounded-lg hover:bg-muted/50 transition-colors">
                                    <div className="flex items-center space-x-3">
                                      {material.kind === 'pdf' && <FileText className="h-4 w-4 text-red-500" />}
                                      {material.kind === 'video' && <Play className="h-4 w-4 text-blue-500" />}
                                      {material.kind === 'link' && <FileText className="h-4 w-4 text-green-500" />}
                                      <div>
                                        <p className="text-sm font-medium">{material.title}</p>
                                        <p className="text-xs text-muted-foreground capitalize">{material.kind}</p>
                                      </div>
                                    </div>
                                    {material.url && (
                                      <a
                                        href={material.url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                      >
                                        <Button variant="ghost" size="sm" onClick={() => toast.info("This action is launching with the next release.")}>
                                          Open
                                        </Button>
                                      </a>
                                    )}
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Action Buttons */}
                          <div className="flex gap-2 pt-2">
                            {isEnrolled ? (
                              <Button className="flex-1" size="sm" variant="default" onClick={handleStartLearning}>
                                <Play className="h-4 w-4 mr-2" />
                                Enter Course Room
                              </Button>
                            ) : (
                              <Button className="flex-1" size="sm" variant="outline" disabled>
                                <Lock className="h-4 w-4 mr-2" />
                                Enroll to Access
                              </Button>
                            )}
                            <Button
                              variant="outline"
                              size="sm"
                              disabled={!isEnrolled}
                              onClick={() => navigate(`/ai-tutors/${course.faculty}?context=${encodeURIComponent(module.title)}`)}
                            >
                              <MessageSquare className="h-4 w-4 mr-2" />
                              Ask AI Tutor
                            </Button>
                          </div>
                        </AccordionContent>
                      </AccordionItem>
                      ))}
                    </Accordion>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="instructor">
              <InstructorProfileCard instructor={instructorData} />
            </TabsContent>

            <TabsContent value="spiritual">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Heart className="h-5 w-5 text-primary" />
                    <span>Spiritual Formation Focus</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div>
                      <h4 className="font-medium mb-2">Kingdom Focus</h4>
                      <p className="text-sm text-muted-foreground">
                        This course is designed to advance God's Kingdom through developing prophetic intelligence 
                        that serves the body of Christ and impacts nations.
                      </p>
                    </div>
                    
                    <div>
                      <h4 className="font-medium mb-2">Character Development</h4>
                      <div className="flex flex-wrap gap-2">
                        <Badge variant="outline">Humility</Badge>
                        <Badge variant="outline">Discernment</Badge>
                        <Badge variant="outline">Faithfulness</Badge>
                        <Badge variant="outline">Wisdom</Badge>
                        <Badge variant="outline">Love</Badge>
                      </div>
                    </div>

                    <div>
                      <h4 className="font-medium mb-2">Ministry Application</h4>
                      <p className="text-sm text-muted-foreground">
                        Students will learn to operate in prophetic ministry with accuracy, love, and 
                        accountability, serving local churches and global missions.
                      </p>
                    </div>

                    <div>
                      <h4 className="font-medium mb-2">Spiritual Disciplines</h4>
                      <ul className="space-y-1 text-sm">
                        <li className="flex items-center space-x-2">
                          <CheckCircle className="h-3 w-3 text-primary" />
                          <span>Daily prayer and intercession</span>
                        </li>
                        <li className="flex items-center space-x-2">
                          <CheckCircle className="h-3 w-3 text-primary" />
                          <span>Scripture meditation and study</span>
                        </li>
                        <li className="flex items-center space-x-2">
                          <CheckCircle className="h-3 w-3 text-primary" />
                          <span>Prophetic journaling</span>
                        </li>
                        <li className="flex items-center space-x-2">
                          <CheckCircle className="h-3 w-3 text-primary" />
                          <span>Community accountability</span>
                        </li>
                      </ul>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="reviews">
              <Card>
                <CardHeader>
                  <CardTitle>Student Reviews</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-center py-8">
                    <Star className="h-12 w-12 text-muted-foreground mx-auto mb-4 opacity-50" />
                    <p className="text-muted-foreground">
                      Student reviews will be available after course launch
                    </p>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>

        {/* Sidebar */}
        <div className="space-y-4 md:space-y-6">
          <Card>
            <CardContent className="pt-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Price</span>
                  <span className="text-2xl font-bold text-primary">
                    {Math.round(course.price || 0)} SC
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Duration</span>
                  <span className="font-medium">{course.duration || '8 weeks'}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Students</span>
                  <span className="font-medium">
                    {(course.students || 0).toLocaleString()}
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Level</span>
                  <span className="font-medium">{course.level}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Modules</span>
                  <span className="font-medium">{modules.length}</span>
                </div>

                {isEnrolled ? (
                  <Button className="w-full" onClick={handleStartLearning}>
                    <Play className="h-4 w-4 mr-2" />
                    Enter Live Lecture
                  </Button>
                ) : (
                  <Button 
                    className="w-full" 
                    onClick={handleEnroll}
                  >
                    <Trophy className="h-4 w-4 mr-2" />
                    Enroll Now
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm">What you'll learn</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2 text-sm">
                {academicProfile.outcomes.map((outcome: string) => (
                  <li key={outcome} className="flex items-start space-x-2">
                    <CheckCircle className="h-4 w-4 text-primary mt-0.5" />
                    <span>{outcome}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Syllabus Standard</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2 text-sm">
                {academicProfile.syllabusStandard.map((standard: string) => (
                  <li key={standard} className="flex items-start space-x-2">
                    <CheckCircle className="h-4 w-4 text-primary mt-0.5" />
                    <span>{standard}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Course Features</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3 text-sm">
                <div className="flex items-center space-x-2">
                  <Play className="h-4 w-4 text-blue-500" />
                  <span>HD Video Lectures</span>
                </div>
                <div className="flex items-center space-x-2">
                  <FileText className="h-4 w-4 text-green-500" />
                  <span>Downloadable Resources</span>
                </div>
                <div className="flex items-center space-x-2">
                  <MessageSquare className="h-4 w-4 text-purple-500" />
                  <span>Community Discussion</span>
                </div>
                <div className="flex items-center space-x-2">
                  <Award className="h-4 w-4 text-orange-500" />
                  <span>ScrollBadge Certificate</span>
                </div>
                <div className="flex items-center space-x-2">
                  <Heart className="h-4 w-4 text-red-500" />
                  <span>Spiritual Formation</span>
                </div>
                {course.xr_enabled && (
                  <div className="flex items-center space-x-2">
                    <div className="h-4 w-4 bg-gradient-to-r from-purple-500 to-pink-500 rounded" />
                    <span>XR Immersive Experience</span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Course Reviews */}
      <div className="mt-8">
        <CourseReviews courseId={courseId!} />
      </div>

      {/* Enrollment Flow Dialog */}
      <CourseEnrollmentFlow
        course={{
          id: course.id,
          title: course.title,
          price_cents: course.price_cents,
          scrollCoinCost: course.scroll_coin_cost,
          scholarshipEligible: course.scholarship_eligible,
        }}
        isOpen={showEnrollmentFlow}
        onClose={() => setShowEnrollmentFlow(false)}
        onSuccess={handleStartLearning}
      />
    </PageTemplate>
  );
}
