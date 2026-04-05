# Doc 03 — Phase 3: Kakuhen, Jitan & Full State Machine

## PachinkoParlor

**Phase:** 3 of 5
**Depends on:** Phase 2 (gates, lottery engine, basic state machine)
**Goal:** The complete mode system that gives pachinko its dramatic arc — fever mode, chain jackpots, fast-cycle recovery, and the full emotional roller coaster of a real session.
**Date:** April 5, 2026
**Status:** Pending

---

## 1. Phase Objective

Phase 2 delivers a basic game loop: spin → jackpot → payout → repeat. That's functional, but it's not pachinko. What makes pachinko compelling — what keeps players glued to machines for hours — is the **mode system**: the chain of escalating states that follow a jackpot, where probability shifts dramatically and multiple jackpots can cascade into each other.

Phase 3 implements kakuhen ("fever mode" — boosted odds after a jackpot), jitan (fast-cycle mode with accelerated spins), koatari (small jackpots), and the full state machine that chains these modes together. This is where the simulator stops being a toy and becomes a faithful reproduction of how modern Digipachi machines actually behave.

---

## 2. New Files

```
src/
├── state/
│   ├── GameStateMachine.ts    # REWRITE — full state graph
│   ├── KakuhenController.ts   # Fever mode logic and spin tracking
│   ├── JitanController.ts     # Fast-cycle mode logic
│   └── ModeIndicator.ts       # Visual/audio mode transition manager
├── lottery/
│   └── LotteryEngine.ts       # UPDATED — odds modification per mode
└── types/
    └── state.ts               # UPDATED — full state enum
```

---

## 3. Deliverables

### 3.1 Full Game State Machine (`GameStateMachine.ts`)

Replace the Phase 2 simplified state machine with the complete graph:

```typescript
enum GameState {
  IDLE        = 'IDLE',
  NORMAL      = 'NORMAL',
  SPINNING    = 'SPINNING',
  PAYOUT      = 'PAYOUT',
  KAKUHEN     = 'KAKUHEN',
  JITAN       = 'JITAN',
}
```

**Transition rules:**

| From | To | Trigger |
|---|---|---|
| IDLE | NORMAL | Player has balls, launches first ball |
| NORMAL | SPINNING | Ball enters start chakker |
| SPINNING | NORMAL | Spin resolves, no jackpot |
| SPINNING | PAYOUT | Spin resolves, jackpot |
| PAYOUT | KAKUHEN | Payout ends, jackpot triggered kakuhen (roll against `kakuhenRate`) |
| PAYOUT | JITAN | Payout ends, jackpot did NOT trigger kakuhen |
| KAKUHEN | SPINNING | Ball enters start chakker (at boosted odds) |
| KAKUHEN | PAYOUT | Spin resolves, jackpot (chain jackpot!) |
| KAKUHEN | JITAN | Kakuhen spin limit reached without jackpot |
| JITAN | SPINNING | Ball enters start chakker (normal odds, fast animation) |
| JITAN | PAYOUT | Spin resolves, jackpot |
| JITAN | NORMAL | Jitan spin count exhausted |
| ANY | IDLE | Balls exhausted (ballsOwned = 0, ballsInPlay = 0) |

**State persistence:** The current state must persist across multiple spins. KAKUHEN and JITAN are *modes* that overlay SPINNING — a ball entering the chakker during KAKUHEN triggers a SPINNING sub-state at boosted odds, then returns to KAKUHEN or transitions to PAYOUT.

### 3.2 Kakuhen Controller (`KakuhenController.ts`)

Manages the "fever mode" state.

**Entry:** After a payout round ends, if the jackpot rolled a kakuhen outcome (probability = `MachineSpec.kakuhenRate`).

**Behavior during kakuhen:**
- Lottery odds are multiplied by `kakuhenOddsMultiplier` (e.g., 10x → odds become 1/31.9 instead of 1/319)
- Start chakker acceptance may widen (configurable — in the physics layer, this could mean the sensor body width increases slightly)
- Visual transformation: board enters fever mode visuals (Phase 5 themes will customize this; Phase 3 implements a basic color shift and HUD indicator)
- Audio: fever mode music loop starts (Phase 5; Phase 3 uses a placeholder or silence)
- Spin counter tracks spins consumed during kakuhen

**Exit conditions:**
- Jackpot hit during kakuhen → PAYOUT (which may chain into another KAKUHEN)
- Spin limit reached (`kakuhenSpinLimit`, typically 30–100 spins) → JITAN
- Balls exhausted → IDLE

**Chain jackpots:** This is the emotional core. When a jackpot hits during kakuhen, payout mode runs, and then *another* kakuhen check occurs. Players can chain 3, 5, even 10+ consecutive jackpots during a fever run. Each chain link follows the same kakuhen/non-kakuhen roll.

```typescript
interface KakuhenState {
  active: boolean;
  spinsRemaining: number;
  spinsUsed: number;
  chainDepth: number;       // how many consecutive kakuhen jackpots
  oddsMultiplier: number;
}
```

### 3.3 Jitan Controller (`JitanController.ts`)

Manages the "time reduction" / fast-cycle mode.

**Entry:** After a payout round ends without kakuhen, OR when kakuhen spin limit is exhausted.

**Behavior during jitan:**
- Lottery odds return to normal (1/319)
- Spin animation plays at 2–3x speed (faster reel resolution)
- Start chakker acceptance is widened (same as kakuhen)
- Spins are consumed from a fixed count (`jitanSpinCount`, typically 50–100)

**Exit conditions:**
- All jitan spins consumed → NORMAL (full reset, back to base state)
- Jackpot hit during jitan → PAYOUT (can re-enter kakuhen cycle)
- Balls exhausted → IDLE

```typescript
interface JitanState {
  active: boolean;
  spinsRemaining: number;
  spinsUsed: number;
  animationSpeedMultiplier: number;  // 2.0–3.0
}
```

### 3.4 Koatari (Small Jackpot)

Not a separate state — koatari is a jackpot variant determined at spin time.

**Behavior:**
- When a jackpot is rolled, `koatariRate` determines if it's full or koatari
- Koatari payout: gate opens for 2 rounds only (vs. 10–16 for full jackpot)
- Gate opens very briefly per round (1–2 seconds vs. normal timing)
- Koatari *may or may not* trigger kakuhen (same kakuhen roll as full jackpot)
- Purpose: creates variability in jackpot magnitude. Sometimes you hit but the payout is small.

Update `SpinResult` type:

```typescript
interface SpinResult {
  isJackpot: boolean;
  jackpotType?: 'full' | 'koatari';
  triggersKakuhen?: boolean;
  reelValues: [number, number, number];
  reachType?: 'none' | 'normal' | 'super' | 'premium';
}
```

### 3.5 Mode Indicator (`ModeIndicator.ts`)

Visual HUD element showing the current mode.

**Display:**
- NORMAL: No special indicator (or a subtle "通常" label)
- KAKUHEN: Prominent "FEVER" banner, pulsing border glow, chain depth counter ("FEVER ×3")
- JITAN: "TIME" banner, spin countdown display ("TIME: 47 remaining")
- PAYOUT: "BONUS" banner with round counter ("Round 5/10")

**Transitions:** Mode changes are accompanied by a brief full-screen flash or wipe animation (1–2 frames) to signal the shift. Phase 3 implements basic transitions; Phase 5 themes customize them.

### 3.6 Lottery Engine Updates

`LotteryEngine.ts` must be updated to accept an odds modifier from the current mode:

```typescript
class LotteryEngine {
  spin(oddsMultiplier: number = 1): SpinResult {
    const effectiveOdds = this.spec.jackpotOdds / oddsMultiplier;
    // roll against effectiveOdds...
  }
}
```

During kakuhen, the state machine passes `kakuhenOddsMultiplier` (e.g., 10). During jitan and normal, it passes 1.

Jitan also affects animation speed — `LotteryDisplay` must accept a speed multiplier for reel animation duration.

---

## 4. Testing Checklist

### Unit Tests

- [ ] `GameStateMachine` only permits valid state transitions (invalid transitions throw or are rejected)
- [ ] `KakuhenController` correctly multiplies odds during fever mode
- [ ] `KakuhenController` decrements spin counter and exits at limit
- [ ] `KakuhenController` chain depth increments on consecutive kakuhen jackpots
- [ ] `JitanController` decrements spin counter and exits at limit
- [ ] `JitanController` returns to NORMAL (not KAKUHEN) when spins exhausted
- [ ] Koatari payout runs only 2 rounds vs. full jackpot's 10–16
- [ ] Over 100,000 simulated sessions: kakuhen entry rate matches `kakuhenRate` (±5%)
- [ ] Over 100,000 simulated sessions: average chain depth matches expected geometric distribution

### Manual Testing

- [ ] Hitting a jackpot in normal mode → payout → fever mode (when kakuhen triggers)
- [ ] Fever mode visual indicator appears and persists across multiple spins
- [ ] Chain jackpot: fever → jackpot → payout → fever again (chain depth increments)
- [ ] Fever exhaustion: hitting the spin limit without jackpot → jitan mode
- [ ] Jitan mode: spins resolve noticeably faster, countdown visible
- [ ] Jitan exhaustion: spin count reaches 0 → return to normal mode
- [ ] Koatari: occasional jackpot with very brief payout gate opening (2 rounds)
- [ ] Full cycle: NORMAL → jackpot → PAYOUT → KAKUHEN → chain jackpots → JITAN → NORMAL
- [ ] Running out of balls during any mode correctly transitions to IDLE

---

## 5. Testable Outcome

Player grinds through normal mode, launching balls into the pin field. After many spins (statistically, ~319 on average at High Spec), a jackpot hits. The payout gate opens, balls flood in. When payout ends, the board transforms — a "FEVER" banner appears, the border glows, the mode indicator shows boosted odds. This is kakuhen.

During fever, jackpots come faster — dramatically faster. The player chains 2, 3, 4 jackpots in a row, each triggering another payout round, each potentially extending the fever run. The chain depth counter climbs. The ball tray fills up.

Eventually, a spin in fever mode fails to hit within the limit. The mode shifts to jitan — spins resolve at double speed, the countdown ticks down. If a jackpot hits here, the cycle restarts. If not, the countdown reaches zero and the board returns to normal. The fever is over. Back to grinding.

This is the dramatic arc of pachinko. The slow build, the explosion of fever mode, the gradual fadeout. It's what the game is actually about.

---

*PachinkoParlor — Phase 3: Kakuhen, Jitan & Full State Machine*
