/**
 * AIAvatarConsentDialog — one-time per account/browser acknowledgement that
 * the lecturer is a synthetic AI avatar (EU AI Act Art. 50 + China GenAI labelling).
 * Logged to `ai_avatar_consents` so we have an auditable record.
 */
import { useEffect, useState } from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { supabase } from "@/integrations/supabase/client";
import { Sparkles } from "lucide-react";

const STORAGE_KEY = "scrolluni.ai_avatar_consent.v1";

export function hasGivenAvatarConsent(): boolean {
  try {
    return localStorage.getItem(STORAGE_KEY) === "1";
  } catch {
    return false;
  }
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAccept: () => void;
  tutorName: string;
}

export function AIAvatarConsentDialog({ open, onOpenChange, onAccept, tutorName }: Props) {
  const [ack, setAck] = useState(false);

  useEffect(() => { if (!open) setAck(false); }, [open]);

  const handleAccept = async () => {
    try { localStorage.setItem(STORAGE_KEY, "1"); } catch { /* ignore */ }
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase.from("ai_avatar_consents").insert({
          user_id: user.id,
          tutor_name: tutorName,
          user_agent: typeof navigator !== "undefined" ? navigator.userAgent.slice(0, 500) : null,
        });
      }
    } catch (err) {
      console.warn("avatar consent log failed", err);
    }
    onOpenChange(false);
    onAccept();
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            You are about to interact with an AI avatar
          </AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-3 text-sm">
              <p>
                <strong>{tutorName}</strong> is a synthetic AI lecturer — not a human
                professor. The video, voice and answers are generated in real time
                by AI models (lip-sync, speech and language models from D-ID,
                ElevenLabs and DeepSeek/Gemini).
              </p>
              <ul className="list-disc pl-5 space-y-1 text-muted-foreground">
                <li>Audio/video of this session may be recorded for transcripts and learning analytics.</li>
                <li>AI can be wrong. Spiritually-sensitive or graded decisions are reviewed by human faculty.</li>
                <li>You can request a human re-evaluation of any AI-assisted decision at any time.</li>
              </ul>
              <label className="flex items-start gap-2 pt-2 cursor-pointer">
                <Checkbox checked={ack} onCheckedChange={(v) => setAck(Boolean(v))} className="mt-0.5" />
                <span>
                  I understand this is an AI-generated avatar and I consent to processing
                  of session audio/transcripts as described in the{" "}
                  <a href="/ai-transparency" className="underline" target="_blank" rel="noreferrer">AI Transparency Notice</a>.
                </span>
              </label>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction disabled={!ack} onClick={handleAccept}>
            Acknowledge & continue
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
