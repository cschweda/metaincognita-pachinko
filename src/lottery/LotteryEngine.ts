import type { SpinResult } from './SpinResult';

export interface LotteryConfig {
  jackpotOdds: number;       // e.g. 319 meaning 1/319
  koatariRate: number;       // probability of koatari vs full jackpot
  reachRate: number;         // probability of reach on non-jackpot
  superReachRate: number;    // probability of super reach given reach
  premiumReachRate: number;  // probability of premium reach given reach
}

const HIGH_SPEC: LotteryConfig = {
  jackpotOdds: 319,
  koatariRate: 0.10,
  reachRate: 0.30,
  superReachRate: 0.25,
  premiumReachRate: 0.05,
};

export class LotteryEngine {
  private config: LotteryConfig;
  private queue: SpinResult[] = [];
  private static readonly MAX_QUEUE = 4;
  private totalSpins = 0;
  private totalJackpots = 0;

  constructor(config?: LotteryConfig) {
    this.config = config ?? HIGH_SPEC;
  }

  /**
   * Queue a spin. Returns true if queued, false if queue is full.
   * The outcome is determined immediately (before animation).
   */
  queueSpin(oddsMultiplier = 1): boolean {
    if (this.queue.length >= LotteryEngine.MAX_QUEUE) {
      return false;
    }
    const result = this.determineSpin(oddsMultiplier);
    this.queue.push(result);
    this.totalSpins++;
    if (result.isJackpot) this.totalJackpots++;
    return true;
  }

  /**
   * Dequeue the next resolved spin for animation.
   */
  dequeue(): SpinResult | null {
    return this.queue.shift() ?? null;
  }

  getQueueLength(): number {
    return this.queue.length;
  }

  peekNext(): SpinResult | null {
    return this.queue[0] ?? null;
  }

  getTotalSpins(): number {
    return this.totalSpins;
  }

  getTotalJackpots(): number {
    return this.totalJackpots;
  }

  private determineSpin(oddsMultiplier: number): SpinResult {
    const effectiveOdds = this.config.jackpotOdds / oddsMultiplier;
    const isJackpot = Math.random() < (1 / effectiveOdds);

    if (isJackpot) {
      return this.createJackpotResult();
    } else {
      return this.createNonJackpotResult();
    }
  }

  private createJackpotResult(): SpinResult {
    const isKoatari = Math.random() < this.config.koatariRate;
    const matchValue = Math.floor(Math.random() * 10);

    // Select reach type for jackpot — weighted toward premium
    const reachType = this.selectJackpotReachType();

    return {
      isJackpot: true,
      jackpotType: isKoatari ? 'koatari' : 'full',
      reelValues: [matchValue, matchValue, matchValue],
      reachType,
    };
  }

  private createNonJackpotResult(): SpinResult {
    const hasReach = Math.random() < this.config.reachRate;

    if (hasReach) {
      return this.createReachResult();
    } else {
      return this.createPlainResult();
    }
  }

  private createReachResult(): SpinResult {
    // Two reels match, third doesn't
    const matchValue = Math.floor(Math.random() * 10);
    let thirdValue: number;
    do {
      thirdValue = Math.floor(Math.random() * 10);
    } while (thirdValue === matchValue);

    const reachType = this.selectNonJackpotReachType();

    return {
      isJackpot: false,
      reelValues: [matchValue, matchValue, thirdValue],
      reachType,
    };
  }

  private createPlainResult(): SpinResult {
    // No matches — all three different
    const v1 = Math.floor(Math.random() * 10);
    let v2: number;
    do { v2 = Math.floor(Math.random() * 10); } while (v2 === v1);
    let v3: number;
    do { v3 = Math.floor(Math.random() * 10); } while (v3 === v1 || v3 === v2);

    return {
      isJackpot: false,
      reelValues: [v1, v2, v3],
      reachType: 'none',
    };
  }

  /**
   * Jackpot reach type — weighted toward premium/super for higher conversion rate feel.
   * 10% normal, 35% super, 55% premium
   */
  private selectJackpotReachType(): 'normal' | 'super' | 'premium' {
    const roll = Math.random();
    if (roll < 0.10) return 'normal';
    if (roll < 0.45) return 'super';
    return 'premium';
  }

  /**
   * Non-jackpot reach type — weighted toward normal (most reaches don't pay).
   * 70% normal, 25% super, 5% premium
   */
  private selectNonJackpotReachType(): 'normal' | 'super' | 'premium' {
    const roll = Math.random();
    if (roll < 0.70) return 'normal';
    if (roll < 0.95) return 'super';
    return 'premium';
  }
}
