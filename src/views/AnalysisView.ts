import type { SessionTracker } from '../stats/SessionTracker';

export class AnalysisView {
  private container: HTMLElement;
  private tracker: SessionTracker;
  private charts: Record<string, unknown> = {};

  constructor(container: HTMLElement, tracker: SessionTracker) {
    this.container = container;
    this.tracker = tracker;
  }

  show(): void {
    this.container.style.display = 'block';
    this.render();
  }

  hide(): void {
    this.container.style.display = 'none';
  }

  private render(): void {
    const dataPoints = this.tracker.getDataPoints();
    const modeTimes = this.tracker.getModeTimes();
    const reachCounts = this.tracker.getReachCounts();
    const chains = this.tracker.getChainLengths();

    this.container.innerHTML = `
      <div class="analysis-page">
        <h2>Statistical Analysis</h2>

        <div class="analysis-grid">
          <!-- Probability Convergence -->
          <div class="analysis-card">
            <h3 class="stats-card-title">Probability Convergence</h3>
            <div class="chart-area" id="chart-convergence">
              ${this.renderConvergenceChart(dataPoints)}
            </div>
            <p class="chart-caption">
              ${dataPoints.length > 0
                ? `${dataPoints.length} spins. Actual rate: ${(dataPoints[dataPoints.length - 1]!.jackpotRate * 100).toFixed(2)}% vs expected 0.31%`
                : 'No spins yet.'
              }
            </p>
          </div>

          <!-- Net Position -->
          <div class="analysis-card">
            <h3 class="stats-card-title">Net Position Over Time</h3>
            <div class="chart-area" id="chart-netposition">
              ${this.renderNetPositionChart(dataPoints)}
            </div>
            <p class="chart-caption">Balls won minus balls launched per spin</p>
          </div>

          <!-- Mode Time Distribution -->
          <div class="analysis-card">
            <h3 class="stats-card-title">Mode Time Distribution</h3>
            <div class="chart-area mode-bars">
              ${this.renderModeBars(modeTimes)}
            </div>
          </div>

          <!-- Reach Breakdown -->
          <div class="analysis-card">
            <h3 class="stats-card-title">Reach Breakdown</h3>
            <div class="chart-area reach-bars">
              ${this.renderReachBars(reachCounts)}
            </div>
          </div>

          <!-- Fever Chain Distribution -->
          <div class="analysis-card">
            <h3 class="stats-card-title">Fever Chain Lengths</h3>
            <div class="chart-area">
              ${chains.length > 0
                ? this.renderChainHistogram(chains)
                : '<p class="text-dim" style="text-align:center;padding:1rem;">No fever chains yet.</p>'
              }
            </div>
          </div>

          <!-- Key Insight -->
          <div class="analysis-card insight-card">
            <h3 class="stats-card-title">Key Insight</h3>
            <p class="insight-text">
              Your dial position determines where <strong>15–25%</strong> of balls land.
              The RNG determines <strong>100%</strong> of jackpot outcomes.
            </p>
            <p class="insight-sub text-dim">
              The pins create the illusion of influence. The RNG creates the reality.
            </p>
          </div>
        </div>
      </div>
    `;
  }

  /** Simple SVG-based convergence chart (no Chart.js dependency for Phase 4). */
  private renderConvergenceChart(dataPoints: readonly { spin: number; jackpotRate: number }[]): string {
    if (dataPoints.length < 2) return '<p class="text-dim" style="text-align:center;padding:1rem;">Need more spins for chart.</p>';

    const w = 500, h = 150, pad = 30;
    const maxSpin = dataPoints[dataPoints.length - 1]!.spin;
    const maxRate = Math.max(0.01, ...dataPoints.map(d => d.jackpotRate)) * 1.5;

    const toX = (spin: number) => pad + (spin / maxSpin) * (w - pad * 2);
    const toY = (rate: number) => h - pad - (rate / maxRate) * (h - pad * 2);

    // Actual rate line
    const actualPath = dataPoints.map((d, i) =>
      `${i === 0 ? 'M' : 'L'}${toX(d.spin).toFixed(1)},${toY(d.jackpotRate).toFixed(1)}`
    ).join(' ');

    // Expected rate line (1/319)
    const expectedY = toY(1 / 319);

    return `
      <svg viewBox="0 0 ${w} ${h}" class="chart-svg">
        <!-- Expected rate -->
        <line x1="${pad}" y1="${expectedY}" x2="${w - pad}" y2="${expectedY}" stroke="#4ecdc4" stroke-width="1" stroke-dasharray="4,3" opacity="0.6"/>
        <text x="${w - pad + 4}" y="${expectedY + 4}" fill="#4ecdc4" font-size="9" opacity="0.7">1/319</text>
        <!-- Actual rate -->
        <path d="${actualPath}" fill="none" stroke="#dc3545" stroke-width="1.5" opacity="0.8"/>
        <!-- Axis -->
        <line x1="${pad}" y1="${h - pad}" x2="${w - pad}" y2="${h - pad}" stroke="#30363d" stroke-width="1"/>
        <line x1="${pad}" y1="${pad}" x2="${pad}" y2="${h - pad}" stroke="#30363d" stroke-width="1"/>
        <text x="${w / 2}" y="${h - 5}" fill="#656d76" font-size="9" text-anchor="middle">Spins</text>
      </svg>
    `;
  }

  private renderNetPositionChart(dataPoints: readonly { spin: number; netPosition: number }[]): string {
    if (dataPoints.length < 2) return '<p class="text-dim" style="text-align:center;padding:1rem;">Need more spins for chart.</p>';

    const w = 500, h = 150, pad = 30;
    const maxSpin = dataPoints[dataPoints.length - 1]!.spin;
    const maxAbs = Math.max(10, ...dataPoints.map(d => Math.abs(d.netPosition)));

    const toX = (spin: number) => pad + (spin / maxSpin) * (w - pad * 2);
    const toY = (net: number) => h / 2 - (net / maxAbs) * (h / 2 - pad);

    const path = dataPoints.map((d, i) =>
      `${i === 0 ? 'M' : 'L'}${toX(d.spin).toFixed(1)},${toY(d.netPosition).toFixed(1)}`
    ).join(' ');

    const zeroY = h / 2;

    return `
      <svg viewBox="0 0 ${w} ${h}" class="chart-svg">
        <line x1="${pad}" y1="${zeroY}" x2="${w - pad}" y2="${zeroY}" stroke="#30363d" stroke-width="1" stroke-dasharray="3,3"/>
        <path d="${path}" fill="none" stroke="#ffd700" stroke-width="1.5" opacity="0.8"/>
        <text x="${w - pad + 4}" y="${zeroY - 4}" fill="#656d76" font-size="9">0</text>
      </svg>
    `;
  }

  private renderModeBars(modeTimes: Record<string, number>): string {
    const total = Object.values(modeTimes).reduce((a, b) => a + b, 0);
    if (total <= 0) return '<p class="text-dim" style="text-align:center;padding:1rem;">No data yet.</p>';

    const modes = [
      { key: 'NORMAL', label: 'Normal', color: 'var(--text-dim)' },
      { key: 'SPINNING', label: 'Spinning', color: 'var(--teal)' },
      { key: 'PAYOUT', label: 'Payout', color: 'var(--gold)' },
      { key: 'KAKUHEN', label: 'Fever', color: 'var(--red)' },
      { key: 'JITAN', label: 'Jitan', color: 'var(--blue)' },
    ];

    return modes.map(m => {
      const ms = modeTimes[m.key] ?? 0;
      const pct = total > 0 ? (ms / total * 100) : 0;
      return `
        <div class="mode-bar-row">
          <span class="mode-bar-label">${m.label}</span>
          <div class="mode-bar-track">
            <div class="mode-bar-fill" style="width:${pct}%;background:${m.color}"></div>
          </div>
          <span class="mode-bar-pct">${pct.toFixed(1)}%</span>
        </div>
      `;
    }).join('');
  }

  private renderReachBars(counts: Record<string, number>): string {
    const total = Object.values(counts).reduce((a, b) => a + b, 0);
    if (total <= 0) return '<p class="text-dim" style="text-align:center;padding:1rem;">No spins yet.</p>';

    const types = [
      { key: 'none', label: 'No reach', color: 'var(--text-muted)' },
      { key: 'normal', label: 'Normal', color: 'var(--teal)' },
      { key: 'super', label: 'Super', color: '#ff3366' },
      { key: 'premium', label: 'Premium', color: 'var(--gold)' },
    ];

    return types.map(t => {
      const count = counts[t.key] ?? 0;
      const pct = total > 0 ? (count / total * 100) : 0;
      return `
        <div class="mode-bar-row">
          <span class="mode-bar-label">${t.label}</span>
          <div class="mode-bar-track">
            <div class="mode-bar-fill" style="width:${pct}%;background:${t.color}"></div>
          </div>
          <span class="mode-bar-pct">${count} (${pct.toFixed(0)}%)</span>
        </div>
      `;
    }).join('');
  }

  private renderChainHistogram(chains: number[]): string {
    const maxChain = Math.max(...chains);
    const bins: number[] = new Array(maxChain + 1).fill(0) as number[];
    for (const c of chains) bins[c]!++;
    const maxBin = Math.max(...bins);

    return `
      <div class="chain-histogram">
        ${bins.map((count, len) => {
          if (len === 0) return '';
          const pct = maxBin > 0 ? (count / maxBin * 100) : 0;
          return `
            <div class="chain-bar-col">
              <div class="chain-bar" style="height:${pct}%"></div>
              <span class="chain-label">${len}</span>
            </div>
          `;
        }).join('')}
      </div>
      <p class="chart-caption">Chain length (jackpots per fever run)</p>
    `;
  }
}
