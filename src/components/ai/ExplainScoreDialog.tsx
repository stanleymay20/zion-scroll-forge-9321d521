import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Card, CardContent } from "@/components/ui/card";
import { Sparkles } from "lucide-react";
import { RequestHumanReviewDialog } from "./RequestHumanReviewDialog";

interface ScoreFactor {
  label: string;
  detail: string;
}

interface Props {
  score: number;
  threshold?: number;
  rubric?: ScoreFactor[];
  aiSystem?: string;
  decisionReference?: string;
  decisionType?: "grade" | "rubric_score" | "integrity_flag";
}

export const ExplainScoreDialog = ({
  score,
  threshold = 70,
  rubric = [],
  aiSystem = "gpt-auto-grader",
  decisionReference,
  decisionType = "grade",
}: Props) => {
  const [open, setOpen] = useState(false);
  const passed = score >= threshold;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Sparkles className="h-4 w-4 text-accent" />
          Why this score?
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Explanation of your AI-assisted score</DialogTitle>
          <DialogDescription>
            Under the EU AI Act (Art. 86), you have the right to a meaningful explanation of any AI-assisted decision affecting you.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2 text-sm">
          <Card>
            <CardContent className="pt-4 space-y-1">
              <div className="text-xs text-muted-foreground uppercase tracking-wider">Result</div>
              <div className="text-2xl font-serif">{score}% — {passed ? "Pass" : "Below threshold"}</div>
              <div className="text-xs text-muted-foreground">Passing threshold: {threshold}%</div>
            </CardContent>
          </Card>

          <div>
            <div className="font-semibold mb-1">How the score was calculated</div>
            <p className="text-muted-foreground leading-relaxed">
              Your responses were compared against the published answer key for objective questions. Open-ended responses (if any) were scored by {aiSystem} against the course rubric and reviewed for consistency before being recorded.
            </p>
          </div>

          {rubric.length > 0 && (
            <div className="space-y-2">
              <div className="font-semibold">Rubric factors</div>
              <ul className="space-y-1.5">
                {rubric.map((f) => (
                  <li key={f.label} className="text-xs">
                    <span className="font-medium">{f.label}: </span>
                    <span className="text-muted-foreground">{f.detail}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div>
            <div className="font-semibold mb-1">Human oversight</div>
            <p className="text-muted-foreground leading-relaxed">
              Faculty review every AI-assisted score above the override threshold and may adjust the recorded grade. You can contest this result and request human re-evaluation below.
            </p>
          </div>
        </div>
        <div className="flex justify-between items-center gap-2 pt-2">
          <a href="/ai-transparency" className="text-xs underline text-muted-foreground">AI Transparency</a>
          <RequestHumanReviewDialog
            decisionType={decisionType}
            decisionReference={decisionReference}
            aiSystem={aiSystem}
            aiOutput={{ score, threshold, passed }}
            triggerLabel="Request human review"
          />
        </div>
      </DialogContent>
    </Dialog>
  );
};
