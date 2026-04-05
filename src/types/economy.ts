export interface BallEconomyState {
  ballsOwned: number;
  ballsInPlay: number;
  ballsLaunched: number;
  ballsLost: number;
  ballsWon: number;
}

export interface SessionStats {
  // Economy
  ballsPurchased: number;      // total balls bought
  yenSpent: number;            // total virtual yen spent (ballsPurchased * 4)
  yenValue: number;            // current ball value at exchange rate (ballsOwned * 2.5)
  netYen: number;              // yenValue - yenSpent

  // Lottery
  totalSpins: number;
  totalJackpots: number;
  totalReaches: number;
  jackpotRate: number;         // totalJackpots / totalSpins
  longestDrought: number;      // max spins between jackpots
  currentDrought: number;      // spins since last jackpot

  // Timing
  sessionStartTime: number;    // ms timestamp
  sessionDuration: number;     // ms elapsed
  burnRate: number;            // balls lost per minute (rolling)

  // Mode tracking
  kakuhenOddsMultiplier?: number;
  kakuhenSpinsRemaining?: number;
  kakuhenChainDepth?: number;
  jitanSpinsRemaining?: number;
  jitanSpeedMultiplier?: number;

  // Lifetime (persisted across sessions)
  lifetimeSessions: number;
  lifetimeBallsPurchased: number;
  lifetimeYenSpent: number;
  lifetimeJackpots: number;
  lifetimeSpins: number;
}

export const BALL_COST_YEN = 4;          // ¥4 per ball (purchase price)
export const BALL_EXCHANGE_YEN = 2.5;    // ¥2.5 per ball (exchange/cash-out value)
export const PURCHASE_BATCH_SIZE = 250;  // 250 balls per purchase
export const PURCHASE_BATCH_COST = BALL_COST_YEN * PURCHASE_BATCH_SIZE; // ¥1,000
export const STARTING_BALANCE_YEN = 10000; // ¥10,000 starting virtual balance
