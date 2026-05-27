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
import { LiveClassroom } from '@/components/learning/LiveClassroom';
import { LiveClassControls } from '@/components/learning/LiveClassControls';
import { CompanionResources } from '@/components/learning/CompanionResources';
import { useLiveClassContext } from '@/hooks/useLiveClassContext';
import { useUserRoles } from '@/hooks/useUserRoles';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { BackButton } from "@/components/layout/BackButton";

console.info('✝️ Module Detail — Christ is Lord over learning');

export default function ModuleDetail() {
  const { courseId, moduleId } = useParams<{ courseId: string; moduleId: string }>();
  const { data: module, isLoading } = useModule(moduleId!);
  const completeModule = useCompleteModule();
  // Resolve real student → program → course → faculty → matched tutor (no global fallback).
  // Hook must run before early returns to preserve React hook ordering.
  const { data: liveCtx } = useLiveClassContext(moduleId);
  const tutor = liveCtx?.tutor || null;
  const { isFaculty, isAdmin } = useUserRoles();
  const canControlClass = isFaculty || isAdmin;

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

  return (
    <PageTemplate title={module.title}>
      <div className="space-y-6">
        {/* Faculty/Admin: Start / End Live Class controls (course-scoped) */}
        {canControlClass && liveCtx?.courseId && (
          <LiveClassControls
            courseId={liveCtx.courseId}
            courseTitle={liveCtx.courseTitle || undefined}
          />
        )}

        {/* LiveKit-backed classroom — truthful: only LIVE when remote video track present */}
        {liveCtx?.courseId && (
          <LiveClassroom
            courseId={liveCtx.courseId}
            role={canControlClass ? 'faculty' : 'student'}
            lectureTitle={liveCtx.courseTitle || undefined}
          />
        )}

        {/* Live AI Avatar Lecture — gated on real course/tutor context */}
        {liveCtx && !tutor && (
          <Alert variant="destructive">
            <AlertTitle>No live class available for this module</AlertTitle>
            <AlertDescription>
              {liveCtx.courseTitle
                ? `No AI faculty has been assigned to "${liveCtx.facultyName || liveCtx.courseTitle}" yet. The lecture cannot start until a tutor is provisioned for this faculty.`
                : 'This module is not linked to a course in your assigned program.'}
            </AlertDescription>
          </Alert>
        )}
        {liveCtx && tutor && (
          <LiveAvatarLecture
            userId={liveCtx.userId || undefined}
            tutorId={tutor.id}
            tutorName={tutor.name}
            tutorSpecialty={tutor.specialty}
            tutorAvatar={tutor.avatar_image_url}
            moduleId={moduleId}
            moduleContent={module.content_md}
            moduleTitle={module.title}
            courseId={liveCtx.courseId || undefined}
            courseTitle={liveCtx.courseTitle || undefined}
            programTitle={liveCtx.programTitle || undefined}
            facultyName={liveCtx.facultyName || undefined}
            studentName={liveCtx.studentName || undefined}
            learningObjectives={liveCtx.learningObjectives}
          />
        )}

        {/* AI Tutor Avatar — chat + audio companion */}
        {tutor && (
          <AITutorAvatar
            tutorId={tutor.id}
            tutorName={tutor.name}
            tutorSpecialty={tutor.specialty}
            tutorAvatar={tutor.avatar_image_url}
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