export class SetupView {
  private container: HTMLElement;
  private onStart: () => void;

  constructor(container: HTMLElement, onStart: () => void) {
    this.container = container;
    this.onStart = onStart;
    this.render();
  }

  private render(): void {
    this.container.innerHTML = `
      <div class="setup-screen">
        <div class="setup-content">
          <h1 class="setup-title">PachinkoParlor</h1>
          <p class="setup-subtitle">Metaincognita Casino Simulator Suite</p>

          <div class="setup-description">
            <p>A physics-based simulation of modern Japanese Digipachi pachinko.</p>
            <p class="text-dim">The pins are physics. The payoff is predetermined.</p>
          </div>

          <div class="setup-features">
            <span class="feature-tag">Real-time probability</span>
            <span class="feature-tag">RNG transparency</span>
            <span class="feature-tag">Statistical analysis</span>
            <span class="feature-tag">Authentic physics</span>
          </div>

          <button id="start-btn" class="btn-primary">Start Playing &rarr;</button>

          <p class="setup-disclaimer">
            This is an educational simulator. No real money is used or exchanged.
          </p>
        </div>
      </div>
    `;

    const btn = this.container.querySelector('#start-btn');
    btn?.addEventListener('click', () => this.onStart());
  }

  show(): void {
    this.container.style.display = 'block';
  }

  hide(): void {
    this.container.style.display = 'none';
  }
}
