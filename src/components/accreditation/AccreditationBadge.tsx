import { Badge } from "@/components/ui/badge";
import { ShieldCheck, AlertTriangle, FlaskConical, Crown } from "lucide-react";

export type AccreditationStatus =
  | "accreditation_ready"
  | "needs_rework"
  | "experimental"
  | "internal_honorific";

interface Props {
  status?: AccreditationStatus | string | null;
  showNotice?: boolean;
  className?: string;
}

const config = {
  accreditation_ready: {
    label: "Accreditation-Ready",
    icon: ShieldCheck,
    variant: "default" as const,
    notice: null,
  },
  needs_rework: {
    label: "Under Academic Development",
    icon: AlertTriangle,
    variant: "secondary" as const,
    notice:
      "This program is under academic development and not yet accreditation-ready.",
  },
  experimental: {
    label: "Experimental",
    icon: FlaskConical,
    variant: "outline" as const,
    notice:
      "This program is experimental and not yet accreditation-ready.",
  },
  internal_honorific: {
    label: "Internal Honorific",
    icon: Crown,
    variant: "outline" as const,
    notice:
      "This is an internal honorific recognition, not an external degree.",
  },
};

export function AccreditationBadge({ status, showNotice, className }: Props) {
  const key = (status || "experimental") as keyof typeof config;
  const c = config[key] ?? config.experimental;
  const Icon = c.icon;
  return (
    <div className={className}>
      <Badge variant={c.variant} className="gap-1">
        <Icon className="h-3 w-3" />
        {c.label}
      </Badge>
      {showNotice && c.notice && (
        <p className="mt-2 text-xs text-muted-foreground italic">{c.notice}</p>
      )}
    </div>
  );
}
