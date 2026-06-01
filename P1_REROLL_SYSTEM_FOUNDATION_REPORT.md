# Vaelmour Reroll System Foundation Report

## 1. Summary of Reroll System Added

We have added the first functional reroll system for item affixes. Players can now select any unequipped equipment item carrying bonus stats (affixes) inside their inventory and reroll a chosen affix by paying a gold fee that scales with item rarity. The selected affix is replaced with a new valid modifier rolled from the appropriate category pool, while all other affixes on the item remain perfectly unchanged.

---

## 2. Files Changed

- [reroll.ts](file:///c:/Users/h1sok/OneDrive/Робочий%20стіл/Vaelmour/Vaelmour_Game/src/game/formulas/reroll.ts) [NEW] — Created core reroll calculators and replacement mechanics.
- [affixes.ts](file:///c:/Users/h1sok/OneDrive/Робочий%20стіл/Vaelmour/Vaelmour_Game/src/game/formulas/affixes.ts) — Exported affix pools and definitions to allow reuse.
- [InventoryScreen.tsx](file:///c:/Users/h1sok/OneDrive/Робочий%20стіл/Vaelmour/Vaelmour_Game/src/features/inventory/InventoryScreen.tsx) — Added interactive "Перекрутити" buttons, cost displays, and status messages directly next to each item affix.
- [formulas.test.ts](file:///c:/Users/h1sok/OneDrive/Робочий%20стіл/Vaelmour/Vaelmour_Game/src/game/formulas/formulas.test.ts) — Appended unit tests covering the reroll formulas.

---

## 3. Reroll Cost Rules

The gold cost to reroll an affix scales with item rarity:
- **Uncommon (Green)**: 100 gold
- **Rare (Blue)**: 250 gold
- **Epic (Purple)**: 600 gold
- **Legendary (Orange)**: 1500 gold
- **Common (Grey)**: 50 gold

---

## 4. How Reroll Selects / Replaces Affixes

- The player clicks the 🔄 button containing the gold fee next to the target affix line in the inventory preview.
- The game validates that the item carries affixes, the selected index is correct, and the hero has enough gold.
- A new affix is rolled from the correct category pool (Weapons, Armor, or Accessories).
- **Anti-duplication safety**: The generator filters out any affix types that already exist on other slots of the same item.
- The targeted affix is replaced, while all other affixes remain completely untouched. Gold is consumed immediately.

---

## 5. UI Access Added

We added a minimalist, non-invasive UI inside the existing **Деталі предмета** panel:
- Affixes now render with a small `🔄 [Вартість] зол.` button on their right.
- Shows cost in gold clearly.
- If the item is currently equipped, the reroll button is hidden and a warning is shown: `ℹ️ Зніміть спорядження, щоб перекувати його афікси.` to prevent derived stat issues during active combat.
- A clean status notification appears below the list: `Недостатньо золота!`, `Афікс змінено!`, or `Помилка перековки!`.

---

## 6. Save / Load Compatibility Notes

- Because affixes are stored as simple array properties on inventory stack instances (`inventory: InventoryStack[]`), standard JSON serialization saves and loads them correctly.
- Added full backwards compatibility where items missing `affixes` or `equipmentAffixes` parse safely as empty arrays without throwing errors.

---

## 7. Tests Added

We have added **3 new unit tests** inside `formulas.test.ts`:
1. **Cost verification**: Confirms that cost equations yield correct rarity-based values.
2. **Invalid parameters test**: Verifies that invalid indexes or items without affixes correctly throw errors.
3. **Targeted replacement test**: Confirms that only the target index is replaced with a new random affix type, leaving other index items completely untouched.

---

## 8. Validation Results

- **TypeScript Verification (`npm run typecheck`)**: `SUCCESS` (0 compile errors)
- **ESLint Verification (`npm run lint`)**: `SUCCESS` (0 code standard errors)
- **Automated Unit Tests (`npm run test`)**: `SUCCESS` (All 25 tests passed successfully)
- **Production Build (`npm run build`)**: `SUCCESS` (Build completed in 212ms)

---

## 9. Known Limitations & Future Improvements

- **Equipped Item Reroll**: To keep derived stats math extremely safe, players must unequip an item before reforging its affixes. This is explicitly communicated in the UI. A future update could allow on-the-fly equipped re-rolling with live derived stats recalculated immediately.

---

## 10. Visual Integrity Confirmation

No visual screen redesigns, tab changes, styling modifications, or layouts changes were performed. The existing inventory detail view and panels were cleanly reused with minimal inline buttons.
