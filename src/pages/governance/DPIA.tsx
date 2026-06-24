import { Helmet } from "react-helmet";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { FileLock2 } from "lucide-react";

const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <Card>
    <CardHeader><CardTitle className="text-lg">{title}</CardTitle></CardHeader>
    <CardContent className="text-sm text-muted-foreground space-y-2 leading-relaxed">{children}</CardContent>
  </Card>
);

const DPIA = () => (
  <div className="min-h-screen bg-background">
    <Helmet>
      <title>Data Protection Impact Assessment (AI Systems) — ScrollUniversity</title>
      <meta name="description" content="DPIA for AI-assisted grading, admissions, and academic decisions at ScrollUniversity, per GDPR Article 35." />
      <link rel="canonical" href="https://scrolluniversity.org/governance/dpia" />
    </Helmet>
    <Header />
    <main className="max-w-4xl mx-auto px-4 py-16 space-y-8">
      <header className="space-y-3">
        <Badge variant="outline" className="gap-1.5"><FileLock2 className="h-3 w-3" /> GDPR · Art. 35 DPIA</Badge>
        <h1 className="text-4xl md:text-5xl font-serif">Data Protection Impact Assessment</h1>
        <p className="text-muted-foreground leading-relaxed">
          Summary DPIA covering ScrollUniversity's high-risk AI-assisted processing: grading, admissions, academic standing, and credential issuance. Maintained by the Data Protection Office.
        </p>
        <p className="text-xs text-muted-foreground">Version 1.0 · 24 June 2026.</p>
      </header>

      <Section title="1. Processing description">
        <p>ScrollUniversity processes learner identity, enrolment, submitted academic work, assessment responses, learning analytics, and credential metadata. AI is used to (a) suggest scores for open-ended responses, (b) generate explanatory feedback, (c) pre-screen admissions applications, and (d) deliver synthetic lectures from faculty-authored scripts.</p>
      </Section>

      <Section title="2. Lawful basis">
        <p>Performance of the educational contract with the learner (GDPR Art. 6(1)(b)) for grading and credentialing, and legitimate interest (Art. 6(1)(f)) for fraud prevention and academic integrity, with the learner's interests balanced through transparency and appeal rights.</p>
      </Section>

      <Section title="3. Categories of data subjects and data">
        <p>Data subjects: prospective applicants, enrolled learners, faculty, staff. Data categories: contact and identity data, academic records, submitted work, assessment attempts, learning analytics, AI conversation transcripts, audit logs. No biometric identification or emotion inference is performed.</p>
      </Section>

      <Section title="4. Recipients and transfers">
        <p>Recipients: ScrollUniversity faculty and registrar staff. Sub-processors: Lovable Cloud (hosting + database), DeepSeek and Lovable AI Gateway / Google Gemini (AI inference), D-ID (avatar rendering), ElevenLabs (speech synthesis). Transfers outside the EEA rely on Standard Contractual Clauses where applicable.</p>
      </Section>

      <Section title="5. Necessity and proportionality">
        <p>AI assistance is necessary to deliver consistent, scalable assessment across global learners and to provide individualised tutoring beyond what is feasible with faculty time alone. AI output is bounded by published rubrics, never used as the sole determinant of a binding decision, and limited to data the learner has already submitted.</p>
      </Section>

      <Section title="6. Risks to data subjects">
        <ul className="list-disc list-inside space-y-1">
          <li>Inaccurate or biased scoring affecting academic progression.</li>
          <li>Unjust admissions screening signals.</li>
          <li>Loss of confidentiality of submitted work or learning analytics.</li>
          <li>Mistaking AI tutor output for authoritative faculty guidance.</li>
        </ul>
      </Section>

      <Section title="7. Mitigations">
        <ul className="list-disc list-inside space-y-1">
          <li>Human-in-the-loop required for every binding grade and admit/deny decision.</li>
          <li>Row-level security on every learner-data table; role checks via <code>has_role</code>; immutable audit logs.</li>
          <li>Persistent AI disclosure surfaces and per-decision explanation affordances.</li>
          <li>Learner right to request human review via the in-app review queue (Art. 86 of the EU AI Act).</li>
          <li>No training of foundation models on learner data; sub-processor contracts forbid such use.</li>
          <li>Quarterly bias audit of grading outputs by the Academic Standards Office.</li>
        </ul>
      </Section>

      <Section title="8. Data subject rights">
        <p>Access, rectification, erasure (subject to retention obligations for awarded credentials), restriction, portability, and objection are available through the in-app account settings or by contacting <a href="mailto:privacy@scrolluniversity.org" className="underline">privacy@scrolluniversity.org</a>. Automated-decision and AI-Act rights are summarised on the <a href="/ai-transparency" className="underline">AI Transparency</a> page.</p>
      </Section>

      <Section title="9. Residual risk and sign-off">
        <p>Residual risk is assessed as <strong>Low</strong>. The DPO confirms the processing complies with GDPR and the EU AI Act for the period 24 June 2026 – 24 June 2027, subject to quarterly review.</p>
      </Section>

      <Card>
        <CardContent className="pt-6 text-xs text-muted-foreground">
          Contact: <a href="mailto:dpo@scrolluniversity.org" className="underline">dpo@scrolluniversity.org</a>. Supervisory authority contact details are provided in our <a href="/privacy" className="underline">Privacy Policy</a>.
        </CardContent>
      </Card>
    </main>
    <Footer />
  </div>
);

export default DPIA;
