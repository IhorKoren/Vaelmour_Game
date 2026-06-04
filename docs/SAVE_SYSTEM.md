# Save System

## Current Save Layers

Vaelmour currently uses two persistence layers:

### Local Save

- Stored in browser `localStorage`
- Managed by [src/game/save/saveSystem.ts](C:\Users\h1sok\OneDrive\Робочий стіл\Vaelmour\Vaelmour_Game\src\game\save\saveSystem.ts)
- Responsible for:
  - fast local persistence
  - offline HP regeneration application
  - migration-safe hero normalization

### Cloud Save

- Sent through [src/telegram/playerCloudSave.ts](C:\Users\h1sok\OneDrive\Робочий стіл\Vaelmour\Vaelmour_Game\src\telegram\playerCloudSave.ts)
- Stored through [netlify/functions/savePlayerState.ts](C:\Users\h1sok\OneDrive\Робочий стіл\Vaelmour\Vaelmour_Game\netlify\functions\savePlayerState.ts)
- Loaded through [netlify/functions/getPlayerState.ts](C:\Users\h1sok\OneDrive\Робочий стіл\Vaelmour\Vaelmour_Game\netlify\functions\getPlayerState.ts)

## Save Safety Rules

### Compatibility

- Existing valid saves must continue loading.
- Backend sanitization prefers clamping and fallback behavior over destructive schema rejection.
- Existing migrated hero fields remain supported.

### Stale Save Protection

- Cloud saves include `updatedAt`.
- Backend now ignores incoming save writes that are older than the currently stored cloud save timestamp.
- Client cloud save handling treats ignored stale writes as expected behavior.

### Server-Side Sanitization

Incoming cloud hero payloads are sanitized before persistence:

- `level`, `xp`, `gold`, `baseHp`, `maxHp`, `currentHp` are clamped.
- invalid `selectedLocationId` values fall back to valid known locations.
- malformed inventory entries are dropped.
- unknown non-generated item IDs are rejected from inventory/equipment save state where detectable.
- malformed generated equipment payloads are dropped.
- malformed equipment slot, durability, and affix maps are sanitized.

## Save Boundaries

The save endpoint is still a broad synchronization endpoint, not a fully authoritative game-state engine.

Current backend guarantees:

- authenticated player identity
- stale write rejection
- basic structural validation
- basic value clamping

Current backend does not yet guarantee:

- server-authoritative combat outcomes
- server-authoritative item acquisition
- server-authoritative economy mutation history
- anti-cheat enforcement for all progression events

## Future Direction

The long-term stable model should be:

1. Client sends validated actions instead of raw complete hero state.
2. Server applies action rules.
3. Server writes authoritative state snapshots and event logs.
4. Client renders the returned state.
