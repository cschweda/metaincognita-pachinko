# Doc 01 — Phase 1: Physics Board & Ball Launcher

## PachinkoParlor

**Phase:** 1 of 5
**Goal:** A playable physics sandbox — balls launch, cascade through pins, and exit the bottom. No lottery, no game modes, no economy. Pure physics.
**Date:** April 5, 2026
**Status:** Pending

---

## 1. Phase Objective

Phase 1 establishes the foundational physics simulation that everything else in the project depends on. If the balls don't cascade through pins in a way that looks and feels natural — satisfying chaotic bouncing with visible deflection patterns, not robotic or floaty — then no amount of lottery mechanics or theming will save the experience.

This phase delivers a working Phaser 3 + Vite + TypeScript project with a Matter.js physics world, a pin field layout, a ball launcher with rotary dial input, and basic ball lifecycle management. No game logic. No winning or losing. Just the physical board.

---

## 2. Project Scaffold

### 2.1 Initialize

```bash
yarn create vite pachinko-parlor --template vanilla-ts
cd pachinko-parlor
yarn add phaser
yarn add -D vitest eslint prettier @typescript-eslint/eslint-plugin @typescript-eslint/parser
```

### 2.2 Directory Structure

```
pachinko-parlor/
├── src/
│   ├── main.ts                    # App entry: init views, mount Phaser
│   ├── config.ts                  # Game config (dimensions, physics, rendering)
│   ├── views/                     # DOM-based views (NOT Phaser)
│   │   ├── ViewManager.ts         # Show/hide views, tab navigation
│   │   ├── SetupView.ts           # Setup screen (dark mode, centered options)
│   │   └── GameView.ts            # Game screen layout (mounts Phaser canvas + stats)
│   ├── scenes/                    # Phaser scenes (ONLY for game canvas)
│   │   ├── BootScene.ts           # Asset preloading
│   │   └── BoardScene.ts          # Primary physics scene
│   ├── physics/
│   │   ├── PinField.ts            # Pin layout loader and static body creation
│   │   ├── BallPool.ts            # Ball object pooling and lifecycle
│   │   └── PhysicsConfig.ts       # Matter.js tuning parameters
│   ├── input/
│   │   └── LauncherDial.ts        # Rotary dial input handler (Phaser input)
│   ├── ui/                        # DOM UI components
│   │   ├── StatsColumn.ts         # Right-side stats panel (DOM)
│   │   ├── TopBar.ts              # Navigation tabs + branding (DOM)
│   │   └── BottomBar.ts           # Ball count, volume, dial readout (DOM)
│   ├── layouts/
│   │   └── default.json           # Pin layout definition (Masamura gauge)
│   ├── types/
│   │   ├── physics.ts             # Physics-related type definitions
│   │   └── layout.ts              # Layout JSON schema types
│   └── utils/
│       ├── constants.ts           # Magic numbers, collision categories
│       └── bridge.ts              # Phaser ↔ DOM event bridge
├── public/
│   └── assets/
│       ├── images/                # Ball sprite, pin sprite (if not drawn)
│       └── audio/                 # (empty in Phase 1)
├── tests/
│   ├── physics/
│   │   ├── PinField.test.ts
│   │   └── BallPool.test.ts
│   └── input/
│       └── LauncherDial.test.ts
├── style.css                      # Global Metaincognita design system
├── index.html                     # Single page with all view containers
├── vite.config.ts
├── tsconfig.json
├── package.json
└── README.md
```

### 2.3 TypeScript Configuration

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

---

## 3. Deliverables

### 3.1 Phaser Game Instance (`main.ts`, `config.ts`)

Create the Phaser game with Matter.js physics enabled:

```typescript
// config.ts
export const GAME_CONFIG: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,           // WebGL preferred, Canvas fallback
  width: 800,                  // ~16" playing field width at scale
  height: 1000,                // ~20" playing field height (4:5 aspect)
  parent: 'game-container',
  backgroundColor: '#1a1a1a',
  physics: {
    default: 'matter',
    matter: {
      gravity: { y: 1.0 },
      debug: true,             // Phase 1: debug rendering ON
    },
  },
  scene: [BootScene, BoardScene],
};
```

The 800×1000 canvas targets the 4:5 aspect ratio derived from real playing field glass dimensions (16"×20").

### 3.2 Pin Field (`PinField.ts`, `layouts/default.json`)

**Layout JSON Schema:**

```typescript
interface PinLayout {
  name: string;
  version: string;
  dimensions: {
    width: number;     // playing field width in game units
    height: number;    // playing field height in game units
  };
  pins: Array<{
    x: number;
    y: number;
    radius?: number;   // defaults to PIN_RADIUS constant (2)
    type?: 'standard' | 'deflector' | 'guide';
  }>;
  walls: Array<{
    x1: number;
    y1: number;
    x2: number;
    y2: number;
    thickness?: number;
  }>;
  launchRail: {
    x: number;
    startY: number;
    endY: number;
    width: number;
  };
  exitZone: {
    y: number;         // y-coordinate below which balls are removed
  };
}
```

**Masamura Gauge Pattern:**
The default layout implements a Masamura-style gauge — an offset grid of pins where alternating rows are shifted by half the horizontal spacing. This creates the characteristic zigzag ball paths.

```
Row 0:  ○   ○   ○   ○   ○   ○   ○
Row 1:    ○   ○   ○   ○   ○   ○
Row 2:  ○   ○   ○   ○   ○   ○   ○
Row 3:    ○   ○   ○   ○   ○   ○
```

Pin spacing: ~32px horizontal, ~38px vertical (tunable). Total pin count: ~200–250 pins.

The layout must include:
- Dense pin region in the upper 60% of the board
- A clear zone in the center where the LCD display will go (Phase 2)
- Channel walls on both sides funneling balls inward
- A launch rail channel on the right side
- Side gutters where balls can drain without hitting anything

**Implementation:**
- Read `default.json` at scene creation
- Create Matter.js static circle bodies for each pin
- Create Matter.js static rectangle bodies for each wall segment
- Assign collision category `CATEGORY_PIN` to all pin bodies
- All pins are `isStatic: true` with configurable `restitution`

### 3.3 Ball Pool (`BallPool.ts`)

Object pooling for ball physics bodies. Creating and destroying Matter.js bodies every frame is expensive. Instead, maintain a pool of pre-created bodies that are activated/deactivated.

```typescript
interface BallPoolConfig {
  maxBalls: number;        // maximum simultaneous active balls (default: 30)
  ballRadius: number;      // in game units (~5px, representing 11mm)
  ballOptions: MatterJS.IBodyDefinition;
}
```

**Pool lifecycle:**
1. `spawn(x, y, velocity)` — activate a pooled body, set position and velocity
2. Active balls are updated by the physics engine automatically
3. When a ball exits the bottom (`y > exitZone.y`), call `despawn(ball)` — deactivate body, return to pool
4. If pool is exhausted and a spawn is requested, ignore the request (natural rate limiting)

**Ball physics properties (initial values, tunable):**

| Property | Value | Notes |
|---|---|---|
| `radius` | 5 | ~11mm at game scale (~2.5:1 ratio vs pin radius of 2, approximating real ~3.7:1 ratio) |
| `restitution` | 0.5 | Bounciness — the most critical tuning value |
| `friction` | 0.01 | Surface friction for rolling along channels |
| `frictionAir` | 0.001 | Air resistance — subtle but affects long drops |
| `density` | 0.004 | Mass relative to size (real: 5.75g for 11mm steel) |
| `collisionFilter.category` | `CATEGORY_BALL` | Collision filtering |
| `collisionFilter.mask` | `CATEGORY_PIN \| CATEGORY_WALL \| CATEGORY_BALL` | What balls collide with (includes BALL for ball-to-ball collisions, toggleable) |

### 3.4 Ball Launcher (`LauncherDial.ts`)

The launcher is the player's only control. It must feel responsive and tactile.

**Input modes:**

| Input | Action |
|---|---|
| Mouse drag on dial widget | Rotate dial to set power (0–270° maps to 0–100% power) |
| Mouse wheel | Fine power adjustment (±2% per tick) |
| Touch drag on dial widget | Same as mouse drag (mobile) |
| Arrow keys (Left/Right) | Fine power adjustment (±1% per tick) |
| Spacebar (hold) | Fire at current power setting |

**Launch behavior:**
- When dial is set above the dead zone (~20% power), balls fire automatically at a steady rate
- Fire rate: ~1 ball per second (configurable via `LAUNCH_INTERVAL_MS`)
- Ball spawns at the bottom of the launch rail with upward velocity
- Velocity direction: fixed angle (slightly left of vertical, aiming toward upper-left pin field)
- Velocity magnitude: linear map from dial position to velocity range

**Launch rail:**
A visual channel on the right side of the board. The ball accelerates up this channel (visual only — the ball is spawned at the top of the rail with the calculated velocity, the rail is cosmetic).

**Dial widget rendering:**
A circular dial in the lower-right of the canvas. Rendered as a Phaser graphics object — a circle with a notch indicator showing current rotation. Visual feedback: the dial glows or pulses when in the active firing zone.

### 3.5 Collision Categories (`constants.ts`)

```typescript
export const CATEGORY_BALL   = 0x0001;
export const CATEGORY_PIN    = 0x0002;
export const CATEGORY_WALL   = 0x0004;
export const CATEGORY_GATE   = 0x0008;  // reserved for Phase 2
export const CATEGORY_SENSOR = 0x0010;  // reserved for Phase 2
```

### 3.6 Dev-Mode Physics Tuning Panel

A temporary overlay (Phase 1 only, removed or hidden in production) with sliders for real-time physics parameter adjustment:

- Gravity Y (0.1–3.0)
- Ball restitution (0.0–1.0)
- Pin restitution (0.0–1.0)
- Ball friction (0.0–0.1)
- Ball air friction (0.0–0.01)
- Ball density (0.001–0.01)
- Launch interval (200ms–2000ms)
- Ball-to-ball collisions (toggle)

This panel is essential for finding the physics sweet spot. Values discovered here will become the production defaults.

### 3.7 HUD (Minimal)

Phase 1 HUD shows only:
- Active ball count (currently in the physics world)
- Total balls launched (session counter)
- FPS counter (for performance monitoring)

---

## 4. Ball-to-Ball Collisions

**Default: Enabled.**

In Phase 1, enable ball-to-ball collisions to evaluate their visual and performance impact. With up to 30 balls, worst-case collision pairs = 435 per frame. Matter.js uses broadphase spatial partitioning (grid or SAP) to reduce actual checks.

Monitor FPS on target devices:
- Desktop: should be trivial
- Mobile (2020+ smartphone): may require disabling if FPS drops below 50

The dev-mode panel includes a toggle to disable ball-to-ball collisions for comparison testing.

---

## 5. Testing Checklist

### Unit Tests (Vitest)

- [ ] `PinField` correctly parses layout JSON and creates expected number of static bodies
- [ ] `PinField` rejects malformed JSON with type-safe errors
- [ ] `BallPool` respects `maxBalls` limit — spawning beyond capacity returns null
- [ ] `BallPool.despawn()` returns body to pool and resets velocity/position
- [ ] `LauncherDial` maps 0° rotation to 0% power and 270° to 100% power
- [ ] `LauncherDial` dead zone: power below 20% produces zero velocity
- [ ] Collision categories are correctly assigned (balls collide with pins, not with other pins)

### Manual Testing

- [ ] Balls launch from the rail and enter the pin field at the correct trajectory
- [ ] Balls cascade through pins with visible, chaotic deflection — not straight lines
- [ ] Balls exit the bottom and are removed from the physics world
- [ ] No balls get "stuck" between pins indefinitely (if so, adjust pin spacing or restitution)
- [ ] Dial input feels responsive on both desktop (mouse) and mobile (touch)
- [ ] Arrow keys provide fine control for precise dial positioning
- [ ] Sustained firing (hold spacebar or hold dial position) produces a steady stream at ~1/second
- [ ] FPS stays above 55 with 30 simultaneous balls on desktop
- [ ] Physics tuning sliders produce visible, immediate changes to ball behavior

### Performance Targets

| Metric | Target |
|---|---|
| FPS (desktop, 30 balls) | ≥ 58 |
| FPS (mobile, 20 balls) | ≥ 50 |
| Ball spawn-to-exit time | 3–8 seconds (varies by path) |
| Memory (active balls) | < 5MB total physics state |

---

## 6. Testable Outcome

Player opens the simulator. A vertical board filled with brass-colored pins is visible. A rotary dial in the lower-right corner responds to mouse drag or touch. Rotating the dial past the dead zone causes balls to begin firing — silver spheres accelerating up the right-side launch rail and arcing into the upper-left pin field.

The balls cascade down through the pins with satisfying, unpredictable bouncing. Each ball takes a different path. Some rattle through dense pin clusters. Some find channels and slide briefly before re-entering the chaos. Some drain into the side gutters quickly. They exit at the bottom and disappear.

The physics feel *right* — not too bouncy (pinball), not too sluggish (mud), not too floaty (low gravity). The pins create genuine visual chaos where you can't predict which path a ball will take.

This is the foundation. Everything else is built on top of it.

---

*PachinkoParlor — Phase 1: Physics Board & Ball Launcher*
