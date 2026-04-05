import { describe, it, expect, beforeEach } from 'vitest';
import { getTuning, setTuning, resetTuning } from '../../src/physics/PhysicsConfig';
import { DEFAULT_TUNING } from '../../src/types/physics';

describe('PhysicsConfig', () => {
  beforeEach(() => {
    resetTuning();
  });

  it('returns default tuning values', () => {
    const tuning = getTuning();
    expect(tuning.gravityY).toBe(DEFAULT_TUNING.gravityY);
    expect(tuning.ballRestitution).toBe(DEFAULT_TUNING.ballRestitution);
    expect(tuning.pinRestitution).toBe(DEFAULT_TUNING.pinRestitution);
    expect(tuning.ballToBallCollisions).toBe(true);
  });

  it('setTuning updates specific values', () => {
    setTuning({ gravityY: 2.0 });
    const tuning = getTuning();
    expect(tuning.gravityY).toBe(2.0);
    // Other values unchanged
    expect(tuning.ballRestitution).toBe(DEFAULT_TUNING.ballRestitution);
  });

  it('resetTuning restores defaults', () => {
    setTuning({ gravityY: 3.0, ballRestitution: 0.9 });
    resetTuning();
    const tuning = getTuning();
    expect(tuning.gravityY).toBe(DEFAULT_TUNING.gravityY);
    expect(tuning.ballRestitution).toBe(DEFAULT_TUNING.ballRestitution);
  });

  it('default tuning has reasonable physics values', () => {
    const t = DEFAULT_TUNING;
    expect(t.gravityY).toBeGreaterThan(0);
    expect(t.ballRestitution).toBeGreaterThanOrEqual(0);
    expect(t.ballRestitution).toBeLessThanOrEqual(1);
    expect(t.pinRestitution).toBeGreaterThanOrEqual(0);
    expect(t.pinRestitution).toBeLessThanOrEqual(1);
    expect(t.ballFriction).toBeGreaterThanOrEqual(0);
    expect(t.ballDensity).toBeGreaterThan(0);
    expect(t.launchInterval).toBeGreaterThan(0);
  });
});
