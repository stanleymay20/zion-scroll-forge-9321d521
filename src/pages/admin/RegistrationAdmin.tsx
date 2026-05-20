import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

interface Period {
  id: string;
  term_label: string;
  tier: string;
  opens_at: string;
  closes_at: string;
}
interface Section {
  id: string;
  term_label: string;
  course_code: string;
  course_title: string | null;
  section_code: string;
  seat_capacity: number;
  waitlist_capacity: number;
  credit_hours: number;
  meeting_info: string | null;
}

export default function RegistrationAdmin() {
  const { user } = useAuth();
  const [periods, setPeriods] = useState<Period[]>([]);
  const [sections, setSections] = useState<Section[]>([]);
  const [per, setPer] = useState({ term_label: "", tier: "general", opens_at: "", closes_at: "" });
  const [sec, setSec] = useState({
    term_label: "", course_code: "", course_title: "", section_code: "001",
    seat_capacity: 30, waitlist_capacity: 10, credit_hours: 3, meeting_info: "",
  });

  const load = async () => {
    const [p, s] = await Promise.all([
      supabase.from("registration_periods" as any).select("*").order("opens_at", { ascending: false }),
      supabase.from("course_sections" as any).select("*").order("term_label", { ascending: false }).limit(200),
    ]);
    setPeriods((p.data as any) || []);
    setSections((s.data as any) || []);
  };
  useEffect(() => { load(); }, []);

  const savePeriod = async () => {
    if (!user || !per.term_label || !per.opens_at || !per.closes_at) { toast.error("Fill term + dates"); return; }
    const { error } = await supabase.from("registration_periods" as any).insert({
      term_label: per.term_label, tier: per.tier,
      opens_at: new Date(per.opens_at).toISOString(),
      closes_at: new Date(per.closes_at).toISOString(),
      created_by: user.id,
    });
    if (error) { toast.error(error.message); return; }
    toast.success("Period created");
    setPer({ term_label: "", tier: "general", opens_at: "", closes_at: "" });
    load();
  };

  const saveSection = async () => {
    if (!sec.term_label || !sec.course_code) { toast.error("Term + code required"); return; }
    const { error } = await supabase.from("course_sections" as any).insert(sec);
    if (error) { toast.error(error.message); return; }
    toast.success("Section created");
    setSec({ ...sec, course_code: "", course_title: "", meeting_info: "" });
    load();
  };

  return (
    <div className="container mx-auto py-8 px-4 max-w-6xl">
      <h1 className="font-display text-3xl text-burgundy mb-2">Registration Office</h1>
      <p className="text-muted-foreground mb-6">
        Open registration windows and create course sections for the term.
      </p>

      <div className="grid md:grid-cols-2 gap-4 mb-6">
        <Card>
          <CardHeader><CardTitle className="text-base">New Registration Window</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            <div><Label>Term Label</Label><Input value={per.term_label} onChange={e => setPer({ ...per, term_label: e.target.value })} placeholder="Fall 2026" /></div>
            <div><Label>Tier</Label><Input value={per.tier} onChange={e => setPer({ ...per, tier: e.target.value })} placeholder="general | seniors | juniors" /></div>
            <div><Label>Opens At</Label><Input type="datetime-local" value={per.opens_at} onChange={e => setPer({ ...per, opens_at: e.target.value })} /></div>
            <div><Label>Closes At</Label><Input type="datetime-local" value={per.closes_at} onChange={e => setPer({ ...per, closes_at: e.target.value })} /></div>
            <Button onClick={savePeriod}>Create Window</Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">New Course Section</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            <div><Label>Term Label</Label><Input value={sec.term_label} onChange={e => setSec({ ...sec, term_label: e.target.value })} /></div>
            <div className="grid grid-cols-2 gap-2">
              <div><Label>Course Code</Label><Input value={sec.course_code} onChange={e => setSec({ ...sec, course_code: e.target.value })} /></div>
              <div><Label>Section Code</Label><Input value={sec.section_code} onChange={e => setSec({ ...sec, section_code: e.target.value })} /></div>
            </div>
            <div><Label>Title</Label><Input value={sec.course_title} onChange={e => setSec({ ...sec, course_title: e.target.value })} /></div>
            <div className="grid grid-cols-3 gap-2">
              <div><Label>Seats</Label><Input type="number" value={sec.seat_capacity} onChange={e => setSec({ ...sec, seat_capacity: Number(e.target.value) })} /></div>
              <div><Label>Waitlist</Label><Input type="number" value={sec.waitlist_capacity} onChange={e => setSec({ ...sec, waitlist_capacity: Number(e.target.value) })} /></div>
              <div><Label>Credits</Label><Input type="number" step="0.5" value={sec.credit_hours} onChange={e => setSec({ ...sec, credit_hours: Number(e.target.value) })} /></div>
            </div>
            <div><Label>Meeting Info</Label><Input value={sec.meeting_info} onChange={e => setSec({ ...sec, meeting_info: e.target.value })} placeholder="MW 10:00–11:15" /></div>
            <Button onClick={saveSection}>Create Section</Button>
          </CardContent>
        </Card>
      </div>

      <Card className="mb-6">
        <CardHeader><CardTitle className="text-base">Active Windows</CardTitle></CardHeader>
        <CardContent>
          {periods.length === 0 ? <p className="text-sm text-muted-foreground">None.</p> : (
            <div className="space-y-2">
              {periods.map(p => (
                <div key={p.id} className="flex items-center gap-3 text-sm border-b py-2">
                  <Badge variant="outline">{p.tier}</Badge>
                  <span className="font-medium">{p.term_label}</span>
                  <span className="text-xs text-muted-foreground">
                    {new Date(p.opens_at).toLocaleString()} → {new Date(p.closes_at).toLocaleString()}
                  </span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Sections</CardTitle></CardHeader>
        <CardContent>
          {sections.length === 0 ? <p className="text-sm text-muted-foreground">None.</p> : (
            <div className="space-y-1">
              {sections.map(s => (
                <div key={s.id} className="flex items-center gap-3 text-sm border-b py-1">
                  <Badge variant="outline">{s.term_label}</Badge>
                  <span className="font-mono">{s.course_code}-{s.section_code}</span>
                  <span className="flex-1 truncate text-muted-foreground">{s.course_title}</span>
                  <span className="text-xs">{s.seat_capacity} seats · {s.waitlist_capacity} waitlist</span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
