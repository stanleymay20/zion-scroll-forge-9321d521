// Provider registry + capability-aware orchestrator.
// Selection order honours:
//   1) lecture mode (recorded_ai/semi_live can accept slower providers)
//   2) budget ceiling
//   3) capability match (mobile, multilingual)
//   4) provider health (only healthy providers are returned)
import type {
  AvatarProvider, CreateSessionInput, CreateSessionResult, ProviderHealth,
} from "./types.ts";
import { createDidProvider } from "./did.ts";
import {
  createTavusProvider, createHeygenProvider, createSovereignMuseTalkProvider,
  createVoiceOnlyProvider, createTextOnlyProvider,
} from "./stubs.ts";

// PRIMARY PROVIDER POLICY (current phase):
//   D-ID is the production primary while the sovereign MuseTalk renderer is
//   built and validated in the background. Sovereign is kept in the registry
//   for health probing + shadow telemetry but is NOT selected first.
//   Flip SOVEREIGN_PRIMARY=true once the GPU worker is ready to take over.
export function buildRegistry(): AvatarProvider[] {
  const sovereignPrimary = (Deno.env.get("SOVEREIGN_PRIMARY") ?? "false").toLowerCase() === "true";
  const did = createDidProvider();
  const sovereign = createSovereignMuseTalkProvider();
  const ordered = sovereignPrimary ? [sovereign, did] : [did, sovereign];
  return [
    ...ordered,
    createTavusProvider(),
    createHeygenProvider(),
    createVoiceOnlyProvider(),
    createTextOnlyProvider(),
  ];
}

// Shadow probe: returns sovereign health without affecting selection.
// Used by ai-avatar-stream to log background-readiness telemetry per session.
export async function probeSovereign(): Promise<ProviderHealth> {
  return await createSovereignMuseTalkProvider().getHealth();
}

export async function healthAll(): Promise<ProviderHealth[]> {
  const reg = buildRegistry();
  return await Promise.all(reg.map((p) => p.getHealth()));
}

export interface OrchestratedSession extends CreateSessionResult {
  attempts: Array<{ kind: string; ok: boolean; reason?: string }>;
  provider: AvatarProvider;
}

export async function orchestrateCreate(input: CreateSessionInput): Promise<OrchestratedSession> {
  const reg = buildRegistry();
  const attempts: Array<{ kind: string; ok: boolean; reason?: string }> = [];

  for (const p of reg) {
    // Capability gates
    if (input.isMobile && !p.capabilities.mobileOptimized && p.capabilities.realtimeVideo) {
      attempts.push({ kind: p.kind, ok: false, reason: "MOBILE_INCOMPATIBLE" });
      continue;
    }
    if (input.budgetCeilingUsd !== undefined &&
        p.estimatedCostPerMinuteUsd > input.budgetCeilingUsd &&
        p.capabilities.realtimeVideo) {
      attempts.push({ kind: p.kind, ok: false, reason: "BUDGET_EXCEEDED" });
      continue;
    }
    if (input.lectureMode === "recorded_ai" && !p.capabilities.supportsRecordedMode) {
      attempts.push({ kind: p.kind, ok: false, reason: "RECORDED_MODE_UNSUPPORTED" });
      continue;
    }
    if (input.lectureMode === "semi_live" && !p.capabilities.supportsSemiLiveMode) {
      attempts.push({ kind: p.kind, ok: false, reason: "SEMI_LIVE_UNSUPPORTED" });
      continue;
    }

    const res = await p.createSession(input);
    attempts.push({ kind: p.kind, ok: res.ok, reason: res.reason });
    if (res.ok) {
      return { ...res, attempts, provider: p };
    }
  }

  // Should never reach — text-only always succeeds if LOVABLE_API_KEY present.
  const fallback = reg[reg.length - 1];
  const res = await fallback.createSession(input);
  return { ...res, attempts, provider: fallback };
}

export function providerByKind(kind: string): AvatarProvider | null {
  return buildRegistry().find((p) => p.kind === kind) ?? null;
}
