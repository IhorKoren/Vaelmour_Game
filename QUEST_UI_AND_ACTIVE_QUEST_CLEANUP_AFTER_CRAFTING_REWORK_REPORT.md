# Quest UI and Active Quest Cleanup Report

This report documents the implementation details, progression strategies, save migration safety checks, and verification results for the Quest UI and Active Quest Cleanup.

---

## 1. Why the Active Quest List Was Too Large

Previously, `src/data/quests.ts` exported both a massive collection of machine-generated generic quests (`generatedQuests` based on `quests.json`) and the newly designed `curatedCraftingQuests`. This resulted in:
1. A flooded active quest log containing dozens of auto-generated tasks at the same level.
2. Confusion for the player, as generic quests offered only basic Gold/XP rewards, overshadowing the curated crafting chain.
3. Lack of visual representation for recipe and material rewards, making the crafting rework feel invisible.

---

## 2. Reworked Quest List Strategy

To streamline player progression, we isolated the active quest log to focus purely on the crafted progression chain:
*   **Data Isolation**: `questDefinitions` in `quests.ts` has been configured to export **only** the `curatedCraftingQuests` chain (11 thematic quests from level 1 to 27).
*   **Preservation of Source Data**: The generated legacy quests are kept in `quests.ts` (with `questBook` and `mapQuest` exported) so that the master database remains complete and no data files were deleted.

---

## 3. Safe Save Migration Strategy

Existing players' heroes may have active or claimed legacy generated quests in their `hero.quests` array. We introduced a safe, local- and cloud-compatible migration step in `normalizeHeroState` (`saveSystem.ts`):

1.  **Scope**: The migration checks if `migrationFlags.craftingQuestChainV1` is set to `true`. If not, the migration runs.
2.  **Preservation of Curated Progress**: Any active, completed, or claimed curated crafting quest already present in the save is preserved without modification or resets.
3.  **Active List Cleanup**: Legacy generated quests are filtered out and removed from the active state list (without converting or losing other statistics).
4.  **Auto-population**: Curated crafting quests appropriate for the hero's current level (where `hero.level >= quest.requiredLevel`) that are missing from the list are automatically appended as `active`.
5.  **State Safety**: The migration preserves existing flags and updates `migrationFlags.craftingQuestChainV1 = true`. It preserves all other crucial player metrics (gold, XP, known recipe list, and equipment inventories).
6.  **Cloud Load Normalization Hook**: In `AppShell.tsx`, after `loadCloudPlayerSave` returns a cloud state, the loaded hero is passed through `normalizeHeroState` before state updates or schedules occur, ensuring cloud-loaded profiles get successfully migrated.

---

## 4. UI Reward Display Formatter

Instead of overloading `getDisplayItemName`, we implemented a dedicated display formatting helper:
*   **Path**: `src/features/quests/questDisplayHelpers.ts`
*   **Method**: `formatQuestRewards(rewards: QuestReward): string[]`
*   **Formatting details**:
    *   **Gold**: Rendered as `+100 золота` (in Ukrainian).
    *   **XP**: Rendered as `+100 досвіду` (in Ukrainian).
    *   **Recipes**: Looks up the result item of the recipe using `getDisplayItemName` and strips `Креслення: ` to output `Рецепт: {Item Name}` (e.g. `Рецепт: Укріплений клинок`).
    *   **Materials**: Groups unique material IDs from both `materialIds` and keys of `materialQuantities`, maps their quantities (defaulting to 1), and renders as `Матеріали: {Material Name} ×{qty}` (e.g. `Матеріали: Потріскана шкіра ×5`).
*   **Safeguards**:
    *   It collects unique material IDs first, preventing double-counting if a material is referenced in both lists.
    *   `getDisplayItemName` was safely extended to handle recipe IDs starting with `recipe_`, expanding the item result resolution capabilities.

---

## 5. Verification Results

All code modifications are fully validated:
*   **`npm run typecheck`**: Passed with 0 errors.
*   **`npm run lint`**: Passed with 0 errors.
*   **`npm run test`**: 158 tests passed successfully (including new unit tests for `initializeQuests`, safe save migration, cloud path mapping, reward display helper, and material quantity double-counting).
*   **`npm run validate:data`**: Clean data validation exit with 0 errors.
*   **`npm run build`**: Production build packages successfully.
