// touch for deploy
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "method not allowed" }), {
      status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const authHeader = req.headers.get("Authorization");
  if (!authHeader) {
    return json({ error: "missing authorization" }, 401);
  }

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
  const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
  const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

  // Verify caller is admin
  const userClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: authHeader } },
  });
  const { data: userData, error: userErr } = await userClient.auth.getUser();
  if (userErr || !userData?.user) return json({ error: "invalid session" }, 401);

  const { data: isAdmin, error: roleErr } = await userClient.rpc("has_role", {
    _user_id: userData.user.id, _role: "admin",
  });
  if (roleErr || !isAdmin) return json({ error: "admin role required" }, 403);

  let body: { size?: number; label?: string; cleanup?: boolean; run_id?: string };
  try { body = await req.json(); } catch { body = {}; }

  // Service-role client that ALSO forwards the caller JWT so simulate_cohort's
  // auth.uid() admin check passes inside SECURITY DEFINER.
  const svc = createClient(SUPABASE_URL, SERVICE_ROLE, {
    global: { headers: { Authorization: authHeader } },
  });
  // Admin operations use a separate service-role client (no user JWT).
  const admin = createClient(SUPABASE_URL, SERVICE_ROLE);

  // ── Cleanup branch ───────────────────────────────────────────────────────
  if (body.cleanup && body.run_id) {
    // Find synthetic users by email pattern, delete via admin.
    const { data: users } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
    const pattern = `sim+${body.run_id}+`;
    const targets = (users?.users ?? []).filter((u) => u.email?.includes(pattern));
    let deleted = 0;
    for (const u of targets) {
      const { error } = await admin.auth.admin.deleteUser(u.id);
      if (!error) deleted++;
    }
    return json({ deleted });
  }

  // ── Run branch ───────────────────────────────────────────────────────────
  const size = Number(body.size ?? 100);
  if (!Number.isInteger(size) || size < 1 || size > 1000) {
    return json({ error: "size must be 1..1000 (10k+ reserved for targeted load testing)" }, 400);
  }
  const label = String(body.label ?? `cohort-${size}-${new Date().toISOString()}`);

  // Pre-create synthetic auth users via admin SDK
  const runTag = crypto.randomUUID();
  const studentIds: string[] = [];
  const created: { ok: number; fail: number; firstErr?: string } = { ok: 0, fail: 0 };
  const startedAuth = Date.now();
  // Sequential to keep things deterministic; small batches are fast enough.
  for (let i = 0; i < size; i++) {
    const email = `sim+${runTag}+${i}@scrolluniversity.test`;
    const { data, error } = await admin.auth.admin.createUser({
      email, email_confirm: true, password: crypto.randomUUID() + "Aa1!",
      user_metadata: { simulation: true, run_tag: runTag },
    });
    if (error || !data?.user) {
      created.fail++;
      if (!created.firstErr) created.firstErr = error?.message ?? "unknown";
    } else {
      created.ok++;
      studentIds.push(data.user.id);
    }
  }
  const authMs = Date.now() - startedAuth;

  if (studentIds.length < Math.max(1, Math.floor(size * 0.5))) {
    return json({
      error: "failed to create enough synthetic auth users",
      created, auth_ms: authMs, first_error: created.firstErr,
    }, 500);
  }

  // Drive the simulation
  const started = Date.now();
  const { data: runId, error } = await svc.rpc("simulate_cohort", {
    p_label: label, p_student_ids: studentIds,
  });
  const simMs = Date.now() - started;

  if (error) {
    return json({ error: error.message, auth_ms: authMs, sim_ms: simMs, created }, 500);
  }

  const [{ data: run }, { data: stages }] = await Promise.all([
    svc.from("cohort_simulation_runs").select("*").eq("id", runId).single(),
    svc.from("cohort_simulation_stage_metrics").select("*").eq("run_id", runId).order("stage_order"),
  ]);

  return json({
    run_id: runId, auth_ms: authMs, sim_ms: simMs,
    auth_users_created: created.ok, auth_failures: created.fail,
    run, stages,
  });

  function json(payload: unknown, status = 200) {
    return new Response(JSON.stringify(payload), {
      status, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
