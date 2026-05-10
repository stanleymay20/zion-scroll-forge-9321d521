import { useParams, useNavigate } from "react-router-dom";
import { PageTemplate } from "@/components/layout/PageTemplate";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Loader2, GraduationCap, BookOpen, Clock, ArrowLeft, CheckCircle, AlertCircle } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useDegreeProgram, useEnrollInDegree, useDegreeProgress } from "@/hooks/useDegreePrograms";
import { BackButton } from "@/components/layout/BackButton";

console.info("✝️ Degree Program Detail — Christ-centered path");

export default function DegreeProgramDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { data: program, isLoading } = useDegreeProgram(id!);
  const { data: progress } = useDegreeProgress(id!);
  const enrollInDegree = useEnrollInDegree();

  const handleEnroll = async () => {
    if (!id) return;
    await enrollInDegree.mutateAsync(id);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!program) {
    return (
      <PageTemplate title="Program Not Found">
      <div className="mb-2"><BackButton fallbackTo="/dashboard" /></div>
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">Degree program not found</p>
            <Button onClick={() => navigate("/degrees")} className="mt-4">
              Back to Programs
            </Button>
          </CardContent>
        </Card>
      </PageTemplate>
    );
  }

  const completionPercentage = progress?.completedCredits && (program as any).total_credits
    ? (progress.completedCredits / (program as any).total_credits) * 100
    : 0;

  const isCurriculumPending = (program as any).program_status === "curriculum_pending";

  return (
    <PageTemplate
      title={(program as any).title || "Degree Program"}
      description={`${(program as any).faculty} - ${(program as any).level}`}
      actions={
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => navigate("/degrees")}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          {!(program as any).is_enrolled && !isCurriculumPending && (
            <Button onClick={handleEnroll}>
              <GraduationCap className="h-4 w-4 mr-2" />
              Enroll Now
            </Button>
          )}
        </div>
      }
    >
      {isCurriculumPending && (
        <Alert className="mb-6 border-amber-500/40 bg-amber-500/10">
          <AlertCircle className="h-4 w-4 text-amber-600" />
          <AlertTitle>Curriculum Being Finalized</AlertTitle>
          <AlertDescription>
            This program's curriculum is being finalized by the faculty council and is not yet open for enrollment.
            Please check back soon or explore other available programs.
          </AlertDescription>
        </Alert>
      )}
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Program Overview</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-muted-foreground">{(program as any).description}</p>
              <div className="grid grid-cols-2 gap-4 pt-4 border-t">
                <div>
                  <p className="text-sm text-muted-foreground">Duration</p>
                  <p className="font-medium">{(program as any).duration}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Total Credits</p>
                  <p className="font-medium">{(program as any).total_credits}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {(program as any).is_enrolled && progress && (
            <Card>
              <CardHeader>
                <CardTitle>Your Progress</CardTitle>
                <CardDescription>
                  {progress.completedCredits} of {(program as any).total_credits} credits completed
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Progress value={completionPercentage} className="h-2" />
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Courses Completed</p>
                    <p className="text-2xl font-bold">{progress.completedCourses || 0}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Progress</p>
                    <p className="text-2xl font-bold">{progress.progressPercentage.toFixed(0)}%</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle>Curriculum</CardTitle>
              <CardDescription>Required and elective courses</CardDescription>
            </CardHeader>
            <CardContent>
              {(program as any).courses && (program as any).courses.length > 0 ? (
                <div className="space-y-3">
                  {(program as any).courses.map((course: any, index: number) => (
                    <div
                      key={course.id || index}
                      className="flex items-start gap-3 p-3 border rounded-lg hover:bg-muted/50 transition-colors"
                    >
                      {course.is_completed ? (
                        <CheckCircle className="h-5 w-5 text-[hsl(var(--scroll-gold))] mt-0.5" />
                      ) : (
                        <BookOpen className="h-5 w-5 text-muted-foreground mt-0.5" />
                      )}
                      <div className="flex-1">
                        <p className="font-medium">{course.title || course.course_title}</p>
                        <p className="text-sm text-muted-foreground">
                          {course.credits} credits
                          {course.is_required && (
                            <Badge variant="outline" className="ml-2">Required</Badge>
                          )}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 space-y-2">
                  <p className="text-sm font-medium text-foreground">Curriculum being finalized</p>
                  <p className="text-xs text-muted-foreground max-w-md mx-auto">
                    The Faculty Council is finalizing the course sequence for this program. Published modules and course mappings will appear here once the academic year is approved.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Program Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-sm text-muted-foreground">Faculty</p>
                <p className="font-medium">{(program as any).faculty}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Level</p>
                <p className="font-medium">{(program as any).level}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Status</p>
                <Badge variant={(program as any).is_enrolled ? "default" : "secondary"}>
                  {(program as any).is_enrolled ? "Enrolled" : "Not Enrolled"}
                </Badge>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </PageTemplate>
  );
}
