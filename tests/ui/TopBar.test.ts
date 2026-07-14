// @vitest-environment jsdom
//
// The hub exit is the one piece of chrome that is identical in all nine
// Metaincognita apps, so its contract is worth pinning down hard. These tests
// exist because the exit is easy to break by accident: it only works if it is a
// real link, in the same tab, on every single view.
import { describe, it, expect, vi } from 'vitest';
import { TopBar } from '../../src/ui/TopBar';
import { HUB_URL, HUB_WORDMARK } from '../../src/ui/HubExit';

function mountTopBar(onNavigate: (view: string) => void = () => {}) {
  const el = document.createElement('header');
  document.body.appendChild(el);
  const bar = new TopBar(el, onNavigate);
  const link = el.querySelector('[data-test="hub-link"]') as HTMLAnchorElement;
  return { bar, el, link };
}

describe('hub exit', () => {
  it('renders in the top bar', () => {
    const { link } = mountTopBar();

    expect(link).not.toBeNull();
    expect(link.textContent).toContain(HUB_WORDMARK);
  });

  it('points at the hub, absolutely', () => {
    const { link } = mountTopBar();

    // The literal attribute, not the resolved .href — it must be absolute so it
    // works identically from pachinko.metaincognita.com and from localhost.
    expect(link.getAttribute('href')).toBe('https://metaincognita.com');
    expect(link.getAttribute('href')).toBe(HUB_URL);
  });

  it('is a real anchor, not an in-app view swap', () => {
    const onNavigate = vi.fn();
    const { link } = mountTopBar(onNavigate);

    expect(link.tagName).toBe('A');
    expect(link.hasAttribute('href')).toBe(true);
    expect(onNavigate).not.toHaveBeenCalled();
  });

  it('leaves the SPA — nothing intercepts the click', () => {
    const onNavigate = vi.fn();
    const { link } = mountTopBar(onNavigate);

    // If anything ever routed this through ViewManager it would have to
    // preventDefault() to stop the browser leaving. Nothing may. We catch the
    // click at the document — after any handler on the link itself has had its
    // chance — and cancel it there, purely so jsdom does not try to navigate.
    let interceptedByApp: boolean | null = null;
    document.addEventListener(
      'click',
      event => {
        interceptedByApp = event.defaultPrevented;
        event.preventDefault();
      },
      { once: true }
    );

    link.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));

    expect(interceptedByApp).toBe(false);
    expect(onNavigate).not.toHaveBeenCalled();
  });

  it('opens in the same tab — this is an exit, not a side trip', () => {
    const { link } = mountTopBar();

    expect(link.hasAttribute('target')).toBe(false);
  });

  it('accessible name contains the visible wordmark (WCAG 2.5.3)', () => {
    const { link } = mountTopBar();

    const visible = link.querySelector('.hub-exit-word')!.textContent!.trim();
    const accessibleName = link.getAttribute('aria-label')!;

    expect(visible).toBe(HUB_WORDMARK);
    // "Meta Incognita ..." would read fine and fail 2.5.3 on the space.
    expect(accessibleName).toContain(visible);
  });

  it('hides its icon from the accessibility tree', () => {
    const { link } = mountTopBar();

    expect(link.querySelector('svg')!.getAttribute('aria-hidden')).toBe('true');
  });

  it('survives every tab state the app can put the bar in', () => {
    const { bar, el } = mountTopBar();

    // Whatever ViewManager does to the tabs, the exit stays put.
    bar.hideTabs();
    bar.setActiveTab(null);
    expect(el.querySelector('[data-test="hub-link"]')).not.toBeNull();

    bar.showTabs();
    bar.setActiveTab('analysis');
    expect(el.querySelector('[data-test="hub-link"]')).not.toBeNull();
  });
});
