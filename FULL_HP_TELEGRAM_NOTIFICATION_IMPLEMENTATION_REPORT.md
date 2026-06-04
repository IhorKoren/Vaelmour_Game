# Full HP Telegram Notification Implementation Report

## Root cause

The main failure was on the frontend trigger path, not passive regen itself.

- Passive HP regeneration was already working and remained blocked during active combat.
- `AppShell` only attempted the notification when the player was considered "away" from the app window.
- Because of that extra gate, the frontend often never called the notification endpoint even when HP correctly transitioned from below max to max outside combat.
- The notification flow also lacked a dedicated full-HP cycle rule set, so the "send once, reset after damage" behavior was not explicit or easy to verify.
- The backend returned mixed error-style responses instead of a stable `success/skipped/reason/messageSent` payload, which made debugging hard when Telegram context or bot delivery was unavailable.

## Was the frontend calling the endpoint?

Before this fix: not reliably.

- The frontend was using the full-HP condition plus an "away/inactive" check.
- If the player was still active in the WebApp, the endpoint was skipped entirely.

After this fix:

- The frontend calls `/api/telegram/full-health-notification` only when:
  - HP was below max HP
  - HP reaches max HP
  - the hero is not in active combat
  - the current full-health cycle has not already been notified
- If HP drops below max again, notification eligibility resets for the next full-health cycle.
- If Telegram WebApp `initData` is missing, the frontend logs a safe skip and does not call the endpoint.

## Was the backend reachable?

Yes.

- `netlify.toml` already correctly routed `/api/telegram/full-health-notification` to `/.netlify/functions/sendFullHealthNotification`.
- The implementation now uses the API route consistently from the frontend.
- The function now logs when the endpoint is reached and returns structured JSON for both sent and skipped outcomes.

## How Telegram user id is resolved

The backend resolves the Telegram target securely in this order:

1. Validate Telegram WebApp `initData` with the shared `telegramAuth` utility.
2. Read the verified Telegram user id from the validated Telegram payload.
3. Attempt to find the matching player row in Supabase by that verified Telegram user id.
4. Use `players.telegram_user_id` when present, otherwise fall back to the verified Telegram user id from Telegram auth.

The implementation does **not** restore the unsafe arbitrary raw `clientUserId` fallback.

## Bot messaging permission requirement

Yes, Telegram bot messaging permission is required.

- Telegram bots generally cannot message a user unless that user has already started or opened the bot.
- If Telegram rejects delivery because the chat is unavailable, the function now returns a clear skipped result instead of silently failing.
- In practice, players must have opened or started the bot at least once for full-HP messages to be deliverable.

## Files changed

- `src/app/AppShell.tsx`
- `src/telegram/telegramNotifications.ts`
- `src/telegram/fullHealthNotificationRules.ts`
- `src/telegram/fullHealthNotificationRules.test.ts`
- `src/telegram/telegramNotifications.test.ts`
- `netlify/functions/sendFullHealthNotification.ts`
- `netlify/functions/sendFullHealthNotification.test.ts`

## Tests added or updated

- `src/telegram/fullHealthNotificationRules.test.ts`
  - full HP transition from below max to max sends
  - no notification while in combat
  - eligibility resets after damage
- `src/telegram/telegramNotifications.test.ts`
  - missing `initData` returns skipped reason
  - frontend calls `/api/telegram/full-health-notification` and handles backend response shape
- `netlify/functions/sendFullHealthNotification.test.ts`
  - missing `initData` returns skipped result
  - invalid `initData` returns skipped result
  - success response shape is stable when Telegram delivery succeeds

## Validation command results

- `npm run validate:data` ✅
- `npm run typecheck` ✅
- `npm run lint` ✅
- `npm run test` ✅ `104` passing tests
- `npm run build` ✅

## Implementation notes

- Added a dedicated full-HP notification decision helper to make the cycle logic explicit and testable.
- Preserved the existing passive regen combat block; no combat balance values were changed.
- Added safe debug logs for:
  - frontend trigger decision
  - frontend skip when `initData` is missing
  - request dispatch
  - endpoint reached
  - Telegram auth accepted/rejected
  - Telegram user id resolved or not
  - Telegram Bot API success/failure
- Logs intentionally avoid:
  - bot token
  - Supabase service role key
  - raw/full `initData`
  - sensitive Telegram payload details
