import { describe, it, expect } from 'vitest';
import { HistoryLog } from '../../src/stats/HistoryLog';
import { bridge } from '../../src/utils/bridge';

describe('HistoryLog purchases', () => {
  it('logs a purchase only when the purchase actually succeeded', () => {
    const log = new HistoryLog();

    bridge.emit({ type: 'economy:purchase:result', data: { success: true, balls: 250 } });

    const entries = log.getEntries();
    expect(entries.length).toBe(1);
    expect(entries[0]!.eventType).toBe('purchase');
    expect(entries[0]!.ballsWon).toBe(250);
  });

  it('does not log a failed purchase (regression: phantom +250 rows)', () => {
    const log = new HistoryLog();

    bridge.emit({ type: 'economy:purchase:result', data: { success: false, balls: 0 } });

    expect(log.getEntries().length).toBe(0);
  });

  it('does not log on the purchase request event', () => {
    const log = new HistoryLog();

    // The request fires regardless of whether the buy will succeed
    bridge.emit({ type: 'economy:purchase' });

    expect(log.getEntries().length).toBe(0);
  });
});
