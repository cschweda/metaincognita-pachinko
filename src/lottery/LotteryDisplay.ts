import type { SpinResult } from './SpinResult';
import { getReachTiming } from './ReachSystem';

type DisplayState = 'attract' | 'idle' | 'spinning' | 'reach' | 'resolved';

// 7-segment layout: which segments are lit for each digit (0-9)
// Segments: top, topRight, bottomRight, bottom, bottomLeft, topLeft, middle
const SEGMENTS: Record<number, boolean[]> = {
  0: [true,  true,  true,  true,  true,  true,  false],
  1: [false, true,  true,  false, false, false, false],
  2: [true,  true,  false, true,  true,  false, true],
  3: [true,  true,  true,  true,  false, false, true],
  4: [false, true,  true,  false, false, true,  true],
  5: [true,  false, true,  true,  false, true,  true],
  6: [true,  false, true,  true,  true,  true,  true],
  7: [true,  true,  true,  false, false, false, false],
  8: [true,  true,  true,  true,  true,  true,  true],
  9: [true,  true,  true,  true,  false, true,  true],
};

export class LotteryDisplay {
  private scene: Phaser.Scene;
  private container: Phaser.GameObjects.Container;
  private segmentGraphics: Phaser.GameObjects.Graphics;
  private statusText: Phaser.GameObjects.Text;
  private bgRect: Phaser.GameObjects.Graphics;

  private width: number;
  private height: number;

  private displayState: DisplayState = 'attract';
  private currentResult: SpinResult | null = null;
  private spinStartTime = 0;
  private reelStopTimes: [number, number, number] = [0, 0, 0];
  private displayValues: [number, number, number] = [8, 8, 8];
  private reelColors: [number, number, number] = [0x00ffcc, 0x00ffcc, 0x00ffcc];
  private resolveCallback: (() => void) | null = null;
  private flashTimer = 0;
  private attractTimer = 0;
  private attractPhase = 0;

  constructor(scene: Phaser.Scene, x: number, y: number, width: number, height: number) {
    this.scene = scene;
    this.width = width;
    this.height = height;

    this.container = scene.add.container(x, y);

    // Background panel
    this.bgRect = scene.add.graphics();
    this.drawBackground();
    this.container.add(this.bgRect);

    // Segment renderer
    this.segmentGraphics = scene.add.graphics();
    this.container.add(this.segmentGraphics);

    // Status text
    this.statusText = scene.add.text(width / 2, height - 18, '', {
      fontSize: '16px',
      fontFamily: '-apple-system, sans-serif',
      fontStyle: 'bold',
      color: '#00ffcc',
      align: 'center',
    });
    this.statusText.setOrigin(0.5);
    this.statusText.setShadow(0, 0, '#00ffcc', 6, true, true);
    this.container.add(this.statusText);
  }

  private drawBackground(): void {
    const g = this.bgRect;
    const w = this.width;
    const h = this.height;

    // Outer glow
    g.fillStyle(0x001133, 1);
    g.fillRoundedRect(-4, -4, w + 8, h + 8, 6);
    // Main panel
    g.fillStyle(0x000a14, 1);
    g.fillRoundedRect(0, 0, w, h, 4);
    // Border glow
    g.lineStyle(2, 0x00aaff, 0.6);
    g.strokeRoundedRect(0, 0, w, h, 4);
    g.lineStyle(1, 0x004488, 0.3);
    g.strokeRoundedRect(4, 4, w - 8, h - 8, 2);

    // Reel slot backgrounds
    const reelWidth = w / 3;
    for (let i = 0; i < 3; i++) {
      const rx = reelWidth * i + 8;
      const rw = reelWidth - 16;
      g.fillStyle(0x000d1a, 1);
      g.fillRoundedRect(rx, 15, rw, h - 50, 4);
      g.lineStyle(1, 0x003366, 0.5);
      g.strokeRoundedRect(rx, 15, rw, h - 50, 4);
    }
  }

  /**
   * Draw a single 7-segment digit at the given position.
   */
  private drawSegmentDigit(
    g: Phaser.GameObjects.Graphics,
    cx: number, cy: number,
    digit: number, color: number, alpha: number,
  ): void {
    const segs = SEGMENTS[digit];
    if (!segs) return;

    const sw = 30;  // segment width
    const sh = 36;  // segment height (half)
    const t = 5;    // segment thickness

    // Dim background for "off" segments (LCD ghost effect)
    const dimColor = 0x0a1a2a;
    const dimAlpha = 0.4;

    // Top
    this.drawHSegment(g, cx - sw / 2, cy - sh, sw, t, segs[0]! ? color : dimColor, segs[0]! ? alpha : dimAlpha);
    // Middle
    this.drawHSegment(g, cx - sw / 2, cy, sw, t, segs[6]! ? color : dimColor, segs[6]! ? alpha : dimAlpha);
    // Bottom
    this.drawHSegment(g, cx - sw / 2, cy + sh, sw, t, segs[3]! ? color : dimColor, segs[3]! ? alpha : dimAlpha);
    // Top-left
    this.drawVSegment(g, cx - sw / 2 - t / 2, cy - sh, sh, t, segs[5]! ? color : dimColor, segs[5]! ? alpha : dimAlpha);
    // Top-right
    this.drawVSegment(g, cx + sw / 2 + t / 2, cy - sh, sh, t, segs[1]! ? color : dimColor, segs[1]! ? alpha : dimAlpha);
    // Bottom-left
    this.drawVSegment(g, cx - sw / 2 - t / 2, cy, sh, t, segs[4]! ? color : dimColor, segs[4]! ? alpha : dimAlpha);
    // Bottom-right
    this.drawVSegment(g, cx + sw / 2 + t / 2, cy, sh, t, segs[2]! ? color : dimColor, segs[2]! ? alpha : dimAlpha);
  }

  private drawHSegment(g: Phaser.GameObjects.Graphics, x: number, y: number, w: number, h: number, color: number, alpha: number): void {
    g.fillStyle(color, alpha);
    // Pointed ends for authentic LED look
    g.beginPath();
    g.moveTo(x + h / 2, y);
    g.lineTo(x + w - h / 2, y);
    g.lineTo(x + w, y + h / 2);
    g.lineTo(x + w - h / 2, y + h);
    g.lineTo(x + h / 2, y + h);
    g.lineTo(x, y + h / 2);
    g.closePath();
    g.fillPath();
  }

  private drawVSegment(g: Phaser.GameObjects.Graphics, x: number, y: number, h: number, w: number, color: number, alpha: number): void {
    g.fillStyle(color, alpha);
    g.beginPath();
    g.moveTo(x, y + w / 2);
    g.lineTo(x + w / 2, y);
    g.lineTo(x + w, y + w / 2);
    g.lineTo(x + w, y + h - w / 2);
    g.lineTo(x + w / 2, y + h);
    g.lineTo(x, y + h - w / 2);
    g.closePath();
    g.fillPath();
  }

  private renderSegments(): void {
    const g = this.segmentGraphics;
    g.clear();

    const reelWidth = this.width / 3;
    const cy = this.height / 2 - 8;

    for (let i = 0; i < 3; i++) {
      const cx = reelWidth * i + reelWidth / 2;
      this.drawSegmentDigit(g, cx, cy, this.displayValues[i]!, this.reelColors[i]!, 1);
    }
  }

  // ---- Attract mode (startup animation) ----

  private updateAttract(): void {
    this.attractTimer += 16;

    // Phase 0: all 8s dim → bright (0-1500ms)
    if (this.attractTimer < 1500) {
      const t = this.attractTimer / 1500;
      const brightness = Math.sin(t * Math.PI) * 0.7 + 0.3;
      const r = Math.floor(brightness * 0x00);
      const gb = Math.floor(brightness * 0xff);
      const color = (r << 16) | (gb << 8) | 0xcc;
      this.reelColors = [color, color, color];
      this.displayValues = [8, 8, 8];
      this.renderSegments();
      return;
    }

    // Phase 1: chase digits 0-9 across reels (1500-4000ms)
    if (this.attractTimer < 4000) {
      const elapsed = this.attractTimer - 1500;
      const digit = Math.floor(elapsed / 150) % 10;
      const reelIndex = Math.floor(elapsed / 50) % 3;
      this.displayValues[reelIndex] = digit;
      this.reelColors = [0x00ffcc, 0x00ffcc, 0x00ffcc];
      this.renderSegments();
      return;
    }

    // Phase 2: flash "---" then settle to dim dashes (4000-5000ms)
    if (this.attractTimer < 5000) {
      const flash = Math.sin(this.attractTimer * 0.02) > 0;
      this.reelColors = flash ? [0x00ffcc, 0x00ffcc, 0x00ffcc] : [0x003333, 0x003333, 0x003333];
      this.displayValues = [0, 0, 0];
      this.renderSegments();
      // Draw dashes instead of digits
      const g = this.segmentGraphics;
      g.clear();
      const reelWidth = this.width / 3;
      const cy = this.height / 2 - 8;
      for (let i = 0; i < 3; i++) {
        const cx = reelWidth * i + reelWidth / 2;
        const color = flash ? 0x00ffcc : 0x003333;
        this.drawHSegment(g, cx - 15, cy, 30, 5, color, flash ? 0.8 : 0.3);
      }
      return;
    }

    // Attract done — go to idle
    this.displayState = 'idle';
    this.statusText.setText('');
    this.renderIdleState();
  }

  private idleTimer = 0;

  private renderIdleState(): void {
    const g = this.segmentGraphics;
    g.clear();
    const reelWidth = this.width / 3;
    const cy = this.height / 2 - 8;

    this.idleTimer += 16;

    // Each reel slowly cycles through digits at different speeds, very dim
    // Creates a lazy "slot machine waiting for you" feel
    const speeds = [2200, 2800, 3400]; // ms per full cycle, staggered
    for (let i = 0; i < 3; i++) {
      const cycle = (this.idleTimer + i * 700) % speeds[i]!; // offset each reel
      const digit = Math.floor((cycle / speeds[i]!) * 10);

      // Brightness pulses gently: visible base with a slow sine wave
      const pulse = 0.45 + Math.sin((this.idleTimer + i * 500) * 0.002) * 0.2;

      // Color shifts between bright teal and cyan
      const hueShift = Math.sin((this.idleTimer + i * 1000) * 0.001);
      const r = 0x00;
      const green = Math.floor(0x88 + hueShift * 0x30);
      const blue = Math.floor(0x99 + hueShift * 0x25);
      const color = (r << 16) | (green << 8) | blue;

      const cx = reelWidth * i + reelWidth / 2;
      this.drawSegmentDigit(g, cx, cy, digit, color, pulse);
    }
  }

  // ---- Spin control ----

  /** Start spinning. speedMultiplier > 1 makes reels resolve faster (jitan mode). */
  startSpin(result: SpinResult, onComplete: () => void, speedMultiplier = 1): void {
    this.currentResult = result;
    this.displayState = 'spinning';
    this.resolveCallback = onComplete;
    this.spinStartTime = this.scene.time.now;
    this.flashTimer = 0;

    const timing = getReachTiming(result.reachType);
    const s = speedMultiplier;

    this.reelStopTimes = [
      this.spinStartTime + 800 / s,
      this.spinStartTime + 1400 / s,
      this.spinStartTime + timing.totalDuration / s,
    ];

    this.statusText.setText('');
    this.reelColors = [0x00ffcc, 0x00ffcc, 0x00ffcc];
  }

  update(): void {
    if (this.displayState === 'attract') {
      this.updateAttract();
      return;
    }

    if (this.displayState === 'idle') {
      this.renderIdleState();
      return;
    }

    const now = this.scene.time.now;

    if (this.displayState === 'spinning' || this.displayState === 'reach') {
      const result = this.currentResult!;

      for (let i = 0; i < 3; i++) {
        if (now < this.reelStopTimes[i]!) {
          // Spinning — cycle random digits
          if (Math.floor(now / 70) !== Math.floor((now - 16) / 70)) {
            this.displayValues[i] = Math.floor(Math.random() * 10);
          }
          this.reelColors[i] = 0x00ffcc;
        } else {
          // Stopped
          this.displayValues[i] = result.reelValues[i]!;
        }
      }

      // Reach state
      if (result.reachType !== 'none' && now >= this.reelStopTimes[1]! && now < this.reelStopTimes[2]!) {
        if (this.displayState !== 'reach') {
          this.displayState = 'reach';
        }

        const reachLabel = result.reachType === 'premium' ? 'PREMIUM REACH!'
          : result.reachType === 'super' ? 'SUPER REACH!'
          : 'REACH!';
        const reachColor = result.reachType === 'premium' ? 0xffd700
          : result.reachType === 'super' ? 0xff3366
          : 0x00ffcc;
        const reachColorStr = result.reachType === 'premium' ? '#ffd700'
          : result.reachType === 'super' ? '#ff3366'
          : '#00ffcc';

        this.statusText.setText(reachLabel);
        this.statusText.setColor(reachColorStr);
        this.statusText.setShadow(0, 0, reachColorStr, 8, true, true);

        // Matching reels glow in reach color, third still spinning
        this.reelColors[0] = reachColor;
        this.reelColors[1] = reachColor;

        // Pulsing third reel during reach
        const pulse = Math.sin(now * 0.008) > 0;
        this.reelColors[2] = pulse ? 0x00ffcc : 0x006655;
      }

      // All stopped
      if (now >= this.reelStopTimes[2]!) {
        this.onAllReelsStopped();
      }

      this.renderSegments();
    }

    // Resolved state: jackpot flash or non-jackpot brief hold
    if (this.displayState === 'resolved') {
      if (this.currentResult?.isJackpot) {
        this.flashTimer += 16;
        const flash = Math.sin(this.flashTimer * 0.012) > 0;
        const color = flash ? 0xffd700 : 0xff6600;
        this.reelColors = [color, color, color];
        this.renderSegments();

        if (this.flashTimer > 2500) {
          this.displayState = 'idle';
          this.statusText.setText('');
          this.idleTimer = 0;
        }
      } else {
        // Non-jackpot hold: show dim result (delayed call will transition to idle)
        this.renderSegments();
      }
    }
  }

  private onAllReelsStopped(): void {
    const result = this.currentResult!;

    for (let i = 0; i < 3; i++) {
      this.displayValues[i] = result.reelValues[i]!;
    }

    if (result.isJackpot) {
      this.displayState = 'resolved';
      const label = result.jackpotType === 'koatari' ? 'KOATARI!' : 'JACKPOT!';
      this.statusText.setText(label);
      this.statusText.setColor('#ffd700');
      this.statusText.setShadow(0, 0, '#ffd700', 10, true, true);
      this.reelColors = [0xffd700, 0xffd700, 0xffd700];
      this.renderSegments();
    } else {
      // Show the miss result briefly, then return to idle animation
      this.reelColors = [0x1a4444, 0x1a4444, 0x1a4444];
      this.renderSegments();
      this.statusText.setText('');

      this.scene.time.delayedCall(600, () => {
        if (this.displayState === 'resolved' || this.displayState === 'idle') {
          this.displayState = 'idle';
          this.idleTimer = 0;
        }
      });
      this.displayState = 'resolved'; // brief hold before idle
    }

    this.resolveCallback?.();
    this.resolveCallback = null;
  }

  isAnimating(): boolean {
    return this.displayState === 'spinning' || this.displayState === 'reach' || this.displayState === 'resolved';
  }
}
