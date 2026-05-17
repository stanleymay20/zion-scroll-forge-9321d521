import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, Target } from "lucide-react";

interface PLORow {
  plo_id: string;
  code: string;
  statement: string;
  attainment_rate: number;
  attempts: number;
  attained: boolean;
}

interface Props {
  userId: string | null | undefined;
}

/**
 * PR3: Renders the Program Learning Outcome attainment matrix for a student,
 * sourced from the `transcript_with_attainment` SECURITY DEFINER function.
 * Truthful: shows "No graded outcomes yet" rather than fake attainment.
 */
export function PLOAttainmentMatrix({ userId }: Props) {
  const { data, isLoading } = useQuery({
    queryKey: ["plo-attainment", userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("transcript_with_attainment", {
        p_user_id: userId!,
      });
      if (error) throw error;
      return data as unknown as {
        credits_completed: number;
        gpa: number;
        plo_attainment: PLORow[];
      };
    },
  });

  return (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Target className="h-4 w-4 text-primary" />
          Program Learning Outcome Attainment
        </CardTitle>
        <CardDescription>
          Computed from your graded assessments mapped to declared outcomes. Threshold: 70%.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex justify-center py-6">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : !data || !data.plo_attainment?.length ? (
          <p className="text-sm text-muted-foreground py-2">
            No graded outcomes yet — attainment will appear once your assessments are graded and mapped to PLOs.
          </p>
        ) : (
          <div className="space-y-3">
            {data.plo_attainment.map((row) => (
              <div
                key={row.plo_id}
                className="flex items-start justify-between gap-4 border rounded-md p-3"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="font-mono text-xs">{row.code}</Badge>
                    <Badge variant={row.attained ? "default" : "secondary"} className="text-xs">
                      {row.attained ? "Attained" : "Developing"}
                    </Badge>
                  </div>
                  <p className="text-sm mt-2 text-foreground/90">{row.statement}</p>
                </div>
                <div className="text-right shrink-0">
                  <div className={`text-xl font-bold ${row.attained ? "text-green-600" : "text-muted-foreground"}`}>
                    {Math.round((row.attainment_rate ?? 0) * 100)}%
                  </div>
                  <div className="text-[10px] text-muted-foreground uppercase tracking-wider">
                    {row.attempts} attempt{row.attempts === 1 ? "" : "s"}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
