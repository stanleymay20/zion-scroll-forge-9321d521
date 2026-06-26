import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { getMyAdvisingNotes, getMyAdvisingFlags, getMyInterventions } from "@/services/studentPortal";

export default function StudentAdvising() {
  const notes = useQuery({ queryKey: ["sp-an"], queryFn: getMyAdvisingNotes });
  const flags = useQuery({ queryKey: ["sp-af"], queryFn: getMyAdvisingFlags });
  const inter = useQuery({ queryKey: ["sp-int"], queryFn: getMyInterventions });
  if (notes.isLoading || flags.isLoading) return <Skeleton className="h-64 w-full" />;

  return (
    <div className="space-y-6">
      <h1 className="font-serif text-4xl">Advising</h1>

      <Card>
        <CardHeader><CardTitle>Notes from your advisors</CardTitle></CardHeader>
        <CardContent>
          {(notes.data || []).length === 0 ? <p className="text-sm text-muted-foreground">No notes shared with you yet.</p> : (
            <ul className="space-y-3 text-sm">
              {(notes.data as any[]).map((n) => (
                <li key={n.id} className="border-l-2 border-primary pl-3">
                  <p>{n.note}</p>
                  <span className="text-xs text-muted-foreground">{new Date(n.created_at).toLocaleString()}</span>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Academic flags</CardTitle></CardHeader>
        <CardContent>
          {(flags.data || []).length === 0 ? <p className="text-sm text-muted-foreground">No active flags.</p> : (
            <ul className="space-y-2 text-sm">
              {(flags.data as any[]).map((f) => (
                <li key={f.id} className="flex justify-between border-b pb-2">
                  <div>
                    <div className="font-medium capitalize">{f.flag_type?.replace(/_/g, " ")}</div>
                    {f.reason && <div className="text-xs text-muted-foreground">{f.reason}</div>}
                    {f.recommended_action && <div className="text-xs">Recommendation: {f.recommended_action}</div>}
                  </div>
                  <Badge variant={f.severity === "critical" || f.severity === "high" ? "destructive" : "secondary"}>{f.severity}</Badge>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Outcome interventions</CardTitle></CardHeader>
        <CardContent>
          {(inter.data || []).length === 0 ? <p className="text-sm text-muted-foreground">None assigned.</p> : (
            <ul className="space-y-2 text-sm">
              {(inter.data as any[]).map((i) => (
                <li key={i.id} className="border-b pb-2">
                  <div className="font-medium">{i.finding ?? "Intervention"}</div>
                  {i.recommendation && <div className="text-xs text-muted-foreground">{i.recommendation}</div>}
                  <Badge variant="outline">{i.status}</Badge>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
