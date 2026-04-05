import { describe, it, expect } from 'vitest';
import { KakuhenController } from '../../src/state/KakuhenController';

describe('KakuhenController', () => {
  it('starts inactive', () => {
    const k = new KakuhenController();
    expect(k.isActive()).toBe(false);
    expect(k.getOddsMultiplier()).toBe(1);
    expect(k.getChainDepth()).toBe(0);
  });

  it('activates with correct state', () => {
    const k = new KakuhenController({ kakuhenRate: 0.65, oddsMultiplier: 10, spinLimit: 100 });
    k.activate(false);
    expect(k.isActive()).toBe(true);
    expect(k.getOddsMultiplier()).toBe(10);
    expect(k.getChainDepth()).toBe(1);
    expect(k.getSpinsRemaining()).toBe(100);
  });

  it('chain depth increments on chain activation', () => {
    const k = new KakuhenController();
    k.activate(false); // first kakuhen
    expect(k.getChainDepth()).toBe(1);
    k.activate(true); // chain jackpot
    expect(k.getChainDepth()).toBe(2);
    k.activate(true);
    expect(k.getChainDepth()).toBe(3);
  });

  it('consumeSpin decrements remaining', () => {
    const k = new KakuhenController({ kakuhenRate: 0.65, oddsMultiplier: 10, spinLimit: 3 });
    k.activate(false);
    expect(k.consumeSpin()).toBe(true);  // 2 left
    expect(k.consumeSpin()).toBe(true);  // 1 left
    expect(k.consumeSpin()).toBe(false); // 0 left — exhausted
  });

  it('deactivate resets state', () => {
    const k = new KakuhenController();
    k.activate(false);
    k.deactivate();
    expect(k.isActive()).toBe(false);
    expect(k.getOddsMultiplier()).toBe(1);
    expect(k.getChainDepth()).toBe(0);
  });

  it('rollKakuhen respects configured rate over many trials', () => {
    const k = new KakuhenController({ kakuhenRate: 0.65, oddsMultiplier: 10, spinLimit: 100 });
    let hits = 0;
    const trials = 100000;
    for (let i = 0; i < trials; i++) {
      if (k.rollKakuhen()) hits++;
    }
    const rate = hits / trials;
    expect(rate).toBeGreaterThan(0.60);
    expect(rate).toBeLessThan(0.70);
  });
});
