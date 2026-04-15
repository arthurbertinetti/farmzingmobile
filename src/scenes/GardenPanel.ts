// src/scenes/GardenPanel.ts
// Decorative garden 16x16 with 5 modes: place, move, delete, renovate, guide
import Phaser from 'phaser';
import { gameState, GardenCellState } from '../systems/GameState';
import { GARDEN_SIZE, GARDEN_CATS, GardenItemDef, findGardenItem, getGardenCellEmoji } from '../data/garden';
import { COLORS, UI } from '../utils/constants';
import { fmtN } from '../utils/helpers';
import { showFloatingText } from '../ui/FloatingText';
import { ScrollHelper } from '../ui/ScrollHelper';

const DRAG_THRESHOLD = 8;

type GardenMode = 'place' | 'move' | 'delete' | 'renovate' | 'guide';

const MODES: { id: GardenMode; label: string }[] = [
  { id: 'place', label: '\u2795 Placer' },
  { id: 'move', label: '\u2194\uFE0F Deplacer' },
  { id: 'delete', label: '\u{1F5D1}\uFE0F Supprimer' },
  { id: 'renovate', label: '\u{1F528} Renover' },
  { id: 'guide', label: '\u{1F4CB} Guide' },
];

export class GardenPanel {
  private scene: Phaser.Scene;
  private container!: Phaser.GameObjects.Container;
  private modeBarContainer!: Phaser.GameObjects.Container;
  private toolbarContainer!: Phaser.GameObjects.Container;
  private infoContainer!: Phaser.GameObjects.Container;
  private gridContainer!: Phaser.GameObjects.Container;
  private scrollContainer!: Phaser.GameObjects.Container;

  private activeMode: GardenMode = 'place';
  private selCat = 0;
  private selItem = -1;
  private moveSrc = -1;

  private contentHeight = 0;
  private scrollTopY = 0;
  private scroller!: ScrollHelper;

  private static readonly MODE_BAR_Y = UI.HUD_HEIGHT + 4;
  private static readonly MODE_BAR_H = 26;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    gameState.ensureGardenGrid();
    this.container = scene.add.container(0, 0);
    this.container.setDepth(10);
    this.container.setVisible(false);
    this.modeBarContainer = scene.add.container(0, 0);
    this.toolbarContainer = scene.add.container(0, 0);
    this.infoContainer = scene.add.container(0, 0);
    this.gridContainer = scene.add.container(0, 0);
    this.scrollContainer = scene.add.container(0, 0);
    this.container.add([this.modeBarContainer, this.toolbarContainer, this.infoContainer, this.gridContainer, this.scrollContainer]);
    this.scroller = new ScrollHelper(scene,
      (sy) => this.clampScroll(sy),
      (sy) => {
        const target = (this.activeMode === 'guide' || this.activeMode === 'renovate')
          ? this.scrollContainer : this.gridContainer;
        target.setY(this.scrollTopY + sy);
      },
    );
    this.buildAll();
    this.setupScroll();
  }

  private buildAll(): void {
    this.buildModeBar();
    this.buildToolbar();
    this.buildInfo();
    if (this.activeMode === 'guide') {
      this.gridContainer.removeAll(true);
      this.buildGuide();
    } else if (this.activeMode === 'renovate') {
      this.gridContainer.removeAll(true);
      this.buildRenovateList();
    } else {
      this.scrollContainer.removeAll(true);
      this.buildGrid();
    }
  }

  // ======================== MODE BAR ========================

  private buildModeBar(): void {
    this.modeBarContainer.removeAll(true);
    const { width } = this.scene.scale;
    const y = GardenPanel.MODE_BAR_Y;

    const barBg = this.scene.add.graphics();
    barBg.fillStyle(COLORS.sky, 1);
    barBg.fillRect(0, y, width, GardenPanel.MODE_BAR_H);
    this.modeBarContainer.add(barBg);

    const btnW = (width - 12) / MODES.length;
    const btnH = GardenPanel.MODE_BAR_H - 4;
    MODES.forEach((mode, i) => {
      const x = 6 + btnW * i + btnW / 2;
      const cy = y + GardenPanel.MODE_BAR_H / 2;
      const isActive = this.activeMode === mode.id;
      const bg = this.scene.add.graphics();
      bg.fillStyle(isActive ? 0xfff3e0 : 0xffffff, isActive ? 1 : 0.7);
      if (isActive) bg.lineStyle(2, 0xe67e22, 1);
      bg.fillRoundedRect(-btnW / 2 + 1, -btnH / 2, btnW - 2, btnH, 6);
      if (isActive) bg.strokeRoundedRect(-btnW / 2 + 1, -btnH / 2, btnW - 2, btnH, 6);
      const lbl = this.scene.add.text(0, 0, mode.label, {
        fontSize: '10px', fontFamily: 'Arial, sans-serif', color: '#333',
        fontStyle: isActive ? 'bold' : 'normal',
      }).setOrigin(0.5);
      const hit = this.scene.add.rectangle(0, 0, btnW - 2, btnH, 0, 0)
        .setInteractive({ useHandCursor: true })
        .on('pointerdown', () => {
          this.activeMode = mode.id;
          this.moveSrc = -1;
          this.buildAll();
        });
      const btn = this.scene.add.container(x, cy, [bg, lbl, hit]);
      this.modeBarContainer.add(btn);
    });
  }

  // ======================== TOOLBAR (categories + items, place mode only) ========================

  private get toolbarTop(): number { return GardenPanel.MODE_BAR_Y + GardenPanel.MODE_BAR_H + 2; }

  private buildToolbar(): void {
    this.toolbarContainer.removeAll(true);
    if (this.activeMode !== 'place') return;

    const { width } = this.scene.scale;
    let y = this.toolbarTop;

    // Category buttons
    const catBtnW = (width - 12) / GARDEN_CATS.length;
    const catBtnH = 22;
    GARDEN_CATS.forEach((cat, ci) => {
      const x = 6 + catBtnW * ci + catBtnW / 2;
      const isActive = this.selCat === ci;
      const bg = this.scene.add.graphics();
      bg.fillStyle(isActive ? 0xe8f5e9 : 0xffffff, isActive ? 1 : 0.75);
      if (isActive) bg.lineStyle(2, COLORS.green, 1);
      bg.fillRoundedRect(-catBtnW / 2 + 1, -catBtnH / 2, catBtnW - 2, catBtnH, 6);
      if (isActive) bg.strokeRoundedRect(-catBtnW / 2 + 1, -catBtnH / 2, catBtnW - 2, catBtnH, 6);
      const lbl = this.scene.add.text(0, 0, cat.name, {
        fontSize: '10px', fontFamily: 'Arial, sans-serif', color: '#333',
        fontStyle: isActive ? 'bold' : 'normal',
      }).setOrigin(0.5);
      const hit = this.scene.add.rectangle(0, 0, catBtnW - 2, catBtnH, 0, 0)
        .setInteractive({ useHandCursor: true })
        .on('pointerdown', () => {
          this.selCat = ci; this.selItem = -1;
          this.buildToolbar(); this.buildInfo();
        });
      const btn = this.scene.add.container(x, y + catBtnH / 2, [bg, lbl, hit]);
      this.toolbarContainer.add(btn);
    });
    y += catBtnH + 4;

    // Item buttons
    const items = GARDEN_CATS[this.selCat]?.items ?? [];
    const itemBtnW = 58; const itemBtnH = 52; const gap = 4;
    const perRow = Math.floor((width - 8) / (itemBtnW + gap));
    items.forEach((item, ii) => {
      const row = Math.floor(ii / perRow);
      const col = ii % perRow;
      const totalInRow = Math.min(perRow, items.length - row * perRow);
      const rowW = totalInRow * (itemBtnW + gap) - gap;
      const startX = (width - rowW) / 2;
      const x = startX + col * (itemBtnW + gap) + itemBtnW / 2;
      const iy = y + row * (itemBtnH + gap) + itemBtnH / 2;

      const isActive = this.selItem === ii;
      const bg = this.scene.add.graphics();
      bg.fillStyle(isActive ? 0xe8f5e9 : 0xffffff, 0.9);
      if (isActive) bg.lineStyle(2, COLORS.green, 1);
      bg.fillRoundedRect(-itemBtnW / 2, -itemBtnH / 2, itemBtnW, itemBtnH, 9);
      if (isActive) bg.strokeRoundedRect(-itemBtnW / 2, -itemBtnH / 2, itemBtnW, itemBtnH, 9);

      const emoji = this.scene.add.text(0, -10, item.emoji, { fontSize: '18px' }).setOrigin(0.5);
      const costStr = item.wood ? `${fmtN(item.cost)}+${item.wood}\u{1FAB5}` : fmtN(item.cost);
      const cost = this.scene.add.text(0, 10, costStr, {
        fontSize: '9px', fontFamily: 'Arial, sans-serif', color: '#888',
      }).setOrigin(0.5);
      const name = this.scene.add.text(0, 20, item.name, {
        fontSize: '8px', fontFamily: 'Arial, sans-serif', color: '#666',
      }).setOrigin(0.5);

      const hit = this.scene.add.rectangle(0, 0, itemBtnW, itemBtnH, 0, 0)
        .setInteractive({ useHandCursor: true })
        .on('pointerdown', () => {
          this.selItem = ii;
          this.buildToolbar(); this.buildInfo();
        });
      const btn = this.scene.add.container(x, iy, [bg, emoji, cost, name, hit]);
      this.toolbarContainer.add(btn);
    });
  }

  private getToolbarHeight(): number {
    if (this.activeMode !== 'place') return 0;
    const items = GARDEN_CATS[this.selCat]?.items ?? [];
    const { width } = this.scene.scale;
    const perRow = Math.floor((width - 8) / 62); // 58+4
    const rows = Math.ceil(items.length / perRow);
    return 22 + 4 + rows * 56 + 4;
  }

  // ======================== INFO LINE ========================

  private get infoY(): number { return this.toolbarTop + this.getToolbarHeight(); }

  private buildInfo(): void {
    this.infoContainer.removeAll(true);
    const { width } = this.scene.scale;
    const y = this.infoY;
    let text = '';

    if (this.activeMode === 'place') {
      if (this.selItem >= 0) {
        const item = GARDEN_CATS[this.selCat]?.items[this.selItem];
        if (item) {
          text = `${item.emoji} ${item.name} - ${fmtN(item.cost)}\u{1F4B0}`;
          if (item.wood) text += ` + ${item.wood}\u{1FAB5}`;
          if (item.rewardDesc) text += ` | ${item.rewardDesc}`;
        }
      } else {
        text = 'Selectionnez un element puis cliquez sur la grille';
      }
    } else if (this.activeMode === 'move') {
      text = this.moveSrc >= 0 ? 'Cliquez une case vide pour deplacer' : 'Cliquez un element pour le deplacer';
    } else if (this.activeMode === 'delete') {
      text = 'Cliquez un element pour le supprimer (remboursement 50%)';
    } else if (this.activeMode === 'renovate') {
      text = `\u2B50 Etoiles: ${gameState.data.stars} | Cout: 1\u2B50 par niveau, 2\u2B50 dernier`;
    }

    if (text) {
      const infoTxt = this.scene.add.text(width / 2, y + 8, text, {
        fontSize: '10px', fontFamily: 'Arial, sans-serif', color: '#666',
        wordWrap: { width: width - 20 },
      }).setOrigin(0.5, 0);
      this.infoContainer.add(infoTxt);
    }
  }

  private getInfoHeight(): number {
    return (this.activeMode === 'guide' || this.activeMode === 'renovate') ? 0 : 20;
  }

  // ======================== GRID ========================

  private get gridTop(): number { return this.infoY + this.getInfoHeight(); }

  private buildGrid(): void {
    this.gridContainer.removeAll(true);
    gameState.ensureGardenGrid();
    const { width, height } = this.scene.scale;
    const y = this.gridTop;

    // Calculate cell size
    const maxGridW = width * 0.95;
    const ps = Math.min(Math.floor((maxGridW - 16) / GARDEN_SIZE) - 1, 50);
    const gridW = GARDEN_SIZE * (ps + 1) - 1;
    const gridH = GARDEN_SIZE * (ps + 1) - 1;
    const gridX = (width - gridW) / 2;

    // Grid background (green garden look)
    const gridBg = this.scene.add.graphics();
    gridBg.fillStyle(0x4a9e44, 1);
    gridBg.fillRoundedRect(gridX - 6, 0, gridW + 12, gridH + 12, 14);
    // Lighter inner
    gridBg.fillStyle(0x6dbf67, 0.6);
    gridBg.fillRoundedRect(gridX - 3, 3, gridW + 6, gridH + 6, 10);
    this.gridContainer.add(gridBg);

    // Cells
    for (let r = 0; r < GARDEN_SIZE; r++) {
      for (let c = 0; c < GARDEN_SIZE; c++) {
        const idx = r * GARDEN_SIZE + c;
        const cx = gridX + c * (ps + 1) + ps / 2;
        const cy = 6 + r * (ps + 1) + ps / 2;
        const cell = gameState.data.gardenGrid[idx];

        const cellBg = this.scene.add.graphics();
        if (cell) {
          cellBg.fillStyle(0xffffff, 0.7);
          cellBg.fillRoundedRect(-ps / 2, -ps / 2, ps, ps, 3);
        } else {
          cellBg.fillStyle(0x8bc34a, 0.35);
          cellBg.fillRoundedRect(-ps / 2, -ps / 2, ps, ps, 3);
        }

        // Highlight move source
        if (this.activeMode === 'move' && this.moveSrc === idx) {
          cellBg.lineStyle(2, 0xe74c3c, 1);
          cellBg.strokeRoundedRect(-ps / 2, -ps / 2, ps, ps, 3);
        }

        const emojiTxt = this.scene.add.text(0, 0,
          cell ? getGardenCellEmoji(cell.id, cell.stateIdx) : '', {
            fontSize: `${Math.max(ps * 0.6, 10)}px`,
          }).setOrigin(0.5);

        const hit = this.scene.add.rectangle(0, 0, ps, ps, 0, 0)
          .setInteractive({ useHandCursor: true })
          .on('pointerup', () => {
            if (this.scroller.totalDragDistance >= DRAG_THRESHOLD) return;
            this.onCellClick(idx, cx + gridX, cy + y);
          });

        const group = this.scene.add.container(cx, cy, [cellBg, emojiTxt, hit]);
        this.gridContainer.add(group);
      }
    }

    this.gridContainer.setPosition(0, y + this.scroller.scrollY);
    this.scrollTopY = y;
    this.contentHeight = gridH + 20;

    // Mask
    const availH = height - y - UI.TAB_HEIGHT;
    const mask = this.scene.make.graphics({});
    mask.fillRect(0, y, width, availH);
    this.gridContainer.setMask(mask.createGeometryMask());
  }

  private onCellClick(idx: number, fx: number, fy: number): void {
    const cell = gameState.data.gardenGrid[idx];

    if (this.activeMode === 'place') {
      if (cell) { showFloatingText(this.scene, fx, fy, '\u274C Occupe', '#ff6666'); return; }
      if (this.selItem < 0) { showFloatingText(this.scene, fx, fy, 'Choisir un element', '#aaa'); return; }
      const cat = GARDEN_CATS[this.selCat];
      const item = cat?.items[this.selItem];
      if (!item) return;
      if (gameState.placeGardenItem(idx, item.id)) {
        showFloatingText(this.scene, fx, fy, `${item.emoji} -${fmtN(item.cost)}\u{1F4B0}`);
        gameState.emit(); this.buildGrid(); this.buildInfo();
      } else {
        showFloatingText(this.scene, fx, fy, '\u274C Pas assez!', '#ff6666');
      }
    } else if (this.activeMode === 'move') {
      if (this.moveSrc < 0) {
        if (!cell) return;
        this.moveSrc = idx;
        this.buildGrid();
      } else {
        if (cell) { this.moveSrc = -1; this.buildGrid(); return; }
        if (gameState.moveGardenItem(this.moveSrc, idx)) {
          showFloatingText(this.scene, fx, fy, '\u2194\uFE0F Deplace!');
          this.moveSrc = -1;
          gameState.emit(); this.buildGrid();
        }
      }
    } else if (this.activeMode === 'delete') {
      if (!cell) return;
      const refund = gameState.deleteGardenItem(idx);
      showFloatingText(this.scene, fx, fy, `\u{1F5D1}\uFE0F +${fmtN(refund)}\u{1F4B0}`);
      gameState.emit(); this.buildGrid();
    }
  }

  // ======================== RENOVATE LIST ========================

  private buildRenovateList(): void {
    this.scrollContainer.removeAll(true);
    gameState.ensureGardenGrid();
    const { width, height } = this.scene.scale;
    const topY = GardenPanel.MODE_BAR_Y + GardenPanel.MODE_BAR_H + 4;

    this.scrollContainer.setPosition(0, topY);
    this.scrollTopY = topY;
    this.scroller.reset();

    let y = 4;

    // Stars display
    const starsTxt = this.scene.add.text(width / 2, y + 8, `\u2B50 Etoiles: ${gameState.data.stars}`, {
      fontSize: '11px', fontFamily: 'Arial, sans-serif', color: '#5d4037', fontStyle: 'bold',
    }).setOrigin(0.5);
    this.scrollContainer.add(starsTxt);
    y += 24;

    // Find placed buildings with renovation states
    let foundAny = false;
    for (let i = 0; i < gameState.data.gardenGrid.length; i++) {
      const cell = gameState.data.gardenGrid[i];
      if (!cell) continue;
      const item = findGardenItem(cell.id);
      if (!item?.states) continue;
      foundAny = true;

      const maxR = item.states.length - 1;
      const curR = cell.stateIdx ?? 0;
      const isMax = curR >= maxR;
      const h = 60;

      const bg = this.scene.add.graphics();
      bg.fillStyle(isMax ? 0xe8f5e9 : 0xffffff, 0.9);
      bg.fillRoundedRect(8, y, width - 16, h, 10);
      this.scrollContainer.add(bg);

      // Current emoji + name + state
      const emojiTxt = this.scene.add.text(18, y + h / 2, getGardenCellEmoji(cell.id, cell.stateIdx), {
        fontSize: '20px',
      }).setOrigin(0, 0.5);
      const nameTxt = this.scene.add.text(46, y + 14, `${item.name} (${curR}/${maxR})`, {
        fontSize: '11px', fontFamily: 'Arial, sans-serif', color: '#333', fontStyle: 'bold',
      });
      this.scrollContainer.add([emojiTxt, nameTxt]);

      if (isMax) {
        const doneTxt = this.scene.add.text(46, y + 34, `\u2705 Max | ${item.rewardDesc ?? ''}`, {
          fontSize: '10px', fontFamily: 'Arial, sans-serif', color: '#27ae60', fontStyle: 'bold',
        });
        this.scrollContainer.add(doneTxt);
      } else {
        const starCost = (curR === maxR - 1) ? 2 : 1;
        const remaining = maxR - curR;
        const can = gameState.data.stars >= starCost;
        const infoStr = `${remaining} restant(s) \u00B7 ${starCost}\u2B50`;
        const infoTxt = this.scene.add.text(46, y + 34, infoStr, {
          fontSize: '10px', fontFamily: 'Arial, sans-serif', color: '#666',
        });
        this.scrollContainer.add(infoTxt);

        // Renovate button
        const rBtnW = 60; const rBtnH = 20;
        const rBtnX = width - 22 - rBtnW; const rBtnY = y + (h - rBtnH) / 2;
        const rBg = this.scene.add.graphics();
        rBg.fillStyle(can ? 0xff9800 : 0x999999, 1);
        rBg.fillRoundedRect(rBtnX, rBtnY, rBtnW, rBtnH, 7);
        const rTxt = this.scene.add.text(rBtnX + rBtnW / 2, rBtnY + rBtnH / 2,
          `\u{1F528} ${starCost}\u2B50`, {
            fontSize: '11px', fontFamily: 'Arial, sans-serif', color: '#fff', fontStyle: 'bold',
          }).setOrigin(0.5);
        this.scrollContainer.add([rBg, rTxt]);

        if (can) {
          const rHit = this.scene.add.rectangle(rBtnX + rBtnW / 2, rBtnY + rBtnH / 2, rBtnW, rBtnH, 0, 0)
            .setInteractive({ useHandCursor: true })
            .on('pointerup', () => {
              if (this.scroller.totalDragDistance >= DRAG_THRESHOLD) return;
              if (gameState.renovateGardenItem(i)) {
                showFloatingText(this.scene, rBtnX + rBtnW / 2, topY + rBtnY, `\u{1F528} -${starCost}\u2B50`);
                gameState.emit(); this.buildAll();
              }
            });
          this.scrollContainer.add(rHit);
        }
      }

      y += h + 6;
    }

    if (!foundAny) {
      const emptyTxt = this.scene.add.text(width / 2, y + 20, 'Aucun batiment place.\nPlacez des batiments en mode "Placer"!', {
        fontSize: '11px', fontFamily: 'Arial, sans-serif', color: '#999',
        align: 'center', wordWrap: { width: width - 40 },
      }).setOrigin(0.5, 0);
      this.scrollContainer.add(emptyTxt);
      y += 60;
    }

    this.contentHeight = y + 20;

    // Mask
    const availH = height - topY - UI.TAB_HEIGHT;
    const mask = this.scene.make.graphics({});
    mask.fillRect(0, topY, width, availH);
    this.scrollContainer.setMask(mask.createGeometryMask());
  }

  // ======================== GUIDE ========================

  private buildGuide(): void {
    this.scrollContainer.removeAll(true);
    const { width, height } = this.scene.scale;
    const topY = GardenPanel.MODE_BAR_Y + GardenPanel.MODE_BAR_H + 4;

    this.scrollContainer.setPosition(0, topY);
    this.scrollTopY = topY;
    this.scroller.reset();

    let y = 4;

    const titleTxt = this.scene.add.text(width / 2, y + 8, '\u{1F4CB} Guide des batiments', {
      fontSize: '12px', fontFamily: 'Arial, sans-serif', color: '#5d4037', fontStyle: 'bold',
    }).setOrigin(0.5);
    this.scrollContainer.add(titleTxt);
    y += 24;

    const descTxt = this.scene.add.text(width / 2, y + 6,
      'Les batiments entierement renoves produisent des recompenses mensuelles.', {
        fontSize: '10px', fontFamily: 'Arial, sans-serif', color: '#888',
        wordWrap: { width: width - 20 }, align: 'center',
      }).setOrigin(0.5, 0);
    this.scrollContainer.add(descTxt);
    y += 24;

    // List all buildings from category 0
    const buildings = GARDEN_CATS[0]?.items ?? [];
    for (const bld of buildings) {
      const h = 56;
      const bg = this.scene.add.graphics();
      bg.fillStyle(0xffffff, 0.9);
      bg.fillRoundedRect(8, y, width - 16, h, 10);
      this.scrollContainer.add(bg);

      const emojiTxt = this.scene.add.text(18, y + 12, bld.emoji, { fontSize: '20px' }).setOrigin(0, 0);
      const nameTxt = this.scene.add.text(46, y + 10, bld.name, {
        fontSize: '11px', fontFamily: 'Arial, sans-serif', color: '#333', fontStyle: 'bold',
      });
      const costStr = `${fmtN(bld.cost)}\u{1F4B0}` + (bld.wood ? ` + ${bld.wood}\u{1FAB5}` : '');
      const renoCount = bld.states ? bld.states.length - 1 : 0;
      const totalStars = renoCount > 0 ? renoCount - 1 + 2 : 0; // last costs 2, rest cost 1 each
      const infoStr = `${costStr} | ${renoCount} renovations (${totalStars}\u2B50)`;
      const infoTxt = this.scene.add.text(46, y + 26, infoStr, {
        fontSize: '10px', fontFamily: 'Arial, sans-serif', color: '#666',
      });
      const rwTxt = this.scene.add.text(46, y + 40, `\u{1F3C6} ${bld.rewardDesc ?? 'Aucune'}`, {
        fontSize: '10px', fontFamily: 'Arial, sans-serif', color: '#5d4037', fontStyle: 'bold',
      });
      this.scrollContainer.add([emojiTxt, nameTxt, infoTxt, rwTxt]);

      y += h + 6;
    }

    this.contentHeight = y + 20;

    // Mask
    const availH = height - topY - UI.TAB_HEIGHT;
    const mask = this.scene.make.graphics({});
    mask.fillRect(0, topY, width, availH);
    this.scrollContainer.setMask(mask.createGeometryMask());
  }

  // ======================== SCROLL ========================

  private setupScroll(): void {
    this.scene.input.on('pointerdown', (p: Phaser.Input.Pointer) => {
      if (!this.container.visible) return;
      const topY = this.scrollTopY || this.gridTop;
      const height = this.scene.scale.height;
      if (p.y > topY && p.y < height - UI.TAB_HEIGHT) {
        this.scroller.onDragStart(p.y);
      }
    });
    this.scene.input.on('pointermove', (p: Phaser.Input.Pointer) => {
      if (!this.container.visible) return;
      this.scroller.onDragMove(p.y);
    });
    this.scene.input.on('pointerup', () => { this.scroller.onDragEnd(); });
  }

  private clampScroll(sy: number): number {
    const { height } = this.scene.scale;
    const viewH = height - this.scrollTopY - UI.TAB_HEIGHT;
    const minS = Math.min(0, viewH - this.contentHeight - 20);
    return Math.max(minS, Math.min(0, sy));
  }

  // ======================== PUBLIC API ========================

  setVisible(v: boolean): void { this.container.setVisible(v); }

  refresh(): void {
    this.buildAll();
  }
}
