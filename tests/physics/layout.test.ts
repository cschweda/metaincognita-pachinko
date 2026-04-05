import { describe, it, expect } from 'vitest';
import layoutData from '../../src/layouts/default.json';

describe('Default layout', () => {
  it('has correct dimensions (800x1000)', () => {
    expect(layoutData.dimensions.width).toBe(800);
    expect(layoutData.dimensions.height).toBe(1000);
  });

  it('has walls defined', () => {
    expect(layoutData.walls.length).toBeGreaterThan(0);
  });

  it('has a launch rail', () => {
    expect(layoutData.launchRail).toBeDefined();
    expect(layoutData.launchRail.x).toBeGreaterThan(700);
  });

  it('has an exit zone', () => {
    expect(layoutData.exitZone).toBeDefined();
    expect(layoutData.exitZone.y).toBeGreaterThan(900);
  });

  it('has LCD display area reserved', () => {
    expect(layoutData.lcdDisplay).toBeDefined();
    expect(layoutData.lcdDisplay!.width).toBeGreaterThan(100);
    expect(layoutData.lcdDisplay!.height).toBeGreaterThan(100);
  });

  it('has start chakker area reserved', () => {
    expect(layoutData.startChakker).toBeDefined();
    // Chakker should be below LCD display
    expect(layoutData.startChakker!.y).toBeGreaterThan(layoutData.lcdDisplay!.y + layoutData.lcdDisplay!.height);
  });

  it('walls form a valid boundary', () => {
    // Left wall
    const leftWall = layoutData.walls.find(w => w.x1 <= 35 && w.x2 <= 35);
    expect(leftWall).toBeDefined();

    // Bottom wall
    const bottomWall = layoutData.walls.find(w => w.y1 >= 980 && w.y2 >= 980);
    expect(bottomWall).toBeDefined();
  });
});
