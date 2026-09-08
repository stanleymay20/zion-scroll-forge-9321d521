import { useParams, useNavigate } from 'react-router-dom';
import { useFaculty } from '@/hooks/useFaculties';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import {
  GraduationCap, BookOpen, User, Cross, ArrowLeft,
  Heart, Brain, Clock, Award, ChevronRight, CheckCircle2,
} from 'lucide-react';

const FacultyDetail = () => {
  const { facultyId } = useParams<{ facultyId: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { data: faculty, isLoading: facultyLoading } = useFaculty(facultyId!);

  const { data: user } = useQuery({
    queryKey: ['current-user'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      return user;
    },
  });

  // Historical course-level enrollment rows remain read-compatible only.
  const { data: enrollments } = useQuery({
    queryKey: ['my-enrollments', user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase.from('enrollments').select('course_id').eq('user_id', user.id);
      if (error) throw error;
      return data?.map((e) => e.course_id) || [];
    },
    enabled: !!user,
  });

  const { data: courses, isLoading: coursesLoading } = useQuery({
    queryKey: ['faculty-courses', facultyId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('courses')
        .select('*, course_modules(*)')
        .eq('faculty_id', facultyId)
        .order('created_at');
      if (error) throw error;
      return data;
    },
    enabled: !!facultyId,
  });

  const handleRegistration = (courseId: string) => {
    if (!user) {
      toast({ title: 'Authentication Required', description: 'Please sign in before academic registration.' });
      navigate(`/auth?redirect=${encodeURIComponent(`/register?course=${courseId}`)}`);
      return;
    }
    toast({
      title: 'Registrar registration',
      description: 'Opening the governed term, section, prerequisite, credit-load and timetable registration workflow.',
    });
    navigate(`/register?course=${encodeURIComponent(courseId)}`);
  };

  if (facultyLoading || coursesLoading) {
    return (
      <div className="container mx-auto py-8 px-4">
        <Skeleton className="h-12 w-64 mb-8" />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <Skeleton className="h-96 lg:col-span-2" />
          <Skeleton className="h-96" />
        </div>
      </div>
    );
  }

  if (!faculty) {
    return (
      <div className="container mx-auto py-8 px-4">
        <Card><CardHeader><CardTitle>Faculty Not Found</CardTitle><CardDescription>This faculty does not exist.</CardDescription></CardHeader></Card>
      </div>
    );
  }

  const aiTutor = (faculty as any).ai_tutors?.[0];
  const totalModules = courses?.reduce((sum, course) => sum + (course.course_modules?.length || 0), 0) || 0;

  return (
    <div className="container mx-auto py-8 px-4 max-w-7xl">
      <div className="mb-8">
        <Button variant="ghost" onClick={() => navigate('/faculties')} className="mb-4">
          <ArrowLeft className="h-4 w-4 mr-2" />Back to Faculties
        </Button>

        <div className="flex flex-col lg:flex-row gap-8 items-start">
          <div className="w-full lg:w-64 flex-shrink-0">
            {faculty.emblem_url ? (
              <img src={faculty.emblem_url} alt={`${faculty.name} Emblem`} className="w-full rounded-lg shadow-xl border-2 border-primary" />
            ) : (
              <div className="w-full aspect-square bg-gradient-to-br from-primary/10 to-accent/10 rounded-lg flex items-center justify-center">
                <GraduationCap className="h-32 w-32 text-primary/30" />
              </div>
            )}
          </div>

          <div className="flex-1">
            <div className="flex items-center gap-3 mb-4"><Cross className="h-6 w-6 text-primary" /><Badge className="font-mono">{faculty.faculty_code}</Badge></div>
            <h1 className="text-4xl font-serif font-bold mb-4">{faculty.name}</h1>
            <p className="text-xl text-muted-foreground mb-6">{faculty.description}</p>
            {faculty.key_scripture && (
              <Card className="bg-accent/20 border-accent">
                <CardHeader><div className="flex items-center gap-2"><Cross className="h-4 w-4 text-accent" /><CardTitle className="text-lg">Scripture Anchor</CardTitle></div></CardHeader>
                <CardContent><p className="font-serif italic">{faculty.key_scripture}</p></CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <Card><CardHeader className="pb-3"><CardDescription>Courses</CardDescription><CardTitle className="text-3xl">{courses?.length || 0}</CardTitle></CardHeader></Card>
        <Card><CardHeader className="pb-3"><CardDescription>Modules</CardDescription><CardTitle className="text-3xl">{totalModules}</CardTitle></CardHeader></Card>
        <Card><CardHeader className="pb-3"><CardDescription>AI Tutor</CardDescription><CardTitle className="text-3xl">{aiTutor ? '1' : '0'}</CardTitle></CardHeader></Card>
        <Card><CardHeader className="pb-3"><CardDescription>Status</CardDescription><Badge variant="secondary" className="w-fit">Active</Badge></CardHeader></Card>
      </div>

      <Tabs defaultValue="courses" className="w-full">
        <TabsList className="w-full justify-start">
          <TabsTrigger value="courses">Courses & Modules</TabsTrigger>
          <TabsTrigger value="tutor">AI Tutor</TabsTrigger>
          <TabsTrigger value="about">About Faculty</TabsTrigger>
        </TabsList>

        <TabsContent value="courses" className="space-y-6 mt-6">
          {courses && courses.length > 0 ? courses.map((course) => (
            <Card key={course.id} className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <CardTitle className="text-2xl mb-2">{course.title}</CardTitle>
                    <CardDescription className="text-base">{course.description}</CardDescription>
                    <div className="flex items-center gap-2 mt-3"><Badge variant="secondary">Registrar-managed registration</Badge></div>
                  </div>
                  <div className="flex flex-col gap-2">
                    {enrollments?.includes(course.id) ? (
                      <Button variant="outline" disabled className="gap-2"><CheckCircle2 className="h-4 w-4" />Legacy enrollment</Button>
                    ) : (
                      <Button onClick={() => handleRegistration(course.id)}>Register</Button>
                    )}
                    <Button variant="outline" onClick={() => navigate(`/courses/${course.id}`)}>
                      View Details<ChevronRight className="h-4 w-4 ml-2" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                  <div className="flex items-center gap-2"><Clock className="h-4 w-4" /><span>{course.duration || 'Self-paced'}</span></div>
                  <div className="flex items-center gap-2"><BookOpen className="h-4 w-4" /><span>{course.course_modules?.length || 0} Modules</span></div>
                  <div className="flex items-center gap-2"><Award className="h-4 w-4" /><span>{course.level || 'All Levels'}</span></div>
                </div>
                {course.course_modules && course.course_modules.length > 0 && (
                  <>
                    <Separator className="my-4" />
                    <div className="space-y-2">
                      <h4 className="font-semibold text-sm">Course Modules:</h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                        {course.course_modules.map((module: any, idx: number) => (
                          <div key={module.id} className="flex items-center gap-2 text-sm">
                            <Badge variant="outline" className="w-6 h-6 flex items-center justify-center p-0">{idx + 1}</Badge>
                            <span className="text-muted-foreground">{module.title}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          )) : (
            <Card><CardHeader className="text-center py-12"><BookOpen className="h-16 w-16 mx-auto text-muted-foreground mb-4" /><CardTitle>No Courses Yet</CardTitle><CardDescription>Courses for this faculty are currently being developed.</CardDescription></CardHeader></Card>
          )}
        </TabsContent>

        <TabsContent value="tutor" className="mt-6">
          {aiTutor ? (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <Card className="lg:col-span-2">
                <CardHeader>
                  <div className="flex items-center gap-4">
                    {aiTutor.avatar_image_url ? <img src={aiTutor.avatar_image_url} alt={aiTutor.name} className="h-20 w-20 rounded-full object-cover border-2 border-primary" /> : <div className="h-20 w-20 rounded-full bg-primary/10 flex items-center justify-center"><Brain className="h-10 w-10 text-primary" /></div>}
                    <div><CardTitle className="text-2xl">{aiTutor.name}</CardTitle><CardDescription className="text-base">{aiTutor.specialty}</CardDescription></div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div><h4 className="font-semibold mb-2">Biography</h4><p className="text-muted-foreground">{aiTutor.description}</p></div>
                  {aiTutor.personality_prompt && <div><h4 className="font-semibold mb-2">Teaching Approach</h4><p className="text-muted-foreground">{aiTutor.personality_prompt}</p></div>}
                </CardContent>
              </Card>
              <Card>
                <CardHeader><CardTitle>Connect with AI Tutor</CardTitle></CardHeader>
                <CardContent className="space-y-3">
                  <Button className="w-full" onClick={() => navigate(`/ai-tutors/${aiTutor.id}`)}><Brain className="h-4 w-4 mr-2" />Start Chat Session</Button>
                  <Button variant="outline" className="w-full" onClick={() => navigate('/ai-tutors/office-hours')}><User className="h-4 w-4 mr-2" />Book Office Hours</Button>
                  <Separator />
                  <div className="text-sm text-muted-foreground"><p>Available 24/7 for academic support, questions, and guidance in {faculty.name}.</p></div>
                </CardContent>
              </Card>
            </div>
          ) : (
            <Card><CardHeader className="text-center py-12"><Brain className="h-16 w-16 mx-auto text-muted-foreground mb-4" /><CardTitle>No AI Tutor Assigned</CardTitle><CardDescription>An AI tutor for this faculty is currently being configured.</CardDescription></CardHeader></Card>
          )}
        </TabsContent>

        <TabsContent value="about" className="mt-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card><CardHeader><CardTitle className="flex items-center gap-2"><Heart className="h-5 w-5 text-primary" />Mission Statement</CardTitle></CardHeader><CardContent><p className="text-muted-foreground">{faculty.mission}</p></CardContent></Card>
            <Card>
              <CardHeader><CardTitle className="flex items-center gap-2"><Cross className="h-5 w-5 text-primary" />Spiritual Foundation</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                {faculty.key_scripture && <div><h4 className="font-semibold mb-2 text-sm">Scripture Anchor</h4><p className="text-muted-foreground font-serif italic">{faculty.key_scripture}</p></div>}
                <p className="text-sm text-muted-foreground">All learning in {faculty.name} is grounded in biblical truth and guided by the Holy Spirit.</p>
              </CardContent>
            </Card>
            <Card className="lg:col-span-2">
              <CardHeader><CardTitle>Faculty Information</CardTitle></CardHeader>
              <CardContent className="space-y-2 text-sm">
                <div className="flex justify-between py-2 border-b"><span className="font-medium">Faculty Code</span><Badge variant="outline" className="font-mono">{faculty.faculty_code}</Badge></div>
                <div className="flex justify-between py-2 border-b"><span className="font-medium">Total Courses</span><span>{courses?.length || 0}</span></div>
                <div className="flex justify-between py-2 border-b"><span className="font-medium">Total Modules</span><span>{totalModules}</span></div>
                <div className="flex justify-between py-2"><span className="font-medium">Established</span><span>{new Date(faculty.created_at).toLocaleDateString()}</span></div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default FacultyDetail;
