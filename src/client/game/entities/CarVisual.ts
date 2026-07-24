import Phaser from "phaser";

export interface CarVisual {
  root: Phaser.GameObjects.Container;
}

interface CarVisualOptions {
  includeShadow?: boolean;
}

export function createCarVisual(
  scene: Phaser.Scene,
  bodyColor: number,
  options: CarVisualOptions = {},
): CarVisual {
  const root = scene.add.container(0, 0);
  const includeShadow = options.includeShadow ?? true;
  if (includeShadow) {
    root.add(
      scene.add
        .ellipse(3, 5, 38, 64, 0x07110d, 0.34)
        .setOrigin(0.5),
    );
  }
  const wheels = scene.add.graphics();
  wheels.fillStyle(0x11171a, 1);
  wheels.fillRoundedRect(-21, -20, 8, 17, 3);
  wheels.fillRoundedRect(13, -20, 8, 17, 3);
  wheels.fillRoundedRect(-21, 10, 8, 17, 3);
  wheels.fillRoundedRect(13, 10, 8, 17, 3);
  wheels.fillStyle(0x667078, 0.72);
  wheels.fillRect(-20, -16, 2, 9);
  wheels.fillRect(18, -16, 2, 9);
  wheels.fillRect(-20, 14, 2, 9);
  wheels.fillRect(18, 14, 2, 9);

  const body = scene.add.graphics();
  body.lineStyle(2, 0xffffff, 0.7);
  body.fillStyle(bodyColor, 1);
  body.fillRoundedRect(-16, -29, 32, 58, 9);
  body.strokeRoundedRect(-16, -29, 32, 58, 9);
  body.fillStyle(0xffffff, 0.15);
  body.fillRoundedRect(-11, -25, 5, 45, 3);
  body.fillStyle(0x111b22, 1);
  body.fillRoundedRect(-12, -11, 24, 24, 6);
  body.fillStyle(0x83cfe6, 0.78);
  body.fillRoundedRect(-10, -9, 20, 10, 4);
  body.fillStyle(0x294652, 0.92);
  body.fillRoundedRect(-10, 3, 20, 7, 3);
  body.fillStyle(0xffffff, 0.5);
  body.fillRoundedRect(-11, -25, 22, 4, 2);
  body.fillStyle(0xffe16a, 1);
  body.fillCircle(-9, -24, 2.2);
  body.fillCircle(9, -24, 2.2);
  body.fillStyle(0xb51e2e, 0.95);
  body.fillRoundedRect(-10, 23, 6, 3, 1);
  body.fillRoundedRect(4, 23, 6, 3, 1);

  const directionCue = scene.add.graphics();
  directionCue.fillStyle(0xffffff, 0.92);
  directionCue.fillTriangle(-4, -32, 4, -32, 0, -37);

  root.add([wheels, body, directionCue]);
  return { root };
}
