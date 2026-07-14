// @vitest-environment jsdom
//
// The gating test. Before the hub exit landed, ViewManager hid the whole top bar
// on the setup screen — so an exit mounted in that bar would have been invisible
// on the app's own index, which is exactly the view a lost player is most likely
// to be looking at. The bar is now persistent; only its tabs come and go.
import { describe, it, expect, beforeEach, vi } from 'vitest';

// ViewManager reaches GameView, which imports Phaser — and Phaser feature-detects
// a real WebGL/2D canvas the instant it is imported, which jsdom does not have.
// The chrome under test has nothing to do with the engine, and no game is ever
// started here (GameView only calls new Phaser.Game() from startGame()), so we
// stand in a double instead of booting 1MB of renderer.
//
// The whole import-time surface is: Phaser.AUTO and Phaser.Scale.* in config.ts,
// and `extends Phaser.Scene` in the two scenes — which read the GLOBAL Phaser
// that the real engine's bundle installs as a side effect, so the double has to
// install it too.
vi.mock('phaser', () => {
  class Scene {}
  class Game {}
  const Phaser = {
    AUTO: 0,
    Scale: { FIT: 1, CENTER_BOTH: 1 },
    Scene,
    Game,
  };
  (globalThis as unknown as Record<string, unknown>)['Phaser'] = Phaser;
  return { default: Phaser };
});

import { ViewManager } from '../../src/views/ViewManager';

type ViewName = 'setup' | 'game' | 'history' | 'analysis';

beforeEach(() => {
  document.body.innerHTML = `
    <div id="app">
      <header id="top-bar"></header>
      <main>
        <section id="view-setup"></section>
        <section id="view-game"></section>
        <section id="view-history"></section>
        <section id="view-analysis"></section>
      </main>
    </div>
  `;
});

const hubLink = () => document.querySelector('[data-test="hub-link"]');
const topBar = () => document.getElementById('top-bar') as HTMLElement;
const tabs = () => document.querySelector('.top-bar-tabs') as HTMLElement;

describe('hub exit is never gated', () => {
  it('is on the app index — the setup screen, which used to have no bar at all', () => {
    const vm = new ViewManager();
    vm.init(); // lands on 'setup'

    expect(hubLink()).not.toBeNull();
    expect(topBar().style.display).not.toBe('none');
  });

  it('is on every view, arrived at in any order', () => {
    const vm = new ViewManager();
    vm.init();

    const views: ViewName[] = ['game', 'history', 'analysis', 'setup', 'game', 'setup'];
    for (const view of views) {
      vm.showView(view);
      expect(hubLink(), `hub exit missing on "${view}"`).not.toBeNull();
      expect(topBar().style.display, `top bar hidden on "${view}"`).not.toBe('none');
    }
  });

  it('still hides the tabs on setup — there is no session to navigate yet', () => {
    const vm = new ViewManager();
    vm.init();

    expect(tabs().style.display).toBe('none');
    expect(hubLink()).not.toBeNull(); // ...but the way out stays.

    vm.showView('game');
    expect(tabs().style.display).toBe('flex');
  });
});
