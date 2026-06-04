export function clearCombatTimeout(
  timeoutRef: { current: ReturnType<typeof setTimeout> | null },
): void {
  if (timeoutRef.current) {
    clearTimeout(timeoutRef.current);
    timeoutRef.current = null;
  }
}

export function replaceCombatTimeout(
  timeoutRef: { current: ReturnType<typeof setTimeout> | null },
  callback: () => void,
  delayMs: number,
): void {
  clearCombatTimeout(timeoutRef);
  timeoutRef.current = setTimeout(() => {
    timeoutRef.current = null;
    callback();
  }, delayMs);
}
