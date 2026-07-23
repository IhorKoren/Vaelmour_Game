import Phaser from "phaser";
import type { PlayerCar } from "../entities/PlayerCar";
import type { Surface } from "../types";

interface DustParticle {
  x: number;
  y: number;
  velocityX: number;
  velocityY: number;
  lifeMs: number;
  maxLifeMs: number;
  size: number;
}

interface SkidMark {
  fromX: number;
  fromY: number;
  toX: number;
  toY: number;
  lifeMs: number;
}

export class DrivingEffects {
  private readonly graphics: Phaser.GameObjects.Graphics;
  private readonly dust: DustParticle[] = [];
  private readonly skidMarks: SkidMark[] = [];
  private dustCooldownMs = 0;
  private skidCooldownMs = 0;

  constructor(scene: Phaser.Scene) {
    this.graphics = scene.add.graphics().setDepth(7);
  }

  update(
    deltaMs: number,
    car: PlayerCar,
    surface: Surface,
    steering: number,
  ) {
    this.dustCooldownMs -= deltaMs;
    this.skidCooldownMs -= deltaMs;
    const speed = car.velocity.length();
    const forward = new Phaser.Math.Vector2(
      Math.sin(car.rotation),
      -Math.cos(car.rotation),
    );
    const right = new Phaser.Math.Vector2(forward.y, -forward.x);
    const rear = new Phaser.Math.Vector2(car.x, car.y).subtract(
      forward.clone().scale(27),
    );

    if (surface === "OFFROAD" && speed > 55 && this.dustCooldownMs <= 0) {
      this.dustCooldownMs = 72;
      for (const side of [-1, 1]) {
        const position = rear
          .clone()
          .add(right.clone().scale(side * 11 + Phaser.Math.Between(-3, 3)));
        this.dust.push({
          x: position.x,
          y: position.y,
          velocityX: -forward.x * speed * 0.08 + Phaser.Math.Between(-10, 10),
          velocityY: -forward.y * speed * 0.08 + Phaser.Math.Between(-10, 10),
          lifeMs: 460,
          maxLifeMs: 460,
          size: Phaser.Math.Between(4, 8),
        });
      }
    }

    if (
      speed > 180 &&
      Math.abs(steering) > 0.56 &&
      this.skidCooldownMs <= 0
    ) {
      this.skidCooldownMs = 55;
      const travel = car.velocity.clone().normalize().scale(17);
      for (const side of [-1, 1]) {
        const wheel = rear.clone().add(right.clone().scale(side * 12));
        this.skidMarks.push({
          fromX: wheel.x,
          fromY: wheel.y,
          toX: wheel.x - travel.x,
          toY: wheel.y - travel.y,
          lifeMs: 900,
        });
      }
    }

    for (const particle of this.dust) {
      particle.lifeMs -= deltaMs;
      particle.x += particle.velocityX * (deltaMs / 1000);
      particle.y += particle.velocityY * (deltaMs / 1000);
    }
    for (const mark of this.skidMarks) {
      mark.lifeMs -= deltaMs;
    }

    this.trimExpiredEffects();
    this.draw();
  }

  destroy() {
    this.graphics.destroy();
    this.dust.length = 0;
    this.skidMarks.length = 0;
  }

  private trimExpiredEffects() {
    while (this.dust.length > 0 && this.dust[0].lifeMs <= 0) {
      this.dust.shift();
    }
    while (this.skidMarks.length > 0 && this.skidMarks[0].lifeMs <= 0) {
      this.skidMarks.shift();
    }

    if (this.dust.length > 36) {
      this.dust.splice(0, this.dust.length - 36);
    }
    if (this.skidMarks.length > 42) {
      this.skidMarks.splice(0, this.skidMarks.length - 42);
    }
  }

  private draw() {
    this.graphics.clear();

    for (const mark of this.skidMarks) {
      this.graphics.lineStyle(2, 0x101719, 0.24 * (mark.lifeMs / 900));
      this.graphics.lineBetween(mark.fromX, mark.fromY, mark.toX, mark.toY);
    }

    for (const particle of this.dust) {
      const progress = particle.lifeMs / particle.maxLifeMs;
      const radius = particle.size * (1.35 - progress * 0.35);
      this.graphics.fillStyle(0xc9b778, 0.24 * progress);
      this.graphics.fillCircle(particle.x, particle.y, radius);
    }
  }
}
