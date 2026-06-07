export const MAX_ADMIN_TEST_COINS = 1_000_000_000;

export function clampAdminCoins(value: unknown): number {
  const parsed = Number(value);

  if (!Number.isFinite(parsed)) {
    return 0;
  }

  return Math.max(0, Math.min(MAX_ADMIN_TEST_COINS, Math.trunc(parsed)));
}

export function applyCoinsDelta(currentValue: string, delta: number): string {
  const nextCoins = clampAdminCoins(Number(currentValue || 0) + delta);
  return String(nextCoins);
}

export function resetCoinsValue(): string {
  return '0';
}
