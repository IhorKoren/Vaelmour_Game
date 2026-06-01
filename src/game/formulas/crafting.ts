/**
 * Deterministically rolls for crafting success based on successChance.
 * Rules:
 * - successChance <= 0 always fails (returns false)
 * - successChance >= 1 always succeeds (returns true)
 * - If randomValue is provided, triggers success if randomValue < successChance
 * - Default successChance is 1.0 if not provided or undefined
 */
export function rollCraftSuccess(
  successChance?: number | undefined,
  randomValue?: number
): boolean {
  const chance = successChance === undefined ? 1.0 : successChance;

  if (chance <= 0) return false;
  if (chance >= 1.0) return true;

  const rand = randomValue ?? Math.random();
  return rand < chance;
}
