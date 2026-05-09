import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Building2, GraduationCap, Users, Sparkles, BookMarked, ArrowRight, Lock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { LockedCourseCard } from "./LockedCourseCard";
import { TransferRequestDialog } from "@/components/transfer/TransferRequestDialog";

interface SAP {
  faculty_name: string | null;
  program_name: string | null;
  program_id: string | null;
  cohort_label: string | null;
  suyas_track: string | null;
  academic_level: string | null;
  academic_status: string | null;
  matriculated: boolean | null;
  student_id_code: string | null;
}
interface NextCourse {
  course_id: string;
  course_title: string;
  is_required: boolean;
  recommended_year: number | null;
  already_enrolled: boolean;
  progress: number;
  is_unlocked: boolean;
  lock_reason: string | null;
  missing_prereqs: string[] | null;
}

export function AcademicAssignmentCard() {
  const { user } = useAuth();
  const [profile, setProfile] = useState<SAP | null>(null);
  const [next, setNext] = useState<NextCourse[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.id) return;
    (async () => {
      const [{ data: sap }, { data: nc }] = await Promise.all([
        supabase
          .from("student_academic_profiles" as any)
          .select("faculty_name,program_name,cohort_label,suyas_track,academic_level,academic_status,matriculated,student_id_code")
          .eq("user_id", user.id)
          .maybeSingle(),
        supabase.rpc("get_assigned_next_course", { p_user_id: user.id }),
      ]);
      setProfile((sap as unknown as SAP | null) ?? null);
      setNext(((nc as any[]) ?? []) as NextCourse[]);
      setLoading(false);
    })();
  }, [user?.id]);

  if (loading || !profile?.program_name) return null;

  const unlocked = next.filter(c => c.is_unlocked && c.progress < 100);
  const locked = next.filter(c => !c.is_unlocked).slice(0, 4);
  const first = unlocked[0];

  return (
    <Card className="border-primary/20">
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-serif flex items-center gap-2">
          <GraduationCap className="h-4 w-4 text-primary" />
          Your Academic Assignment
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <Field icon={Building2} label="Faculty" value={profile.faculty_name ?? "—"} />
          <Field icon={GraduationCap} label="Degree Program" value={profile.program_name} />
          <Field icon={Users} label="Cohort" value={profile.cohort_label ?? "—"} />
          <Field icon={Sparkles} label="SUYAS Stage" value={profile.suyas_track ?? profile.academic_level ?? "—"} />
        </div>
        {profile.student_id_code && (
          <div className="flex items-center gap-2 pt-1 border-t">
            <Badge variant="secondary" className="font-mono text-xs">{profile.student_id_code}</Badge>
            <Badge variant="outline" className="capitalize text-xs">{profile.academic_status ?? "—"}</Badge>
          </div>
        )}
        {first && (
          <div className="rounded-md bg-primary/5 border border-primary/20 p-3 mt-2">
            <p className="text-xs uppercase tracking-wider text-muted-foreground mb-1">
              Next unlocked course
            </p>
            <p className="font-medium text-primary flex items-center gap-2">
              <BookMarked className="h-4 w-4" /> {first.course_title}
            </p>
            <Button asChild size="sm" className="mt-2 w-full sm:w-auto">
              <Link to={`/courses/${first.course_id}`}>
                {first.already_enrolled ? "Continue" : "Start course"} <ArrowRight className="h-4 w-4 ml-1" />
              </Link>
            </Button>
          </div>
        )}
        {!first && profile.matriculated && (
          <p className="text-xs text-muted-foreground pt-2">
            No unlocked program courses right now. Complete current work or contact an advisor.
          </p>
        )}
        {locked.length > 0 && (
          <div className="space-y-2 pt-2 border-t">
            <p className="text-xs uppercase tracking-wider text-muted-foreground">Locked upcoming</p>
            {locked.map(c => (
              <LockedCourseCard key={c.course_id} course={c} />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function Field({ icon: Icon, label, value }: { icon: any; label: string; value: string }) {
  return (
    <div className="flex items-start gap-2">
      <Icon className="h-3.5 w-3.5 mt-0.5 text-muted-foreground shrink-0" />
      <div className="min-w-0">
        <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</p>
        <p className="text-sm font-medium truncate">{value}</p>
      </div>
    </div>
  );
}
