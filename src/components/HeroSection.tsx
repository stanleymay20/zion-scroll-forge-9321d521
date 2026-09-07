import { Button } from "@/components/ui/button";
import { AuthAwareLink } from "@/components/auth/AuthAwareLink";
import { Link } from "react-router-dom";
import {
  ArrowRight,
  BookOpen,
  Bot,
  CheckCircle2,
  GraduationCap,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import scrollLogo from "@/assets/scroll-university-logo-optimized.png";
import heroBackground from "@/assets/hero-background.jpg";
import { onboardingRoutes } from "@/lib/onboardingRoutes";

const proofPoints = [
  "Reviewed learning content",
  "AI used as learning support",
  "Public academic-status pages",
];

export const HeroSection = () => {
  const { user } = useAuth();

  return (
    <section className="relative overflow-hidden px-4 pb-16 pt-28 sm:pb-24 sm:pt-36 lg:pt-40">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,hsl(var(--accent)/0.12),transparent_34%),radial-gradient(circle_at_80%_20%,hsl(var(--primary)/0.08),transparent_28%)]" />
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.035]"
        style={{
          backgroundImage: `linear-gradient(hsl(var(--primary)) 1px, transparent 1px), linear-gradient(90deg, hsl(var(--primary)) 1px, transparent 1px)`,
          backgroundSize: "48px 48px",
        }}
      />

      <div className="container relative mx-auto grid max-w-7xl items-center gap-12 lg:grid-cols-[1.05fr_0.95fr] lg:gap-16">
        <div className="animate-fade-up max-w-3xl">
          <div className="mb-6 inline-flex items-center gap-3 rounded-full border border-border/70 bg-card/80 py-1.5 pl-1.5 pr-4 shadow-sm backdrop-blur-sm">
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/8">
              <img src={scrollLogo} alt="" className="h-6 w-6 object-contain" aria-hidden="true" />
            </span>
            <span className="text-xs font-semibold tracking-wide text-primary">
              Veritas · Sapientia · Imperium
            </span>
          </div>

          <h1 className="mb-6 max-w-3xl font-serif text-5xl font-bold leading-[0.98] tracking-[-0.045em] text-foreground sm:text-6xl md:text-7xl lg:text-[5.4rem]">
            Education with conviction for an
            <span className="block text-primary">AI-shaped world.</span>
          </h1>

          <p className="mb-8 max-w-2xl text-base leading-7 text-muted-foreground sm:text-lg sm:leading-8">
            ScrollUniversity is a Christ-centered digital learning institution combining structured academic pathways,
            AI-supported study, governed content review, and spiritual formation in one learning environment.
          </p>

          <div className="mb-7 flex flex-col gap-3 sm:flex-row">
            <Link to={onboardingRoutes.signUpToApply}>
              <Button size="lg" className="group w-full rounded-full px-7 py-6 text-sm sm:w-auto sm:text-base">
                <GraduationCap className="mr-2 h-5 w-5" />
                Start an application
                <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
              </Button>
            </Link>
            <AuthAwareLink to={onboardingRoutes.catalog}>
              <Button
                variant="outline"
                size="lg"
                className="w-full rounded-full border-primary/20 bg-background/70 px-7 py-6 text-sm backdrop-blur-sm hover:border-primary/40 hover:bg-primary/5 sm:w-auto sm:text-base"
              >
                <BookOpen className="mr-2 h-5 w-5" />
                Explore the catalogue
              </Button>
            </AuthAwareLink>
          </div>

          <div className="mb-8 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-muted-foreground">
            {proofPoints.map((point) => (
              <span key={point} className="inline-flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-primary" />
                {point}
              </span>
            ))}
          </div>

          <div className="flex flex-wrap items-center gap-4 border-t border-border/70 pt-5 text-sm">
            <Link
              to={user ? onboardingRoutes.studentDashboard : onboardingRoutes.signIn}
              className="font-semibold text-primary transition-colors hover:text-primary/75"
            >
              {user ? "Go to your dashboard" : "Accepted student? Sign in"}
            </Link>
            <span className="hidden h-4 w-px bg-border sm:block" />
            <Link
              to="/accreditation-status"
              className="inline-flex items-center gap-1.5 text-muted-foreground transition-colors hover:text-foreground"
            >
              <ShieldCheck className="h-4 w-4" />
              View academic-status transparency
            </Link>
          </div>
        </div>

        <div className="animate-fade-up animate-fade-up-delay-2 relative mx-auto w-full max-w-2xl lg:max-w-none">
          <div className="rounded-[2rem] border border-border/60 bg-card/70 p-2 shadow-[0_24px_80px_-32px_hsl(var(--primary)/0.28)] backdrop-blur-sm">
            <div className="relative aspect-[5/4] overflow-hidden rounded-[1.6rem] bg-primary">
              <img
                src={heroBackground}
                alt=""
                aria-hidden="true"
                width={1920}
                height={1080}
                className="absolute inset-0 h-full w-full object-cover"
                loading="eager"
                decoding="async"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-primary via-primary/30 to-transparent" />
              <div className="absolute inset-x-0 bottom-0 p-6 text-primary-foreground sm:p-8">
                <p className="mb-2 text-xs font-semibold uppercase tracking-[0.22em] text-primary-foreground/65">
                  ScrollUniversity digital campus
                </p>
                <h2 className="max-w-lg font-serif text-2xl font-semibold leading-tight sm:text-3xl">
                  Serious learning, supported by AI and governed by human academic review.
                </h2>
              </div>
            </div>
          </div>

          <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-3">
            <AuthAwareLink
              to="/ai-tutors"
              className="group rounded-2xl border border-border/60 bg-card p-4 shadow-sm transition-all hover:-translate-y-0.5 hover:border-primary/25 hover:shadow-md"
            >
              <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-xl bg-primary/8">
                <Bot className="h-4 w-4 text-primary" />
              </div>
              <p className="text-sm font-semibold text-foreground">AI-supported study</p>
              <p className="mt-1 text-xs leading-relaxed text-muted-foreground">Tutor tools that support, not replace, academic judgment.</p>
            </AuthAwareLink>

            <AuthAwareLink
              to="/academic-trust"
              className="group rounded-2xl border border-border/60 bg-card p-4 shadow-sm transition-all hover:-translate-y-0.5 hover:border-primary/25 hover:shadow-md"
            >
              <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-xl bg-accent/15">
                <ShieldCheck className="h-4 w-4 text-primary" />
              </div>
              <p className="text-sm font-semibold text-foreground">Academic trust</p>
              <p className="mt-1 text-xs leading-relaxed text-muted-foreground">Review, evidence and status information surfaced clearly.</p>
            </AuthAwareLink>

            <a
              href="#experience"
              className="group rounded-2xl border border-border/60 bg-card p-4 shadow-sm transition-all hover:-translate-y-0.5 hover:border-primary/25 hover:shadow-md"
            >
              <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-xl bg-primary/8">
                <Sparkles className="h-4 w-4 text-primary" />
              </div>
              <p className="text-sm font-semibold text-foreground">Whole-person formation</p>
              <p className="mt-1 text-xs leading-relaxed text-muted-foreground">Learning, reflection, community and spiritual practice.</p>
            </a>
          </div>
        </div>
      </div>
    </section>
  );
};
