# Doc 11 — Architecture Decision Records

## PachinkoParlor

**Date:** April 5, 2026
**Status:** Complete

---

## ADR-001: Phaser 3 as Game Engine

**Decision:** Use Phaser 3 with built-in Matter.js physics for the game canvas.

**Context:** The other Metaincognita sims use Nuxt 4 + Nuxt UI 4, but pachinko requires real-time 2D physics simulation at 60fps — fundamentally different from the rules-engine card/dice games.

**Alternatives considered:**
- Plain Canvas + Matter.js (works but rebuilds game infrastructure from scratch)
- PixiJS + Matter.js (excellent renderer but no game loop, scene management, or audio)
- Godot HTML5 export (full engine but requires GDScript/C#, different ecosystem)
- Nuxt with canvas component (framework overhead with no benefit for game rendering)

**Rationale:** Phaser provides Matter.js integration, game loop, scene management, sprite/particle systems, audio pooling, and input abstraction out of the box. MIT licensed, free, well-documented, with an existing pachinko example.

---

## ADR-002: DOM + Phaser Split Architecture

**Decision:** Phaser renders only the game canvas. All surrounding UI (setup screen, stats column, history, analysis, navigation) is vanilla TypeScript + DOM.

**Context:** The initial design put everything in Phaser (including a MenuScene and StatsScene). Chris identified that the app should match the UI flow of the other Metaincognita sims: setup screen → game + stats → history → analysis.

**Alternatives considered:**
- All-Phaser (menu, stats, and analysis as Phaser scenes) — forces rebuilding standard UI components in a game engine
- Nuxt wrapping Phaser (Nuxt handles routing/UI, Phaser embedded) — adds framework complexity for a single-page app
- React/Vue SPA with Phaser component — lighter than Nuxt but still adds a framework dependency

**Rationale:** Vanilla DOM is the simplest solution for standard UI (forms, tables, charts, navigation). Phaser is the right tool for physics rendering. The GameBridge event bus cleanly decouples them. This matches how the other sims work (vanilla HTML/CSS/JS, no framework) while adding Phaser only where needed.

---

## ADR-003: Shared Metaincognita Design System

**Decision:** Use the exact CSS custom property palette from the Hold'em and Video Poker sims (`--bg-dark: #0d1117`, `--gold: #ffd700`, `--teal: #4ecdc4`, etc.).

**Context:** Chris wants all casino sims to have the same look and feel despite different game mechanics.

**Rationale:** A shared design system ensures suite coherence. Users moving between sims should feel they're in the same product family. The dark-mode palette with gold accents is established and works well for casino aesthetics.

---

## ADR-004: GameBridge Event Bus

**Decision:** A custom event bus (`bridge.ts`) is the only communication channel between Phaser and DOM.

**Context:** Phaser runs in its own rendering loop and manages its own scene graph. DOM UI needs to know about game events (spins, jackpots, mode changes, ball economy) to update stats, history, and analysis.

**Alternatives considered:**
- Direct DOM manipulation from Phaser scenes (violates separation, creates coupling)
- Shared global state object polled by DOM (inefficient, timing issues)
- Redux/Pinia-style store (adds framework dependency for a simple problem)

**Rationale:** A typed event emitter is the lightest-weight solution. Phaser scenes emit events; DOM components subscribe. No polling, no shared mutable state, no framework. Easy to test — mock the bridge in unit tests.

---

## ADR-005: Vite Without Framework

**Decision:** Use Vite as a build tool with no UI framework (no Nuxt, no React, no Vue).

**Context:** The app needs TypeScript compilation, HMR for development, and static output for Netlify. It doesn't need routing, SSR, reactive data binding, or component hydration.

**Rationale:** Vite provides everything needed (TS compilation, HMR, bundling, asset handling) without imposing opinions about application architecture. The app is a single HTML page with views shown/hidden via DOM. Adding a framework would be overhead with no benefit.

---

## ADR-006: JSON-Driven Pin Layouts

**Decision:** Pin field layouts are defined in JSON configuration files, not hardcoded in TypeScript.

**Context:** The pin layout determines how balls flow through the board and is the single most impactful design element for game feel.

**Rationale:** JSON layouts enable: iterative design (edit JSON, reload), multiple layouts, future community contributions, A/B testing of arrangements. The PinField class reads JSON and creates physics bodies — changing the layout requires no code changes.

---

## ADR-007: Theme Manifest System

**Decision:** Themes are self-contained directories with a JSON manifest and associated assets. A ThemeManager service loads and swaps them.

**Context:** Real pachinko machines are overwhelmingly themed. Chris requested themeable board faces with different visual/audio aesthetics.

**Rationale:** Manifest-driven themes decouple presentation from mechanics. New themes can be added by creating a directory — no engine code changes. Mid-session theme switching is supported because themes only affect rendering and audio, never physics or probability.

---

## ADR-008: Chart.js for Analysis Dashboard

**Decision:** Use Chart.js for the analysis page charts (probability convergence, economy graphs, distributions).

**Context:** The analysis page needs line charts, bar charts, pie charts, and scatter plots. These render in DOM, not in Phaser's canvas.

**Alternatives considered:**
- D3.js (more powerful but much steeper learning curve, overkill for standard chart types)
- Recharts (React-specific, not applicable without React)
- Canvas-based custom charts (reinventing the wheel)
- Phaser-rendered charts (wrong tool — charts should be in DOM, not game canvas)

**Rationale:** Chart.js is lightweight (~70KB gzipped), well-documented, handles all required chart types, renders to its own canvas elements in the DOM layer. Separate from Phaser. Tree-shakeable.

---

## ADR-009: No Persistent Storage

**Decision:** All game state is in-memory. No localStorage, no IndexedDB, no cookies. State is lost on page refresh.

**Context:** The simulator is a session-based educational tool, not a persistent game.

**Alternatives considered:**
- localStorage for session history (would allow cross-session analysis)
- IndexedDB for large datasets (heatmap data, full spin history)

**Rationale:** Simplicity. No storage means no data management, no migration, no privacy concerns, no GDPR implications. If cross-session persistence is desired in the future, it can be added as a non-breaking enhancement.

---

## ADR-010: 4:5 Canvas Aspect Ratio

**Decision:** The Phaser game canvas uses a 4:5 (800×1000) portrait aspect ratio.

**Context:** Real pachinko playing fields measure approximately 16"×20" based on glass cover dimensions from pachinkoman.com documentation.

**Alternatives considered:**
- 9:16 (phone-like portrait) — too narrow, wastes horizontal space on desktop
- 1:1 (square) — doesn't match real machine proportions
- 3:4 — close but slightly less faithful to real dimensions

**Rationale:** 4:5 closely matches real machine proportions and works well in a CSS grid layout with a 380px stats column on the right.

---

*PachinkoParlor — Doc 11: Architecture Decision Records*
