import { Link } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Compass, ScrollText, ArrowRight, IdCard, BookOpen, Brain, Loader2, ShieldAlert } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { LifecycleStepper } from "@/components/lifecycle/LifecycleStepper";
import { useStudentLifecycleSnapshot } from "@/hooks/useStudentLifecycleSnapshot";
import { canonicalLifecycleRoutes, getRequiredStudentOnboardingRoute } from "@/lib/studentLifecycle";

export function LifecycleBanner() {
  const { user } = useAuth();
  const lifecycle = useStudentLifecycleSnapshot();
  if (!user) return null;

  if (lifecycle.authLoading || lifecycle.isLoading) {
    return <Card className="border-primary/20"><CardContent className="p-4 flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Verifying your student journey…</CardContent></Card>;
  }
  if (lifecycle.isError || !lifecycle.data) {
    return <Card className="border-destructive/30"><CardContent className="p-4 flex items-start gap-2 text-sm"><ShieldAlert className="h-4 w-4 mt-0.5 text-destructive" /><span>Student lifecycle verification is unavailable. Academic activation remains closed until verification succeeds.</span></CardContent></Card>;
  }

  const { matriculated } = lifecycle.data;
  const requiredRoute = getRequiredStudentOnboardingRoute(lifecycle.data);
  let cta: { to: string; icon: typeof Compass; label: string; sub: string } | null = null;

  if (requiredRoute === canonicalLifecycleRoutes.orientation) {
    cta = { to: requiredRoute, icon: Compass, label: "Complete Orientation", sub: `${lifecycle.data.orientationStepsCompleted}/9 steps complete — orientation is required before matriculation` };
  } else if (requiredRoute === canonicalLifecycleRoutes.matriculation) {
    cta = { to: requiredRoute, icon: ScrollText, label: "Complete Matriculation", sub: "Orientation is complete. Matriculation is the next governed milestone." };
  } else if (requiredRoute === canonicalLifecycleRoutes.learningProfile) {
    cta = { to: requiredRoute, icon: Brain, label: "Create Your Learning Profile", sub: "Set your learning preferences before entering registration and the academic portal." };
  } else if (requiredRoute === canonicalLifecycleRoutes.registration) {
    cta = { to: requiredRoute, icon: BookOpen, label: "Register for Courses", sub: "Your onboarding milestones are complete. Register through the governed registration workflow." };
  }

  if (!cta) {
    return (
      <Card className="bg-gradient-to-r from-primary/5 to-accent/5 border-primary/20">
        <CardContent className="p-3 sm:p-4 space-y-3">
          <div className="flex items-center justify-between gap-2">
            <p className="text-xs uppercase tracking-wider text-muted-foreground">Your Journey</p>
            {matriculated && <Button asChild variant="ghost" size="sm" className="h-7 text-xs"><Link to={canonicalLifecycleRoutes.studentIdentity}><IdCard className="h-3.5 w-3.5 mr-1" /> Identity</Link></Button>}
          </div>
          <LifecycleStepper snapshot={lifecycle.data} />
        </CardContent>
      </Card>
    );
  }

  const Icon = cta.icon;
  return (
    <Card className="bg-gradient-to-r from-primary/10 via-primary/5 to-accent/5 border-primary/30">
      <CardContent className="p-4 sm:p-5 space-y-3">
        <div className="flex items-start gap-3">
          <div className="p-2 rounded-full bg-primary/15 shrink-0"><Icon className="h-5 w-5 text-primary" /></div>
          <div className="flex-1 min-w-0"><h3 className="font-serif text-base sm:text-lg text-primary">{cta.label}</h3><p className="text-xs sm:text-sm text-muted-foreground mt-0.5">{cta.sub}</p></div>
          <Button asChild size="sm" className="shrink-0"><Link to={cta.to}>Continue <ArrowRight className="h-4 w-4 ml-1" /></Link></Button>
        </div>
        <LifecycleStepper snapshot={lifecycle.data} />
      </CardContent>
    </Card>
  );
}
