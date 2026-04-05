# Doc 05 — Phase 5: Themes, Audio & Menu System

## PachinkoParlor

**Phase:** 5 of 5
**Depends on:** Phase 4 (all game systems complete)
**Goal:** Production-quality experience — the full theming system with 2 bundled themes (extensible to more later), complete audio design, machine spec selection, responsive layout, accessibility, and Metaincognita brand integration.
**Date:** April 5, 2026
**Status:** Pending

---

## 1. Phase Objective

Phases 1–4 deliver a functional, educational pachinko simulator with placeholder visuals and minimal audio. Phase 5 transforms it into a polished product: two visual themes (each a distinct aesthetic world, with the theme system designed for easy addition of more), comprehensive audio design, a welcoming setup screen, responsive layout across devices, accessibility features, and the Metaincognita branding that ties it into the suite.

This is the phase where PachinkoParlor stops looking like a developer prototype and starts looking like something you'd share.

---

## 2. New Files

```
src/
├── themes/
│   ├── ThemeManager.ts              # Theme loading, switching, event system
│   ├── ThemeRegistry.ts             # Registers available themes
│   └── manifests/
│       ├── classic-gold.json
│       └── neon-drift.json
├── audio/
│   ├── AudioManager.ts              # Theme-aware audio management
│   └── SoundPool.ts                 # Pin strike sound pooling with pitch variance
├── ui/
│   ├── ThemePicker.ts               # Visual theme selection (cards)
│   ├── SpecSelector.ts              # Probability tier selection
│   ├── SettingsPanel.ts             # Volume, accessibility, display options
│   └── ResponsiveLayout.ts          # Viewport-aware layout manager
├── accessibility/
│   ├── ScreenReaderAnnouncer.ts     # ARIA live region announcements
│   ├── ReducedMotion.ts             # Respects prefers-reduced-motion
│   └── KeyboardNav.ts              # Full keyboard navigation
└── brand/
    ├── MetaincognitaBranding.ts     # Suite logo, navigation links
    └── README-content.ts            # Historical essay content
```

```
public/assets/
├── themes/
│   ├── classic-gold/
│   │   ├── board-face.png
│   │   ├── reel-symbols.png         # Spritesheet: 10 symbols
│   │   ├── reach-normal.png         # Reach animation frames
│   │   ├── reach-super.png
│   │   ├── reach-premium.png
│   │   ├── jackpot-celebration.png
│   │   └── audio/
│   │       ├── bgm-normal.mp3
│   │       ├── bgm-fever.mp3
│   │       ├── sfx-reach.mp3
│   │       ├── sfx-jackpot.mp3
│   │       ├── sfx-reel-spin.mp3
│   │       └── sfx-reel-stop.mp3
│   └── neon-drift/
│       └── ...                      # Same structure
├── audio/
│   ├── pin-strike-01.mp3            # Theme-independent physics sounds
│   ├── pin-strike-02.mp3
│   ├── pin-strike-03.mp3
│   ├── pin-strike-04.mp3
│   ├── ball-launch.mp3
│   ├── ball-tray-land.mp3
│   ├── gate-open.mp3
│   ├── gate-close.mp3
│   └── tulip-toggle.mp3
└── brand/
    ├── metaincognita-logo.svg
    └── favicon.ico
```

---

## 3. Deliverables

### 3.1 Theme Manager (`ThemeManager.ts`)

Central service managing theme state and asset swapping.

**API:**
```typescript
class ThemeManager {
  loadTheme(themeId: string): Promise<void>;  // Preload theme assets
  applyTheme(themeId: string): void;          // Swap all themed elements
  getCurrentTheme(): ThemeManifest;
  getAvailableThemes(): ThemeManifest[];

  // Event system
  on(event: 'theme:changed', callback: (theme: ThemeManifest) => void): void;
}
```

**Asset swap process:**
1. `loadTheme()` queues all theme assets into Phaser's loader
2. `applyTheme()` emits `theme:changed` event
3. Listeners (LotteryDisplay, BoardScene, AudioManager, ModeIndicator, particle emitters) swap their asset references
4. Physics world is untouched — pins, balls, gates are unaffected

**Mid-session switching:** Supported. No game state reset. The board face, LCD display, audio, and particle effects change. Balls in flight continue unaffected.

### 3.2 Two Bundled Themes (Extensible)

Phase 5 ships with two themes. The theme system is designed for easy addition of more (Ukiyo-e, Deep Space, Matsuri are candidates for future additions). Each theme is detailed in Doc 00 §4.8.

| Theme | Board Face | Reel Symbols | Reach Animations | Audio Tracks | Particle Preset |
|---|---|---|---|---|---|
| Classic Gold | Warm wood texture | Numeric (0–9, gold on black) | Minimal, clean | Neutral electronic | Gold sparkles |
| Neon Drift | Dark with neon grid lines | Geometric glyphs, neon glow | Glitch effects, color cycling | Synthwave, pulsing bass | Electric sparks, cyan trails |

### 3.3 Audio System (`AudioManager.ts`, `SoundPool.ts`)

**Pin strike sounds:** A pool of 4 variant samples played at randomized pitch (0.8–1.2x) to avoid repetition. Volume scales with ball velocity at impact. This is the most frequently triggered sound — it must feel natural, not annoying.

**Theme-aware music:** `AudioManager` subscribes to `theme:changed` and crossfades between music tracks. During mode transitions (NORMAL → FEVER), the BGM crossfades from `bgmNormal` to `bgmFever` over 1 second.

**Volume controls:**
- Master volume slider
- Per-category mute toggles: Ball Physics | Mechanical | Music | Lottery SFX | Ambient
- Defaults: Physics 70%, Mechanical 70%, Music 80%, Lottery 100%, Ambient off

### 3.4 Setup Screen (`views/SetupView.ts` — DOM, NOT a Phaser scene)

Per ADR-002, the setup screen is a DOM view, not a Phaser scene. It is managed by `ViewManager` alongside `GameView`, `HistoryView`, and `AnalysisView`.

**Screen flow:**
1. Splash: Metaincognita logo → PachinkoParlor title
2. Theme picker: two theme cards showing preview thumbnails. Selected theme highlighted.
3. Spec selector: three cards for High/Middle/Sweet with odds and description
4. Settings: volume, accessibility, display options
5. "Start Playing →" button → transitions to GameView (which mounts the Phaser canvas)

**Theme picker:** Each theme card shows a small preview of the board face, the theme name, a one-line description, and the mood tag. Selected theme is highlighted. Clicking loads the theme preview into a larger display area.

**Spec selector:** Three cards with clear labeling. Default selection: "Balanced" (best for first-time players).
- "High Risk" — 1/319 odds, 65% kakuhen, 10-round payout. "For the grind."
- "Balanced" — 1/199 odds, 50% kakuhen, 10-round payout. "A fair fight."
- "Gentle" — 1/99 odds, 40% kakuhen, 8-round payout. "Frequent small wins."

### 3.5 Responsive Layout (`ResponsiveLayout.ts`)

| Viewport | Layout |
|---|---|
| Desktop wide (≥1400px) | Game canvas (800×1000) centered, stats panels on both sides |
| Desktop narrow (1000–1399px) | Game canvas centered, stats in collapsible right panel |
| Tablet portrait (600–999px) | Game canvas full width, stats in bottom drawer |
| Mobile portrait (<600px) | Game canvas fills viewport, minimal HUD, stats in modal |

The game canvas always maintains 4:5 aspect ratio. Phaser's `Scale.FIT` mode handles this.

### 3.6 Accessibility

**Keyboard navigation:** Full game playable without mouse. Arrow keys for dial, spacebar for fire, tab for UI navigation, Enter for selection, Escape for menu/stats toggle.

**Screen reader:** ARIA live region announces state changes: "Spin result: no jackpot." "Jackpot! Entering payout mode. Round 1 of 10." "Fever mode activated. Odds boosted." "Session ended. You have zero balls remaining."

**Reduced motion:** Respects `prefers-reduced-motion` media query. When active: no particle effects, no reach animations (instant reel resolution), no board face transitions, no mode transition flashes. Game is fully functional without animation.

**Color:** Mode indicators use both color AND text/icon to convey state (not color-alone).

### 3.7 Metaincognita Branding

- Suite logo in the corner with link to metaincognita.com
- Navigation links to other simulators (Hold'em, Video Poker, Craps, Blackjack, Roulette)
- Consistent footer/branding bar across the suite
- Favicon and Open Graph metadata for social sharing

### 3.8 README Essay

A long-form essay for the project README, consistent with the Metaincognita tradition of contextualizing each simulator within gambling history and culture. See Appendix A (separate document) for historical research content.

---

## 4. Testing Checklist

- [ ] Both themes (Classic Gold, Neon Drift) load without errors
- [ ] Theme switching mid-session does not affect game state or ball economy
- [ ] Theme switching crossfades audio correctly
- [ ] Pin strike sounds play at varied pitch without audible repetition patterns
- [ ] Volume controls affect correct audio categories independently
- [ ] Setup screen flow: splash → theme picker → spec selector → game (DOM-based, not Phaser)
- [ ] All three spec tiers produce correct probability behavior
- [ ] Responsive layout works at all four viewport breakpoints
- [ ] Keyboard-only play is possible (launch, adjust dial, navigate menus)
- [ ] Screen reader announces all state changes
- [ ] Reduced motion mode disables all animations while keeping game functional
- [ ] Metaincognita branding links work
- [ ] Netlify deployment produces working static site
- [ ] Lighthouse score: Performance ≥80, Accessibility ≥90

---

## 5. Testable Outcome

Player opens PachinkoParlor. The Metaincognita logo appears briefly, then the setup screen (DOM, not a Phaser scene). Two theme cards glow on screen — Classic Gold's warm wood, Neon Drift's cyberpunk neon. They select Neon Drift. The preview updates to show the dark grid with glowing neon lines.

They choose Balanced Spec (1/199) — the default for first-timers — and start playing. The game canvas mounts and balls cascade through pins. The LCD display shows geometric glyphs with neon glow. Synthwave music pulses. A reach triggers: glitch effects and color cycling build suspense. The third reel lands. No jackpot.

Later, fever mode. Pin colors shift to bright cyan. Electric spark particles trail every ball. Chain jackpots cascade with pulsing neon celebrations.

They toggle the stats overlay. The probability chart, the economy graph, the heatmap — all present, all accurate, all rendering alongside the themed board.

They switch to Classic Gold mid-session without pausing. The neon grid fades, replaced by warm wood texture. Neutral electronic music replaces the synthwave. Gold sparkles instead of electric sparks. The stats are unchanged — ball count, net position, session history all continuous. Only the skin changed. The math is the same.

This is a complete, polished, educational pachinko simulator. The theme system is built for easy addition of future themes (Ukiyo-e, Deep Space, Matsuri) as self-contained asset directories.

---

*PachinkoParlor — Phase 5: Themes, Audio & Menu System*
