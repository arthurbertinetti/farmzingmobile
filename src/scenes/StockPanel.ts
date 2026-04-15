// src/scenes/StockPanel.ts
import Phaser from 'phaser';
import { gameState } from '../systems/GameState';
import { RESOURCE_INFO, ALL_RESOURCE_KEYS } from '../data/resources';
import { ATELIERS } from '../data/ateliers';
import { COLORS, UI } from '../utils/constants';
import { fmtN, xpForLevel } from '../utils/helpers';
import { buildSubTabBar } from '../ui/SubTabBar';
import { ScrollHelper } from '../ui/ScrollHelper';

type StockTab = 'resources' | 'recettes' | 'stats';

export class StockPanel {
  private scene: Phaser.Scene;
  private container!: Phaser.GameObjects.Container;
  private subTabContainer!: Phaser.GameObjects.Container;
  private scrollContainer!: Phaser.GameObjects.Container;
  private contentHeight = 0;
  private activeTab: StockTab = 'resources';
  private scroller!: ScrollHelper;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    this.container = scene.add.container(0, 0);
    this.container.setDepth(10);
    this.subTabContainer = scene.add.container(0, 0);
    this.scrollContainer = scene.add.container(0, 0);
    this.container.add([this.subTabContainer, this.scrollContainer]);
    this.scroller = new ScrollHelper(scene,
      (sy) => this.clampScroll(sy),
      (sy) => this.scrollContainer.setY(this.subTabBottom + sy),
    );
    this.setupScroll();
    this.refresh();
  }

  private get subTabBottom(): number { return UI.HUD_HEIGHT + 30 + 32 + 2; }

  private clampScroll(sy: number): number {
    const { height } = this.scene.scale;
    const viewH = height - this.subTabBottom - UI.TAB_HEIGHT;
    const minS = Math.min(0, viewH - this.contentHeight - 20);
    return Math.max(minS, Math.min(0, sy));
  }

  private setupScroll(): void {
    this.scene.input.on('pointerdown', (p: Phaser.Input.Pointer) => {
      if (!this.container.visible) return;
      const height = this.scene.scale.height;
      if (p.y > this.subTabBottom && p.y < height - UI.TAB_HEIGHT) {
        this.scroller.onDragStart(p.y);
      }
    });
    this.scene.input.on('pointermove', (p: Phaser.Input.Pointer) => {
      if (!this.container.visible) return;
      this.scroller.onDragMove(p.y);
    });
    this.scene.input.on('pointerup', () => {
      this.scroller.onDragEnd();
    });
  }

  refresh(): void {
    this.container.removeAll(true);
    this.subTabContainer = this.scene.add.container(0, 0);
    this.scrollContainer = this.scene.add.container(0, this.subTabBottom);
    this.container.add([this.subTabContainer, this.scrollContainer]);
    this.scroller.reset();

    const { width, height } = this.scene.scale;

    // Title
    const titleBg = this.scene.add.graphics();
    titleBg.fillStyle(COLORS.sky, 1);
    titleBg.fillRect(0, UI.HUD_HEIGHT, width, 30);
    const title = this.scene.add.text(width / 2, UI.HUD_HEIGHT + 15, '\u{1F4E6} Stock', {
      fontSize: '16px', fontFamily: 'Arial, sans-serif', color: '#4e342e', fontStyle: 'bold',
    }).setOrigin(0.5);
    this.container.add([titleBg, title]);

    // Sub-tabs
    buildSubTabBar(this.scene, this.subTabContainer,
      [
        { id: 'resources', label: '\u{1F4E6} Ressources' },
        { id: 'recettes', label: '\u{1F4D6} Recettes' },
        { id: 'stats', label: '\u{1F4CA} Stats' },
      ],
      this.activeTab,
      UI.HUD_HEIGHT + 30,
      (id) => { this.activeTab = id as StockTab; this.refresh(); },
    );

    // Render content
    if (this.activeTab === 'resources') this.renderResources();
    else if (this.activeTab === 'recettes') this.renderRecettes();
    else this.renderStats();

    // Scroll mask
    const maskG = this.scene.make.graphics({});
    maskG.fillRect(0, this.subTabBottom, width, height - this.subTabBottom - UI.TAB_HEIGHT);
    this.scrollContainer.setMask(maskG.createGeometryMask());
  }

  private renderResources(): void {
    const { width } = this.scene.scale;
    const cols = 5;
    const cellSize = Math.floor((width - 20) / cols);
    let y = 8;

    ALL_RESOURCE_KEYS.forEach((key, i) => {
      const info = RESOURCE_INFO[key];
      if (!info) return;
      const qty = gameState.data.resources[key] ?? 0;
      const col = i % cols;
      const row = Math.floor(i / cols);
      const cx = 10 + col * cellSize + cellSize / 2;
      const cy = y + row * (cellSize + 4) + cellSize / 2;

      const bg = this.scene.add.graphics();
      bg.fillStyle(0xffffff, qty > 0 ? 0.9 : 0.2);
      bg.fillRoundedRect(cx - cellSize / 2 + 2, cy - cellSize / 2 + 2, cellSize - 4, cellSize - 4, 10);

      const emoji = this.scene.add.text(cx, cy - 10, info.emoji, { fontSize: '20px' })
        .setOrigin(0.5).setAlpha(qty > 0 ? 1 : 0.3);
      const qtyTxt = this.scene.add.text(cx, cy + 8, String(qty), {
        fontSize: '11px', fontFamily: 'Arial, sans-serif', color: '#5d4037', fontStyle: 'bold',
      }).setOrigin(0.5).setAlpha(qty > 0 ? 1 : 0.3);
      const nameTxt = this.scene.add.text(cx, cy + 22, info.name, {
        fontSize: '10px', fontFamily: 'Arial, sans-serif', color: '#666',
      }).setOrigin(0.5).setAlpha(qty > 0 ? 1 : 0.3);

      this.scrollContainer.add([bg, emoji, qtyTxt, nameTxt]);
    });

    const totalRows = Math.ceil(ALL_RESOURCE_KEYS.length / cols);
    this.contentHeight = totalRows * (cellSize + 4) + 20;
  }

  private stockRecetteSearch = '';

  private renderRecettes(): void {
    const { width } = this.scene.scale;
    let y = 8;

    // Search bar
    const searchBg = this.scene.add.graphics();
    searchBg.fillStyle(0xffffff, 1);
    searchBg.fillRoundedRect(10, y, width - 20, 30, 8);
    searchBg.lineStyle(1, 0xcccccc, 1);
    searchBg.strokeRoundedRect(10, y, width - 20, 30, 8);
    const searchLabel = this.scene.add.text(width / 2, y + 15,
      this.stockRecetteSearch ? `\u{1F50D} ${this.stockRecetteSearch}` : '\u{1F50D} Rechercher...',
      { fontSize: '12px', fontFamily: 'Arial, sans-serif', color: this.stockRecetteSearch ? '#333' : '#999' }
    ).setOrigin(0.5);
    const searchHit = this.scene.add.rectangle(width / 2, y + 15, width - 20, 30, 0, 0)
      .setInteractive({ useHandCursor: true })
      .on('pointerdown', () => {
        const val = prompt('Rechercher une recette:', this.stockRecetteSearch) ?? '';
        this.stockRecetteSearch = val.trim().toLowerCase();
        this.refresh();
      });
    this.scrollContainer.add([searchBg, searchLabel, searchHit]);
    y += 38;

    // Collect all recipes
    const allRecipes: { recipe: typeof ATELIERS[0]['recipes'][0]; atelierName: string; atelierEmoji: string; reqLevel: number }[] = [];
    ATELIERS.forEach(at => {
      at.recipes.forEach(r => {
        allRecipes.push({ recipe: r, atelierName: at.name, atelierEmoji: at.emoji, reqLevel: at.reqLevel });
      });
    });
    allRecipes.sort((a, b) => a.recipe.name.localeCompare(b.recipe.name));

    // Filter
    const q = this.stockRecetteSearch;
    const filtered = q ? allRecipes.filter(e => {
      if (e.recipe.name.toLowerCase().includes(q)) return true;
      if (e.atelierName.toLowerCase().includes(q)) return true;
      for (const key of Object.keys(e.recipe.inputs)) {
        const ri = RESOURCE_INFO[key];
        if (ri && ri.name.toLowerCase().includes(q)) return true;
        if (key.toLowerCase().includes(q)) return true;
      }
      if (e.recipe.output) {
        const ri = RESOURCE_INFO[e.recipe.output];
        if (ri && ri.name.toLowerCase().includes(q)) return true;
      }
      return false;
    }) : allRecipes;

    if (filtered.length === 0) {
      const noRes = this.scene.add.text(width / 2, y + 20, 'Aucune recette trouvee', {
        fontSize: '13px', fontFamily: 'Arial, sans-serif', color: '#888',
      }).setOrigin(0.5);
      this.scrollContainer.add(noRes);
      this.contentHeight = y + 60;
      return;
    }

    for (const entry of filtered) {
      const { recipe, atelierName, atelierEmoji, reqLevel } = entry;
      const locked = reqLevel > gameState.data.level;
      const h = 70;
      const bg = this.scene.add.graphics();
      bg.fillStyle(0xffffff, locked ? 0.5 : 0.9);
      bg.fillRoundedRect(10, y, width - 20, h, 9);

      // Header
      const nameStr = `${recipe.emoji} ${recipe.name}`;
      const nameTxt = this.scene.add.text(18, y + 8, nameStr, {
        fontSize: '13px', fontFamily: 'Arial, sans-serif', color: '#333', fontStyle: 'bold',
      }).setAlpha(locked ? 0.5 : 1);

      const bldStr = `${atelierEmoji} ${atelierName}` + (locked ? ` \u{1F512}Niv.${reqLevel}` : '');
      const bldTxt = this.scene.add.text(width - 18, y + 8, bldStr, {
        fontSize: '11px', fontFamily: 'Arial, sans-serif', color: '#888',
      }).setOrigin(1, 0).setAlpha(locked ? 0.5 : 1);

      // Add bg + header texts FIRST (behind ingredients)
      this.scrollContainer.add([bg, nameTxt, bldTxt]);

      // Ingredients - show owned qty, red if insufficient
      const ingY = y + 28;
      let ingX = 18;
      for (const [key, qty] of Object.entries(recipe.inputs)) {
        const ri = RESOURCE_INFO[key];
        const have = gameState.getResource(key);
        const enough = locked || have >= qty;
        const label = `${qty}\u00D7${ri?.emoji ?? key}(${have})`;
        const txt = this.scene.add.text(ingX, ingY, label, {
          fontSize: '11px', fontFamily: 'Arial, sans-serif',
          color: enough ? '#555' : '#e74c3c',
          fontStyle: enough ? 'normal' : 'bold',
        }).setAlpha(locked ? 0.5 : 1);
        this.scrollContainer.add(txt);
        ingX += txt.width + 8;
      }

      // Output
      let outStr = '';
      if (recipe.output) {
        const ri = RESOURCE_INFO[recipe.output];
        outStr = `\u2192 ${ri?.emoji ?? ''} ${ri?.name ?? recipe.output} (${fmtN(recipe.sell)}\u{1F4B0})`;
      } else {
        outStr = `\u2192 ${fmtN(recipe.sell)}\u{1F4B0}`;
      }
      const timeStr = recipe.time >= 60 ? `${Math.floor(recipe.time / 60)}m` : `${recipe.time}s`;
      outStr += ` \u00B7 +${recipe.xp}\u2B50 \u00B7 \u23F1${timeStr}`;
      const outTxt = this.scene.add.text(18, y + 50, outStr, {
        fontSize: '11px', fontFamily: 'Arial, sans-serif', color: '#4caf50',
      }).setAlpha(locked ? 0.5 : 1);

      this.scrollContainer.add(outTxt);
      y += h + 4;
    }

    this.contentHeight = y + 20;
  }

  private renderStats(): void {
    const d = gameState.data;
    const { width } = this.scene.scale;
    let y = 8;

    const stats = [
      ['\u{1F4B0} Total gagne', fmtN(d.totalEarned)],
      ['\u{1F33E} Total recoltes', String(d.totalHarvested)],
      ['\u{1F3C5} Niveau', String(d.level)],
      ['\u2B50 XP', `${fmtN(d.xp)} / ${fmtN(xpForLevel(d.level + 1))}`],
      ['\u{1F4A7} Eau max', String(d.maxWater)],
      ['\u{1F532} Parcelles', `${gameState.getUnlockedCount()} / 90`],
      ['\u{1F4C5} Jour / Mois', `${d.day} / ${d.month}`],
      ['\u{1F3E0} Loyer mensuel', `${fmtN(gameState.getRent())}\u{1F4B0}`],
      ['\u{1F4B3} Dette', d.debt > 0 ? fmtN(d.debt) : 'Aucune'],
      ['\u2B50 Etoiles', String(d.stars)],
    ];

    stats.forEach(([label, value]) => {
      const bg = this.scene.add.graphics();
      bg.fillStyle(0xffffff, 0.85);
      bg.fillRoundedRect(10, y, width - 20, 30, 9);

      const labelTxt = this.scene.add.text(18, y + 15, label, {
        fontSize: '12px', fontFamily: 'Arial, sans-serif', color: '#333',
      }).setOrigin(0, 0.5);

      const valueTxt = this.scene.add.text(width - 18, y + 15, value, {
        fontSize: '12px', fontFamily: 'Arial, sans-serif', color: '#5d4037', fontStyle: 'bold',
      }).setOrigin(1, 0.5);

      this.scrollContainer.add([bg, labelTxt, valueTxt]);
      y += 36;
    });

    this.contentHeight = y + 20;
  }

  setVisible(visible: boolean): void {
    this.container.setVisible(visible);
  }
}
