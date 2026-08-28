import { Link, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  Home, FileText, Bot, Settings, Activity,
  ChevronDown, ChevronRight, BarChart3, Monitor, Users,
  BookOpen, GraduationCap, Heart, MessageSquare, Trophy,
  Calendar, Video, Shield, Library, type LucideIcon
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { cn } from "@/lib/utils";
import { useUserRoles } from "@/hooks/useUserRoles";
import { UserProfileDropdown } from "./UserProfileDropdown";
import { NotificationBell } from "@/components/NotificationBell";
import { Logo } from "@/components/brand/Logo";

interface NavSection {
  title: string;
  items: { label: string; href: string; icon?: LucideIcon; badge?: string; roles?: string[]; external?: boolean }[];
  icon?: LucideIcon;
  roles?: string[];
}

const getNavigationSections = (userRoles: string[]): NavSection[] => {
  const allSections: NavSection[] = [
    {
      title: "Overview",
      icon: Home,
      items: [
        { label: "Dashboard", href: "/dashboard", icon: Home },
        { label: "My Courses", href: "/my-courses", icon: BookOpen },
        { label: "Calendar", href: "/events", icon: Calendar },
      ]
    },
    {
      title: "Learning",
      icon: GraduationCap,
      items: [
        { label: "Course Catalog", href: "/catalog", icon: BookOpen },
        { label: "ScrollLibrary", href: "/scroll-library", icon: Library },
        { label: "ScrollLibrary.org", href: "https://scrolllibrary.org", icon: Library, external: true },
        { label: "AtlasResearch", href: "https://atlasresearch.info", icon: FileText, external: true },
        { label: "AI Tutors", href: "/ai-tutors", icon: Bot },
        { label: "XR Classrooms", href: "/xr-classrooms", icon: Video },
        { label: "Virtual Labs", href: "/virtual-labs", icon: Monitor },
        { label: "Assessments", href: "/assessments", icon: FileText },
        { label: "Study Groups", href: "/study-groups", icon: Users },
      ]
    },
    {
      title: "Spiritual Life",
      icon: Heart,
      items: [
        { label: "Daily Devotion", href: "/daily-devotion", icon: Heart },
        { label: "Prayer Journal", href: "/prayer-journal", icon: FileText },
        { label: "Scripture Memory", href: "/scripture-memory", icon: BookOpen },
        { label: "Prayer Requests", href: "/prayer-requests", icon: Heart },
        { label: "Spiritual Mentor", href: "/spiritual-mentor", icon: Users },
      ]
    },
    {
      title: "Community",
      icon: Users,
      items: [
        { label: "Community Feed", href: "/community-feed", icon: Activity },
        { label: "Messaging", href: "/messaging", icon: MessageSquare },
        { label: "Fellowship Rooms", href: "/fellowship-rooms", icon: Users },
        { label: "Testimonies", href: "/testimonies", icon: Heart },
      ]
    },
    {
      title: "Academic Progress",
      icon: GraduationCap,
      items: [
        { label: "Transcript", href: "/transcript", icon: FileText },
        { label: "Degree Audit", href: "/degree-audit", icon: GraduationCap },
        { label: "Achievements", href: "/achievements", icon: Trophy },
        { label: "Scholarships", href: "/scholarships", icon: GraduationCap },
      ]
    },
    {
      title: "Faculty",
      icon: Users,
      roles: ["faculty", "admin"],
      items: [
        { label: "Faculty Dashboard", href: "/faculty", icon: Home, roles: ["faculty", "admin"] },
        { label: "Course Management", href: "/faculty/admin", icon: BookOpen, roles: ["faculty", "admin"] },
        { label: "Gradebook", href: "/faculty/gradebook", icon: FileText, roles: ["faculty", "admin"] },
        { label: "Analytics", href: "/faculty-analytics", icon: BarChart3, roles: ["faculty", "admin"] },
      ]
    },
    {
      title: "Admin",
      icon: Shield,
      roles: ["admin"],
      items: [
        { label: "Admin Dashboard", href: "/admin", icon: Shield, roles: ["admin"] },
        { label: "Academic Terms", href: "/admin/academic-terms", icon: Calendar, roles: ["admin"] },
        { label: "Admissions", href: "/admin/admissions", icon: Users, roles: ["admin"] },
        { label: "Analytics", href: "/analytics/dashboard", icon: BarChart3, roles: ["admin"] },
        { label: "Content Gen", href: "/admin/content-generation", icon: Bot, roles: ["admin"] },
        { label: "Institutions", href: "/admin/institutions", icon: Monitor, roles: ["admin"] },
        { label: "System Status", href: "/system-status", icon: Activity, roles: ["admin"] },
      ]
    },
  ];

  const hasAnyRole = (required?: string[]) => !required || required.some(r => userRoles.includes(r));

  return allSections
    .filter(s => hasAnyRole(s.roles))
    .map(s => ({ ...s, items: s.items.filter(i => hasAnyRole(i.roles)) }))
    .filter(s => s.items.length > 0);
};

export const MainNavigation = () => {
  const location = useLocation();
  const { roles } = useUserRoles();
  const [expandedSections, setExpandedSections] = useState<string[]>(["Overview"]);

  const navigationSections = useMemo(() => getNavigationSections(roles), [roles]);

  const toggleSection = (title: string) => {
    setExpandedSections(prev =>
      prev.includes(title) ? prev.filter(s => s !== title) : [...prev, title]
    );
  };

  const isActive = (href: string) =>
    location.pathname === href || location.pathname.startsWith(href + "/");

  const activeSectionTitle = navigationSections.find(section =>
    section.items.some(item => isActive(item.href))
  )?.title;

  useEffect(() => {
    if (!activeSectionTitle) return;
    setExpandedSections(prev =>
      prev.includes(activeSectionTitle) ? prev : [...prev, activeSectionTitle]
    );
  }, [activeSectionTitle]);

  return (
    <div className="hidden lg:flex fixed left-0 top-0 h-full w-64 bg-sidebar border-r border-sidebar-border flex-col z-40">
      <div className="p-4 border-b border-sidebar-border">
        <Logo size="md" to="/dashboard" />
      </div>
      <div className="px-4 py-3 border-b border-sidebar-border flex items-center justify-between">
        <UserProfileDropdown />
        <NotificationBell />
      </div>
      <ScrollArea className="flex-1 py-2">
        <div className="px-3 space-y-0.5">
          {navigationSections.map((section) => (
            <div key={section.title}>
              <button
                onClick={() => toggleSection(section.title)}
                className="w-full flex items-center justify-between px-3 py-2 text-xs font-sans font-semibold text-sidebar-foreground/60 uppercase tracking-wider hover:text-sidebar-foreground rounded-lg transition-colors"
              >
                <span>{section.title}</span>
                {expandedSections.includes(section.title)
                  ? <ChevronDown className="h-3.5 w-3.5" />
                  : <ChevronRight className="h-3.5 w-3.5" />}
              </button>
              {expandedSections.includes(section.title) && (
                <div className="space-y-0.5 mt-0.5 mb-2">
                  {section.items.map((item) => {
                    const inner = (
                      <div className={cn(
                        "flex items-center gap-2.5 px-3 py-2 text-sm font-sans rounded-lg transition-all duration-150",
                        !item.external && isActive(item.href)
                          ? "bg-sidebar-accent text-sidebar-primary font-medium"
                          : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
                      )}>
                        {item.icon && <item.icon className="h-4 w-4 flex-shrink-0" />}
                        <span className="truncate">{item.label}</span>
                        {item.external && <span className="ml-auto text-[9px] uppercase tracking-wider text-sidebar-foreground/40">↗</span>}
                        {item.badge && <span className="ml-auto text-[10px] bg-primary text-primary-foreground px-1.5 py-0.5 rounded-full">{item.badge}</span>}
                      </div>
                    );
                    return item.external ? (
                      <a key={item.href} href={item.href} target="_blank" rel="noreferrer">{inner}</a>
                    ) : (
                      <Link key={item.href} to={item.href}>{inner}</Link>
                    );
                  })}
                </div>
              )}
            </div>
          ))}
        </div>
      </ScrollArea>
      <div className="p-3 border-t border-sidebar-border space-y-1.5">
        <Link to="/ai-tutors">
          <Button size="sm" className="w-full font-sans text-xs">
            <Bot className="h-3.5 w-3.5 mr-2" /> Start AI Session
          </Button>
        </Link>
        <Link to="/settings">
          <Button variant="ghost" size="sm" className="w-full font-sans text-xs text-sidebar-foreground/60">
            <Settings className="h-3.5 w-3.5 mr-2" /> Settings
          </Button>
        </Link>
      </div>
    </div>
  );
};
