type Bucket = { hits: number[]; }

const buckets = new Map<string, Bucket>()

function prune(hits: number[], windowMs: number, now: number): number[] {
  return hits.filter((time) => now - time < windowMs)
}

export function rateLimit(
  key: string,
  limit: number,
  windowMs: number
): { ok: true } | { ok: false; retryAfterSec: number } {
  const now = Date.now()
  const bucket = buckets.get(key) ?? { hits: [] }
  bucket.hits = prune(bucket.hits, windowMs, now)

  if (bucket.hits.length >= limit) {
    const retryAfterSec = Math.max(1, Math.ceil((bucket.hits[0] + windowMs - now) / 1000))
    buckets.set(key, bucket)
    return { ok: false, retryAfterSec }
  }

  bucket.hits.push(now)
  buckets.set(key, bucket)

  if (buckets.size > 5000) {
    for (const [entryKey, entry] of buckets) {
      entry.hits = prune(entry.hits, windowMs, now)
      if (entry.hits.length === 0) buckets.delete(entryKey)
    }
  }

  return { ok: true }
}

export function clientIp(request: Request): string {
  const forwarded = request.headers.get('x-forwarded-for')
  if (forwarded) {
    const first = forwarded.split(',')[0]?.trim()
    if (first) return first.slice(0, 64)
  }
  const realIp = request.headers.get('x-real-ip')?.trim()
  if (realIp) return realIp.slice(0, 64)
  return 'unknown'
}

export function tooManyRequests(retryAfterSec: number) {
  return {
    error: 'Too many attempts. Please wait and try again.',
    retryAfterSec,
  }
}
