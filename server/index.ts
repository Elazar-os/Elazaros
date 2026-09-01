import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { serveStatic } from "./static";
import { createServer } from "http";

const app = express();
const httpServer = createServer(app);

app.get("/api/health", (_req, res) => {
  res.status(200).json({ status: "ok" });
});

declare module "http" {
  interface IncomingMessage {
    rawBody: unknown;
  }
}

app.use(
  express.json({
    verify: (req, _res, buf) => {
      req.rawBody = buf;
    },
  }),
);

app.use(express.urlencoded({ extended: false }));

const KIDS_MODE_MS = 5 * 60 * 1000;

let kidsMode = false;
let kidsEndsAt: number | null = null;
let kidsTimer: ReturnType<typeof setTimeout> | null = null;
let anniversaryName: string | null = null;

function clearKidsTimer() {
  if (kidsTimer) {
    clearTimeout(kidsTimer);
    kidsTimer = null;
  }
}

function setKidsMode(on: boolean) {
  clearKidsTimer();
  kidsMode = !!on;
  if (kidsMode) {
    kidsEndsAt = Date.now() + KIDS_MODE_MS;
    kidsTimer = setTimeout(() => {
      kidsMode = false;
      kidsEndsAt = null;
      kidsTimer = null;
      log("Kids hour auto-off after 5 minutes", "kids");
    }, KIDS_MODE_MS);
  } else {
    kidsEndsAt = null;
  }
  return kidsMode;
}

const mainTheme = {
  version: "v55",
  main: {
    bg: "#F7F7F7",
    surface: "#FFFFFF",
    card: "#FFFFFF",
    border: "#E8E8E8",
    accent: "#C8102E",
    cat: "#C8102E",
    itemName: "#111111",
    itemDesc: "#555555",
    itemPrice: "#C8102E",
  },
};

function titleCase(value: string) {
  return value
    .split(" ")
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(" ");
}

function extractAnniversaryName(command: string) {
  const cleaned = command
    .replace(/hey gary,?/gi, "")
    .replace(/\b(play|start|show|put on|put up)\b/gi, "")
    .replace(/\b(anniversary|anniversaries|table)\b/gi, "")
    .replace(/\b(mazal|mazel)\s*tov\b/gi, "")
    .replace(/\b(for|to|the|please|can you|could you)\b/gi, "")
    .replace(/\b(stop|cancel|clear|end|off|done)\b/gi, "")
    .replace(/\s+/g, " ")
    .trim();
  return cleaned ? titleCase(cleaned) : "Mazal Tov";
}

app.get("/api/theme", (_req, res) => {
  res.set("Cache-Control", "no-store");
  res.json(mainTheme);
});

app.get("/api/kids-state", (_req, res) => {
  res.json({ kidsMode, endsAt: kidsEndsAt });
});

app.post("/api/kids", (req, res) => {
  const action = String(req.body?.action || "on");
  const on = action !== "off" && action !== "stop" && action !== "clear";
  setKidsMode(on);
  res.json({
    success: true,
    kidsMode,
    endsAt: kidsEndsAt,
    message: kidsMode ? "Kids hour on for 5 minutes" : "Kids hour off",
  });
});

app.get("/api/anniversary-state", (_req, res) => {
  res.json({ name: anniversaryName });
});

app.post("/api/anniversary", (req, res) => {
  const action = String(req.body?.action || "on");
  if (action === "off" || action === "stop" || action === "clear") {
    anniversaryName = null;
    return res.json({ success: true, name: null, message: "Anniversary cleared" });
  }
  const name = String(req.body?.name || "").trim();
  anniversaryName = name || "Mazal Tov";
  res.json({ success: true, name: anniversaryName, message: `MAZAL TOV ${anniversaryName}` });
});

app.post("/api/voice-command", (req, res, next) => {
  const command = String(req.body?.command || "").toLowerCase();

  if (/\b(anniversary|mazal\s*tov|mazel\s*tov)\b/.test(command)) {
    const off = /\b(stop|cancel|clear|end|off|done)\b/.test(command);
    if (off) {
      anniversaryName = null;
      return res.json({ success: true, action: "anniversary_clear", message: "Anniversary cleared" });
    }
    anniversaryName = extractAnniversaryName(command);
    const label = anniversaryName === "Mazal Tov" ? "MAZAL TOV" : `MAZAL TOV ${anniversaryName}`;
    return res.json({ success: true, action: "anniversary", name: anniversaryName, message: label });
  }

  if (!/\bkids?\s*(mode|hour|menu)\b/.test(command) && !/\bkid mode\b/.test(command)) {
    return next();
  }
  const off = /\b(off|stop|end|cancel|clear|done)\b/.test(command);
  setKidsMode(!off);
  return res.json({
    success: true,
    action: "kids_mode",
    enabled: kidsMode,
    endsAt: kidsEndsAt,
    message: kidsMode ? "Kids hour on for 5 minutes" : "Kids hour off",
  });
});

export function log(message: string, source = "express") {
  const formattedTime = new Date().toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });

  console.log(`${formattedTime} [${source}] ${message}`);
}

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }
      log(logLine);
    }
  });

  next();
});

(async () => {
  await registerRoutes(httpServer, app);

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";
    console.error(`[Error] ${status}: ${message}`, err.stack || err);
    if (!res.headersSent) {
      res.status(status).json({ message });
    }
  });

  if (process.env.NODE_ENV === "production") {
    serveStatic(app);
  } else {
    const { setupVite } = await import("./vite");
    await setupVite(httpServer, app);
  }

  const port = parseInt(process.env.PORT || "5000", 10);
  httpServer.listen(
    {
      port,
      host: "0.0.0.0",
      reusePort: true,
    },
    () => {
      log(`serving on port ${port}`);
    },
  );
})();
