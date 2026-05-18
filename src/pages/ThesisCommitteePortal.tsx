import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { ShieldCheck, Gavel } from "lucide-react";

const ThesisCommitteePortal = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [assignments, setAssignments] = useState<any[]>([]);
  const [voteOpen, setVoteOpen] = useState<string | null>(null);
  const [voteValue, setVoteValue] = useState<string>("pass");
  const [voteRationale, setVoteRationale] = useState("");

  const load = async () => {
    if (!user) return;
    const { data } = await supabase
      .from("thesis_committee_members" as any)
      .select("id, role, state, committee_id, thesis_committees!inner(thesis_id, thesis_projects!inner(id, title, status, project_type))")
      .eq("member_id", user.id)
      .eq("state", "accepted");
    setAssignments((data as any) || []);
  };

  useEffect(() => { load(); }, [user?.id]);

  const castVote = async (defenseId: string, role: string) => {
    if (!user) return;
    const { error } = await supabase.from("thesis_defense_votes" as any).insert({
      defense_id: defenseId,
      examiner_id: user.id,
      examiner_role: role,
      vote: voteValue,
      rationale: voteRationale,
    } as any);
    if (error) { toast({ title: "Vote failed", description: error.message, variant: "destructive" }); return; }
    toast({ title: "Vote recorded (immutable)" });
    setVoteOpen(null);
  };

  return (
    <div className="container mx-auto py-8 px-4 max-w-5xl">
      <h1 className="text-3xl font-display flex items-center gap-2 mb-2">
        <Gavel className="h-7 w-7 text-primary" /> Committee Portal
      </h1>
      <p className="text-muted-foreground mb-6">Your governed thesis review and examination assignments.</p>

      <Card className="mb-6 border-primary/30">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <ShieldCheck className="h-4 w-4" /> Examiner duty
          </CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground space-y-1">
          <p>• Reviews and votes are immutable once submitted.</p>
          <p>• Outcomes are computed from votes — they cannot be set manually.</p>
          <p>• Open integrity flags automatically downgrade an "accept" recommendation.</p>
        </CardContent>
      </Card>

      {assignments.length === 0 ? (
        <Card><CardContent className="py-12 text-center text-muted-foreground">No active committee assignments.</CardContent></Card>
      ) : (
        <div className="space-y-3">
          {assignments.map((a) => {
            const proj = a.thesis_committees?.thesis_projects;
            return (
              <Card key={a.id}>
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle>{proj?.title}</CardTitle>
                      <CardDescription>{proj?.project_type} · status: {proj?.status}</CardDescription>
                    </div>
                    <Badge>{a.role}</Badge>
                  </div>
                </CardHeader>
              </Card>
            );
          })}
        </div>
      )}

      <Dialog open={!!voteOpen} onOpenChange={(o) => !o && setVoteOpen(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Cast immutable defense vote</DialogTitle></DialogHeader>
          <Select value={voteValue} onValueChange={setVoteValue}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="pass">Pass</SelectItem>
              <SelectItem value="pass_with_revisions">Pass with revisions</SelectItem>
              <SelectItem value="major_revisions">Major revisions</SelectItem>
              <SelectItem value="fail">Fail</SelectItem>
              <SelectItem value="abstain">Abstain</SelectItem>
            </SelectContent>
          </Select>
          <Textarea placeholder="Rationale (required for audit trail)" value={voteRationale} onChange={(e) => setVoteRationale(e.target.value)} />
          <DialogFooter>
            <Button onClick={() => voteOpen && castVote(voteOpen, "internal_examiner")} disabled={!voteRationale.trim()}>Cast vote</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ThesisCommitteePortal;
