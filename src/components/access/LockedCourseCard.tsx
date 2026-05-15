import { Lock, BookOpen, ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  describeAccessReason,
  type CourseAccessResult,
} from "@/lib/accessControl";

interface LockedCourseCardProps {
  courseTitle: string;
  courseId: string;
  access: CourseAccessResult;
  previewAvailable?: boolean;
  prereqLabels?: Record<string, string>;
}

export function LockedCourseCard({
  courseTitle,
  courseId,
  access,
  previewAvailable = true,
  prereqLabels = {},
}: LockedCourseCardProps) {
  const prereqMissing = (access.missing || []).filter((m) =>
    m.startsWith("prereq:")
  );
  const otherMissing = (access.missing || []).filter(
    (m) => !m.startsWith("prereq:")
  );

  const primaryAction = (() => {
    if (access.reason === "authentication_required")
      return { to: "/auth/login", label: "Sign in" };
    if (access.reason === "not_enrolled" || access.reason === "not_enrolled_preview")
      return { to: `/courses/${courseId}`, label: "Enroll" };
    if (access.reason === "prerequisites_unmet" && prereqMissing.length)
      return {
        to: `/courses/${prereqMissing[0].replace("prereq:", "")}`,
        label: "Continue prerequisite",
      };
    if (access.reason === "student_hold")
      return { to: "/dashboard", label: "Resolve holds" };
    if (access.reason === "admin_only" || access.reason === "role_required")
      return { to: "/dashboard", label: "Back to dashboard" };
    if (access.reason === "course_not_found")
      return { to: "/catalog", label: "Browse catalog" };
    // Default: send to catalog rather than the application form, which would
    // bounce already-admitted students out of their own learning flow.
    return { to: "/catalog", label: "Browse catalog" };
  })();

  return (
    <Card className="border-2 border-burgundy/20 bg-gradient-to-br from-ivory to-ivory/40">
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-burgundy/10 text-burgundy">
            <Lock className="h-5 w-5" />
          </div>
          <div>
            <Badge variant="secondary" className="mb-2">
              Course locked
            </Badge>
            <CardTitle className="font-serif">{courseTitle}</CardTitle>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-foreground/80">{describeAccessReason(access.reason)}</p>

        {prereqMissing.length > 0 && (
          <div className="rounded-md border border-burgundy/15 bg-background/50 p-3">
            <p className="text-sm font-medium mb-2">Required prerequisites</p>
            <ul className="space-y-1 text-sm">
              {prereqMissing.map((m) => {
                const id = m.replace("prereq:", "");
                return (
                  <li key={m} className="flex items-center gap-2">
                    <BookOpen className="h-3 w-3 text-burgundy" />
                    {prereqLabels[id] || `Course ${id.slice(0, 8)}…`}
                  </li>
                );
              })}
            </ul>
          </div>
        )}

        {otherMissing.length > 0 && (
          <div className="text-sm text-foreground/70">
            Outstanding: {otherMissing.join(", ")}
          </div>
        )}

        <div className="flex flex-wrap gap-2 pt-2">
          <Button asChild>
            <Link to={primaryAction.to}>
              {primaryAction.label}
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
          {previewAvailable && (
            <Button variant="outline" asChild>
              <Link to={`/course/${courseId}/preview`}>Preview course</Link>
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export default LockedCourseCard;
