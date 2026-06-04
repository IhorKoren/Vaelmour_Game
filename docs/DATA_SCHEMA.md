# Data Schema

## Primary Generated Data Sets

Vaelmour relies on generated JSON files under `src/data/generated/`.

Core sets currently validated:

- `locations.json`
- `enemies.json`
- `items.json`
- `recipes.json`
- `spawnPools.json`

## Core Relationships

### Locations

- `locations[].id` must be unique
- `locations[].name` must exist
- `locations[].enemies[]` should reference valid enemy IDs
- `locations[].materials[]` should reference valid item/material IDs

### Enemies

- `enemies[].id` must be unique
- `enemies[].name` must exist
- `enemies[].location` should reference a valid location ID
- `enemies[].lootTable` should be present

### Items

- `items[].id` must be unique
- `items[].name` must exist
- `items[].rarity` should be one of:
  - `common`
  - `uncommon`
  - `rare`
  - `epic`
  - `legendary`

### Recipes

- `recipes[].id` must be unique
- `recipes[].name` must exist
- `recipes[].result` should match a known item ID or item name
- `recipes[].materials[].id` should reference valid item/material IDs

### Spawn Pools

- `spawnPools[].location_id` should reference a valid location ID

## Validation Command

Run:

```bash
npm run validate:data
```

This script is intended as a lightweight deployment guard against broken references and accidental content drift.
