type PassiveRegenParams = {
  currentHp: number;
  maxHp: number;
  healthRegen: number;
  isFighting: boolean;
};

export function shouldApplyPassiveHealthRegen({
  currentHp,
  maxHp,
  healthRegen,
  isFighting,
}: PassiveRegenParams): boolean {
  if (isFighting) {
    return false;
  }

  if (currentHp <= 0) {
    return false;
  }

  if (healthRegen <= 0) {
    return false;
  }

  return currentHp < maxHp;
}
