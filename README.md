# Vaelmour - Post-Wipe Baseline

Vaelmour is a Telegram WebApp/browser RPG built around auto-combat, equipment progression, curated crafting quests, and cloud-backed save recovery.

## Current Game State

- Auto-combat is the active combat loop. The hero hunts, fights, retreats, wins, or loses through the runtime combat session flow.
- Inventory and equipment progression are active across nine equipment slots: weapon, shield, head, chest, hands, legs, feet, ring, and amulet.
- Durability and repair are active for applicable equipment slots.
- Crafting is active with live recipe unlock progression and starter recipe support.
- Quests are active through the curated crafting quest chain. Legacy generated quest clutter is no longer part of the runtime quest board.
- Material drops are active and aligned to runtime enemy/location sources.
- Local save plus cloud save are active, with wipe-aware normalization and recovery.
- Telegram full-HP notification is active for supported Telegram players outside combat.
- The admin panel is active at `/admin` for player save inspection and maintenance.
- Controlled progression wipe `progression_wipe_2026_06_07_v1` is the current baseline.

## Not In Active Runtime Gameplay

- Rage systems are no longer active runtime gameplay.
- Active skill buttons/skill-resource gameplay are no longer active runtime gameplay.
- Detailed combat log UI is no longer active runtime gameplay.
- Legacy save fields related to removed systems may still be tolerated for compatibility, but they are not part of the active loop.

## Shop And Market Status

- The current runtime still includes limited gold chest purchases and item selling.
- Broader shop/market expansion is postponed and should stay out of scope unless the owner re-approves it.

## Technology Stack

- Frontend: React 19 + TypeScript + Vite
- Styling: CSS
- Backend/storage: Netlify Functions + Supabase
- Delivery: Telegram WebApp + browser client

## Environment Variables

Deployment/runtime configuration may require:

- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `TELEGRAM_BOT_TOKEN`
- `ADMIN_SECRET`
- `VITE_VAELMOUR_TON_TREASURY_ADDRESS` (Public receiving TON wallet address for project treasury. Never store seed/private keys in environment variables, client code, or git).

## Validation Commands

```bash
npm run validate:data
npm run typecheck
npm run lint
npm run test
npm run build
npm run balance:audit
```

## Local Development

```bash
npm install
npm run dev
```
