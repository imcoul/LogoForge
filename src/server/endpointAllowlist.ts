/**
 * Allowlist for outbound model endpoints.
 *
 * Phase 3 of the roadmap. Before this, the model endpoint was read straight from a request
 * header (`x-stepfun-endpoint` and friends) and passed to `fetch` with no validation, so any
 * caller could make the server issue requests to a host of their choosing — including cloud
 * metadata services (169.254.169.254), localhost admin ports, and anything else reachable
 * from inside the deployment's network.
 *
 * A client may still choose *which* provider to use; it may no longer choose *what host* the
 * server talks to.
 */

/** Hosts the server is permitted to call for model inference. */
const ALLOWED_HOSTS = new Set([
  'api.stepfun.com',
  'api.poolside.ai',
  'api.hunyuan.tencent.com',
  'generativelanguage.googleapis.com',
  'api.openai.com',
  'openrouter.ai',
]);

/**
 * Additional hosts supplied by the deployment operator (not by request headers), as a
 * comma-separated list. This keeps self-hosted or regional endpoints possible without
 * reopening the header-controlled hole.
 */
function operatorAllowedHosts(): string[] {
  const raw = process.env.ALLOWED_MODEL_HOSTS;
  if (!raw) return [];
  return raw
    .split(',')
    .map((h) => h.trim().toLowerCase())
    .filter(Boolean);
}

export class DisallowedEndpointError extends Error {
  constructor(endpoint: string) {
    super(`Model endpoint is not allowed: ${endpoint}`);
    this.name = 'DisallowedEndpointError';
  }
}

/** True when `endpoint` is a well-formed HTTPS URL pointing at an allowed host. */
export function isAllowedEndpoint(endpoint: string | undefined | null): boolean {
  if (!endpoint) return false;

  let url: URL;
  try {
    url = new URL(endpoint);
  } catch {
    return false;
  }

  // Plain HTTP would allow downgrade and interception of the API key we attach.
  if (url.protocol !== 'https:') return false;

  // Credentials in the URL are a redirection trick; never accept them.
  if (url.username || url.password) return false;

  const host = url.hostname.toLowerCase();
  return ALLOWED_HOSTS.has(host) || operatorAllowedHosts().includes(host);
}

/**
 * Returns `candidate` when it is allowed, otherwise falls back to `fallback`.
 *
 * Used where a request header may *propose* an endpoint: the proposal is honoured only if it
 * passes the allowlist, and is otherwise silently replaced by the configured default.
 */
export function resolveEndpoint(candidate: string | undefined | null, fallback: string): string {
  return isAllowedEndpoint(candidate) ? (candidate as string) : fallback;
}

/** Throws unless `endpoint` is allowed. For call sites with no sensible fallback. */
export function assertAllowedEndpoint(endpoint: string): void {
  if (!isAllowedEndpoint(endpoint)) throw new DisallowedEndpointError(endpoint);
}
