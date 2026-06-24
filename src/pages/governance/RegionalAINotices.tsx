import { Helmet } from "react-helmet";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Globe2 } from "lucide-react";

const REGIONS = [
  {
    id: "eu",
    flag: "🇪🇺",
    title: "European Union — EU AI Act",
    badge: "In force",
    summary: "ScrollUniversity operates AI-assisted grading, admissions, and tutoring under the EU AI Act. Several uses fall under Annex III (high-risk: education). See our AI Transparency, Risk Register, and DPIA.",
    points: [
      "Persistent disclosure of AI tutoring and synthetic lecture media (Art. 50).",
      "Right to meaningful explanation and human review of AI-assisted decisions (Art. 86) — use the in-app 'Request human review' control.",
      "Human-in-the-loop for every binding grade and admit/deny decision (Art. 14).",
      "Audit logs and risk register maintained internally (Art. 9, 12).",
    ],
    contact: "dpo@scrolluniversity.org",
  },
  {
    id: "colorado",
    flag: "🇺🇸",
    title: "Colorado — Colorado AI Act (SB 24-205)",
    badge: "Effective Feb 2026",
    summary: "Colorado residents interacting with AI in consequential decisions (including education) receive additional notice and appeal rights under the Colorado AI Act.",
    points: [
      "We disclose when AI is materially influencing an admissions, enrolment, or grading decision affecting you.",
      "You may request the right to correct any incorrect personal data we used and to appeal an adverse consequential decision to a human reviewer.",
      "Annual impact assessments for high-risk AI systems are on file with the Academic Standards Office.",
      "To exercise rights: submit a request through your account or contact our compliance team.",
    ],
    contact: "compliance@scrolluniversity.org",
  },
  {
    id: "india",
    flag: "🇮🇳",
    title: "India — Digital Personal Data Protection Act, 2023",
    badge: "In force",
    summary: "For Data Principals in India, ScrollUniversity processes personal data with consent or for legitimate uses (delivering the educational programme you signed up for).",
    points: [
      "You may withdraw consent at any time through your account settings.",
      "Right to access a summary of your processed data, right to correction/erasure, right to grievance redressal.",
      "Data Principal Grievance Officer: see contact below. Initial response within 15 days; escalation to the Data Protection Board of India if unresolved.",
      "If you are a minor (under 18), verifiable parental consent is required before AI tutoring is enabled.",
    ],
    contact: "grievance.india@scrolluniversity.org",
  },
  {
    id: "china",
    flag: "🇨🇳",
    title: "Mainland China — Generative AI Service Measures (生成式人工智能服务管理暂行办法)",
    badge: "Service availability limited",
    summary: "Generative AI services offered to users in mainland China require algorithm filing with the Cyberspace Administration of China (CAC) and content compliance. ScrollUniversity's generative AI tutoring is not currently filed for mainland China.",
    points: [
      "AI tutoring features may be unavailable or restricted for accounts identified as located in mainland China.",
      "Non-generative course content, reading, and assessments remain accessible.",
      "If you require AI tutoring in mainland China, contact us so we can plan the algorithm filing process.",
      "Cross-border transfer of personal information is handled per PIPL and the CAC Standard Contract where applicable.",
    ],
    contact: "compliance.cn@scrolluniversity.org",
  },
  {
    id: "uk",
    flag: "🇬🇧",
    title: "United Kingdom — Sectoral AI guidance + Age-Appropriate Design Code",
    badge: "In force",
    summary: "ScrollUniversity follows the UK's pro-innovation, sector-led AI approach (ICO + Department for Education guidance) and the ICO Age-Appropriate Design Code where minors are involved.",
    points: [
      "Same transparency and human-review rights as EU users.",
      "Profiling of under-18s is off by default; high-privacy defaults are applied.",
      "UK GDPR data subject rights honoured through your account settings.",
    ],
    contact: "uk.privacy@scrolluniversity.org",
  },
  {
    id: "brazil",
    flag: "🇧🇷",
    title: "Brazil — LGPD",
    badge: "In force",
    summary: "Processing of personal data of Brazilian Data Subjects follows the Lei Geral de Proteção de Dados (LGPD).",
    points: [
      "Lawful basis: execution of the educational contract and legitimate interest, with transparency.",
      "Rights of access, correction, anonymisation, portability, and revocation of consent.",
      "Encarregado (DPO) contact provided below.",
    ],
    contact: "lgpd@scrolluniversity.org",
  },
];

const RegionalAINotices = () => (
  <div className="min-h-screen bg-background">
    <Helmet>
      <title>Regional AI Notices — ScrollUniversity</title>
      <meta name="description" content="Locale-specific AI and data protection notices for learners worldwide." />
      <link rel="canonical" href="https://scrolluniversity.org/governance/regional-ai-notices" />
    </Helmet>
    <Header />
    <main className="max-w-5xl mx-auto px-4 py-16 space-y-10">
      <header className="space-y-3">
        <Badge variant="outline" className="gap-1.5"><Globe2 className="h-3 w-3" /> Regional AI &amp; Data Protection</Badge>
        <h1 className="text-4xl md:text-5xl font-serif">Regional AI Notices</h1>
        <p className="text-muted-foreground max-w-3xl leading-relaxed">
          ScrollUniversity is a global institution. AI and data protection laws differ by jurisdiction. This page summarises notices and rights specific to the regions where our learners reside, in addition to the global <a href="/ai-transparency" className="underline">AI Transparency</a>, <a href="/governance/ai-risk-register" className="underline">Risk Register</a>, and <a href="/governance/dpia" className="underline">DPIA</a> pages.
        </p>
        <p className="text-xs text-muted-foreground">Last updated: 24 June 2026.</p>
      </header>

      <div className="grid gap-4">
        {REGIONS.map((r) => (
          <Card key={r.id} id={r.id}>
            <CardHeader>
              <div className="flex items-start justify-between gap-3 flex-wrap">
                <CardTitle className="text-lg flex items-center gap-2">
                  <span aria-hidden className="text-2xl">{r.flag}</span> {r.title}
                </CardTitle>
                <Badge variant="secondary">{r.badge}</Badge>
              </div>
              <CardDescription>{r.summary}</CardDescription>
            </CardHeader>
            <CardContent className="text-sm space-y-3">
              <ul className="list-disc list-inside text-muted-foreground space-y-1">
                {r.points.map((p) => <li key={p}>{p}</li>)}
              </ul>
              <div className="text-xs"><span className="font-semibold">Contact: </span><a href={`mailto:${r.contact}`} className="underline">{r.contact}</a></div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardContent className="pt-6 text-xs text-muted-foreground space-y-1">
          <p>This page is maintained by ScrollUniversity. It does not replace legal advice. Where two regimes apply (e.g. an EU learner studying remotely from China), the stricter standard governs.</p>
        </CardContent>
      </Card>
    </main>
    <Footer />
  </div>
);

export default RegionalAINotices;
