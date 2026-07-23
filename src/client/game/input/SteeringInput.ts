import Phaser from "phaser";

export class SteeringInput {
  private activePointerId: number | null = null;
  private neutralX = 0;
  private target = 0;
  private value = 0;
  private readonly sensitivity = 128;
  private readonly onPointerDown = (pointer: Phaser.Input.Pointer) => {
    if (
      this.activePointerId !== null ||
      pointer.y < this.scene.scale.height * 0.52
    ) {
      return;
    }

    this.activePointerId = pointer.id;
    this.neutralX = pointer.x;
    this.target = 0;
  };

  private readonly onPointerMove = (pointer: Phaser.Input.Pointer) => {
    if (pointer.id !== this.activePointerId) {
      return;
    }

    this.target = Phaser.Math.Clamp(
      (pointer.x - this.neutralX) / this.sensitivity,
      -1,
      1,
    );
  };

  private readonly onPointerUp = (pointer: Phaser.Input.Pointer) => {
    if (pointer.id !== this.activePointerId) {
      return;
    }

    this.activePointerId = null;
    this.target = 0;
  };

  constructor(private readonly scene: Phaser.Scene) {
    scene.input.on(Phaser.Input.Events.POINTER_DOWN, this.onPointerDown);
    scene.input.on(Phaser.Input.Events.POINTER_MOVE, this.onPointerMove);
    scene.input.on(Phaser.Input.Events.POINTER_UP, this.onPointerUp);
    scene.input.on(Phaser.Input.Events.POINTER_UP_OUTSIDE, this.onPointerUp);
  }

  update(deltaSeconds: number, returnSpeed: number) {
    const response = this.activePointerId === null ? returnSpeed : 13;
    this.value = Phaser.Math.Linear(
      this.value,
      this.target,
      1 - Math.exp(-response * deltaSeconds),
    );

    if (Math.abs(this.value) < 0.001 && this.activePointerId === null) {
      this.value = 0;
    }

    return this.value;
  }

  destroy() {
    this.scene.input.off(Phaser.Input.Events.POINTER_DOWN, this.onPointerDown);
    this.scene.input.off(Phaser.Input.Events.POINTER_MOVE, this.onPointerMove);
    this.scene.input.off(Phaser.Input.Events.POINTER_UP, this.onPointerUp);
    this.scene.input.off(
      Phaser.Input.Events.POINTER_UP_OUTSIDE,
      this.onPointerUp,
    );
  }
}
