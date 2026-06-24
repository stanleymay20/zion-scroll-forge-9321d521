import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Scale, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { getUserFriendlyError } from "@/lib/errors";

interface Props {
  decisionType: "grade" | "admission" | "hold" | "rubric_score" | "integrity_flag" | "other";
  decisionReference?: string;
  aiSystem?: string;
  aiOutput?: Record<string, unknown>;
  triggerLabel?: string;
  variant?: "default" | "outline" | "ghost" | "link";
  size?: "default" | "sm" | "lg" | "icon";
}

export const RequestHumanReviewDialog = ({
  decisionType,
  decisionReference,
  aiSystem,
  aiOutput,
  triggerLabel = "Request human review",
  variant = "outline",
  size = "sm",
}: Props) => {
  const [open, setOpen] = useState(false);
  const [explanation, setExplanation] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const submit = async () => {
    if (explanation.trim().length < 10) {
      toast({ title: "Please describe your concern", description: "At least 10 characters.", variant: "destructive" });
      return;
    }
    setSubmitting(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("You must be signed in to request review.");
      const { error } = await (supabase as any).from("human_review_requests").insert({
        user_id: user.id,
        decision_type: decisionType,
        decision_reference: decisionReference ?? null,
        ai_system: aiSystem ?? null,
        ai_output: aiOutput ?? {},
        user_explanation: explanation.trim(),
      });
      if (error) throw error;
      toast({
        title: "Review request submitted",
        description: "A faculty reviewer will respond. You can track this under your account.",
      });
      setExplanation("");
      setOpen(false);
    } catch (e) {
      toast({ title: "Could not submit", description: getUserFriendlyError(e), variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant={variant} size={size} className="gap-2">
          <Scale className="h-4 w-4" />
          {triggerLabel}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Request human review of an AI decision</DialogTitle>
          <DialogDescription>
            Under the EU AI Act (Article 86), you have the right to a meaningful explanation and human review of decisions made or assisted by AI. A faculty reviewer will respond.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3 py-2">
          <div className="text-xs text-muted-foreground space-y-0.5">
            <div><span className="font-medium">Decision type:</span> {decisionType}</div>
            {aiSystem && <div><span className="font-medium">AI system:</span> {aiSystem}</div>}
            {decisionReference && <div><span className="font-medium">Reference:</span> {decisionReference}</div>}
          </div>
          <div className="space-y-2">
            <Label htmlFor="explanation">Why do you want this reviewed?</Label>
            <Textarea
              id="explanation"
              value={explanation}
              onChange={(e) => setExplanation(e.target.value)}
              rows={5}
              placeholder="Describe what you believe the AI got wrong, missing context, or what outcome you expected."
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)} disabled={submitting}>Cancel</Button>
          <Button onClick={submit} disabled={submitting}>
            {submitting && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
            Submit request
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
