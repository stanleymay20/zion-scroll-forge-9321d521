import { useEffect, useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { PageTemplate } from "@/components/layout/PageTemplate";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollText, Sparkles, Loader2, ShieldCheck, Award, ShieldAlert } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useStudentLifecycleSnapshot } from "@/hooks/useStudentLifecycleSnapshot";
import { canonicalLifecycleRoutes, getRequiredStudentOnboardingRoute } from "@/lib/studentLifecycle";
import { toast } from "sonner";
import { getUserFriendlyError } from "@/lib/errors";

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
  const queryClient = useQueryClient();
  const lifecycle = useStudentLifecycleSnapshot();
  const [loading, setLoading] = useState(true);
  const [identity, setIdentity] = useState<Identity | null>(null);
  const [existingSignature, setExistingSignature] = useState<string | null>(null);
  const [agree, setAgree] = useState(false);
  const [signature, setSignature] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!user?.id) return;
    (async () => {
      const [profileRes, studentRes, matricRes, cohortRes] = await Promise.all([
        supabase.from("profiles").select("full_name").eq("id", user.id).maybeSingle(),
        supabase.from("students").select("student_id_code,institutional_email,full_name").eq("user_id", user.id).maybeSingle(),
        supabase.from("matriculation_records").select("signature_text,cohort_label").eq("user_id", user.id).maybeSingle(),
        supabase.from("launch_settings").select("cohort_label").order("updated_at", { ascending: false }).limit(1).maybeSingle(),
      ]);
      const error = profileRes.error || studentRes.error || matricRes.error || cohortRes.error;
      if (error) {
        toast.error("Could not verify matriculation identity", { description: error.message });
        setLoading(false);
        return;
      }
      const student = studentRes.data;
      const existing = matricRes.data?.signature_text ?? null;
      setExistingSignature(existing);
      setIdentity({
        full_name: student?.full_name ?? profileRes.data?.full_name ?? user.email ?? "Student",
        student_id_code: student?.student_id_code ?? null,
        institutional_email: student?.institutional_email ?? null,
        cohort_label: matricRes.data?.cohort_label ?? cohortRes.data?.cohort_label ?? "Current Cohort",
      });
      setSignature(existing ?? student?.full_name ?? profileRes.data?.full_name ?? "");
      setAgree(!!existing);
      setLoading(false);
    })();
  }, [user?.id, user?.email]);

  async function completeMatriculation() {
    if (!user?.id || !identity) return;
    if (!agree && !existingSignature) return toast.error("Please affirm the student oath");
    if (!signature.trim()) return toast.error("Type your full name as signature");

    setSubmitting(true);
    try {
      const { data, error } = await (supabase as any).rpc("complete_student_matriculation", {
        p_signature_text: signature.trim(),
        p_cohort_label: identity.cohort_label,
      });
      if (error) throw error;
      if (data?.success === false) throw new Error(data?.error || "Matriculation was not authorised");
      await queryClient.invalidateQueries({ queryKey: ["student-lifecycle-snapshot", user.id] });
      toast.success("Matriculation completed. Continue with your learning profile.");
      navigate(canonicalLifecycleRoutes.learningProfile, { replace: true });
    } catch (e: any) {
      toast.error("Could not complete matriculation", { description: getUserFriendlyError(e) });
    } finally {
      setSubmitting(false);
    }
  }

  if (lifecycle.authLoading || lifecycle.isLoading || loading) {
    return <PageTemplate title="Matriculation" description="Complete the governed student oath"><Skeleton className="h-64 w-full rounded-xl" /></PageTemplate>;
  }
  if (!lifecycle.authenticated) return <Navigate to={canonicalLifecycleRoutes.signIn} replace />;
  if (lifecycle.isError || !lifecycle.data) {
    return <div className="min-h-[50vh] flex items-center justify-center p-6"><div className="max-w-md text-center space-y-3"><ShieldAlert className="h-8 w-8 mx-auto text-destructive" /><h2 className="font-serif text-2xl">Matriculation authority could not be verified</h2><p className="text-sm text-muted-foreground">This stage remains closed until lifecycle evidence can be verified.</p></div></div>;
  }
  const requiredRoute = getRequiredStudentOnboardingRoute(lifecycle.data);
  if (requiredRoute !== canonicalLifecycleRoutes.matriculation) {
    return <Navigate to={requiredRoute || canonicalLifecycleRoutes.studentDashboard} replace />;
  }

  return (
    <PageTemplate title="Matriculation" description="Complete the governed student oath">
      <div className="max-w-3xl mx-auto space-y-6">
        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2 font-serif"><ScrollText className="h-5 w-5 text-primary" />Admitted Student Identity</CardTitle></CardHeader>
          <CardContent className="space-y-3 text-sm">
            <p>Dear <strong>{identity?.full_name}</strong>, your admissions decision has placed you in the admitted lifecycle state. Matriculation does not create admission; it completes the next governed onboarding stage.</p>
            <div className="grid grid-cols-2 gap-3 pt-2 text-xs">
              <div className="border rounded p-2"><p className="text-muted-foreground">Student ID</p><p className="font-mono font-semibold">{identity?.student_id_code ?? "Assigned by Admissions"}</p></div>
              <div className="border rounded p-2"><p className="text-muted-foreground">Institutional Email</p><p className="font-mono break-all">{identity?.institutional_email ?? "—"}</p></div>
              <div className="border rounded p-2 col-span-2"><p className="text-muted-foreground">Cohort</p><Badge variant="secondary"><Sparkles className="h-3 w-3 mr-1" />{identity?.cohort_label}</Badge></div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2 font-serif"><Award className="h-5 w-5 text-primary" />The Student Oath</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <blockquote className="border-l-4 border-primary pl-4 italic text-base font-serif">“{OATH}”</blockquote>
            <label className="flex items-start gap-3 p-3 rounded-md border bg-secondary/30 cursor-pointer">
              <Checkbox checked={agree} onCheckedChange={(v) => setAgree(!!v)} />
              <span className="text-sm">I affirm this oath freely and bind myself to its standards as a ScrollUniversity scholar.</span>
            </label>
            <div className="space-y-1"><label className="text-sm font-medium">Type your full name as signature</label><Input value={signature} onChange={(e) => setSignature(e.target.value)} placeholder="Your full legal name" /></div>
            {existingSignature && <p className="text-xs text-muted-foreground">A prior matriculation signature exists. Completing this step will verify the governed lifecycle transition rather than minting a new credential.</p>}
            <Button onClick={completeMatriculation} disabled={submitting || !signature.trim()} className="w-full h-11">
              {submitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <ShieldCheck className="h-4 w-4 mr-2" />}
              {existingSignature ? "Finalize Governed Matriculation" : "Sign & Matriculate"}
            </Button>
          </CardContent>
        </Card>
      </div>
    </PageTemplate>
  );
}
