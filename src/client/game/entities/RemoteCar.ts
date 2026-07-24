import Phaser from "phaser";
import type { NetworkPlayerState } from "../../../shared/multiplayer/protocol";
import { createCarVisual } from "./CarVisual";

interface BufferedSnapshot {
  state: NetworkPlayerState;
  receivedAt: number;
}

const MAX_BUFFER_SIZE = 32;

export class RemoteCar extends Phaser.GameObjects.Container {
  private readonly snapshots: BufferedSnapshot[] = [];
  private readonly visualRoot: Phaser.GameObjects.Container;
  private readonly nameplate: Phaser.GameObjects.Container;

  constructor(
    scene: Phaser.Scene,
    readonly playerId: string,
    color: string,
  ) {
    super(scene, 0, 0);
    const colorValue = Number.parseInt(color.slice(1), 16);
    this.visualRoot = createCarVisual(scene, colorValue).root;
    this.nameplate = scene.add.container(0, 0).setDepth(11);
    const badge = scene.add
      .rectangle(0, 0, 38, 15, 0x07110d, 0.72)
      .setStrokeStyle(1, 0xffffff, 0.36)
      .setOrigin(0.5);
    const label = scene.add
      .text(0, 0, playerId.slice(0, 4).toUpperCase(), {
        color: "#ffffff",
        fontFamily: "Arial, sans-serif",
        fontSize: "9px",
        fontStyle: "bold",
      })
      .setOrigin(0.5);

    this.nameplate.add([badge, label]);
    this.add(this.visualRoot);
    scene.add.existing(this);
  }

  get nameplateObject() {
    return this.nameplate;
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

  update(
    renderTime: number,
    interpolationDelayMs: number,
    opacity: number,
  ) {
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

    this.visualRoot.setAlpha(opacity);
  }

  getNameplateAnchor(out: Phaser.Math.Vector2) {
    return out.set(
      this.x + Math.sin(this.rotation) * 48,
      this.y - Math.cos(this.rotation) * 48,
    );
  }

  updateNameplate(
    cameraHeading: number,
    projectedPosition?: Phaser.Math.Vector2,
  ) {
    if (projectedPosition) {
      this.nameplate.setPosition(projectedPosition.x, projectedPosition.y);
    } else {
      this.nameplate.setPosition(
        this.x + Math.sin(this.rotation) * 48,
        this.y - Math.cos(this.rotation) * 48,
      );
    }

    this.nameplate.rotation = cameraHeading;
  }

  override destroy(fromScene?: boolean) {
    this.nameplate.destroy(fromScene);
    super.destroy(fromScene);
  }

  private applyState(state: NetworkPlayerState) {
    this.setPosition(state.x, state.y);
    this.rotation = state.rotation;
  }
}
