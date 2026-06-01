# Vaelmour Save/Load Compatibility Audit Report

## 1. Summary of Save/Load Audit

We audited and stabilized save/load compatibility after the recent additions of item affixes, equipment affixes, crafting success flow, and the re-roll system. A robust state normalization layer has been integrated directly into the persistence system to guarantee that older saves (missing affix attributes) load seamlessly without causing application crashes, and that current saves successfully persist unique item instance modifications (e.g. rerolled stats and equipped affixes).

---

## 2. Files Changed

- [saveSystem.ts](file:///c:/Users/h1sok/OneDrive/Робочий%20стіл/Vaelmour/Vaelmour_Game/src/game/save/saveSystem.ts) — Created and integrated `normalizeHeroState` to map loaded states to current specifications.
- [formulas.test.ts](file:///c:/Users/h1sok/OneDrive/Робочий%20стіл/Vaelmour/Vaelmour_Game/src/game/formulas/formulas.test.ts) — Appended unit tests covering backwards-compatibility and derived stats safeties.

---

## 3. Normalization / Migration Layer

We introduced the `normalizeHeroState(savedHero: unknown): HeroState` function which acts as a safety validator during every `loadGame()` invocation:
- **Old Saves**: If `equipmentAffixes` is missing, it is dynamically backfilled as a blank dictionary `{}`. If any inventory stack misses its `affixes` array, it is mapped to a blank collection `[]`.
- **Stat Calculations Safeguard**: The `calculateDerivedStats` engine has been updated to parse missing collections safely without throwing `undefined` reference exceptions, preserving full offline and legacy combat support.

---

## 4. How Affixes Are Preserved

### A. Rerolled Affixes
- Rerolling replaces the affix on the inventory stack object.
- Because `saveGame` serializes the full hero state (`JSON.stringify`), the modified `affixes` array is saved cleanly to local storage.
- Loading deserializes this exact array, ensuring all custom statistics remain fully intact.

### B. Equipped Affixes
- When an item is equipped, its affixes are stored in `hero.equipmentAffixes[slot]`.
- This dictionary is serialized during standard saves, ensuring that when the game is reloaded, the bonuses are active and derived statistics are calculated accurately from the start.

---

## 5. Tests Added

We added **3 new unit tests** inside `formulas.test.ts`:
1. **Old Save Backfill**: Validates that old saves missing `equipmentAffixes` or `inventory[].affixes` load cleanly, producing valid empty objects.
2. **Current Save Preservation**: Confirms that items carrying custom affixes in both inventory and active equipment slots survive serialization and normalization untouched.
3. **No Crash Derived Stats**: Confirms that running the stats calculator directly on raw, unnormalized old save states runs successfully without throwing exceptions.

---

## 6. Validation Results

- **TypeScript compilation (`npm run typecheck`)**: `SUCCESS` (0 compile errors)
- **ESLint verification (`npm run lint`)**: `SUCCESS` (0 code standard errors)
- **Automated Unit Tests (`npm run test`)**: `SUCCESS` (All 28 tests passed successfully)
- **Production Build (`npm run build`)**: `SUCCESS` (Build completed in 218ms)

---

## 7. Known Limitations

- **Rerolling Equipped Gear**: For safety, the reroll panel is only visible on unequipped inventory items, ensuring no intermediate active combat state calculations are affected.

---

## 8. Visual Integrity Confirmation

No visual screen redesigns, coloring modifications, panels adjustments, or layouts changes were performed. All updates are entirely technical, persistence-focused, and validation-based.
