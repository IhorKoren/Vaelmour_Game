import assert from "node:assert/strict";
import { test } from "node:test";
import type { Point2D, ProjectionCamera } from "./projection";
import {
  createRoadSegmentQuad,
  projectTrackPoints,
} from "./trackProjectionGeometry";

const camera: ProjectionCamera = {
  x: 0,
  y: 0,
  screenCenterX: 0,
  screenCenterY: 0,
  zoom: 1,
};

test("projects horizontal, vertical, and diagonal road geometry", () => {
  const cases: Point2D[][] = [
    [
      { x: 0, y: 0 },
      { x: 100, y: 0 },
    ],
    [
      { x: 0, y: 0 },
      { x: 0, y: 100 },
    ],
    [
      { x: 0, y: 0 },
      { x: 100, y: 100 },
    ],
  ];

  for (const points of cases) {
    const quad = createRoadSegmentQuad(points, 0, 20);
    const projected = projectTrackPoints(quad, camera, {
      depthScale: 0.62,
      heightScale: 1,
    });

    assert.equal(projected.length, 4);
    for (const point of projected) {
      assert.ok(Number.isFinite(point.x));
      assert.ok(Number.isFinite(point.y));
    }
  }
});

test("depth scale changes projected Y but not projected X", () => {
  const points = [
    { x: 30, y: 80 },
    { x: 60, y: 120 },
  ];
  const topDown = projectTrackPoints(points, camera, {
    depthScale: 1,
    heightScale: 1,
  });
  const projected = projectTrackPoints(points, camera, {
    depthScale: 0.5,
    heightScale: 1,
  });

  assert.deepEqual(
    projected.map((point) => point.x),
    topDown.map((point) => point.x),
  );
  assert.deepEqual(
    projected.map((point) => point.y),
    topDown.map((point) => point.y * 0.5),
  );
});

test("road helpers do not mutate source world geometry", () => {
  const points = [
    { x: 10, y: 20 },
    { x: 70, y: 90 },
    { x: 140, y: 100 },
  ];
  const snapshot = structuredClone(points);

  const quad = createRoadSegmentQuad(points, 1, 25);
  projectTrackPoints(quad, camera, {
    depthScale: 0.62,
    heightScale: 1,
  });

  assert.deepEqual(points, snapshot);
});

test("affine projection preserves road quad winding", () => {
  const points = [
    { x: 0, y: 0 },
    { x: 100, y: 100 },
  ];
  const quad = createRoadSegmentQuad(points, 0, 20);
  const projected = projectTrackPoints(quad, camera, {
    depthScale: 0.62,
    heightScale: 1,
  });

  const signedArea = (polygon: readonly Point2D[]) =>
    polygon.reduce((area, point, index) => {
      const next = polygon[(index + 1) % polygon.length];
      return area + point.x * next.y - next.x * point.y;
    }, 0);

  assert.notEqual(Math.sign(signedArea(quad)), 0);
  assert.equal(
    Math.sign(signedArea(projected)),
    Math.sign(signedArea(quad)),
  );
});

test("curve, hairpin, and S-section segments stay finite and consistent", () => {
  const points = [
    { x: 0, y: 0 },
    { x: 80, y: 20 },
    { x: 130, y: 80 },
    { x: 90, y: 150 },
    { x: 20, y: 170 },
    { x: -30, y: 120 },
    { x: 10, y: 60 },
  ];

  for (let index = 0; index < points.length - 1; index += 1) {
    const quad = createRoadSegmentQuad(points, index, 18);
    const projected = projectTrackPoints(quad, camera, {
      depthScale: 0.62,
      heightScale: 1,
    });

    assert.ok(
      projected.every(
        (point) => Number.isFinite(point.x) && Number.isFinite(point.y),
      ),
    );
  }
});
