import Phaser from "phaser";

const TRACK_SCALE = 1.62;
const WORLD_WIDTH = 7800 * TRACK_SCALE;
const WORLD_HEIGHT = 11000 * TRACK_SCALE;
const TRACK_WIDTH = 270;
const SAMPLE_COUNT = 960;
const CURB_WIDTH = 18;

function trackPoint(x: number, y: number) {
  return new Phaser.Math.Vector2(x * TRACK_SCALE, y * TRACK_SCALE);
}

const CONTROL_POINTS = [
  trackPoint(4250, 10300),
  trackPoint(4250, 9200),
  trackPoint(4250, 8000),
  trackPoint(4050, 6900),
  trackPoint(3450, 6200),
  trackPoint(2600, 6000),
  trackPoint(1650, 6200),
  trackPoint(900, 5700),
  trackPoint(550, 4800),
  trackPoint(750, 3800),
  trackPoint(1450, 3000),
  trackPoint(2300, 2600),
  trackPoint(3250, 2700),
  trackPoint(4050, 2200),
  trackPoint(5050, 1900),
  trackPoint(6000, 2200),
  trackPoint(6750, 3000),
  trackPoint(7000, 4000),
  trackPoint(6600, 4850),
  trackPoint(5900, 5200),
  trackPoint(6500, 5650),
  trackPoint(7200, 6400),
  trackPoint(7050, 7350),
  trackPoint(6400, 8100),
  trackPoint(5650, 8400),
  trackPoint(5950, 9000),
  trackPoint(5650, 9650),
  trackPoint(5050, 10200),
  trackPoint(4250, 10300),
];

export interface TrackCheckpoint {
  position: Phaser.Math.Vector2;
  radius: number;
}

export class PrototypeTrack {
  readonly worldWidth = WORLD_WIDTH;
  readonly worldHeight = WORLD_HEIGHT;
  readonly halfWidth = TRACK_WIDTH / 2;
  readonly points: Phaser.Math.Vector2[];
  readonly checkpoints: TrackCheckpoint[];

  constructor() {
    const spline = new Phaser.Curves.Spline(CONTROL_POINTS);
    this.points = spline.getSpacedPoints(SAMPLE_COUNT);
    const checkpointSamples = [0, 96, 192, 288, 384, 480, 576, 672, 768, 864];
    this.checkpoints = checkpointSamples.map((index) => ({
      position: this.points[index].clone(),
      radius: this.halfWidth * 0.72,
    }));
  }

  draw(scene: Phaser.Scene) {
    this.drawGrassBackground(scene);
    this.drawSandZones(scene);
    const track = scene.add.graphics().setDepth(-12);
    this.strokeTrack(track, TRACK_WIDTH + 50, 0x102a1c, 0.3);
    this.strokeTrack(track, TRACK_WIDTH + 38, 0xe7e1d2, 1);
    this.strokeTrack(track, TRACK_WIDTH + 30, 0xb83435, 1);
    this.strokeTrack(track, TRACK_WIDTH + 4, 0x171c20, 1);
    this.strokeTrack(track, TRACK_WIDTH, 0x343a3f, 1);
    this.strokeTrack(track, TRACK_WIDTH - 16, 0x30363b, 1);
    this.drawAsphaltVariation(scene);
    this.drawCurbs(scene);
    this.drawBoundaryLines(scene);
    this.drawGuardrails(scene);
    this.drawTracksideDetails(scene);
    this.drawStartLine(scene);
  }

  getStart() {
    const position = this.points[16].clone();
    const next = this.points[20];
    const heading = Phaser.Math.Angle.Between(
      position.x,
      position.y,
      next.x,
      next.y,
    );

    return {
      position,
      heading: heading + Math.PI / 2,
    };
  }

  isOnTrack(position: Phaser.Math.Vector2) {
    const maxDistanceSq = this.halfWidth * this.halfWidth;

    for (const point of this.points) {
      if (Phaser.Math.Distance.Squared(point.x, point.y, position.x, position.y) <= maxDistanceSq) {
        return true;
      }
    }

    return false;
  }

  private strokeTrack(
    graphics: Phaser.GameObjects.Graphics,
    width: number,
    color: number,
    alpha: number,
  ) {
    graphics.lineStyle(width, color, alpha);
    graphics.beginPath();
    graphics.moveTo(this.points[0].x, this.points[0].y);

    for (let index = 1; index < this.points.length; index += 1) {
      graphics.lineTo(this.points[index].x, this.points[index].y);
    }

    graphics.closePath();
    graphics.strokePath();
  }

  private drawGrassBackground(scene: Phaser.Scene) {
    const textureKey = "procedural-grass-v031";

    if (!scene.textures.exists(textureKey)) {
      const textureSize = 320;
      const grass = scene.make.graphics({ x: 0, y: 0 });
      const random = new Phaser.Math.RandomDataGenerator([
        "racing-grass-v031",
      ]);
      grass.fillStyle(0x245c3c, 1);
      grass.fillRect(0, 0, textureSize, textureSize);

      for (let index = 0; index < 46; index += 1) {
        const x = random.between(0, textureSize);
        const y = random.between(0, textureSize);
        const radius = random.between(2, 8);
        grass.fillStyle(index % 3 === 0 ? 0x32734a : 0x1d4d33, 0.24);
        grass.fillCircle(x, y, radius);
      }

      for (let index = 0; index < 18; index += 1) {
        const x = random.between(0, textureSize);
        const y = random.between(0, textureSize);
        grass.lineStyle(2, 0x78a85e, 0.14);
        grass.lineBetween(x, y, x + random.between(-5, 5), y - 10);
      }

      grass.generateTexture(textureKey, textureSize, textureSize);
      grass.destroy();
    }

    scene.add
      .tileSprite(
        WORLD_WIDTH / 2,
        WORLD_HEIGHT / 2,
        WORLD_WIDTH,
        WORLD_HEIGHT,
        textureKey,
      )
      .setDepth(-20);
  }

  private drawSandZones(scene: Phaser.Scene) {
    const zones = [
      {
        x: 1300 * TRACK_SCALE,
        y: 4200 * TRACK_SCALE,
        width: 1300 * TRACK_SCALE,
        height: 1150 * TRACK_SCALE,
      },
      {
        x: 6350 * TRACK_SCALE,
        y: 3500 * TRACK_SCALE,
        width: 1450 * TRACK_SCALE,
        height: 1080 * TRACK_SCALE,
      },
      {
        x: 6400 * TRACK_SCALE,
        y: 6900 * TRACK_SCALE,
        width: 1350 * TRACK_SCALE,
        height: 1150 * TRACK_SCALE,
      },
      {
        x: 2700 * TRACK_SCALE,
        y: 9250 * TRACK_SCALE,
        width: 1600 * TRACK_SCALE,
        height: 900 * TRACK_SCALE,
      },
    ];
    const random = new Phaser.Math.RandomDataGenerator(["sand-zones-v031"]);

    for (const zone of zones) {
      const sand = scene.add.graphics().setPosition(zone.x, zone.y).setDepth(-18);
      sand.fillStyle(0xc7aa69, 0.96);
      sand.fillEllipse(0, 0, zone.width, zone.height);
      sand.lineStyle(10, 0xdbc486, 0.38);
      sand.strokeEllipse(0, 0, zone.width, zone.height);

      for (let index = 0; index < 90; index += 1) {
        const angle = random.realInRange(0, Math.PI * 2);
        const distance = Math.sqrt(random.frac());
        const x = Math.cos(angle) * distance * (zone.width * 0.45);
        const y = Math.sin(angle) * distance * (zone.height * 0.42);
        sand.lineStyle(2, 0x8e7444, random.realInRange(0.1, 0.24));
        sand.lineBetween(x - 7, y, x + 7, y + random.between(-2, 2));
      }
    }
  }

  private drawAsphaltVariation(scene: Phaser.Scene) {
    const texture = scene.add.graphics().setDepth(-10);
    const random = new Phaser.Math.RandomDataGenerator(["asphalt-v03"]);

    for (let index = 4; index < this.points.length - 4; index += 5) {
      const point = this.points[index];
      const tangent = this.points[index + 2]
        .clone()
        .subtract(this.points[index - 2])
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

  private drawCurbs(scene: Phaser.Scene) {
    const curbs = scene.add.graphics().setDepth(-8);
    const segmentLength = 3;
    const innerOffset = this.halfWidth + 2;
    const outerOffset = innerOffset + CURB_WIDTH;

    for (
      let index = 0;
      index < this.points.length - segmentLength;
      index += segmentLength
    ) {
      const nextIndex = index + segmentLength;
      const color = (index / segmentLength) % 2 === 0 ? 0xf4eee0 : 0xc83d3d;

      for (const side of [-1, 1]) {
        const startNormal = this.getNormal(index).scale(side);
        const endNormal = this.getNormal(nextIndex).scale(side);
        const start = this.points[index];
        const end = this.points[nextIndex];
        curbs.fillStyle(color, 1);
        curbs.fillPoints(
          [
            start.clone().add(startNormal.clone().scale(innerOffset)),
            end.clone().add(endNormal.clone().scale(innerOffset)),
            end.clone().add(endNormal.clone().scale(outerOffset)),
            start.clone().add(startNormal.clone().scale(outerOffset)),
          ],
          true,
        );
      }
    }
  }

  private drawBoundaryLines(scene: Phaser.Scene) {
    const lines = scene.add.graphics().setDepth(-7);
    for (const side of [-1, 1]) {
      lines.lineStyle(3, 0xf7f3e8, 0.92);
      lines.beginPath();
      const first = this.points[0]
        .clone()
        .add(this.getNormal(0).scale(side * (this.halfWidth - 5)));
      lines.moveTo(first.x, first.y);

      for (let index = 1; index < this.points.length; index += 1) {
        const point = this.points[index]
          .clone()
          .add(
            this.getNormal(index).scale(side * (this.halfWidth - 5)),
          );
        lines.lineTo(point.x, point.y);
      }

      lines.strokePath();
    }
  }

  private drawTracksideDetails(scene: Phaser.Scene) {
    const detailSamples = [
      70, 145, 220, 300, 375, 455, 535, 615, 695, 775, 850, 920,
    ];

    detailSamples.forEach((sample, detailIndex) => {
      const side = detailIndex % 2 === 0 ? -1 : 1;
      const normal = this.getNormal(sample).scale(
        side * (this.halfWidth + 74),
      );
      const position = this.points[sample].clone().add(normal);

      if (detailIndex % 3 === 0) {
        this.drawTireStack(scene, position.x, position.y);
      } else if (detailIndex % 3 === 1) {
        this.drawCones(scene, position.x, position.y);
      } else {
        this.drawBarrier(scene, position.x, position.y, sample);
      }
    });
  }

  private drawGuardrails(scene: Phaser.Scene) {
    const runs = [
      { start: 185, end: 245, side: -1 },
      { start: 420, end: 475, side: 1 },
      { start: 655, end: 715, side: 1 },
      { start: 800, end: 855, side: -1 },
    ];

    for (const run of runs) {
      const rail = scene.add.graphics().setDepth(-6);
      const offset = this.halfWidth + 52;
      rail.lineStyle(12, 0x2c383c, 0.38);
      this.strokeOffsetSection(rail, run.start, run.end, run.side, offset + 5);
      rail.lineStyle(7, 0xc9d2d0, 1);
      this.strokeOffsetSection(rail, run.start, run.end, run.side, offset);
      rail.lineStyle(2, 0xf7faf4, 0.82);
      this.strokeOffsetSection(rail, run.start, run.end, run.side, offset - 2);

      for (let sample = run.start; sample <= run.end; sample += 7) {
        const position = this.points[sample]
          .clone()
          .add(this.getNormal(sample).scale(run.side * (offset + 3)));
        rail.fillStyle(0x344145, 1);
        rail.fillCircle(position.x, position.y, 5);
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
    const first = this.points[start]
      .clone()
      .add(this.getNormal(start).scale(side * offset));
    graphics.beginPath();
    graphics.moveTo(first.x, first.y);

    for (let sample = start + 1; sample <= end; sample += 1) {
      const position = this.points[sample]
        .clone()
        .add(this.getNormal(sample).scale(side * offset));
      graphics.lineTo(position.x, position.y);
    }

    graphics.strokePath();
  }

  private drawTireStack(scene: Phaser.Scene, x: number, y: number) {
    const tires = scene.add.graphics().setDepth(-6);
    for (let row = 0; row < 2; row += 1) {
      for (let column = 0; column < 3; column += 1) {
        tires.fillStyle(0x101719, 1);
        tires.fillCircle(x + column * 13 - 13, y + row * 11 - 5, 8);
        tires.lineStyle(2, 0x4b575c, 0.9);
        tires.strokeCircle(x + column * 13 - 13, y + row * 11 - 5, 5);
      }
    }
  }

  private drawCones(scene: Phaser.Scene, x: number, y: number) {
    const cones = scene.add.graphics().setDepth(-6);
    for (let index = 0; index < 3; index += 1) {
      const coneX = x + index * 18 - 18;
      cones.fillStyle(0x1a2224, 0.3);
      cones.fillEllipse(coneX + 2, y + 7, 15, 6);
      cones.fillStyle(0xff8c38, 1);
      cones.fillTriangle(coneX, y - 10, coneX - 6, y + 6, coneX + 6, y + 6);
      cones.fillStyle(0xf8f2df, 1);
      cones.fillRect(coneX - 4, y - 1, 8, 3);
    }
  }

  private drawBarrier(
    scene: Phaser.Scene,
    x: number,
    y: number,
    sample: number,
  ) {
    const tangent = this.points[sample + 2]
      .clone()
      .subtract(this.points[sample - 2])
      .normalize();
    const barrier = scene.add.container(x, y).setDepth(-6);
    const base = scene.add
      .rectangle(0, 0, 74, 13, 0xe8e1cf)
      .setStrokeStyle(2, 0x313b3f);
    const stripeA = scene.add.rectangle(-22, 0, 20, 9, 0xd24141);
    const stripeB = scene.add.rectangle(22, 0, 20, 9, 0xd24141);
    barrier.add([base, stripeA, stripeB]);
    barrier.rotation = Math.atan2(tangent.y, tangent.x);
  }

  private getNormal(index: number) {
    const previous = this.points[Math.max(0, index - 2)];
    const next = this.points[Math.min(this.points.length - 1, index + 2)];
    const tangent = next.clone().subtract(previous).normalize();
    return new Phaser.Math.Vector2(-tangent.y, tangent.x);
  }

  private drawStartLine(scene: Phaser.Scene) {
    const start = this.points[0];
    const tangent = this.points[3].clone().subtract(start).normalize();
    const line = scene.add.container(start.x, start.y).setDepth(-5);
    const columns = 12;
    const rows = 3;
    const squareWidth = TRACK_WIDTH / columns;
    const squareHeight = 12;

    for (let row = 0; row < rows; row += 1) {
      for (let column = 0; column < columns; column += 1) {
        const color = (row + column) % 2 === 0 ? 0xf4f5f6 : 0x15191d;
        line.add(
          scene.add.rectangle(
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
      scene.add
        .rectangle(0, 0, TRACK_WIDTH + 8, rows * squareHeight + 8)
        .setStrokeStyle(3, 0xffffff, 0.82)
        .setDepth(-1),
    );
  }
}
