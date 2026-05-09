import { PageTemplate } from '@/components/layout/PageTemplate';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { useLearningGoals, useCreateLearningGoal, useUpdateLearningGoal } from '@/hooks/usePersonalization';
import { useAuth } from '@/contexts/AuthContext';
import { useState } from 'react';
import { Loader2, Target, Trophy, Calendar, CheckCircle2, Plus } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';

console.info('✝️ Learning Goals — Christ is Lord over our aspirations');

export default function LearningGoals() {
  const { user } = useAuth();
  const { data: goals, isLoading } = useLearningGoals();
  const createGoal = useCreateLearningGoal();
  const updateGoal = useUpdateLearningGoal();
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const [newGoal, setNewGoal] = useState({
    goal_type: 'course_completion' as 'course_completion' | 'mastery_level' | 'scrollcoin_earning' | 'study_time',
    target_value: 1,
    deadline: '',
  });

  const handleCreateGoal = () => {
    if (!user) return;

    createGoal.mutate(
      {
        user_id: user.id,
        goal_type: newGoal.goal_type,
        target_value: newGoal.target_value,
        current_value: 0,
        deadline: newGoal.deadline || undefined,
        status: 'active',
      },
      {
        onSuccess: () => {
          setIsDialogOpen(false);
          setNewGoal({ goal_type: 'course_completion', target_value: 1, deadline: '' });
        },
      }
    );
  };

  const handleCompleteGoal = (goalId: string, currentValue: number, targetValue: number) => {
    if (currentValue >= targetValue) {
      updateGoal.mutate({
        goalId,
        updates: { status: 'completed', completed_at: new Date().toISOString() },
      }, {
        onSuccess: () => {
          toast({
            title: '🎉 Goal Achieved!',
            description: 'You have been awarded 50 bonus ScrollCoins! "Well done, good and faithful servant." - Matthew 25:21',
          });
        },
      });
    }
  };

  const getGoalTypeLabel = (type: string) => {
    const labels = {
      course_completion: 'Complete Courses',
      mastery_level: 'Achieve Mastery Level',
      scrollcoin_earning: 'Earn ScrollCoins',
      study_time: 'Study Time (hours)',
    };
    return labels[type as keyof typeof labels] || type;
  };

  const activeGoals = goals?.filter((g) => g.status === 'active') || [];
  const completedGoals = goals?.filter((g) => g.status === 'completed') || [];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <PageTemplate title="Learning Goals">
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Target className="h-5 w-5 text-primary" />
                  My Learning Goals
                </CardTitle>
                <CardDescription>
                  "I press on toward the goal for the prize of the upward call of God in Christ Jesus." - Philippians 3:14
                </CardDescription>
              </div>
              <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="h-4 w-4 mr-2" />
                    New Goal
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Create Learning Goal</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <Label>Goal Type</Label>
                      <Select
                        value={newGoal.goal_type}
                        onValueChange={(value: any) => setNewGoal({ ...newGoal, goal_type: value })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="course_completion">Complete Courses</SelectItem>
                          <SelectItem value="mastery_level">Achieve Mastery Level</SelectItem>
                          <SelectItem value="scrollcoin_earning">Earn ScrollCoins</SelectItem>
                          <SelectItem value="study_time">Study Time (hours)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Target Value</Label>
                      <Input
                        type="number"
                        value={newGoal.target_value}
                        onChange={(e) => setNewGoal({ ...newGoal, target_value: parseInt(e.target.value) })}
                        min={1}
                      />
                    </div>
                    <div>
                      <Label>Deadline (Optional)</Label>
                      <Input
                        type="date"
                        value={newGoal.deadline}
                        onChange={(e) => setNewGoal({ ...newGoal, deadline: e.target.value })}
                      />
                    </div>
                    <Button onClick={handleCreateGoal} disabled={createGoal.isPending} className="w-full">
                      {createGoal.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Create Goal'}
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </CardHeader>
        </Card>

        {activeGoals.length > 0 && (
          <div>
            <h2 className="text-xl font-semibold mb-4">Active Goals</h2>
            <div className="grid gap-4 md:grid-cols-2">
              {activeGoals.map((goal) => {
                const progress = Math.min((goal.current_value / goal.target_value) * 100, 100);
                const isComplete = goal.current_value >= goal.target_value;

                return (
                  <Card key={goal.id}>
                    <CardHeader>
                      <CardTitle className="text-base flex items-center justify-between">
                        {getGoalTypeLabel(goal.goal_type)}
                        {isComplete && <Trophy className="h-5 w-5 text-yellow-500" />}
                      </CardTitle>
                      {goal.deadline && (
                        <CardDescription className="flex items-center gap-1">
                          <Calendar className="h-4 w-4" />
                          Deadline: {new Date(goal.deadline).toLocaleDateString()}
                        </CardDescription>
                      )}
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="flex items-center justify-between text-sm">
                        <span>Progress</span>
                        <span className="font-medium">
                          {goal.current_value} / {goal.target_value}
                        </span>
                      </div>
                      <Progress value={progress} />
                      {isComplete && (
                        <Button
                          size="sm"
                          onClick={() => handleCompleteGoal(goal.id, goal.current_value, goal.target_value)}
                          disabled={updateGoal.isPending}
                          className="w-full"
                        >
                          <CheckCircle2 className="h-4 w-4 mr-2" />
                          Complete Goal & Claim Reward
                        </Button>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
        )}

        {completedGoals.length > 0 && (
          <div>
            <h2 className="text-xl font-semibold mb-4">Completed Goals</h2>
            <div className="grid gap-4 md:grid-cols-2">
              {completedGoals.map((goal) => (
                <Card key={goal.id} className="border-green-500/50 bg-green-500/5">
                  <CardHeader>
                    <CardTitle className="text-base flex items-center gap-2">
                      <Trophy className="h-5 w-5 text-yellow-500" />
                      {getGoalTypeLabel(goal.goal_type)}
                      <Badge variant="outline" className="ml-auto">Completed</Badge>
                    </CardTitle>
                    {goal.completed_at && (
                      <CardDescription>
                        Completed: {new Date(goal.completed_at).toLocaleDateString()}
                      </CardDescription>
                    )}
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center justify-between text-sm">
                      <span>Achievement</span>
                      <span className="font-medium">
                        {goal.target_value} / {goal.target_value}
                      </span>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        {activeGoals.length === 0 && completedGoals.length === 0 && (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              <Target className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No learning goals yet. Create your first goal to start tracking your progress!</p>
            </CardContent>
          </Card>
        )}
      </div>
    </PageTemplate>
  );
}
