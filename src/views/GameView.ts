import Phaser from 'phaser';
import { GAME_CONFIG } from '../config';
import { StatsColumn } from '../ui/StatsColumn';
import { DevPanel } from '../ui/DevPanel';

export class GameView {
  private container: HTMLElement;
  private game: Phaser.Game | null = null;
  private statsColumn: StatsColumn | null = null;
  private devPanel: DevPanel | null = null;

  constructor(container: HTMLElement) {
    this.container = container;
    this.render();
  }

  private render(): void {
    this.container.innerHTML = `
      <div class="game-layout">
        <div class="game-canvas-wrapper">
          <div id="game-container"></div>
        </div>
        <div id="stats-column" class="stats-column"></div>
      </div>
      <div id="dev-panel"></div>
    `;
  }

  startGame(): void {
    if (this.game) return;

    this.game = new Phaser.Game(GAME_CONFIG);

    const statsEl = this.container.querySelector('#stats-column') as HTMLElement;
    if (statsEl) {
      this.statsColumn = new StatsColumn(statsEl);
    }

    const devEl = this.container.querySelector('#dev-panel') as HTMLElement;
    if (devEl) {
      this.devPanel = new DevPanel(devEl);
    }
  }

  show(): void {
    this.container.style.display = 'block';
  }

  hide(): void {
    this.container.style.display = 'none';
  }

  getGame(): Phaser.Game | null {
    return this.game;
  }
}
