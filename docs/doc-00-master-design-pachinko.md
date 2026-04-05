# Doc 00 — Master Design Document

## PachinkoParlor: A Physics-Based Pachinko Simulator

**Project:** PachinkoParlor
**Brand:** Metaincognita Casino Simulator Suite
**Version:** 0.1.0-design
**Date:** April 5, 2026
**Author:** Chris
**Status:** Design

---

## 1. Vision & Purpose

PachinkoParlor is a browser-based, physics-driven pachinko simulator that faithfully reproduces the experience of playing a modern Japanese "Digipachi" pachinko machine. Unlike the other simulators in the Metaincognita suite (Hold'em, Video Poker, Craps, Blackjack, Roulette), which are rules-engine simulators with UI layers, PachinkoParlor is fundamentally a **real-time physics game** — the ball cascading through pins is not decoration, it *is* the gameplay.

The simulator models both systems that define modern pachinko:

1. **The Physical Board** — A vertical playing field of ~200+ brass pins, channels, gates, and pockets through which 11mm steel balls cascade under gravity after being launched by the player's rotary dial. Ball physics are simulated via Matter.js (integrated through Phaser 3) with tuned restitution, friction, and collision filtering.

2. **The Digital Lottery** — When a ball enters the center "start chakker" gate, it triggers a 3-reel slot animation on a virtual LCD display. The lottery determines jackpots via RNG at configurable probability tiers (1/319, 1/199, 1/99). Jackpots trigger payout mode, which may cascade into kakuhen ("fever mode") — the chain-jackpot state that defines the emotional arc of a pachinko session.

### 1.1 Educational Mission

Consistent with the Metaincognita suite, PachinkoParlor serves an educational purpose. The simulator exposes the mathematical reality behind pachinko: the ball-level physics are genuinely chaotic (a Galton board distribution biased by pin layout), but the outcome that matters — whether you win or lose — is determined by a hidden RNG lottery triggered when balls enter the start chakker. The pin field creates the *experience*; the RNG creates the *result*.

The simulator will include:

- Real-time probability display showing expected jackpot frequency vs. actual hits
- Ball economy tracking (balls purchased, balls won, net position, burn rate per hour)
- Overlay mode exposing the RNG state and kakuhen probability chains
- Historical/cultural context about pachinko's role in Japanese society and gambling law

### 1.2 Suite Context

PachinkoParlor joins the Metaincognita casino simulator suite alongside:

- **NLH Hold'em** — Poker simulator
- **Video Poker** — Video poker simulator
- **Craps** — Dice simulator with full bet matrix
- **Blackjack** — Card game simulator
- **Roulette** — Roulette simulator (European/American/Triple Zero)

PachinkoParlor is the first simulator in the suite to use a game engine (Phaser 3) rather than a Nuxt application framework, reflecting the fundamentally different nature of real-time physics simulation vs. rules-engine card/dice games.

---

## 2. Technology Stack

### 2.1 Core Stack

| Layer | Technology | Version | License | Notes |
|---|---|---|---|---|
| **Game Engine** | Phaser 3 | 3.90.0 | MIT (free) | Last stable v3 release (May 2025). v4.0.0 is in RC7 as of March 2026 — adopt when stable. No subscription required. The paid Phaser Editor IDE and Compressor are optional tools not needed for this project. |
| **Physics** | Matter.js | (bundled) | MIT | Integrated into Phaser as `matter` physics plugin. No separate install. |
| **Build Tool** | Vite | 8.0.x | MIT | Latest stable. Uses Rolldown bundler. Fast HMR, TypeScript compilation, static output. |
| **Language** | TypeScript | 5.8.x | Apache-2.0 | Strict mode: `strict: true`, `noUncheckedIndexedAccess: true`, `exactOptionalPropertyTypes: true` |
| **Charts** | Chart.js | 4.4.x | MIT | Stats/analysis dashboard. Renders in DOM layer, separate from Phaser canvas. |
| **Rendering** | WebGL (Canvas fallback) | — | — | Phaser auto-detects. WebGL preferred for particle effects. |
| **Package Manager** | Yarn | latest | BSD-2 | Consistent with Metaincognita suite convention. **Not npm, not pnpm.** |
| **Deployment** | Netlify (static SPA) | — | — | Build output is vanilla HTML/JS/CSS. No SSR. Subdomain: `pachinko.metaincognita.com` |
| **Testing** | Vitest | 3.x | MIT | Unit tests for RNG, probability math, state machine, ball economy |
| **Linting** | ESLint | 9.x | MIT | Flat config format with `@typescript-eslint` |
| **Formatting** | Prettier | 3.x | MIT | Standard TypeScript config |
| **Node.js** | Node.js | 20.x LTS or 22.x | MIT | Required by Vite 8 |

### 2.2 Key Dependencies

```
phaser: 3.90.0             # Game engine (canvas only) — pin to exact version
vite: ^8.0.0               # Build tool (Rolldown bundler)
typescript: ^5.8.0          # Language
chart.js: ^4.4.0            # Stats/analysis charts (DOM layer)
vitest: ^3.0.0              # Testing
eslint: ^9.0.0              # Linting (flat config)
@typescript-eslint/eslint-plugin: ^8.0.0
@typescript-eslint/parser: ^8.0.0
prettier: ^3.0.0            # Formatting
```

**Note on Phaser versioning:** Phaser 3.90.0 is pinned to an exact version (no `^`) to prevent unexpected updates to the physics engine. Phaser 4.0.0 is in RC7 (March 2026) and shares a compatible API with v3. When v4 reaches stable release, evaluate migration — the main change is the Beam renderer, which should improve WebGL performance without requiring code changes.

### 2.3 Why Not Nuxt

The other Metaincognita simulators use Nuxt 4 + Nuxt UI 4 because they are **web applications** — form-driven UIs with state management, component trees, and reactive data binding. Pachinko is a **game** — a 60fps physics loop rendering to a canvas element. Nuxt provides routing, SSR, server middleware, SEO tooling, and component hydration, none of which serve a real-time physics simulation. Phaser provides what a game actually needs: a deterministic update/render loop, scene lifecycle management, physics engine integration, sprite and particle systems, audio pooling, and input abstraction.

### 2.4 Deployment Architecture

PachinkoParlor deploys as a standalone static site at `pachinko.metaincognita.com` (subdomain of the suite site). The build output from Vite is vanilla HTML + JS + CSS + assets. The Metaincognita main site links to it alongside the other simulators. No server-side components are required.

---

## 3. Architecture Overview

### 3.1 Dual-Layer Architecture: DOM + Phaser

PachinkoParlor uses a **split architecture** where the game canvas runs in Phaser 3 and all surrounding UI is vanilla TypeScript + DOM manipulation. This matches the UI pattern of the other Metaincognita simulators (Hold'em, Video Poker, Craps, Blackjack, Roulette) — dark-mode setup screen, game screen with stats column on the right, history page, analysis page — while using Phaser exclusively for the physics simulation that those other sims don't need.

```
┌─────────────────────────────────────────────────────────────┐
│                     DOM Layer (TypeScript + HTML/CSS)         │
│                                                              │
│  ┌──────────┐  ┌──────────────────────────────────────────┐ │
│  │  Setup    │  │  Game Screen                             │ │
│  │  Screen   │  │  ┌──────────────┐ ┌──────────────────┐  │ │
│  │ (DOM)     │  │  │ Phaser Canvas│ │  Stats Column    │  │ │
│  │           │  │  │ (game only)  │ │  (DOM)           │  │ │
│  │ - Spec    │  │  │              │ │  - Economy card  │  │ │
│  │ - Theme   │  │  │ Pin field    │ │  - Probability   │  │ │
│  │ - Settings│  │  │ Ball physics │ │  - Spin log      │  │ │
│  │           │  │  │ LCD lottery  │ │  - Mode indicator│  │ │
│  │           │  │  │ Gates        │ │  - Toggles       │  │ │
│  │           │  │  │ Launcher     │ │                  │  │ │
│  │           │  │  └──────┬───────┘ └────────┬─────────┘  │ │
│  │           │  │         │    GameBridge     │            │ │
│  │           │  │         └────────┬──────────┘            │ │
│  │           │  │                  │ (custom events)       │ │
│  └──────────┘  └──────────────────┴───────────────────────┘ │
│                                                              │
│  ┌──────────┐  ┌──────────────────────────────────────────┐ │
│  │ History   │  │  Analysis Page (DOM + Chart.js)          │ │
│  │ Page      │  │  - Probability convergence chart         │ │
│  │ (DOM)     │  │  - Net position over time                │ │
│  │ - Event   │  │  - Mode time distribution                │ │
│  │   table   │  │  - Fever chain histogram                 │ │
│  │ - Filters │  │  - Reach breakdown                       │ │
│  │ - CSV     │  │  - Launch power scatter                  │ │
│  └──────────┘  └──────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

**Key principle:** Phaser renders ONLY inside `<div id="game-container">` on the game screen. It never touches DOM outside that container. All surrounding UI — setup screen, stats column, top bar, history table, analysis charts — is standard DOM manipulation styled with the shared Metaincognita CSS custom properties.

### 3.2 Page Flow

The app has four views managed by showing/hiding DOM sections (no router):

| View | Content | Technology |
|---|---|---|
| **Setup Screen** | Spec tier selection, theme picker, settings, "Start Playing" button | DOM only |
| **Game Screen** | Phaser canvas (left) + scrollable stats column (right) + top bar + bottom bar | Phaser (canvas) + DOM (everything else) |
| **History** | Sortable, filterable table of all session events with CSV export | DOM only |
| **Analysis** | Dashboard of Chart.js charts (probability, economy, modes, heatmap) | DOM + Chart.js |

Navigation between views uses tab buttons in the top bar. The game state persists when switching to History or Analysis and back.

### 3.3 Phaser ↔ DOM Bridge

The `GameBridge` is a custom event bus connecting the Phaser world to the DOM UI. This is the ONLY connection between the two layers.

**Phaser emits:** `ball:launched`, `ball:lost`, `ball:chakker`, `spin:result`, `mode:changed`, `payout:round`, `economy:updated`, `ball:position` (for heatmap), `dial:changed`

**DOM listens:** `StatsColumn`, `HistoryLog`, `ChartManager`, `BottomBar` subscribe to bridge events and update their DOM elements.

No direct DOM manipulation from Phaser scenes. No direct Phaser API calls from DOM views.

### 3.4 Phaser Scenes (Game Canvas Only)

| Scene | Purpose |
|---|---|
| `BootScene` | Asset preloading for the selected theme |
| `BoardScene` | Primary gameplay: physics world, pin field, ball launcher, gates, pockets, LCD lottery display, mode visual indicators |

Note: `MenuScene` and `StatsScene` from earlier designs have been replaced by DOM views (`SetupView` and `StatsColumn`). The menu and stats are not Phaser scenes — they are standard HTML/CSS rendered outside the canvas.

### 3.5 Data Flow

```
Player Input (dial rotation — Phaser input)
    │
    ▼
Ball Launcher (velocity calculation)
    │
    ▼
Physics World (Matter.js step)
    │
    ├──► Ball enters Start Chakker → Digital Lottery Engine
    │         │                            │
    │         │ bridge.emit('ball:chakker') │
    │         ▼                            ▼
    │    DOM: StatsColumn updates     Spin resolves → bridge.emit('spin:result')
    │                                      │
    │                                 ┌────┴────────┐
    │                                 │              │
    │                              No jackpot     Jackpot → bridge.emit('mode:changed')
    │                                 │              │
    │                                 ▼              ▼
    │                           DOM: log entry   DOM: mode indicator, stats update
    │
    ├──► Ball exits bottom → bridge.emit('ball:lost') → DOM: economy update
    └──► Ball position sampled → bridge.emit('ball:position') → DOM: heatmap data

---

## 4. Major Systems

### 4.1 Physics Engine (Matter.js via Phaser)

The physics engine is the heart of the simulator. It manages all ball-pin interactions in real time.

**Static Bodies (Pins & Structure):**
- ~200–300 circular pin bodies arranged in the Masamura gauge pattern (the standard Japanese pin layout)
- Rectangular channel walls guiding ball flow
- Board boundary walls (left, right, bottom)
- Gate bodies (start chakker, side pockets, payout gate, tulip gates)
- Pin radius: ~2px at game scale (representing ~3mm brass nails)

**Dynamic Bodies (Balls):**
- Circular bodies representing 11mm steel balls (5.75g real weight; ~5px radius at game scale, yielding a ~2.5:1 ball-to-pin ratio that approximates the real ~3.7:1 ratio while remaining visually clear)
- Chrome-plated appearance (default); gold/brass variant available per theme
- Multiple balls in flight simultaneously (modern machines fire continuously)
- Ball pooling to manage memory (reuse physics bodies rather than create/destroy)
- Maximum active balls: ~30 on-screen at once

**Physics Tuning Parameters (Critical):**
These values determine whether the simulation *feels* right. They require extensive playtesting.

| Parameter | Initial Value | Notes |
|---|---|---|
| `gravity.y` | 1.0 | Standard gravity; may need scaling for visual speed |
| `ball.restitution` | 0.5 | Bounciness off pins; too high = pinball, too low = mud |
| `ball.friction` | 0.01 | Surface friction; affects rolling along channels |
| `ball.frictionAir` | 0.001 | Air resistance; subtle but affects long drops |
| `ball.density` | 0.004 | Mass relative to size; affects collision energy transfer |
| `pin.restitution` | 0.6 | Pin bounciness; slightly higher than ball for snappy deflection |
| `timeStep` | 1000/60 | 60fps physics step; Phaser manages this via `update30Hz()` or `update60Hz()` |

**Collision Categories:**
Following the Phaser/Matter.js pattern, collision filtering ensures correct interactions:

| Category | Collides With |
|---|---|
| `BALL` | `PIN`, `WALL`, `GATE`, `OTHER_BALL` (optional) |
| `PIN` | `BALL` |
| `WALL` | `BALL` |
| `GATE` | `BALL` |

Ball-to-ball collisions are optional. Real pachinko balls do collide, but with many balls in flight, this is expensive. Design decision: enable by default, provide toggle.

**Collision Events:**
The physics engine emits events when balls enter specific zones (implemented as Matter.js sensors — non-solid trigger bodies):

- `ball:enter:startChakker` — triggers digital lottery spin
- `ball:enter:sidePocket` — minor payout or dead pocket
- `ball:enter:payoutGate` — during payout mode, awards balls
- `ball:enter:tulipGate` — tulip-specific behavior
- `ball:exit:bottom` — ball lost, remove from world

### 4.2 Ball Launcher

The launcher is the player's **only control**. In a real machine, it's a spring-loaded rotary knob on the lower right.

**Input Model:**
- Desktop: Click-and-drag rotation on a circular dial widget, or mouse wheel
- Mobile: Touch-and-drag rotation on the dial
- Keyboard: Left/Right arrows for fine adjustment, or a held key for auto-fire

**Launch Mechanics:**
- The dial maps a rotation angle (0°–270°) to a launch velocity vector
- Direction is always upward-right along the launch rail (fixed angle, variable power)
- When the dial is held at a position, balls fire continuously at a configurable rate (~1 ball/second, matching real machines)
- A subtle visual launch rail shows the ball accelerating up the right side of the board before entering the pin field from the top

**Launch Power Zones:**
In real pachinko, finding the right dial position is the "skill" element. Too weak and balls don't reach the pin field. Too strong and they fly past the useful zone into the right gutter.

| Power Zone | Velocity Range | Ball Behavior |
|---|---|---|
| Dead (too weak) | 0–20% | Ball doesn't clear the launch rail |
| Low | 20–40% | Ball enters lower pin field, rarely reaches start chakker |
| Sweet Spot | 40–70% | Ball enters upper-left pin field, best chance at start chakker |
| High | 70–90% | Ball enters upper area, mixed results |
| Overshoot | 90–100% | Ball flies into right gutter, lost immediately |

### 4.3 Pin Field / Board Layout

The board layout is the most artistically critical component. It determines how balls flow, where they cluster, and how often they reach the start chakker.

**Masamura Gauge:**
Named after its inventor, the Masamura gauge is the standard Japanese pin arrangement — a dense grid of pins with specific channel gaps that create deterministic-looking but chaotic ball paths. The layout is not a uniform grid; it has designed lanes, dead zones, and bias regions.

**Board Regions:**

```
┌───────────────────────────────┐
│ ○ Launch Rail (right side)    │
│         ┌─────────────────┐   │
│         │  Upper Pin Field │   │
│         │  (dense, chaotic)│   │
│         └────────┬────────┘   │
│    ┌─────────────┼───────┐    │
│    │     LCD     │       │    │
│    │   Display   │  Pin  │    │
│    │   (Lottery) │ Field │    │
│    │             │       │    │
│    └─────────────┘       │    │
│         ┌────────────────┐    │
│    [SP] [  Start Chakker ] [SP]│
│         └────────────────┘    │
│                               │
│    ┌─────────────────────┐    │
│    │  Lower Pin Field     │    │
│    │  (funneling toward   │    │
│    │   payout gate)       │    │
│    └──────────┬──────────┘    │
│        [Payout Gate]          │
│   ════════════════════════    │
│         Ball Exit             │
└───────────────────────────────┘

[SP] = Side Pockets
```

**Design Approach:**
Rather than attempting to reverse-engineer a specific real machine's pin layout (which would be impractical without physical measurement), the board layout will be designed to produce authentic *behavior*:

- Balls entering the upper-left zone should have a ~15–25% chance of reaching the start chakker
- The pin density should create visible "chaos" — balls bouncing unpredictably between pins
- Channel gaps should create brief moments of directed flow before the ball re-enters the chaotic zone
- Dead zones (gutters) should exist on both sides where balls drain without hitting anything interesting

The layout will be defined in a JSON configuration file, making it possible to create alternative board layouts in the future.

### 4.4 Digital Lottery Engine

The digital lottery is the second game system. It runs independently of the physics engine but is triggered by physics events (ball entering start chakker).

**Lottery Mechanics:**

1. Ball enters start chakker → spin is queued (max 4 queued spins)
2. Reels spin: three columns of symbols (numbers 0–9, or themed symbols)
3. RNG determines outcome *before* animation begins (the animation is presentation, not determination)
4. If outcome is jackpot (3 matching symbols), play jackpot animation
5. If 2 of 3 match, play "reach" animation (extended suspense before final reel resolves)
6. If no match, play quick stop animation, award 3 balls

**Probability Tiers (Machine Specs):**

| Spec | Jackpot Odds | Kakuhen Rate | Target Audience |
|---|---|---|---|
| **High Spec** | 1/319 | 65% | High risk / high return |
| **Middle Spec** | 1/199 | 50% | Balanced |
| **Sweet (Amadare)** | 1/99 | 40% | Low risk / low return; beginners |

The player selects a spec tier before starting a session, or the simulator defaults to High Spec (the most common in Japanese parlors).

**Reach System:**
When 2 of 3 reels match, the machine enters a "reach" state with extended animation before the third reel resolves. This is pure theater — the outcome is already determined — but it's the emotional core of pachinko. The simulator will implement:

- **Normal Reach:** Brief pause, third reel slows and stops. ~5% of reaches result in jackpot.
- **Super Reach:** Extended animation sequence, dramatic music change, visual effects. ~30% of super reaches result in jackpot.
- **Premium Reach:** Rare, elaborate animation. ~60%+ of premium reaches result in jackpot.

The reach type is selected *after* the outcome is determined, so that the distribution of reach types matches the expected jackpot rates. This is how real machines work — the spectacle is calibrated to the probability.

**Lottery Display Rendering:**
The LCD screen renders as a layered rectangle in the center of the board, overlaying the pin field. During normal play, it may show ambient animation (themed imagery). During a spin, it shows the 3-reel animation. The display is rendered using Phaser's sprite/tween system, not a separate DOM element.

### 4.5 Game State Machine

The game state machine coordinates transitions between play modes. This is the central control flow of the entire simulator.

```
                    ┌──────────┐
                    │  IDLE    │ (no balls loaded)
                    └────┬─────┘
                         │ player loads balls
                         ▼
                    ┌──────────┐
              ┌────►│  NORMAL  │◄──────────────────────┐
              │     └────┬─────┘                        │
              │          │ ball enters start chakker     │
              │          ▼                              │
              │     ┌──────────┐                        │
              │     │ SPINNING │ (lottery in progress)   │
              │     └────┬─────┘                        │
              │          │                              │
              │     ┌────┴────┐                         │
              │     │         │                         │
              │   lose      jackpot                     │
              │     │         │                         │
              │     │         ▼                         │
              │     │    ┌──────────┐                   │
              │     │    │ PAYOUT   │ (gate open,       │
              │     │    │ MODE     │  timed rounds)    │
              │     │    └────┬─────┘                   │
              │     │         │ payout ends             │
              │     │         │                         │
              │     │    ┌────┴──────────┐              │
              │     │    │               │              │
              │     │  kakuhen        jitan/normal      │
              │     │    │               │              │
              │     │    ▼               │              │
              │     │ ┌──────────┐       │              │
              │     │ │ KAKUHEN  │       │              │
              │     │ │ (FEVER)  │       │              │
              │     │ └────┬─────┘       │              │
              │     │      │ no jackpot  │              │
              │     │      │ within N    │              │
              │     │      │ spins       │              │
              │     │      ▼             │              │
              │     │ ┌──────────┐       │              │
              │     │ │  JITAN   │       │              │
              │     │ │(fast cyc)│◄──────┘              │
              │     │ └────┬─────┘                      │
              │     │      │ jitan spins exhausted      │
              └─────┴──────┴────────────────────────────┘
```

**State Descriptions:**

| State | Behavior |
|---|---|
| `IDLE` | No balls loaded. UI prompts player to purchase balls. |
| `NORMAL` | Standard play. Balls launch, cascade through pins. Start chakker triggers lottery at base odds. |
| `SPINNING` | Lottery animation in progress. Up to 4 spins can queue. Physics continues. |
| `PAYOUT` | Jackpot hit. Payout gate opens for N rounds (typically 10 or 16 rounds, where each round ends when a timer expires or max balls are collected). Player should aim balls at the payout gate. |
| `KAKUHEN` | "Fever mode." Jackpot odds multiplied by 10x. Start chakker acceptance widened. Dramatic visual/audio change. Lasts until a jackpot is hit (chains into another PAYOUT) or a spin limit is reached. |
| `JITAN` | "Time reduction" mode. Normal odds, but spins resolve faster and start chakker acceptance is widened. Lasts for a fixed number of spins. Transitions to NORMAL when exhausted. |

### 4.6 Ball Economy Engine

The ball economy tracks the player's ball inventory and session economics.

**Core Metrics:**

| Metric | Description |
|---|---|
| `ballsOwned` | Current ball count in tray |
| `ballsPurchased` | Total balls bought this session |
| `ballsWon` | Total balls won from payouts |
| `ballsLost` | Total balls that exited the bottom or entered dead pockets |
| `ballsInPlay` | Currently in the physics world |
| `netPosition` | `ballsWon - ballsPurchased` (player's gain/loss) |
| `burnRate` | Balls lost per minute (rolling average) |
| `sessionDuration` | Time elapsed |

**Purchase System:**
The simulator uses a virtual currency model (no real money). The player "buys" balls in batches:

- 250 balls = ¥1,000 (displayed as virtual currency)
- The exchange rate (¥4/ball) matches the standard Japanese parlor rate
- The simulator tracks spending in virtual yen for educational comparison to real parlor economics

**Payout Rules:**

| Event | Ball Award |
|---|---|
| Normal spin (no jackpot) | 3 balls |
| Jackpot round (per ball entering payout gate) | 15 balls |
| Jackpot round count | 10 or 16 rounds (configurable by spec) |
| Koatari (small jackpot) | 2-round payout, gate opens briefly |

### 4.7 Audio System

Pachinko parlors are among the loudest indoor environments in the world. The audio design is essential to authenticity.

**Sound Categories:**

| Category | Examples |
|---|---|
| **Ball Physics** | Pin strikes (metallic tink, pitch varies with velocity), ball-on-ball clicks, launch rail acceleration, ball landing in tray |
| **Mechanical** | Tulip gate open/close, payout gate slam, dial rotation feedback |
| **Lottery** | Reel spin, reel stop, reach suspense music, jackpot fanfare, fever mode music loop |
| **Ambient** | Background parlor noise (optional, toggleable — not everyone wants the full assault) |

**Audio Implementation:**
Phaser's built-in audio manager handles loading, pooling, and spatialization. Pin strike sounds use a small pool of variant samples played at randomized pitch to avoid repetition artifacts. Volume scales with ball velocity at impact.

**Volume Control:**
A master volume slider and per-category mute toggles. Default: ball physics and mechanical at 70%, lottery at 100%, ambient off.

### 4.8 Theming System

In real pachinko parlors, every machine on the floor wears a different face. The overwhelming majority are licensed anime/game IP — Evangelion, Fist of the North Star, Resident Evil, Ghost in the Shell — but underneath the skin, the mechanics are identical within a given spec tier. The theme changes what you see and hear; the math doesn't change.

PachinkoParlor replicates this with a **theme layer** that is fully decoupled from the physics, lottery, and state machine engines. The player selects a theme before starting a session (or mid-session in the menu). Switching themes does not reset game state, ball economy, or session stats — it is purely cosmetic.

**What a Theme Controls:**

| Layer | Themed Elements |
|---|---|
| **Board Face** | Background artwork/texture behind the pins, border art, decorative overlays around the LCD display area |
| **LCD Display** | Reel symbols (numbers, icons, or themed glyphs), ambient animation during idle, reach animation sequences, jackpot celebration animation |
| **Color Palette** | Primary/secondary/accent colors applied to HUD, glow effects, fever mode lighting, pin highlights |
| **Audio** | Background music loop, spin sounds, reach music, super reach music, jackpot fanfare, fever mode music loop, ambient sound bed |
| **Particle Effects** | Jackpot burst style (fireworks vs. sparkles vs. geometric), fever mode ambient particles, ball trail color |
| **Typography** | LCD display font face for reel symbols and mode announcements |

**What a Theme Does NOT Control:**

- Pin layout / Masamura gauge pattern (physics)
- Probability tiers (1/319, 1/199, 1/99)
- Kakuhen / jitan / koatari mechanics
- Payout math
- Ball economy
- Game state transitions

**Theme Manifest:**

Each theme is a self-contained directory with a manifest file and associated assets:

```typescript
interface ThemeManifest {
  id: string;                    // e.g., 'neon-drift', 'ukiyo-e', 'deep-space'
  name: string;                  // Display name: "Neon Drift"
  description: string;           // Brief flavor text for menu
  author: string;                // Credit

  // Visual
  boardBackground: string;       // Asset key: board face image/texture
  borderArt: string;             // Asset key: decorative frame around the board
  lcdBackground: string;         // Asset key: LCD idle animation spritesheet
  reelSymbols: string;           // Asset key: spritesheet of reel symbols (10 frames)
  colorPalette: {
    primary: string;             // Hex color
    secondary: string;
    accent: string;
    feverPrimary: string;        // Fever mode override colors
    feverSecondary: string;
    pinColor: string;            // Pin tint (default: gold #C9A94E)
    ballTrailColor: string;      // Particle trail tint
  };

  // Animation
  reachAnimation: string;        // Asset key: normal reach spritesheet/sequence
  superReachAnimation: string;   // Asset key: super reach sequence
  premiumReachAnimation: string; // Asset key: premium reach sequence
  jackpotAnimation: string;      // Asset key: jackpot celebration sequence

  // Audio
  bgmNormal: string;             // Asset key: normal play music loop
  bgmFever: string;              // Asset key: fever mode music loop
  sfxReach: string;              // Asset key: reach trigger sound
  sfxSuperReach: string;         // Asset key: super reach trigger
  sfxJackpot: string;            // Asset key: jackpot fanfare
  sfxReelSpin: string;           // Asset key: reel spin loop
  sfxReelStop: string;           // Asset key: reel stop click

  // Metadata
  preview: string;               // Asset key: thumbnail for menu selection
}
```

**Bundled Themes (Original — No Licensed IP):**

Since PachinkoParlor cannot use licensed anime/game properties, the bundled themes are original designs that evoke different aesthetic registers. **Phase 5 ships with 2 themes.** The remaining 3 are documented here for future addition — the theme system is extensible by design.

| Theme ID | Name | Aesthetic | Mood | Status |
|---|---|---|---|---|
| `classic-gold` | Classic Gold | Traditional brass-and-wood, minimal LCD art, warm palette | Nostalgic, clean — the "default" experience | **Phase 5** |
| `neon-drift` | Neon Drift | Cyberpunk neon, dark board, glowing pins, synthwave audio | High-energy, modern | **Phase 5** |
| `ukiyo-e` | Ukiyo-e | Japanese woodblock print style, muted earth tones, traditional instrument audio | Contemplative, cultural | Future |
| `deep-space` | Deep Space | Dark cosmos background, star-field particles, orbital reel symbols, ambient electronic audio | Atmospheric, immersive | Future |
| `matsuri` | Matsuri | Festival theme — lantern colors, taiko-inspired audio, confetti particles on jackpot | Celebratory, vibrant | Future |

Additional themes can be added as self-contained directories without modifying any game engine code. The theme system is designed for extensibility.

#### 4.8.1 Theme Design Brief: Ukiyo-e (浮世絵)

The Ukiyo-e theme is the flagship aesthetic showcase for PachinkoParlor — the theme that demonstrates what the theming system can do when pushed beyond simple palette swaps. It draws from the late 19th-century twilight of the Japanese woodblock print tradition, specifically the Meiji era (1868–1912), when artists like Tsukioka Yoshitoshi and Kobayashi Kiyochika were creating some of the most dramatically composed prints in the tradition's history. All art is AI-generated original work *in the style of* ukiyo-e. No actual prints are reproduced. The style itself is a centuries-old public domain artistic tradition.

**Historical Register:**
Late ukiyo-e, not early. This means dramatic compositions influenced by Western perspective (Yoshitoshi's diagonals, Kiyochika's light effects), not the flat frontality of earlier Edo-period prints. The mood is contemplative but with undercurrents of drama — moonlit landscapes, wind-bent trees, figures caught in motion. This is the ukiyo-e of twilight, nostalgia, and intensity.

**Visual Language:**

| Element | Treatment |
|---|---|
| **Line** | Strong black sumi-ink outlines, varying weight. Confident, hand-carved quality — not perfectly smooth vector lines. |
| **Color** | Flat areas of saturated color within outlines, with bokashi (gradient shading) at edges. Limited palette per scene — no more than 6–8 colors per composition. |
| **Texture** | Visible wood-grain texture throughout (the ghost of the woodblock). Washi paper ground — warm cream, not pure white. |
| **Composition** | Asymmetric, dramatic. Diagonal movement. Figures and elements may be boldly cropped at frame edges. |
| **Cartouches** | Text labels in decorative bordered boxes (traditional title/artist cartouche style) used for HUD elements like ball count and mode announcements. |

**Color Palette:**

| Role | Color | Hex | Name |
|---|---|---|---|
| Primary | Deep indigo | `#1B3A4B` | *Ai* (藍) — the signature indigo of woodblock prints |
| Secondary | Vermillion | `#C1392B` | *Shu* (朱) — cinnabar red, used for seals and accents |
| Accent | Gold ochre | `#D4A853` | *Ki* (黄) — warm gold, used for highlights and cartouche borders |
| Background | Washi cream | `#F2E6D0` | The warm ivory ground of mulberry paper |
| Fever primary | Deep crimson | `#8B1A1A` | Intensified shu — danger, excitement |
| Fever secondary | Bright gold | `#FFD700` | Heightened ki — celebration, fortune |
| Pin color | Aged brass | `#B8860B` | Dark goldenrod — pins rendered as aged metal |
| Ball trail | Soft gold | `#DAA520` | Warm trail suggesting lantern light |

**Board Face:**
A landscape scene rendered in full ukiyo-e style — a wooden bridge arching over a river at dusk, distant mountains with bokashi gradient sky (indigo fading to rose-gold at the horizon), willows trailing into the water, a full moon. The scene fills the entire board behind the pins, with the pins appearing as dark brass points *over* the artwork. The LCD display area is framed by a decorative border rendered as a carved wooden cartouche.

The landscape should evoke Hiroshige's "53 Stations of the Tokaido" in spirit — a specific place, a specific time of day, weather and light — without reproducing any actual print.

**Reel Symbols (10 icons, rendered as woodblock-style vignettes):**

| Symbol | Motif | Notes |
|---|---|---|
| 0 | Wave (*nami*) | Curling Hokusai-style wave, indigo and white |
| 1 | Crane (*tsuru*) | Red-crowned crane in flight, wings extended |
| 2 | Cherry blossom (*sakura*) | Single branch with 5-petal blossoms and falling petals |
| 3 | Fan (*sensu*) | Folding fan, half-open, vermillion with gold ribs |
| 4 | Koi (*koi*) | Single carp leaping, gold and red |
| 5 | Moon (*tsuki*) | Full moon with wisp of cloud, against indigo |
| 6 | Lantern (*chōchin*) | Paper lantern glowing warm gold, with kanji |
| 7 | Pine (*matsu*) | Gnarled pine branch, dark green with exposed trunk |
| 8 | Bridge (*hashi*) | Arched wooden bridge, vermillion, over water |
| 9 | Mountain (*yama*) | Snow-capped peak with bokashi sky, evoking Fuji without being Fuji |

**Seven (7) is the jackpot symbol** — when three 7s (pine branches) align, it triggers the jackpot. The pine is traditional symbol of endurance and good fortune.

**Reach Animations:**

| Reach Type | Animation Description |
|---|---|
| **Normal Reach** | Two matching symbols lock. Third reel slows. The board face subtly animates — a breeze moves the willow branches, ripples cross the water. Third reel resolves. Brief. |
| **Super Reach** | The LCD display expands to fill more of the board. The landscape transitions from dusk to full night — the moon brightens, lanterns appear along the bridge. A figure (back turned, in kimono, wind-billowed) appears on the bridge in Yoshitoshi's dramatic diagonal style. Third reel resolves with deliberate slowness. |
| **Premium Reach** | Full dramatic sequence. Storm clouds roll across the sky. Lightning illuminates the mountains. The river surges. The figure on the bridge turns — revealing a mask (Noh theater style, but original design). Thunder crack. Third reel slams into place. The entire board flashes gold if jackpot hits. |

**Jackpot Celebration:**
All pins briefly illuminate to gold. The board face transitions to a dawn scene — the storm clears, golden light floods the landscape, cherry blossoms scatter across the entire playing field as particle effects. The cartouche-style HUD displays "大当たり" (ōatari — jackpot) in calligraphic brush font.

**Fever Mode Visual Shift:**
The entire board face transforms. The calm dusk landscape is replaced by a nighttime festival scene — the bridge is now lined with glowing lanterns, the river reflects fire-light in vermillion and gold, the sky is deep indigo with scattered stars. Pins shift from aged brass to bright gold. Ball trails change from soft gold to warm vermillion. The cartouche borders pulse with a subtle glow.

**Audio Design:**

| Context | Sound | Character |
|---|---|---|
| Normal BGM | Shakuhachi (bamboo flute) solo with ambient water sounds | Meditative, spacious, unhurried |
| Fever BGM | Full ensemble — shamisen (plucked), shakuhachi, taiko drums at moderate tempo | Energetic but dignified, festival-like without being frantic |
| Reel spin | Wooden prayer bead clacking (*juzu*), rhythmic | Tactile, organic, distinctly non-electronic |
| Reel stop | Sharp hyōshigi (wooden clappers) strike | Clean, decisive — the kabuki theater "clack" |
| Reach trigger | Single shakuhachi note, ascending, with reverb | Tension, anticipation |
| Super Reach | Taiko crescendo roll, building | Drama escalating |
| Jackpot fanfare | Full ensemble burst — taiko hit, shamisen flourish, temple bell (*kane*) ring with long sustain | Triumph, resonance, the bell tone lingering |
| Pin strikes | High-pitched wooden tinks (bamboo-on-wood character rather than metallic) | Organic, warm — the pins sound like wood, not metal |
| Ball in tray | Ceramic click (like Go stones being placed) | Satisfying, clean |

**Typography:**
LCD display text uses a brush-style font with calligraphic weight variation for mode announcements ("大当たり", "FEVER", numbers). HUD text in cartouches uses a clean serif with Japanese typographic proportions. Reel symbols are rendered as images, not font glyphs.

**Asset Generation Notes:**
All visual assets are to be generated using AI image generation tools, with the following guidance:
- Request "ukiyo-e woodblock print style" with specific Meiji-era references
- Emphasize visible wood-grain texture, limited flat color, black outlines
- Avoid photorealism, avoid anime style, avoid digital smoothness
- Generate at 2x resolution for retina displays
- Board face: single large composition, ~2000×2500px at 2x
- Reel symbols: 10 individual icons, ~256×256px at 2x, transparent background
- Reach animations: sequence of keyframes (6–12 frames per animation), interpolated via Phaser tweens

**Theme Loading:**

Themes are loaded during `BootScene`. The selected theme's manifest is read, its assets are queued into Phaser's asset loader, and references are stored in a global `ThemeManager` service that the rendering and audio systems query at runtime. Switching themes mid-session triggers an asset swap — the `ThemeManager` emits a `theme:changed` event, and all themed rendering components (LCD display, board face, particle emitters, audio manager) respond by swapping their asset references. The physics world is unaffected.

---

## 5. Visual Design

### 5.1 Aesthetic Direction

The simulator aims for a **stylized realism** — not photorealistic, but clearly evoking a real pachinko machine rather than an abstract Plinko board.

**Board:**
- Dark wood or dark composite background (the traditional playing field material)
- Metallic gold/brass pins (small filled circles with subtle highlight)
- Chrome/silver structural channels and rails
- The LCD display area as a bright, high-contrast rectangle in the center

**Balls:**
- Silver/chrome spheres with a subtle specular highlight
- Motion blur or trail effect at high velocities (Phaser particle system)
- Subtle shadow beneath each ball for depth

**UI Chrome:**
- The launcher dial rendered as a tactile-looking circular control
- Ball tray at the bottom with visible ball count
- HUD elements (ball count, net position, current mode) in a clean overlay bar

**Fever Mode Visual Shift:**
When kakuhen activates, the entire visual palette shifts — border lighting changes to pulsing neon (red, gold), the LCD display background changes, particle effects intensify. This visual transformation signals the high-probability state.

### 5.2 Responsive Layout

The game canvas targets a **portrait aspect ratio** (approximately 4:5, matching the ~16"×20" real playing field dimensions). On desktop, the canvas is centered with educational stats panels flanking it. On mobile, the canvas fills the viewport in portrait mode.

| Viewport | Layout |
|---|---|
| Desktop (landscape) | Centered game canvas (portrait) + side panels for stats/controls |
| Tablet (portrait) | Full-width game canvas, stats in collapsible drawer |
| Mobile (portrait) | Full-viewport game canvas, minimal HUD overlay, stats in modal |

---

## 6. Phase Breakdown

### Phase 1 — Physics Board & Ball Launcher (Doc 01)

**Goal:** A playable physics sandbox — balls launch, cascade through pins, exit the bottom. No lottery, no game modes, no economy. Pure physics.

**Deliverables:**
- Phaser 3 + Vite + TypeScript project scaffold
- `BootScene` with asset loading
- `BoardScene` with Matter.js physics world
- Pin field layout (Masamura gauge pattern) defined in JSON, rendered as static circle bodies
- Board boundary walls
- Ball launcher with rotary dial input (desktop + mobile)
- Ball spawning, physics simulation, and removal on exit
- Ball pooling system
- Physics tuning interface (dev-mode sliders for restitution, friction, gravity)
- Basic HUD showing ball count
- Netlify deployment pipeline

**Testable Outcome:** Player rotates the dial, balls fire continuously, cascade through the pin field with satisfying chaotic bouncing, and exit at the bottom. Physics feel natural. Pin layout produces varied ball paths.

### Phase 2 — Gates, Pockets & Digital Lottery (Doc 02)

**Goal:** The core game loop — balls enter the start chakker, trigger lottery spins, and jackpots pay out.

**Deliverables:**
- Start chakker gate (sensor body triggering lottery)
- Side pockets (sensor bodies, minor payout or dead)
- Payout gate (opens/closes based on game state)
- Tulip gates (mechanical wing animation — toggle behavior: entering a closed tulip opens it, entering an open tulip closes it; some win pockets trigger tulips elsewhere on the board, creating chain-reaction mechanics)
- Digital lottery engine (RNG, probability tiers, spin queue)
- Lottery display rendering (3-reel animation within the board)
- Reach system (normal, super, premium reach animations)
- Jackpot detection and payout mode initiation
- Basic game state machine (NORMAL → SPINNING → PAYOUT → NORMAL)
- Ball economy: payout awards, ball tracking

**Testable Outcome:** Complete basic game loop. Balls enter start chakker, lottery spins, occasional jackpots trigger payout mode where the gate opens and balls entering it award more balls. Player can sustain play by winning balls.

### Phase 3 — Kakuhen, Jitan & Full State Machine (Doc 03)

**Goal:** The complete mode system that gives pachinko its dramatic arc.

**Deliverables:**
- Full game state machine (all states from §4.5)
- Kakuhen (fever mode): boosted odds, visual/audio transformation, chain jackpots
- Jitan (fast cycle mode): accelerated spin resolution, widened start chakker
- Koatari (small jackpot): brief payout gate opening
- Kakuhen probability configuration per spec tier
- Mode transition animations and visual indicators
- Fever mode visual overhaul (neon lighting, particle effects, palette shift)
- Mode-aware audio (different music/sounds per state)

**Testable Outcome:** A player can experience the full emotional arc: grinding in normal mode, hitting a jackpot, entering fever mode with chain jackpots, eventually falling back to normal. The mode transitions are visually and aurally dramatic.

### Phase 4 — Ball Economy, Stats & Education (Doc 04)

**Goal:** The educational layer that distinguishes this from a pure game.

**Deliverables:**
- Ball purchase system (virtual currency)
- Session economics tracking (all metrics from §4.6)
- Stats display via DOM `StatsColumn` and `AnalysisView` (per ADR-002 — stats are DOM, not a Phaser scene; only the heatmap overlay draws on the Phaser canvas)
- Expected vs. actual jackpot frequency graph
- Burn rate calculator (balls/minute, estimated session cost)
- RNG transparency mode (expose lottery state, show predetermined outcomes)
- "House edge" explainer specific to pachinko's unique economics
- Session history log

**Testable Outcome:** Player can toggle the stats overlay during play and see real-time probability math. The educational content accurately explains how pachinko's dual-system design (physics + RNG) creates the illusion of skill while outcomes are RNG-determined.

### Phase 5 — Themes, Audio & Menu System (Doc 05)

**Goal:** Production-quality experience with the full theming system, audio, machine selection, settings, and the Metaincognita brand integration.

**Deliverables:**
- Full `SetupView` (DOM) with machine/spec selection and **theme picker** (visual preview cards). Per ADR-002, this is a DOM view, not a Phaser scene.
- `ThemeManager` service: manifest loading, asset swapping, `theme:changed` event system
- **2 bundled themes:** Classic Gold (default), Neon Drift. Theme system is extensible for future additions (Ukiyo-e, Deep Space, Matsuri).
- Theme asset pipeline: board face textures, reel symbol spritesheets, reach/jackpot animation sequences, color palette application
- Mid-session theme switching without game state reset
- Full audio implementation (all categories from §4.7), theme-aware (each theme provides its own audio set)
- Volume controls and mute toggles
- Visual polish pass (ball trails, pin highlights, payout gate animation)
- Parlor ambiance mode (optional background noise)
- Responsive layout finalization (desktop side panels, mobile portrait)
- Performance optimization (ball pooling tuning, physics step optimization)
- Metaincognita branding and suite navigation
- README essay: pachinko's history, the three-shop system, cultural significance
- Accessibility: keyboard-only play, screen reader announcements for game state changes, reduced motion mode
- SEO metadata and Open Graph tags
- Final Netlify deployment configuration

**Testable Outcome:** Complete, polished simulator ready for public use. Player can select from 2 distinct themes (Classic Gold, Neon Drift) in the setup screen, switch themes mid-session without losing progress, and experience visually and aurally distinct presentations of the same underlying game. Full audio, multiple spec tiers, educational overlays, responsive across devices, branded as part of the Metaincognita suite. Theme system is ready for future theme additions as self-contained asset directories.

---

## 7. Key Design Decisions

### 7.1 Physics Fidelity vs. Performance

**Decision:** Target 60fps with up to 30 simultaneous balls on mid-range hardware (2020+ smartphone, any modern desktop).

**Trade-offs:**
- Ball-to-ball collisions are enabled by default but toggleable. With 30 balls, this adds ~30×29/2 = 435 potential collision pairs per frame. Matter.js handles this efficiently with spatial partitioning, but mobile devices may struggle.
- Pin count is fixed at load time (no dynamic pin creation/destruction).
- Physics runs at 60Hz, synchronized with render. If frame rate drops, physics step size increases rather than skipping frames (prevents balls tunneling through pins).

### 7.2 RNG Transparency

**Decision:** The RNG outcome is determined *before* the lottery animation plays, matching real machine behavior. In educational mode, the predetermined outcome is displayed before the animation, letting the player see that the "suspense" is manufactured.

This is the single most important educational insight the simulator offers: the pins are physics, but the payoff is predetermined.

### 7.3 No Real Money, No Gambling

**Decision:** PachinkoParlor uses virtual currency only. There is no real-money purchase, no token system, no exchange mechanism. The "buy balls" flow uses fictional yen amounts for educational comparison to real parlor economics. The simulator includes responsible gambling messaging in the educational overlay, consistent with the Metaincognita suite's approach.

### 7.4 Board Layout as Data

**Decision:** The pin field layout is defined in a JSON configuration file rather than hardcoded. This enables:
- Future alternative board layouts
- Community-contributed layouts
- A/B testing of pin arrangements for physics feel
- Potential board editor tool (stretch goal, not in initial scope)

The JSON format defines pin positions, radii, gate locations, pocket zones, and channel walls as typed arrays of coordinates.

### 7.5 Original Themes, No Licensed IP

**Decision:** Real pachinko machines are overwhelmingly themed around licensed anime/game IP (Evangelion, Fist of the North Star, Resident Evil, etc.). PachinkoParlor ships with five original themes (see §4.8) that evoke different aesthetic registers — traditional, cyberpunk, classical Japanese, cosmic, festival — without reproducing any licensed characters, logos, or imagery. The theming system is architecturally decoupled from game mechanics, mirroring how real machines work: the skin changes, the math doesn't. The educational content discusses the role of licensed IP in pachinko's business model without reproducing any of it. The theme system is extensible, so additional original themes can be added as asset directories without engine changes.

---

## 8. Configuration Schema

The simulator is configured via a machine spec object. Multiple presets are provided, and advanced users can modify parameters.

```typescript
interface MachineSpec {
  // Identity
  name: string;
  tier: 'high' | 'middle' | 'sweet';

  // Lottery
  jackpotOdds: number;          // e.g., 319 (meaning 1/319)
  kakuhenRate: number;          // 0.0–1.0, probability that jackpot triggers kakuhen
  kakuhenOddsMultiplier: number; // e.g., 10 (odds become 1/31.9 during kakuhen)
  kakuhenSpinLimit: number;     // max spins in kakuhen before fallback to jitan
  jitanSpinCount: number;       // number of spins in jitan mode
  payoutRounds: number;         // rounds per jackpot (10 or 16)
  payoutBallsPerEntry: number;  // balls awarded per ball entering payout gate
  normalSpinPayout: number;     // balls awarded per non-jackpot spin (typically 3)
  koatariRate: number;          // probability of koatari vs full jackpot

  // Reach
  reachRate: number;            // probability of entering reach on non-jackpot spin
  superReachRate: number;       // probability of super reach given reach
  premiumReachRate: number;     // probability of premium reach given reach

  // Physics
  pinLayout: string;            // reference to JSON layout file
  launcherPowerRange: [number, number]; // min/max velocity

  // Ball Economy
  ballCost: number;             // virtual yen per ball (typically 4)
  purchaseBatchSize: number;    // balls per purchase (typically 250)

  // Audio
  themeMusic: string;           // asset key for lottery/fever music

  // Theme
  defaultTheme: string;         // theme ID (e.g., 'classic-gold'); see ThemeManifest
}
```

**Preset Specs (authoritative per-tier values):**

| Preset | Odds | Kakuhen Rate | Kakuhen Multiplier | Kakuhen Spin Limit | Payout Rounds | Jitan Spins | Default Theme | Notes |
|---|---|---|---|---|---|---|---|---|
| `HIGH_SPEC_STANDARD` | 1/319 | 65% | 10x | 100 | 10R | 100 | `neon-drift` | The classic high-risk experience |
| `MIDDLE_SPEC_BALANCED` | 1/199 | 50% | 10x | 80 | 10R | 80 | `classic-gold` | Balanced for longer sessions |
| `SWEET_BEGINNER` | 1/99 | 40% | 8x | 60 | 8R | 50 | `classic-gold` | Frequent small wins, good for learning |

The default theme is a suggestion — the player can override it with any installed theme from the theme picker. Default spec for first-time players: `MIDDLE_SPEC_BALANCED`.

---

## 9. Document Suite Index

| Doc | Title | Status |
|---|---|---|
| **00** | Master Design Document (this document) | ✅ Complete |
| **01** | Phase 1: Physics Board & Ball Launcher | ✅ Complete |
| **02** | Phase 2: Gates, Pockets & Digital Lottery | ✅ Complete |
| **03** | Phase 3: Kakuhen, Jitan & Full State Machine | ✅ Complete |
| **04** | Phase 4: Ball Economy, Stats & Education | ✅ Complete |
| **05** | Phase 5: Themes, Audio & Menu System | ✅ Complete |
| **06** | Security Considerations | ✅ Complete |
| **07** | LLM Build Prompt | ✅ Complete |
| **08** | Competitive Landscape & Differentiation | ✅ Complete |
| **09** | Website & Deployment | ✅ Complete |
| **10** | Revision & Gap Analysis | ✅ Complete |
| **11** | Architecture Decision Records | ✅ Complete |
| **12** | Use Cases & User Journeys | ✅ Complete |
| **A** | Historical & Cultural Research (Appendix) | ✅ Complete |

### 9.1 Document Files

| Doc | Filename | Size |
|---|---|---|
| 00 | `doc-00-master-design-pachinko.md` | ~960 lines |
| 01 | `doc-01-phase1-physics.md` | ~230 lines |
| 02 | `doc-02-phase2-lottery.md` | ~220 lines |
| 03 | `doc-03-phase3-modes.md` | ~185 lines |
| 04 | `doc-04-phase4-stats.md` | ~260 lines |
| 05 | `doc-05-phase5-themes.md` | ~215 lines |
| 06 | `doc-06-security.md` | ~110 lines |
| 07 | `doc-07-llm-build-prompt.md` | ~590 lines |
| 08 | `doc-08-differentiation.md` | ~90 lines |
| 09 | `doc-09-deployment.md` | ~120 lines |
| 10 | `doc-10-revision.md` | ~100 lines |
| 11 | `doc-11-architecture.md` | ~145 lines |
| 12 | `doc-12-use-cases.md` | ~185 lines |
| A | `appendix-a-history.md` | ~255 lines |
| | **Total** | **~3,900 lines** |

### 9.2 Phase Dependencies & Build Order

```
Phase 1 ──► Phase 2 ──► Phase 3 ──┬──► Phase 4
(Physics)   (Lottery)   (Modes)   │    (Stats)
                                   │
                                   └──► Phase 5
                                        (Themes)
```

**Strictly sequential (must build in order):**

| Build Order | Phase | Reason |
|---|---|---|
| 1st | **Phase 1** — Physics Board & Ball Launcher | Foundation. Everything depends on the Phaser canvas, pin field, ball physics, and launcher input. Cannot be parallelized with anything. |
| 2nd | **Phase 2** — Gates, Pockets & Digital Lottery | Depends on Phase 1's physics world to place gates and sensors. The lottery engine and basic state machine build on top of the ball lifecycle. |
| 3rd | **Phase 3** — Kakuhen, Jitan & Full State Machine | Depends on Phase 2's lottery engine and basic state machine. Extends the state graph with fever/jitan modes. |

**Can be parallelized after Phase 3:**

| Phase | Can Start After | Can Run In Parallel With | Notes |
|---|---|---|---|
| **Phase 4** (Stats) | Phase 3 | Phase 5 | Stats collection and DOM views (history table, analysis charts) depend on the full game loop with all modes. However, the DOM views and Chart.js integration are entirely independent of the theme system. |
| **Phase 5** (Themes) | Phase 3 | Phase 4 | Theming affects rendering and audio, not stats or game logic. Requires the full game loop for testing, but the ThemeManager, audio system, and setup screen have no dependencies on the stats system. |

**Asset production can happen any time:**
- **Theme art** (board faces, reel symbols, reach animations) can be generated with AI image tools during any phase.
- **Audio assets** (pin strikes, lottery sounds, theme music) can be sourced or synthesized during any phase.
- **Pin layout design** (`default.json`) is ideally refined during Phase 1 but continues to be tuned throughout all phases.

**Recommended build sequence for a single developer:**
Phase 1 → Phase 2 → Phase 3 → Phase 4 → Phase 5 (strictly sequential, each building on the last)

**Recommended build sequence for two developers:**
Developer A: Phase 1 → Phase 2 → Phase 3 → Phase 5 (game engine + theming)
Developer B: (waits for Phase 3) → Phase 4 (stats/history/analysis DOM work)

---

## 10. Open Questions (Status)

1. **Ball-to-ball collisions:** ✅ Resolved — Enable by default with performance toggle. Doc 01 §4 establishes this with a dev-mode toggle. Disable on mobile if FPS drops below 50.

2. **Multiple board layouts:** ✅ Resolved — JSON-driven layouts from Phase 1. The JSON format is foundational, not deferred. See Doc 01 §3.2.

3. **Lottery animation complexity:** ✅ Resolved — Minimal in Phase 2 (spinning numbers, basic reach timing). Elaborate theme-specific animations in Phase 5 for the two bundled themes, scaled to available art assets.

4. **Sound asset sourcing:** Open — Decide during Phase 5. Recommend synthesized + royalty-free library. Pin strike sounds need 4 metallic variants with pitch randomization.

5. **Metaincognita suite integration depth:** ✅ Resolved — Subdomain link + cross-simulator navigation bar. No iframe. See Doc 09 §4.

6. **Historical/cultural README scope:** ✅ Resolved — Full depth, consistent with the suite tradition. Appendix A provides the research. Topics: post-war history, three-shop system, zainichi Korean community, yakuza connections, pachi puro, problem gambling.

---

## 11. Glossary

| Term | Definition |
|---|---|
| **Digipachi** | Modern digital pachinko machine with LCD lottery display |
| **Hane-mono** | Classic analog pachinko machine without digital lottery |
| **Start Chakker** | Center gate/pocket that triggers a lottery spin when a ball enters |
| **Kakuhen (確変)** | "Probability change" — fever mode where jackpot odds are multiplied, typically by 10x |
| **Jitan (時短)** | "Time reduction" — mode where spins resolve faster and start chakker acceptance is widened |
| **Koatari (小当たり)** | "Small jackpot" — brief payout with short gate opening |
| **Reach (リーチ)** | State where 2 of 3 lottery reels match, triggering suspense animation before final reel resolves |
| **Super Reach** | Extended reach animation with higher jackpot correlation |
| **Masamura Gauge** | Standard Japanese pin arrangement pattern, named after its inventor |
| **Tulip Gate** | Mechanical wing gate that toggles open/closed — a ball entering a closed tulip opens it, a ball entering an open tulip closes it. Some win pockets trigger tulips elsewhere on the board. |
| **Payout Gate** | Large gate at bottom that opens during jackpot rounds to collect balls for payout |
| **Three-Shop System** | The legal fiction enabling cash gambling: parlor → prize → separate exchange shop → cash |
| **CR Machine** | "Card Reader" machine — modern pachinko that accepts prepaid cards rather than cash directly |

---

## 12. References

| Source | URL | Notes |
|---|---|---|
| **Pachinko Man** | pachinkoman.com | Parts diagrams, owner's manuals (vintage Nishijin A/B/C, Daiichi, Sankyo, Sanyo), FAQ with ball specs and playing field glass dimensions |
| **Wikipedia: Pachinko** | en.wikipedia.org/wiki/Pachinko | Kakuhen/jitan/koatari mechanics, probability specs, history |
| **Global Pachinko** | info.global-pachinko.com | Hane-mono vs Digipachi classification, spec tiers, modern machine types |
| **Phaser 3 Matter.js Pachinko Example** | phaser.io/examples/v3.85.0/physics/matterjs/view/pachinko | Reference implementation: collision categories, pin grid layout, ball spawning |
| **Vintage Pachinko (nicole.express)** | nicole.express/2023/pachi-man-pachi-man-does-whatever-a-pachi-can.html | Model A/B/C internal mechanics, tulip gate design, seesaw payout mechanism |

---

*PachinkoParlor — Metaincognita Casino Simulator Suite*
*"The pins are physics. The payoff is predetermined."*
