// Phaser <-> DOM event bridge
// This is the ONLY connection between the Phaser game canvas and the DOM UI.

export type GameEvent =
  | { type: 'ball:launched' }
  | { type: 'ball:lost' }
  | { type: 'ball:chakker' }
  | { type: 'spin:result'; data: unknown }
  | { type: 'mode:changed'; data: { from: string; to: string } }
  | { type: 'payout:round'; data: { round: number; total: number; balls: number } }
  | { type: 'economy:updated'; data: unknown }
  | { type: 'ball:position'; data: { x: number; y: number } }
  | { type: 'dial:changed'; data: { power: number } }
  | { type: 'fps:updated'; data: { fps: number } }
  | { type: 'economy:empty' }
  | { type: 'economy:ballsRemaining'; data: { remaining: number } }
  | { type: 'settings:speed'; data: { gravity: number } }
  | { type: 'economy:purchase' }
  | { type: 'economy:cashout' }
  | { type: 'economy:cashout:result'; data: { value: number } }
  | { type: 'stats:updated'; data: unknown };

type EventType = GameEvent['type'];
type EventCallback = (data?: unknown) => void;

class GameBridge {
  private listeners = new Map<string, Set<EventCallback>>();

  emit(event: GameEvent): void {
    const set = this.listeners.get(event.type);
    if (!set) return;
    const data = 'data' in event ? event.data : undefined;
    for (const cb of set) {
      cb(data);
    }
  }

  on(type: EventType, callback: EventCallback): void {
    let set = this.listeners.get(type);
    if (!set) {
      set = new Set();
      this.listeners.set(type, set);
    }
    set.add(callback);
  }

  off(type: EventType, callback: EventCallback): void {
    const set = this.listeners.get(type);
    if (set) {
      set.delete(callback);
    }
  }
}

export const bridge = new GameBridge();
