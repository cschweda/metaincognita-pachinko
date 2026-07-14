import { hubExitHtml } from './HubExit';

type TabName = 'game' | 'history' | 'analysis';

export class TopBar {
  private container: HTMLElement;
  private onNavigate: (view: string) => void;
  private tabsEl!: HTMLElement;

  constructor(container: HTMLElement, onNavigate: (view: string) => void) {
    this.container = container;
    this.onNavigate = onNavigate;
    this.render();
  }

  private render(): void {
    // The bar itself is persistent chrome and has no show()/hide(): it must be
    // on screen for every view, because the hub exit lives in it and a player
    // has to be able to leave from anywhere — including the setup screen, where
    // this bar used to be hidden entirely. Only the TABS come and go.
    this.container.innerHTML = `
      <div class="top-bar-inner">
        <div class="top-bar-brand">
          ${hubExitHtml()}
          <span class="top-bar-divider" aria-hidden="true"></span>
          <span class="brand-game">PachinkoParlor</span>
        </div>
        <nav class="top-bar-tabs" aria-label="Pages">
          <button class="tab-btn" data-tab="game">Game</button>
          <button class="tab-btn" data-tab="history">History</button>
          <button class="tab-btn" data-tab="analysis">Analysis</button>
        </nav>
      </div>
    `;

    this.tabsEl = this.container.querySelector('.top-bar-tabs') as HTMLElement;

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

  /** Tabs are for a session in progress; the setup screen has nowhere to go yet. */
  showTabs(): void {
    this.tabsEl.style.display = 'flex';
  }

  hideTabs(): void {
    this.tabsEl.style.display = 'none';
  }
}
