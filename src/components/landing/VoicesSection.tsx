import { Quote } from "lucide-react";

const voices = [
  {
    quote:
      "ScrollUniversity is the first institution I have seen treat spiritual formation and academic rigor as one indivisible discipline. My degree is not a credential — it is a calling, verified.",
    name: "Adaeze O.",
    role: "Doctor of Scroll Governance, Class of Scroll Year 1",
    locale: "Lagos · Abuja Hub",
  },
  {
    quote:
      "I lecture into a live AI classroom every week. The avatar carries my voice into rooms I will never physically enter — and the audit trail keeps every word accountable.",
    name: "Dr. M. Eliav",
    role: "Faculty, Supreme Scroll Faculty of Theology",
    locale: "Jerusalem",
  },
  {
    quote:
      "I earned ScrollGold while I studied, then funded my younger brother's tuition with it. No other university lets me circulate value back into my family.",
    name: "Caleb R.",
    role: "Scroll Master of AI Engineering",
    locale: "São Paulo Hub",
  },
];

export const VoicesSection = () => {
  return (
    <section className="py-20 sm:py-28 px-4 bg-secondary/40 border-y border-border/50 relative overflow-hidden">
      <div className="absolute top-1/2 left-0 w-[400px] h-[400px] bg-accent/5 blur-3xl rounded-full pointer-events-none -translate-y-1/2" />
      <div className="absolute top-1/2 right-0 w-[400px] h-[400px] bg-primary/5 blur-3xl rounded-full pointer-events-none -translate-y-1/2" />

      <div className="container mx-auto max-w-6xl relative">
        <div className="text-center mb-14 sm:mb-20">
          <p className="text-xs font-sans font-semibold tracking-[0.25em] uppercase text-accent mb-3">
            Voices of the Scroll
          </p>
          <h2 className="text-primary font-serif mb-4">
            From every continent, one calling.
          </h2>
          <p className="text-sm sm:text-base text-muted-foreground font-sans max-w-xl mx-auto leading-relaxed">
            Students, faculty, and alumni on what it means to learn inside a kingdom-grade university.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 sm:gap-6">
          {voices.map((v, i) => (
            <figure
              key={v.name}
              className="animate-fade-up h-full flex flex-col bg-card rounded-2xl border border-border/60 p-7 sm:p-8 elevation-2 relative"
              style={{ animationDelay: `${i * 0.08}s` }}
            >
              <Quote
                className="absolute top-5 right-6 w-10 h-10 text-accent/15"
                aria-hidden="true"
              />
              <blockquote className="font-serif italic text-base sm:text-lg text-primary/90 leading-relaxed mb-7 flex-1">
                "{v.quote}"
              </blockquote>
              <figcaption className="flex items-center gap-4 pt-5 border-t border-border/60">
                {/* Monogrammed crest avatar — brand-aligned, no stock photos */}
                <div className="relative shrink-0">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary to-[hsl(var(--accent))] flex items-center justify-center font-serif font-bold text-primary-foreground text-base shadow-md">
                    {v.name
                      .split(" ")
                      .map((n) => n[0])
                      .join("")
                      .slice(0, 2)}
                  </div>
                  <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full bg-accent border-2 border-card" />
                </div>
                <div className="min-w-0">
                  <div className="font-sans font-semibold text-sm text-primary truncate">
                    {v.name}
                  </div>
                  <div className="text-[11px] font-sans text-muted-foreground leading-tight mt-0.5">
                    {v.role}
                  </div>
                  <div className="text-[10px] font-sans text-accent tracking-wider uppercase mt-1">
                    {v.locale}
                  </div>
                </div>
              </figcaption>
            </figure>
          ))}
        </div>
      </div>
    </section>
  );
};
