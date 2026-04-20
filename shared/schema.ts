import { pgTable, text, boolean, serial, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const appConfig = pgTable("app_config", {
  id: serial("id").primaryKey(),
  key: text("key").notNull().unique(),
  value: text("value").notNull(),
});

export const screens = pgTable("screens", {
  id: serial("id").primaryKey(),
  screenType: text("screen_type").notNull(),
  screenNumber: integer("screen_number").notNull(),
  name: text("name").notNull(),
});

export const categories = pgTable("categories", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  menuType: text("menu_type"),
  displayOrder: integer("display_order"),
  screenType: text("screen_type").default("main"),
  screenNumber: integer("screen_number").default(1),
});

export const menuItems = pgTable("menu_items", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  price: text("price").notNull(),
  category: text("category").notNull(),
  screenType: text("screen_type").notNull(),
  screenNumber: integer("screen_number").notNull().default(1),
  priority: integer("priority").notNull().default(0),
  enabled: boolean("enabled").notNull().default(true),
});

export const insertScreenSchema = createInsertSchema(screens).omit({
  id: true,
});

export const updateScreenSchema = insertScreenSchema.partial().extend({
  id: z.number(),
});

export const insertCategorySchema = createInsertSchema(categories).omit({
  id: true,
});

export const updateCategorySchema = insertCategorySchema.partial().extend({
  id: z.number(),
});

export const insertMenuItemSchema = createInsertSchema(menuItems).omit({
  id: true,
});

export const updateMenuItemSchema = insertMenuItemSchema.partial().extend({
  id: z.number(),
});

export type Screen = typeof screens.$inferSelect;
export type InsertScreen = z.infer<typeof insertScreenSchema>;
export type UpdateScreen = z.infer<typeof updateScreenSchema>;

export type Category = typeof categories.$inferSelect;
export type InsertCategory = z.infer<typeof insertCategorySchema>;
export type UpdateCategory = z.infer<typeof updateCategorySchema>;

export type MenuItem = typeof menuItems.$inferSelect;
export type InsertMenuItem = z.infer<typeof insertMenuItemSchema>;
export type UpdateMenuItem = z.infer<typeof updateMenuItemSchema>;

export const managers = pgTable("managers", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  pin: text("pin").notNull(),
  role: text("role").notNull().default("manager"),
});

export const insertManagerSchema = createInsertSchema(managers).omit({ id: true });
export const updateManagerSchema = insertManagerSchema.partial().extend({ id: z.number() });
export type Manager = typeof managers.$inferSelect;
export type InsertManager = z.infer<typeof insertManagerSchema>;
export type UpdateManager = z.infer<typeof updateManagerSchema>;

export const bossInviteCodes = pgTable("boss_invite_codes", {
  id: serial("id").primaryKey(),
  code: text("code").notNull().unique(),
  used: boolean("used").notNull().default(false),
  usedBy: text("used_by"),
});

export type BossInviteCode = typeof bossInviteCodes.$inferSelect;

export type AppConfig = typeof appConfig.$inferSelect;

export const configSchema = z.object({
  activeTemplate: z.string().default("classicBoard"),
  activeTheme: z.string().default("delanceyClassic"),
  sushiTheme: z.string().default("sushi-classic"),
  mainTheme: z.string().default("main-midnight"),
});

export type ConfigData = z.infer<typeof configSchema>;

export * from "./models/auth";
