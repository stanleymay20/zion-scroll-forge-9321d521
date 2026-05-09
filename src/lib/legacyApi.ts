/**
 * Legacy /api shim
 *
 * Lovable Cloud does not host custom `/api/...` routes. Any historical
 * frontend code that called such routes is wired through `legacyApiCall`
 * so it fails fast with a clear, user-facing error rather than silently
 * hitting a non-existent endpoint.
 *
 * Existing try/catch blocks already render the error via
 * `getUserFriendlyError`, which is mapped to "This feature is not yet
 * available." for the NOT_IMPLEMENTED code.
 */

export class LegacyApiUnavailableError extends Error {
  code = "NOT_IMPLEMENTED" as const;
  status = 501;
  path: string;
  constructor(path: string) {
    super(`Feature not available: ${path} (no backend route configured)`);
    this.name = "LegacyApiUnavailableError";
    this.path = path;
  }
}

/**
 * Drop-in replacement for legacy fetch calls to `/api/...` routes.
 * Always throws a LegacyApiUnavailableError — never performs a network request.
 */
export async function legacyApiCall(
  path: string,
  _init?: RequestInit,
): Promise<Response> {
  if (import.meta.env?.DEV) {
    // eslint-disable-next-line no-console
    console.warn("[legacyApiCall] blocked legacy /api call:", path);
  }
  throw new LegacyApiUnavailableError(path);
}
