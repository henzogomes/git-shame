interface RateLimitEntry {
  count: number;
  resetTime: number;
}

// In-memory store for rate limiting
const rateLimitStore = new Map<string, RateLimitEntry>();

// Configuration
const RATE_LIMIT_MAX = 5; // Maximum requests allowed
const RATE_LIMIT_WINDOW_MS = 60 * 1000; // Time window in ms (1 minute)

export function isRateLimited(identifier: string): boolean {
  const now = Date.now();

  // Clean up expired entries
  for (const [key, entry] of rateLimitStore.entries()) {
    if (entry.resetTime < now) {
      rateLimitStore.delete(key);
    }
  }

  // Get or create rate limit entry
  const entry = rateLimitStore.get(identifier) || {
    count: 0,
    resetTime: now + RATE_LIMIT_WINDOW_MS,
  };

  // Check if rate limited
  if (entry.count >= RATE_LIMIT_MAX) {
    return true;
  }

  // Increment counter
  entry.count++;
  rateLimitStore.set(identifier, entry);

  return false;
}

export function getRateLimitReset(identifier: string): number {
  const entry = rateLimitStore.get(identifier);
  return entry ? Math.ceil((entry.resetTime - Date.now()) / 1000) : 0;
}
