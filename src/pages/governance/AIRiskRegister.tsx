import { Helmet } from "react-helmet";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ShieldAlert } from "lucide-react";

const RISKS = [
  {
    system: "GPT Auto-Grader",
    purpose: "Assist faculty in scoring open-ended assessments.",
    risk: "High",
    hazards: [
      "Scoring bias against non-native English writers",
      "Hallucinated justification of an incorrect score",
      "Over-reliance by faculty (rubber-stamping)",
    ],
    mitigations: [
      "Rubric-anchored prompts authored by faculty",
      "Faculty override required above defined thresholds",
      "All overrides logged in suyas_audit_logs (immutable)",
      "Student right to request human review (Art. 86)",
      "Quarterly bias audit by Academic Standards Office",
    ],
    residual: "Low — every binding grade has a human in the loop.",
  },
  {
    system: "Admissions decision assistant",
    purpose: "Pre-screen and surface signals on incoming student applications.",
    risk: "High",
    hazards: [
      "Demographic bias in screening signals",
      "Unjust rejection without explainable reason",
      "Disparate impact across regions / languages",
    ],
    mitigations: [
      "Final admit/deny decision made by registrar, not AI",
      "Decision rationale stored alongside application",
      "Applicant right to explanation and appeal",
      "Annual fairness review of acceptance distributions",
    ],
    residual: "Low — AI surfaces signals only; humans decide.",
  },
  {
    system: "Prophetic Rubric Score",
    purpose: "Map submissions to spiritual-formation rubric.",
    risk: "High",
    hazards: [
      "Conflation of doctrinal alignment with academic merit",
      "Subjective rubric language producing inconsistent scores",
    ],
    mitigations: [
      "Rubric published transparently to students",
      "Faculty review and sign-off before transcripted",
      "Students may request re-evaluation",
    ],
    residual: "Low.",
  },
  {
    system: "Spirit Leak Check",
    purpose: "Content-quality and anti-drift checks on generated/submitted material.",
    risk: "Limited",
    hazards: [
      "False positives flagging legitimate content",
      "Misinterpretation as emotion inference (prohibited under Art. 5)",
    ],
    mitigations: [
      "System operates on content only; never on student emotional state",
      "All flags reviewed by editorial team before action",
      "Documented in /ai-transparency",
    ],
    residual: "Very low.",
  },
  {
    system: "AI Tutors (ScrollMentor, Propheticus, etc.)",
    purpose: "Conversational learning support.",
    risk: "Limited",
    hazards: [
      "Factual inaccuracies / hallucinations",
      "Over-reliance by students",
    ],
    mitigations: [
      "Persistent AI disclosure banner in every chat",
      "Faculty curate system prompts per faculty/domain",
      "Tutors never issue binding academic decisions",
    ],
    residual: "Low.",
  },
  {
    system: "Live AI Lecture Avatars (D-ID + ElevenLabs)",
    purpose: "Synthetic delivery of faculty-authored lectures.",
    risk: "Transparency (Art. 50)",
    hazards: [
      "Mistaking AI delivery for a real human lecturer",
      "Voice/likeness misuse",
    ],
    mitigations: [
      "Sessions labeled as AI-generated in UI",
      "Faculty author or approve every lecture script",
      "Vendor DPAs cover voice/avatar provenance",
    ],
    residual: "Very low.",
  },
];

const AIRiskRegister = () => (
  <div className="min-h-screen bg-background">
    <Helmet>
      <title>AI Risk Register — ScrollUniversity</title>
      <meta name="description" content="Risk management documentation for ScrollUniversity's AI systems, per EU AI Act Article 9." />
      <link rel="canonical" href="https://scrolluniversity.org/governance/ai-risk-register" />
    </Helmet>
    <Header />
    <main className="max-w-5xl mx-auto px-4 py-16 space-y-10">
      <header className="space-y-3">
        <Badge variant="outline" className="gap-1.5"><ShieldAlert className="h-3 w-3" /> EU AI Act · Art. 9 Risk Management</Badge>
        <h1 className="text-4xl md:text-5xl font-serif">AI Risk Register</h1>
        <p className="text-muted-foreground max-w-3xl leading-relaxed">
          ScrollUniversity maintains a continuous risk management process for each AI system it deploys. This page summarises the current risk register. It is reviewed quarterly by the Academic Standards Office and updated whenever a system changes materially.
        </p>
        <p className="text-xs text-muted-foreground">Last reviewed: 24 June 2026. Next review: September 2026.</p>
      </header>

      <div className="grid gap-4">
        {RISKS.map((r) => (
          <Card key={r.system}>
            <CardHeader>
              <div className="flex items-start justify-between gap-3 flex-wrap">
                <CardTitle className="text-lg">{r.system}</CardTitle>
                <Badge variant={r.risk === "High" ? "destructive" : "secondary"}>{r.risk} risk</Badge>
              </div>
              <p className="text-sm text-muted-foreground">{r.purpose}</p>
            </CardHeader>
            <CardContent className="grid md:grid-cols-2 gap-4 text-sm">
              <div>
                <div className="font-semibold mb-1.5">Identified hazards</div>
                <ul className="list-disc list-inside text-muted-foreground space-y-1">
                  {r.hazards.map((h) => <li key={h}>{h}</li>)}
                </ul>
              </div>
              <div>
                <div className="font-semibold mb-1.5">Mitigations in place</div>
                <ul className="list-disc list-inside text-muted-foreground space-y-1">
                  {r.mitigations.map((m) => <li key={m}>{m}</li>)}
                </ul>
              </div>
              <div className="md:col-span-2 text-xs text-muted-foreground">
                <span className="font-semibold">Residual risk:</span> {r.residual}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Governance</CardTitle></CardHeader>
        <CardContent className="text-sm text-muted-foreground space-y-2">
          <p>The Academic Standards Office owns this register. The 12 Supreme Scroll Faculties contribute domain-specific hazards. Incidents trigger an immediate review of the affected system.</p>
          <p>Contact: <a href="mailto:trust@scrolluniversity.org" className="underline">trust@scrolluniversity.org</a></p>
        </CardContent>
      </Card>
    </main>
    <Footer />
  </div>
);

export default AIRiskRegister;
