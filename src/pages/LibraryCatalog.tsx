import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
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
}
interface Loan {
  id: string;
  resource_id: string;
  status: string;
  due_at: string | null;
  renewals: number;
  reserved_at: string;
}

export default function LibraryCatalog() {
  const { user } = useAuth();
  const [resources, setResources] = useState<Resource[]>([]);
  const [loans, setLoans] = useState<Loan[]>([]);
  const [avail, setAvail] = useState<Record<string, number>>({});
  const [search, setSearch] = useState("");
  const [busy, setBusy] = useState<string | null>(null);

  const load = async () => {
    const [r, l] = await Promise.all([
      supabase.from("library_resources" as any).select("*").eq("active", true).order("title"),
      user ? supabase.from("resource_loans" as any).select("*").eq("borrower_user_id", user.id) : Promise.resolve({ data: [] }),
    ]);
    const rs = (r.data as any) || [];
    setResources(rs);
    setLoans((l.data as any) || []);
    const a: Record<string, number> = {};
    await Promise.all(rs.map(async (res: Resource) => {
      const { data } = await supabase.rpc("resource_available_copies" as any, { _resource_id: res.id });
      a[res.id] = (data as any) ?? 0;
    }));
    setAvail(a);
  };
  useEffect(() => { load(); }, [user]);

  const myLoanFor = (rid: string) =>
    loans.find(l => l.resource_id === rid && ["reserved","checked_out","overdue"].includes(l.status));

  const reserve = async (r: Resource) => {
    setBusy(r.id);
    const { error } = await supabase.rpc("reserve_resource" as any, { _resource_id: r.id });
    setBusy(null);
    if (error) { toast.error(error.message); return; }
    toast.success("Reserved");
    load();
  };
  const cancel = async (id: string) => {
    const reason = window.prompt("Reason:");
    if (!reason) return;
    setBusy(id);
    const { error } = await supabase.rpc("cancel_loan" as any, { _loan_id: id, _reason: reason });
    setBusy(null);
    if (error) { toast.error(error.message); return; }
    toast.success("Canceled");
    load();
  };
  const renew = async (id: string) => {
    setBusy(id);
    const { error } = await supabase.rpc("renew_loan" as any, { _loan_id: id });
    setBusy(null);
    if (error) { toast.error(error.message); return; }
    toast.success("Renewed");
    load();
  };

  const filtered = resources.filter(r =>
    !search || r.title.toLowerCase().includes(search.toLowerCase()) ||
    (r.identifier || "").toLowerCase().includes(search.toLowerCase())
  );

  const activeLoans = loans.filter(l => ["reserved","checked_out","overdue"].includes(l.status));

  return (
    <div className="container mx-auto py-8 px-4 max-w-5xl">
      <h1 className="font-display text-3xl text-burgundy mb-2">Scroll Library</h1>
      <p className="text-muted-foreground mb-6">
        Reserve books, equipment, and rooms. Pick up at the desk; librarian checks out and assigns the due date.
      </p>

      {activeLoans.length > 0 && (
        <Card className="mb-6">
          <CardHeader><CardTitle className="text-base">My Active Loans</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {activeLoans.map(l => {
              const r = resources.find(x => x.id === l.resource_id);
              return (
                <div key={l.id} className="flex items-center justify-between border-b py-2 text-sm gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="font-medium truncate">{r?.title || "Resource"}</div>
                    <div className="text-xs text-muted-foreground">
                      <Badge variant="outline" className="mr-2">{l.status}</Badge>
                      {l.due_at && <>Due {new Date(l.due_at).toLocaleDateString()} · </>}
                      Renewed {l.renewals}/{r?.max_renewals ?? "?"}
                    </div>
                  </div>
                  <div className="flex gap-1">
                    {l.status === "reserved" && <Button size="sm" variant="ghost" disabled={busy === l.id} onClick={() => cancel(l.id)}>Cancel</Button>}
                    {l.status === "checked_out" && <Button size="sm" variant="outline" disabled={busy === l.id} onClick={() => renew(l.id)}>Renew</Button>}
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}

      <Input className="mb-4" placeholder="Search title or identifier…" value={search} onChange={e => setSearch(e.target.value)} />

      {filtered.length === 0 ? (
        <Card><CardContent className="py-12 text-center text-muted-foreground">No resources.</CardContent></Card>
      ) : (
        <div className="space-y-2">
          {filtered.map(r => {
            const mine = myLoanFor(r.id);
            const available = avail[r.id] ?? 0;
            return (
              <Card key={r.id}>
                <CardContent className="py-3 flex items-center justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge variant="outline">{r.kind}</Badge>
                      <span className="font-medium truncate">{r.title}</span>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {r.identifier && <>{r.identifier} · </>}
                      {r.location && <>{r.location} · </>}
                      {available} / {r.total_copies} available · {r.loan_days}d loan
                    </div>
                  </div>
                  <div>
                    {mine ? (
                      <Badge>{mine.status}</Badge>
                    ) : (
                      <Button size="sm" disabled={available <= 0 || busy === r.id} onClick={() => reserve(r)}>
                        {available > 0 ? "Reserve" : "Unavailable"}
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
