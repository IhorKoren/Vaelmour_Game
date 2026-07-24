import Phaser from "phaser";
import type { FollowCamera } from "../camera/FollowCamera";
import type { CameraConfig } from "../config/cameraConfig";
import type { ProjectionConfig } from "../config/projectionConfig";
import type { PrototypeTrack, SandZone } from "../track/PrototypeTrack";
import {
  createOffsetSegmentQuad,
  createRoadSegmentQuad,
  getProjectedWorldBounds,
  projectTrackPoints,
  segmentIntersectsBounds,
  type WorldBounds,
} from "./trackProjectionGeometry";
import type { Point2D, ProjectionCamera } from "./projection";

const VIEW_MARGIN = 180;
const SAND_SEGMENTS = 48;
const GRASS_GRID_SIZE = 90;

interface AsphaltMark {
  start: Point2D;
  end: Point2D;
  color: number;
  alpha: number;
}

export class ProjectedTrackRenderer {
  private readonly graphics: Phaser.GameObjects.Graphics;
  private readonly camera: Phaser.Cameras.Scene2D.Camera;
  private readonly asphaltMarks: readonly AsphaltMark[];
  private active = false;

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly track: PrototypeTrack,
    private readonly followCamera: FollowCamera,
  ) {
    this.graphics = scene.add.graphics().setDepth(-100);
    this.camera = scene.cameras.add(
      0,
      0,
      scene.scale.width,
      scene.scale.height,
      false,
      "projected-ground",
    );
    this.camera.setRoundPixels(false);
    scene.cameras.main.ignore(this.graphics);
    this.moveCameraBehindMain();
    this.asphaltMarks = this.createAsphaltMarks();
    this.setActive(false);
  }

  get isActive() {
    return this.active;
  }

  update(
    cameraConfig: CameraConfig,
    projectionConfig: ProjectionConfig,
  ) {
    const active =
      cameraConfig.mode === "REFERENCE_FIXED" &&
      projectionConfig.groundProjectionEnabled >= 0.5;
    this.setActive(active);

    if (!active) {
      return;
    }

    this.camera.setSize(
      this.scene.cameras.main.width,
      this.scene.cameras.main.height,
    );
    this.ignoreNonGroundObjects();

    const projectionCamera =
      this.followCamera.getProjectionCamera(projectionConfig);
    const bounds = getProjectedWorldBounds(
      projectionCamera,
      projectionConfig,
      this.camera.width,
      this.camera.height,
      VIEW_MARGIN,
    );

    this.graphics.clear();
    this.drawGrass(projectionCamera, projectionConfig, bounds);
    this.drawSandZones(projectionCamera, projectionConfig, bounds);
    this.drawRoad(projectionCamera, projectionConfig, bounds);
    this.drawAsphaltMarks(projectionCamera, projectionConfig, bounds);
    this.drawBoundaryLines(projectionCamera, projectionConfig, bounds);
    this.drawStartLine(projectionCamera, projectionConfig, bounds);
  }

  destroy() {
    this.graphics.destroy();
    this.scene.cameras.remove(this.camera, true);
  }

  private setActive(active: boolean) {
    this.active = active;
    this.graphics.setVisible(active);
    this.camera.setVisible(active);
  }

  private moveCameraBehindMain() {
    const cameras = this.scene.cameras.cameras;
    const index = cameras.indexOf(this.camera);
    if (index > 0) {
      cameras.splice(index, 1);
      cameras.unshift(this.camera);
    }
  }

  private ignoreNonGroundObjects() {
    for (const gameObject of this.scene.children.list) {
      if (gameObject !== this.graphics) {
        this.camera.ignore(gameObject);
      }
    }
  }

  private drawGrass(
    camera: ProjectionCamera,
    config: ProjectionConfig,
    bounds: WorldBounds,
  ) {
    this.graphics.fillStyle(0x245c3c, 1);
    this.graphics.fillRect(0, 0, this.camera.width, this.camera.height);

    const firstColumn =
      Math.floor(bounds.left / GRASS_GRID_SIZE) - 1;
    const lastColumn =
      Math.ceil(bounds.right / GRASS_GRID_SIZE) + 1;
    const firstRow = Math.floor(bounds.top / GRASS_GRID_SIZE) - 1;
    const lastRow = Math.ceil(bounds.bottom / GRASS_GRID_SIZE) + 1;

    for (let row = firstRow; row <= lastRow; row += 1) {
      for (
        let column = firstColumn;
        column <= lastColumn;
        column += 1
      ) {
        const hash = this.hashGridCell(column, row);
        const worldX =
          column * GRASS_GRID_SIZE + (hash % 43);
        const worldY =
          row * GRASS_GRID_SIZE + ((hash >>> 8) % 47);
        const start = projectTrackPoints(
          [{ x: worldX, y: worldY }],
          camera,
          config,
        )[0];
        const end = projectTrackPoints(
          [
            {
              x: worldX + ((hash >>> 16) % 7) - 3,
              y: worldY - 8 - ((hash >>> 20) % 8),
            },
          ],
          camera,
          config,
        )[0];
        this.graphics.lineStyle(
          1,
          hash % 3 === 0 ? 0x78a85e : 0x173f2a,
          0.18,
        );
        this.graphics.lineBetween(start.x, start.y, end.x, end.y);
      }
    }
  }

  private drawSandZones(
    camera: ProjectionCamera,
    config: ProjectionConfig,
    bounds: WorldBounds,
  ) {
    for (const zone of this.track.sandZones) {
      if (!this.zoneIntersectsBounds(zone, bounds)) {
        continue;
      }

      const worldPoints = Array.from(
        { length: SAND_SEGMENTS },
        (_, index) => {
          const angle = (index / SAND_SEGMENTS) * Math.PI * 2;
          return {
            x: zone.x + Math.cos(angle) * zone.width * 0.5,
            y: zone.y + Math.sin(angle) * zone.height * 0.5,
          };
        },
      );
      const points = projectTrackPoints(worldPoints, camera, config);
      this.graphics.fillStyle(0xc7aa69, 0.96);
      this.graphics.fillPoints(points, true);
      this.graphics.lineStyle(5 * config.zoom, 0xdbc486, 0.38);
      this.strokeProjectedPath(points, true);

      for (let line = 0; line < 18; line += 1) {
        const angle = (line * 2.399963) % (Math.PI * 2);
        const distance = Math.sqrt((line + 0.5) / 18);
        const centerX =
          zone.x +
          Math.cos(angle) * distance * zone.width * 0.42;
        const centerY =
          zone.y +
          Math.sin(angle) * distance * zone.height * 0.4;
        const textureLine = projectTrackPoints(
          [
            { x: centerX - 9, y: centerY },
            { x: centerX + 9, y: centerY + (line % 3) - 1 },
          ],
          camera,
          config,
        );
        this.graphics.lineStyle(1, 0x8e7444, 0.2);
        this.graphics.lineBetween(
          textureLine[0].x,
          textureLine[0].y,
          textureLine[1].x,
          textureLine[1].y,
        );
      }
    }
  }

  private drawRoad(
    camera: ProjectionCamera,
    config: ProjectionConfig,
    bounds: WorldBounds,
  ) {
    const layers = [
      {
        halfWidth: (this.track.roadWidth + 50) / 2,
        color: 0x102a1c,
        alpha: 0.42,
      },
      {
        halfWidth: (this.track.roadWidth + 20) / 2,
        color: 0xd8d3c6,
        alpha: 1,
      },
      {
        halfWidth: (this.track.roadWidth + 8) / 2,
        color: 0x171c20,
        alpha: 1,
      },
      {
        halfWidth: this.track.roadWidth / 2,
        color: 0x343a3f,
        alpha: 1,
      },
      {
        halfWidth: (this.track.roadWidth - 16) / 2,
        color: 0x30363b,
        alpha: 1,
      },
    ];

    for (const layer of layers) {
      this.graphics.fillStyle(layer.color, layer.alpha);
      for (
        let index = 0;
        index < this.track.points.length - 1;
        index += 1
      ) {
        if (!this.segmentIsVisible(index, bounds, layer.halfWidth)) {
          continue;
        }
        this.graphics.fillPoints(
          projectTrackPoints(
            createRoadSegmentQuad(
              this.track.points,
              index,
              layer.halfWidth,
            ),
            camera,
            config,
          ),
          true,
        );
      }
    }
  }

  private drawBoundaryLines(
    camera: ProjectionCamera,
    config: ProjectionConfig,
    bounds: WorldBounds,
  ) {
    this.graphics.fillStyle(0xf7f3e8, 0.92);
    for (const side of [-1, 1]) {
      for (
        let index = 0;
        index < this.track.points.length - 1;
        index += 1
      ) {
        if (!this.segmentIsVisible(index, bounds, this.track.halfWidth)) {
          continue;
        }
        const quad = createOffsetSegmentQuad(
          this.track.points,
          index,
          side * (this.track.halfWidth - 5),
          1.5,
        );
        this.graphics.fillPoints(
          projectTrackPoints(quad, camera, config),
          true,
        );
      }
    }
  }

  private drawAsphaltMarks(
    camera: ProjectionCamera,
    config: ProjectionConfig,
    bounds: WorldBounds,
  ) {
    for (const mark of this.asphaltMarks) {
      if (
        !segmentIntersectsBounds(
          mark.start,
          mark.end,
          bounds,
          20,
        )
      ) {
        continue;
      }
      const projected = projectTrackPoints(
        [mark.start, mark.end],
        camera,
        config,
      );
      this.graphics.lineStyle(1, mark.color, mark.alpha);
      this.graphics.lineBetween(
        projected[0].x,
        projected[0].y,
        projected[1].x,
        projected[1].y,
      );
    }
  }

  private drawStartLine(
    camera: ProjectionCamera,
    config: ProjectionConfig,
    bounds: WorldBounds,
  ) {
    const start = this.track.points[0];
    if (
      start.x < bounds.left - this.track.halfWidth ||
      start.x > bounds.right + this.track.halfWidth ||
      start.y < bounds.top - this.track.halfWidth ||
      start.y > bounds.bottom + this.track.halfWidth
    ) {
      return;
    }

    const next = this.track.points[3];
    const tangentX = next.x - start.x;
    const tangentY = next.y - start.y;
    const tangentLength = Math.hypot(tangentX, tangentY) || 1;
    const tx = tangentX / tangentLength;
    const ty = tangentY / tangentLength;
    const nx = -ty;
    const ny = tx;
    const columns = 12;
    const rows = 3;
    const cellWidth = this.track.roadWidth / columns;
    const cellHeight = 12;

    for (let row = 0; row < rows; row += 1) {
      for (let column = 0; column < columns; column += 1) {
        const acrossStart =
          -this.track.halfWidth + column * cellWidth;
        const acrossEnd = acrossStart + cellWidth;
        const alongStart = (row - rows / 2) * cellHeight;
        const alongEnd = alongStart + cellHeight;
        const corners = [
          this.offsetStartPoint(
            start,
            nx,
            ny,
            tx,
            ty,
            acrossStart,
            alongStart,
          ),
          this.offsetStartPoint(
            start,
            nx,
            ny,
            tx,
            ty,
            acrossEnd,
            alongStart,
          ),
          this.offsetStartPoint(
            start,
            nx,
            ny,
            tx,
            ty,
            acrossEnd,
            alongEnd,
          ),
          this.offsetStartPoint(
            start,
            nx,
            ny,
            tx,
            ty,
            acrossStart,
            alongEnd,
          ),
        ];
        this.graphics.fillStyle(
          (row + column) % 2 === 0 ? 0xf4f5f6 : 0x15191d,
          1,
        );
        this.graphics.fillPoints(
          projectTrackPoints(corners, camera, config),
          true,
        );
      }
    }
  }

  private strokeProjectedPath(points: readonly Point2D[], close: boolean) {
    this.graphics.beginPath();
    this.graphics.moveTo(points[0].x, points[0].y);
    for (let index = 1; index < points.length; index += 1) {
      this.graphics.lineTo(points[index].x, points[index].y);
    }
    if (close) {
      this.graphics.closePath();
    }
    this.graphics.strokePath();
  }

  private segmentIsVisible(
    index: number,
    bounds: WorldBounds,
    margin: number,
  ) {
    return segmentIntersectsBounds(
      this.track.points[index],
      this.track.points[index + 1],
      bounds,
      margin,
    );
  }

  private zoneIntersectsBounds(zone: SandZone, bounds: WorldBounds) {
    return !(
      zone.x + zone.width * 0.5 < bounds.left ||
      zone.x - zone.width * 0.5 > bounds.right ||
      zone.y + zone.height * 0.5 < bounds.top ||
      zone.y - zone.height * 0.5 > bounds.bottom
    );
  }

  private offsetStartPoint(
    start: Point2D,
    normalX: number,
    normalY: number,
    tangentX: number,
    tangentY: number,
    across: number,
    along: number,
  ): Point2D {
    return {
      x: start.x + normalX * across + tangentX * along,
      y: start.y + normalY * across + tangentY * along,
    };
  }

  private createAsphaltMarks(): readonly AsphaltMark[] {
    const random = new Phaser.Math.RandomDataGenerator([
      "projected-asphalt-v03",
    ]);
    const marks: AsphaltMark[] = [];

    for (
      let index = 4;
      index < this.track.points.length - 4;
      index += 5
    ) {
      const point = this.track.points[index];
      const previous = this.track.points[index - 2];
      const next = this.track.points[index + 2];
      const tangentX = next.x - previous.x;
      const tangentY = next.y - previous.y;
      const tangentLength = Math.hypot(tangentX, tangentY) || 1;
      const tx = tangentX / tangentLength;
      const ty = tangentY / tangentLength;
      const normalX = -ty;
      const normalY = tx;
      const offset = random.between(-105, 105);
      const length = random.between(8, 28);
      const centerX = point.x + normalX * offset;
      const centerY = point.y + normalY * offset;
      marks.push({
        start: {
          x: centerX - tx * length,
          y: centerY - ty * length,
        },
        end: {
          x: centerX + tx * length,
          y: centerY + ty * length,
        },
        color: index % 2 === 0 ? 0x566067 : 0x171c20,
        alpha: random.realInRange(0.08, 0.2),
      });
    }

    return marks;
  }

  private hashGridCell(x: number, y: number) {
    let hash = Math.imul(x, 374761393) + Math.imul(y, 668265263);
    hash = Math.imul(hash ^ (hash >>> 13), 1274126177);
    return (hash ^ (hash >>> 16)) >>> 0;
  }
}
