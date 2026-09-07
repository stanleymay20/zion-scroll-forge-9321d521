import { ArrowRight, BookOpen, Compass, FileText, Target } from "lucide-react";
import { AuthAwareLink } from "@/components/auth/AuthAwareLink";
import { onboardingRoutes } from "@/lib/onboardingRoutes";

const steps = [
  {
    icon: Compass,
    label: "Discover",
    desc: "Review programmes, courses, academic status, and the learning model before you decide.",
  },
  {
    icon: FileText,
    label: "Apply",
    desc: "Create an account and move through the application pathway with clear next steps.",
  },
  {
    icon: Target,
    label: "Onboard",
    desc: "Set learning goals, complete orientation, and understand the expectations of your study pathway.",
  },
  {
    icon: BookOpen,
    label: "Learn",
    desc: "Work through published learning content, assessments, faculty guidance, and AI-supported study tools.",
  },
  {
    icon: ArrowRight,
    label: "Progress",
    desc: "Track your academic record and progress against governed requirements and learning evidence.",
  },
];

export const JourneySection = () => {
  return (
    <section className="px-4 py-20 sm:py-28">
      <div className="container mx-auto max-w-7xl">
        <div className="mb-12 grid gap-6 lg:grid-cols-[0.8fr_1.2fr] lg:items-end sm:mb-16">
          <div>
            <p className="mb-3 text-xs font-semibold uppercase tracking-[0.22em] text-accent">A clearer student journey</p>
            <h2 className="font-serif text-3xl font-semibold leading-tight text-foreground sm:text-4xl md:text-5xl">
              Know where you are, what comes next, and why it matters.
            </h2>
          </div>
          <div className="max-w-xl lg:justify-self-end">
            <p className="mb-5 text-sm leading-7 text-muted-foreground sm:text-base">
              The public experience now prioritizes the tasks prospective and current students actually need: discover, apply, onboard, learn, and track progress.
            </p>
            <AuthAwareLink
              to={onboardingRoutes.catalog}
              className="inline-flex items-center gap-2 text-sm font-semibold text-primary transition-colors hover:text-primary/75"
            >
              Start with the catalogue
              <ArrowRight className="h-4 w-4" />
            </AuthAwareLink>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-5">
          {steps.map((step, index) => {
            const Icon = step.icon;
            return (
              <article
                key={step.label}
                className="animate-fade-up relative rounded-[1.4rem] border border-border/60 bg-card p-5 shadow-sm sm:p-6"
                style={{ animationDelay: `${index * 0.06}s` }}
              >
                <div className="mb-8 flex items-center justify-between">
                  <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-primary/10">
                    <Icon className="h-5 w-5 text-primary" />
                  </span>
                  <span className="text-xs font-semibold tracking-[0.18em] text-muted-foreground/60">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                </div>
                <h3 className="mb-2 font-serif text-xl font-semibold text-foreground">{step.label}</h3>
                <p className="text-sm leading-6 text-muted-foreground">{step.desc}</p>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
};
