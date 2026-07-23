import Phaser from "phaser";
import type { DrivingConfig } from "./config/drivingConfig";
import { RacePrototypeScene } from "./scenes/RacePrototypeScene";
import type { RaceTelemetry } from "./types";

const GAME_WIDTH = 450;
const GAME_HEIGHT = 800;

export function createGame(
  parent: HTMLElement,
  getDrivingConfig: () => DrivingConfig,
  onTelemetry: (telemetry: RaceTelemetry) => void,
) {
  return new Phaser.Game({
    type: Phaser.AUTO,
    parent,
    width: GAME_WIDTH,
    height: GAME_HEIGHT,
    backgroundColor: "#173f2a",
    scene: [new RacePrototypeScene(getDrivingConfig, onTelemetry)],
    scale: {
      mode: Phaser.Scale.FIT,
      autoCenter: Phaser.Scale.CENTER_BOTH,
    },
    input: {
      activePointers: 2,
    },
    render: {
      antialias: true,
      pixelArt: false,
    },
  });
}
