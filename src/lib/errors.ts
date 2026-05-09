/**
 * ScrollUniversity centralized error parser
 *
 * Converts Supabase / Postgres / Edge Function / Network errors into
 * safe, user-facing messages while preserving full detail for developers.
 *
 * Usage:
 *   import { getUserFriendlyError, logError } from "@/lib/errors";
 *   toast.error(getUserFriendlyError(err, "enroll_degree"));
 *   logError(err, { context: "enroll_degree", userId });
 */

export type ErrorSeverity = "info" | "warning" | "error" | "critical";

export interface AppError {
  code: string;
  message: string;          // raw/dev message
  userMessage: string;      // safe user-facing message
  severity: ErrorSeverity;
  action?: string;          // suggested next action label
  constraint?: string;
  rawError?: unknown;
}

/** Map of context-specific overrides. */
const CONTEXT_MESSAGES: Record<string, Partial<Record<string, string>>> = {
  enroll_degree: {
    DUPLICATE: "You are already enrolled in this program.",
    FK_VIOLATION: "This program is no longer available.",
    FORBIDDEN: "You need an accepted application before enrolling.",
  },
  enroll_course: {
    DUPLICATE: "You are already enrolled in this course.",
    FORBIDDEN: "Complete the prerequisites before enrolling.",
  },
  apply_program: {
    DUPLICATE: "You already have an active application for this program.",
  },
  upload_document: {
    FORBIDDEN: "You can only upload documents to your own application.",
    STORAGE: "We couldn't upload that file. Please try again.",
  },
};

const DEFAULT_MESSAGES: Record<string, string> = {
  DUPLICATE: "This record already exists.",
  FK_VIOLATION: "This action references something that no longer exists.",
  NOT_NULL: "Some required information is missing.",
  CHECK_VIOLATION: "Some of the information provided isn't valid.",
  FORBIDDEN: "You do not have permission to perform this action.",
  UNAUTHORIZED: "Please sign in to continue.",
  NOT_FOUND: "We couldn't find what you were looking for.",
  VALIDATION: "Please review your information and try again.",
  NETWORK: "Connection issue. Please check your internet and try again.",
  RATE_LIMIT: "Too many attempts. Please wait a moment and try again.",
  EDGE_FUNCTION: "Something went wrong on our side. Please try again.",
  STORAGE: "We couldn't process that file. Please try again.",
  REQUIREMENTS: "You do not yet meet the requirements for this action.",
  NOT_IMPLEMENTED: "This feature is not yet available.",
  UNKNOWN: "Something went wrong. Please try again.",
};

const SEVERITY: Record<string, ErrorSeverity> = {
  DUPLICATE: "info",
  FK_VIOLATION: "warning",
  NOT_NULL: "warning",
  CHECK_VIOLATION: "warning",
  FORBIDDEN: "warning",
  UNAUTHORIZED: "warning",
  NOT_FOUND: "info",
  VALIDATION: "warning",
  NETWORK: "warning",
  RATE_LIMIT: "warning",
  EDGE_FUNCTION: "error",
  STORAGE: "warning",
  REQUIREMENTS: "info",
  UNKNOWN: "error",
};

/** Parse any thrown value into an AppError. */
export function parseAppError(error: unknown, context?: string): AppError {
  // String / null / undefined
  if (!error) {
    return build("UNKNOWN", "No error provided", context, error);
  }

  const e = error as any;
  const raw: string =
    e?.message || e?.error_description || e?.error?.message || String(e);

  // Edge function structured response: { ok:false, error: { code, message } }
  if (e?.error && typeof e.error === "object" && e.error.code) {
    const code = String(e.error.code).toUpperCase();
    return {
      code,
      message: e.error.message || raw,
      userMessage: e.error.message || resolveMessage(code, context),
      severity: SEVERITY[code] || "error",
      rawError: error,
    };
  }

  // Network / offline
  if (
    (typeof navigator !== "undefined" && navigator.onLine === false) ||
    /Failed to fetch|NetworkError|ERR_NETWORK|TypeError: fetch/i.test(raw)
  ) {
    return build("NETWORK", raw, context, error);
  }

  // Supabase / PostgREST: code may live on e.code
  const pgCode: string | undefined = e?.code;

  if (pgCode === "23505" || /duplicate key|unique constraint/i.test(raw)) {
    const constraint = extractConstraint(raw, e);
    return { ...build("DUPLICATE", raw, context, error), constraint };
  }
  if (pgCode === "23503" || /violates foreign key/i.test(raw)) {
    return build("FK_VIOLATION", raw, context, error);
  }
  if (pgCode === "23502" || /null value in column/i.test(raw)) {
    return build("NOT_NULL", raw, context, error);
  }
  if (pgCode === "23514" || /check constraint/i.test(raw)) {
    return build("CHECK_VIOLATION", raw, context, error);
  }
  if (
    pgCode === "42501" ||
    pgCode === "PGRST301" ||
    /row-level security|permission denied|RLS/i.test(raw)
  ) {
    return build("FORBIDDEN", raw, context, error);
  }
  if (e?.status === 401 || /unauthori[sz]ed|JWT|not authenticated/i.test(raw)) {
    return build("UNAUTHORIZED", raw, context, error);
  }
  if (e?.status === 403) return build("FORBIDDEN", raw, context, error);
  if (e?.status === 404 || pgCode === "PGRST116" || /not found/i.test(raw)) {
    return build("NOT_FOUND", raw, context, error);
  }
  if (e?.status === 429 || /rate limit|too many/i.test(raw)) {
    return build("RATE_LIMIT", raw, context, error);
  }
  if (/storage|bucket|object too large/i.test(raw)) {
    return build("STORAGE", raw, context, error);
  }
  if (e?.name === "FunctionsHttpError" || /edge function|FunctionsError/i.test(raw)) {
    return build("EDGE_FUNCTION", raw, context, error);
  }
  if (e?.name === "ValidationError" || e?.status === 400) {
    return build("VALIDATION", raw, context, error);
  }

  return build("UNKNOWN", raw, context, error);
}

function build(
  code: string,
  message: string,
  context: string | undefined,
  rawError: unknown,
): AppError {
  return {
    code,
    message,
    userMessage: resolveMessage(code, context),
    severity: SEVERITY[code] || "error",
    rawError,
  };
}

function resolveMessage(code: string, context?: string): string {
  return (
    (context && CONTEXT_MESSAGES[context]?.[code]) ||
    DEFAULT_MESSAGES[code] ||
    DEFAULT_MESSAGES.UNKNOWN
  );
}

function extractConstraint(raw: string, e: any): string | undefined {
  const m = raw.match(/constraint "([^"]+)"/);
  return m?.[1] || e?.details || undefined;
}

/** Safe convenience used in toasts. */
export function getUserFriendlyError(error: unknown, context?: string): string {
  return parseAppError(error, context).userMessage;
}

/** Structured developer/admin logger. */
export function logError(
  error: unknown,
  meta: {
    context?: string;
    userId?: string;
    route?: string;
    action?: string;
    [k: string]: unknown;
  } = {},
) {
  const parsed = parseAppError(error, meta.context);
  const payload = {
    ...meta,
    code: parsed.code,
    severity: parsed.severity,
    constraint: parsed.constraint,
    message: parsed.message,
    timestamp: new Date().toISOString(),
  };

  // Always full detail in dev; sanitized in prod console.
  if (import.meta.env?.DEV) {
    // eslint-disable-next-line no-console
    console.error("[AppError]", payload, error);
  } else {
    // eslint-disable-next-line no-console
    console.error("[AppError]", payload);
  }
  return parsed;
}
