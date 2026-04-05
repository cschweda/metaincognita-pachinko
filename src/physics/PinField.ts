import type { PinLayout } from '../types/layout';
import { PIN_RADIUS, CATEGORY_PIN, CATEGORY_BALL, CATEGORY_WALL } from '../utils/constants';
import { getTuning } from './PhysicsConfig';

export class PinField {
  private scene: Phaser.Scene;
  private pinBodies: MatterJS.BodyType[] = [];
  private wallBodies: MatterJS.BodyType[] = [];

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
  }

  create(layout: PinLayout): void {
    this.createWalls(layout);

    // If layout has explicit pins, use them; otherwise generate Masamura pattern
    if (layout.pins.length > 0) {
      this.createExplicitPins(layout);
    } else {
      this.createMasamuraPattern(layout);
    }
  }

  private createExplicitPins(layout: PinLayout): void {
    const tuning = getTuning();
    for (const pin of layout.pins) {
      const radius = pin.radius ?? PIN_RADIUS;
      this.createPin(pin.x, pin.y, radius, tuning.pinRestitution);
    }
  }

  /**
   * Generate a Masamura-style offset grid.
   * Alternating rows are shifted by half the horizontal spacing.
   * Clear zones are left for the LCD display and launch rail.
   */
  private createMasamuraPattern(layout: PinLayout): void {
    const tuning = getTuning();
    const spacingX = 28;
    const spacingY = 30;
    const startX = 50;
    const endX = 715;      // Close to right wall but leave ball-width gap to prevent wedging
    const startY = 55;     // Start higher so balls enter INTO the pin field from top
    const endY = 950;

    // Reserved zones (no pins placed here)
    const lcd = layout.lcdDisplay;
    const chakker = layout.startChakker;
    const launchRailLeft = 715;

    let rowIndex = 0;
    for (let y = startY; y < endY; y += spacingY) {
      const offset = (rowIndex % 2 === 1) ? spacingX / 2 : 0;
      for (let x = startX + offset; x < endX; x += spacingX) {
        // Skip launch rail zone
        if (x > launchRailLeft) continue;

        // Skip LCD display zone (with padding)
        if (lcd && x > lcd.x - 20 && x < lcd.x + lcd.width + 20 &&
            y > lcd.y - 20 && y < lcd.y + lcd.height + 20) {
          continue;
        }

        // Skip start chakker zone (with padding)
        if (chakker && x > chakker.x - 30 && x < chakker.x + chakker.width + 30 &&
            y > chakker.y - 15 && y < chakker.y + chakker.height + 15) {
          continue;
        }

        // Slightly narrower pin field in the lower section to funnel balls
        if (y > 700) {
          const funnelFactor = (y - 700) / 300;
          const innerLeft = startX + funnelFactor * 60;
          const innerRight = endX - funnelFactor * 60;
          if (x < innerLeft || x > innerRight) continue;
        }

        this.createPin(x, y, PIN_RADIUS, tuning.pinRestitution);
      }
      rowIndex++;
    }
  }

  private createPin(x: number, y: number, radius: number, restitution: number): void {
    const pin = this.scene.matter.add.circle(x, y, radius, {
      isStatic: true,
      restitution,
      friction: 0,
      collisionFilter: {
        category: CATEGORY_PIN,
        mask: CATEGORY_BALL,
      },
      label: 'pin',
    });
    this.pinBodies.push(pin);
  }

  private createWalls(layout: PinLayout): void {
    for (const wall of layout.walls) {
      const cx = (wall.x1 + wall.x2) / 2;
      const cy = (wall.y1 + wall.y2) / 2;
      const dx = wall.x2 - wall.x1;
      const dy = wall.y2 - wall.y1;
      const length = Math.sqrt(dx * dx + dy * dy);
      const angle = Math.atan2(dy, dx);
      const thickness = wall.thickness ?? 4;

      const body = this.scene.matter.add.rectangle(cx, cy, length, thickness, {
        isStatic: true,
        angle,
        restitution: 0.3,
        friction: 0.05,
        collisionFilter: {
          category: CATEGORY_WALL,
          mask: CATEGORY_BALL,
        },
        label: 'wall',
      });
      this.wallBodies.push(body);
    }
  }

  getPinCount(): number {
    return this.pinBodies.length;
  }

  destroy(): void {
    for (const body of this.pinBodies) {
      this.scene.matter.world.remove(body);
    }
    for (const body of this.wallBodies) {
      this.scene.matter.world.remove(body);
    }
    this.pinBodies = [];
    this.wallBodies = [];
  }
}
