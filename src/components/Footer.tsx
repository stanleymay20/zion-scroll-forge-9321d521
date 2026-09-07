import { Link } from "react-router-dom";
import { Heart } from "lucide-react";
import { Logo } from "@/components/brand/Logo";

const footerLinks = [
  {
    title: "Study",
    links: [
      { label: "Course catalogue", href: "/catalog" },
      { label: "Programmes", href: "/degrees" },
      { label: "Faculties", href: "/faculties" },
      { label: "Apply", href: "/auth?tab=signup&redirect=/apply" },
    ],
  },
  {
    title: "Student life",
    links: [
      { label: "Prayer & formation", href: "/prayer-requests" },
      { label: "Community", href: "/community" },
      { label: "Study groups", href: "/study-groups" },
      { label: "Events", href: "/events" },
    ],
  },
  {
    title: "Trust & governance",
    links: [
      { label: "Academic trust", href: "/academic-trust" },
      { label: "Academic status", href: "/accreditation-status" },
      { label: "Governance", href: "/governance" },
      { label: "Academic integrity", href: "/academic-integrity" },
      { label: "AI transparency", href: "/ai-transparency" },
      { label: "Privacy", href: "/privacy" },
      { label: "Terms", href: "/terms" },
    ],
  },
];

export const Footer = () => {
  return (
    <footer className="relative overflow-hidden border-t border-border/60 bg-card">
      <div className="absolute left-1/2 top-0 h-px w-3/4 -translate-x-1/2 bg-gradient-to-r from-transparent via-accent/35 to-transparent" />
      <div className="container mx-auto max-w-7xl px-4 py-14 sm:px-6 sm:py-20">
        <div className="mb-12 grid gap-10 sm:grid-cols-2 lg:grid-cols-[1.3fr_0.8fr_0.8fr_1fr]">
          <div>
            <div className="mb-4">
              <Logo size="md" to="/" />
            </div>
            <p className="mb-4 max-w-sm text-sm leading-6 text-muted-foreground">
              Christ-centered digital learning with structured academic pathways, AI-supported study, spiritual formation, and public trust controls.
            </p>
            <p className="max-w-sm font-serif text-sm italic leading-relaxed text-primary/75">
              “Jesus Christ is Lord over every algorithm, decision, and interaction.”
            </p>
          </div>

          {footerLinks.map((section) => (
            <div key={section.title}>
              <h4 className="mb-4 text-[11px] font-bold uppercase tracking-[0.18em] text-foreground">
                {section.title}
              </h4>
              <ul className="space-y-3">
                {section.links.map((link) => (
                  <li key={link.label}>
                    <Link
                      to={link.href}
                      className="text-sm text-muted-foreground transition-colors hover:text-primary"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="flex flex-col items-center justify-between gap-3 border-t border-border/50 pt-6 text-center sm:flex-row sm:text-left">
          <p className="text-xs text-muted-foreground">
            © {new Date().getFullYear()} ScrollUniversity. All rights reserved.
          </p>
          <p className="text-[10px] uppercase tracking-[0.28em] text-muted-foreground">Soli Deo Gloria</p>
          <p className="flex items-center gap-1 text-xs text-muted-foreground">
            Built with <Heart className="inline h-3 w-3 fill-accent text-accent" /> for the Kingdom
          </p>
        </div>
      </div>
    </footer>
  );
};
