import assert from "node:assert/strict";
import { test } from "node:test";
import type { ProjectionCamera } from "./projection";
import {
  getDirectionalFrame,
  getProjectedCarHeading,
} from "./carRenderMath";

const camera: ProjectionCamera = {
  x: 0,
  y: 0,
  rotation: Math.PI / 3,
  screenCenterX: 225,
  screenCenterY: 400,
  zoom: 0.55,
};
const settings = { depthScale: 0.58, heightScale: 1 };

function angleDelta(from: number, to: number) {
  return Math.atan2(Math.sin(to - from), Math.cos(to - from));
}

test("car points up when its heading matches the camera", () => {
  assert.ok(
    Math.abs(
      angleDelta(
        0,
        getProjectedCarHeading(camera.rotation, camera, settings),
      ),
    ) < 1e-10,
  );
});

test("car angle preserves positive, negative, and wrapped relative turns", () => {
  const cases = [
    camera.rotation + Math.PI / 2,
    camera.rotation - Math.PI / 2,
    camera.rotation + Math.PI * 2 - 0.02,
  ];

  for (const heading of cases) {
    const screenHeading = getProjectedCarHeading(
      heading,
      camera,
      settings,
    );
    assert.ok(Number.isFinite(screenHeading));
  }

  assert.ok(
    getProjectedCarHeading(
      camera.rotation + Math.PI / 2,
      camera,
      settings,
    ) > 0,
  );
  assert.ok(
    getProjectedCarHeading(
      camera.rotation - Math.PI / 2,
      camera,
      settings,
    ) < 0,
  );
});

test("directional frame selection supports future sprite sheets", () => {
  assert.equal(getDirectionalFrame(0, 16), 0);
  assert.equal(getDirectionalFrame(Math.PI / 2, 16), 4);
  assert.equal(getDirectionalFrame(-Math.PI / 2, 16), 12);
  assert.equal(getDirectionalFrame(Math.PI * 2, 32), 0);
  assert.throws(() => getDirectionalFrame(0, 0), /positive integer/);
});
