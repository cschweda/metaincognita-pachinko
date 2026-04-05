import type { PhysicsTuning } from '../types/physics';
import { DEFAULT_TUNING } from '../types/physics';

// Mutable runtime tuning — modified by the dev panel
let currentTuning: PhysicsTuning = { ...DEFAULT_TUNING };

export function getTuning(): Readonly<PhysicsTuning> {
  return currentTuning;
}

export function setTuning(partial: Partial<PhysicsTuning>): void {
  currentTuning = { ...currentTuning, ...partial };
}

export function resetTuning(): void {
  currentTuning = { ...DEFAULT_TUNING };
}
