import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface Entry {
  id: string;
  entry_type: string;
  amount: number;
  currency: string;
  memo: string;
  posted_at: string;
}
interface Award {
  id: string;
  kind: string;
  amount: number;
  status: string;
  source: string;
  offered_at: string;
}
interface Hold {
  id: string;
  kind: string;
  status: string;
  reason: string;
  placed_at: string;
}

export default function MyAccountLedger() {
  const { user } = useAuth();
  const [entries, setEntries] = useState<Entry[]>([]);
  const [awards, setAwards] = useState<Award[]>([]);
  const [holds, setHolds] = useState<Hold[]>([]);
  const [balance, setBalance] = useState<number>(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const [e, a, h, b] = await Promise.all([
        supabase.from("student_account_ledger" as any).select("*").eq("student_user_id", user.id).order("posted_at", { ascending: false }).limit(200),
        supabase.from("financial_aid_awards" as any).select("*").eq("student_user_id", user.id).order("offered_at", { ascending: false }),
        supabase.from("account_holds" as any).select("*").eq("student_user_id", user.id).eq("status", "active"),
        supabase.rpc("compute_student_balance" as any, { p_student: user.id }),
      ]);
      setEntries((e.data as any) || []);
      setAwards((a.data as any) || []);
      setHolds((h.data as any) || []);
      setBalance(Number(b.data || 0));
      setLoading(false);
    })();
  }, [user]);

  return (
    <div className="container mx-auto py-8 px-4 max-w-5xl">
      <h1 className="font-display text-3xl text-burgundy mb-2">My Student Account</h1>
      <p className="text-muted-foreground mb-6">
        Immutable ledger of every charge, payment, and aid disbursement. Corrections appear as reversal entries.
      </p>

      {loading ? <p className="text-muted-foreground">Loading…</p> : (
        <>
          <Card className="mb-6">
            <CardHeader><CardTitle>Current Balance</CardTitle></CardHeader>
            <CardContent>
              <div className={`text-4xl font-bold ${balance > 0 ? "text-burgundy" : "text-emerald-700"}`}>
                ${balance.toFixed(2)}
              </div>
              <p className="text-sm text-muted-foreground mt-1">
                {balance > 0 ? "Outstanding balance" : balance < 0 ? "Credit on account" : "Account balanced"}
              </p>
            </CardContent>
          </Card>

          {holds.length > 0 && (
            <Card className="mb-6 border-burgundy">
              <CardHeader><CardTitle className="text-burgundy">Active Holds</CardTitle></CardHeader>
              <CardContent className="space-y-2">
                {holds.map(h => (
                  <div key={h.id} className="flex items-center justify-between text-sm">
                    <span><Badge variant="destructive" className="mr-2">{h.kind}</Badge>{h.reason}</span>
                    <span className="text-muted-foreground text-xs">{new Date(h.placed_at).toLocaleDateString()}</span>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          <Card className="mb-6">
            <CardHeader><CardTitle className="text-base">Financial Aid Awards</CardTitle></CardHeader>
            <CardContent>
              {awards.length === 0 ? <p className="text-muted-foreground text-sm">No awards on record.</p> : (
                <div className="space-y-2">
                  {awards.map(a => (
                    <div key={a.id} className="flex items-center justify-between border-b py-2 text-sm">
                      <div>
                        <Badge variant="outline" className="mr-2">{a.kind}</Badge>
                        <span className="text-muted-foreground">{a.source}</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <Badge>{a.status}</Badge>
                        <span className="font-semibold">${Number(a.amount).toFixed(2)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-base">Ledger History</CardTitle></CardHeader>
            <CardContent>
              {entries.length === 0 ? <p className="text-muted-foreground text-sm">No ledger entries yet.</p> : (
                <div className="space-y-1">
                  {entries.map(e => {
                    const isCharge = ["tuition_charge", "fee_charge"].includes(e.entry_type);
                    return (
                      <div key={e.id} className="flex items-center justify-between border-b py-2 text-sm">
                        <div className="flex-1">
                          <Badge variant="outline" className="mr-2 text-xs">{e.entry_type}</Badge>
                          <span>{e.memo}</span>
                          <div className="text-xs text-muted-foreground">{new Date(e.posted_at).toLocaleString()}</div>
                        </div>
                        <span className={`font-mono font-semibold ${isCharge ? "text-burgundy" : "text-emerald-700"}`}>
                          {isCharge ? "+" : "−"}${Number(e.amount).toFixed(2)}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
