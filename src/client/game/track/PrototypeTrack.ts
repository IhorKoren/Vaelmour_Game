import Phaser from "phaser";

const WORLD_WIDTH = 2600;
const WORLD_HEIGHT = 3600;
const TRACK_WIDTH = 270;
const SAMPLE_COUNT = 480;

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
        0x173f2a,
      )
      .setDepth(-20);

    const track = scene.add.graphics().setDepth(-10);
    this.strokeTrack(track, TRACK_WIDTH + 28, 0xdad6c8, 1);
    this.strokeTrack(track, TRACK_WIDTH + 15, 0xc84b3c, 1);
    this.strokeTrack(track, TRACK_WIDTH, 0x252a2f, 1);
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

  private drawStartLine(scene: Phaser.Scene) {
    const start = this.points[0];
    const tangent = this.points[3].clone().subtract(start).normalize();
    const line = scene.add.container(start.x, start.y).setDepth(-5);
    const columns = 12;
    const rows = 2;
    const squareWidth = TRACK_WIDTH / columns;
    const squareHeight = 13;

    for (let row = 0; row < rows; row += 1) {
      for (let column = 0; column < columns; column += 1) {
        const color = (row + column) % 2 === 0 ? 0xf4f5f6 : 0x15191d;
        line.add(
          scene.add.rectangle(
            (column - (columns - 1) / 2) * squareWidth,
            (row - 0.5) * squareHeight,
            squareWidth,
            squareHeight,
            color,
          ),
        );
      }
    }

    line.rotation = Math.atan2(tangent.y, tangent.x) + Math.PI / 2;
  }
}
