import { CATEGORY_SENSOR, CATEGORY_BALL } from '../utils/constants';
import { bridge } from '../utils/bridge';

export class StartChakker {
  private scene: Phaser.Scene;
  private sensor!: MatterJS.BodyType;
  private graphics: Phaser.GameObjects.Graphics;
  private x: number;
  private y: number;
  private width: number;
  private height: number;
  private pulseAlpha = 0;
  private hitCount = 0;
  private onBallEntry: () => void;
  private floatingTexts: { text: Phaser.GameObjects.Text; startTime: number }[] = [];

  constructor(
    scene: Phaser.Scene,
    x: number, y: number, width: number, height: number,
    onBallEntry: () => void,
  ) {
    this.scene = scene;
    this.x = x;
    this.y = y;
    this.width = width;
    this.height = height;
    this.onBallEntry = onBallEntry;
    this.graphics = scene.add.graphics();
    this.createSensor();
    this.setupCollision();
  }

  private createSensor(): void {
    this.sensor = this.scene.matter.add.rectangle(
      this.x + this.width / 2,
      this.y + this.height / 2,
      this.width,
      this.height,
      {
        isStatic: true,
        isSensor: true,
        collisionFilter: {
          category: CATEGORY_SENSOR,
          mask: CATEGORY_BALL,
        },
        label: 'startChakker',
      },
    );
  }

  private setupCollision(): void {
    this.scene.matter.world.on('collisionstart', (event: Phaser.Physics.Matter.Events.CollisionStartEvent) => {
      for (const pair of event.pairs) {
        const labels = [pair.bodyA.label, pair.bodyB.label];
        if (labels.includes('startChakker') && labels.includes('ball')) {
          this.pulseAlpha = 1.0;
          this.hitCount++;
          bridge.emit({ type: 'ball:chakker' });
          this.onBallEntry();
          this.showFloatingText();
        }
      }
    });
  }

  private showFloatingText(): void {
    const text = this.scene.add.text(
      this.x + this.width / 2,
      this.y - 5,
      '+3  SPIN!',
      {
        fontSize: '14px',
        fontFamily: '-apple-system, sans-serif',
        fontStyle: 'bold',
        color: '#00ffcc',
        align: 'center',
      },
    );
    text.setOrigin(0.5, 1);
    text.setShadow(0, 0, '#00ffcc', 6, true, true);
    this.floatingTexts.push({ text, startTime: this.scene.time.now });
  }

  update(): void {
    this.graphics.clear();
    const cx = this.x + this.width / 2;
    const cy = this.y + this.height / 2;

    // Base gate — glowing teal outline with label
    const baseAlpha = 0.25 + Math.sin(this.scene.time.now * 0.003) * 0.08;
    this.graphics.fillStyle(0x4ecdc4, baseAlpha);
    this.graphics.fillRect(this.x, this.y, this.width, this.height);
    this.graphics.lineStyle(2, 0x4ecdc4, 0.6);
    this.graphics.strokeRect(this.x, this.y, this.width, this.height);

    // Small arrows pointing down into the gate
    this.graphics.fillStyle(0x4ecdc4, 0.5);
    this.graphics.fillTriangle(cx - 8, this.y - 6, cx, this.y, cx + 8, this.y - 6);

    // Bright flash on hit
    if (this.pulseAlpha > 0) {
      // Bright center flash
      this.graphics.fillStyle(0x00ffcc, this.pulseAlpha * 0.7);
      this.graphics.fillRect(this.x - 8, this.y - 8, this.width + 16, this.height + 16);

      // Expanding ring
      const ringRadius = 20 + (1 - this.pulseAlpha) * 30;
      this.graphics.lineStyle(2, 0x00ffcc, this.pulseAlpha * 0.5);
      this.graphics.strokeCircle(cx, cy, ringRadius);

      this.pulseAlpha = Math.max(0, this.pulseAlpha - 0.025);
    }

    // Animate floating texts (rise + fade)
    const now = this.scene.time.now;
    for (let i = this.floatingTexts.length - 1; i >= 0; i--) {
      const ft = this.floatingTexts[i]!;
      const elapsed = now - ft.startTime;
      if (elapsed > 1200) {
        ft.text.destroy();
        this.floatingTexts.splice(i, 1);
      } else {
        const t = elapsed / 1200;
        ft.text.y = this.y - 5 - t * 35;
        ft.text.alpha = 1 - t;
      }
    }
  }
}
