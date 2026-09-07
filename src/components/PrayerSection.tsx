import { Button } from "@/components/ui/button";
import { AuthAwareLink } from "@/components/auth/AuthAwareLink";
import { ArrowRight, BookOpen, Heart, MessageCircleHeart, NotebookPen, Users } from "lucide-react";

const formationPaths = [
  {
    icon: NotebookPen,
    title: "Prayer journal",
    desc: "Create a private rhythm of prayer, reflection, gratitude, and written spiritual practice.",
    href: "/prayer-journal",
  },
  {
    icon: BookOpen,
    title: "Daily devotion",
    desc: "Use Scripture, reflection prompts, and practical application as part of your learning rhythm.",
    href: "/daily-devotion",
  },
  {
    icon: MessageCircleHeart,
    title: "Prayer requests",
    desc: "Share requests and participate in community prayer through the platform's dedicated prayer space.",
    href: "/prayer-requests",
  },
  {
    icon: Users,
    title: "Formation in community",
    desc: "Connect spiritual practice with study, fellowship, service, and accountability rather than treating faith as an add-on.",
    href: "/community",
  },
];

export const PrayerSection = () => {
  return (
    <section id="prayer" className="relative overflow-hidden border-y border-border/60 bg-secondary/35 px-4 py-20 sm:py-28">
      <div className="pointer-events-none absolute -right-32 top-8 h-80 w-80 rounded-full bg-accent/10 blur-3xl" />
      <div className="container relative mx-auto max-w-7xl">
        <div className="grid gap-10 lg:grid-cols-[0.9fr_1.1fr] lg:items-center lg:gap-16">
          <div className="max-w-xl">
            <span className="mb-5 inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-sm">
              <Heart className="h-5 w-5" />
            </span>
            <p className="mb-3 text-xs font-semibold uppercase tracking-[0.22em] text-accent">Spiritual formation</p>
            <h2 className="mb-5 font-serif text-3xl font-semibold leading-tight text-foreground sm:text-4xl md:text-5xl">
              Faith belongs inside the learning journey, not in a separate tab of life.
            </h2>
            <p className="mb-7 text-sm leading-7 text-muted-foreground sm:text-base">
              ScrollUniversity brings prayer, Scripture, reflection, community, and character formation into the digital campus without turning spiritual growth into a fabricated score or public performance metric.
            </p>
            <div className="flex flex-col gap-3 sm:flex-row">
              <Button asChild size="lg" className="rounded-full px-6">
                <AuthAwareLink to="/prayer-journal">
                  <NotebookPen className="mr-2 h-4 w-4" />
                  Open prayer journal
                </AuthAwareLink>
              </Button>
              <Button asChild variant="outline" size="lg" className="rounded-full border-primary/20 px-6 hover:bg-primary/5">
                <AuthAwareLink to="/daily-devotion">
                  <BookOpen className="mr-2 h-4 w-4" />
                  View daily devotion
                </AuthAwareLink>
              </Button>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            {formationPaths.map((path, index) => {
              const Icon = path.icon;
              return (
                <AuthAwareLink
                  key={path.title}
                  to={path.href}
                  className="animate-fade-up group block"
                  style={{ animationDelay: `${index * 0.06}s` }}
                >
                  <article className="flex h-full min-h-[210px] flex-col rounded-[1.4rem] border border-border/60 bg-card p-5 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-primary/20 hover:shadow-lg sm:p-6">
                    <div className="mb-8 flex h-10 w-10 items-center justify-center rounded-2xl bg-primary/10">
                      <Icon className="h-5 w-5 text-primary" />
                    </div>
                    <div className="mt-auto">
                      <h3 className="mb-2 font-serif text-xl font-semibold text-foreground">{path.title}</h3>
                      <p className="mb-4 text-sm leading-6 text-muted-foreground">{path.desc}</p>
                      <span className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-[0.14em] text-primary">
                        Explore
                        <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-1" />
                      </span>
                    </div>
                  </article>
                </AuthAwareLink>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
};
