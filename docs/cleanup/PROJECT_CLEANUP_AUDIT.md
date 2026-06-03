# Vaelmour Game - Project Cleanup Audit Report

This report outlines the audit performed on the `Vaelmour_Game` codebase to identify outdated, unused, duplicated, or obsolete files, and proposes a safe restructuring plan.

---

## 1. Current Folder Structure

The project has the following main directory structures:
- `netlify/functions/`: Serverless backend functions handling saves, admin operations, and Telegram notifications.
- `src/`: Core React application.
  - `src/admin/`: Admin panel UI.
  - `src/app/`: App Shell and navigation.
  - `src/assets/`: Graphical and layout assets.
  - `src/components/`: Core UI components.
  - `src/data/`: Data adapters, static listings, and subdirectories for compiler-generated master workbook data.
  - `src/features/`: Game screen features (Character, Combat, Crafting, Inventory, Map, Market, Quests, Shop).
  - `src/game/`: Core gameplay systems, formulas, and save systems.
  - `src/styles/`: Styling assets.
  - `src/telegram/`: Telegram WebApp integrations.
  - `src/utils/`: Display translation and formatting helpers.

---

## 2. Entry Points

- **Frontend App Entry Point**: [main.tsx](file:///c:/Users/h1sok/OneDrive/Робочий%20стіл/Vaelmour/Vaelmour_Game/src/main.tsx)
- **App Shell Interface**: [AppShell.tsx](file:///c:/Users/h1sok/OneDrive/Робочий%20стіл/Vaelmour/Vaelmour_Game/src/app/AppShell.tsx)
- **Serverless API Redirects**: [netlify.toml](file:///c:/Users/h1sok/OneDrive/Робочий%20стіл/Vaelmour/Vaelmour_Game/netlify.toml)
- **Primary Stylesheet**: [index.css](file:///c:/Users/h1sok/OneDrive/Робочий%20стіл/Vaelmour/Vaelmour_Game/src/index.css)

---

## 3. Imported/Active Files Graph

Every file currently participating in the bundle is listed below:
- `src/main.tsx`
  - imports `src/app/AppShell.tsx`
  - imports `src/admin/AdminPanel.tsx`
  - imports `src/styles/global.css`
- `src/app/AppShell.tsx`
  - imports `src/telegram/telegramNotifications.ts`
  - imports `src/telegram/playerCloudSave.ts`
  - imports `src/components/layout/BottomNavigation.tsx`
  - imports `src/components/layout/TopStatusBar.tsx`
  - imports `src/features/combat/CombatScreen.tsx`
  - imports `src/features/inventory/InventoryScreen.tsx`
  - imports `src/features/character/CharacterScreen.tsx`
  - imports `src/features/crafting/CraftingScreen.tsx`
  - imports `src/features/quests/QuestsScreen.tsx`
  - imports `src/features/market/MarketScreen.tsx`
  - imports `src/features/shop/ShopScreen.tsx`
  - imports `src/features/map/MapScreen.tsx`
  - imports `src/game/formulas/secondaryStats.ts`
  - imports `src/game/formulas/stats.ts`
  - imports `src/game/save/saveSystem.ts`
  - imports `src/game/createInitialHero.ts`
  - imports `src/game/constants.ts`
- `src/features/*` screens import:
  - formulas from `src/game/formulas/*`
  - display helpers from `src/utils/displayHelpers.ts`
  - components from `src/components/ui/*`
  - data lists from `src/data/*`

---

## 4. Unused / Orphaned Files

These files have no references or imports in the codebase and can be safely moved to archive or deleted:
1. `src/utils/format.ts`: Standard number/percentage formatting functions that are already declared locally inside the admin panel UI. No files import this module.
2. Legacy assets folders (unreferenced by stylesheets or component imports):
   - `src/assets/archive/` (Contains older resolutions/unoptimized versions)
   - `src/assets/backgrounds/` (Obsolete backgrounds, e.g. `arena_bg.png`)
   - `src/assets/characters/` (Obsolete characters, e.g. `hero_wanderer.png`)
   - `src/assets/enemies/` (Obsolete enemies, e.g. `wolf.png`)
   - `src/assets/vaelmour/` (Contains high-res references)

---

## 5. Duplicate Data Sources

- `src/data/generated/` contains generated data.
- The wrapper TS modules in `src/data/` (e.g. `weapons.ts`, `armors.ts`, `shields.ts`) simply export objects from `equipmentCatalog.ts` or parse the generated JSON workbook outputs. They are not duplicate static objects, but rather act as adapters/typings mapping compilers to TypeScript.
- **Verdict**: None of these wrappers are duplicates. They are all safely utilized.

---

## 6. Obsolete Root Reports / Docs

There are 19 historical implementation markdown files polluting the root directory:
- `P0_TECHNICAL_STABILIZATION_REPORT.md`
- `P0_TEST_FOUNDATION_REPORT.md`
- `P0_TRUE_FULL_UI_REBUILD_REPORT.md`
- `P0_VISUAL_CORRECTION_PASS_REPORT.md`
- `P1_BOSS_UNLOCK_FOUNDATION_REPORT.md`
- `P1_CRAFTING_SUCCESS_FLOW_REPORT.md`
- `P1_EARLY_GAME_BALANCE_AUDIT_REPORT.md`
- `P1_ELITE_BOSS_FOUNDATION_REPORT.md`
- `P1_ITEM_AFFIXES_FOUNDATION_REPORT.md`
- `P1_MARKET_SCREEN_FOUNDATION_REPORT.md`
- `P1_MARKET_SELL_ITEM_FOUNDATION_REPORT.md`
- `P1_QUEST_SYSTEM_FOUNDATION_REPORT.md`
- `P1_REROLL_SYSTEM_FOUNDATION_REPORT.md`
- `P1_SAVE_LOAD_COMPATIBILITY_REPORT.md`
- `P1_SHOP_LOOTBOX_FOUNDATION_REPORT.md`
- `EQUIPMENT_SYSTEM_UNIFICATION_REPORT.md`
- `PROJECT_CLEANUP_REPORT.md`
- `completion_report.md`
- `CODEX_README.md`

All of these should be moved to `docs/reports/archive/` to keep the root directory clean.

---

## 7. Admin Panel Audit

- **Imports**: Imported in `src/main.tsx`.
- **Routing**: Routed directly at `<AdminPanel />` when the browser URL pathname starts with `/admin`.
- **Backend security**: The handlers (`netlify/functions/adminGetPlayer.ts`, `adminListPlayers.ts`, `adminUpdatePlayer.ts`) authenticate using `process.env.ADMIN_SECRET`.
- **Verdict**: Keep the admin UI and functions. They are active, secure, and used for system diagnostics.

---

## 8. Telegram WebApp Integration Audit

- **Active features**: Active during player health regeneration checkups, cloud loading/saving (`playerCloudSave.ts`), displaying the player's username (`CharacterScreen.tsx`), and offline alerts.
- **Verdict**: Keep all files in `src/telegram/` and `sendFullHealthNotification.ts`. They are core WebApp systems.

---

## 9. Netlify Serverless Functions Audit

- `netlify/functions/getPlayerState.ts` - **Used** (Core save system)
- `netlify/functions/savePlayerState.ts` - **Used** (Core save system)
- `netlify/functions/sendFullHealthNotification.ts` - **Used** (Telegram WebApp notifications)
- `netlify/functions/adminGetPlayer.ts` - **Used** (Admin panel details)
- `netlify/functions/adminListPlayers.ts` - **Used** (Admin panel list)
- `netlify/functions/adminUpdatePlayer.ts` - **Used** (Admin panel editor)
- `netlify/functions/testSupabaseConnection.ts` - **Used** (Helpful diagnostics utility)

---

## 10. Risky Files (DO NOT TOUCH)

- `src/game/formulas/*`: Core combat, loot, and scaling equations.
- `src/game/save/saveSystem.ts`: Database integration rules.
- `src/telegram/`: WebApp hooks.
- Config files at the root level.

---

## 11. Files Safe to Archive/Move

- 19 root-level markdown reports -> Move to `docs/reports/archive/`
- Unused asset folders -> Move to `docs/archive/unused_code_review/`
- `src/utils/format.ts` -> Move to `docs/archive/unused_code_review/`

---

## 12. Recommended Final Directory Layout

```
Vaelmour_Game/
├── netlify/
│   └── functions/              <-- API endpoints
├── docs/
│   ├── cleanup/                <-- Cleanup documents
│   ├── archive/
│   │   └── unused_code_review/ <-- Unused files archive
│   └── reports/
│       └── archive/            <-- Historical reports
├── src/
│   ├── admin/                  <-- Admin panel components
│   ├── app/                    <-- Application entry points & tabs
│   ├── assets/                 <-- Active game assets
│   ├── components/             <-- Layout/UI reusables
│   ├── data/                   <-- Adapter scripts & compiled json
│   ├── features/               <-- Playable features/screens
│   ├── game/                   <-- Systems, formulas, types, constants
│   ├── styles/                 <-- Primary css sheets
│   ├── telegram/               <-- Telegram integrations
│   └── utils/                  <-- Display translation helpers
```
