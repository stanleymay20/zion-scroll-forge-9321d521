import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  BarChart3,
  BookOpen,
  Bot,
  Calendar,
  FileText,
  GraduationCap,
  Home,
  Search,
  Settings,
  Shield,
  Trophy,
  Users,
  type LucideIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandShortcut,
} from "@/components/ui/command";
import { useUserRoles } from "@/hooks/useUserRoles";

interface CommandDestination {
  label: string;
  href: string;
  icon: LucideIcon;
  group: "Campus" | "Learning" | "Academic" | "Faculty" | "Administration";
  roles?: string[];
  keywords?: string;
}

const destinations: CommandDestination[] = [
  { label: "Dashboard", href: "/dashboard", icon: Home, group: "Campus", keywords: "home overview" },
  { label: "My Courses", href: "/my-courses", icon: BookOpen, group: "Learning", keywords: "learning enrolled courses" },
  { label: "Course Catalog", href: "/catalog", icon: BookOpen, group: "Learning", keywords: "browse discover courses" },
  { label: "AI Tutors", href: "/ai-tutors", icon: Bot, group: "Learning", keywords: "tutor learning brain help" },
  { label: "Assessments", href: "/assessments", icon: FileText, group: "Learning", keywords: "quiz exam assignment" },
  { label: "Calendar", href: "/events", icon: Calendar, group: "Campus", keywords: "schedule events classes" },
  { label: "Transcript", href: "/transcript", icon: FileText, group: "Academic", keywords: "records grades" },
  { label: "Degree Audit", href: "/degree-audit", icon: GraduationCap, group: "Academic", keywords: "progress completion requirements" },
  { label: "Achievements", href: "/achievements", icon: Trophy, group: "Academic", keywords: "awards milestones" },
  { label: "Study Groups", href: "/study-groups", icon: Users, group: "Campus", keywords: "community collaboration" },
  { label: "Settings", href: "/settings", icon: Settings, group: "Campus", keywords: "profile preferences account" },
  { label: "Faculty Dashboard", href: "/faculty", icon: Users, group: "Faculty", roles: ["faculty", "admin"], keywords: "teaching" },
  { label: "Faculty Gradebook", href: "/faculty/gradebook", icon: FileText, group: "Faculty", roles: ["faculty", "admin"], keywords: "grading assessment" },
  { label: "Faculty Analytics", href: "/faculty-analytics", icon: BarChart3, group: "Faculty", roles: ["faculty", "admin"], keywords: "students course performance" },
  { label: "Admin Dashboard", href: "/admin", icon: Shield, group: "Administration", roles: ["admin"], keywords: "operations governance" },
  { label: "Admissions", href: "/admin/admissions", icon: Users, group: "Administration", roles: ["admin"], keywords: "applicants enrollment" },
  { label: "Academic Terms", href: "/admin/academic-terms", icon: Calendar, group: "Administration", roles: ["admin"], keywords: "semester registrar term" },
  { label: "System Status", href: "/system-status", icon: Shield, group: "Administration", roles: ["admin"], keywords: "health operations" },
];

const groupOrder: CommandDestination["group"][] = [
  "Campus",
  "Learning",
  "Academic",
  "Faculty",
  "Administration",
];

export const AppCommandPalette = () => {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const { roles } = useUserRoles();

  const visibleDestinations = useMemo(
    () => destinations.filter((item) => !item.roles || item.roles.some((role) => roles.includes(role))),
    [roles],
  );

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setOpen((current) => !current);
      }
    };

    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, []);

  const goTo = (href: string) => {
    setOpen(false);
    navigate(href);
  };

  return (
    <>
      <Button
        type="button"
        variant="outline"
        onClick={() => setOpen(true)}
        className="h-9 w-full max-w-md justify-start gap-2 border-border/70 bg-background/80 px-3 text-sm font-normal text-muted-foreground shadow-sm hover:bg-accent/50 hover:text-foreground"
        aria-label="Search campus navigation"
      >
        <Search className="h-4 w-4" aria-hidden="true" />
        <span className="truncate">Search campus…</span>
        <span className="ml-auto hidden items-center gap-1 rounded border bg-muted/60 px-1.5 py-0.5 font-mono text-[10px] font-medium text-muted-foreground sm:inline-flex">
          <span>⌘</span>K
        </span>
      </Button>

      <CommandDialog open={open} onOpenChange={setOpen}>
        <CommandInput placeholder="Search courses, records, faculty, or campus…" />
        <CommandList>
          <CommandEmpty>No campus destination found.</CommandEmpty>
          {groupOrder.map((group) => {
            const groupItems = visibleDestinations.filter((item) => item.group === group);
            if (groupItems.length === 0) return null;

            return (
              <CommandGroup key={group} heading={group}>
                {groupItems.map((item) => (
                  <CommandItem
                    key={item.href}
                    value={`${item.label} ${item.keywords ?? ""}`}
                    onSelect={() => goTo(item.href)}
                    className="gap-3 py-2.5"
                  >
                    <item.icon className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
                    <span>{item.label}</span>
                    <CommandShortcut>↵</CommandShortcut>
                  </CommandItem>
                ))}
              </CommandGroup>
            );
          })}
        </CommandList>
      </CommandDialog>
    </>
  );
};
