import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AuthAwareLink } from "@/components/auth/AuthAwareLink";
import { useFacultyStats } from "@/hooks/useFaculties";
import {
  ArrowRight,
  BookOpen,
  Coins,
  Cpu,
  FlaskConical,
  Gavel,
  Globe,
  GraduationCap,
  Landmark,
  Loader2,
  Palette,
  School,
  Stethoscope,
  Wheat,
  Zap,
  type LucideIcon,
} from "lucide-react";

const facultyIcons: Record<string, LucideIcon> = {
  "Scroll Theology": BookOpen,
  "Scroll Medicine": Stethoscope,
  "Scroll Governance": Landmark,
  "Scroll Economy": Coins,
  "Scroll Education": GraduationCap,
  "Scroll Technology": Cpu,
  "Scroll Agriculture": Wheat,
  "Scroll Arts": Palette,
  "Scroll Science": FlaskConical,
  "Scroll Diplomacy": Globe,
  "Scroll Justice": Gavel,
  "Scroll Energy": Zap,
};

export const FacultiesSection = () => {
  const { data: faculties, isLoading } = useFacultyStats();

  if (isLoading) {
    return (
      <section id="faculties" className="px-4 py-20">
        <div className="container mx-auto flex max-w-7xl items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary/40" />
        </div>
      </section>
    );
  }

  if (!faculties || faculties.length === 0) return null;

  const displayed = [...faculties]
    .sort((a, b) => (b.courseCount || 0) - (a.courseCount || 0) || a.name.localeCompare(b.name))
    .slice(0, 8);

  return (
    <section id="faculties" className="border-y border-border/60 bg-secondary/35 px-4 py-20 sm:py-28">
      <div className="container mx-auto max-w-7xl">
        <div className="mb-12 flex flex-col gap-6 sm:mb-16 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-2xl">
            <p className="mb-3 text-xs font-semibold uppercase tracking-[0.22em] text-accent">Explore the academic landscape</p>
            <h2 className="font-serif text-3xl font-semibold leading-tight text-foreground sm:text-4xl md:text-5xl">
              Find the faculty that matches the questions you want to pursue.
            </h2>
          </div>
          <p className="max-w-xl text-sm leading-7 text-muted-foreground sm:text-base">
            These areas are drawn from the current ScrollUniversity catalogue. Course counts are shown from live catalogue data rather than fixed marketing totals.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {displayed.map((faculty, index) => {
            const Icon = facultyIcons[faculty.name] || BookOpen;
            return (
              <AuthAwareLink
                key={faculty.id}
                to={`/catalog?faculty=${encodeURIComponent(faculty.name)}`}
                className="animate-fade-up group block"
                style={{ animationDelay: `${index * 0.05}s` }}
              >
                <article className="flex h-full min-h-[220px] flex-col rounded-[1.4rem] border border-border/60 bg-card p-5 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-primary/20 hover:shadow-lg sm:p-6">
                  <div className="mb-8 flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/10 transition-colors group-hover:bg-primary/15">
                    <Icon className="h-5 w-5 text-primary" />
                  </div>
                  <div className="mt-auto">
                    <h3 className="mb-2 font-serif text-xl font-semibold leading-snug text-foreground">
                      {faculty.name.replace("Scroll ", "")}
                    </h3>
                    <p className="mb-5 line-clamp-2 text-sm leading-6 text-muted-foreground">{faculty.description}</p>
                    <div className="flex items-center justify-between gap-3">
                      <Badge variant="secondary" className="rounded-full px-2.5 py-1 text-[11px] font-medium">
                        {faculty.courseCount} {faculty.courseCount === 1 ? "course" : "courses"}
                      </Badge>
                      <ArrowRight className="h-4 w-4 text-muted-foreground transition-all group-hover:translate-x-1 group-hover:text-primary" />
                    </div>
                  </div>
                </article>
              </AuthAwareLink>
            );
          })}
        </div>

        <div className="mt-10 flex justify-center sm:mt-12">
          <AuthAwareLink to="/catalog">
            <Button size="lg" variant="outline" className="rounded-full border-primary/20 px-6 hover:border-primary/40 hover:bg-primary/5">
              <School className="mr-2 h-4 w-4" />
              Browse the full course catalogue
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </AuthAwareLink>
        </div>
      </div>
    </section>
  );
};
