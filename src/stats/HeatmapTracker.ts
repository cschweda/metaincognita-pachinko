import { BOARD_WIDTH, BOARD_HEIGHT } from '../utils/constants';

const GRID_COLS = 80;
const GRID_ROWS = 100;
const CELL_W = BOARD_WIDTH / GRID_COLS;
const CELL_H = BOARD_HEIGHT / GRID_ROWS;

export class HeatmapTracker {
  private scene: Phaser.Scene;
  private grid: number[][];
  private graphics: Phaser.GameObjects.Graphics;
  private frameCount = 0;
  private maxCount = 1;
  private visible = false;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    this.graphics = scene.add.graphics();
    this.graphics.setDepth(5);
    this.grid = Array.from({ length: GRID_ROWS }, () => new Array(GRID_COLS).fill(0) as number[]);
  }

  /** Sample ball positions. Call every frame — internally throttles to every 5th frame. */
  sample(balls: MatterJS.BodyType[]): void {
    this.frameCount++;
    if (this.frameCount % 5 !== 0) return;

    for (const ball of balls) {
      const col = Math.floor(ball.position.x / CELL_W);
      const row = Math.floor(ball.position.y / CELL_H);
      if (col >= 0 && col < GRID_COLS && row >= 0 && row < GRID_ROWS) {
        const currentVal = this.grid[row]![col]!;
        const newVal = currentVal + 1;
        this.grid[row]![col] = newVal;
        if (newVal > this.maxCount) this.maxCount = newVal;
      }
    }

    // Render every 30th frame
    if (this.frameCount % 30 === 0 && this.visible) {
      this.render();
    }
  }

  toggle(): void {
    this.visible = !this.visible;
    if (!this.visible) {
      this.graphics.clear();
    } else {
      this.render();
    }
  }

  isVisible(): boolean {
    return this.visible;
  }

  private render(): void {
    this.graphics.clear();
    if (this.maxCount <= 1) return;

    for (let row = 0; row < GRID_ROWS; row++) {
      for (let col = 0; col < GRID_COLS; col++) {
        const count = this.grid[row]![col]!;
        if (count <= 0) continue;

        const intensity = Math.min(1, count / this.maxCount);
        if (intensity < 0.02) continue;

        // Cold (blue) → warm (red) gradient
        const r = Math.floor(intensity * 255);
        const g = Math.floor(Math.max(0, (0.5 - Math.abs(intensity - 0.5)) * 2) * 180);
        const b = Math.floor((1 - intensity) * 255);
        const color = (r << 16) | (g << 8) | b;

        this.graphics.fillStyle(color, intensity * 0.4);
        this.graphics.fillRect(col * CELL_W, row * CELL_H, CELL_W, CELL_H);
      }
    }
  }
}
