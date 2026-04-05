export interface PinLayout {
  name: string;
  version: string;
  dimensions: {
    width: number;
    height: number;
  };
  pins: Array<{
    x: number;
    y: number;
    radius?: number;
    type?: 'standard' | 'deflector' | 'guide';
  }>;
  walls: Array<{
    x1: number;
    y1: number;
    x2: number;
    y2: number;
    thickness?: number;
  }>;
  launchRail: {
    x: number;
    startY: number;
    endY: number;
    width: number;
  };
  exitZone: {
    y: number;
  };
  // Reserved regions (Phase 2+)
  lcdDisplay?: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  startChakker?: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
}
