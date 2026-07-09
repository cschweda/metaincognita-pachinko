import { describe, it, expect } from 'vitest';
import { DEAD_ZONE_THRESHOLD, DIAL_MAX_ROTATION } from '../../src/utils/constants';
import { LauncherDial } from '../../src/input/LauncherDial';

describe('LauncherDial constants', () => {
  it('dead zone threshold is 20%', () => {
    expect(DEAD_ZONE_THRESHOLD).toBe(0.20);
  });

  it('dial max rotation is 270 degrees', () => {
    expect(DIAL_MAX_ROTATION).toBe(270);
  });

  it('0% power maps to 0 degrees rotation', () => {
    const power = 0;
    const rotation = power * DIAL_MAX_ROTATION;
    expect(rotation).toBe(0);
  });

  it('100% power maps to 270 degrees rotation', () => {
    const power = 1;
    const rotation = power * DIAL_MAX_ROTATION;
    expect(rotation).toBe(270);
  });

  it('power below dead zone should not fire', () => {
    const power = 0.15;
    expect(power > DEAD_ZONE_THRESHOLD).toBe(false);
  });

  it('power above dead zone should fire', () => {
    const power = 0.25;
    expect(power > DEAD_ZONE_THRESHOLD).toBe(true);
  });
});

describe('LauncherDial wheel direction', () => {
  it('scroll down (positive deltaY) decreases power', () => {
    expect(LauncherDial.wheelPowerStep(100)).toBeLessThan(0);
  });

  it('scroll up (negative deltaY) increases power', () => {
    expect(LauncherDial.wheelPowerStep(-100)).toBeGreaterThan(0);
  });

  it('no vertical scroll means no power change', () => {
    expect(LauncherDial.wheelPowerStep(0)).toBe(0);
  });
});
