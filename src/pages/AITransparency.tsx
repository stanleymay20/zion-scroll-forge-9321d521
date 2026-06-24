import { Helmet } from "react-helmet";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Shield, Brain, Scale, Eye, FileText, UserCheck } from "lucide-react";

const SYSTEMS = [
  {
    name: "AI Tutors (ScrollMentor, Propheticus, ScrollMedicus, etc.)",
    purpose: "Conversational learning support across faculties.",
    model: "DeepSeek + Lovable AI Gateway (Google Gemini family fallback)",
    risk: "Limited risk",
    decisions: "None binding. Tutors do not grade, admit, or issue credentials.",
    oversight: "Faculty review escalations; conversations are logged.",
  },
  {
    name: "GPT Auto-Grader",
    purpose: "Assist scoring of written assessments against published rubrics.",
    model: "DeepSeek (server-side, faculty-curated prompts)",
    risk: "High risk (Annex III: education)",
    decisions: "AI-suggested score; final grade requires faculty confirmation or auto-confirm under defined thresholds with right to appeal.",
    oversight: "Faculty override available; every override is logged in suyas_audit_logs. Students may request human review.",
  },
  {
    name: "Prophetic Rubric Score",
    purpose: "Map submissions to ScrollUniversity's published spiritual-formation rubric.",
    model: "DeepSeek with rubric-anchored prompt",
    risk: "High risk (education)",
    decisions: "Informs faculty rubric scoring; never sole determinant.",
    oversight: "Faculty signs off before transcripted.",
  },
  {
    name: "Spirit Leak Check",
    purpose: "Pattern-match generated/submitted content against ScrollUniversity content standards (anti-drift).",
    model: "Rule-based + DeepSeek",
    risk: "Limited risk",
    decisions: "Content quality flag for editors. Does not infer or score student emotional state.",
    oversight: "Editorial team reviews flags before publication.",
  },
  {
    name: "Scroll Alignment Score",
    purpose: "Track learner progress across published competency outcomes.",
    model: "Deterministic computation over assessment results",
    risk: "Limited risk",
    decisions: "Used inside the learning journey UI; not used for unrelated services or social scoring.",
    oversight: "Students can view inputs and contest individual assessment results.",
  },
  {
    name: "Live AI Lecture Avatars",
    purpose: "Render synthetic-voice/avatar delivery of faculty-authored lectures.",
    model: "D-ID (avatar) + ElevenLabs (TTS)",
    risk: "Transparency obligation (Art. 50): synthetic media",
    decisions: "None — delivery layer only.",
    oversight: "Faculty author or approve every lecture script. Sessions are labeled as AI-generated.",
  },
];

const AITransparency = () => (
  <div className="min-h-screen bg-background">
    <Helmet>
      <title>AI Transparency — ScrollUniversity</title>
      <meta name="description" content="How ScrollUniversity uses AI, what decisions it influences, and your rights under the EU AI Act." />
      <link rel="canonical" href="https://scrolluniversity.org/ai-transparency" />
    </Helmet>
    <Header />
    <main className="max-w-5xl mx-auto px-4 py-16 space-y-12">
      <header className="space-y-4">
        <Badge variant="outline" className="gap-1.5"><Shield className="h-3 w-3" /> EU AI Act · Art. 13, 50, 86</Badge>
        <h1 className="text-4xl md:text-5xl font-serif">AI Transparency</h1>
        <p className="text-muted-foreground max-w-3xl leading-relaxed">
          ScrollUniversity uses AI to support tutoring, content authoring, assessment, and lecture delivery. This page is maintained by ScrollUniversity to disclose which AI systems are in use, what they do, what decisions they influence, and the human-oversight and appeal rights available to learners.
        </p>
        <p className="text-xs text-muted-foreground">Last updated: 24 June 2026.</p>
      </header>

      <section className="grid md:grid-cols-3 gap-4">
        {[
          { icon: Eye, title: "Disclosure", body: "Every AI interaction is labeled. Synthetic voices and avatars are marked." },
          { icon: UserCheck, title: "Human oversight", body: "AI never issues a binding grade, admission, or credential without a human in the loop." },
          { icon: Scale, title: "Right to review", body: "You can request human review of any AI-assisted decision affecting you." },
        ].map(({ icon: Icon, title, body }) => (
          <Card key={title}>
            <CardHeader><Icon className="h-5 w-5 text-accent" /><CardTitle className="text-base">{title}</CardTitle></CardHeader>
            <CardContent className="text-sm text-muted-foreground">{body}</CardContent>
          </Card>
        ))}
      </section>

      <section className="space-y-4">
        <h2 className="text-2xl font-serif flex items-center gap-2"><Brain className="h-5 w-5 text-accent" /> AI systems in use</h2>
        <div className="grid gap-4">
          {SYSTEMS.map((s) => (
            <Card key={s.name}>
              <CardHeader>
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  <CardTitle className="text-lg">{s.name}</CardTitle>
                  <Badge variant={s.risk.startsWith("High") ? "destructive" : "secondary"}>{s.risk}</Badge>
                </div>
                <CardDescription>{s.purpose}</CardDescription>
              </CardHeader>
              <CardContent className="text-sm space-y-2">
                <div><span className="font-semibold">Model: </span><span className="text-muted-foreground">{s.model}</span></div>
                <div><span className="font-semibold">Decisions: </span><span className="text-muted-foreground">{s.decisions}</span></div>
                <div><span className="font-semibold">Human oversight: </span><span className="text-muted-foreground">{s.oversight}</span></div>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-2xl font-serif flex items-center gap-2"><Scale className="h-5 w-5 text-accent" /> Your rights</h2>
        <Card>
          <CardContent className="pt-6 space-y-3 text-sm leading-relaxed">
            <p><span className="font-semibold">Explanation (Art. 86).</span> You may request a meaningful explanation of any AI-assisted decision affecting your grades, admission, holds, or credentials.</p>
            <p><span className="font-semibold">Human review.</span> A human reviewer (faculty or registrar) will reconsider the decision. Use the "Request human review" control wherever it appears, or contact your advisor.</p>
            <p><span className="font-semibold">Access &amp; correction.</span> You can access and correct your academic records through your student profile, per our <a href="/privacy" className="underline">Privacy Policy</a>.</p>
            <p><span className="font-semibold">Opt-out of non-essential AI.</span> AI tutoring is optional. Course completion does not require chatting with AI tutors.</p>
            <p><span className="font-semibold">Prohibited practices.</span> ScrollUniversity does not perform emotion inference for grading and does not use AI for social scoring outside the published academic context.</p>
          </CardContent>
        </Card>
      </section>

      <section className="space-y-4">
        <h2 className="text-2xl font-serif flex items-center gap-2"><FileText className="h-5 w-5 text-accent" /> Governance &amp; logging</h2>
        <Card>
          <CardContent className="pt-6 text-sm text-muted-foreground space-y-2 leading-relaxed">
            <p>All AI-assisted decisions are logged in immutable audit trails (SUYAS audit logs and spiritual_events_log). Faculty overrides, integrity appeals, and human review requests are tracked end-to-end.</p>
            <p>ScrollUniversity is a <em>deployer</em> of third-party general-purpose AI models (DeepSeek, Lovable AI Gateway / Gemini, D-ID, ElevenLabs). We do not train foundation models on student data.</p>
            <p>Contact: <a href="mailto:trust@scrolluniversity.org" className="underline">trust@scrolluniversity.org</a></p>
          </CardContent>
        </Card>
      </section>
    </main>
    <Footer />
  </div>
);

export default AITransparency;
