export class BootScene extends Phaser.Scene {
  constructor() {
    super({ key: 'BootScene' });
  }

  preload(): void {
    // Phase 1: no external assets to load.
    // Pins and balls are rendered with graphics primitives.
    // Future phases will load theme assets here.
  }

  create(): void {
    this.scene.start('BoardScene');
  }
}
