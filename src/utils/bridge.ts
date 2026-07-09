// Phaser <-> DOM event bridge
// This is the ONLY connection between the Phaser game canvas and the DOM UI.

import type { SpinResult } from '../lottery/SpinResult';
import type { BallEconomyState, SessionStats } from '../types/economy';
import type { GameState } from '../types/state';

/** Every bridge event and its payload type (undefined = no payload). */
export interface GameEventMap {
  'ball:launched': undefined;
  'ball:lost': undefined;
  'ball:chakker': undefined;
  'spin:started': SpinResult;
  'spin:result': SpinResult;
  'mode:changed': { from: GameState; to: GameState };
  'payout:round': { round: number; total: number; balls: number };
  'economy:updated': BallEconomyState;
  'dial:changed': { power: number };
  'fps:updated': { fps: number };
  'economy:empty': undefined;
  'economy:ballsRemaining': { remaining: number };
  'settings:speed': { gravity: number };
  'economy:purchase': undefined;
  'economy:purchase:result': { success: boolean; balls: number };
  'economy:cashout': undefined;
  'economy:cashout:result': { value: number };
  'stats:updated': SessionStats;
  'toggle:heatmap': undefined;
}

/** Discriminated union used by emit() call sites: { type } or { type, data }. */
export type GameEvent = {
  [K in keyof GameEventMap]: GameEventMap[K] extends undefined
    ? { type: K }
    : { type: K; data: GameEventMap[K] };
}[keyof GameEventMap];

type EventCallback<K extends keyof GameEventMap> = (data: GameEventMap[K]) => void;

class GameBridge {
  private listeners = new Map<string, Set<(data: never) => void>>();

  emit(event: GameEvent): void {
    const set = this.listeners.get(event.type);
    if (!set) return;
    const data = 'data' in event ? event.data : undefined;
    for (const cb of set) {
      (cb as (d: unknown) => void)(data);
    }
  }

  on<K extends keyof GameEventMap>(type: K, callback: EventCallback<K>): void {
    let set = this.listeners.get(type);
    if (!set) {
      set = new Set();
      this.listeners.set(type, set);
    }
    set.add(callback as (data: never) => void);
  }

  off<K extends keyof GameEventMap>(type: K, callback: EventCallback<K>): void {
    this.listeners.get(type)?.delete(callback as (data: never) => void);
  }
}

export const bridge = new GameBridge();
