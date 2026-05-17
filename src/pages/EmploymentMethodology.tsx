import { Helmet } from "react-helmet";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function EmploymentMethodology() {
  return (
    <div className="container mx-auto max-w-3xl py-10 px-4">
      <Helmet>
        <title>Employment Outcomes Methodology · Scroll University</title>
        <meta
          name="description"
          content="How Scroll University defines, collects, verifies, and reports employment outcomes."
        />
        <link rel="canonical" href="/employment-methodology" />
      </Helmet>
      <h1 className="font-serif text-3xl text-primary mb-4">
        Employment Outcomes Methodology
      </h1>
      <p className="text-muted-foreground mb-6">
        We publish this methodology so that students, accreditors, and the public
        can independently evaluate every employment statistic we report.
      </p>

      <div className="space-y-4">
        <Section title="Eligible population">
          Only graduates who have completed all program requirements and whose
          graduation has been verified by the Registrar are eligible to appear in
          outcome metrics.
        </Section>
        <Section title="Verification states">
          <ul className="list-disc pl-5 space-y-1 text-sm">
            <li><strong>self_reported</strong> — submitted by the graduate, not yet verified. Never appears in public statistics.</li>
            <li><strong>partially_verified</strong> — one piece of corroborating evidence reviewed (e.g. dated offer letter or public profile).</li>
            <li><strong>employer_verified</strong> — confirmed directly with the employer by an attributed Registrar staff member.</li>
            <li><strong>expired</strong> — verification past its recheck date and not yet renewed.</li>
            <li><strong>rejected</strong> — could not be substantiated.</li>
          </ul>
        </Section>
        <Section title="Minimum sample size">
          We do not publish cohort statistics unless at least 5 graduates have
          reached <em>employer_verified</em> or <em>partially_verified</em> status.
          Below that threshold the cohort displays "Not yet verified" — never an
          estimate.
        </Section>
        <Section title="What we do not do">
          <ul className="list-disc pl-5 space-y-1 text-sm">
            <li>We never extrapolate from a small cohort to a percentage.</li>
            <li>We never merge self-reported and verified placements in a single rate.</li>
            <li>We never imply causation from individual placements.</li>
            <li>We never round verified-sample-size percentages above the underlying precision.</li>
          </ul>
        </Section>
        <Section title="Reporting window">
          Each metric is bound to a reporting window (start and end dates). Outcomes
          observed outside the window are not included in that report.
        </Section>
        <Section title="Recheck and expiration">
          Verified placements carry a recheck date. After expiration, they no
          longer count toward published metrics until re-verified.
        </Section>
        <Section title="Excluded cohorts">
          Pilot, experimental, and internal-only programs are excluded from public
          employment metrics by default, regardless of placement counts.
        </Section>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">{title}</CardTitle>
      </CardHeader>
      <CardContent className="text-sm text-muted-foreground">{children}</CardContent>
    </Card>
  );
}
