import { useEffect, useMemo, useState } from "react";
import { Navigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Loader2, ShieldAlert } from "lucide-react";
import { toast } from "sonner";
import { useStudentLifecycleSnapshot } from "@/hooks/useStudentLifecycleSnapshot";
import {
  canonicalLifecycleRoutes,
  getRequiredStudentOnboardingRoute,
  getLifecycleStatusFallbackRoute,
} from "@/lib/studentLifecycle";

interface Section {
  id: string;
  term_id: string | null;
  term_label: string;
  course_code: string;
  course_title: string | null;
  section_code: string;
  seat_capacity: number;
  enrolled_count: number;
  waitlist_capacity: number;
  waitlist_count: number;
  meeting_info: string | null;
  credit_hours: number;
  active: boolean;
  section_status: string | null;
}
interface Enrollment { id: string; section_id: string; status: string; waitlist_position: number | null; }
interface RegistrationWindow { id: string; term_id: string; tier: string; open_at: string; close_at: string; max_credits: number; is_active: boolean; }

const REGISTRATION_ERRORS: Record<string, string> = {
  not_authenticated: "Sign in before registering.",
  section_not_found: "This section is no longer available.",
  section_inactive: "This section is not open for registration.",
  term_missing: "The section is not attached to a governed academic term.",
  term_not_open: "The academic term is not open for registration.",
  no_open_window: "There is no active registration window for this term.",
  no_active_degree_enrollment: "An active degree-program enrollment is required before registration.",
  already_enrolled_or_waitlisted: "You are already enrolled or waitlisted for this section.",
  academic_standing_blocked: "Your academic standing currently blocks registration.",
  missing_prerequisites: "Required prerequisites have not been completed.",
  credit_limit_exceeded: "This registration would exceed your permitted credit load.",
  timetable_conflict: "This section conflicts with another enrolled section.",
  section_and_waitlist_full: "The section and its waitlist are full.",
  past_withdrawal_deadline: "The withdrawal deadline has passed.",
  forbidden: "You are not authorised to change this registration.",
};

export default function CourseRegistration() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const lifecycle = useStudentLifecycleSnapshot();
  const [sections, setSections] = useState<Section[]>([]);
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [windows, setWindows] = useState<RegistrationWindow[]>([]);
  const [search, setSearch] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  const load = async () => {
    if (!user?.id) return;
    setLoadError(null);
    const [sectionRes, enrollmentRes, windowRes] = await Promise.all([
      supabase.from("course_sections" as any).select("*").eq("active", true).order("course_code"),
      supabase.from("section_enrollments" as any).select("id,section_id,status,waitlist_position").eq("student_user_id", user.id),
      supabase.from("registration_windows" as any).select("id,term_id,tier,open_at,close_at,max_credits,is_active").eq("is_active", true).order("open_at"),
    ]);
    const error = (sectionRes as any).error || (enrollmentRes as any).error || (windowRes as any).error;
    if (error) { setLoadError(error.message || "Registration data could not be verified."); return; }
    setSections(((sectionRes as any).data || []) as Section[]);
    setEnrollments(((enrollmentRes as any).data || []) as Enrollment[]);
    setWindows(((windowRes as any).data || []) as RegistrationWindow[]);
  };

  useEffect(() => { load(); }, [user?.id]);

  const openTermIds = useMemo(() => {
    const now = Date.now();
    return new Set(windows.filter((w) => w.is_active && new Date(w.open_at).getTime() <= now && new Date(w.close_at).getTime() >= now).map((w) => w.term_id));
  }, [windows]);

  const enrollmentFor = (sectionId: string) => enrollments.find((e) => e.section_id === sectionId && !["dropped", "withdrawn"].includes(e.status));

  const request = async (section: Section) => {
    setBusy(section.id);
    try {
      const { data, error } = await supabase.rpc("enroll_student_in_section" as any, { _section_id: section.id } as any);
      if (error) throw error;
      const result = data as any;
      if (!result?.success) { toast.error(REGISTRATION_ERRORS[result?.error] || result?.error || "Registration was not authorised."); return; }
      toast.success(result.status === "waitlisted" ? "Added to the governed waitlist" : "Registration confirmed");

      if (result.status === "enrolled" && lifecycle.data?.lifecycleStatus === "enrolled") {
        const { error: activationError } = await supabase.rpc("transition_student_status", {
          p_user_id: user!.id,
          p_new_status: "active",
          p_reason: "Canonical activation after governed section registration",
        } as any);
        if (activationError) toast.warning("Registration succeeded; lifecycle activation remains pending verification.");
      }

      await Promise.all([load(), queryClient.invalidateQueries({ queryKey: ["student-lifecycle-snapshot", user?.id] })]);
    } catch (error: any) {
      toast.error(error?.message || "Registration failed.");
    } finally { setBusy(null); }
  };

  const drop = async (enrollmentId: string) => {
    const reason = window.prompt("Reason for dropping or withdrawing:");
    if (!reason) return;
    setBusy(enrollmentId);
    try {
      const { data, error } = await supabase.rpc("drop_section_enrollment" as any, { _enrollment_id: enrollmentId, _reason: reason } as any);
      if (error) throw error;
      const result = data as any;
      if (!result?.success) { toast.error(REGISTRATION_ERRORS[result?.error] || result?.error || "Registration change was not authorised."); return; }
      toast.success(result.status === "withdrawn" ? "Withdrawal recorded" : "Section dropped");
      await Promise.all([load(), queryClient.invalidateQueries({ queryKey: ["student-lifecycle-snapshot", user?.id] })]);
    } catch (error: any) {
      toast.error(error?.message || "Could not change registration.");
    } finally { setBusy(null); }
  };

  if (lifecycle.authLoading || lifecycle.isLoading) return <div className="min-h-[40vh] flex items-center justify-center"><Loader2 className="h-6 w-6 animate-spin" /></div>;
  if (!lifecycle.authenticated) return <Navigate to={canonicalLifecycleRoutes.signIn} replace />;
  if (lifecycle.isError || !lifecycle.data) {
    return <div className="container mx-auto py-10 px-4 max-w-xl text-center space-y-3"><ShieldAlert className="h-8 w-8 mx-auto text-destructive" /><h2 className="font-serif text-2xl">Registration authority could not be verified</h2><p className="text-sm text-muted-foreground">Registration remains closed until the governed lifecycle snapshot can be verified.</p></div>;
  }

  const requiredRoute = getRequiredStudentOnboardingRoute(lifecycle.data);
  if (requiredRoute && requiredRoute !== canonicalLifecycleRoutes.registration) return <Navigate to={requiredRoute} replace />;
  if (!["enrolled", "active"].includes(lifecycle.data.lifecycleStatus || "")) return <Navigate to={getLifecycleStatusFallbackRoute(lifecycle.data.lifecycleStatus)} replace />;

  const filtered = sections.filter((s) => !search || s.course_code.toLowerCase().includes(search.toLowerCase()) || (s.course_title || "").toLowerCase().includes(search.toLowerCase()) || s.term_label.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="container mx-auto py-8 px-4 max-w-5xl">
      <h1 className="font-display text-3xl text-burgundy mb-2">Course Registration</h1>
      <p className="text-muted-foreground mb-4">Registration is governed by the registrar academic spine: term status, registration windows, degree enrollment, standing, prerequisites, credit limits, timetable conflicts, seat capacity and waitlists are enforced server-side.</p>

      {loadError && <Card className="mb-4 border-destructive/30"><CardContent className="py-4 text-sm text-destructive">{loadError}</CardContent></Card>}
      {windows.length > 0 && <Card className="mb-4"><CardHeader><CardTitle className="text-sm">Governed Registration Windows</CardTitle></CardHeader><CardContent className="text-sm space-y-1">{windows.map((w) => { const open = openTermIds.has(w.term_id); return <div key={w.id} className="flex flex-wrap items-center gap-2"><Badge variant={open ? "default" : "outline"}>{open ? "Open" : "Closed"}</Badge><span>{w.tier} · max {w.max_credits} credits</span><span className="text-xs text-muted-foreground">{new Date(w.open_at).toLocaleDateString()} → {new Date(w.close_at).toLocaleDateString()}</span></div>; })}</CardContent></Card>}

      <Input className="mb-4" placeholder="Search by course or term…" value={search} onChange={(e) => setSearch(e.target.value)} />
      {filtered.length === 0 ? <Card><CardContent className="py-12 text-center text-muted-foreground">No governed sections are currently available.</CardContent></Card> : <div className="space-y-3">{filtered.map((section) => {
        const enrollment = enrollmentFor(section.id);
        const open = !!section.term_id && openTermIds.has(section.term_id);
        return <Card key={section.id}><CardContent className="py-4 flex items-center justify-between gap-3"><div className="flex-1 min-w-0"><div className="flex flex-wrap items-center gap-2 mb-1"><span className="font-mono text-sm">{section.course_code}-{section.section_code}</span><Badge variant="outline">{section.term_label}</Badge><span className="text-xs text-muted-foreground">{section.credit_hours}cr</span></div>{section.course_title && <div className="font-medium">{section.course_title}</div>}{section.meeting_info && <div className="text-xs text-muted-foreground">{section.meeting_info}</div>}</div><div className="text-right">{enrollment ? <div className="space-y-1"><Badge variant={enrollment.status === "enrolled" ? "default" : "outline"}>{enrollment.status}{enrollment.waitlist_position ? ` #${enrollment.waitlist_position}` : ""}</Badge><div><Button size="sm" variant="ghost" disabled={busy === enrollment.id} onClick={() => drop(enrollment.id)}>{busy === enrollment.id ? "Updating…" : "Drop / Withdraw"}</Button></div></div> : <Button size="sm" disabled={!open || busy === section.id} onClick={() => request(section)}>{busy === section.id ? "Checking…" : open ? "Register" : "Closed"}</Button>}</div></CardContent></Card>;
      })}</div>}
    </div>
  );
}
