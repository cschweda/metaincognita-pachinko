import { SetupView } from './SetupView';
import { GameView } from './GameView';
import { HistoryView } from './HistoryView';
import { AnalysisView } from './AnalysisView';
import { TopBar } from '../ui/TopBar';
import { HistoryLog } from '../stats/HistoryLog';
import { SessionTracker } from '../stats/SessionTracker';

type ViewName = 'setup' | 'game' | 'history' | 'analysis';

export class ViewManager {
  private setupView!: SetupView;
  private gameView!: GameView;
  private historyView!: HistoryView;
  private analysisView!: AnalysisView;
  private topBar!: TopBar;
  private currentView: ViewName = 'setup';

  // Shared data sources (created once, used by views)
  private historyLog!: HistoryLog;
  private sessionTracker!: SessionTracker;

  init(): void {
    const setupEl = document.getElementById('view-setup')!;
    const gameEl = document.getElementById('view-game')!;
    const historyEl = document.getElementById('view-history')!;
    const analysisEl = document.getElementById('view-analysis')!;
    const topBarEl = document.getElementById('top-bar')!;

    // Create shared data sources
    this.historyLog = new HistoryLog();
    this.sessionTracker = new SessionTracker();

    this.topBar = new TopBar(topBarEl, (view: string) => this.showView(view as ViewName));

    this.setupView = new SetupView(setupEl, () => {
      this.showView('game');
      this.gameView.startGame();
    });

    this.gameView = new GameView(gameEl);
    this.historyView = new HistoryView(historyEl, this.historyLog);
    this.analysisView = new AnalysisView(analysisEl, this.sessionTracker);

    this.showView('setup');
  }

  showView(name: ViewName): void {
    this.currentView = name;

    this.setupView.hide();
    this.gameView.hide();
    this.historyView.hide();
    this.analysisView.hide();

    // The top bar itself is never hidden — it carries the hub exit, which has to
    // be reachable from every view. Only the tabs come and go: on setup there is
    // no session yet, so there is nowhere for them to navigate to.
    switch (name) {
      case 'setup':
        this.setupView.show();
        this.topBar.setActiveTab(null);
        this.topBar.hideTabs();
        break;
      case 'game':
        this.gameView.show();
        this.topBar.setActiveTab('game');
        this.topBar.showTabs();
        break;
      case 'history':
        this.historyView.show();
        this.topBar.setActiveTab('history');
        this.topBar.showTabs();
        break;
      case 'analysis':
        this.analysisView.show();
        this.topBar.setActiveTab('analysis');
        this.topBar.showTabs();
        break;
    }
  }
}
