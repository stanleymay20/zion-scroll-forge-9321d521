import { Check, Circle } from "lucide-react";
import { cn } from "@/lib/utils";
import { REQUIRED_ORIENTATION_STEPS, type StudentLifecycleSnapshot } from "@/lib/studentLifecycle";

interface Step { key: string; label: string; done: boolean; here: boolean; }

export function LifecycleStepper({ snapshot }: { snapshot: StudentLifecycleSnapshot }) {
  const status = snapshot.lifecycleStatus;
  const postApplicant = !!status && status !== "applicant";
  const postAdmitted = !!status && !["applicant", "admitted"].includes(status);
  const postEnrolled = !!status && ["active", "on_leave", "graduated", "alumni"].includes(status);
  const graduated = status === "graduated" || status === "alumni";
  const alumni = status === "alumni";
  const orientationDone = snapshot.orientationStepsCompleted >= REQUIRED_ORIENTATION_STEPS;
  const registrationDone = snapshot.enrollmentCount > 0;

  const steps: Step[] = [
    { key: "application", label: "Application", done: postApplicant, here: status === "applicant" || !status },
    { key: "admitted", label: "Admitted", done: postAdmitted, here: status === "admitted" && !orientationDone },
    { key: "orientation", label: "Orientation", done: orientationDone, here: postApplicant && !orientationDone },
    { key: "matriculation", label: "Matriculation", done: snapshot.matriculated, here: orientationDone && !snapshot.matriculated },
    { key: "learning-profile", label: "Learning Profile", done: snapshot.learningProfileComplete, here: snapshot.matriculated && !snapshot.learningProfileComplete },
    { key: "registration", label: "Registration", done: registrationDone, here: snapshot.learningProfileComplete && !registrationDone },
    { key: "active", label: "Active Learning", done: graduated, here: postEnrolled && registrationDone && !graduated },
    { key: "graduated", label: "Graduated", done: alumni, here: status === "graduated" },
    { key: "alumni", label: "Alumni", done: false, here: alumni },
  ];

  return (
    <div className="overflow-x-auto -mx-2 px-2">
      <ol className="flex items-center gap-1 min-w-max">
        {steps.map((step, i) => (
          <li key={step.key} className="flex items-center gap-1">
            <div className={cn(
              "flex items-center gap-1.5 px-2 py-1 rounded-full text-xs whitespace-nowrap",
              step.done && "bg-primary/10 text-primary",
              step.here && "bg-accent text-accent-foreground font-semibold ring-2 ring-accent/40",
              !step.done && !step.here && "bg-muted text-muted-foreground",
            )}>
              {step.done ? <Check className="h-3 w-3" /> : <Circle className="h-3 w-3" />}
              {step.label}
            </div>
            {i < steps.length - 1 && <span className="w-3 h-px bg-border" />}
          </li>
        ))}
      </ol>
    </div>
  );
}
