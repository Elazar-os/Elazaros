import type { Express } from "express";
import { createServer, type Server } from "http";
import path from "path";
import express from "express";
import fs from "fs";
import { WebSocketServer, WebSocket } from "ws";
import { storage, invalidateCache } from "./storage";
import { insertMenuItemSchema, updateMenuItemSchema, insertScreenSchema, updateScreenSchema, configSchema } from "@shared/schema";
import { parseVoiceCommand, findBestMatch } from "./voiceParser";
import { setupAuth, registerAuthRoutes, isAuthenticated } from "./replit_integrations/auth";

import crypto from "crypto";

const wsClients = new Set<WebSocket>();
const managerTokens = new Map<string, { name: string; expires: number }>();

let screenVersion = Date.now();
let screenFrozen = false;
let screenFeatured: { name: string; description: string; price: string } | null = null;
let campfireEnabled = true;
let closingTime = false;

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

function getDefaultMenuData() {
  return [
    { name: 'Caesar Salad', description: 'Lettuce, grape tomatoes, red onion & croutons', price: '14.95', category: 'Salads', screenType: 'main', screenNumber: 1, priority: 27, enabled: true },
    { name: 'Grilled Chicken Salad', description: 'Lettuce, grape tomatoes, cucumbers, tri colored peppers, red cabbage & carrot', price: '22.95', category: 'Salads', screenType: 'main', screenNumber: 1, priority: 28, enabled: true },
    { name: 'Build Your Salad', description: 'Base of romaine lettuce, choose 4 toppings, choose dressings', price: '15.95', category: 'Salads', screenType: 'main', screenNumber: 1, priority: 29, enabled: true },
    { name: 'Chicken Noodle', description: 'Classic chicken noodle soup', price: '9.95', category: 'Soups', screenType: 'main', screenNumber: 1, priority: 22, enabled: true },
    { name: 'Mushroom Barley', description: 'Hearty mushroom barley soup', price: '9.95', category: 'Soups', screenType: 'main', screenNumber: 1, priority: 23, enabled: true },
    { name: 'Vegetable', description: 'Fresh vegetable soup', price: '9.95', category: 'Soups', screenType: 'main', screenNumber: 1, priority: 24, enabled: true },
    { name: 'Split Pea', description: 'Classic split pea soup', price: '9.95', category: 'Soups', screenType: 'main', screenNumber: 1, priority: 25, enabled: true },
    { name: 'Chicken Matzah Ball', description: 'Homemade matzah ball soup', price: '9.95', category: 'Soups', screenType: 'main', screenNumber: 1, priority: 27, enabled: true },
    { name: 'Broccoli Cauliflower', description: 'Fresh broccoli cauliflower soup', price: '9.95', category: 'Soups', screenType: 'main', screenNumber: 1, priority: 28, enabled: true },
    { name: 'Zucchini', description: 'Fresh zucchini soup', price: '9.95', category: 'Soups', screenType: 'main', screenNumber: 1, priority: 29, enabled: true },
    { name: 'Hot Dog Classic', description: 'All beef hot dog', price: '6.95', category: 'Starters', screenType: 'main', screenNumber: 1, priority: 1, enabled: true },
    { name: 'Foot Long Hot Dog', description: 'Extra long all beef hot dog', price: '12.95', category: 'Starters', screenType: 'main', screenNumber: 1, priority: 2, enabled: true },
    { name: 'Chili Dog', description: 'Hot dog topped with chili', price: '14.95', category: 'Starters', screenType: 'main', screenNumber: 1, priority: 3, enabled: true },
    { name: 'Bowl of Chili', description: 'Hearty beef chili', price: '10.95', category: 'Starters', screenType: 'main', screenNumber: 1, priority: 4, enabled: true },
    { name: 'Pastrami Egg Roll', description: 'Crispy egg roll with pastrami filling', price: '8.95', category: 'Starters', screenType: 'main', screenNumber: 1, priority: 5, enabled: true },
    { name: 'Pulled Beef Egg Roll', description: 'Crispy egg roll with pulled beef', price: '8.95', category: 'Starters', screenType: 'main', screenNumber: 1, priority: 6, enabled: true },
    { name: 'Blooming Onion', description: 'Breaded & fried onion, served w/ dijon mustard', price: '14.95', category: 'Starters', screenType: 'main', screenNumber: 1, priority: 7, enabled: true },
    { name: 'Grilled Vegetables', description: 'Assorted peppers and squash', price: '11.95', category: 'Starters', screenType: 'main', screenNumber: 1, priority: 8, enabled: true },
    { name: 'Poppers', description: 'Classic or Chipotle', price: '8pc $13.95 / 15pc $23.95', category: 'Starters', screenType: 'main', screenNumber: 1, priority: 9, enabled: true },
    { name: 'Corn Flake Chicken Fingers', description: 'Corn flake breaded chicken fingers', price: '15.95', category: 'Starters', screenType: 'main', screenNumber: 1, priority: 10, enabled: true },
    { name: 'Pretzel Chicken Fingers', description: 'Pretzel breaded chicken fingers', price: '15.95', category: 'Starters', screenType: 'main', screenNumber: 1, priority: 11, enabled: true },
    { name: 'Chicken Nuggets', description: 'Crispy chicken nuggets', price: '8pc $12.95 / 16pc $22.95', category: 'Starters', screenType: 'main', screenNumber: 1, priority: 12, enabled: true },
    { name: 'Grilled Chicken Wings', description: 'Grilled chicken wings', price: '14.95', category: 'Starters', screenType: 'main', screenNumber: 1, priority: 13, enabled: true },
    { name: 'Buffalo Wings', description: 'Spicy buffalo chicken wings', price: '12pc $16.95 / 24pc $28.95', category: 'Starters', screenType: 'main', screenNumber: 1, priority: 14, enabled: true },
    { name: 'Mix & Match Platter', description: 'Fire Poppers, Buffalo Wings & a Flower Onion', price: '31.95', category: 'Starters', screenType: 'main', screenNumber: 1, priority: 15, enabled: true },
    { name: 'Loaded Chili Fries', description: 'Fries topped with chili, chopped onion, jalapenos, chopped tomato & garlic aioli', price: '19.95', category: 'Starters', screenType: 'main', screenNumber: 1, priority: 16, enabled: true },
    { name: 'Loaded Beef Fries', description: 'Fries topped with pulled beef, chopped onion, jalapenos, chopped tomato & garlic aioli', price: '21.95', category: 'Starters', screenType: 'main', screenNumber: 1, priority: 17, enabled: true },
    { name: 'Loaded Chili Poppers', description: 'Chicken poppers topped with chili, chopped onion, jalapenos, chopped tomato & garlic aioli', price: '29.95', category: 'Starters', screenType: 'main', screenNumber: 1, priority: 18, enabled: true },
    { name: 'Loaded Beef Poppers', description: 'Chicken poppers topped with pulled beef, chopped onion, chopped tomato, jalapenos & garlic aioli', price: '29.95', category: 'Starters', screenType: 'main', screenNumber: 1, priority: 19, enabled: true },
    { name: 'Cauliflower Poppers', description: 'Crispy cauliflower bites', price: '19.95', category: 'Starters', screenType: 'main', screenNumber: 1, priority: 20, enabled: true },
    { name: 'Pulled Beef Gnocchi', description: 'Gnocchi topped with pulled beef, chopped onion, jalapenos, chopped tomatoes and garlic aioli', price: '28.95', category: 'Starters', screenType: 'main', screenNumber: 1, priority: 21, enabled: true },
    { name: 'Sesame Chicken w/ Rice', description: 'Sesame glazed chicken over rice', price: '19.95', category: 'Starters', screenType: 'main', screenNumber: 1, priority: 22, enabled: true },
    { name: 'Burger', description: '4oz homemade beef patty', price: '15.95', category: 'Burgers', screenType: 'main', screenNumber: 2, priority: 1, enabled: true },
    { name: 'Double Beef Burger', description: '2 x 4oz burgers & choice of french fries or baked potato', price: '21.95', category: 'Burgers', screenType: 'main', screenNumber: 2, priority: 2, enabled: true },
    { name: 'Delancey Burger', description: 'Oversized burger & choice of french fries or baked potato', price: '23.95', category: 'Burgers', screenType: 'main', screenNumber: 2, priority: 3, enabled: true },
    { name: 'Chili Burger', description: 'Oversized burger topped w/ chili & choice of french fries or baked potato', price: '27.95', category: 'Burgers', screenType: 'main', screenNumber: 2, priority: 4, enabled: true },
    { name: 'Kansas City Burger', description: 'Oversized burger topped w/ pulled brisket & choice of french fries or baked potato', price: '29.95', category: 'Burgers', screenType: 'main', screenNumber: 2, priority: 5, enabled: true },
    { name: 'Pastrami Burger', description: 'Oversized burger topped with grilled pastrami & choice of french fries or baked potato', price: '29.95', category: 'Burgers', screenType: 'main', screenNumber: 2, priority: 6, enabled: true },
    { name: 'Portobello Mushroom Burger', description: 'Oversized burger topped w/ portobello mushroom & choice of french fries or baked potato', price: '28.95', category: 'Burgers', screenType: 'main', screenNumber: 2, priority: 7, enabled: true },
    { name: 'All In Burger', description: 'Oversized burger topped w/ pastrami & chili & choice of french fries or baked potato', price: '31.95', category: 'Burgers', screenType: 'main', screenNumber: 2, priority: 7, enabled: true },
    { name: 'Grilled Chicken Sandwich', description: 'Grilled chicken, lettuce, tomato, pickles', price: '22.95', category: 'Sandwiches', screenType: 'main', screenNumber: 2, priority: 1, enabled: true },
    { name: 'Schnitzel Sandwich', description: 'Lettuce, tomato, pickles', price: '21.95', category: 'Sandwiches', screenType: 'main', screenNumber: 2, priority: 2, enabled: true },
    { name: 'Baby Chicken Sandwich', description: 'Lettuce, tomato, pickles', price: '24.95', category: 'Sandwiches', screenType: 'main', screenNumber: 2, priority: 3, enabled: true },
    { name: 'Cornflake Chicken Sandwich', description: 'Cornflake chicken, lettuce, tomato, pickles', price: '21.95', category: 'Sandwiches', screenType: 'main', screenNumber: 2, priority: 4, enabled: true },
    { name: 'Pretzel Chicken Sandwich', description: 'Pretzel chicken, lettuce, tomato, pickles', price: '21.95', category: 'Sandwiches', screenType: 'main', screenNumber: 2, priority: 5, enabled: true },
    { name: 'Sliced Steak Sandwich', description: 'Thin-sliced rib eye topped with grilled onions & bbq sauce', price: '27.95', category: 'Sandwiches', screenType: 'main', screenNumber: 2, priority: 6, enabled: true },
    { name: 'Sino Steak Sandwich', description: 'Skirt steak topped with grilled onions and homemade sino sauce', price: '35.95', category: 'Sandwiches', screenType: 'main', screenNumber: 2, priority: 7, enabled: true },
    { name: 'Harrys Philly Steak Sandwich', description: 'Thinly sliced rib eye sauteed peppers and onions', price: '26.95', category: 'Sandwiches', screenType: 'main', screenNumber: 2, priority: 8, enabled: true },
    { name: 'Deli Sandwich', description: 'Served w/ cole slaw and a sour pickle. Options: Pastrami, Corned Beef, Turkey Breast, Smoked Turkey Breast', price: '22.95', category: 'Sandwiches', screenType: 'main', screenNumber: 2, priority: 9, enabled: true },
    { name: 'Pastrami Schnitzel', description: 'Breaded chicken cutlet topped with grilled pastrami', price: '24.95', category: 'Sandwiches', screenType: 'main', screenNumber: 2, priority: 10, enabled: true },
    { name: 'Bochur Sandwich', description: 'Foot long schnitzel sandwich w/ lettuce, tomato, pickles & two sauces', price: '22.95', category: 'Sandwiches', screenType: 'main', screenNumber: 2, priority: 11, enabled: true },
    { name: 'New Bochur Sandwich', description: 'Foot long cornflake chicken sandwich w/ pastrami, lettuce, tomato, pickles, fried onions & two sauces', price: '24.95', category: 'Sandwiches', screenType: 'main', screenNumber: 2, priority: 12, enabled: true },
    { name: 'Steak Lafa', description: 'Sliced steak, lettuce, israeli salad, hummus, tehina, fried onion', price: '31.95', category: 'Sandwiches', screenType: 'main', screenNumber: 2, priority: 13, enabled: true },
    { name: 'Chicken Lafa', description: 'Grilled chicken, lettuce, israeli salad, hummus, tehina, fried onion', price: '26.95', category: 'Sandwiches', screenType: 'main', screenNumber: 2, priority: 14, enabled: true },
    { name: 'Baby Chicken Pita', description: 'Pargiot, lettuce, Israeli salad, hummus, tehina, fried onion', price: '24.95', category: 'Sandwiches', screenType: 'main', screenNumber: 2, priority: 15, enabled: true },
    { name: 'Pulled Brisket', description: 'Pulled brisket on brioche or baguette, served w/ ff or baked potato', price: '26.95', category: 'Sandwiches', screenType: 'main', screenNumber: 2, priority: 16, enabled: true },
    { name: 'Classic Grilled Chicken Wrap', description: 'Chicken cutlet, lettuce, tomato, onion, house dressing', price: '22.95', category: 'Wraps', screenType: 'main', screenNumber: 2, priority: 1, enabled: true },
    { name: 'Pretzel Chicken Wrap', description: 'Pretzel chicken, lettuce, tomato, onion', price: '21.95', category: 'Wraps', screenType: 'main', screenNumber: 2, priority: 2, enabled: true },
    { name: 'Schnitzel Wrap', description: 'Lettuce, tomato, fried onion, house dressing', price: '21.95', category: 'Wraps', screenType: 'main', screenNumber: 2, priority: 3, enabled: true },
    { name: 'Baby Chicken Wrap', description: 'Pargiot, lettuce, tomato, red onion, house dressing', price: '24.95', category: 'Wraps', screenType: 'main', screenNumber: 2, priority: 4, enabled: true },
    { name: 'Cornflake Chicken Wrap', description: 'Corn flake chicken, lettuce, tomato, onion', price: '21.95', category: 'Wraps', screenType: 'main', screenNumber: 2, priority: 5, enabled: true },
    { name: 'Steak Wrap', description: 'Lettuce, tomato, fried onion', price: '27.95', category: 'Wraps', screenType: 'main', screenNumber: 2, priority: 6, enabled: true },
    { name: 'Pastrami Schnitzel Wrap', description: 'Lettuce, tomato, fried onion', price: '24.95', category: 'Wraps', screenType: 'main', screenNumber: 2, priority: 7, enabled: true },
    { name: 'Avocado Chicken Wrap', description: 'Grilled chicken breast with avocado, lettuce, tomato & red onion', price: '24.95', category: 'Wraps', screenType: 'main', screenNumber: 2, priority: 8, enabled: true },
    { name: 'Avocado Turkey Wrap', description: 'Classic turkey with avocado, lettuce, tomato & red onion', price: '22.95', category: 'Wraps', screenType: 'main', screenNumber: 2, priority: 9, enabled: true },
    { name: 'Hot N Spicy Schnitzel Wrap', description: 'Hot sauce, lettuce, tomato, fried onion', price: '21.95', category: 'Wraps', screenType: 'main', screenNumber: 2, priority: 10, enabled: true },
    { name: 'Burger Wrap', description: 'Lettuce, tomato, onion, pickles, and a side of french fries', price: '23.95', category: 'Wraps', screenType: 'main', screenNumber: 2, priority: 11, enabled: true },
    { name: 'Deli Wrap', description: 'Lettuce, tomato, red onion. Options: Pastrami, Corned Beef, Turkey Breast, Smoked Turkey Breast', price: '22.95', category: 'Wraps', screenType: 'main', screenNumber: 2, priority: 12, enabled: true },
    { name: 'Grilled Vegetable Wrap', description: 'Grilled vegetables, lettuce, house dressing', price: '16.95', category: 'Wraps', screenType: 'main', screenNumber: 2, priority: 13, enabled: true },
    { name: 'Bottled Water', description: '16 oz bottle', price: '2.25', category: 'Drinks', screenType: 'main', screenNumber: 3, priority: 28, enabled: true },
    { name: 'Fountain Soda', description: 'Choice of flavor', price: '3.25', category: 'Drinks', screenType: 'main', screenNumber: 3, priority: 29, enabled: true },
    { name: 'Assorted Soda Can', description: 'Assorted flavors', price: '3.25', category: 'Drinks', screenType: 'main', screenNumber: 3, priority: 30, enabled: true },
    { name: 'Snapple/Gatorade', description: 'Assorted flavors', price: '4.00', category: 'Drinks', screenType: 'main', screenNumber: 3, priority: 31, enabled: true },
    { name: 'Snack Box', description: '2 pcs + can of soda', price: '17.95', category: 'Fried Chicken', screenType: 'main', screenNumber: 3, priority: 9, enabled: true },
    { name: 'Dinner Box', description: '3 pcs + can of soda', price: '24.95', category: 'Fried Chicken', screenType: 'main', screenNumber: 3, priority: 10, enabled: true },
    { name: 'Jumbo Box', description: '5 pcs + 2 cans of soda', price: '32.95', category: 'Fried Chicken', screenType: 'main', screenNumber: 3, priority: 11, enabled: true },
    { name: 'Baked Potato', description: 'Baked and seasoned', price: '6.95', category: 'On the Side', screenType: 'main', screenNumber: 3, priority: 1, enabled: true },
    { name: 'White Rice', description: 'Steamed white rice', price: '6.95', category: 'On the Side', screenType: 'main', screenNumber: 3, priority: 2, enabled: true },
    { name: 'Side of Cole Slaw', description: 'Creamy coleslaw', price: '3.95', category: 'On the Side', screenType: 'main', screenNumber: 3, priority: 3, enabled: true },
    { name: 'French Fries', description: 'Small $7.95 / Large $11.95', price: '7.95', category: 'On the Side', screenType: 'main', screenNumber: 3, priority: 4, enabled: true },
    { name: 'Onion Rings', description: 'Crispy golden onion rings', price: '10.95', category: 'On the Side', screenType: 'main', screenNumber: 3, priority: 5, enabled: true },
    { name: 'Mashed Potatoes', description: 'Creamy mashed potatoes', price: '8.95', category: 'On the Side', screenType: 'main', screenNumber: 3, priority: 6, enabled: true },
    { name: 'Mixed Green Salad', description: 'Fresh mixed greens', price: '9.95', category: 'On the Side', screenType: 'main', screenNumber: 3, priority: 7, enabled: true },
    { name: 'Chulent', description: 'Served on Thursdays only', price: '9.95', category: 'On the Side', screenType: 'main', screenNumber: 3, priority: 8, enabled: true },
    { name: 'Sweet Potato Chips', description: 'Crispy sweet potato chips', price: '9.95', category: 'On the Side', screenType: 'main', screenNumber: 3, priority: 9, enabled: true },
    { name: 'Israeli Salad', description: 'Diced tomatoes, cucumbers, onion', price: '3.95', category: 'On the Side', screenType: 'main', screenNumber: 3, priority: 10, enabled: true },
    { name: 'Steamed Vegetable Medley', description: 'Steamed seasonal vegetables', price: '10.95', category: 'On the Side', screenType: 'main', screenNumber: 3, priority: 11, enabled: true },
    { name: 'Baby Chicken Pargiot', description: 'Grilled baby chicken with choice of 2 sides', price: '29.95', category: 'Platters', screenType: 'main', screenNumber: 3, priority: 1, enabled: true },
    { name: 'Grilled Chicken Breast Cutlet', description: 'Grilled chicken with choice of 2 sides', price: '27.95', category: 'Platters', screenType: 'main', screenNumber: 3, priority: 2, enabled: true },
    { name: 'Fried Chicken Cutlet', description: 'Fried chicken cutlet with choice of 2 sides', price: '26.95', category: 'Platters', screenType: 'main', screenNumber: 3, priority: 3, enabled: true },
    { name: 'Skirt Steak', description: 'Grilled skirt steak with choice of 3 sides', price: '46.95', category: 'Platters', screenType: 'main', screenNumber: 3, priority: 4, enabled: true },
    { name: 'Rib Steak', description: 'Grilled rib steak with choice of 3 sides', price: '46.95', category: 'Platters', screenType: 'main', screenNumber: 3, priority: 5, enabled: true },
    { name: 'Shawarma Pita', description: 'Seasoned shawarma in warm pita', price: '22.95', category: 'Shawarma', screenType: 'main', screenNumber: 3, priority: 1, enabled: true },
    { name: 'Shawarma Laffa', description: 'Shawarma in fresh laffa bread', price: '25.95', category: 'Shawarma', screenType: 'main', screenNumber: 3, priority: 2, enabled: true },
    { name: 'Shawarma Platter w/ Pita', description: 'Choose two sides: French fries, spicy fries, baked potato, rice, coleslaw & Israeli salad', price: '29.95', category: 'Shawarma', screenType: 'main', screenNumber: 3, priority: 3, enabled: true },
    { name: 'Hot Dog', description: 'All beef hot dog', price: '12.95', category: 'Specials & Kids', screenType: 'main', screenNumber: 3, priority: 1, enabled: true },
    { name: 'Corn Flake or Pretzel Chicken Fingers', description: 'Crispy breaded chicken fingers', price: '15.95', category: 'Specials & Kids', screenType: 'main', screenNumber: 3, priority: 2, enabled: true },
    { name: 'Juniors Special', description: 'Schnitzel on bun with lettuce, tomato, pickle', price: '15.95', category: 'Specials & Kids', screenType: 'main', screenNumber: 3, priority: 3, enabled: true },
    { name: '2 Hot Dogs', description: 'Two all beef hot dogs', price: '15.95', category: 'Specials & Kids', screenType: 'main', screenNumber: 3, priority: 4, enabled: true },
    { name: '1 Hot Dog 1 Burger', description: 'One hot dog and one burger', price: '21.95', category: 'Specials & Kids', screenType: 'main', screenNumber: 3, priority: 5, enabled: true },
    { name: '6pc Chicken Nuggets', description: 'Crispy chicken nuggets', price: '15.95', category: 'Specials & Kids', screenType: 'main', screenNumber: 3, priority: 6, enabled: true },
    { name: '4oz Burger', description: 'Kid-sized burger', price: '16.95', category: 'Specials & Kids', screenType: 'main', screenNumber: 3, priority: 7, enabled: true },
    { name: '6pc Buffalo Wings', description: 'Crispy buffalo wings', price: '14.95', category: 'Specials & Kids', screenType: 'main', screenNumber: 3, priority: 8, enabled: true },
    { name: 'M22 Roll', description: 'Spicy salmon and spicy tuna topped with avocado', price: '17.50', category: 'Specialty Rolls', screenType: 'sushi', screenNumber: 1, priority: 1, enabled: true },
    { name: 'Grand St Roll', description: 'Spicy tuna, avocado topped w/ spicy kani drizzled w/ spicy & sweet sauce mayo', price: '18.50', category: 'Specialty Rolls', screenType: 'sushi', screenNumber: 1, priority: 2, enabled: true },
    { name: 'FDR Drive Roll', description: 'Peppered tuna topped with tuna', price: '18.50', category: 'Specialty Rolls', screenType: 'sushi', screenNumber: 1, priority: 3, enabled: true },
    { name: 'Cherry St Roll', description: 'Salmon, tuna and avocado', price: '17.50', category: 'Specialty Rolls', screenType: 'sushi', screenNumber: 1, priority: 4, enabled: true },
    { name: 'Orchard St Roll', description: 'California roll topped with tuna', price: '17.50', category: 'Specialty Rolls', screenType: 'sushi', screenNumber: 1, priority: 5, enabled: true },
    { name: 'East Broadway Roll', description: 'Spicy tuna, spicy kani crunch topped w/ fried onions & spicy mayo', price: '17.50', category: 'Specialty Rolls', screenType: 'sushi', screenNumber: 1, priority: 6, enabled: true },
    { name: 'Ultimate Kani Roll', description: 'Kani topped with spicy kani', price: '17.50', category: 'Specialty Rolls', screenType: 'sushi', screenNumber: 1, priority: 7, enabled: true },
    { name: 'Dynamite Roll', description: 'Spicy kani and spicy tuna drizzled w/ spicy mayo & siracha sauce', price: '17.50', category: 'Specialty Rolls', screenType: 'sushi', screenNumber: 1, priority: 8, enabled: true },
    { name: 'Houston St', description: 'Salmon topped with avocado', price: '17.50', category: 'Specialty Rolls', screenType: 'sushi', screenNumber: 1, priority: 9, enabled: true },
    { name: 'Willet St', description: 'Spicy salmon topped with avocado', price: '17.50', category: 'Specialty Rolls', screenType: 'sushi', screenNumber: 1, priority: 10, enabled: true },
    { name: 'Tuna²', description: 'Spicy tuna wrapped with raw tuna', price: '18.50', category: 'Specialty Rolls', screenType: 'sushi', screenNumber: 1, priority: 11, enabled: true },
    { name: 'Essex St Roll', description: 'Peppered tuna topped with avocado', price: '17.50', category: 'Specialty Rolls', screenType: 'sushi', screenNumber: 1, priority: 12, enabled: true },
    { name: 'Suffolk St Roll', description: 'Peppered tuna, avocado topped with spicy tuna', price: '18.50', category: 'Specialty Rolls', screenType: 'sushi', screenNumber: 1, priority: 13, enabled: true },
    { name: 'Jackson St Roll', description: 'Tuna topped with peppered tuna', price: '18.50', category: 'Specialty Rolls', screenType: 'sushi', screenNumber: 1, priority: 14, enabled: true },
    { name: 'Henry St Roll', description: 'California roll topped with peppered tuna', price: '18.50', category: 'Specialty Rolls', screenType: 'sushi', screenNumber: 1, priority: 15, enabled: true },
    { name: 'Dragon Roll', description: 'Spicy tuna topped with avocado', price: '17.50', category: 'Specialty Rolls', screenType: 'sushi', screenNumber: 1, priority: 16, enabled: true },
    { name: 'Red Dragon Roll', description: 'Spicy tuna and avocado topped with raw tuna', price: '18.50', category: 'Specialty Rolls', screenType: 'sushi', screenNumber: 1, priority: 17, enabled: true },
    { name: 'Sushi Sandwich', description: 'Tuna, salmon and avocado', price: '18.50', category: 'Specialty Rolls', screenType: 'sushi', screenNumber: 1, priority: 18, enabled: true },
    { name: 'Manhattan Bridge Roll', description: 'Spicy tuna topped with spicy kani and avocado', price: '18.50', category: 'Specialty Rolls', screenType: 'sushi', screenNumber: 1, priority: 19, enabled: true },
    { name: 'Atlantic Ocean Roll', description: 'Spicy salmon topped with salmon', price: '18.50', category: 'Specialty Rolls', screenType: 'sushi', screenNumber: 1, priority: 20, enabled: true },
    { name: 'The Carlton Roll', description: 'Tuna and salmon topped with yellow tail', price: '21.00', category: 'Specialty Rolls', screenType: 'sushi', screenNumber: 1, priority: 21, enabled: true },
    { name: 'The Park Roll', description: 'California topped with tuna, salmon and yellow tail', price: '18.50', category: 'Specialty Rolls', screenType: 'sushi', screenNumber: 1, priority: 22, enabled: true },
    { name: 'The Brooklyn Bridge Roll', description: 'Avocado, cucumber topped with tuna and salmon', price: '18.50', category: 'Specialty Rolls', screenType: 'sushi', screenNumber: 1, priority: 23, enabled: true },
    { name: 'King Roll', description: 'Tuna, salmon and kani with avocado and cucumber', price: '18.50', category: 'Specialty Rolls', screenType: 'sushi', screenNumber: 1, priority: 24, enabled: true },
    { name: 'The Main Avenue Roll', description: 'Kani and avocado topped with spicy tuna', price: '18.50', category: 'Specialty Rolls', screenType: 'sushi', screenNumber: 1, priority: 25, enabled: true },
    { name: 'The Clifton Roll', description: 'California roll topped with spicy kani', price: '17.50', category: 'Specialty Rolls', screenType: 'sushi', screenNumber: 1, priority: 26, enabled: true },
    { name: 'The Florida Roll', description: 'Salmon, kani and avocado topped with mango and sweet sauce', price: '17.50', category: 'Specialty Rolls', screenType: 'sushi', screenNumber: 1, priority: 27, enabled: true },
    { name: 'The Prince Roll', description: 'Avocado topped with salmon', price: '16.50', category: 'Specialty Rolls', screenType: 'sushi', screenNumber: 1, priority: 28, enabled: true },
    { name: 'The Bentley Roll', description: 'Spicy tuna, avocado topped with seared salmon and sweet sauce', price: '18.50', category: 'Specialty Rolls', screenType: 'sushi', screenNumber: 1, priority: 29, enabled: true },
    { name: 'Rainbow Roll', description: 'California roll topped with avocado, tuna and salmon', price: '18.50', category: 'Specialty Rolls', screenType: 'sushi', screenNumber: 1, priority: 30, enabled: true },
    { name: 'Manhattan Roll', description: 'Spicy yellowtail, cucumber topped with horseradish sauce and masago', price: '17.50', category: 'Specialty Rolls', screenType: 'sushi', screenNumber: 1, priority: 31, enabled: true },
    { name: 'Brooklyn Roll', description: 'Salmon topped with avocado and tuna', price: '18.50', category: 'Specialty Rolls', screenType: 'sushi', screenNumber: 1, priority: 32, enabled: true },
    { name: 'Queens Roll', description: 'Tuna topped with avocado and salmon', price: '18.50', category: 'Specialty Rolls', screenType: 'sushi', screenNumber: 1, priority: 33, enabled: true },
    { name: 'East River Roll', description: 'Tuna topped with salmon', price: '18.50', category: 'Specialty Rolls', screenType: 'sushi', screenNumber: 1, priority: 34, enabled: true },
    { name: 'Hudson River Roll', description: 'Salmon topped with tuna', price: '18.50', category: 'Specialty Rolls', screenType: 'sushi', screenNumber: 1, priority: 35, enabled: true },
    { name: 'Tuna', description: '2 pieces', price: '4.50', category: 'Nigiri / Sashimi', screenType: 'sushi', screenNumber: 2, priority: 1, enabled: true },
    { name: 'Smoked Salmon', description: '2 pieces', price: '5.50', category: 'Nigiri / Sashimi', screenType: 'sushi', screenNumber: 2, priority: 2, enabled: true },
    { name: 'Yellow Tail', description: '2 pieces', price: '5.50', category: 'Nigiri / Sashimi', screenType: 'sushi', screenNumber: 2, priority: 3, enabled: true },
    { name: 'Salmon', description: '2 pieces', price: '4.50', category: 'Nigiri / Sashimi', screenType: 'sushi', screenNumber: 2, priority: 4, enabled: true },
    { name: 'Kani', description: '2 pieces', price: '3.00', category: 'Nigiri / Sashimi', screenType: 'sushi', screenNumber: 2, priority: 5, enabled: true },
    { name: 'Small Platter', description: '6 rolls: 3 vegetable rolls, 3 sushi rolls', price: '0', category: 'Platters', screenType: 'sushi', screenNumber: 2, priority: 1, enabled: true },
    { name: 'Medium Platter', description: '10 rolls: 4 vegetable rolls, 6 sushi rolls', price: '0', category: 'Platters', screenType: 'sushi', screenNumber: 2, priority: 2, enabled: true },
    { name: 'Large Platter', description: '15 rolls: 7 vegetable rolls, 8 sushi rolls', price: '0', category: 'Platters', screenType: 'sushi', screenNumber: 2, priority: 3, enabled: true },
    { name: 'Especially Large Platter', description: '15 rolls: 6 vegetable rolls, 5 sushi rolls, 4 specialty rolls', price: '0', category: 'Platters', screenType: 'sushi', screenNumber: 2, priority: 4, enabled: true },
    { name: 'Extra Special Platter', description: '15 rolls: 6 vegetable rolls, 5 sushi rolls, 4 specialty rolls with sashimi and nigiri', price: '0', category: 'Platters', screenType: 'sushi', screenNumber: 2, priority: 5, enabled: true },
    { name: 'Sushi Mess 1', description: 'Kani, avocado, carrots and cucumbers', price: '11.50', category: 'Sushi Mess', screenType: 'sushi', screenNumber: 2, priority: 1, enabled: true },
    { name: 'Sushi Mess 2', description: 'Smoked salmon, kani, avocado, carrots & cucumber', price: '13.50', category: 'Sushi Mess', screenType: 'sushi', screenNumber: 2, priority: 2, enabled: true },
    { name: 'Sushi Mess 3', description: 'Spicy tuna, avocado, carrots and cucumber', price: '12.50', category: 'Sushi Mess', screenType: 'sushi', screenNumber: 2, priority: 3, enabled: true },
    { name: 'Sushi Mess 4', description: 'Spicy salmon, avocado, carrots and cucumber', price: '12.50', category: 'Sushi Mess', screenType: 'sushi', screenNumber: 2, priority: 4, enabled: true },
    { name: 'Sushi Mess 5', description: 'Spicy kani, avocado, carrots and cucumber', price: '11.50', category: 'Sushi Mess', screenType: 'sushi', screenNumber: 2, priority: 5, enabled: true },
    { name: 'Sushi Mess 6', description: 'Choice of fresh tuna or fresh salmon with avocado, carrots and cucumber', price: '13.50', category: 'Sushi Mess', screenType: 'sushi', screenNumber: 2, priority: 6, enabled: true },
    { name: 'California Roll', description: 'Kani, avocado, cucumber', price: '8.75', category: 'Sushi Rolls', screenType: 'sushi', screenNumber: 2, priority: 1, enabled: true },
    { name: 'Boston Roll', description: 'Salmon, avocado, cucumber, tobiko', price: '8.75', category: 'Sushi Rolls', screenType: 'sushi', screenNumber: 2, priority: 2, enabled: true },
    { name: 'Salmon Roll', description: 'Fresh salmon', price: '9.25', category: 'Sushi Rolls', screenType: 'sushi', screenNumber: 2, priority: 3, enabled: true },
    { name: 'Alaska Roll', description: 'Salmon, avocado, cucumber', price: '9.25', category: 'Sushi Rolls', screenType: 'sushi', screenNumber: 2, priority: 4, enabled: true },
    { name: 'Salmon Avocado Roll', description: 'Salmon and avocado', price: '9.25', category: 'Sushi Rolls', screenType: 'sushi', screenNumber: 2, priority: 5, enabled: true },
    { name: 'Tuna Avocado Roll', description: 'Tuna and avocado', price: '9.25', category: 'Sushi Rolls', screenType: 'sushi', screenNumber: 2, priority: 6, enabled: true },
    { name: 'Spicy Tuna Roll', description: 'Spicy tuna', price: '9.25', category: 'Sushi Rolls', screenType: 'sushi', screenNumber: 2, priority: 7, enabled: true },
    { name: 'Spicy Salmon Roll', description: 'Spicy salmon', price: '9.25', category: 'Sushi Rolls', screenType: 'sushi', screenNumber: 2, priority: 8, enabled: true },
    { name: 'Tuna Crunch Roll', description: 'Tuna with crunchy tempura flakes', price: '9.25', category: 'Sushi Rolls', screenType: 'sushi', screenNumber: 2, priority: 9, enabled: true },
    { name: 'Salmon Crunch Roll', description: 'Salmon with crunchy tempura flakes', price: '9.25', category: 'Sushi Rolls', screenType: 'sushi', screenNumber: 2, priority: 10, enabled: true },
    { name: 'Black Pepper Tuna Roll', description: 'Tuna with black pepper', price: '9.25', category: 'Sushi Rolls', screenType: 'sushi', screenNumber: 2, priority: 11, enabled: true },
    { name: 'Tuna Cucumber Roll', description: 'Tuna and cucumber', price: '9.25', category: 'Sushi Rolls', screenType: 'sushi', screenNumber: 2, priority: 12, enabled: true },
    { name: 'Salmon Cucumber Roll', description: 'Salmon and cucumber', price: '9.25', category: 'Sushi Rolls', screenType: 'sushi', screenNumber: 2, priority: 13, enabled: true },
    { name: 'Spicy Salmon Avocado Roll', description: 'Spicy salmon and avocado', price: '9.25', category: 'Sushi Rolls', screenType: 'sushi', screenNumber: 2, priority: 14, enabled: true },
    { name: 'Yellow Tail Roll', description: 'Fresh yellowtail', price: '12.50', category: 'Sushi Rolls', screenType: 'sushi', screenNumber: 2, priority: 15, enabled: true },
    { name: 'Smoked Salmon Roll', description: 'Smoked salmon', price: '12.50', category: 'Sushi Rolls', screenType: 'sushi', screenNumber: 2, priority: 16, enabled: true },
    { name: 'Newport Roll', description: 'Tuna, salmon, avocado and cucumber', price: '12.50', category: 'Sushi Rolls', screenType: 'sushi', screenNumber: 2, priority: 17, enabled: true },
    { name: 'Philadelphia Roll', description: 'Smoked salmon, cream cheese, avocado', price: '12.50', category: 'Sushi Rolls', screenType: 'sushi', screenNumber: 2, priority: 18, enabled: true },
    { name: 'Godzilla Roll', description: 'Tuna, salmon and kani drizzled with spicy mayo, sweet sauce and masago', price: '18.75', category: 'Tempura Rolls', screenType: 'sushi', screenNumber: 2, priority: 1, enabled: true },
    { name: 'Delancey Roll', description: 'Kani roll drizzled with spicy mayo, sweet sauce and masago', price: '16.00', category: 'Tempura Rolls', screenType: 'sushi', screenNumber: 2, priority: 2, enabled: true },
    { name: 'Williamsburg Bridge Roll', description: 'Spicy salmon, spicy tuna and avocado drizzled with spicy mayo and sweet sauce', price: '17.50', category: 'Tempura Rolls', screenType: 'sushi', screenNumber: 2, priority: 3, enabled: true },
    { name: 'Canal St Roll', description: 'Salmon, cucumber and avocado drizzled with spicy mayo and sweet sauce', price: '17.50', category: 'Tempura Rolls', screenType: 'sushi', screenNumber: 2, priority: 4, enabled: true },
    { name: 'Lower East Side Roll', description: 'Salmon, avocado and cucumber wrapped with avocado drizzled with sweet sauce', price: '17.50', category: 'Tempura Rolls', screenType: 'sushi', screenNumber: 2, priority: 5, enabled: true },
    { name: 'Spider Roll', description: 'Salmon kani and shredded carrots with sweet sauce', price: '18.00', category: 'Tempura Rolls', screenType: 'sushi', screenNumber: 2, priority: 6, enabled: true },
    { name: 'Crunchy Roll', description: 'Salmon and avocado and crunch topped with sweet sauce', price: '17.50', category: 'Tempura Rolls', screenType: 'sushi', screenNumber: 2, priority: 7, enabled: true },
    { name: 'Sweet Potato Tempura', description: 'Sweet potato and avocado drizzled with sweet sauce', price: '13.00', category: 'Tempura Rolls', screenType: 'sushi', screenNumber: 2, priority: 8, enabled: true },
    { name: 'Southern California Roll', description: 'Breaded and fried kani, avocado and cucumber', price: '17.50', category: 'Tempura Rolls', screenType: 'sushi', screenNumber: 2, priority: 9, enabled: true },
    { name: 'Fried Kani Sticks', description: 'Crispy fried kani sticks', price: '12.00', category: 'Tempura Rolls', screenType: 'sushi', screenNumber: 2, priority: 10, enabled: true },
    { name: 'Classic Veggie Roll', description: 'Avocado, carrot and cucumber', price: '7.50', category: 'Vegetable Rolls', screenType: 'sushi', screenNumber: 2, priority: 1, enabled: true },
    { name: 'Tri Veggie Roll', description: 'Sweet potato, mushroom and cucumber', price: '8.25', category: 'Vegetable Rolls', screenType: 'sushi', screenNumber: 2, priority: 2, enabled: true },
    { name: 'Avocado Mushroom Roll', description: 'Avocado and shiitake mushroom', price: '7.50', category: 'Vegetable Rolls', screenType: 'sushi', screenNumber: 2, priority: 3, enabled: true },
    { name: 'Cucumber Roll', description: 'Fresh cucumber', price: '6.50', category: 'Vegetable Rolls', screenType: 'sushi', screenNumber: 2, priority: 4, enabled: true },
    { name: 'Carrot Roll', description: 'Fresh carrot', price: '6.50', category: 'Vegetable Rolls', screenType: 'sushi', screenNumber: 2, priority: 5, enabled: true },
    { name: 'Avocado Roll', description: 'Fresh avocado', price: '7.25', category: 'Vegetable Rolls', screenType: 'sushi', screenNumber: 2, priority: 6, enabled: true },
    { name: 'Avocado and Cucumber', description: 'Avocado and cucumber', price: '7.25', category: 'Vegetable Rolls', screenType: 'sushi', screenNumber: 2, priority: 7, enabled: true },
    { name: 'Avocado and Mango Roll', description: 'Avocado and mango', price: '7.50', category: 'Vegetable Rolls', screenType: 'sushi', screenNumber: 2, priority: 8, enabled: true },
    { name: 'Mango Roll', description: 'Fresh mango', price: '6.50', category: 'Vegetable Rolls', screenType: 'sushi', screenNumber: 2, priority: 9, enabled: true },
  ];
}

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
  }
  
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
      res.set('Cache-Control', 'public, max-age=3600');
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
    
    // Only serve static assets for TV screen routes (not at root)
    // Add aggressive caching for CSS/JS files to reduce server load
    app.use('/screen', express.static(publicPath, {
      maxAge: '1d', // Cache static assets for 1 day
      etag: true,
      lastModified: true,
      setHeaders: (res, filePath) => {
        // Cache CSS and JS files aggressively
        if (filePath.endsWith('.css') || filePath.endsWith('.js')) {
          res.setHeader('Cache-Control', 'public, max-age=86400'); // 1 day
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
        // Filter out disabled items for TV display screens
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
          item_name: item.name,
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

  app.post('/api/manager/verify-pin', async (req, res) => {
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
      const code = Math.random().toString(36).substring(2, 10).toUpperCase();
      const invite = await storage.createInviteCode(code);
      res.json(invite);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post('/api/invite-codes/verify', async (req, res) => {
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
          item_name: item.name,
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
    res.json({ version: screenVersion, frozen: screenFrozen, featured: screenFeatured, campfireEnabled, closingTime });
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
      
      return res.json({ success: false, message: 'Command not recognized. Try "86 Dragon Roll" or "change price of M22 Roll to 15"' });
    } catch (error: any) {
      console.error('Voice command error:', error);
      res.status(500).json({ error: error.message });
    }
  });

  app.post('/api/featured', async (req, res) => {
    try {
      const authHeader = req.headers.authorization;
      const token = authHeader?.replace('Bearer ', '');
      if (!token) return res.status(401).json({ error: 'Authorization required' });
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
      const authHeader = req.headers.authorization;
      const token = authHeader?.replace('Bearer ', '');
      if (!token) return res.status(401).json({ error: 'Authorization required' });
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
