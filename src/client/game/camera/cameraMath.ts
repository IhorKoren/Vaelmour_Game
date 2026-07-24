const REFERENCE_FPS = 60;

export function shortestAngleDelta(from: number, to: number) {
  return Math.atan2(Math.sin(to - from), Math.cos(to - from));
}

export function frameRateIndependentAlpha(
  lerpAt60Fps: number,
  deltaSeconds: number,
) {
  return 1 - (1 - lerpAt60Fps) ** (deltaSeconds * REFERENCE_FPS);
}

export function interpolateAngleShortest(
  current: number,
  target: number,
  alpha: number,
) {
  return current + shortestAngleDelta(current, target) * alpha;
}
