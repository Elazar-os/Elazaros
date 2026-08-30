import type { Express } from "express";
import { createServer, type Server } from "http";
import path from "path";
import express from "express";
import fs from "fs";
import { WebSocketServer, WebSocket } from "ws";
import { storage, invalidateCache } from "./storage";
import { insertMenuItemSchema, updateMenuItemSchema, insertScreenSchema, updateScreenSchema, configSchema } from "@shared/schema";
import { parseVoiceCommand, findBestMatch } from "./voiceParser";
import { setupAuth, registerAuthRoutes, isAuthenticated, getSessionUser } from "./replit_integrations/auth";
import { rateLimit } from "./security";
import { installApiAuthGuard } from "./apiGuard";
import { getDefaultMenuData } from "./menuSeed";

import crypto from "crypto";

const wsClients = new Set<WebSocket>();
const managerTokens = new Map<string, { name: string; expires: number }>();

let screenVersion = Date.now();
let screenFrozen = false;
let screenFeatured: { name: string; description: string; price: string } | null = null;
let campfireEnabled = true;
let closingTime = false;
let closingVolume = 0.3;
let birthdayName: string | null = null;

function bumpVersion() {
  screenVersion = Date.now();
}

function generateManagerToken(name: string): string {
  const token = crypto.randomBytes(32).toString('hex');
  managerTokens.set(token, { name, expires: Date.now() + 8 * 60 * 60 * 1000 });
  return token;
}

function validateManagerToken(token: string | undefined): boolean {
  if (!token) return false;
  const entry = managerTokens.get(token);
  if (!entry) return false;
  if (Date.now() > entry.expires) {
    managerTokens.delete(token);
    return false;
  }
  return true;
}

function broadcast(message: object) {
  const data = JSON.stringify(message);
  wsClients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(data);
    }
  });
}

const publicPath = path.join(process.cwd(), 'public');

async function ensureDataSeeded() {
  try {
    const items = await storage.getAllMenuItems();
    if (items.length === 0) {
      console.log('Seeding database with default menu data...');
      const defaultData = getDefaultMenuData();
      await storage.bulkCreateMenuItems(defaultData);
      console.log(`Seeded ${defaultData.length} menu items`);
    }
  } catch (error) {
    console.error('Database seeding error (will retry on next request):', error);
  }
}

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  
  try {
    await setupAuth(app);
    registerAuthRoutes(app);
  } catch (error) {
    console.error('Auth setup error:', error);
    if (process.env.NODE_ENV === "production") throw error;
  }

  installApiAuthGuard(app, validateManagerToken);
  
  await ensureDataSeeded();

  app.get('/manifest.json', (_req, res) => {
    const manifestPath = path.join(publicPath, 'manifest.json');
    if (fs.existsSync(manifestPath)) {
      res.set('Content-Type', 'application/manifest+json');
      res.sendFile(manifestPath);
    } else {
      res.status(404).send();
    }
  });

  app.get('/screen-manifest.json', (_req, res) => {
    const manifestPath = path.join(publicPath, 'screen-manifest.json');
    if (fs.existsSync(manifestPath)) {
      res.set('Content-Type', 'application/manifest+json');
      res.set('Cache-Control', 'no-cache');
      res.sendFile(manifestPath);
    } else {
      res.status(404).send();
    }
  });

  app.get('/boss-icon-192.svg', (_req, res) => {
    const iconPath = path.join(publicPath, 'boss-icon-192.svg');
    if (fs.existsSync(iconPath)) {
      res.set('Content-Type', 'image/svg+xml');
      res.sendFile(iconPath);
    } else {
      res.status(404).send();
    }
  });

  app.get('/sw.js', (_req, res) => {
    const swPath = fs.existsSync(path.join(publicPath, 'sw.js'))
      ? path.join(publicPath, 'sw.js')
      : path.join(process.cwd(), 'dist', 'public', 'sw.js');
    res.set('Cache-Control', 'no-cache');
    res.set('Content-Type', 'application/javascript');
    res.sendFile(swPath);
  });

  app.get('/menu-*.json', (req, res) => {
    const fileName = req.path.slice(1);
    const filePath = fs.existsSync(path.join(publicPath, fileName))
      ? path.join(publicPath, fileName)
      : path.join(process.cwd(), 'dist', 'public', fileName);
    if (fs.existsSync(filePath)) {
      res.set('Cache-Control', 'no-store, no-cache, must-revalidate');
      res.sendFile(filePath);
    } else {
      res.status(404).json({ error: 'Not found' });
    }
  });

  if (process.env.NODE_ENV !== 'production' && fs.existsSync(publicPath)) {
    app.get(['/styles.css', '/app.js'], (req, res) => {
      const filePath = path.join(publicPath, req.path.slice(1));
      res.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
      res.set('Pragma', 'no-cache');
      res.set('Expires', '0');
      res.sendFile(filePath);
    });
    
    app.use('/screen', express.static(publicPath, {
      maxAge: '1d',
      etag: true,
      lastModified: true,
      setHeaders: (res, filePath) => {
        if (filePath.endsWith('.css') || filePath.endsWith('.js')) {
          res.setHeader('Cache-Control', 'public, max-age=86400');
        }
      }
    }));
    
    app.get('/screen/:type/:number', (_req, res) => {
      res.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
      res.set('Pragma', 'no-cache');
      res.set('Expires', '0');
      res.sendFile(path.join(publicPath, 'screen.html'));
    });
  }

  app.get('/api/menu', async (req, res) => {
    try {
      const { screentype, screennumber } = req.query;
      
      let data;
      if (screentype && screennumber) {
        data = await storage.getMenuItemsByScreen(
          screentype as string,
          parseInt(screennumber as string)
        );
        data = data.filter(item => item.enabled);
      } else {
        data = await storage.getAllMenuItems();
        data = data.filter(item => item.enabled);
      }

      const allCategories = await storage.getAllCategories();
      const categoryDescMap: Record<string, string> = {};
      for (const cat of allCategories) {
        if (cat.description) {
          categoryDescMap[cat.name] = cat.description;
        }
      }

      const formattedData = data.map(item => {
        let price: string | number = item.price;
        if (item.price.includes('/') || item.price.includes('$')) {
          price = item.price;
        } else {
          price = parseFloat(item.price) || 0;
        }
        return {
          id: item.id,
          item_name: item.name,
          name: item.name,
          description: item.description,
          price,
          category: item.category,
          category_description: categoryDescMap[item.category] || null,
          screen_type: item.screenType,
          screen_number: item.screenNumber,
          priority: item.priority,
          enabled: item.enabled
        };
      });
      
      res.json({
        success: true,
        data: formattedData,
        categories: allCategories,
        timestamp: new Date().toISOString()
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  });

  app.get('/api/menu-items', async (req, res) => {
    try {
      const items = await storage.getAllMenuItems();
      res.json(items);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post('/api/manager/verify-pin', rateLimit({
    keyPrefix: "manager-pin",
    max: 8,
    windowMs: 15 * 60 * 1000,
    message: "Too many PIN attempts. Try again later.",
  }), async (req, res) => {
    try {
      const { pin } = req.body;
      if (!pin || typeof pin !== 'string' || pin.length !== 4) {
        return res.status(400).json({ error: 'PIN must be 4 digits' });
      }
      const manager = await storage.verifyManagerPin(pin);
      if (!manager) {
        return res.status(401).json({ error: 'Invalid PIN' });
      }
      const token = generateManagerToken(manager.name);
      res.json({ success: true, name: manager.name, token });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post('/api/manager/toggle-86', async (req, res) => {
    try {
      const authHeader = req.headers.authorization;
      const token = authHeader?.replace('Bearer ', '');
      if (!validateManagerToken(token)) {
        return res.status(401).json({ error: 'Invalid or expired manager token' });
      }
      const { id, enabled } = req.body;
      if (typeof id !== 'number' || typeof enabled !== 'boolean') {
        return res.status(400).json({ error: 'id (number) and enabled (boolean) required' });
      }
      const item = await storage.updateMenuItemEnabled(id, enabled);
      invalidateCache();
      await generateStaticMenuJSON();
      bumpVersion();
      broadcast({ type: 'MENU_UPDATE' });
      res.json(item);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get('/api/menu-items/:id', async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const item = await storage.getMenuItem(id);
      if (!item) {
        return res.status(404).json({ error: 'Menu item not found' });
      }
      res.json(item);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post('/api/menu-items', async (req, res) => {
    try {
      const parsed = insertMenuItemSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: parsed.error.message });
      }
      const item = await storage.createMenuItem(parsed.data);
      invalidateCache();
      await generateStaticMenuJSON();
      bumpVersion();
      broadcast({ type: 'MENU_UPDATE' });
      res.status(201).json(item);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.patch('/api/menu-items/:id', async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const parsed = updateMenuItemSchema.safeParse({ ...req.body, id });
      if (!parsed.success) {
        return res.status(400).json({ error: parsed.error.message });
      }
      const item = await storage.updateMenuItem(parsed.data);
      invalidateCache();
      await generateStaticMenuJSON();
      bumpVersion();
      broadcast({ type: 'PRICE_UPDATE', id: item.id, name: item.name, price: item.price, newPrice: item.price });
      broadcast({ type: 'MENU_UPDATE' });
      res.json(item);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.patch('/api/menu-items/:id/enabled', async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const { enabled } = req.body;
      if (typeof enabled !== 'boolean') {
        return res.status(400).json({ error: 'enabled must be a boolean' });
      }
      const item = await storage.updateMenuItemEnabled(id, enabled);
      invalidateCache();
      await generateStaticMenuJSON();
      bumpVersion();
      broadcast({ type: 'MENU_UPDATE' });
      res.json(item);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.delete('/api/menu-items/:id', async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      await storage.deleteMenuItem(id);
      invalidateCache();
      await generateStaticMenuJSON();
      bumpVersion();
      broadcast({ type: 'MENU_UPDATE' });
      res.status(204).send();
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get('/api/screens', async (req, res) => {
    try {
      let screens = await storage.getAllScreens();
      if (screens.length === 0) {
        const defaultScreens = [
          { screenType: 'sushi', screenNumber: 1, name: 'Sushi Screen 1' },
          { screenType: 'sushi', screenNumber: 2, name: 'Sushi Screen 2' },
          { screenType: 'main', screenNumber: 1, name: 'Main Menu 1' },
          { screenType: 'main', screenNumber: 2, name: 'Main Menu 2' },
          { screenType: 'main', screenNumber: 3, name: 'Main Menu 3' },
        ];
        screens = await storage.bulkCreateScreens(defaultScreens);
      }
      res.json(screens);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get('/api/screens/:id', async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const screen = await storage.getScreen(id);
      if (!screen) {
        return res.status(404).json({ error: 'Screen not found' });
      }
      res.json(screen);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post('/api/screens', async (req, res) => {
    try {
      const parsed = insertScreenSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: parsed.error.message });
      }
      const screen = await storage.createScreen(parsed.data);
      res.status(201).json(screen);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.patch('/api/screens/:id', async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const parsed = updateScreenSchema.safeParse({ ...req.body, id });
      if (!parsed.success) {
        return res.status(400).json({ error: parsed.error.message });
      }
      const screen = await storage.updateScreen(parsed.data);
      res.json(screen);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get('/api/categories', async (req, res) => {
    try {
      const { menuType } = req.query;
      let cats;
      if (menuType && typeof menuType === 'string') {
        cats = await storage.getCategoriesByMenuType(menuType);
      } else {
        cats = await storage.getAllCategories();
      }
      res.json(cats);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.patch('/api/categories/:id', async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const updated = await storage.updateCategory({ ...req.body, id });
      res.json(updated);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get('/api/config', async (req, res) => {
    try {
      const config = await storage.getConfig();
      res.json(config);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post('/api/config/update', async (req, res) => {
    try {
      const parsed = configSchema.partial().safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: parsed.error.message });
      }
      const config = await storage.updateConfig(parsed.data);
      bumpVersion();
      broadcast({ type: 'CONFIG_UPDATE', config });
      res.json(config);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get('/api/managers', async (_req, res) => {
    try {
      const allManagers = await storage.getAllManagers();
      res.json(allManagers);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post('/api/managers', async (req, res) => {
    try {
      const { name, pin, role } = req.body;
      if (!name || typeof name !== 'string' || name.trim().length === 0) {
        return res.status(400).json({ error: 'Name is required' });
      }
      if (!pin || typeof pin !== 'string' || !/^\d{4}$/.test(pin)) {
        return res.status(400).json({ error: 'PIN must be exactly 4 digits' });
      }
      const validRoles = ['developer', 'boss', 'manager'];
      const assignedRole = validRoles.includes(role) ? role : 'manager';
      const manager = await storage.createManager({ name: name.trim(), pin, role: assignedRole });
      res.json(manager);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.patch('/api/managers/:id', async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const { name, pin, role } = req.body;
      const updates: any = { id };
      if (name && typeof name === 'string') updates.name = name.trim();
      if (pin && typeof pin === 'string' && /^\d{4}$/.test(pin)) updates.pin = pin;
      const validRoles = ['developer', 'boss', 'manager'];
      if (role && validRoles.includes(role)) updates.role = role;
      const manager = await storage.updateManager(updates);
      res.json(manager);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.delete('/api/managers/:id', async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      await storage.deleteManager(id);
      res.status(204).send();
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get('/api/invite-codes', async (_req, res) => {
    try {
      const codes = await storage.getAllInviteCodes();
      res.json(codes);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post('/api/invite-codes', async (_req, res) => {
    try {
      const code = crypto.randomBytes(10).toString("hex").toUpperCase();
      const invite = await storage.createInviteCode(code);
      res.json(invite);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post('/api/invite-codes/verify', rateLimit({
    keyPrefix: "invite-verify",
    max: 10,
    windowMs: 15 * 60 * 1000,
    message: "Too many invite attempts. Try again later.",
  }), async (req, res) => {
    try {
      const { code, deviceId } = req.body;
      if (!code || !deviceId) {
        return res.status(400).json({ error: 'Code and deviceId required' });
      }
      const result = await storage.useInviteCode(code, deviceId);
      if (!result) {
        return res.status(401).json({ error: 'Invalid or already used invite code' });
      }
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  async function generateStaticMenuJSON() {
    const allCategories = await storage.getAllCategories();
    const categoryDescMap: Record<string, string> = {};
    for (const cat of allCategories) {
      if (cat.description) categoryDescMap[cat.name] = cat.description;
    }

    const screenConfigs = [
      { type: 'main', number: 1 },
      { type: 'main', number: 2 },
      { type: 'main', number: 3 },
      { type: 'sushi', number: 1 },
      { type: 'sushi', number: 2 },
    ];

    for (const sc of screenConfigs) {
      const data = await storage.getMenuItemsByScreen(sc.type, sc.number);
      const formatted = data.map(item => {
        let price: string | number = item.price;
        if (!item.price.includes('/') && !item.price.includes('$')) {
          price = parseFloat(item.price) || 0;
        }
        return {
          id: item.id,
          item_name: item.name,
          name: item.name,
          description: item.description,
          price,
          category: item.category,
          category_description: categoryDescMap[item.category] || null,
          screen_type: item.screenType,
          screen_number: item.screenNumber,
          priority: item.priority,
          enabled: item.enabled
        };
      });
      const json = JSON.stringify({ success: true, data: formatted, categories: allCategories, timestamp: new Date().toISOString() });
      fs.writeFileSync(path.join(publicPath, `menu-${sc.type}-${sc.number}.json`), json);
    }
  }

  app.get('/api/screen-state', (_req, res) => {
    res.json({ version: screenVersion, frozen: screenFrozen, featured: screenFeatured, campfireEnabled, closingTime, closingVolume, birthday: birthdayName });
  });

  app.post('/api/refresh-screens', async (_req, res) => {
    try {
      invalidateCache();
      await generateStaticMenuJSON();
      bumpVersion();
      broadcast({ type: 'MENU_UPDATE' });
      res.json({ success: true, message: 'Cache cleared, static files generated, screens will refresh' });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post('/api/freeze-screens', async (_req, res) => {
    try {
      screenFrozen = true;
      bumpVersion();
      broadcast({ type: 'FREEZE_SCREEN' });
      res.json({ success: true, message: 'Screens frozen' });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post('/api/unfreeze-screens', async (_req, res) => {
    try {
      screenFrozen = false;
      bumpVersion();
      broadcast({ type: 'UNFREEZE_SCREEN' });
      res.json({ success: true, message: 'Screens unfrozen' });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post('/api/birthday', async (req, res) => {
    try {
      const { name, action } = req.body || {};
      if (action === 'off' || action === 'clear' || action === 'stop') {
        birthdayName = null;
        bumpVersion();
        broadcast({ type: 'BIRTHDAY_CLEAR' });
        return res.json({ success: true, message: 'Birthday cleared' });
      }
      birthdayName = (typeof name === 'string' && name.trim()) ? name.trim() : 'Happy Birthday';
      bumpVersion();
      broadcast({ type: 'BIRTHDAY_UPDATE', name: birthdayName });
      res.json({ success: true, name: birthdayName });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post('/api/voice-command', async (req, res) => {
    try {
      const { command } = req.body;
      if (!command || typeof command !== 'string') {
        return res.status(400).json({ error: 'Command required' });
      }
      
      const parsed = parseVoiceCommand(command);
      console.log('Voice command parsed:', parsed);
      
      if (parsed.type === 'theme') {
        let update: { activeTemplate?: string; activeTheme?: string } = {};
        if (parsed.theme === 'modernSushi') {
          update = { activeTemplate: 'featureList', activeTheme: 'modernSushi' };
        } else if (parsed.theme === 'delanceyClassic') {
          update = { activeTemplate: 'classicBoard', activeTheme: 'delanceyClassic' };
        } else if (parsed.theme === 'highContrastFast') {
          update = { activeTemplate: 'fastMenu', activeTheme: 'highContrastFast' };
        }
        const config = await storage.updateConfig(update);
        bumpVersion();
        broadcast({ type: 'CONFIG_UPDATE', config });
        return res.json({ success: true, action: 'theme_changed', config, message: `Switched to ${parsed.theme} theme` });
      }

      if (parsed.type === 'birthday') {
        if (parsed.action === 'off') {
          birthdayName = null;
          bumpVersion();
          broadcast({ type: 'BIRTHDAY_CLEAR' });
          return res.json({ success: true, action: 'birthday_clear', message: 'Birthday cleared' });
        }
        birthdayName = parsed.name || 'Happy Birthday';
        bumpVersion();
        broadcast({ type: 'BIRTHDAY_UPDATE', name: birthdayName });
        const label = birthdayName === 'Happy Birthday' ? 'Happy Birthday' : `Happy Birthday ${birthdayName}`;
        return res.json({ success: true, action: 'birthday', name: birthdayName, message: label });
      }
      
      if (parsed.type === 'disable' || parsed.type === 'enable') {
        const allItems = await storage.getAllMenuItems();
        const itemList = allItems.map((i: { id: number; name: string }) => ({ id: i.id, name: i.name }));
        const match = findBestMatch(parsed.itemName, itemList);
        
        if (!match.item) {
          return res.json({ success: false, message: `Could not find item matching "${parsed.itemName}"` });
        }
        
        const enabled = parsed.type === 'enable';
        await storage.updateMenuItemEnabled(match.item.id, enabled);
        invalidateCache();
        await generateStaticMenuJSON();
        bumpVersion();
        broadcast({ type: 'MENU_UPDATE' });
        
        const actionWord = enabled ? 'enabled' : '86\'d (disabled)';
        return res.json({ 
          success: true, 
          action: parsed.type, 
          item: match.item.name,
          confidence: match.confidence,
          message: `${match.item.name} has been ${actionWord}` 
        });
      }
      
      if (parsed.type === 'price') {
        if (!parsed.price || parsed.price === '0') {
          return res.json({ success: false, message: 'Please specify a price. Example: "change price of Dragon Roll to 15 dollars"' });
        }
        
        const allItems = await storage.getAllMenuItems();
        const itemList = allItems.map((i: { id: number; name: string }) => ({ id: i.id, name: i.name }));
        const match = findBestMatch(parsed.itemName, itemList);
        
        if (!match.item) {
          return res.json({ success: false, message: `Could not find item matching "${parsed.itemName}"` });
        }
        
        const priceValue = parsed.price.includes('.') ? parsed.price : `${parsed.price}.00`;
        await storage.updateMenuItem({ id: match.item.id, price: priceValue });
        invalidateCache();
        await generateStaticMenuJSON();
        bumpVersion();
        broadcast({ type: 'PRICE_UPDATE', id: match.item.id, name: match.item.name, price: priceValue, newPrice: priceValue });
        broadcast({ type: 'MENU_UPDATE' });
        
        return res.json({ 
          success: true, 
          action: 'price_updated', 
          item: match.item.name,
          newPrice: priceValue,
          confidence: match.confidence,
          message: `${match.item.name} price updated to $${priceValue}` 
        });
      }
      
      if (parsed.type === 'campfire') {
        campfireEnabled = parsed.action === 'on';
        bumpVersion();
        broadcast({ type: 'CAMPFIRE_UPDATE', enabled: campfireEnabled });
        return res.json({ 
          success: true, 
          action: 'campfire_toggled', 
          enabled: campfireEnabled,
          message: `Campfire turned ${campfireEnabled ? 'on' : 'off'}` 
        });
      }
      
      if (parsed.type === 'closing') {
        closingTime = parsed.action === 'on';
        bumpVersion();
        broadcast({ type: 'CLOSING_TIME', enabled: closingTime });
        return res.json({ 
          success: true, 
          action: 'closing_time', 
          enabled: closingTime,
          message: closingTime ? 'Closing time activated' : 'Closing time deactivated'
        });
      }
      
      if (parsed.type === 'volume') {
        const vol = Math.max(0, Math.min(1, parsed.volume / 100));
        closingVolume = vol;
        bumpVersion();
        broadcast({ type: 'VOLUME_UPDATE', volume: closingVolume });
        return res.json({ 
          success: true, 
          action: 'volume_changed', 
          volume: Math.round(vol * 100),
          message: `Volume set to ${Math.round(vol * 100)}%`
        });
      }
      
      return res.json({ success: false, message: 'Command not recognized. Try "86 Dragon Roll" or "play birthday for Sarah"' });
    } catch (error: any) {
      console.error('Voice command error:', error);
      res.status(500).json({ error: error.message });
    }
  });

  app.post('/api/featured', async (req, res) => {
    try {
      const { name, description, price } = req.body;
      if (!name) return res.status(400).json({ error: 'Name required' });
      screenFeatured = { name, description: description || '', price: price || '' };
      bumpVersion();
      broadcast({ type: 'FEATURED_UPDATE', data: screenFeatured });
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post('/api/featured/clear', async (req, res) => {
    try {
      screenFeatured = null;
      bumpVersion();
      broadcast({ type: 'FEATURED_CLEAR' });
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  const wss = new WebSocketServer({ server: httpServer, path: '/ws' });
  
  wss.on('connection', (ws) => {
    wsClients.add(ws);
    storage.getConfig().then((config) => {
      ws.send(JSON.stringify({ type: 'CONFIG_UPDATE', config }));
    });
    ws.on('close', () => {
      wsClients.delete(ws);
    });
  });

  generateStaticMenuJSON().catch(err => console.log('Initial static menu generation:', err.message));

  return httpServer;
}
