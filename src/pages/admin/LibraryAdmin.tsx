import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";

interface Resource {
  id: string;
  title: string;
  kind: string;
  identifier: string | null;
  location: string | null;
  total_copies: number;
  loan_days: number;
  max_renewals: number;
  active: boolean;
}
interface Loan {
  id: string;
  resource_id: string;
  borrower_user_id: string;
  status: string;
  due_at: string | null;
  reserved_at: string;
  renewals: number;
}

export default function LibraryAdmin() {
  const [resources, setResources] = useState<Resource[]>([]);
  const [loans, setLoans] = useState<Loan[]>([]);
  const [form, setForm] = useState({
    title: "", kind: "book", identifier: "", location: "",
    total_copies: 1, loan_days: 14, max_renewals: 2,
  });
  const [busy, setBusy] = useState<string | null>(null);

  const load = async () => {
    const [r, l] = await Promise.all([
      supabase.from("library_resources" as any).select("*").order("title"),
      supabase.from("resource_loans" as any).select("*")
        .in("status", ["reserved","checked_out","overdue"])
        .order("reserved_at", { ascending: false }).limit(200),
    ]);
    setResources((r.data as any) || []);
    setLoans((l.data as any) || []);
  };
  useEffect(() => { load(); }, []);

  const create = async () => {
    if (!form.title) { toast.error("Title required"); return; }
    const { error } = await supabase.from("library_resources" as any).insert(form);
    if (error) { toast.error(error.message); return; }
    toast.success("Resource added");
    setForm({ ...form, title: "", identifier: "", location: "" });
    load();
  };

  const callRpc = async (rpc: string, id: string, extra: any = {}) => {
    setBusy(id);
    const { error } = await supabase.rpc(rpc as any, { _loan_id: id, ...extra });
    setBusy(null);
    if (error) { toast.error(error.message); return; }
    toast.success("Updated");
    load();
  };

  const markOverdue = async () => {
    const { data, error } = await supabase.rpc("mark_overdue_loans" as any);
    if (error) { toast.error(error.message); return; }
    toast.success(`Flagged ${data} loan(s) overdue`);
    load();
  };

  return (
    <div className="container mx-auto py-8 px-4 max-w-6xl">
      <h1 className="font-display text-3xl text-burgundy mb-2">Library & Loans Desk</h1>
      <p className="text-muted-foreground mb-6">
        Manage the catalog and process active reservations, checkouts, and returns.
      </p>

      <Card className="mb-6">
        <CardHeader><CardTitle className="text-base">Add Resource</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div className="grid md:grid-cols-2 gap-2">
            <div><Label>Title</Label><Input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} /></div>
            <div>
              <Label>Kind</Label>
              <Select value={form.kind} onValueChange={v => setForm({ ...form, kind: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {["book","equipment","room","media","other"].map(k => <SelectItem key={k} value={k}>{k}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div><Label>Identifier (ISBN/serial)</Label><Input value={form.identifier} onChange={e => setForm({ ...form, identifier: e.target.value })} /></div>
            <div><Label>Location</Label><Input value={form.location} onChange={e => setForm({ ...form, location: e.target.value })} /></div>
            <div><Label>Total Copies</Label><Input type="number" value={form.total_copies} onChange={e => setForm({ ...form, total_copies: Number(e.target.value) })} /></div>
            <div><Label>Loan Days</Label><Input type="number" value={form.loan_days} onChange={e => setForm({ ...form, loan_days: Number(e.target.value) })} /></div>
            <div><Label>Max Renewals</Label><Input type="number" value={form.max_renewals} onChange={e => setForm({ ...form, max_renewals: Number(e.target.value) })} /></div>
          </div>
          <Button onClick={create}>Add Resource</Button>
        </CardContent>
      </Card>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-base flex items-center justify-between">
            <span>Active Loans</span>
            <Button size="sm" variant="outline" onClick={markOverdue}>Sweep Overdue</Button>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loans.length === 0 ? <p className="text-sm text-muted-foreground">No active loans.</p> : (
            <div className="space-y-2">
              {loans.map(l => {
                const r = resources.find(x => x.id === l.resource_id);
                return (
                  <div key={l.id} className="flex items-center justify-between border-b py-2 text-sm gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <Badge variant="outline">{l.status}</Badge>
                        <span className="font-medium truncate">{r?.title || l.resource_id.slice(0,8)}</span>
                      </div>
                      <div className="text-xs text-muted-foreground">
                        Borrower {l.borrower_user_id.slice(0,8)}… · Reserved {new Date(l.reserved_at).toLocaleDateString()}
                        {l.due_at && <> · Due {new Date(l.due_at).toLocaleDateString()}</>}
                      </div>
                    </div>
                    <div className="flex gap-1">
                      {l.status === "reserved" && <Button size="sm" disabled={busy === l.id} onClick={() => callRpc("checkout_loan", l.id)}>Check Out</Button>}
                      {["checked_out","overdue"].includes(l.status) && <Button size="sm" variant="outline" disabled={busy === l.id} onClick={() => callRpc("return_loan", l.id)}>Return</Button>}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Catalog ({resources.length})</CardTitle></CardHeader>
        <CardContent>
          {resources.length === 0 ? <p className="text-sm text-muted-foreground">No resources.</p> : (
            <div className="space-y-1">
              {resources.map(r => (
                <div key={r.id} className="flex items-center gap-3 text-sm border-b py-1">
                  <Badge variant="outline">{r.kind}</Badge>
                  <span className="font-medium flex-1 truncate">{r.title}</span>
                  <span className="text-xs text-muted-foreground">{r.total_copies} copies · {r.loan_days}d</span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
