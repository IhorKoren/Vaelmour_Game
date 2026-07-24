import Phaser from "phaser";
import type { DrivingConfig } from "../config/drivingConfig";
import type { PlayerCar } from "../entities/PlayerCar";

export class RotatingFollowCamera {
  private readonly smoothedTarget = new Phaser.Math.Vector2();
  private readonly desiredTarget = new Phaser.Math.Vector2();
  private smoothedRotation: number;
  private smoothedLookAhead = 0;

  constructor(
    private readonly camera: Phaser.Cameras.Scene2D.Camera,
    private readonly car: PlayerCar,
    config: DrivingConfig,
  ) {
    this.smoothedRotation = car.rotation;
    this.smoothedLookAhead = this.getDesiredLookAhead(config);
    this.updateTarget(config, true);
  }

  get rotation() {
    return this.smoothedRotation;
  }

  get centerX() {
    return this.smoothedTarget.x;
  }

  get centerY() {
    return this.smoothedTarget.y;
  }

  update(deltaSeconds: number, config: DrivingConfig) {
    const rotationAlpha = this.getSmoothingAlpha(
      config.cameraRotationSmoothing,
      deltaSeconds,
    );
    this.smoothedRotation +=
      Phaser.Math.Angle.Wrap(this.car.rotation - this.smoothedRotation) *
      rotationAlpha;

    const positionAlpha = this.getSmoothingAlpha(
      config.cameraPositionSmoothing,
      deltaSeconds,
    );
    this.smoothedLookAhead = Phaser.Math.Linear(
      this.smoothedLookAhead,
      this.getDesiredLookAhead(config),
      positionAlpha,
    );
    this.updateTarget(config, false, positionAlpha);
  }

  private updateTarget(
    config: DrivingConfig,
    initialize: boolean,
    positionAlpha = 1,
  ) {
    const forwardX = Math.sin(this.smoothedRotation);
    const forwardY = -Math.cos(this.smoothedRotation);
    const visibleWorldHeight = this.camera.height / this.camera.zoom;
    const playerAnchorDistance =
      (config.cameraPlayerScreenY - 0.5) * visibleWorldHeight;
    const targetDistance = playerAnchorDistance + this.smoothedLookAhead;

    this.desiredTarget.set(
      this.car.x + forwardX * targetDistance,
      this.car.y + forwardY * targetDistance,
    );

    if (initialize) {
      this.smoothedTarget.copy(this.desiredTarget);
    } else {
      this.smoothedTarget.lerp(this.desiredTarget, positionAlpha);
    }

    this.camera.setRotation(-this.smoothedRotation);
    this.camera.centerOn(this.smoothedTarget.x, this.smoothedTarget.y);
  }

  private getDesiredLookAhead(config: DrivingConfig) {
    const speedRatio = Phaser.Math.Clamp(
      this.car.velocity.length() / Math.max(config.maxSpeed, 1),
      0,
      1,
    );

    return Math.min(
      config.cameraMaxLookAhead,
      config.cameraLookAhead +
        config.cameraLookAheadSpeedFactor * speedRatio,
    );
  }

  private getSmoothingAlpha(smoothing: number, deltaSeconds: number) {
    return 1 - Math.exp(-Math.max(smoothing, 0) * deltaSeconds);
  }
}
