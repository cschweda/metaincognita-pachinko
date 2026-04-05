import { bridge } from '../utils/bridge';
import type { SpinResult } from '../lottery/SpinResult';

export interface HistoryEntry {
  id: number;
  timestamp: number;
  timeLabel: string;
  eventType: 'spin' | 'jackpot' | 'mode_change' | 'purchase' | 'chakker';
  spinResult?: SpinResult;
  mode?: string;
  ballsWon?: number;
  ballsLost?: number;
  netPosition?: number;
}

export class HistoryLog {
  private entries: HistoryEntry[] = [];
  private nextId = 1;
  private startTime: number;
  private currentNet = 0;

  constructor() {
    this.startTime = Date.now();
    this.subscribe();
  }

  private subscribe(): void {
    bridge.on('spin:result', (data) => {
      const result = data as SpinResult;
      const won = result.isJackpot ? 0 : 3; // chakker payout already awarded
      this.addEntry({
        eventType: result.isJackpot ? 'jackpot' : 'spin',
        spinResult: result,
        ballsWon: won,
      });
    });

    bridge.on('mode:changed', (data) => {
      const d = data as { from: string; to: string };
      this.addEntry({
        eventType: 'mode_change',
        mode: d.to,
      });
    });

    bridge.on('economy:purchase', () => {
      this.addEntry({
        eventType: 'purchase',
        ballsWon: 250,
      });
    });
  }

  private addEntry(partial: Partial<HistoryEntry>): void {
    const elapsed = Date.now() - this.startTime;
    const mins = Math.floor(elapsed / 60000);
    const secs = Math.floor((elapsed % 60000) / 1000);

    this.entries.push({
      id: this.nextId++,
      timestamp: Date.now(),
      timeLabel: `${mins}:${secs.toString().padStart(2, '0')}`,
      eventType: 'spin',
      ...partial,
    });
  }

  getEntries(): readonly HistoryEntry[] {
    return this.entries;
  }

  getFilteredEntries(filter?: string): HistoryEntry[] {
    if (!filter || filter === 'all') return [...this.entries];
    return this.entries.filter(e => {
      if (filter === 'spins') return e.eventType === 'spin' || e.eventType === 'jackpot';
      if (filter === 'jackpots') return e.eventType === 'jackpot';
      if (filter === 'modes') return e.eventType === 'mode_change';
      return true;
    });
  }

  toCSV(): string {
    const header = 'ID,Time,Type,Reel1,Reel2,Reel3,Reach,Jackpot,JackpotType,Mode\n';
    const rows = this.entries.map(e => {
      const r = e.spinResult;
      return [
        e.id,
        e.timeLabel,
        e.eventType,
        r?.reelValues[0] ?? '',
        r?.reelValues[1] ?? '',
        r?.reelValues[2] ?? '',
        r?.reachType ?? '',
        r?.isJackpot ?? '',
        r?.jackpotType ?? '',
        e.mode ?? '',
      ].join(',');
    }).join('\n');
    return header + rows;
  }
}
