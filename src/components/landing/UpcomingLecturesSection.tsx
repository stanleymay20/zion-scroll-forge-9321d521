import { Calendar, Video, ArrowRight } from "lucide-react";
import { AuthAwareLink } from "@/components/auth/AuthAwareLink";
import { Button } from "@/components/ui/button";

const lectures = [
  {
    date: { d: "24", m: "Jun" },
    title: "The Theology of Algorithms",
    faculty: "Faculty of Theology · Dr. M. Eliav",
    time: "18:00 UTC",
    duration: "90 min",
    tag: "Live AI Lecture",
  },
  {
    date: { d: "27", m: "Jun" },
    title: "Scroll Governance for Emerging Nations",
    faculty: "Faculty of Governance · Council of Elders",
    time: "15:00 UTC",
    duration: "75 min",
    tag: "Public Symposium",
  },
  {
    date: { d: "02", m: "Jul" },
    title: "Prophetic Peer Review in Practice",
    faculty: "Faculty of Research · Kiro Labs",
    time: "17:30 UTC",
    duration: "60 min",
    tag: "Research Seminar",
  },
];

export const UpcomingLecturesSection = () => {
  return (
    <section className="py-20 sm:py-28 px-4 bg-background relative">
      <div className="container mx-auto max-w-6xl">
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-12 sm:mb-14">
          <div>
            <p className="text-xs font-sans font-semibold tracking-[0.25em] uppercase text-accent mb-3">
              This Week, Live
            </p>
            <h2 className="text-primary font-serif mb-2">
              Upcoming Live AI Lectures
            </h2>
            <p className="text-sm sm:text-base text-muted-foreground font-sans max-w-xl leading-relaxed">
              Open to applicants and the public. WebRTC-streamed, lip-synced, fully interactive.
            </p>
          </div>
          <AuthAwareLink to="/courses">
            <Button
              variant="outline"
              className="border-primary/25 hover:bg-primary/5 hover:border-primary/50 font-sans"
            >
              View full calendar
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </AuthAwareLink>
        </div>

        <ul className="divide-y divide-border/60 rounded-2xl border border-border/60 bg-card overflow-hidden elevation-1">
          {lectures.map((l, i) => (
            <li
              key={l.title}
              className="animate-fade-up group"
              style={{ animationDelay: `${i * 0.06}s` }}
            >
              <AuthAwareLink
                to="/courses"
                className="flex flex-col md:flex-row md:items-center gap-5 md:gap-8 p-5 sm:p-6 hover:bg-secondary/50 transition-colors"
              >
                {/* Date plaque */}
                <div className="shrink-0 w-16 h-16 sm:w-20 sm:h-20 rounded-xl bg-gradient-to-br from-primary to-[hsl(var(--primary))/0.8] text-primary-foreground flex flex-col items-center justify-center shadow-md">
                  <span className="font-serif font-bold text-2xl sm:text-3xl leading-none">
                    {l.date.d}
                  </span>
                  <span className="font-sans text-[10px] tracking-[0.2em] uppercase mt-1 text-accent">
                    {l.date.m}
                  </span>
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1.5">
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-accent/10 text-[10px] font-sans font-bold tracking-[0.15em] uppercase text-accent border border-accent/20">
                      <Video className="w-2.5 h-2.5" />
                      {l.tag}
                    </span>
                  </div>
                  <h3 className="font-serif font-semibold text-lg sm:text-xl text-primary leading-snug mb-1 group-hover:text-accent transition-colors">
                    {l.title}
                  </h3>
                  <p className="text-xs sm:text-sm text-muted-foreground font-sans">
                    {l.faculty}
                  </p>
                </div>

                {/* Meta */}
                <div className="flex md:flex-col items-center md:items-end gap-3 md:gap-1 shrink-0 text-xs font-sans">
                  <span className="inline-flex items-center gap-1.5 text-primary font-semibold">
                    <Calendar className="w-3.5 h-3.5 text-accent" />
                    {l.time}
                  </span>
                  <span className="text-muted-foreground tracking-wider uppercase text-[10px]">
                    {l.duration}
                  </span>
                </div>

                <ArrowRight className="hidden md:block w-5 h-5 text-primary/40 group-hover:text-accent group-hover:translate-x-1 transition-all shrink-0" />
              </AuthAwareLink>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
};
