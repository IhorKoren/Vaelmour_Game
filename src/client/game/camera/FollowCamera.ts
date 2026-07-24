import Phaser from "phaser";
import type { CameraConfig, CameraMode } from "../config/cameraConfig";
import type { DrivingConfig } from "../config/drivingConfig";
import type { ProjectionConfig } from "../config/projectionConfig";
import type { PlayerCar } from "../entities/PlayerCar";
import {
  projectWorldPoint,
  type ProjectionCamera,
  type WorldPoint,
} from "../rendering/projection";
import { phaserHeadingToWorldVector } from "./angleConvention";
import {
  frameRateIndependentAlpha,
  interpolateAngleShortest,
} from "./cameraMath";

export class FollowCamera {
  private readonly smoothedTarget = new Phaser.Math.Vector2();
  private readonly desiredTarget = new Phaser.Math.Vector2();
  private readonly projectionCamera: ProjectionCamera = {
    x: 0,
    y: 0,
    rotation: 0,
    screenCenterX: 0,
    screenCenterY: 0,
    zoom: 1,
  };
  private smoothedRotation: number;
  private smoothedLookAhead = 0;
  private appliedRotation = 0;
  private previousMode: CameraMode;

  constructor(
    private readonly camera: Phaser.Cameras.Scene2D.Camera,
    private readonly car: PlayerCar,
    cameraConfig: CameraConfig,
    drivingConfig: DrivingConfig,
    projectionConfig: ProjectionConfig,
  ) {
    this.previousMode = cameraConfig.mode;
    this.smoothedRotation = car.rotation;
    this.update(
      0,
      cameraConfig,
      drivingConfig,
      projectionConfig,
      true,
    );
  }

  get rotation() {
    return this.appliedRotation;
  }

  get centerX() {
    return this.smoothedTarget.x;
  }

  get centerY() {
    return this.smoothedTarget.y;
  }

  update(
    deltaSeconds: number,
    cameraConfig: CameraConfig,
    drivingConfig: DrivingConfig,
    projectionConfig: ProjectionConfig,
    initialize = false,
  ) {
    if (cameraConfig.mode !== this.previousMode) {
      this.previousMode = cameraConfig.mode;
      this.smoothedRotation = this.car.rotation;
      this.smoothedLookAhead = this.getDesiredLookAhead(
        cameraConfig,
        drivingConfig,
      );
    }

    const positionAlpha = initialize
      ? 1
      : frameRateIndependentAlpha(
          cameraConfig.positionLerp,
          deltaSeconds,
        );
    const forward = phaserHeadingToWorldVector(this.car.rotation);

    if (cameraConfig.mode === "REFERENCE_FIXED") {
      this.appliedRotation = 0;
      this.smoothedLookAhead = Phaser.Math.Linear(
        this.smoothedLookAhead,
        cameraConfig.referenceLookAhead,
        positionAlpha,
      );
      this.desiredTarget.set(
        this.car.x + forward.x * this.smoothedLookAhead,
        this.car.y + forward.y * this.smoothedLookAhead,
      );
    } else if (cameraConfig.mode === "PROJECTED_FOLLOW") {
      const rotationAlpha = initialize
        ? 1
        : frameRateIndependentAlpha(
            cameraConfig.rotationLerp,
            deltaSeconds,
          );
      this.smoothedRotation = interpolateAngleShortest(
        this.smoothedRotation,
        this.car.rotation,
        rotationAlpha,
      );
      this.appliedRotation = this.smoothedRotation;
      this.smoothedLookAhead = Phaser.Math.Linear(
        this.smoothedLookAhead,
        cameraConfig.projectedLookAhead,
        positionAlpha,
      );

      const rotatedForward = phaserHeadingToWorldVector(
        this.smoothedRotation,
      );
      const playerAnchorDistance =
        ((cameraConfig.projectedPlayerScreenY - 0.5) *
          this.camera.height) /
        (projectionConfig.zoom * projectionConfig.depthScale);
      const targetDistance =
        playerAnchorDistance + this.smoothedLookAhead;
      this.desiredTarget.set(
        this.car.x + rotatedForward.x * targetDistance,
        this.car.y + rotatedForward.y * targetDistance,
      );
    } else {
      const rotationAlpha = initialize
        ? 1
        : frameRateIndependentAlpha(
            cameraConfig.rotationLerp,
            deltaSeconds,
          );
      this.smoothedRotation = interpolateAngleShortest(
        this.smoothedRotation,
        this.car.rotation,
        rotationAlpha,
      );
      this.appliedRotation = this.smoothedRotation;
      this.smoothedLookAhead = Phaser.Math.Linear(
        this.smoothedLookAhead,
        this.getDesiredLookAhead(cameraConfig, drivingConfig),
        positionAlpha,
      );

      const rotatedForward = phaserHeadingToWorldVector(
        this.smoothedRotation,
      );
      const visibleWorldHeight =
        this.camera.height / projectionConfig.zoom;
      const playerAnchorDistance =
        (cameraConfig.followRotationPlayerScreenY - 0.5) *
        visibleWorldHeight;
      const targetDistance =
        playerAnchorDistance + this.smoothedLookAhead;
      this.desiredTarget.set(
        this.car.x + rotatedForward.x * targetDistance,
        this.car.y + rotatedForward.y * targetDistance,
      );
    }

    if (initialize) {
      this.smoothedTarget.copy(this.desiredTarget);
    } else {
      this.smoothedTarget.lerp(this.desiredTarget, positionAlpha);
    }

    this.camera
      .setZoom(projectionConfig.zoom)
      .setRotation(
        cameraConfig.mode === "LEGACY_FOLLOW_ROTATION"
          ? -this.appliedRotation
          : 0,
      )
      .centerOn(this.smoothedTarget.x, this.smoothedTarget.y);
  }

  projectWorldPoint(
    point: WorldPoint,
    projectionConfig: ProjectionConfig,
    out: Phaser.Math.Vector2,
  ) {
    const projected = projectWorldPoint(
      point,
      this.getProjectionCamera(projectionConfig),
      projectionConfig,
    );
    return out.set(projected.x, projected.y);
  }

  getProjectionCamera(
    projectionConfig: ProjectionConfig,
  ): Readonly<ProjectionCamera> {
    this.projectionCamera.x = this.smoothedTarget.x;
    this.projectionCamera.y = this.smoothedTarget.y;
    this.projectionCamera.rotation = this.appliedRotation;
    this.projectionCamera.screenCenterX = this.camera.width * 0.5;
    this.projectionCamera.screenCenterY = this.camera.height * 0.5;
    this.projectionCamera.zoom = projectionConfig.zoom;
    return this.projectionCamera;
  }

  private getDesiredLookAhead(
    cameraConfig: CameraConfig,
    drivingConfig: DrivingConfig,
  ) {
    if (cameraConfig.mode === "REFERENCE_FIXED") {
      return cameraConfig.referenceLookAhead;
    }
    if (cameraConfig.mode === "PROJECTED_FOLLOW") {
      return cameraConfig.projectedLookAhead;
    }

    const speedRatio = Phaser.Math.Clamp(
      this.car.velocity.length() / Math.max(drivingConfig.maxSpeed, 1),
      0,
      1,
    );

    return Math.min(
      cameraConfig.maxLookAhead,
      cameraConfig.followRotationLookAhead +
        cameraConfig.followRotationLookAheadSpeedFactor * speedRatio,
    );
  }

}
