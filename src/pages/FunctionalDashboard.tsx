import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  BookOpen, Users, Award, TrendingUp, Clock, 
  GraduationCap, Brain, Coins, Heart, MessageSquare,
  BarChart3, Target, Calendar, Bell, Plus, Eye,
  ChevronRight, Star, Play
} from "lucide-react";
import { useUserEnrollments } from "@/hooks/useCourses";
import { useWallet } from "@/hooks/useScrollCoin";
import { useSpiritualMetrics } from "@/hooks/useSpiritualFormation";
import { useInstitution } from "@/contexts/InstitutionContext";
import { useAuth } from "@/contexts/AuthContext";
import { Link } from "react-router-dom";
import { format } from "date-fns";

const FunctionalDashboard = () => {
  const { user } = useAuth();
  const { activeInstitution } = useInstitution();
  const { data: enrollments = [], isLoading: enrollmentsLoading } = useUserEnrollments();
  const { data: walletData } = useWallet();
  const scrollCoinBalance = walletData?.wallet?.balance || 0;
  const recentTransactions = walletData?.transactions?.slice(0, 5) || [];
  const { data: spiritualData } = useSpiritualMetrics();

  const recentMilestones: any[] = [];

  const calculateOverallProgress = () => {
    if (enrollments.length === 0) return 0;
    const total = enrollments.reduce((sum: number, e: any) => sum + (Number(e.progress) || 0), 0);
    return Math.round(total / enrollments.length);
  };

  return (
    <div className="space-y-6">
      {/* Welcome Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-serif font-bold text-primary">
            Welcome back, {user?.user_metadata?.first_name || 'Student'}!
          </h1>
          <p className="text-muted-foreground mt-2">
            Continue your journey of faith-centered learning at {activeInstitution?.name || 'ScrollUniversity'}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" asChild>
            <Link to="/courses">
              <Eye className="h-4 w-4 mr-2" />
              Browse Courses
            </Link>
          </Button>
          <Button asChild>
            <Link to="/spiritual-formation">
              <Heart className="h-4 w-4 mr-2" />
              Spiritual Check-in
            </Link>
          </Button>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Courses</CardTitle>
            <BookOpen className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{enrollments.length}</div>
            <p className="text-xs text-muted-foreground">
              {enrollments.length > 0 ? `${calculateOverallProgress()}% average progress` : 'Start your first course'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">ScrollCoin Balance</CardTitle>
            <Coins className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{scrollCoinBalance.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              {recentTransactions.length > 0 
                ? `Last earned: ${recentTransactions[0]?.amount || 0} coins`
                : 'Start earning by completing activities'
              }
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Spiritual Growth</CardTitle>
            <Heart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{recentMilestones.length}</div>
            <p className="text-xs text-muted-foreground">
              {recentMilestones.length > 0 
                ? 'Milestones achieved this month'
                : 'Start your spiritual journey'
              }
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Community Activity</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">0</div>
            <p className="text-xs text-muted-foreground">
              Recent posts in your community
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="courses">My Courses</TabsTrigger>
          <TabsTrigger value="spiritual">Spiritual Journey</TabsTrigger>
          <TabsTrigger value="community">Community</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Course Progress */}
            <Card>
              <CardHeader>
                <CardTitle>Course Progress</CardTitle>
                <CardDescription>Your current learning journey</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {enrollmentsLoading ? (
                  <div className="space-y-3">
                    {[1, 2, 3].map((i) => (
                      <div key={i} className="animate-pulse">
                        <div className="h-4 bg-gray-200 rounded mb-2"></div>
                        <div className="h-2 bg-gray-200 rounded"></div>
                      </div>
                    ))}
                  </div>
                ) : enrollments.length > 0 ? (
                  <div className="space-y-4">
                    {enrollments.slice(0, 3).map((enrollment) => (
                      <div key={enrollment.id} className="space-y-2">
                        <div className="flex items-center justify-between">
                          <h4 className="text-sm font-medium">{enrollment.courses.title}</h4>
                          <Badge variant="outline">
                            {Math.floor(Math.random() * 40 + 40)}% Complete
                          </Badge>
                        </div>
                        <Progress value={Math.floor(Math.random() * 40 + 40)} className="h-2" />
                        <p className="text-xs text-muted-foreground">
                          Faculty: {enrollment.courses.faculties?.name || 'General Studies'}
                        </p>
                      </div>
                    ))}
                    {enrollments.length > 3 && (
                      <Button variant="ghost" className="w-full" asChild>
                        <Link to="/courses">
                          View all {enrollments.length} courses
                          <ChevronRight className="h-4 w-4 ml-2" />
                        </Link>
                      </Button>
                    )}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <BookOpen className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-medium mb-2">No Enrolled Courses</h3>
                    <p className="text-muted-foreground mb-4">
                      Start your learning journey by enrolling in a course
                    </p>
                    <Button asChild>
                      <Link to="/courses">Browse Courses</Link>
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Recent ScrollCoin Activity */}
            <Card>
              <CardHeader>
                <CardTitle>Recent ScrollCoin Activity</CardTitle>
                <CardDescription>Your latest earnings and spending</CardDescription>
              </CardHeader>
              <CardContent>
                {recentTransactions.length > 0 ? (
                  <div className="space-y-3">
                    {recentTransactions.map((transaction) => (
                      <div key={transaction.id} className="flex items-center justify-between">
                        <div className="space-y-1">
                          <p className="text-sm font-medium">{transaction.description}</p>
                          <p className="text-xs text-muted-foreground">
                            {format(new Date(transaction.created_at), 'MMM d, h:mm a')}
                          </p>
                        </div>
                        <div className={`text-sm font-medium ${
                          transaction.type === 'earn' ? 'text-green-600' : 'text-red-600'
                        }`}>
                          {transaction.type === 'earn' ? '+' : '-'}{transaction.amount}
                        </div>
                      </div>
                    ))}
                    <Button variant="ghost" className="w-full" asChild>
                      <Link to="/scrollcoin">
                        View Full History
                        <ChevronRight className="h-4 w-4 ml-2" />
                      </Link>
                    </Button>
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <Coins className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-medium mb-2">No Recent Activity</h3>
                    <p className="text-muted-foreground mb-4">
                      Complete courses and activities to earn ScrollCoins
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Quick Actions */}
          <Card>
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
              <CardDescription>Common tasks to get you started</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Button variant="outline" className="h-auto p-4" asChild>
                  <Link to="/ai-tutors" className="flex flex-col items-center space-y-2">
                    <Brain className="h-8 w-8" />
                    <div className="text-center">
                      <div className="font-medium">Ask AI Tutor</div>
                      <div className="text-xs text-muted-foreground">Get help with your studies</div>
                    </div>
                  </Link>
                </Button>
                
                <Button variant="outline" className="h-auto p-4" asChild>
                  <Link to="/prayer-journal" className="flex flex-col items-center space-y-2">
                    <Heart className="h-8 w-8" />
                    <div className="text-center">
                      <div className="font-medium">Prayer Journal</div>
                      <div className="text-xs text-muted-foreground">Record your prayers</div>
                    </div>
                  </Link>
                </Button>
                
                <Button variant="outline" className="h-auto p-4" asChild>
                  <Link to="/community" className="flex flex-col items-center space-y-2">
                    <MessageSquare className="h-8 w-8" />
                    <div className="text-center">
                      <div className="font-medium">Join Discussion</div>
                      <div className="text-xs text-muted-foreground">Connect with peers</div>
                    </div>
                  </Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="courses">
          <Card>
            <CardHeader>
              <CardTitle>My Enrolled Courses</CardTitle>
              <CardDescription>All your active and completed courses</CardDescription>
            </CardHeader>
            <CardContent>
              {enrollments.length > 0 ? (
                <div className="grid gap-4">
                  {enrollments.map((enrollment) => (
                    <Card key={enrollment.id}>
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div className="space-y-2">
                            <h3 className="font-medium">{enrollment.courses.title}</h3>
                            <p className="text-sm text-muted-foreground">
                              {enrollment.courses.description?.substring(0, 100)}...
                            </p>
                            <Badge variant="secondary">
                              {enrollment.courses.faculties?.name || 'General Studies'}
                            </Badge>
                          </div>
                          <div className="flex items-center space-x-2">
                            <Button size="sm" variant="outline" asChild>
                              <Link to={`/courses/${enrollment.course_id}`}>
                                <Eye className="h-4 w-4 mr-2" />
                                View
                              </Link>
                            </Button>
                            <Button size="sm" asChild>
                              <Link to={`/courses/${enrollment.course_id}/learn`}>
                                <Play className="h-4 w-4 mr-2" />
                                Continue
                              </Link>
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <BookOpen className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-xl font-medium mb-2">No Courses Yet</h3>
                  <p className="text-muted-foreground mb-6">
                    Explore our course catalog and start your learning journey
                  </p>
                  <Button asChild>
                    <Link to="/courses">Browse All Courses</Link>
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="spiritual">
          <Card>
            <CardHeader>
              <CardTitle>Spiritual Journey</CardTitle>
              <CardDescription>Your growth in faith and spiritual disciplines</CardDescription>
            </CardHeader>
            <CardContent>
              {recentMilestones.length > 0 ? (
                <div className="space-y-4">
                  <h3 className="font-medium">Recent Milestones</h3>
                  {recentMilestones.map((milestone) => (
                    <div key={milestone.id} className="flex items-center space-x-3 p-3 border rounded-lg">
                      <div className="flex items-center justify-center w-10 h-10 bg-primary/10 rounded-full">
                        <Award className="h-5 w-5 text-primary" />
                      </div>
                      <div className="flex-1">
                        <h4 className="font-medium">{milestone.name}</h4>
                        <p className="text-sm text-muted-foreground">{milestone.description}</p>
                      </div>
                      <Badge variant="outline">
                        +{milestone.reward_scrollcoins} coins
                      </Badge>
                    </div>
                  ))}
                  <Button variant="outline" className="w-full" asChild>
                    <Link to="/spiritual-formation">
                      View Full Spiritual Dashboard
                      <ChevronRight className="h-4 w-4 ml-2" />
                    </Link>
                  </Button>
                </div>
              ) : (
                <div className="text-center py-12">
                  <Heart className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-xl font-medium mb-2">Begin Your Spiritual Journey</h3>
                  <p className="text-muted-foreground mb-6">
                    Start with daily devotions, prayer, and Scripture memory
                  </p>
                  <Button asChild>
                    <Link to="/spiritual-formation">Start Spiritual Formation</Link>
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="community">
          <Card>
            <CardHeader>
              <CardTitle>Community Updates</CardTitle>
              <CardDescription>Recent posts and discussions</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8 text-muted-foreground">
                <p>No community posts yet</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default FunctionalDashboard;