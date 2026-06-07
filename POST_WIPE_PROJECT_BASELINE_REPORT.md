# Post-Wipe Project Baseline Report

## Baseline

This document establishes the post-wipe baseline for Vaelmour after controlled progression wipe `progression_wipe_2026_06_07_v1`.

The current game has been manually tested by the owner and is treated as the stable starting point for future development. Future changes should preserve this baseline unless the owner explicitly re-approves a broader systems change.

## Current Active Gameplay Systems

- Auto-combat with hunt, search, fight, victory, defeat, retreat, and auto-hunt flow.
- Enemy progression and balance tuned against the current location ladder.
- Inventory and equipment management across weapon, shield, head, chest, hands, legs, feet, ring, and amulet slots.
- Equipment durability loss during combat and repair actions where supported.
- Crafting with starter recipes, live recipe unlocks, material costs, and crafted progression rewards.
- Curated crafting quest chain with active quest initialization based on the current progression model.
- Runtime material drop resolution aligned to enemy/location sources.
- Gold economy for current runtime features, including chest purchases and item selling.
- Local save, cloud save, wipe-aware normalization, and offline HP regeneration.
- Telegram full-HP notification outside active combat.
- Admin panel and server functions for player save management.

## Removed Or Deprecated Systems

- Rage as an active runtime combat resource is removed from active gameplay.
- Active skill-button gameplay is removed from active gameplay.
- Detailed combat-log UI is removed from active gameplay.
- Legacy generated active quest clutter is removed from the runtime quest board.
- Boss-dependent recipe progression is removed from the live crafting unlock path.

Compatibility note:

- Legacy save fields related to rage, skills, cooldowns, or older quest/save structures may still be preserved or tolerated for migration safety.
- That compatibility support does not mean those systems are active gameplay.

## Runtime Clarifications

- Rage/skill/combat-log UI is no longer active runtime gameplay.
- Market/shop expansion is postponed unless the owner re-approves it.
- The currently shipped shop scope is limited to the existing chest purchase flow and item selling flow.

## Known Warning-Only Issues

- Historical/generated datasets and internal reports may still contain legacy words such as `rage`, `skill`, `ability`, `shop`, or `market`.
- Some compatibility-oriented code and tests still reference removed systems to protect old saves and older generated data.
- Existing market/shop code should be treated as limited current functionality, not as approval for broader economy expansion.

## Current Validation Commands

```bash
npm run validate:data
npm run typecheck
npm run lint
npm run test
npm run build
npm run balance:audit
```

## Recommended Next Development Priorities

- Preserve and extend regression coverage around wipe-aware save normalization and curated quest initialization.
- Expand stable data validation around crafting, drops, and progression assumptions before adding new content.
- Continue low-risk UX cleanup for active screens only, especially where older wording can still confuse players.
- Keep balance work focused on tuning existing progression rather than introducing new gameplay systems.
- Revisit any shop/market expansion only after explicit owner approval.

## Guardrail Summary

Future work should assume:

- post-wipe progression starts from the current wipe ID
- old saves without `wipeId` must reset safely
- new heroes must always receive the current wipe ID
- active quests must stay curated and free of legacy generated clutter
- recipe progression must not depend on boss unlocks
- active combat flow must not require removed rage/skill systems
