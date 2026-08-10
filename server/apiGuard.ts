/**
 * Global API auth guard for mutating routes.
 *
 * Public (no auth required):
 *   - All GET /api/*
 *   - POST /api/manager/verify-pin
 *   - POST /api/invite-codes/verify
 *   - POST /api/login  (handled in auth)
 *
 * Everything else under /api that mutates state requires either:
 *   - A valid session user with role "developer" or "boss", OR
 *   - A valid manager Bearer token (from PIN login)
 */

import type { Express, Request, Response, NextFunction } from "express";
import { getSessionUser } from "./replit_integrations/auth";

type ValidateManagerToken = (token: string | undefined) => boolean;

/** Paths that intentionally allow unauthenticated POST (rate-limited at the route). */
const PUBLIC_MUTATING_PATHS = new Set([
  "/api/manager/verify-pin",
  "/api/invite-codes/verify",
  "/api/login",
  "/api/logout",
]);

function isPublicMutating(path: string): boolean {
  // Normalize trailing slash
  const normalized = path.endsWith("/") && path.length > 1 ? path.slice(0, -1) : path;
  return PUBLIC_MUTATING_PATHS.has(normalized);
}

function extractBearerToken(req: Request): string | undefined {
  const header = req.headers.authorization;
  if (!header || typeof header !== "string") return undefined;
  if (header.startsWith("Bearer ")) return header.slice(7).trim();
  return undefined;
}

/**
 * Install a single early middleware that protects all mutating /api routes.
 * Call this AFTER setupAuth / session middleware so req.session is available.
 */
export function installApiAuthGuard(
  app: Express,
  validateManagerToken: ValidateManagerToken,
): void {
  app.use((req: Request, res: Response, next: NextFunction) => {
    // Only care about API routes
    if (!req.path.startsWith("/api")) {
      return next();
    }

    // GET (and HEAD) are public for menus, config, screen-state, etc.
    if (req.method === "GET" || req.method === "HEAD" || req.method === "OPTIONS") {
      return next();
    }

    // Explicitly public mutating endpoints (PIN login, invite verify, login/logout)
    if (isPublicMutating(req.path)) {
      return next();
    }

    // Session-based admin/boss
    const user = getSessionUser(req as any);
    if (user && (user.role === "developer" || user.role === "boss")) {
      return next();
    }

    // Manager PIN token
    const token = extractBearerToken(req);
    if (validateManagerToken(token)) {
      return next();
    }

    return res.status(401).json({
      error: "Unauthorized",
      message: "Admin/boss session or valid manager token required",
    });
  });
}
