import Phaser from "phaser";
import type { CameraConfig } from "../config/cameraConfig";
import type { ProjectionConfig } from "../config/projectionConfig";
import type { PlayerCar } from "../entities/PlayerCar";
import type { FollowCamera } from "./FollowCamera";

const HORIZONTAL_OVERSCAN = 1.45;
const VERTICAL_OVERSCAN = 1.25;
const MESH_STRIPS = 128;
const TEXTURE_KEY = "racing-perspective-world";

export class PseudoPerspectiveRenderer {
  private readonly sourceTexture: Phaser.Textures.DynamicTexture | null;
  private readonly mesh: Phaser.GameObjects.Mesh | null;
  private readonly overlays = new Set<Phaser.GameObjects.GameObject>();
  private readonly sourcePoint = new Phaser.Math.Vector2();
  private readonly mainPoint = new Phaser.Math.Vector2();
  private readonly screenPoint = new Phaser.Math.Vector2();
  private sourceAnchorY = 0;
  private outputAnchorY = 0;
  private active = false;

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly camera: Phaser.Cameras.Scene2D.Camera,
    private readonly followCamera: FollowCamera,
    private readonly playerCar: PlayerCar,
  ) {
    this.overlays.add(playerCar);

    if (scene.game.renderer.type !== Phaser.WEBGL) {
      this.sourceTexture = null;
      this.mesh = null;
      return;
    }

    const sourceWidth = Math.ceil(camera.width * HORIZONTAL_OVERSCAN / 2) * 2;
    const sourceHeight = Math.ceil(camera.height * VERTICAL_OVERSCAN / 2) * 2;
    this.sourceTexture = scene.textures.addDynamicTexture(
      TEXTURE_KEY,
      sourceWidth,
      sourceHeight,
    );

    if (!this.sourceTexture) {
      this.mesh = null;
      return;
    }

    this.mesh = scene.add
      .mesh(0, 0, this.sourceTexture)
      .setDepth(0);
    this.mesh.hideCCW = false;
    this.mesh.ignoreDirtyCache = true;
    this.mesh.setOrtho(camera.width, camera.height);
    this.createMeshGeometry();
    this.mesh.setVisible(false);
  }

  get isActive() {
    return this.active;
  }

  addOverlay(gameObject: Phaser.GameObjects.GameObject) {
    this.overlays.add(gameObject);
  }

  removeOverlay(gameObject: Phaser.GameObjects.GameObject) {
    this.overlays.delete(gameObject);
  }

  update(
    cameraConfig: CameraConfig,
    projectionConfig: ProjectionConfig,
  ) {
    const enabled =
      cameraConfig.mode === "LEGACY_FOLLOW_ROTATION" &&
      projectionConfig.legacyMeshEnabled >= 0.5 &&
      this.sourceTexture !== null &&
      this.mesh !== null;
    this.active = enabled;
    this.updateCameraFilters(enabled);

    if (!enabled || !this.sourceTexture || !this.mesh) {
      this.mesh?.setVisible(false);
      return;
    }

    this.camera.preRender();
    this.sourceTexture.camera
      .centerOn(this.followCamera.centerX, this.followCamera.centerY)
      .setRotation(-this.followCamera.rotation);
    this.sourceTexture.camera.preRender();

    this.projectWithCamera(
      this.sourceTexture.camera,
      this.playerCar.x,
      this.playerCar.y,
      this.sourcePoint,
    );
    this.projectWithCamera(
      this.camera,
      this.playerCar.x,
      this.playerCar.y,
      this.mainPoint,
    );
    this.sourceAnchorY = this.sourcePoint.y;
    this.outputAnchorY = this.mainPoint.y;

    this.renderWorldTexture();
    this.updateMeshGeometry(projectionConfig);
    this.mesh
      .setPosition(this.camera.midPoint.x, this.camera.midPoint.y)
      .setRotation(this.followCamera.rotation)
      .setVisible(true);
  }

  projectWorldToOverlay(
    worldX: number,
    worldY: number,
    config: ProjectionConfig,
    out: Phaser.Math.Vector2,
  ) {
    if (!this.active || !this.sourceTexture) {
      return out.set(worldX, worldY);
    }

    this.projectWithCamera(
      this.sourceTexture.camera,
      worldX,
      worldY,
      this.sourcePoint,
    );
    const scale = this.getScaleAt(this.sourcePoint.y, config);
    const projectedX =
      this.camera.width * 0.5 +
      (this.sourcePoint.x - this.sourceTexture.width * 0.5) * scale;
    const projectedY = this.projectY(this.sourcePoint.y, config);

    this.camera.getWorldPoint(projectedX, projectedY, this.screenPoint);
    return out.copy(this.screenPoint);
  }

  destroy() {
    this.active = false;
    this.updateCameraFilters(false);
    this.mesh?.destroy();
    if (this.sourceTexture) {
      this.scene.textures.remove(TEXTURE_KEY);
    }
    this.overlays.clear();
  }

  private createMeshGeometry() {
    if (!this.mesh) {
      return;
    }

    const vertices: number[] = [];
    const uvs: number[] = [];

    for (let strip = 0; strip < MESH_STRIPS; strip += 1) {
      const topV = strip / MESH_STRIPS;
      const bottomV = (strip + 1) / MESH_STRIPS;
      vertices.push(
        -1, -1,
        -1, 1,
        1, -1,
        -1, 1,
        1, 1,
        1, -1,
      );
      uvs.push(
        0, topV,
        0, bottomV,
        1, topV,
        0, bottomV,
        1, bottomV,
        1, topV,
      );
    }

    this.mesh.addVertices(vertices, uvs);
  }

  private updateMeshGeometry(config: ProjectionConfig) {
    if (!this.mesh || !this.sourceTexture) {
      return;
    }

    const vertices = this.mesh.vertices;
    let vertexIndex = 0;

    for (let strip = 0; strip < MESH_STRIPS; strip += 1) {
      const topSourceY =
        this.sourceTexture.height * (strip / MESH_STRIPS);
      const bottomSourceY =
        this.sourceTexture.height * ((strip + 1) / MESH_STRIPS);
      const topHalfWidth =
        this.sourceTexture.width * 0.5 *
        this.getScaleAt(topSourceY, config);
      const bottomHalfWidth =
        this.sourceTexture.width * 0.5 *
        this.getScaleAt(bottomSourceY, config);
      const topY =
        this.camera.height * 0.5 - this.projectY(topSourceY, config);
      const bottomY =
        this.camera.height * 0.5 -
        this.projectY(bottomSourceY, config);

      vertexIndex = this.setVertex(
        vertices,
        vertexIndex,
        -topHalfWidth,
        topY,
      );
      vertexIndex = this.setVertex(
        vertices,
        vertexIndex,
        -bottomHalfWidth,
        bottomY,
      );
      vertexIndex = this.setVertex(
        vertices,
        vertexIndex,
        topHalfWidth,
        topY,
      );
      vertexIndex = this.setVertex(
        vertices,
        vertexIndex,
        -bottomHalfWidth,
        bottomY,
      );
      vertexIndex = this.setVertex(
        vertices,
        vertexIndex,
        bottomHalfWidth,
        bottomY,
      );
      vertexIndex = this.setVertex(
        vertices,
        vertexIndex,
        topHalfWidth,
        topY,
      );
    }
  }

  private setVertex(
    vertices: Phaser.Geom.Mesh.Vertex[],
    index: number,
    x: number,
    y: number,
  ) {
    vertices[index].set(x, y, 0);
    return index + 1;
  }

  private renderWorldTexture() {
    if (!this.mesh || !this.sourceTexture) {
      return;
    }

    const visibleOverlays: Phaser.GameObjects.GameObject[] = [];
    for (const overlay of this.overlays) {
      const visibleOverlay = overlay as Phaser.GameObjects.GameObject & {
        visible: boolean;
        setVisible(value: boolean): Phaser.GameObjects.GameObject;
      };
      if (visibleOverlay.visible) {
        visibleOverlays.push(overlay);
        visibleOverlay.setVisible(false);
      }
    }
    this.mesh.setVisible(false);
    this.scene.children.depthSort();
    this.sourceTexture.clear();
    this.sourceTexture.draw(this.scene.children);
    this.mesh.setVisible(true);

    for (const overlay of visibleOverlays) {
      (
        overlay as Phaser.GameObjects.GameObject & {
          setVisible(value: boolean): Phaser.GameObjects.GameObject;
        }
      ).setVisible(true);
    }
  }

  private updateCameraFilters(ignored: boolean) {
    const cameraId = this.camera.id;

    for (const gameObject of this.scene.children.list) {
      const isOverlay = this.overlays.has(gameObject);
      const shouldIgnore =
        ignored && gameObject !== this.mesh && !isOverlay;
      this.setCameraIgnored(gameObject, cameraId, shouldIgnore);
    }
  }

  private setCameraIgnored(
    gameObject: Phaser.GameObjects.GameObject,
    cameraId: number,
    ignored: boolean,
  ) {
    if (ignored) {
      gameObject.cameraFilter |= cameraId;
    } else {
      gameObject.cameraFilter &= ~cameraId;
    }

    const container = gameObject as Phaser.GameObjects.GameObject & {
      list?: Phaser.GameObjects.GameObject[];
    };
    if (container.list) {
      for (const child of container.list) {
        this.setCameraIgnored(child, cameraId, ignored);
      }
    }
  }

  private projectWithCamera(
    camera: Phaser.Cameras.Scene2D.Camera,
    worldX: number,
    worldY: number,
    out: Phaser.Math.Vector2,
  ) {
    const matrix = (
      camera as Phaser.Cameras.Scene2D.Camera & {
        matrix: {
          transformPoint(
            x: number,
            y: number,
            output: Phaser.Math.Vector2,
          ): Phaser.Math.Vector2;
        };
      }
    ).matrix;

    return matrix.transformPoint(
      worldX - camera.scrollX,
      worldY - camera.scrollY,
      out,
    );
  }

  private projectY(sourceY: number, config: ProjectionConfig) {
    return (
      this.outputAnchorY +
      (sourceY - this.sourceAnchorY) *
        this.getScaleAt(sourceY, config)
    );
  }

  private getScaleAt(sourceY: number, config: ProjectionConfig) {
    const aheadDistance = Math.max(0, this.sourceAnchorY - sourceY);
    const vanishingDistance = Math.max(
      1,
      this.outputAnchorY -
        config.legacyMeshVanishingPointY * this.camera.height,
    );
    const distanceRatio = Phaser.Math.Clamp(
      aheadDistance / vanishingDistance,
      0,
      1,
    );
    const easedDistance =
      distanceRatio * distanceRatio * (3 - 2 * distanceRatio);
    const pitchInfluence = Phaser.Math.Clamp(
      config.legacyMeshPitch / 25,
      0,
      1,
    );
    const perspectiveMix =
      easedDistance *
      pitchInfluence *
      config.legacyMeshStrength;

    return Phaser.Math.Linear(
      config.legacyMeshNearScale,
      config.legacyMeshFarScale,
      perspectiveMix,
    );
  }
}
