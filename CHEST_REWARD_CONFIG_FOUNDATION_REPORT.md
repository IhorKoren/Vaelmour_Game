# Chest Reward Config Foundation Report

## Chest types

- `chest_supply`: materials only
- `chest_equipment`: 1 equipment item plus materials
- `chest_hunter`: 1 Uncommon+ equipment item plus materials and small catalyst chance
- `chest_relic`: 1 Rare+ equipment item plus materials and relic-eligible bonus table
- `chest_slot`: future chosen-slot chest with Uncommon+ rarity floor

## Future prices

- Supply Chest: `10 Coins`
- Equipment Chest: `35 Coins`
- Hunter Chest: `75 Coins`
- Relic Chest: `150 Coins`
- Slot Chest: `120 Coins`

## Rarity tables

- Equipment Chest: Common `55%`, Uncommon `30%`, Rare `12%`, Epic `3%`, Legendary `0%`
- Hunter Chest: Uncommon `55%`, Rare `32%`, Epic `11%`, Legendary `2%`
- Relic Chest: Rare `70%`, Epic `25%`, Legendary `5%`
- Slot Chest: Uncommon `45%`, Rare `40%`, Epic `13%`, Legendary `2%`

## Item level rule

- The new chest preview helpers use the existing `getChestEligibleEquipmentLevels(heroLevel)` rule.
- Current behavior:
  - hero `1` -> `[1, 3]`
  - hero `4` -> `[3, 6]`
  - hero `16` -> `[15, 18]`
  - hero `29` -> `[27, 30]`
  - hero `30` -> `[30]`

## XP relic design

- Added static config entries only:
  - `relic_ring_wanderer_xp`
  - `relic_amulet_forgotten_path_xp`
- Both are fixed level `1`, grant `+20%` XP, are unique equipped, and allow no durability, reroll, or generated affixes.
- Combined XP relic cap is documented as `40%`.
- Runtime XP application is still postponed.

## Implemented now

- Added `src/data/chestConfigs.ts`
- Added `src/data/relicItems.ts`
- Added pure helper module `src/game/formulas/chestRewards.ts`
- Added disabled future chest preview cards to the active `ShopScreen`
- Added tests for config validity, rarity weights, slot selection, eligible levels, relic config, and UI preview behavior

## Postponed

- Coins spending
- TON payment
- Chest opening button or reward fulfillment
- Inventory item generation from chests
- Coin credit/debit behavior
- Withdrawal
- Player market
- Recipes in chest rewards
- Runtime XP relic effects

## Validation results

- `npm run validate:data` passed with pre-existing data warnings only
- `npm run typecheck` passed
- `npm run lint` passed
- `npm run test` passed
- `npm run build` passed
- `npm run balance:audit` passed
