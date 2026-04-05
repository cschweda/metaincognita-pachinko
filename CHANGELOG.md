# Changelog

All notable changes to PachinkoParlor are documented here.

## [0.2.0] - 2026-04-05

### Phase 2: Gates, Pockets & Digital Lottery

The core game loop — balls trigger lottery spins, jackpots open the payout gate, and the ball economy tracks everything.

#### Added
- **Start chakker gate** — sensor below the LCD triggers lottery spins when balls pass through. Bright cyan flash, expanding ring pulse, and floating "+3 SPIN!" text on entry.
- **Digital lottery engine** — RNG determines outcomes before animation plays (matching real machine behavior). Configurable jackpot odds (1/319 High Spec), koatari rate, reach probabilities.
- **7-segment LED display** — authentic segment-style digit rendering with pointed ends and dim "ghost" segments. Attract sequence on startup (power-on → digit chase → flash → idle cycle). Idle mode shows slowly cycling digits at varying speeds. Reach and jackpot states have distinct color treatments.
- **Reach system** — when 2 of 3 reels match, suspense animation plays before third reel stops. Three tiers: Normal (1s pause), Super (3s, red), Premium (5s, gold). Reach type weighted by outcome — premium reaches are more likely to be jackpots.
- **Payout gate** — opens during jackpot for 10 timed rounds (2 for koatari). Each ball entering awards 15 balls. Visual toggle between open (green glow) and closed (dim bar).
- **Tulip gates** — four mechanical wing gates near the chakker. Toggle open/closed on ball entry. Open tulips show spread golden wings with glow ring; closed show narrow bars. Award 5 balls when opened.
- **Side pockets** — dead pockets on board edges where balls drain without reward.
- **Game state machine** — IDLE → NORMAL → SPINNING → PAYOUT → NORMAL cycle with valid transition enforcement.
- **Ball economy system** — tracks balls owned, in play, launched, lost, won. Starting budget of 250 balls. Purchase system: buy 250 balls for ¥1,000 virtual yen from ¥10,000 starting balance. Cash-out at ¥2.5/ball exchange rate (vs ¥4 purchase — the house edge).
- **Bankroll management UI** — balls remaining with color bar, virtual yen balance, total spent, cash-out value, net P&L, "Buy 250" and "Cash Out" buttons.
- **Statistical analysis panel** — total spins, jackpots, jackpot rate vs expected (1/319), reaches, current and longest drought, burn rate (balls/min rolling average), cost per hour, session time.
- **Lifetime stats** — sessions played, total yen spent, total spins, total jackpots. Persisted in localStorage across sessions.
- **Spin log** — last 5 spins displayed with color coding (gold for jackpot, teal for reach, dim for miss). Reel values shown in styled boxes.
- **Mode indicator** — displays current game state with color coding (teal for SPINNING, gold for PAYOUT).

#### Changed
- **Rendering order** — LCD display now renders behind pins and balls (matching real machines where the screen is behind the glass). Balls render in front of everything.
- **Ball collision mask** — now includes SENSOR and GATE categories so balls interact with chakker, payout gate, tulips, and pockets.

### Tests
- LotteryEngine: spin queue caps at 4, jackpot rate matches 1/odds over 100K spins, reel value correctness (3 matching for jackpot, 2 for reach, 0 for plain).
- GameStateMachine: valid transitions only, full IDLE→NORMAL→SPINNING→PAYOUT→NORMAL cycle, payout round counting.
- BallEconomy: starting balls, launch/lose accounting, chakker payout (+3), payout gate entry (+15), exhaustion detection, exact accounting over many operations.

---

## [0.1.0] - 2026-04-05

### Phase 1: Physics Board & Ball Launcher

The foundational physics simulation — balls launch, cascade through pins, and exit the bottom.

#### Added
- **Phaser 3 + Vite + TypeScript** project scaffold with strict mode, Vitest, ESLint, Prettier.
- **Masamura gauge pin field** — procedurally generated offset grid of ~200+ pins with reserved zones for LCD display and start chakker. Pin radius 2px, ball radius 5px (~2.5:1 ratio approximating real 3.7:1).
- **Ball pool** — object pool of 30 Matter.js bodies. Spawn/despawn lifecycle, stuck ball detection (15s timeout + 2s nudge for stationary balls), boundary escape detection.
- **Rotary launcher dial** — mouse drag, touch drag, arrow keys (throttled), mouse wheel. Separate power adjustment from firing: arrows/wheel set power, hold Space or drag dial to fire.
- **Launch micro-variance** — position jitter (±5px), velocity jitter (±3%), angle spread (±2.3°) per ball. Same power setting produces different paths every time.
- **Ball budget** — 250 starting balls with remaining counter, color-coded progress bar (green→gold→red), "OUT OF BALLS" alert with red flash animation.
- **Speed control** — Slow / Normal / Fast buttons adjusting Matter.js gravity in real-time.
- **Contextual hints** — dynamic guidance in the stats panel based on game state (power level, sweet spot indicator, firing instructions, empty warning).
- **Setup screen** — Metaincognita dark-mode design with title, feature tags, disclaimer, "Start Playing" button.
- **Game screen** — CSS Grid layout with Phaser canvas (4:5 aspect, Scale.FIT) and scrollable stats column.
- **Top bar** — Metaincognita branding with navigation tabs (Game active, History/Analysis disabled stubs).
- **Dev panel** — physics tuning sliders (gravity, restitution, friction, density, launch interval, ball-to-ball toggle). Press D to toggle.
- **Metaincognita design system** — full CSS custom properties (dark mode, gold/teal/red accents, mono fonts, card-based layout).
- **DOM ↔ Phaser bridge** — typed event bus connecting game canvas events to DOM UI updates.
- **.nvmrc** (Node 20), **LICENSE** (MIT), **.gitignore**, **vite.config.ts** (Phaser manual chunk split), **netlify.toml**.

### Tests
- Collision categories: unique powers of 2, correct bitmask relationships.
- Layout: dimensions, walls, reserved zones, boundary validation.
- PhysicsConfig: get/set/reset tuning, reasonable default values.
- LauncherDial: power mapping, dead zone threshold.
