import {
  INTERPOLATION_DELAY_MS,
  REMOTE_CAR_OPACITY,
} from "../../shared/multiplayer/config";

export interface MultiplayerRuntimeConfig {
  remoteCarOpacity: number;
  interpolationDelayMs: number;
}

export const DEFAULT_MULTIPLAYER_CONFIG: Readonly<MultiplayerRuntimeConfig> = {
  remoteCarOpacity: REMOTE_CAR_OPACITY,
  interpolationDelayMs: INTERPOLATION_DELAY_MS,
};

export const MULTIPLAYER_TUNING_DEFINITIONS: Record<
  keyof MultiplayerRuntimeConfig,
  { label: string; min: number; max: number; step: number }
> = {
  remoteCarOpacity: {
    label: "REMOTE_CAR_OPACITY",
    min: 0.25,
    max: 0.8,
    step: 0.05,
  },
  interpolationDelayMs: {
    label: "INTERPOLATION_DELAY_MS",
    min: 50,
    max: 300,
    step: 10,
  },
};

export function createMultiplayerConfig(): MultiplayerRuntimeConfig {
  return { ...DEFAULT_MULTIPLAYER_CONFIG };
}
