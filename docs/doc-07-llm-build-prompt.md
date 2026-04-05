# Doc 07 — LLM Build Prompt

## PachinkoParlor: Physics-Based Pachinko Simulator

**Purpose:** This is a self-contained prompt to be fed to Claude (or another LLM) to implement each phase of PachinkoParlor. It contains everything needed to build the project: tech stack, architecture, design system, file structure, game mechanics, and per-phase deliverables. No external documents are required.

---

## PROJECT OVERVIEW

PachinkoParlor is a browser-based, physics-driven pachinko simulator for the Metaincognita casino simulator suite (metaincognita.com). It faithfully reproduces a modern Japanese "Digipachi" pachinko machine with real-time ball physics (Matter.js via Phaser 3), a digital lottery system (3-reel RNG slot), and a full mode system (kakuhen/fever, jitan, koatari).

The simulator has an educational mission: it exposes the mathematical reality that the physical pin field creates the *feeling* of a skill game while a hidden RNG determines all jackpot outcomes. The player's only control is a launch dial.

**The app follows the same UI pattern as the other Metaincognita sims:** a dark-mode setup screen with game configuration choices → a game screen with a stats column on the right → a history page → an analysis page. Phaser 3 renders ONLY the game canvas. All surrounding UI (setup, stats sidebar, history, analysis) is standard DOM with the shared Metaincognita design system.

---

## TECH STACK

| Layer | Technology | Version | Notes |
|---|---|---|---|
| Game engine | Phaser 3 | 3.90.0 (exact pin) | Last stable v3. v4.0.0 RC7 available but not stable yet. MIT, free. |
| Physics | Matter.js | (bundled with Phaser) | Built-in Phaser integration. No separate install. |
| Build tool | Vite | ^8.0.0 | Uses Rolldown bundler. Fast HMR, static output. |
| Language | TypeScript (strict mode) | ^5.8.0 | `strict`, `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes` |
| Charts | Chart.js | ^4.4.0 | Stats/analysis dashboard. DOM layer only. |
| Rendering | WebGL with Canvas fallback | (Phaser auto-detects) | |
| Package manager | **Yarn** | latest | **Not npm, not pnpm.** Suite convention. |
| Deploy | Netlify (static SPA) | N/A | Build output: `dist/` |
| Testing | Vitest | ^3.0.0 | |
| Linting | ESLint (flat config) | ^9.0.0 | With `@typescript-eslint` ^8.0.0 |
| Formatting | Prettier | ^3.0.0 | |
| Node.js | Node.js | 20.x LTS or 22.x | Required by Vite 8 |

**Project initialization:**
```bash
yarn create vite pachinko-parlor --template vanilla-ts
cd pachinko-parlor
yarn add phaser@3.90.0 chart.js
yarn add -D vitest eslint prettier @typescript-eslint/eslint-plugin @typescript-eslint/parser
```

**TypeScript config (tsconfig.json):**
```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "exactOptionalPropertyTypes": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "outDir": "dist",
    "sourceMap": true
  },
  "include": ["src"]
}
```

**NOT Nuxt.** This project does not use Nuxt, Vue, React, or any UI framework. The surrounding UI is vanilla TypeScript + DOM manipulation. Only the game canvas uses Phaser.

---

## DESIGN SYSTEM (Metaincognita Suite)

All Metaincognita casino simulators share a unified dark-mode design system. PachinkoParlor must use these exact CSS custom properties:

```css
:root {
  /* Backgrounds */
  --bg-dark: #0d1117;
  --bg-panel: #161b22;
  --bg-card: #1c2128;
  --bg-input: #21262d;

  /* Borders */
  --border: #30363d;
  --border-light: #3d444d;

  /* Text */
  --text: #e6edf3;
  --text-dim: #8b949e;
  --text-muted: #656d76;

  /* Accent colors */
  --gold: #ffd700;
  --gold-dim: #b8960b;
  --teal: #4ecdc4;
  --teal-dim: #3ba89f;
  --red: #dc3545;
  --red-dim: #a82835;
  --green: #28a745;
  --green-dim: #1e7e34;
  --blue: #17a2b8;

  /* Gradients */
  --gradient-panel: linear-gradient(145deg, #161b22, #0d1117);
  --gradient-header: linear-gradient(135deg, var(--bg-dark) 0%, #1a1a2e 100%);

  /* Glow effects */
  --glow-gold: 0 0 20px rgba(255, 215, 0, 0.3);
  --glow-teal: 0 0 15px rgba(78, 205, 196, 0.3);
  --glow-red: 0 0 15px rgba(220, 53, 69, 0.3);

  /* Typography */
  --font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  --font-mono: 'SF Mono', 'Fira Code', 'Consolas', monospace;

  /* Spacing */
  --radius: 12px;
  --radius-sm: 8px;
  --radius-lg: 16px;
}
```

**Design rules:**
- All backgrounds use `var(--bg-dark)` or `var(--bg-panel)`. Never white, never light gray.
- All text uses `var(--text)`, `var(--text-dim)`, or `var(--text-muted)`. Never black.
- Primary accent is gold (`var(--gold)`) for headings, key stats, active elements.
- Secondary accent is teal (`var(--teal)`) for interactive elements, links, secondary highlights.
- Red for losses, warnings. Green for wins, positive indicators.
- All panels have `border: 1px solid var(--border)` and `border-radius: var(--radius)`.
- Buttons: dark background with subtle gradient, gold or teal text, hover glow effect.
- Inputs: `var(--bg-input)` background, `var(--border)` border, `var(--text)` text.
- No bright colors on large surfaces. Glow effects are subtle, used sparingly.
- Font sizes: body 14px, headings scale from 1.1rem to 2.5rem. Stats use `var(--font-mono)`.

---

## APP ARCHITECTURE

### Page Flow

The app has four views, managed by showing/hiding DOM sections (no router needed):

```
SETUP SCREEN → GAME SCREEN → HISTORY → ANALYSIS
     │              │            │          │
     │              │            │          │
  Dark mode      Phaser       Table of    Charts,
  centered       canvas +     all spins,  probability
  options:       DOM stats    jackpots,   convergence,
  - Spec tier    column on    mode        economy
  - Theme        the right    transitions  graphs
  - Settings                              
```

### Screen Descriptions

**1. SETUP SCREEN**
- Centered vertically on a dark gradient background (`var(--gradient-header)`)
- Title: "PachinkoParlor" in gold with subtle text-shadow glow
- Subtitle: "Metaincognita Casino Simulator Suite" in dim text
- Configuration cards:
  - **Spec tier selector**: Three cards (High 1/319, Middle 1/199, Sweet 1/99) with odds, kakuhen rate, description. Selected card has gold border glow.
  - **Theme selector**: Two theme cards (Classic Gold, Neon Drift). Selected theme highlighted. Extensible for future themes.
  - **Settings**: Starting balance, ball-to-ball collisions toggle, audio toggle
- "Start Playing →" button at bottom (gold background, dark text, large)
- Feature tags below the button: "Real-time probability" · "RNG transparency" · "Statistical analysis" · "Authentic physics"

**2. GAME SCREEN**
- CSS Grid layout: `grid-template-columns: 1fr 380px`
- **Left: Game canvas** — Phaser 3 renders here inside a `<div id="game-container">`. The canvas maintains 4:5 aspect ratio (800×1000 base). Contains: pin field, ball physics, LCD lottery display, gates, launcher dial, mode indicator.
- **Right: Stats column** — Pure DOM. Scrollable. Contains:
  - Session summary card (balls owned, net position, current mode, session time)
  - Ball economy card (burn rate, cost/hour, break-even estimate)
  - Last 10 spins mini-log
  - Probability mini-chart (expected vs. actual jackpot rate, Chart.js)
  - Quick toggles: RNG transparency, heatmap overlay, sound
- **Top bar**: Navigation tabs: [Game] [History] [Analysis] — plus Metaincognita branding
- **Bottom bar** (game screen only): Ball purchase button, volume slider, dial position readout

**3. HISTORY PAGE**
- Full-width table of all session events
- Columns: #, Time, Event Type, Spin Result, Reach Type, Mode, Balls Won, Balls Lost, Net Position
- Filterable by event type (spins only, jackpots only, mode changes only)
- Sortable columns
- Color-coded rows: jackpots in gold, mode changes in teal, losses dim
- Export to CSV button

**4. ANALYSIS PAGE**
- Dashboard of Chart.js charts:
  - **Probability convergence** (line chart: theoretical vs. actual jackpot rate over spins)
  - **Net position over time** (line chart: sawtooth pattern of losses and fever spikes)
  - **Mode time distribution** (pie chart: % time in Normal vs. Kakuhen vs. Jitan vs. Payout)
  - **Fever chain distribution** (bar chart: histogram of chain lengths)
  - **Reach type breakdown** (pie chart with conversion rates)
  - **Ball path heatmap** (canvas overlay, if data collected)
  - **Launch power vs. chakker rate** (scatter plot: the "skill ceiling" chart)
- Summary stats panel:
  - Total spins, total jackpots, actual rate vs. expected
  - Longest drought (spins without jackpot)
  - Longest fever chain
  - Effective house edge (empirical)
  - Total virtual yen spent / won / net

---

## FILE STRUCTURE

```
pachinko-parlor/
├── src/
│   ├── main.ts                        # App entry: init views, event routing
│   ├── config.ts                      # Game config, Phaser config
│   │
│   ├── views/                         # DOM-based views (NOT Phaser)
│   │   ├── SetupView.ts              # Setup screen DOM construction and events
│   │   ├── GameView.ts               # Game screen layout (mounts Phaser canvas)
│   │   ├── HistoryView.ts            # History table view
│   │   ├── AnalysisView.ts           # Analysis charts view
│   │   └── ViewManager.ts            # Show/hide views, tab navigation
│   │
│   ├── scenes/                        # Phaser scenes (ONLY for game canvas)
│   │   ├── BootScene.ts              # Asset preloading
│   │   └── BoardScene.ts             # Main physics scene
│   │
│   ├── physics/                       # Matter.js physics components
│   │   ├── PinField.ts               # Pin layout loader, static bodies
│   │   ├── BallPool.ts               # Ball object pooling, lifecycle
│   │   └── PhysicsConfig.ts          # Tuning parameters
│   │
│   ├── gates/                         # Board gate components
│   │   ├── StartChakker.ts           # Center gate sensor
│   │   ├── PayoutGate.ts             # Bottom payout gate
│   │   ├── TulipGate.ts              # Toggle wing gates
│   │   └── SidePocket.ts             # Side pocket sensors
│   │
│   ├── lottery/                       # Digital lottery system
│   │   ├── LotteryEngine.ts          # RNG, probability, spin queue
│   │   ├── LotteryDisplay.ts         # 3-reel animation (Phaser sprites)
│   │   ├── ReachSystem.ts            # Reach animations
│   │   └── SpinResult.ts             # Outcome types
│   │
│   ├── state/                         # Game state management
│   │   ├── GameStateMachine.ts       # Full state graph
│   │   ├── KakuhenController.ts      # Fever mode
│   │   └── JitanController.ts        # Fast-cycle mode
│   │
│   ├── economy/                       # Ball economy
│   │   └── BallEconomy.ts            # Ball tracking, purchase system
│   │
│   ├── stats/                         # Statistics collection
│   │   ├── SessionTracker.ts         # Real-time metrics
│   │   ├── HeatmapTracker.ts         # Ball path data
│   │   └── HistoryLog.ts             # Event log for history/analysis
│   │
│   ├── themes/                        # Theme system
│   │   ├── ThemeManager.ts           # Loading, switching, events
│   │   └── manifests/                # Theme JSON manifests
│   │
│   ├── audio/                         # Audio management
│   │   ├── AudioManager.ts           # Theme-aware audio
│   │   └── SoundPool.ts              # Pin strike pooling
│   │
│   ├── input/                         # Input handling
│   │   └── LauncherDial.ts           # Rotary dial (Phaser input)
│   │
│   ├── ui/                            # DOM UI components
│   │   ├── StatsColumn.ts            # Right-side stats panel
│   │   ├── TopBar.ts                 # Navigation + branding
│   │   ├── BottomBar.ts              # Ball purchase, volume, dial readout
│   │   └── ChartManager.ts           # Chart.js wrapper for analysis
│   │
│   ├── layouts/                       # Board layouts
│   │   └── default.json              # Masamura gauge pin layout
│   │
│   ├── types/                         # TypeScript type definitions
│   │   ├── physics.ts
│   │   ├── lottery.ts
│   │   ├── state.ts
│   │   ├── stats.ts
│   │   ├── theme.ts
│   │   └── economy.ts
│   │
│   └── utils/
│       ├── constants.ts               # Collision categories, magic numbers
│       └── bridge.ts                  # Phaser ↔ DOM event bridge
│
├── public/
│   └── assets/
│       ├── themes/                    # Theme asset directories
│       ├── audio/                     # Physics sounds (theme-independent)
│       └── brand/                     # Metaincognita logo, favicon
│
├── tests/
│   ├── physics/
│   ├── lottery/
│   ├── state/
│   └── economy/
│
├── index.html                         # Single page: all view containers
├── style.css                          # Global styles + design system
├── vite.config.ts
├── tsconfig.json
├── package.json
└── README.md
```

---

## CRITICAL ARCHITECTURE: PHASER ↔ DOM BRIDGE

Phaser runs in its own canvas. The DOM UI (stats column, history, analysis) needs to know about game events. The bridge pattern:

```typescript
// src/utils/bridge.ts
// Custom event bus connecting Phaser world to DOM UI

type GameEvent =
  | { type: 'ball:launched' }
  | { type: 'ball:lost' }
  | { type: 'ball:chakker' }
  | { type: 'spin:result'; data: SpinResult }
  | { type: 'mode:changed'; data: { from: GameState; to: GameState } }
  | { type: 'payout:round'; data: { round: number; total: number; balls: number } }
  | { type: 'economy:updated'; data: BallEconomyState }
  | { type: 'ball:position'; data: { x: number; y: number } }  // for heatmap
  | { type: 'dial:changed'; data: { power: number } };

class GameBridge {
  private listeners = new Map<string, Set<(data: any) => void>>();

  emit(event: GameEvent): void { /* notify listeners */ }
  on(type: string, callback: (data: any) => void): void { /* register */ }
  off(type: string, callback: (data: any) => void): void { /* unregister */ }
}

export const bridge = new GameBridge();
```

**Inside Phaser** (BoardScene, LotteryEngine, etc.): `bridge.emit({ type: 'spin:result', data: result })`
**Inside DOM** (StatsColumn, HistoryLog, ChartManager): `bridge.on('spin:result', (data) => this.updateSpinLog(data))`

This keeps Phaser and DOM completely decoupled. Phaser never touches the DOM. DOM never touches the canvas.

---

## GAME MECHANICS REFERENCE

### Ball Physics

- Balls: 11mm diameter, 5.75g real weight, **~5px radius** at game scale
- Pins: ~200–250 static circles in Masamura offset grid pattern, **~2px radius**
- The ~2.5:1 ball-to-pin ratio approximates the real ~3.7:1 ratio while remaining visually clear
- Physics: Matter.js via Phaser. Gravity Y = 1.0. Ball restitution = 0.5. Pin restitution = 0.6.
- Ball pooling: max 30 active balls. Reuse bodies, don't create/destroy.
- Collision categories: BALL, PIN, WALL, GATE, SENSOR (use bitmasking)
- Ball collision mask: `CATEGORY_PIN | CATEGORY_WALL | CATEGORY_BALL` (ball-to-ball enabled by default, toggleable)

### Launcher

- Rotary dial: 0°–270° maps to 0%–100% power
- Dead zone: <20% power = ball doesn't clear rail
- Sweet spot: 40%–70% power = best chakker hit rate
- Auto-fire: ~1 ball/second when dial is held above dead zone
- Input: mouse drag, touch drag, arrow keys, mouse wheel

### Digital Lottery

- Triggered when ball enters start chakker (sensor)
- Max 4 spins queued. If queue is full, additional chakker entries still award the 3-ball payout but the spin is dropped.
- RNG determines outcome BEFORE animation plays
- Jackpot: 3 matching symbols. Awards are based on spec tier.
- Reach: 2 of 3 match → suspense animation → resolve
- **Normal spin payout: 3 balls awarded per chakker entry** (each ball entering the start chakker awards 3 balls immediately, regardless of spin queue state). This is a per-entry award, not per-spin-resolution.

### Reach System Probability

Reach type selection occurs after the outcome is determined. The distribution must be calibrated so that conversion rates match these targets:

| Reach Type | Selection Weight (non-jackpot) | Selection Weight (jackpot) | Approximate Conversion Rate |
|---|---|---|---|
| Normal | 70% | 10% | ~5% |
| Super | 25% | 35% | ~30% |
| Premium | 5% | 55% | ~60%+ |

The `reachRate` (probability of any reach on a non-jackpot spin) is configurable per spec but typically ~30%. All jackpot spins that show a reach use the jackpot selection weights.

### Probability Specs (Authoritative Per-Tier Values)

| Spec | Jackpot Odds | Kakuhen Rate | Kakuhen Multiplier | Kakuhen Spin Limit | Payout Rounds | Jitan Spins | Koatari Rate |
|---|---|---|---|---|---|---|---|
| High | 1/319 | 65% | 10x | 100 | 10 | 100 | 10% |
| Middle | 1/199 | 50% | 10x | 80 | 10 | 80 | 10% |
| Sweet | 1/99 | 40% | 8x | 60 | 8 | 50 | 15% |

**Default spec for first-time players: Middle (1/199).** The setup screen pre-selects "Balanced."

### Game States

```
IDLE → NORMAL → SPINNING ��� PAYOUT → KAKUHEN or JITAN → NORMAL
```

- NORMAL: Base odds. Balls launch and cascade.
- SPINNING: Lottery animation in progress. Physics continues.
- PAYOUT: Jackpot hit. Payout gate opens for N timed rounds.
- KAKUHEN: Fever mode. Odds × multiplier. Chain jackpots possible. Lasts until jackpot (chains) or spin limit exhausted.
- JITAN: Fast cycle. Normal odds, fast animation (2–3x speed), wide chakker. Fixed spin count. Entry: after payout without kakuhen, OR after kakuhen spin limit exhausted.

**Koatari:** A jackpot variant (not a separate state). Koatari payout has only 2 rounds with brief gate openings. Koatari may or may not trigger kakuhen — same `kakuhenRate` roll as a full jackpot.

### Ball Economy

- **Starting balance:** Phase 2 starts with 250 balls free (no purchase UI). Phase 4 introduces the purchase system: starting balance ¥10,000, purchase 250 balls for ��1,000 (¥4/ball). The ¥10,000 starting balance allows 10 purchases (2,500 balls total). Starting balance is configurable in `MachineSpec`.
- **Exchange value:** ~¥2.5/ball at the three-shop exchange (vs. ¥4/ball purchase price). This asymmetry IS the house edge. Formalized as `exchangeRate: 2.5` in `BallEconomy`.
- Normal spin payout: 3 balls (per chakker entry)
- Payout gate entry: 15 balls per ball entering
- Full jackpot: payout rounds per spec tier (High: 10, Middle: 10, Sweet: 8)
- Koatari (small jackpot): 2 rounds, brief gate opening

### Tulip Gates

- Toggle on ball entry: closed→open, open→closed
- Open tulips have wider sensor (easier to hit)
- Some tulips are linked: entering one opens/closes another elsewhere on the board

---

## THEME SYSTEM

Themes are cosmetic skins that change visuals and audio without affecting game mechanics. Each theme is a manifest JSON + asset files. The ThemeManager loads and swaps them.

**2 bundled themes:** Classic Gold (default), Neon Drift (cyberpunk). The theme system is extensible — additional themes (Ukiyo-e, Deep Space, Matsuri) can be added later as self-contained asset directories.

Theme controls: board face texture, reel symbol sprites, reach animations, color palette overrides, audio tracks (BGM normal, BGM fever, SFX), particle effects.

Theme does NOT control: pin layout, probability, game state logic, ball economy, physics.

Mid-session theme switching is supported. No game state reset.

---

## PHASE BUILD INSTRUCTIONS

### PHASE 1: Physics Board & Ball Launcher

**Build these files:**
- `main.ts`, `config.ts` — Phaser game instance, mount in `#game-container`
- `views/SetupView.ts`, `views/GameView.ts`, `views/ViewManager.ts` — Setup screen and game screen shell (history/analysis are empty stubs)
- `scenes/BootScene.ts`, `scenes/BoardScene.ts` — Asset loading, physics world
- `physics/PinField.ts` — Load `default.json`, create static circle bodies
- `physics/BallPool.ts` — Object pool, spawn/despawn, max 30 balls
- `physics/PhysicsConfig.ts` — Tuning parameters (expose as dev-mode sliders)
- `input/LauncherDial.ts` — Rotary dial, keyboard, mouse wheel, touch
- `layouts/default.json` — Masamura gauge pin layout (200+ pins, walls, launch rail, exit zone, reserve space for LCD area and gates)
- `utils/constants.ts` — Collision categories
- `utils/bridge.ts` — Event bridge (emit ball:launched, ball:lost, dial:changed)
- `ui/StatsColumn.ts` — Stub: shows active ball count, total launched, FPS
- `ui/TopBar.ts` — Navigation tabs (Game active, History/Analysis disabled)
- `style.css` — Full Metaincognita design system
- `index.html` — Single page with all view containers

**Setup screen shows:** Title, a "Start Playing" button (no spec/theme selection yet — Phase 5). Clicking transitions to game screen. The setup screen is a DOM view (`views/SetupView.ts`), NOT a Phaser scene.

**Testing:** Balls launch, cascade through pins with chaotic deflection, exit bottom. Physics feel natural. Dial is responsive. FPS ≥ 58 desktop. Bridge events fire correctly. Stats column updates ball count.

---

### PHASE 2: Gates, Pockets & Digital Lottery

**Build/update these files:**
- `gates/StartChakker.ts` — Sensor body, triggers lottery spin
- `gates/PayoutGate.ts` — Opens/closes, sensor detects ball entry during payout
- `gates/TulipGate.ts` — Toggle wings, linked triggers
- `gates/SidePocket.ts` — Dead and minor payout sensors
- `lottery/LotteryEngine.ts` — RNG, spin queue (max 4), probability math
- `lottery/LotteryDisplay.ts` — 3-reel animation in Phaser (numbers 0–9 for now)
- `lottery/ReachSystem.ts` — Reach type selection, timing framework
- `lottery/SpinResult.ts` — Outcome types
- `state/GameStateMachine.ts` — Basic: IDLE → NORMAL → SPINNING → PAYOUT → NORMAL
- `economy/BallEconomy.ts` — Ball tracking (owned, in-play, won, lost). Start with 250 balls (free, no purchase UI yet — Phase 4 adds the virtual yen purchase system with ¥10,000 starting balance).
- Update `layouts/default.json` — Add gate positions, pocket positions, LCD display area
- Update `utils/bridge.ts` — Add spin:result, economy:updated events
- Update `ui/StatsColumn.ts` — Show ball economy, last spin result, mode indicator

**Testing:** Complete basic game loop. Chakker triggers lottery. Jackpots open payout gate. Ball economy tracks correctly. Reach animations have correct timing per tier.

---

### PHASE 3: Kakuhen, Jitan & Full State Machine

**Build/update these files:**
- `state/GameStateMachine.ts` — REWRITE with full state graph (add KAKUHEN, JITAN)
- `state/KakuhenController.ts` — Fever mode: boosted odds, spin counter, chain depth
- `state/JitanController.ts` — Fast cycle: normal odds, fast animation, spin countdown
- Update `lottery/LotteryEngine.ts` — Accept oddsMultiplier parameter, koatari support
- Update `lottery/LotteryDisplay.ts` — Animation speed multiplier for jitan
- Update `lottery/SpinResult.ts` — Add triggersKakuhen, jackpotType: 'full' | 'koatari'
- Update `ui/StatsColumn.ts` — Mode indicator (FEVER banner, chain depth, jitan countdown)
- Update `utils/bridge.ts` — Add mode:changed events
- Basic visual mode indicators on game canvas (border glow color change for fever)

**Testing:** Full mode cycle: NORMAL → jackpot → PAYOUT → KAKUHEN → chain jackpots → JITAN → NORMAL. Kakuhen odds are verifiably 10x. Chain depth tracks correctly.

---

### PHASE 4: Stats, History & Analysis

**Build/update these files:**
- `stats/SessionTracker.ts` — Collect all metrics: burn rate, cost/hour, chakker rate, etc.
- `stats/HeatmapTracker.ts` — Ball position sampling, 2D histogram. **This is the ONE stats element that draws on the Phaser canvas** (as an overlay aligned with pin positions). All other stats are DOM.
- `stats/HistoryLog.ts` — Full event log with timestamps
- `economy/BallEconomy.ts` — REWRITE: full purchase system with virtual yen. Starting balance: ¥10,000 (configurable). Purchase: 250 balls for ¥1,000. Exchange value: ¥2.5/ball.
- `economy/PurchaseUI.ts` — Ball purchase DOM interface
- `views/HistoryView.ts` — Sortable, filterable table. Color-coded rows. CSV export.
- `views/AnalysisView.ts` — Chart.js dashboard (probability convergence, net position, mode time, chain distribution, reach breakdown, launch power scatter)
- `ui/StatsColumn.ts` — FULL implementation: economy card, probability mini-chart, last 10 spins, quick toggles. **All DOM, not a Phaser scene** (per ADR-002).
- `ui/ChartManager.ts` — Chart.js wrapper for creating/updating charts
- Update `utils/bridge.ts` — Add ball:position events for heatmap
- RNG transparency mode: show predetermined outcome before animation in a small overlay

**Testing:** History table shows all events correctly. Analysis charts update and render. Probability convergence chart shows actual rate approaching theoretical over 500+ spins. CSV export works. Ball purchase system correctly deducts virtual yen. Economy stats translate ball counts to yen amounts.

---

### PHASE 5: Themes, Audio & Polish

**Build/update these files:**
- `themes/ThemeManager.ts` — Load manifests, swap assets, emit theme:changed
- `themes/manifests/classic-gold.json`, `themes/manifests/neon-drift.json` — 2 theme manifest files. System is extensible for future themes.
- `audio/AudioManager.ts` — Theme-aware, crossfade on mode changes
- `audio/SoundPool.ts` — Pin strike variants (4 samples) with pitch randomization (0.8–1.2x), volume scaled to ball velocity
- Update `views/SetupView.ts` — Full setup: spec selector cards (default: Balanced/Middle), theme picker (2 cards), settings. **This is a DOM view, NOT a Phaser scene.**
- Theme asset directories under `public/assets/themes/classic-gold/` and `public/assets/themes/neon-drift/`
- Accessibility: keyboard-only play, screen reader ARIA announcements, reduced motion (`prefers-reduced-motion` disables particles and reach animations)
- Responsive layout: 4 breakpoints (desktop wide ≥1400px, desktop narrow 1000–1399px, tablet 600–999px, mobile <600px)
- Metaincognita branding: logo, suite links, favicon, Open Graph metadata
- Performance optimization pass
- Netlify deployment config (`netlify.toml` with CSP headers from Doc 06)

**Testing:** Both themes load and switch mid-session. Audio crossfades on mode changes. Responsive at all breakpoints. Keyboard-only play works. Lighthouse: Performance ≥80, Accessibility ≥90.

---

## TESTING REQUIREMENTS (ALL PHASES)

### Unit Tests (Vitest)

Every phase must include unit tests for its new components. Key test areas:

- `LotteryEngine`: jackpot rate matches spec over 100,000 simulated spins (±15% tolerance)
- `LotteryEngine`: spin queue caps at 4
- `LotteryEngine`: reach type distribution produces correct conversion rates (~5% normal, ~30% super, ~60%+ premium) over 100,000 simulated spins
- `GameStateMachine`: only valid state transitions permitted
- `KakuhenController`: odds correctly multiplied, spin counter decrements
- `BallPool`: max balls enforced, despawn returns to pool
- `BallEconomy`: purchase/win/loss accounting is exact
- `LauncherDial`: power mapping is correct (0°→0%, 270°→100%)
- `TulipGate`: toggle logic correct (closed→open→closed)

### Manual Testing

- Physics feel natural — balls cascade chaotically, not robotically
- No balls get permanently stuck between pins
- Dial is responsive on desktop and mobile
- Stats column updates in real time
- History table populates correctly
- Analysis charts render and update
- Theme switching doesn't break game state
- Audio doesn't clip or loop awkwardly

---

## IMPORTANT IMPLEMENTATION NOTES

1. **Phaser canvas is isolated.** Phaser renders ONLY inside `<div id="game-container">`. It never manipulates DOM outside this container. All DOM UI is managed by the view classes in `src/views/` and `src/ui/`.

2. **The bridge is the only connection** between Phaser and DOM. Game events flow through `bridge.emit()` and `bridge.on()`. No direct DOM manipulation from Phaser scenes. No direct Phaser API calls from DOM views.

3. **RNG outcomes are predetermined.** The lottery animation is presentation only. The outcome is determined by `LotteryEngine.spin()` before any animation begins. This is how real pachinko machines work and is the core educational insight.

4. **Pin layout is data, not code.** The `default.json` file defines all pin positions, wall segments, gate locations, and pocket zones. The `PinField` class reads this file and creates physics bodies. New layouts can be added as JSON files.

5. **Themes are skins, not modes.** Themes change visuals and audio. They never affect physics, probability, game state, or ball economy. The `ThemeManager` emits `theme:changed`; rendering components respond by swapping asset references.

6. **Ball pooling is mandatory.** Never create/destroy Matter.js bodies during gameplay. Pre-create the maximum (30) and activate/deactivate them. This prevents garbage collection stalls.

7. **Stats column is always visible** on the game screen (desktop). It scrolls independently of the game canvas. On mobile, it's in a slide-up drawer.

8. **Match the other sims' UI.** Setup screen should look and feel like the Hold'em and Video Poker setup screens. Same dark mode, same color palette, same card-based option selection, same gold accent on headers. The game is different but the chrome is identical.

9. **Yarn, not npm or pnpm.** The Metaincognita casino suite uses Yarn.

10. **Deploy to Netlify as static SPA.** Build output is `dist/` with vanilla HTML/JS/CSS. No server-side components. Subdomain: `pachinko.metaincognita.com`.

---

## GLOSSARY

| Term | Meaning |
|---|---|
| Digipachi | Modern digital pachinko with LCD lottery |
| Start Chakker | Center gate triggering a lottery spin |
| Kakuhen | Fever mode — jackpot odds multiplied ~10x |
| Jitan | Fast-cycle mode — normal odds, fast animation |
| Koatari | Small jackpot — brief payout (2 rounds) |
| Reach | 2 of 3 reels match — suspense animation |
| Masamura Gauge | Standard Japanese pin arrangement pattern |
| Tulip Gate | Mechanical wing that toggles open/closed on ball entry |
| Payout Gate | Large gate at bottom, opens during jackpot rounds |
| Three-Shop System | Legal fiction: parlor → prize → exchange shop → cash |
| Pachi Puro | Professional pachinko player |

---

*PachinkoParlor — Metaincognita Casino Simulator Suite*
*"The pins are physics. The payoff is predetermined."*
