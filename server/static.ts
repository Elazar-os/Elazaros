import express, { type Express } from "express";
import fs from "fs";
import path from "path";

export function serveStatic(app: Express) {
  const basePath = process.cwd();
  const publicPath = path.resolve(basePath, "dist", "public");
  
  if (fs.existsSync(publicPath)) {
    // Screen routes for TV displays (serve screen.html with no-cache)
    app.get('/screen/:type/:number', (_req, res) => {
      res.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
      res.set('Pragma', 'no-cache');
      res.set('Expires', '0');
      res.sendFile(path.resolve(publicPath, 'screen.html'));
    });
    
    // Serve TV display assets (styles.css, app.js) with no-cache headers
    app.get(['/styles.css', '/app.js'], (req, res) => {
      const filePath = path.resolve(publicPath, req.path.slice(1));
      res.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
      res.set('Pragma', 'no-cache');
      res.set('Expires', '0');
      res.sendFile(filePath);
    });
    
    // Control center route (optional access to the legacy control panel)
    app.get('/control-center', (_req, res) => {
      const controlCenterPath = path.resolve(publicPath, 'control-center.html');
      if (fs.existsSync(controlCenterPath)) {
        res.sendFile(controlCenterPath);
      } else {
        res.redirect('/');
      }
    });
    
    // Serve static assets (CSS, JS, images)
    app.use(express.static(publicPath));
    
    app.get('/admin', (_req, res) => {
      res.sendFile(path.resolve(publicPath, "index.html"));
    });

    app.get('/admin/*', (_req, res) => {
      res.sendFile(path.resolve(publicPath, "index.html"));
    });
    
    app.get('/Admin', (_req, res) => {
      res.redirect('/admin');
    });
    
    app.get('/database', (_req, res) => {
      res.sendFile(path.resolve(publicPath, "index.html"));
    });
    
    // Fall through to React app for all other routes (SPA routing)
    app.use("*", (_req, res) => {
      res.sendFile(path.resolve(publicPath, "index.html"));
    });
  } else {
    console.warn("Client build not found at", publicPath);
  }
}
