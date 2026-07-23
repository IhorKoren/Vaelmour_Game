import Phaser from "phaser";
import { FoundationScene } from "./scenes/FoundationScene";

const GAME_WIDTH = 450;
const GAME_HEIGHT = 800;

export function createGame(parent: HTMLElement) {
  return new Phaser.Game({
    type: Phaser.AUTO,
    parent,
    width: GAME_WIDTH,
    height: GAME_HEIGHT,
    backgroundColor: "#0c0f13",
    scene: [FoundationScene],
    scale: {
      mode: Phaser.Scale.FIT,
      autoCenter: Phaser.Scale.CENTER_BOTH,
    },
    render: {
      antialias: true,
      pixelArt: false,
    },
  });
}
