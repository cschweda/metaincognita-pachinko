import { describe, it, expect } from 'vitest';
import { GameStateMachine } from '../../src/state/GameStateMachine';
import { GameState } from '../../src/types/state';

describe('GameStateMachine', () => {
  it('starts in IDLE state', () => {
    const sm = new GameStateMachine();
    expect(sm.getState()).toBe(GameState.IDLE);
  });

  it('transitions from IDLE to NORMAL on start', () => {
    const sm = new GameStateMachine();
    sm.start();
    expect(sm.getState()).toBe(GameState.NORMAL);
  });

  it('transitions NORMAL → SPINNING on chakker entry', () => {
    const sm = new GameStateMachine();
    sm.start();
    sm.onChakkerEntry();
    expect(sm.getState()).toBe(GameState.SPINNING);
  });

  it('transitions SPINNING → PAYOUT on jackpot', () => {
    const sm = new GameStateMachine();
    sm.start();
    sm.onChakkerEntry();
    sm.onSpinResolved(true, 10);
    expect(sm.getState()).toBe(GameState.PAYOUT);
  });

  it('transitions SPINNING → NORMAL on non-jackpot', () => {
    const sm = new GameStateMachine();
    sm.start();
    sm.onChakkerEntry();
    sm.onSpinResolved(false, 0);
    expect(sm.getState()).toBe(GameState.NORMAL);
  });

  it('transitions PAYOUT → NORMAL after all rounds complete', () => {
    const sm = new GameStateMachine();
    sm.start();
    sm.onChakkerEntry();
    sm.onSpinResolved(true, 2);
    expect(sm.getState()).toBe(GameState.PAYOUT);

    sm.completePayoutRound(); // round 1
    expect(sm.getState()).toBe(GameState.PAYOUT);

    sm.completePayoutRound(); // round 2 — last
    expect(sm.getState()).toBe(GameState.NORMAL);
  });

  it('rejects invalid transitions', () => {
    const sm = new GameStateMachine();
    // Can't go from IDLE directly to SPINNING
    const result = sm.transition(GameState.SPINNING);
    expect(result).toBe(false);
    expect(sm.getState()).toBe(GameState.IDLE);
  });

  it('forceIdle works from any state', () => {
    const sm = new GameStateMachine();
    sm.start();
    sm.onChakkerEntry();
    sm.forceIdle();
    expect(sm.getState()).toBe(GameState.IDLE);
  });
});
