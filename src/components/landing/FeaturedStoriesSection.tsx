import { ArrowUpRight, Clock } from "lucide-react";
import { AuthAwareLink } from "@/components/auth/AuthAwareLink";

const stories = [
  {
    kind: "Research",
    title: "Prophetic Peer Review: a forward-looking model for academic evaluation",
    excerpt:
      "How ScrollUniversity is replacing legacy citation metrics with values-aligned, forward-looking research evaluation.",
    readTime: "8 min read",
    href: "/research",
    accent: "accent" as const,
  },
  {
    kind: "Student Voices",
    title: "From Lagos to the Lectern: a Doctor of Scroll Governance journey",
    excerpt:
      "A first-cohort student on completing her DSGEI, leading a regional Scroll Hub, and mentoring 40 sons and daughters.",
    readTime: "5 min read",
    href: "/community",
    accent: "primary" as const,
  },
  {
    kind: "Innovation",
    title: "Inside ScrollLabs: distributed AR/VR makerspaces funded by ScrollGold",
    excerpt:
      "Hackathons, seed grants, and a global network of innovation studios where scroll sons and daughters build the next era.",
    readTime: "6 min read",
    href: "/scrolllabs",
    accent: "accent" as const,
  },
];

export const FeaturedStoriesSection = () => {
  return (
    <section className="py-20 sm:py-28 px-4 bg-background relative">
      <div className="container mx-auto max-w-6xl">
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-12 sm:mb-16">
          <div>
            <p className="text-xs font-sans font-semibold tracking-[0.25em] uppercase text-accent mb-3">
              Featured Stories
            </p>
            <h2 className="text-primary font-serif mb-2">News from the Scroll</h2>
            <p className="text-sm sm:text-base text-muted-foreground font-sans max-w-xl leading-relaxed">
              Research breakthroughs, student journeys, and the work of the 12 Supreme Scroll Faculties.
            </p>
          </div>
          <AuthAwareLink
            to="/news"
            className="self-start sm:self-end inline-flex items-center gap-1.5 text-sm font-sans font-semibold tracking-wider uppercase text-primary hover:text-accent transition-colors"
          >
            All stories
            <ArrowUpRight className="w-4 h-4" />
          </AuthAwareLink>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 sm:gap-6">
          {stories.map((s, i) => {
            const isAccent = s.accent === "accent";
            return (
              <AuthAwareLink
                key={s.title}
                to={s.href}
                className="animate-fade-up group block"
                style={{ animationDelay: `${i * 0.08}s` }}
              >
                <article className="h-full flex flex-col bg-card rounded-2xl border border-border/60 overflow-hidden card-hover">
                  {/* Editorial image plate (gradient stand-in, art-directed by accent) */}
                  <div
                    className={`relative aspect-[4/3] overflow-hidden ${
                      isAccent
                        ? "bg-gradient-to-br from-accent/30 via-primary/20 to-primary/40"
                        : "bg-gradient-to-br from-primary/40 via-primary/25 to-accent/25"
                    }`}
                  >
                    <div
                      className="absolute inset-0 opacity-[0.12]"
                      style={{
                        backgroundImage: `radial-gradient(circle at 1px 1px, hsl(var(--accent)) 1px, transparent 0)`,
                        backgroundSize: "20px 20px",
                      }}
                    />
                    <div className="absolute top-4 left-4">
                      <span className="inline-flex items-center px-3 py-1 rounded-full bg-card/85 backdrop-blur-sm text-[10px] font-sans font-bold tracking-[0.2em] uppercase text-primary border border-border/50">
                        {s.kind}
                      </span>
                    </div>
                    <div className="absolute bottom-4 right-4 font-serif italic text-6xl text-primary-foreground/15 select-none">
                      §
                    </div>
                  </div>

                  <div className="flex-1 flex flex-col p-6">
                    <h3 className="font-serif font-semibold text-lg sm:text-xl text-primary leading-snug mb-3 group-hover:text-accent transition-colors">
                      {s.title}
                    </h3>
                    <p className="text-sm text-muted-foreground font-sans leading-relaxed mb-5 flex-1">
                      {s.excerpt}
                    </p>
                    <div className="flex items-center justify-between pt-4 border-t border-border/50">
                      <span className="inline-flex items-center gap-1.5 text-[11px] font-sans text-muted-foreground tracking-wider uppercase">
                        <Clock className="w-3 h-3" />
                        {s.readTime}
                      </span>
                      <ArrowUpRight className="w-4 h-4 text-primary/60 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-accent" />
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
