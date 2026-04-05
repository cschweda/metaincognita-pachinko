// Collision categories (bitmasking for Matter.js collision filtering)
export const CATEGORY_BALL   = 0x0001;
export const CATEGORY_PIN    = 0x0002;
export const CATEGORY_WALL   = 0x0004;
export const CATEGORY_GATE   = 0x0008;  // reserved for Phase 2
export const CATEGORY_SENSOR = 0x0010;  // reserved for Phase 2

// Physics defaults
export const PIN_RADIUS = 2;
export const BALL_RADIUS = 5;
export const MAX_BALLS = 30;
export const LAUNCH_INTERVAL_MS = 1000;
export const DEAD_ZONE_THRESHOLD = 0.20;

// Board dimensions (4:5 aspect ratio, matching real ~16"x20" playing field)
export const BOARD_WIDTH = 800;
export const BOARD_HEIGHT = 1000;

// Launch rail
export const LAUNCH_RAIL_X = 770;
export const LAUNCH_RAIL_START_Y = 950;
export const LAUNCH_RAIL_END_Y = 50;

// Dial
export const DIAL_MAX_ROTATION = 270; // degrees
export const DIAL_RADIUS = 40;

// Velocity range for ball launch (tuned for gravity 0.55)
export const MIN_LAUNCH_VELOCITY = 0;
export const MAX_LAUNCH_VELOCITY = 12;

// Exit zone: balls below this Y are despawned
export const EXIT_ZONE_Y = 990;
