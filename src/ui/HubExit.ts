// The suite's exit door: out of the simulator entirely, back to the floor at
// metaincognita.com where every Metaincognita game lives.
//
// This is SUITE chrome, not game chrome (guidelines §5). It looks the same in
// all nine apps so a player learns it once and finds it everywhere — which is
// why it hardcodes the suite gold (#d4a847) instead of this repo's brighter
// --gold (#ffd700), and why it is a hand-built <a href> rather than anything
// routed through ViewManager.
//
// Four things here are load-bearing, not stylistic:
//   - A real <a href> to an absolute URL. It LEAVES the app; it is not a view
//     swap. ViewManager must never learn about it.
//   - No `target` — this is an exit, not a side trip. A new tab would leave the
//     simulator (and the Phaser render loop) running behind it.
//   - Never hidden, never gated, never confirmed. TopBar renders it on every
//     view including the setup screen, and it destroys nothing.
//   - The aria-label must CONTAIN the visible wordmark verbatim or it fails
//     WCAG 2.5.3 (Label in Name). "Meta Incognita" reads fine and breaks the
//     rule on the space.

export const HUB_URL = 'https://metaincognita.com';
export const HUB_WORDMARK = 'METAINCOGNITA';
export const HUB_ARIA_LABEL = `${HUB_WORDMARK} — exit the simulator, back to all the games`;

// lucide `log-out`, inlined: this repo has no icon component and the CSP
// (netlify.toml) allows no external fetches.
const LOG_OUT_ICON = `<svg class="hub-exit-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">
        <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
        <polyline points="16 17 21 12 16 7" />
        <line x1="21" x2="9" y1="12" y2="12" />
      </svg>`;

/** Markup for the hub exit. Rendered far-left in the top bar, on every view. */
export function hubExitHtml(): string {
  return `<a class="hub-exit" href="${HUB_URL}" aria-label="${HUB_ARIA_LABEL}" data-test="hub-link">
        ${LOG_OUT_ICON}
        <span class="hub-exit-word">${HUB_WORDMARK}</span>
      </a>`;
}
