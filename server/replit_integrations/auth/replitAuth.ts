import session from "express-session";
import type { Express, RequestHandler } from "express";
import connectPg from "connect-pg-simple";
import crypto from "crypto";
import { requireSecret, rateLimit, verifySecret, isHashed } from "../../security";

type LocalRole = "developer" | "boss";

interface LocalAuthUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  profileImageUrl: string;
  role: LocalRole;
}

interface LocalCredential {
  username: string;
  password: string; // plaintext from env OR bcrypt hash
  email: string;
  firstName: string;
  lastName: string;
  role: LocalRole;
}

declare module "express-session" {
  interface SessionData {
    user?: LocalAuthUser;
  }
}

function getLocalCredentials(): LocalCredential[] {
  const isProd = process.env.NODE_ENV === "production";

  const adminUsername = process.env.LOCAL_ADMIN_USERNAME;
  const adminPassword = process.env.LOCAL_ADMIN_PASSWORD;
  const bossUsername = process.env.LOCAL_BOSS_USERNAME;
  const bossPassword = process.env.LOCAL_BOSS_PASSWORD;

  if (isProd) {
    if (!adminUsername || !adminPassword || !bossUsername || !bossPassword) {
      throw new Error(
        "[Security] LOCAL_ADMIN_USERNAME, LOCAL_ADMIN_PASSWORD, LOCAL_BOSS_USERNAME, and LOCAL_BOSS_PASSWORD must be set in production.",
      );
    }
    if (
      adminPassword.startsWith("change-me") ||
      bossPassword.startsWith("change-me")
    ) {
      throw new Error(
        "[Security] Default/placeholder passwords are not allowed in production.",
      );
    }
  }

  return [
    {
      username: adminUsername ?? "admin",
      password: adminPassword ?? "change-me-admin",
      email: `${adminUsername ?? "admin"}@local.internal`,
      firstName: "Admin",
      lastName: "User",
      role: "developer",
    },
    {
      username: bossUsername ?? "boss",
      password: bossPassword ?? "change-me-boss",
      email: `${bossUsername ?? "boss"}@local.internal`,
      firstName: "Boss",
      lastName: "User",
      role: "boss",
    },
  ];
}

function toSessionUser(credential: LocalCredential): LocalAuthUser {
  return {
    id: `local:${credential.username}`,
    email: credential.email,
    firstName: credential.firstName,
    lastName: credential.lastName,
    profileImageUrl: "",
    role: credential.role,
  };
}

async function authenticateLocalUser(
  username: string,
  password: string,
): Promise<LocalAuthUser | null> {
  const match = getLocalCredentials().find((c) => c.username === username);
  if (!match) return null;

  const ok = await verifySecret(password, match.password);
  if (!ok) return null;

  return toSessionUser(match);
}

export function getSession() {
  const sessionTtl = 7 * 24 * 60 * 60 * 1000; // 1 week
  const sessionSecret = requireSecret(
    "SESSION_SECRET",
    process.env.SESSION_SECRET,
    32,
  );

  const pgStore = connectPg(session);
  const sessionStore = new pgStore({
    conString: process.env.DATABASE_URL,
    createTableIfMissing: false,
    ttl: sessionTtl,
    tableName: "sessions",
    errorLog: (error: Error) => {
      console.error("[Session Store Error]", error);
    },
  });

  sessionStore.on("error", (error: Error) => {
    console.error("[Session Store Error]", error);
  });

  return session({
    secret: sessionSecret,
    store: sessionStore,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: sessionTtl,
    },
  });
}

export async function setupAuth(app: Express) {
  app.set("trust proxy", 1);
  app.use(getSession());

  const loginRateLimit = rateLimit({
    keyPrefix: "login",
    max: 10,
    windowMs: 15 * 60 * 1000, // 10 attempts / 15 min
    message: "Too many login attempts. Try again in 15 minutes.",
  });

  app.get("/api/login", (_req, res) => {
    res.status(405).json({ message: "Use POST /api/login" });
  });

  app.post("/api/login", loginRateLimit, async (req, res) => {
    const username =
      typeof req.body?.username === "string" ? req.body.username.trim() : "";
    const password =
      typeof req.body?.password === "string" ? req.body.password : "";

    if (!username || !password) {
      return res
        .status(400)
        .json({ message: "Username and password are required" });
    }

    try {
      const user = await authenticateLocalUser(username, password);
      if (!user) {
        // Constant-ish delay to slow timing attacks a bit
        await new Promise((r) => setTimeout(r, 200 + Math.random() * 200));
        return res.status(401).json({ message: "Invalid username or password" });
      }

      req.session.regenerate((regenerateErr) => {
        if (regenerateErr) {
          console.error("[Auth] Session regeneration failed:", regenerateErr);
          return res.status(500).json({ message: "Login failed" });
        }

        req.session.user = user;
        req.session.save((saveErr) => {
          if (saveErr) {
            console.error("[Auth] Session save failed:", saveErr);
            return res.status(500).json({ message: "Login failed" });
          }

          return res.json(user);
        });
      });
    } catch (err) {
      console.error("[Auth] Login error:", err);
      return res.status(500).json({ message: "Login failed" });
    }
  });

  app.post("/api/logout", (req, res) => {
    req.session.destroy((destroyErr) => {
      if (destroyErr) {
        console.error("[Auth] Session destroy failed:", destroyErr);
        return res.status(500).json({ message: "Logout failed" });
      }

      res.clearCookie("connect.sid");
      return res.status(204).send();
    });
  });

  // Backward compatible route for old clients.
  app.get("/api/logout", (req, res) => {
    req.session.destroy(() => {
      res.clearCookie("connect.sid");
      res.redirect("/");
    });
  });
}

export function getSessionUser(req: any): LocalAuthUser | null {
  return req.session?.user ?? null;
}

export const isAuthenticated: RequestHandler = (req: any, res, next) => {
  const user = getSessionUser(req);
  if (!user) {
    return res.status(401).json({ message: "Unauthorized" });
  }
  return next();
};

/** Admin (developer) or boss session required. */
export const requireAdminOrBoss: RequestHandler = (req: any, res, next) => {
  const user = getSessionUser(req);
  if (!user || (user.role !== "developer" && user.role !== "boss")) {
    return res.status(401).json({ message: "Unauthorized" });
  }
  return next();
};

// silence unused import warning if tree-shaken oddly
void isHashed;
void crypto;
