type TabName = 'game' | 'history' | 'analysis';

export class TopBar {
  private container: HTMLElement;
  private onNavigate: (view: string) => void;

  constructor(container: HTMLElement, onNavigate: (view: string) => void) {
    this.container = container;
    this.onNavigate = onNavigate;
    this.render();
  }

  private render(): void {
    this.container.innerHTML = `
      <div class="top-bar-inner">
        <div class="top-bar-brand">
          <span class="brand-name">Metaincognita</span>
          <span class="brand-separator">/</span>
          <span class="brand-game">PachinkoParlor</span>
        </div>
        <nav class="top-bar-tabs">
          <button class="tab-btn" data-tab="game">Game</button>
          <button class="tab-btn" data-tab="history">History</button>
          <button class="tab-btn" data-tab="analysis">Analysis</button>
        </nav>
      </div>
    `;

    this.container.querySelectorAll('.tab-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const tab = (btn as HTMLElement).dataset['tab'];
        if (tab && !(btn as HTMLButtonElement).disabled) {
          this.onNavigate(tab);
        }
      });
    });
  }

  setActiveTab(tab: TabName | null): void {
    this.container.querySelectorAll('.tab-btn').forEach(btn => {
      const btnTab = (btn as HTMLElement).dataset['tab'];
      btn.classList.toggle('active', btnTab === tab);
    });
  }

  show(): void {
    this.container.style.display = 'block';
  }

  hide(): void {
    this.container.style.display = 'none';
  }
}
