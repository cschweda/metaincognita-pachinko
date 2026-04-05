import { describe, it, expect } from 'vitest';
import { LotteryEngine } from '../../src/lottery/LotteryEngine';

describe('LotteryEngine', () => {
  it('spin queue caps at 4', () => {
    const engine = new LotteryEngine();
    expect(engine.queueSpin()).toBe(true);
    expect(engine.queueSpin()).toBe(true);
    expect(engine.queueSpin()).toBe(true);
    expect(engine.queueSpin()).toBe(true);
    expect(engine.queueSpin()).toBe(false); // 5th should fail
    expect(engine.getQueueLength()).toBe(4);
  });

  it('dequeue returns results in order', () => {
    const engine = new LotteryEngine();
    engine.queueSpin();
    engine.queueSpin();
    const first = engine.dequeue();
    const second = engine.dequeue();
    expect(first).not.toBeNull();
    expect(second).not.toBeNull();
    expect(engine.dequeue()).toBeNull(); // empty
  });

  it('jackpot spins have three matching reel values', () => {
    // Run many spins to find a jackpot
    const engine = new LotteryEngine({ jackpotOdds: 2, koatariRate: 0, reachRate: 0.3, superReachRate: 0.25, premiumReachRate: 0.05 });
    let found = false;
    for (let i = 0; i < 100; i++) {
      engine.queueSpin();
      const result = engine.dequeue()!;
      if (result.isJackpot) {
        expect(result.reelValues[0]).toBe(result.reelValues[1]);
        expect(result.reelValues[1]).toBe(result.reelValues[2]);
        found = true;
        break;
      }
    }
    expect(found).toBe(true);
  });

  it('reach spins have exactly two matching reel values', () => {
    const engine = new LotteryEngine({ jackpotOdds: 9999, koatariRate: 0, reachRate: 1.0, superReachRate: 0, premiumReachRate: 0 });
    engine.queueSpin();
    const result = engine.dequeue()!;
    if (result.reachType !== 'none') {
      expect(result.reelValues[0]).toBe(result.reelValues[1]);
      expect(result.reelValues[2]).not.toBe(result.reelValues[0]);
    }
  });

  it('non-reach, non-jackpot spins have no matching values', () => {
    const engine = new LotteryEngine({ jackpotOdds: 9999, koatariRate: 0, reachRate: 0, superReachRate: 0, premiumReachRate: 0 });
    engine.queueSpin();
    const result = engine.dequeue()!;
    expect(result.isJackpot).toBe(false);
    expect(result.reachType).toBe('none');
    const [a, b, c] = result.reelValues;
    expect(a).not.toBe(b);
    expect(b).not.toBe(c);
    expect(a).not.toBe(c);
  });

  it('jackpot rate approximates 1/odds over many spins', () => {
    const odds = 100;
    const engine = new LotteryEngine({ jackpotOdds: odds, koatariRate: 0, reachRate: 0.3, superReachRate: 0.25, premiumReachRate: 0.05 });
    const trials = 100000;

    for (let i = 0; i < trials; i++) {
      engine.queueSpin();
      engine.dequeue();
    }

    const rate = engine.getTotalJackpots() / engine.getTotalSpins();
    const expected = 1 / odds;
    // Within ±30% tolerance
    expect(rate).toBeGreaterThan(expected * 0.7);
    expect(rate).toBeLessThan(expected * 1.3);
  });

  it('tracks total spins and jackpots', () => {
    const engine = new LotteryEngine();
    engine.queueSpin();
    engine.dequeue();
    engine.queueSpin();
    engine.dequeue();
    expect(engine.getTotalSpins()).toBe(2);
  });
});
