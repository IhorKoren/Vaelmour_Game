import Phaser from "phaser";
import type { FollowCamera } from "../camera/FollowCamera";
import type { CameraConfig } from "../config/cameraConfig";
import type { CarRenderConfig } from "../config/carRenderConfig";
import type { ProjectionConfig } from "../config/projectionConfig";
import { createCarVisual } from "../entities/CarVisual";
import type { PlayerCar } from "../entities/PlayerCar";
import type { RemoteCar } from "../entities/RemoteCar";
import { projectWorldPoint } from "./projection";
import { getProjectedCarHeading } from "./carRenderMath";

interface ProjectedCarVisual {
  visual: Phaser.GameObjects.Container;
  shadow: Phaser.GameObjects.Container;
  badge: Phaser.GameObjects.Container | null;
}

export class ProjectedCarRenderer {
  private readonly camera: Phaser.Cameras.Scene2D.Camera;
  private readonly projectedObjects =
    new Set<Phaser.GameObjects.GameObject>();
  private readonly localVisual: ProjectedCarVisual;
  private readonly remoteVisuals = new Map<
    string,
    { car: RemoteCar; projected: ProjectedCarVisual }
  >();
  private active = false;

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly playerCar: PlayerCar,
    private readonly followCamera: FollowCamera,
  ) {
    this.localVisual = {
      visual: createCarVisual(scene, 0xff5a36, {
        includeShadow: false,
      }).root,
      shadow: this.createShadowVisual(),
      badge: null,
    };
    this.localVisual.shadow.setDepth(-1);
    this.localVisual.visual.setDepth(1);
    this.registerProjectedObject(this.localVisual.shadow);
    this.registerProjectedObject(this.localVisual.visual);

    this.camera = scene.cameras.add(
      0,
      0,
      scene.scale.width,
      scene.scale.height,
      false,
      "projected-cars",
    );
    this.camera.setRoundPixels(false);
    this.setActive(false);
  }

  addRemote(car: RemoteCar) {
    if (this.remoteVisuals.has(car.playerId)) {
      return;
    }

    const colorValue = Number.parseInt(car.color.slice(1), 16);
    const projected: ProjectedCarVisual = {
      visual: createCarVisual(this.scene, colorValue, {
        includeShadow: false,
      }).root,
      shadow: this.createShadowVisual(),
      badge: this.createBadge(car.playerId),
    };
    projected.shadow.setDepth(-1);
    projected.visual.setDepth(1);
    projected.badge?.setDepth(2);
    this.registerProjectedObject(projected.shadow);
    this.registerProjectedObject(projected.visual);
    if (projected.badge) {
      this.registerProjectedObject(projected.badge);
    }
    projected.shadow.setVisible(this.active);
    projected.visual.setVisible(this.active);
    projected.badge?.setVisible(this.active);
    car.setLegacyVisualVisible(!this.active);
    this.remoteVisuals.set(car.playerId, { car, projected });
  }

  removeRemote(playerId: string) {
    const entry = this.remoteVisuals.get(playerId);
    if (!entry) {
      return;
    }

    this.destroyProjectedVisual(entry.projected);
    this.remoteVisuals.delete(playerId);
  }

  update(
    cameraConfig: CameraConfig,
    projectionConfig: ProjectionConfig,
    carRenderConfig: CarRenderConfig,
    remoteOpacity: number,
  ) {
    const active =
      cameraConfig.mode !== "LEGACY_FOLLOW_ROTATION" &&
      projectionConfig.groundProjectionEnabled >= 0.5;
    this.setActive(active);
    this.playerCar.setLegacyVisualVisible(!active);
    for (const { car } of this.remoteVisuals.values()) {
      car.setLegacyVisualVisible(!active);
    }

    if (!active) {
      return;
    }

    this.camera.setSize(
      this.scene.cameras.main.width,
      this.scene.cameras.main.height,
    );
    this.ignoreNonProjectedObjects();
    const projectionCamera =
      this.followCamera.getProjectionCamera(projectionConfig);

    this.updateVisual(
      this.localVisual,
      this.playerCar.x,
      this.playerCar.y,
      this.playerCar.rotation,
      projectionCamera,
      projectionConfig,
      carRenderConfig,
      1,
    );

    for (const { car, projected } of this.remoteVisuals.values()) {
      this.updateVisual(
        projected,
        car.x,
        car.y,
        car.rotation,
        projectionCamera,
        projectionConfig,
        carRenderConfig,
        remoteOpacity,
      );
    }
  }

  destroy() {
    this.destroyProjectedVisual(this.localVisual);
    for (const { projected } of this.remoteVisuals.values()) {
      this.destroyProjectedVisual(projected);
    }
    this.remoteVisuals.clear();
    this.projectedObjects.clear();
    this.scene.cameras.remove(this.camera, true);
  }

  private updateVisual(
    projected: ProjectedCarVisual,
    worldX: number,
    worldY: number,
    heading: number,
    projectionCamera: ReturnType<FollowCamera["getProjectionCamera"]>,
    projectionConfig: ProjectionConfig,
    carRenderConfig: CarRenderConfig,
    opacity: number,
  ) {
    const screenPosition = projectWorldPoint(
      { x: worldX, y: worldY },
      projectionCamera,
      projectionConfig,
    );
    const screenHeading = getProjectedCarHeading(
      heading,
      projectionCamera,
      projectionConfig,
    );
    const shadowPosition = projectWorldPoint(
      { x: worldX + 3, y: worldY + 5 },
      projectionCamera,
      projectionConfig,
    );

    projected.visual
      .setPosition(screenPosition.x, screenPosition.y)
      .setRotation(screenHeading)
      .setScale(carRenderConfig.scale)
      .setAlpha(opacity);
    projected.shadow
      .setPosition(shadowPosition.x, shadowPosition.y)
      .setRotation(screenHeading)
      .setScale(carRenderConfig.scale)
      .setAlpha(carRenderConfig.shadowOpacity * opacity);
    projected.badge
      ?.setPosition(
        screenPosition.x,
        screenPosition.y - 48 * carRenderConfig.scale,
      )
      .setRotation(0)
      .setAlpha(opacity);
  }

  private setActive(active: boolean) {
    this.active = active;
    this.camera?.setVisible(active);
    for (const gameObject of this.projectedObjects) {
      (
        gameObject as Phaser.GameObjects.GameObject & {
          setVisible(value: boolean): Phaser.GameObjects.GameObject;
        }
      ).setVisible(active);
    }
  }

  private registerProjectedObject(
    gameObject: Phaser.GameObjects.GameObject,
  ) {
    this.projectedObjects.add(gameObject);
    this.scene.cameras.main.ignore(gameObject);
  }

  private ignoreNonProjectedObjects() {
    for (const gameObject of this.scene.children.list) {
      if (!this.projectedObjects.has(gameObject)) {
        this.camera.ignore(gameObject);
      }
    }
  }

  private createShadowVisual() {
    const root = this.scene.add.container(0, 0);
    root.add([
      this.scene.add.ellipse(0, 3, 44, 66, 0x06100d, 0.28),
      this.scene.add.ellipse(0, 2, 36, 56, 0x06100d, 0.62),
    ]);
    return root;
  }

  private createBadge(playerId: string) {
    const badge = this.scene.add.container(0, 0);
    badge.add([
      this.scene.add
        .rectangle(0, 0, 38, 15, 0x07110d, 0.72)
        .setStrokeStyle(1, 0xffffff, 0.36)
        .setOrigin(0.5),
      this.scene.add
        .text(0, 0, playerId.slice(0, 4).toUpperCase(), {
          color: "#ffffff",
          fontFamily: "Arial, sans-serif",
          fontSize: "9px",
          fontStyle: "bold",
        })
        .setOrigin(0.5),
    ]);
    return badge;
  }

  private destroyProjectedVisual(projected: ProjectedCarVisual) {
    this.projectedObjects.delete(projected.visual);
    this.projectedObjects.delete(projected.shadow);
    projected.visual.destroy();
    projected.shadow.destroy();
    if (projected.badge) {
      this.projectedObjects.delete(projected.badge);
      projected.badge.destroy();
    }
  }
}
