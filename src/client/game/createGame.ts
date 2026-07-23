import Phaser from "phaser";
import type { DrivingConfig } from "./config/drivingConfig";
import { RacePrototypeScene } from "./scenes/RacePrototypeScene";
import type { RaceTelemetry } from "./types";
import type { MultiplayerRuntimeConfig } from "../multiplayer/config";
import type { MultiplayerTelemetry } from "../multiplayer/types";

const GAME_WIDTH = 450;
const GAME_HEIGHT = 800;

export function createGame(
  parent: HTMLElement,
  getDrivingConfig: () => DrivingConfig,
  getMultiplayerConfig: () => MultiplayerRuntimeConfig,
  onTelemetry: (telemetry: RaceTelemetry) => void,
  onMultiplayerTelemetry: (telemetry: MultiplayerTelemetry) => void,
) {
  return new Phaser.Game({
    type: Phaser.AUTO,
    parent,
    width: GAME_WIDTH,
    height: GAME_HEIGHT,
    backgroundColor: "#173f2a",
    scene: [
      new RacePrototypeScene(
        getDrivingConfig,
        getMultiplayerConfig,
        onTelemetry,
        onMultiplayerTelemetry,
      ),
    ],
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
