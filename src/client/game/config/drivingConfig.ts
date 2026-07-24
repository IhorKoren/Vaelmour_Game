export interface DrivingConfig {
  maxSpeed: number;
  acceleration: number;
  steeringStrength: number;
  highSpeedSteeringFactor: number;
  grip: number;
  lateralGrip: number;
  drag: number;
  steeringDrag: number;
  steeringReturnSpeed: number;
  offroadMaxSpeedFactor: number;
  offroadAccelerationFactor: number;
  offroadGripFactor: number;
  cameraRotationSmoothing: number;
  cameraPositionSmoothing: number;
  cameraLookAhead: number;
  cameraLookAheadSpeedFactor: number;
  cameraPlayerScreenY: number;
  cameraMaxLookAhead: number;
}

export const DEFAULT_DRIVING_CONFIG: Readonly<DrivingConfig> = {
  maxSpeed: 520,
  acceleration: 280,
  steeringStrength: 2.35,
  highSpeedSteeringFactor: 0.56,
  grip: 4.2,
  lateralGrip: 6.4,
  drag: 0.24,
  steeringDrag: 0.72,
  steeringReturnSpeed: 7,
  offroadMaxSpeedFactor: 0.42,
  offroadAccelerationFactor: 0.34,
  offroadGripFactor: 0.62,
  cameraRotationSmoothing: 5.5,
  cameraPositionSmoothing: 12,
  cameraLookAhead: 8,
  cameraLookAheadSpeedFactor: 44,
  cameraPlayerScreenY: 0.62,
  cameraMaxLookAhead: 52,
};

export interface TuningDefinition {
  label: string;
  min: number;
  max: number;
  step: number;
}

export const TUNING_DEFINITIONS: Record<
  keyof DrivingConfig,
  TuningDefinition
> = {
  maxSpeed: { label: "MAX_SPEED", min: 280, max: 760, step: 10 },
  acceleration: { label: "ACCELERATION", min: 100, max: 500, step: 10 },
  steeringStrength: {
    label: "STEERING_STRENGTH",
    min: 0.8,
    max: 4,
    step: 0.05,
  },
  highSpeedSteeringFactor: {
    label: "HIGH_SPEED_STEERING_FACTOR",
    min: 0.2,
    max: 1,
    step: 0.02,
  },
  grip: { label: "GRIP", min: 1, max: 9, step: 0.1 },
  lateralGrip: { label: "LATERAL_GRIP", min: 1, max: 12, step: 0.1 },
  drag: { label: "DRAG", min: 0.05, max: 0.8, step: 0.01 },
  steeringDrag: {
    label: "STEERING_DRAG",
    min: 0,
    max: 1.8,
    step: 0.02,
  },
  steeringReturnSpeed: {
    label: "STEERING_RETURN_SPEED",
    min: 2,
    max: 14,
    step: 0.25,
  },
  offroadMaxSpeedFactor: {
    label: "OFFROAD_MAX_SPEED_FACTOR",
    min: 0.2,
    max: 0.8,
    step: 0.02,
  },
  offroadAccelerationFactor: {
    label: "OFFROAD_ACCELERATION_FACTOR",
    min: 0.1,
    max: 0.8,
    step: 0.02,
  },
  offroadGripFactor: {
    label: "OFFROAD_GRIP_FACTOR",
    min: 0.2,
    max: 1,
    step: 0.02,
  },
  cameraRotationSmoothing: {
    label: "CAMERA_ROTATION_SMOOTHING",
    min: 1,
    max: 12,
    step: 0.25,
  },
  cameraPositionSmoothing: {
    label: "CAMERA_POSITION_SMOOTHING",
    min: 1,
    max: 20,
    step: 0.25,
  },
  cameraLookAhead: {
    label: "CAMERA_LOOK_AHEAD",
    min: 0,
    max: 80,
    step: 2,
  },
  cameraLookAheadSpeedFactor: {
    label: "CAMERA_LOOK_AHEAD_SPEED_FACTOR",
    min: 0,
    max: 120,
    step: 2,
  },
  cameraPlayerScreenY: {
    label: "CAMERA_PLAYER_SCREEN_Y",
    min: 0.55,
    max: 0.7,
    step: 0.01,
  },
  cameraMaxLookAhead: {
    label: "CAMERA_MAX_LOOK_AHEAD",
    min: 16,
    max: 140,
    step: 2,
  },
};

export function createDrivingConfig(): DrivingConfig {
  return { ...DEFAULT_DRIVING_CONFIG };
}
