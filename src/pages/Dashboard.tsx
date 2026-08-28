import { PageTemplate } from "@/components/layout/PageTemplate";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { SkeletonCard, SkeletonList } from "@/components/ui/skeleton-card";
import { 
  Book, Trophy, Heart, Brain, 
  TrendingUp, Calendar, Star, ArrowRight, Sparkles
} from "lucide-react";
import { Link } from "react-router-dom";
import { useDashboard } from "@/hooks/useDashboard";
import { useUserEnrollments } from "@/hooks/useCourses";
import { useAcknowledgeLordship } from "@/hooks/useSpiritual";
import { cn } from "@/lib/utils";
import { StudentProgramAssignmentBanner } from "@/components/admissions/PendingProgramAssignment";
import { AcademicStandingCard } from "@/components/standing/AcademicStandingCard";

export default function Dashboard() {
  const { data: dashboardData, isLoading } = useDashboard();
  const { data: enrollments } = useUserEnrollments();
  const acknowledgeLordship = useAcknowledgeLordship();

  if (isLoading || !dashboardData) {
    return (
      <PageTemplate title="Welcome back" description="Loading your dashboard...">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2"><SkeletonList count={4} /></div>
          <SkeletonList count={3} />
        </div>
      </PageTemplate>
    );
  }

  const completedCourses = (enrollments ?? []).filter((enrollment: any) => Number(enrollment.progress ?? 0) >= 100).length;

  const quickStats = [
    { label: "Courses Enrolled", value: String(dashboardData.courses_enrolled), sub: `${enrollments?.length ?? 0} active`, icon: Book, color: "text-primary" },
    { label: "Courses Completed", value: String(completedCourses), sub: "Verified course progress", icon: Trophy, color: "text-accent" },
    { label: "Prayer Requests", value: String(dashboardData.total_prayers), sub: `${dashboardData.prayers_answered} answered`, icon: Heart, color: "text-destructive" },
    { label: "Avg Progress", value: `${Math.round(dashboardData.avg_progress ?? 0)}%`, sub: "Across all courses", icon: TrendingUp, color: "text-success" },
  ];

  return (
    <PageTemplate 
      title="Welcome back, Faithful Scholar"
      description="Continue your transformative journey in Christ-centered education"
      actions={
        <div className="flex gap-2">
          <Link to="/spiritual-formation">
            <Button variant="outline" size="sm">
              <Calendar className="h-4 w-4 mr-2" />
              Schedule
            </Button>
          </Link>
          <Link to="/prayer-requests">
            <Button size="sm">
              <Heart className="h-4 w-4 mr-2" />
              Prayer Request
            </Button>
          </Link>
        </div>
      }
    >
      <StudentProgramAssignmentBanner />
      <AcademicStandingCard />
      <Card className="border-primary/20 bg-gradient-to-r from-primary/5 via-transparent to-accent/5 animate-fade-up">
        <CardContent className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 py-5">
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-full bg-accent/10">
              <Sparkles className="h-5 w-5 text-accent" />
            </div>
            <div>
              <p className="text-sm font-medium text-foreground mb-1">Daily Acknowledgment</p>
              <p className="text-sm font-serif italic text-muted-foreground">
                "Jesus Christ is Lord over my studies, my calling, and my future."
              </p>
            </div>
          </div>
          <Button 
            size="sm" 
            variant="sacred"
            onClick={() => acknowledgeLordship.mutate(undefined)}
            disabled={acknowledgeLordship.isPending}
            className="shrink-0"
          >
            {acknowledgeLordship.isPending ? 'Acknowledging...' : '✓ Acknowledge'}
          </Button>
        </CardContent>
      </Card>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {quickStats.map((stat, i) => (
          <Card key={stat.label} className={cn("card-hover animate-fade-up", `animate-fade-up-delay-${i + 1}`)}>
            <CardContent className="pt-5 pb-4 px-4">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs sm:text-sm font-medium text-muted-foreground">{stat.label}</span>
                <stat.icon className={cn("h-4 w-4", stat.color)} />
              </div>
              <div className="text-2xl sm:text-3xl font-bold font-serif tracking-tight">{stat.value}</div>
              <p className="text-[11px] text-muted-foreground mt-1">{stat.sub}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6">
        <div className="lg:col-span-2 space-y-4">
          <Card className="animate-fade-up animate-fade-up-delay-2">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-lg">Learning Progress</CardTitle>
                  <CardDescription>Your journey through the Supreme Scroll Faculties</CardDescription>
                </div>
                <Link to="/courses">
                  <Button variant="ghost" size="sm">
                    View All <ArrowRight className="h-3.5 w-3.5 ml-1" />
                  </Button>
                </Link>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {enrollments && enrollments.length > 0 ? (
                enrollments.slice(0, 4).map((enrollment: any) => (
                  <Link key={enrollment.id} to={`/courses/${enrollment.course_id}`} className="block group">
                    <div className="flex items-center gap-3 p-3 rounded-lg hover:bg-muted/50 transition-colors">
                      <div className="p-2 rounded-lg bg-primary/10 group-hover:bg-primary/15 transition-colors">
                        <Book className="h-4 w-4 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{enrollment.courses.title}</p>
                        <p className="text-xs text-muted-foreground">{enrollment.courses.faculty}</p>
                      </div>
                      <div className="text-right shrink-0">
                        <span className="text-sm font-semibold">{enrollment.progress}%</span>
                        <Progress value={enrollment.progress} className="h-1.5 w-20 mt-1" />
                      </div>
                    </div>
                  </Link>
                ))
              ) : (
                <div className="text-center py-8">
                  <Book className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
                  <p className="text-sm text-muted-foreground mb-3">No courses yet</p>
                  <Link to="/courses">
                    <Button size="sm">Explore Courses</Button>
                  </Link>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-4">
          <Card className="animate-fade-up animate-fade-up-delay-3">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Heart className="h-4 w-4 text-primary" />
                Spiritual Formation
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Prayer Requests</span>
                <Badge variant="secondary" className="font-mono">{dashboardData.total_prayers}</Badge>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Prayers Answered</span>
                <Badge variant="outline" className="font-mono">{dashboardData.prayers_answered}</Badge>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Course Progress</span>
                <Badge className="font-mono">{Math.round(dashboardData.avg_progress ?? 0)}%</Badge>
              </div>
              <Link to="/spiritual-formation" className="block pt-1">
                <Button variant="outline" size="sm" className="w-full text-xs">
                  View Full Scorecard
                </Button>
              </Link>
            </CardContent>
          </Card>

          <Card className="animate-fade-up animate-fade-up-delay-4">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-2">
              {[
                { label: "Courses", href: "/courses", icon: Book },
                { label: "AI Tutor", href: "/ai-tutors", icon: Brain },
                { label: "Prayer", href: "/prayer-requests", icon: Heart },
                { label: "Achievements", href: "/achievements", icon: Trophy },
              ].map(action => (
                <Link key={action.href} to={action.href}>
                  <Button variant="outline" size="sm" className="w-full h-auto py-3 flex-col gap-1.5 text-xs">
                    <action.icon className="h-4 w-4" />
                    {action.label}
                  </Button>
                </Link>
              ))}
            </CardContent>
          </Card>

          <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-accent/5 animate-fade-up animate-fade-up-delay-4">
            <CardContent className="pt-5 pb-4">
              <div className="flex items-center gap-2 mb-2">
                <div className="h-2 w-2 rounded-full bg-success animate-pulse" />
                <span className="text-xs font-medium text-muted-foreground">ScrollMentor AI — Online</span>
              </div>
              <p className="text-xs text-muted-foreground mb-3">
                Get study guidance, ask questions, or request spiritual insights.
              </p>
              <Link to="/ai-tutors">
                <Button size="sm" className="w-full text-xs">
                  <Brain className="h-3.5 w-3.5 mr-2" />
                  Start AI Session
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>
    </PageTemplate>
  );
}
