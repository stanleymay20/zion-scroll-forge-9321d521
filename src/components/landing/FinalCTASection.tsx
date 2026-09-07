import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { ArrowRight, BookOpen, GraduationCap, ShieldCheck } from "lucide-react";
import { AuthAwareLink } from "@/components/auth/AuthAwareLink";
import { onboardingRoutes } from "@/lib/onboardingRoutes";

export const FinalCTASection = () => {
  return (
    <section className="relative overflow-hidden px-4 py-20 sm:py-28">
      <div className="absolute inset-0 bg-primary" />
      <div className="pointer-events-none absolute -left-24 top-1/2 h-80 w-80 -translate-y-1/2 rounded-full bg-accent/10 blur-3xl" />
      <div className="pointer-events-none absolute -right-20 bottom-0 h-72 w-72 rounded-full bg-primary-foreground/5 blur-3xl" />

      <div className="container relative mx-auto max-w-5xl text-center text-primary-foreground">
        <p className="mb-4 text-xs font-semibold uppercase tracking-[0.24em] text-accent">Take the next step deliberately</p>
        <h2 className="mx-auto mb-5 max-w-4xl font-serif text-4xl font-semibold leading-tight sm:text-5xl md:text-6xl">
          Explore the learning model, review the evidence, then decide whether ScrollUniversity fits your goals.
        </h2>
        <p className="mx-auto mb-9 max-w-2xl text-sm leading-7 text-primary-foreground/70 sm:text-base sm:leading-8">
          Start with the current catalogue and public academic-status information. If the pathway is right for you, continue into the application process.
        </p>

        <div className="flex flex-col justify-center gap-3 sm:flex-row">
          <Link to={onboardingRoutes.signUpToApply}>
            <Button
              size="lg"
              className="group w-full rounded-full bg-accent px-7 py-6 text-accent-foreground shadow-lg shadow-black/10 hover:bg-accent/90 sm:w-auto"
            >
              <GraduationCap className="mr-2 h-5 w-5" />
              Start an application
              <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
            </Button>
          </Link>
          <AuthAwareLink to={onboardingRoutes.catalog}>
            <Button
              variant="outline"
              size="lg"
              className="w-full rounded-full border-primary-foreground/25 bg-transparent px-7 py-6 text-primary-foreground hover:border-primary-foreground/45 hover:bg-primary-foreground/10 hover:text-primary-foreground sm:w-auto"
            >
              <BookOpen className="mr-2 h-5 w-5" />
              Browse the catalogue
            </Button>
          </AuthAwareLink>
        </div>

        <Link
          to="/accreditation-status"
          className="mt-7 inline-flex items-center gap-2 text-sm text-primary-foreground/65 transition-colors hover:text-primary-foreground"
        >
          <ShieldCheck className="h-4 w-4" />
          Review academic and accreditation status before applying
        </Link>

        <div className="mt-10 flex items-center justify-center gap-3">
          <div className="h-px w-10 bg-accent/30" />
          <p className="text-[10px] uppercase tracking-[0.3em] text-primary-foreground/45">Soli Deo Gloria</p>
          <div className="h-px w-10 bg-accent/30" />
        </div>
      </div>
    </section>
  );
};
