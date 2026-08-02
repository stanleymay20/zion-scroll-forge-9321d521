import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { PageTemplate } from "@/components/layout/PageTemplate";
import { BackButton } from "@/components/layout/BackButton";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Checkbox } from "@/components/ui/checkbox";
import {
  PlayCircle, Compass, Sparkles, GraduationCap, Bot, Map,
  Users, ShieldCheck, BookOpenCheck, ArrowRight, Loader2, Check
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { getUserFriendlyError } from "@/lib/errors";
import { onboardingRoutes } from "@/lib/onboardingRoutes";

const STEPS = [
  { key: "welcome",       title: "Welcome to ScrollUniversity",        icon: PlayCircle,   body: "A short founder welcome. ScrollUniversity is a true digital institution — not a course store. Take a breath. You're stepping into a community." },
  { key: "mission",       title: "Our Mission & Four Pillars",          icon: Compass,      body: "Truth, Wisdom, Service, Spirit. Every program here is designed to form not just your skills but your character." },
  { key: "platform",      title: "Platform Walkthrough",                 icon: Sparkles,     body: "Your dashboard is mission control: courses, AI tutors, community, certificates, and your degree progress all live one tap away." },
  { key: "expectations",  title: "Academic Expectations",                icon: GraduationCap,body: "Show up. Submit on time. Cite sources. Engage with peers. ScrollUniversity grades are earned — and they mean something." },
  { key: "ai_tutors",     title: "Your AI Tutors",                       icon: Bot,          body: "Each faculty has dedicated AI tutors trained on ScrollOS curriculum. Use them like office hours — they remember context." },
  { key: "roadmap",       title: "Your Degree Roadmap",                  icon: Map,          body: "Certificate → Diploma → Bachelor's → Master's → Doctorate → Exousia. Every course you complete moves you up the ladder." },
  { key: "community",     title: "Community Guidelines",                 icon: Users,        body: "Speak with respect. Disagree without contempt. Protect privacy. Report abuse. We govern this house together." },
  { key: "suyas",         title: "SUYAS Progression",                    icon: ShieldCheck,  body: "SUYAS is our governance ledger. Every grade, every promotion, every credential is auditable and immutable. No backroom decisions." },
  { key: "integrity",     title: "Academic Integrity Pledge",            icon: BookOpenCheck,body: "I commit to learning with integrity, citing my sources honestly, and producing work that is mine.", isPledge: true },
];

export default function Orientation() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [completed, setCompleted] = useState<Set<string>>(new Set());
  const [current, setCurrent] = useState(0);
  const [pledge, setPledge] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!user?.id) return;
    (async () => {
      const { data } = await supabase
        .from("orientation_progress").select("step").eq("user_id", user.id);
      const set = new Set((data ?? []).map((r) => r.step));
      setCompleted(set);
      const firstUndone = STEPS.findIndex((s) => !set.has(s.key));
      if (firstUndone >= 0) setCurrent(firstUndone);
    })();
  }, [user?.id]);

  const step = STEPS[current];
  const Icon = step.icon;
  const progress = (completed.size / STEPS.length) * 100;
  const isLast = current === STEPS.length - 1;

  async function markComplete() {
    if (!user?.id) return;
    if (step.isPledge && !pledge) {
      toast.error("Please affirm the integrity pledge to continue.");
      return;
    }
    setSubmitting(true);
    try {
      await supabase.from("orientation_progress").upsert({
        user_id: user.id, step: step.key,
        payload: step.isPledge ? { pledge_signed: true } : {},
      }, { onConflict: "user_id,step" });

      const next = new Set(completed); next.add(step.key); setCompleted(next);

      if (isLast) {
        toast.success("Orientation complete. Welcome aboard.");
        navigate(onboardingRoutes.matriculation);
      } else {
        setCurrent(current + 1);
      }
    } catch (e: any) {
      toast.error("Could not save progress", { description: getUserFriendlyError(e) });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <PageTemplate title="Orientation" description="Become a ScrollUniversity student">
      <div className="max-w-2xl mx-auto space-y-5">
        <BackButton fallbackTo={onboardingRoutes.studentDashboard} />
        <div>
          <div className="flex justify-between text-xs text-muted-foreground mb-1">
            <span>Step {current + 1} of {STEPS.length}</span>
            <span>{Math.round(progress)}% complete</span>
          </div>
          <Progress value={progress} className="h-2" />
        </div>

        <Card className="overflow-hidden">
          <CardHeader className="bg-primary/5 border-b">
            <CardTitle className="flex items-center gap-3 font-serif">
              <Icon className="h-6 w-6 text-primary" />
              {step.title}
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6 space-y-4">
            <p className="text-base leading-relaxed">{step.body}</p>

            {step.isPledge && (
              <label className="flex items-start gap-3 p-3 rounded-md border bg-secondary/30 cursor-pointer">
                <Checkbox checked={pledge} onCheckedChange={(v) => setPledge(!!v)} />
                <span className="text-sm">
                  I affirm this pledge with my signature on file and accept the ScrollUniversity Honor Code.
                </span>
              </label>
            )}

            <div className="flex items-center justify-between gap-3 pt-2">
              <Button variant="ghost" disabled={current === 0} onClick={() => setCurrent(Math.max(0, current - 1))}>
                Back
              </Button>
              <Button onClick={markComplete} disabled={submitting} className="min-w-[140px]">
                {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> :
                  isLast ? (<>Finish <Check className="h-4 w-4 ml-1" /></>) :
                  (<>Continue <ArrowRight className="h-4 w-4 ml-1" /></>)
                }
              </Button>
            </div>
          </CardContent>
        </Card>

        <div className="flex flex-wrap gap-1.5">
          {STEPS.map((s, i) => (
            <button
              key={s.key}
              onClick={() => setCurrent(i)}
              className={`text-[10px] px-2 py-0.5 rounded-full border transition-colors ${
                completed.has(s.key)
                  ? "bg-primary/10 text-primary border-primary/30"
                  : i === current
                  ? "bg-accent text-accent-foreground border-accent"
                  : "bg-muted text-muted-foreground border-transparent"
              }`}
            >
              {i + 1}. {s.title}
            </button>
          ))}
        </div>
      </div>
    </PageTemplate>
  );
}
