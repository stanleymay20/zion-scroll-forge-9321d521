import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

interface VerifyResult {
  verification_code: string;
  kind: string;
  issued_at: string;
  total_credit_hours: number;
  gpa: number | null;
  revoked: boolean;
  revoke_reason: string | null;
}

export default function TranscriptVerification() {
  const [code, setCode] = useState("");
  const [result, setResult] = useState<VerifyResult | null | "missing">(null);
  const [loading, setLoading] = useState(false);

  const verify = async () => {
    if (!code.trim()) return;
    setLoading(true);
    setResult(null);
    const { data } = await supabase.rpc("verify_official_transcript", { code: code.trim() });
    const row = Array.isArray(data) ? data[0] : null;
    setResult(row ? (row as VerifyResult) : "missing");
    setLoading(false);
  };

  return (
    <div className="container mx-auto py-12 max-w-2xl">
      <h1 className="font-serif text-4xl mb-2">Verify a Transcript</h1>
      <p className="text-muted-foreground mb-6">
        Enter the verification code printed on an official ScrollUniversity transcript. The system fails closed:
        unknown codes return "Not on file" rather than estimates.
      </p>
      <Card>
        <CardHeader><CardTitle>Verification</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Input value={code} onChange={e => setCode(e.target.value)} placeholder="Transcript code" className="font-mono" />
            <Button onClick={verify} disabled={loading || !code.trim()}>Verify</Button>
          </div>

          {result === "missing" && (
            <div className="border rounded p-4">
              <Badge variant="destructive">Not on file</Badge>
              <p className="mt-2 text-sm">No issued transcript matches this code. We cannot estimate or infer authenticity.</p>
            </div>
          )}

          {result && result !== "missing" && (
            <div className="border rounded p-4 space-y-2">
              <div className="flex items-center gap-2">
                <Badge>{result.kind}</Badge>
                {result.revoked
                  ? <Badge variant="destructive">Revoked</Badge>
                  : <Badge variant="default">Valid</Badge>}
              </div>
              <div className="text-sm">Issued {new Date(result.issued_at).toLocaleString()}</div>
              <div className="text-sm">GPA: <strong>{result.gpa ?? "—"}</strong></div>
              <div className="text-sm">Total credit hours: <strong>{result.total_credit_hours}</strong></div>
              {result.revoked && result.revoke_reason && (
                <div className="text-sm text-destructive">Revocation reason: {result.revoke_reason}</div>
              )}
              <p className="text-xs text-muted-foreground">
                Student-identifying data is intentionally omitted from public verification. Recipients should
                cross-reference the printed transcript using this code.
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
