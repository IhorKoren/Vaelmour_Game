export const CAMERA_MODES = [
  "REFERENCE_FIXED",
  "FOLLOW_ROTATION",
] as const;

export type CameraMode = (typeof CAMERA_MODES)[number];

export interface CameraConfig {
  mode: CameraMode;
  positionLerp: number;
  rotationLerp: number;
  referenceLookAhead: number;
  followRotationLookAhead: number;
  followRotationLookAheadSpeedFactor: number;
  followRotationPlayerScreenY: number;
  maxLookAhead: number;
}

export type NumericCameraConfigKey = Exclude<keyof CameraConfig, "mode">;

export interface CameraTuningDefinition {
  label: string;
  min: number;
  max: number;
  step: number;
}

export const DEFAULT_CAMERA_CONFIG: Readonly<CameraConfig> = {
  mode: "REFERENCE_FIXED",
  positionLerp: 0.1,
  rotationLerp: 0.09,
  referenceLookAhead: 0,
  followRotationLookAhead: 8,
  followRotationLookAheadSpeedFactor: 44,
  followRotationPlayerScreenY: 0.62,
  maxLookAhead: 52,
};

export const CAMERA_TUNING_DEFINITIONS: Record<
  NumericCameraConfigKey,
  CameraTuningDefinition
> = {
  positionLerp: {
    label: "CAMERA_POSITION_LERP",
    min: 0.02,
    max: 0.3,
    step: 0.01,
  },
  rotationLerp: {
    label: "FOLLOW_ROTATION_LERP",
    min: 0.02,
    max: 0.3,
    step: 0.01,
  },
  referenceLookAhead: {
    label: "REFERENCE_LOOK_AHEAD",
    min: 0,
    max: 80,
    step: 2,
  },
  followRotationLookAhead: {
    label: "FOLLOW_LOOK_AHEAD",
    min: 0,
    max: 80,
    step: 2,
  },
  followRotationLookAheadSpeedFactor: {
    label: "FOLLOW_SPEED_LOOK_AHEAD",
    min: 0,
    max: 120,
    step: 2,
  },
  followRotationPlayerScreenY: {
    label: "FOLLOW_PLAYER_SCREEN_Y",
    min: 0.55,
    max: 0.7,
    step: 0.01,
  },
  maxLookAhead: {
    label: "CAMERA_MAX_LOOK_AHEAD",
    min: 0,
    max: 140,
    step: 2,
  },
};

export function createCameraConfig(): CameraConfig {
  return { ...DEFAULT_CAMERA_CONFIG };
}

export function validateCameraConfig(config: CameraConfig) {
  if (!CAMERA_MODES.includes(config.mode)) {
    throw new RangeError(`Unsupported camera mode: ${String(config.mode)}`);
  }

  for (const key of Object.keys(
    CAMERA_TUNING_DEFINITIONS,
  ) as NumericCameraConfigKey[]) {
    const value = config[key];
    const definition = CAMERA_TUNING_DEFINITIONS[key];
    if (
      !Number.isFinite(value) ||
      value < definition.min ||
      value > definition.max
    ) {
      throw new RangeError(
        `${key} must be between ${definition.min} and ${definition.max}.`,
      );
    }
  }
}
