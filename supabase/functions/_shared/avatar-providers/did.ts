// D-ID provider adapter — wraps existing direct calls behind the registry contract.
import type {
  AvatarProvider, CreateSessionInput, CreateSessionResult, ProviderHealth,
} from "./types.ts";

const CAPABILITIES = {
  realtimeVideo: true,
  realtimeAudio: true,
  interruptionSupport: false,
  multilingual: true,
  mobileOptimized: true,
  maxSessionMinutes: 30,
  supportsRecordedMode: false,
  supportsSemiLiveMode: true,
};

// Rough public-pricing reference for budget routing. Update when pricing changes.
const COST_PER_MIN_USD = 0.30;

export function createDidProvider(): AvatarProvider {
  const apiKey = Deno.env.get("DID_API_KEY");

  const auth = () => `Basic ${apiKey}`;

  return {
    kind: "did",
    capabilities: CAPABILITIES,
    estimatedCostPerMinuteUsd: COST_PER_MIN_USD,

    async getHealth(): Promise<ProviderHealth> {
      if (!apiKey) {
        return {
          kind: "did", healthy: false, reason: "AVATAR_PROVIDER_UNCONFIGURED",
          capabilities: CAPABILITIES, estimatedCostPerMinuteUsd: COST_PER_MIN_USD,
          checkedAt: new Date().toISOString(),
        };
      }
      try {
        const r = await fetch("https://api.d-id.com/credits", {
          headers: { Authorization: auth() },
        });
        if (r.status === 401) {
          return {
            kind: "did", healthy: false, reason: "AVATAR_PROVIDER_AUTH_FAILED",
            capabilities: CAPABILITIES, estimatedCostPerMinuteUsd: COST_PER_MIN_USD,
            checkedAt: new Date().toISOString(),
          };
        }
        if (r.status === 402) {
          return {
            kind: "did", healthy: false, reason: "AVATAR_PROVIDER_CREDITS_EXHAUSTED",
            capabilities: CAPABILITIES, estimatedCostPerMinuteUsd: COST_PER_MIN_USD,
            checkedAt: new Date().toISOString(),
          };
        }
        return {
          kind: "did", healthy: r.ok, reason: r.ok ? "OK" : `AVATAR_PROVIDER_UNREACHABLE_${r.status}`,
          capabilities: CAPABILITIES, estimatedCostPerMinuteUsd: COST_PER_MIN_USD,
          checkedAt: new Date().toISOString(),
        };
      } catch {
        return {
          kind: "did", healthy: false, reason: "AVATAR_PROVIDER_UNREACHABLE",
          capabilities: CAPABILITIES, estimatedCostPerMinuteUsd: COST_PER_MIN_USD,
          checkedAt: new Date().toISOString(),
        };
      }
    },

    async createSession(input: CreateSessionInput): Promise<CreateSessionResult> {
      if (!apiKey) {
        return { ok: false, fallback: true, providerKind: "did",
          reason: "AVATAR_PROVIDER_UNCONFIGURED", estimatedCostPerMinuteUsd: COST_PER_MIN_USD };
      }
      try {
        const r = await fetch("https://api.d-id.com/talks/streams", {
          method: "POST",
          headers: { Authorization: auth(), "Content-Type": "application/json" },
          body: JSON.stringify({
            source_url: input.avatarImageUrl || "https://d-id-public-bucket.s3.us-west-2.amazonaws.com/alice.jpg",
            driver_url: "bank://lively",
            config: { stitch: true, fluent: true },
          }),
        });
        if (!r.ok) {
          const reason =
            r.status === 402 ? "AVATAR_PROVIDER_CREDITS_EXHAUSTED" :
            r.status === 401 ? "AVATAR_PROVIDER_AUTH_FAILED" :
            `AVATAR_PROVIDER_UNAVAILABLE_${r.status}`;
          return { ok: false, fallback: true, providerKind: "did", reason,
            estimatedCostPerMinuteUsd: COST_PER_MIN_USD };
        }
        const data = await r.json();
        return {
          ok: true, providerKind: "did",
          stream_id: data.id, session_id: data.session_id,
          offer: data.offer, ice_servers: data.ice_servers,
          estimatedCostPerMinuteUsd: COST_PER_MIN_USD,
        };
      } catch (e) {
        console.error("D-ID createSession error", e);
        return { ok: false, fallback: true, providerKind: "did",
          reason: "AVATAR_PROVIDER_EXCEPTION", estimatedCostPerMinuteUsd: COST_PER_MIN_USD };
      }
    },

    async sendSdpAnswer(streamId, sessionId, answer) {
      if (!apiKey) return;
      const r = await fetch(`https://api.d-id.com/talks/streams/${streamId}/sdp`, {
        method: "POST",
        headers: { Authorization: auth(), "Content-Type": "application/json" },
        body: JSON.stringify({ session_id: sessionId, answer }),
      });
      if (!r.ok) {
        const detail = await r.text().catch(() => "");
        throw new Error(`D-ID SDP answer failed (${r.status})${detail ? `: ${detail}` : ""}`);
      }
    },

    async sendIceCandidate(streamId, sessionId, candidate) {
      if (!apiKey) return;
      const normalizedCandidate = candidate && typeof candidate === "object"
        ? {
            candidate: (candidate as Record<string, unknown>).candidate ?? null,
            sdpMid: (candidate as Record<string, unknown>).sdpMid ?? null,
            sdpMLineIndex: (candidate as Record<string, unknown>).sdpMLineIndex ?? null,
            usernameFragment: (candidate as Record<string, unknown>).usernameFragment ?? null,
          }
        : { candidate: candidate ?? null, sdpMid: null, sdpMLineIndex: null, usernameFragment: null };
      const r = await fetch(`https://api.d-id.com/talks/streams/${streamId}/ice`, {
        method: "POST",
        headers: { Authorization: auth(), "Content-Type": "application/json" },
        body: JSON.stringify({ session_id: sessionId, ...normalizedCandidate }),
      });
      if (!r.ok) {
        const detail = await r.text().catch(() => "");
        throw new Error(`D-ID ICE candidate failed (${r.status})${detail ? `: ${detail}` : ""}`);
      }
    },

    async speak(streamId, sessionId, text, voiceId) {
      if (!apiKey) return null;
      const r = await fetch(`https://api.d-id.com/talks/streams/${streamId}`, {
        method: "POST",
        headers: { Authorization: auth(), "Content-Type": "application/json" },
        body: JSON.stringify({
          session_id: sessionId,
          script: {
            type: "text",
            input: text.substring(0, 1500),
            provider: { type: "microsoft", voice_id: voiceId ?? "en-US-JennyNeural" },
          },
          config: { fluent: true },
        }),
      });
      return r.ok ? await r.json() : null;
    },

    async destroy(streamId, sessionId) {
      if (!apiKey) return;
      try {
        await fetch(`https://api.d-id.com/talks/streams/${streamId}`, {
          method: "DELETE",
          headers: { Authorization: auth(), "Content-Type": "application/json" },
          body: JSON.stringify({ session_id: sessionId }),
        });
      } catch (e) { console.error("D-ID destroy error", e); }
    },
  };
}
