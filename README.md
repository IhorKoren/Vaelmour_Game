# Vaelmour - Telegram WebApp RPG

Vaelmour is a premium fantasy-themed role-playing game built as a Telegram WebApp and browser client.

## Technology Stack

- **Frontend**: React (v19) + TypeScript + Vite
- **Styling**: Pure CSS design system with custom HSL palettes
- **Database/Backend**: Supabase save states with full migration support
- **Hosting/API**: Netlify deployment and Serverless Netlify Functions

---

## Core Game Systems

1. **Combat**: Live battle screen with abilities, dynamic scaling, combat logs, and elite/boss encounters.
2. **Inventory & Equipment**: Nine supported gear slots (weapon, shield, head, chest, hands, legs, feet, ring, amulet) with item affixes and durability wear/repair formulas.
3. **Blacksmith Crafting**: Custom recipes based on tiers and materials with progression manuals.
4. **Quest System**: Active quest board tracking kills, travel objectives, collection tasks, and rewards.
5. **Shop & Market**: Reroll systems, lockbox store, and selling items mechanics.
6. **Admin Panel**: Backend player save manager routed at `/admin`.

---

## Environment Variables Needed

The following variables must be defined in your deployment configuration (e.g. Netlify App Settings):

- `SUPABASE_URL`: The URL of your Supabase project instance.
- `SUPABASE_SERVICE_ROLE_KEY`: The service role API key for server-side read/write privileges.
- `TELEGRAM_BOT_TOKEN`: The bot API token utilized to dispatch full-health offline alerts.
- `ADMIN_SECRET`: The authorization key securing the admin backend operations.

---

## Getting Started

### 1. Install Dependencies
```bash
npm install
```

### 2. Run Development Server
```bash
npm run dev
```

### 3. Verify Types & Lints
```bash
npm run typecheck
npm run lint
```

### 4. Run Unit Tests
```bash
npm run test
```

### 5. Compile Production Bundle
```bash
npm run build
```
