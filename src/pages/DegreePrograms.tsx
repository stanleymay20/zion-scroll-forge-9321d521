import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { PageTemplate } from "@/components/layout/PageTemplate";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, GraduationCap, BookOpen, Clock } from "lucide-react";
import { useDegreePrograms, useEnrollInDegree } from "@/hooks/useDegreePrograms";

console.info("✝️ Degree Programs — Christ-centered education");

export default function DegreePrograms() {
  const navigate = useNavigate();
  const { data: programs, isLoading } = useDegreePrograms();
  const enrollInDegree = useEnrollInDegree();
  const [selectedFaculty, setSelectedFaculty] = useState<string | null>(null);

  const handleEnroll = async (programId: string) => {
    await enrollInDegree.mutateAsync(programId);
  };

  const filteredPrograms = selectedFaculty
    ? programs?.filter((p) => p.faculty === selectedFaculty)
    : programs;

  const faculties = [...new Set(programs?.map((p) => p.faculty) || [])];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <PageTemplate
      title="Degree Programs"
      description="Choose your path of Christ-centered higher education"
    >
      <div className="space-y-4 md:space-y-6">
        <div className="flex gap-2 flex-wrap">
          <Button
            variant={selectedFaculty === null ? "default" : "outline"}
            onClick={() => setSelectedFaculty(null)}
          >
            All Faculties
          </Button>
          {faculties.map((faculty) => (
            <Button
              key={faculty}
              variant={selectedFaculty === faculty ? "default" : "outline"}
              onClick={() => setSelectedFaculty(faculty)}
            >
              {faculty}
            </Button>
          ))}
        </div>

        {!filteredPrograms || filteredPrograms.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <GraduationCap className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
              <p className="text-muted-foreground">No degree programs available</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:gap-6 grid-cols-1 md:grid-cols-2">
            {filteredPrograms.map((program) => (
              <Card
                key={program.id}
                className="hover:shadow-lg transition-shadow cursor-pointer"
                onClick={() => navigate(`/degrees/${program.id}`)}
              >
                <CardHeader>
                  <div className="flex items-start justify-between">
                  <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <CardTitle className="flex items-center gap-2">
                          <GraduationCap className="h-5 w-5 text-[hsl(var(--scroll-gold))]" />
                          {(program as any).title}
                        </CardTitle>
                        <Badge variant="secondary">
                          {(program as any).faculty}
                        </Badge>
                        <Badge variant="outline">{(program as any).level}</Badge>
                        <AccreditationBadge status={(program as any).accreditation_status} />
                      </div>
                      <CardDescription>
                        {(program as any).description}
                      </CardDescription>
                      {(program as any).accreditation_status &&
                        (program as any).accreditation_status !== "accreditation_ready" && (
                          <p className="mt-2 text-xs italic text-muted-foreground">
                            {(program as any).accreditation_status === "internal_honorific"
                              ? "Internal honorific recognition — not an external degree."
                              : "This program is under academic development and not yet accreditation-ready."}
                          </p>
                        )}
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center justify-between">
                      <span className="flex items-center gap-2 text-muted-foreground">
                        <Clock className="h-4 w-4" />
                        Duration
                      </span>
                      <span className="font-medium">{(program as any).duration}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="flex items-center gap-2 text-muted-foreground">
                        <BookOpen className="h-4 w-4" />
                        Credits
                      </span>
                      <span className="font-medium">{(program as any).total_credits}</span>
                    </div>
                  </div>
                  {(program as any).program_status === "curriculum_pending" ? (
                    <div className="rounded-md border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-xs text-amber-700 dark:text-amber-300">
                      Curriculum being finalized — not yet open for enrollment.
                    </div>
                  ) : (
                    <Button
                      variant={(program as any).is_enrolled ? "outline" : "default"}
                      className="w-full"
                      onClick={(e) => {
                        e.stopPropagation();
                        if (!(program as any).is_enrolled) {
                          handleEnroll(program.id);
                        }
                      }}
                      disabled={(program as any).is_enrolled}
                    >
                      {(program as any).is_enrolled ? "Enrolled" : "Enroll Now"}
                    </Button>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </PageTemplate>
  );
}
