# P0 Security And Save Integrity Report

## What Was Changed

- Centralized Telegram WebApp auth validation in [netlify/functions/_shared/telegramAuth.ts](C:\Users\h1sok\OneDrive\Робочий стіл\Vaelmour\Vaelmour_Game\netlify\functions\_shared\telegramAuth.ts)
- Added `auth_date` freshness validation to backend Telegram auth checks
- Hardened [netlify/functions/sendFullHealthNotification.ts](C:\Users\h1sok\OneDrive\Робочий стіл\Vaelmour\Vaelmour_Game\netlify\functions\sendFullHealthNotification.ts) to remove unsafe raw client user targeting
- Added [src/game/save/cloudSaveSanitizer.ts](C:\Users\h1sok\OneDrive\Робочий стіл\Vaelmour\Vaelmour_Game\src\game\save\cloudSaveSanitizer.ts) for server-side cloud save payload sanitization
- Updated [netlify/functions/savePlayerState.ts](C:\Users\h1sok\OneDrive\Робочий стіл\Vaelmour\Vaelmour_Game\netlify\functions\savePlayerState.ts) to sanitize incoming hero payloads before persistence
- Updated [netlify/functions/getPlayerState.ts](C:\Users\h1sok\OneDrive\Робочий стіл\Vaelmour\Vaelmour_Game\netlify\functions\getPlayerState.ts) to use shared Telegram auth validation
- Updated [src/telegram/telegramNotifications.ts](C:\Users\h1sok\OneDrive\Робочий стіл\Vaelmour\Vaelmour_Game\src\telegram\telegramNotifications.ts) to stop sending raw fallback user IDs
- Added docs:
  - [docs/SECURITY_MODEL.md](C:\Users\h1sok\OneDrive\Робочий стіл\Vaelmour\Vaelmour_Game\docs\SECURITY_MODEL.md)
  - [docs/SAVE_SYSTEM.md](C:\Users\h1sok\OneDrive\Робочий стіл\Vaelmour\Vaelmour_Game\docs\SAVE_SYSTEM.md)
- Added tests in [src/game/save/cloudSaveSanitizer.test.ts](C:\Users\h1sok\OneDrive\Робочий стіл\Vaelmour\Vaelmour_Game\src\game\save\cloudSaveSanitizer.test.ts)

## Backend Functions Modified

- `netlify/functions/savePlayerState.ts`
- `netlify/functions/getPlayerState.ts`
- `netlify/functions/sendFullHealthNotification.ts`
- `netlify/functions/_shared/telegramAuth.ts` (new shared backend auth utility)

## Validation Added

### Telegram Auth

- shared hash validation
- shared `auth_date` requirement
- shared freshness validation window
- shared Telegram user extraction

### Save Payload Sanitization

- clamps negative or impossible:
  - gold
  - level
  - xp
  - base HP
  - max HP
  - current HP
- validates `selectedLocationId`
- limits oversized inventory arrays
- rejects malformed inventory entries
- rejects unknown non-generated item IDs where detectable
- sanitizes malformed generated equipment entries
- sanitizes equipment maps, durability maps, affix maps, and known recipe IDs
- preserves compatibility by merging with existing save state where appropriate

## Security Risks Removed

- duplicated Telegram auth logic across backend functions
- missing backend `auth_date` freshness enforcement
- unsafe notification fallback to arbitrary raw `clientUserId`
- blind trust of broad client-provided hero save payloads
- acceptance of malformed location/equipment/inventory structures into persisted save state

## Remaining Future Work

- Move from raw state-sync saves toward action-based server mutations
- Make rewards, combat results, item sales, crafting, and economy actions server-authoritative
- Extend backend tests directly around Netlify handlers if the project adds a dedicated server test harness

## Validation Command Results

- `npm run typecheck` ✅
- `npm run lint` ✅
- `npm run test` ✅
- `npm run build` ✅
