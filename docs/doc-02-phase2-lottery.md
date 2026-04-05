# Doc 02 — Phase 2: Gates, Pockets & Digital Lottery

## PachinkoParlor

**Phase:** 2 of 5
**Depends on:** Phase 1 (physics board, ball launcher, pin field)
**Goal:** The core game loop — balls enter the start chakker, trigger lottery spins, and jackpots pay out through a payout gate. The game transitions from a physics sandbox to an actual pachinko machine.
**Date:** April 5, 2026
**Status:** Pending

---

## 1. Phase Objective

Phase 2 transforms the physics sandbox from Phase 1 into a functioning game by adding the two systems that define the pachinko loop: **pockets and gates** (physical targets on the board that balls interact with) and the **digital lottery** (the RNG-driven slot display triggered by the start chakker).

By the end of this phase, a player can experience the basic game loop: launch balls → balls cascade into the start chakker → lottery spins → occasional jackpot → payout gate opens → shoot balls into the gate for rewards → payout ends → resume normal play.

---

## 2. New Files

```
src/
├── gates/
│   ├── StartChakker.ts        # Center gate sensor + spin trigger
│   ├── PayoutGate.ts          # Bottom payout gate (opens/closes)
│   ├── TulipGate.ts           # Toggle wing gates
│   └── SidePocket.ts          # Side pocket sensors (dead/minor payout)
├── lottery/
│   ├── LotteryEngine.ts       # RNG, probability math, spin queue
│   ├── LotteryDisplay.ts      # 3-reel visual animation (Phaser sprites/tweens)
│   ├── ReachSystem.ts         # Reach type selection and animation triggering
│   └── SpinResult.ts          # Type definitions for spin outcomes
├── state/
│   └── GameStateMachine.ts    # NORMAL → SPINNING → PAYOUT → NORMAL (basic)
├── economy/
│   └── BallEconomy.ts         # Ball tracking: owned, in-play, won, lost
└── types/
    ├── gates.ts               # Gate type definitions
    ├── lottery.ts             # Lottery type definitions
    └── state.ts               # Game state enum and transition types
```

---

## 3. Deliverables

### 3.1 Start Chakker (`StartChakker.ts`)

The center gate that triggers lottery spins. Implemented as a Matter.js **sensor** — a non-solid body that detects overlaps without blocking ball movement.

**Behavior:**
- When a ball overlaps the sensor: emit `ball:enter:startChakker` event
- Queue a spin in the `LotteryEngine` (max 4 queued spins)
- Award small payout (3 balls added to `BallEconomy.ballsOwned`)
- Visual: the chakker area pulses briefly on ball entry
- The ball continues through — it is not captured

**Layout position:** Center of the board, below the LCD display area, between the upper and lower pin fields. Updated in `default.json` layout file.

### 3.2 Payout Gate (`PayoutGate.ts`)

The large gate at the bottom of the board that opens during jackpot payout rounds.

**States:**
- `CLOSED` — solid static body, balls bounce off or pass over it
- `OPEN` — body removed or set to sensor mode, revealing a pocket underneath

**During payout mode:**
- Gate opens at start of each payout round
- Each ball that enters the open gate awards `payoutBallsPerEntry` balls (default: 15)
- Round ends when timer expires OR max balls collected for that round
- Gate closes between rounds momentarily, then reopens for next round
- After all rounds complete, gate closes permanently until next jackpot

**Visual:** The gate is rendered as a hinged door or sliding panel. Opening animation: the gate swings down or slides apart. Closing: reverses.

### 3.3 Tulip Gates (`TulipGate.ts`)

Mechanical wing gates that toggle state on ball entry.

**Toggle logic:**
- Ball enters closed tulip → tulip opens (wings spread, wider catchment)
- Ball enters open tulip → tulip closes (wings fold, narrow catchment)
- Opening a tulip awards a small bonus (configurable, default: 5 balls)
- Optional: entering one tulip can trigger another tulip elsewhere (linked tulips — defined in layout JSON)

**Physics implementation:**
- Each tulip has two states with different collision geometry
- Closed: narrow sensor, harder to hit
- Open: wide sensor, easier to hit — but closes on next ball entry
- State transition includes a brief animation (wings spreading/folding, ~200ms)

**Layout:** 2–4 tulip gates positioned in the lower half of the board, flanking the start chakker.

### 3.4 Side Pockets (`SidePocket.ts`)

Simple sensor pockets on the left and right sides of the board.

**Types:**
- `dead` — ball enters, is removed from play, no payout. Most side pockets are dead.
- `minor` — ball enters, is removed, awards 1–3 balls. Rare, positioned in hard-to-reach spots.

### 3.5 Digital Lottery Engine (`LotteryEngine.ts`)

The RNG system that determines jackpot outcomes. This is the mathematical core of the game — the thing the educational layer will eventually expose.

**Spin Queue:**
- Maximum 4 spins queued at once
- When a spin is queued: RNG determines outcome immediately (before animation)
- Outcomes are stored and dequeued as the display finishes each animation
- If queue is full and a new ball enters start chakker, spin is dropped (ball still awards 3-ball payout)

**Outcome determination:**

```typescript
interface SpinResult {
  isJackpot: boolean;
  jackpotType?: 'full' | 'koatari';
  reelValues: [number, number, number];  // 0-9 for each reel
  reachType?: 'none' | 'normal' | 'super' | 'premium';
}
```

**RNG logic:**
1. Roll against `jackpotOdds` (e.g., 1/319). If hit → jackpot.
2. If jackpot: roll against `koatariRate` to determine full vs. koatari.
3. If jackpot: set all three reels to matching value (random 0–9).
4. If not jackpot: roll against `reachRate` to determine if reach occurs.
5. If reach: set first two reels to matching value, third reel to non-matching.
6. If reach: roll against `superReachRate` and `premiumReachRate` for reach tier.
7. If no reach: set all three reels to random non-matching values.

**Probability configuration:** Uses `MachineSpec` from Doc 00. Phase 2 implements High Spec (1/319) only. Other tiers added in Phase 5.

### 3.6 Lottery Display (`LotteryDisplay.ts`)

The visual 3-reel animation rendered in the LCD display area on the board.

**Display area:** A rectangular region in the center of the board (defined in layout JSON), rendered as a colored background with three vertical reel columns.

**Animation sequence:**
1. All three reels begin spinning (symbols scrolling vertically)
2. Left reel stops first (after ~1 second)
3. Center reel stops second (after ~1.5 seconds)
4. If reach: pause. Play reach animation (see ReachSystem). Then right reel stops.
5. If no reach: right reel stops quickly (after ~2 seconds)
6. If jackpot: flash display, play celebration (brief in Phase 2 — elaborate in Phase 5)

**Reel rendering:** Each reel is a vertical strip of symbols (numbers 0–9 in Phase 2, themed symbols in Phase 5). Symbols scroll using Phaser tween/animation. Stop positions are predetermined by `SpinResult.reelValues`.

### 3.7 Reach System (`ReachSystem.ts`)

Manages the suspense animation when 2 of 3 reels match.

**Phase 2 implementation (minimal):**
- Normal reach: 1-second pause, third reel slows gradually, stops. No special effects.
- Super reach: 3-second pause, background color shifts, third reel slows dramatically. Minimal effects.
- Premium reach: 5-second pause, display flashes, reel reverses once before stopping. Minimal effects.

Elaborate reach animations are deferred to Phase 5 (themes). Phase 2 establishes the timing and trigger framework.

### 3.8 Game State Machine (`GameStateMachine.ts`)

Phase 2 implements a simplified state machine — the full kakuhen/jitan system is Phase 3.

**Phase 2 states:**

```
IDLE → NORMAL → SPINNING → PAYOUT → NORMAL
```

| State | Entry Condition | Behavior | Exit Condition |
|---|---|---|---|
| `IDLE` | Initial state | Prompt to start playing | Player launches first ball |
| `NORMAL` | Default play state | Balls launch, cascade, enter gates | Ball enters start chakker |
| `SPINNING` | Chakker triggered | Lottery animation plays. Physics continues. Multiple spins can be queued. | All queued spins resolved |
| `PAYOUT` | Jackpot hit | Payout gate opens. Player aims balls at gate. Timed rounds. | All payout rounds complete |

After PAYOUT, state returns to NORMAL. Kakuhen/jitan branching added in Phase 3.

### 3.9 Ball Economy (`BallEconomy.ts`)

Basic ball tracking. Full purchase system and stats are Phase 4.

```typescript
interface BallEconomyState {
  ballsOwned: number;      // current tray count
  ballsInPlay: number;     // currently in physics world
  ballsLaunched: number;   // total launched this session
  ballsLost: number;       // exited bottom or dead pockets
  ballsWon: number;        // from payouts (spin payouts + jackpot payouts)
}
```

**Phase 2 start condition:** Player begins with 250 balls (one virtual purchase). No purchase UI yet — just pre-loaded balls. When `ballsOwned` reaches 0 and no balls are in play, display "Out of balls" message.

---

## 4. Layout Updates

The `default.json` layout from Phase 1 must be updated to include gate and pocket positions:

```typescript
// additions to PinLayout interface
interface PinLayoutV2 extends PinLayout {
  startChakker: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  payoutGate: {
    x: number;
    y: number;
    width: number;
    openDirection: 'down' | 'apart';
  };
  tulipGates: Array<{
    x: number;
    y: number;
    linkedTo?: number;  // index of another tulip this one triggers
  }>;
  sidePockets: Array<{
    x: number;
    y: number;
    type: 'dead' | 'minor';
    payout?: number;
  }>;
  lcdDisplay: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
}
```

---

## 5. Testing Checklist

### Unit Tests

- [ ] `LotteryEngine` produces jackpots at approximately 1/319 rate over 100,000 simulated spins (within ±15% statistical tolerance)
- [ ] `LotteryEngine` spin queue caps at 4 — fifth spin is dropped
- [ ] `LotteryEngine` jackpot spins always produce three matching reel values
- [ ] `LotteryEngine` reach spins always produce exactly two matching reel values
- [ ] `LotteryEngine` non-reach spins never produce two or three matching values
- [ ] `ReachSystem` selects reach types at configured probability rates
- [ ] `TulipGate` toggles correctly: closed→open→closed→open
- [ ] `BallEconomy` correctly tracks won/lost/owned across multiple events
- [ ] `GameStateMachine` transitions only through valid state paths

### Manual Testing

- [ ] Ball entering start chakker visibly triggers a lottery spin on the display
- [ ] Lottery reels spin and stop with correct reel values
- [ ] Reach creates a visible pause with correct animation tier
- [ ] Jackpot triggers: payout gate opens, player can aim balls into it
- [ ] Payout gate correctly awards balls per entry during payout rounds
- [ ] Payout gate closes after all rounds complete
- [ ] Tulip gates visibly open/close on ball entry
- [ ] Linked tulips trigger correctly (entering one opens another)
- [ ] Side dead pockets remove balls without payout
- [ ] Ball economy display updates in real time
- [ ] Running out of balls produces end-of-session message
- [ ] Multiple rapid chakker entries queue spins correctly (up to 4)

---

## 6. Testable Outcome

Player launches balls. Most cascade through pins and exit at the bottom. Some find the center start chakker — when they do, the LCD display in the center of the board spins three reels. Usually the reels show non-matching numbers and the spin resolves quickly. Occasionally two reels match and a "reach" pause builds tension before the third reel stops. Rarely, three reels match — jackpot. The payout gate at the bottom swings open, and the player aims balls into it. Each ball that enters awards a flood of 15 balls to the tray. After the payout rounds end, the gate closes and normal play resumes.

The ball count in the HUD ticks up and down. The player can sustain play by occasionally hitting jackpots. When the balls run out, the session ends.

This is a complete, if minimal, pachinko game loop.

---

*PachinkoParlor — Phase 2: Gates, Pockets & Digital Lottery*
