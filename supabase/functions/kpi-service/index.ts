// kpi-service — single source of truth for institutional KPIs.
// Returns a versioned envelope so dashboards remain stable across changes.
//
// Launch authority boundary:
//   - every request must carry a valid Supabase user session;
//   - callers must hold an active faculty/admin/superadmin role according to
//     the canonical has_role predicate;
//   - sensitive financial/system/AI-review metrics remain admin-only.

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
  faculty_enrollment_trends: { view: "vw_kpi_faculty_enrollment_trends", orderBy: { column: "week", ascending: false }, limit: 26 },
  faculty_performance:       { view: "vw_kpi_faculty_performance",       limit: 1 },
  faculty_ai_tutor_usage:    { view: "vw_kpi_faculty_ai_tutor_usage",    orderBy: { column: "week", ascending: false }, limit: 26 },
};

type RequesterAccess = {
  userId: string | null;
  isFaculty: boolean;
  isAdmin: boolean;
  roleLabel: "anonymous" | "authenticated" | "faculty" | "admin";
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
    // Telemetry must never change the request outcome.
  }
}

async function getRequesterAccess(authHeader: string | null): Promise<RequesterAccess> {
  if (!authHeader) {
    return { userId: null, isFaculty: false, isAdmin: false, roleLabel: "anonymous" };
  }

  try {
    const client = createClient(SUPABASE_URL, ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const { data: userData, error: userError } = await client.auth.getUser();
    const userId = userData?.user?.id ?? null;
    if (userError || !userId) {
      return { userId: null, isFaculty: false, isAdmin: false, roleLabel: "anonymous" };
    }

    const [facultyResult, adminResult, superadminResult] = await Promise.all([
      client.rpc("has_role", { _user_id: userId, _role: "faculty" }),
      client.rpc("has_role", { _user_id: userId, _role: "admin" }),
      client.rpc("has_role", { _user_id: userId, _role: "superadmin" }),
    ]);

    const isAdmin = adminResult.data === true || superadminResult.data === true;
    const isFaculty = facultyResult.data === true || isAdmin;

    return {
      userId,
      isFaculty,
      isAdmin,
      roleLabel: isAdmin ? "admin" : isFaculty ? "faculty" : "authenticated",
    };
  } catch {
    return { userId: null, isFaculty: false, isAdmin: false, roleLabel: "anonymous" };
  }
}

function jsonResponse(
  body: unknown,
  status: number,
  correlationId: string,
) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json",
      "x-correlation-id": correlationId,
      "x-kpi-contract-version": KPI_CONTRACT_VERSION,
    },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "GET" && req.method !== "POST") {
    return new Response(JSON.stringify({ error: { code: "method_not_allowed", message: "GET or POST required" } }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const start = Date.now();
  const correlationId = req.headers.get("x-correlation-id") ?? crypto.randomUUID();

  try {
    const url = new URL(req.url);
    let metricKey: string | null = url.searchParams.get("metric");
    let params: Record<string, unknown> = {};

    if (req.method === "POST") {
      try {
        const body = await req.json();
        metricKey = body.metric ?? metricKey;
        params = body.params ?? {};
      } catch {
        // Empty bodies are allowed; validation below handles missing metric.
      }
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
      return jsonResponse(payload, status, correlationId);
    }

    const access = await getRequesterAccess(req.headers.get("Authorization"));
    if (!access.userId) {
      const status = 401;
      await logOp(correlationId, "request.unauthenticated", "warn", Date.now() - start, status, "authentication_required", { metricKey });
      return jsonResponse({
        version: KPI_CONTRACT_VERSION,
        generated_at: new Date().toISOString(),
        error: { code: "unauthenticated", message: "Valid user session required" },
      }, status, correlationId);
    }

    if (!access.isFaculty) {
      const status = 403;
      await logOp(correlationId, "request.forbidden", "warn", Date.now() - start, status, "faculty_authority_required", { metricKey, userId: access.userId });
      return jsonResponse({
        version: KPI_CONTRACT_VERSION,
        generated_at: new Date().toISOString(),
        error: { code: "forbidden", message: "Faculty or administrator role required" },
      }, status, correlationId);
    }

    const def = METRICS[metricKey];
    if (def.requiresAdmin && !access.isAdmin) {
      const status = 403;
      await logOp(correlationId, "request.forbidden", "warn", Date.now() - start, status, "admin_metric_forbidden", { metricKey, userId: access.userId });
      return jsonResponse({
        version: KPI_CONTRACT_VERSION,
        generated_at: new Date().toISOString(),
        error: { code: "forbidden", message: "Administrator role required for this metric" },
      }, status, correlationId);
    }

    // Service role is used only after caller identity and authority have been
    // established through the canonical active-role predicate.
    const admin = createClient(SUPABASE_URL, SERVICE_KEY, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    let query = admin.from(def.view).select(def.selectCols ?? "*");
    if (def.orderBy) query = query.order(def.orderBy.column, { ascending: def.orderBy.ascending });
    if (def.limit) query = query.limit(def.limit);

    const { data, error } = await query;
    if (error) throw error;

    const envelope = {
      version: KPI_CONTRACT_VERSION,
      generated_at: new Date().toISOString(),
      scope: {
        metric: metricKey,
        params,
        requester_role: access.roleLabel,
      },
      metrics: {
        rows: data ?? [],
        row_count: (data ?? []).length,
      },
    };

    await logOp(correlationId, "request.success", "info", Date.now() - start, 200, "ok", {
      metricKey,
      requester_role: access.roleLabel,
      row_count: (data ?? []).length,
    });

    return jsonResponse(envelope, 200, correlationId);
  } catch (err) {
    const status = 500;
    const message = err instanceof Error ? err.message : "unknown error";
    await logOp(correlationId, "request.error", "error", Date.now() - start, status, message, {});
    return jsonResponse({
      version: KPI_CONTRACT_VERSION,
      generated_at: new Date().toISOString(),
      error: { code: "internal_error", message: "KPI service failed" },
    }, status, correlationId);
  }
});
