import {
  DEFAULT_PROJECTION_SETTINGS,
  type ProjectionSettings,
} from "../rendering/projection";

export interface ProjectionConfig extends ProjectionSettings {
  zoom: number;
  groundProjectionEnabled: number;
  legacyMeshEnabled: number;
  legacyMeshPitch: number;
  legacyMeshStrength: number;
  legacyMeshVanishingPointY: number;
  legacyMeshNearScale: number;
  legacyMeshFarScale: number;
}

export interface ProjectionTuningDefinition {
  label: string;
  min: number;
  max: number;
  step: number;
}

export const DEFAULT_PROJECTION_CONFIG: Readonly<ProjectionConfig> = {
  ...DEFAULT_PROJECTION_SETTINGS,
  zoom: 1,
  groundProjectionEnabled: 1,
  legacyMeshEnabled: 1,
  legacyMeshPitch: 22,
  legacyMeshStrength: 0.72,
  legacyMeshVanishingPointY: 0.12,
  legacyMeshNearScale: 1.04,
  legacyMeshFarScale: 0.76,
};

export const PROJECTION_TUNING_DEFINITIONS: Record<
  keyof ProjectionConfig,
  ProjectionTuningDefinition
> = {
  depthScale: {
    label: "DEPTH_SCALE",
    min: 0.55,
    max: 0.68,
    step: 0.01,
  },
  heightScale: {
    label: "HEIGHT_SCALE",
    min: 0.5,
    max: 1.5,
    step: 0.05,
  },
  zoom: {
    label: "CAMERA_ZOOM",
    min: 0.8,
    max: 1.2,
    step: 0.01,
  },
  groundProjectionEnabled: {
    label: "GROUND_PROJECTION",
    min: 0,
    max: 1,
    step: 1,
  },
  legacyMeshEnabled: {
    label: "FOLLOW_LEGACY_MESH",
    min: 0,
    max: 1,
    step: 1,
  },
  legacyMeshPitch: {
    label: "LEGACY_MESH_PITCH",
    min: 0,
    max: 35,
    step: 1,
  },
  legacyMeshStrength: {
    label: "LEGACY_MESH_STRENGTH",
    min: 0,
    max: 1,
    step: 0.02,
  },
  legacyMeshVanishingPointY: {
    label: "LEGACY_MESH_VANISHING_Y",
    min: 0.05,
    max: 0.3,
    step: 0.01,
  },
  legacyMeshNearScale: {
    label: "LEGACY_MESH_NEAR_SCALE",
    min: 0.9,
    max: 1.25,
    step: 0.01,
  },
  legacyMeshFarScale: {
    label: "LEGACY_MESH_FAR_SCALE",
    min: 0.7,
    max: 1,
    step: 0.01,
  },
};

export function createProjectionConfig(): ProjectionConfig {
  return { ...DEFAULT_PROJECTION_CONFIG };
}

export function validateProjectionConfig(config: ProjectionConfig) {
  for (const key of Object.keys(
    PROJECTION_TUNING_DEFINITIONS,
  ) as (keyof ProjectionConfig)[]) {
    const value = config[key];
    const definition = PROJECTION_TUNING_DEFINITIONS[key];
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
