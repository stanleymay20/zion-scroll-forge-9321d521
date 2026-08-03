/**
 * Grouped academic catalog — Browse by Faculty / Degree / Level / Career Track.
 * Pulls existing courses (no reseed) and groups them client-side.
 * Filters: faculty, level, credential type, access status (preview / enrolled / locked).
 */
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Logo } from "@/components/brand/Logo";
import {
  BookOpen,
  CheckCircle2,
  Clock,
  GraduationCap,
  Lock,
  Search,
  Target,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { getAcademicCourseProfile } from "@/lib/academicRigor";

type AccessState = "preview" | "enrolled" | "locked";

interface Course {
  id: string;
  title: string;
  description: string | null;
  faculty: string | null;
  faculty_id: string | null;
  level: string | null;
  visibility: string | null;
  credit_hours: number | null;
  estimated_duration_hours: number | null;
  duration: string | null;
  career_track: string[] | null;
  thumbnail_url: string | null;
  credential_type?: string | null;
}

const LEVEL_ORDER = ["foundation", "intermediate", "advanced", "capstone"];
const levelRank = (level: string) => {
  const index = LEVEL_ORDER.indexOf(level);
  return index === -1 ? LEVEL_ORDER.length : index;
};

function computeAccessState(
  course: Course,
  enrolledIds: Set<string>,
  signedIn: boolean
): AccessState {
  if (enrolledIds.has(course.id)) return "enrolled";
  const v = (course.visibility || "public_preview").toLowerCase();
  if (v === "public_preview") return "preview";
  if (!signedIn) return "locked";
  // Authenticated but not enrolled and course is enrolled-only/role-only/admin-only
  if (v === "enrolled_only") return "preview"; // can still preview overview
  return "locked";
}

function AccessBadge({ state }: { state: AccessState }) {
  if (state === "enrolled")
    return (
      <Badge className="shrink-0 bg-emerald-100 text-emerald-900 border border-emerald-200">
        <CheckCircle2 className="h-3 w-3 mr-1" /> Enrolled
      </Badge>
    );
  if (state === "preview")
    return (
      <Badge variant="outline" className="shrink-0">
        <BookOpen className="h-3 w-3 mr-1" /> Preview
      </Badge>
    );
  return (
    <Badge variant="secondary" className="shrink-0">
      <Lock className="h-3 w-3 mr-1" /> Locked
    </Badge>
  );
}

function CourseCard({
  c,
  state,
  programName,
}: {
  c: Course;
  state: AccessState;
  programName?: string;
}) {
  const profile = getAcademicCourseProfile(c);
  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <CardTitle className="font-serif text-lg leading-tight">
            {c.title}
          </CardTitle>
          <AccessBadge state={state} />
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {c.description && (
          <p className="text-sm text-muted-foreground line-clamp-2">
            {c.description}
          </p>
        )}
        <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
          {c.faculty && (
            <span className="flex items-center gap-1">
              <GraduationCap className="h-3 w-3" /> {c.faculty}
            </span>
          )}
          {programName && (
            <span className="flex items-center gap-1">
              · {programName}
            </span>
          )}
          {c.level && (
            <Badge variant="secondary" className="text-[10px]">
              {c.level}
            </Badge>
          )}
          {c.credential_type && (
            <Badge variant="outline" className="text-[10px]">
              {c.credential_type}
            </Badge>
          )}
          {(c.estimated_duration_hours || c.duration) && (
            <span className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {c.estimated_duration_hours
                ? `${c.estimated_duration_hours}h`
                : c.duration}
            </span>
          )}
          {c.credit_hours ? <span>{c.credit_hours} cr</span> : null}
        </div>
        <div className="rounded-md border bg-muted/30 p-3 text-xs space-y-2">
          <div className="font-medium text-foreground flex items-center gap-1">
            <Target className="h-3.5 w-3.5 text-primary" />
            Course contract
          </div>
          <div className="grid grid-cols-2 gap-2 text-muted-foreground">
            <span>{profile.credits}</span>
            <span>{profile.workload}</span>
            <span>{profile.duration}</span>
            <span>{profile.assessmentModel[3]}</span>
          </div>
        </div>
        <div className="flex gap-2 pt-1">
          <Button asChild size="sm" variant="outline" className="flex-1">
            <Link to={`/course/${c.id}/preview`}>
              <BookOpen className="h-3 w-3 mr-1" /> Preview
            </Link>
          </Button>
          <Button asChild size="sm" className="flex-1">
            <Link to={state === "enrolled" ? `/courses/${c.id}/learn` : `/courses/${c.id}`}>
              {state === "enrolled" ? "Continue" : state === "locked" ? "Apply" : "Enroll"}
            </Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function Group({
  title,
  courses,
  enrolledIds,
  signedIn,
  programNameById,
}: {
  title: string;
  courses: Course[];
  enrolledIds: Set<string>;
  signedIn: boolean;
  programNameById?: Map<string, string>;
}) {
  if (courses.length === 0) return null;
  return (
    <section className="space-y-3">
      <div className="flex items-baseline justify-between">
        <h2 className="font-serif text-2xl">{title}</h2>
        <span className="text-xs text-muted-foreground">
          {courses.length} course{courses.length === 1 ? "" : "s"}
        </span>
      </div>
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {courses.map((c) => (
          <CourseCard
            key={c.id}
            c={c}
            state={computeAccessState(c, enrolledIds, signedIn)}
            programName={programNameById?.get(c.id)}
          />
        ))}
      </div>
    </section>
  );
}

export default function AcademicCatalog() {
  const { user } = useAuth();
  const signedIn = !!user;
  const [courses, setCourses] = useState<Course[]>([]);
  const [programs, setPrograms] = useState<any[]>([]);
  const [programLinks, setProgramLinks] = useState<any[]>([]);
  const [enrolledIds, setEnrolledIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [tab, setTab] = useState("faculty");

  // Filters
  const [facultyFilter, setFacultyFilter] = useState<string>("all");
  const [levelFilter, setLevelFilter] = useState<string>("all");
  const [credentialFilter, setCredentialFilter] = useState<string>("all");
  const [accessFilter, setAccessFilter] = useState<string>("all");

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      const [{ data: cs }, { data: ps }, { data: pls }] = await Promise.all([
        supabase
          .from("courses")
          .select(
            "id,title,description,faculty,faculty_id,level,visibility,credit_hours,estimated_duration_hours,duration,career_track,thumbnail_url"
          )
          .order("title"),
        supabase.from("degree_programs").select("id,title,faculty"),
        supabase
          .from("degree_program_courses" as any)
          .select("degree_program_id,course_id"),
      ]);
      if (cancelled) return;
      setCourses((cs as Course[]) ?? []);
      setPrograms(ps ?? []);
      setProgramLinks(pls ?? []);

      if (user) {
        const { data: en } = await supabase
          .from("enrollments")
          .select("course_id")
          .eq("user_id", user.id);
        if (!cancelled)
          setEnrolledIds(new Set((en ?? []).map((e: any) => e.course_id)));
      }
      setLoading(false);
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [user?.id]);

  const facultyOptions = useMemo(
    () =>
      Array.from(new Set(courses.map((c) => c.faculty).filter(Boolean))) as string[],
    [courses]
  );
  const levelOptions = useMemo(
    () =>
      Array.from(new Set(courses.map((c) => c.level).filter(Boolean))) as string[],
    [courses]
  );
  const credentialOptions = useMemo(
    () =>
      Array.from(
        new Set(courses.map((c) => c.credential_type).filter(Boolean))
      ) as string[],
    [courses]
  );

  const programNameByCourseId = useMemo(() => {
    const m = new Map<string, string>();
    const programById = new Map(programs.map((p) => [p.id, p.title as string]));
    programLinks.forEach((l: any) => {
      const name = programById.get(l.degree_program_id);
      if (name && !m.has(l.course_id)) m.set(l.course_id, name);
    });
    return m;
  }, [programs, programLinks]);

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return courses.filter((c) => {
      if (needle) {
        const hay =
          c.title.toLowerCase() +
          " " +
          (c.faculty || "").toLowerCase() +
          " " +
          (c.description || "").toLowerCase();
        if (!hay.includes(needle)) return false;
      }
      if (facultyFilter !== "all" && c.faculty !== facultyFilter) return false;
      if (levelFilter !== "all" && c.level !== levelFilter) return false;
      if (
        credentialFilter !== "all" &&
        (c.credential_type || "") !== credentialFilter
      )
        return false;
      if (accessFilter !== "all") {
        const state = computeAccessState(c, enrolledIds, signedIn);
        if (state !== accessFilter) return false;
      }
      return true;
    });
  }, [
    courses,
    q,
    facultyFilter,
    levelFilter,
    credentialFilter,
    accessFilter,
    enrolledIds,
    signedIn,
  ]);

  const byFaculty = useMemo(() => {
    const map = new Map<string, Course[]>();
    filtered.forEach((c) => {
      const k = c.faculty || "Unassigned faculty";
      if (!map.has(k)) map.set(k, []);
      map.get(k)!.push(c);
    });
    return Array.from(map.entries()).sort(([a], [b]) => a.localeCompare(b));
  }, [filtered]);

  const byLevel = useMemo(() => {
    const map = new Map<string, Course[]>();
    filtered.forEach((c) => {
      const k = (c.level || "unspecified").toLowerCase();
      if (!map.has(k)) map.set(k, []);
      map.get(k)!.push(c);
    });
    return Array.from(map.entries()).sort(
      ([a], [b]) => levelRank(a) - levelRank(b)
    );
  }, [filtered]);

  const byTrack = useMemo(() => {
    const map = new Map<string, Course[]>();
    filtered.forEach((c) => {
      const tracks =
        c.career_track && c.career_track.length > 0 ? c.career_track : ["General"];
      tracks.forEach((t) => {
        if (!map.has(t)) map.set(t, []);
        map.get(t)!.push(c);
      });
    });
    return Array.from(map.entries()).sort(([a], [b]) => a.localeCompare(b));
  }, [filtered]);

  const byProgram = useMemo(() => {
    const courseById = new Map(filtered.map((c) => [c.id, c]));
    return programs
      .map((p) => {
        const ids = programLinks
          .filter((l) => l.degree_program_id === p.id)
          .map((l) => l.course_id);
        const list = ids
          .map((id) => courseById.get(id))
          .filter(Boolean) as Course[];
        return { program: p, list };
      })
      .filter((g) => g.list.length > 0);
  }, [programs, programLinks, filtered]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-ivory to-background">
      <header className="border-b bg-background/80 backdrop-blur sticky top-0 z-10">
        <div className="container mx-auto px-4 py-3 flex items-center justify-between">
          <Logo size="sm" to="/" />
          <div className="flex gap-2">
            <Button variant="ghost" asChild>
              <Link to="/degrees">Degrees</Link>
            </Button>
            <Button variant="ghost" asChild>
              <Link to="/faculties">Faculties</Link>
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 space-y-6">
        <div className="space-y-2">
          <h1 className="font-serif text-4xl">Academic Catalog</h1>
          <p className="text-muted-foreground">
            Browse courses across the 12 Supreme Scroll Faculties. Each course is framed as a university learning contract with outcomes, workload, assessment evidence, and a path to credentialed mastery.
          </p>
        </div>

        <div className="grid md:grid-cols-4 gap-3">
          {["Outcomes first", "Assessment evidence", "Guided weekly cadence", "Credential record"].map((standard) => (
            <Card key={standard} className="bg-card/70">
              <CardContent className="p-3 text-sm font-medium flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-primary" />
                {standard}
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="space-y-3">
          <div className="relative max-w-xl">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search courses, faculties, topics…"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              className="pl-9"
            />
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            <Select value={facultyFilter} onValueChange={setFacultyFilter}>
              <SelectTrigger><SelectValue placeholder="Faculty" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All faculties</SelectItem>
                {facultyOptions.map((f) => (
                  <SelectItem key={f} value={f}>{f}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={levelFilter} onValueChange={setLevelFilter}>
              <SelectTrigger><SelectValue placeholder="Level" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All levels</SelectItem>
                {levelOptions.map((l) => (
                  <SelectItem key={l} value={l}>{l}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={credentialFilter} onValueChange={setCredentialFilter}>
              <SelectTrigger><SelectValue placeholder="Credential" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All credentials</SelectItem>
                {credentialOptions.map((c) => (
                  <SelectItem key={c} value={c}>{c}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={accessFilter} onValueChange={setAccessFilter}>
              <SelectTrigger><SelectValue placeholder="Access" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Any access</SelectItem>
                <SelectItem value="enrolled">Enrolled</SelectItem>
                <SelectItem value="preview">Preview</SelectItem>
                <SelectItem value="locked">Locked</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <Tabs value={tab} onValueChange={setTab}>
          <TabsList className="flex-wrap h-auto">
            <TabsTrigger value="faculty">By Faculty</TabsTrigger>
            <TabsTrigger value="program">By Degree Program</TabsTrigger>
            <TabsTrigger value="level">By Level</TabsTrigger>
            <TabsTrigger value="track">By Career Track</TabsTrigger>
          </TabsList>

          {loading && (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 mt-6">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-48" />
              ))}
            </div>
          )}

          {!loading && filtered.length === 0 && (
            <p className="text-muted-foreground py-10">
              No courses match your filters.
            </p>
          )}

          {!loading && filtered.length > 0 && (
            <>
              <TabsContent value="faculty" className="space-y-8 mt-6">
                {byFaculty.map(([name, list]) => (
                  <Group
                    key={name}
                    title={name}
                    courses={list}
                    enrolledIds={enrolledIds}
                    signedIn={signedIn}
                    programNameById={programNameByCourseId}
                  />
                ))}
              </TabsContent>
              <TabsContent value="program" className="space-y-8 mt-6">
                {byProgram.length === 0 && (
                  <p className="text-muted-foreground">
                    No degree programs are linked to courses yet.
                  </p>
                )}
                {byProgram.map(({ program, list }) => (
                  <Group
                    key={program.id}
                    title={program.title}
                    courses={list}
                    enrolledIds={enrolledIds}
                    signedIn={signedIn}
                  />
                ))}
              </TabsContent>
              <TabsContent value="level" className="space-y-8 mt-6">
                {byLevel.map(([name, list]) => (
                  <Group
                    key={name}
                    title={name.charAt(0).toUpperCase() + name.slice(1)}
                    courses={list}
                    enrolledIds={enrolledIds}
                    signedIn={signedIn}
                    programNameById={programNameByCourseId}
                  />
                ))}
              </TabsContent>
              <TabsContent value="track" className="space-y-8 mt-6">
                {byTrack.map(([name, list]) => (
                  <Group
                    key={name}
                    title={name}
                    courses={list}
                    enrolledIds={enrolledIds}
                    signedIn={signedIn}
                    programNameById={programNameByCourseId}
                  />
                ))}
              </TabsContent>
            </>
          )}
        </Tabs>
      </main>
    </div>
  );
}
