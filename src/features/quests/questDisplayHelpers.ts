import { getDisplayItemName } from '../../utils/displayHelpers';
import type { QuestReward } from '../../game/types';

/**
 * Formats quest rewards into Ukrainian display lines.
 */
export function formatQuestRewards(rewards: QuestReward): string[] {
  const lines: string[] = [];


  if (rewards.xp && rewards.xp > 0) {
    lines.push(`+${rewards.xp} досвіду`);
  }

  if (rewards.recipeIds && rewards.recipeIds.length > 0) {
    for (const recipeId of rewards.recipeIds) {
      const name = getDisplayItemName(recipeId);
      const cleanName = name.replace(/^Креслення:\s*/i, '');
      lines.push(`Рецепт: ${cleanName}`);
    }
  }

  const materialList = rewards.materialIds ?? [];
  const qtyMap = rewards.materialQuantities ?? {};

  // Find all unique material IDs to avoid double-counting
  const uniqueMaterialIds = new Set<string>();
  for (const mId of materialList) {
    uniqueMaterialIds.add(mId);
  }
  for (const mId of Object.keys(qtyMap)) {
    uniqueMaterialIds.add(mId);
  }

  for (const mId of uniqueMaterialIds) {
    const qty = qtyMap[mId] ?? 1;
    const materialName = getDisplayItemName(mId);
    lines.push(`Матеріали: ${materialName} ×${qty}`);
  }

  return lines;
}
