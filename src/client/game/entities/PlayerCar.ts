import Phaser from "phaser";
import type { DrivingConfig } from "../config/drivingConfig";
import type { Surface } from "../types";
import { createCarVisual } from "./CarVisual";

export class PlayerCar extends Phaser.GameObjects.Container {
  readonly velocity = new Phaser.Math.Vector2();
  private heading: number;

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    heading: number,
  ) {
    super(scene, x, y);
    this.heading = heading;
    this.rotation = heading;

    this.add(createCarVisual(scene, 0xff5a36).root);
    this.setSize(42, 68);
    scene.add.existing(this);
  }

  update(
    deltaSeconds: number,
    steering: number,
    surface: Surface,
    config: DrivingConfig,
  ) {
    const forward = new Phaser.Math.Vector2(
      Math.sin(this.heading),
      -Math.cos(this.heading),
    );
    const forwardSpeed = this.velocity.dot(forward);
    const absoluteSpeed = this.velocity.length();
    const speedRatio = Phaser.Math.Clamp(
      absoluteSpeed / Math.max(config.maxSpeed, 1),
      0,
      1,
    );

    const offroad = surface === "OFFROAD";
    const accelerationFactor = offroad
      ? config.offroadAccelerationFactor
      : 1;
    const targetMaxSpeed =
      config.maxSpeed * (offroad ? config.offroadMaxSpeedFactor : 1);

    if (forwardSpeed < targetMaxSpeed) {
      this.velocity.add(
        forward
          .clone()
          .scale(config.acceleration * accelerationFactor * deltaSeconds),
      );
    }

    const steeringAtSpeed =
      config.steeringStrength *
      (0.16 + speedRatio * 0.84) *
      Phaser.Math.Linear(1, config.highSpeedSteeringFactor, speedRatio);
    this.heading += steering * steeringAtSpeed * deltaSeconds;

    const updatedForward = new Phaser.Math.Vector2(
      Math.sin(this.heading),
      -Math.cos(this.heading),
    );
    const updatedRight = new Phaser.Math.Vector2(
      updatedForward.y,
      -updatedForward.x,
    );
    const updatedForwardSpeed = this.velocity.dot(updatedForward);
    const lateralSpeed = this.velocity.dot(updatedRight);
    const surfaceGrip = offroad ? config.offroadGripFactor : 1;
    const lateralRetention = Math.exp(
      -(config.lateralGrip * 0.72 + config.grip * 0.28) *
        surfaceGrip *
        deltaSeconds,
    );
    const alignedVelocity = updatedForward
      .clone()
      .scale(Math.max(0, updatedForwardSpeed));
    const lateralVelocity = updatedRight
      .clone()
      .scale(lateralSpeed * lateralRetention);

    this.velocity
      .copy(alignedVelocity.add(lateralVelocity))
      .scale(Math.exp(-config.drag * deltaSeconds));

    const steeringLoss =
      config.steeringDrag *
      Math.abs(steering) *
      speedRatio *
      speedRatio *
      deltaSeconds;
    this.velocity.scale(Math.max(0, 1 - steeringLoss));

    const postGripForwardSpeed = this.velocity.dot(updatedForward);
    if (postGripForwardSpeed > targetMaxSpeed) {
      const excess = postGripForwardSpeed - targetMaxSpeed;
      this.velocity.subtract(
        updatedForward
          .clone()
          .scale(excess * Math.min(1, config.grip * deltaSeconds)),
      );
    }

    this.x += this.velocity.x * deltaSeconds;
    this.y += this.velocity.y * deltaSeconds;
    this.rotation = this.heading;

    return this.velocity.length();
  }
}
