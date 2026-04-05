import {
  DIAL_MAX_ROTATION, DIAL_RADIUS, DEAD_ZONE_THRESHOLD,
  MIN_LAUNCH_VELOCITY, MAX_LAUNCH_VELOCITY,
} from '../utils/constants';
import { getTuning } from '../physics/PhysicsConfig';
import type { BallPool } from '../physics/BallPool';
import type { BallEconomy } from '../economy/BallEconomy';
import { bridge } from '../utils/bridge';

export class LauncherDial {
  private scene: Phaser.Scene;
  private ballPool: BallPool;
  private economy: BallEconomy | null;
  private graphics: Phaser.GameObjects.Graphics;

  private power = 0;           // 0..1
  private dragging = false;
  private dialCenterX: number;
  private dialCenterY: number;

  private lastFireTime = 0;
  private totalLaunched = 0;
  private lastDialAdjustTime = 0;
  private static readonly DIAL_STEP = 0.004;
  private static readonly DIAL_THROTTLE_MS = 30;

  // Keyboard state
  private spaceKey: Phaser.Input.Keyboard.Key | null = null;
  private leftKey: Phaser.Input.Keyboard.Key | null = null;
  private rightKey: Phaser.Input.Keyboard.Key | null = null;

  constructor(scene: Phaser.Scene, ballPool: BallPool, economy?: BallEconomy) {
    this.scene = scene;
    this.ballPool = ballPool;
    this.economy = economy ?? null;
    this.graphics = scene.add.graphics();

    this.dialCenterX = 680;
    this.dialCenterY = 920;

    this.setupInput();
  }

  private setupInput(): void {
    this.scene.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      const dx = pointer.x - this.dialCenterX;
      const dy = pointer.y - this.dialCenterY;
      if (Math.sqrt(dx * dx + dy * dy) < DIAL_RADIUS * 2) {
        this.dragging = true;
      }
    });

    this.scene.input.on('pointermove', (pointer: Phaser.Input.Pointer) => {
      if (!this.dragging) return;
      this.updatePowerFromPointer(pointer);
    });

    this.scene.input.on('pointerup', () => {
      this.dragging = false;
    });

    this.scene.input.on('wheel', (_pointer: Phaser.Input.Pointer, _gx: number, _gy: number, _gz: number, event: WheelEvent) => {
      const delta = event.deltaY > 0 ? -0.02 : 0.02;
      this.power = Math.max(0, Math.min(1, this.power + delta));
      bridge.emit({ type: 'dial:changed', data: { power: this.power } });
    });

    if (this.scene.input.keyboard) {
      this.spaceKey = this.scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
      this.leftKey = this.scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.LEFT);
      this.rightKey = this.scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.RIGHT);
    }
  }

  private updatePowerFromPointer(pointer: Phaser.Input.Pointer): void {
    const dx = pointer.x - this.dialCenterX;
    const dy = pointer.y - this.dialCenterY;
    let angle = Math.atan2(dy, dx) * (180 / Math.PI);
    angle = ((angle + 360) % 360);
    const mapped = (angle - 135 + 360) % 360;
    this.power = Math.max(0, Math.min(1, mapped / DIAL_MAX_ROTATION));
    bridge.emit({ type: 'dial:changed', data: { power: this.power } });
  }

  update(time: number): void {
    // Throttled keyboard input
    const now = performance.now();
    if (now - this.lastDialAdjustTime >= LauncherDial.DIAL_THROTTLE_MS) {
      if (this.leftKey?.isDown) {
        this.power = Math.max(0, this.power - LauncherDial.DIAL_STEP);
        bridge.emit({ type: 'dial:changed', data: { power: this.power } });
        this.lastDialAdjustTime = now;
      }
      if (this.rightKey?.isDown) {
        this.power = Math.min(1, this.power + LauncherDial.DIAL_STEP);
        bridge.emit({ type: 'dial:changed', data: { power: this.power } });
        this.lastDialAdjustTime = now;
      }
    }

    // Fire only when explicitly held: Space key OR actively dragging the dial
    const canFire = this.economy ? this.economy.canLaunch() : true;
    const holdingFire = (this.spaceKey?.isDown || this.dragging) && this.power > DEAD_ZONE_THRESHOLD;

    const interval = getTuning().launchInterval;
    if (holdingFire && (time - this.lastFireTime) > interval) {
      if (canFire) {
        this.fireBall();
        this.lastFireTime = time;
      } else {
        bridge.emit({ type: 'economy:empty' });
      }
    }

    this.render();
  }

  private fireBall(): void {
    const speed = MIN_LAUNCH_VELOCITY + this.power * (MAX_LAUNCH_VELOCITY - MIN_LAUNCH_VELOCITY);

    // Power controls where ball enters the pin field from the top
    const powerRange = Math.max(0, this.power - DEAD_ZONE_THRESHOLD) / (1 - DEAD_ZONE_THRESHOLD);
    const spawnXBase = 680 - powerRange * 620;

    // Micro-variance
    const jitterX = (Math.random() - 0.5) * 10;
    const jitterY = (Math.random() - 0.5) * 6;
    const spawnX = spawnXBase + jitterX;
    const spawnY = 20 + jitterY;

    const speedJitter = 1 + (Math.random() - 0.5) * 0.06;
    const angleJitter = (Math.random() - 0.5) * 0.12;

    const vx = (Math.random() - 0.5) * 2 + angleJitter * speed * 0.3;
    const vy = speed * 0.2 * speedJitter;

    // Use economy if available
    if (this.economy) {
      if (!this.economy.launch()) return;
    }

    const ball = this.ballPool.spawn(spawnX, spawnY, vx, vy);
    if (ball) {
      this.totalLaunched++;
    }
  }

  private render(): void {
    this.graphics.clear();

    const cx = this.dialCenterX;
    const cy = this.dialCenterY;
    const r = DIAL_RADIUS;

    this.graphics.fillStyle(0x21262d, 1);
    this.graphics.fillCircle(cx, cy, r);
    this.graphics.lineStyle(2, 0x30363d, 1);
    this.graphics.strokeCircle(cx, cy, r);

    const arcAngle = this.power * DIAL_MAX_ROTATION * (Math.PI / 180);
    if (this.power > 0) {
      const startAngle = Math.PI * 0.75;
      this.graphics.lineStyle(4, this.power > DEAD_ZONE_THRESHOLD ? 0xffd700 : 0x656d76, 1);
      this.graphics.beginPath();
      this.graphics.arc(cx, cy, r - 6, startAngle, startAngle + arcAngle, false);
      this.graphics.strokePath();
    }

    const notchAngle = Math.PI * 0.75 + arcAngle;
    const nx = cx + Math.cos(notchAngle) * (r - 12);
    const ny = cy + Math.sin(notchAngle) * (r - 12);
    this.graphics.fillStyle(this.power > DEAD_ZONE_THRESHOLD ? 0xffd700 : 0x8b949e, 1);
    this.graphics.fillCircle(nx, ny, 5);
  }

  getPower(): number { return this.power; }
  getTotalLaunched(): number { return this.totalLaunched; }
  getBallsRemaining(): number {
    return this.economy ? this.economy.getState().ballsOwned : 0;
  }

  setPower(value: number): void {
    this.power = Math.max(0, Math.min(1, value));
    bridge.emit({ type: 'dial:changed', data: { power: this.power } });
  }

  destroy(): void {
    this.graphics.destroy();
  }
}
