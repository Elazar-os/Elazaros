# Replit to GitHub + Supabase + Cloudflare (Exact-Behavior Path)

This app is not static. It is a Node/Express server with WebSockets and Replit auth integration.

For this specific codebase, the safest no-logic-change migration is:

- GitHub: source code
- Supabase: PostgreSQL database (replace Replit DB)
- Cloudflare: DNS/SSL/proxy in front of your app domain
- Node host: run this server exactly as-is (same runtime behavior as Replit VM)

## 0) Important reality check

Cloudflare Pages alone cannot run this full app exactly as-is because it expects a long-running Node server and native WebSocket server setup.

If your top priority is no behavior changes, keep the app on a Node host and use Cloudflare for domain + SSL + caching.

## 1) Import zip (already done if you ran the helper)

```bash
chmod +x scripts/import-replit-zip.sh
./scripts/import-replit-zip.sh "/absolute/path/to/replit-export.zip"
```

## 2) Push to GitHub

```bash
git add .
git commit -m "Import project from Replit zip"
git push -u origin main
```

## 3) Create Supabase PostgreSQL and wire env vars

1. Create a Supabase project.
2. Copy the PostgreSQL connection string from Supabase.
3. Use that value as `DATABASE_URL` in your runtime host.

Required env vars for this codebase:

- `DATABASE_URL`
- `SESSION_SECRET`
- `REPL_ID` (only if keeping Replit OIDC login)
- `ISSUER_URL` (optional; defaults to Replit OIDC)
- `PORT` (host usually sets this automatically)

## 4) Run this app on a Node host (no code change)

Any standard Node host works. Use these exact commands:

```bash
npm ci
npm run build
npm run start
```

Health check endpoint:

```bash
GET /api/health
```

## 5) Put Cloudflare in front

1. Add your domain to Cloudflare.
2. Point DNS `A`/`CNAME` to your Node host.
3. Keep proxy enabled (orange cloud).
4. Enable SSL/TLS Full (strict).
5. Ensure WebSockets are enabled (default in Cloudflare).

## 6) Verify zero-regression behavior

1. Admin routes load: `/admin/dashboard`, `/admin/menu`, `/admin/settings`.
2. TV routes load: `/screen/main/1`, `/screen/main/2`, `/screen/main/3`, `/screen/sushi/1`, `/screen/sushi/2`.
3. WebSocket updates work after Push to Screens.
4. Boss and manager panels work.
5. Database reads/writes work with Supabase data.

## 7) If you want full Cloudflare runtime later

That is a second phase and requires code adaptation away from VM-style Express server patterns. Do this only after the no-change migration is stable.
