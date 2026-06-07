# REMOVE_RAGE_SKILLS_AND_COMBAT_LOG_UI_CLEANUP_REPORT

## Final Verdict
SAFE TO CONTINUE

No P0/P1 blocker was found after the removal pass and validation sweep. Auto-combat, rewards, loot, crafting, quests, progression, and save loading remain functional.

## Audit Areas

### 1. Combat UI and Runtime
Status: PASS

Files inspected:
- `src/features/combat/CombatScreen.tsx`
- `src/features/combat/components/CombatArena.tsx`
- `src/features/combat/components/CombatControls.tsx`
- `src/features/combat/components/CombatHeroPanel.tsx`
- `src/features/combat/components/CombatEnemyPanel.tsx`
- `src/features/combat/components/CombatLogPanel.tsx`
- `src/features/combat/components/index.ts`
- `src/features/combat/hooks/useCombatSession.ts`
- `src/features/combat/services/combatRewards.ts`
- `src/features/combat/services/combatEnemyService.ts`
- `src/features/combat/services/combatLogService.ts`

Removed UI areas:
- combat rage bar
- rage gain flash
- combat skill panel/buttons
- detailed combat log panel

Confirmed working flows:
- start hunt
- start boss fight
- auto-combat attack loop
- victory banner and reward panel
- defeat state and return flow
- auto-hunt continuation after victory

Bugs or risks found:
- none at P0/P1
- `CombatLogPanel` and `combatLogService` were dead after removal and were deleted

Recommended next fixes:
- P2: remove unused rage/skill CSS variables and image assets from `src/styles/global.css`

### 2. Character UI
Status: PASS

Files inspected:
- `src/features/character/CharacterScreen.tsx`

Removed UI areas:
- character skills tab
- skill unlock/progress display
- rage references tied to skill costs

Confirmed working flows:
- equipment tab
- stats tab
- stat point allocation
- equip/unequip/repair item flows

Bugs or risks found:
- none at P0/P1

Recommended next fixes:
- P2: clean remaining mojibake-heavy strings in this file opportunistically during future UI polish

### 3. Combat Formulas and Secondary Stats
Status: PASS

Files inspected:
- `src/game/formulas/combat.ts`
- `src/game/formulas/secondaryStats.ts`
- `src/game/formulas/stats.ts`
- `src/game/types.ts`

Removed/deprecated data fields:
- removed active use of `rageFromAttacks`
- removed active use of `bleedRageBonus`
- removed hero basic-attack dependency on `Skill`
- removed active runtime dependence on skill cooldown/rage mechanics

Confirmed working flows:
- hero basic attack damage
- enemy damage
- bleed/lifesteal/counter/block handling
- derived and secondary stat calculations

Bugs or risks found:
- none at P0/P1

Recommended next fixes:
- P2: retire unused legacy modules `src/game/formulas/combatMechanics.ts` and `src/game/formulas/skills.ts` if no future tooling depends on them

### 4. Save Compatibility
Status: PASS

Files inspected:
- `src/game/save/saveSystem.ts`
- `src/game/save/cloudSaveSanitizer.ts`
- `src/game/save/cloudSaveSanitizer.test.ts`

Save compatibility notes:
- old saves still normalize safely
- legacy rage/skill fields are tolerated because hero payload spreading/sanitization does not reject unknown fields
- inventory, equipment, quests, gold, XP, level, HP, recipes, and durability data remain intact

Confirmed working flows:
- local save normalization
- cloud save sanitation
- migration flags and quest preservation

Bugs or risks found:
- none at P0/P1

Recommended next fixes:
- P2: explicitly strip deprecated rage/skill fields during save migration once historical save support is no longer needed

### 5. Display Helpers and Player-Facing Text
Status: WARNING

Files inspected:
- `src/utils/displayHelpers.ts`
- `src/utils/displayHelpers.test.ts`
- `src/features/inventory/InventoryScreen.tsx`
- `src/data/items.ts`
- `src/data/equipmentCatalog.ts`

Confirmed working flows:
- equipment stat formatting
- generated equipment summary formatting
- inventory details still render after combat/character cleanup

Bugs or risks found:
- some historical rage/skill wording still exists in generated data and helper translation tables for item lore/material names
- these are no longer tied to active combat/character mechanics, but some display-only references may still appear in niche inventory/material text paths

Recommended next fixes:
- P2: replace remaining display-only rage/skill wording in `src/utils/displayHelpers.ts`
- P2: audit generated data descriptions if full terminology removal is desired beyond runtime/UI mechanics

## Tests Updated
- `src/game/formulas/formulas.test.ts`
- `src/game/save/cloudSaveSanitizer.test.ts`
- `src/utils/displayHelpers.test.ts`

Added/updated coverage for:
- skillless combat formula usage
- legacy rage/skill cloud-save tolerance
- display helper fallback for removed rage stat labels

## Validation Results
- `npm run validate:data`: PASS with pre-existing warning-only crafting/spawn/recipe audit messages
- `npm run typecheck`: PASS
- `npm run lint`: PASS
- `npm run test`: PASS
- `npm run build`: PASS with pre-existing Vite chunk-size warning
- `npm run balance:audit`: PASS

## Remaining Risks
- WARNING: display-only rage/skill text still survives in some generated content and translation helper entries
- WARNING: unused rage/skill CSS/assets remain in the repository, though they are no longer required by active combat or character runtime
