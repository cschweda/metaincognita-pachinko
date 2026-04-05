export interface SpinResult {
  isJackpot: boolean;
  jackpotType?: 'full' | 'koatari';
  reelValues: [number, number, number];
  reachType: 'none' | 'normal' | 'super' | 'premium';
  // Phase 3 additions (stubbed)
  triggersKakuhen?: boolean;
}
