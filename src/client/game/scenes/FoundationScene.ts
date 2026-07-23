import Phaser from "phaser";

export class FoundationScene extends Phaser.Scene {
  constructor() {
    super("foundation");
  }

  create() {
    const { width, height } = this.scale;
    const centerX = width / 2;

    this.add
      .text(32, 38, "FOUNDATION READY", {
        color: "#d8ff43",
        fontFamily: "Arial, sans-serif",
        fontSize: "16px",
        fontStyle: "bold",
      })
      .setLetterSpacing(2);

    const guide = this.add.graphics();
    guide.lineStyle(2, 0x39424b, 0.8);
    guide.strokeRoundedRect(72, 132, width - 144, height - 264, 28);
    guide.lineStyle(1, 0x69747f, 0.65);
    guide.lineBetween(centerX, 132, centerX, height - 132);

    this.add
      .text(centerX, height * 0.59, "RACING", {
        color: "#f5f7fa",
        fontFamily: "Arial, sans-serif",
        fontSize: "58px",
        fontStyle: "bold",
      })
      .setOrigin(0.5);

    this.add
      .text(centerX, height * 0.67, "React · TypeScript · Vite · Phaser", {
        color: "#99a3ad",
        fontFamily: "Arial, sans-serif",
        fontSize: "14px",
      })
      .setOrigin(0.5);

    this.add
      .text(centerX, height - 54, "9:16 PORTRAIT CLIENT", {
        color: "#747f89",
        fontFamily: "Arial, sans-serif",
        fontSize: "12px",
      })
      .setLetterSpacing(1.5)
      .setOrigin(0.5);
  }
}
