import { Button } from "@/components/ui/button";
import { AuthAwareLink } from "@/components/auth/AuthAwareLink";
import { Link } from "react-router-dom";
import { BookOpen, ArrowRight, GraduationCap, Sparkles, LogIn } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import scrollLogo from "@/assets/scroll-university-logo-optimized.png";
import heroBackground from "@/assets/hero-background.jpg";
import { onboardingRoutes } from "@/lib/onboardingRoutes";

export const HeroSection = () => {
  const { user } = useAuth();
  return (
    <section className="relative min-h-[100dvh] flex items-start sm:items-center justify-center px-4 pt-20 sm:pt-24 pb-16 overflow-hidden">
      {/* Cinematic background image */}
      <img
        src={heroBackground}
        alt=""
        aria-hidden="true"
        width={1920}
        height={1080}
        className="absolute inset-0 w-full h-full object-cover object-center"
      />
      {/* Legibility & brand-warmth overlays */}
      <div className="absolute inset-0 bg-gradient-to-b from-background/80 via-background/60 to-background/95" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_0%,hsl(var(--background)/0.55)_65%,hsl(var(--background))_100%)]" />

      {/* Ornamental dots */}
      <div
        className="absolute inset-0 opacity-[0.04] pointer-events-none"
        style={{
          backgroundImage: `radial-gradient(circle at 1px 1px, hsl(var(--primary)) 1px, transparent 0)`,
          backgroundSize: "44px 44px",
        }}
      />
      <div className="absolute -bottom-40 right-0 w-[500px] h-[500px] rounded-full bg-primary/5 blur-3xl pointer-events-none" />

      <div className="container mx-auto text-center max-w-5xl relative z-10 pt-2 sm:pt-0">
        {/* Crest */}
        <div className="animate-fade-up flex justify-center mb-6">
          <div className="relative">
            <div className="absolute inset-0 bg-accent/20 blur-2xl rounded-full" />
            <img
              src={scrollLogo}
              alt="ScrollUniversity Crest"
              className="relative h-24 w-24 sm:h-28 sm:w-28 object-contain drop-shadow-2xl"
              loading="eager"
              decoding="async"
            />
          </div>
        </div>

        {/* Eyebrow */}
        <div className="animate-fade-up animate-fade-up-delay-1 mb-5 flex justify-center">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-card/70 backdrop-blur-sm rounded-full border border-accent/30">
            <Sparkles className="w-3.5 h-3.5 text-accent" />
            <p className="text-[11px] sm:text-xs font-sans font-semibold tracking-[0.2em] uppercase text-primary">
              Veritas · Sapientia · Imperium
            </p>
          </div>
        </div>

        {/* Main Heading — editorial */}
        <div className="animate-fade-up animate-fade-up-delay-2">
          <h1 className="font-serif font-bold text-primary mb-2 leading-[0.95] tracking-tight text-5xl sm:text-6xl md:text-7xl lg:text-[5.5rem]">
            The Transcendent
          </h1>
          <p className="font-serif italic font-medium mb-6 leading-[1] text-4xl sm:text-5xl md:text-6xl lg:text-[4.5rem]">
            <span className="bg-gradient-to-r from-accent via-[hsl(42_85%_45%)] to-accent bg-clip-text text-transparent divine-glow">
              AI University
            </span>
          </p>
        </div>

        {/* Christ Lordship line — refined */}
        <div className="animate-fade-up animate-fade-up-delay-3 mb-6 sm:mb-8">
          <p className="text-base sm:text-lg font-serif italic text-primary/80 max-w-2xl mx-auto leading-relaxed">
            "Jesus Christ is Lord over every algorithm, decision, and interaction."
          </p>
          <div className="flex items-center justify-center gap-3 mt-3">
            <div className="h-px w-8 bg-accent/40" />
            <p className="text-[10px] sm:text-xs text-muted-foreground font-sans tracking-[0.25em] uppercase">
              Founded by divine decree · Mount Zion
            </p>
            <div className="h-px w-8 bg-accent/40" />
          </div>
        </div>

        <div className="animate-fade-up animate-fade-up-delay-4 flex justify-center mb-5 sm:mb-8">
          <Link to={user ? onboardingRoutes.studentDashboard : onboardingRoutes.signIn} className="w-full sm:w-auto max-w-sm">
            <Button
              variant="outline"
              size="lg"
              className="text-sm sm:text-base px-6 sm:px-8 py-4 sm:py-6 font-sans w-full bg-card/90 backdrop-blur-sm border-accent/50 text-primary hover:bg-accent/10 hover:border-accent shadow-md transition-all"
            >
              <LogIn className="w-5 h-5 mr-2" />
              {user ? "Go to Dashboard" : "Accepted Student? Sign In"}
            </Button>
          </Link>
        </div>

        <p className="animate-fade-up animate-fade-up-delay-3 text-base sm:text-lg md:text-xl text-muted-foreground mb-8 sm:mb-10 font-sans max-w-2xl mx-auto leading-relaxed">
          Where divine revelation meets advanced AI. Earn{" "}
          <span className="text-primary font-semibold">verifiable credentials</span> across{" "}
          <span className="text-primary font-semibold">12 Supreme Scroll Faculties</span>—from
          Theology to Technology, Governance to the Arts.
        </p>

        {/* CTAs */}
        <div className="animate-fade-up animate-fade-up-delay-4 flex flex-col sm:flex-row gap-3 justify-center mb-10 sm:mb-14">
          <Link to={onboardingRoutes.signUpToApply}>
            <Button
              size="lg"
              className="text-sm sm:text-base px-8 py-6 font-sans w-full sm:w-auto bg-accent hover:bg-accent/90 text-accent-foreground shadow-lg shadow-accent/20 hover:shadow-xl hover:shadow-accent/30 transition-all group"
            >
              <GraduationCap className="w-5 h-5 mr-2" />
              Apply to ScrollUniversity
              <ArrowRight className="w-4 h-4 ml-2 transition-transform group-hover:translate-x-1" />
            </Button>
          </Link>
          <AuthAwareLink to={onboardingRoutes.catalog}>
            <Button
              variant="outline"
              size="lg"
              className="text-sm sm:text-base px-8 py-6 font-sans w-full sm:w-auto border-primary/25 hover:bg-primary/5 hover:border-primary/50 transition-all"
            >
              <BookOpen className="w-5 h-5 mr-2" />
              Explore the Catalog
            </Button>
          </AuthAwareLink>
        </div>

        {/* Trust strip */}
        <div className="animate-fade-up animate-fade-up-delay-4 flex flex-wrap items-center justify-center gap-x-8 gap-y-3 text-[11px] sm:text-xs font-sans text-muted-foreground tracking-wide uppercase">
          <span className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-success" />
            Verifiable Certificates
          </span>
          <span className="hidden sm:inline opacity-30">·</span>
          <span className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-accent" />
            Live AI Tutors
          </span>
          <span className="hidden sm:inline opacity-30">·</span>
          <span className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-info" />
            Global Cohorts
          </span>
          <span className="hidden sm:inline opacity-30">·</span>
          <span className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-primary" />
            Kingdom Aligned
          </span>
        </div>
      </div>
    </section>
  );
};
