# VAELMOUR REPORT — P1 Shop And Lootbox Foundation

## Summary of Shop/Lootbox System Added
This task introduces a complete, production-ready gameplay economy foundation allowing players to spend in-game gold to acquire Lootboxes (chests) and open them for valuable material rewards or affix-enabled weapons and armor. All features utilize Ukrainian localization for user-facing texts to maintain complete consistency with the existing Vaelmour game files.

---

## Files Changed
1. **[lootboxes.ts](file:///c:/Users/h1sok/OneDrive/Робочий%20стіл/Vaelmour/Vaelmour_Game/src/data/lootboxes.ts)**: Stores Ukrainian lootbox definitions (common, uncommon, rare, epic chests) with ID, title, description, price, rarity, and reward counts.
2. **[lootboxes.ts](file:///c:/Users/h1sok/OneDrive/Робочий%20стіл/Vaelmour/Vaelmour_Game/src/game/formulas/lootboxes.ts)**: Contains the deterministic `openLootbox()` helper. Validates gold, deducts price, generates item lists, assigns dynamic affixes using the existing `generateItemAffixes` system, and handles merging material items inside the inventory stack.
3. **[ShopScreen.tsx](file:///c:/Users/h1sok/OneDrive/Робочий%20стіл/Vaelmour/Vaelmour_Game/src/features/shop/ShopScreen.tsx)**: Integrates the lootbox store into the UI, rendering gold-purchasable lootboxes, active gold balance, visual feedback of items rolled from chests, and keeping TON premium items locked.
4. **[AppShell.tsx](file:///c:/Users/h1sok/OneDrive/Робочий%20стіл/Vaelmour/Vaelmour_Game/src/app/AppShell.tsx)**: Passes down the `hero` state and `onHeroChange` updates into `ShopScreen`.
5. **[formulas.test.ts](file:///c:/Users/h1sok/OneDrive/Робочий%20стіл/Vaelmour/Vaelmour_Game/src/game/formulas/formulas.test.ts)**: Appended Vitest unit tests verifying gold checks, inventory addition, affix application, and deterministic randomized tests.

---

## Lootbox Types and Definitions
```typescript
export type LootboxRarity = 'common' | 'uncommon' | 'rare' | 'epic';

export type LootboxDefinition = {
  id: string;
  title: string;
  description: string;
  priceGold: number;
  rarity: LootboxRarity;
  rewardCount: number;
  icon: string;
};
```

### Chest Definitions (All Ukrainian):
1. **Скриня постачання (box_01_supply)** — Common — 100 gold (2 rewards).
2. **Скриня мисливця (box_02_hunter)** — Uncommon — 250 gold (3 rewards).
3. **Скриня кутого спорядження (box_03_forged)** — Rare — 600 gold (1 reward).
4. **Скриня стародавніх реліквій (box_04_relic)** — Epic — 1500 gold (3 rewards).

---

## Reward Rules
* **Common Chest (Supply)**: 90% chance of basic materials, 10% chance of common gear.
* **Uncommon Chest (Hunter)**: 60% chance of materials, 40% chance of uncommon gear with 1 random affix.
* **Rare Chest (Forged)**: 100% guaranteed equipment (uncommon or rare) with 1 or 2 generated affixes.
* **Epic Chest (Relic)**: 60% chance of epic or rare gear with 2 or 3 affixes, 40% chance of high-tier materials bundle.

---

## How Rewards Are Added to Inventory
* **Stackable Materials**: Merged with existing inventory stacks if no affixes are present, preventing clutter.
* **Equipment & Unique Items**: Appended as new inventory stack entries carrying rolled `affixes` and exact `rarity` values.

---

## Economy Safety Notes
* **Balance Preservation**: The lootbox reward scaling has been set conservatively. Playing quests and defeating elites/bosses remains the primary, most lucrative progression method, ensuring buying chests does not bypass combat rewards.
* **Real Monetization Blocked**: Zero actual monetization, real-world currencies, or TON payment logic was added. All actions run entirely on mock in-game gold.

---

## Save/Load Compatibility Notes
* No new database fields are introduced on the player's core `HeroState`. All chest contents yield standard `InventoryStack` items which seamlessly load, save, and persist within the game's existing serialization architecture.

---

## Tests Added
The following Vitest unit tests were implemented:
* **Gold Depletion Checks**: Insufficient gold blocks the purchase transaction and returns a Ukrainian error message.
* **Subtractions**: Successful chest open transactions deduct the exact gold cost.
* **Valid Reward Structure**: Ensures item categories, quantities, and properties match specifications.
* **Equipment Affixes**: Verified that generated equipment from chests rolls dynamic bonuses matching the target rarity.
* **Deterministic Injectable Seeds**: Tests run with isolated seed suppliers to guarantee predictable, repeatable loot outcomes.

---

## Validation Results
All pipeline controls have successfully compiled and passed:
* **Typecheck**: `npm run typecheck` — `tsc` compiled perfectly without any errors.
* **Lint**: `npm run lint` — ESLint passed without warnings/errors.
* **Test**: `npm run test` — All 50 unit tests passed.
* **Build**: `npm run build` — High-performance client assets and production chunks generated smoothly.

---

## Known Limitations
* Visual representation of chests opening does not feature highly animated chest flips or advanced particles to strictly respect the **Hard Rule** against UI/layout redesigns.

---

## Confirmation of UI Redesign Restraint
* **Confirmed**: Absolutely no UI colors, screens, fonts, layouts, animations, or styling parameters have been modified or overhauled. Only existing, minimal styling controls were integrated into the active `ShopScreen.tsx`.
