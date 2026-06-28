// kpi-service — single source of truth for institutional KPIs.
// Returns a versioned envelope so dashboards remain stable across changes.
//
// Contract v1:
//   {
//     "version": "v1",
//     "generated_at": "...",
//     "scope": { "metric": "...", "params": {...}, "requester_role": "..." },
//     "metrics": {...}
//   }

// deno-lint-ignore-file no-explicit-any
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const KPI_CONTRACT_VERSION = "v1";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;

const corsHeaders: HeadersInit = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-correlation-id",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

// --- Metric catalog --------------------------------------------------
// Each entry maps a public metric key to a KPI view. Admin/superadmin
// can request any. Non-privileged callers can only request metrics that
// expose aggregate-only rows already permitted by the underlying view.
type MetricDef = {
  view: string;
  selectCols?: string;
  orderBy?: { column: string; ascending: boolean };
  limit?: number;
  requiresAdmin?: boolean;
};

const METRICS: Record<string, MetricDef> = {
  enrollment:              { view: "vw_kpi_enrollment",              orderBy: { column: "day", ascending: false }, limit: 180 },
  retention:               { view: "vw_kpi_retention",               orderBy: { column: "month", ascending: false }, limit: 24 },
  course_completion:       { view: "vw_kpi_course_completion",       orderBy: { column: "day", ascending: false }, limit: 90 },
  graduation_pipeline:     { view: "vw_kpi_graduation_pipeline" },
  faculty_utilization:     { view: "vw_kpi_faculty_utilization",     orderBy: { column: "week", ascending: false }, limit: 52 },
  course_fill:             { view: "vw_kpi_course_fill",             limit: 500 },
  outcome_mastery:         { view: "vw_kpi_outcome_mastery",         orderBy: { column: "week", ascending: false }, limit: 52 },
  accreditation_readiness: { view: "vw_kpi_accreditation_readiness" },
  financial_health:        { view: "vw_kpi_financial_health",        orderBy: { column: "month", ascending: false }, limit: 24, requiresAdmin: true },
  system_health:           { view: "vw_kpi_system_health",           orderBy: { column: "hour", ascending: false }, limit: 96, requiresAdmin: true },
  ai_review_backlog:       { view: "vw_kpi_ai_review_backlog",       requiresAdmin: true },
};

async function logOp(
  correlationId: string,
  event: string,
  severity: "info" | "warn" | "error",
  durationMs: number,
  httpStatus: number,
  message: string,
  context: Record<string, unknown>,
) {
  try {
    const admin = createClient(SUPABASE_URL, SERVICE_KEY);
    await admin.from("ops_log").insert({
      correlation_id: correlationId,
      source: "kpi-service",
      event,
      severity,
      duration_ms: durationMs,
      http_status: httpStatus,
      message,
      context,
    });
  } catch (_) {
    // never throw from telemetry
  }
}

async function getRequesterRole(authHeader: string | null): Promise<{
  userId: string | null;
  isAdmin: boolean;
}> {
  if (!authHeader) return { userId: null, isAdmin: false };
  try {
    const client = createClient(SUPABASE_URL, ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData } = await client.auth.getUser();
    const userId = userData?.user?.id ?? null;
    if (!userId) return { userId: null, isAdmin: false };

    const admin = createClient(SUPABASE_URL, SERVICE_KEY);
    const { data: roles } = await admin
      .from("user_roles")
      .select("role")
      .eq("user_id", userId);
    const roleSet = new Set((roles ?? []).map((r: any) => r.role));
    return { userId, isAdmin: roleSet.has("admin") || roleSet.has("superadmin") };
  } catch {
    return { userId: null, isAdmin: false };
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const start = Date.now();
  const correlationId =
    req.headers.get("x-correlation-id") ?? crypto.randomUUID();

  try {
    const url = new URL(req.url);
    let metricKey: string | null = url.searchParams.get("metric");
    let params: Record<string, unknown> = {};

    if (req.method === "POST") {
      try {
        const body = await req.json();
        metricKey = body.metric ?? metricKey;
        params = body.params ?? {};
      } catch {/* allow empty body */}
    }

    if (!metricKey || !(metricKey in METRICS)) {
      const status = 400;
      const payload = {
        version: KPI_CONTRACT_VERSION,
        generated_at: new Date().toISOString(),
        error: {
          code: "unknown_metric",
          message: `metric must be one of: ${Object.keys(METRICS).join(", ")}`,
        },
      };
      await logOp(correlationId, "request.invalid", "warn", Date.now() - start, status, "unknown_metric", { metricKey });
      return new Response(JSON.stringify(payload), {
        status,
        headers: { ...corsHeaders, "Content-Type": "application/json", "x-correlation-id": correlationId },
      });
    }

    const def = METRICS[metricKey];
    const { userId, isAdmin } = await getRequesterRole(req.headers.get("Authorization"));

    if (def.requiresAdmin && !isAdmin) {
      const status = 403;
      const payload = {
        version: KPI_CONTRACT_VERSION,
        generated_at: new Date().toISOString(),
        error: { code: "forbidden", message: "Admin role required for this metric" },
      };
      await logOp(correlationId, "request.forbidden", "warn", Date.now() - start, status, "forbidden_metric", { metricKey, userId });
      return new Response(JSON.stringify(payload), {
        status,
        headers: { ...corsHeaders, "Content-Type": "application/json", "x-correlation-id": correlationId },
      });
    }

    // Read via service role — views are aggregate-only, no PII.
    const admin = createClient(SUPABASE_URL, SERVICE_KEY);
    let q = admin.from(def.view).select(def.selectCols ?? "*");
    if (def.orderBy) q = q.order(def.orderBy.column, { ascending: def.orderBy.ascending });
    if (def.limit) q = q.limit(def.limit);

    const { data, error } = await q;
    if (error) throw error;

    const envelope = {
      version: KPI_CONTRACT_VERSION,
      generated_at: new Date().toISOString(),
      scope: {
        metric: metricKey,
        params,
        requester_role: isAdmin ? "admin" : userId ? "authenticated" : "anonymous",
      },
      metrics: {
        rows: data ?? [],
        row_count: (data ?? []).length,
      },
    };

    await logOp(correlationId, "request.success", "info", Date.now() - start, 200, "ok", {
      metricKey,
      row_count: (data ?? []).length,
    });

    return new Response(JSON.stringify(envelope), {
      status: 200,
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json",
        "x-correlation-id": correlationId,
        "x-kpi-contract-version": KPI_CONTRACT_VERSION,
      },
    });
  } catch (err) {
    const status = 500;
    const message = err instanceof Error ? err.message : "unknown error";
    await logOp(correlationId, "request.error", "error", Date.now() - start, status, message, {});
    return new Response(
      JSON.stringify({
        version: KPI_CONTRACT_VERSION,
        generated_at: new Date().toISOString(),
        error: { code: "internal_error", message },
      }),
      {
        status,
        headers: { ...corsHeaders, "Content-Type": "application/json", "x-correlation-id": correlationId },
      },
    );
  }
});
