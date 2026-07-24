import assert from "node:assert/strict";
import { test } from "node:test";
import {
  DEFAULT_PROJECTION_SETTINGS,
  projectHeight,
  projectWorldAngle,
  projectWorldPoint,
  projectWorldVector,
  screenToWorld,
  worldToScreen,
  type Point2D,
  type ProjectionCamera,
  type ProjectionSettings,
} from "./projection";

const EPSILON = 1e-10;

const camera: ProjectionCamera = {
  x: 100,
  y: 200,
  rotation: 0,
  screenCenterX: 225,
  screenCenterY: 400,
  zoom: 2,
};

const settings: ProjectionSettings = {
  depthScale: 0.62,
  heightScale: 0.8,
};

function assertPointApproximatelyEqual(actual: Point2D, expected: Point2D) {
  assert.ok(
    Math.abs(actual.x - expected.x) <= EPSILON,
    `Expected x=${expected.x}, received ${actual.x}`,
  );
  assert.ok(
    Math.abs(actual.y - expected.y) <= EPSILON,
    `Expected y=${expected.y}, received ${actual.y}`,
  );
}

test("uses the reference depth scale by default", () => {
  assert.equal(DEFAULT_PROJECTION_SETTINGS.depthScale, 0.62);
});

test("projects the camera position to the screen center", () => {
  assert.deepEqual(
    projectWorldPoint({ x: camera.x, y: camera.y }, camera, settings),
    { x: camera.screenCenterX, y: camera.screenCenterY },
  );
});

test("projects world vectors with zoom and compressed depth", () => {
  assert.deepEqual(projectWorldVector({ x: 12, y: -20 }, 2, settings), {
    x: 24,
    y: -24.8,
  });
});

test("projects translated world points without rotating the world", () => {
  assert.deepEqual(worldToScreen({ x: 112, y: 180 }, camera, settings), {
    x: 249,
    y: 375.2,
  });
});

test("projects conventional world angles from their direction vectors", () => {
  assert.equal(projectWorldAngle(0, settings), 0);
  assert.equal(projectWorldAngle(Math.PI / 2, settings), Math.PI / 2);
  assert.ok(
    Math.abs(
      projectWorldAngle(Math.PI / 4, settings) -
        Math.atan2(settings.depthScale, 1),
    ) <= EPSILON,
  );
});

test("projects pseudo-height upward without changing screen X", () => {
  assert.equal(projectHeight(10, camera.zoom, settings), 16);
  assert.deepEqual(
    worldToScreen({ x: 112, y: 180, z: 10 }, camera, settings),
    { x: 249, y: 359.2 },
  );
});

test("round-trips screen and world coordinates at ground height", () => {
  const worldPoint = { x: -32.5, y: 907.25 };
  const screenPoint = worldToScreen(worldPoint, camera, settings);

  assertPointApproximatelyEqual(
    screenToWorld(screenPoint, camera, settings),
    worldPoint,
  );
});

test("round-trips X/Y when the pseudo-height is known", () => {
  const worldPoint = { x: 145.5, y: -80.25, z: 37 };
  const screenPoint = worldToScreen(worldPoint, camera, settings);

  assertPointApproximatelyEqual(
    screenToWorld(screenPoint, camera, settings, worldPoint.z),
    worldPoint,
  );
});

test("rejects projection values that cannot produce a stable inverse", () => {
  assert.throws(
    () =>
      worldToScreen(
        { x: 0, y: 0 },
        { ...camera, zoom: 0 },
        settings,
      ),
    /camera\.zoom must be greater than zero/,
  );
  assert.throws(
    () =>
      screenToWorld(
        { x: 0, y: 0 },
        camera,
        { ...settings, depthScale: 0 },
      ),
    /settings\.depthScale must be greater than zero/,
  );
  assert.throws(
    () => projectWorldAngle(Number.NaN, settings),
    /worldAngle must be finite/,
  );
});

test("rotates into camera-local space before depth compression", () => {
  const rotatedCamera = { ...camera, rotation: Math.PI / 2 };
  const projected = worldToScreen(
    { x: camera.x + 20, y: camera.y },
    rotatedCamera,
    settings,
  );

  assertPointApproximatelyEqual(projected, {
    x: camera.screenCenterX,
    y: camera.screenCenterY - 20 * camera.zoom * settings.depthScale,
  });
});

test("supports 180-degree and diagonal camera rotations", () => {
  const worldPoint = { x: 135, y: 245 };

  for (const rotation of [Math.PI, Math.PI / 4]) {
    const rotatedCamera = { ...camera, rotation };
    const screenPoint = worldToScreen(
      worldPoint,
      rotatedCamera,
      settings,
    );
    assertPointApproximatelyEqual(
      screenToWorld(screenPoint, rotatedCamera, settings),
      worldPoint,
    );
  }
});

test("camera rotation happens before depth compression", () => {
  const projected = projectWorldVector(
    { x: 10, y: 0 },
    1,
    { depthScale: 0.5, heightScale: 1 },
    Math.PI / 4,
  );

  assertPointApproximatelyEqual(projected, {
    x: Math.SQRT1_2 * 10,
    y: -Math.SQRT1_2 * 5,
  });
});
