import { AuthAwareLink } from "@/components/auth/AuthAwareLink";
import {
  ArrowUpRight,
  Bot,
  BookOpenCheck,
  Heart,
  ShieldCheck,
  Users,
  Verification,
} from "lucide-react";

const capabilities = [
  {
    icon: Bot,
    title: "AI-supported learning",
    desc: "Use tutor conversations, guided study tools, and AI assistance alongside governed course content and human academic oversight.",
    href: "/ai-tutors",
    className: "lg:col-span-2",
    tone: "primary" as const,
  },
  {
    icon: ShieldCheck,
    title: "Academic trust by design",
    desc: "Review how content publication, assessments, learning evidence, academic status, and governance controls are handled.",
    href: "/academic-trust",
    className: "lg:col-span-2",
    tone: "accent" as const,
  },
  {
    icon: BookOpenCheck,
    title: "Structured course pathways",
    desc: "Browse the current catalogue and move from programme discovery into published learning content and assessments.",
    href: "/catalog",
    className: "lg:col-span-1",
    tone: "primary" as const,
  },
  {
    icon: Verification,
    title: "Credential verification",
    desc: "Public verification tooling makes it possible to check issued credential records when those records exist.",
    href: "/verify",
    className: "lg:col-span-1",
    tone: "accent" as const,
  },
  {
    icon: Heart,
    title: "Spiritual formation",
    desc: "Prayer, reflection, Scripture practice, and formation tools sit alongside academic learning rather than outside it.",
    href: "/prayer-journal",
    className: "lg:col-span-1",
    tone: "primary" as const,
  },
  {
    icon: Users,
    title: "Collaborative learning",
    desc: "Community spaces, study groups, faculty interaction, and peer learning support the individual study journey.",
    href: "/community",
    className: "lg:col-span-1",
    tone: "accent" as const,
  },
];

export const CapabilitiesSection = () => {
  return (
    <section id="experience" className="relative overflow-hidden px-4 py-20 sm:py-28">
      <div className="pointer-events-none absolute left-1/2 top-12 h-72 w-[720px] -translate-x-1/2 rounded-full bg-accent/5 blur-3xl" />
      <div className="container relative mx-auto max-w-7xl">
        <div className="mb-12 grid gap-6 lg:grid-cols-[0.8fr_1.2fr] lg:items-end sm:mb-16">
          <div>
            <p className="mb-3 text-xs font-semibold uppercase tracking-[0.22em] text-accent">The learning experience</p>
            <h2 className="max-w-xl font-serif text-3xl font-semibold leading-tight text-foreground sm:text-4xl md:text-5xl">
              Technology should deepen learning, not distract from it.
            </h2>
          </div>
          <p className="max-w-2xl text-sm leading-7 text-muted-foreground sm:text-base lg:justify-self-end">
            ScrollUniversity combines digital learning tools with academic governance, visible trust controls, and Christ-centered formation. The interface is designed to help students know what to do next and understand what evidence supports their progress.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {capabilities.map((capability, index) => {
            const Icon = capability.icon;
            const accent = capability.tone === "accent";
            return (
              <AuthAwareLink
                key={capability.title}
                to={capability.href}
                className={`animate-fade-up group block ${capability.className}`}
                style={{ animationDelay: `${index * 0.05}s` }}
              >
                <article className="relative h-full min-h-[230px] overflow-hidden rounded-[1.5rem] border border-border/60 bg-card p-6 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-primary/20 hover:shadow-lg sm:p-7">
                  <div
                    className={`pointer-events-none absolute -right-16 -top-16 h-40 w-40 rounded-full blur-3xl transition-opacity duration-300 group-hover:opacity-100 ${
                      accent ? "bg-accent/15 opacity-60" : "bg-primary/10 opacity-50"
                    }`}
                  />
                  <div className="relative flex h-full flex-col">
                    <div
                      className={`mb-8 flex h-11 w-11 items-center justify-center rounded-2xl ${
                        accent ? "bg-accent/15" : "bg-primary/8"
                      }`}
                    >
                      <Icon className="h-5 w-5 text-primary" />
                    </div>
                    <div className="mt-auto">
                      <h3 className="mb-2 font-serif text-xl font-semibold leading-snug text-foreground">{capability.title}</h3>
                      <p className="mb-5 text-sm leading-6 text-muted-foreground">{capability.desc}</p>
                      <span className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-[0.14em] text-primary">
                        Explore
                        <ArrowUpRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                      </span>
                    </div>
                  </div>
                </article>
              </AuthAwareLink>
            );
          })}
        </div>
      </div>
    </section>
  );
};
