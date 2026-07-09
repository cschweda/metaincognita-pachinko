import type { SpinResult } from './SpinResult';
import type { LotteryEngine } from './LotteryEngine';
import type { GameStateMachine } from '../state/GameStateMachine';
import type { BallEconomy } from '../economy/BallEconomy';
import { bridge } from '../utils/bridge';

const PAYOUT_ROUNDS_FULL = 10;
const PAYOUT_ROUNDS_KOATARI = 2;

/** The rendering surface the coordinator drives (implemented by LotteryDisplay). */
export interface SpinDisplay {
  isAnimating(): boolean;
  startSpin(result: SpinResult, onComplete: () => void, speedMultiplier?: number): void;
}

/**
 * Owns the spin lifecycle: chakker entries queue predetermined outcomes,
 * spins start only when the display is free AND the state machine allows it
 * (never during PAYOUT, so queued jackpots are held rather than dropped),
 * and results are recorded/announced only when the animation completes —
 * the DOM UI cannot spoil a spin still in motion. RNG transparency mode
 * listens to spin:started instead, which fires as the reels begin.
 */
export class SpinCoordinator {
  constructor(
    private readonly engine: LotteryEngine,
    private readonly stateMachine: GameStateMachine,
    private readonly display: SpinDisplay,
    private readonly economy: BallEconomy,
    private readonly onJackpot: (jackpotType: 'full' | 'koatari') => void,
  ) {}

  /**
   * Ball entered the chakker: the RNG decides the outcome now, at current
   * odds. Returns false when the 4-spin reserve queue is full.
   */
  queueSpin(): boolean {
    const queued = this.engine.queueSpin(this.stateMachine.getOddsMultiplier());
    this.tryStartNext();
    return queued;
  }

  /** Called every frame — drains the reserve queue when a spin may start. */
  update(): void {
    this.tryStartNext();
  }

  private tryStartNext(): void {
    if (this.engine.getQueueLength() === 0) return;
    if (this.display.isAnimating()) return;
    if (!this.stateMachine.onSpinStart()) return;

    const result = this.engine.dequeue()!;
    bridge.emit({ type: 'spin:started', data: result });
    this.display.startSpin(
      result,
      () => this.resolveSpin(result),
      this.stateMachine.getAnimationSpeedMultiplier(),
    );
  }

  private resolveSpin(result: SpinResult): void {
    this.economy.recordSpin(result.isJackpot, result.reachType !== 'none');
    bridge.emit({ type: 'spin:result', data: result });

    if (result.isJackpot) {
      const jackpotType = result.jackpotType ?? 'full';
      const rounds = jackpotType === 'koatari' ? PAYOUT_ROUNDS_KOATARI : PAYOUT_ROUNDS_FULL;
      this.stateMachine.onSpinResolved(true, rounds);
      this.onJackpot(jackpotType);
    } else {
      this.stateMachine.onSpinResolved(false, 0);
    }
  }
}
