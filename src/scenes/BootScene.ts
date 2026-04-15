// src/scenes/BootScene.ts
import Phaser from 'phaser';

export class BootScene extends Phaser.Scene {
  constructor() {
    super({ key: 'BootScene' });
  }

  preload(): void {
    // Nothing to preload for now (emoji-based)
    // Future: load sprite sheets, audio, etc.
  }

  create(): void {
    this.scene.start('MainMenuScene');
  }
}
