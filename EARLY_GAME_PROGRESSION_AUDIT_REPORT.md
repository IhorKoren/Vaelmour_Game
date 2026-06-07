# Early Game Progression Audit

## Scope
- Fresh post-wipe hero
- `LOC_001` -> `LOC_002` -> `LOC_003`
- Hero levels `1-6`

## What The Player Can Do In The First 10 Minutes
- Start with full basic equipment, `40` gold, and enough starter materials to understand that crafting matters immediately.
- Clear the first curated quest by fighting in `LOC_001` and collecting `MAT_002` from early enemies.
- See the first meaningful crafted weapon path through `recipe_weapon_blade_lvl_03`.
- Open the map and understand that `LOC_002` is the next intended step once the hero reaches roughly level `3`.

## What The Player Can Do In The First 30 Minutes
- Finish the first two curated quests and move into `LOC_002`.
- Gather `MAT_004` from forest enemies and connect those drops to the first non-weapon craft.
- Unlock and work toward `recipe_feet_boots_lvl_03`.
- Reach `LOC_003`, start collecting raider emblems, and understand that early crafted upgrades are now expected rather than optional.

## Movement Motivation
- `LOC_001` -> `LOC_002`: the second curated quest now explicitly asks the player to travel, win fights in the forest, and gather wolf fangs for a direct crafting reward.
- `LOC_002` -> `LOC_003`: the third curated quest now explicitly asks the player to reach the raider camp, collect emblems, craft an upgrade, and equip it.

## Confusion Risks Found
- The previous early quest chain did not clearly teach why the player should leave the first zone.
- The previous reward chain jumped to shield progression too early and did not align reward materials with the unlocked recipe well enough.
- Early map popovers showed too little material context to make route planning obvious.
- Early crafting lock text was functional but weak at telling the player where missing recipes or materials come from.

## Crafting Readability Assessment
- Early crafting becomes understandable soon enough after the quest and hint updates.
- The first guided weapon unlock now arrives with supporting materials instead of feeling abstract.
- The forest quest now points to a concrete boot upgrade path, which helps teach that crafting is broader than just weapon upgrades.
- Missing-material feedback now points the player toward likely drop sources instead of stopping at a dead-end warning.

## Material Visibility Assessment
- Early materials are visible enough after expanding location material previews and aligning quest rewards with real recipe needs.
- `LOC_001`, `LOC_002`, and `LOC_003` now collectively surface the materials needed for the first guided recipe path without relying on boss progression.

## Quest Guidance Assessment
- Early quests now teach the intended sequence more clearly:
- fight enemies
- collect materials
- craft the first useful item
- equip a better item
- move to the next location

## Recommended Follow-Up Priorities
- Manually test the first `30` minutes to confirm the new quest wording feels natural in live play.
- Watch whether repairs feel affordable once the player starts taking durability loss in `LOC_002` and `LOC_003`.
- Continue trimming stale legacy wording from generated data exports only when it affects active player-facing surfaces.

## Summary Judgment
- The early post-wipe progression is now clearer and more teachable without changing core combat balance.
- Crafting is introduced sooner, location movement has stronger reasons, and the first quest arc better matches the actual reward and material flow.
