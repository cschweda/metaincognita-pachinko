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

  it('transitions NORMAL → SPINNING when a spin starts', () => {
    const sm = new GameStateMachine();
    sm.start();
    sm.onSpinStart();
    expect(sm.getState()).toBe(GameState.SPINNING);
  });

  it('transitions SPINNING → PAYOUT on jackpot', () => {
    const sm = new GameStateMachine();
    sm.start();
    sm.onSpinStart();
    sm.onSpinResolved(true, 10);
    expect(sm.getState()).toBe(GameState.PAYOUT);
  });

  it('transitions SPINNING → NORMAL on non-jackpot (from normal mode)', () => {
    const sm = new GameStateMachine();
    sm.start();
    sm.onSpinStart();
    sm.onSpinResolved(false, 0);
    expect(sm.getState()).toBe(GameState.NORMAL);
  });

  it('transitions PAYOUT → KAKUHEN or JITAN after all rounds', () => {
    const sm = new GameStateMachine();
    sm.start();
    sm.onSpinStart();
    sm.onSpinResolved(true, 2);
    expect(sm.getState()).toBe(GameState.PAYOUT);

    sm.completePayoutRound(); // round 1
    expect(sm.getState()).toBe(GameState.PAYOUT);

    sm.completePayoutRound(); // round 2 — last
    // Should be either KAKUHEN or JITAN (depends on random roll)
    const state = sm.getState();
    expect([GameState.KAKUHEN, GameState.JITAN]).toContain(state);
  });

  it('KAKUHEN allows spins at boosted odds', () => {
    // kakuhenRate 1 → every jackpot triggers fever (deterministic)
    const sm = new GameStateMachine({ kakuhenRate: 1, oddsMultiplier: 10, spinLimit: 100 });
    sm.start();
    sm.onSpinStart();
    sm.onSpinResolved(true, 1);
    sm.completePayoutRound();

    expect(sm.getState()).toBe(GameState.KAKUHEN);
    expect(sm.getOddsMultiplier()).toBe(10);
    sm.onSpinStart();
    expect(sm.getState()).toBe(GameState.SPINNING);
  });

  it('JITAN allows spins at accelerated animation speed', () => {
    // kakuhenRate 0 → jackpot never triggers fever, always falls to jitan
    const sm = new GameStateMachine({ kakuhenRate: 0, oddsMultiplier: 10, spinLimit: 100 });
    sm.start();
    sm.onSpinStart();
    sm.onSpinResolved(true, 1);
    sm.completePayoutRound();

    expect(sm.getState()).toBe(GameState.JITAN);
    expect(sm.getAnimationSpeedMultiplier()).toBeGreaterThan(1);
    sm.onSpinStart();
    expect(sm.getState()).toBe(GameState.SPINNING);
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
    sm.onSpinStart();
    sm.forceIdle();
    expect(sm.getState()).toBe(GameState.IDLE);
    expect(sm.getOddsMultiplier()).toBe(1);
  });

  it('full cycle: NORMAL → jackpot → PAYOUT → JITAN → back to NORMAL', () => {
    const sm = new GameStateMachine({ kakuhenRate: 0, oddsMultiplier: 10, spinLimit: 100 });
    sm.start();

    // Hit a jackpot
    sm.onSpinStart();
    sm.onSpinResolved(true, 1);
    expect(sm.getState()).toBe(GameState.PAYOUT);

    // Complete payout — kakuhenRate 0 means always JITAN
    sm.completePayoutRound();
    expect(sm.getState()).toBe(GameState.JITAN);

    // Exhaust all jitan spins to get back to NORMAL
    const jitan = sm.getJitanController();
    while (jitan.getSpinsRemaining() > 0) {
      sm.onSpinStart();
      sm.onSpinResolved(false, 0);
    }
    expect(sm.getState()).toBe(GameState.NORMAL);
  });
});

describe('GameStateMachine spin lifecycle (queued spins)', () => {
  it('onSpinStart returns true from NORMAL', () => {
    const sm = new GameStateMachine();
    sm.start();
    expect(sm.onSpinStart()).toBe(true);
    expect(sm.getState()).toBe(GameState.SPINNING);
  });

  it('onSpinStart returns false in IDLE', () => {
    const sm = new GameStateMachine();
    expect(sm.onSpinStart()).toBe(false);
    expect(sm.getState()).toBe(GameState.IDLE);
  });

  it('onSpinStart returns false while already SPINNING', () => {
    const sm = new GameStateMachine();
    sm.start();
    sm.onSpinStart();
    expect(sm.onSpinStart()).toBe(false);
    expect(sm.getState()).toBe(GameState.SPINNING);
  });

  it('onSpinStart returns false during PAYOUT — queued spins hold until payout completes', () => {
    const sm = new GameStateMachine();
    sm.start();
    sm.onSpinStart();
    sm.onSpinResolved(true, 10);
    expect(sm.getState()).toBe(GameState.PAYOUT);

    expect(sm.onSpinStart()).toBe(false);
    expect(sm.getState()).toBe(GameState.PAYOUT);
  });

  it('a queued spin that resolves as a jackpot enters PAYOUT (regression: queued jackpots were dropped)', () => {
    const sm = new GameStateMachine();
    sm.start();

    // First spin misses and returns to NORMAL
    expect(sm.onSpinStart()).toBe(true);
    sm.onSpinResolved(false, 0);
    expect(sm.getState()).toBe(GameState.NORMAL);

    // Second (queued) spin starts and hits — must reach PAYOUT
    expect(sm.onSpinStart()).toBe(true);
    sm.onSpinResolved(true, 10);
    expect(sm.getState()).toBe(GameState.PAYOUT);
  });

  it('consumes exactly one kakuhen spin per started spin, including queued spins', () => {
    const sm = new GameStateMachine({ kakuhenRate: 1, oddsMultiplier: 10, spinLimit: 100 });
    sm.start();
    sm.onSpinStart();
    sm.onSpinResolved(true, 1);
    sm.completePayoutRound();
    expect(sm.getState()).toBe(GameState.KAKUHEN);

    const kakuhen = sm.getKakuhenController();
    expect(kakuhen.getSpinsRemaining()).toBe(100);

    sm.onSpinStart();
    expect(kakuhen.getSpinsRemaining()).toBe(99);
    sm.onSpinResolved(false, 0);
    expect(sm.getState()).toBe(GameState.KAKUHEN);

    // A queued spin starting from KAKUHEN consumes too
    sm.onSpinStart();
    expect(kakuhen.getSpinsRemaining()).toBe(98);
  });

  it('falls to JITAN when kakuhen spins are exhausted', () => {
    const sm = new GameStateMachine({ kakuhenRate: 1, oddsMultiplier: 10, spinLimit: 2 });
    sm.start();
    sm.onSpinStart();
    sm.onSpinResolved(true, 1);
    sm.completePayoutRound();
    expect(sm.getState()).toBe(GameState.KAKUHEN);

    sm.onSpinStart();
    sm.onSpinResolved(false, 0); // 1 spin left
    expect(sm.getState()).toBe(GameState.KAKUHEN);

    sm.onSpinStart();
    sm.onSpinResolved(false, 0); // exhausted → JITAN
    expect(sm.getState()).toBe(GameState.JITAN);
  });

  it('consumes one jitan spin per started spin', () => {
    const sm = new GameStateMachine({ kakuhenRate: 0, oddsMultiplier: 10, spinLimit: 100 });
    sm.start();
    sm.onSpinStart();
    sm.onSpinResolved(true, 1);
    sm.completePayoutRound();
    expect(sm.getState()).toBe(GameState.JITAN);

    const jitan = sm.getJitanController();
    const before = jitan.getSpinsRemaining();
    sm.onSpinStart();
    expect(jitan.getSpinsRemaining()).toBe(before - 1);
  });
});
