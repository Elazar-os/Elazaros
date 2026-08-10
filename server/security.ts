import bcrypt from "bcrypt";
import crypto from "crypto";
import type { Request, Response, NextFunction } from "express";

const BCRYPT_ROUNDS = 12;
const isProd = process.env.NODE_ENV === "production";

/** Fail hard in production when a required secret is missing or still a placeholder. */
export function requireSecret(name: string, value: string | undefined, minLength = 32): string {
  if (!value || value.length < minLength || value.startsWith("change-me") || value.startsWith("replace-with")) {
    if (isProd) {
      throw new Error(
        `[Security] ${name} must be set to a strong value (min ${minLength} chars) in production.`,
      );
    }
    console.warn(`[Security] WARNING: ${name} is weak or unset — OK for local dev only.`);
    return value || `dev-only-${name}-not-for-production`;
  }
  return value;
}

export async function hashSecret(plain: string): Promise<string> {
  return bcrypt.hash(plain, BCRYPT_ROUNDS);
}

export async function verifySecret(plain: string, stored: string): Promise<boolean> {
  if (!plain || !stored) return false;

  // Legacy plaintext (pre-migration): constant-time compare, then caller should re-hash
  if (!stored.startsWith("$2")) {
    try {
      const a = Buffer.from(plain);
      const b = Buffer.from(stored);
      if (a.length !== b.length) return false;
      return crypto.timingSafeEqual(a, b);
    } catch {
      return false;
    }
  }

  return bcrypt.compare(plain, stored);
}

export function isHashed(value: string): boolean {
  return value.startsWith("$2");
}

// ─── Simple in-memory rate limiter ───────────────────────────────────────────

interface RateBucket {
  count: number;
  resetAt: number;
}

const buckets = new Map<string, RateBucket>();

export function rateLimit(options: {
  keyPrefix: string;
  max: number;
  windowMs: number;
  message?: string;
}) {
  const { keyPrefix, max, windowMs, message } = options;

  return (req: Request, res: Response, next: NextFunction) => {
    const ip =
      (req.headers["x-forwarded-for"] as string)?.split(",")[0]?.trim() ||
      req.socket.remoteAddress ||
      "unknown";
    const key = `${keyPrefix}:${ip}`;
    const now = Date.now();

    let bucket = buckets.get(key);
    if (!bucket || now > bucket.resetAt) {
      bucket = { count: 0, resetAt: now + windowMs };
      buckets.set(key, bucket);
    }

    bucket.count += 1;

    if (bucket.count > max) {
      const retryAfter = Math.ceil((bucket.resetAt - now) / 1000);
      res.setHeader("Retry-After", String(retryAfter));
      return res.status(429).json({
        error: message || "Too many attempts. Please try again later.",
        retryAfterSeconds: retryAfter,
      });
    }

    return next();
  };
}

/** Sanitize errors returned to clients in production. */
export function clientError(err: unknown, fallback = "Internal server error"): string {
  if (!isProd && err instanceof Error) return err.message;
  return fallback;
}
