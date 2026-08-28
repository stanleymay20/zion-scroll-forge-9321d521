import { PageTemplate } from "@/components/layout/PageTemplate";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Book, Heart, Brain, TrendingUp, Star, Activity, Bell, Target
} from "lucide-react";
import { Link } from "react-router-dom";
import { useDashboard } from "@/hooks/useDashboard";
import { useUserEnrollments } from "@/hooks/useCourses";
import { useAcknowledgeLordship } from "@/hooks/useSpiritual";
import { useAuth } from "@/contexts/AuthContext";
import { QuickActions } from "@/components/dashboard/QuickActions";
import { PersonalizedContent } from "@/components/dashboard/PersonalizedContent";
import { JourneyProgress } from "@/components/dashboard/JourneyProgress";
import { StudentOnboarding } from "@/components/onboarding/StudentOnboarding";
import { LifecycleBanner } from "@/components/lifecycle/LifecycleBanner";
import { AcademicAssignmentCard } from "@/components/lifecycle/AcademicAssignmentCard";

export default function EnhancedDashboard() {
  const { user } = useAuth();
  const { data: dashboardData, isLoading } = useDashboard();
  const { data: enrollments } = useUserEnrollments();
  const acknowledgeLordship = useAcknowledgeLordship();

  const getUserGreeting = () => {
    const name = user?.user_metadata?.full_name || user?.email?.split('@')[0] || "Faithful Scholar";
    const firstName = name.split(' ')[0];
    const hour = new Date().getHours();
    if (hour < 12) return `Good morning, ${firstName}`;
    if (hour < 18) return `Good afternoon, ${firstName}`;
    return `Good evening, ${firstName}`;
  };

  if (isLoading || !dashboardData) {
    return (
      <PageTemplate title="Loading..." description="">
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Loading your dashboard...</p>
        </div>
      </PageTemplate>
    );
  }

  const completedCourses = (enrollments ?? []).filter(
    (enrollment: { progress: number }) => enrollment.progress === 100
  ).length;

  const quickStats = [
    { label: "Courses Enrolled", value: String(dashboardData.courses_enrolled), change: `${enrollments?.length ?? 0} active`, icon: Book, color: "text-primary" },
    { label: "Courses Completed", value: String(completedCourses), change: "Verified course progress", icon: Target, color: "text-accent" },
    { label: "Prayer Requests", value: String(dashboardData.total_prayers), change: `${dashboardData.prayers_answered} answered`, icon: Heart, color: "text-destructive" },
    { label: "Avg Progress", value: `${Math.round(dashboardData.avg_progress ?? 0)}%`, change: "Across all courses", icon: TrendingUp, color: "text-success" },
  ];

  return (
    <PageTemplate 
      title={getUserGreeting()}
      description="Continue your transformative journey in Christ-centered education"
      actions={
        <div className="flex flex-wrap gap-2">
          <Link to="/courses"><Button variant="outline"><Book className="h-4 w-4 mr-2" />Browse Courses</Button></Link>
          <Link to="/ai-tutors"><Button><Brain className="h-4 w-4 mr-2" />Start AI Session</Button></Link>
        </div>
      }
    >
      <LifecycleBanner />
      <AcademicAssignmentCard />

      <Card className="border-primary/20 bg-gradient-to-r from-primary/5 to-secondary/5">
        <CardHeader><CardTitle className="flex items-center space-x-2"><Star className="h-5 w-5 text-primary" /><span>Daily Acknowledgment</span></CardTitle></CardHeader>
        <CardContent>
          <p className="text-lg font-serif italic text-primary mb-4">"Jesus Christ is Lord over my studies, my calling, and my future. All knowledge and wisdom flow from Him."</p>
          <Button size="sm" onClick={() => acknowledgeLordship.mutate(undefined)} disabled={acknowledgeLordship.isPending}>
            {acknowledgeLordship.isPending ? 'Acknowledging...' : '✓ Acknowledge Christ as Lord'}
          </Button>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {quickStats.map((stat) => (
          <Card key={stat.label} className="hover:shadow-md transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{stat.label}</CardTitle>
              <stat.icon className={`h-5 w-5 ${stat.color}`} />
            </CardHeader>
            <CardContent><div className="text-2xl font-bold">{stat.value}</div><p className="text-xs text-muted-foreground mt-1">{stat.change}</p></CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <StudentOnboarding enrollmentCount={enrollments?.length || 0} />
          <JourneyProgress coursesCompleted={completedCourses} />
          <QuickActions />

          <Card>
            <CardHeader><CardTitle className="flex items-center space-x-2"><Activity className="h-5 w-5" /><span>Recent Activity</span></CardTitle><CardDescription>Your latest actions and updates</CardDescription></CardHeader>
            <CardContent>
              <div className="space-y-4">
                {enrollments && enrollments.length > 0 ? enrollments.slice(0, 5).map((enrollment: { id: string; progress: number; updated_at?: string | null; courses?: { title?: string | null } | null }) => (
                  <div key={enrollment.id} className="flex items-start space-x-3 text-sm">
                    <div className="h-2 w-2 rounded-full bg-primary mt-2" />
                    <div className="flex-1"><p className="font-medium">Progress in {enrollment.courses?.title}</p><p className="text-muted-foreground">{enrollment.progress}% complete • {enrollment.updated_at ? new Date(enrollment.updated_at).toLocaleDateString() : 'Recently'}</p></div>
                  </div>
                )) : <p className="text-sm text-muted-foreground text-center py-4">No recent activity. Start learning to see your progress here!</p>}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="flex items-center space-x-2"><Bell className="h-5 w-5" /><span>Announcements</span></CardTitle></CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="p-3 border rounded-lg bg-accent/50">
                  <div className="flex items-start space-x-2"><Badge variant="default">New</Badge><div><h4 className="font-medium">New AI Tutor Features</h4><p className="text-sm text-muted-foreground mt-1">Experience enhanced video avatars and real-time slide generation in your tutoring sessions.</p></div></div>
                </div>
                <div className="p-3 border rounded-lg">
                  <div className="flex items-start space-x-2"><Badge variant="outline">Academic</Badge><div><h4 className="font-medium">Verified mastery drives progress</h4><p className="text-sm text-muted-foreground mt-1">Course advancement is based on trusted assessments and demonstrated learning evidence.</p></div></div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <PersonalizedContent enrollments={enrollments} recommendations={[]} upcomingEvents={[]} recentActivity={[]} />
        </div>
      </div>
    </PageTemplate>
  );
}
