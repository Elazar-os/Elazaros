import session from "express-session";
import type { Express, RequestHandler } from "express";
import connectPg from "connect-pg-simple";

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
  password: string;
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
  const adminUsername = process.env.LOCAL_ADMIN_USERNAME ?? "admin";
  const adminPassword = process.env.LOCAL_ADMIN_PASSWORD ?? "change-me-admin";
  const bossUsername = process.env.LOCAL_BOSS_USERNAME ?? "boss";
  const bossPassword = process.env.LOCAL_BOSS_PASSWORD ?? "change-me-boss";

  return [
    {
      username: adminUsername,
      password: adminPassword,
      email: `${adminUsername}@local.internal`,
      firstName: "Admin",
      lastName: "User",
      role: "developer",
    },
    {
      username: bossUsername,
      password: bossPassword,
      email: `${bossUsername}@local.internal`,
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

function authenticateLocalUser(username: string, password: string): LocalAuthUser | null {
  const match = getLocalCredentials().find(
    (credential) => credential.username === username && credential.password === password,
  );

  if (!match) {
    return null;
  }

  return toSessionUser(match);
}

export function getSession() {
  const sessionTtl = 7 * 24 * 60 * 60 * 1000; // 1 week
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
  
  sessionStore.on('error', (error: Error) => {
    console.error('[Session Store Error]', error);
  });
  
  return session({
    secret: process.env.SESSION_SECRET ?? "local-dev-session-secret",
    store: sessionStore,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: sessionTtl,
    },
  });
}

export async function setupAuth(app: Express) {
  app.set("trust proxy", 1);
  app.use(getSession());

  app.get("/api/login", (_req, res) => {
    res.status(405).json({ message: "Use POST /api/login" });
  });

  app.post("/api/login", (req, res) => {
    const username = typeof req.body?.username === "string" ? req.body.username.trim() : "";
    const password = typeof req.body?.password === "string" ? req.body.password : "";

    if (!username || !password) {
      return res.status(400).json({ message: "Username and password are required" });
    }

    const user = authenticateLocalUser(username, password);
    if (!user) {
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
