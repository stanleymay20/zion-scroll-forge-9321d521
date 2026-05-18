import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

interface Cred {
  id: string;
  kind: string;
  title: string;
  program_ref: string | null;
  issued_at: string;
  effective_on: string;
  expires_on: string | null;
  verification_token: string;
  seal_hash: string;
  status: string;
  revoke_reason: string | null;
}

export default function MyCredentials() {
  const [loading, setLoading] = useState(true);
  const [creds, setCreds] = useState<Cred[]>([]);

  useEffect(() => {
    (async () => {
      const { data: u } = await supabase.auth.getUser();
      const uid = u.user?.id;
      if (!uid) { setLoading(false); return; }
      const { data } = await supabase.from("issued_credentials").select("*")
        .eq("student_id", uid).order("issued_at", { ascending: false });
      setCreds((data as Cred[]) || []);
      setLoading(false);
    })();
  }, []);

  const copy = (t: string) => {
    navigator.clipboard.writeText(t);
    toast.success("Verification token copied");
  };

  if (loading) return <div className="container mx-auto py-8"><Skeleton className="h-64 w-full" /></div>;

  return (
    <div className="container mx-auto py-8 space-y-6">
      <header>
        <h1 className="font-serif text-4xl">My Credentials</h1>
        <p className="text-muted-foreground">Every credential the institution has formally issued to you. Each carries a tamper-evident seal and a public verification token.</p>
      </header>

      {creds.length === 0 ? (
        <Card><CardContent className="p-6 text-muted-foreground">No credentials have been issued to you yet.</CardContent></Card>
      ) : creds.map(c => (
        <Card key={c.id}>
          <CardHeader>
            <CardTitle className="flex items-center gap-3">
              {c.title}
              <Badge variant="outline" className="capitalize">{c.kind}</Badge>
              <Badge variant={c.status === "issued" ? "default" : "destructive"} className="capitalize">{c.status}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div>Program: <strong>{c.program_ref ?? "—"}</strong></div>
            <div>Issued: {new Date(c.issued_at).toLocaleString()}</div>
            <div>Effective: {c.effective_on}{c.expires_on ? ` · Expires ${c.expires_on}` : ""}</div>
            <div className="font-mono text-xs break-all">Token: {c.verification_token}</div>
            <div className="font-mono text-xs break-all text-muted-foreground">Seal: {c.seal_hash}</div>
            {c.revoke_reason && <div className="text-destructive">Revocation: {c.revoke_reason}</div>}
            <div className="flex gap-2 pt-2">
              <Button size="sm" variant="outline" onClick={() => copy(c.verification_token)}>Copy token</Button>
              <Button size="sm" variant="outline" asChild>
                <a href={`/verify-credential?token=${c.verification_token}`} target="_blank" rel="noreferrer">Open public verifier</a>
              </Button>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
