import { bridge } from '../utils/bridge';

/** Tracks per-spin data points for charts. */
export interface DataPoint {
  spin: number;
  jackpotRate: number;      // cumulative jackpots/spins
  netPosition: number;      // balls won - balls launched
  ballsOwned: number;
}

export class SessionTracker {
  private dataPoints: DataPoint[] = [];
  private totalSpins = 0;
  private totalJackpots = 0;
  private ballsLaunched = 0;
  private ballsWon = 0;
  private ballsOwned = 250;

  // Mode time tracking
  private modeStartTime = Date.now();
  private modeTimes: Record<string, number> = {
    NORMAL: 0, SPINNING: 0, PAYOUT: 0, KAKUHEN: 0, JITAN: 0, IDLE: 0,
  };
  private currentMode = 'NORMAL';

  // Reach breakdown
  private reachCounts = { none: 0, normal: 0, super: 0, premium: 0 };

  // Fever chain lengths
  private chainLengths: number[] = [];
  private currentChainLength = 0;

  constructor() {
    this.subscribe();
  }

  private subscribe(): void {
    bridge.on('spin:result', (data) => {
      const r = data as { isJackpot: boolean; reachType: string };
      this.totalSpins++;
      if (r.isJackpot) {
        this.totalJackpots++;
        this.currentChainLength++;
      }

      const reachKey = r.reachType as keyof typeof this.reachCounts;
      if (reachKey in this.reachCounts) {
        this.reachCounts[reachKey]++;
      }

      this.dataPoints.push({
        spin: this.totalSpins,
        jackpotRate: this.totalSpins > 0 ? this.totalJackpots / this.totalSpins : 0,
        netPosition: this.ballsWon - this.ballsLaunched,
        ballsOwned: this.ballsOwned,
      });
    });

    bridge.on('economy:updated', (data) => {
      const d = data as { ballsLaunched: number; ballsWon: number; ballsOwned: number };
      this.ballsLaunched = d.ballsLaunched;
      this.ballsWon = d.ballsWon;
      this.ballsOwned = d.ballsOwned;
    });

    bridge.on('mode:changed', (data) => {
      const d = data as { from: string; to: string };
      // Accumulate time in previous mode
      const now = Date.now();
      const elapsed = now - this.modeStartTime;
      if (this.currentMode in this.modeTimes) {
        this.modeTimes[this.currentMode]! += elapsed;
      }
      this.modeStartTime = now;
      this.currentMode = d.to;

      // Track fever chain endings
      if (d.from === 'KAKUHEN' && d.to !== 'PAYOUT' && d.to !== 'SPINNING') {
        // Fever ended
        if (this.currentChainLength > 0) {
          this.chainLengths.push(this.currentChainLength);
          this.currentChainLength = 0;
        }
      }
    });
  }

  getDataPoints(): readonly DataPoint[] {
    return this.dataPoints;
  }

  getModeTimes(): Record<string, number> {
    // Include current mode's elapsed time
    const result = { ...this.modeTimes };
    const now = Date.now();
    if (this.currentMode in result) {
      result[this.currentMode]! += now - this.modeStartTime;
    }
    return result;
  }

  getReachCounts(): Record<string, number> {
    return { ...this.reachCounts };
  }

  getChainLengths(): number[] {
    const result = [...this.chainLengths];
    if (this.currentChainLength > 0) {
      result.push(this.currentChainLength);
    }
    return result;
  }
}
