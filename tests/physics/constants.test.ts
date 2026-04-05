import { describe, it, expect } from 'vitest';
import {
  CATEGORY_BALL, CATEGORY_PIN, CATEGORY_WALL,
  CATEGORY_GATE, CATEGORY_SENSOR,
  PIN_RADIUS, BALL_RADIUS, MAX_BALLS,
  BOARD_WIDTH, BOARD_HEIGHT,
} from '../../src/utils/constants';

describe('Collision categories', () => {
  it('categories are unique powers of 2', () => {
    const categories = [CATEGORY_BALL, CATEGORY_PIN, CATEGORY_WALL, CATEGORY_GATE, CATEGORY_SENSOR];
    const unique = new Set(categories);
    expect(unique.size).toBe(categories.length);

    for (const cat of categories) {
      expect(cat).toBeGreaterThan(0);
      expect(cat & (cat - 1)).toBe(0); // power of 2 check
    }
  });

  it('balls can collide with pins via bitmask', () => {
    const ballMask = CATEGORY_PIN | CATEGORY_WALL | CATEGORY_BALL;
    expect(ballMask & CATEGORY_PIN).toBeTruthy();
    expect(ballMask & CATEGORY_WALL).toBeTruthy();
    expect(ballMask & CATEGORY_BALL).toBeTruthy();
  });

  it('pin mask only collides with balls', () => {
    const pinMask = CATEGORY_BALL;
    expect(pinMask & CATEGORY_BALL).toBeTruthy();
    expect(pinMask & CATEGORY_PIN).toBeFalsy();
    expect(pinMask & CATEGORY_WALL).toBeFalsy();
  });
});

describe('Physics constants', () => {
  it('ball radius is larger than pin radius (realistic ratio)', () => {
    expect(BALL_RADIUS).toBeGreaterThan(PIN_RADIUS);
    const ratio = BALL_RADIUS / PIN_RADIUS;
    expect(ratio).toBeGreaterThanOrEqual(2);
    expect(ratio).toBeLessThanOrEqual(4);
  });

  it('max balls is 30', () => {
    expect(MAX_BALLS).toBe(30);
  });

  it('board has 4:5 aspect ratio', () => {
    expect(BOARD_WIDTH / BOARD_HEIGHT).toBeCloseTo(4 / 5);
  });
});
