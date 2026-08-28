import { AuthAwareLink } from "@/components/auth/AuthAwareLink";
import {
  Bot,
  ScrollText,
  Library,
  Target,
  Video,
  Heart,
  ShieldCheck,
  Users,
  ArrowUpRight,
} from "lucide-react";

const capabilities = [
  {
    icon: Bot,
    title: "Live AI Tutors",
    desc: "ScrollIntel-G6 tutors with prophetic intelligence, office hours, and real-time conversation.",
    href: "/ai-tutors",
    accent: "primary",
  },
  {
    icon: ScrollText,
    title: "Verified Credentials",
    desc: "Every certificate carries a unique seal hash, QR code, and public verification page.",
    href: "/verify",
    accent: "accent",
  },
  {
    icon: Library,
    title: "ScrollLibrary",
    desc: "Long-form chapters (8,000+ words) with persistent progress tracking across devices.",
    href: "/scroll-library",
    accent: "primary",
  },
  {
    icon: Target,
    title: "Verified Mastery",
    desc: "Progress is grounded in trusted assessments, demonstrated skills, and auditable learning evidence.",
    href: "/academic-trust",
    accent: "accent",
  },
  {
    icon: Video,
    title: "Live AI Lectures",
    desc: "WebRTC avatar lectures with lip-sync, voice streaming, and interactive Q&A.",
    href: "/courses",
    accent: "primary",
  },
  {
    icon: Heart,
    title: "Spiritual Formation",
    desc: "Daily check-ins, prayer journal, and a prophetic scorecard built into your degree.",
    href: "/prayer-journal",
    accent: "accent",
  },
  {
    icon: ShieldCheck,
    title: "Trust Center",
    desc: "Transparent academic integrity, governance, and immutable audit trails (SUYAS).",
    href: "/trust",
    accent: "primary",
  },
  {
    icon: Users,
    title: "Global Cohorts",
    desc: "Study groups, alumni network, and Scroll Community Hubs across continents.",
    href: "/community",
    accent: "accent",
  },
];

export const CapabilitiesSection = () => {
  return (
    <section className="py-20 sm:py-28 px-4 relative overflow-hidden">
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[400px] bg-accent/5 blur-3xl rounded-full pointer-events-none" />
      <div className="container mx-auto max-w-6xl relative">
        <div className="text-center mb-14 sm:mb-20">
          <p className="text-xs font-sans font-semibold tracking-[0.25em] uppercase text-accent mb-3">What's Inside</p>
          <h2 className="text-primary mb-4 font-serif">A Complete Digital Institution</h2>
          <p className="text-sm sm:text-base text-muted-foreground font-sans max-w-2xl mx-auto leading-relaxed">
            Not an LMS. A governed university built around verifiable credentials, AI faculty,
            demonstrated mastery, research, community, and spiritual formation.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {capabilities.map((cap, i) => {
            const Icon = cap.icon;
            const isAccent = cap.accent === "accent";
            return (
              <AuthAwareLink key={cap.title} to={cap.href} className="animate-fade-up group block" style={{ animationDelay: `${i * 0.05}s` }}>
                <div className="relative h-full bg-card rounded-2xl border border-border/60 p-6 card-hover overflow-hidden">
                  <div className={`absolute -top-12 -right-12 w-32 h-32 rounded-full blur-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 ${isAccent ? "bg-accent/20" : "bg-primary/15"}`} />
                  <div className="relative">
                    <div className={`w-11 h-11 rounded-xl flex items-center justify-center mb-4 ${isAccent ? "bg-accent/12" : "bg-primary/10"}`}>
                      <Icon className={`w-5 h-5 ${isAccent ? "text-accent" : "text-primary"}`} />
                    </div>
                    <h3 className="font-serif font-semibold text-base text-primary mb-2 leading-snug">{cap.title}</h3>
                    <p className="text-xs sm:text-sm text-muted-foreground font-sans leading-relaxed mb-4">{cap.desc}</p>
                    <div className="flex items-center gap-1 text-[11px] font-sans font-semibold tracking-wider uppercase text-primary/60 group-hover:text-primary transition-colors">
                      Explore
                      <ArrowUpRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                    </div>
                  </div>
                </div>
              </AuthAwareLink>
            );
          })}
        </div>
      </div>
    </section>
  );
};
