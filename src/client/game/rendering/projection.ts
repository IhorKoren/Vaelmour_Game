export interface Point2D {
  x: number;
  y: number;
}

export interface WorldPoint extends Point2D {
  z?: number;
}

export interface ProjectionCamera {
  x: number;
  y: number;
  rotation: number;
  screenCenterX: number;
  screenCenterY: number;
  zoom: number;
}

export interface ProjectionSettings {
  depthScale: number;
  heightScale: number;
}

export const DEFAULT_PROJECTION_SETTINGS: Readonly<ProjectionSettings> =
  Object.freeze({
    depthScale: 0.62,
    heightScale: 1,
  });

function assertFinite(name: string, value: number) {
  if (!Number.isFinite(value)) {
    throw new RangeError(`${name} must be finite.`);
  }
}

function assertPositive(name: string, value: number) {
  assertFinite(name, value);
  if (value <= 0) {
    throw new RangeError(`${name} must be greater than zero.`);
  }
}

function validatePoint(name: string, point: Point2D) {
  assertFinite(`${name}.x`, point.x);
  assertFinite(`${name}.y`, point.y);
}

function validateSettings(settings: ProjectionSettings) {
  assertPositive("settings.depthScale", settings.depthScale);
  assertPositive("settings.heightScale", settings.heightScale);
}

function validateCamera(camera: ProjectionCamera) {
  assertFinite("camera.x", camera.x);
  assertFinite("camera.y", camera.y);
  assertFinite("camera.rotation", camera.rotation);
  assertFinite("camera.screenCenterX", camera.screenCenterX);
  assertFinite("camera.screenCenterY", camera.screenCenterY);
  assertPositive("camera.zoom", camera.zoom);
}

/**
 * Projects a world-space displacement without applying camera translation.
 */
export function projectWorldVector(
  vector: Point2D,
  zoom = 1,
  settings: ProjectionSettings = DEFAULT_PROJECTION_SETTINGS,
  cameraRotation = 0,
): Point2D {
  validatePoint("vector", vector);
  assertPositive("zoom", zoom);
  validateSettings(settings);
  assertFinite("cameraRotation", cameraRotation);
  const cosine = Math.cos(cameraRotation);
  const sine = Math.sin(cameraRotation);
  const cameraX = vector.x * cosine + vector.y * sine;
  const cameraY = -vector.x * sine + vector.y * cosine;

  return {
    x: cameraX * zoom,
    y: cameraY * zoom * settings.depthScale,
  };
}

/**
 * Projects a conventional mathematical angle, where 0 points along +X.
 */
export function projectWorldAngle(
  worldAngle: number,
  settings: ProjectionSettings = DEFAULT_PROJECTION_SETTINGS,
  cameraRotation = 0,
) {
  assertFinite("worldAngle", worldAngle);
  validateSettings(settings);
  const projected = projectWorldVector(
    {
      x: Math.cos(worldAngle),
      y: Math.sin(worldAngle),
    },
    1,
    settings,
    cameraRotation,
  );
  return Math.atan2(projected.y, projected.x);
}

/**
 * Converts pseudo-height to an upward screen-space offset.
 */
export function projectHeight(
  height: number,
  zoom = 1,
  settings: ProjectionSettings = DEFAULT_PROJECTION_SETTINGS,
) {
  assertFinite("height", height);
  assertPositive("zoom", zoom);
  validateSettings(settings);

  return height * zoom * settings.heightScale;
}

/**
 * Maps a world point to screen coordinates. Pseudo-height affects rendering
 * only and never changes the point's world X/Y position.
 */
export function worldToScreen(
  point: WorldPoint,
  camera: ProjectionCamera,
  settings: ProjectionSettings = DEFAULT_PROJECTION_SETTINGS,
): Point2D {
  validatePoint("point", point);
  validateCamera(camera);
  validateSettings(settings);
  const height = point.z ?? 0;
  assertFinite("point.z", height);

  const projected = projectWorldVector(
    {
      x: point.x - camera.x,
      y: point.y - camera.y,
    },
    camera.zoom,
    settings,
    camera.rotation,
  );

  return {
    x: camera.screenCenterX + projected.x,
    y:
      camera.screenCenterY +
      projected.y -
      projectHeight(height, camera.zoom, settings),
  };
}

export function projectWorldPoint(
  point: WorldPoint,
  camera: ProjectionCamera,
  settings: ProjectionSettings = DEFAULT_PROJECTION_SETTINGS,
) {
  return worldToScreen(point, camera, settings);
}

/**
 * Reconstructs world X/Y for a known pseudo-height. Screen coordinates alone
 * cannot determine height, so callers must pass the same height used to render.
 */
export function screenToWorld(
  point: Point2D,
  camera: ProjectionCamera,
  settings: ProjectionSettings = DEFAULT_PROJECTION_SETTINGS,
  height = 0,
): Point2D {
  validatePoint("point", point);
  validateCamera(camera);
  validateSettings(settings);
  assertFinite("height", height);
  const cameraLocalX =
    (point.x - camera.screenCenterX) / camera.zoom;
  const cameraLocalY =
    (point.y -
      camera.screenCenterY +
      projectHeight(height, camera.zoom, settings)) /
    (camera.zoom * settings.depthScale);
  const cosine = Math.cos(camera.rotation);
  const sine = Math.sin(camera.rotation);

  return {
    x: camera.x + cameraLocalX * cosine - cameraLocalY * sine,
    y: camera.y + cameraLocalX * sine + cameraLocalY * cosine,
  };
}
