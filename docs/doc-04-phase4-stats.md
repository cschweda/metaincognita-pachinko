# Doc 04 — Phase 4: Ball Economy, Stats & Education

## PachinkoParlor

**Phase:** 4 of 5
**Depends on:** Phase 3 (full state machine, kakuhen/jitan)
**Goal:** The educational layer — ball purchase system, comprehensive session statistics, real-time probability displays, and the analytical tools that distinguish an educational simulator from a gambling game.
**Date:** April 5, 2026
**Status:** Pending

---

## 1. Phase Objective

This is where PachinkoParlor earns its place in the Metaincognita suite. Phases 1–3 build a faithful pachinko simulator. Phase 4 turns it into a teaching tool by exposing the mathematics that the game's sensory spectacle is designed to hide.

Pachinko is uniquely suited to statistical education because the player has **no meaningful decisions** after setting the launch dial. Every outcome is determined by physics (chaotic but uncontrollable) and RNG (hidden and predetermined). There is no strategy, no card counting, no bet sizing — just probability grinding against time. The stats dashboard makes this visible.

---

## 2. New Files

```
src/
├── economy/
│   ├── BallEconomy.ts         # REWRITE — full purchase system, virtual currency
│   └── PurchaseUI.ts          # Ball purchase interface
├── stats/
│   ├── SessionTracker.ts      # Real-time metrics collection
│   ├── ProbabilityDisplay.ts  # Expected vs. actual probability charts (DOM + Chart.js)
│   ├── EconomyGraph.ts        # Ball count over time graph (DOM + Chart.js)
│   ├── HeatmapTracker.ts      # Ball path heatmap data collection (Phaser canvas overlay)
│   └── RNGTransparency.ts     # Expose predetermined outcomes
└── types/
    └── stats.ts               # Stats type definitions
```

---

## 3. Statistics Design

### 3.1 Why These Stats Matter

Pachinko's zero-decision gameplay means that every stat is a pure measurement of the machine's mathematical behavior — untainted by player skill or strategy. This makes the data clean, honest, and educational. The stats fall into four categories:

1. **Physics stats** — What is the ball actually doing on the board?
2. **Lottery stats** — Is the RNG behaving as advertised?
3. **Economy stats** — How fast is the player losing money?
4. **Mode stats** — How does the kakuhen/jitan cycle actually play out over time?

### 3.2 Physics Stats

These expose the physical behavior of the board — the one area where the player's dial setting has any effect.

| Stat | Description | Why It's Interesting |
|---|---|---|
| **Start chakker hit rate** | % of launched balls that reach the center gate | This is the closest thing to "skill" in pachinko — dial position affects this. Shows how narrow the optimal zone is. |
| **Ball path heatmap** | Visual overlay showing where balls spend time on the board | Reveals the Masamura gauge's designed bias zones. Shows that the "chaos" is structured. |
| **Average ball lifetime** | Mean time from launch to exit (seconds) | Longer = more pin interactions = more entertaining. Short = wasted in gutters. |
| **Gutter rate** | % of balls that exit via side gutters without hitting anything interesting | Reveals how much of the player's money is wasted on balls that never had a chance. |
| **Launch power vs. chakker correlation** | Scatter plot: dial position → chakker entry rate | The "skill curve." Shows the narrow power band that maximizes chakker hits. Demonstrates that even the skill element has a ceiling — you can optimize dial position, but you can't overcome the RNG. |
| **Pin collision count distribution** | Histogram: how many pins each ball strikes before exiting | Characterizes the board's chaos. A tight distribution means predictable paths; a wide one means genuine chaos. |

### 3.3 Lottery Stats

These expose the RNG — the actual determinant of winning and losing.

| Stat | Description | Why It's Interesting |
|---|---|---|
| **Spins to jackpot** | Running list and histogram of spins between jackpots | Should follow a geometric distribution with mean = jackpot odds. Educates about the "gambler's fallacy" — each spin is independent, past droughts don't make a jackpot more likely. |
| **Expected vs. actual jackpot rate** | Dual line graph: theoretical 1/319 rate vs. actual cumulative rate | The most important chart. Shows the law of large numbers in action — early sessions are volatile, but the lines converge over time. The house always wins eventually. |
| **Reach distribution** | Pie chart: % of spins that produce normal reach, super reach, premium reach, no reach | Exposes the manufactured suspense. Shows that most reaches don't lead to jackpots — the drama is calibrated to keep you watching. |
| **Reach-to-jackpot conversion** | Per reach type: what % actually result in jackpots | The payoff. Normal reach converts ~5%, super ~30%, premium ~60%+. Shows that the animation tier is a *signal*, not a cause. |
| **RNG outcome log** | Scrollable table of all spin outcomes with timestamps | Raw data for the analytically inclined. |

### 3.4 Economy Stats

These expose the financial reality — the thing pachinko's sensory assault is designed to obscure.

| Stat | Description | Why It's Interesting |
|---|---|---|
| **Net ball position** | `ballsWon - ballsPurchased`, updated in real time | The bottom line. Usually negative. Shows the house edge grinding away. |
| **Net position over time** | Line graph: net ball count plotted over session duration | The shape tells the story. Long slow declines punctuated by sharp fever-mode spikes. The declines are longer than the spikes — that's the house edge. |
| **Burn rate** | Balls lost per minute (rolling 5-minute average) | How fast you're bleeding. During normal play this is steady. During fever it drops or reverses. Jitan is somewhere between. |
| **Cost per hour** | Burn rate × ball cost (¥4), extrapolated to hourly rate | Translates abstract ball counts into money. "You're spending ¥12,000/hour (~$80 USD)" hits differently than "you're losing 50 balls per minute." |
| **Virtual yen spent** | Total balls purchased × ¥4 | Cumulative investment. |
| **Virtual yen earned** | Total balls won × ¥4 (at the 3-shop exchange rate, which is always less than purchase price) | The asymmetry: you buy balls at ¥4 but the exchange value is lower. The house edge lives in this gap. |
| **Session P&L** | Profit/loss in virtual yen with % return | "You've lost ¥8,400 on a ¥20,000 investment. That's a -42% return." |
| **Break-even analysis** | How many jackpots needed to break even given current burn rate | Shows the mathematical cliff. Often requires improbable fever chains. |

### 3.5 Mode Stats

These expose the kakuhen/jitan cycle — the emotional rollercoaster — as a statistical process.

| Stat | Description | Why It's Interesting |
|---|---|---|
| **Fever chain distribution** | Histogram of chain lengths across all fever runs | Should follow a geometric distribution. Most chains are 1 (single jackpot, no chain). Long chains are rare but account for disproportionate winnings. |
| **Average chain length** | Mean kakuhen chain depth | Derived from kakuhen rate: if kakuhen triggers 65% of the time, expected chain length is 1/(1-0.65) ≈ 2.86 jackpots. Does the sim match? |
| **Time in mode** | Pie chart: % of session time spent in NORMAL vs. KAKUHEN vs. JITAN vs. PAYOUT | Reveals that the vast majority of time is spent in NORMAL (losing). Fever mode feels dominant because it's emotionally intense, but it's statistically brief. |
| **Balls won per mode** | Bar chart: balls won during NORMAL vs. KAKUHEN vs. JITAN vs. PAYOUT | Almost all ball gains happen during PAYOUT rounds triggered by KAKUHEN chains. Normal mode is pure loss. |
| **Mode transition log** | Timeline visualization of mode transitions with timestamps | The session's "story" told as a state machine trace. |

### 3.6 Composite / Educational Stats

High-level insights derived from combining the above.

| Stat | Description | Educational Value |
|---|---|---|
| **Effective house edge** | Estimated from burn rate vs. payout rate over the session | Pachinko's house edge is harder to calculate than table games because it depends on ball physics, launch skill, and spec tier. The sim calculates it empirically. |
| **"Skill" ceiling** | Compare stats at optimal dial setting vs. worst dial setting | Quantifies how much launch control actually matters. Spoiler: it affects burn rate by maybe 10–15%, but the RNG dominates. |
| **Expected session length** | Given starting balls and spec tier, how long until you run out (Monte Carlo estimate) | Helps players understand the economic model. "250 balls at High Spec lasts about 15 minutes without a jackpot." |
| **Probability that you're ahead** | Given current session stats and spec tier, probability of being net positive at any future point | Almost always decreasing. The longer you play, the more the house edge compounds. |
| **Physics vs. RNG** | Side-by-side comparison: "Your dial position determines where 15–25% of balls land. The RNG determines 100% of jackpot outcomes." | The single most important educational insight. The pins create the illusion of influence. The RNG creates the reality. |

---

## 4. Deliverables

### 4.1 Ball Purchase System (`BallEconomy.ts`, `PurchaseUI.ts`)

**Purchase flow:**
- Player presses a "Buy Balls" button (or automatic prompt when tray is empty)
- Virtual currency display shows balance (starting balance: ¥10,000)
- Purchase in batches: 250 balls = ¥1,000
- No real money. Virtual yen is an educational prop for understanding parlor economics.
- Balance and transaction history tracked for economy stats

### 4.2 Stats Display (DOM — `ui/StatsColumn.ts`, views, Chart.js)

Per ADR-002, stats are rendered as DOM elements outside the Phaser canvas, not as a Phaser scene. The `StatsColumn` component subscribes to `GameBridge` events and updates DOM elements. Chart.js renders probability and economy charts in the DOM layer. The only Phaser-side stats element is the heatmap overlay, which draws directly on the game canvas since it must align with pin positions.

**Layout:**
- Desktop: side panel(s) flanking the game canvas, always visible if screen is wide enough
- Mobile: slide-up drawer, toggled via HUD button
- Stats are organized into tabs: Physics | Lottery | Economy | Modes

**Update frequency:**
- Economy stats: every ball event (launch, win, lose)
- Lottery stats: every spin resolution
- Physics stats: every 60 frames (1 second)
- Charts: redraw every 5 seconds (not every frame — performance)

### 4.3 Real-Time Probability Display (`ProbabilityDisplay.ts`)

The centerpiece of the educational overlay. Two lines on a single chart:

- **Blue line:** Theoretical jackpot rate (flat at 1/319 = 0.00313)
- **Red line:** Actual cumulative jackpot rate (jackpots / total spins)

Early in the session, the red line is wildly volatile. Over hundreds of spins, it converges toward the blue line. This is the law of large numbers, visualized in real time.

Below the chart, a text readout:
> "Expected jackpots in 500 spins: 1.57 | Actual: 2 | Deviation: +27%"

### 4.4 Ball Path Heatmap (`HeatmapTracker.ts`)

Tracks ball positions every N frames and accumulates a 2D histogram overlaid on the board.

**Implementation:** Divide the board into a grid (e.g., 80×100 cells). Each frame, increment the cell count for each active ball's position. Render as a semi-transparent color overlay: cold (blue) for low traffic, warm (red) for high traffic.

Toggle on/off from the stats overlay. Performance-sensitive — only update every 5th frame, render every 30th.

### 4.5 RNG Transparency Mode (`RNGTransparency.ts`)

When enabled, the predetermined outcome of each spin is displayed *before* the lottery animation plays.

**Display:** A small overlay on the LCD area showing:
> "Next spin: NO JACKPOT (reach: normal)" or "Next spin: JACKPOT (kakuhen: yes)"

This reveals the core educational insight: the spinning reels are theater. The outcome was determined the instant the ball entered the chakker. The animation exists to create the *feeling* of suspense around a decision that was already made.

### 4.6 Session History Log

A scrollable event log recording every significant event with timestamp:

```
[03:21] Spin #147 — No jackpot. Reach: none.
[03:24] Spin #148 — No jackpot. Reach: normal.
[03:28] Spin #149 — JACKPOT! Full jackpot. Kakuhen: YES.
[03:28] Mode → PAYOUT (Round 1/10)
[03:45] Payout complete. +142 balls.
[03:45] Mode → KAKUHEN (odds: 1/31.9)
[03:52] Spin #150 — JACKPOT! Chain depth: 2. Kakuhen: YES.
...
```

---

## 5. Testing Checklist

### Unit Tests

- [ ] `BallEconomy` purchase correctly deducts virtual yen and adds balls
- [ ] `BallEconomy` prevents purchase when balance is insufficient
- [ ] `SessionTracker` correctly computes burn rate over rolling window
- [ ] `SessionTracker` cost-per-hour calculation matches manual computation
- [ ] `HeatmapTracker` grid accumulation produces non-zero values in expected zones
- [ ] `ProbabilityDisplay` convergence test: over 10,000 simulated spins, actual rate is within ±10% of theoretical
- [ ] All stats reset cleanly on new session

### Manual Testing

- [ ] Stats overlay toggles on/off without affecting game performance
- [ ] Economy graph updates in real time as balls are won and lost
- [ ] Probability convergence chart shows clear convergence over 500+ spins
- [ ] Heatmap reveals visible traffic patterns (dense in pin field, sparse in gutters)
- [ ] RNG transparency mode correctly predicts spin outcomes
- [ ] Cost-per-hour display produces realistic numbers (¥3,000–¥15,000/hour range)
- [ ] Session log is scrollable and records all events with correct timestamps
- [ ] Tab navigation between stat categories works on desktop and mobile

---

## 6. Testable Outcome

Player toggles the stats overlay. On the side panel, charts come alive with session data. The probability convergence chart shows their actual jackpot rate wobbling wildly above and below the theoretical line, gradually settling closer. The economy graph shows a sawtooth pattern — slow steady decline during normal play, sharp spikes during fever chains, never quite recovering. The cost-per-hour display reads ¥8,400/hour. The burn rate shows 35 balls per minute.

The player enables RNG transparency mode. Before each spin, a small overlay reveals the outcome. "No jackpot. Reach: none." The reels spin and stop — no match. "No jackpot. Reach: super." The reels spin, two match, the animation builds — they already know it won't hit. It doesn't. The drama evaporates. The truth is visible: the reels are decoration. The RNG decided before the animation started.

The heatmap overlay shows where their balls actually go — dense hot spots in the center channel, cold zones in the gutters. They adjust the dial. The hot spot shifts slightly. The chakker hit rate ticks up from 18% to 22%. Four percent. That's the entire skill ceiling.

Below the charts, a single line: *"Your dial position determines where 15–25% of balls land. The RNG determines 100% of jackpot outcomes."*

---

*PachinkoParlor — Phase 4: Ball Economy, Stats & Education*
