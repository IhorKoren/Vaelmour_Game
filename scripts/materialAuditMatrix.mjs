import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { buildCraftingMaterialAudit } from './lib/craftingMaterialAudit.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '..');

const audit = buildCraftingMaterialAudit(repoRoot);

console.log('# Crafting Material Audit Matrix\n');
console.log(`Recipes: ${audit.summary.recipeCount}`);
console.log(`Rows: ${audit.summary.rowCount}`);
console.log(`Errors: ${audit.summary.errorCount}`);
console.log(`Warnings: ${audit.summary.warningCount}\n`);
console.log('| Recipe ID | Result Item ID | Slot | Level | Material | Qty | Category | Tier Step | Level Range | Earliest Source | Source Loc ID | Source Min Level | Source Type | Status |');
console.log('| --- | --- | --- | ---: | --- | ---: | --- | ---: | --- | --- | --- | ---: | --- | --- |');

for (const row of audit.rows) {
  const levelRange = Array.isArray(row.materialLevelRange) ? row.materialLevelRange.join('-') : 'n/a';
  const earliestSource = row.earliestSourceLocationName ?? 'n/a';
  console.log(
    `| ${row.recipeId} | ${row.resultItemId} | ${row.slot} | ${row.requiredLevel} | ${row.materialId} | ${row.materialQty} | ${row.materialCategory ?? 'n/a'} | ${row.materialTierStep ?? 'n/a'} | ${levelRange} | ${earliestSource} | ${row.earliestSourceLocationId ?? 'n/a'} | ${row.earliestSourceLocationMinLevel ?? 'n/a'} | ${row.sourceType ?? 'n/a'} | ${row.alignmentStatus} |`
  );
}

if (audit.errors.length > 0) {
  console.log('\n## Errors');
  for (const error of audit.errors) {
    console.log(`- ${error}`);
  }
}

if (audit.warnings.length > 0) {
  console.log('\n## Warnings');
  for (const warning of audit.warnings) {
    console.log(`- ${warning}`);
  }
}
