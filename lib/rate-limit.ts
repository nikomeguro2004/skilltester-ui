import "server-only";

interface Bucket {
  count: number;
  resetAt: number;
}

// In-memory per-instance limiter. Good enough to stop casual abuse/runaway
// loops from burning the shared Groq quota; not a substitute for a real
// distributed limiter (Upstash/Redis) if this ever needs to survive scale-out.
const buckets = new Map<string, Bucket>();

// Sized around one full assessment's real call volume (research once, then
// question+evaluate per question, report once) so a legitimate user finishing
// a 15-question run never trips these.
const LIMITS: Record<string, { max: number; windowMs: number }> = {
  research: { max: 8, windowMs: 10 * 60 * 1000 },
  question: { max: 60, windowMs: 10 * 60 * 1000 },
  evaluate: { max: 60, windowMs: 10 * 60 * 1000 },
  report: { max: 8, windowMs: 10 * 60 * 1000 },
};

export function getClientIp(req: Request): string {
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();
  return req.headers.get("x-real-ip") ?? "unknown";
}

export function checkRateLimit(
  ip: string,
  route: keyof typeof LIMITS,
): { allowed: boolean; retryAfterSeconds: number } {
  const { max, windowMs } = LIMITS[route];
  const key = `${route}:${ip}`;
  const now = Date.now();
  const bucket = buckets.get(key);

  if (!bucket || now >= bucket.resetAt) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true, retryAfterSeconds: 0 };
  }

  if (bucket.count >= max) {
    return { allowed: false, retryAfterSeconds: Math.ceil((bucket.resetAt - now) / 1000) };
  }

  bucket.count += 1;
  return { allowed: true, retryAfterSeconds: 0 };
}
