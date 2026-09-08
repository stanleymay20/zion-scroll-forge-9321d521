import { useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { useCreateLearningProfile } from '@/hooks/usePersonalization';
import { useStudentLifecycleSnapshot } from '@/hooks/useStudentLifecycleSnapshot';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Checkbox } from '@/components/ui/checkbox';
import { Brain, Clock, Sun, Moon, Sunrise, Sunset, Loader2, ShieldAlert } from 'lucide-react';
import { onboardingRoutes } from '@/lib/onboardingRoutes';
import { canonicalLifecycleRoutes, getRequiredStudentOnboardingRoute } from '@/lib/studentLifecycle';

export default function LearningProfileOnboarding() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const lifecycle = useStudentLifecycleSnapshot();
  const createProfile = useCreateLearningProfile();
  const [learningStyle, setLearningStyle] = useState<string>('');
  const [preferredPace, setPreferredPace] = useState<string>('');
  const [studyTime, setStudyTime] = useState({ morning: false, afternoon: false, evening: false, night: false });

  const handleSubmit = async () => {
    if (!user || !learningStyle || !preferredPace) return;
    await createProfile.mutateAsync({ user_id: user.id, learning_style: learningStyle as any, preferred_pace: preferredPace as any, study_time_preference: studyTime, strengths: [], weaknesses: [], goals: [] });
    await queryClient.invalidateQueries({ queryKey: ['student-lifecycle-snapshot', user.id] });
    navigate(onboardingRoutes.registration);
  };

  if (lifecycle.authLoading || lifecycle.isLoading) return <div className="min-h-[40vh] flex items-center justify-center"><Loader2 className="h-6 w-6 animate-spin" /></div>;
  if (!lifecycle.authenticated) return <Navigate to={canonicalLifecycleRoutes.signIn} replace />;
  if (lifecycle.isError || !lifecycle.data) return <div className="min-h-[50vh] flex items-center justify-center p-6"><div className="max-w-md text-center space-y-3"><ShieldAlert className="h-8 w-8 mx-auto text-destructive" /><h2 className="font-serif text-2xl">Learning-profile stage could not be verified</h2><p className="text-sm text-muted-foreground">This onboarding stage remains closed until the governed lifecycle evidence can be verified.</p></div></div>;
  const requiredRoute = getRequiredStudentOnboardingRoute(lifecycle.data);
  if (requiredRoute !== canonicalLifecycleRoutes.learningProfile) return <Navigate to={requiredRoute || canonicalLifecycleRoutes.studentDashboard} replace />;

  const styleOption = (value: string, title: string, description: string) => <div className="flex items-start space-x-2 p-4 border rounded-lg hover:bg-accent cursor-pointer"><RadioGroupItem value={value} id={value} /><Label htmlFor={value} className="cursor-pointer flex-1"><div className="font-semibold">{title}</div><div className="text-sm text-muted-foreground">{description}</div></Label></div>;

  return (
    <div className="min-h-screen bg-background p-6"><div className="max-w-3xl mx-auto space-y-6">
      <div className="text-center space-y-2"><h1 className="text-4xl font-bold text-foreground">Welcome to Your Learning Journey</h1><p className="text-muted-foreground">Let's personalize your experience before academic registration</p><p className="text-sm text-primary italic">"Study to show thyself approved unto God" - 2 Timothy 2:15</p></div>
      <Card><CardHeader><CardTitle className="flex items-center gap-2"><Brain className="h-5 w-5" />What's Your Learning Style?</CardTitle><CardDescription>Understanding how you learn best helps us deliver content in the most effective way</CardDescription></CardHeader><CardContent><RadioGroup value={learningStyle} onValueChange={setLearningStyle}><div className="space-y-4">{styleOption('visual','Visual Learner','I learn best through images, diagrams, charts, and videos')}{styleOption('auditory','Auditory Learner','I prefer listening to lectures, discussions, and audio content')}{styleOption('kinesthetic','Kinesthetic Learner','I learn through hands-on practice and real-world application')}{styleOption('reading_writing','Reading/Writing Learner','I prefer reading texts and taking notes to absorb information')}</div></RadioGroup></CardContent></Card>
      <Card><CardHeader><CardTitle className="flex items-center gap-2"><Clock className="h-5 w-5" />What's Your Preferred Learning Pace?</CardTitle><CardDescription>Everyone learns at their own speed - choose what works for you</CardDescription></CardHeader><CardContent><RadioGroup value={preferredPace} onValueChange={setPreferredPace}><div className="space-y-4">{styleOption('slow','Slow & Steady','I prefer to take my time and deeply understand each concept')}{styleOption('moderate','Moderate Pace','I like a balanced approach - not too fast, not too slow')}{styleOption('fast','Fast Track','I learn quickly and prefer to move through material rapidly')}</div></RadioGroup></CardContent></Card>
      <Card><CardHeader><CardTitle>When Do You Study Best?</CardTitle><CardDescription>Select all times that work for you - we'll schedule recommendations accordingly</CardDescription></CardHeader><CardContent><div className="space-y-4">
        <div className="flex items-center space-x-2"><Checkbox id="morning" checked={studyTime.morning} onCheckedChange={(checked) => setStudyTime({ ...studyTime, morning: !!checked })} /><Label htmlFor="morning" className="flex items-center gap-2 cursor-pointer"><Sunrise className="h-4 w-4" />Morning (6 AM - 12 PM)</Label></div>
        <div className="flex items-center space-x-2"><Checkbox id="afternoon" checked={studyTime.afternoon} onCheckedChange={(checked) => setStudyTime({ ...studyTime, afternoon: !!checked })} /><Label htmlFor="afternoon" className="flex items-center gap-2 cursor-pointer"><Sun className="h-4 w-4" />Afternoon (12 PM - 6 PM)</Label></div>
        <div className="flex items-center space-x-2"><Checkbox id="evening" checked={studyTime.evening} onCheckedChange={(checked) => setStudyTime({ ...studyTime, evening: !!checked })} /><Label htmlFor="evening" className="flex items-center gap-2 cursor-pointer"><Sunset className="h-4 w-4" />Evening (6 PM - 10 PM)</Label></div>
        <div className="flex items-center space-x-2"><Checkbox id="night" checked={studyTime.night} onCheckedChange={(checked) => setStudyTime({ ...studyTime, night: !!checked })} /><Label htmlFor="night" className="flex items-center gap-2 cursor-pointer"><Moon className="h-4 w-4" />Night (10 PM - 6 AM)</Label></div>
      </div></CardContent></Card>
      <div className="flex justify-end"><Button onClick={handleSubmit} disabled={!learningStyle || !preferredPace || createProfile.isPending}>{createProfile.isPending ? 'Creating Profile...' : 'Complete Setup & Continue to Registration'}</Button></div>
    </div></div>
  );
}
