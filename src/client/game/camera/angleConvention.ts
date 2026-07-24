import type { Point2D } from "../rendering/projection";

const FULL_TURN = Math.PI * 2;

function wrapAngle(angle: number) {
  return ((angle + Math.PI) % FULL_TURN + FULL_TURN) % FULL_TURN - Math.PI;
}

/**
 * Car headings use 0 = screen/world up. Projection angles use the conventional
 * mathematical direction where 0 = +X and PI/2 = +Y.
 */
export function phaserHeadingToProjectionAngle(phaserHeading: number) {
  return wrapAngle(phaserHeading - Math.PI / 2);
}

export function projectionAngleToPhaserHeading(projectionAngle: number) {
  return wrapAngle(projectionAngle + Math.PI / 2);
}

export function phaserHeadingToWorldVector(
  phaserHeading: number,
): Point2D {
  const projectionAngle =
    phaserHeadingToProjectionAngle(phaserHeading);
  return {
    x: Math.cos(projectionAngle),
    y: Math.sin(projectionAngle),
  };
}
