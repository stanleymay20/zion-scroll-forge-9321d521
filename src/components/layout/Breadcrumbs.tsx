import { Link, useLocation } from "react-router-dom";
import { ChevronRight, Home } from "lucide-react";
import { cn } from "@/lib/utils";

interface BreadcrumbItem {
  label: string;
  href: string;
}

const pathLabels: Record<string, string> = {
  dashboard: "Dashboard",
  courses: "Courses",
  degrees: "Degree Programs",
  "ai-tutors": "AI Tutors",
  "xr-classrooms": "XR Classrooms",
  "virtual-labs": "Virtual Labs",
  assessments: "Assessments",
  "spiritual-formation": "Spiritual Formation",
  "divine-scorecard": "Divine Scorecard",
  "prophetic-checkins": "Prophetic Check-ins",
  "prayer-requests": "Prayer Center",
  "calling-discernment": "Calling Discernment",
  community: "Community",
  forums: "Forums",
  "study-groups": "Study Groups",
  mentorship: "Mentorship",
  projects: "Projects",
  scrollcoin: "ScrollCoin",
  marketplace: "Marketplace",
  badges: "ScrollBadges",
  achievements: "Achievements",
  faculties: "Faculties",
  "scroll-medicine": "ScrollMedicine",
  "prophetic-law": "Prophetic Law",
  "scroll-economy": "Scroll Economy",
  "edenic-science": "Edenic Science",
  "geoprophetic-intelligence": "GeoProphetic Intelligence",
  "scroll-theology": "Scroll Theology",
  "scroll-ai": "Scroll AI",
  "scroll-engineering": "Scroll Engineering",
  "scroll-arts": "Scroll Arts",
  "scroll-business": "Scroll Business",
  "scroll-education": "Scroll Education",
  "scroll-communications": "Scroll Communications",
  "career-pathways": "Career Pathways",
  "job-board": "Job Board",
  "resume-builder": "Resume Builder",
  "interview-prep": "Interview Prep",
  research: "Research",
  labs: "Labs",
  publications: "Publications",
  "innovation-challenges": "Innovation Challenges",
  help: "Help Center",
  accessibility: "Accessibility",
  "technical-support": "Technical Support",
  contact: "Contact Us",
  profile: "Profile",
  settings: "Settings",
};

export const Breadcrumbs = () => {
  const location = useLocation();
  
  const generateBreadcrumbs = (pathname: string): BreadcrumbItem[] => {
    const paths = pathname.split("/").filter(Boolean);
    const breadcrumbs: BreadcrumbItem[] = [
      { label: "Home", href: "/dashboard" }
    ];
    
    let currentPath = "";
    paths.forEach((path, index) => {
      currentPath += `/${path}`;
      const label = pathLabels[path] || path.charAt(0).toUpperCase() + path.slice(1);
      
      // Don't add the current page as a link if it's the last item
      if (index === paths.length - 1) {
        breadcrumbs.push({ label, href: currentPath });
      } else {
        breadcrumbs.push({ label, href: currentPath });
      }
    });
    
    return breadcrumbs;
  };

  const breadcrumbs = generateBreadcrumbs(location.pathname);

  // Don't show breadcrumbs on the main dashboard
  if (location.pathname === "/dashboard" || breadcrumbs.length <= 1) {
    return null;
  }

  return (
    <nav
      aria-label="Breadcrumb"
      className="flex items-center text-xs sm:text-sm text-muted-foreground mb-3 sm:mb-5 overflow-x-auto hide-scrollbar whitespace-nowrap"
    >
      {breadcrumbs.map((crumb, index) => (
        <div key={crumb.href} className="flex items-center shrink-0">
          {index > 0 && <ChevronRight className="h-3.5 w-3.5 mx-1.5 opacity-60" />}
          {index === 0 && <Home className="h-3.5 w-3.5 mr-1.5" />}
          {index === breadcrumbs.length - 1 ? (
            <span className="text-foreground font-medium">{crumb.label}</span>
          ) : (
            <Link
              to={crumb.href}
              className={cn(
                "hover:text-foreground transition-colors",
                index === 0 && "flex items-center"
              )}
            >
              {crumb.label}
            </Link>
          )}
        </div>
      ))}
    </nav>
  );
};