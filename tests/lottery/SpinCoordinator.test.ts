import { describe, it, expect, afterEach } from 'vitest';
import { SpinCoordinator } from '../../src/lottery/SpinCoordinator';
import type { SpinDisplay } from '../../src/lottery/SpinCoordinator';
import { LotteryEngine } from '../../src/lottery/LotteryEngine';
import type { LotteryConfig } from '../../src/lottery/LotteryEngine';
import { GameStateMachine } from '../../src/state/GameStateMachine';
import { BallEconomy } from '../../src/economy/BallEconomy';
import { GameState } from '../../src/types/state';
import { bridge } from '../../src/utils/bridge';
import type { GameEvent } from '../../src/utils/bridge';
import type { SpinResult } from '../../src/lottery/SpinResult';

// Deterministic engine configs: odds of 1 → every spin is a jackpot;
// infinite odds → never a jackpot.
const ALWAYS_JACKPOT: LotteryConfig = {
  jackpotOdds: 1, koatariRate: 0, reachRate: 0, superReachRate: 0, premiumReachRate: 0,
};
const ALWAYS_KOATARI: LotteryConfig = { ...ALWAYS_JACKPOT, koatariRate: 1 };
const NEVER_JACKPOT: LotteryConfig = {
  jackpotOdds: Number.POSITIVE_INFINITY, koatariRate: 0, reachRate: 0, superReachRate: 0, premiumReachRate: 0,
};

/**
 * Stands in for LotteryDisplay at the rendering boundary. Mirrors its
 * contract: isAnimating() stays true through the post-reel 'resolved'
 * hold — the completion callback fires while still animating, and the
 * display only goes idle afterwards.
 */
class FakeDisplay implements SpinDisplay {
  started: SpinResult[] = [];
  private animating = false;
  private onComplete: (() => void) | null = null;

  startSpin(result: SpinResult, onComplete: () => void): void {
    this.animating = true;
    this.started.push(result);
    this.onComplete = onComplete;
  }

  isAnimating(): boolean {
    return this.animating;
  }

  /** Reels stop — resolve callback fires during the 'resolved' hold. */
  finish(): void {
    const cb = this.onComplete;
    this.onComplete = null;
    cb?.();
  }

  /** Hold ends — display returns to idle. */
  goIdle(): void {
    this.animating = false;
  }

  finishAndIdle(): void {
    this.finish();
    this.goIdle();
  }
}

type Listener = { type: GameEvent['type']; cb: (data?: unknown) => void };
const subscriptions: Listener[] = [];

function listen(type: GameEvent['type']): unknown[] {
  const events: unknown[] = [];
  const cb = (data?: unknown) => events.push(data);
  bridge.on(type, cb);
  subscriptions.push({ type, cb });
  return events;
}

afterEach(() => {
  for (const s of subscriptions) bridge.off(s.type, s.cb);
  subscriptions.length = 0;
});

function makeCoordinator(engineConfig: LotteryConfig) {
  const engine = new LotteryEngine(engineConfig);
  // kakuhenRate 0 → payout always falls to JITAN (deterministic)
  const sm = new GameStateMachine({ kakuhenRate: 0, oddsMultiplier: 10, spinLimit: 100 });
  sm.start();
  const display = new FakeDisplay();
  const economy = new BallEconomy();
  const jackpots: string[] = [];
  const coordinator = new SpinCoordinator(engine, sm, display, economy, (type) => {
    jackpots.push(type);
  });
  return { engine, sm, display, economy, coordinator, jackpots };
}

describe('SpinCoordinator', () => {
  it('starts a spin immediately when the display is idle', () => {
    const { coordinator, display, sm } = makeCoordinator(NEVER_JACKPOT);
    coordinator.queueSpin();
    expect(display.started.length).toBe(1);
    expect(sm.getState()).toBe(GameState.SPINNING);
  });

  it('does not emit spin:result or record stats until the animation completes (no spoiler)', () => {
    const { coordinator, display, economy } = makeCoordinator(NEVER_JACKPOT);
    const results = listen('spin:result');

    coordinator.queueSpin();
    expect(results.length).toBe(0);
    expect(economy.getStats().totalSpins).toBe(0);

    display.finish();
    expect(results.length).toBe(1);
    expect(economy.getStats().totalSpins).toBe(1);
  });

  it('emits spin:started with the predetermined outcome when the animation begins', () => {
    const { coordinator } = makeCoordinator(ALWAYS_JACKPOT);
    const started = listen('spin:started');

    coordinator.queueSpin();
    expect(started.length).toBe(1);
    expect((started[0] as SpinResult).isJackpot).toBe(true);
  });

  it('queues a second spin while animating and starts it only after the display goes idle', () => {
    const { coordinator, display } = makeCoordinator(NEVER_JACKPOT);

    coordinator.queueSpin();
    coordinator.queueSpin();
    expect(display.started.length).toBe(1);

    display.finish(); // resolved hold — still animating
    coordinator.update();
    expect(display.started.length).toBe(1);

    display.goIdle();
    coordinator.update();
    expect(display.started.length).toBe(2);
  });

  it('holds queued spins during PAYOUT and pays their jackpots after payout completes (regression)', () => {
    const { coordinator, display, sm, jackpots } = makeCoordinator(ALWAYS_JACKPOT);

    coordinator.queueSpin(); // spin 1 starts
    coordinator.queueSpin(); // spin 2 queued behind it

    display.finishAndIdle(); // spin 1 hits → PAYOUT
    expect(sm.getState()).toBe(GameState.PAYOUT);
    expect(jackpots).toEqual(['full']);

    coordinator.update();
    expect(display.started.length).toBe(1); // held during payout

    while (sm.getState() === GameState.PAYOUT) {
      sm.completePayoutRound();
    }
    expect(sm.getState()).toBe(GameState.JITAN);

    coordinator.update(); // queued spin starts now
    expect(display.started.length).toBe(2);

    display.finishAndIdle(); // queued spin's jackpot must also pay
    expect(sm.getState()).toBe(GameState.PAYOUT);
    expect(jackpots).toEqual(['full', 'full']);
  });

  it('reports koatari jackpots with 2 payout rounds', () => {
    const { coordinator, display, sm, jackpots } = makeCoordinator(ALWAYS_KOATARI);

    coordinator.queueSpin();
    display.finishAndIdle();

    expect(jackpots).toEqual(['koatari']);
    expect(sm.getState()).toBe(GameState.PAYOUT);
    expect(sm.getPayoutRoundsTotal()).toBe(2);
  });

  it('queueSpin returns false when the reserve queue is full', () => {
    const { coordinator, display } = makeCoordinator(NEVER_JACKPOT);

    expect(coordinator.queueSpin()).toBe(true);  // starts immediately
    expect(display.started.length).toBe(1);
    expect(coordinator.queueSpin()).toBe(true);  // 1 queued
    expect(coordinator.queueSpin()).toBe(true);  // 2
    expect(coordinator.queueSpin()).toBe(true);  // 3
    expect(coordinator.queueSpin()).toBe(true);  // 4 — queue full
    expect(coordinator.queueSpin()).toBe(false); // rejected
  });
});
