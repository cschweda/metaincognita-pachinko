import { bridge } from '../utils/bridge';
import type { SpinResult } from '../lottery/SpinResult';
import type { BallEconomyState, SessionStats } from '../types/economy';
import { PURCHASE_BATCH_SIZE, PURCHASE_BATCH_COST, STARTING_BALANCE_YEN, BALL_EXCHANGE_YEN } from '../types/economy';

export class StatsColumn {
  private container: HTMLElement;
  private ballsOwned = PURCHASE_BATCH_SIZE;
  private ballsWon = 0;
  private ballsLaunched = 0;
  private ballsLost = 0;
  private ballsInPlay = 0;
  private fps = 0;
  private dialPower = 0;
  private isEmpty = false;
  private currentMode = 'NORMAL';
  private lastSpinResult: SpinResult | null = null;
  private spinLog: SpinResult[] = [];
  private payoutRound = 0;
  private payoutTotal = 0;

  // Economy stats (updated via bridge)
  private stats: Partial<SessionStats> = {};

  constructor(container: HTMLElement) {
    this.container = container;
    this.render();
    this.subscribe();
    this.bindButtons();
  }

  private subscribe(): void {
    bridge.on('economy:updated', (data) => {
      const d = data as BallEconomyState;
      this.ballsOwned = d.ballsOwned;
      this.ballsWon = d.ballsWon;
      this.ballsInPlay = d.ballsInPlay;
      this.ballsLaunched = d.ballsLaunched;
      this.ballsLost = d.ballsLost;
      this.update();
    });

    bridge.on('economy:ballsRemaining', (data) => {
      this.ballsOwned = (data as { remaining: number }).remaining;
      this.update();
    });

    bridge.on('economy:empty', () => {
      this.isEmpty = true;
      this.update();
      this.flashCard('balls-card');
    });

    bridge.on('fps:updated', (data) => {
      this.fps = (data as { fps: number }).fps;
      this.update();
    });

    bridge.on('dial:changed', (data) => {
      this.dialPower = (data as { power: number }).power;
      this.update();
    });

    bridge.on('spin:result', (data) => {
      this.lastSpinResult = data as SpinResult;
      this.spinLog.unshift(this.lastSpinResult);
      if (this.spinLog.length > 10) this.spinLog.pop();
      this.update();
    });

    bridge.on('mode:changed', (data) => {
      this.currentMode = (data as { from: string; to: string }).to;
      this.update();
    });

    bridge.on('payout:round', (data) => {
      const d = data as { round: number; total: number };
      this.payoutRound = d.round;
      this.payoutTotal = d.total;
      this.update();
    });

    bridge.on('economy:cashout:result', (data) => {
      const d = data as { value: number };
      this.showCashoutResult(d.value);
    });

    bridge.on('stats:updated', (data) => {
      this.stats = data as SessionStats;
      this.update();
    });
  }

  private render(): void {
    this.container.innerHTML = `
      <!-- Bankroll -->
      <div class="stats-card" id="balls-card">
        <h3 class="stats-card-title">Bankroll</h3>
        <div class="stat-row">
          <span class="stat-label">Balls in tray</span>
          <span class="stat-value stat-value-lg" id="stat-remaining">${PURCHASE_BATCH_SIZE}</span>
        </div>
        <div class="balls-bar-track">
          <div class="balls-bar-fill" id="balls-bar"></div>
        </div>
        <div class="stat-row">
          <span class="stat-label">Balance</span>
          <span class="stat-value" id="stat-balance">¥${(STARTING_BALANCE_YEN - PURCHASE_BATCH_COST).toLocaleString()}</span>
        </div>
        <div class="stat-row">
          <span class="stat-label">Spent</span>
          <span class="stat-value text-dim" id="stat-spent">¥${PURCHASE_BATCH_COST.toLocaleString()}</span>
        </div>
        <div class="stat-row">
          <span class="stat-label">Cash-out value</span>
          <span class="stat-value" id="stat-cashout-value">¥${Math.floor(PURCHASE_BATCH_SIZE * BALL_EXCHANGE_YEN).toLocaleString()}</span>
        </div>
        <div class="stat-row">
          <span class="stat-label">Net P&L</span>
          <span class="stat-value" id="stat-net-yen">¥0</span>
        </div>
        <div class="bankroll-buttons">
          <button class="btn-small btn-buy" id="btn-buy">Buy 250 (¥1,000)</button>
          <button class="btn-small btn-cashout" id="btn-cashout">Cash Out</button>
        </div>
        <div id="empty-message" class="empty-message" style="display: none;">
          OUT OF BALLS
        </div>
        <div id="cashout-message" class="cashout-message" style="display: none;"></div>
      </div>

      <!-- Mode -->
      <div class="stats-card" id="mode-card">
        <h3 class="stats-card-title">Mode</h3>
        <div class="mode-indicator" id="mode-indicator">NORMAL</div>
        <div id="payout-info" style="display: none;">
          <div class="stat-row">
            <span class="stat-label">Round</span>
            <span class="stat-value" id="stat-payout-round">-</span>
          </div>
        </div>
      </div>

      <!-- LCD / Last Spin -->
      <div class="stats-card" id="spin-card">
        <h3 class="stats-card-title">Last Spin</h3>
        <div id="spin-display" class="spin-display">
          <span class="reel-value">-</span>
          <span class="reel-value">-</span>
          <span class="reel-value">-</span>
        </div>
        <div class="stat-row">
          <span class="stat-label">Result</span>
          <span class="stat-value" id="spin-result-text">--</span>
        </div>
        <div id="spin-log" class="spin-log"></div>
      </div>

      <!-- Statistics -->
      <div class="stats-card">
        <h3 class="stats-card-title">Statistics</h3>
        <div class="stat-row">
          <span class="stat-label">Spins</span>
          <span class="stat-value" id="stat-spins">0</span>
        </div>
        <div class="stat-row">
          <span class="stat-label">Jackpots</span>
          <span class="stat-value text-gold" id="stat-jackpots">0</span>
        </div>
        <div class="stat-row">
          <span class="stat-label">Jackpot rate</span>
          <span class="stat-value" id="stat-jp-rate">--</span>
        </div>
        <div class="stat-row">
          <span class="stat-label">Expected (1/319)</span>
          <span class="stat-value text-dim" id="stat-expected-rate">0.31%</span>
        </div>
        <div class="stat-row">
          <span class="stat-label">Reaches</span>
          <span class="stat-value text-teal" id="stat-reaches">0</span>
        </div>
        <div class="stat-row">
          <span class="stat-label">Drought</span>
          <span class="stat-value" id="stat-drought">0</span>
        </div>
        <div class="stat-row">
          <span class="stat-label">Longest drought</span>
          <span class="stat-value" id="stat-longest-drought">0</span>
        </div>
        <div class="stat-row">
          <span class="stat-label">Burn rate</span>
          <span class="stat-value" id="stat-burn-rate">-- balls/min</span>
        </div>
        <div class="stat-row">
          <span class="stat-label">Cost/hour</span>
          <span class="stat-value" id="stat-cost-hour">--</span>
        </div>
        <div class="stat-row">
          <span class="stat-label">Session time</span>
          <span class="stat-value" id="stat-session-time">0:00</span>
        </div>
      </div>

      <!-- Lifetime -->
      <div class="stats-card">
        <h3 class="stats-card-title">Lifetime</h3>
        <div class="stat-row">
          <span class="stat-label">Sessions</span>
          <span class="stat-value" id="stat-lt-sessions">-</span>
        </div>
        <div class="stat-row">
          <span class="stat-label">Total spent</span>
          <span class="stat-value" id="stat-lt-spent">-</span>
        </div>
        <div class="stat-row">
          <span class="stat-label">Total spins</span>
          <span class="stat-value" id="stat-lt-spins">-</span>
        </div>
        <div class="stat-row">
          <span class="stat-label">Total jackpots</span>
          <span class="stat-value text-gold" id="stat-lt-jackpots">-</span>
        </div>
      </div>

      <!-- Launcher -->
      <div class="stats-card">
        <h3 class="stats-card-title">Launcher</h3>
        <div class="stat-row">
          <span class="stat-label">Dial power</span>
          <span class="stat-value" id="stat-power">0%</span>
        </div>
        <div class="power-bar-track">
          <div class="power-bar-fill" id="power-bar"></div>
        </div>
      </div>

      <!-- Speed -->
      <div class="stats-card">
        <h3 class="stats-card-title">Speed</h3>
        <div class="speed-buttons">
          <button class="speed-btn" data-speed="slow" data-gravity="0.45">Slow</button>
          <button class="speed-btn active" data-speed="normal" data-gravity="0.7">Normal</button>
          <button class="speed-btn" data-speed="fast" data-gravity="1.0">Fast</button>
        </div>
      </div>

      <!-- Controls -->
      <div class="stats-card stats-hint" id="hint-card">
        <div id="hint-contextual"></div>
        <hr class="hint-divider">
        <p><kbd>&larr;</kbd> <kbd>&rarr;</kbd> adjust dial power</p>
        <p>Hold <kbd>Space</kbd> to fire balls</p>
        <p>Mouse wheel for fine adjustment</p>
        <p>Click + drag dial to aim &amp; fire</p>
        <p>Press <kbd>D</kbd> for physics tuning</p>
      </div>

      <!-- FPS -->
      <div class="stats-card">
        <div class="stat-row">
          <span class="stat-label">FPS</span>
          <span class="stat-value" id="stat-fps">--</span>
        </div>
      </div>
    `;
  }

  private bindButtons(): void {
    // Buy balls
    this.container.querySelector('#btn-buy')?.addEventListener('click', () => {
      bridge.emit({ type: 'economy:purchase' });
      this.isEmpty = false;
    });

    // Cash out
    this.container.querySelector('#btn-cashout')?.addEventListener('click', () => {
      bridge.emit({ type: 'economy:cashout' });
    });

    // Speed buttons
    this.container.querySelectorAll('.speed-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const gravity = parseFloat((btn as HTMLElement).dataset['gravity'] ?? '0.7');
        bridge.emit({ type: 'settings:speed', data: { gravity } });
        this.container.querySelectorAll('.speed-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
      });
    });
  }

  private update(): void {
    const set = (id: string, text: string) => {
      const el = this.container.querySelector(`#${id}`);
      if (el) el.textContent = text;
    };

    // Bankroll
    set('stat-remaining', String(this.ballsOwned));
    set('stat-cashout-value', `¥${Math.floor(this.ballsOwned * BALL_EXCHANGE_YEN).toLocaleString()}`);

    // Balls bar
    const ballsBar = this.container.querySelector('#balls-bar') as HTMLElement | null;
    if (ballsBar) {
      const maxBalls = 500; // scale bar relative to a reasonable max
      const pct = Math.min(100, (this.ballsOwned / maxBalls) * 100);
      ballsBar.style.width = `${pct}%`;
      ballsBar.style.backgroundColor = this.ballsOwned <= 25 ? 'var(--red)'
        : this.ballsOwned <= 75 ? 'var(--gold)' : 'var(--green)';
    }

    const remainEl = this.container.querySelector('#stat-remaining');
    if (remainEl) {
      remainEl.className = `stat-value stat-value-lg ${
        this.ballsOwned <= 25 ? 'text-red' : this.ballsOwned <= 75 ? 'text-gold' : ''
      }`;
    }

    // Economy stats — pull from stats object when available
    const yenSpent = this.stats.yenSpent ?? PURCHASE_BATCH_COST;
    const balance = STARTING_BALANCE_YEN - yenSpent;
    const cashoutValue = Math.floor(this.ballsOwned * BALL_EXCHANGE_YEN);
    const netYen = cashoutValue - yenSpent;

    set('stat-balance', `¥${balance.toLocaleString()}`);
    set('stat-spent', `¥${yenSpent.toLocaleString()}`);

    const netEl = this.container.querySelector('#stat-net-yen');
    if (netEl) {
      netEl.textContent = `${netYen >= 0 ? '+' : ''}¥${netYen.toLocaleString()}`;
      netEl.className = `stat-value ${netYen >= 0 ? 'text-green' : 'text-red'}`;
    }

    // Buy button state
    const buyBtn = this.container.querySelector('#btn-buy') as HTMLButtonElement | null;
    if (buyBtn) {
      buyBtn.disabled = balance < PURCHASE_BATCH_COST;
    }

    // Mode
    const modeEl = this.container.querySelector('#mode-indicator') as HTMLElement | null;
    if (modeEl) {
      modeEl.textContent = this.currentMode;
      modeEl.className = `mode-indicator mode-${this.currentMode.toLowerCase()}`;
    }

    const payoutInfo = this.container.querySelector('#payout-info') as HTMLElement | null;
    if (payoutInfo) {
      if (this.currentMode === 'PAYOUT') {
        payoutInfo.style.display = 'block';
        set('stat-payout-round', `${this.payoutRound} / ${this.payoutTotal}`);
      } else {
        payoutInfo.style.display = 'none';
      }
    }

    // Spin display
    if (this.lastSpinResult) {
      const reels = this.container.querySelectorAll('.reel-value');
      reels.forEach((el, i) => {
        el.textContent = String(this.lastSpinResult!.reelValues[i]);
        el.className = this.lastSpinResult!.isJackpot ? 'reel-value reel-jackpot'
          : (this.lastSpinResult!.reachType !== 'none' && i < 2) ? 'reel-value reel-reach'
          : 'reel-value';
      });

      const resultText = this.lastSpinResult.isJackpot
        ? (this.lastSpinResult.jackpotType === 'koatari' ? 'KOATARI!' : 'JACKPOT!')
        : this.lastSpinResult.reachType !== 'none'
          ? `${this.lastSpinResult.reachType.toUpperCase()} REACH`
          : 'No match';
      set('spin-result-text', resultText);

      const resultEl = this.container.querySelector('#spin-result-text');
      if (resultEl) {
        resultEl.className = `stat-value ${
          this.lastSpinResult.isJackpot ? 'text-gold' :
          this.lastSpinResult.reachType !== 'none' ? 'text-teal' : 'text-dim'
        }`;
      }
    }

    // Spin log
    const logEl = this.container.querySelector('#spin-log');
    if (logEl) {
      logEl.innerHTML = this.spinLog.slice(0, 5).map(s => {
        const vals = s.reelValues.join(' ');
        const cls = s.isJackpot ? 'log-jackpot' : s.reachType !== 'none' ? 'log-reach' : 'log-miss';
        return `<div class="spin-log-entry ${cls}">${vals}</div>`;
      }).join('');
    }

    // Statistics
    const totalSpins = this.stats.totalSpins ?? 0;
    const totalJackpots = this.stats.totalJackpots ?? 0;
    const totalReaches = this.stats.totalReaches ?? 0;
    const jpRate = totalSpins > 0 ? (totalJackpots / totalSpins * 100).toFixed(2) + '%' : '--';
    const drought = this.stats.currentDrought ?? 0;
    const longestDrought = this.stats.longestDrought ?? 0;
    const burnRate = this.stats.burnRate ?? 0;
    const costHour = burnRate > 0 ? `¥${Math.round(burnRate * 60 * 4).toLocaleString()}/hr` : '--';

    set('stat-spins', String(totalSpins));
    set('stat-jackpots', String(totalJackpots));
    set('stat-jp-rate', jpRate);
    set('stat-reaches', String(totalReaches));
    set('stat-drought', String(drought));
    set('stat-longest-drought', String(longestDrought));
    set('stat-burn-rate', burnRate > 0 ? `${burnRate} balls/min` : '-- balls/min');
    set('stat-cost-hour', costHour);

    // Session time
    const elapsed = this.stats.sessionDuration ?? 0;
    const mins = Math.floor(elapsed / 60000);
    const secs = Math.floor((elapsed % 60000) / 1000);
    set('stat-session-time', `${mins}:${secs.toString().padStart(2, '0')}`);

    // Lifetime
    set('stat-lt-sessions', String(this.stats.lifetimeSessions ?? '-'));
    set('stat-lt-spent', `¥${(this.stats.lifetimeYenSpent ?? 0).toLocaleString()}`);
    set('stat-lt-spins', String(this.stats.lifetimeSpins ?? 0));
    set('stat-lt-jackpots', String(this.stats.lifetimeJackpots ?? 0));

    // Power bar
    const powerBar = this.container.querySelector('#power-bar') as HTMLElement | null;
    if (powerBar) {
      powerBar.style.width = `${this.dialPower * 100}%`;
      powerBar.style.backgroundColor = this.dialPower > 0.2 ? 'var(--gold)' : 'var(--text-muted)';
    }
    set('stat-power', `${Math.round(this.dialPower * 100)}%`);

    // FPS
    set('stat-fps', String(this.fps));
    const fpsEl = this.container.querySelector('#stat-fps');
    if (fpsEl) {
      fpsEl.className = `stat-value ${this.fps >= 55 ? 'text-green' : this.fps >= 45 ? 'text-gold' : 'text-red'}`;
    }

    // Empty message
    const emptyMsg = this.container.querySelector('#empty-message') as HTMLElement | null;
    if (emptyMsg) {
      emptyMsg.style.display = (this.isEmpty && this.ballsOwned <= 0) ? 'block' : 'none';
    }

    // Contextual hint
    const hintEl = this.container.querySelector('#hint-contextual') as HTMLElement | null;
    if (hintEl) {
      if (this.isEmpty && this.ballsOwned <= 0) {
        hintEl.innerHTML = balance >= PURCHASE_BATCH_COST
          ? '<span class="hint-action">Buy more balls or cash out</span>'
          : '<span class="hint-alert">No balls or balance remaining</span>';
      } else if (this.currentMode === 'PAYOUT') {
        hintEl.innerHTML = '<span class="hint-action">Aim balls at the payout gate!</span>';
      } else if (this.dialPower <= 0) {
        hintEl.innerHTML = '<span class="hint-action">Press <kbd>&rarr;</kbd> to set dial power</span>';
      } else if (this.dialPower <= 0.2) {
        hintEl.innerHTML = '<span class="hint-warn">Power too low — increase past 20%</span>';
      } else if (this.ballsLaunched === 0) {
        hintEl.innerHTML = '<span class="hint-action">Hold <kbd>Space</kbd> to launch!</span>';
      } else if (this.dialPower >= 0.4 && this.dialPower <= 0.7) {
        hintEl.innerHTML = '<span class="hint-good">Sweet spot! Best chance at center gate</span>';
      } else if (this.dialPower > 0.9) {
        hintEl.innerHTML = '<span class="hint-warn">Too much power — balls may overshoot</span>';
      } else {
        hintEl.innerHTML = '<span class="hint-neutral">Hold <kbd>Space</kbd> to fire</span>';
      }
    }
  }

  /** Called by BoardScene to push session stats into the UI. */
  updateStats(stats: SessionStats): void {
    this.stats = stats;
    this.update();
  }

  private showCashoutResult(value: number): void {
    const msg = this.container.querySelector('#cashout-message') as HTMLElement | null;
    if (msg) {
      msg.style.display = 'block';
      msg.innerHTML = `Cashed out <strong>¥${value.toLocaleString()}</strong>`;
      msg.className = 'cashout-message ' + (value > 0 ? 'cashout-positive' : '');
    }
  }

  private flashCard(id: string): void {
    const card = this.container.querySelector(`#${id}`) as HTMLElement | null;
    if (!card) return;
    card.classList.add('flash-red');
    let flashes = 0;
    const interval = setInterval(() => {
      flashes++;
      card.classList.toggle('flash-red');
      if (flashes >= 6) {
        clearInterval(interval);
        card.classList.add('flash-red');
      }
    }, 300);
  }
}
