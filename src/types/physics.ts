export interface PhysicsTuning {
  gravityY: number;
  ballRestitution: number;
  ballFriction: number;
  ballFrictionAir: number;
  ballDensity: number;
  pinRestitution: number;
  launchInterval: number;
  ballToBallCollisions: boolean;
}

export const DEFAULT_TUNING: PhysicsTuning = {
  gravityY: 0.7,            // Default "Normal" speed — good balance of drama and pace
  ballRestitution: 0.45,    // Slightly less bouncy for more natural feel
  ballFriction: 0.01,
  ballFrictionAir: 0.002,   // Slightly more air drag — balls slow down visibly
  ballDensity: 0.004,
  pinRestitution: 0.6,
  launchInterval: 1000,
  ballToBallCollisions: true,
};
