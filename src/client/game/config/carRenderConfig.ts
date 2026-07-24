export interface CarRenderConfig {
  scale: number;
  shadowOpacity: number;
}

export const DEFAULT_CAR_RENDER_CONFIG: Readonly<CarRenderConfig> = {
  scale: 1,
  shadowOpacity: 0.25,
};

export const CAR_RENDER_TUNING_DEFINITIONS: Record<
  keyof CarRenderConfig,
  { label: string; min: number; max: number; step: number }
> = {
  scale: {
    label: "CAR_RENDER_SCALE",
    min: 0.7,
    max: 1.6,
    step: 0.05,
  },
  shadowOpacity: {
    label: "SHADOW_OPACITY",
    min: 0.15,
    max: 0.35,
    step: 0.01,
  },
};

export function createCarRenderConfig(): CarRenderConfig {
  return { ...DEFAULT_CAR_RENDER_CONFIG };
}
