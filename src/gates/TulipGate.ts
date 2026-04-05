import { CATEGORY_SENSOR, CATEGORY_BALL } from '../utils/constants';

export class TulipGate {
  private scene: Phaser.Scene;
  private graphics: Phaser.GameObjects.Graphics;
  private isOpen = false;
  private x: number;
  private y: number;
  private toggleTimer = 0;
  private onToggle: (isOpen: boolean) => void;
  private linkedTulip: TulipGate | null = null;

  constructor(
    scene: Phaser.Scene,
    x: number, y: number,
    onToggle: (isOpen: boolean) => void,
  ) {
    this.scene = scene;
    this.x = x;
    this.y = y;
    this.onToggle = onToggle;
    this.graphics = scene.add.graphics();

    // Sensor — detects ball entry
    scene.matter.add.rectangle(x, y, 18, 14, {
      isStatic: true,
      isSensor: true,
      collisionFilter: {
        category: CATEGORY_SENSOR,
        mask: CATEGORY_BALL,
      },
      label: `tulip_${x}_${y}`,
    });

    this.setupCollision();
  }

  private setupCollision(): void {
    const label = `tulip_${this.x}_${this.y}`;
    this.scene.matter.world.on('collisionstart', (event: Phaser.Physics.Matter.Events.CollisionStartEvent) => {
      for (const pair of event.pairs) {
        const labels = [pair.bodyA.label, pair.bodyB.label];
        if (labels.includes(label) && labels.includes('ball')) {
          // Debounce — don't toggle more than once per 500ms
          const now = Date.now();
          if (now - this.toggleTimer < 500) return;
          this.toggleTimer = now;

          this.isOpen = !this.isOpen;
          this.onToggle(this.isOpen);

          // Trigger linked tulip (chain reaction)
          if (this.linkedTulip) {
            this.linkedTulip.forceToggle();
          }
        }
      }
    });
  }

  /** Link this tulip to another — when this one toggles, the linked one also toggles. */
  setLinkedTulip(tulip: TulipGate): void {
    this.linkedTulip = tulip;
  }

  /** Force toggle without ball collision (used by linked tulips). */
  forceToggle(): void {
    this.isOpen = !this.isOpen;
    this.onToggle(this.isOpen);
  }

  getIsOpen(): boolean {
    return this.isOpen;
  }

  update(): void {
    this.graphics.clear();

    if (this.isOpen) {
      // Open tulip — spread wings catching balls, bright gold
      const g = this.graphics;

      // Left wing (angled out)
      g.fillStyle(0xffd700, 0.7);
      g.beginPath();
      g.moveTo(this.x - 2, this.y - 4);
      g.lineTo(this.x - 14, this.y - 10);
      g.lineTo(this.x - 14, this.y + 2);
      g.lineTo(this.x - 2, this.y + 4);
      g.closePath();
      g.fillPath();

      // Right wing (angled out)
      g.beginPath();
      g.moveTo(this.x + 2, this.y - 4);
      g.lineTo(this.x + 14, this.y - 10);
      g.lineTo(this.x + 14, this.y + 2);
      g.lineTo(this.x + 2, this.y + 4);
      g.closePath();
      g.fillPath();

      // Center catch area
      g.fillStyle(0xffd700, 0.9);
      g.fillRect(this.x - 3, this.y - 5, 6, 10);

      // Glow outline
      g.lineStyle(1, 0xffd700, 0.4);
      g.strokeCircle(this.x, this.y, 16);
    } else {
      // Closed tulip — narrow vertical bar
      const g = this.graphics;
      g.fillStyle(0x8b949e, 0.5);
      g.fillRect(this.x - 2, this.y - 7, 4, 14);
      g.lineStyle(1, 0x656d76, 0.6);
      g.strokeRect(this.x - 2, this.y - 7, 4, 14);
    }
  }
}
