import {
  phaserHeadingToProjectionAngle,
  projectionAngleToPhaserHeading,
} from "../camera/angleConvention";
import type { ProjectionCamera, ProjectionSettings } from "./projection";
import { projectWorldAngle } from "./projection";

const FULL_TURN = Math.PI * 2;

export function getProjectedCarHeading(
  carHeading: number,
  camera: ProjectionCamera,
  settings: ProjectionSettings,
) {
  const projectedAngle = projectWorldAngle(
    phaserHeadingToProjectionAngle(carHeading),
    settings,
    camera.rotation,
  );
  return projectionAngleToPhaserHeading(projectedAngle);
}

export function getDirectionalFrame(
  screenHeading: number,
  directionCount: number,
) {
  if (!Number.isSafeInteger(directionCount) || directionCount <= 0) {
    throw new RangeError("directionCount must be a positive integer.");
  }

  const normalized =
    ((screenHeading % FULL_TURN) + FULL_TURN) % FULL_TURN;
  return (
    Math.round((normalized / FULL_TURN) * directionCount) %
    directionCount
  );
}
