import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";

interface Hall { id: string; name: string; campus: string | null; gender_policy: string; description: string | null; }
interface Room { id: string; hall_id: string; room_number: string; room_type: string; capacity: number; term_rate: number | null; }
interface Application { id: string; term: string; preferred_hall_id: string | null; preferred_room_type: string | null; notes: string | null; status: string; created_at: string; }
interface Assignment { id: string; room_id: string; term: string; status: string; checked_in_at: string | null; }
interface Maintenance { id: string; room_id: string; category: string; priority: string; summary: string; status: string; created_at: string; }

export default function MyHousing() {
  const { user } = useAuth();
  const [halls, setHalls] = useState<Hall[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [apps, setApps] = useState<Application[]>([]);
  const [assigns, setAssigns] = useState<Assignment[]>([]);
  const [maint, setMaint] = useState<Maintenance[]>([]);
  const [appForm, setAppForm] = useState({ term: "", preferred_hall_id: "", preferred_room_type: "", notes: "" });
  const [maintForm, setMaintForm] = useState({ room_id: "", category: "plumbing", priority: "normal", summary: "", details: "" });

  const load = async () => {
    if (!user) return;
    const [h, r, a, as, m] = await Promise.all([
      supabase.from("residence_halls" as any).select("*").eq("active", true).order("name"),
      supabase.from("rooms" as any).select("*").eq("active", true).order("room_number"),
      supabase.from("housing_applications" as any).select("*").eq("student_user_id", user.id).order("created_at", { ascending: false }),
      supabase.from("room_assignments" as any).select("*").eq("student_user_id", user.id).order("assigned_at", { ascending: false }),
      supabase.from("maintenance_requests" as any).select("*").eq("reporter_id", user.id).order("created_at", { ascending: false }),
    ]);
    setHalls((h.data as any) || []);
    setRooms((r.data as any) || []);
    setApps((a.data as any) || []);
    setAssigns((as.data as any) || []);
    setMaint((m.data as any) || []);
  };
  useEffect(() => { load(); }, [user]);

  const submitApp = async () => {
    if (!user || !appForm.term) { toast.error("Term required"); return; }
    const payload: any = { student_user_id: user.id, term: appForm.term, notes: appForm.notes || null };
    if (appForm.preferred_hall_id) payload.preferred_hall_id = appForm.preferred_hall_id;
    if (appForm.preferred_room_type) payload.preferred_room_type = appForm.preferred_room_type;
    const { error } = await supabase.from("housing_applications" as any).insert(payload);
    if (error) { toast.error(error.message); return; }
    toast.success("Application submitted");
    setAppForm({ term: "", preferred_hall_id: "", preferred_room_type: "", notes: "" });
    load();
  };

  const withdraw = async (id: string) => {
    const { error } = await supabase.from("housing_applications" as any).update({ status: "withdrawn" }).eq("id", id);
    if (error) toast.error(error.message); else { toast.success("Withdrawn"); load(); }
  };

  const fileMaintenance = async () => {
    if (!user || !maintForm.room_id || !maintForm.summary) { toast.error("Room and summary required"); return; }
    const { error } = await supabase.from("maintenance_requests" as any).insert({
      ...maintForm, reporter_id: user.id, details: maintForm.details || null,
    });
    if (error) { toast.error(error.message); return; }
    toast.success("Maintenance request filed");
    setMaintForm({ room_id: "", category: "plumbing", priority: "normal", summary: "", details: "" });
    load();
  };

  const activeRoomIds = assigns.filter((a) => ["assigned","checked_in"].includes(a.status)).map((a) => a.room_id);

  return (
    <div className="container mx-auto py-8 space-y-6">
      <div>
        <h1 className="text-3xl font-serif font-bold">Housing & Residence Life</h1>
        <p className="text-muted-foreground">Apply for housing, view assignments, and request maintenance.</p>
      </div>

      <Tabs defaultValue="halls">
        <TabsList>
          <TabsTrigger value="halls">Halls</TabsTrigger>
          <TabsTrigger value="apply">Apply</TabsTrigger>
          <TabsTrigger value="mine">My Housing</TabsTrigger>
          <TabsTrigger value="maintenance">Maintenance</TabsTrigger>
        </TabsList>

        <TabsContent value="halls" className="space-y-3">
          {halls.map((h) => (
            <Card key={h.id}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-lg">{h.name}</CardTitle>
                    <div className="text-sm text-muted-foreground">{h.campus || "—"} · {h.gender_policy}</div>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {h.description && <p className="text-sm mb-2">{h.description}</p>}
                <div className="text-xs text-muted-foreground">
                  {rooms.filter((r) => r.hall_id === h.id).length} rooms
                </div>
              </CardContent>
            </Card>
          ))}
          {!halls.length && <p className="text-muted-foreground">No halls available.</p>}
        </TabsContent>

        <TabsContent value="apply">
          <Card>
            <CardHeader><CardTitle>Housing Application</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <div className="grid md:grid-cols-2 gap-3">
                <div><Label>Term</Label><Input value={appForm.term} onChange={(e) => setAppForm({ ...appForm, term: e.target.value })} placeholder="e.g. Fall 2026" /></div>
                <div>
                  <Label>Preferred Hall</Label>
                  <Select value={appForm.preferred_hall_id} onValueChange={(v) => setAppForm({ ...appForm, preferred_hall_id: v })}>
                    <SelectTrigger><SelectValue placeholder="Any" /></SelectTrigger>
                    <SelectContent>{halls.map((h) => <SelectItem key={h.id} value={h.id}>{h.name}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Preferred Room Type</Label>
                  <Select value={appForm.preferred_room_type} onValueChange={(v) => setAppForm({ ...appForm, preferred_room_type: v })}>
                    <SelectTrigger><SelectValue placeholder="Any" /></SelectTrigger>
                    <SelectContent>
                      {["single","double","triple","suite"].map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div><Label>Notes</Label><Textarea rows={3} value={appForm.notes} onChange={(e) => setAppForm({ ...appForm, notes: e.target.value })} /></div>
              <Button onClick={submitApp}>Submit Application</Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="mine" className="space-y-4">
          <Card>
            <CardHeader><CardTitle>Applications</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              {apps.map((a) => (
                <div key={a.id} className="flex items-center justify-between border-b py-2">
                  <div>
                    <div className="font-medium">{a.term}</div>
                    <div className="text-xs text-muted-foreground">{a.preferred_room_type || "any"} · {new Date(a.created_at).toLocaleDateString()}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge>{a.status}</Badge>
                    {!["withdrawn","approved","rejected"].includes(a.status) && (
                      <Button size="sm" variant="ghost" onClick={() => withdraw(a.id)}>Withdraw</Button>
                    )}
                  </div>
                </div>
              ))}
              {!apps.length && <p className="text-sm text-muted-foreground">No applications.</p>}
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Room Assignments</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              {assigns.map((a) => {
                const r = rooms.find((x) => x.id === a.room_id);
                const h = r ? halls.find((x) => x.id === r.hall_id) : null;
                return (
                  <div key={a.id} className="flex items-center justify-between border-b py-2">
                    <div>
                      <div className="font-medium">{h?.name || "Hall"} · Room {r?.room_number || "?"}</div>
                      <div className="text-xs text-muted-foreground">{a.term} · {r?.room_type}</div>
                    </div>
                    <Badge>{a.status}</Badge>
                  </div>
                );
              })}
              {!assigns.length && <p className="text-sm text-muted-foreground">No assignments yet.</p>}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="maintenance" className="space-y-4">
          <Card>
            <CardHeader><CardTitle>File a Maintenance Request</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              {activeRoomIds.length === 0 ? (
                <p className="text-sm text-muted-foreground">You need an active room assignment to file maintenance.</p>
              ) : (
                <>
                  <div className="grid md:grid-cols-3 gap-3">
                    <div>
                      <Label>Room</Label>
                      <Select value={maintForm.room_id} onValueChange={(v) => setMaintForm({ ...maintForm, room_id: v })}>
                        <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                        <SelectContent>
                          {activeRoomIds.map((id) => {
                            const r = rooms.find((x) => x.id === id);
                            const h = r ? halls.find((x) => x.id === r.hall_id) : null;
                            return <SelectItem key={id} value={id}>{h?.name} · {r?.room_number}</SelectItem>;
                          })}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Category</Label>
                      <Select value={maintForm.category} onValueChange={(v) => setMaintForm({ ...maintForm, category: v })}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {["plumbing","electrical","hvac","appliance","furniture","pest","cleaning","other"].map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Priority</Label>
                      <Select value={maintForm.priority} onValueChange={(v) => setMaintForm({ ...maintForm, priority: v })}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {["low","normal","high","emergency"].map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div><Label>Summary</Label><Input value={maintForm.summary} onChange={(e) => setMaintForm({ ...maintForm, summary: e.target.value })} /></div>
                  <div><Label>Details</Label><Textarea rows={3} value={maintForm.details} onChange={(e) => setMaintForm({ ...maintForm, details: e.target.value })} /></div>
                  <Button onClick={fileMaintenance}>Submit Request</Button>
                </>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>My Requests</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              {maint.map((m) => (
                <div key={m.id} className="flex items-center justify-between border-b py-2">
                  <div>
                    <div className="font-medium">{m.summary}</div>
                    <div className="text-xs text-muted-foreground">{m.category} · {m.priority} · {new Date(m.created_at).toLocaleDateString()}</div>
                  </div>
                  <Badge>{m.status}</Badge>
                </div>
              ))}
              {!maint.length && <p className="text-sm text-muted-foreground">No requests.</p>}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
