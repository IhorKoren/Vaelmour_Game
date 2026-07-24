import Phaser from "phaser";
import type { PrototypeTrack } from "../track/PrototypeTrack";

type VisibleGameObject = Phaser.GameObjects.GameObject & {
  setVisible(value: boolean): Phaser.GameObjects.GameObject;
};

/**
 * Compatibility renderer for FOLLOW_ROTATION. New ground work must go into
 * ProjectedTrackRenderer; this class intentionally preserves the v0.3.1 path.
 */
export class LegacyTrackRenderer {
  private readonly gameObjects: VisibleGameObject[] = [];

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly track: PrototypeTrack,
  ) {
    this.draw();
  }

  setVisible(visible: boolean) {
    for (const gameObject of this.gameObjects) {
      gameObject.setVisible(visible);
    }
  }

  destroy() {
    for (const gameObject of this.gameObjects) {
      gameObject.destroy();
    }
    this.gameObjects.length = 0;
  }

  private register<T extends VisibleGameObject>(gameObject: T) {
    this.gameObjects.push(gameObject);
    return gameObject;
  }

  private draw() {
    this.drawGrassBackground();
    this.drawSandZones();
    const graphics = this.register(
      this.scene.add.graphics().setDepth(-12),
    );
    this.strokeTrack(graphics, this.track.roadWidth + 50, 0x102a1c, 0.3);
    this.strokeTrack(graphics, this.track.roadWidth + 38, 0xe7e1d2, 1);
    this.strokeTrack(graphics, this.track.roadWidth + 30, 0xb83435, 1);
    this.strokeTrack(graphics, this.track.roadWidth + 4, 0x171c20, 1);
    this.strokeTrack(graphics, this.track.roadWidth, 0x343a3f, 1);
    this.strokeTrack(graphics, this.track.roadWidth - 16, 0x30363b, 1);
    this.drawAsphaltVariation();
    this.drawCurbs();
    this.drawBoundaryLines();
    this.drawGuardrails();
    this.drawTracksideDetails();
    this.drawStartLine();
  }

  private strokeTrack(
    graphics: Phaser.GameObjects.Graphics,
    width: number,
    color: number,
    alpha: number,
  ) {
    graphics.lineStyle(width, color, alpha);
    graphics.beginPath();
    graphics.moveTo(this.track.points[0].x, this.track.points[0].y);

    for (let index = 1; index < this.track.points.length; index += 1) {
      graphics.lineTo(
        this.track.points[index].x,
        this.track.points[index].y,
      );
    }

    graphics.closePath();
    graphics.strokePath();
  }

  private drawGrassBackground() {
    const textureKey = "procedural-grass-v031";

    if (!this.scene.textures.exists(textureKey)) {
      const textureSize = 320;
      const grass = this.scene.make.graphics({ x: 0, y: 0 });
      const random = new Phaser.Math.RandomDataGenerator([
        "racing-grass-v031",
      ]);
      grass.fillStyle(0x245c3c, 1);
      grass.fillRect(0, 0, textureSize, textureSize);

      for (let index = 0; index < 46; index += 1) {
        const x = random.between(0, textureSize);
        const y = random.between(0, textureSize);
        const radius = random.between(2, 8);
        grass.fillStyle(
          index % 3 === 0 ? 0x32734a : 0x1d4d33,
          0.24,
        );
        grass.fillCircle(x, y, radius);
      }

      for (let index = 0; index < 18; index += 1) {
        const x = random.between(0, textureSize);
        const y = random.between(0, textureSize);
        grass.lineStyle(2, 0x78a85e, 0.14);
        grass.lineBetween(
          x,
          y,
          x + random.between(-5, 5),
          y - 10,
        );
      }

      grass.generateTexture(textureKey, textureSize, textureSize);
      grass.destroy();
    }

    this.register(
      this.scene.add
        .tileSprite(
          this.track.worldWidth / 2,
          this.track.worldHeight / 2,
          this.track.worldWidth,
          this.track.worldHeight,
          textureKey,
        )
        .setDepth(-20),
    );
  }

  private drawSandZones() {
    const random = new Phaser.Math.RandomDataGenerator([
      "sand-zones-v031",
    ]);

    for (const zone of this.track.sandZones) {
      const sand = this.register(
        this.scene.add
          .graphics()
          .setPosition(zone.x, zone.y)
          .setDepth(-18),
      );
      sand.fillStyle(0xc7aa69, 0.96);
      sand.fillEllipse(0, 0, zone.width, zone.height);
      sand.lineStyle(10, 0xdbc486, 0.38);
      sand.strokeEllipse(0, 0, zone.width, zone.height);

      for (let index = 0; index < 90; index += 1) {
        const angle = random.realInRange(0, Math.PI * 2);
        const distance = Math.sqrt(random.frac());
        const x =
          Math.cos(angle) * distance * (zone.width * 0.45);
        const y =
          Math.sin(angle) * distance * (zone.height * 0.42);
        sand.lineStyle(
          2,
          0x8e7444,
          random.realInRange(0.1, 0.24),
        );
        sand.lineBetween(
          x - 7,
          y,
          x + 7,
          y + random.between(-2, 2),
        );
      }
    }
  }

  private drawAsphaltVariation() {
    const texture = this.register(
      this.scene.add.graphics().setDepth(-10),
    );
    const random = new Phaser.Math.RandomDataGenerator(["asphalt-v03"]);

    for (
      let index = 4;
      index < this.track.points.length - 4;
      index += 5
    ) {
      const point = this.track.points[index];
      const tangent = this.track.points[index + 2]
        .clone()
        .subtract(this.track.points[index - 2])
        .normalize();
      const normal = new Phaser.Math.Vector2(-tangent.y, tangent.x);
      const offset = random.between(-105, 105);
      const length = random.between(8, 28);
      const center = point.clone().add(normal.scale(offset));
      texture.lineStyle(
        random.between(1, 2),
        index % 2 === 0 ? 0x566067 : 0x171c20,
        random.realInRange(0.08, 0.2),
      );
      texture.lineBetween(
        center.x - tangent.x * length,
        center.y - tangent.y * length,
        center.x + tangent.x * length,
        center.y + tangent.y * length,
      );
    }
  }

  private drawCurbs() {
    const curbs = this.register(
      this.scene.add.graphics().setDepth(-8),
    );
    const segmentLength = 3;
    const innerOffset = this.track.halfWidth + 2;
    const outerOffset = innerOffset + this.track.curbWidth;

    for (
      let index = 0;
      index < this.track.points.length - segmentLength;
      index += segmentLength
    ) {
      const nextIndex = index + segmentLength;
      const color =
        (index / segmentLength) % 2 === 0 ? 0xf4eee0 : 0xc83d3d;

      for (const side of [-1, 1]) {
        const startNormal = this.track.getNormal(index);
        const endNormal = this.track.getNormal(nextIndex);
        const start = this.track.points[index];
        const end = this.track.points[nextIndex];
        curbs.fillStyle(color, 1);
        curbs.fillPoints(
          [
            new Phaser.Math.Vector2(
              start.x + startNormal.x * side * innerOffset,
              start.y + startNormal.y * side * innerOffset,
            ),
            new Phaser.Math.Vector2(
              end.x + endNormal.x * side * innerOffset,
              end.y + endNormal.y * side * innerOffset,
            ),
            new Phaser.Math.Vector2(
              end.x + endNormal.x * side * outerOffset,
              end.y + endNormal.y * side * outerOffset,
            ),
            new Phaser.Math.Vector2(
              start.x + startNormal.x * side * outerOffset,
              start.y + startNormal.y * side * outerOffset,
            ),
          ],
          true,
        );
      }
    }
  }

  private drawBoundaryLines() {
    const lines = this.register(
      this.scene.add.graphics().setDepth(-7),
    );
    for (const side of [-1, 1]) {
      lines.lineStyle(3, 0xf7f3e8, 0.92);
      lines.beginPath();
      const firstNormal = this.track.getNormal(0);
      lines.moveTo(
        this.track.points[0].x +
          firstNormal.x * side * (this.track.halfWidth - 5),
        this.track.points[0].y +
          firstNormal.y * side * (this.track.halfWidth - 5),
      );

      for (
        let index = 1;
        index < this.track.points.length;
        index += 1
      ) {
        const normal = this.track.getNormal(index);
        lines.lineTo(
          this.track.points[index].x +
            normal.x * side * (this.track.halfWidth - 5),
          this.track.points[index].y +
            normal.y * side * (this.track.halfWidth - 5),
        );
      }

      lines.strokePath();
    }
  }

  private drawTracksideDetails() {
    const detailSamples = [
      70, 145, 220, 300, 375, 455, 535, 615, 695, 775, 850, 920,
    ];

    detailSamples.forEach((sample, detailIndex) => {
      const side = detailIndex % 2 === 0 ? -1 : 1;
      const normal = this.track.getNormal(sample);
      const offset = side * (this.track.halfWidth + 74);
      const x = this.track.points[sample].x + normal.x * offset;
      const y = this.track.points[sample].y + normal.y * offset;

      if (detailIndex % 3 === 0) {
        this.drawTireStack(x, y);
      } else if (detailIndex % 3 === 1) {
        this.drawCones(x, y);
      } else {
        this.drawBarrier(x, y, sample);
      }
    });
  }

  private drawGuardrails() {
    const runs = [
      { start: 185, end: 245, side: -1 },
      { start: 420, end: 475, side: 1 },
      { start: 655, end: 715, side: 1 },
      { start: 800, end: 855, side: -1 },
    ];

    for (const run of runs) {
      const rail = this.register(
        this.scene.add.graphics().setDepth(-6),
      );
      const offset = this.track.halfWidth + 52;
      rail.lineStyle(12, 0x2c383c, 0.38);
      this.strokeOffsetSection(
        rail,
        run.start,
        run.end,
        run.side,
        offset + 5,
      );
      rail.lineStyle(7, 0xc9d2d0, 1);
      this.strokeOffsetSection(
        rail,
        run.start,
        run.end,
        run.side,
        offset,
      );
      rail.lineStyle(2, 0xf7faf4, 0.82);
      this.strokeOffsetSection(
        rail,
        run.start,
        run.end,
        run.side,
        offset - 2,
      );

      for (
        let sample = run.start;
        sample <= run.end;
        sample += 7
      ) {
        const normal = this.track.getNormal(sample);
        rail.fillStyle(0x344145, 1);
        rail.fillCircle(
          this.track.points[sample].x +
            normal.x * run.side * (offset + 3),
          this.track.points[sample].y +
            normal.y * run.side * (offset + 3),
          5,
        );
      }
    }
  }

  private strokeOffsetSection(
    graphics: Phaser.GameObjects.Graphics,
    start: number,
    end: number,
    side: number,
    offset: number,
  ) {
    const firstNormal = this.track.getNormal(start);
    graphics.beginPath();
    graphics.moveTo(
      this.track.points[start].x + firstNormal.x * side * offset,
      this.track.points[start].y + firstNormal.y * side * offset,
    );

    for (let sample = start + 1; sample <= end; sample += 1) {
      const normal = this.track.getNormal(sample);
      graphics.lineTo(
        this.track.points[sample].x + normal.x * side * offset,
        this.track.points[sample].y + normal.y * side * offset,
      );
    }

    graphics.strokePath();
  }

  private drawTireStack(x: number, y: number) {
    const tires = this.register(
      this.scene.add.graphics().setDepth(-6),
    );
    for (let row = 0; row < 2; row += 1) {
      for (let column = 0; column < 3; column += 1) {
        tires.fillStyle(0x101719, 1);
        tires.fillCircle(
          x + column * 13 - 13,
          y + row * 11 - 5,
          8,
        );
        tires.lineStyle(2, 0x4b575c, 0.9);
        tires.strokeCircle(
          x + column * 13 - 13,
          y + row * 11 - 5,
          5,
        );
      }
    }
  }

  private drawCones(x: number, y: number) {
    const cones = this.register(
      this.scene.add.graphics().setDepth(-6),
    );
    for (let index = 0; index < 3; index += 1) {
      const coneX = x + index * 18 - 18;
      cones.fillStyle(0x1a2224, 0.3);
      cones.fillEllipse(coneX + 2, y + 7, 15, 6);
      cones.fillStyle(0xff8c38, 1);
      cones.fillTriangle(
        coneX,
        y - 10,
        coneX - 6,
        y + 6,
        coneX + 6,
        y + 6,
      );
      cones.fillStyle(0xf8f2df, 1);
      cones.fillRect(coneX - 4, y - 1, 8, 3);
    }
  }

  private drawBarrier(x: number, y: number, sample: number) {
    const tangent = this.track.points[sample + 2]
      .clone()
      .subtract(this.track.points[sample - 2])
      .normalize();
    const barrier = this.register(
      this.scene.add.container(x, y).setDepth(-6),
    );
    const base = this.scene.add
      .rectangle(0, 0, 74, 13, 0xe8e1cf)
      .setStrokeStyle(2, 0x313b3f);
    const stripeA = this.scene.add.rectangle(
      -22,
      0,
      20,
      9,
      0xd24141,
    );
    const stripeB = this.scene.add.rectangle(
      22,
      0,
      20,
      9,
      0xd24141,
    );
    barrier.add([base, stripeA, stripeB]);
    barrier.rotation = Math.atan2(tangent.y, tangent.x);
  }

  private drawStartLine() {
    const start = this.track.points[0];
    const tangent = this.track.points[3]
      .clone()
      .subtract(start)
      .normalize();
    const line = this.register(
      this.scene.add.container(start.x, start.y).setDepth(-5),
    );
    const columns = 12;
    const rows = 3;
    const squareWidth = this.track.roadWidth / columns;
    const squareHeight = 12;

    for (let row = 0; row < rows; row += 1) {
      for (let column = 0; column < columns; column += 1) {
        const color =
          (row + column) % 2 === 0 ? 0xf4f5f6 : 0x15191d;
        line.add(
          this.scene.add.rectangle(
            (column - (columns - 1) / 2) * squareWidth,
            (row - 1) * squareHeight,
            squareWidth,
            squareHeight,
            color,
          ),
        );
      }
    }

    line.rotation = Math.atan2(tangent.y, tangent.x) + Math.PI / 2;
    line.add(
      this.scene.add
        .rectangle(
          0,
          0,
          this.track.roadWidth + 8,
          rows * squareHeight + 8,
        )
        .setStrokeStyle(3, 0xffffff, 0.82)
        .setDepth(-1),
    );
  }
}
