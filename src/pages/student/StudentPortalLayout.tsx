import { NavLink, Navigate, Outlet } from "react-router-dom";
import { LayoutDashboard, BookOpen, Calendar, GraduationCap, FileText, BarChart3, Trophy, ClipboardCheck, MessageSquare, Target, Bell, User, Loader2, ShieldAlert } from "lucide-react";
import { cn } from "@/lib/utils";
import { useStudentLifecycleSnapshot } from "@/hooks/useStudentLifecycleSnapshot";
import { getRequiredStudentOnboardingRoute } from "@/lib/studentLifecycle";

const NAV = [
  { to: "/student/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/student/courses", label: "Courses", icon: BookOpen },
  { to: "/student/schedule", label: "Schedule", icon: Calendar },
  { to: "/student/degree-audit", label: "Degree Audit", icon: GraduationCap },
  { to: "/student/transcript", label: "Transcript", icon: FileText },
  { to: "/student/academic-record", label: "Academic Record", icon: BarChart3 },
  { to: "/student/graduation", label: "Graduation", icon: Trophy },
  { to: "/student/attendance", label: "Attendance", icon: ClipboardCheck },
  { to: "/student/advising", label: "Advising", icon: MessageSquare },
  { to: "/student/outcomes", label: "Outcomes", icon: Target },
  { to: "/student/notifications", label: "Notifications", icon: Bell },
  { to: "/student/profile", label: "Profile", icon: User },
];

export default function StudentPortalLayout() {
  const lifecycle = useStudentLifecycleSnapshot();

  if (lifecycle.authLoading || lifecycle.isLoading) {
    return (
      <div className="min-h-[50vh] flex items-center justify-center gap-2 text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin" />
        Verifying student lifecycle…
      </div>
    );
  }

  if (!lifecycle.authenticated) {
    return <Navigate to="/auth?redirect=%2Fstudent%2Fdashboard" replace />;
  }

  if (lifecycle.isError || !lifecycle.data) {
    return (
      <div className="container mx-auto py-10 px-4 max-w-xl text-center space-y-3">
        <ShieldAlert className="h-8 w-8 mx-auto text-destructive" />
        <h2 className="font-serif text-2xl">Student access could not be verified</h2>
        <p className="text-sm text-muted-foreground">
          ScrollUniversity could not verify your governed lifecycle milestones. Academic portal access remains closed until verification succeeds.
        </p>
      </div>
    );
  }

  const requiredRoute = getRequiredStudentOnboardingRoute(lifecycle.data);
  if (requiredRoute) return <Navigate to={requiredRoute} replace />;

  return (
    <div className="container mx-auto py-6 px-4 grid grid-cols-1 lg:grid-cols-[240px_1fr] gap-6">
      <aside className="lg:sticky lg:top-20 lg:self-start">
        <div className="mb-4">
          <h2 className="font-serif text-2xl">Student Portal</h2>
          <p className="text-xs text-muted-foreground">Your academic journey</p>
        </div>
        <nav className="flex lg:flex-col gap-1 overflow-x-auto lg:overflow-visible">
          {NAV.map((n) => (
            <NavLink
              key={n.to}
              to={n.to}
              className={({ isActive }) => cn(
                "flex items-center gap-2 px-3 py-2 rounded-md text-sm whitespace-nowrap",
                isActive ? "bg-primary text-primary-foreground" : "hover:bg-muted"
              )}
            >
              <n.icon className="h-4 w-4" /><span>{n.label}</span>
            </NavLink>
          ))}
        </nav>
      </aside>
      <main className="min-w-0"><Outlet /></main>
    </div>
  );
}
