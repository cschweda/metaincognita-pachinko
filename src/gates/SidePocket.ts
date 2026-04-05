import { CATEGORY_SENSOR, CATEGORY_BALL } from '../utils/constants';

export type PocketType = 'dead' | 'minor';

export class SidePocket {
  private scene: Phaser.Scene;
  private graphics: Phaser.GameObjects.Graphics;
  private pocketType: PocketType;
  private payout: number;
  private onBallEntry: (type: PocketType, payout: number) => void;

  constructor(
    scene: Phaser.Scene,
    x: number, y: number, width: number, height: number,
    pocketType: PocketType,
    payout: number,
    onBallEntry: (type: PocketType, payout: number) => void,
  ) {
    this.scene = scene;
    this.pocketType = pocketType;
    this.payout = payout;
    this.onBallEntry = onBallEntry;
    this.graphics = scene.add.graphics();

    // Sensor body
    scene.matter.add.rectangle(x + width / 2, y + height / 2, width, height, {
      isStatic: true,
      isSensor: true,
      collisionFilter: {
        category: CATEGORY_SENSOR,
        mask: CATEGORY_BALL,
      },
      label: `sidePocket_${pocketType}`,
    });

    // Draw static appearance
    const color = pocketType === 'dead' ? 0x656d76 : 0xb8960b;
    this.graphics.fillStyle(color, 0.2);
    this.graphics.fillRect(x, y, width, height);
    this.graphics.lineStyle(1, color, 0.5);
    this.graphics.strokeRect(x, y, width, height);

    this.setupCollision(pocketType);
  }

  private setupCollision(pocketType: PocketType): void {
    const label = `sidePocket_${pocketType}`;
    this.scene.matter.world.on('collisionstart', (event: Phaser.Physics.Matter.Events.CollisionStartEvent) => {
      for (const pair of event.pairs) {
        const labels = [pair.bodyA.label, pair.bodyB.label];
        if (labels.includes(label) && labels.includes('ball')) {
          this.onBallEntry(this.pocketType, this.payout);
        }
      }
    });
  }
}
