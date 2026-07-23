import type { RaceTelemetry } from "../game/types";

interface HudProps {
  telemetry: RaceTelemetry;
}

function formatLapTime(milliseconds: number | null) {
  if (milliseconds === null) {
    return "--:--.---";
  }

  const minutes = Math.floor(milliseconds / 60000);
  const seconds = Math.floor((milliseconds % 60000) / 1000);
  const millis = Math.floor(milliseconds % 1000);

  return `${minutes}:${seconds.toString().padStart(2, "0")}.${millis
    .toString()
    .padStart(3, "0")}`;
}

export function Hud({ telemetry }: HudProps) {
  return (
    <div className="hud" aria-live="polite">
      <div className="hud-primary">
        <section className="hud-card hud-speed">
          <span className="hud-label">Speed</span>
          <div>
            <strong>{telemetry.speedKph}</strong>
            <span className="hud-unit">km/h</span>
          </div>
        </section>
        <section className="hud-card hud-lap">
          <span className="hud-label">Lap</span>
          <strong>{telemetry.lap}</strong>
        </section>
      </div>

      <div className="hud-times">
        <span>
          <small>Current</small>
          {formatLapTime(telemetry.currentLapMs)}
        </span>
        <span>
          <small>Best</small>
          {formatLapTime(telemetry.bestLapMs)}
        </span>
      </div>

      <div className="hud-debug">
        <span>{telemetry.fps} FPS</span>
        <span>Steer {telemetry.steering.toFixed(2)}</span>
        <span className={telemetry.surface === "TRACK" ? "on-track" : "offroad"}>
          {telemetry.surface}
        </span>
      </div>
    </div>
  );
}
