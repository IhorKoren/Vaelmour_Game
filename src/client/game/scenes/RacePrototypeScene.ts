import Phaser from "phaser";
import type { DrivingConfig } from "../config/drivingConfig";
import { PlayerCar } from "../entities/PlayerCar";
import { SteeringInput } from "../input/SteeringInput";
import { PrototypeTrack } from "../track/PrototypeTrack";
import type { RaceTelemetry, Surface } from "../types";

const TELEMETRY_INTERVAL_MS = 80;

export class RacePrototypeScene extends Phaser.Scene {
  private car!: PlayerCar;
  private steeringInput!: SteeringInput;
  private track!: PrototypeTrack;
  private nextCheckpoint = 1;
  private lap = 1;
  private currentLapMs = 0;
  private bestLapMs: number | null = null;
  private telemetryElapsed = 0;
  private surface: Surface = "TRACK";

  constructor(
    private readonly getDrivingConfig: () => DrivingConfig,
    private readonly onTelemetry: (telemetry: RaceTelemetry) => void,
  ) {
    super("race-prototype");
  }

  create() {
    this.track = new PrototypeTrack();
    this.track.draw(this);

    const start = this.track.getStart();
    this.car = new PlayerCar(
      this,
      start.position.x,
      start.position.y,
      start.heading,
    ).setDepth(10);
    this.steeringInput = new SteeringInput(this);

    this.cameras.main
      .setBounds(0, 0, this.track.worldWidth, this.track.worldHeight)
      .startFollow(
        this.car,
        false,
        this.getDrivingConfig().cameraLerp,
        this.getDrivingConfig().cameraLerp,
        0,
        145,
      );

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.steeringInput.destroy();
    });
  }

  update(_time: number, deltaMs: number) {
    const deltaSeconds = Math.min(deltaMs / 1000, 0.05);
    const drivingConfig = this.getDrivingConfig();
    const steering = this.steeringInput.update(
      deltaSeconds,
      drivingConfig.steeringReturnSpeed,
    );
    const carPosition = new Phaser.Math.Vector2(this.car.x, this.car.y);
    this.surface = this.track.isOnTrack(carPosition) ? "TRACK" : "OFFROAD";
    const speed = this.car.update(
      deltaSeconds,
      steering,
      this.surface,
      drivingConfig,
    );

    this.car.x = Phaser.Math.Clamp(this.car.x, 0, this.track.worldWidth);
    this.car.y = Phaser.Math.Clamp(this.car.y, 0, this.track.worldHeight);
    this.currentLapMs += deltaMs;
    this.telemetryElapsed += deltaMs;
    this.updateCheckpoints(carPosition);
    this.cameras.main.setLerp(
      drivingConfig.cameraLerp,
      drivingConfig.cameraLerp,
    );

    if (this.telemetryElapsed >= TELEMETRY_INTERVAL_MS) {
      this.telemetryElapsed = 0;
      this.onTelemetry({
        speedKph: Math.round(speed * 0.36),
        lap: this.lap,
        currentLapMs: this.currentLapMs,
        bestLapMs: this.bestLapMs,
        fps: Math.round(this.game.loop.actualFps),
        steering,
        surface: this.surface,
      });
    }
  }

  private updateCheckpoints(carPosition: Phaser.Math.Vector2) {
    const checkpoint = this.track.checkpoints[this.nextCheckpoint];

    if (
      Phaser.Math.Distance.Between(
        carPosition.x,
        carPosition.y,
        checkpoint.position.x,
        checkpoint.position.y,
      ) > checkpoint.radius
    ) {
      return;
    }

    if (this.nextCheckpoint === 0) {
      this.bestLapMs =
        this.bestLapMs === null
          ? this.currentLapMs
          : Math.min(this.bestLapMs, this.currentLapMs);
      this.currentLapMs = 0;
      this.lap += 1;
      this.nextCheckpoint = 1;
      return;
    }

    this.nextCheckpoint =
      (this.nextCheckpoint + 1) % this.track.checkpoints.length;
  }
}
