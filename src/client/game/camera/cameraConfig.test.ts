import assert from "node:assert/strict";
import { test } from "node:test";
import {
  createCameraConfig,
  validateCameraConfig,
} from "../config/cameraConfig";
import {
  createProjectionConfig,
  validateProjectionConfig,
} from "../config/projectionConfig";
import { projectWorldAngle, worldToScreen } from "../rendering/projection";
import {
  phaserHeadingToProjectionAngle,
  phaserHeadingToWorldVector,
  projectionAngleToPhaserHeading,
} from "./angleConvention";
import {
  frameRateIndependentAlpha,
  interpolateAngleShortest,
  shortestAngleDelta,
} from "./cameraMath";

const EPSILON = 1e-10;

function assertApproximatelyEqual(actual: number, expected: number) {
  assert.ok(
    Math.abs(actual - expected) <= EPSILON,
    `Expected ${expected}, received ${actual}`,
  );
}

function assertAnglesEquivalent(actual: number, expected: number) {
  assertApproximatelyEqual(
    Math.atan2(Math.sin(actual - expected), Math.cos(actual - expected)),
    0,
  );
}

test("defaults to projected follow and the approved runtime tuning", () => {
  const cameraConfig = createCameraConfig();
  const projectionConfig = createProjectionConfig();

  assert.equal(cameraConfig.mode, "PROJECTED_FOLLOW");
  assert.equal(cameraConfig.projectedLookAhead, 0);
  assert.equal(cameraConfig.projectedPlayerScreenY, 0.6);
  assert.equal(cameraConfig.positionLerp, 0.35);
  assert.equal(cameraConfig.rotationLerp, 0.1);
  assert.equal(projectionConfig.depthScale, 0.58);
  assert.equal(projectionConfig.zoom, 0.55);
  assert.equal(projectionConfig.groundProjectionEnabled, 1);
});

test("validates camera and projection runtime configs", () => {
  assert.doesNotThrow(() => validateCameraConfig(createCameraConfig()));
  assert.doesNotThrow(() =>
    validateProjectionConfig(createProjectionConfig()),
  );
  assert.throws(
    () =>
      validateCameraConfig({
        ...createCameraConfig(),
        mode: "INVALID" as "PROJECTED_FOLLOW",
      }),
    /Unsupported camera mode/,
  );
  assert.throws(
    () =>
      validateProjectionConfig({
        ...createProjectionConfig(),
        depthScale: 0,
      }),
    /depthScale must be between/,
  );
});

test("shortest angle delta handles cardinal and wraparound cases", () => {
  const degrees = (value: number) => (value * Math.PI) / 180;
  const cases = [
    [0, 90, 90],
    [90, 180, 90],
    [179, -179, 2],
    [359, 1, 2],
    [-179, 179, -2],
  ];

  for (const [from, to, expected] of cases) {
    assertApproximatelyEqual(
      shortestAngleDelta(degrees(from), degrees(to)),
      degrees(expected),
    );
  }
});

test("camera smoothing is frame-rate independent and stable at rest", () => {
  const oneFrameAlpha = frameRateIndependentAlpha(0.1, 1 / 60);
  assertApproximatelyEqual(oneFrameAlpha, 0.1);
  assertApproximatelyEqual(
    interpolateAngleShortest(Math.PI / 3, Math.PI / 3, oneFrameAlpha),
    Math.PI / 3,
  );

  const current = (359 * Math.PI) / 180;
  const target = Math.PI / 180;
  const next = interpolateAngleShortest(current, target, oneFrameAlpha);
  assert.ok(shortestAngleDelta(current, next) > 0);
});

test("converts Phaser up-forward headings to projection angles", () => {
  const cases = [
    { phaser: 0, projection: -Math.PI / 2 },
    { phaser: Math.PI / 2, projection: 0 },
    { phaser: Math.PI, projection: Math.PI / 2 },
    { phaser: -Math.PI / 2, projection: -Math.PI },
    { phaser: Math.PI / 4, projection: -Math.PI / 4 },
  ];

  for (const angle of cases) {
    assertAnglesEquivalent(
      phaserHeadingToProjectionAngle(angle.phaser),
      angle.projection,
    );
    assertAnglesEquivalent(
      projectionAngleToPhaserHeading(angle.projection),
      angle.phaser,
    );
  }
});

test("angle conversion agrees with projected forward vectors", () => {
  const projectionConfig = createProjectionConfig();
  const heading = Math.PI / 4;
  const forward = phaserHeadingToWorldVector(heading);
  const projectedAngle = projectWorldAngle(
    phaserHeadingToProjectionAngle(heading),
    projectionConfig,
  );

  assertApproximatelyEqual(
    projectedAngle,
    Math.atan2(
      forward.y * projectionConfig.depthScale,
      forward.x,
    ),
  );
});

test("camera projection state maps its world center to viewport center", () => {
  const projectionConfig = createProjectionConfig();
  const screenPoint = worldToScreen(
    { x: 120, y: 450 },
    {
      x: 120,
      y: 450,
      rotation: 0,
      screenCenterX: 225,
      screenCenterY: 400,
      zoom: projectionConfig.zoom,
    },
    projectionConfig,
  );

  assert.deepEqual(screenPoint, { x: 225, y: 400 });
});
