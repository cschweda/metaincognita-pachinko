import { getTuning, setTuning } from '../physics/PhysicsConfig';
import type { PhysicsTuning } from '../types/physics';

interface SliderDef {
  key: keyof PhysicsTuning;
  label: string;
  min: number;
  max: number;
  step: number;
}

const SLIDERS: SliderDef[] = [
  { key: 'gravityY', label: 'Gravity Y', min: 0.1, max: 3.0, step: 0.1 },
  { key: 'ballRestitution', label: 'Ball Restitution', min: 0.0, max: 1.0, step: 0.05 },
  { key: 'pinRestitution', label: 'Pin Restitution', min: 0.0, max: 1.0, step: 0.05 },
  { key: 'ballFriction', label: 'Ball Friction', min: 0.0, max: 0.1, step: 0.005 },
  { key: 'ballFrictionAir', label: 'Ball Air Friction', min: 0.0, max: 0.01, step: 0.001 },
  { key: 'ballDensity', label: 'Ball Density', min: 0.001, max: 0.01, step: 0.001 },
  { key: 'launchInterval', label: 'Launch Interval (ms)', min: 200, max: 2000, step: 100 },
];

export class DevPanel {
  private container: HTMLElement;
  private visible = false;

  constructor(container: HTMLElement) {
    this.container = container;
    this.render();
    this.setupToggle();
  }

  private render(): void {
    const tuning = getTuning();

    let slidersHtml = '';
    for (const s of SLIDERS) {
      const value = tuning[s.key] as number;
      slidersHtml += `
        <div class="dev-slider-row">
          <label class="dev-slider-label">${s.label}</label>
          <input type="range"
            class="dev-slider"
            data-key="${s.key}"
            min="${s.min}" max="${s.max}" step="${s.step}"
            value="${value}">
          <span class="dev-slider-value" data-value-for="${s.key}">${value}</span>
        </div>
      `;
    }

    this.container.innerHTML = `
      <div class="dev-panel ${this.visible ? 'visible' : ''}">
        <div class="dev-panel-header">
          <h3>Physics Tuning (Dev Mode)</h3>
          <button id="dev-toggle-btn" class="dev-toggle-btn">&#9881;</button>
        </div>
        <div class="dev-panel-body">
          ${slidersHtml}
          <div class="dev-slider-row">
            <label class="dev-slider-label">Ball-to-Ball Collisions</label>
            <input type="checkbox"
              id="dev-b2b"
              ${tuning.ballToBallCollisions ? 'checked' : ''}>
          </div>
        </div>
      </div>
    `;

    // Bind slider events
    this.container.querySelectorAll('.dev-slider').forEach(slider => {
      slider.addEventListener('input', (e) => {
        const input = e.target as HTMLInputElement;
        const key = input.dataset['key'] as keyof PhysicsTuning;
        const val = parseFloat(input.value);
        setTuning({ [key]: val });

        const valueSpan = this.container.querySelector(`[data-value-for="${key}"]`);
        if (valueSpan) valueSpan.textContent = String(val);
      });
    });

    const b2bCheckbox = this.container.querySelector('#dev-b2b');
    b2bCheckbox?.addEventListener('change', (e) => {
      const checked = (e.target as HTMLInputElement).checked;
      setTuning({ ballToBallCollisions: checked });
    });
  }

  private setupToggle(): void {
    // Press 'D' to toggle dev panel
    document.addEventListener('keydown', (e) => {
      if (e.key === 'd' || e.key === 'D') {
        if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
        this.toggle();
      }
    });

    // Also bind the gear button
    this.container.querySelector('#dev-toggle-btn')?.addEventListener('click', () => {
      this.toggle();
    });
  }

  private toggle(): void {
    this.visible = !this.visible;
    const panel = this.container.querySelector('.dev-panel');
    panel?.classList.toggle('visible', this.visible);
  }
}
