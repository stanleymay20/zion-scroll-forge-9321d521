import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar, Video, MapPin } from "lucide-react";
import { format } from "date-fns";

const PublicDefenseCalendar = () => {
  const [defenses, setDefenses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("thesis_defenses" as any)
        .select("id, mode, scheduled_at, location, virtual_link, status, computed_outcome, thesis_projects!inner(title, project_type)")
        .eq("is_public", true)
        .in("status", ["scheduled","completed"])
        .order("scheduled_at", { ascending: false })
        .limit(50);
      setDefenses((data as any) || []);
      setLoading(false);
    })();
  }, []);

  return (
    <div className="container mx-auto py-12 px-4 max-w-5xl">
      <h1 className="text-4xl font-display mb-2 flex items-center gap-2">
        <Calendar className="h-8 w-8 text-primary" /> Public Defense Calendar
      </h1>
      <p className="text-muted-foreground mb-8 max-w-2xl">
        Public thesis and dissertation defenses are open to the academic community.
        Only metadata is displayed here — committee deliberations remain confidential.
      </p>

      {loading ? (
        <p className="text-muted-foreground">Loading…</p>
      ) : defenses.length === 0 ? (
        <Card><CardContent className="py-16 text-center text-muted-foreground">
          No public defenses scheduled yet.
        </CardContent></Card>
      ) : (
        <div className="space-y-4">
          {defenses.map((d) => (
            <Card key={d.id}>
              <CardHeader>
                <div className="flex justify-between items-start gap-3">
                  <div>
                    <CardTitle>{d.thesis_projects?.title}</CardTitle>
                    <CardDescription>
                      {d.thesis_projects?.project_type} defense ·{" "}
                      {format(new Date(d.scheduled_at), "PPP p")}
                    </CardDescription>
                  </div>
                  <Badge variant={d.status === "completed" ? "default" : "secondary"}>
                    {d.status}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground flex flex-wrap gap-3">
                {d.mode.includes("virtual") ? (
                  <span className="flex items-center gap-1"><Video className="h-4 w-4" /> Virtual</span>
                ) : (
                  <span className="flex items-center gap-1"><MapPin className="h-4 w-4" /> {d.location || "TBA"}</span>
                )}
                {d.computed_outcome && (
                  <Badge variant="outline">Outcome: {d.computed_outcome}</Badge>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default PublicDefenseCalendar;
