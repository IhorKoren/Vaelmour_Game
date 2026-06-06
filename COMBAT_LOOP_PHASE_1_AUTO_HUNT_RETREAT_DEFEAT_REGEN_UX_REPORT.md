# COMBAT_LOOP_PHASE_1_AUTO_HUNT_RETREAT_DEFEAT_REGEN_UX_REPORT

## Current Combat State Map

The combat loop transitions through the following distinct states:
1. **idle**: The hero is at camp. The UI displays the selected location's name and options to "Шукати ворога" (Search Enemy) or trigger a boss fight.
2. **searching**: The hero is scanning the area. The UI displays "Шукаємо ворога..." and is backed by a 1.5s search delay timer. Can be cancelled by clicking "Зупинити пошук".
3. **fighting**: An active encounter is in progress. Hero and enemy attack timers tick at intervals calculated from their respective attack speeds.
4. **victory**: The enemy is defeated. Rewards (XP, gold, materials, equipment) are displayed. If auto-hunt is enabled, a new search starts automatically after 2 seconds.
5. **defeat**: The hero's HP falls to 0. Hero HP is set to 1. Timers stop and the player is presented with a clear Ukrainian explanation that they must wait for natural regeneration to recover before fighting again.

---

## Bugs Found

1. **Stale Timers & Double Rewards**: Action timers and victory auto-next timeouts were not strictly bound to the active combat session. A player could trigger retreat/location changes, but late-firing setTimeout callbacks could still grant victory rewards, print logs, or start new phantom fights.
2. **Missing Defeat State**: When the hero fell in battle, the hook instantly set `huntState` to `'idle'` and set HP to 1. The player never saw the defeat UI screen because the game transitioned immediately to camp.
3. **Instant Camp Heal Bypass**: Returning to camp instantly healed the player to full HP. This bypassed the health regeneration mechanic entirely, making it redundant.
4. **Missing Auto-hunt Toggle**: There was no way to pause the auto-hunt loop. The game automatically queued the next fight 2 seconds after victory, forcing the player to click retreat rapidly to stop.

---

## Files Changed

1. **[regenRules.ts](file:///c:/Users/h1sok/OneDrive/%D0%A0%D0%BE%D0%B1%D0%BE%D1%87%D0%B8%D0%B9%20%D1%81%D1%82%D1%96%D0%BB/Vaelmour/Vaelmour_Game/src/app/regenRules.ts)**
   - Modified `shouldApplyPassiveHealthRegen` to permit HP regeneration ticks during active combat.
2. **[regenRules.test.ts](file:///c:/Users/h1sok/OneDrive/%D0%A0%D0%BE%D0%B1%D0%BE%D1%87%D0%B8%D0%B9%20%D1%81%D1%82%D1%96%D0%BB/Vaelmour/Vaelmour_Game/src/app/regenRules.test.ts)**
   - Updated test case expectations to align with the new in-combat HP regeneration rules.
3. **[useCombatSession.ts](file:///c:/Users/h1sok/OneDrive/%D0%A0%D0%BE%D0%B1%D0%BE%D1%87%D0%B8%D0%B9%20%D1%81%D1%82%D1%96%D0%BB/Vaelmour/Vaelmour_Game/src/features/combat/hooks/useCombatSession.ts)**
   - Added `isAutoHuntEnabled` state.
   - Introduced `encounterIdRef` to protect every asynchronous operation.
   - Restructured `handleRetreat` and `handleReturn` to clean up combat states and clear stale rewards. Removed the instant camp full-heal.
   - Added `triggerDefeat` to transition properly to `'defeat'` state with 1 HP.
4. **[CombatScreen.tsx](file:///c:/Users/h1sok/OneDrive/%D0%A0%D0%BE%D0%B1%D0%BE%D1%87%D0%B8%D0%B9%20%D1%81%D1%82%D1%96%D0%BB/Vaelmour/Vaelmour_Game/src/features/combat/CombatScreen.tsx)**
   - Added "Автополювання" checkbox toggle.
   - Implemented low-HP check (<20% max HP) that disables search/boss buttons and shows a warning message.
   - Updated buttons: "Шукати ворога", "Зупинити пошук".
5. **[CombatControls.tsx](file:///c:/Users/h1sok/OneDrive/%D0%A0%D0%BE%D0%B1%D0%BE%D1%87%D0%B8%D0%B9%20%D1%81%D1%82%D1%96%D0%BB/Vaelmour/Vaelmour_Game/src/features/combat/components/CombatControls.tsx)**
   - Updated defeat explanation text in Ukrainian, clarifying the passive recovery rules.
6. **[combatSessionHelpers.test.ts](file:///c:/Users/h1sok/OneDrive/%D0%A0%D0%BE%D0%B1%D0%BE%D1%87%D0%B8%D0%B9%20%D1%81%D1%82%D1%96%D0%BB/Vaelmour/Vaelmour_Game/src/features/combat/hooks/combatSessionHelpers.test.ts)**
   - Created new tests verifying low-HP checks and session validation helpers.

---

## Behavior After Changes

### Behavior after Victory
If **Auto-hunt** is checked, the victory screen displays rewards and starts a 2-second countdown before auto-searching. If unchecked, the loop pauses at the victory screen. Selecting "Відступити" resets the screen and returns the player to camp.

### Behavior after Defeat
When hero HP drops to 0, the game transitions to the `defeat` state and sets HP to 1. All action timers are stopped. The player must click "Завершити полювання" to return to camp. No instant healing occurs.

### Behavior after Retreat
Retreating immediately stops all active timers and clears timeouts. Any pending rewards or late ticks are discarded because the session ID increments.

### HP Regeneration Behavior
The hero regenerates health naturally every 5 seconds (both inside and outside of active combat). Regeneration does not exceed max HP and is blocked if the hero is fully dead (at 0 HP).

### Telegram Full HP Notification Impact
The notification continues to trigger only once per below-full → full transition. Because notifications are blocked during active combat, in-combat regeneration ticks do not cause spam.

---

## Validation Results

- **Data validation**: Passed (`npm run validate:data`)
- **Type check**: Passed (`npm run typecheck`)
- **Lint check**: Passed (`npm run lint`)
- **Vitest tests**: Passed (14 test files, 136 tests completed successfully)
- **Production Build**: Passed (`npm run build`)
