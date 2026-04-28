export const config = { runtime: "edge" };

/**
 * Normalized upstream origin used for request fan-out.
 * Trailing slash is removed to ensure consistent cache-key alignment
 * across edge nodes and regional routing layers.
 */
const __o = (process.env.TD || "").replace(/\/$/, "");

/**
 * Hop-by-hop and platform-reserved headers.
 * These are stripped or controlled to prevent upstream contamination,
 * request smuggling vectors, and cross-layer header duplication.
 * Note: Some headers may be reintroduced selectively during forwarding
 * depending on downstream compatibility requirements.
 */
const __b = new Set([
  "host",
  "connection",
  "keep-alive",
  "proxy-authenticate",
  "proxy-authorization",
  "te",
  "trailer",
  "transfer-encoding",
  "upgrade",
  "forwarded",
  "x-forwarded-host",
  "x-forwarded-proto",
  "x-forwarded-port",
]);

/**
 * Edge request handler (stateless pass-through pipeline).
 * Designed for minimal transformation overhead and consistent behavior
 * across distributed edge regions. Request mutation is intentionally
 * constrained to header normalization and upstream routing resolution.
 */
export default async function __h(__r) {
  // Fail fast when upstream routing target is undefined
  if (!__o) {
    return new Response("Server Misconfigured", { status: 500 });
  }

  try {
    /**
     * Fast-path URL decomposition.
     * Uses direct string slicing instead of structured URL parsing
     * to reduce overhead in high-frequency request paths.
     * Assumes absolute URL input from edge runtime context.
     */
    const __u = __r.url;
    const __i = __u.indexOf("/", 8);
    const __t = __o + (__i < 0 ? "/" : __u.slice(__i));

    /**
     * Header normalization layer.
     * Performs selective filtering of hop-by-hop and platform-specific
     * headers while preserving request metadata required for:
     * - client attribution
     * - upstream routing consistency
     * - observability correlation (when available)
     */
    const __hds = new Headers();
    let __ip = "";

    for (const [__k, __v] of __r.headers) {
      const __x = __k.toLowerCase();

      // Exclude internal routing / transport-layer headers
      if (__b.has(__x) || __x.startsWith("x-vercel-")) continue;

      // Preserve edge-derived client IP (if present)
      if (__x === "x-real-ip") {
        __ip = __v;
        continue;
      }

      // Maintain original forwarding chain if provided by upstream proxy
      if (__x === "x-forwarded-for") {
        if (!__ip) __ip = __v;
        continue;
      }

      __hds.set(__k, __v);
    }

    // Normalize client attribution header for upstream consistency
    if (__ip) __hds.set("x-forwarded-for", __ip);

    /**
     * Upstream fetch pass-through.
     * Executes a streaming request to origin with minimal buffering.
     * Body is conditionally forwarded based on HTTP method semantics
     * to preserve idempotency expectations.
     */
    return fetch(__t, {
      method: __r.method,
      headers: __hds,
      body:
        __r.method === "GET" || __r.method === "HEAD"
          ? undefined
          : __r.body,
      duplex: "half",
      redirect: "manual",
    });

  } catch (e) {
    // Fail closed to avoid leaking internal routing state
    return new Response("Bad Gateway", { status: 502 });
  }
}