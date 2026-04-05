import { bridge } from '../utils/bridge';

export interface KakuhenConfig {
  kakuhenRate: number;         // Probability jackpot triggers kakuhen (e.g., 0.65)
  oddsMultiplier: number;      // Odds boost during kakuhen (e.g., 10)
  spinLimit: number;           // Max spins before fallback to jitan (e.g., 100)
}

const HIGH_SPEC_KAKUHEN: KakuhenConfig = {
  kakuhenRate: 0.65,
  oddsMultiplier: 10,
  spinLimit: 100,
};

export interface KakuhenState {
  active: boolean;
  spinsRemaining: number;
  spinsUsed: number;
  chainDepth: number;
  oddsMultiplier: number;
}

export class KakuhenController {
  private config: KakuhenConfig;
  private state: KakuhenState;

  constructor(config?: KakuhenConfig) {
    this.config = config ?? HIGH_SPEC_KAKUHEN;
    this.state = this.createInactiveState();
  }

  private createInactiveState(): KakuhenState {
    return {
      active: false,
      spinsRemaining: 0,
      spinsUsed: 0,
      chainDepth: 0,
      oddsMultiplier: 1,
    };
  }

  /** Roll whether a jackpot triggers kakuhen. */
  rollKakuhen(): boolean {
    return Math.random() < this.config.kakuhenRate;
  }

  /** Activate kakuhen (fever mode). chainDepth increments if already in a chain. */
  activate(isChain: boolean): void {
    this.state.active = true;
    this.state.spinsRemaining = this.config.spinLimit;
    this.state.spinsUsed = 0;
    this.state.oddsMultiplier = this.config.oddsMultiplier;
    if (isChain) {
      this.state.chainDepth++;
    } else {
      this.state.chainDepth = 1;
    }
  }

  /** Consume a spin during kakuhen. Returns true if spins remain. */
  consumeSpin(): boolean {
    if (!this.state.active) return false;
    this.state.spinsUsed++;
    this.state.spinsRemaining--;
    return this.state.spinsRemaining > 0;
  }

  /** Deactivate kakuhen (fever ends). */
  deactivate(): void {
    this.state = this.createInactiveState();
  }

  getState(): Readonly<KakuhenState> {
    return this.state;
  }

  isActive(): boolean {
    return this.state.active;
  }

  getOddsMultiplier(): number {
    return this.state.active ? this.state.oddsMultiplier : 1;
  }

  getChainDepth(): number {
    return this.state.chainDepth;
  }

  getSpinsRemaining(): number {
    return this.state.spinsRemaining;
  }
}
