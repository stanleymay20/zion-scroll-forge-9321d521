import React, { useState, useEffect } from 'react';
import { legacyApiCall } from "@/lib/legacyApi";
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Download, FileText, Award, Calendar } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import type { AcademicTranscript as TranscriptType } from '@/types/student-profile';

interface AcademicTranscriptProps {
  studentId: string;
}

const AcademicTranscript: React.FC<AcademicTranscriptProps> = ({ studentId }) => {
  const { user } = useAuth();
  const [transcript, setTranscript] = useState<TranscriptType | null>(null);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    loadTranscript();
  }, [studentId]);

  const loadTranscript = async () => {
    try {
      setLoading(true);
      const { data: { session } } = await supabase.auth.getSession();
      const response = await legacyApiCall(`/api/profile/${studentId}/transcript`, {
        headers: {
          'Authorization': `Bearer ${session?.access_token}`
        }
      });
      
      if (!response.ok) throw new Error('Failed to load transcript');
      
      const data = await response.json();
      setTranscript(data.data);
    } catch (error) {
      console.error('Error loading transcript:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = async (format: 'pdf' | 'json') => {
    try {
      setDownloading(true);
      const { data: { session } } = await supabase.auth.getSession();
      const response = await fetch(
        `/api/profile/${studentId}/transcript/download?format=${format}`,
        {
          headers: {
            'Authorization': `Bearer ${session?.access_token}`
          }
        }
      );
      
      if (!response.ok) throw new Error('Failed to download transcript');
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `transcript_${studentId}.${format}`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Error downloading transcript:', error);
    } finally {
      setDownloading(false);
    }
  };

  if (loading) {
    return (
      <Card className="p-8">
        <div className="flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </Card>
    );
  }

  if (!transcript) {
    return (
      <Card className="p-8 text-center">
        <FileText className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
        <h3 className="text-lg font-semibold mb-2">No Transcript Available</h3>
        <p className="text-muted-foreground">
          Your academic transcript will be available once you complete courses.
        </p>
      </Card>
    );
  }

  // Group courses by year and term
  const coursesByTerm = transcript.courseHistory.reduce((acc, course) => {
    const key = `${course.year}-${course.term}`;
    if (!acc[key]) {
      acc[key] = [];
    }
    acc[key].push(course);
    return acc;
  }, {} as Record<string, typeof transcript.courseHistory>);

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card className="p-6">
        <div className="flex items-start justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold mb-2">Official Academic Transcript</h2>
            <p className="text-muted-foreground">
              {transcript.studentName} • {transcript.degreeProgram}
            </p>
            <p className="text-sm text-muted-foreground mt-1">
              Generated: {new Date(transcript.generatedAt).toLocaleDateString()}
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => handleDownload('pdf')}
              disabled={downloading}
            >
              <Download className="h-4 w-4 mr-2" />
              Download PDF
            </Button>
            <Button
              variant="outline"
              onClick={() => handleDownload('json')}
              disabled={downloading}
            >
              <Download className="h-4 w-4 mr-2" />
              Download JSON
            </Button>
          </div>
        </div>

        {/* Academic Summary */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-muted rounded-lg">
          <div>
            <p className="text-sm text-muted-foreground">Overall GPA</p>
            <p className="text-3xl font-bold">{transcript.overallGPA.toFixed(2)}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Credits Earned</p>
            <p className="text-3xl font-bold">{transcript.totalCreditsEarned}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Credits Attempted</p>
            <p className="text-3xl font-bold">{transcript.totalCreditsAttempted}</p>
          </div>
        </div>
      </Card>

      {/* Degrees Awarded */}
      {transcript.degreesAwarded.length > 0 && (
        <Card className="p-6">
          <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
            <Award className="h-5 w-5" />
            Degrees Awarded
          </h3>
          <div className="space-y-4">
            {transcript.degreesAwarded.map((degree, index) => (
              <div key={index} className="p-4 border rounded-lg">
                <div className="flex items-start justify-between">
                  <div>
                    <h4 className="font-semibold text-lg">{degree.degreeName}</h4>
                    <p className="text-muted-foreground">
                      {degree.degreeType} in {degree.major}
                      {degree.minor && ` • Minor in ${degree.minor}`}
                    </p>
                    <p className="text-sm text-muted-foreground mt-1">
                      Awarded: {new Date(degree.dateAwarded).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="text-right">
                    {degree.honors && (
                      <Badge variant="secondary" className="mb-2">
                        {degree.honors}
                      </Badge>
                    )}
                    <p className="text-sm text-muted-foreground">
                      GPA: {degree.gpa.toFixed(2)}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Course History by Term */}
      <Card className="p-6">
        <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
          <Calendar className="h-5 w-5" />
          Course History
        </h3>
        
        <div className="space-y-6">
          {Object.entries(coursesByTerm)
            .sort(([a], [b]) => b.localeCompare(a))
            .map(([termKey, courses]) => {
              const [year, term] = termKey.split('-');
              const termGPA = courses.reduce((sum, c) => sum + c.gradePoints, 0) / courses.length;
              const termCredits = courses.reduce((sum, c) => sum + c.credits, 0);
              
              return (
                <div key={termKey} className="border rounded-lg overflow-hidden">
                  <div className="bg-muted p-4 flex items-center justify-between">
                    <div>
                      <h4 className="font-semibold">{term} {year}</h4>
                      <p className="text-sm text-muted-foreground">
                        {courses.length} courses • {termCredits} credits
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-muted-foreground">Term GPA</p>
                      <p className="text-xl font-bold">{termGPA.toFixed(2)}</p>
                    </div>
                  </div>
                  
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Course Code</TableHead>
                        <TableHead>Course Name</TableHead>
                        <TableHead>Instructor</TableHead>
                        <TableHead className="text-center">Credits</TableHead>
                        <TableHead className="text-center">Grade</TableHead>
                        <TableHead className="text-center">Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {courses.map((course) => (
                        <TableRow key={course.courseId}>
                          <TableCell className="font-medium">
                            {course.courseCode}
                          </TableCell>
                          <TableCell>{course.courseName}</TableCell>
                          <TableCell className="text-muted-foreground">
                            {course.instructor}
                          </TableCell>
                          <TableCell className="text-center">
                            {course.credits}
                          </TableCell>
                          <TableCell className="text-center">
                            <Badge variant={
                              course.grade === 'A' || course.grade === 'A+' ? 'default' :
                              course.grade === 'F' ? 'destructive' :
                              'secondary'
                            }>
                              {course.grade}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-center">
                            <Badge variant={
                              course.status === 'completed' ? 'default' :
                              course.status === 'in_progress' ? 'secondary' :
                              'outline'
                            }>
                              {course.status.replace('_', ' ')}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              );
            })}
        </div>
      </Card>

      {/* Academic Standing History */}
      {transcript.academicStanding.length > 0 && (
        <Card className="p-6">
          <h3 className="text-xl font-bold mb-4">Academic Standing History</h3>
          <div className="space-y-2">
            {transcript.academicStanding
              .sort((a, b) => b.year - a.year || b.term.localeCompare(a.term))
              .map((standing, index) => (
                <div key={index} className="flex items-center justify-between p-3 border rounded">
                  <div>
                    <p className="font-medium">{standing.term} {standing.year}</p>
                    <p className="text-sm text-muted-foreground">GPA: {standing.gpa.toFixed(2)}</p>
                  </div>
                  <Badge variant={
                    standing.standing === 'honors' || standing.standing === 'deans_list' ? 'default' :
                    standing.standing === 'probation' || standing.standing === 'suspension' ? 'destructive' :
                    'secondary'
                  }>
                    {standing.standing.replace('_', ' ').toUpperCase()}
                  </Badge>
                </div>
              ))}
          </div>
        </Card>
      )}

      {/* Certificates */}
      {transcript.certificatesAwarded.length > 0 && (
        <Card className="p-6">
          <h3 className="text-xl font-bold mb-4">Certificates Awarded</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {transcript.certificatesAwarded.map((cert, index) => (
              <div key={index} className="p-4 border rounded-lg">
                <h4 className="font-semibold">{cert.certificateName}</h4>
                <p className="text-sm text-muted-foreground">
                  Awarded: {new Date(cert.dateAwarded).toLocaleDateString()}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  ID: {cert.credentialId}
                </p>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Official Seal */}
      {transcript.isOfficial && (
        <Card className="p-6 bg-primary/5 border-primary/20">
          <div className="flex items-center gap-3">
            <Award className="h-8 w-8 text-primary" />
            <div>
              <p className="font-semibold">Official Transcript</p>
              <p className="text-sm text-muted-foreground">
                This is an official academic transcript issued by ScrollUniversity.
                Transcript ID: {transcript.transcriptId}
              </p>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
};

export default AcademicTranscript;
