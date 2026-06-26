/**
 * CourseLearningPage - Complete course learning experience
 * Auto-awards certificates on course completion
 */

import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { PageTemplate } from '@/components/layout/PageTemplate';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { 
  ArrowLeft, BookOpen, List, Loader2, AlertCircle,
  MessageSquare, GraduationCap, Award, Trophy, Video
} from 'lucide-react';
import { toast } from 'sonner';
import { ModuleLearningContent } from '@/components/learning/ModuleLearningContent';
import { CourseCurriculumBrowser } from '@/components/learning/CourseCurriculumBrowser';
import { AITutorAvatar } from '@/components/AITutorAvatar';
import { LiveAvatarLecture } from '@/components/learning/LiveAvatarLecture';
import { useLiveClassContext } from '@/hooks/useLiveClassContext';
import { OutcomesAchievedPanel } from '@/components/learning/OutcomesAchievedPanel';
import { earnScrollGold } from '@/services/scrollgold';
import { usePrerequisiteCheck } from '@/hooks/usePrerequisiteCheck';
import { PrerequisiteBlock } from '@/components/courses/PrerequisiteBlock';
import confetti from 'canvas-confetti';

export default function CourseLearningPage() {
  const { courseId } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<'learn' | 'curriculum' | 'tutor' | 'avatar'>('learn');
  const [currentModuleId, setCurrentModuleId] = useState<string | null>(null);
  const [certificateAwarded, setCertificateAwarded] = useState(false);

  // Fetch course with modules
  const { data: courseData, isLoading, error } = useQuery({
    queryKey: ['course-learning-full', courseId],
    queryFn: async () => {
      const { data: course, error: courseError } = await supabase
        .from('courses')
        .select('*, course_modules (*)')
        .eq('id', courseId!)
        .single();
      if (courseError) throw courseError;
      return course;
    },
    enabled: !!courseId
  });

  // Fetch enrollment
  const { data: enrollment } = useQuery({
    queryKey: ['enrollment-learning', courseId, user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('enrollments')
        .select('*')
        .eq('course_id', courseId!)
        .eq('user_id', user!.id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!courseId && !!user
  });

  // Fetch module completions
  const { data: moduleCompletions = [] } = useQuery({
    queryKey: ['module-completions', courseId, user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('module_completions' as any)
        .select('module_id')
        .eq('user_id', user!.id);
      if (error) return [];
      return (data as any[])?.map(mc => mc.module_id) || [];
    },
    enabled: !!user
  });

  // Check existing certificate
  const { data: existingCert } = useQuery({
    queryKey: ['course-certificate', courseId, user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from('course_certificates')
        .select('id')
        .eq('course_id', courseId!)
        .eq('user_id', user!.id)
        .maybeSingle();
      return data;
    },
    enabled: !!courseId && !!user
  });

  const modules = courseData?.course_modules || [];
  const sortedModules = [...modules].sort((a: any, b: any) => (a.order_index || 0) - (b.order_index || 0));

  // Set initial module
  useEffect(() => {
    if (sortedModules.length > 0 && !currentModuleId) {
      const firstIncomplete = sortedModules.find((m: any) => !moduleCompletions.includes(m.id));
      setCurrentModuleId(firstIncomplete?.id || sortedModules[0].id);
    }
  }, [sortedModules, moduleCompletions, currentModuleId]);

  const currentModule = sortedModules.find((m: any) => m.id === currentModuleId);
  const currentModuleIndex = sortedModules.findIndex((m: any) => m.id === currentModuleId);
  const { data: liveCtx } = useLiveClassContext(currentModuleId || undefined);
  const aiTutor = liveCtx?.tutor ?? null;

  // Auto-award certificate when course is 100% complete
  const awardCertificate = useCallback(async () => {
    if (!user?.id || !courseId || certificateAwarded || existingCert) return;
    
    try {
      setCertificateAwarded(true);
      const { data, error } = await supabase.functions.invoke('generate-certificate', {
        body: { userId: user.id, courseId, type: 'course' }
      });
      
      if (error) throw error;
      
      confetti({ particleCount: 150, spread: 100, origin: { y: 0.6 } });
      toast.success('🎓 Course Completed! Certificate awarded!', {
        duration: 6000,
        action: {
          label: 'View Certificate',
          onClick: () => {
            if (data?.html) {
              const win = window.open();
              if (win) win.document.write(data.html);
            }
          }
        }
      });
      
      queryClient.invalidateQueries({ queryKey: ['course-certificate'] });
      queryClient.invalidateQueries({ queryKey: ['graduation-eligibility'] });
    } catch (err) {
      console.error('Certificate generation failed:', err);
      setCertificateAwarded(false);
    }
  }, [user?.id, courseId, certificateAwarded, existingCert, queryClient]);

  // Complete module mutation — also awards ScrollGold and writes auditable xp_awarded
  const completeModuleMutation = useMutation({
    mutationFn: async (moduleId: string) => {
      const moduleObj = sortedModules.find((m: any) => m.id === moduleId);
      const rewardAmount: number = Number(moduleObj?.rewards_amount ?? 0);

      // Outcome-mastery gate: if this module has authored quiz questions tagged to outcomes,
      // require >=70% of its outcomes to be "Achieved" before allowing completion.
      const { data: tagged } = await (supabase as any)
        .from('quiz_questions')
        .select('learning_objective_id')
        .eq('module_id', moduleId)
        .not('learning_objective_id', 'is', null);
      const objIds: string[] = Array.from(new Set(((tagged ?? []) as any[]).map((r) => r.learning_objective_id))).filter(Boolean);
      if (objIds.length > 0) {
        const { data: mastery } = await (supabase as any)
          .from('student_outcome_mastery')
          .select('learning_objective_id,score_pct')
          .eq('user_id', user!.id)
          .eq('module_id', moduleId)
          .in('learning_objective_id', objIds);
        const achieved = ((mastery ?? []) as any[]).filter((r) => (r.score_pct ?? 0) >= 70).length;
        const ratio = achieved / objIds.length;
        if (ratio < 0.7) {
          throw new Error(`Outcome mastery required: ${achieved}/${objIds.length} achieved. Retake the assessment to reach 70%.`);
        }
      }

      const { data: existing } = await supabase
        .from('module_completions' as any)
        .select('id')
        .eq('module_id', moduleId)
        .eq('user_id', user!.id)
        .maybeSingle();

      if (existing) return { existing: true };

      const { data, error } = await supabase
        .from('module_completions' as any)
        .insert({ module_id: moduleId, user_id: user!.id, course_id: courseId, xp_awarded: rewardAmount })
        .select()
        .single();

      if (error) throw error;

      // Award ScrollGold (best-effort; do not block completion if economy is offline)
      if (rewardAmount > 0) {
        try {
          await earnScrollGold(user!.id, rewardAmount, `Module completed: ${moduleObj?.title ?? moduleId}`);
        } catch (e) {
          console.warn('[CourseLearningPage] earnScrollGold failed:', e);
        }
      }

      // Update enrollment progress
      const newCompletedCount = moduleCompletions.length + 1;
      const newProgress = Math.round((newCompletedCount / sortedModules.length) * 100);

      if (enrollment) {
        await supabase
          .from('enrollments')
          .update({ progress: newProgress })
          .eq('id', enrollment.id);
      }

      return { data, progress: newProgress, rewarded: rewardAmount };
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['module-completions'] });
      queryClient.invalidateQueries({ queryKey: ['enrollment-learning'] });
      queryClient.invalidateQueries({ queryKey: ['outcome-mastery'] });

      if (!result?.existing) {
        const rewarded = (result as any)?.rewarded ?? 0;
        toast.success(rewarded > 0 ? `Module completed! +${rewarded} ScrollGold 🎉` : 'Module completed! 🎉');

        const newCount = moduleCompletions.length + 1;
        if (newCount >= sortedModules.length && sortedModules.length > 0) {
          setTimeout(() => awardCertificate(), 1000);
        }
      }
    },
    onError: (e: any) => toast.error(e?.message ?? 'Failed to mark module as complete'),
  });

  const handleModuleComplete = () => {
    if (currentModuleId && !moduleCompletions.includes(currentModuleId)) {
      completeModuleMutation.mutate(currentModuleId);
    }
  };

  const handleNextModule = () => {
    if (currentModuleIndex < sortedModules.length - 1) {
      setCurrentModuleId(sortedModules[currentModuleIndex + 1].id);
      setActiveTab('learn');
    } else {
      // All modules done — navigate to graduation
      navigate('/graduation');
    }
  };

  const handlePreviousModule = () => {
    if (currentModuleIndex > 0) {
      setCurrentModuleId(sortedModules[currentModuleIndex - 1].id);
      setActiveTab('learn');
    }
  };

  const handleModuleSelect = (moduleId: string) => {
    setCurrentModuleId(moduleId);
    setActiveTab('learn');
  };

  const overallProgress = sortedModules.length > 0 
    ? Math.round((moduleCompletions.filter((id: string) => 
        sortedModules.some((m: any) => m.id === id)
      ).length / sortedModules.length) * 100)
    : 0;

  if (isLoading) {
    return (
      <PageTemplate title="Loading..." description="">
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
          <p className="text-lg text-muted-foreground mb-4">Failed to load course content</p>
          <Button onClick={() => navigate('/courses')}>
            <ArrowLeft className="h-4 w-4 mr-2" /> Back to Courses
          </Button>
        </div>
      </PageTemplate>
    );
  }

  if (!enrollment) {
    return (
      <PageTemplate title={courseData.title} description="">
        <div className="text-center py-12">
          <GraduationCap className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-lg text-muted-foreground mb-4">
            You need to enroll in this course to access the content
          </p>
          <Button onClick={() => navigate(`/courses/${courseId}`)}>
            <ArrowLeft className="h-4 w-4 mr-2" /> Go to Course Details
          </Button>
        </div>
      </PageTemplate>
    );
  }

  return (
    <CourseLearningGuard courseId={courseId!} courseTitle={courseData.title} navigate={navigate}>
    <div className="min-h-screen pb-24 md:pb-8">



  return (
    <div className="min-h-screen pb-24 md:pb-8">
      {/* Sticky Progress Header */}
      <div className="sticky top-0 z-30 bg-background/95 backdrop-blur-sm border-b border-border px-4 py-3">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate(`/courses/${courseId}`)} className="shrink-0">
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div className="flex-1 min-w-0">
              <h1 className="text-sm font-semibold text-foreground truncate">{courseData.title}</h1>
              <div className="flex items-center gap-2 mt-1">
                <Progress value={overallProgress} className="h-1.5 flex-1" />
                <span className="text-xs text-muted-foreground whitespace-nowrap">{overallProgress}%</span>
              </div>
            </div>
            {existingCert && (
              <Badge variant="secondary" className="bg-accent/10 text-accent shrink-0">
                <Award className="h-3 w-3 mr-1" /> Certified
              </Badge>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 pt-4">
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="w-full">
          <TabsList className="grid w-full grid-cols-4 mb-4">
            <TabsTrigger value="learn" className="flex items-center gap-1.5 text-xs sm:text-sm">
              <BookOpen className="h-4 w-4" />
              <span className="hidden sm:inline">Learn</span>
            </TabsTrigger>
            <TabsTrigger value="curriculum" className="flex items-center gap-1.5 text-xs sm:text-sm">
              <List className="h-4 w-4" />
              <span className="hidden sm:inline">Modules</span>
            </TabsTrigger>
            <TabsTrigger value="avatar" className="flex items-center gap-1.5 text-xs sm:text-sm">
              <Video className="h-4 w-4" />
              <span className="hidden sm:inline">Live Avatar</span>
            </TabsTrigger>
            <TabsTrigger value="tutor" className="flex items-center gap-1.5 text-xs sm:text-sm">
              <MessageSquare className="h-4 w-4" />
              <span className="hidden sm:inline">AI Tutor</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="learn">
            {currentModule ? (
              <div className="space-y-4">
                <ModuleLearningContent
                  module={currentModule}
                  courseTitle={courseData.title}
                  totalModules={sortedModules.length}
                  onComplete={handleModuleComplete}
                  onNext={handleNextModule}
                  onPrevious={handlePreviousModule}
                  isCompleted={moduleCompletions.includes(currentModuleId!)}
                  isFirst={currentModuleIndex === 0}
                  isLast={currentModuleIndex === sortedModules.length - 1}
                />
                {user?.id && currentModuleId && (
                  <OutcomesAchievedPanel
                    userId={user.id}
                    moduleId={currentModuleId}
                    title="Your Outcomes for This Module"
                  />
                )}
              </div>
            ) : (
              <Card>
                <CardContent className="py-12 text-center">
                  <BookOpen className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                  <p className="text-muted-foreground">No modules available yet</p>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="curriculum">
            <CourseCurriculumBrowser
              course={courseData}
              modules={sortedModules}
              currentModuleId={currentModuleId || undefined}
              completedModuleIds={moduleCompletions}
              overallProgress={overallProgress}
              onModuleSelect={handleModuleSelect}
            />
          </TabsContent>

          <TabsContent value="avatar">
            {aiTutor ? (
              <LiveAvatarLecture
                userId={liveCtx?.userId || user?.id}
                tutorName={aiTutor.name}
                tutorSpecialty={aiTutor.specialty}
                tutorAvatar={aiTutor.avatar_image_url}
                tutorId={aiTutor.id}
                moduleId={currentModuleId || undefined}
                moduleContent={currentModule?.content_md}
                moduleTitle={currentModule?.title}
                courseId={liveCtx?.courseId || courseData?.id}
                courseTitle={liveCtx?.courseTitle || courseData?.title}
                facultyName={liveCtx?.facultyName || courseData?.faculty}
                programTitle={liveCtx?.programTitle || undefined}
                studentName={liveCtx?.studentName || undefined}
                learningObjectives={liveCtx?.learningObjectives || []}
              />
            ) : (
              <div className="rounded-lg border border-dashed p-6 text-sm text-muted-foreground">
                {liveCtx?.blockedReason || 'No AI faculty has been assigned to this course yet. Live lecture is unavailable until a tutor is provisioned for this faculty.'}
              </div>
            )}
          </TabsContent>

          <TabsContent value="tutor">
            {aiTutor ? (
              <AITutorAvatar
                tutorId={aiTutor.id}
                tutorName={aiTutor.name}
                tutorSpecialty={aiTutor.specialty}
                tutorAvatar={aiTutor.avatar_image_url}
                moduleId={currentModuleId || undefined}
                moduleContent={currentModule?.content_md}
              />
            ) : (
              <Card>
                <CardContent className="py-12 text-center space-y-4">
                  <MessageSquare className="h-12 w-12 mx-auto text-muted-foreground" />
                  <p className="text-muted-foreground">
                    No AI Tutor is assigned to this course yet. You can still get help from any of our specialized AI Tutors.
                  </p>
                  <Button asChild variant="outline">
                    <a href="/ai-tutors">Browse AI Tutors</a>
                  </Button>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}