import { GameState } from '../types/state';
import { bridge } from '../utils/bridge';

type TransitionCallback = (from: GameState, to: GameState) => void;

export class GameStateMachine {
  private currentState: GameState = GameState.IDLE;
  private onTransition: TransitionCallback | null = null;
  private payoutRoundsRemaining = 0;
  private payoutRoundsTotal = 0;

  // Valid transitions (Phase 2: basic loop)
  private static readonly VALID_TRANSITIONS: Record<string, GameState[]> = {
    [GameState.IDLE]:     [GameState.NORMAL],
    [GameState.NORMAL]:   [GameState.SPINNING, GameState.IDLE],
    [GameState.SPINNING]: [GameState.NORMAL, GameState.PAYOUT],
    [GameState.PAYOUT]:   [GameState.NORMAL, GameState.IDLE],
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

  /** Start the game — transition from IDLE to NORMAL. */
  start(): void {
    if (this.currentState === GameState.IDLE) {
      this.transition(GameState.NORMAL);
    }
  }

  /** Ball entered chakker — transition to SPINNING if in NORMAL. */
  onChakkerEntry(): boolean {
    if (this.currentState === GameState.NORMAL) {
      this.transition(GameState.SPINNING);
      return true;
    }
    // During SPINNING, another ball can enter chakker (queued spin)
    // but we stay in SPINNING state
    if (this.currentState === GameState.SPINNING) {
      return true;
    }
    return false;
  }

  /** Spin resolved — transition based on result. */
  onSpinResolved(isJackpot: boolean, payoutRounds: number): void {
    if (this.currentState !== GameState.SPINNING) return;

    if (isJackpot) {
      this.payoutRoundsTotal = payoutRounds;
      this.payoutRoundsRemaining = payoutRounds;
      this.transition(GameState.PAYOUT);
    } else {
      this.transition(GameState.NORMAL);
    }
  }

  /** A payout round completes. Returns true if more rounds remain. */
  completePayoutRound(): boolean {
    this.payoutRoundsRemaining--;
    if (this.payoutRoundsRemaining <= 0) {
      // Phase 2: return to NORMAL. Phase 3 will add KAKUHEN/JITAN branching.
      this.transition(GameState.NORMAL);
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

  getPayoutRoundsRemaining(): number {
    return this.payoutRoundsRemaining;
  }

  getPayoutRoundsTotal(): number {
    return this.payoutRoundsTotal;
  }

  /** Balls exhausted — force to IDLE. */
  forceIdle(): void {
    const from = this.currentState;
    this.currentState = GameState.IDLE;
    bridge.emit({ type: 'mode:changed', data: { from, to: GameState.IDLE } });
    this.onTransition?.(from, GameState.IDLE);
  }
}
