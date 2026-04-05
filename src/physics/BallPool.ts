import {
  BALL_RADIUS, MAX_BALLS, EXIT_ZONE_Y,
  CATEGORY_BALL, CATEGORY_PIN, CATEGORY_WALL, CATEGORY_GATE, CATEGORY_SENSOR,
} from '../utils/constants';
import { getTuning } from './PhysicsConfig';
import { bridge } from '../utils/bridge';

const MAX_BALL_LIFETIME_MS = 12000;  // Despawn balls stuck for more than 12 seconds
const STUCK_SPEED_THRESHOLD = 0.15;  // Below this speed, ball is considered stuck
const STUCK_CHECK_INTERVAL_MS = 2000; // Check every 2 seconds
const NUDGE_FORCE = 0.0005;           // Gentle nudge to dislodge

interface PooledBall {
  body: MatterJS.BodyType;
  active: boolean;
  spawnTime: number;
  lastMovingTime: number;  // Last time the ball was moving at reasonable speed
}

export class BallPool {
  private scene: Phaser.Scene;
  private pool: PooledBall[] = [];
  private graphics: Phaser.GameObjects.Graphics;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    this.graphics = scene.add.graphics();
    this.initPool();
  }

  private initPool(): void {
    const tuning = getTuning();
    for (let i = 0; i < MAX_BALLS; i++) {
      const baseMask = CATEGORY_PIN | CATEGORY_WALL | CATEGORY_GATE | CATEGORY_SENSOR;
      const collisionMask = tuning.ballToBallCollisions
        ? baseMask | CATEGORY_BALL
        : baseMask;

      const body = this.scene.matter.add.circle(-100, -100, BALL_RADIUS, {
        restitution: tuning.ballRestitution,
        friction: tuning.ballFriction,
        frictionAir: tuning.ballFrictionAir,
        density: tuning.ballDensity,
        collisionFilter: {
          category: CATEGORY_BALL,
          mask: collisionMask,
        },
        label: 'ball',
      });

      // Start inactive (off-screen, sleeping)
      this.scene.matter.body.setStatic(body, true);
      this.pool.push({ body, active: false, spawnTime: 0, lastMovingTime: 0 });
    }
  }

  spawn(x: number, y: number, velocityX: number, velocityY: number): MatterJS.BodyType | null {
    const slot = this.pool.find(b => !b.active);
    if (!slot) return null;

    slot.active = true;
    slot.spawnTime = Date.now();
    slot.lastMovingTime = Date.now();
    this.scene.matter.body.setStatic(slot.body, false);
    this.scene.matter.body.setPosition(slot.body, { x, y });
    this.scene.matter.body.setVelocity(slot.body, { x: velocityX, y: velocityY });
    this.scene.matter.body.setAngularVelocity(slot.body, 0);

    bridge.emit({ type: 'ball:launched' });
    return slot.body;
  }

  despawn(body: MatterJS.BodyType): void {
    const slot = this.pool.find(b => b.body === body);
    if (!slot || !slot.active) return;

    slot.active = false;
    this.scene.matter.body.setStatic(slot.body, true);
    this.scene.matter.body.setPosition(slot.body, { x: -100, y: -100 });
    this.scene.matter.body.setVelocity(slot.body, { x: 0, y: 0 });

    bridge.emit({ type: 'ball:lost' });
  }

  update(): void {
    const now = Date.now();

    for (const slot of this.pool) {
      if (!slot.active) continue;

      // Despawn balls that exited the bottom
      if (slot.body.position.y > EXIT_ZONE_Y) {
        this.despawn(slot.body);
        continue;
      }
      // Despawn balls that escaped left/right
      if (slot.body.position.x < -50 || slot.body.position.x > 850) {
        this.despawn(slot.body);
        continue;
      }
      // Track ball movement — if moving, update lastMovingTime
      const speed = Math.sqrt(
        slot.body.velocity.x * slot.body.velocity.x +
        slot.body.velocity.y * slot.body.velocity.y
      );
      if (speed > STUCK_SPEED_THRESHOLD) {
        slot.lastMovingTime = now;
      }

      // If ball has been nearly stationary for 2+ seconds, nudge it
      const stuckDuration = now - slot.lastMovingTime;
      if (stuckDuration > STUCK_CHECK_INTERVAL_MS && stuckDuration < MAX_BALL_LIFETIME_MS) {
        // Random nudge direction, biased downward
        const nudgeX = (Math.random() - 0.5) * NUDGE_FORCE * 2;
        const nudgeY = NUDGE_FORCE + Math.random() * NUDGE_FORCE;
        this.scene.matter.body.applyForce(slot.body, slot.body.position, { x: nudgeX, y: nudgeY });
        slot.lastMovingTime = now; // Reset so we don't nudge every frame
      }

      // Despawn balls stuck too long (prevents pool exhaustion)
      if (now - slot.spawnTime > MAX_BALL_LIFETIME_MS) {
        this.despawn(slot.body);
        continue;
      }
    }

    // Render all active balls
    this.graphics.clear();
    for (const slot of this.pool) {
      if (!slot.active) continue;
      const { x, y } = slot.body.position;

      // Chrome/silver ball with highlight
      this.graphics.fillStyle(0xC0C0C0, 1);
      this.graphics.fillCircle(x, y, BALL_RADIUS);
      // Specular highlight
      this.graphics.fillStyle(0xFFFFFF, 0.6);
      this.graphics.fillCircle(x - 1.5, y - 1.5, BALL_RADIUS * 0.4);
    }
  }

  getActiveBalls(): MatterJS.BodyType[] {
    return this.pool.filter(b => b.active).map(b => b.body);
  }

  getActiveCount(): number {
    return this.pool.filter(b => b.active).length;
  }

  updateBallToBallCollisions(enabled: boolean): void {
    const baseMask = CATEGORY_PIN | CATEGORY_WALL | CATEGORY_GATE | CATEGORY_SENSOR;
    const mask = enabled
      ? baseMask | CATEGORY_BALL
      : baseMask;

    for (const slot of this.pool) {
      slot.body.collisionFilter.mask = mask;
    }
  }

  destroy(): void {
    for (const slot of this.pool) {
      this.scene.matter.world.remove(slot.body);
    }
    this.pool = [];
    this.graphics.destroy();
  }
}
