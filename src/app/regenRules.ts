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
}: PassiveRegenParams): boolean {
  if (currentHp <= 0) {
    return false;
  }

  if (healthRegen <= 0) {
    return false;
  }

  return currentHp < maxHp;
}
