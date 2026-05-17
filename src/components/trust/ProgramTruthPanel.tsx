import { useProgramPublicStatus } from "@/hooks/useProgramPublicStatus";
import {
  TierChip,
  VerifiedDimensionChips,
  TrustScorePill,
  DisclosureList,
} from "./TruthChips";
import { Skeleton } from "@/components/ui/skeleton";

interface Props {
  programId: string;
  compact?: boolean;
  className?: string;
}

/**
 * Public-facing institutional truth panel for a program.
 * Fail-closed: if the status query fails or returns nothing, the panel renders
 * an honest "Unverified" state instead of implying capability.
 */
export function ProgramTruthPanel({ programId, compact, className }: Props) {
  const { data, isLoading } = useProgramPublicStatus(programId);

  if (isLoading) {
    return <Skeleton className={`h-12 w-full ${className ?? ""}`} />;
  }

  if (!data) {
    return (
      <div className={`text-xs italic text-muted-foreground ${className ?? ""}`}>
        Status not yet verified.
      </div>
    );
  }

  return (
    <div className={`space-y-2 ${className ?? ""}`}>
      <div className="flex flex-wrap items-center gap-2">
        <TierChip tier={data.tier} />
        <TrustScorePill score={data.trust_score} />
      </div>
      <VerifiedDimensionChips verified={data.verified} compact={compact} />
      {!compact && <DisclosureList items={data.disclosures} />}
    </div>
  );
}

/**
 * Render-gate helper. Children render only when the program is publicly
 * enrollable per the institutional truth engine. Otherwise renders a
 * disclosure instead of an Apply/Enroll affordance.
 */
export function EnrollmentGate({
  programId,
  children,
}: {
  programId: string;
  children: React.ReactNode;
}) {
  const { data, isLoading } = useProgramPublicStatus(programId);
  if (isLoading) return <Skeleton className="h-9 w-full" />;
  if (!data?.enrollable) {
    return (
      <div className="rounded-md border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-xs text-amber-700 dark:text-amber-300">
        Enrollment is not open for this program yet — institutional verification incomplete.
      </div>
    );
  }
  return <>{children}</>;
}
