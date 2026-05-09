import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useInstitution } from "@/contexts/InstitutionContext";
import { PageTemplate } from "@/components/layout/PageTemplate";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import { BookOpen, Users, FileText, BarChart, CheckCircle, Clock } from "lucide-react";
import { FacultyStudentRoster } from "@/components/faculty/FacultyStudentRoster";

console.info("✝️ Faculty Admin — Christ governs teaching");

export default function FacultyAdmin() {
  const { user } = useAuth();
  const { activeInstitution } = useInstitution();
  const queryClient = useQueryClient();

  const { data: courses } = useQuery({
    queryKey: ["faculty-courses", user?.id, activeInstitution?.id],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("courses")
        .select("*")
        .eq("institution_id", activeInstitution!.id);
      
      if (error) throw error;
      return data;
    },
    enabled: !!user && !!activeInstitution,
  });

  const { data: submissions } = useQuery({
    queryKey: ["pending-submissions", activeInstitution?.id],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("submissions")
        .select(`
          *,
          assignments(title, course_id),
          profiles:user_id(email)
        `)
        .eq("status", "submitted");
      
      if (error) throw error;
      return data;
    },
    enabled: !!activeInstitution,
  });

  const { data: stats } = useQuery({
    queryKey: ["faculty-stats", activeInstitution?.id],
    queryFn: async () => {
      const [courses, enrollments, assignments, submissions] = await Promise.all([
        supabase.from("courses").select("id", { count: "exact", head: true }).eq("institution_id", activeInstitution!.id),
        supabase.from("enrollments").select("id", { count: "exact", head: true }).eq("institution_id", activeInstitution!.id),
        supabase.from("assignments").select("id", { count: "exact", head: true }).eq("institution_id", activeInstitution!.id),
        supabase.from("submissions").select("id", { count: "exact", head: true }).eq("status", "submitted"),
      ]);

      return {
        courses: courses.count || 0,
        enrollments: enrollments.count || 0,
        assignments: assignments.count || 0,
        pendingGrading: submissions.count || 0,
      };
    },
    enabled: !!activeInstitution,
  });

  const gradeSubmission = useMutation({
    mutationFn: async ({ submissionId, score }: { submissionId: string; score: number }) => {
      const { error: gradeError } = await supabase
        .from("grades")
        .insert({
          submission_id: submissionId,
          score,
          grader_user_id: user!.id,
          graded_at: new Date().toISOString(),
        });

      if (gradeError) throw gradeError;

      const { error: updateError } = await supabase
        .from("submissions")
        .update({ status: "graded" })
        .eq("id", submissionId);

      if (updateError) throw updateError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pending-submissions"] });
      queryClient.invalidateQueries({ queryKey: ["faculty-stats"] });
      toast({ title: "✅ Submission graded!" });
    },
  });

  return (
    <PageTemplate title="Faculty Admin" description="Manage your courses and students">
      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="courses">My Courses</TabsTrigger>
          <TabsTrigger value="grading">Grading Queue</TabsTrigger>
          <TabsTrigger value="students">Students</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">My Courses</CardTitle>
                <BookOpen className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats?.courses || 0}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Students</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats?.enrollments || 0}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Active Assignments</CardTitle>
                <FileText className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats?.assignments || 0}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Pending Grading</CardTitle>
                <Clock className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats?.pendingGrading || 0}</div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Courses Tab */}
        <TabsContent value="courses" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>My Courses</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {courses?.map((course: any) => (
                  <div key={course.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div>
                      <h3 className="font-semibold">{course.title}</h3>
                      <p className="text-sm text-muted-foreground">{course.description}</p>
                    </div>
                    <Button variant="outline" size="sm" disabled title="Launching with the next release">
                      Manage Course
                    </Button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Grading Tab */}
        <TabsContent value="grading" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Grading Queue</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {submissions?.map((submission: any) => (
                  <div key={submission.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div>
                      <h4 className="font-semibold">{submission.assignments?.title}</h4>
                      <p className="text-sm text-muted-foreground">
                        Student: {submission.profiles?.email}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Submitted: {new Date(submission.submitted_at).toLocaleDateString()}
                      </p>
                    </div>
                    <Button
                      size="sm"
                      onClick={() => gradeSubmission.mutate({ submissionId: submission.id, score: 85 })}
                    >
                      <CheckCircle className="mr-2 h-4 w-4" />
                      Quick Grade
                    </Button>
                  </div>
                ))}
                {!submissions?.length && (
                  <p className="text-center text-muted-foreground py-8">No submissions to grade</p>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Students Tab */}
        <TabsContent value="students" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Student Roster</CardTitle>
            </CardHeader>
            <CardContent>
              <FacultyStudentRoster institutionId={activeInstitution?.id} />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </PageTemplate>
  );
}
