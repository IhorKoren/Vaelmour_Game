import Phaser from "phaser";
import type { NetworkPlayerState } from "../../../shared/multiplayer/protocol";

interface BufferedSnapshot {
  state: NetworkPlayerState;
  receivedAt: number;
}

const MAX_BUFFER_SIZE = 32;

export class RemoteCar extends Phaser.GameObjects.Container {
  private readonly snapshots: BufferedSnapshot[] = [];

  constructor(
    scene: Phaser.Scene,
    readonly playerId: string,
    color: string,
  ) {
    super(scene, 0, 0);
    const colorValue = Number.parseInt(color.slice(1), 16);
    const body = scene.add
      .rectangle(0, 0, 30, 54, colorValue)
      .setStrokeStyle(2, 0xffffff)
      .setOrigin(0.5);
    const cabin = scene.add
      .rectangle(0, -6, 22, 22, 0x20303a)
      .setStrokeStyle(1, 0xcceeff)
      .setOrigin(0.5);
    const label = scene.add
      .text(0, -38, playerId.slice(0, 4).toUpperCase(), {
        color: "#ffffff",
        fontFamily: "Arial, sans-serif",
        fontSize: "10px",
        fontStyle: "bold",
      })
      .setOrigin(0.5);

    this.add([body, cabin, label]);
    scene.add.existing(this);
  }

  pushSnapshot(state: NetworkPlayerState, receivedAt = performance.now()) {
    const latest = this.snapshots.at(-1);
    if (latest && state.sequence <= latest.state.sequence) {
      return;
    }

    this.snapshots.push({ state, receivedAt });
    if (this.snapshots.length > MAX_BUFFER_SIZE) {
      this.snapshots.shift();
    }

    if (this.snapshots.length === 1) {
      this.applyState(state);
    }
  }

  update(renderTime: number, interpolationDelayMs: number, opacity: number) {
    if (this.snapshots.length === 0) {
      return;
    }

    const targetTime = renderTime - interpolationDelayMs;
    while (
      this.snapshots.length > 2 &&
      this.snapshots[1].receivedAt <= targetTime
    ) {
      this.snapshots.shift();
    }

    const from = this.snapshots[0];
    const to = this.snapshots[1];

    if (!to || targetTime <= from.receivedAt) {
      this.applyState(from.state);
    } else if (targetTime >= to.receivedAt) {
      this.applyState(to.state);
    } else {
      const progress = Phaser.Math.Clamp(
        (targetTime - from.receivedAt) / (to.receivedAt - from.receivedAt),
        0,
        1,
      );
      this.x = Phaser.Math.Linear(from.state.x, to.state.x, progress);
      this.y = Phaser.Math.Linear(from.state.y, to.state.y, progress);
      this.rotation =
        from.state.rotation +
        Phaser.Math.Angle.Wrap(to.state.rotation - from.state.rotation) *
          progress;
    }

    this.setAlpha(opacity);
  }

  private applyState(state: NetworkPlayerState) {
    this.setPosition(state.x, state.y);
    this.rotation = state.rotation;
  }
}
