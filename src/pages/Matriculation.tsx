import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { PageTemplate } from "@/components/layout/PageTemplate";
import { BackButton } from "@/components/layout/BackButton";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollText, Sparkles, Loader2, ShieldCheck, Award } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { issueCertificate } from "@/lib/issueCertificate";
import { CertificateView } from "@/components/certificates/CertificateView";
import { toast } from "sonner";
import confetti from "canvas-confetti";
import { getUserFriendlyError } from "@/lib/errors";
import { onboardingRoutes } from "@/lib/onboardingRoutes";

const OATH = `I commit to learning with integrity, serving with wisdom, and pursuing truth responsibly through ScrollUniversity.`;

interface Identity {
  full_name: string | null;
  student_id_code: string | null;
  institutional_email: string | null;
  cohort_label: string | null;
}

export default function Matriculation() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [identity, setIdentity] = useState<Identity | null>(null);
  const [existing, setExisting] = useState<{ cert_number: string; oath_signed_at: string } | null>(null);
  const [agree, setAgree] = useState(false);
  const [signature, setSignature] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!user?.id) return;
    (async () => {
      const [profileRes, studentRes, matricRes, cohortRes] = await Promise.all([
        supabase.from("profiles").select("full_name").eq("id", user.id).maybeSingle(),
        supabase.from("students").select("id,student_id_code,institutional_email,full_name").eq("user_id", user.id).maybeSingle(),
        supabase.from("matriculation_records").select("cert_number,oath_signed_at,cohort_label").eq("user_id", user.id).maybeSingle(),
        supabase.from("launch_settings").select("cohort_label").order("updated_at", { ascending: false }).limit(1).maybeSingle(),
      ]);

      let student = studentRes.data;
      // Auto-generate student identity if missing
      if (student && !student.student_id_code) {
        try {
          await supabase.rpc("generate_student_identity", { p_student_id: student.id });
          const refreshed = await supabase.from("students").select("student_id_code,institutional_email,full_name").eq("id", student.id).maybeSingle();
          if (refreshed.data) student = { ...student, ...refreshed.data };
        } catch { /* non-fatal */ }
      }

      setIdentity({
        full_name: student?.full_name ?? profileRes.data?.full_name ?? user.email ?? "Student",
        student_id_code: student?.student_id_code ?? null,
        institutional_email: student?.institutional_email ?? null,
        cohort_label: matricRes.data?.cohort_label ?? cohortRes.data?.cohort_label ?? "Inaugural Cohort",
      });
      setExisting(matricRes.data ? { cert_number: matricRes.data.cert_number ?? "", oath_signed_at: matricRes.data.oath_signed_at } : null);
      setSignature(student?.full_name ?? profileRes.data?.full_name ?? "");
      setLoading(false);
    })();
  }, [user?.id, user?.email]);

  async function signOath() {
    if (!user?.id || !identity) return;
    if (!agree) return toast.error("Please affirm the student oath");
    if (!signature.trim()) return toast.error("Type your full name as signature");

    setSubmitting(true);
    try {
      // Ensure user is at least 'admitted' before issuing matriculation cert
      const { data: prof } = await supabase.from("profiles").select("lifecycle_status").eq("id", user.id).maybeSingle();
      if (prof?.lifecycle_status === "applicant") {
        await supabase.rpc("transition_student_status", {
          p_user_id: user.id,
          p_new_status: "admitted",
          p_reason: "Auto-admitted on matriculation oath",
        });
      }

      const cert = await issueCertificate({
        userId: user.id,
        certType: "matriculation",
        programName: "ScrollUniversity Matriculation",
        metadata: { cohort: identity.cohort_label, signed_at: new Date().toISOString() },
      });

      await supabase.from("matriculation_records").upsert({
        user_id: user.id,
        signature_text: signature.trim(),
        cohort_label: identity.cohort_label,
        cert_number: cert.cert_number,
        oath_signed_at: new Date().toISOString(),
      }, { onConflict: "user_id" });

      // Best-effort lifecycle transition (admitted → enrolled)
      try { await supabase.rpc("transition_student_status", { p_user_id: user.id, p_new_status: "enrolled", p_reason: "Matriculation oath signed" }); } catch { /* may already be past this state */ }

      confetti({ particleCount: 200, spread: 110, origin: { y: 0.6 } });
      toast.success("You are now matriculated. Welcome, scholar.");
      setExisting({ cert_number: cert.cert_number, oath_signed_at: new Date().toISOString() });
    } catch (e: any) {
      toast.error("Could not complete matriculation", { description: getUserFriendlyError(e) });
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) return (
    <PageTemplate title="Matriculation" description="Become an official ScrollUniversity scholar">
      <Skeleton className="h-64 w-full rounded-xl" />
    </PageTemplate>
  );

  return (
    <PageTemplate title="Matriculation" description="Become an official ScrollUniversity scholar">
      <div className="max-w-3xl mx-auto space-y-6">
        <BackButton fallbackTo={onboardingRoutes.studentDashboard} />

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 font-serif">
              <ScrollText className="h-5 w-5 text-primary" /> Letter of Acceptance
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <p>Dear <strong>{identity?.full_name}</strong>,</p>
            <p>It is our honor to formally welcome you into ScrollUniversity. Your acceptance is more than enrollment — it is an invitation into a community pursuing truth, wisdom, service, and spirit.</p>
            <p>Sign the oath below to complete matriculation and receive your Matriculation Certificate.</p>
            <div className="grid grid-cols-2 gap-3 pt-2 text-xs">
              <div className="border rounded p-2"><p className="text-muted-foreground">Student ID</p><p className="font-mono font-semibold">{identity?.student_id_code ?? "Will be assigned"}</p></div>
              <div className="border rounded p-2"><p className="text-muted-foreground">Institutional Email</p><p className="font-mono break-all">{identity?.institutional_email ?? "—"}</p></div>
              <div className="border rounded p-2 col-span-2"><p className="text-muted-foreground">Cohort</p><Badge variant="secondary"><Sparkles className="h-3 w-3 mr-1" />{identity?.cohort_label}</Badge></div>
            </div>
          </CardContent>
        </Card>

        {existing ? (
          <>
            <Card className="border-green-500/40 bg-green-500/5">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 font-serif text-green-700">
                  <ShieldCheck className="h-5 w-5" /> Matriculated
                </CardTitle>
              </CardHeader>
              <CardContent className="text-sm space-y-2">
                <p>You signed the ScrollUniversity oath on <strong>{new Date(existing.oath_signed_at).toLocaleDateString()}</strong>.</p>
                <p>Certificate number: <span className="font-mono">{existing.cert_number}</span></p>
                <div className="flex flex-wrap gap-2 pt-1">
                  <Button onClick={() => navigate(onboardingRoutes.studentIdentity)} variant="default">View Student Identity</Button>
                  <Button onClick={() => navigate(onboardingRoutes.catalog)} variant="outline">Enroll in your first course</Button>
                  <Button onClick={() => navigate(onboardingRoutes.studentDashboard)} variant="ghost">Continue to Student Portal</Button>
                </div>
              </CardContent>
            </Card>

            {existing.cert_number && (
              <CertificateView
                certNumber={existing.cert_number}
                studentName={identity?.full_name ?? "Student"}
                studentIdCode={identity?.student_id_code}
                programName="ScrollUniversity Matriculation"
                certTitle={`Matriculated into the ${identity?.cohort_label}`}
                issuedAt={existing.oath_signed_at}
                signatory="Office of the Registrar"
              />
            )}
          </>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 font-serif">
                <Award className="h-5 w-5 text-primary" /> The Student Oath
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <blockquote className="border-l-4 border-primary pl-4 italic text-base font-serif">
                "{OATH}"
              </blockquote>

              <label className="flex items-start gap-3 p-3 rounded-md border bg-secondary/30 cursor-pointer">
                <Checkbox checked={agree} onCheckedChange={(v) => setAgree(!!v)} />
                <span className="text-sm">I affirm this oath freely and bind myself to its standards as a ScrollUniversity scholar.</span>
              </label>

              <div className="space-y-1">
                <label className="text-sm font-medium">Type your full name as signature</label>
                <Input value={signature} onChange={(e) => setSignature(e.target.value)} placeholder="Your full legal name" />
              </div>

              <Button onClick={signOath} disabled={submitting} className="w-full h-11">
                {submitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <ShieldCheck className="h-4 w-4 mr-2" />}
                Sign & Matriculate
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </PageTemplate>
  );
}
