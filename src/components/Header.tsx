import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { AuthAwareLink } from "@/components/auth/AuthAwareLink";
import {
  BookOpen,
  GraduationCap,
  LayoutDashboard,
  Menu,
  Search,
  ShieldCheck,
  Sparkles,
  X,
} from "lucide-react";
import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Logo } from "@/components/brand/Logo";
import { onboardingRoutes } from "@/lib/onboardingRoutes";

const navLinks = [
  { label: "Study", href: onboardingRoutes.catalog, isRoute: true, icon: BookOpen },
  { label: "Programmes", href: "/degrees", isRoute: true, icon: GraduationCap },
  { label: "Faculties", href: "#faculties", icon: GraduationCap },
  { label: "Experience", href: "#experience", icon: Sparkles },
  { label: "Trust", href: "/academic-trust", isRoute: true, icon: ShieldCheck },
];

export const Header = () => {
  const { user } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 16);
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <header className="fixed inset-x-0 top-0 z-50">
      <div className="hidden border-b border-primary-foreground/10 bg-primary text-primary-foreground md:block">
        <div className="container mx-auto flex h-8 items-center justify-between px-4 text-[11px] font-medium tracking-wide sm:px-6">
          <span>Christ-centered · AI-supported · evidence-governed learning</span>
          <div className="flex items-center gap-5 text-primary-foreground/75">
            <Link className="transition-colors hover:text-primary-foreground" to="/accreditation-status">
              Academic status
            </Link>
            <Link className="transition-colors hover:text-primary-foreground" to="/governance">
              Governance
            </Link>
          </div>
        </div>
      </div>

      <div
        className={`transition-all duration-300 ${
          scrolled || mobileMenuOpen
            ? "border-b border-border/70 bg-background/95 shadow-sm backdrop-blur-xl"
            : "border-b border-transparent bg-background/80 backdrop-blur-md"
        }`}
      >
        <div className="container mx-auto flex h-[68px] items-center justify-between px-4 sm:px-6">
          <Logo size="md" to="/" glow={false} />

          <nav className="hidden items-center gap-1 lg:flex" aria-label="Primary navigation">
            {navLinks.map((link) =>
              link.isRoute ? (
                <AuthAwareLink
                  key={link.label}
                  to={link.href}
                  className="rounded-full px-3.5 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
                >
                  {link.label}
                </AuthAwareLink>
              ) : (
                <a
                  key={link.label}
                  href={link.href}
                  className="rounded-full px-3.5 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
                >
                  {link.label}
                </a>
              ),
            )}
          </nav>

          <div className="hidden items-center gap-2 lg:flex">
            <AuthAwareLink
              to={onboardingRoutes.catalog}
              aria-label="Explore the course catalogue"
              className="inline-flex h-9 w-9 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
            >
              <Search className="h-4 w-4" />
            </AuthAwareLink>

            {user ? (
              <Link to={onboardingRoutes.studentDashboard}>
                <Button size="sm" className="rounded-full px-4 shadow-sm">
                  <LayoutDashboard className="mr-2 h-4 w-4" />
                  Dashboard
                </Button>
              </Link>
            ) : (
              <>
                <Link to={onboardingRoutes.signIn}>
                  <Button variant="ghost" size="sm" className="rounded-full px-4">
                    Sign in
                  </Button>
                </Link>
                <Link to={onboardingRoutes.signUpToApply}>
                  <Button size="sm" className="rounded-full px-5 shadow-sm">
                    Apply
                  </Button>
                </Link>
              </>
            )}
          </div>

          <button
            onClick={() => setMobileMenuOpen((open) => !open)}
            className="touch-target inline-flex items-center justify-center rounded-full p-2.5 text-foreground transition-colors hover:bg-secondary lg:hidden"
            aria-label={mobileMenuOpen ? "Close navigation" : "Open navigation"}
            aria-expanded={mobileMenuOpen}
          >
            {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>

        <div
          className={`overflow-hidden transition-all duration-300 lg:hidden ${
            mobileMenuOpen ? "max-h-[520px] border-t border-border/60 opacity-100" : "max-h-0 opacity-0"
          }`}
        >
          <nav className="container mx-auto space-y-1 px-4 py-4" aria-label="Mobile navigation">
            {navLinks.map((link) => {
              const Icon = link.icon;
              const className =
                "touch-target flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground";
              const content = (
                <>
                  <Icon className="h-4 w-4 text-primary" />
                  {link.label}
                </>
              );

              return link.isRoute ? (
                <AuthAwareLink
                  key={link.label}
                  to={link.href}
                  className={className}
                  onClick={() => setMobileMenuOpen(false)}
                >
                  {content}
                </AuthAwareLink>
              ) : (
                <a
                  key={link.label}
                  href={link.href}
                  className={className}
                  onClick={() => setMobileMenuOpen(false)}
                >
                  {content}
                </a>
              );
            })}

            <div className="grid grid-cols-2 gap-2 border-t border-border/60 pt-4">
              {user ? (
                <Link
                  to={onboardingRoutes.studentDashboard}
                  className="col-span-2"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  <Button className="w-full rounded-xl">
                    <LayoutDashboard className="mr-2 h-4 w-4" />
                    Go to dashboard
                  </Button>
                </Link>
              ) : (
                <>
                  <Link to={onboardingRoutes.signIn} onClick={() => setMobileMenuOpen(false)}>
                    <Button variant="outline" className="w-full rounded-xl">
                      Sign in
                    </Button>
                  </Link>
                  <Link to={onboardingRoutes.signUpToApply} onClick={() => setMobileMenuOpen(false)}>
                    <Button className="w-full rounded-xl">Apply</Button>
                  </Link>
                </>
              )}
            </div>
          </nav>
        </div>
      </div>
    </header>
  );
};
