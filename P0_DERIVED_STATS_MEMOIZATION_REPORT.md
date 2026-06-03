# P0 Derived Stats Memoization Report

## Call Sites Found (`calculateDerivedStats`)
1. [AppShell.tsx](file:///c:/Users/h1sok/OneDrive/Робочий%20стіл/Vaelmour/Vaelmour_Game/src/app/AppShell.tsx):
   - Initial state/restoration functions (cold start loads, startup checks).
   - Real-time HP regeneration interval loop.
   - Hero state change validation handler.
   - Visibility transition monitoring (`useEffect`).
2. [CharacterScreen.tsx](file:///c:/Users/h1sok/OneDrive/Робочий%20стіл/Vaelmour/Vaelmour_Game/src/features/character/CharacterScreen.tsx):
   - Component rendering path display for stats.
   - Point allocation callback.
3. [CombatScreen.tsx](file:///c:/Users/h1sok/OneDrive/Робочий%20стіл/Vaelmour/Vaelmour_Game/src/features/combat/CombatScreen.tsx):
   - Post-victory reward calculation handler.
4. [autoEquipPreset.ts](file:///c:/Users/h1sok/OneDrive/Робочий%20стіл/Vaelmour/Vaelmour_Game/src/game/autoEquipPreset.ts):
   - Auto loadout application logic.
5. [createInitialHero.ts](file:///c:/Users/h1sok/OneDrive/Робочий%20стіл/Vaelmour/Vaelmour_Game/src/game/createInitialHero.ts):
   - Starter template init.
6. [combat.ts](file:///c:/Users/h1sok/OneDrive/Робочий%20стіл/Vaelmour/Vaelmour_Game/src/game/formulas/combat.ts) & [equipment.ts](file:///c:/Users/h1sok/OneDrive/Робочий%20стіл/Vaelmour/Vaelmour_Game/src/game/formulas/equipment.ts) & [power.ts](file:///c:/Users/h1sok/OneDrive/Робочий%20стіл/Vaelmour/Vaelmour_Game/src/game/formulas/power.ts):
   - Internal calculation/game rules formula logic.
7. [saveSystem.ts](file:///c:/Users/h1sok/OneDrive/Робочий%20стіл/Vaelmour/Vaelmour_Game/src/game/save/saveSystem.ts):
   - Save file serialization helper.

## Changed Files
1. **[useDerivedStats.ts](file:///c:/Users/h1sok/OneDrive/Робочий%20стіл/Vaelmour/Vaelmour_Game/src/game/hooks/useDerivedStats.ts)** (NEW):
   - Custom React hook wrapping `calculateDerivedStats` using React's `useMemo`.
2. **[CharacterScreen.tsx](file:///c:/Users/h1sok/OneDrive/Робочий%20стіл/Vaelmour/Vaelmour_Game/src/features/character/CharacterScreen.tsx)**:
   - Uses `useDerivedStats` hook instead of invoking direct calculations on every render.
3. **[AppShell.tsx](file:///c:/Users/h1sok/OneDrive/Робочий%20стіл/Vaelmour/Vaelmour_Game/src/app/AppShell.tsx)**:
   - Uses the `useDerivedStats` hook for UI rendering tasks.
   - Refactored the notification tracking `useEffect` dependency signature to target `[hero.currentHp, derived.maxHp, fullHealthNotificationSent]` instead of the generic `hero` reference to eliminate unnecessary runs.

## Dependency List Used
* `hero.stats.strength`
* `hero.stats.agility`
* `hero.stats.vitality`
* `hero.baseHp`
* `hero.equipment`
* `hero.equipmentDurability`
* `hero.equippedGeneratedItems`
* `hero.equipmentAffixes`

## Verification and Safety
- Stat formulas inside [stats.ts](file:///c:/Users/h1sok/OneDrive/Робочий%20стіл/Vaelmour/Vaelmour_Game/src/game/formulas/stats.ts) were **not** modified.
- No modifications to databases, local storage schemas, or migration logs were made.
- Ran tests and lint checking:
  - `npm run typecheck` — **Passed**
  - `npm run lint` — **Passed**
  - `npm run test` — **Passed**
  - `npm run build` — **Passed**
