import { GameState } from '../types/state';
import { KakuhenController } from './KakuhenController';
import { JitanController } from './JitanController';
import { bridge } from '../utils/bridge';

type TransitionCallback = (from: GameState, to: GameState) => void;

/**
 * Full game state machine with kakuhen/jitan support.
 *
 * KAKUHEN and JITAN are "mode" states that overlay SPINNING.
 * When a ball enters the chakker during KAKUHEN or JITAN, a spin
 * occurs within that mode (at boosted or normal odds respectively).
 * The mode persists across spins until its exit condition is met.
 */
export class GameStateMachine {
  private currentState: GameState = GameState.IDLE;
  private onTransition: TransitionCallback | null = null;
  private payoutRoundsRemaining = 0;
  private payoutRoundsTotal = 0;

  // Mode controllers
  private kakuhen: KakuhenController;
  private jitan: JitanController;

  // Track whether the current jackpot should trigger kakuhen (determined at spin time)
  private pendingKakuhen = false;

  constructor() {
    this.kakuhen = new KakuhenController();
    this.jitan = new JitanController();
  }

  // Valid transitions for the full state graph
  private static readonly VALID_TRANSITIONS: Record<string, GameState[]> = {
    [GameState.IDLE]:     [GameState.NORMAL],
    [GameState.NORMAL]:   [GameState.SPINNING, GameState.IDLE],
    [GameState.SPINNING]: [GameState.NORMAL, GameState.PAYOUT, GameState.KAKUHEN, GameState.JITAN],
    [GameState.PAYOUT]:   [GameState.NORMAL, GameState.KAKUHEN, GameState.JITAN, GameState.IDLE],
    [GameState.KAKUHEN]:  [GameState.SPINNING, GameState.PAYOUT, GameState.JITAN, GameState.IDLE],
    [GameState.JITAN]:    [GameState.SPINNING, GameState.PAYOUT, GameState.NORMAL, GameState.IDLE],
  };

  getState(): GameState {
    return this.currentState;
  }

  setTransitionCallback(cb: TransitionCallback): void {
    this.onTransition = cb;
  }

  transition(to: GameState): boolean {
    const valid = GameStateMachine.VALID_TRANSITIONS[this.currentState];
    if (!valid?.includes(to)) {
      return false;
    }

    const from = this.currentState;
    this.currentState = to;
    bridge.emit({ type: 'mode:changed', data: { from, to } });
    this.onTransition?.(from, to);
    return true;
  }

  /** Start the game. */
  start(): void {
    if (this.currentState === GameState.IDLE) {
      this.transition(GameState.NORMAL);
    }
  }

  /** Ball entered chakker — transition to SPINNING. Works from NORMAL, KAKUHEN, or JITAN. */
  onChakkerEntry(): boolean {
    if (this.currentState === GameState.NORMAL ||
        this.currentState === GameState.KAKUHEN ||
        this.currentState === GameState.JITAN) {
      // Consume a spin counter if in a mode
      if (this.currentState === GameState.KAKUHEN) {
        this.kakuhen.consumeSpin();
      } else if (this.currentState === GameState.JITAN) {
        this.jitan.consumeSpin();
      }
      this.transition(GameState.SPINNING);
      return true;
    }
    // Already SPINNING — another ball entered chakker (queued spin)
    if (this.currentState === GameState.SPINNING) {
      return true;
    }
    return false;
  }

  /** Get the current odds multiplier (10x during kakuhen, 1x otherwise). */
  getOddsMultiplier(): number {
    return this.kakuhen.getOddsMultiplier();
  }

  /** Get animation speed multiplier (2.5x during jitan, 1x otherwise). */
  getAnimationSpeedMultiplier(): number {
    return this.jitan.getAnimationSpeedMultiplier();
  }

  /**
   * Spin resolved — determine next state.
   * For jackpots, also rolls kakuhen and stores the result for when payout ends.
   */
  onSpinResolved(isJackpot: boolean, payoutRounds: number): void {
    if (this.currentState !== GameState.SPINNING) return;

    if (isJackpot) {
      // Roll kakuhen now (result used after payout completes)
      this.pendingKakuhen = this.kakuhen.rollKakuhen();
      this.payoutRoundsTotal = payoutRounds;
      this.payoutRoundsRemaining = payoutRounds;
      this.transition(GameState.PAYOUT);
    } else {
      // No jackpot — return to the mode we were in before SPINNING
      if (this.kakuhen.isActive()) {
        // Check if kakuhen spin limit exhausted
        if (this.kakuhen.getSpinsRemaining() <= 0) {
          this.kakuhen.deactivate();
          this.jitan.activate();
          this.transition(GameState.JITAN);
        } else {
          this.transition(GameState.KAKUHEN);
        }
      } else if (this.jitan.isActive()) {
        // Check if jitan spins exhausted
        if (this.jitan.getSpinsRemaining() <= 0) {
          this.jitan.deactivate();
          this.transition(GameState.NORMAL);
        } else {
          this.transition(GameState.JITAN);
        }
      } else {
        this.transition(GameState.NORMAL);
      }
    }
  }

  /** A payout round completes. Returns true if more rounds remain. */
  completePayoutRound(): boolean {
    this.payoutRoundsRemaining--;
    if (this.payoutRoundsRemaining <= 0) {
      // All rounds done — branch to kakuhen or jitan based on the roll
      this.onPayoutComplete();
      return false;
    }
    bridge.emit({
      type: 'payout:round',
      data: {
        round: this.payoutRoundsTotal - this.payoutRoundsRemaining,
        total: this.payoutRoundsTotal,
        balls: 0,
      },
    });
    return true;
  }

  /** Payout finished — enter kakuhen (fever) or jitan based on the earlier roll. */
  private onPayoutComplete(): void {
    if (this.pendingKakuhen) {
      const isChain = this.kakuhen.isActive(); // Was already in kakuhen = chain
      this.kakuhen.activate(isChain);
      this.jitan.deactivate();
      this.transition(GameState.KAKUHEN);
    } else {
      this.kakuhen.deactivate();
      this.jitan.activate();
      this.transition(GameState.JITAN);
    }
    this.pendingKakuhen = false;
  }

  getPayoutRoundsRemaining(): number {
    return this.payoutRoundsRemaining;
  }

  getPayoutRoundsTotal(): number {
    return this.payoutRoundsTotal;
  }

  getKakuhenController(): KakuhenController {
    return this.kakuhen;
  }

  getJitanController(): JitanController {
    return this.jitan;
  }

  /** Balls exhausted — force to IDLE. */
  forceIdle(): void {
    const from = this.currentState;
    this.kakuhen.deactivate();
    this.jitan.deactivate();
    this.currentState = GameState.IDLE;
    bridge.emit({ type: 'mode:changed', data: { from, to: GameState.IDLE } });
    this.onTransition?.(from, GameState.IDLE);
  }
}
