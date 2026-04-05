import { PinField } from '../physics/PinField';
import { BallPool } from '../physics/BallPool';
import { LauncherDial } from '../input/LauncherDial';
import { StartChakker } from '../gates/StartChakker';
import { PayoutGate } from '../gates/PayoutGate';
import { TulipGate } from '../gates/TulipGate';
import { SidePocket } from '../gates/SidePocket';
import { LotteryEngine } from '../lottery/LotteryEngine';
import { LotteryDisplay } from '../lottery/LotteryDisplay';
import { GameStateMachine } from '../state/GameStateMachine';
import { BallEconomy } from '../economy/BallEconomy';
import { GameState } from '../types/state';
import { bridge } from '../utils/bridge';
import { PIN_RADIUS, BOARD_WIDTH, BOARD_HEIGHT } from '../utils/constants';
import layoutData from '../layouts/default.json';
import type { PinLayout } from '../types/layout';

const PAYOUT_ROUNDS_FULL = 10;
const PAYOUT_ROUNDS_KOATARI = 2;
const PAYOUT_ROUND_DURATION_MS = 8000;   // 8 seconds per round
const KOATARI_ROUND_DURATION_MS = 2000;  // 2 seconds for koatari rounds

export class BoardScene extends Phaser.Scene {
  private pinField!: PinField;
  private ballPool!: BallPool;
  private launcherDial!: LauncherDial;
  private pinGraphics!: Phaser.GameObjects.Graphics;
  private boardGraphics!: Phaser.GameObjects.Graphics;

  // Phase 2 systems
  private startChakker!: StartChakker;
  private payoutGate!: PayoutGate;
  private tulipGates: TulipGate[] = [];
  private lotteryEngine!: LotteryEngine;
  private lotteryDisplay!: LotteryDisplay;
  private stateMachine!: GameStateMachine;
  private economy!: BallEconomy;

  // Payout tracking
  private payoutRoundTimer = 0;
  private payoutRoundDuration = 0;
  private payoutBallsThisRound = 0;

  // FPS
  private fpsCounter = 0;
  private fpsTimer = 0;

  constructor() {
    super({ key: 'BoardScene' });
  }

  create(): void {
    // Core systems
    this.economy = new BallEconomy();
    this.lotteryEngine = new LotteryEngine();
    this.stateMachine = new GameStateMachine();

    // Board background
    this.boardGraphics = this.add.graphics();
    this.drawBoard();

    // --- Rendering order (back to front): ---
    // 1. LCD display (behind everything — it's a screen behind the glass)
    const lcd = layoutData.lcdDisplay;
    this.lotteryDisplay = new LotteryDisplay(this, lcd.x, lcd.y, lcd.width, lcd.height);

    // 2. Pin field (pins are mounted on the glass, in front of LCD)
    this.pinField = new PinField(this);
    this.pinField.create(layoutData as PinLayout);
    this.pinGraphics = this.add.graphics();
    this.drawPins();

    // 3. Gates and pockets (on the board surface)
    const chakkerData = layoutData.startChakker;
    this.startChakker = new StartChakker(
      this,
      chakkerData.x, chakkerData.y, chakkerData.width, chakkerData.height,
      () => this.onChakkerEntry(),
    );

    this.payoutGate = new PayoutGate(
      this, 300, 940, 160,
      () => this.onPayoutGateEntry(),
    );

    this.createTulipGates();
    this.createSidePockets();

    // 4. Ball pool (balls roll ON the glass surface — in front of everything)
    this.ballPool = new BallPool(this);

    // 5. Launcher dial (UI overlay, topmost)
    this.launcherDial = new LauncherDial(this, this.ballPool, this.economy);

    // Start the game
    this.stateMachine.start();

    // Listen for DOM events
    bridge.on('settings:speed', (data) => {
      const d = data as { gravity: number };
      this.matter.world.setGravity(0, d.gravity);
    });

    bridge.on('economy:purchase', () => {
      this.economy.purchaseBalls();
    });

    bridge.on('economy:cashout', () => {
      const value = this.economy.cashOut();
      bridge.emit({ type: 'economy:cashout:result', data: { value } });
    });
  }

  // ---- Gate callbacks ----

  private onChakkerEntry(): void {
    // Award 3 balls per chakker entry (per spec)
    this.economy.awardChakkerPayout();

    // Queue a lottery spin
    const queued = this.lotteryEngine.queueSpin();

    // If we're in NORMAL, transition to SPINNING
    this.stateMachine.onChakkerEntry();

    // If the display isn't currently animating, start the next spin
    if (queued && !this.lotteryDisplay.isAnimating()) {
      this.startNextSpin();
    }
  }

  private startNextSpin(): void {
    const result = this.lotteryEngine.dequeue();
    if (!result) return;

    bridge.emit({ type: 'spin:result', data: result });
    this.economy.recordSpin(result.isJackpot, result.reachType !== 'none');

    this.lotteryDisplay.startSpin(result, () => {
      // Animation complete — resolve the spin
      this.onSpinAnimationComplete(result.isJackpot, result.jackpotType);

      // If more spins are queued, start the next one
      if (this.lotteryEngine.getQueueLength() > 0 && !this.lotteryDisplay.isAnimating()) {
        this.time.delayedCall(300, () => this.startNextSpin());
      }
    });
  }

  private onSpinAnimationComplete(isJackpot: boolean, jackpotType?: string): void {
    if (isJackpot) {
      const rounds = jackpotType === 'koatari' ? PAYOUT_ROUNDS_KOATARI : PAYOUT_ROUNDS_FULL;
      this.stateMachine.onSpinResolved(true, rounds);
      this.startPayoutMode(jackpotType === 'koatari');
    } else {
      this.stateMachine.onSpinResolved(false, 0);
    }
  }

  private startPayoutMode(isKoatari: boolean): void {
    this.payoutGate.open();
    this.payoutRoundDuration = isKoatari ? KOATARI_ROUND_DURATION_MS : PAYOUT_ROUND_DURATION_MS;
    this.payoutRoundTimer = 0;
    this.payoutBallsThisRound = 0;

    bridge.emit({
      type: 'payout:round',
      data: {
        round: 1,
        total: this.stateMachine.getPayoutRoundsTotal(),
        balls: 0,
      },
    });
  }

  private onPayoutGateEntry(): void {
    if (this.stateMachine.getState() !== GameState.PAYOUT) return;

    this.economy.awardPayoutGateEntry();
    this.payoutBallsThisRound++;
  }

  private updatePayoutMode(delta: number): void {
    if (this.stateMachine.getState() !== GameState.PAYOUT) return;

    this.payoutRoundTimer += delta;
    if (this.payoutRoundTimer >= this.payoutRoundDuration) {
      // Round complete
      this.payoutRoundTimer = 0;
      this.payoutBallsThisRound = 0;

      const hasMore = this.stateMachine.completePayoutRound();
      if (!hasMore) {
        // All rounds done — close gate, return to normal
        this.payoutGate.close();
      } else {
        // Brief close/reopen between rounds
        this.payoutGate.close();
        this.time.delayedCall(500, () => {
          if (this.stateMachine.getState() === GameState.PAYOUT) {
            this.payoutGate.open();
          }
        });
      }
    }
  }

  // ---- Tulip & pocket setup ----

  private createTulipGates(): void {
    // Two tulips flanking the start chakker area
    const positions = [
      { x: 320, y: 610 },
      { x: 450, y: 610 },
      { x: 250, y: 700 },
      { x: 510, y: 700 },
    ];

    for (const pos of positions) {
      const tulip = new TulipGate(this, pos.x, pos.y, (isOpen) => {
        if (isOpen) {
          this.economy.awardBalls(5); // Tulip open bonus
        }
      });
      this.tulipGates.push(tulip);
    }
  }

  private createSidePockets(): void {
    // Dead pockets on both sides, lower third of board
    const pockets = [
      { x: 32, y: 750, w: 20, h: 30, type: 'dead' as const, payout: 0 },
      { x: 700, y: 750, w: 20, h: 30, type: 'dead' as const, payout: 0 },
      { x: 32, y: 850, w: 20, h: 30, type: 'dead' as const, payout: 0 },
      { x: 700, y: 850, w: 20, h: 30, type: 'dead' as const, payout: 0 },
    ];

    for (const p of pockets) {
      new SidePocket(this, p.x, p.y, p.w, p.h, p.type, p.payout, (_type, _payout) => {
        // Dead pockets: ball is removed (handled by BallPool exit detection)
      });
    }
  }

  // ---- Drawing ----

  private drawBoard(): void {
    const g = this.boardGraphics;
    g.fillStyle(0x1a1a1a, 1);
    g.fillRect(0, 0, BOARD_WIDTH, BOARD_HEIGHT);
    g.lineStyle(3, 0x30363d, 1);
    g.strokeRect(28, 0, 704, BOARD_HEIGHT);
    g.fillStyle(0x161b22, 1);
    g.fillRect(748, 0, 44, BOARD_HEIGHT);
    g.lineStyle(1, 0x30363d, 0.5);
    g.strokeRect(748, 0, 44, BOARD_HEIGHT);
  }

  private drawPins(): void {
    const g = this.pinGraphics;
    const bodies = this.matter.world.getAllBodies();
    for (const body of bodies) {
      if (body.label === 'pin') {
        g.fillStyle(0xC9A94E, 1);
        g.fillCircle(body.position.x, body.position.y, PIN_RADIUS);
        g.fillStyle(0xE8D48B, 0.6);
        g.fillCircle(body.position.x - 0.5, body.position.y - 0.5, PIN_RADIUS * 0.4);
      }
    }
  }

  // ---- Update loop ----

  update(time: number, delta: number): void {
    this.ballPool.update();
    this.launcherDial.update(time);
    this.lotteryDisplay.update();
    this.startChakker.update();
    this.payoutGate.update();
    for (const tulip of this.tulipGates) {
      tulip.update();
    }

    // Payout round timer
    this.updatePayoutMode(delta);

    // Check if queued spins need animating
    if (this.lotteryEngine.getQueueLength() > 0 && !this.lotteryDisplay.isAnimating()) {
      this.startNextSpin();
    }

    // FPS tracking + stats push (once per second)
    this.fpsCounter++;
    this.fpsTimer += delta;
    if (this.fpsTimer >= 1000) {
      const fps = Math.round((this.fpsCounter / this.fpsTimer) * 1000);
      bridge.emit({ type: 'fps:updated', data: { fps } });
      // Push session stats to DOM
      bridge.emit({ type: 'economy:updated', data: this.economy.getState() });
      bridge.emit({ type: 'stats:updated', data: this.economy.getStats() });
      this.fpsCounter = 0;
      this.fpsTimer = 0;
    }
  }

  getBallPool(): BallPool { return this.ballPool; }
  getLauncherDial(): LauncherDial { return this.launcherDial; }
  getPinField(): PinField { return this.pinField; }
  getStateMachine(): GameStateMachine { return this.stateMachine; }
  getEconomy(): BallEconomy { return this.economy; }
}
