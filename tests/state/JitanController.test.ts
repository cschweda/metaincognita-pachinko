import { describe, it, expect } from 'vitest';
import { JitanController } from '../../src/state/JitanController';

describe('JitanController', () => {
  it('starts inactive', () => {
    const j = new JitanController();
    expect(j.isActive()).toBe(false);
    expect(j.getAnimationSpeedMultiplier()).toBe(1);
  });

  it('activates with correct state', () => {
    const j = new JitanController({ spinCount: 100, animationSpeedMultiplier: 2.5 });
    j.activate();
    expect(j.isActive()).toBe(true);
    expect(j.getSpinsRemaining()).toBe(100);
    expect(j.getAnimationSpeedMultiplier()).toBe(2.5);
  });

  it('consumeSpin decrements remaining', () => {
    const j = new JitanController({ spinCount: 3, animationSpeedMultiplier: 2.5 });
    j.activate();
    expect(j.consumeSpin()).toBe(true);  // 2 left
    expect(j.consumeSpin()).toBe(true);  // 1 left
    expect(j.consumeSpin()).toBe(false); // 0 left
  });

  it('deactivate resets state', () => {
    const j = new JitanController();
    j.activate();
    j.deactivate();
    expect(j.isActive()).toBe(false);
    expect(j.getAnimationSpeedMultiplier()).toBe(1);
  });
});
