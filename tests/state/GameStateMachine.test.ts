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

  it('transitions SPINNING → NORMAL on non-jackpot (from normal mode)', () => {
    const sm = new GameStateMachine();
    sm.start();
    sm.onChakkerEntry();
    sm.onSpinResolved(false, 0);
    expect(sm.getState()).toBe(GameState.NORMAL);
  });

  it('transitions PAYOUT → KAKUHEN or JITAN after all rounds', () => {
    const sm = new GameStateMachine();
    sm.start();
    sm.onChakkerEntry();
    sm.onSpinResolved(true, 2);
    expect(sm.getState()).toBe(GameState.PAYOUT);

    sm.completePayoutRound(); // round 1
    expect(sm.getState()).toBe(GameState.PAYOUT);

    sm.completePayoutRound(); // round 2 — last
    // Should be either KAKUHEN or JITAN (depends on random roll)
    const state = sm.getState();
    expect([GameState.KAKUHEN, GameState.JITAN]).toContain(state);
  });

  it('KAKUHEN allows chakker entry and spinning at boosted odds', () => {
    const sm = new GameStateMachine();
    sm.start();
    sm.onChakkerEntry();
    sm.onSpinResolved(true, 1);
    sm.completePayoutRound();

    // Force to KAKUHEN by checking state
    if (sm.getState() === GameState.KAKUHEN) {
      expect(sm.getOddsMultiplier()).toBe(10);
      sm.onChakkerEntry();
      expect(sm.getState()).toBe(GameState.SPINNING);
    }
  });

  it('JITAN allows chakker entry', () => {
    const sm = new GameStateMachine();
    sm.start();
    sm.onChakkerEntry();
    sm.onSpinResolved(true, 1);
    sm.completePayoutRound();

    if (sm.getState() === GameState.JITAN) {
      sm.onChakkerEntry();
      expect(sm.getState()).toBe(GameState.SPINNING);
      expect(sm.getAnimationSpeedMultiplier()).toBeGreaterThan(1);
    }
  });

  it('rejects invalid transitions', () => {
    const sm = new GameStateMachine();
    const result = sm.transition(GameState.SPINNING);
    expect(result).toBe(false);
    expect(sm.getState()).toBe(GameState.IDLE);
  });

  it('forceIdle works from any state and deactivates modes', () => {
    const sm = new GameStateMachine();
    sm.start();
    sm.onChakkerEntry();
    sm.forceIdle();
    expect(sm.getState()).toBe(GameState.IDLE);
    expect(sm.getOddsMultiplier()).toBe(1);
  });

  it('full cycle: NORMAL → jackpot → PAYOUT → mode → back to NORMAL eventually', () => {
    const sm = new GameStateMachine();
    sm.start();

    // Hit a jackpot
    sm.onChakkerEntry();
    sm.onSpinResolved(true, 1);
    expect(sm.getState()).toBe(GameState.PAYOUT);

    // Complete payout
    sm.completePayoutRound();
    const modeState = sm.getState();
    expect([GameState.KAKUHEN, GameState.JITAN]).toContain(modeState);

    // If JITAN, exhaust all spins to get back to NORMAL
    if (modeState === GameState.JITAN) {
      const jitan = sm.getJitanController();
      while (jitan.getSpinsRemaining() > 0) {
        sm.onChakkerEntry();
        sm.onSpinResolved(false, 0);
      }
      expect(sm.getState()).toBe(GameState.NORMAL);
    }
  });
});
