import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

interface Entry {
  id: string;
  student_user_id: string;
  entry_type: string;
  amount: number;
  memo: string;
  posted_at: string;
}
interface Hold {
  id: string;
  student_user_id: string;
  kind: string;
  status: string;
  reason: string;
  placed_at: string;
}

export default function BursarAdmin() {
  const { user } = useAuth();
  const [studentId, setStudentId] = useState("");
  const [entryType, setEntryType] = useState<string>("tuition_charge");
  const [amount, setAmount] = useState("");
  const [memo, setMemo] = useState("");

  const [awardKind, setAwardKind] = useState("scholarship");
  const [awardAmount, setAwardAmount] = useState("");
  const [awardSource, setAwardSource] = useState("");

  const [recent, setRecent] = useState<Entry[]>([]);
  const [holds, setHolds] = useState<Hold[]>([]);
  const [busy, setBusy] = useState(false);

  const refresh = async () => {
    const [e, h] = await Promise.all([
      supabase.from("student_account_ledger" as any).select("*").order("posted_at", { ascending: false }).limit(50),
      supabase.from("account_holds" as any).select("*").eq("status", "active").order("placed_at", { ascending: false }).limit(50),
    ]);
    setRecent((e.data as any) || []);
    setHolds((h.data as any) || []);
  };
  useEffect(() => { refresh(); }, []);

  const postEntry = async () => {
    if (!user || !studentId || !amount || !memo) { toast.error("Fill student, amount, memo"); return; }
    setBusy(true);
    const { error } = await supabase.from("student_account_ledger" as any).insert({
      student_user_id: studentId, entry_type: entryType,
      amount: Number(amount), memo, posted_by: user.id,
    });
    setBusy(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Ledger entry posted (immutable)");
    setAmount(""); setMemo("");
    refresh();
  };

  const offerAward = async () => {
    if (!user || !studentId || !awardAmount || !awardSource) { toast.error("Fill all award fields"); return; }
    setBusy(true);
    const { error } = await supabase.from("financial_aid_awards" as any).insert({
      student_user_id: studentId, kind: awardKind,
      amount: Number(awardAmount), source: awardSource, offered_by: user.id,
    });
    setBusy(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Aid award offered");
    setAwardAmount(""); setAwardSource("");
  };

  const recomputeHolds = async () => {
    setBusy(true);
    const { data, error } = await supabase.rpc("recompute_account_holds" as any);
    setBusy(false);
    if (error) { toast.error(error.message); return; }
    toast.success(`Placed ${data} new financial holds`);
    refresh();
  };

  const releaseHold = async (id: string) => {
    if (!user) return;
    const note = window.prompt("Release note (audit log):");
    if (!note) return;
    const { error } = await supabase.from("account_holds" as any).update({
      status: "released", released_by: user.id, released_at: new Date().toISOString(), release_note: note,
    }).eq("id", id);
    if (error) { toast.error(error.message); return; }
    toast.success("Hold released");
    refresh();
  };

  return (
    <div className="container mx-auto py-8 px-4 max-w-6xl">
      <h1 className="font-display text-3xl text-burgundy mb-2">Bursar Console</h1>
      <p className="text-muted-foreground mb-6">
        Post immutable ledger entries, offer aid awards, manage financial holds. All entries are append-only.
      </p>

      <div className="grid md:grid-cols-2 gap-6 mb-8">
        <Card>
          <CardHeader><CardTitle className="text-base">Post Ledger Entry</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div><Label>Student User ID</Label><Input value={studentId} onChange={e => setStudentId(e.target.value)} placeholder="uuid" /></div>
            <div><Label>Type</Label>
              <Select value={entryType} onValueChange={setEntryType}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="tuition_charge">Tuition Charge</SelectItem>
                  <SelectItem value="fee_charge">Fee Charge</SelectItem>
                  <SelectItem value="payment">Payment</SelectItem>
                  <SelectItem value="aid_disbursement">Aid Disbursement</SelectItem>
                  <SelectItem value="refund">Refund</SelectItem>
                  <SelectItem value="adjustment">Adjustment</SelectItem>
                  <SelectItem value="reversal">Reversal</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div><Label>Amount (USD, positive)</Label><Input type="number" step="0.01" value={amount} onChange={e => setAmount(e.target.value)} /></div>
            <div><Label>Memo</Label><Textarea value={memo} onChange={e => setMemo(e.target.value)} rows={2} /></div>
            <Button onClick={postEntry} disabled={busy} className="w-full">Post Entry</Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Offer Financial Aid</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div><Label>Student User ID</Label><Input value={studentId} onChange={e => setStudentId(e.target.value)} placeholder="uuid (shared above)" /></div>
            <div><Label>Award Kind</Label>
              <Select value={awardKind} onValueChange={setAwardKind}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="scholarship">Scholarship</SelectItem>
                  <SelectItem value="grant">Grant</SelectItem>
                  <SelectItem value="work_study">Work-Study</SelectItem>
                  <SelectItem value="sponsorship">Sponsorship</SelectItem>
                  <SelectItem value="waiver">Tuition Waiver</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div><Label>Amount</Label><Input type="number" step="0.01" value={awardAmount} onChange={e => setAwardAmount(e.target.value)} /></div>
            <div><Label>Source / Sponsor</Label><Input value={awardSource} onChange={e => setAwardSource(e.target.value)} placeholder="e.g. Scroll Endowment Fund" /></div>
            <Button onClick={offerAward} disabled={busy} className="w-full">Offer Award</Button>
          </CardContent>
        </Card>
      </div>

      <Card className="mb-6">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">Active Holds</CardTitle>
          <Button size="sm" variant="outline" onClick={recomputeHolds} disabled={busy}>Recompute Financial Holds</Button>
        </CardHeader>
        <CardContent>
          {holds.length === 0 ? <p className="text-muted-foreground text-sm">No active holds.</p> : (
            <div className="space-y-2">
              {holds.map(h => (
                <div key={h.id} className="flex items-center justify-between border-b py-2 text-sm">
                  <div className="flex-1">
                    <Badge variant="destructive" className="mr-2">{h.kind}</Badge>
                    <span className="font-mono text-xs mr-2">{h.student_user_id.slice(0, 8)}…</span>
                    <span>{h.reason}</span>
                  </div>
                  <Button size="sm" variant="ghost" onClick={() => releaseHold(h.id)}>Release</Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Recent Ledger Activity</CardTitle></CardHeader>
        <CardContent>
          {recent.length === 0 ? <p className="text-muted-foreground text-sm">No entries yet.</p> : (
            <div className="space-y-1 text-sm">
              {recent.map(e => (
                <div key={e.id} className="flex items-center justify-between border-b py-2">
                  <div className="flex-1 min-w-0">
                    <Badge variant="outline" className="mr-2 text-xs">{e.entry_type}</Badge>
                    <span className="font-mono text-xs mr-2">{e.student_user_id.slice(0, 8)}…</span>
                    <span className="text-muted-foreground">{e.memo}</span>
                  </div>
                  <span className="font-mono font-semibold ml-2">${Number(e.amount).toFixed(2)}</span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
