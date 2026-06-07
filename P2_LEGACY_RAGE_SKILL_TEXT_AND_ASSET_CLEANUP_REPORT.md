# P2 Legacy Rage / Skill Text And Asset Cleanup Report

Date: 2026-06-07
Task: `P2_LEGACY_RAGE_SKILL_TEXT_AND_ASSET_CLEANUP`

## Scope
- Goal: remove legacy rage/skill/combat-log leftovers after the active runtime moved to auto-combat only.
- Non-goals preserved: gameplay, combat balance, enemy stats, crafting logic, drops, recipes, quests, saves, and old-save compatibility.

## Search Terms
- `rage`
- `Rage`
- `лють`
- `skill`
- `skills`
- `ability`
- `навич`
- `вмін`
- `умін`
- `CombatLog`
- `combat journal`

## Exact Files Inspected
- `src/utils/displayHelpers.ts`
- `src/utils/displayHelpers.test.ts`
- `src/styles/global.css`
- `src/assets/generated/ui/rage_bar_orange_mobile.png`
- `src/assets/generated/ui/skill_frame_a_mobile.png`
- `src/assets/generated/ui/skill_frame_b_mobile.png`
- `src/assets/generated/ui/skill_frame_c_mobile.png`
- `src/assets/generated/ui/skill_frame_d_mobile.png`
- `src/data/generated/skills.json`
- `src/data/skills.ts`
- `src/data/index.ts`
- `src/game/formulas/skills.ts`
- `src/game/formulas/combatMechanics.ts`
- `src/game/types.ts`
- `src/game/save/saveSystem.ts`
- `src/game/save/cloudSaveSanitizer.ts`
- `src/game/save/cloudSaveSanitizer.test.ts`
- `src/features/combat/`
- `src/features/character/`
- `src/features/inventory/`
- additional search-hit review across `src/` and `tests/`, including generated data and legacy wording references

## Classification Summary
- Active runtime references:
  - No active combat, character, or inventory runtime still uses skill panels, rage bars, skill buttons, or combat log UI.
  - One display leftover remained in `formatStatDisplay()` for unknown legacy stat keys and was removed.
- Save compatibility references:
  - `src/game/save/saveSystem.ts`
  - `src/game/save/cloudSaveSanitizer.ts`
  - `src/game/save/cloudSaveSanitizer.test.ts`
  - legacy rage/skill fields are still tolerated and do not break load.
- Generated/historical data:
  - `src/data/generated/skills.json`
  - generated JSON files referencing rage/skills/ability wording
  - intentionally kept for validation/import/history safety.
- Display-only text:
  - `src/utils/displayHelpers.ts`
  - cleaned player-facing rage wording from quest, output-effect, and item-description translation paths.
- Dead code:
  - `src/data/skills.ts`
  - `src/game/formulas/skills.ts`
  - `src/game/formulas/combatMechanics.ts`
  - dead `Skill` type in `src/game/types.ts`
  - unused `getDisplaySkillName()` / `getDisplaySkillDescription()` helper exports
- CSS/asset leftovers:
  - `src/styles/global.css`
  - removed dead rage bar, skill card, combat-log, and rage-flash CSS
  - removed confirmed-unused rage/skill frame assets
- Test-only references:
  - `src/utils/displayHelpers.test.ts`
  - `src/game/save/cloudSaveSanitizer.test.ts`
  - historical/generated wording still appears in some test fixtures and generated-data expectations where not player-facing

## What Was Removed
- Dead modules:
  - removed `src/data/skills.ts`
  - removed `src/game/formulas/skills.ts`
  - removed `src/game/formulas/combatMechanics.ts`
  - removed `skills` export from `src/data/index.ts`
  - removed obsolete `Skill` type from `src/game/types.ts`
- Player-facing display leftovers:
  - removed dead skill helper exports from `src/utils/displayHelpers.ts`
  - replaced legacy rage wording in translated quest/item/output-effect strings with neutral combat wording
  - removed generic `rage -> лють` text replacement from combat term normalization
  - hid legacy stat keys like `rageFromAttacks` from `formatStatValueOnly()` and `formatStatDisplay()`
- CSS cleanup:
  - removed dead rage bar selectors
  - removed dead skill-grid / ability-slot / combat-skill-grid selectors
  - removed dead combat-log selectors
  - removed dead rage flash animation and rage-specific CSS variables
  - removed dead button exclusions that only existed for deleted ability-slot UI
- Confirmed-unused assets removed:
  - `src/assets/generated/ui/rage_bar_orange_mobile.png`
  - `src/assets/generated/ui/skill_frame_a_mobile.png`
  - `src/assets/generated/ui/skill_frame_b_mobile.png`
  - `src/assets/generated/ui/skill_frame_c_mobile.png`
  - `src/assets/generated/ui/skill_frame_d_mobile.png`

## What Was Intentionally Kept
- `src/data/generated/skills.json`
  - kept as generated/historical data for validation/import safety.
- generated rage/skill wording across JSON data sets
  - kept because the task explicitly warned against aggressive generated-data deletion.
- `src/game/save/saveSystem.ts` and `src/game/save/cloudSaveSanitizer.ts`
  - kept legacy-field tolerance intact.
- `src/assets/generated/vaelmour_ui_kit_mobile.png`
  - retained because it is still referenced by active non-skill UI skin variables (`--vael-tabs`, `--vael-panels`, `--vael-bars`).

## skills.ts / combatMechanics.ts Verdict
- `src/game/formulas/skills.ts`: removed
  - no active runtime imports
  - no test/build consumers after runtime cleanup
- `src/game/formulas/combatMechanics.ts`: removed
  - no active runtime imports
  - no test/build consumers after runtime cleanup

## Save Compatibility Notes
- Old saves containing `currentRage`, `maxRage`, `skillCooldowns`, and `knownSkillIds` still load safely.
- No save migration logic was removed.
- No inventory, equipment, recipes, quests, gold, XP, HP, or location data was stripped.
- Legacy rage/skill fields are now effectively ignored by current player-facing stat display paths.
- Confirmed by `src/game/save/cloudSaveSanitizer.test.ts` and full test suite pass.

## Tests Added Or Updated
- Updated `src/utils/displayHelpers.test.ts` to prove:
  - legacy rage stat displays are hidden
  - generated/crafted item display text no longer surfaces rage wording
  - quest display text no longer surfaces rage wording
- Retained `src/game/save/cloudSaveSanitizer.test.ts` legacy-save coverage:
  - old rage/skill fields are preserved without rejecting the save
- Runtime/module safety proved indirectly by:
  - `npm run typecheck`
  - `npm run lint`
  - `npm run test`
  - `npm run build`
  - these all passed after module deletion

## Validation Results
- `npm run validate:data`: PASS with pre-existing warning-only data audit output
- `npm run typecheck`: PASS
- `npm run lint`: PASS
- `npm run test`: PASS
- `npm run build`: PASS with existing Vite chunk-size warning
- `npm run balance:audit`: PASS

## Remaining Risks
- P2: generated/historical JSON still contains rage/skill wording because it may still be used by tooling, audits, or import flows.
- P2: some non-player-facing comments/tests/generated notes still mention rage/skills for historical context.
- P2: `formatStatName('rageFromAttacks')` still returns a fallback English label if called directly, but active value/display formatting now suppresses that legacy stat from surfacing to players.
- P2: `src/assets/generated/vaelmour_ui_kit_mobile.png` remains in the project because active UI skin variables still depend on it.

## Final Outcome
- This cleanup stayed within P2 scope.
- No gameplay, balance, enemy, crafting, drop, or save regressions were introduced.
- Legacy rage/skill player-facing leftovers were removed from active display paths.
- Dead rage/skill runtime modules and confirmed-unused UI assets were safely removed.
