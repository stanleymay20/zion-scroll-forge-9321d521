import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";

interface Hall { id: string; name: string; campus: string | null; gender_policy: string; description: string | null; active: boolean; }
interface Room { id: string; hall_id: string; room_number: string; room_type: string; capacity: number; term_rate: number | null; active: boolean; }
interface Application { id: string; student_user_id: string; term: string; preferred_hall_id: string | null; preferred_room_type: string | null; notes: string | null; status: string; }
interface Assignment { id: string; room_id: string; student_user_id: string; term: string; status: string; }
interface Maintenance { id: string; room_id: string; reporter_id: string; category: string; priority: string; summary: string; details: string | null; status: string; created_at: string; }

const APP_STATUSES = ["submitted","under_review","approved","waitlisted","rejected"];
const MAINT_STATUSES = ["open","in_progress","resolved","closed"];

export default function HousingAdmin() {
  const [halls, setHalls] = useState<Hall[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [apps, setApps] = useState<Application[]>([]);
  const [assigns, setAssigns] = useState<Assignment[]>([]);
  const [maint, setMaint] = useState<Maintenance[]>([]);
  const [newHall, setNewHall] = useState({ name: "", campus: "", gender_policy: "coed", description: "" });
  const [newRoom, setNewRoom] = useState({ hall_id: "", room_number: "", room_type: "double", capacity: 2, term_rate: "" });
  const [assignForm, setAssignForm] = useState({ application_id: "", room_id: "" });

  const load = async () => {
    const [h, r, a, as, m] = await Promise.all([
      supabase.from("residence_halls" as any).select("*").order("name"),
      supabase.from("rooms" as any).select("*").order("room_number"),
      supabase.from("housing_applications" as any).select("*").order("created_at", { ascending: false }).limit(200),
      supabase.from("room_assignments" as any).select("*").order("assigned_at", { ascending: false }).limit(200),
      supabase.from("maintenance_requests" as any).select("*").order("created_at", { ascending: false }).limit(200),
    ]);
    setHalls((h.data as any) || []);
    setRooms((r.data as any) || []);
    setApps((a.data as any) || []);
    setAssigns((as.data as any) || []);
    setMaint((m.data as any) || []);
  };
  useEffect(() => { load(); }, []);

  const createHall = async () => {
    if (!newHall.name) { toast.error("Name required"); return; }
    const { error } = await supabase.from("residence_halls" as any).insert(newHall);
    if (error) toast.error(error.message); else { toast.success("Hall created"); setNewHall({ name: "", campus: "", gender_policy: "coed", description: "" }); load(); }
  };

  const createRoom = async () => {
    if (!newRoom.hall_id || !newRoom.room_number) { toast.error("Hall and room number required"); return; }
    const { error } = await supabase.from("rooms" as any).insert({
      ...newRoom,
      capacity: Number(newRoom.capacity),
      term_rate: newRoom.term_rate ? Number(newRoom.term_rate) : null,
    });
    if (error) toast.error(error.message); else { toast.success("Room created"); setNewRoom({ hall_id: "", room_number: "", room_type: "double", capacity: 2, term_rate: "" }); load(); }
  };

  const decideApp = async (id: string, status: string) => {
    const { error } = await supabase.from("housing_applications" as any).update({ status }).eq("id", id);
    if (error) toast.error(error.message); else { toast.success(`App → ${status}`); load(); }
  };

  const createAssignment = async () => {
    const app = apps.find((a) => a.id === assignForm.application_id);
    if (!app || !assignForm.room_id) { toast.error("Select application and room"); return; }
    const { error } = await supabase.from("room_assignments" as any).insert({
      room_id: assignForm.room_id, student_user_id: app.student_user_id, term: app.term,
    });
    if (error) { toast.error(error.message); return; }
    await supabase.from("housing_applications" as any).update({ status: "approved" }).eq("id", app.id);
    toast.success("Assigned & approved");
    setAssignForm({ application_id: "", room_id: "" });
    load();
  };

  const setAssignStatus = async (id: string, status: string) => {
    const { error } = await supabase.from("room_assignments" as any).update({ status }).eq("id", id);
    if (error) toast.error(error.message); else { toast.success(`Assignment → ${status}`); load(); }
  };

  const setMaintStatus = async (id: string, status: string) => {
    const { error } = await supabase.from("maintenance_requests" as any).update({ status }).eq("id", id);
    if (error) toast.error(error.message); else { toast.success(`Maint → ${status}`); load(); }
  };

  return (
    <div className="container mx-auto py-8 space-y-6">
      <div>
        <h1 className="text-3xl font-serif font-bold">Housing Admin</h1>
        <p className="text-muted-foreground">Manage halls, rooms, applications, and maintenance.</p>
      </div>

      <Tabs defaultValue="apps">
        <TabsList>
          <TabsTrigger value="apps">Applications</TabsTrigger>
          <TabsTrigger value="assignments">Assignments</TabsTrigger>
          <TabsTrigger value="maintenance">Maintenance</TabsTrigger>
          <TabsTrigger value="inventory">Halls & Rooms</TabsTrigger>
        </TabsList>

        <TabsContent value="apps" className="space-y-2">
          {apps.map((a) => (
            <Card key={a.id}>
              <CardContent className="pt-4 flex items-start justify-between gap-3">
                <div className="flex-1">
                  <div className="font-medium">{a.term} — {a.student_user_id.slice(0, 8)}</div>
                  <div className="text-xs text-muted-foreground">
                    Preferred hall: {halls.find((h) => h.id === a.preferred_hall_id)?.name || "any"} · {a.preferred_room_type || "any"}
                  </div>
                  {a.notes && <p className="text-sm mt-1">{a.notes}</p>}
                </div>
                <div className="flex flex-col items-end gap-2">
                  <Badge>{a.status}</Badge>
                  {!["approved","rejected","withdrawn"].includes(a.status) && (
                    <div className="flex gap-1 flex-wrap justify-end">
                      {APP_STATUSES.filter((s) => s !== a.status).map((s) => (
                        <Button key={s} size="sm" variant="outline" onClick={() => decideApp(a.id, s)}>{s}</Button>
                      ))}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
          {!apps.length && <p className="text-muted-foreground">No applications.</p>}
        </TabsContent>

        <TabsContent value="assignments" className="space-y-4">
          <Card>
            <CardHeader><CardTitle>Create Assignment</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <div className="grid md:grid-cols-2 gap-3">
                <div>
                  <Label>Application</Label>
                  <Select value={assignForm.application_id} onValueChange={(v) => setAssignForm({ ...assignForm, application_id: v })}>
                    <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                    <SelectContent>
                      {apps.filter((a) => ["submitted","under_review","waitlisted"].includes(a.status))
                        .map((a) => <SelectItem key={a.id} value={a.id}>{a.term} · {a.student_user_id.slice(0,8)}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Room</Label>
                  <Select value={assignForm.room_id} onValueChange={(v) => setAssignForm({ ...assignForm, room_id: v })}>
                    <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                    <SelectContent>
                      {rooms.map((r) => {
                        const h = halls.find((x) => x.id === r.hall_id);
                        return <SelectItem key={r.id} value={r.id}>{h?.name} · {r.room_number} ({r.room_type})</SelectItem>;
                      })}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <Button onClick={createAssignment}>Assign & Approve</Button>
            </CardContent>
          </Card>

          <div className="space-y-2">
            {assigns.map((a) => {
              const r = rooms.find((x) => x.id === a.room_id);
              const h = r ? halls.find((x) => x.id === r.hall_id) : null;
              return (
                <Card key={a.id}>
                  <CardContent className="pt-4 flex items-center justify-between">
                    <div>
                      <div className="font-medium">{h?.name} · {r?.room_number}</div>
                      <div className="text-xs text-muted-foreground">{a.term} · student {a.student_user_id.slice(0,8)}</div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge>{a.status}</Badge>
                      {a.status === "assigned" && <Button size="sm" onClick={() => setAssignStatus(a.id, "checked_in")}>Check-in</Button>}
                      {a.status === "checked_in" && <Button size="sm" variant="secondary" onClick={() => setAssignStatus(a.id, "checked_out")}>Check-out</Button>}
                      {!["checked_out","canceled"].includes(a.status) && <Button size="sm" variant="ghost" onClick={() => setAssignStatus(a.id, "canceled")}>Cancel</Button>}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </TabsContent>

        <TabsContent value="maintenance" className="space-y-2">
          {maint.map((m) => {
            const r = rooms.find((x) => x.id === m.room_id);
            const h = r ? halls.find((x) => x.id === r.hall_id) : null;
            return (
              <Card key={m.id}>
                <CardContent className="pt-4 space-y-2">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="font-medium">{m.summary}</div>
                      <div className="text-xs text-muted-foreground">{h?.name} · {r?.room_number} · {m.category} · {m.priority}</div>
                    </div>
                    <Badge>{m.status}</Badge>
                  </div>
                  {m.details && <p className="text-sm whitespace-pre-wrap">{m.details}</p>}
                  <div className="flex flex-wrap gap-2">
                    {MAINT_STATUSES.filter((s) => s !== m.status).map((s) => (
                      <Button key={s} size="sm" variant="outline" onClick={() => setMaintStatus(m.id, s)}>{s}</Button>
                    ))}
                  </div>
                </CardContent>
              </Card>
            );
          })}
          {!maint.length && <p className="text-muted-foreground">No requests.</p>}
        </TabsContent>

        <TabsContent value="inventory" className="space-y-6">
          <Card>
            <CardHeader><CardTitle>New Hall</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <div className="grid md:grid-cols-2 gap-3">
                <div><Label>Name</Label><Input value={newHall.name} onChange={(e) => setNewHall({ ...newHall, name: e.target.value })} /></div>
                <div><Label>Campus</Label><Input value={newHall.campus} onChange={(e) => setNewHall({ ...newHall, campus: e.target.value })} /></div>
                <div>
                  <Label>Gender Policy</Label>
                  <Select value={newHall.gender_policy} onValueChange={(v) => setNewHall({ ...newHall, gender_policy: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {["coed","male","female","family"].map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div><Label>Description</Label><Textarea rows={2} value={newHall.description} onChange={(e) => setNewHall({ ...newHall, description: e.target.value })} /></div>
              <Button onClick={createHall}>Create Hall</Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>New Room</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <div className="grid md:grid-cols-3 gap-3">
                <div>
                  <Label>Hall</Label>
                  <Select value={newRoom.hall_id} onValueChange={(v) => setNewRoom({ ...newRoom, hall_id: v })}>
                    <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                    <SelectContent>{halls.map((h) => <SelectItem key={h.id} value={h.id}>{h.name}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div><Label>Room Number</Label><Input value={newRoom.room_number} onChange={(e) => setNewRoom({ ...newRoom, room_number: e.target.value })} /></div>
                <div>
                  <Label>Type</Label>
                  <Select value={newRoom.room_type} onValueChange={(v) => setNewRoom({ ...newRoom, room_type: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {["single","double","triple","suite"].map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div><Label>Capacity</Label><Input type="number" min={1} value={newRoom.capacity} onChange={(e) => setNewRoom({ ...newRoom, capacity: Number(e.target.value) })} /></div>
                <div><Label>Term Rate</Label><Input type="number" value={newRoom.term_rate} onChange={(e) => setNewRoom({ ...newRoom, term_rate: e.target.value })} /></div>
              </div>
              <Button onClick={createRoom}>Create Room</Button>
            </CardContent>
          </Card>

          <div className="grid md:grid-cols-2 gap-3">
            {halls.map((h) => (
              <Card key={h.id}>
                <CardHeader><CardTitle className="text-base">{h.name}</CardTitle></CardHeader>
                <CardContent>
                  <div className="text-xs text-muted-foreground mb-2">{h.campus || "—"} · {h.gender_policy}</div>
                  <div className="space-y-1">
                    {rooms.filter((r) => r.hall_id === h.id).map((r) => (
                      <div key={r.id} className="text-sm flex justify-between">
                        <span>{r.room_number} · {r.room_type}</span>
                        <span className="text-muted-foreground">cap {r.capacity}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
