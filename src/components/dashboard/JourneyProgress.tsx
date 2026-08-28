import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Link } from 'react-router-dom';
import { GraduationCap, BookOpen, Award, ArrowRight, CheckCircle2, ShieldCheck } from 'lucide-react';

interface JourneyProgressProps {
  coursesCompleted: number;
}

export const JourneyProgress = ({ coursesCompleted = 0 }: JourneyProgressProps) => {
  return (
    <Card className="border-primary/20">
      <CardHeader>
        <div className="flex items-center justify-between gap-3">
          <div>
            <CardTitle className="flex items-center gap-2">
              <GraduationCap className="h-5 w-5 text-primary" />
              Academic Progress
            </CardTitle>
            <CardDescription>
              Degree eligibility is determined by your programme requirements and verified academic evidence.
            </CardDescription>
          </div>
          <Badge variant="secondary" className="flex items-center gap-1 shrink-0">
            <CheckCircle2 className="h-3 w-3" />
            {coursesCompleted} completed
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="grid sm:grid-cols-2 gap-3">
          <div className="p-4 bg-muted/50 rounded-lg">
            <div className="flex items-center gap-2 text-muted-foreground mb-2">
              <BookOpen className="h-4 w-4" /> Verified course progress
            </div>
            <p className="text-2xl font-semibold">{coursesCompleted}</p>
            <p className="text-xs text-muted-foreground mt-1">Completed courses currently recorded in your learning path.</p>
          </div>
          <div className="p-4 bg-muted/50 rounded-lg">
            <div className="flex items-center gap-2 text-muted-foreground mb-2">
              <ShieldCheck className="h-4 w-4" /> Credential standard
            </div>
            <p className="font-semibold">Evidence-based</p>
            <p className="text-xs text-muted-foreground mt-1">XP, streaks, badges, or engagement never substitute for academic mastery.</p>
          </div>
        </div>

        <div className="rounded-lg border p-4 text-sm text-muted-foreground">
          Your degree audit should evaluate required credits, courses, learning outcomes, practical or research requirements, academic standing, and other programme rules. It does not award degrees from activity points.
        </div>

        <div className="flex gap-2 pt-1">
          <Link to="/degree-audit" className="flex-1">
            <Button variant="outline" className="w-full">
              <Award className="h-4 w-4 mr-2" /> Degree Audit
            </Button>
          </Link>
          <Link to="/courses" className="flex-1">
            <Button className="w-full">
              <BookOpen className="h-4 w-4 mr-2" /> Continue Learning
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          </Link>
        </div>
      </CardContent>
    </Card>
  );
};

export default JourneyProgress;
