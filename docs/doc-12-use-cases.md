# Doc 12 — Use Cases & User Journeys

## PachinkoParlor

**Date:** April 5, 2026
**Status:** Complete

---

## 1. User Personas

### Persona A: The Curious Explorer

**"I keep hearing about pachinko. What actually is it?"**

- Background: General interest in Japanese culture, games, or gambling
- Technical comfort: Moderate (can navigate a web app, not a developer)
- Goal: Understand what pachinko is through hands-on experience
- Session length: 10–30 minutes
- Key need: Intuitive onboarding, visual feedback, cultural context

### Persona B: The Statistics Student

**"I want to see probability theory in action."**

- Background: Math/statistics student or enthusiast
- Technical comfort: High
- Goal: Observe law of large numbers, house edge, variance in a real-time simulation
- Session length: 30–60+ minutes (long sessions to see convergence)
- Key need: Detailed stats, RNG transparency, analysis dashboard, ability to run extended sessions

### Persona C: The Game Design Analyst

**"How does pachinko keep people playing?"**

- Background: Game designer, UX researcher, or gambling awareness advocate
- Technical comfort: High
- Goal: Understand the psychological mechanics — reach animations as manufactured suspense, kakuhen as dopamine loops, sensory overload design
- Session length: Variable, returning multiple times
- Key need: RNG transparency mode, mode transition analysis, reach conversion stats, the educational essay

### Persona D: The Casino Sim Collector

**"I've played the other Metaincognita sims."**

- Background: Existing user of the Metaincognita suite
- Technical comfort: High (familiar with the suite's UI patterns)
- Goal: Add pachinko to their understanding of casino game mathematics
- Session length: Variable
- Key need: Consistent UI with other sims, cross-simulator navigation, comparable statistical depth

---

## 2. Core Use Cases

### UC-01: First-Time Play

**Actor:** Any persona (especially Persona A)

**Flow:**
1. User navigates to `pachinko.metaincognita.com`
2. Setup screen loads: dark background, gold title, configuration cards
3. User selects a spec tier (defaults to "Balanced" / 1/199 for first-timers)
4. User selects a theme (defaults to "Classic Gold")
5. User clicks "Start Playing"
6. Game screen loads: Phaser canvas on left, stats column on right
7. User sees the pin field and the dial in the lower right
8. User drags the dial (or uses arrow keys) — balls begin launching
9. Balls cascade through pins. Some reach the start chakker.
10. LCD display spins. Usually no match. Occasionally a reach builds suspense.
11. User watches ball count decrease. Stats column shows burn rate.
12. Eventually a jackpot hits. Payout gate opens. Excitement.
13. User may enter fever mode. Chain jackpots cascade.
14. Fever ends. User returns to normal grind.
15. User runs out of balls or clicks "Buy Balls" to continue.

**Success criteria:** User understands the basic loop within 2 minutes of play without reading any instructions.

---

### UC-02: Extended Statistical Session

**Actor:** Persona B (statistics student)

**Flow:**
1. User selects High Spec (1/319) for maximum variance visibility
2. Plays for 500+ spins
3. Navigates to Analysis tab
4. Examines probability convergence chart — sees actual rate approaching 1/319 over time
5. Notes the sawtooth economy graph — long declines punctuated by fever spikes
6. Checks fever chain distribution — confirms geometric distribution
7. Returns to Game tab, enables RNG transparency mode
8. Watches predetermined outcomes displayed before animations play
9. Observes that reach animations create suspense around already-decided outcomes
10. Returns to Analysis, exports session data as CSV for further analysis

**Success criteria:** User can verify that the simulator's RNG matches theoretical probability within statistical tolerance.

---

### UC-03: Exploring Theme Switching

**Actor:** Persona D (suite collector)

**Flow:**
1. User starts with Classic Gold theme (warm wood, gold sparkles, neutral electronic audio)
2. Plays for several minutes, accumulates some history
3. Opens settings, switches to Neon Drift theme
4. Board face transforms — dark grid with neon lines, cyan pins, synthwave music
5. Reel symbols change to geometric glyphs with neon glow
6. Ball count, net position, and session history are unchanged
7. Plays in Neon Drift theme for a few minutes
8. Switches back to Classic Gold — confirms the swap is reversible
9. Stats remain continuous across all theme switches
10. Returns to Analysis — charts show complete session data regardless of theme changes

**Success criteria:** Theme switch is seamless, visually dramatic, and preserves all game state.

---

### UC-04: Educational Demonstration

**Actor:** Persona C (game design analyst)

**Flow:**
1. User enables RNG transparency mode before first spin
2. Each spin: predetermined outcome is displayed BEFORE the animation
3. User observes: "No jackpot. Reach: super." → dramatic reach animation plays → no jackpot confirmed
4. User realizes: the animation builds suspense around a decision already made
5. User navigates to Analysis, checks reach-to-jackpot conversion rates:
   - Normal reach: ~5% convert to jackpot
   - Super reach: ~30% convert
   - Premium reach: ~60%+ convert
6. User understands: reach type is a SIGNAL calibrated to probability, not a CAUSE
7. User checks "time in mode" pie chart: 85% of time spent in NORMAL (losing)
8. User notes: fever mode FEELS dominant because it's emotionally intense, but it's statistically brief
9. User reads the "Physics vs. RNG" summary: "Your dial determines where 15–25% of balls land. The RNG determines 100% of jackpot outcomes."

**Success criteria:** User gains the core educational insight — the pins are theater, the payoff is predetermined.

---

### UC-05: History Review

**Actor:** Any persona

**Flow:**
1. After playing for a while, user clicks History tab
2. Full event table appears with all spins, jackpots, mode changes
3. User filters to "Jackpots only" — sees all jackpot events with timestamps and chain depth
4. User sorts by "Balls Won" descending — identifies their biggest fever run
5. User clicks "Mode changes only" — sees the state machine trace of their session
6. User exports to CSV for external analysis

**Success criteria:** History table is complete, accurate, and performant with 1000+ rows.

---

### UC-06: Mobile Play

**Actor:** Any persona on a smartphone

**Flow:**
1. User opens the URL on mobile in portrait mode
2. Setup screen renders cleanly at mobile width
3. Game screen: canvas fills the viewport, stats column is in a slide-up drawer
4. User taps and drags the dial to set launch power
5. Balls launch and cascade — physics runs smoothly at 50+ FPS
6. User swipes up to view stats drawer
7. User taps History or Analysis tabs — full-screen views render at mobile width
8. Tables scroll horizontally if needed; charts resize to viewport

**Success criteria:** Fully playable on mobile without horizontal scrolling. Dial input is responsive to touch.

---

## 3. Edge Cases

| Edge Case | Expected Behavior |
|---|---|
| User runs out of balls during fever mode | Mode persists. Balls in play continue. When last ball exits, transition to IDLE with "Out of balls" prompt. Offer to buy more balls — fever state resumes if balls are purchased before timeout. |
| User switches theme during a reach animation | Theme swap queues until current animation completes, then applies. |
| User navigates to Analysis with zero spins | Charts render with empty state and a message: "Play some spins to see data here." |
| User refreshes the page | All state is lost. Setup screen appears. This is by design (ADR-009). |
| User resizes browser window during play | Phaser canvas rescales via `Scale.FIT`. DOM stats column reflows via CSS. |
| 30 balls on screen simultaneously on mobile | If FPS drops below 45, reduce max active balls to 20 and log a console warning. |
| Jackpot during jackpot payout | Queue the new jackpot. Current payout completes, then new payout begins with fresh round count. |

---

*PachinkoParlor — Doc 12: Use Cases & User Journeys*
