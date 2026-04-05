import type { HistoryLog, HistoryEntry } from '../stats/HistoryLog';

export class HistoryView {
  private container: HTMLElement;
  private historyLog: HistoryLog;
  private currentFilter = 'all';

  constructor(container: HTMLElement, historyLog: HistoryLog) {
    this.container = container;
    this.historyLog = historyLog;
  }

  show(): void {
    this.container.style.display = 'block';
    this.render();
  }

  hide(): void {
    this.container.style.display = 'none';
  }

  private render(): void {
    const entries = this.historyLog.getFilteredEntries(this.currentFilter);

    this.container.innerHTML = `
      <div class="history-page">
        <div class="history-header">
          <h2>Session History</h2>
          <div class="history-controls">
            <div class="filter-buttons">
              <button class="filter-btn ${this.currentFilter === 'all' ? 'active' : ''}" data-filter="all">All</button>
              <button class="filter-btn ${this.currentFilter === 'spins' ? 'active' : ''}" data-filter="spins">Spins</button>
              <button class="filter-btn ${this.currentFilter === 'jackpots' ? 'active' : ''}" data-filter="jackpots">Jackpots</button>
              <button class="filter-btn ${this.currentFilter === 'modes' ? 'active' : ''}" data-filter="modes">Modes</button>
            </div>
            <button class="btn-small btn-export" id="btn-csv-export">Export CSV</button>
          </div>
        </div>
        <div class="history-table-wrap">
          <table class="history-table">
            <thead>
              <tr>
                <th>#</th>
                <th>Time</th>
                <th>Event</th>
                <th>Reels</th>
                <th>Reach</th>
                <th>Result</th>
              </tr>
            </thead>
            <tbody>
              ${entries.length === 0
                ? '<tr><td colspan="6" class="text-dim" style="text-align:center;padding:2rem;">No events yet. Start playing!</td></tr>'
                : entries.slice().reverse().map(e => this.renderRow(e)).join('')
              }
            </tbody>
          </table>
        </div>
        <div class="history-footer text-dim">
          ${entries.length} events
        </div>
      </div>
    `;

    this.bindEvents();
  }

  private renderRow(entry: HistoryEntry): string {
    const r = entry.spinResult;
    const rowClass = entry.eventType === 'jackpot' ? 'row-jackpot'
      : entry.eventType === 'mode_change' ? 'row-mode'
      : r?.reachType !== 'none' ? 'row-reach'
      : '';

    const reels = r ? `${r.reelValues[0]} ${r.reelValues[1]} ${r.reelValues[2]}` : '--';
    const reach = r?.reachType !== 'none' ? (r?.reachType ?? '--') : '--';
    const result = entry.eventType === 'jackpot'
      ? (r?.jackpotType === 'koatari' ? 'KOATARI' : 'JACKPOT')
      : entry.eventType === 'mode_change'
        ? entry.mode ?? ''
        : entry.eventType === 'purchase'
          ? '+250 balls'
          : r?.reachType !== 'none' ? 'Miss (reach)' : 'Miss';

    return `<tr class="${rowClass}">
      <td>${entry.id}</td>
      <td>${entry.timeLabel}</td>
      <td>${entry.eventType}</td>
      <td class="mono">${reels}</td>
      <td>${reach}</td>
      <td>${result}</td>
    </tr>`;
  }

  private bindEvents(): void {
    this.container.querySelectorAll('.filter-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        this.currentFilter = (btn as HTMLElement).dataset['filter'] ?? 'all';
        this.render();
      });
    });

    this.container.querySelector('#btn-csv-export')?.addEventListener('click', () => {
      const csv = this.historyLog.toCSV();
      const blob = new Blob([csv], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `pachinko-history-${Date.now()}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    });
  }
}
