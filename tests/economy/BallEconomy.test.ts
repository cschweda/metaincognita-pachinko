import { describe, it, expect } from 'vitest';
import { BallEconomy } from '../../src/economy/BallEconomy';

describe('BallEconomy', () => {
  it('starts with 250 balls', () => {
    const eco = new BallEconomy();
    expect(eco.getState().ballsOwned).toBe(250);
  });

  it('launch decrements owned and increments in-play', () => {
    const eco = new BallEconomy();
    eco.launch();
    expect(eco.getState().ballsOwned).toBe(249);
    expect(eco.getState().ballsInPlay).toBe(1);
    expect(eco.getState().ballsLaunched).toBe(1);
  });

  it('launch returns false when no balls remain', () => {
    const eco = new BallEconomy();
    // Drain all balls
    for (let i = 0; i < 250; i++) {
      expect(eco.launch()).toBe(true);
    }
    expect(eco.launch()).toBe(false);
    expect(eco.getState().ballsOwned).toBe(0);
  });

  it('lose decrements in-play and increments lost', () => {
    const eco = new BallEconomy();
    eco.launch();
    eco.lose();
    expect(eco.getState().ballsInPlay).toBe(0);
    expect(eco.getState().ballsLost).toBe(1);
  });

  it('awardChakkerPayout adds 3 balls', () => {
    const eco = new BallEconomy();
    eco.awardChakkerPayout();
    expect(eco.getState().ballsOwned).toBe(253);
    expect(eco.getState().ballsWon).toBe(3);
  });

  it('awardPayoutGateEntry adds 15 balls', () => {
    const eco = new BallEconomy();
    eco.awardPayoutGateEntry();
    expect(eco.getState().ballsOwned).toBe(265);
    expect(eco.getState().ballsWon).toBe(15);
  });

  it('isExhausted is true only when owned=0 and inPlay=0', () => {
    const eco = new BallEconomy();
    expect(eco.isExhausted()).toBe(false);

    // Launch all balls
    for (let i = 0; i < 250; i++) eco.launch();
    expect(eco.isExhausted()).toBe(false); // still in play

    // Lose them all
    for (let i = 0; i < 250; i++) eco.lose();
    expect(eco.isExhausted()).toBe(true);
  });

  it('accounting is exact over many operations', () => {
    const eco = new BallEconomy();
    for (let i = 0; i < 100; i++) eco.launch();
    for (let i = 0; i < 50; i++) eco.lose();
    eco.awardChakkerPayout(); // +3
    eco.awardPayoutGateEntry(); // +15
    eco.awardBalls(10);

    const s = eco.getState();
    expect(s.ballsOwned).toBe(250 - 100 + 3 + 15 + 10); // 178
    expect(s.ballsInPlay).toBe(50);
    expect(s.ballsLaunched).toBe(100);
    expect(s.ballsLost).toBe(50);
    expect(s.ballsWon).toBe(28);
  });
});
