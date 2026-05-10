import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { PageTemplate } from "@/components/layout/PageTemplate";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Loader2, GraduationCap, MessageCircle } from "lucide-react";
import { useAITutors, useCreateTutorSession } from "@/hooks/useAITutors";

console.info("✝️ AI Tutors Catalog — Christ-guided mentorship");

export default function AITutorsCatalog() {
  const navigate = useNavigate();
  const { data: tutors, isLoading } = useAITutors();
  const createSession = useCreateTutorSession();
  const [selectedFaculty, setSelectedFaculty] = useState<string | null>(null);

  const handleStartSession = async (tutorId: string) => {
    try {
      const session = await createSession.mutateAsync({ tutor_id: tutorId });
      navigate(`/ai-tutors/${session.id}`);
    } catch (error) {
      console.error('Failed to start session:', error);
    }
  };

  const faculties = [...new Set((tutors?.map(t => t.specialty).filter(Boolean) as string[]) || [])];
  const filteredTutors = selectedFaculty
    ? tutors?.filter(t => t.specialty === selectedFaculty)
    : tutors;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <PageTemplate
      title="AI Tutors"
      description="Christ-centered mentorship powered by wisdom and technology"
    >
      <div className="space-y-6">
        <div className="flex gap-2 flex-wrap">
          <Button
            variant={selectedFaculty === null ? "default" : "outline"}
            onClick={() => setSelectedFaculty(null)}
          >
            All Specialties
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

        {!filteredTutors || filteredTutors.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <GraduationCap className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
              <p className="text-muted-foreground">No tutors available</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {filteredTutors.map((tutor) => (
              <Card key={tutor.id} className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="flex items-start gap-4">
                    <Avatar className="h-16 w-16">
                      <AvatarFallback className="text-2xl">
                        {tutor.name[0]}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <CardTitle className="text-lg">{tutor.name}</CardTitle>
                      <CardDescription className="mt-1">
                        {tutor.specialty && (
                          <Badge variant="secondary" className="mr-1 mb-1">
                            {tutor.specialty}
                          </Badge>
                        )}
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-sm text-muted-foreground line-clamp-3">
                    {tutor.description}
                  </p>
                  <Button
                    className="w-full"
                    onClick={() => handleStartSession(tutor.id)}
                    disabled={createSession.isPending}
                  >
                    {createSession.isPending ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Starting...
                      </>
                    ) : (
                      <>
                        <MessageCircle className="h-4 w-4 mr-2" />
                        Start Session
                      </>
                    )}
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </PageTemplate>
  );
}
