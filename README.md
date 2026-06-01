# Vaelmour Game

React + TypeScript + Vite starter project for Vaelmour.

## Data source

This project is connected to the generated master database:

- `src/data/generated/`
- `src/data/masterDatabase.ts`
- `src/data/index.ts`

Current generated gameplay data:

- 150 enemies
- 30 elite enemies
- 3 bosses
- 90 weapons
- 90 armors
- 12 skills
- 24 materials
- 14 locations
- 30 recipes
- 234 item definitions

## Install and verify

```bash
npm install
npm run typecheck
npm run build
npm run lint
```

## Codex workflow

Use the Vault task:

```text
../Vaelmour_Vault/08_Codex_Tasks/approved/001_verify_master_database_integration.md
```

Codex should not replace generated data with placeholders.
