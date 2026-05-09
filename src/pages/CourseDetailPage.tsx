import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useEnrollInCourse } from "@/hooks/useCourses";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Skeleton } from "@/components/ui/skeleton";
import { CourseReviews } from "@/components/course/CourseReviews";
import { BookOpen, Clock, Users, Star, PlayCircle, Award, CheckCircle } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { getUserFriendlyError } from "@/lib/errors";

export default function CourseDetailPage() {
  const { courseId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const enrollInCourse = useEnrollInCourse();

  const { data: course, isLoading } = useQuery({
    queryKey: ["course", courseId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("courses")
        .select(`
          *,
          faculties(name, description),
          course_modules(id, title, order_index, duration_minutes, learning_materials(kind, url, title))
        `)
        .eq("id", courseId)
        .single();
      if (error) throw error;
      return data;
    },
  });

  const { data: enrollment } = useQuery({
    queryKey: ["enrollment", courseId, user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data, error } = await supabase
        .from("enrollments")
        .select("*")
        .eq("course_id", courseId)
        .eq("user_id", user.id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  const handleEnroll = async () => {
    if (!user) {
      toast({
        title: "Authentication required",
        description: "Please sign in to enroll in courses",
        variant: "destructive",
      });
      navigate("/auth");
      return;
    }

    try {
      await enrollInCourse.mutateAsync(courseId!);

      toast({
        title: "Enrolled successfully!",
        description: "You can now access the course content",
      });

      navigate(`/courses/${courseId}/learn`);
    } catch (error: any) {
      toast({
        title: "Enrollment failed",
        description: getUserFriendlyError(error),
        variant: "destructive",
      });
    }
  };

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Skeleton className="h-64 w-full mb-8" />
        <Skeleton className="h-8 w-3/4 mb-4" />
        <Skeleton className="h-4 w-full mb-2" />
        <Skeleton className="h-4 w-full mb-2" />
      </div>
    );
  }

  if (!course) {
    return (
      <div className="container mx-auto px-4 py-8 text-center">
        <h2 className="text-2xl font-bold">Course not found</h2>
      </div>
    );
  }

  const sortedModules = [...(course.course_modules || [])].sort(
    (a: any, b: any) => (a.order_index ?? 0) - (b.order_index ?? 0)
  );
  const firstModuleVideo = (sortedModules[0]?.learning_materials || []).find(
    (mat: any) => (mat.kind || '').toLowerCase() === 'video' && mat.url
  );
  const previewVideoUrl = course.preview_video_url || firstModuleVideo?.url;

  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <div className="bg-gradient-to-r from-primary/10 to-primary/5 border-b">
        <div className="container mx-auto px-4 py-12">
          <div className="grid md:grid-cols-2 gap-8 items-center">
            <div>
              <Badge className="mb-4">{course.level || "Beginner"}</Badge>
              <h1 className="text-4xl font-bold mb-4">{course.title}</h1>
              <p className="text-lg text-muted-foreground mb-6">{course.description}</p>
              
              <div className="flex flex-wrap gap-6 mb-6">
                <div className="flex items-center gap-2">
                  <Star className="h-5 w-5 fill-yellow-400 text-yellow-400" />
                  <span className="font-semibold">{course.rating || 5.0}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  <span>{course.students || 0} students</span>
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="h-5 w-5" />
                  <span>{course.duration || "8 weeks"}</span>
                </div>
              </div>

              {enrollment ? (
                <Button size="lg" onClick={() => navigate(`/courses/${courseId}/learn`)}>
                  <PlayCircle className="mr-2 h-5 w-5" />
                  Continue Learning
                </Button>
              ) : (
                <Button size="lg" onClick={handleEnroll} disabled={enrollInCourse.isPending}>
                  <BookOpen className="mr-2 h-5 w-5" />
                  {enrollInCourse.isPending ? "Enrolling..." : "Enroll Now"}
                </Button>
              )}
            </div>

            <div className="relative aspect-video bg-muted rounded-lg overflow-hidden">
              {previewVideoUrl ? (
                <video
                  src={previewVideoUrl}
                  controls
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <PlayCircle className="h-24 w-24 text-muted-foreground" />
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Content Section */}
      <div className="container mx-auto px-4 py-8">
        <Tabs defaultValue="overview" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="curriculum">Curriculum</TabsTrigger>
            <TabsTrigger value="reviews">Reviews</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>What you'll learn</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid md:grid-cols-2 gap-4">
                  {["Master core concepts", "Build practical skills", "Work on real projects", "Earn certification"].map((item, i) => (
                    <div key={i} className="flex items-start gap-2">
                      <CheckCircle className="h-5 w-5 text-green-500 flex-shrink-0 mt-0.5" />
                      <span>{item}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Course Description</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground leading-relaxed">
                  {course.description}
                </p>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="curriculum">
            <Card>
              <CardHeader>
                <CardTitle>Course Modules</CardTitle>
                <CardDescription>
                  {course.course_modules?.length || 0} modules
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Accordion type="single" collapsible className="w-full">
                  {course.course_modules?.sort((a, b) => a.order_index - b.order_index).map((module, i) => (
                    <AccordionItem key={module.id} value={`module-${i}`}>
                      <AccordionTrigger>
                        <div className="flex items-center gap-3">
                          <span className="font-semibold">Module {i + 1}:</span>
                          <span>{module.title}</span>
                        </div>
                      </AccordionTrigger>
                      <AccordionContent>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Clock className="h-4 w-4" />
                          <span>{module.duration_minutes || 60} minutes</span>
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="reviews">
            <CourseReviews courseId={courseId!} />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
