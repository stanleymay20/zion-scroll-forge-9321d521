import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { PageTemplate } from '@/components/layout/PageTemplate';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { useCreateApplication, useUploadDocument, useStudentProfile } from '@/hooks/useStudents';
// useDegreePrograms intentionally not used here — we load ALL active programs across visibility tiers.
import { useCohortStatus } from '@/hooks/useLaunchOps';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Upload, Check, Lock, BookOpen, FileCheck, AlertCircle, ExternalLink, GraduationCap, ListChecks, Sparkles } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { Link } from 'react-router-dom';
import { onboardingRoutes } from '@/lib/onboardingRoutes';

type ProgramRequirement = {
  id: string;
  level: string;
  display_label: string;
  min_academic: string | null;
  required_documents: string[];
  optional_documents: string[];
  additional_requirements: string[];
  statement_min_words: number | null;
  reference_letters_required: number | null;
  notes: string | null;
};

export default function Apply() {
  const navigate = useNavigate();
  const { data: profile } = useStudentProfile();
  // Load EVERY active program (all visibility tiers) so applicants can apply to
  // pilot_private and internal_development programs too — admissions decides eligibility.
  const [programs, setPrograms] = useState<any[]>([]);
  const [programsLoading, setProgramsLoading] = useState(true);
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from('degree_programs')
        .select('id, title, level, faculty, description, duration, program_status')
        .eq('is_active', true)
        .order('level')
        .order('title');
      if (!cancelled) {
        setPrograms(data || []);
        setProgramsLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);
  const { data: cohort, isLoading: cohortLoading } = useCohortStatus();
  const createApplication = useCreateApplication();
  const uploadDocument = useUploadDocument();

  const [enrollmentLevel, setEnrollmentLevel] = useState<string>('');
  const [programCourses, setProgramCourses] = useState<any[]>([]);
  const [loadingCourses, setLoadingCourses] = useState(false);
  const [formData, setFormData] = useState({
    full_name: '',
    email: '',
    phone: '',
    dob: '',
    gender: '',
    country: '',
    address: '',
    degree_program_id: '',
    motivation_statement: '',
  });

  // Level options shown in the application form. Maps friendly labels to the
  // `level` column values used on degree_programs.
  const LEVEL_OPTIONS: { label: string; value: string }[] = [
    { label: 'Certificate', value: 'Certificate' },
    { label: 'Diploma', value: 'Diploma' },
    { label: "Bachelor's Degree (BSc / BA)", value: 'Undergraduate' },
    { label: "Master's (MSc / MA / MDiv)", value: 'Graduate' },
    { label: 'Doctorate (PhD)', value: 'Doctoral' },
    { label: 'Exousia Fellowship', value: 'Exousia' },
  ];

  const filteredPrograms = enrollmentLevel
    ? (programs as any[]).filter((p) => p.level === enrollmentLevel)
    : (programs as any[]);

  // Load courses mapped to the selected program so applicants can preview the
  // catalog they're committing to before they submit the application.
  useEffect(() => {
    let cancelled = false;
    if (!formData.degree_program_id) {
      setProgramCourses([]);
      return;
    }
    setLoadingCourses(true);
    (async () => {
      const { data, error } = await supabase
        .from('degree_program_courses')
        .select('sequence_order, is_required, courses(id, title, description, level, faculty, duration, credit_hours)')
        .eq('degree_program_id', formData.degree_program_id)
        .order('sequence_order', { ascending: true });
      if (cancelled) return;
      if (error) {
        setProgramCourses([]);
      } else {
        setProgramCourses((data || []).map((r: any) => ({ ...r.courses, is_required: r.is_required })));
      }
      setLoadingCourses(false);
    })();
    return () => { cancelled = true; };
  }, [formData.degree_program_id]);

  // Per-level admission requirements (driven by `program_requirements` table).
  const [requirements, setRequirements] = useState<ProgramRequirement | null>(null);
  const [loadingRequirements, setLoadingRequirements] = useState(false);
  useEffect(() => {
    let cancelled = false;
    if (!enrollmentLevel) {
      setRequirements(null);
      return;
    }
    setLoadingRequirements(true);
    (async () => {
      const { data } = await supabase
        .from('program_requirements')
        .select('*')
        .eq('level', enrollmentLevel)
        .maybeSingle();
      if (!cancelled) {
        setRequirements(data as any);
        setLoadingRequirements(false);
      }
    })();
    return () => { cancelled = true; };
  }, [enrollmentLevel]);

  // Dynamic per-document upload state keyed by document label.
  const [docFiles, setDocFiles] = useState<Record<string, File>>({});

  const requiredDocs: string[] = requirements?.required_documents ?? [];
  const optionalDocs: string[] = requirements?.optional_documents ?? [];
  const additionalReqs: string[] = requirements?.additional_requirements ?? [];
  const statementMinWords = requirements?.statement_min_words ?? 80;
  const wordCount = (formData.motivation_statement.trim().match(/\S+/g) || []).length;
  const missingDocs = requiredDocs.filter((d) => !docFiles[d]);

  const selectedProgram = (programs as any[]).find((p) => p.id === formData.degree_program_id);

  // Derive a 4-step completion indicator for the application form.
  const personalFilled = !!(formData.full_name && formData.email && formData.phone && formData.dob && formData.gender && formData.country && formData.address);
  const stepDone = {
    program: !!(enrollmentLevel && formData.degree_program_id),
    personal: personalFilled,
    motivation: wordCount >= statementMinWords,
    documents: requiredDocs.length === 0 || missingDocs.length === 0,
  };
  const completedSteps = Object.values(stepDone).filter(Boolean).length;
  const stepLabels: Array<{ key: keyof typeof stepDone; label: string }> = [
    { key: 'program', label: 'Program' },
    { key: 'personal', label: 'Personal' },
    { key: 'motivation', label: 'Motivation' },
    { key: 'documents', label: 'Documents' },
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.degree_program_id) {
      toast.error('Please select a program');
      return;
    }
    if (wordCount < statementMinWords) {
      toast.error(`Motivation statement must be at least ${statementMinWords} words (currently ${wordCount}).`);
      return;
    }
    if (missingDocs.length > 0) {
      toast.error(`Missing required documents: ${missingDocs.join(', ')}`);
      return;
    }
    try {
      const student: any = await createApplication.mutateAsync(formData as any);
      // Upload every supplied document (required + optional)
      for (const [docType, file] of Object.entries(docFiles)) {
        if (file) {
          await uploadDocument.mutateAsync({ studentId: student.id, docType, file });
        }
      }
      toast.success('Application submitted — review in progress');
      navigate(onboardingRoutes.studentDashboard);
    } catch {
      toast.error('Failed to submit application');
    }
  };

  // Already accepted
  if (profile?.application_status === 'accepted') {
    return (
      <PageTemplate title="Application Status" description="You've been admitted">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Check className="h-6 w-6 text-green-600" />
              Welcome to ScrollUniversity
            </CardTitle>
            <CardDescription>Your dashboard is ready.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {(profile as any)?.student_id_code && (
              <div className="rounded-md border bg-muted/30 p-3 text-sm space-y-1">
                <div><span className="text-muted-foreground">Student ID:</span> <span className="font-mono font-semibold">{(profile as any).student_id_code}</span></div>
                <div><span className="text-muted-foreground">Institutional Email:</span> <span className="font-mono">{(profile as any).institutional_email}</span></div>
                {(profile as any).cohort_number && (
                  <div><span className="text-muted-foreground">Cohort #:</span> {(profile as any).cohort_number}</div>
                )}
              </div>
            )}
            <Button onClick={() => navigate(onboardingRoutes.orientation)}>Begin Orientation</Button>
          </CardContent>
        </Card>
      </PageTemplate>
    );
  }

  if (profile?.application_status === 'submitted') {
    return (
      <PageTemplate title="Application Status" description="Under review">
        <Card>
          <CardHeader>
            <CardTitle>Application Under Review</CardTitle>
            <CardDescription>You'll be notified by email once a decision is made.</CardDescription>
          </CardHeader>
        </Card>
      </PageTemplate>
    );
  }

  if (profile?.application_status === 'waitlisted') {
    return (
      <PageTemplate title="Waitlisted" description="You're on the cohort waitlist">
        <Card>
          <CardHeader>
            <CardTitle>You're on the Waitlist</CardTitle>
            <CardDescription>
              We'll notify you the moment a seat opens. No further action is needed.
            </CardDescription>
          </CardHeader>
        </Card>
      </PageTemplate>
    );
  }

  if (profile?.application_status === 'rejected') {
    return (
      <PageTemplate title="Application Decision" description="Decision recorded">
        <Card>
          <CardHeader>
            <CardTitle>Application Not Advanced</CardTitle>
            <CardDescription>
              {(profile as any)?.rejection_reason || 'Thank you for applying. You may apply again in a future cohort.'}
            </CardDescription>
          </CardHeader>
        </Card>
      </PageTemplate>
    );
  }

  // Cohort cap reached
  if (cohort && !cohort.is_open) {
    return (
      <PageTemplate title="Cohort Closed" description="Beta cohort is currently full">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Lock className="h-6 w-6 text-muted-foreground" />
              {cohort.cohort_label} is full
            </CardTitle>
            <CardDescription>
              All {cohort.cohort_cap} seats have been filled. Join the waitlist for the next cohort.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="outline" onClick={() => navigate('/')}>Return Home</Button>
          </CardContent>
        </Card>
      </PageTemplate>
    );
  }

  const filled = cohort ? cohort.admitted : 0;
  const cap = cohort?.cohort_cap ?? 50;
  const pct = Math.min(100, Math.round((filled / cap) * 100));

  return (
    <PageTemplate title="Apply to ScrollUniversity" description="Begin your transformative learning journey">
      {!cohortLoading && cohort && (
        <Card className="mb-4 border-primary/30">
          <CardContent className="py-4 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="font-medium">{cohort.cohort_label}</span>
              <span className="text-muted-foreground">
                {filled} / {cap} admitted • {cohort.seats_remaining} seats left
              </span>
            </div>
            <Progress value={pct} />
            <p className="text-xs text-muted-foreground">
              Admissions are reviewed on a rolling basis. Qualified applicants beyond capacity may be placed on a waitlist for the next cohort.
            </p>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Student Application</CardTitle>
          <CardDescription>
            Submit your application to join ScrollUniversity's community of faith-driven scholars
          </CardDescription>
          {/* Step progress indicator */}
          <div className="pt-3 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-medium text-foreground">Step {Math.min(completedSteps + 1, 4)} of 4</span>
              <span className="text-muted-foreground">{completedSteps}/4 complete</span>
            </div>
            <Progress value={(completedSteps / 4) * 100} />
            <div className="flex flex-wrap gap-1.5">
              {stepLabels.map((s, i) => (
                <Badge
                  key={s.key}
                  variant={stepDone[s.key] ? 'default' : 'outline'}
                  className="text-[10px]"
                >
                  {stepDone[s.key] ? <Check className="h-2.5 w-2.5 mr-1" /> : <span className="mr-1">{i + 1}.</span>}
                  {s.label}
                </Badge>
              ))}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="enrollment_level">Level of Enrollment *</Label>
              <select
                id="enrollment_level"
                required
                value={enrollmentLevel}
                onChange={(e) => {
                  setEnrollmentLevel(e.target.value);
                  setFormData({ ...formData, degree_program_id: '' });
                }}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
              >
                <option value="" disabled>Select level (Certificate, Bachelor's, Masters, PhD, Exousia…)</option>
                {LEVEL_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>

            {enrollmentLevel && (
              <Card className="bg-muted/30 border-primary/20">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <FileCheck className="h-4 w-4 text-primary" />
                    Admission Requirements
                    {requirements?.display_label && (
                      <Badge variant="secondary" className="ml-2">{requirements.display_label}</Badge>
                    )}
                  </CardTitle>
                  <CardDescription>
                    Please ensure you can provide the following before submitting.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4 text-sm">
                  {loadingRequirements ? (
                    <p className="text-muted-foreground">Loading requirements…</p>
                  ) : !requirements ? (
                    <p className="text-muted-foreground">
                      Standard requirements apply. Admissions will contact you with any specific items.
                    </p>
                  ) : (
                    <>
                      {requirements.min_academic && (
                        <div>
                          <div className="font-semibold mb-1">Minimum academic background</div>
                          <p className="text-muted-foreground">{requirements.min_academic}</p>
                        </div>
                      )}
                      {requiredDocs.length > 0 && (
                        <div>
                          <div className="font-semibold mb-1">Mandatory documents</div>
                          <ul className="list-disc list-inside space-y-0.5 text-muted-foreground">
                            {requiredDocs.map((d) => <li key={d}>{d}</li>)}
                          </ul>
                        </div>
                      )}
                      {optionalDocs.length > 0 && (
                        <div>
                          <div className="font-semibold mb-1">Recommended (optional)</div>
                          <ul className="list-disc list-inside space-y-0.5 text-muted-foreground">
                            {optionalDocs.map((d) => <li key={d}>{d}</li>)}
                          </ul>
                        </div>
                      )}
                      {additionalReqs.length > 0 && (
                        <div>
                          <div className="font-semibold mb-1">Additional requirements</div>
                          <ul className="list-disc list-inside space-y-0.5 text-muted-foreground">
                            {additionalReqs.map((r) => <li key={r}>{r}</li>)}
                          </ul>
                        </div>
                      )}
                      {requirements.notes && (
                        <p className="text-xs text-muted-foreground italic border-t pt-2">{requirements.notes}</p>
                      )}
                    </>
                  )}
                </CardContent>
              </Card>
            )}

            <div className="space-y-2">
              <Label htmlFor="program">Program of Interest *</Label>
              <select
                id="program"
                required
                disabled={programsLoading || !enrollmentLevel}
                value={formData.degree_program_id}
                onChange={(e) => setFormData({ ...formData, degree_program_id: e.target.value })}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <option value="" disabled>
                  {!enrollmentLevel
                    ? 'Select a level first'
                    : programsLoading
                      ? 'Loading programs…'
                      : filteredPrograms.length > 0
                        ? 'Select a program'
                        : 'No programs available at this level'}
                </option>
                {filteredPrograms.map((p: any) => (
                  <option key={p.id} value={p.id}>
                    {p.title}{p.faculty ? ` — ${p.faculty}` : ''}
                  </option>
                ))}
              </select>
            </div>

            {selectedProgram && (
              <Card className="bg-primary/5 border-primary/30">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <GraduationCap className="h-4 w-4 text-primary" />
                    You are applying for
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 text-sm">
                  <div className="font-serif text-lg font-semibold leading-tight">
                    {selectedProgram.title}
                  </div>
                  <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs">
                    {selectedProgram.faculty && (
                      <div><span className="text-muted-foreground">Faculty:</span> <span className="font-medium">{selectedProgram.faculty}</span></div>
                    )}
                    {selectedProgram.level && (
                      <div><span className="text-muted-foreground">Entry path:</span> <span className="font-medium">{selectedProgram.level}</span></div>
                    )}
                    {selectedProgram.duration && (
                      <div><span className="text-muted-foreground">Duration:</span> <span className="font-medium">{selectedProgram.duration}</span></div>
                    )}
                    <div><span className="text-muted-foreground">Mode:</span> <span className="font-medium">Hybrid AI-Assisted</span></div>
                  </div>
                  {selectedProgram.description && (
                    <p className="text-xs text-muted-foreground line-clamp-3">{selectedProgram.description}</p>
                  )}
                  <div className="flex flex-wrap gap-2 pt-1">
                    <Button asChild type="button" variant="outline" size="sm">
                      <Link to={`/degree-programs/${selectedProgram.id}`} target="_blank" rel="noopener">
                        <ExternalLink className="h-3 w-3 mr-1" /> Preview Program
                      </Link>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {formData.degree_program_id && (
              <Card className="bg-muted/30 border-primary/20">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <BookOpen className="h-4 w-4 text-primary" />
                    Courses in this program
                    {!loadingCourses && (
                      <Badge variant="secondary" className="ml-2">{programCourses.length}</Badge>
                    )}
                  </CardTitle>
                  <CardDescription>
                    Once accepted, you'll be enrolled into the courses below as part of this program.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {loadingCourses ? (
                    <p className="text-sm text-muted-foreground">Loading curriculum…</p>
                  ) : programCourses.length === 0 ? (
                    <p className="text-sm text-muted-foreground">
                      Curriculum is being finalised for this program. You can still apply.
                    </p>
                  ) : (
                    <ol className="space-y-2 max-h-72 overflow-y-auto pr-2">
                      {programCourses.map((c: any, idx: number) => (
                        <li key={c.id} className="flex items-start gap-3 text-sm">
                          <span className="text-xs font-mono text-muted-foreground mt-0.5 w-6 shrink-0">
                            {String(idx + 1).padStart(2, '0')}
                          </span>
                          <div className="flex-1 min-w-0">
                            <div className="font-medium truncate">{c.title}</div>
                            <div className="flex flex-wrap gap-1 mt-1">
                              {c.faculty && <Badge variant="outline" className="text-[10px]">{c.faculty}</Badge>}
                              {c.credit_hours && <Badge variant="outline" className="text-[10px]">{c.credit_hours} cr</Badge>}
                              {c.is_required && <Badge variant="secondary" className="text-[10px]">Required</Badge>}
                            </div>
                          </div>
                        </li>
                      ))}
                    </ol>
                  )}
                </CardContent>
              </Card>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="full_name">Full Name *</Label>
                <Input id="full_name" required value={formData.full_name}
                  onChange={(e) => setFormData({ ...formData, full_name: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email *</Label>
                <Input id="email" type="email" required value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Phone *</Label>
                <Input id="phone" required value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="dob">Date of Birth *</Label>
                <Input id="dob" type="date" required value={formData.dob}
                  onChange={(e) => setFormData({ ...formData, dob: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="gender">Gender *</Label>
                <select
                  id="gender"
                  required
                  value={formData.gender}
                  onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <option value="" disabled>Select</option>
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                  <option value="other">Other</option>
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="country">Country *</Label>
                <Input id="country" required value={formData.country}
                  onChange={(e) => setFormData({ ...formData, country: e.target.value })} />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="address">Address *</Label>
              <Textarea id="address" required value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })} />
            </div>

            <div className="space-y-2">
              <Label htmlFor="motivation">
                Motivation Statement * <span className="text-xs text-muted-foreground">(min {statementMinWords} words)</span>
              </Label>
              <Textarea
                id="motivation"
                required
                rows={6}
                maxLength={8000}
                placeholder="Why this program? What do you bring? What do you hope to do?"
                value={formData.motivation_statement}
                onChange={(e) => setFormData({ ...formData, motivation_statement: e.target.value })}
              />
              <div className="text-xs text-muted-foreground text-right">
                {wordCount} / {statementMinWords} words
                {wordCount < statementMinWords && (
                  <span className="text-destructive ml-2">• {statementMinWords - wordCount} more needed</span>
                )}
              </div>
            </div>

            {enrollmentLevel && (
              <div className="space-y-4 border-t pt-4">
                <div>
                  <h3 className="font-semibold flex items-center gap-2">
                    <Upload className="h-4 w-4" />
                    Supporting Documents
                  </h3>
                  <p className="text-xs text-muted-foreground mt-1">
                    Upload each item below. Required items must be supplied to submit.
                  </p>
                </div>

                {requiredDocs.map((doc) => {
                  const has = !!docFiles[doc];
                  return (
                    <div key={doc} className="space-y-2">
                      <Label className="flex items-center gap-2">
                        {doc}
                        <Badge variant="destructive" className="text-[10px]">Required</Badge>
                        {has && <Check className="h-3 w-3 text-green-600" />}
                      </Label>
                      <Input
                        type="file"
                        accept=".pdf,.jpg,.jpeg,.png"
                        onChange={(e) => {
                          const f = e.target.files?.[0];
                          setDocFiles((prev) => {
                            const next = { ...prev };
                            if (f) next[doc] = f; else delete next[doc];
                            return next;
                          });
                        }}
                      />
                    </div>
                  );
                })}

                {optionalDocs.map((doc) => {
                  const has = !!docFiles[doc];
                  return (
                    <div key={doc} className="space-y-2">
                      <Label className="flex items-center gap-2">
                        {doc}
                        <Badge variant="secondary" className="text-[10px]">Optional</Badge>
                        {has && <Check className="h-3 w-3 text-green-600" />}
                      </Label>
                      <Input
                        type="file"
                        accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                        onChange={(e) => {
                          const f = e.target.files?.[0];
                          setDocFiles((prev) => {
                            const next = { ...prev };
                            if (f) next[doc] = f; else delete next[doc];
                            return next;
                          });
                        }}
                      />
                    </div>
                  );
                })}

                {missingDocs.length > 0 && (
                  <div className="flex items-start gap-2 text-xs text-destructive bg-destructive/5 border border-destructive/20 rounded p-2">
                    <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                    <span>Still required: {missingDocs.join(', ')}</span>
                  </div>
                )}
              </div>
            )}

            <Button type="submit" className="w-full" disabled={createApplication.isPending}>
              {createApplication.isPending ? 'Submitting...' : 'Submit Application'}
            </Button>
          </form>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <ListChecks className="h-4 w-4 text-primary" /> Admissions Process
            </CardTitle>
            <CardDescription>How your application is reviewed</CardDescription>
          </CardHeader>
          <CardContent>
            <ol className="space-y-2 text-sm">
              {[
                'Application submission',
                'AI-assisted review',
                'Human admissions review',
                'Cohort assignment',
                'Orientation & matriculation',
                'Dashboard activation',
              ].map((step, i) => (
                <li key={step} className="flex items-start gap-2">
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary text-[11px] font-semibold">
                    {i + 1}
                  </span>
                  <span>{step}</span>
                </li>
              ))}
            </ol>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-primary" /> What happens after acceptance
            </CardTitle>
            <CardDescription>Your starter kit as an admitted student</CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2 text-sm">
              {[
                'Official Student ID',
                'Institutional email alias (@scrolluniversity.org)',
                'Signed admission letter',
                'Orientation access & welcome cohort',
                'Personal degree dashboard',
                'AI tutor access across all enrolled courses',
              ].map((item) => (
                <li key={item} className="flex items-start gap-2">
                  <Check className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </div>

    </PageTemplate>
  );
}
