import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  ShieldCheck,
  Clock,
  FlaskConical,
  Sparkles,
  Lock,
  AlertTriangle,
  XCircle,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";

export type ClaimVerificationState =
  | "verified"
  | "under_review"
  | "pilot"
  | "experimental"
  | "internal_only"
  | "not_yet_verified"
  | "expired"
  | "retracted";

interface Props {
  claimId?: string;
  state: ClaimVerificationState;
  label?: string;
  statement?: string;
  reviewerRole?: string | null;
  verifiedAt?: string | null;
  expiresAt?: string | null;
  compact?: boolean;
}

const config: Record<
  ClaimVerificationState,
  { label: string; icon: any; className: string; tone: string }
> = {
  verified: {
    label: "Verified",
    icon: ShieldCheck,
    className: "bg-emerald-600 hover:bg-emerald-600 text-white",
    tone: "Backed by reviewed, attributed, non-expired evidence.",
  },
  under_review: {
    label: "Under Review",
    icon: Clock,
    className: "bg-amber-500 hover:bg-amber-500 text-white",
    tone: "A reviewer is currently assessing the supporting evidence.",
  },
  pilot: {
    label: "Pilot",
    icon: FlaskConical,
    className: "border-blue-500 text-blue-700 bg-transparent",
    tone: "Operating as a limited pilot; not yet at full institutional scale.",
  },
  experimental: {
    label: "Experimental",
    icon: FlaskConical,
    className: "border-purple-500 text-purple-700 bg-transparent",
    tone: "Under active academic development; not accreditation-ready.",
  },
  internal_only: {
    label: "Internal Only",
    icon: Lock,
    className: "border-amber-600 text-amber-700 bg-transparent",
    tone: "Internal honorific or recognition. Not an external credential.",
  },
  not_yet_verified: {
    label: "Not Yet Verified",
    icon: AlertTriangle,
    className: "border-muted-foreground text-muted-foreground bg-transparent",
    tone: "No reviewed evidence has been attached to this claim yet.",
  },
  expired: {
    label: "Expired",
    icon: XCircle,
    className: "border-destructive text-destructive bg-transparent",
    tone: "Verifying evidence has expired and must be renewed.",
  },
  retracted: {
    label: "Retracted",
    icon: XCircle,
    className: "border-destructive text-destructive bg-transparent",
    tone: "Claim was withdrawn by governance.",
  },
};

export function VerifiedClaimBadge({
  claimId,
  state,
  label,
  statement,
  reviewerRole,
  verifiedAt,
  expiresAt,
  compact,
}: Props) {
  const [open, setOpen] = useState(false);
  const cfg = config[state] ?? config.not_yet_verified;
  const Icon = cfg.icon;

  const { data: evidence } = useQuery({
    queryKey: ["claim-evidence", claimId],
    enabled: !!claimId && open,
    queryFn: async () => {
      const { data } = await supabase
        .from("claim_evidence_links" as any)
        .select("*")
        .eq("claim_id", claimId!)
        .order("created_at", { ascending: false });
      return (data ?? []) as any[];
    },
  });

  const isOutline = cfg.className.includes("border-");

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button
          type="button"
          className="inline-flex items-center"
          aria-label={`${cfg.label}: ${cfg.tone}`}
        >
          <Badge
            variant={isOutline ? "outline" : "default"}
            className={`gap-1 cursor-pointer ${cfg.className}`}
          >
            <Icon className="w-3 h-3" />
            {compact ? cfg.label : label ? `${cfg.label} · ${label}` : cfg.label}
          </Badge>
        </button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Icon className="w-4 h-4" /> {cfg.label}
            {label && <span className="text-muted-foreground">· {label}</span>}
          </DialogTitle>
          <DialogDescription>{cfg.tone}</DialogDescription>
        </DialogHeader>
        {statement && (
          <div className="text-sm border rounded-md p-3 bg-muted/40">
            <p className="font-medium mb-1">Claim</p>
            <p className="text-muted-foreground">{statement}</p>
          </div>
        )}
        <div className="grid grid-cols-2 gap-3 text-xs">
          <div>
            <p className="text-muted-foreground">Reviewer role</p>
            <p className="font-medium">{reviewerRole ?? "—"}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Verified at</p>
            <p className="font-medium">
              {verifiedAt ? new Date(verifiedAt).toLocaleDateString() : "—"}
            </p>
          </div>
          <div>
            <p className="text-muted-foreground">Expires</p>
            <p className="font-medium">
              {expiresAt ? new Date(expiresAt).toLocaleDateString() : "No expiry"}
            </p>
          </div>
          <div>
            <p className="text-muted-foreground">Evidence items</p>
            <p className="font-medium">{evidence?.length ?? 0}</p>
          </div>
        </div>
        {evidence && evidence.length > 0 && (
          <div className="space-y-2 max-h-48 overflow-y-auto">
            <p className="text-xs font-semibold uppercase tracking-wider">
              Supporting evidence
            </p>
            {evidence.map((e) => (
              <div key={e.id} className="text-xs border rounded p-2">
                <div className="flex justify-between">
                  <span className="font-medium">{e.evidence_table}</span>
                  <span
                    className={
                      e.evidence_verified
                        ? "text-emerald-600"
                        : "text-muted-foreground"
                    }
                  >
                    {e.evidence_verified ? "verified" : "pending"}
                  </span>
                </div>
                {e.evidence_summary && (
                  <p className="text-muted-foreground mt-1">
                    {e.evidence_summary}
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
        <p className="text-[10px] text-muted-foreground italic pt-2 border-t">
          This badge reflects governance records. It is not marketing language.
        </p>
      </DialogContent>
    </Dialog>
  );
}

export default VerifiedClaimBadge;
