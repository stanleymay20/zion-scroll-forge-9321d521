import { PageTemplate } from '@/components/layout/PageTemplate';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useParams, Link } from 'react-router-dom';
import { useModule } from '@/hooks/useCourses';
import { useCompleteModule } from '@/hooks/useCourses';
import { Loader2, Download, CheckCircle2, FileText, Video, Presentation } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { toast } from '@/hooks/use-toast';
import { AITutorAvatar } from '@/components/AITutorAvatar';
import { MultiAgentClassroom } from '@/components/learning/MultiAgentClassroom';
import { LiveAvatarLecture } from '@/components/learning/LiveAvatarLecture';
import { CompanionResources } from '@/components/learning/CompanionResources';
import { useLiveClassContext } from '@/hooks/useLiveClassContext';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { BackButton } from "@/components/layout/BackButton";

console.info('✝️ Module Detail — Christ is Lord over learning');

export default function ModuleDetail() {
  const { courseId, moduleId } = useParams<{ courseId: string; moduleId: string }>();
  const { data: module, isLoading } = useModule(moduleId!);
  const completeModule = useCompleteModule();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!module) {
    return (
      <PageTemplate title="Module Not Found">
      <div className="mb-2"><BackButton fallbackTo="/dashboard" /></div>
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            This module could not be found.
          </CardContent>
        </Card>
      </PageTemplate>
    );
  }

  const handleComplete = () => {
    completeModule.mutate(
      { courseId: courseId!, moduleId: moduleId! },
      {
        onSuccess: () => {
          toast({ 
            title: '✅ Module Completed',
            description: 'ScrollCoins have been added to your account!'
          });
        }
      }
    );
  };

  const getFileIcon = (type: string) => {
    switch (type?.toLowerCase()) {
      case 'pdf': return <FileText className="h-4 w-4" />;
      case 'video': return <Video className="h-4 w-4" />;
      case 'slide':
      case 'pptx': return <Presentation className="h-4 w-4" />;
      default: return <FileText className="h-4 w-4" />;
    }
  };

  // Default AI tutor (using Sophia as default)
  const { data: defaultTutor } = useQuery({
    queryKey: ['default-tutor'],
    queryFn: async () => {
      const { data } = await supabase
        .from('ai_tutors')
        .select('*')
        .eq('name', 'Sophia')
        .maybeSingle();
      return data;
    }
  });

  return (
    <PageTemplate title={module.title}>
      <div className="space-y-6">
        {/* Live AI Avatar Lecture — real-time WebRTC video classroom (D-ID + ElevenLabs) */}
        {defaultTutor && (
          <LiveAvatarLecture
            tutorId={defaultTutor.id}
            tutorName={defaultTutor.name}
            tutorSpecialty={defaultTutor.specialty}
            tutorAvatar={defaultTutor.avatar_image_url}
            moduleId={moduleId}
            moduleContent={module.content_md}
            moduleTitle={module.title}
          />
        )}

        {/* AI Tutor Avatar — chat + audio companion */}
        {defaultTutor && (
          <AITutorAvatar
            tutorId={defaultTutor.id}
            tutorName={defaultTutor.name}
            tutorSpecialty={defaultTutor.specialty}
            tutorAvatar={defaultTutor.avatar_image_url}
            moduleId={moduleId}
            moduleContent={module.content_md}
          />
        )}

        {/* Live Multi-Agent Classroom — Lecturer + Peer + TA */}
        {moduleId && <MultiAgentClassroom moduleId={moduleId} />}

        {/* External research & library deep links */}
        <CompanionResources topic={module.title} />

        <Card>
          <CardHeader>
            <CardTitle>Lesson Content</CardTitle>
          </CardHeader>
          <CardContent className="prose dark:prose-invert max-w-none">
            <ReactMarkdown>{module.content_md || 'No content available yet.'}</ReactMarkdown>
          </CardContent>
        </Card>

        {module.learning_materials && module.learning_materials.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Learning Materials</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {module.learning_materials.map((mat: any) => (
                <a
                  key={mat.id}
                  href={mat.url}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center justify-between rounded-lg border p-4 hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    {getFileIcon(mat.type)}
                    <div>
                      <p className="font-medium">{mat.title}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge variant="secondary" className="text-xs uppercase">
                          {mat.type}
                        </Badge>
                        {mat.file_size && (
                          <span className="text-xs text-muted-foreground">
                            {Math.round(mat.file_size / 1024)} KB
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <Button size="sm" variant="ghost">
                    <Download className="h-4 w-4" />
                  </Button>
                </a>
              ))}
            </CardContent>
          </Card>
        )}

        <div className="flex items-center gap-3 flex-wrap">
          <Button
            onClick={handleComplete}
            disabled={completeModule.isPending}
            className="flex items-center gap-2"
          >
            {completeModule.isPending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Marking Complete...
              </>
            ) : (
              <>
                <CheckCircle2 className="h-4 w-4" />
                Mark as Complete
              </>
            )}
          </Button>

          {module.quizzes && module.quizzes.length > 0 && (
            <Link to={`/quiz/${module.quizzes[0].id}`}>
              <Button variant="secondary">Take Quiz</Button>
            </Link>
          )}

          <Link to={`/courses/${courseId}`}>
            <Button variant="ghost">Back to Course</Button>
          </Link>
        </div>
      </div>
    </PageTemplate>
  );
}
