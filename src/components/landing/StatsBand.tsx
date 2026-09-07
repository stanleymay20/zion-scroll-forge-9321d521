import { AuthAwareLink } from "@/components/auth/AuthAwareLink";
import { BookOpen, GraduationCap, ShieldCheck, UserRound } from "lucide-react";

const pathways = [
  {
    icon: GraduationCap,
    eyebrow: "Prospective students",
    title: "Explore programmes",
    href: "/degrees",
  },
  {
    icon: BookOpen,
    eyebrow: "Find your subject",
    title: "Browse the catalogue",
    href: "/catalog",
  },
  {
    icon: ShieldCheck,
    eyebrow: "Review the evidence",
    title: "Academic trust & status",
    href: "/academic-trust",
  },
  {
    icon: UserRound,
    eyebrow: "Already enrolled",
    title: "Student dashboard",
    href: "/student/dashboard",
  },
];

export const StatsBand = () => {
  return (
    <section className="border-y border-border/60 bg-primary px-4 py-4 text-primary-foreground sm:py-5">
      <div className="container mx-auto max-w-7xl">
        <div className="grid gap-px overflow-hidden rounded-2xl border border-primary-foreground/10 bg-primary-foreground/10 sm:grid-cols-2 lg:grid-cols-4">
          {pathways.map((pathway) => {
            const Icon = pathway.icon;
            return (
              <AuthAwareLink
                key={pathway.title}
                to={pathway.href}
                className="group flex items-center gap-4 bg-primary px-5 py-4 transition-colors hover:bg-primary-foreground/[0.06] sm:px-6"
              >
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary-foreground/10">
                  <Icon className="h-5 w-5 text-accent" />
                </span>
                <span className="min-w-0">
                  <span className="block text-[10px] font-semibold uppercase tracking-[0.18em] text-primary-foreground/55">
                    {pathway.eyebrow}
                  </span>
                  <span className="mt-0.5 block truncate text-sm font-semibold text-primary-foreground transition-transform group-hover:translate-x-0.5">
                    {pathway.title}
                  </span>
                </span>
              </AuthAwareLink>
            );
          })}
        </div>
      </div>
    </section>
  );
};
