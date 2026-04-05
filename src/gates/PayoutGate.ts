import { CATEGORY_SENSOR, CATEGORY_BALL, CATEGORY_WALL } from '../utils/constants';

export class PayoutGate {
  private scene: Phaser.Scene;
  private solidBody: MatterJS.BodyType;
  private sensorBody: MatterJS.BodyType;
  private graphics: Phaser.GameObjects.Graphics;
  private isOpen = false;
  private x: number;
  private y: number;
  private width: number;
  private onBallEntry: () => void;
  private pulseAlpha = 0;

  constructor(
    scene: Phaser.Scene,
    x: number, y: number, width: number,
    onBallEntry: () => void,
  ) {
    this.scene = scene;
    this.x = x;
    this.y = y;
    this.width = width;
    this.onBallEntry = onBallEntry;
    this.graphics = scene.add.graphics();

    // Solid body — blocks balls when gate is closed
    this.solidBody = scene.matter.add.rectangle(x + width / 2, y, width, 6, {
      isStatic: true,
      collisionFilter: {
        category: CATEGORY_WALL,
        mask: CATEGORY_BALL,
      },
      label: 'payoutGateSolid',
    });

    // Sensor body — detects ball entry when gate is open
    this.sensorBody = scene.matter.add.rectangle(x + width / 2, y + 10, width, 20, {
      isStatic: true,
      isSensor: true,
      collisionFilter: {
        category: CATEGORY_SENSOR,
        mask: CATEGORY_BALL,
      },
      label: 'payoutGateSensor',
    });

    this.setupCollision();
  }

  private setupCollision(): void {
    this.scene.matter.world.on('collisionstart', (event: Phaser.Physics.Matter.Events.CollisionStartEvent) => {
      if (!this.isOpen) return;
      for (const pair of event.pairs) {
        const labels = [pair.bodyA.label, pair.bodyB.label];
        if (labels.includes('payoutGateSensor') && labels.includes('ball')) {
          this.pulseAlpha = 1;
          this.onBallEntry();
        }
      }
    });
  }

  open(): void {
    this.isOpen = true;
    // Remove solid body collision so balls pass through
    this.solidBody.collisionFilter.mask = 0;
  }

  close(): void {
    this.isOpen = false;
    this.solidBody.collisionFilter.mask = CATEGORY_BALL;
  }

  getIsOpen(): boolean {
    return this.isOpen;
  }

  update(): void {
    this.graphics.clear();

    if (this.isOpen) {
      // Open gate — glowing green
      this.graphics.fillStyle(0x28a745, 0.4);
      this.graphics.fillRect(this.x, this.y - 3, this.width, 8);
      this.graphics.lineStyle(2, 0x28a745, 0.9);
      this.graphics.strokeRect(this.x, this.y - 3, this.width, 8);

      // Pulse on ball entry
      if (this.pulseAlpha > 0) {
        this.graphics.fillStyle(0x28a745, this.pulseAlpha * 0.5);
        this.graphics.fillRect(this.x - 5, this.y - 8, this.width + 10, 18);
        this.pulseAlpha = Math.max(0, this.pulseAlpha - 0.03);
      }
    } else {
      // Closed gate — dim bar
      this.graphics.fillStyle(0x656d76, 0.6);
      this.graphics.fillRect(this.x, this.y - 3, this.width, 6);
      this.graphics.lineStyle(1, 0x30363d, 0.8);
      this.graphics.strokeRect(this.x, this.y - 3, this.width, 6);
    }
  }
}
