export type Surface = "TRACK" | "OFFROAD";

export interface RaceTelemetry {
  speedKph: number;
  lap: number;
  currentLapMs: number;
  bestLapMs: number | null;
  fps: number;
  steering: number;
  surface: Surface;
}

export const INITIAL_TELEMETRY: RaceTelemetry = {
  speedKph: 0,
  lap: 1,
  currentLapMs: 0,
  bestLapMs: null,
  fps: 0,
  steering: 0,
  surface: "TRACK",
};
