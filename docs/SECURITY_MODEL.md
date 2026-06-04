# Security Model

## Current Trust Boundaries

Vaelmour currently uses a hybrid trust model:

- Frontend gameplay simulation still happens on the client.
- Cloud save and Telegram notification entry points are handled by Netlify functions.
- Supabase stores player identity and save state.
- Telegram WebApp `initData` is the primary identity proof for player-scoped backend actions.

## Hardened Backend Rules

### Telegram Authentication

- Backend Telegram `initData` validation is centralized in [netlify/functions/_shared/telegramAuth.ts](C:\Users\h1sok\OneDrive\Робочий стіл\Vaelmour\Vaelmour_Game\netlify\functions\_shared\telegramAuth.ts).
- Validation now checks:
  - `hash`
  - `auth_date`
  - freshness window
  - presence of a parseable Telegram user
- `getPlayerState`, `savePlayerState`, and `sendFullHealthNotification` no longer duplicate the validation algorithm.

### Cloud Save Boundary

- Backend no longer blindly trusts raw `hero` payloads.
- Save payloads are sanitized through [src/game/save/cloudSaveSanitizer.ts](C:\Users\h1sok\OneDrive\Робочий стіл\Vaelmour\Vaelmour_Game\src\game\save\cloudSaveSanitizer.ts).
- Current sanitization includes:
  - clamping negative or impossible numeric values
  - validating selected location IDs
  - trimming malformed inventory entries
  - rejecting unknown non-generated item IDs
  - sanitizing malformed generated equipment payloads
  - sanitizing equipment slot maps, affixes, and durability maps
  - preserving valid existing save fields where possible

### Notification Targeting

- Full HP notification no longer accepts arbitrary raw `clientUserId` fallback from the client.
- Notification sends only after verified Telegram `initData`.
- If a trusted Supabase player record exists for the verified Telegram user, that record is used as the notification target reference.
- Banned players are blocked from notification sends.

## Known Remaining Limitations

- The client still simulates combat, loot, rewards, and progression locally.
- `savePlayerState` is now sanitized, but it is still a state-sync endpoint rather than a fully authoritative action log.
- Admin/debug flows still exist and should remain tightly controlled by environment secrets and deployment policy.
- Future server-authoritative actions should move reward granting, combat outcomes, marketplace transactions, and economy mutations off the raw client save channel.

## Recommended Next Step

Move from `state overwrite` to `server-validated action submission`, for example:

- `startCombatSession`
- `resolveCombatTurn`
- `claimVictoryRewards`
- `equipItem`
- `sellItem`
- `craftRecipe`

That architecture would reduce the backend attack surface much more than further hardening a broad save endpoint alone.
