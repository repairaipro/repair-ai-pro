/**
 * Lightweight in-memory rate limiter for API routes.
 *
 * Best-effort: state is per server instance (resets on deploy/restart and is
 * not shared across serverless instances). Good enough to blunt casual abuse
 * of OpenAI-backed endpoints; swap for Upstash/Redis when traffic justifies it.
 */

type Bucket = { count: number; resetAt: number };

const buckets = new Map<string, Bucket>();

// Periodically purge expired buckets so the map doesn't grow unbounded
const CLEANUP_INTERVAL_MS = 5 * 60 * 1000;
let lastCleanup = Date.now();

function cleanup(now: number) {
  if (now - lastCleanup < CLEANUP_INTERVAL_MS) return;
  lastCleanup = now;
  for (const [key, bucket] of buckets) {
    if (bucket.resetAt <= now) buckets.delete(key);
  }
}

/** Extract the caller's IP from proxy headers (Vercel/most hosts set x-forwarded-for) */
export function getClientIp(req: Request): string {
  const fwd = req.headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0].trim();
  return req.headers.get("x-real-ip") ?? "unknown";
}

export type RateLimitResult = {
  ok: boolean;
  remaining: number;
  retryAfterSeconds: number;
};

/**
 * Sliding-window-ish limiter: `limit` requests per `windowMs` per key.
 *
 * @param req      incoming request (used for IP keying)
 * @param name     route name so different endpoints don't share buckets
 * @param limit    max requests per window (default 20)
 * @param windowMs window length in ms (default 60s)
 */
export function rateLimit(
  req: Request,
  name: string,
  limit = 20,
  windowMs = 60_000
): RateLimitResult {
  const now = Date.now();
  cleanup(now);

  const key = `${name}:${getClientIp(req)}`;
  const bucket = buckets.get(key);

  if (!bucket || bucket.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { ok: true, remaining: limit - 1, retryAfterSeconds: 0 };
  }

  bucket.count += 1;

  if (bucket.count > limit) {
    return {
      ok: false,
      remaining: 0,
      retryAfterSeconds: Math.ceil((bucket.resetAt - now) / 1000),
    };
  }

  return { ok: true, remaining: limit - bucket.count, retryAfterSeconds: 0 };
}

/** Standard 429 response for rate-limited requests */
export function rateLimitResponse(result: RateLimitResult): Response {
  return new Response(
    JSON.stringify({ error: "Too many requests. Please slow down and try again." }),
    {
      status: 429,
      headers: {
        "Content-Type": "application/json",
        "Retry-After": String(result.retryAfterSeconds || 60),
      },
    }
  );
}
