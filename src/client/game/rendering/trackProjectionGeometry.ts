import {
  projectWorldPoint,
  screenToWorld,
  type Point2D,
  type ProjectionCamera,
  type ProjectionSettings,
} from "./projection";

export interface WorldBounds {
  left: number;
  right: number;
  top: number;
  bottom: number;
}

export function getPathNormal(
  points: readonly Point2D[],
  index: number,
): Point2D {
  const previous = points[Math.max(0, index - 2)];
  const next = points[Math.min(points.length - 1, index + 2)];
  const tangentX = next.x - previous.x;
  const tangentY = next.y - previous.y;
  const length = Math.hypot(tangentX, tangentY) || 1;
  return {
    x: -tangentY / length,
    y: tangentX / length,
  };
}

export function createOffsetSegmentQuad(
  points: readonly Point2D[],
  index: number,
  centerOffset: number,
  halfWidth: number,
): readonly [Point2D, Point2D, Point2D, Point2D] {
  if (index < 0 || index >= points.length - 1) {
    throw new RangeError("Segment index is outside the path.");
  }

  const start = points[index];
  const end = points[index + 1];
  const startNormal = getPathNormal(points, index);
  const endNormal = getPathNormal(points, index + 1);
  const firstOffset = centerOffset + halfWidth;
  const secondOffset = centerOffset - halfWidth;

  return [
    {
      x: start.x + startNormal.x * firstOffset,
      y: start.y + startNormal.y * firstOffset,
    },
    {
      x: end.x + endNormal.x * firstOffset,
      y: end.y + endNormal.y * firstOffset,
    },
    {
      x: end.x + endNormal.x * secondOffset,
      y: end.y + endNormal.y * secondOffset,
    },
    {
      x: start.x + startNormal.x * secondOffset,
      y: start.y + startNormal.y * secondOffset,
    },
  ];
}

export function createRoadSegmentQuad(
  points: readonly Point2D[],
  index: number,
  halfWidth: number,
) {
  return createOffsetSegmentQuad(points, index, 0, halfWidth);
}

export function projectTrackPoints(
  points: readonly Point2D[],
  camera: ProjectionCamera,
  settings: ProjectionSettings,
) {
  return points.map((point) =>
    projectWorldPoint(point, camera, settings),
  );
}

export function getProjectedWorldBounds(
  camera: ProjectionCamera,
  settings: ProjectionSettings,
  viewportWidth: number,
  viewportHeight: number,
  margin = 0,
): WorldBounds {
  const corners = [
    { x: -margin, y: -margin },
    { x: viewportWidth + margin, y: -margin },
    {
      x: viewportWidth + margin,
      y: viewportHeight + margin,
    },
    { x: -margin, y: viewportHeight + margin },
  ].map((point) => screenToWorld(point, camera, settings));
  const xs = corners.map((point) => point.x);
  const ys = corners.map((point) => point.y);

  return {
    left: Math.min(...xs),
    right: Math.max(...xs),
    top: Math.min(...ys),
    bottom: Math.max(...ys),
  };
}

export function segmentIntersectsBounds(
  start: Point2D,
  end: Point2D,
  bounds: WorldBounds,
  margin: number,
) {
  return !(
    Math.max(start.x, end.x) < bounds.left - margin ||
    Math.min(start.x, end.x) > bounds.right + margin ||
    Math.max(start.y, end.y) < bounds.top - margin ||
    Math.min(start.y, end.y) > bounds.bottom + margin
  );
}
