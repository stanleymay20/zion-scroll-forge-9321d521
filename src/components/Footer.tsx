import { Link } from "react-router-dom";
import { Heart } from "lucide-react";
import { Logo } from "@/components/brand/Logo";

const footerLinks = [
  {
    title: "Academics",
    links: [
      { label: "Course Catalog", href: "/courses" },
      { label: "Faculties", href: "/faculties" },
      { label: "Degree Programs", href: "/degrees" },
      { label: "ScrollLibrary", href: "/scroll-library" },
    ],
  },
  {
    title: "Community",
    links: [
      { label: "Prayer Center", href: "/prayer-requests" },
      { label: "Testimonies", href: "/testimonies" },
      { label: "Study Groups", href: "/study-groups" },
      { label: "Events", href: "/events" },
    ],
  },
  {
    title: "Institution",
    links: [
      { label: "Academic Integrity", href: "/academic-integrity" },
      { label: "Trust Center", href: "/trust" },
      { label: "AI Transparency", href: "/ai-transparency" },
      { label: "AI Risk Register", href: "/governance/ai-risk-register" },
      { label: "DPIA", href: "/governance/dpia" },
      { label: "Terms of Service", href: "/terms" },
      { label: "Privacy Policy", href: "/privacy" },
    ],
  },
];

export const Footer = () => {
  return (
    <footer className="bg-card border-t border-border/60 relative overflow-hidden">
      <div className="absolute top-0 left-1/2 -translate-x-1/2 h-px w-3/4 bg-gradient-to-r from-transparent via-accent/40 to-transparent" />
      <div className="container mx-auto px-4 sm:px-6 py-14 sm:py-20 max-w-6xl">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-10 mb-12">
          {/* Brand */}
          <div className="col-span-2 sm:col-span-1">
            <div className="mb-4">
              <Logo size="md" to="/" />
            </div>
            <p className="text-xs text-muted-foreground font-sans leading-relaxed max-w-[220px] mb-4">
              The Transcendent AI University. Kingdom-aligned education for global transformation.
            </p>
            <p className="text-[10px] text-muted-foreground/70 font-sans italic leading-relaxed max-w-[220px]">
              "Jesus Christ is Lord over every algorithm."
            </p>
          </div>

          {/* Links */}
          {footerLinks.map((section) => (
            <div key={section.title}>
              <h4 className="text-[10px] font-sans font-bold tracking-[0.2em] uppercase text-accent mb-4">
                {section.title}
              </h4>
              <ul className="space-y-2.5">
                {section.links.map((link) => (
                  <li key={link.label}>
                    <Link
                      to={link.href}
                      className="text-xs text-muted-foreground hover:text-primary transition-colors font-sans story-link"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Bottom */}
        <div className="border-t border-border/40 pt-6 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="text-[11px] text-muted-foreground font-sans">
            © {new Date().getFullYear()} ScrollUniversity. All rights reserved.
          </p>
          <p className="text-[10px] text-muted-foreground font-sans tracking-[0.3em] uppercase">
            Soli Deo Gloria
          </p>
          <p className="text-[11px] text-muted-foreground font-sans flex items-center gap-1">
            Built with <Heart className="w-3 h-3 text-accent inline fill-accent" /> for the Kingdom
          </p>
        </div>
      </div>
    </footer>
  );
};
