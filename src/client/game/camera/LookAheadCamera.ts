import Phaser from "phaser";
import type { DrivingConfig } from "../config/drivingConfig";
import type { PlayerCar } from "../entities/PlayerCar";

const MIN_DIRECTION_SPEED = 2;
const TARGET_SMOOTHING_FACTOR = 0.8;

export class LookAheadCamera {
  private readonly target: Phaser.GameObjects.Zone;
  private readonly smoothedDirection = new Phaser.Math.Vector2();
  private readonly desiredDirection = new Phaser.Math.Vector2();
  private readonly smoothedOffset = new Phaser.Math.Vector2();

  constructor(
    private readonly camera: Phaser.Cameras.Scene2D.Camera,
    scene: Phaser.Scene,
    private readonly car: PlayerCar,
    config: DrivingConfig,
  ) {
    this.target = scene.add.zone(car.x, car.y, 1, 1);
    this.camera.startFollow(
      this.target,
      false,
      config.cameraLerp,
      config.cameraLerp,
    );
  }

  update(deltaSeconds: number, config: DrivingConfig) {
    const speed = this.car.velocity.length();

    if (speed >= MIN_DIRECTION_SPEED) {
      this.desiredDirection.copy(this.car.velocity).scale(1 / speed);
      const directionAlpha =
        1 - Math.exp(-config.cameraDirectionSmoothing * deltaSeconds);

      if (this.smoothedDirection.lengthSq() === 0) {
        this.smoothedDirection.copy(this.desiredDirection);
      } else {
        this.smoothedDirection.lerp(this.desiredDirection, directionAlpha);

        if (this.smoothedDirection.lengthSq() > 0.0001) {
          this.smoothedDirection.normalize();
        }
      }
    }

    const speedRatio = Phaser.Math.Clamp(
      speed / Math.max(config.maxSpeed, 1),
      0,
      1,
    );
    const lookAheadDistance =
      config.cameraLookAhead +
      config.cameraLookAheadSpeedFactor * speedRatio;
    const desiredOffsetX =
      this.smoothedDirection.x *
      lookAheadDistance *
      config.cameraHorizontalLookAheadFactor;
    const desiredOffsetY =
      this.smoothedDirection.y * lookAheadDistance;
    const offsetAlpha =
      1 -
      Math.exp(
        -config.cameraDirectionSmoothing *
          TARGET_SMOOTHING_FACTOR *
          deltaSeconds,
      );

    this.smoothedOffset.x = Phaser.Math.Linear(
      this.smoothedOffset.x,
      desiredOffsetX,
      offsetAlpha,
    );
    this.smoothedOffset.y = Phaser.Math.Linear(
      this.smoothedOffset.y,
      desiredOffsetY,
      offsetAlpha,
    );
    this.target.x = this.car.x + this.smoothedOffset.x;
    this.target.y = this.car.y + this.smoothedOffset.y;
    this.camera.setLerp(config.cameraLerp, config.cameraLerp);
  }
}
