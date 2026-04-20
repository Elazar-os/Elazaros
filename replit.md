# King of Delancey - Digital Menu Display System

## Overview

A production-ready digital menu display system for restaurant TV screens. The application serves 5 display screens (3 main + 2 sushi) with menu data stored in a PostgreSQL database. Includes admin dashboard, boss PWA panel, and manager PIN panel. Built as a full-stack TypeScript application with React frontend and Express backend.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript
- **Routing**: Wouter (lightweight client-side routing)
- **State Management**: TanStack React Query for server state
- **Styling**: Tailwind CSS with shadcn/ui component library
- **Animations**: Framer Motion
- **Build Tool**: Vite

The frontend serves four main purposes:
1. **Admin Dashboard** (`/admin/dashboard`) - Control center with push-to-screens, freeze, 86 report
2. **Admin Menu Editor** (`/admin/menu`) - Full CRUD for menu items with screen filtering
3. **Boss PWA** (`/boss`) - Mobile-optimized panel with invite code auth, price editing, featured items, Kasa link
4. **Manager Panel** (`/manager`) - PIN-authenticated 86 toggle panel

### Backend Architecture
- **Framework**: Express.js with TypeScript
- **Database ORM**: Drizzle ORM with PostgreSQL
- **API Pattern**: RESTful endpoints under `/api/`

Key server responsibilities:
1. Store and serve menu data from PostgreSQL database
2. Serve static HTML screens for TV displays (`/screen/:type/:number`)
3. Provide CRUD operations for menu items and screens
4. Auto-seed default menu items on first run
5. WebSocket broadcast for real-time TV screen updates

### V2 TV Display System
Separate HTML/CSS/JS files in `/public`:
- `screen.html` - V2 display shell with header, body, footer, frozen badge
- `styles.css` - V2 design system with two permanent themes
- `app.js` - Vanilla JS with 5 screen layouts and pagination engine

**Design System (V2)**:
- **Main theme**: Red accent `#E8102E`, deep black `#0a0a0a` background
- **Sushi theme**: Green accent `#35C47F`, deep black `#0a0a0a` background
- **Typography**: Bebas Neue (headers/prices), Barlow Condensed (body)
- **Panel glow**: Subtle accent-colored top border glow effect
- **Pagination**: 12-second dwell, 700ms cross-fade, staggered panel delays (panelIndex * 1800ms)

**Screen Layouts**:
- Main 1: 3-column (Starters split, Soups, Salads + KOD brand strip)
- Main 2: 3-column (Burgers, Wraps, Sandwiches)
- Main 3: 3x2 grid (Platters, Shawarma, Fried Chicken, Sides, Specials & Kids, Drinks)
- Sushi 1: 3-column (Specialty Rolls in 3 parts)
- Sushi 2: 3x2 grid (Sushi Mess, Sushi Rolls, Vegetable Rolls, Tempura Rolls, Nigiri/Sashimi, Platters)

**TV Behaviors**:
- Scroll lock, fullscreen auto-entry, kiosk mode
- WebSocket auto-reconnect (10s delay)
- localStorage cache with 30-minute TTL
- Featured item display on brand strip
- Freeze/unfreeze support

### Data Flow
1. **PostgreSQL Database**: All menu data stored in database tables
2. **API Endpoints**: RESTful CRUD for menu items and screens
3. **Server-side caching**: In-memory cache with 5-minute TTL reduces database queries
4. **Client-side caching**: React Query handles caching and refetching
5. **Push-only updates**: TV screens only fetch data on initial load or WebSocket push (no polling)
6. **WebSocket updates**: Push to Screens button triggers immediate refresh via WebSocket

### Database Schema
Tables defined in `shared/schema.ts`:
- **screens**: Screen configuration (screenType, screenNumber, name)
- **menuItems**: Individual items with name, description, price, category, screenType, screenNumber, priority, enabled
- **managers**: Manager accounts with name, 4-digit PIN, and role (developer/boss/manager). Default PIN: 1234
- **bossInviteCodes**: Single-use invite codes for boss panel authentication

### Routes & Panels
- `/admin/dashboard` - Admin dashboard (Replit Auth required)
- `/admin/menu` - Menu editor (Replit Auth required)
- `/admin/settings` - Settings: manage users/PINs/roles, generate boss invite codes (Replit Auth required)
- `/boss` - Boss PWA panel (invite code auth, localStorage token persistence)
- `/manager` - Manager panel (PIN auth, 86 toggle only)
- `/screen/:type/:number` - TV display screens (5 total)

### API Endpoints
- `GET /api/menu` - Menu data for TV displays (filters by screen)
- `GET /api/menu-items` - Get all menu items
- `POST /api/menu-items` - Create menu item
- `PATCH /api/menu-items/:id` - Update menu item
- `DELETE /api/menu-items/:id` - Delete menu item
- `PATCH /api/menu-items/:id/enabled` - Toggle item visibility
- `GET /api/screens` - Get all screens
- `POST /api/screens` - Create screen
- `PATCH /api/screens/:id` - Update screen name
- `POST /api/refresh-screens` - Force TV screens to refresh immediately
- `POST /api/freeze-screens` - Freeze all screen animations
- `POST /api/unfreeze-screens` - Unfreeze all screen animations
- `POST /api/featured` - Set featured item (auth required)
- `POST /api/featured/clear` - Clear featured item (auth required)
- `POST /api/manager/verify-pin` - Verify manager PIN
- `POST /api/manager/toggle-86` - Toggle item availability (manager auth)
- `GET /api/managers` - Get all managers
- `POST /api/managers` - Create manager
- `PATCH /api/managers/:id` - Update manager
- `DELETE /api/managers/:id` - Delete manager
- `GET /api/invite-codes` - Get all invite codes
- `POST /api/invite-codes` - Generate invite code
- `POST /api/invite-codes/verify` - Verify invite code

### Cost Optimization Features
- **Static JSON menu files** - TV screens load pre-generated `/menu-{type}-{number}.json` instead of hitting the API; regenerated on Push to Screens and server startup
- **Zero polling** - TV screens never poll; updates only via WebSocket push or initial load
- **60-minute server cache** - In-memory cache reduces database queries by ~99%
- **24-hour localStorage cache** - TVs cache menu data locally and can operate offline for a full day
- **Static asset caching** - CSS/JS files cached for 1 day, JSON files cached for 1 hour
- **Push to Screens button** - Admin can force immediate updates; regenerates static JSON files

### PWA Support
- `public/manifest.json` - PWA manifest for boss panel installation
- Boss panel supports Add to Home Screen on iOS/Android
- Standalone display mode with KOD branding

## External Dependencies

### Required Environment Variables
- `DATABASE_URL` - PostgreSQL connection string (auto-configured by Replit)

### Third-Party Services
- **PostgreSQL**: Primary storage for menu items and screens
- **Google Fonts**: Bebas Neue, Barlow Condensed (TV displays); Cormorant Garamond, Outfit (admin)

### Key npm Dependencies
- `drizzle-orm` / `drizzle-kit`: Database ORM and migrations
- `@tanstack/react-query`: Server state management
- `express`: Backend HTTP server
- `framer-motion`: UI animations
- `shadcn/ui` components: Radix-based UI primitives
