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
  ArrowLeft, Play, Clock, Users, Star, BookOpen, 
  CheckCircle, Lock, Trophy, Loader2, AlertCircle,
  FileText, MessageSquare, Award, Heart, ChevronDown
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

export default function CourseDetail() {
  const { courseId } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const enrollMutation = useEnrollInCourse();
  const { data: enrollments } = useUserEnrollments();
  const [showEnrollmentFlow, setShowEnrollmentFlow] = useState(false);

  const { data: courseData, isLoading, error } = useQuery({
    queryKey: ['course-detail', courseId],
    queryFn: async () => {
      const { data: course, error: courseError } = await supabase
        .from('courses')
        .select('*, course_modules(*, learning_materials(*))')
        .eq('id', courseId!)
        .single();
      
      if (courseError) throw courseError;
      
      return { 
        course, 
        modules: course.course_modules || [] 
      };
    },
    enabled: !!courseId
  });

  const enrollment = useMemo(() => 
    enrollments?.find((e: any) => e.course_id === courseId),
    [enrollments, courseId]
  );

  const previewVideoUrl = useMemo(() => {
    const course: any = courseData?.course;
    const modules: any[] = courseData?.modules || [];
    if (!course) return undefined;
    // 1) Course-specific uploaded preview
    if (course.preview_video_url) return course.preview_video_url;
    // 2) Fallback: first video of THIS course's first module (course-related, never random)
    const firstModule = [...modules].sort(
      (a: any, b: any) => (a.order_index ?? 0) - (b.order_index ?? 0)
    )[0];
    const firstVideo = (firstModule?.learning_materials || []).find(
      (mat: any) => (mat.kind || '').toLowerCase() === 'video' && mat.url
    );
    return firstVideo?.url as string | undefined;
  }, [courseData]);

  const handleEnroll = () => {
    setShowEnrollmentFlow(true);
  };

  const handleStartLearning = () => {
    navigate(`/courses/${courseId}/learn`);
  };

  // Mock instructor data (would come from API in production)
  const instructorData = {
    id: '1',
    name: 'Dr. Samuel Scroll',
    title: `Dean of ${courseData?.course?.faculty || 'Faculty'}`,
    bio: 'Dr. Samuel Scroll is a renowned prophetic teacher with over 20 years of experience in training believers in prophetic ministry. He has trained thousands of students globally and has documented accuracy rates of 95%+ in prophetic ministry.',
    faculty: courseData?.course?.faculty,
    yearsExperience: 20,
    studentsTaught: 10000,
    coursesCreated: 15,
    rating: 4.9,
    specializations: ['Prophetic Intelligence', 'Spiritual Discernment', 'Kingdom Leadership'],
    credentials: [
      'Ph.D. in Prophetic Studies',
      'Master of Divinity',
      'Certified Prophetic Minister',
      'Published Author of 5 Books'
    ],
    email: 'samuel.scroll@scrolluniversity.edu'
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

  const { course, modules } = courseData;

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
                    {modules.length} comprehensive modules with lectures, assessments, and practical applications
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Accordion type="single" collapsible className="w-full">
                    {modules.map((module, index) => (
                      <AccordionItem key={module.id} value={`module-${index}`}>
                        <AccordionTrigger className="hover:no-underline">
                          <div className="flex items-center space-x-3 flex-1 text-left">
                            <div className="p-2 bg-primary/10 rounded-full">
                              <BookOpen className="h-4 w-4 text-primary" />
                            </div>
                            <div className="flex-1">
                              <p className="font-medium">Module {index + 1}: {module.title}</p>
                              <div className="flex items-center space-x-4 mt-1">
                                <span className="text-xs text-muted-foreground">
                                  <Clock className="h-3 w-3 inline mr-1" />
                                  {(module.content as any)?.duration_minutes || 45} minutes
                                </span>
                                {module.learning_materials && (
                                  <span className="text-xs text-muted-foreground">
                                    {module.learning_materials.length} materials
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        </AccordionTrigger>
                        <AccordionContent className="space-y-4 pt-4">
                          {/* Module Summary */}
                          {(module.content as any)?.summary && (
                            <p className="text-sm text-muted-foreground">
                              {(module.content as any).summary}
                            </p>
                          )}

                          {/* Learning Objectives */}
                          {(module.content as any)?.learning_objectives && (module.content as any).learning_objectives.length > 0 && (
                            <div className="bg-muted/50 rounded-lg p-3">
                              <h4 className="font-medium text-sm mb-2">Learning Objectives:</h4>
                              <ul className="space-y-1">
                                {(module.content as any).learning_objectives.map((objective: string, objIndex: number) => (
                                  <li key={objIndex} className="text-sm flex items-start space-x-2">
                                    <CheckCircle className="h-3 w-3 text-primary mt-0.5 flex-shrink-0" />
                                    <span>{objective}</span>
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}

                          {/* Learning Materials */}
                          {module.learning_materials && module.learning_materials.length > 0 && (
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
                            {enrollment ? (
                              <Button className="flex-1" size="sm" variant="default" onClick={() => toast.info("This action is launching with the next release.")}>
                                <Play className="h-4 w-4 mr-2" />
                                Start Module
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

                {enrollment ? (
                  <Button className="w-full" onClick={handleStartLearning}>
                    <Play className="h-4 w-4 mr-2" />
                    Continue Learning
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
                <li className="flex items-start space-x-2">
                  <CheckCircle className="h-4 w-4 text-primary mt-0.5" />
                  <span>Receive and interpret prophetic insights</span>
                </li>
                <li className="flex items-start space-x-2">
                  <CheckCircle className="h-4 w-4 text-primary mt-0.5" />
                  <span>Develop spiritual discernment skills</span>
                </li>
                <li className="flex items-start space-x-2">
                  <CheckCircle className="h-4 w-4 text-primary mt-0.5" />
                  <span>Apply prophetic ministry practically</span>
                </li>
                <li className="flex items-start space-x-2">
                  <CheckCircle className="h-4 w-4 text-primary mt-0.5" />
                  <span>Validate prophetic accuracy</span>
                </li>
                <li className="flex items-start space-x-2">
                  <CheckCircle className="h-4 w-4 text-primary mt-0.5" />
                  <span>Minister with love and accountability</span>
                </li>
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
