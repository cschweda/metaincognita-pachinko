/** Timing durations for reach animations (in ms). */
export interface ReachTiming {
  /** Time before third reel stops. */
  pauseDuration: number;
  /** Total animation duration for the reach. */
  totalDuration: number;
}

const REACH_TIMINGS: Record<string, ReachTiming> = {
  none:    { pauseDuration: 0,    totalDuration: 2000 },
  normal:  { pauseDuration: 1000, totalDuration: 3500 },
  super:   { pauseDuration: 3000, totalDuration: 6000 },
  premium: { pauseDuration: 5000, totalDuration: 8000 },
};

export function getReachTiming(reachType: string): ReachTiming {
  return REACH_TIMINGS[reachType] ?? REACH_TIMINGS['none']!;
}
