import { useEffect, useMemo, useState } from "react";
import { Helmet } from "react-helmet";
import { Link, useSearchParams } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { getAcademicCourseProfile } from "@/lib/academicRigor";
import {
  ArrowRight,
  BookOpen,
  CheckCircle2,
  Clock,
  GraduationCap,
  Layers3,
  Lock,
  Search,
  ShieldCheck,
  Target,
} from "lucide-react";

type AccessState = "preview" | "enrolled" | "locked";

type Course = {
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
};

type DegreeProgram = {
  id: string;
  title: string;
  faculty: string | null;
};

type DegreeProgramCourse = {
  degree_program_id: string;
  course_id: string;
};

const LEVEL_ORDER = ["foundation", "intermediate", "advanced", "capstone"];

const levelRank = (level: string) => {
  const index = LEVEL_ORDER.indexOf(level.toLowerCase());
  return index === -1 ? LEVEL_ORDER.length : index;
};

function computeAccessState(course: Course, enrolledIds: Set<string>, signedIn: boolean): AccessState {
  if (enrolledIds.has(course.id)) return "enrolled";

  const visibility = (course.visibility || "public_preview").toLowerCase();
  if (visibility === "public_preview") return "preview";
  if (!signedIn) return "locked";
  if (visibility === "enrolled_only") return "preview";
  return "locked";
}

function AccessBadge({ state }: { state: AccessState }) {
  if (state === "enrolled") {
    return (
      <Badge variant="outline" className="rounded-full border-primary/25 bg-primary/5 text-primary">
        <CheckCircle2 className="mr-1 h-3 w-3" />
        Enrolled
      </Badge>
    );
  }

  if (state === "preview") {
    return (
      <Badge variant="outline" className="rounded-full">
        <BookOpen className="mr-1 h-3 w-3" />
        Preview
      </Badge>
    );
  }

  return (
    <Badge variant="secondary" className="rounded-full">
      <Lock className="mr-1 h-3 w-3" />
      Sign in required
    </Badge>
  );
}

function CourseCard({
  course,
  state,
  programName,
}: {
  course: Course;
  state: AccessState;
  programName?: string;
}) {
  const profile = getAcademicCourseProfile(course);
  const destination = state === "enrolled" ? `/courses/${course.id}/learn` : `/courses/${course.id}`;

  return (
    <article className="flex h-full flex-col rounded-[1.4rem] border border-border/60 bg-card p-5 shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:border-primary/20 hover:shadow-md sm:p-6">
      <div className="mb-5 flex items-start justify-between gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/8">
          <BookOpen className="h-5 w-5 text-primary" />
        </div>
        <AccessBadge state={state} />
      </div>

      <div className="flex-1">
        <div className="mb-2 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
          {course.faculty ? <span>{course.faculty.replace("Scroll ", "")}</span> : null}
          {course.level ? <Badge variant="secondary" className="rounded-full text-[10px]">{course.level}</Badge> : null}
        </div>

        <h3 className="font-serif text-xl font-semibold leading-snug text-foreground">{course.title}</h3>
        {course.description ? (
          <p className="mt-3 line-clamp-3 text-sm leading-6 text-muted-foreground">{course.description}</p>
        ) : null}

        {programName ? (
          <p className="mt-4 text-xs font-medium text-primary">Part of {programName}</p>
        ) : null}

        <div className="mt-5 grid grid-cols-2 gap-2 rounded-xl border border-border/60 bg-secondary/25 p-3 text-xs text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <Target className="h-3.5 w-3.5 text-primary" />
            {profile.credits}
          </span>
          <span className="flex items-center gap-1.5">
            <Clock className="h-3.5 w-3.5 text-primary" />
            {profile.workload}
          </span>
          <span className="col-span-2">{profile.duration}</span>
        </div>
      </div>

      <div className="mt-5 flex gap-2 border-t border-border/60 pt-4">
        <Button asChild size="sm" variant="outline" className="flex-1 rounded-full">
          <Link to={`/course/${course.id}/preview`}>Preview</Link>
        </Button>
        <Button asChild size="sm" className="flex-1 rounded-full">
          <Link to={destination}>
            {state === "enrolled" ? "Continue" : "Course details"}
          </Link>
        </Button>
      </div>
    </article>
  );
}

function CourseGroup({
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
    <section className="space-y-4">
      <div className="flex items-end justify-between gap-4 border-b border-border/60 pb-3">
        <h2 className="font-serif text-2xl font-semibold text-foreground">{title}</h2>
        <span className="text-xs text-muted-foreground">
          {courses.length} {courses.length === 1 ? "course" : "courses"}
        </span>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {courses.map((course) => (
          <CourseCard
            key={course.id}
            course={course}
            state={computeAccessState(course, enrolledIds, signedIn)}
            programName={programNameById?.get(course.id)}
          />
        ))}
      </div>
    </section>
  );
}

export default function AcademicCatalog() {
  const { user } = useAuth();
  const signedIn = Boolean(user);
  const [searchParams, setSearchParams] = useSearchParams();
  const requestedFaculty = searchParams.get("faculty") || "all";

  const [courses, setCourses] = useState<Course[]>([]);
  const [programs, setPrograms] = useState<DegreeProgram[]>([]);
  const [programLinks, setProgramLinks] = useState<DegreeProgramCourse[]>([]);
  const [enrolledIds, setEnrolledIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [query, setQuery] = useState("");
  const [facultyFilter, setFacultyFilter] = useState(requestedFaculty);
  const [levelFilter, setLevelFilter] = useState("all");
  const [accessFilter, setAccessFilter] = useState("all");

  useEffect(() => {
    setFacultyFilter(requestedFaculty);
  }, [requestedFaculty]);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setLoadError(false);

      const [{ data: courseRows, error: courseError }, { data: programRows }, { data: linkRows }] = await Promise.all([
        supabase
          .from("courses")
          .select(
            "id,title,description,faculty,faculty_id,level,visibility,credit_hours,estimated_duration_hours,duration,career_track,thumbnail_url"
          )
          .order("title"),
        supabase.from("degree_programs").select("id,title,faculty"),
        supabase.from("degree_program_courses" as any).select("degree_program_id,course_id"),
      ]);

      if (cancelled) return;

      if (courseError) {
        setLoadError(true);
        setCourses([]);
      } else {
        setCourses((courseRows as Course[]) ?? []);
      }

      setPrograms((programRows as DegreeProgram[]) ?? []);
      setProgramLinks((linkRows as unknown as DegreeProgramCourse[]) ?? []);

      if (user) {
        const { data: enrollments } = await supabase
          .from("enrollments")
          .select("course_id")
          .eq("user_id", user.id);

        if (!cancelled) {
          setEnrolledIds(new Set((enrollments ?? []).map((entry: any) => entry.course_id)));
        }
      } else {
        setEnrolledIds(new Set());
      }

      if (!cancelled) setLoading(false);
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [user?.id]);

  const facultyOptions = useMemo(
    () => Array.from(new Set(courses.map((course) => course.faculty).filter(Boolean))) as string[],
    [courses]
  );

  const levelOptions = useMemo(
    () => Array.from(new Set(courses.map((course) => course.level).filter(Boolean))) as string[],
    [courses]
  );

  const programNameByCourseId = useMemo(() => {
    const programById = new Map(programs.map((program) => [program.id, program.title]));
    const result = new Map<string, string>();

    programLinks.forEach((link) => {
      const programName = programById.get(link.degree_program_id);
      if (programName && !result.has(link.course_id)) result.set(link.course_id, programName);
    });

    return result;
  }, [programLinks, programs]);

  const filteredCourses = useMemo(() => {
    const needle = query.trim().toLowerCase();

    return courses.filter((course) => {
      if (needle) {
        const searchable = [course.title, course.description, course.faculty, ...(course.career_track ?? [])]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        if (!searchable.includes(needle)) return false;
      }

      if (facultyFilter !== "all" && course.faculty !== facultyFilter) return false;
      if (levelFilter !== "all" && course.level !== levelFilter) return false;

      if (accessFilter !== "all") {
        const access = computeAccessState(course, enrolledIds, signedIn);
        if (access !== accessFilter) return false;
      }

      return true;
    });
  }, [accessFilter, courses, enrolledIds, facultyFilter, levelFilter, query, signedIn]);

  const byFaculty = useMemo(() => {
    const groups = new Map<string, Course[]>();
    filteredCourses.forEach((course) => {
      const key = course.faculty || "Other academic areas";
      groups.set(key, [...(groups.get(key) ?? []), course]);
    });
    return Array.from(groups.entries()).sort(([a], [b]) => a.localeCompare(b));
  }, [filteredCourses]);

  const byLevel = useMemo(() => {
    const groups = new Map<string, Course[]>();
    filteredCourses.forEach((course) => {
      const key = course.level || "Unspecified level";
      groups.set(key, [...(groups.get(key) ?? []), course]);
    });
    return Array.from(groups.entries()).sort(([a], [b]) => levelRank(a) - levelRank(b));
  }, [filteredCourses]);

  const byTrack = useMemo(() => {
    const groups = new Map<string, Course[]>();
    filteredCourses.forEach((course) => {
      const tracks = course.career_track?.length ? course.career_track : ["General pathway"];
      tracks.forEach((track) => groups.set(track, [...(groups.get(track) ?? []), course]));
    });
    return Array.from(groups.entries()).sort(([a], [b]) => a.localeCompare(b));
  }, [filteredCourses]);

  const byProgram = useMemo(() => {
    const courseById = new Map(filteredCourses.map((course) => [course.id, course]));

    return programs
      .map((program) => {
        const linkedCourses = programLinks
          .filter((link) => link.degree_program_id === program.id)
          .map((link) => courseById.get(link.course_id))
          .filter(Boolean) as Course[];
        return { program, courses: linkedCourses };
      })
      .filter((group) => group.courses.length > 0);
  }, [filteredCourses, programLinks, programs]);

  const handleFacultyChange = (value: string) => {
    setFacultyFilter(value);
    const next = new URLSearchParams(searchParams);
    if (value === "all") next.delete("faculty");
    else next.set("faculty", value);
    setSearchParams(next, { replace: true });
  };

  const clearFilters = () => {
    setQuery("");
    setFacultyFilter("all");
    setLevelFilter("all");
    setAccessFilter("all");
    const next = new URLSearchParams(searchParams);
    next.delete("faculty");
    setSearchParams(next, { replace: true });
  };

  return (
    <>
      <Helmet>
        <title>Course Catalogue | ScrollUniversity</title>
        <meta
          name="description"
          content="Browse ScrollUniversity courses by faculty, programme, level and career pathway using live catalogue records."
        />
        <link rel="canonical" href="https://scrolluniversity.org/catalog" />
      </Helmet>

      <div className="space-y-10 pb-12">
        <section className="-mx-4 rounded-[2rem] border border-border/50 bg-secondary/30 px-5 py-10 sm:-mx-6 sm:px-8 sm:py-12">
          <div className="max-w-3xl">
            <p className="mb-3 text-xs font-semibold uppercase tracking-[0.22em] text-accent">Academic catalogue</p>
            <h1 className="font-serif text-4xl font-semibold leading-tight text-foreground sm:text-5xl">
              Find a course by subject, programme, level or direction.
            </h1>
            <p className="mt-5 max-w-2xl text-base leading-7 text-muted-foreground sm:text-lg">
              This catalogue is drawn from current course records. Course availability, programme status and accreditation claims are disclosed separately so learners can distinguish what exists from what is formally recognized.
            </p>
          </div>

          <div className="mt-8 flex flex-wrap gap-3">
            <Button asChild variant="outline" className="rounded-full bg-background/70">
              <Link to="/degrees">
                <GraduationCap className="mr-2 h-4 w-4" />
                Browse programmes
              </Link>
            </Button>
            <Button asChild variant="outline" className="rounded-full bg-background/70">
              <Link to="/academic-trust">
                <ShieldCheck className="mr-2 h-4 w-4" />
                Academic trust
              </Link>
            </Button>
            <Button asChild variant="ghost" className="rounded-full">
              <Link to="/accreditation-status">Accreditation status <ArrowRight className="ml-2 h-4 w-4" /></Link>
            </Button>
          </div>
        </section>

        <section>
          <div className="rounded-[1.5rem] border border-border/60 bg-card p-4 shadow-sm sm:p-5">
            <div className="grid gap-3 lg:grid-cols-[1.6fr_1fr_1fr_1fr]">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Search courses, subjects or career pathways"
                  className="h-11 rounded-xl pl-9"
                />
              </div>

              <Select value={facultyFilter} onValueChange={handleFacultyChange}>
                <SelectTrigger className="h-11 rounded-xl">
                  <SelectValue placeholder="Faculty" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All faculties</SelectItem>
                  {facultyOptions.map((faculty) => (
                    <SelectItem key={faculty} value={faculty}>{faculty.replace("Scroll ", "")}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={levelFilter} onValueChange={setLevelFilter}>
                <SelectTrigger className="h-11 rounded-xl">
                  <SelectValue placeholder="Level" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All levels</SelectItem>
                  {levelOptions.map((level) => (
                    <SelectItem key={level} value={level}>{level}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={accessFilter} onValueChange={setAccessFilter}>
                <SelectTrigger className="h-11 rounded-xl">
                  <SelectValue placeholder="Access" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All access states</SelectItem>
                  <SelectItem value="preview">Preview available</SelectItem>
                  <SelectItem value="enrolled">Enrolled</SelectItem>
                  <SelectItem value="locked">Sign in required</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-border/60 pt-4 text-sm text-muted-foreground">
              <span>{loading ? "Loading catalogue…" : `${filteredCourses.length} matching ${filteredCourses.length === 1 ? "course" : "courses"}`}</span>
              {(query || facultyFilter !== "all" || levelFilter !== "all" || accessFilter !== "all") ? (
                <Button variant="ghost" size="sm" onClick={clearFilters} className="rounded-full">Clear filters</Button>
              ) : null}
            </div>
          </div>

          {loadError ? (
            <Card className="mt-8 border-destructive/20">
              <CardContent className="py-10 text-center">
                <p className="font-medium text-foreground">The catalogue could not be loaded.</p>
                <p className="mt-2 text-sm text-muted-foreground">No course totals are being inferred while live records are unavailable.</p>
              </CardContent>
            </Card>
          ) : loading ? (
            <div className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {Array.from({ length: 6 }).map((_, index) => (
                <Skeleton key={index} className="h-[330px] rounded-[1.4rem]" />
              ))}
            </div>
          ) : filteredCourses.length === 0 ? (
            <Card className="mt-8">
              <CardContent className="py-12 text-center">
                <Layers3 className="mx-auto h-10 w-10 text-muted-foreground/40" />
                <p className="mt-4 font-medium text-foreground">No courses match these filters.</p>
                <Button variant="link" onClick={clearFilters}>Reset the catalogue</Button>
              </CardContent>
            </Card>
          ) : (
            <Tabs defaultValue="faculty" className="mt-10">
              <TabsList className="h-auto w-full justify-start gap-1 overflow-x-auto rounded-xl bg-secondary/50 p-1 sm:w-auto">
                <TabsTrigger value="faculty" className="rounded-lg">Faculty</TabsTrigger>
                <TabsTrigger value="programme" className="rounded-lg">Programme</TabsTrigger>
                <TabsTrigger value="level" className="rounded-lg">Level</TabsTrigger>
                <TabsTrigger value="career" className="rounded-lg">Career pathway</TabsTrigger>
              </TabsList>

              <TabsContent value="faculty" className="mt-8 space-y-12">
                {byFaculty.map(([faculty, groupedCourses]) => (
                  <CourseGroup
                    key={faculty}
                    title={faculty.replace("Scroll ", "")}
                    courses={groupedCourses}
                    enrolledIds={enrolledIds}
                    signedIn={signedIn}
                    programNameById={programNameByCourseId}
                  />
                ))}
              </TabsContent>

              <TabsContent value="programme" className="mt-8 space-y-12">
                {byProgram.length > 0 ? byProgram.map(({ program, courses: groupedCourses }) => (
                  <CourseGroup
                    key={program.id}
                    title={program.title}
                    courses={groupedCourses}
                    enrolledIds={enrolledIds}
                    signedIn={signedIn}
                  />
                )) : (
                  <p className="text-sm text-muted-foreground">No programme-linked courses match the current filters.</p>
                )}
              </TabsContent>

              <TabsContent value="level" className="mt-8 space-y-12">
                {byLevel.map(([level, groupedCourses]) => (
                  <CourseGroup
                    key={level}
                    title={level}
                    courses={groupedCourses}
                    enrolledIds={enrolledIds}
                    signedIn={signedIn}
                    programNameById={programNameByCourseId}
                  />
                ))}
              </TabsContent>

              <TabsContent value="career" className="mt-8 space-y-12">
                {byTrack.map(([track, groupedCourses]) => (
                  <CourseGroup
                    key={track}
                    title={track}
                    courses={groupedCourses}
                    enrolledIds={enrolledIds}
                    signedIn={signedIn}
                    programNameById={programNameByCourseId}
                  />
                ))}
              </TabsContent>
            </Tabs>
          )}
        </section>
      </div>
    </>
  );
}
