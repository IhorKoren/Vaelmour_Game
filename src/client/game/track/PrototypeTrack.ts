import Phaser from "phaser";
import type { Point2D } from "../rendering/projection";

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

export interface SandZone {
  x: number;
  y: number;
  width: number;
  height: number;
}

export class PrototypeTrack {
  readonly worldWidth = WORLD_WIDTH;
  readonly worldHeight = WORLD_HEIGHT;
  readonly roadWidth = TRACK_WIDTH;
  readonly halfWidth = TRACK_WIDTH / 2;
  readonly curbWidth = CURB_WIDTH;
  readonly points: Phaser.Math.Vector2[];
  readonly checkpoints: TrackCheckpoint[];
  readonly sandZones: readonly SandZone[] = [
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

  constructor() {
    const spline = new Phaser.Curves.Spline(CONTROL_POINTS);
    this.points = spline.getSpacedPoints(SAMPLE_COUNT);
    const checkpointSamples = [
      0, 96, 192, 288, 384, 480, 576, 672, 768, 864,
    ];
    this.checkpoints = checkpointSamples.map((index) => ({
      position: this.points[index].clone(),
      radius: this.halfWidth * 0.72,
    }));
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

  getNormal(index: number): Point2D {
    const previous = this.points[Math.max(0, index - 2)];
    const next =
      this.points[Math.min(this.points.length - 1, index + 2)];
    const tangentX = next.x - previous.x;
    const tangentY = next.y - previous.y;
    const length = Math.hypot(tangentX, tangentY) || 1;
    return {
      x: -tangentY / length,
      y: tangentX / length,
    };
  }

  isOnTrack(position: Phaser.Math.Vector2) {
    const maxDistanceSq = this.halfWidth * this.halfWidth;

    for (const point of this.points) {
      if (
        Phaser.Math.Distance.Squared(
          point.x,
          point.y,
          position.x,
          position.y,
        ) <= maxDistanceSq
      ) {
        return true;
      }
    }

    return false;
  }
}
