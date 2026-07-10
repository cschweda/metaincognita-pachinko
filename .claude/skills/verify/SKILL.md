---
name: verify
description: Build, launch, and drive PachinkoParlor to verify changes at runtime
---

## Launch

- `yarn dev` → http://localhost:5173 (Vite, starts in ~200ms)
- Click `#start-btn` to mount the Phaser game (canvas appears in `#game-container`)

## Drive it (browser automation)

Use **chrome-devtools-mcp** (`evaluate_script` runs in the CDP main world) — NOT the
claude-in-chrome extension. The extension environment breaks Phaser input two ways:
its content scripts preventDefault keyboard/wheel events on `window` before Phaser's
listener (Phaser drops `defaultPrevented` events), and its isolated world strips
`Object.defineProperty(e, 'keyCode', ...)` off dispatched events. Real CDP clicks/drags
do work there, but complete sub-frame, so frame-polled holds (Space, arrows, dial drag)
never register a fire.

Working main-world dispatch recipe:

```js
const fire = (type, keyCode, code, key) => {
  const e = new KeyboardEvent(type, { code, key, bubbles: true, cancelable: true });
  Object.defineProperty(e, 'keyCode', { get: () => keyCode });
  window.dispatchEvent(e);
};
// Power: hold ArrowRight (0.004 power per 30ms); release with keyup
fire('keydown', 39, 'ArrowRight', 'ArrowRight');
// Fire balls: hold Space → 1 ball/s (launchInterval tuning); keyup to stop
fire('keydown', 32, 'Space', ' ');
// Wheel (±2% per event; up = increase):
canvas.dispatchEvent(new WheelEvent('wheel', { deltaY: -100, clientX, clientY, bubbles: true }));
```

## Observe

- DOM ids: `#stat-power`, `#stat-remaining`, `#stat-spins`, `#stat-jackpots`,
  `#stat-burn-rate`, `#stat-cost-hour`, `#mode-indicator`, `#spin-result-text`,
  `.spin-log-entry`
- Sample with `setInterval` into `window.__samples`, collect in a later evaluate call
- Spin timing: `#mode-indicator` flips NORMAL→SPINNING at animation start;
  `#spin-result-text` / `#stat-spins` must update only when it flips back (reel stop)
- Stats push to the DOM once per second (BoardScene fps timer) — expect ≤1s lag
- Jackpots are 1/319 — don't try to verify payout mode live; unit tests cover it

## Gotchas

- Reach animation durations: normal 3.5s, super 6s, premium 8s (`ReachSystem.ts`)
- At ~46% power the chakker hit rate is high; balls-in-tray can trend UP (+3/entry)
