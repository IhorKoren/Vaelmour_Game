import { ITEMS } from '../../shared/game-data/items'
import { PHASE7_ITEMS, PHASE7_RECIPES, PHASE7_RESOURCES } from '../../shared/game-data/phase7Catalog'
import { RECIPES } from '../../shared/game-data/recipes'
import { RESOURCES } from '../../shared/game-data/resources'
import { ENEMY_CATALOG, RIFT_CATALOG } from '../../shared/game-data/rifts'
import type { Profession } from '../../shared/game-data/types'

export function validateContent(): string[] {
  const errors: string[] = []
  const validSlots = new Set(['weapon', 'head', 'chest', 'hands', 'legs', 'feet', 'ring', 'amulet'])
  for (const rift of Object.values(RIFT_CATALOG)) for (const floor of rift.floors) {
    const ids = [...floor.encounterEnemyIds, floor.bossId]
    ids.forEach((id) => { if (!ENEMY_CATALOG[id]) errors.push(`Missing enemy ${id} in ${rift.id}/floor-${floor.floorNumber}`) })
    if (ENEMY_CATALOG[floor.bossId]?.type !== 'BOSS') errors.push(`${floor.bossId} is not a boss`)
    if (floor.encounterEnemyIds.some((id) => ENEMY_CATALOG[id]?.type === 'BOSS')) errors.push(`Boss appears before final encounter on floor ${floor.floorNumber}`)
  }
  for (const recipe of Object.values(RECIPES)) {
    const output = ITEMS[recipe.outputItemId]
    if (!output) errors.push(`Recipe ${recipe.id} has missing output ${recipe.outputItemId}`)
    for (const requirementId of Object.keys(recipe.requirements)) if (!ITEMS[requirementId] || !RESOURCES[requirementId]) errors.push(`Recipe ${recipe.id} has invalid requirement ${requirementId}`)
    if (recipe.targetClass && output?.allowedClass !== recipe.targetClass) errors.push(`Recipe ${recipe.id} target class disagrees with output`)
    if (output?.equipType && !validSlots.has(output.equipType)) errors.push(`Item ${output.id} has invalid equip slot`)
    if (recipe.tier && output?.tier !== recipe.tier) errors.push(`Recipe ${recipe.id} tier disagrees with output`)
    const expected: Profession | undefined = recipe.targetClass === 'alchemist' ? 'alchemist' : recipe.targetClass === 'jeweler' ? 'jeweler'
      : recipe.targetClass ? 'blacksmith' : undefined
    if (expected && recipe.profession !== expected) errors.push(`Recipe ${recipe.id} has wrong profession owner`)
  }
  const ids = [...Object.keys(PHASE7_ITEMS), ...Object.keys(PHASE7_RESOURCES)]
  if (new Set(ids).size !== ids.length) errors.push('Duplicate Phase 7 item/resource id')
  if (new Set(Object.keys(PHASE7_RECIPES)).size !== Object.keys(PHASE7_RECIPES).length) errors.push('Duplicate Phase 7 recipe id')
  return errors
}
