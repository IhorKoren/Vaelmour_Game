# Project Cleanup Report

This report documents the asset auditing, verification, archiving, and code cleanup steps completed to stabilize the Vaelmour project workspace.

---

## 1. Asset Verification Methodology

Every asset was thoroughly verified before being moved to ensure it was completely safe to archive and that no runtime dependencies or styles were broken:
- **Import Search**: Inspected all `.ts`, `.tsx`, and `.json` files to check for direct image imports.
- **Public Path Search / Reference Search**: Scanned code for string reference paths matching the asset names.
- **CSS url() Search**: Checked `src/styles/global.css` and other CSS definitions to verify if high-resolution originals were referenced.
- **Build Validation**: Ran production builds (`npm run build`) to ensure Vite bundled all necessary assets.
- **Outcome**: Confirmed that only `_mobile.png`, `_mobile.jpg`, or `_icon.png` variants are used in active stylesheets and scripts. The raw high-res source PNGs are completely unreferenced.

---

## 2. List of Moved Assets

To keep files safe without deleting them immediately, the following 31 raw high-resolution source images and unused UI layouts were moved from the active directories into the `src/assets/archive/` directory:

### Raw/Original Source Images
*Moved from `src/assets/generated/` to `src/assets/archive/generated/`:*
- `blackfang_gate_background.png` (2.59 MB)
- `enemy_blackfang_brigand.png` (2.00 MB)
- `enemy_blackfang_brigand_chroma.png` (2.08 MB)
- `enemy_blackfang_brigand_cutout.png` (2.50 MB)
- `enemy_blackfang_brigand_transparent.png` (2.17 MB)
- `enemy_thorn_rot_hound.png` (2.09 MB)
- `enemy_thorn_rot_hound_chroma.png` (1.86 MB)
- `enemy_thorn_rot_hound_cutout.png` (2.10 MB)
- `enemy_thorn_rot_hound_transparent.png` (2.17 MB)
- `hero_vaelmour_back.png` (2.22 MB)
- `hero_vaelmour_back_chroma.png` (1.81 MB)
- `hero_vaelmour_back_cutout.png` (2.82 MB)
- `hero_vaelmour_back_transparent.png` (2.13 MB)
- `hero_vaelmour_front_transparent.png` (1.54 MB)
- `vaelmour_ui_kit.png` (1.75 MB)
- `vaelmour_world_map.png` (3.16 MB)

### Unused UI Resolution Layouts
*Moved from `src/assets/generated/ui/` to `src/assets/archive/generated/ui/`:*
- `bar_empty.png` (131 KB)
- `hp_bar_red.png` (147 KB)
- `nav_character.png` (67 KB)
- `nav_forge.png` (65 KB)
- `nav_hunt.png` (73 KB)
- `nav_inventory.png` (66 KB)
- `nav_map.png` (70 KB)
- `nav_market.png` (66 KB)
- `nav_quests.png` (898 KB)
- `nav_quests_icon.png` (565 KB)
- `rage_bar_orange.png` (138 KB)
- `skill_frame_a.png` (170 KB)
- `skill_frame_b.png` (158 KB)
- `skill_frame_c.png` (150 KB)
- `skill_frame_d.png` (153 KB)

---

## 3. Validation Results

All checks compile and execute successfully post-cleanup:
- **Typecheck**: `npm run typecheck` - Passed (0 errors).
- **Lint**: `npm run lint` - Passed (0 errors, 3 warnings).
- **Tests**: `npm run test` - Passed (80/80 tests).
- **Build**: `npm run build` - Passed successfully in production mode.
