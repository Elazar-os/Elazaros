import type { Express, Request, Response, NextFunction } from "express";
import { getSessionUser } from "./replit_integrations/auth";

export type TokenValidator = (token: string | undefined) => boolean;

function getBearerToken(req: Request): string | undefined {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) return undefined;
  return header.slice(7).trim() || undefined;
}

/**
 * Global guard for /api:
 * - Public menu/screen GETs stay open
 * - Sensitive GETs and all mutations require auth
 * - Public POSTs: PIN verify, login, logout, invite verify
 * - Manager token (or admin session) for 86 / featured
 */
export function installApiAuthGuard(
  app: Express,
  validateManagerToken: TokenValidator,
) {
  const publicPosts = new Set([
    "/api/manager/verify-pin",
    "/api/login",
    "/api/logout",
    "/api/invite-codes/verify",
  ]);

  const managerPosts = new Set([
    "/api/manager/toggle-86",
    "/api/featured",
    "/api/featured/clear",
  ]);

  const sensitiveGets = new Set([
    "/api/managers",
    "/api/invite-codes",
    "/api/menu-items",
  ]);

  app.use("/api", (req: Request, res: Response, next: NextFunction) => {
    // When mounted at /api, req.path is relative (e.g. /menu, /manager/verify-pin)
    const fullPath = req.path.startsWith("/api") ? req.path : `/api${req.path}`;

    if (req.method === "GET" || req.method === "HEAD" || req.method === "OPTIONS") {
      if (
        sensitiveGets.has(fullPath) ||
        fullPath.startsWith("/api/menu-items/") ||
        fullPath.startsWith("/api/managers/")
      ) {
        if (!getSessionUser(req)) {
          return res.status(401).json({ error: "Unauthorized" });
        }
      }
      return next();
    }

    if (publicPosts.has(fullPath)) return next();

    if (managerPosts.has(fullPath)) {
      const token = getBearerToken(req);
      if (validateManagerToken(token) || getSessionUser(req)) return next();
      return res.status(401).json({ error: "Unauthorized" });
    }

    if (!getSessionUser(req)) {
      return res.status(401).json({ error: "Unauthorized" });
    }
    return next();
  });
}
