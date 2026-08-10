import { db } from "../db";
import { menuItems, screens, appConfig, categories, managers, bossInviteCodes, type MenuItem, type InsertMenuItem, type UpdateMenuItem, type Screen, type InsertScreen, type UpdateScreen, type ConfigData, type Category, type InsertCategory, type UpdateCategory, type Manager, type InsertManager, type UpdateManager, type BossInviteCode } from "@shared/schema";
import { eq, and, asc } from "drizzle-orm";
import { hashSecret, verifySecret, isHashed } from "./security";

interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

const CACHE_TTL = 3600000;

const cache = {
  menuItems: null as CacheEntry<MenuItem[]> | null,
  menuItemsByScreen: new Map<string, CacheEntry<MenuItem[]>>(),
  screens: null as CacheEntry<Screen[]> | null,
  config: null as CacheEntry<ConfigData> | null,
  categories: null as CacheEntry<Category[]> | null,
};

function isCacheValid<T>(entry: CacheEntry<T> | null): entry is CacheEntry<T> {
  if (!entry) return false;
  return Date.now() - entry.timestamp < CACHE_TTL;
}

export function invalidateCache() {
  cache.menuItems = null;
  cache.menuItemsByScreen.clear();
  cache.screens = null;
  cache.config = null;
  cache.categories = null;
}

function invalidateMenuCache() {
  cache.menuItems = null;
  cache.menuItemsByScreen.clear();
}

export interface IStorage {
  getAllScreens(): Promise<Screen[]>;
  getScreen(id: number): Promise<Screen | undefined>;
  createScreen(screen: InsertScreen): Promise<Screen>;
  updateScreen(screen: UpdateScreen): Promise<Screen>;
  bulkCreateScreens(items: InsertScreen[]): Promise<Screen[]>;

  getAllMenuItems(): Promise<MenuItem[]>;
  getMenuItemsByScreen(screenType: string, screenNumber: number): Promise<MenuItem[]>;
  getMenuItem(id: number): Promise<MenuItem | undefined>;
  createMenuItem(item: InsertMenuItem): Promise<MenuItem>;
  updateMenuItem(item: UpdateMenuItem): Promise<MenuItem>;
  deleteMenuItem(id: number): Promise<void>;
  updateMenuItemEnabled(id: number, enabled: boolean): Promise<MenuItem>;
  bulkCreateMenuItems(items: InsertMenuItem[]): Promise<MenuItem[]>;

  getAllCategories(): Promise<Category[]>;
  getCategoriesByMenuType(menuType: string): Promise<Category[]>;
  updateCategory(category: UpdateCategory): Promise<Category>;

  getConfig(): Promise<ConfigData>;
  setConfig(key: string, value: string): Promise<void>;
  updateConfig(config: Partial<ConfigData>): Promise<ConfigData>;

  verifyManagerPin(pin: string): Promise<Manager | null>;
  getAllManagers(): Promise<Omit<Manager, "pin">[]>;
  createManager(manager: InsertManager): Promise<Omit<Manager, "pin">>;
  updateManager(manager: UpdateManager): Promise<Omit<Manager, "pin">>;
  deleteManager(id: number): Promise<void>;

  getAllInviteCodes(): Promise<BossInviteCode[]>;
  createInviteCode(code: string): Promise<BossInviteCode>;
  useInviteCode(code: string, deviceId: string): Promise<BossInviteCode | null>;
}

function stripPin(manager: Manager): Omit<Manager, "pin"> {
  const { pin: _pin, ...rest } = manager;
  return rest;
}

export class DatabaseStorage implements IStorage {
  async getAllScreens(): Promise<Screen[]> {
    if (isCacheValid(cache.screens)) {
      return cache.screens.data;
    }
    const data = await db.select().from(screens);
    cache.screens = { data, timestamp: Date.now() };
    return data;
  }

  async getScreen(id: number): Promise<Screen | undefined> {
    const result = await db.select().from(screens).where(eq(screens.id, id));
    return result[0];
  }

  async createScreen(screen: InsertScreen): Promise<Screen> {
    const result = await db.insert(screens).values(screen).returning();
    cache.screens = null;
    return result[0];
  }

  async updateScreen(screen: UpdateScreen): Promise<Screen> {
    const { id, ...updates } = screen;
    const result = await db.update(screens)
      .set(updates)
      .where(eq(screens.id, id))
      .returning();
    cache.screens = null;
    return result[0];
  }

  async bulkCreateScreens(items: InsertScreen[]): Promise<Screen[]> {
    if (items.length === 0) return [];
    const result = await db.insert(screens).values(items).returning();
    cache.screens = null;
    return result;
  }

  async getAllMenuItems(): Promise<MenuItem[]> {
    if (isCacheValid(cache.menuItems)) {
      return cache.menuItems.data;
    }
    const data = await db.select().from(menuItems).orderBy(asc(menuItems.priority));
    cache.menuItems = { data, timestamp: Date.now() };
    return data;
  }

  async getMenuItemsByScreen(screenType: string, screenNumber: number): Promise<MenuItem[]> {
    const cacheKey = `${screenType}_${screenNumber}`;
    const cached = cache.menuItemsByScreen.get(cacheKey) || null;
    if (isCacheValid(cached)) {
      return cached.data;
    }
    const data = await db.select()
      .from(menuItems)
      .where(and(
        eq(menuItems.screenType, screenType),
        eq(menuItems.screenNumber, screenNumber),
        eq(menuItems.enabled, true)
      ))
      .orderBy(asc(menuItems.priority));
    cache.menuItemsByScreen.set(cacheKey, { data, timestamp: Date.now() });
    return data;
  }

  async getMenuItem(id: number): Promise<MenuItem | undefined> {
    const result = await db.select().from(menuItems).where(eq(menuItems.id, id));
    return result[0];
  }

  async createMenuItem(item: InsertMenuItem): Promise<MenuItem> {
    const result = await db.insert(menuItems).values(item).returning();
    invalidateMenuCache();
    return result[0];
  }

  async updateMenuItem(item: UpdateMenuItem): Promise<MenuItem> {
    const { id, ...updates } = item;
    const result = await db.update(menuItems)
      .set(updates)
      .where(eq(menuItems.id, id))
      .returning();
    invalidateMenuCache();
    return result[0];
  }

  async deleteMenuItem(id: number): Promise<void> {
    await db.delete(menuItems).where(eq(menuItems.id, id));
    invalidateMenuCache();
  }

  async updateMenuItemEnabled(id: number, enabled: boolean): Promise<MenuItem> {
    const result = await db.update(menuItems)
      .set({ enabled })
      .where(eq(menuItems.id, id))
      .returning();
    invalidateMenuCache();
    return result[0];
  }

  async bulkCreateMenuItems(items: InsertMenuItem[]): Promise<MenuItem[]> {
    if (items.length === 0) return [];
    const result = await db.insert(menuItems).values(items).returning();
    invalidateMenuCache();
    return result;
  }

  async getAllCategories(): Promise<Category[]> {
    if (isCacheValid(cache.categories)) {
      return cache.categories.data;
    }
    const data = await db.select().from(categories).orderBy(asc(categories.displayOrder));
    cache.categories = { data, timestamp: Date.now() };
    return data;
  }

  async getCategoriesByMenuType(menuType: string): Promise<Category[]> {
    return db.select().from(categories)
      .where(eq(categories.menuType, menuType))
      .orderBy(asc(categories.displayOrder));
  }

  async updateCategory(category: UpdateCategory): Promise<Category> {
    const { id, ...updates } = category;
    const result = await db.update(categories)
      .set(updates)
      .where(eq(categories.id, id))
      .returning();
    cache.categories = null;
    return result[0];
  }

  async getConfig(): Promise<ConfigData> {
    if (isCacheValid(cache.config)) {
      return cache.config.data;
    }
    const rows = await db.select().from(appConfig);
    const config: ConfigData = {
      activeTemplate: "classicBoard",
      activeTheme: "delanceyClassic",
      sushiTheme: "sushi-classic",
      mainTheme: "main-midnight",
    };
    for (const row of rows) {
      if (row.key === "activeTemplate") config.activeTemplate = row.value;
      if (row.key === "activeTheme") config.activeTheme = row.value;
      if (row.key === "sushiTheme") config.sushiTheme = row.value;
      if (row.key === "mainTheme") config.mainTheme = row.value;
    }
    cache.config = { data: config, timestamp: Date.now() };
    return config;
  }

  async setConfig(key: string, value: string): Promise<void> {
    const existing = await db.select().from(appConfig).where(eq(appConfig.key, key));
    if (existing.length > 0) {
      await db.update(appConfig).set({ value }).where(eq(appConfig.key, key));
    } else {
      await db.insert(appConfig).values({ key, value });
    }
    cache.config = null;
  }

  async updateConfig(config: Partial<ConfigData>): Promise<ConfigData> {
    if (config.activeTemplate) {
      await this.setConfig("activeTemplate", config.activeTemplate);
    }
    if (config.activeTheme) {
      await this.setConfig("activeTheme", config.activeTheme);
    }
    if (config.sushiTheme) {
      await this.setConfig("sushiTheme", config.sushiTheme);
    }
    if (config.mainTheme) {
      await this.setConfig("mainTheme", config.mainTheme);
    }
    return this.getConfig();
  }

  async verifyManagerPin(pin: string): Promise<Manager | null> {
    const all = await db.select().from(managers);
    for (const manager of all) {
      const ok = await verifySecret(pin, manager.pin);
      if (!ok) continue;

      // Upgrade legacy plaintext PIN to bcrypt on successful login
      if (!isHashed(manager.pin)) {
        const hashed = await hashSecret(pin);
        await db.update(managers).set({ pin: hashed }).where(eq(managers.id, manager.id));
        return { ...manager, pin: hashed };
      }

      return manager;
    }
    return null;
  }

  async getAllManagers(): Promise<Omit<Manager, "pin">[]> {
    const rows = await db.select().from(managers);
    return rows.map(stripPin);
  }

  async createManager(manager: InsertManager): Promise<Omit<Manager, "pin">> {
    const hashedPin = await hashSecret(manager.pin);
    const result = await db
      .insert(managers)
      .values({ ...manager, pin: hashedPin })
      .returning();
    return stripPin(result[0]);
  }

  async updateManager(manager: UpdateManager): Promise<Omit<Manager, "pin">> {
    const { id, ...updates } = manager;
    if (updates.pin) {
      updates.pin = await hashSecret(updates.pin);
    }
    const result = await db.update(managers)
      .set(updates)
      .where(eq(managers.id, id))
      .returning();
    return stripPin(result[0]);
  }

  async deleteManager(id: number): Promise<void> {
    await db.delete(managers).where(eq(managers.id, id));
  }

  async getAllInviteCodes(): Promise<BossInviteCode[]> {
    return db.select().from(bossInviteCodes);
  }

  async createInviteCode(code: string): Promise<BossInviteCode> {
    const result = await db.insert(bossInviteCodes).values({ code }).returning();
    return result[0];
  }

  async useInviteCode(code: string, deviceId: string): Promise<BossInviteCode | null> {
    const existing = await db.select().from(bossInviteCodes)
      .where(and(eq(bossInviteCodes.code, code), eq(bossInviteCodes.used, false)));
    if (existing.length === 0) return null;
    const result = await db.update(bossInviteCodes)
      .set({ used: true, usedBy: deviceId })
      .where(eq(bossInviteCodes.id, existing[0].id))
      .returning();
    return result[0];
  }
}

export const storage = new DatabaseStorage();
