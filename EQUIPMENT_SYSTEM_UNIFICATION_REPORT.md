# Equipment System Unification Report

This report documents the architectural consolidation and verification of the Vaelmour equipment, scaling, and affix systems.

---

## 1. Unification of Affix Systems

We resolved the duplicated random stat generation pathways by establishing a single source of active logic in [`src/game/formulas/affixes.ts`](file:///c:/Users/h1sok/OneDrive/Робочий%20стіл/Vaelmour/Vaelmour_Game/src/game/formulas/affixes.ts):
- **Consolidation**: The duplicate `SLOT_AFFIX_POOLS` and random affix generation logic formerly present in [`src/game/equipment/generatedEquipment.ts`](file:///c:/Users/h1sok/OneDrive/Робочий%20стіл/Vaelmour/Vaelmour_Game/src/game/equipment/generatedEquipment.ts) were removed.
- **Shared Pools**: All slot-specific affix definitions (weapon, head, chest, hands, legs, feet, shield, ring, amulet) are now housed in `affixes.ts`.
- **Duplicate Prevention**: Implemented an optional `excludeType` parameter in `generateItemAffixes()` to ensure that when generating random rarity-based affixes, the item cannot receive an affix that matches its primary roll or an already rolled affix.

---

## 2. Equipment Baseline Source of Truth

We reinstated [`src/data/equipmentCatalog.ts`](file:///c:/Users/h1sok/OneDrive/Робочий%20стіл/Vaelmour/Vaelmour_Game/src/data/equipmentCatalog.ts) as the absolute single source of truth for equipment base stats across all levels (1, 3, 6, 9, 12, 15, 18, 21, 24, 27, 30) and slots:
- **Baseline Pulling**: Equipment instances generated via `createGeneratedEquipmentItem()` pull base stats directly from templates in `equipmentCatalog.ts`.
- **Rarity Independence**: Rarity calculations never multiply baseline stats (damage, armor, HP, block power).
- **Stat Extraction**: Developed the `getItemBaseStats()` helper to cleanly extract base stats from total values by subtracting rolled affixes, preserving visual separation in the UI.

---

## 3. Rarity Rules

Rarity now only influences:
1. **Affix Count**: `common` has 0, `uncommon` has 1, `rare` has 2, `epic` has 3, and `legendary` has 4.
2. **Affix Power Multiplier**: Evaluated using the unified `getRarityMultiplier()` helper in `affixes.ts` (`rare`: 1.15, `epic`: 1.30, `legendary`: 1.45).
3. **No Base Stat Scaling**: Base armor, base HP, base weapon damage, and base block power are entirely unaffected by rarity, ensuring predictable base values.

---

## 4. Accessory Primary Rolls & Separation

Rings and amulets have distinct primary rolls rolled on generation and cleanly formatted in code and the UI:
- **Ring**: Rolls a primary stat from `RING_PRIMARY_POOL` (Damage Bonus, Crit Chance, or Accuracy).
- **Amulet**: Receives base HP from the catalog, plus a primary stat from `AMULET_PRIMARY_POOL` (Health Regen, Life Steal, or Damage Bonus).
- **Affix Exclusion**: The chosen primary roll type is passed as an exclusion constraint to the random affix generator to avoid duplication.
- **UI separation**: In the Inventory Screen, the accessory primary rolls remain bundled under "Базові показники" (Base stats), while the rarity-based random affixes are displayed separately under "Додаткові ефекти & Перековка" where they can be rerolled.

---

## 5. Final Validation Results

All checks compile and execute successfully:
- **Typecheck**: `npm run typecheck` - Passed (0 errors).
- **Lint**: `npm run lint` - Passed (0 errors, 3 warnings).
- **Tests**: `npm run test` - Passed (80/80 tests).
- **Build**: `npm run build` - Passed successfully in production mode.
