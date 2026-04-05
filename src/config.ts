import Phaser from 'phaser';
import { BootScene } from './scenes/BootScene';
import { BoardScene } from './scenes/BoardScene';
import { BOARD_WIDTH, BOARD_HEIGHT } from './utils/constants';

export const GAME_CONFIG: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  width: BOARD_WIDTH,
  height: BOARD_HEIGHT,
  parent: 'game-container',
  backgroundColor: '#1a1a1a',
  physics: {
    default: 'matter',
    matter: {
      gravity: { x: 0, y: 0.7 },
      debug: false,
    },
  },
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  scene: [BootScene, BoardScene],
};
