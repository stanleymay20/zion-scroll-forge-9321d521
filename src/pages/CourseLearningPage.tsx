import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate, useParams } from 'react-router-dom';
import {
  AlertCircle, ArrowLeft, Award, BookOpen, Bot, CalendarDays,
  ClipboardCheck, GraduationCap, List, Loader2, ShieldCheck, Target,
} from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { PageTemplate } from '@/components/layout/PageTemplate';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ModuleLearningContent } from '@/components/learning/ModuleLearningContent';
import { CourseCurriculumBrowser } from '@/components/learning/CourseCurriculumBrowser';
import { QuizInterface } from '@/components/course/QuizInterface';
import { usePrerequisiteCheck } from '@/hooks/usePrerequisiteCheck';
import { PrerequisiteBlock } from '@/components/courses/PrerequisiteBlock';
import { getAcademicCourseProfile } from '@/lib/academicRigor';

export default function CourseLearningPage() {
  const { courseId } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<'learn' | 'assessment' | 'curriculum' | 'support'>('learn');
  const [currentModuleId, setCurrentModuleId] = useState<string | null>(null);

  const { data: courseData, isLoading, error } = useQuery({
    queryKey: ['course-learning', courseId],
    enabled: !!courseId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('courses')
        .select('*, course_modules(*, learning_materials(*))')
        .eq('id', courseId!)
        .single();
      if (error) throw error;
      return data;
    },
  });

  const { data: enrollment } = useQuery({
    queryKey: ['course-enrollment', courseId, user?.id],
    enabled: !!courseId && !!user?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('enrollments')
        .select('id,user_id,course_id')
        .eq('course_id', courseId!)
        .eq('user_id', user!.id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const modules = useMemo(
    () => [...(courseData?.course_modules ?? [])].sort((a: any, b: any) => (a.order_index ?? 0) - (b.order_index ?? 0)),
    [courseData?.course_modules],
  );
  const moduleIds = useMemo(() => modules.map((m: any) => m.id), [modules]);

  const { data: verifiedRows = [] } = useQuery({
    queryKey: ['verified-module-progress', courseId, user?.id, moduleIds.join(',')],
    enabled: !!user?.id && moduleIds.length > 0,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('student_module_progress')
        .select('module_id,status,mastery_level,completed_at')
        .eq('user_id', user!.id)
        .in('module_id', moduleIds);
      if (error) throw error;
      return data ?? [];
    },
  });

  const verifiedCompletedIds = useMemo(
    () => verifiedRows
      .filter((row: any) => row.status === 'completed' && Number(row.mastery_level ?? 0) >= 70)
      .map((row: any) => row.module_id),
    [verifiedRows],
  );

  const { data: courseCompletion } = useQuery({
    queryKey: ['verified-course-completion', courseId, user?.id, verifiedCompletedIds.join(',')],
    enabled: !!courseId && !!user?.id,
    queryFn: async () => {
      const { data, error } = await (supabase as any).rpc('get_verified_course_completion', {
        p_user_id: user!.id,
        p_course_id: courseId!,
      });
      if (error) throw error;
      return data as {
        progress: number;
        complete: boolean;
        total_modules: number;
        verified_modules: number;
        authority: string;
      };
    },
  });

  const { data: existingCert } = useQuery({
    queryKey: ['course-certificate', courseId, user?.id],
    enabled: !!courseId && !!user?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('course_certificates')
        .select('id,completion_date')
        .eq('course_id', courseId!)
        .eq('user_id', user!.id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const prerequisite = usePrerequisiteCheck(courseId, 'course-learning');

  useEffect(() => {
    if (!modules.length || currentModuleId) return;
    const firstIncomplete = modules.find((m: any) => !verifiedCompletedIds.includes(m.id));
    setCurrentModuleId(firstIncomplete?.id ?? modules[0].id);
  }, [modules, currentModuleId, verifiedCompletedIds]);

  const currentModuleIndex = modules.findIndex((m: any) => m.id === currentModuleId);
  const currentModule = modules[currentModuleIndex];
  const currentVerified = !!currentModuleId && verifiedCompletedIds.includes(currentModuleId);
  const overallProgress = Number(courseCompletion?.progress ?? 0);
  const academicProfile = courseData ? getAcademicCourseProfile(courseData, modules.length) : null;

  const certificateMutation = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke('generate-certificate', {
        body: { courseId, userId: user!.id, type: 'course' },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['course-certificate', courseId, user?.id] });
      toast.success('Verified course certificate issued.');
      if (data?.html) {
        const win = window.open();
        if (win) win.document.write(data.html);
      }
    },
    onError: () => toast.error('Certificate issuance was not authorized by verified course evidence.'),
  });

  const refreshVerifiedProgress = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['verified-module-progress', courseId, user?.id] }),
      queryClient.invalidateQueries({ queryKey: ['verified-course-completion', courseId, user?.id] }),
      queryClient.invalidateQueries({ queryKey: ['course-certificate', courseId, user?.id] }),
    ]);
  };

  const goNext = () => {
    if (currentModuleIndex >= 0 && currentModuleIndex < modules.length - 1) {
      setCurrentModuleId(modules[currentModuleIndex + 1].id);
      setActiveTab('learn');
    } else {
      setActiveTab('curriculum');
    }
  };

  if (isLoading) {
    return <PageTemplate title="Loading course" description=""><div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin" /></div></PageTemplate>;
  }

  if (error || !courseData) {
    return (
      <PageTemplate title="Course unavailable" description="">
        <div className="text-center py-12"><AlertCircle className="h-12 w-12 text-destructive mx-auto mb-4" /><p className="text-muted-foreground mb-4">The course could not be loaded.</p><Button onClick={() => navigate('/catalog')}><ArrowLeft className="h-4 w-4 mr-2" />Catalog</Button></div>
      </PageTemplate>
    );
  }

  if (!enrollment) {
    return (
      <PageTemplate title={courseData.title} description="Enrollment required">
        <div className="text-center py-12"><GraduationCap className="h-12 w-12 text-muted-foreground mx-auto mb-4" /><p className="text-muted-foreground mb-4">You must be enrolled before accessing course learning materials.</p><Button onClick={() => navigate(`/courses/${courseId}`)}>Course details</Button></div>
      </PageTemplate>
    );
  }

  if (prerequisite.isLoading) {
    return <PageTemplate title={courseData.title} description="Checking academic eligibility"><div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin" /></div></PageTemplate>;
  }

  if (!prerequisite.data?.eligible) {
    return (
      <PageTemplate title={courseData.title} description="Prerequisite verification required">
        <PrerequisiteBlock result={prerequisite.data!} onRetry={() => prerequisite.refetch()} />
      </PageTemplate>
    );
  }

  return (
    <div className="min-h-screen pb-24 md:pb-8">
      <div className="sticky top-0 z-30 border-b bg-background/95 backdrop-blur px-4 py-3">
        <div className="max-w-7xl mx-auto flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate(`/courses/${courseId}`)}><ArrowLeft className="h-5 w-5" /></Button>
          <div className="flex-1 min-w-0">
            <h1 className="text-sm font-semibold truncate">{courseData.title}</h1>
            <div className="flex items-center gap-2 mt-1"><Progress value={overallProgress} className="h-1.5 flex-1" /><span className="text-xs text-muted-foreground">{overallProgress}% verified</span></div>
          </div>
          {existingCert && <Badge variant="secondary"><Award className="h-3 w-3 mr-1" />Certified</Badge>}
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 pt-4 space-y-4">
        {academicProfile && (
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <Card><CardContent className="p-3 text-sm"><div className="flex gap-2 font-medium"><CalendarDays className="h-4 w-4" />Weekly load</div><p className="text-xs text-muted-foreground mt-1">{academicProfile.workload} · {academicProfile.duration}</p></CardContent></Card>
            <Card><CardContent className="p-3 text-sm"><div className="flex gap-2 font-medium"><Target className="h-4 w-4" />Mastery</div><p className="text-xs text-muted-foreground mt-1">70%+ trusted module mastery required.</p></CardContent></Card>
            <Card><CardContent className="p-3 text-sm"><div className="flex gap-2 font-medium"><ClipboardCheck className="h-4 w-4" />Evidence</div><p className="text-xs text-muted-foreground mt-1">Server-graded assessments drive completion.</p></CardContent></Card>
            <Card><CardContent className="p-3 text-sm"><div className="flex gap-2 font-medium"><ShieldCheck className="h-4 w-4" />Authority</div><p className="text-xs text-muted-foreground mt-1">Browser activity never self-certifies mastery.</p></CardContent></Card>
          </div>
        )}

        {courseCompletion?.complete && !existingCert && (
          <Card className="border-emerald-500/30 bg-emerald-500/5"><CardContent className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3"><div><p className="font-semibold">Verified course completion established</p><p className="text-sm text-muted-foreground">All {courseCompletion.verified_modules}/{courseCompletion.total_modules} modules meet the mastery standard.</p></div><Button onClick={() => certificateMutation.mutate()} disabled={certificateMutation.isPending}>{certificateMutation.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}Issue verified certificate</Button></CardContent></Card>
        )}

        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as typeof activeTab)}>
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="learn"><BookOpen className="h-4 w-4 mr-1" />Learn</TabsTrigger>
            <TabsTrigger value="assessment"><ClipboardCheck className="h-4 w-4 mr-1" />Assess</TabsTrigger>
            <TabsTrigger value="curriculum"><List className="h-4 w-4 mr-1" />Modules</TabsTrigger>
            <TabsTrigger value="support"><Bot className="h-4 w-4 mr-1" />Support</TabsTrigger>
          </TabsList>

          <TabsContent value="learn" className="mt-4">
            {currentModule ? (
              <ModuleLearningContent
                module={currentModule as any}
                courseTitle={courseData.title}
                totalModules={modules.length}
                isCompleted={currentVerified}
                isFirst={currentModuleIndex <= 0}
                isLast={currentModuleIndex === modules.length - 1}
                onComplete={() => setActiveTab('assessment')}
                onPrevious={() => {
                  if (currentModuleIndex > 0) {
                    setCurrentModuleId(modules[currentModuleIndex - 1].id);
                    setActiveTab('learn');
                  }
                }}
                onNext={goNext}
              />
            ) : <Card><CardContent className="py-10 text-center text-muted-foreground">No published modules are available.</CardContent></Card>}
          </TabsContent>

          <TabsContent value="assessment" className="mt-4">
            {currentModuleId ? (
              <QuizInterface
                lectureId={currentModuleId}
                courseId={courseId!}
                onComplete={async () => {
                  await refreshVerifiedProgress();
                  goNext();
                }}
              />
            ) : <Card><CardContent className="py-10 text-center text-muted-foreground">Choose a module first.</CardContent></Card>}
          </TabsContent>

          <TabsContent value="curriculum" className="mt-4">
            <CourseCurriculumBrowser
              course={courseData as any}
              modules={modules as any}
              currentModuleId={currentModuleId ?? undefined}
              completedModuleIds={verifiedCompletedIds}
              overallProgress={overallProgress}
              onModuleSelect={(id) => { setCurrentModuleId(id); setActiveTab('learn'); }}
              onStartCourse={() => { if (modules[0]) { setCurrentModuleId(modules[0].id); setActiveTab('learn'); } }}
            />
          </TabsContent>

          <TabsContent value="support" className="mt-4">
            <Card><CardContent className="py-8 text-center space-y-3"><Bot className="h-10 w-10 mx-auto text-primary" /><div><p className="font-semibold">Academic support</p><p className="text-sm text-muted-foreground">Use the AI tutor for explanation, practice and study planning. Tutor interaction is pedagogical context, not credential evidence.</p></div><Button onClick={() => navigate('/ai-tutors')}>Open AI Tutors</Button></CardContent></Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
