import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { AuthAwareLink } from "@/components/auth/AuthAwareLink";
import { Menu, X, BookOpen, GraduationCap, Heart, Shield, LayoutDashboard } from "lucide-react";
import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Logo } from "@/components/brand/Logo";
import { onboardingRoutes } from "@/lib/onboardingRoutes";

export const Header = () => {
  const { user } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const navLinks = [
    { label: "Faculties", href: "#faculties", icon: GraduationCap },
    { label: "Courses", href: "/courses", isRoute: true, icon: BookOpen },
    { label: "Degrees", href: "/degrees", isRoute: true, icon: Shield },
    { label: "Prayer", href: "#prayer", icon: Heart },
  ];

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled
          ? "bg-background/95 backdrop-blur-lg shadow-sm border-b border-border/50"
          : "bg-transparent"
      }`}
    >
      <div className="container mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
        {/* Logo */}
        <Logo size="md" to="/" glow={!scrolled} />


        {/* Desktop Navigation */}
        <nav className="hidden lg:flex items-center gap-1">
          {navLinks.map((link) =>
            link.isRoute ? (
              <AuthAwareLink
                key={link.label}
                to={link.href}
                className="px-4 py-2 text-sm font-medium text-muted-foreground hover:text-primary transition-colors rounded-lg hover:bg-primary/5"
              >
                {link.label}
              </AuthAwareLink>
            ) : (
              <a
                key={link.label}
                href={link.href}
                className="px-4 py-2 text-sm font-medium text-muted-foreground hover:text-primary transition-colors rounded-lg hover:bg-primary/5"
              >
                {link.label}
              </a>
            )
          )}
        </nav>

        {/* Desktop Auth */}
        <div className="hidden sm:flex items-center gap-3">
          {user ? (
            <Link to={onboardingRoutes.studentDashboard}>
              <Button size="sm" className="font-sans text-sm bg-primary hover:bg-primary/90 text-primary-foreground shadow-sm">
                <LayoutDashboard className="h-4 w-4 mr-2" />
                Go to Dashboard
              </Button>
            </Link>
          ) : (
            <>
              <Link to={onboardingRoutes.signIn}>
                <Button variant="ghost" size="sm" className="font-sans text-sm">
                  Sign In
                </Button>
              </Link>
              <Link to={onboardingRoutes.signUpToApply}>
                <Button size="sm" className="font-sans text-sm bg-primary hover:bg-primary/90 text-primary-foreground shadow-sm">
                  Get Started
                </Button>
              </Link>
            </>
          )}
        </div>

        {/* Mobile Menu Button */}
        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="sm:hidden p-2.5 text-foreground hover:bg-accent/50 rounded-lg transition-colors touch-target"
          aria-label="Toggle menu"
        >
          {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {/* Mobile Menu — slide down */}
      <div
        className={`sm:hidden overflow-hidden transition-all duration-300 ease-in-out ${
          mobileMenuOpen ? "max-h-[400px] opacity-100" : "max-h-0 opacity-0"
        }`}
      >
        <div className="bg-background/98 backdrop-blur-lg border-t border-border/50">
          <nav className="container mx-auto px-4 py-4 space-y-1">
            {navLinks.map((link) => {
              const className = "flex items-center gap-3 text-sm font-medium text-muted-foreground hover:text-primary py-3 px-3 rounded-lg hover:bg-primary/5 transition-colors touch-target";
              const content = (
                <>
                  <link.icon className="h-4 w-4" />
                  {link.label}
                </>
              );

              return link.isRoute ? (
                <AuthAwareLink
                  key={link.label}
                  to={link.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className={className}
                >
                  {content}
                </AuthAwareLink>
              ) : (
                <a
                  key={link.label}
                  href={link.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className={className}
                >
                  {content}
                </a>
              );
            })}
            <div className="flex gap-2 pt-3 mt-2 border-t border-border/50">
              {user ? (
                <Link to={onboardingRoutes.studentDashboard} className="flex-1" onClick={() => setMobileMenuOpen(false)}>
                  <Button size="sm" className="w-full font-sans">
                    <LayoutDashboard className="h-4 w-4 mr-2" />
                    Dashboard
                  </Button>
                </Link>
              ) : (
                <>
                  <Link to={onboardingRoutes.signIn} className="flex-1" onClick={() => setMobileMenuOpen(false)}>
                    <Button variant="outline" size="sm" className="w-full font-sans">
                      Sign In
                    </Button>
                  </Link>
                  <Link to={onboardingRoutes.signUpToApply} className="flex-1" onClick={() => setMobileMenuOpen(false)}>
                    <Button size="sm" className="w-full font-sans">
                      Get Started
                    </Button>
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
