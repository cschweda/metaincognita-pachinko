import type { BallEconomyState, SessionStats } from '../types/economy';
import {
  BALL_COST_YEN, BALL_EXCHANGE_YEN,
  PURCHASE_BATCH_SIZE, PURCHASE_BATCH_COST,
  STARTING_BALANCE_YEN,
} from '../types/economy';
import { bridge } from '../utils/bridge';

const STORAGE_KEY = 'pachinko_lifetime_stats';
const NORMAL_SPIN_PAYOUT = 3;
const PAYOUT_BALLS_PER_ENTRY = 15;

interface LifetimeStats {
  sessions: number;
  ballsPurchased: number;
  yenSpent: number;
  jackpots: number;
  spins: number;
}

export class BallEconomy {
  private state: BallEconomyState;
  private stats: SessionStats;
  private burnWindow: number[] = [];  // timestamps of recent ball losses for burn rate

  constructor() {
    const lifetime = this.loadLifetime();

    this.state = {
      ballsOwned: PURCHASE_BATCH_SIZE,
      ballsInPlay: 0,
      ballsLaunched: 0,
      ballsLost: 0,
      ballsWon: 0,
    };

    this.stats = {
      ballsPurchased: PURCHASE_BATCH_SIZE,
      yenSpent: PURCHASE_BATCH_COST,
      yenValue: 0,
      netYen: -PURCHASE_BATCH_COST,

      totalSpins: 0,
      totalJackpots: 0,
      totalReaches: 0,
      jackpotRate: 0,
      longestDrought: 0,
      currentDrought: 0,

      sessionStartTime: Date.now(),
      sessionDuration: 0,
      burnRate: 0,

      lifetimeSessions: lifetime.sessions + 1,
      lifetimeBallsPurchased: lifetime.ballsPurchased + PURCHASE_BATCH_SIZE,
      lifetimeYenSpent: lifetime.yenSpent + PURCHASE_BATCH_COST,
      lifetimeJackpots: lifetime.jackpots,
      lifetimeSpins: lifetime.spins,
    };

    this.saveLifetime();
  }

  // ---- Ball operations ----

  launch(): boolean {
    if (this.state.ballsOwned <= 0) return false;
    this.state.ballsOwned--;
    this.state.ballsInPlay++;
    this.state.ballsLaunched++;
    this.emitUpdate();
    return true;
  }

  lose(): void {
    this.state.ballsInPlay = Math.max(0, this.state.ballsInPlay - 1);
    this.state.ballsLost++;
    this.burnWindow.push(Date.now());
    this.emitUpdate();
  }

  awardChakkerPayout(): void {
    this.state.ballsOwned += NORMAL_SPIN_PAYOUT;
    this.state.ballsWon += NORMAL_SPIN_PAYOUT;
    this.emitUpdate();
  }

  awardPayoutGateEntry(): void {
    this.state.ballsOwned += PAYOUT_BALLS_PER_ENTRY;
    this.state.ballsWon += PAYOUT_BALLS_PER_ENTRY;
    this.emitUpdate();
  }

  awardBalls(count: number): void {
    this.state.ballsOwned += count;
    this.state.ballsWon += count;
    this.emitUpdate();
  }

  // ---- Purchasing ----

  /** Buy 250 balls for ¥1,000. Returns false if insufficient balance. */
  purchaseBalls(): boolean {
    const currentBalance = STARTING_BALANCE_YEN - this.stats.yenSpent;
    if (currentBalance < PURCHASE_BATCH_COST) return false;

    this.state.ballsOwned += PURCHASE_BATCH_SIZE;
    this.stats.ballsPurchased += PURCHASE_BATCH_SIZE;
    this.stats.yenSpent += PURCHASE_BATCH_COST;
    this.stats.lifetimeBallsPurchased += PURCHASE_BATCH_SIZE;
    this.stats.lifetimeYenSpent += PURCHASE_BATCH_COST;

    this.saveLifetime();
    this.emitUpdate();
    return true;
  }

  /** How much virtual yen remains to spend. */
  getBalance(): number {
    return STARTING_BALANCE_YEN - this.stats.yenSpent;
  }

  canPurchase(): boolean {
    return this.getBalance() >= PURCHASE_BATCH_COST;
  }

  // ---- Cash out ----

  /** Cash out remaining balls at exchange rate. Returns value in yen. */
  cashOut(): number {
    const value = Math.floor(this.state.ballsOwned * BALL_EXCHANGE_YEN);
    this.state.ballsOwned = 0;
    this.saveLifetime();
    this.emitUpdate();
    return value;
  }

  // ---- Spin tracking ----

  recordSpin(isJackpot: boolean, isReach: boolean): void {
    this.stats.totalSpins++;
    this.stats.currentDrought++;
    this.stats.lifetimeSpins++;

    if (isReach) this.stats.totalReaches++;

    if (isJackpot) {
      this.stats.totalJackpots++;
      this.stats.lifetimeJackpots++;
      if (this.stats.currentDrought > this.stats.longestDrought) {
        this.stats.longestDrought = this.stats.currentDrought;
      }
      this.stats.currentDrought = 0;
    }

    this.stats.jackpotRate = this.stats.totalSpins > 0
      ? this.stats.totalJackpots / this.stats.totalSpins
      : 0;

    this.saveLifetime();
    this.emitUpdate();
  }

  // ---- Stats ----

  getState(): Readonly<BallEconomyState> {
    return this.state;
  }

  getStats(): Readonly<SessionStats> {
    // Update computed fields
    this.stats.sessionDuration = Date.now() - this.stats.sessionStartTime;
    this.stats.yenValue = Math.floor(this.state.ballsOwned * BALL_EXCHANGE_YEN);
    this.stats.netYen = this.stats.yenValue - this.stats.yenSpent;
    this.stats.burnRate = this.calculateBurnRate();
    return this.stats;
  }

  canLaunch(): boolean {
    return this.state.ballsOwned > 0;
  }

  isExhausted(): boolean {
    return this.state.ballsOwned <= 0 && this.state.ballsInPlay <= 0;
  }

  // ---- Burn rate (balls lost per minute, rolling 2-minute window) ----

  private calculateBurnRate(): number {
    const now = Date.now();
    const windowMs = 120000; // 2 minutes
    this.burnWindow = this.burnWindow.filter(t => now - t < windowMs);
    if (this.burnWindow.length < 2) return 0;
    const elapsed = (now - this.burnWindow[0]!) / 60000; // minutes
    return elapsed > 0 ? Math.round(this.burnWindow.length / elapsed) : 0;
  }

  // ---- Persistence ----

  private loadLifetime(): LifetimeStats {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) return JSON.parse(raw) as LifetimeStats;
    } catch { /* ignore */ }
    return { sessions: 0, ballsPurchased: 0, yenSpent: 0, jackpots: 0, spins: 0 };
  }

  private saveLifetime(): void {
    try {
      const data: LifetimeStats = {
        sessions: this.stats.lifetimeSessions,
        ballsPurchased: this.stats.lifetimeBallsPurchased,
        yenSpent: this.stats.lifetimeYenSpent,
        jackpots: this.stats.lifetimeJackpots,
        spins: this.stats.lifetimeSpins,
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch { /* ignore */ }
  }

  private emitUpdate(): void {
    bridge.emit({ type: 'economy:updated', data: { ...this.state } });
    bridge.emit({ type: 'economy:ballsRemaining', data: { remaining: this.state.ballsOwned } });
    if (this.isExhausted()) {
      bridge.emit({ type: 'economy:empty' });
    }
  }
}
