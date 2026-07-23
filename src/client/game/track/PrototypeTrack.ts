import Phaser from "phaser";

const WORLD_WIDTH = 2600;
const WORLD_HEIGHT = 3600;
const TRACK_WIDTH = 270;
const SAMPLE_COUNT = 480;
const CURB_WIDTH = 18;

const CONTROL_POINTS = [
  new Phaser.Math.Vector2(1300, 3150),
  new Phaser.Math.Vector2(1300, 2650),
  new Phaser.Math.Vector2(1300, 1900),
  new Phaser.Math.Vector2(1300, 1050),
  new Phaser.Math.Vector2(1210, 610),
  new Phaser.Math.Vector2(930, 380),
  new Phaser.Math.Vector2(570, 430),
  new Phaser.Math.Vector2(330, 760),
  new Phaser.Math.Vector2(390, 1180),
  new Phaser.Math.Vector2(720, 1450),
  new Phaser.Math.Vector2(1160, 1530),
  new Phaser.Math.Vector2(1640, 1430),
  new Phaser.Math.Vector2(2030, 1090),
  new Phaser.Math.Vector2(2260, 1240),
  new Phaser.Math.Vector2(2200, 1650),
  new Phaser.Math.Vector2(1870, 1920),
  new Phaser.Math.Vector2(2180, 2260),
  new Phaser.Math.Vector2(2130, 2600),
  new Phaser.Math.Vector2(1840, 2780),
  new Phaser.Math.Vector2(1640, 3100),
  new Phaser.Math.Vector2(1300, 3150),
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
    const checkpointSamples = [0, 80, 160, 240, 320, 400];
    this.checkpoints = checkpointSamples.map((index) => ({
      position: this.points[index].clone(),
      radius: this.halfWidth * 0.72,
    }));
  }

  draw(scene: Phaser.Scene) {
    scene.add
      .rectangle(
        WORLD_WIDTH / 2,
        WORLD_HEIGHT / 2,
        WORLD_WIDTH,
        WORLD_HEIGHT,
        0x245c3c,
      )
      .setDepth(-20);

    this.drawGrassTexture(scene);
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
    this.drawTracksideDetails(scene);
    this.drawStartLine(scene);
  }

  getStart() {
    const position = this.points[8].clone();
    const next = this.points[11];
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

  private drawGrassTexture(scene: Phaser.Scene) {
    const grass = scene.add.graphics().setDepth(-19);
    const random = new Phaser.Math.RandomDataGenerator(["racing-visual-v03"]);

    for (let index = 0; index < 760; index += 1) {
      const x = random.between(0, WORLD_WIDTH);
      const y = random.between(0, WORLD_HEIGHT);
      const radius = random.between(2, 8);
      const color = index % 3 === 0 ? 0x32734a : 0x1d4d33;
      grass.fillStyle(color, random.realInRange(0.16, 0.34));
      grass.fillCircle(x, y, radius);
    }

    for (let index = 0; index < 130; index += 1) {
      const x = random.between(0, WORLD_WIDTH);
      const y = random.between(0, WORLD_HEIGHT);
      grass.lineStyle(2, 0x78a85e, random.realInRange(0.08, 0.18));
      grass.lineBetween(x, y, x + random.between(-5, 5), y - 10);
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
    const detailSamples = [54, 112, 178, 262, 338, 416];

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
