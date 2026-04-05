export interface JitanConfig {
  spinCount: number;              // Fixed number of jitan spins (e.g., 100)
  animationSpeedMultiplier: number; // Reel speed boost (e.g., 2.5)
}

const HIGH_SPEC_JITAN: JitanConfig = {
  spinCount: 100,
  animationSpeedMultiplier: 2.5,
};

export interface JitanState {
  active: boolean;
  spinsRemaining: number;
  spinsUsed: number;
  animationSpeedMultiplier: number;
}

export class JitanController {
  private config: JitanConfig;
  private state: JitanState;

  constructor(config?: JitanConfig) {
    this.config = config ?? HIGH_SPEC_JITAN;
    this.state = this.createInactiveState();
  }

  private createInactiveState(): JitanState {
    return {
      active: false,
      spinsRemaining: 0,
      spinsUsed: 0,
      animationSpeedMultiplier: 1,
    };
  }

  /** Activate jitan mode. */
  activate(): void {
    this.state.active = true;
    this.state.spinsRemaining = this.config.spinCount;
    this.state.spinsUsed = 0;
    this.state.animationSpeedMultiplier = this.config.animationSpeedMultiplier;
  }

  /** Consume a spin during jitan. Returns true if spins remain. */
  consumeSpin(): boolean {
    if (!this.state.active) return false;
    this.state.spinsUsed++;
    this.state.spinsRemaining--;
    return this.state.spinsRemaining > 0;
  }

  /** Deactivate jitan. */
  deactivate(): void {
    this.state = this.createInactiveState();
  }

  getState(): Readonly<JitanState> {
    return this.state;
  }

  isActive(): boolean {
    return this.state.active;
  }

  getSpinsRemaining(): number {
    return this.state.spinsRemaining;
  }

  getAnimationSpeedMultiplier(): number {
    return this.state.active ? this.state.animationSpeedMultiplier : 1;
  }
}
