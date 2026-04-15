// src/scenes/FarmPanel.ts
// Unified Farm panel with 4 sub-tabs: Cultures/Arbres, Animaux, Fermiers, Aide
import Phaser from 'phaser';
import { gameState, PlotState } from '../systems/GameState';
import { CROPS } from '../data/crops';
import { TREES } from '../data/trees';
import { ANIMALS, ANIMAL_FEED, ANIMAL_COLS } from '../data/animals';
import { RESOURCE_INFO } from '../data/resources';
import {
  COLORS, UI, FARM_COLS, CAT_WATER,
  FARMER_MAX, FARMER_MAX_LVL, FARMER_HARVEST_MS, FARMER_RESOURCES,
} from '../utils/constants';
import { fmtN } from '../utils/helpers';
import { showFloatingText, showLevelUpBanner } from '../ui/FloatingText';
import { createAutoButton, updateAutoButton } from '../ui/AutoButton';
import { buildSubTabBar } from '../ui/SubTabBar';
import { ScrollHelper } from '../ui/ScrollHelper';

const DRAG_THRESHOLD = 8;
const CROP_CAT = [
  { id: 0, label: '\u{1F331} Cultures' },
  { id: 1, label: '\u{1F333} Arbres' },
];

type FarmSub = 'crops' | 'animals' | 'farmers' | 'aide';

export class FarmPanel {
  private scene: Phaser.Scene;
  private container!: Phaser.GameObjects.Container;
  private activeSub: FarmSub = 'crops';

  // ---- shared layout ----
  private dayBarContainer!: Phaser.GameObjects.Container;
  private subTabContainer!: Phaser.GameObjects.Container;
  private contentContainer!: Phaser.GameObjects.Container;
  private dayBarText!: Phaser.GameObjects.Text;

  // ---- crops sub-panel ----
  private catBarContainer!: Phaser.GameObjects.Container;
  private seedBarContainer!: Phaser.GameObjects.Container;
  private autoBarContainer!: Phaser.GameObjects.Container;
  private plotContainer!: Phaser.GameObjects.Container;
  private plotGraphics: Phaser.GameObjects.Container[] = [];
  private autoHarvestBtn!: Phaser.GameObjects.Container;
  private autoWaterBtn!: Phaser.GameObjects.Container;

  // ---- animals sub-panel ----
  private animalSelectorContainer!: Phaser.GameObjects.Container;
  private animalAutoBarContainer!: Phaser.GameObjects.Container;
  private animalGridContainer!: Phaser.GameObjects.Container;
  private animalSlotGraphics: Phaser.GameObjects.Container[] = [];
  private autoFeedBtn!: Phaser.GameObjects.Container;

  // ---- farmers sub-panel ----
  private farmerScrollContainer!: Phaser.GameObjects.Container;
  private farmerContentHeight = 0;
  private farmerTimerTexts: { fi: number; text: Phaser.GameObjects.Text }[] = [];

  // ---- aide sub-panel ----
  private aideScrollContainer!: Phaser.GameObjects.Container;
  private aideContentHeight = 0;
  private aideSub: 'cultures' | 'arbres' | 'animaux' | 'fermiers' = 'cultures';

  // ---- scroll ----
  private scrollTarget: Phaser.GameObjects.Container | null = null;
  private scrollTopY = 0;
  private scroller!: ScrollHelper;

  // ---- layout constants ----
  private static readonly DAY_BAR_H = 24;
  private static readonly CAT_BAR_H = 32;
  private static readonly BAR_GAP = 2;
  private static readonly AUTO_BAR_H = 30;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    this.container = scene.add.container(0, 0);
    this.container.setDepth(10);

    this.dayBarContainer = scene.add.container(0, 0);
    this.subTabContainer = scene.add.container(0, 0);
    this.contentContainer = scene.add.container(0, 0);
    this.container.add([this.dayBarContainer, this.subTabContainer, this.contentContainer]);

    // Crops sub-containers
    this.catBarContainer = scene.add.container(0, 0);
    this.seedBarContainer = scene.add.container(0, 0);
    this.autoBarContainer = scene.add.container(0, 0);
    this.plotContainer = scene.add.container(0, 0);

    // Animal sub-containers
    this.animalSelectorContainer = scene.add.container(0, 0);
    this.animalAutoBarContainer = scene.add.container(0, 0);
    this.animalGridContainer = scene.add.container(0, 0);

    // Farmer sub-container
    this.farmerScrollContainer = scene.add.container(0, 0);

    this.scroller = new ScrollHelper(scene,
      (sy) => this.clampScroll(sy),
      (sy) => {
        if (this.scrollTarget) this.scrollTarget.setPosition(0, this.scrollTopY + sy);
      },
    );
    this.buildDayBar();
    this.buildSubTabs();
    this.buildActiveContent();
    this.setupScroll();
  }

  // ========== LAYOUT HELPERS ==========
  private get dayBarBottom(): number { return UI.HUD_HEIGHT + FarmPanel.DAY_BAR_H; }
  private get subTabBottom(): number { return this.dayBarBottom + 32 + FarmPanel.BAR_GAP; }

  // ========== DAY BAR ==========
  private buildDayBar(): void {
    this.dayBarContainer.removeAll(true);
    const { width } = this.scene.scale;
    const y = UI.HUD_HEIGHT;
    const bg = this.scene.add.graphics();
    bg.fillStyle(0x4e342e, 1);
    bg.fillRect(0, y, width, FarmPanel.DAY_BAR_H);
    this.dayBarText = this.scene.add.text(width / 2, y + FarmPanel.DAY_BAR_H / 2, '', {
      fontSize: '11px', fontFamily: 'Arial, sans-serif', color: '#dddddd',
    }).setOrigin(0.5);
    this.dayBarContainer.add([bg, this.dayBarText]);
    this.updateDayBar();
  }

  private updateDayBar(): void {
    const d = gameState.data;
    const debtStr = d.debt > 0 ? ` | \u{1F4B3}${fmtN(d.debt)}` : '';
    const savStr = d.savings > 0 ? ` | \u{1F3E6}${fmtN(d.savings)}` : '';
    this.dayBarText.setText(
      `\u{1F4C5} J${d.day} M${d.month} | \u{1F3E0}${fmtN(gameState.getRent())}\u{1F4B0}${debtStr}${savStr}`
    );
  }

  // ========== SUB TABS ==========
  private buildSubTabs(): void {
    this.subTabContainer.removeAll(true);
    buildSubTabBar(
      this.scene, this.subTabContainer,
      [
        { id: 'crops', label: '\u{1F33E} Cultures' },
        { id: 'animals', label: '\u{1F404} Animaux' },
        { id: 'farmers', label: '\u{1F468}\u200D\u{1F33E} Fermiers' },
        { id: 'aide', label: '\u{1F4D6} Aide' },
      ],
      this.activeSub,
      this.dayBarBottom,
      (id) => { this.activeSub = id as FarmSub; this.buildSubTabs(); this.buildActiveContent(); },
    );
  }

  // ========== ACTIVE CONTENT ==========
  private buildActiveContent(): void {
    this.contentContainer.removeAll(true);
    this.scroller.reset();
    if (this.activeSub === 'crops') this.buildCropsContent();
    else if (this.activeSub === 'animals') this.buildAnimalsContent();
    else if (this.activeSub === 'farmers') this.buildFarmersContent();
    else this.buildAideContent();
  }

  // ====================================================================
  // ===                   CROPS / TREES SUB-TAB                      ===
  // ====================================================================
  private get cropCatBarCenterY(): number { return this.subTabBottom + FarmPanel.BAR_GAP + FarmPanel.CAT_BAR_H / 2; }
  private get cropCatBarBottom(): number { return this.subTabBottom + FarmPanel.BAR_GAP + FarmPanel.CAT_BAR_H; }
  private get seedBarY(): number { return this.cropCatBarBottom + FarmPanel.BAR_GAP; }

  private buildCropsContent(): void {
    this.catBarContainer = this.scene.add.container(0, 0);
    this.seedBarContainer = this.scene.add.container(0, 0);
    this.autoBarContainer = this.scene.add.container(0, 0);
    this.plotContainer = this.scene.add.container(0, 0);
    this.contentContainer.add([this.catBarContainer, this.seedBarContainer, this.autoBarContainer, this.plotContainer]);

    this.buildCatBar();
    this.buildSeedBar();
    this.buildAutoBar();
    this.buildFarmGrid();
  }

  private buildCatBar(): void {
    this.catBarContainer.removeAll(true);
    const { width } = this.scene.scale;
    const y = this.cropCatBarCenterY;
    const btnWidth = (width - 16) / CROP_CAT.length;
    const btnH = FarmPanel.CAT_BAR_H - 4;

    const barBg = this.scene.add.graphics();
    barBg.fillStyle(COLORS.sky, 1);
    barBg.fillRect(0, this.subTabBottom + FarmPanel.BAR_GAP, width, FarmPanel.CAT_BAR_H);
    this.catBarContainer.add(barBg);

    CROP_CAT.forEach((cat, i) => {
      const x = 8 + btnWidth * i + btnWidth / 2;
      const isActive = gameState.data.selCat === cat.id;
      const bg = this.scene.add.graphics();
      bg.fillStyle(isActive ? 0xe8f5e9 : 0xffffff, 1);
      if (isActive) bg.lineStyle(2, COLORS.green, 1);
      bg.fillRoundedRect(-btnWidth / 2 + 2, -btnH / 2, btnWidth - 4, btnH, 7);
      if (isActive) bg.strokeRoundedRect(-btnWidth / 2 + 2, -btnH / 2, btnWidth - 4, btnH, 7);

      const label = this.scene.add.text(0, 0, cat.label, {
        fontSize: '13px', fontFamily: 'Arial, sans-serif', color: '#333',
        fontStyle: isActive ? 'bold' : 'normal',
      }).setOrigin(0.5);

      const hit = this.scene.add.rectangle(0, 0, btnWidth - 4, btnH, 0, 0)
        .setInteractive({ useHandCursor: true })
        .on('pointerdown', () => {
          gameState.data.selCat = cat.id;
          gameState.data.selItem = 0;
          this.buildCatBar();
          this.buildSeedBar();
          this.buildAutoBar();
          this.buildFarmGrid();
        });
      const btn = this.scene.add.container(x, y, [bg, label, hit]);
      this.catBarContainer.add(btn);
    });
  }

  private buildSeedBar(): void {
    this.seedBarContainer.removeAll(true);
    const { width } = this.scene.scale;
    const y = this.seedBarY;
    const cat = gameState.data.selCat;
    const items = cat === 0 ? CROPS : TREES;
    const btnSize = 46;
    const gap = 3;
    const perRow = Math.floor((width - 8) / (btnSize + gap));

    items.forEach((item, i) => {
      const ok = item.reqLevel <= gameState.data.level;
      const isActive = gameState.data.selItem === i;
      const row = Math.floor(i / perRow);
      const col = i % perRow;
      const totalInRow = Math.min(perRow, items.length - row * perRow);
      const rowWidth = totalInRow * (btnSize + gap) - gap;
      const startX = (width - rowWidth) / 2;
      const x = startX + col * (btnSize + gap) + btnSize / 2;
      const by = y + row * (btnSize + gap) + btnSize / 2;

      const bg = this.scene.add.graphics();
      bg.fillStyle(ok ? (isActive ? 0xe8f5e9 : 0xf5f5f5) : 0xdddddd, 1);
      if (isActive && ok) bg.lineStyle(2, COLORS.green, 1);
      bg.fillRoundedRect(-btnSize / 2, -btnSize / 2, btnSize, btnSize, 5);
      if (isActive && ok) bg.strokeRoundedRect(-btnSize / 2, -btnSize / 2, btnSize, btnSize, 5);

      const emoji = this.scene.add.text(0, -6, item.emoji, { fontSize: '16px' }).setOrigin(0.5).setAlpha(ok ? 1 : 0.3);
      const price = this.scene.add.text(0, 14, fmtN(item.cost), {
        fontSize: '10px', fontFamily: 'Arial, sans-serif', color: ok ? '#333' : '#999',
      }).setOrigin(0.5);
      const btn = this.scene.add.container(x, by, [bg, emoji, price]);
      if (ok) {
        const hit = this.scene.add.rectangle(0, 0, btnSize, btnSize, 0, 0)
          .setInteractive({ useHandCursor: true })
          .on('pointerdown', () => { gameState.data.selItem = i; this.buildSeedBar(); });
        btn.add(hit);
      }
      this.seedBarContainer.add(btn);
    });
  }

  private getSeedBarHeight(): number {
    const items = gameState.data.selCat === 0 ? CROPS : TREES;
    const { width } = this.scene.scale;
    const perRow = Math.floor((width - 8) / 49); // 46+3
    return Math.ceil(items.length / perRow) * 49 + 4;
  }

  private get autoBarY(): number { return this.seedBarY + this.getSeedBarHeight() + 2; }

  private buildAutoBar(): void {
    this.autoBarContainer.removeAll(true);
    const { width } = this.scene.scale;
    const hasAny = gameState.getUpgrade('autoharvest') > 0 || gameState.getUpgrade('autowater') > 0;
    if (!hasAny) return;
    const y = this.autoBarY;
    const barBg = this.scene.add.graphics();
    barBg.fillStyle(COLORS.sky, 1);
    barBg.fillRect(0, y, width, FarmPanel.AUTO_BAR_H);
    this.autoBarContainer.add(barBg);
    const btnW = (width - 24) / 2;
    const btnH = FarmPanel.AUTO_BAR_H - 6;
    const cy = y + FarmPanel.AUTO_BAR_H / 2;
    this.autoHarvestBtn = createAutoButton(this.scene, this.autoBarContainer, 8 + btnW / 2, cy, btnW, btnH,
      { upgId: 'autoharvest', icon: '\u{1F33E}', labelReady: 'Recolte', endKey: 'autoHarvestEnd', resetKey: 'ahResets' },
      () => this.refresh());
    this.autoWaterBtn = createAutoButton(this.scene, this.autoBarContainer, 16 + btnW + btnW / 2, cy, btnW, btnH,
      { upgId: 'autowater', icon: '\u{1F4A7}', labelReady: 'Arrosage', endKey: 'autoWaterEnd', resetKey: 'awResets' },
      () => this.refresh());
    updateAutoButton(this.autoHarvestBtn);
    updateAutoButton(this.autoWaterBtn);
  }

  private getAutoBarHeight(): number {
    return (gameState.getUpgrade('autoharvest') > 0 || gameState.getUpgrade('autowater') > 0) ? FarmPanel.AUTO_BAR_H : 0;
  }

  private cropGridTopY = 0;
  // Grid layout params for drag-to-plant
  private cropGridX = 0;
  private cropPlotSize = 0;
  private cropGap = 3;
  private cropPad = 6;
  private cropRows = 0;
  private cropCols = FARM_COLS;
  private lastDragPlantIdx = -1;
  private isDragPlanting = false;

  private buildFarmGrid(): void {
    this.plotContainer.removeAll(true);
    this.plotGraphics = [];
    const { width, height } = this.scene.scale;

    this.cropGridTopY = this.seedBarY + this.getSeedBarHeight() + this.getAutoBarHeight() + 4;
    this.scrollTopY = this.cropGridTopY;
    this.scrollTarget = this.plotContainer;
    const availH = height - this.cropGridTopY - UI.TAB_HEIGHT;
    const rows = gameState.getVisibleRows();
    const cols = FARM_COLS;
    const pad = 6;
    const gap = 3;
    const plotSize = Math.min(Math.floor((width - pad * 2 - gap * (cols - 1)) / cols), 60);
    const gridW = cols * plotSize + (cols - 1) * gap;
    const gridX = (width - gridW) / 2;

    // Store layout for drag-to-plant
    this.cropGridX = gridX;
    this.cropPlotSize = plotSize;
    this.cropGap = gap;
    this.cropPad = pad;
    this.cropRows = rows;
    this.cropCols = cols;

    const gridBg = this.scene.add.graphics();
    gridBg.fillStyle(0x8b7755, 0.3);
    gridBg.fillRoundedRect(gridX - pad, 0, gridW + pad * 2, rows * plotSize + (rows - 1) * gap + pad * 2, 10);
    this.plotContainer.add(gridBg);
    this.plotContainer.setPosition(0, this.cropGridTopY + this.scroller.scrollY);

    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const idx = r * cols + c;
        const x = gridX + c * (plotSize + gap) + plotSize / 2;
        const y = pad + r * (plotSize + gap) + plotSize / 2;
        const plotBg = this.scene.add.graphics();
        const emojiText = this.scene.add.text(0, -4, '', { fontSize: `${Math.floor(plotSize * 0.4)}px` }).setOrigin(0.5);
        const subText = this.scene.add.text(0, plotSize / 2 - 8, '', {
          fontSize: '11px', fontFamily: 'Arial, sans-serif', color: '#fff', padding: { x: 2, y: 1 },
        }).setOrigin(0.5);
        const badgeText = this.scene.add.text(plotSize / 2 - 4, -plotSize / 2 + 2, '', { fontSize: '12px' }).setOrigin(1, 0);
        const hit = this.scene.add.rectangle(0, 0, plotSize, plotSize, 0, 0)
          .setInteractive({ useHandCursor: true })
          .on('pointerdown', () => {
            this.scene.tweens.add({ targets: group, scaleX: 0.93, scaleY: 0.93, duration: 60, yoyo: true, ease: 'Power1' });
          })
          .on('pointerup', () => {
            if (this.scroller.totalDragDistance < DRAG_THRESHOLD && !this.isDragPlanting) this.onPlotClick(idx, x, y + this.cropGridTopY + this.scroller.scrollY);
          });
        const group = this.scene.add.container(x, y, [plotBg, emojiText, subText, badgeText, hit]);
        group.setData('idx', idx);
        group.setData('plotSize', plotSize);
        this.plotGraphics.push(group);
        this.plotContainer.add(group);
      }
    }
    this.updateCropVisuals();
    const mask = this.scene.make.graphics({});
    mask.fillRect(0, this.cropGridTopY, width, availH);
    this.plotContainer.setMask(mask.createGeometryMask());
  }

  /** Resolve screen coordinates to a plot index, or -1 if not over a plot */
  private getPlotIndexAtScreen(screenX: number, screenY: number): number {
    if (this.cropPlotSize <= 0 || this.cropRows <= 0) return -1;
    // Convert screen Y to local Y within the plotContainer
    const localY = screenY - this.cropGridTopY - this.scroller.scrollY - this.cropPad;
    const localX = screenX - this.cropGridX;
    if (localX < 0 || localY < 0) return -1;
    const cellStep = this.cropPlotSize + this.cropGap;
    const col = Math.floor(localX / cellStep);
    const row = Math.floor(localY / cellStep);
    if (col < 0 || col >= this.cropCols || row < 0 || row >= this.cropRows) return -1;
    // Check the pointer is inside the cell (not in the gap)
    const inCellX = localX - col * cellStep;
    const inCellY = localY - row * cellStep;
    if (inCellX > this.cropPlotSize || inCellY > this.cropPlotSize) return -1;
    return row * this.cropCols + col;
  }

  /** Try to plant at a plot during drag. Returns true if planted. */
  private tryDragPlant(idx: number): boolean {
    if (idx < 0 || idx >= gameState.data.plots.length) return false;
    const plot = gameState.data.plots[idx];
    if (plot.locked || plot.catIdx >= 0) return false; // only plant on empty unlocked plots

    const cat = gameState.data.selCat;
    const si = gameState.data.selItem;
    if (cat < 0 || cat > 1) return false;
    const items = cat === 0 ? CROPS : TREES;
    if (si < 0 || si >= items.length) return false;
    const item = items[si];
    if (item.reqLevel > gameState.data.level) return false;
    if (gameState.data.coins < item.cost) return false;

    gameState.data.coins -= item.cost;
    plot.catIdx = cat;
    plot.itemIdx = si;
    plot.waterCount = 0;
    plot.lastWater = 0;

    // Subtle bounce feedback
    const g = this.plotGraphics[idx];
    if (g) this.scene.tweens.add({ targets: g, scaleX: 1.1, scaleY: 1.1, duration: 80, yoyo: true, ease: 'Bounce' });

    gameState.emit();
    return true;
  }

  private getCropGridHeight(): number {
    const rows = gameState.getVisibleRows();
    const { width } = this.scene.scale;
    const plotSize = Math.min(Math.floor((width - 12 - 3 * (FARM_COLS - 1)) / FARM_COLS), 60);
    return rows * plotSize + (rows - 1) * 3 + 12;
  }

  private onPlotClick(idx: number, fx: number, fy: number): void {
    if (idx >= gameState.data.plots.length) return;
    const plot = gameState.data.plots[idx];
    if (plot.locked) {
      const cost = gameState.getCellCost();
      if (gameState.data.coins >= cost) {
        gameState.data.coins -= cost; plot.locked = false; gameState.data.gridBought++;
        showFloatingText(this.scene, fx, fy, `\u{1F513} -${fmtN(cost)}`);
        this.buildFarmGrid(); gameState.emit();
      } else { showFloatingText(this.scene, fx, fy, `\u274C ${fmtN(cost)}\u{1F4B0}`, '#ff6666'); }
      return;
    }
    if (plot.catIdx < 0) {
      const cat = gameState.data.selCat; const si = gameState.data.selItem;
      if (cat < 0 || cat > 1) return;
      const items = cat === 0 ? CROPS : TREES; if (si < 0 || si >= items.length) return;
      const item = items[si];
      if (item.reqLevel > gameState.data.level) { showFloatingText(this.scene, fx, fy, `\u{1F512} Niv.${item.reqLevel}`, '#ff6666'); return; }
      if (gameState.data.coins < item.cost) { showFloatingText(this.scene, fx, fy, '\u274C Pas assez!', '#ff6666'); return; }
      gameState.data.coins -= item.cost;
      plot.catIdx = cat; plot.itemIdx = si; plot.waterCount = 0; plot.lastWater = 0;
      showFloatingText(this.scene, fx, fy, `\u{1F331} -${fmtN(item.cost)}`);
      const g = this.plotGraphics[idx];
      if (g) this.scene.tweens.add({ targets: g, scaleX: 1.15, scaleY: 1.15, duration: 100, yoyo: true, ease: 'Bounce' });
      gameState.emit(); return;
    }
    if (gameState.isReadyToWater(plot)) {
      if (gameState.data.water <= 0) { showFloatingText(this.scene, fx, fy, "\u274C Pas d'eau!", '#ff6666'); return; }
      gameState.data.water--; plot.waterCount++; plot.lastWater = Date.now();
      const needed = gameState.getWaterNeeded(plot.catIdx);
      if (plot.waterCount >= needed) {
        showFloatingText(this.scene, fx, fy, '\u2705 Mur!', '#66ff66');
        const g = this.plotGraphics[idx];
        if (g) this.scene.tweens.add({ targets: g, scaleX: 1.2, scaleY: 1.2, duration: 200, yoyo: true, ease: 'Bounce' });
      } else { showFloatingText(this.scene, fx, fy, `\u{1F4A7} ${plot.waterCount}/${needed}`); }
      gameState.emit(); return;
    }
    if (gameState.isMature(plot)) {
      const item = plot.catIdx === 0 ? CROPS[plot.itemIdx] : TREES[plot.itemIdx]; if (!item) return;
      const sv = gameState.getSellValue(plot.catIdx, plot.itemIdx);
      gameState.data.coins += sv; gameState.data.xp += item.xp; gameState.data.totalEarned += sv; gameState.data.totalHarvested++;
      if (item.resourceKey) { gameState.addResource(item.resourceKey, 1); showFloatingText(this.scene, fx, fy - 20, `+1 ${item.emoji}`, '#aaffaa', '12px'); }
      if (plot.catIdx === 1) { gameState.addResource('bois', 1); showFloatingText(this.scene, fx, fy - 35, '+1\u{1FAB5}', '#d4a574', '12px'); }
      showFloatingText(this.scene, fx, fy, `+${fmtN(sv)}\u{1F4B0}`);
      showFloatingText(this.scene, fx, fy - 50, `+${item.xp}\u2B50`, '#ffdd44', '12px');
      // Track quest
      gameState.trackQuestHarvest(item.name);
      const g = this.plotGraphics[idx];
      if (g) this.scene.tweens.add({ targets: g, scaleX: 0.8, scaleY: 0.8, duration: 150, yoyo: true, ease: 'Power2' });
      plot.catIdx = -1; plot.itemIdx = -1; plot.waterCount = 0; plot.lastWater = 0;
      const lu = gameState.checkLevelUp();
      if (lu.leveled) showLevelUpBanner(this.scene, lu.newLevel, lu.wBonus, lu.gBonus);
      gameState.emit();
    }
  }

  private updateCropVisuals(): void {
    const now = Date.now(); const cellCost = gameState.getCellCost();
    const glowAlpha = 0.4 + 0.4 * Math.sin(now / 400); // 0.0 – 0.8 pulsing
    this.plotGraphics.forEach((group) => {
      const idx = group.getData('idx') as number;
      const ps = group.getData('plotSize') as number;
      if (idx >= gameState.data.plots.length) return;
      const plot = gameState.data.plots[idx]; const half = ps / 2;
      const bg = group.getAt(0) as Phaser.GameObjects.Graphics;
      const emojiText = group.getAt(1) as Phaser.GameObjects.Text;
      const subText = group.getAt(2) as Phaser.GameObjects.Text;
      const badgeText = group.getAt(3) as Phaser.GameObjects.Text;
      bg.clear();
      if (plot.locked) {
        bg.fillStyle(COLORS.plotLocked, 0.6); bg.fillRoundedRect(-half, -half, ps, ps, 6);
        emojiText.setText('\u{1F512}'); subText.setText(`${fmtN(cellCost)}\u{1F4B0}`).setBackgroundColor('#00000088').setVisible(true); badgeText.setText('');
        if (gameState.data.coins >= cellCost) { bg.lineStyle(2, COLORS.green, 0.5); bg.strokeRoundedRect(-half, -half, ps, ps, 6); }
        return;
      }
      if (plot.catIdx < 0) {
        bg.fillStyle(COLORS.plotEmpty, 1); bg.fillRoundedRect(-half, -half, ps, ps, 6);
        emojiText.setText(''); subText.setText('').setBackgroundColor('').setVisible(false); badgeText.setText(''); return;
      }
      const item = plot.catIdx === 0 ? CROPS[plot.itemIdx] : TREES[plot.itemIdx]; if (!item) return;
      const needed = gameState.getWaterNeeded(plot.catIdx);
      if (plot.waterCount >= needed) {
        // Mature — gold glow pulse
        bg.fillStyle(COLORS.plotMature, 1); bg.fillRoundedRect(-half, -half, ps, ps, 6);
        bg.lineStyle(3, 0xffa500, glowAlpha); bg.strokeRoundedRect(-half, -half, ps, ps, 6);
        emojiText.setText(item.emoji); subText.setText('\u2705 Recolter').setBackgroundColor('#00000088').setVisible(true); badgeText.setText(''); return;
      }
      const stMs = gameState.getStageTimeMs(plot.catIdx, plot.itemIdx);
      const since = now - plot.lastWater;
      const ready = plot.lastWater === 0 || since >= stMs;
      if (ready) {
        // Needs water — blue glow pulse
        bg.fillStyle(COLORS.plotWater, 1); bg.fillRoundedRect(-half, -half, ps, ps, 6);
        bg.lineStyle(3, 0x2196f3, glowAlpha); bg.strokeRoundedRect(-half, -half, ps, ps, 6);
        emojiText.setText(this.getStageEmoji(plot)); subText.setText(`${plot.waterCount}/${needed}`).setBackgroundColor('#00000088').setVisible(true); badgeText.setText('\u{1F4A7}');
      } else {
        bg.fillStyle(COLORS.plotGrowing, 1); bg.fillRoundedRect(-half, -half, ps, ps, 6);
        const rem = Math.ceil((stMs - since) / 1000); const ts = rem >= 60 ? Math.ceil(rem / 60) + 'm' : rem + 's';
        emojiText.setText(this.getStageEmoji(plot)); subText.setText(`${ts} \u00B7 ${plot.waterCount}/${needed}`).setBackgroundColor('#00000088').setVisible(true); badgeText.setText('');
        // Mini progress bar at top of slot
        const barH = 3; const barW = ps - 8; const barX = -half + 4; const barY = -half + 3;
        const pct = Math.min(since / stMs, 1);
        bg.fillStyle(0x000000, 0.3); bg.fillRoundedRect(barX, barY, barW, barH, 2);
        bg.fillStyle(0x4caf50, 1); bg.fillRoundedRect(barX, barY, Math.max(2, barW * pct), barH, 2);
      }
    });
    if (this.autoHarvestBtn) updateAutoButton(this.autoHarvestBtn);
    if (this.autoWaterBtn) updateAutoButton(this.autoWaterBtn);
  }

  private getStageEmoji(plot: PlotState): string {
    if (plot.catIdx === 0) { const s = ['\u{1F331}', '\u{1F33F}', '\u2618\uFE0F', CROPS[plot.itemIdx]?.emoji ?? '']; return s[Math.min(plot.waterCount, 3)]; }
    if (plot.catIdx === 1) { const w = plot.waterCount; if (w >= 4) return TREES[plot.itemIdx]?.emoji ?? ''; if (w >= 2) return '\u{1F333}'; if (w >= 1) return '\u{1F33F}'; return '\u{1F331}'; }
    return '';
  }

  // ====================================================================
  // ===                      ANIMALS SUB-TAB                         ===
  // ====================================================================
  private get animalSelectorY(): number { return this.subTabBottom + 4; }

  private buildAnimalsContent(): void {
    this.animalSelectorContainer = this.scene.add.container(0, 0);
    this.animalAutoBarContainer = this.scene.add.container(0, 0);
    this.animalGridContainer = this.scene.add.container(0, 0);
    this.contentContainer.add([this.animalSelectorContainer, this.animalAutoBarContainer, this.animalGridContainer]);
    this.buildAnimalSelector();
    this.buildAnimalAutoBar();
    this.buildAnimalGrid();
  }

  private buildAnimalSelector(): void {
    this.animalSelectorContainer.removeAll(true);
    const { width } = this.scene.scale;
    const y = this.animalSelectorY;
    const btnSize = 44; const gap = 3;
    const perRow = Math.floor((width - 8) / (btnSize + gap));
    ANIMALS.forEach((animal, i) => {
      const ok = animal.reqLevel <= gameState.data.level;
      const isActive = gameState.data.selAnimal === i;
      const row = Math.floor(i / perRow); const col = i % perRow;
      const totalInRow = Math.min(perRow, ANIMALS.length - row * perRow);
      const rowW = totalInRow * (btnSize + gap) - gap;
      const startX = (width - rowW) / 2;
      const x = startX + col * (btnSize + gap) + btnSize / 2;
      const by = y + row * (btnSize + gap) + btnSize / 2;
      const bg = this.scene.add.graphics();
      bg.fillStyle(isActive ? 0xfff3e0 : (ok ? 0xf5f5f5 : 0xdddddd), 1);
      if (isActive) bg.lineStyle(2, COLORS.goldDark, 1);
      bg.fillRoundedRect(-btnSize / 2, -btnSize / 2, btnSize, btnSize, 5);
      if (isActive) bg.strokeRoundedRect(-btnSize / 2, -btnSize / 2, btnSize, btnSize, 5);
      const emoji = this.scene.add.text(0, -6, animal.emoji, { fontSize: '16px' }).setOrigin(0.5).setAlpha(ok ? 1 : 0.3);
      const price = this.scene.add.text(0, 14, fmtN(animal.cost), { fontSize: '10px', fontFamily: 'Arial, sans-serif', color: ok ? '#333' : '#999' }).setOrigin(0.5);
      const btn = this.scene.add.container(x, by, [bg, emoji, price]);
      if (ok) {
        const hit = this.scene.add.rectangle(0, 0, btnSize, btnSize, 0, 0)
          .setInteractive({ useHandCursor: true })
          .on('pointerdown', () => { gameState.data.selAnimal = i; this.buildAnimalSelector(); });
        btn.add(hit);
      }
      this.animalSelectorContainer.add(btn);
    });
  }

  private getAnimalSelectorHeight(): number {
    const { width } = this.scene.scale;
    const perRow = Math.floor((width - 8) / 47); // 44+3
    return Math.ceil(ANIMALS.length / perRow) * 47 + 4;
  }

  private buildAnimalAutoBar(): void {
    this.animalAutoBarContainer.removeAll(true);
    const { width } = this.scene.scale;
    const hasFeed = gameState.getUpgrade('autofeed') > 0;
    if (!hasFeed) return;
    const y = this.animalSelectorY + this.getAnimalSelectorHeight() + 2;
    const barBg = this.scene.add.graphics();
    barBg.fillStyle(COLORS.sky, 1);
    barBg.fillRect(0, y, width, FarmPanel.AUTO_BAR_H);
    this.animalAutoBarContainer.add(barBg);
    const btnW = width - 24; const btnH = FarmPanel.AUTO_BAR_H - 6;
    this.autoFeedBtn = createAutoButton(this.scene, this.animalAutoBarContainer, width / 2, y + FarmPanel.AUTO_BAR_H / 2, btnW, btnH,
      { upgId: 'autofeed', icon: '\u{1F37D}\uFE0F', labelReady: 'Alimentation', endKey: 'autoFeedEnd', resetKey: 'afResets' },
      () => this.refresh());
    updateAutoButton(this.autoFeedBtn);
  }

  private getAnimalAutoBarHeight(): number {
    return gameState.getUpgrade('autofeed') > 0 ? FarmPanel.AUTO_BAR_H : 0;
  }

  private animalGridTopY = 0;

  private buildAnimalGrid(): void {
    this.animalGridContainer.removeAll(true);
    this.animalSlotGraphics = [];
    const { width, height } = this.scene.scale;
    this.animalGridTopY = this.animalSelectorY + this.getAnimalSelectorHeight() + this.getAnimalAutoBarHeight() + 4;
    this.scrollTopY = this.animalGridTopY;
    this.scrollTarget = this.animalGridContainer;
    const availH = height - this.animalGridTopY - UI.TAB_HEIGHT;
    const totalSlots = gameState.getAnimalUnlockedSlots() + ANIMAL_COLS;
    const visRows = Math.min(Math.ceil(totalSlots / ANIMAL_COLS), 10);
    const cols = ANIMAL_COLS;
    const pad = 6; const gap = 3;
    const ps = Math.min(Math.floor((width - pad * 2 - gap * (cols - 1)) / cols), 62);
    const gridW = cols * ps + (cols - 1) * gap;
    const gridX = (width - gridW) / 2;
    const gridBg = this.scene.add.graphics();
    gridBg.fillStyle(0x8b6914, 0.3);
    gridBg.fillRoundedRect(gridX - pad, 0, gridW + pad * 2, visRows * ps + (visRows - 1) * gap + pad * 2, 10);
    this.animalGridContainer.add(gridBg);
    this.animalGridContainer.setPosition(0, this.animalGridTopY + this.scroller.scrollY);

    for (let r = 0; r < visRows; r++) {
      for (let c = 0; c < cols; c++) {
        const idx = r * cols + c;
        const x = gridX + c * (ps + gap) + ps / 2;
        const y = pad + r * (ps + gap) + ps / 2;
        const bg = this.scene.add.graphics();
        const emojiText = this.scene.add.text(0, -4, '', { fontSize: `${Math.floor(ps * 0.4)}px` }).setOrigin(0.5);
        const subText = this.scene.add.text(0, ps / 2 - 8, '', { fontSize: '11px', fontFamily: 'Arial, sans-serif', color: '#fff', padding: { x: 2, y: 1 } }).setOrigin(0.5);
        const hit = this.scene.add.rectangle(0, 0, ps, ps, 0, 0)
          .setInteractive({ useHandCursor: true })
          .on('pointerdown', () => {
            this.scene.tweens.add({ targets: group, scaleX: 0.93, scaleY: 0.93, duration: 60, yoyo: true, ease: 'Power1' });
          })
          .on('pointerup', () => { if (this.scroller.totalDragDistance < DRAG_THRESHOLD) this.onAnimalSlotClick(idx, x, y + this.animalGridTopY + this.scroller.scrollY); });
        const badge = this.scene.add.text(ps / 2 - 2, -ps / 2 + 2, '', { fontSize: '10px' }).setOrigin(1, 0);
        const badgeHit = this.scene.add.rectangle(ps / 2 - 10, -ps / 2 + 10, 20, 20, 0, 0)
          .setInteractive({ useHandCursor: true })
          .on('pointerup', () => { if (this.scroller.totalDragDistance < DRAG_THRESHOLD) this.onAnimalBadgeClick(idx); });
        const group = this.scene.add.container(x, y, [bg, emojiText, subText, hit, badge, badgeHit]);
        group.setData('idx', idx); group.setData('plotSize', ps);
        this.animalSlotGraphics.push(group);
        this.animalGridContainer.add(group);
      }
    }
    this.updateAnimalVisuals();
    const mask = this.scene.make.graphics({});
    mask.fillRect(0, this.animalGridTopY, width, availH);
    this.animalGridContainer.setMask(mask.createGeometryMask());
  }

  private getAnimalGridHeight(): number {
    const total = gameState.getAnimalUnlockedSlots() + ANIMAL_COLS;
    const rows = Math.min(Math.ceil(total / ANIMAL_COLS), 10);
    const { width } = this.scene.scale;
    const ps = Math.min(Math.floor((width - 12 - 3 * (ANIMAL_COLS - 1)) / ANIMAL_COLS), 62);
    return rows * ps + (rows - 1) * 3 + 12;
  }

  private onAnimalBadgeClick(idx: number): void {
    if (idx >= gameState.data.animalSlots.length) return;
    const slot = gameState.data.animalSlots[idx];
    if (slot.locked || slot.animalIdx < 0) return;
    slot.autoFeed = !slot.autoFeed;
    gameState.emit(); this.updateAnimalVisuals();
  }

  private onAnimalSlotClick(idx: number, fx: number, fy: number): void {
    if (idx >= gameState.data.animalSlots.length) return;
    const slot = gameState.data.animalSlots[idx];
    if (slot.locked) { showFloatingText(this.scene, fx, fy, '\u{1F512} Amelioration requise', '#ff6666'); return; }
    if (slot.animalIdx < 0) {
      const si = gameState.data.selAnimal; const animal = ANIMALS[si]; if (!animal) return;
      if (animal.reqLevel > gameState.data.level) { showFloatingText(this.scene, fx, fy, `\u{1F512} Niv.${animal.reqLevel}`, '#ff6666'); return; }
      if (gameState.data.coins < animal.cost) { showFloatingText(this.scene, fx, fy, '\u274C Pas assez!', '#ff6666'); return; }
      gameState.data.coins -= animal.cost; slot.animalIdx = si; slot.fed = false; slot.prodStart = 0;
      showFloatingText(this.scene, fx, fy, `${animal.emoji} -${fmtN(animal.cost)}`); gameState.emit(); return;
    }
    if (slot.fed) {
      const pt = gameState.getAnimalProdTimeMs(slot.animalIdx);
      if (Date.now() - slot.prodStart >= pt) {
        const feed = ANIMAL_FEED[slot.animalIdx]; const qty = gameState.getAnimalProdQty();
        // Track quest before collecting
        if (feed?.outputResource) gameState.trackQuestAnimalRes(feed.outputResource, qty);
        gameState.collectAnimal(idx);
        if (feed?.outputResource) { const info = RESOURCE_INFO[feed.outputResource]; showFloatingText(this.scene, fx, fy, `+${qty} ${info?.emoji ?? ''}`, '#66ff66'); }
        else if (feed) showFloatingText(this.scene, fx, fy, `+${fmtN(feed.coinsPerTick * qty)}\u{1F4B0}`, '#ffdd44');
        const lu2 = gameState.checkLevelUp();
        if (lu2.leveled) showLevelUpBanner(this.scene, lu2.newLevel, lu2.wBonus, lu2.gBonus);
        gameState.emit(); return;
      }
      const rem = Math.ceil((pt - (Date.now() - slot.prodStart)) / 1000);
      showFloatingText(this.scene, fx, fy, `\u23F3 ${rem >= 60 ? Math.ceil(rem / 60) + 'm' : rem + 's'}`, '#aaaaaa'); return;
    }
    if (gameState.feedAnimal(idx)) {
      const feed = ANIMAL_FEED[slot.animalIdx];
      if (feed) {
        const lbl = feed.feedResource === 'coins' ? `-${fmtN(feed.feedQty)}\u{1F4B0}` : `-${feed.feedQty} ${RESOURCE_INFO[feed.feedResource]?.emoji ?? ''}`;
        showFloatingText(this.scene, fx, fy, `\u{1F37D}\uFE0F ${lbl}`);
      }
      gameState.emit();
    } else {
      const feed = ANIMAL_FEED[slot.animalIdx];
      if (feed) { const rn = feed.feedResource === 'coins' ? '\u{1F4B0}' : (RESOURCE_INFO[feed.feedResource]?.emoji ?? feed.feedResource); showFloatingText(this.scene, fx, fy, `\u274C ${rn} insuffisant`, '#ff6666'); }
    }
  }

  private updateAnimalVisuals(): void {
    const now = Date.now(); const hasFeed = gameState.getUpgrade('autofeed') > 0;
    const glowAlpha = 0.4 + 0.4 * Math.sin(now / 400);
    this.animalSlotGraphics.forEach((group) => {
      const idx = group.getData('idx') as number; const ps = group.getData('plotSize') as number;
      if (idx >= gameState.data.animalSlots.length) return;
      const slot = gameState.data.animalSlots[idx]; const half = ps / 2;
      const bg = group.getAt(0) as Phaser.GameObjects.Graphics;
      const emojiText = group.getAt(1) as Phaser.GameObjects.Text;
      const subText = group.getAt(2) as Phaser.GameObjects.Text;
      const badge = group.getAt(4) as Phaser.GameObjects.Text;
      const badgeHit = group.getAt(5) as Phaser.GameObjects.Rectangle;
      bg.clear();
      if (hasFeed && !slot.locked && slot.animalIdx >= 0) { badge.setText(slot.autoFeed ? '\u{1F504}' : '\u23F8\uFE0F').setVisible(true); badgeHit.setVisible(true); }
      else { badge.setText('').setVisible(false); badgeHit.setVisible(false); }
      if (slot.locked) { bg.fillStyle(COLORS.plotLocked, 0.6); bg.fillRoundedRect(-half, -half, ps, ps, 6); emojiText.setText('\u{1F512}'); subText.setText('').setVisible(false); return; }
      if (slot.animalIdx < 0) { bg.fillStyle(COLORS.animalPen, 0.5); bg.fillRoundedRect(-half, -half, ps, ps, 6); emojiText.setText(''); subText.setText('').setVisible(false); return; }
      const animal = ANIMALS[slot.animalIdx]; if (!animal) return;
      if (slot.fed) {
        const pt = gameState.getAnimalProdTimeMs(slot.animalIdx); const el = now - slot.prodStart;
        if (el >= pt) {
          // Ready to collect — gold glow pulse
          bg.fillStyle(COLORS.plotMature, 1); bg.fillRoundedRect(-half, -half, ps, ps, 6);
          bg.lineStyle(3, 0xffa500, glowAlpha); bg.strokeRoundedRect(-half, -half, ps, ps, 6);
          emojiText.setText(animal.emoji); subText.setText('\u2705').setBackgroundColor('#00000088').setVisible(true);
        } else {
          bg.fillStyle(COLORS.plotGrowing, 1); bg.fillRoundedRect(-half, -half, ps, ps, 6);
          const rem = Math.ceil((pt - el) / 1000); emojiText.setText(animal.emoji); subText.setText(rem >= 60 ? Math.ceil(rem / 60) + 'm' : rem + 's').setBackgroundColor('#00000088').setVisible(true);
          // Mini progress bar at top of slot
          const barH = 3; const barW = ps - 8; const barX = -half + 4; const barY = -half + 3;
          const pct = Math.min(el / pt, 1);
          bg.fillStyle(0x000000, 0.3); bg.fillRoundedRect(barX, barY, barW, barH, 2);
          bg.fillStyle(0x4caf50, 1); bg.fillRoundedRect(barX, barY, Math.max(2, barW * pct), barH, 2);
        }
      } else {
        // Needs feeding — blue glow pulse
        bg.fillStyle(COLORS.plotWater, 1); bg.fillRoundedRect(-half, -half, ps, ps, 6);
        bg.lineStyle(3, 0x2196f3, glowAlpha); bg.strokeRoundedRect(-half, -half, ps, ps, 6);
        emojiText.setText(animal.emoji);
        const feed = ANIMAL_FEED[slot.animalIdx]; const fe = feed?.feedResource === 'coins' ? '\u{1F4B0}' : (RESOURCE_INFO[feed?.feedResource ?? '']?.emoji ?? '');
        subText.setText(`${fe}x${feed?.feedQty ?? '?'}`).setBackgroundColor('#00000088').setVisible(true);
      }
    });
    if (this.autoFeedBtn) updateAutoButton(this.autoFeedBtn);
  }

  // ====================================================================
  // ===                     FARMERS SUB-TAB                          ===
  // ====================================================================
  private buildFarmersContent(): void {
    this.farmerScrollContainer = this.scene.add.container(0, this.subTabBottom + 4);
    this.contentContainer.add(this.farmerScrollContainer);
    this.scrollTopY = this.subTabBottom + 4;
    this.scrollTarget = this.farmerScrollContainer;
    this.renderFarmers();

    // Mask
    const { width, height } = this.scene.scale;
    const mask = this.scene.make.graphics({});
    mask.fillRect(0, this.subTabBottom, width, height - this.subTabBottom - UI.TAB_HEIGHT);
    this.farmerScrollContainer.setMask(mask.createGeometryMask());
  }

  private renderFarmers(): void {
    this.farmerScrollContainer.removeAll(true);
    this.farmerTimerTexts = [];
    const { width } = this.scene.scale;
    let y = 0;
    const fCount = gameState.data.farmers.length;

    // Hire button
    if (fCount < FARMER_MAX) {
      const cost = gameState.getFarmerHireCost(fCount);
      const can = gameState.data.coins >= cost;
      y = this.renderFarmerCard(y, `\u{1F468}\u200D\u{1F33E} Engager fermier #${fCount + 1}`, null, null,
        `${fmtN(cost)}\u{1F4B0}`, `Loyer: ${fmtN(Math.floor(cost * 0.1))}\u{1F4B0}/mois`, can, () => {
          if (gameState.data.coins < cost) return;
          gameState.data.coins -= cost;
          gameState.data.farmers.push({ name: `Fermier ${fCount + 1}`, level: 1, hireCost: cost, assignment: 'repos', lastProd: Date.now() });
          gameState.emit(); this.buildActiveContent();
        });
    }

    // Farmer cards
    for (let fi = 0; fi < fCount; fi++) {
      y = this.renderFarmerDetailCard(y, fi);
    }

    this.farmerContentHeight = y + 20;
  }

  private renderFarmerCard(y: number, title: string, _a: null, _b: null,
    btnLabel: string, sub: string, enabled: boolean, onClick: () => void): number {
    const { width } = this.scene.scale;
    const h = 86;
    const bg = this.scene.add.graphics();
    bg.fillStyle(0xffffff, 0.92);
    bg.fillRoundedRect(8, y, width - 16, h, 10);

    const ttl = this.scene.add.text(width / 2, y + 16, title, {
      fontSize: '13px', fontFamily: 'Arial, sans-serif', color: '#5d4037', fontStyle: 'bold',
    }).setOrigin(0.5);

    const subTxt = this.scene.add.text(width / 2, y + 34, sub, {
      fontSize: '11px', fontFamily: 'Arial, sans-serif', color: '#888',
    }).setOrigin(0.5);

    // Green hire button
    const btnW = width - 40; const btnH = 26; const btnX = 20; const btnY = y + 52;
    const btnBg = this.scene.add.graphics();
    btnBg.fillStyle(enabled ? 0x66bb6a : 0x999999, 1);
    btnBg.fillRoundedRect(btnX, btnY, btnW, btnH, 10);
    const btnTxt = this.scene.add.text(btnX + btnW / 2, btnY + btnH / 2, btnLabel, {
      fontSize: '11px', fontFamily: 'Arial, sans-serif', color: '#fff', fontStyle: 'bold',
    }).setOrigin(0.5);

    if (enabled) {
      const hit = this.scene.add.rectangle(btnX + btnW / 2, btnY + btnH / 2, btnW, btnH, 0, 0)
        .setInteractive({ useHandCursor: true }).on('pointerdown', onClick);
      this.farmerScrollContainer.add(hit);
    }
    this.farmerScrollContainer.add([bg, ttl, subTxt, btnBg, btnTxt]);
    return y + h + 8;
  }

  private renderFarmerDetailCard(y: number, fi: number, name: string, level: number,
    prodStr: string, infoLine: string, assignment: string): number {
    const { width } = this.scene.scale;
    const hasUpgrade = level < FARMER_MAX_LVL;
    const h = hasUpgrade ? 110 : 82;
    const bg = this.scene.add.graphics();
    bg.fillStyle(0xffffff, 0.92);
    bg.fillRoundedRect(8, y, width - 16, h, 10);

    // Header: emoji + name + level badge
    const emoji = this.scene.add.text(18, y + 14, '\u{1F468}\u200D\u{1F33E}', { fontSize: '18px' }).setOrigin(0, 0.5);
    const nameTxt = this.scene.add.text(42, y + 14, name, {
      fontSize: '11px', fontFamily: 'Arial, sans-serif', color: '#5d4037', fontStyle: 'bold',
    }).setOrigin(0, 0.5);
    const lvlBg = this.scene.add.graphics();
    lvlBg.fillStyle(0x8d6e63, 1);
    lvlBg.fillRoundedRect(width - 60, y + 6, 44, 16, 8);
    const lvlTxt = this.scene.add.text(width - 38, y + 14, `Niv.${level}`, {
      fontSize: '11px', fontFamily: 'Arial, sans-serif', color: '#fff', fontStyle: 'bold',
    }).setOrigin(0.5);

    // Info line
    const info = this.scene.add.text(18, y + 30, infoLine, {
      fontSize: '11px', fontFamily: 'Arial, sans-serif', color: '#666',
    });

    // Assignment row
    const assLabel = this.scene.add.text(18, y + 48, `Recolte: ${prodStr}`, {
      fontSize: '11px', fontFamily: 'Arial, sans-serif', color: '#333',
    });

    // Next assignment button
    const assignments = ['repos', ...FARMER_RESOURCES];
    const curIdx = assignments.indexOf(assignment);
    const nextBtnW = 66; const nextBtnH = 20;
    const nextBtnX = width - 22 - nextBtnW; const nextBtnY = y + 44;
    const nBg = this.scene.add.graphics();
    nBg.fillStyle(COLORS.blue, 1);
    nBg.fillRoundedRect(nextBtnX, nextBtnY, nextBtnW, nextBtnH, 7);
    const nTxt = this.scene.add.text(nextBtnX + nextBtnW / 2, nextBtnY + nextBtnH / 2, 'Suivant \u25B6', {
      fontSize: '11px', fontFamily: 'Arial, sans-serif', color: '#fff', fontStyle: 'bold',
    }).setOrigin(0.5);
    const nHit = this.scene.add.rectangle(nextBtnX + nextBtnW / 2, nextBtnY + nextBtnH / 2, nextBtnW, nextBtnH, 0, 0)
      .setInteractive({ useHandCursor: true })
      .on('pointerdown', () => {
        const ni = (curIdx + 1) % assignments.length;
        gameState.data.farmers[fi].assignment = assignments[ni];
        gameState.emit(); this.buildActiveContent();
      });

    // Upgrade button
    if (hasUpgrade) {
      const upgCost = gameState.getFarmerUpgradeCost(level);
      const can = gameState.data.coins >= upgCost;
      const uBtnW = width - 40; const uBtnH = 24;
      const uBtnX = 20; const uBtnY = y + 80;
      const uBg = this.scene.add.graphics();
      uBg.fillStyle(can ? 0xff9800 : 0x999999, 1);
      uBg.fillRoundedRect(uBtnX, uBtnY, uBtnW, uBtnH, 7);
      const uTxt = this.scene.add.text(uBtnX + uBtnW / 2, uBtnY + uBtnH / 2, `\u2B06\uFE0F Niv.${level + 1} - ${fmtN(upgCost)}\u{1F4B0}`, {
        fontSize: '11px', fontFamily: 'Arial, sans-serif', color: '#fff', fontStyle: 'bold',
      }).setOrigin(0.5);
      if (can) {
        const uHit = this.scene.add.rectangle(uBtnX + uBtnW / 2, uBtnY + uBtnH / 2, uBtnW, uBtnH, 0, 0)
          .setInteractive({ useHandCursor: true })
          .on('pointerdown', () => {
            if (gameState.data.coins < upgCost) return;
            gameState.data.coins -= upgCost;
            gameState.data.farmers[fi].level++;
            gameState.emit(); this.buildActiveContent();
          });
        this.farmerScrollContainer.add(uHit);
      }
      this.farmerScrollContainer.add([uBg, uTxt]);
    }

    this.farmerScrollContainer.add([bg, emoji, nameTxt, lvlBg, lvlTxt, info, assLabel, nBg, nTxt, nHit]);
    return y + h + 8;
  }

  // ====================================================================
  // ===                       AIDE SUB-TAB                            ===
  // ====================================================================
  private buildAideContent(): void {
    this.aideScrollContainer = this.scene.add.container(0, this.subTabBottom + 4);
    this.contentContainer.add(this.aideScrollContainer);
    this.scrollTopY = this.subTabBottom + 4;
    this.scrollTarget = this.aideScrollContainer;
    this.renderAide();
    const { width, height } = this.scene.scale;
    const mask = this.scene.make.graphics({});
    mask.fillRect(0, this.subTabBottom, width, height - this.subTabBottom - UI.TAB_HEIGHT);
    this.aideScrollContainer.setMask(mask.createGeometryMask());
  }

  private renderAide(): void {
    this.aideScrollContainer.removeAll(true);
    const { width } = this.scene.scale;
    let y = 0;

    // Sub-sub-tabs
    type AideSub = 'cultures' | 'arbres' | 'animaux' | 'fermiers';
    const aideTabs: { id: AideSub; label: string }[] = [
      { id: 'cultures', label: '\u{1F331} Cultures' },
      { id: 'arbres', label: '\u{1F333} Arbres' },
      { id: 'animaux', label: '\u{1F404} Animaux' },
      { id: 'fermiers', label: '\u{1F468}\u200D\u{1F33E} Fermiers' },
    ];
    const tabW = (width - 16) / aideTabs.length;
    const tabH = 26;
    aideTabs.forEach((tab, i) => {
      const tx = 8 + tabW * i + tabW / 2;
      const isActive = this.aideSub === tab.id;
      const bg = this.scene.add.graphics();
      bg.fillStyle(isActive ? 0xe8f5e9 : 0xffffff, isActive ? 1 : 0.7);
      if (isActive) { bg.lineStyle(2, COLORS.green, 1); }
      bg.fillRoundedRect(tx - tabW / 2 + 2, y, tabW - 4, tabH, 7);
      if (isActive) bg.strokeRoundedRect(tx - tabW / 2 + 2, y, tabW - 4, tabH, 7);
      const label = this.scene.add.text(tx, y + tabH / 2, tab.label, {
        fontSize: '10px', fontFamily: 'Arial, sans-serif', color: '#333', fontStyle: isActive ? 'bold' : 'normal',
      }).setOrigin(0.5);
      const hit = this.scene.add.rectangle(tx, y + tabH / 2, tabW - 4, tabH, 0, 0)
        .setInteractive({ useHandCursor: true })
        .on('pointerdown', () => { this.aideSub = tab.id; this.renderAide(); });
      this.aideScrollContainer.add([bg, label, hit]);
    });
    y += tabH + 8;

    if (this.aideSub === 'cultures') y = this.renderAideCrops(y);
    else if (this.aideSub === 'arbres') y = this.renderAideTrees(y);
    else if (this.aideSub === 'animaux') y = this.renderAideAnimals(y);
    else y = this.renderAideFermiers(y);

    this.aideContentHeight = y + 20;
  }

  private fmtTime(s: number): string {
    return s >= 60 ? `${Math.floor(s / 60)}min` : `${s}s`;
  }

  private renderAideItem(y: number, emoji: string, name: string, desc: string, locked: boolean): number {
    const { width } = this.scene.scale;
    const h = 50;
    const bg = this.scene.add.graphics();
    bg.fillStyle(0xffffff, locked ? 0.5 : 0.9);
    bg.fillRoundedRect(10, y, width - 20, h, 9);
    const icon = this.scene.add.text(26, y + h / 2, emoji, { fontSize: '20px' }).setOrigin(0.5).setAlpha(locked ? 0.4 : 1);
    const nameTxt = this.scene.add.text(46, y + 11, name, {
      fontSize: '13px', fontFamily: 'Arial, sans-serif', color: '#333', fontStyle: 'bold',
    }).setAlpha(locked ? 0.5 : 1);
    const descTxt = this.scene.add.text(46, y + 30, desc, {
      fontSize: '11px', fontFamily: 'Arial, sans-serif', color: '#666',
    }).setAlpha(locked ? 0.5 : 1);
    this.aideScrollContainer.add([bg, icon, nameTxt, descTxt]);
    return y + h + 4;
  }

  private renderAideCrops(y: number): number {
    const sorted = [...CROPS].sort((a, b) => a.name.localeCompare(b.name));
    for (const crop of sorted) {
      const locked = crop.reqLevel > gameState.data.level;
      const totalTime = crop.stageTime * CAT_WATER[0];
      const sv = gameState.getSellValue(0, CROPS.indexOf(crop));
      let desc = `\u23F1 ${this.fmtTime(totalTime)} \u00B7 \u{1F4B0}${fmtN(sv)} \u00B7 \u2B50+${crop.xp}`;
      if (crop.resourceKey) {
        const ri = RESOURCE_INFO[crop.resourceKey];
        if (ri) desc += ` \u00B7 Donne: ${ri.emoji} ${ri.name}`;
      }
      const name = crop.name + (locked ? ` \u{1F512}Niv.${crop.reqLevel}` : '');
      y = this.renderAideItem(y, crop.emoji, name, desc, locked);
    }
    return y;
  }

  private renderAideTrees(y: number): number {
    const sorted = [...TREES].sort((a, b) => a.name.localeCompare(b.name));
    for (const tree of sorted) {
      const locked = tree.reqLevel > gameState.data.level;
      const totalTime = tree.stageTime * CAT_WATER[1];
      const sv = gameState.getSellValue(1, TREES.indexOf(tree));
      let desc = `\u23F1 ${this.fmtTime(totalTime)} \u00B7 \u{1F4B0}${fmtN(sv)} \u00B7 \u2B50+${tree.xp}`;
      if (tree.resourceKey) {
        const ri = RESOURCE_INFO[tree.resourceKey];
        if (ri) desc += ` \u00B7 Donne: ${ri.emoji} ${ri.name} + \u{1FAB5} Bois`;
      }
      const name = tree.name + (locked ? ` \u{1F512}Niv.${tree.reqLevel}` : '');
      y = this.renderAideItem(y, tree.emoji, name, desc, locked);
    }
    return y;
  }

  private renderAideAnimals(y: number): number {
    const sorted = ANIMALS.map((a, i) => ({ animal: a, idx: i })).sort((a, b) => a.animal.name.localeCompare(b.animal.name));
    for (const { animal, idx } of sorted) {
      const locked = animal.reqLevel > gameState.data.level;
      const feed = ANIMAL_FEED[idx];
      let feedStr = '';
      if (feed) {
        if (feed.feedResource === 'coins') feedStr = `${fmtN(feed.feedQty)}\u{1F4B0}`;
        else { const ri = RESOURCE_INFO[feed.feedResource]; feedStr = `${feed.feedQty}\u00D7 ${ri?.emoji ?? ''} ${ri?.name ?? feed.feedResource}`; }
      }
      const prodQty = gameState.getAnimalProdQty();
      let prodStr = '';
      if (feed?.outputResource) { const ri = RESOURCE_INFO[feed.outputResource]; prodStr = `${prodQty}\u00D7 ${ri?.emoji ?? ''} ${ri?.name ?? ''}`; }
      else if (feed) prodStr = `${fmtN(feed.coinsPerTick * prodQty)}\u{1F4B0}`;
      const prodTime = gameState.getAnimalProdTimeMs(idx) / 1000;
      const desc = `\u{1F37D}\uFE0F ${feedStr} \u2192 ${prodStr} \u00B7 \u23F1 ${this.fmtTime(prodTime)} \u00B7 Cout: ${fmtN(animal.cost)}\u{1F4B0}`;
      const name = animal.name + (locked ? ` \u{1F512}Niv.${animal.reqLevel}` : '');
      y = this.renderAideItem(y, animal.emoji, name, desc, locked);
    }
    return y;
  }

  private renderAideFermiers(y: number): number {
    const { width } = this.scene.scale;
    const lines = [
      { text: '\u{1F468}\u200D\u{1F33E} Guide des Fermiers', bold: true, size: 14, center: true },
      { text: '', bold: false, size: 8, center: false },
      { text: 'Comment ca marche ?', bold: true, size: 12, center: false },
      { text: `Les fermiers recoltent automatiquement des ressources brutes pour vous toutes les 60 secondes.`, bold: false, size: 11, center: false },
      { text: '---', bold: false, size: 4, center: false },
      { text: `\u{1F6D2} Engager \u2014 Achetez un fermier (max ${FARMER_MAX}). Le cout augmente a chaque embauche.`, bold: false, size: 11, center: false },
      { text: '\u{1F4E6} Assigner \u2014 Choisissez la ressource qu\'il doit recolter (ble, lait, oeufs, etc.).', bold: false, size: 11, center: false },
      { text: '\u{1F4E6} Production \u2014 Chaque minute, il produit autant de ressources que son niveau.', bold: false, size: 11, center: false },
      { text: `\u2B06\uFE0F Ameliorer \u2014 Montez son niveau (max ${FARMER_MAX_LVL}) pour augmenter sa production.`, bold: false, size: 11, center: false },
      { text: '\u{1F634} Repos \u2014 Mettez-le en repos pour diviser son loyer par 2 (mais il ne produit rien).', bold: false, size: 11, center: false },
      { text: '\u{1F3E0} Loyer \u2014 Chaque fermier coute un loyer mensuel (10% de son cout d\'achat). Le repos reduit ce cout de moitie.', bold: false, size: 11, center: false },
      { text: '\u270F\uFE0F Renommer \u2014 Touchez le nom pour le personnaliser (max 15 caracteres).', bold: false, size: 11, center: false },
    ];

    const pad = 12;
    const bg = this.scene.add.graphics();
    // We'll set bg size after calculating total height
    let textY = y + pad;

    const textObjs: Phaser.GameObjects.Text[] = [];
    for (const line of lines) {
      if (line.text === '---') {
        const sep = this.scene.add.graphics();
        sep.lineStyle(1, 0x000000, 0.1);
        sep.lineBetween(pad + 10, textY + 4, width - pad - 10, textY + 4);
        this.aideScrollContainer.add(sep);
        textY += 10;
        continue;
      }
      if (line.text === '') { textY += 6; continue; }
      const txt = this.scene.add.text(line.center ? width / 2 : pad + 10, textY, line.text, {
        fontSize: `${line.size}px`, fontFamily: 'Arial, sans-serif', color: '#333',
        fontStyle: line.bold ? 'bold' : 'normal',
        wordWrap: { width: width - pad * 2 - 20 },
      });
      if (line.center) txt.setOrigin(0.5, 0);
      textObjs.push(txt);
      this.aideScrollContainer.add(txt);
      textY += txt.height + 6;
    }

    const totalH = textY - y + pad;
    bg.fillStyle(0xffffff, 0.9);
    bg.fillRoundedRect(pad, y, width - pad * 2, totalH, 10);
    this.aideScrollContainer.add(bg);
    if (textObjs.length > 0) this.aideScrollContainer.moveBelow(bg, textObjs[0] as any);
    return y + totalH + 10;
  }

  // ====================================================================
  // ===                         SCROLL                               ===
  // ====================================================================
  private setupScroll(): void {
    this.scene.input.on('pointerdown', (p: Phaser.Input.Pointer) => {
      if (!this.container.visible) return;
      this.lastDragPlantIdx = -1;
      this.isDragPlanting = false;
      const height = this.scene.scale.height;
      if (p.y > this.scrollTopY && p.y < height - UI.TAB_HEIGHT) {
        this.scroller.onDragStart(p.y);
        // If on crops sub-tab, check if pointer is on a plot to start drag-planting
        if (this.activeSub === 'crops') {
          const idx = this.getPlotIndexAtScreen(p.x, p.y);
          if (idx >= 0) {
            this.lastDragPlantIdx = idx;
            // Don't plant on pointerdown — that's handled by pointerup/onPlotClick
          }
        }
      }
    });
    this.scene.input.on('pointermove', (p: Phaser.Input.Pointer) => {
      if (!this.container.visible) return;

      // If already drag-planting, skip scroll entirely — just handle planting
      if (this.isDragPlanting) {
        if (this.activeSub === 'crops' && p.isDown) {
          const idx = this.getPlotIndexAtScreen(p.x, p.y);
          if (idx >= 0 && idx !== this.lastDragPlantIdx) {
            this.tryDragPlant(idx);
            this.lastDragPlantIdx = idx;
            this.updateCropVisuals();
          }
        }
        return;
      }

      this.scroller.onDragMove(p.y);

      // Drag-to-plant: if pointer is down, on crops sub, check for planting
      if (this.activeSub === 'crops' && p.isDown && this.scroller.isDragging) {
        const idx = this.getPlotIndexAtScreen(p.x, p.y);
        // On first move into a different plot, also plant on the initial plot if not yet done
        if (idx >= 0 && idx !== this.lastDragPlantIdx && this.lastDragPlantIdx >= 0) {
          // Plant on the first plot the finger landed on
          if (this.tryDragPlant(this.lastDragPlantIdx)) {
            this.isDragPlanting = true;
          }
        }
        if (idx >= 0 && idx !== this.lastDragPlantIdx) {
          // Plant on the new plot we dragged into
          if (this.tryDragPlant(idx)) {
            this.isDragPlanting = true;
          }
          this.lastDragPlantIdx = idx;
        }
        if (this.isDragPlanting) {
          // Freeze scroll at current position — revert any scroll that happened this frame
          this.scroller.stop();
          this.updateCropVisuals();
        }
      }
    });
    this.scene.input.on('pointerup', () => {
      if (this.isDragPlanting) {
        // Don't trigger inertia after drag-planting
        this.scroller.stop();
      } else {
        this.scroller.onDragEnd();
      }
      this.isDragPlanting = false;
      this.lastDragPlantIdx = -1;
    });
  }

  private clampScroll(sy: number): number {
    const { height } = this.scene.scale;
    const viewH = height - this.scrollTopY - UI.TAB_HEIGHT;
    let contentH = 0;
    if (this.activeSub === 'crops') contentH = this.getCropGridHeight();
    else if (this.activeSub === 'animals') contentH = this.getAnimalGridHeight();
    else if (this.activeSub === 'farmers') contentH = this.farmerContentHeight;
    else contentH = this.aideContentHeight;
    const minS = Math.min(0, viewH - contentH - 20);
    return Math.max(minS, Math.min(0, sy));
  }

  // ========== PUBLIC API ==========
  setVisible(v: boolean): void { this.container.setVisible(v); }

  updateVisuals(): void {
    this.updateDayBar();
    if (this.activeSub === 'crops') this.updateCropVisuals();
    else if (this.activeSub === 'animals') this.updateAnimalVisuals();
    // Farmers and Aide don't need per-frame updates
  }

  refresh(): void {
    this.buildDayBar();
    this.buildSubTabs();
    this.buildActiveContent();
  }
}
