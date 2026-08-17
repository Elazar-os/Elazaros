import express, { type Express } from "express";
import fs from "fs";
import path from "path";

function setNoCache(res: express.Response) {
  res.set("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
  res.set("Pragma", "no-cache");
  res.set("Expires", "0");
}

export function serveStatic(app: Express) {
  const basePath = process.cwd();
  const publicPath = path.resolve(basePath, "dist", "public");
  
  if (fs.existsSync(publicPath)) {
    // Screen routes for TV displays (serve screen.html with no-cache)
    app.get('/screen/:type/:number', (_req, res) => {
      setNoCache(res);
      res.sendFile(path.resolve(publicPath, 'screen.html'));
    });
    
    // Serve TV display assets (styles.css, app.js) with no-cache headers
    app.get(['/styles.css', '/app.js'], (req, res) => {
      const filePath = path.resolve(publicPath, req.path.slice(1));
      setNoCache(res);
      res.sendFile(filePath);
    });

    // Menu JSON must not be cached long — screens need fresh prices after voice/admin updates
    app.get('/menu-*.json', (req, res, next) => {
      const fileName = req.path.slice(1);
      const filePath = path.resolve(publicPath, fileName);
      if (fs.existsSync(filePath)) {
        setNoCache(res);
        res.sendFile(filePath);
      } else {
        next();
      }
    });
    
    // Control center route (optional access to the legacy control panel)
    app.get('/control-center', (_req, res) => {
      const controlCenterPath = path.resolve(publicPath, 'control-center.html');
      if (fs.existsSync(controlCenterPath)) {
        setNoCache(res);
        res.sendFile(controlCenterPath);
      } else {
        res.redirect('/');
      }
    });
    
    // Hashed Vite assets (JS/CSS with content hash) can be cached long-term
    app.use(express.static(publicPath, {
      maxAge: '1y',
      immutable: true,
      setHeaders: (res, filePath) => {
        // Never cache HTML — always revalidate so deploys show without Ctrl+Shift+R
        if (filePath.endsWith('.html')) {
          setNoCache(res);
        }
        // Service worker must always be fresh
        if (filePath.endsWith('sw.js') || filePath.endsWith('manifest.json')) {
          setNoCache(res);
        }
      },
    }));
    
    app.get('/admin', (_req, res) => {
      setNoCache(res);
      res.sendFile(path.resolve(publicPath, "index.html"));
    });

    app.get('/admin/*', (_req, res) => {
      setNoCache(res);
      res.sendFile(path.resolve(publicPath, "index.html"));
    });
    
    app.get('/Admin', (_req, res) => {
      res.redirect('/admin');
    });
    
    app.get('/database', (_req, res) => {
      setNoCache(res);
      res.sendFile(path.resolve(publicPath, "index.html"));
    });
    
    // Fall through to React app for all other routes (SPA routing)
    // Always no-cache index.html so Boss/Admin updates appear after deploy without hard refresh
    app.use("*", (_req, res) => {
      setNoCache(res);
      res.sendFile(path.resolve(publicPath, "index.html"));
    });
  } else {
    console.warn("Client build not found at", publicPath);
  }
}
