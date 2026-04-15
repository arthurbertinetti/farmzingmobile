// src/scenes/GameScene.ts
import Phaser from 'phaser';
import { gameState } from '../systems/GameState';
import { TimeSystem } from '../systems/TimeSystem';
import { HUD } from '../ui/HUD';
import { TabBar } from '../ui/TabBar';
import { SAVE_INTERVAL_MS } from '../utils/constants';
import { musicManager } from '../systems/MusicManager';
import { FarmPanel } from './FarmPanel';
import { AtelierPanel } from './AtelierPanel';
import { ShopPanel } from './ShopPanel';
import { StockPanel } from './StockPanel';
import { WellWoodPanel } from './WellWoodPanel';
import { QuestPanel } from './QuestPanel';
import { GardenPanel } from './GardenPanel';
import { MiniGamePanel } from './MiniGamePanel';
import { EventPanel } from './EventPanel';

export class GameScene extends Phaser.Scene {
  private hud!: HUD;
  private tabBar!: TabBar;
  private timeSystem!: TimeSystem;
  private saveTimer?: Phaser.Time.TimerEvent;
  private currentPanel: string = 'farm';
  private resizeTimer?: ReturnType<typeof setTimeout>;

  // Panels
  private farmPanel!: FarmPanel;
  private atelierPanel!: AtelierPanel;
  private shopPanel!: ShopPanel;
  private stockPanel!: StockPanel;
  private wellWoodPanel!: WellWoodPanel;
  private questPanel!: QuestPanel;
  private gardenPanel!: GardenPanel;
  private miniGamePanel!: MiniGamePanel;
  private eventPanel!: EventPanel;

  constructor() {
    super({ key: 'GameScene' });
  }

  create(): void {
    this.cameras.main.setBackgroundColor(0x87ceeb);

    // Time system
    this.timeSystem = new TimeSystem(this);
    this.timeSystem.start();

    // HUD
    this.hud = new HUD(this);

    // Tab Bar
    this.tabBar = new TabBar(this, (tabId) => this.switchPanel(tabId));

    // Create panels
    this.farmPanel = new FarmPanel(this);
    this.atelierPanel = new AtelierPanel(this);
    this.shopPanel = new ShopPanel(this);
    this.stockPanel = new StockPanel(this);
    this.wellWoodPanel = new WellWoodPanel(this);
    this.questPanel = new QuestPanel(this);
    this.gardenPanel = new GardenPanel(this);
    this.miniGamePanel = new MiniGamePanel(this);
    this.eventPanel = new EventPanel(this);

    // Show farm by default
    this.switchPanel('farm');

    // Auto-save
    this.saveTimer = this.time.addEvent({
      delay: SAVE_INTERVAL_MS,
      callback: () => gameState.save(),
      loop: true,
    });

    // Subscribe to state changes
    gameState.onChange(() => {
      this.hud.update();
    });

    // Handle resize (fullscreen, orientation change, window resize)
    this.scale.on('resize', (gameSize: Phaser.Structs.Size) => {
      // Debounce: avoid rapid rebuilds during animated resize
      if (this.resizeTimer) clearTimeout(this.resizeTimer);
      this.resizeTimer = setTimeout(() => {
        this.onResize(gameSize.width, gameSize.height);
      }, 100);
    });
  }

  private onResize(_w: number, _h: number): void {
    // Rebuild HUD
    this.hud.destroy();
    this.hud = new HUD(this);
    this.hud.update();

    // Rebuild TabBar
    const activeTab = this.tabBar.getActiveTab();
    this.tabBar.destroy();
    this.tabBar = new TabBar(this, (tabId) => this.switchPanel(tabId));
    this.tabBar.setActive(activeTab);

    // Refresh all panels so they recompute layout at new dimensions
    this.farmPanel.refresh();
    this.atelierPanel.refresh();
    this.shopPanel.refresh();
    this.stockPanel.refresh();
    this.wellWoodPanel.refresh();
    this.questPanel.refresh();
    this.gardenPanel.refresh();
    this.miniGamePanel.refresh();
    this.eventPanel.refresh();

    // Re-apply visibility
    this.switchPanel(this.currentPanel);
  }

  private switchPanel(panelId: string): void {
    // Hide all panels
    this.farmPanel.setVisible(panelId === 'farm');
    this.atelierPanel.setVisible(panelId === 'atelier');
    this.shopPanel.setVisible(panelId === 'shop');
    this.stockPanel.setVisible(panelId === 'stock');
    this.wellWoodPanel.setVisible(panelId === 'well');
    this.questPanel.setVisible(panelId === 'quest');
    this.gardenPanel.setVisible(panelId === 'garden');
    this.miniGamePanel.setVisible(panelId === 'minigame');
    this.eventPanel.setVisible(panelId === 'event');
    this.currentPanel = panelId;
    musicManager.onTabChange(panelId);

    // Fade-in the active panel
    const activePanel = this.getPanelContainer(panelId);
    if (activePanel) {
      activePanel.setAlpha(0);
      this.tweens.add({ targets: activePanel, alpha: 1, duration: 150, ease: 'Linear' });
    }

    if (panelId === 'farm') this.farmPanel.refresh();
    if (panelId === 'atelier') this.atelierPanel.refresh();
    if (panelId === 'shop') this.shopPanel.refresh();
    if (panelId === 'stock') this.stockPanel.refresh();
    if (panelId === 'well') this.wellWoodPanel.refresh();
    if (panelId === 'quest') this.questPanel.refresh();
    if (panelId === 'garden') this.gardenPanel.refresh();
    if (panelId === 'minigame') this.miniGamePanel.refresh();
    if (panelId === 'event') this.eventPanel.refresh();
  }

  private getPanelContainer(panelId: string): Phaser.GameObjects.Container | null {
    switch (panelId) {
      case 'farm': return (this.farmPanel as any).container;
      case 'atelier': return (this.atelierPanel as any).container;
      case 'shop': return (this.shopPanel as any).container;
      case 'stock': return (this.stockPanel as any).container;
      case 'well': return (this.wellWoodPanel as any).container;
      case 'quest': return (this.questPanel as any).container;
      case 'garden': return (this.gardenPanel as any).container;
      case 'minigame': return (this.miniGamePanel as any).container;
      case 'event': return (this.eventPanel as any).container;
      default: return null;
    }
  }

  update(): void {
    if (this.currentPanel === 'farm') {
      this.farmPanel.updateVisuals();
    }
    if (this.currentPanel === 'atelier') {
      this.atelierPanel.updateVisuals();
    }
    if (this.currentPanel === 'minigame') {
      this.miniGamePanel.updateVisuals();
    }
  }
}
