import { SetupView } from './SetupView';
import { GameView } from './GameView';
import { TopBar } from '../ui/TopBar';

type ViewName = 'setup' | 'game' | 'history' | 'analysis';

export class ViewManager {
  private setupView!: SetupView;
  private gameView!: GameView;
  private topBar!: TopBar;
  private currentView: ViewName = 'setup';

  init(): void {
    const setupEl = document.getElementById('view-setup')!;
    const gameEl = document.getElementById('view-game')!;
    const topBarEl = document.getElementById('top-bar')!;

    this.topBar = new TopBar(topBarEl, (view: string) => this.showView(view as ViewName));

    this.setupView = new SetupView(setupEl, () => {
      this.showView('game');
      this.gameView.startGame();
    });

    this.gameView = new GameView(gameEl);

    this.showView('setup');
  }

  showView(name: ViewName): void {
    this.currentView = name;

    this.setupView.hide();
    this.gameView.hide();

    // Hide stubs
    const historyEl = document.getElementById('view-history');
    const analysisEl = document.getElementById('view-analysis');
    if (historyEl) historyEl.style.display = 'none';
    if (analysisEl) analysisEl.style.display = 'none';

    switch (name) {
      case 'setup':
        this.setupView.show();
        this.topBar.setActiveTab(null);
        this.topBar.hide();
        break;
      case 'game':
        this.gameView.show();
        this.topBar.setActiveTab('game');
        this.topBar.show();
        break;
      case 'history':
        if (historyEl) historyEl.style.display = 'block';
        this.topBar.setActiveTab('history');
        this.topBar.show();
        break;
      case 'analysis':
        if (analysisEl) analysisEl.style.display = 'block';
        this.topBar.setActiveTab('analysis');
        this.topBar.show();
        break;
    }
  }
}
