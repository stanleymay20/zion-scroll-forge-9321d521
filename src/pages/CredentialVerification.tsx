import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

interface VerifyRow {
  verification_token: string;
  kind: string;
  title: string;
  program_ref: string | null;
  issued_at: string;
  effective_on: string;
  expires_on: string | null;
  status: string;
  seal_hash: string;
  revoked: boolean;
  revoke_reason: string | null;
}

export default function CredentialVerification() {
  const [params] = useSearchParams();
  const [token, setToken] = useState(params.get("token") ?? "");
  const [org, setOrg] = useState("");
  const [result, setResult] = useState<VerifyRow | null | "missing">(null);
  const [loading, setLoading] = useState(false);

  const verify = async () => {
    if (!token.trim()) return;
    setLoading(true);
    setResult(null);
    const { data } = await supabase.rpc("verify_issued_credential", {
      token: token.trim(),
      verifier_org: org.trim() || null,
    });
    const row = Array.isArray(data) ? data[0] : null;
    setResult(row ? (row as VerifyRow) : "missing");
    setLoading(false);
  };

  useEffect(() => { if (params.get("token")) verify(); /* eslint-disable-next-line */ }, []);

  return (
    <div className="container mx-auto py-12 max-w-2xl">
      <h1 className="font-serif text-4xl mb-2">Verify a ScrollUniversity Credential</h1>
      <p className="text-muted-foreground mb-6">
        Enter the verification token printed on the credential. Verification fails closed: unknown tokens return
        "Not on file" rather than estimates, and every check is logged for audit.
      </p>
      <Card>
        <CardHeader><CardTitle>Verification</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div>
            <label className="text-sm text-muted-foreground">Verification token</label>
            <Input value={token} onChange={e => setToken(e.target.value)} className="font-mono" />
          </div>
          <div>
            <label className="text-sm text-muted-foreground">Your organization (optional, for audit)</label>
            <Input value={org} onChange={e => setOrg(e.target.value)} placeholder="e.g. Acme HR" />
          </div>
          <Button onClick={verify} disabled={loading || !token.trim()}>Verify</Button>

          {result === "missing" && (
            <div className="border rounded p-4">
              <Badge variant="destructive">Not on file</Badge>
              <p className="mt-2 text-sm">No issued credential matches this token. The institution makes no claim about authenticity.</p>
            </div>
          )}

          {result && result !== "missing" && (
            <div className="border rounded p-4 space-y-2">
              <div className="flex items-center gap-2 flex-wrap">
                <Badge className="capitalize">{result.kind}</Badge>
                {result.revoked
                  ? <Badge variant="destructive">Revoked</Badge>
                  : result.status === "expired"
                    ? <Badge variant="secondary">Expired</Badge>
                    : <Badge>Valid</Badge>}
              </div>
              <div className="font-serif text-xl">{result.title}</div>
              {result.program_ref && <div className="text-sm">Program: <strong>{result.program_ref}</strong></div>}
              <div className="text-sm">Issued: {new Date(result.issued_at).toLocaleString()}</div>
              <div className="text-sm">Effective: {result.effective_on}{result.expires_on ? ` · Expires ${result.expires_on}` : ""}</div>
              <div className="font-mono text-xs break-all text-muted-foreground">Seal: {result.seal_hash}</div>
              {result.revoked && result.revoke_reason && (
                <div className="text-sm text-destructive">Revocation reason: {result.revoke_reason}</div>
              )}
              <p className="text-xs text-muted-foreground">
                Student-identifying data is intentionally omitted from public verification.
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
