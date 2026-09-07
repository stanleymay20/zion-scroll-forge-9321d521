/**
 * SUYAS - Deadline & Assessment Orchestrator
 * Operational deadlines are only those attached to a real section -> term ->
 * published academic-year chain. Course-level assignment templates are excluded.
 */

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Calendar,
  Clock,
  FileText,
  AlertTriangle,
  CheckCircle2,
  Loader2,
  Download,
  ShieldCheck
} from "lucide-react";
import { format, differenceInDays, isPast, isFuture, addDays } from "date-fns";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

console.info("✝️ SUYAS Deadline Orchestrator — Governed academic timelines");

interface Deadline {
  id: string;
  title: string;
  description: string;
  course_id: string;
  course_title: string;
  section_id: string;
  term_name: string;
  academic_year_name: string;
  deadline_type: 'assignment' | 'exam' | 'quiz' | 'project' | 'discussion';
  due_date: string;
  status: 'published';
}

const deadlineTypeConfig = {
  assignment: { label: 'Assignment', color: 'bg-blue-500' },
  exam: { label: 'Exam', color: 'bg-red-500' },
  quiz: { label: 'Quiz', color: 'bg-purple-500' },
  project: { label: 'Project', color: 'bg-green-500' },
  discussion: { label: 'Discussion', color: 'bg-amber-500' }
};

const useDeadlines = () => {
  return useQuery({
    queryKey: ['suyas-governed-deadlines'],
    queryFn: async () => {
      const { data: assignments, error: assignmentsError } = await supabase
        .from('assignments')
        .select(`
          id,
          title,
          description,
          course_id,
          section_id,
          due_at,
          type,
          published,
          courses (title)
        `)
        .eq('published', true)
        .not('section_id', 'is', null)
        .order('due_at', { ascending: true });

      if (assignmentsError) throw assignmentsError;
      if (!assignments?.length) return [] as Deadline[];

      const sectionIds = assignments
        .map((assignment) => assignment.section_id)
        .filter((id): id is string => Boolean(id));

      const { data: sections, error: sectionsError } = await supabase
        .from('course_sections')
        .select('id, term_id')
        .in('id', sectionIds);
      if (sectionsError) throw sectionsError;

      const sectionById = new Map((sections || []).map((section) => [section.id, section]));
      const termIds = Array.from(new Set((sections || []).map((section) => section.term_id).filter(Boolean))) as string[];
      if (!termIds.length) return [] as Deadline[];

      // academic_year_id is introduced by the SUYAS authority migration. The
      // cast keeps the generated Supabase client compatible until types are regenerated.
      const { data: terms, error: termsError } = await (supabase as any)
        .from('academic_terms')
        .select('id, name, status, academic_year_id')
        .in('id', termIds);
      if (termsError) throw termsError;

      const yearIds = Array.from(new Set((terms || []).map((term: any) => term.academic_year_id).filter(Boolean))) as string[];
      if (!yearIds.length) return [] as Deadline[];

      const { data: years, error: yearsError } = await supabase
        .from('academic_years')
        .select('id, name, status')
        .in('id', yearIds);
      if (yearsError) throw yearsError;

      const termById = new Map((terms || []).map((term: any) => [term.id, term]));
      const yearById = new Map((years || []).map((year) => [year.id, year]));

      return assignments.flatMap((assignment) => {
        const section = sectionById.get(assignment.section_id as string);
        if (!section?.term_id) return [];

        const term: any = termById.get(section.term_id);
        if (!term?.academic_year_id || ['closed', 'archived'].includes(String(term.status))) return [];

        const year = yearById.get(term.academic_year_id);
        if (!year || year.status !== 'published') return [];

        return [{
          id: assignment.id,
          title: assignment.title || 'Untitled Assignment',
          description: assignment.description || '',
          course_id: assignment.course_id || '',
          course_title: (assignment.courses as { title?: string })?.title || 'Unknown Course',
          section_id: assignment.section_id as string,
          term_name: String(term.name || 'Unknown term'),
          academic_year_name: year.name,
          deadline_type: (assignment.type || 'assignment') as Deadline['deadline_type'],
          due_date: assignment.due_at || new Date().toISOString(),
          status: 'published' as const
        }];
      }) as Deadline[];
    }
  });
};

const getDeadlineStatus = (deadline: Deadline) => {
  const now = new Date();
  const dueDate = new Date(deadline.due_date);
  const daysUntil = differenceInDays(dueDate, now);

  if (isPast(dueDate)) {
    return { label: 'Past Due', color: 'text-red-500', variant: 'destructive' as const };
  }
  if (daysUntil <= 1) {
    return { label: 'Due Soon', color: 'text-amber-500', variant: 'secondary' as const };
  }
  if (daysUntil <= 7) {
    return { label: 'Upcoming', color: 'text-blue-500', variant: 'outline' as const };
  }
  return { label: 'Scheduled', color: 'text-green-500', variant: 'outline' as const };
};

export default function DeadlineOrchestrator() {
  const [filterType, setFilterType] = useState<string>('all');
  const { data: deadlines = [], isLoading, error } = useDeadlines();

  const upcomingDeadlines = deadlines.filter((deadline) => isFuture(new Date(deadline.due_date)));
  const pastDeadlines = deadlines.filter((deadline) => isPast(new Date(deadline.due_date)));
  const filteredDeadlines = deadlines.filter((deadline) => filterType === 'all' || deadline.deadline_type === filterType);

  const generateICS = (deadline: Deadline) => {
    const dueDate = new Date(deadline.due_date);
    const icsContent = `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//Scroll University//SUYAS//EN
BEGIN:VEVENT
UID:${deadline.id}@scrolluniversity.org
DTSTART:${format(dueDate, "yyyyMMdd'T'HHmmss")}
DTEND:${format(addDays(dueDate, 0), "yyyyMMdd'T'235959")}
SUMMARY:${deadline.title} Due
DESCRIPTION:${deadline.description}
END:VEVENT
END:VCALENDAR`;

    const blob = new Blob([icsContent], { type: 'text/calendar' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `${deadline.title.replace(/\s+/g, '_')}.ics`;
    anchor.click();
    URL.revokeObjectURL(url);
    toast.success('Calendar event downloaded');
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <Card className="border-destructive/40">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="h-5 w-5" />
            SUYAS deadline evidence unavailable
          </CardTitle>
          <CardDescription>
            The governed section → term → academic-year chain could not be verified. No deadlines are being presented as authoritative.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card className="border-primary/20 bg-primary/5">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-primary" />
            SUYAS-governed assessment calendar
          </CardTitle>
          <CardDescription>
            Only published assessments attached to a real teaching section, canonical term and published academic year appear here. Course-level templates are intentionally excluded.
          </CardDescription>
        </CardHeader>
      </Card>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            <Calendar className="h-8 w-8 mx-auto mb-2 text-primary" />
            <p className="text-2xl font-bold">{deadlines.length}</p>
            <p className="text-xs text-muted-foreground">Governed Deadlines</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <Clock className="h-8 w-8 mx-auto mb-2 text-amber-500" />
            <p className="text-2xl font-bold">
              {upcomingDeadlines.filter((deadline) => differenceInDays(new Date(deadline.due_date), new Date()) <= 7).length}
            </p>
            <p className="text-xs text-muted-foreground">Due This Week</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <CheckCircle2 className="h-8 w-8 mx-auto mb-2 text-green-500" />
            <p className="text-2xl font-bold">{upcomingDeadlines.length}</p>
            <p className="text-xs text-muted-foreground">Upcoming</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <AlertTriangle className="h-8 w-8 mx-auto mb-2 text-red-500" />
            <p className="text-2xl font-bold">{pastDeadlines.length}</p>
            <p className="text-xs text-muted-foreground">Past Due</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="upcoming" className="w-full">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-4">
          <TabsList>
            <TabsTrigger value="upcoming">Upcoming</TabsTrigger>
            <TabsTrigger value="all">All Governed</TabsTrigger>
            <TabsTrigger value="rules">Scope Rules</TabsTrigger>
          </TabsList>
          <Select value={filterType} onValueChange={setFilterType}>
            <SelectTrigger className="w-full sm:w-[160px]">
              <SelectValue placeholder="Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              {Object.entries(deadlineTypeConfig).map(([type, config]) => (
                <SelectItem key={type} value={type}>{config.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <TabsContent value="upcoming">
          <Card>
            <CardHeader>
              <CardTitle>Upcoming governed deadlines</CardTitle>
              <CardDescription>Operational assessment dates for published SUYAS teaching contexts.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {upcomingDeadlines
                  .filter((deadline) => filterType === 'all' || deadline.deadline_type === filterType)
                  .slice(0, 12)
                  .map((deadline) => {
                    const status = getDeadlineStatus(deadline);
                    const daysUntil = differenceInDays(new Date(deadline.due_date), new Date());
                    return (
                      <div key={deadline.id} className="flex flex-col gap-3 p-4 border rounded-lg md:flex-row md:items-center md:justify-between">
                        <div className="flex items-center gap-4">
                          <div className={`${deadlineTypeConfig[deadline.deadline_type].color} p-2 rounded-lg text-white`}>
                            <FileText className="h-5 w-5" />
                          </div>
                          <div>
                            <p className="font-medium">{deadline.title}</p>
                            <p className="text-sm text-muted-foreground">{deadline.course_title}</p>
                            <p className="text-xs text-muted-foreground">{deadline.term_name} · {deadline.academic_year_name}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3 md:justify-end">
                          <div className="text-right">
                            <p className="font-medium">{format(new Date(deadline.due_date), 'MMM d, yyyy')}</p>
                            <p className={`text-sm ${status.color}`}>
                              {daysUntil === 0 ? 'Due today' : daysUntil === 1 ? 'Due tomorrow' : `${daysUntil} days left`}
                            </p>
                          </div>
                          <Badge variant={status.variant}>{status.label}</Badge>
                          <Button variant="ghost" size="icon" onClick={() => generateICS(deadline)} aria-label={`Download ${deadline.title} calendar event`}>
                            <Download className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    );
                  })}

                {upcomingDeadlines.length === 0 && (
                  <div className="text-center py-10 text-muted-foreground">
                    <Calendar className="h-12 w-12 mx-auto mb-3 opacity-50" />
                    <p className="font-medium">No governed upcoming deadlines</p>
                    <p className="text-sm mt-1">Course templates do not become operational deadlines until they are attached to a governed section.</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="all">
          <Card>
            <CardHeader>
              <CardTitle>All governed deadlines</CardTitle>
              <CardDescription>Complete evidence-backed assessment calendar.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Deadline</TableHead>
                      <TableHead>Course</TableHead>
                      <TableHead>Term / Year</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Due Date</TableHead>
                      <TableHead>Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredDeadlines.map((deadline) => (
                      <TableRow key={deadline.id}>
                        <TableCell className="font-medium">{deadline.title}</TableCell>
                        <TableCell>{deadline.course_title}</TableCell>
                        <TableCell>
                          <div>{deadline.term_name}</div>
                          <div className="text-xs text-muted-foreground">{deadline.academic_year_name}</div>
                        </TableCell>
                        <TableCell>
                          <Badge className={deadlineTypeConfig[deadline.deadline_type].color}>
                            {deadlineTypeConfig[deadline.deadline_type].label}
                          </Badge>
                        </TableCell>
                        <TableCell>{format(new Date(deadline.due_date), 'MMM d, yyyy HH:mm')}</TableCell>
                        <TableCell>
                          <Button variant="ghost" size="icon" onClick={() => generateICS(deadline)} aria-label={`Download ${deadline.title} calendar event`}>
                            <Download className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="rules">
          <Card>
            <CardHeader>
              <CardTitle>What SUYAS treats as an operational deadline</CardTitle>
              <CardDescription>Fail-closed evidence rules for the academic calendar.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-3 md:grid-cols-2">
              {[
                'The assignment is explicitly published.',
                'The assignment belongs to a concrete course section.',
                'That section belongs to a canonical academic term.',
                'That term belongs to a published SUYAS academic year.',
                'Closed or archived terms are excluded from the operational calendar.',
                'Course-level assignment templates remain templates until instantiated into a section.'
              ].map((rule) => (
                <div key={rule} className="flex items-start gap-2 rounded-lg border p-3 text-sm">
                  <ShieldCheck className="h-4 w-4 mt-0.5 shrink-0 text-primary" />
                  <span>{rule}</span>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
