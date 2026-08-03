/**
 * Public course preview page — accessible to anonymous visitors and any logged-in user.
 * Shows: overview, syllabus headline, learning outcomes, instructor summary, admission CTA.
 * Locked content (full modules, assignments, quizzes) is intentionally NOT loaded here.
 */
import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Logo } from "@/components/brand/Logo";
import { Lock, ArrowRight, BookOpen, Clock, GraduationCap, ClipboardCheck, Target, Users } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useCourseAccess } from "@/hooks/useCourseAccess";
import { getAcademicCourseProfile } from "@/lib/academicRigor";

interface CourseRow {
  id: string;
  title: string;
  description: string | null;
  faculty: string | null;
  level: string | null;
  visibility: string | null;
  credit_hours: number | null;
  estimated_duration_hours: number | null;
  duration: string | null;
  learning_outcomes: any;
  thumbnail_url: string | null;
}

export default function CoursePreview() {
  const { courseId = "" } = useParams();
  const { user } = useAuth();
  const { access } = useCourseAccess(courseId);
  const [course, setCourse] = useState<CourseRow | null>(null);
  const [firstModule, setFirstModule] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      const { data: c } = await supabase
        .from("courses")
        .select(
          "id,title,description,faculty,level,visibility,credit_hours,estimated_duration_hours,duration,learning_outcomes,thumbnail_url"
        )
        .eq("id", courseId)
        .maybeSingle();
      if (cancelled) return;
      setCourse((c as CourseRow) ?? null);

      // Best-effort first module preview
      const { data: m } = await supabase
        .from("course_modules" as any)
        .select("id,title,description,order_index")
        .eq("course_id", courseId)
        .order("order_index", { ascending: true })
        .limit(1);
      if (!cancelled) setFirstModule(m?.[0] ?? null);
      setLoading(false);
    }
    if (courseId) load();
    return () => {
      cancelled = true;
    };
  }, [courseId]);

  if (loading) {
    return (
      <div className="container mx-auto py-10 px-4 max-w-4xl space-y-6">
        <Skeleton className="h-10 w-2/3" />
        <Skeleton className="h-40 w-full" />
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }

  if (!course) {
    return (
      <div className="container mx-auto py-20 text-center">
        <h1 className="text-2xl font-serif">Course not found</h1>
        <Button asChild className="mt-4"><Link to="/courses">Browse catalog</Link></Button>
      </div>
    );
  }

  const outcomes: string[] = Array.isArray(course.learning_outcomes)
    ? course.learning_outcomes
    : [];
  const profile = getAcademicCourseProfile(course, firstModule ? 1 : 0);

  return (
    <div className="min-h-screen bg-gradient-to-b from-ivory to-background">
      {/* Header */}
      <header className="border-b bg-background/80 backdrop-blur sticky top-0 z-10">
        <div className="container mx-auto px-4 py-3 flex items-center justify-between">
          <Logo size="sm" to="/" />
          <div className="flex gap-2">
            <Button variant="ghost" asChild><Link to="/courses">Catalog</Link></Button>
            {!user && <Button asChild><Link to="/auth/login">Sign in</Link></Button>}
          </div>
        </div>
      </header>

      <main className="container mx-auto py-10 px-4 max-w-4xl space-y-6">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <Badge variant="outline" className="mb-3">Course preview</Badge>
            <h1 className="font-serif text-4xl mb-2">{course.title}</h1>
            <div className="flex flex-wrap gap-2 text-sm text-muted-foreground">
              {course.faculty && <span className="flex items-center gap-1"><GraduationCap className="h-4 w-4" /> {course.faculty}</span>}
              {course.level && <Badge variant="secondary">{course.level}</Badge>}
              {(course.estimated_duration_hours || course.duration) && (
                <span className="flex items-center gap-1"><Clock className="h-4 w-4" /> {course.estimated_duration_hours ? `${course.estimated_duration_hours}h` : course.duration}</span>
              )}
              {course.credit_hours && <span>{course.credit_hours} credits</span>}
            </div>
          </div>
          <Card className="bg-burgundy text-ivory border-0 min-w-[260px]">
            <CardContent className="pt-6 space-y-3">
              <p className="text-sm opacity-90">
                {access?.access_level === "enrolled" || access?.access_level === "credit"
                  ? "You are enrolled in this course."
                  : "Enroll to unlock the full curriculum, AI tutor, and certificate."}
              </p>
              {access?.access_level === "enrolled" || access?.access_level === "credit" ? (
                <Button asChild variant="secondary" className="w-full">
                  <Link to={`/courses/${course.id}/learn`}>Continue learning</Link>
                </Button>
              ) : user ? (
                <Button asChild variant="secondary" className="w-full">
                  <Link to={`/courses/${course.id}`}>Enroll</Link>
                </Button>
              ) : (
                <>
                  <Button asChild variant="secondary" className="w-full">
                    <Link to="/apply">Apply for admission</Link>
                  </Button>
                  <Button asChild variant="ghost" className="w-full text-ivory hover:text-ivory">
                    <Link to="/auth/login">I already have an account</Link>
                  </Button>
                </>
              )}
            </CardContent>
          </Card>
        </div>

        {course.description && (
          <Card>
            <CardHeader><CardTitle className="font-serif">About this course</CardTitle></CardHeader>
            <CardContent className="prose prose-sm max-w-none">
              <p className="whitespace-pre-line">{course.description}</p>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle className="font-serif flex items-center gap-2">
              <ClipboardCheck className="h-5 w-5 text-primary" />
              University Learning Contract
            </CardTitle>
          </CardHeader>
          <CardContent className="grid sm:grid-cols-2 gap-4 text-sm">
            <div className="rounded-md border p-3">
              <div className="text-xs uppercase text-muted-foreground mb-1">Workload</div>
              <div className="font-medium">{profile.workload} over {profile.duration}</div>
            </div>
            <div className="rounded-md border p-3">
              <div className="text-xs uppercase text-muted-foreground mb-1">Credit</div>
              <div className="font-medium">{profile.credits}</div>
            </div>
            <div className="rounded-md border p-3">
              <div className="text-xs uppercase text-muted-foreground mb-1">Assessment</div>
              <div className="font-medium">{profile.assessmentModel.join(", ")}</div>
            </div>
            <div className="rounded-md border p-3">
              <div className="text-xs uppercase text-muted-foreground mb-1">Support</div>
              <div className="font-medium">{profile.supportModel.slice(0, 2).join(", ")}</div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="font-serif flex items-center gap-2"><Target className="h-5 w-5 text-primary" /> What you'll learn</CardTitle></CardHeader>
          <CardContent>
            <ul className="grid md:grid-cols-2 gap-2 text-sm">
              {(outcomes.length > 0 ? outcomes : profile.outcomes).map((o, i) => (
                <li key={i} className="flex gap-2"><ArrowRight className="h-4 w-4 text-primary mt-0.5" /> {o}</li>
              ))}
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="font-serif flex items-center gap-2"><Users className="h-5 w-5 text-primary" /> Weekly Scholarly Rhythm</CardTitle></CardHeader>
          <CardContent>
            <ol className="grid sm:grid-cols-2 gap-2 text-sm">
              {profile.weeklyCadence.map((item, i) => (
                <li key={item} className="flex gap-2">
                  <Badge variant="outline" className="h-5 w-5 justify-center rounded-full p-0 text-[10px]">{i + 1}</Badge>
                  <span>{item}</span>
                </li>
              ))}
            </ol>
          </CardContent>
        </Card>

        {firstModule && (
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="font-serif flex items-center gap-2">
                  <BookOpen className="h-5 w-5" /> Module 1 preview
                </CardTitle>
                <Badge variant="outline">Free preview</Badge>
              </div>
            </CardHeader>
            <CardContent>
              <h3 className="font-medium mb-2">{firstModule.title}</h3>
              {firstModule.description && (
                <p className="text-sm text-muted-foreground">{firstModule.description}</p>
              )}
            </CardContent>
          </Card>
        )}

        <Card className="border-dashed">
          <CardContent className="pt-6 flex items-center gap-3">
            <Lock className="h-5 w-5 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">
              Assignments, quizzes, the AI tutor, certificates, and remaining modules unlock once you enroll.
            </p>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
