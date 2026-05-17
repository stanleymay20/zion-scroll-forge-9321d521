import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import {
  ShieldCheck,
  FlaskConical,
  Crown,
  Sparkles,
  Hammer,
  Archive,
  HelpCircle,
  GraduationCap,
  CheckCircle2,
  AlertTriangle,
} from "lucide-react";
import type { ProgramPublicStatus, ProgramTier } from "@/hooks/useProgramPublicStatus";

const tierConfig: Record<
  ProgramTier,
  { label: string; tone: string; icon: any; help: string }
> = {
  accreditation_track: {
    label: "Accreditation Track",
    tone: "bg-emerald-600 hover:bg-emerald-600 text-white",
    icon: ShieldCheck,
    help: "Meets the institutional baseline for external accreditation review.",
  },
  pilot: {
    label: "Pilot",
    tone: "bg-amber-500/15 text-amber-700 border border-amber-500/40",
    icon: Hammer,
    help: "Pilot curriculum — not yet open for external enrollment.",
  },
  experimental: {
    label: "Experimental",
    tone: "bg-purple-500/15 text-purple-700 border border-purple-500/40",
    icon: FlaskConical,
    help: "Experimental program — not accreditation-ready.",
  },
  internal_distinction: {
    label: "Internal Distinction",
    tone: "bg-yellow-500/15 text-yellow-700 border border-yellow-500/40",
    icon: Crown,
    help: "Internal honorific recognition, not an external degree.",
  },
  research_innovation: {
    label: "Research Innovation",
    tone: "bg-sky-500/15 text-sky-700 border border-sky-500/40",
    icon: Sparkles,
    help: "Research/innovation track — distinct from accredited offerings.",
  },
  curriculum_pending: {
    label: "Curriculum Pending",
    tone: "bg-muted text-muted-foreground border",
    icon: HelpCircle,
    help: "This program is currently under development.",
  },
  archived: {
    label: "Archived",
    tone: "bg-muted text-muted-foreground border line-through",
    icon: Archive,
    help: "This program has been archived.",
  },
  unknown: {
    label: "Unverified",
    tone: "bg-muted text-muted-foreground border",
    icon: HelpCircle,
    help: "Status not yet computed.",
  },
};

export function TierChip({ tier }: { tier: ProgramTier }) {
  const c = tierConfig[tier] ?? tierConfig.unknown;
  const Icon = c.icon;
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${c.tone}`}>
            <Icon className="h-3 w-3" />
            {c.label}
          </span>
        </TooltipTrigger>
        <TooltipContent className="max-w-xs text-xs">{c.help}</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

const dimensionLabels: Record<keyof ProgramPublicStatus["verified"], string> = {
  accreditation: "Accreditation",
  curriculum: "Curriculum",
  faculty: "Faculty",
  outcomes: "Outcomes",
  practicum: "Practicum",
  ai_tutor: "AI Tutor",
  thesis: "Thesis",
};

export function VerifiedDimensionChips({
  verified,
  compact = false,
}: {
  verified: ProgramPublicStatus["verified"];
  compact?: boolean;
}) {
  const entries = Object.entries(verified) as [
    keyof ProgramPublicStatus["verified"],
    boolean,
  ][];
  return (
    <div className="flex flex-wrap gap-1.5">
      {entries.map(([k, v]) =>
        v ? (
          <Badge
            key={k}
            variant="outline"
            className="border-emerald-500/40 text-emerald-700 gap-1"
          >
            <CheckCircle2 className="h-3 w-3" /> Verified {dimensionLabels[k]}
          </Badge>
        ) : compact ? null : (
          <Badge key={k} variant="outline" className="text-muted-foreground gap-1">
            <AlertTriangle className="h-3 w-3" /> {dimensionLabels[k]} not yet verified
          </Badge>
        )
      )}
    </div>
  );
}

export function TrustScorePill({ score }: { score: number }) {
  const tone =
    score >= 80
      ? "bg-emerald-600 text-white"
      : score >= 50
      ? "bg-amber-500 text-white"
      : "bg-muted text-muted-foreground border";
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold ${tone}`}>
      <GraduationCap className="h-3 w-3" /> Trust {score}/100
    </span>
  );
}

export function DisclosureList({ items }: { items: string[] }) {
  if (!items?.length) return null;
  return (
    <ul className="mt-2 space-y-1 text-xs italic text-muted-foreground">
      {items.map((d, i) => (
        <li key={i} className="flex items-start gap-1">
          <AlertTriangle className="mt-0.5 h-3 w-3 shrink-0" />
          <span>{d}</span>
        </li>
      ))}
    </ul>
  );
}
