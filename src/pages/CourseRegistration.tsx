import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

interface Section {
  id: string;
  term_label: string;
  course_code: string;
  course_title: string | null;
  section_code: string;
  seat_capacity: number;
  waitlist_capacity: number;
  meeting_info: string | null;
  credit_hours: number;
  active: boolean;
}
interface Enrollment {
  id: string;
  section_id: string;
  status: string;
  waitlist_position: number | null;
}
interface Period {
  id: string;
  term_label: string;
  opens_at: string;
  closes_at: string;
  tier: string;
}

export default function CourseRegistration() {
  const { user } = useAuth();
  const [sections, setSections] = useState<Section[]>([]);
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [periods, setPeriods] = useState<Period[]>([]);
  const [search, setSearch] = useState("");
  const [busy, setBusy] = useState<string | null>(null);

  const load = async () => {
    const [s, e, p] = await Promise.all([
      supabase.from("course_sections" as any).select("*").eq("active", true).order("course_code"),
      user ? supabase.from("section_enrollments" as any).select("*").eq("student_user_id", user.id) : Promise.resolve({ data: [] }),
      supabase.from("registration_periods" as any).select("*").order("opens_at"),
    ]);
    setSections((s.data as any) || []);
    setEnrollments((e.data as any) || []);
    setPeriods((p.data as any) || []);
  };
  useEffect(() => { load(); }, [user]);

  const now = new Date();
  const openTerms = new Set(
    periods.filter(p => new Date(p.opens_at) <= now && new Date(p.closes_at) >= now).map(p => p.term_label)
  );

  const enrollmentFor = (sid: string) => enrollments.find(e => e.section_id === sid && !["dropped","withdrawn"].includes(e.status));

  const request = async (section: Section) => {
    setBusy(section.id);
    const { error } = await supabase.rpc("request_section_enrollment" as any, { _section_id: section.id });
    setBusy(null);
    if (error) { toast.error(error.message); return; }
    toast.success("Registration submitted");
    load();
  };

  const drop = async (enrId: string) => {
    const reason = window.prompt("Reason for dropping:");
    if (!reason) return;
    setBusy(enrId);
    const { error } = await supabase.rpc("drop_section_enrollment" as any, { _enrollment_id: enrId, _reason: reason });
    setBusy(null);
    if (error) { toast.error(error.message); return; }
    toast.success("Dropped");
    load();
  };

  const filtered = sections.filter(s =>
    !search ||
    s.course_code.toLowerCase().includes(search.toLowerCase()) ||
    (s.course_title || "").toLowerCase().includes(search.toLowerCase()) ||
    s.term_label.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="container mx-auto py-8 px-4 max-w-5xl">
      <h1 className="font-display text-3xl text-burgundy mb-2">Course Registration</h1>
      <p className="text-muted-foreground mb-4">
        Browse open sections and register. Full sections auto-place you on the waitlist; you advance when seats free.
      </p>

      {periods.length > 0 && (
        <Card className="mb-4">
          <CardHeader><CardTitle className="text-sm">Registration Windows</CardTitle></CardHeader>
          <CardContent className="text-sm space-y-1">
            {periods.map(p => {
              const open = openTerms.has(p.term_label);
              return (
                <div key={p.id} className="flex items-center gap-2">
                  <Badge variant={open ? "default" : "outline"}>{open ? "Open" : "Closed"}</Badge>
                  <span>{p.term_label} · {p.tier}</span>
                  <span className="text-xs text-muted-foreground">
                    {new Date(p.opens_at).toLocaleDateString()} → {new Date(p.closes_at).toLocaleDateString()}
                  </span>
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}

      <Input className="mb-4" placeholder="Search by course or term…" value={search} onChange={e => setSearch(e.target.value)} />

      {filtered.length === 0 ? (
        <Card><CardContent className="py-12 text-center text-muted-foreground">No sections.</CardContent></Card>
      ) : (
        <div className="space-y-3">
          {filtered.map(s => {
            const enr = enrollmentFor(s.id);
            const open = openTerms.has(s.term_label);
            return (
              <Card key={s.id}>
                <CardContent className="py-4 flex items-center justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-mono text-sm">{s.course_code}-{s.section_code}</span>
                      <Badge variant="outline">{s.term_label}</Badge>
                      <span className="text-xs text-muted-foreground">{s.credit_hours}cr</span>
                    </div>
                    {s.course_title && <div className="font-medium">{s.course_title}</div>}
                    {s.meeting_info && <div className="text-xs text-muted-foreground">{s.meeting_info}</div>}
                  </div>
                  <div className="text-right">
                    {enr ? (
                      <div className="space-y-1">
                        <Badge variant={enr.status === "enrolled" ? "default" : "outline"}>
                          {enr.status}{enr.waitlist_position ? ` #${enr.waitlist_position}` : ""}
                        </Badge>
                        <div>
                          <Button size="sm" variant="ghost" disabled={busy === enr.id} onClick={() => drop(enr.id)}>Drop</Button>
                        </div>
                      </div>
                    ) : (
                      <Button size="sm" disabled={!open || busy === s.id} onClick={() => request(s)}>
                        {open ? "Register" : "Closed"}
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
