// src/scenes/AtelierPanel.ts
// Ateliers panel with 2 sub-tabs: Ateliers, Ouvriers
// Ateliers sub-tab has 4 modes: Normal, Construire, Supprimer, Réorganiser
import Phaser from 'phaser';
import { gameState } from '../systems/GameState';
import { ATELIERS, ATELIER_COLS, getAllOutputRecipes } from '../data/ateliers';
import { RESOURCE_INFO } from '../data/resources';
import {
  COLORS, UI,
  OUVRIER_MAX, OUVRIER_MAX_LVL, OUVRIER_PROD_MS,
} from '../utils/constants';
import { fmtN } from '../utils/helpers';
import { showFloatingText, showLevelUpBanner } from '../ui/FloatingText';
import { createAutoButton, updateAutoButton } from '../ui/AutoButton';
import { buildSubTabBar } from '../ui/SubTabBar';
import { ScrollHelper } from '../ui/ScrollHelper';

const DRAG_THRESHOLD = 8;
type AtelierSub = 'ateliers' | 'ouvriers' | 'aide';
type BMode = 'normal' | 'add' | 'delete' | 'move';

export class AtelierPanel {
  private scene: Phaser.Scene;
  private container!: Phaser.GameObjects.Container;
  private activeSub: AtelierSub = 'ateliers';

  // shared
  private titleContainer!: Phaser.GameObjects.Container;
  private subTabContainer!: Phaser.GameObjects.Container;
  private contentContainer!: Phaser.GameObjects.Container;

  // ateliers sub
  private autoBarContainer!: Phaser.GameObjects.Container;
  private modeBarContainer!: Phaser.GameObjects.Container;
  private catalogueContainer!: Phaser.GameObjects.Container;
  private gridContainer!: Phaser.GameObjects.Container;
  private recipeContainer!: Phaser.GameObjects.Container;
  private slotGraphics: Phaser.GameObjects.Container[] = [];
  private selectedSlot = -1;
  private autoAtelierBtn!: Phaser.GameObjects.Container;

  // mode state
  private bMode: BMode = 'normal';
  private moveSrc = -1;  // move mode: index of source slot
  private selBuilding = 0; // add mode: which building to place from catalogue

  // catalogue horizontal scroll
  private catScrollX = 0;
  private catDragging = false;
  private catDragStartX = 0;
  private catDragStartScrollX = 0;
  private catContentW = 0;
  private catInnerContainer: Phaser.GameObjects.Container | null = null;

  // ouvriers sub
  private ouvrierScrollContainer!: Phaser.GameObjects.Container;
  private ouvrierContentHeight = 0;

  // aide sub
  private aideScrollContainer!: Phaser.GameObjects.Container;
  private aideContentHeight = 0;
  private atAideSub: 'recettes' | 'ouvriers' = 'recettes';

  // scroll
  private scrollTarget: Phaser.GameObjects.Container | null = null;
  private scrollTopY = 0;
  private scroller!: ScrollHelper;

  private static readonly AUTO_BAR_H = 30;
  private static readonly MODE_BAR_H = 30;
  private static readonly MODE_INFO_H = 18;
  private static readonly CATALOGUE_H = 68;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    this.container = scene.add.container(0, 0);
    this.container.setDepth(10);
    this.titleContainer = scene.add.container(0, 0);
    this.subTabContainer = scene.add.container(0, 0);
    this.contentContainer = scene.add.container(0, 0);
    this.container.add([this.titleContainer, this.subTabContainer, this.contentContainer]);
    this.autoBarContainer = scene.add.container(0, 0);
    this.modeBarContainer = scene.add.container(0, 0);
    this.catalogueContainer = scene.add.container(0, 0);
    this.gridContainer = scene.add.container(0, 0);
    this.recipeContainer = scene.add.container(0, 0);
    this.ouvrierScrollContainer = scene.add.container(0, 0);
    this.scroller = new ScrollHelper(scene,
      (sy) => this.clampScroll(sy),
      (sy) => {
        if (this.scrollTarget) this.scrollTarget.setPosition(0, this.scrollTopY + sy);
      },
    );
    this.buildTitle();
    this.buildSubTabs();
    this.buildActiveContent();
    this.setupScroll();
  }

  private get subTabBottom(): number { return UI.HUD_HEIGHT + 30 + 32 + 2; }

  private buildTitle(): void {
    this.titleContainer.removeAll(true);
    const { width } = this.scene.scale;
    const bg = this.scene.add.graphics();
    bg.fillStyle(COLORS.sky, 1);
    bg.fillRect(0, UI.HUD_HEIGHT, width, 30);
    const title = this.scene.add.text(width / 2, UI.HUD_HEIGHT + 15, '\u{1F3ED} Ateliers', {
      fontSize: '16px', fontFamily: 'Arial, sans-serif', color: '#4e342e', fontStyle: 'bold',
    }).setOrigin(0.5);
    this.titleContainer.add([bg, title]);
  }

  private buildSubTabs(): void {
    this.subTabContainer.removeAll(true);
    buildSubTabBar(this.scene, this.subTabContainer,
      [
        { id: 'ateliers', label: '\u{1F3ED} Ateliers' },
        { id: 'ouvriers', label: '\u{1F477} Ouvriers' },
        { id: 'aide', label: '\u{1F4D6} Aide' },
      ],
      this.activeSub,
      UI.HUD_HEIGHT + 30,
      (id) => { this.activeSub = id as AtelierSub; this.buildSubTabs(); this.buildActiveContent(); },
    );
  }

  private buildActiveContent(): void {
    this.contentContainer.removeAll(true);
    this.scroller.reset();
    if (this.activeSub === 'ateliers') this.buildAteliersContent();
    else if (this.activeSub === 'ouvriers') this.buildOuvriersContent();
    else this.buildAideContent();
  }

  // ====================================================================
  // ===                    ATELIERS SUB-TAB                          ===
  // ====================================================================
  private buildAteliersContent(): void {
    this.autoBarContainer = this.scene.add.container(0, 0);
    this.modeBarContainer = this.scene.add.container(0, 0);
    this.catalogueContainer = this.scene.add.container(0, 0);
    this.gridContainer = this.scene.add.container(0, 0);
    this.recipeContainer = this.scene.add.container(0, 0);
    this.contentContainer.add([this.autoBarContainer, this.modeBarContainer, this.catalogueContainer, this.gridContainer, this.recipeContainer]);
    this.buildAutoBar();
    this.buildModeBar();
    this.buildCatalogue();
    this.buildGrid();
  }

  // --- Auto bar ---
  private buildAutoBar(): void {
    this.autoBarContainer.removeAll(true);
    const { width } = this.scene.scale;
    const has = gameState.getUpgrade('autoatelier') > 0;
    if (!has) return;
    const y = this.subTabBottom;
    const barBg = this.scene.add.graphics();
    barBg.fillStyle(COLORS.sky, 1);
    barBg.fillRect(0, y, width, AtelierPanel.AUTO_BAR_H);
    this.autoBarContainer.add(barBg);
    const btnW = width - 24; const btnH = AtelierPanel.AUTO_BAR_H - 6;
    this.autoAtelierBtn = createAutoButton(this.scene, this.autoBarContainer, width / 2, y + AtelierPanel.AUTO_BAR_H / 2, btnW, btnH,
      { upgId: 'autoatelier', icon: '\u{1F3ED}', labelReady: 'Atelier', endKey: 'autoAtelierEnd', resetKey: 'aaResets' },
      () => this.refresh());
    updateAutoButton(this.autoAtelierBtn);
  }

  private getAutoBarHeight(): number {
    return gameState.getUpgrade('autoatelier') > 0 ? AtelierPanel.AUTO_BAR_H : 0;
  }

  // --- Mode bar ---
  private get modeBarY(): number { return this.subTabBottom + this.getAutoBarHeight(); }

  private buildModeBar(): void {
    this.modeBarContainer.removeAll(true);
    const { width } = this.scene.scale;
    const y = this.modeBarY;
    const btnRowH = AtelierPanel.MODE_BAR_H;

    // Background for buttons row
    const bg = this.scene.add.graphics();
    bg.fillStyle(0xf5f0eb, 1);
    bg.fillRect(0, y, width, btnRowH + AtelierPanel.MODE_INFO_H);
    this.modeBarContainer.add(bg);

    const modes: { id: BMode; label: string }[] = [
      { id: 'normal', label: '\u{1F3D7}\uFE0F Normal' },
      { id: 'add', label: '\u2795 Construire' },
      { id: 'delete', label: '\u{1F5D1}\uFE0F Supprimer' },
      { id: 'move', label: '\u2194\uFE0F Reorganiser' },
    ];

    const btnGap = 3;
    const btnW = Math.floor((width - 8 - btnGap * (modes.length - 1)) / modes.length);
    const btnH = btnRowH - 6;
    for (let i = 0; i < modes.length; i++) {
      const m = modes[i];
      const bx = 4 + i * (btnW + btnGap);
      const by = y + 3;
      const active = this.bMode === m.id;

      const btnBg = this.scene.add.graphics();
      if (active) {
        btnBg.fillStyle(0xfff3e0, 1);
        btnBg.lineStyle(2, 0xe67e22, 1);
        btnBg.fillRoundedRect(bx, by, btnW, btnH, 6);
        btnBg.strokeRoundedRect(bx, by, btnW, btnH, 6);
      } else {
        btnBg.fillStyle(0xffffff, 0.7);
        btnBg.fillRoundedRect(bx, by, btnW, btnH, 6);
      }
      this.modeBarContainer.add(btnBg);

      const txt = this.scene.add.text(bx + btnW / 2, by + btnH / 2, m.label, {
        fontSize: '10px', fontFamily: 'Arial, sans-serif',
        color: active ? '#e67e22' : '#555',
        fontStyle: 'bold',
      }).setOrigin(0.5);
      this.modeBarContainer.add(txt);

      const hit = this.scene.add.rectangle(bx + btnW / 2, by + btnH / 2, btnW, btnH, 0, 0)
        .setInteractive({ useHandCursor: true })
        .on('pointerup', () => {
          if (this.bMode !== m.id) {
            this.bMode = m.id;
            this.moveSrc = -1;
            this.selectedSlot = -1;
            this.buildModeBar();
            this.buildCatalogue();
            this.buildGrid();
          }
        });
      this.modeBarContainer.add(hit);
    }

    // Info text row below buttons
    let infoStr = '';
    if (this.bMode === 'delete') infoStr = 'Touche un atelier pour le supprimer (pas de remboursement)';
    else if (this.bMode === 'move') infoStr = this.moveSrc >= 0 ? 'Touche un autre atelier ou case vide pour echanger' : 'Touche un atelier a deplacer';
    else if (this.bMode === 'add') infoStr = 'Choisis un atelier ci-dessous puis touche une case vide';

    if (infoStr) {
      const infoTxt = this.scene.add.text(width / 2, y + btnRowH + AtelierPanel.MODE_INFO_H / 2, infoStr, {
        fontSize: '10px', fontFamily: 'Arial, sans-serif', color: '#888',
      }).setOrigin(0.5);
      this.modeBarContainer.add(infoTxt);
    }
  }

  // --- Catalogue bar (only in add mode) ---
  private get catalogueY(): number { return this.modeBarY + AtelierPanel.MODE_BAR_H + AtelierPanel.MODE_INFO_H; }

  private buildCatalogue(): void {
    this.catalogueContainer.removeAll(true);
    this.catInnerContainer = null;
    if (this.bMode !== 'add') return;

    const { width } = this.scene.scale;
    const y = this.catalogueY;
    const h = AtelierPanel.CATALOGUE_H;

    const bg = this.scene.add.graphics();
    bg.fillStyle(0xefebe9, 1);
    bg.fillRect(0, y, width, h);
    this.catalogueContainer.add(bg);

    // Count how many of each building we've already placed
    const bCount: Record<number, number> = {};
    for (const s of gameState.data.atelierSlots) {
      if (s.atelierIdx >= 0) bCount[s.atelierIdx] = (bCount[s.atelierIdx] || 0) + 1;
    }

    // Inner container for horizontal scrolling
    const inner = this.scene.add.container(0, 0);
    this.catalogueContainer.add(inner);
    this.catInnerContainer = inner;

    const btnW = 76;
    const btnH = h - 10;
    const gap = 4;
    let bx = 6;

    for (let i = 0; i < ATELIERS.length; i++) {
      const atelier = ATELIERS[i];
      const ok = atelier.reqLevel <= gameState.data.level;
      const cnt = bCount[i] || 0;
      const active = this.selBuilding === i;

      const btnBg = this.scene.add.graphics();
      if (active && ok) {
        btnBg.fillStyle(0xfff3e0, 1);
        btnBg.lineStyle(2, 0xe67e22, 1);
        btnBg.fillRoundedRect(bx, y + 5, btnW, btnH, 6);
        btnBg.strokeRoundedRect(bx, y + 5, btnW, btnH, 6);
      } else {
        btnBg.fillStyle(ok ? 0xffffff : 0xcccccc, ok ? 0.9 : 0.5);
        btnBg.fillRoundedRect(bx, y + 5, btnW, btnH, 6);
      }
      inner.add(btnBg);

      // Emoji
      const emojiTxt = this.scene.add.text(bx + btnW / 2, y + 18, atelier.emoji, {
        fontSize: '18px',
      }).setOrigin(0.5);
      inner.add(emojiTxt);

      // Name or locked
      const nameStr = ok ? atelier.name : `\u{1F512} Niv.${atelier.reqLevel}`;
      const nameTxt = this.scene.add.text(bx + btnW / 2, y + 34, nameStr, {
        fontSize: '9px', fontFamily: 'Arial, sans-serif',
        color: ok ? '#333' : '#999', fontStyle: 'bold',
        wordWrap: { width: btnW - 6 },
        align: 'center',
      }).setOrigin(0.5, 0);
      inner.add(nameTxt);

      // Cost + count
      if (ok) {
        const costStr = `${fmtN(atelier.cost)}\u{1F4B0}` + (cnt > 0 ? ` (\u00D7${cnt})` : '');
        const costTxt = this.scene.add.text(bx + btnW / 2, y + h - 10, costStr, {
          fontSize: '8px', fontFamily: 'Arial, sans-serif', color: '#888',
        }).setOrigin(0.5, 1);
        inner.add(costTxt);
      }

      if (ok) {
        const hit = this.scene.add.rectangle(bx + btnW / 2, y + 5 + btnH / 2, btnW, btnH, 0, 0)
          .setInteractive({ useHandCursor: true })
          .on('pointerup', (ptr: Phaser.Input.Pointer) => {
            if (Math.abs(ptr.x - this.catDragStartX) > DRAG_THRESHOLD) return;
            this.selBuilding = i;
            this.buildCatalogue();
          });
        inner.add(hit);
      }

      bx += btnW + gap;
    }

    this.catContentW = bx;
    // Apply current scroll position
    inner.x = -this.catScrollX;

    // Mask to clip overflow
    const maskG = this.scene.make.graphics({});
    maskG.fillRect(0, y, width, h);
    inner.setMask(maskG.createGeometryMask());
  }

  private getCatalogueHeight(): number {
    return this.bMode === 'add' ? AtelierPanel.CATALOGUE_H : 0;
  }

  // --- Grid ---
  private get gridTopY(): number {
    return this.modeBarY + AtelierPanel.MODE_BAR_H + AtelierPanel.MODE_INFO_H + this.getCatalogueHeight();
  }

  private buildGrid(): void {
    this.gridContainer.removeAll(true);
    this.recipeContainer.removeAll(true);
    this.slotGraphics = [];
    const { width, height } = this.scene.scale;
    const topY = this.gridTopY;
    const cols = ATELIER_COLS;

    // In add mode: show all plots (locked + empty + built)
    // In normal/delete/move: show only built ateliers
    let slotIndices: number[] = [];
    if (this.bMode === 'add') {
      const bUnlocked = gameState.data.bgridBought + 3;
      const totalSlots = Math.min(bUnlocked + cols, 60);
      for (let i = 0; i < totalSlots; i++) slotIndices.push(i);
    } else {
      for (let i = 0; i < gameState.data.atelierSlots.length; i++) {
        const s = gameState.data.atelierSlots[i];
        if (!s.locked && s.atelierIdx >= 0) slotIndices.push(i);
      }
    }

    if (slotIndices.length === 0 && this.bMode !== 'add') {
      // No built ateliers
      const msg = this.scene.add.text(width / 2, topY + 30,
        'Aucun atelier construit.\nUtilise \u2795 Construire pour en ajouter!', {
          fontSize: '12px', fontFamily: 'Arial, sans-serif', color: '#888',
          align: 'center',
          wordWrap: { width: width - 40 },
        }).setOrigin(0.5, 0);
      this.gridContainer.add(msg);
      this.gridContainer.setPosition(0, 0);
      return;
    }

    const effectiveCols = this.bMode === 'add' ? cols : Math.min(cols, slotIndices.length);
    const rows = Math.ceil(slotIndices.length / effectiveCols);
    const pad = 6; const gap = 3;
    const ps = Math.min(Math.floor((width - pad * 2 - gap * (effectiveCols - 1)) / effectiveCols), 56);
    const gridW = effectiveCols * ps + (effectiveCols - 1) * gap;
    const gridX = (width - gridW) / 2;
    const gridH = rows * ps + (rows - 1) * gap + pad * 2;

    const gridBg = this.scene.add.graphics();
    gridBg.fillStyle(COLORS.atelierBg, 0.3);
    gridBg.fillRoundedRect(gridX - pad, 0, gridW + pad * 2, gridH, 10);
    this.gridContainer.add(gridBg);
    this.gridContainer.setPosition(0, topY);

    this.scrollTopY = topY;
    this.scrollTarget = this.gridContainer;

    for (let j = 0; j < slotIndices.length; j++) {
      const idx = slotIndices[j];
      const r = Math.floor(j / effectiveCols);
      const c = j % effectiveCols;
      const x = gridX + c * (ps + gap) + ps / 2;
      const y = pad + r * (ps + gap) + ps / 2;
      const bg = this.scene.add.graphics();
      const emojiText = this.scene.add.text(0, -4, '', { fontSize: `${Math.floor(ps * 0.35)}px` }).setOrigin(0.5);
      const subText = this.scene.add.text(0, ps / 2 - 8, '', {
        fontSize: '11px', fontFamily: 'Arial, sans-serif', color: '#fff', padding: { x: 2, y: 1 },
      }).setOrigin(0.5);
      const hit = this.scene.add.rectangle(0, 0, ps, ps, 0, 0)
        .setInteractive({ useHandCursor: true })
        .on('pointerdown', () => {
          this.scene.tweens.add({ targets: group, scaleX: 0.93, scaleY: 0.93, duration: 60, yoyo: true, ease: 'Power1' });
        })
        .on('pointerup', () => { if (this.scroller.totalDragDistance < DRAG_THRESHOLD) this.onSlotClick(idx, x, y + topY); });
      const group = this.scene.add.container(x, y, [bg, emojiText, subText, hit]);
      group.setData('idx', idx); group.setData('plotSize', ps);
      this.slotGraphics.push(group);
      this.gridContainer.add(group);
    }

    this.updateAtelierVisuals();
    const recipeY = topY + gridH + 4;
    if (this.bMode === 'normal') {
      this.buildRecipePanel(recipeY);
    }
  }

  // --- Recipe panel (only in normal mode) ---
  private buildRecipePanel(topY: number): void {
    this.recipeContainer.removeAll(true);
    const { width, height } = this.scene.scale;
    if (this.selectedSlot < 0) return;
    const slot = gameState.data.atelierSlots[this.selectedSlot];
    if (!slot || slot.locked || slot.atelierIdx < 0) return;

    if (slot.craftRecipeIdx >= 0) {
      const atelier = ATELIERS[slot.atelierIdx];
      const recipe = atelier?.recipes[slot.craftRecipeIdx];
      if (recipe) {
        const elapsed = Date.now() - slot.craftStart; const done = elapsed >= slot.craftDuration;
        const bg = this.scene.add.graphics();
        bg.fillStyle(0xffffff, 0.9); bg.fillRoundedRect(10, topY, width - 20, 60, 9);
        const label = this.scene.add.text(width / 2, topY + 15, `\u{1F528} ${recipe.name} x${slot.craftQty}`, {
          fontSize: '13px', fontFamily: 'Arial, sans-serif', color: '#333', fontStyle: 'bold',
        }).setOrigin(0.5);
        const statusStr = done ? '\u2705 Pret! Cliquer pour collecter' : `\u23F3 ${Math.ceil((slot.craftDuration - elapsed) / 1000)}s`;
        const status = this.scene.add.text(width / 2, topY + 40, statusStr, {
          fontSize: '11px', fontFamily: 'Arial, sans-serif', color: done ? '#4caf50' : '#666',
        }).setOrigin(0.5);
        this.recipeContainer.add([bg, label, status]);
      }
      return;
    }

    const atelier = ATELIERS[slot.atelierIdx]; if (!atelier) return;
    let y = topY;
    const hdr = this.scene.add.text(width / 2, y + 10, `${atelier.emoji} ${atelier.name} - Recettes`, {
      fontSize: '12px', fontFamily: 'Arial, sans-serif', color: '#4e342e', fontStyle: 'bold',
    }).setOrigin(0.5);
    this.recipeContainer.add(hdr); y += 24;

    atelier.recipes.forEach((recipe, ri) => {
      const canCraft = gameState.hasResources(recipe.inputs);
      const itemH = 58;
      // Add bg FIRST so it's behind everything
      const bg = this.scene.add.graphics();
      bg.fillStyle(0xffffff, canCraft ? 0.9 : 0.4);
      bg.fillRoundedRect(10, y, width - 20, itemH, 9);
      this.recipeContainer.add(bg);

      const nameTxt = this.scene.add.text(18, y + 10, `${recipe.emoji} ${recipe.name}`, {
        fontSize: '12px', fontFamily: 'Arial, sans-serif', color: '#333', fontStyle: 'bold',
      });
      this.recipeContainer.add(nameTxt);

      // Ingredients - show owned qty, red if insufficient
      const ingY = y + 26;
      let ingX = 18;
      Object.entries(recipe.inputs).forEach(([k, q]) => {
        const info = RESOURCE_INFO[k]; const have = gameState.getResource(k);
        const enough = have >= q;
        const label = `${q}\u00D7${info?.emoji ?? k}(${have})`;
        const txt = this.scene.add.text(ingX, ingY, label, {
          fontSize: '11px', fontFamily: 'Arial, sans-serif',
          color: enough ? '#555' : '#e74c3c',
          fontStyle: enough ? 'normal' : 'bold',
        });
        this.recipeContainer.add(txt);
        ingX += txt.width + 8;
      });

      const outStr = recipe.output ? `\u2192 ${RESOURCE_INFO[recipe.output]?.emoji ?? ''} | \u23F1${recipe.time}s` : `\u2192 ${fmtN(recipe.sell)}\u{1F4B0} | \u23F1${recipe.time}s`;
      const outTxt = this.scene.add.text(18, y + 42, outStr, { fontSize: '11px', fontFamily: 'Arial, sans-serif', color: '#888' });
      this.recipeContainer.add(outTxt);

      const btnW = 56; const btnH = 26; const btnX = width - 14 - btnW; const btnY = y + (itemH - btnH) / 2;
      const btnBg = this.scene.add.graphics();
      btnBg.fillStyle(canCraft ? COLORS.green : 0x999999, 1);
      btnBg.fillRoundedRect(btnX, btnY, btnW, btnH, 7);
      const btnTxt = this.scene.add.text(btnX + btnW / 2, btnY + btnH / 2, '\u{1F528}', {
        fontSize: '13px', fontFamily: 'Arial, sans-serif', color: '#fff',
      }).setOrigin(0.5);
      this.recipeContainer.add([btnBg, btnTxt]);

      if (canCraft) {
        const hit = this.scene.add.rectangle(btnX + btnW / 2, btnY + btnH / 2, btnW, btnH, 0, 0)
          .setInteractive({ useHandCursor: true })
          .on('pointerdown', () => {
            if (gameState.startCraft(this.selectedSlot, ri, 1)) {
              showFloatingText(this.scene, width / 2, y + 20, `\u{1F528} ${recipe.name}`);
              gameState.emit(); this.refresh();
            }
          });
        this.recipeContainer.add(hit);
      }
      y += itemH + 4;
    });

    const maskG = this.scene.make.graphics({});
    maskG.fillRect(0, topY, width, height - topY - UI.TAB_HEIGHT);
    this.recipeContainer.setMask(maskG.createGeometryMask());
  }

  // --- Slot click handler (depends on mode) ---
  private onSlotClick(idx: number, fx: number, fy: number): void {
    if (idx >= gameState.data.atelierSlots.length) return;
    const slot = gameState.data.atelierSlots[idx];

    // ===== DELETE MODE =====
    if (this.bMode === 'delete') {
      if (slot.locked || slot.atelierIdx < 0) return;
      const atelier = ATELIERS[slot.atelierIdx];
      // In Phaser we can't use confirm(), just do it directly with a floating text warning
      // Reset the slot
      slot.atelierIdx = -1; slot.craftRecipeIdx = -1; slot.craftStart = 0; slot.craftQty = 1;
      this.selectedSlot = -1;
      showFloatingText(this.scene, fx, fy, `\u{1F5D1}\uFE0F ${atelier.name} supprime`);
      this.buildGrid(); gameState.emit();
      return;
    }

    // ===== MOVE MODE =====
    if (this.bMode === 'move') {
      if (slot.locked) return;
      if (this.moveSrc < 0) {
        // Select source
        if (slot.atelierIdx < 0) return; // nothing to move from empty
        this.moveSrc = idx;
        this.updateAtelierVisuals();
        this.buildModeBar();
        return;
      }
      // Swap source and target
      const src = gameState.data.atelierSlots[this.moveSrc];
      const tmp = { atelierIdx: slot.atelierIdx, craftRecipeIdx: slot.craftRecipeIdx, craftStart: slot.craftStart, craftQty: slot.craftQty, craftDuration: slot.craftDuration };
      slot.atelierIdx = src.atelierIdx; slot.craftRecipeIdx = src.craftRecipeIdx; slot.craftStart = src.craftStart; slot.craftQty = src.craftQty; slot.craftDuration = src.craftDuration;
      src.atelierIdx = tmp.atelierIdx; src.craftRecipeIdx = tmp.craftRecipeIdx; src.craftStart = tmp.craftStart; src.craftQty = tmp.craftQty; src.craftDuration = tmp.craftDuration;
      this.moveSrc = -1;
      this.selectedSlot = -1;
      showFloatingText(this.scene, fx, fy, '\u2194\uFE0F Echange');
      this.buildGrid(); this.buildModeBar(); gameState.emit();
      return;
    }

    // ===== ADD MODE =====
    if (this.bMode === 'add') {
      if (slot.locked) {
        // Buy to unlock
        const cost = gameState.getBuildingCellCost();
        if (gameState.data.coins >= cost) {
          gameState.data.coins -= cost; slot.locked = false; gameState.data.bgridBought++;
          showFloatingText(this.scene, fx, fy, `\u{1F513} -${fmtN(cost)}`);
          this.buildGrid(); gameState.emit();
        } else {
          showFloatingText(this.scene, fx, fy, `\u274C ${fmtN(cost)}\u{1F4B0}`, '#ff6666');
        }
        return;
      }
      if (slot.atelierIdx >= 0) {
        showFloatingText(this.scene, fx, fy, 'Deja occupe', '#ff6666');
        return;
      }
      // Place the selected building from catalogue
      const bi = this.selBuilding;
      if (bi < 0 || bi >= ATELIERS.length) return;
      const def = ATELIERS[bi];
      if (def.reqLevel > gameState.data.level) {
        showFloatingText(this.scene, fx, fy, `\u{1F512} Niv.${def.reqLevel}`, '#ff6666');
        return;
      }
      if (gameState.data.coins < def.cost) {
        showFloatingText(this.scene, fx, fy, `\u274C ${fmtN(def.cost)}\u{1F4B0}`, '#ff6666');
        return;
      }
      gameState.data.coins -= def.cost;
      slot.atelierIdx = bi;
      showFloatingText(this.scene, fx, fy, `${def.emoji} -${fmtN(def.cost)}`);
      this.buildGrid(); this.buildCatalogue(); gameState.emit();
      return;
    }

    // ===== NORMAL MODE =====
    if (slot.locked || slot.atelierIdx < 0) return;
    if (slot.craftRecipeIdx >= 0) {
      if (gameState.isCraftDone(idx)) {
        const atelier = ATELIERS[slot.atelierIdx]; const recipe = atelier?.recipes[slot.craftRecipeIdx];
        const craftQty = slot.craftQty;
        if (recipe) gameState.trackQuestRecipe(recipe.name, craftQty);
        if (gameState.collectCraft(idx)) {
          if (recipe?.output) { const info = RESOURCE_INFO[recipe.output]; showFloatingText(this.scene, fx, fy, `+${slot.craftQty} ${info?.emoji ?? ''}`, '#66ff66'); }
          else if (recipe) showFloatingText(this.scene, fx, fy, `+${fmtN(recipe.sell * slot.craftQty)}\u{1F4B0}`, '#ffdd44');
          const lu = gameState.checkLevelUp();
          if (lu.leveled) showLevelUpBanner(this.scene, lu.newLevel, lu.wBonus, lu.gBonus);
          gameState.emit(); this.refresh();
        }
      } else { this.selectedSlot = idx; this.refresh(); }
      return;
    }
    this.selectedSlot = idx; this.refresh();
  }

  // --- Update slot visuals ---
  private updateAtelierVisuals(): void {
    const now = Date.now();
    const glowAlpha = 0.4 + 0.4 * Math.sin(now / 400);
    this.slotGraphics.forEach((group) => {
      const idx = group.getData('idx') as number; const ps = group.getData('plotSize') as number;
      if (idx >= gameState.data.atelierSlots.length) return;
      const slot = gameState.data.atelierSlots[idx]; const half = ps / 2;
      const bg = group.getAt(0) as Phaser.GameObjects.Graphics;
      const emojiText = group.getAt(1) as Phaser.GameObjects.Text;
      const subText = group.getAt(2) as Phaser.GameObjects.Text;
      bg.clear();
      const isSel = idx === this.selectedSlot;
      const isMoveSrc = idx === this.moveSrc;

      if (slot.locked) {
        bg.fillStyle(COLORS.plotLocked, 0.6); bg.fillRoundedRect(-half, -half, ps, ps, 6);
        emojiText.setText('\u{1F512}');
        subText.setText(`${fmtN(gameState.getBuildingCellCost())}\u{1F4B0}`).setBackgroundColor('#00000088').setVisible(true); return;
      }
      if (slot.atelierIdx < 0) {
        bg.fillStyle(COLORS.atelierBg, 0.4); bg.fillRoundedRect(-half, -half, ps, ps, 6);
        emojiText.setText('+'); subText.setText('Vide').setBackgroundColor('').setVisible(true); return;
      }
      const atelier = ATELIERS[slot.atelierIdx]; if (!atelier) return;

      // Highlight for move source
      if (isMoveSrc) {
        bg.fillStyle(0xfff9c4, 1); bg.fillRoundedRect(-half, -half, ps, ps, 6);
        bg.lineStyle(2, 0xf44336, 1); bg.strokeRoundedRect(-half, -half, ps, ps, 6);
        emojiText.setText(atelier.emoji); subText.setText(atelier.name).setBackgroundColor('').setVisible(true);
        return;
      }

      if (slot.craftRecipeIdx >= 0) {
        const el = now - slot.craftStart; const done = el >= slot.craftDuration;
        if (done) {
          // Craft done — gold glow pulse
          bg.fillStyle(COLORS.plotMature, 1); bg.fillRoundedRect(-half, -half, ps, ps, 6);
          bg.lineStyle(3, 0xffa500, glowAlpha); bg.strokeRoundedRect(-half, -half, ps, ps, 6);
          emojiText.setText(atelier.emoji);
          subText.setText('\u2705').setBackgroundColor('#00000088').setVisible(true);
        } else {
          // In production — orange glow pulse + progress bar
          bg.fillStyle(COLORS.plotGrowing, 1); bg.fillRoundedRect(-half, -half, ps, ps, 6);
          bg.lineStyle(3, 0xff9800, glowAlpha); bg.strokeRoundedRect(-half, -half, ps, ps, 6);
          emojiText.setText(atelier.emoji);
          const rem = Math.ceil((slot.craftDuration - el) / 1000); subText.setText(rem >= 60 ? Math.ceil(rem / 60) + 'm' : rem + 's').setBackgroundColor('#00000088').setVisible(true);
          // Mini progress bar at top of slot
          const barH = 4; const barW = ps - 8; const barX = -half + 4; const barY = -half + 3;
          const pct = Math.min(el / slot.craftDuration, 1);
          bg.fillStyle(0x000000, 0.3); bg.fillRoundedRect(barX, barY, barW, barH, 2);
          bg.fillStyle(0xff9800, 1); bg.fillRoundedRect(barX, barY, Math.max(2, barW * pct), barH, 2);
        }
      } else {
        bg.fillStyle(isSel ? 0xfff3e0 : 0xd7ccc8, 1); bg.fillRoundedRect(-half, -half, ps, ps, 6);
        if (isSel) { bg.lineStyle(2, COLORS.goldDark, 1); bg.strokeRoundedRect(-half, -half, ps, ps, 6); }
        emojiText.setText(atelier.emoji); subText.setText(atelier.name).setBackgroundColor('').setVisible(true);
      }
    });
    if (this.autoAtelierBtn) updateAutoButton(this.autoAtelierBtn);
  }

  // ====================================================================
  // ===                     OUVRIERS SUB-TAB                         ===
  // ====================================================================
  private buildOuvriersContent(): void {
    this.ouvrierScrollContainer = this.scene.add.container(0, this.subTabBottom + 4);
    this.contentContainer.add(this.ouvrierScrollContainer);
    this.scrollTopY = this.subTabBottom + 4;
    this.scrollTarget = this.ouvrierScrollContainer;
    this.renderOuvriers();
    const { width, height } = this.scene.scale;
    const mask = this.scene.make.graphics({});
    mask.fillRect(0, this.subTabBottom, width, height - this.subTabBottom - UI.TAB_HEIGHT);
    this.ouvrierScrollContainer.setMask(mask.createGeometryMask());
  }

  private renderOuvriers(): void {
    this.ouvrierScrollContainer.removeAll(true);
    const { width } = this.scene.scale;
    let y = 0;
    const now = Date.now();
    const oCount = gameState.data.ouvriers.length;

    // Hire
    if (oCount < OUVRIER_MAX) {
      const cost = gameState.getOuvrierHireCost(oCount);
      const can = gameState.data.coins >= cost;
      const rent = Math.floor(cost * 0.12);
      y = this.renderHireCard(y, `\u{1F477} Engager ouvrier #${oCount + 1}`, `${fmtN(cost)}\u{1F4B0}`,
        `Loyer: ${fmtN(rent)}\u{1F4B0}/mois | Produit niv. recettes / 2min`, can, () => {
          if (gameState.data.coins < cost) return;
          gameState.data.coins -= cost;
          gameState.data.ouvriers.push({ name: `Ouvrier ${oCount + 1}`, level: 1, hireCost: cost, assignment: 'repos', lastProd: Date.now() });
          gameState.emit(); this.buildActiveContent();
        });
    }

    const outputRecipes = getAllOutputRecipes();
    for (let oi = 0; oi < oCount; oi++) {
      const o = gameState.data.ouvriers[oi];
      let assignLabel = '\u{1F4A4} Repos';
      if (o.assignment !== 'repos') {
        const parts = o.assignment.split(':');
        if (parts.length === 2) {
          const ai = parseInt(parts[0], 10); const ri = parseInt(parts[1], 10);
          const atelier = ATELIERS[ai]; const recipe = atelier?.recipes[ri];
          if (recipe) assignLabel = `${recipe.emoji} ${recipe.name}`;
        }
      }
      const rent = Math.floor(o.hireCost * (o.assignment === 'repos' ? 0.06 : 0.12));
      const elapsed = now - o.lastProd;
      const ready = o.assignment !== 'repos' && elapsed >= OUVRIER_PROD_MS;
      const timerStr = o.assignment === 'repos' ? '' : ready ? '\u2705 Pret!' : `\u23F1 ${Math.ceil((OUVRIER_PROD_MS - elapsed) / 1000)}s`;
      const infoLine = `\u{1F3E0}${fmtN(rent)}\u{1F4B0}/mois | \u{1F4E6}${o.level}/cycle | ${timerStr}`;

      y = this.renderOuvrierDetailCard(y, oi, o.name, o.level, assignLabel, infoLine, o.assignment, outputRecipes);
    }

    this.ouvrierContentHeight = y + 20;
  }

  private renderHireCard(y: number, title: string, btnLabel: string, sub: string, enabled: boolean, onClick: () => void): number {
    const { width } = this.scene.scale;
    const h = 84;
    const bg = this.scene.add.graphics();
    bg.fillStyle(0xffffff, 0.92); bg.fillRoundedRect(8, y, width - 16, h, 10);
    const ttl = this.scene.add.text(width / 2, y + 14, title, {
      fontSize: '13px', fontFamily: 'Arial, sans-serif', color: '#5d4037', fontStyle: 'bold',
    }).setOrigin(0.5);
    const subTxt = this.scene.add.text(width / 2, y + 32, sub, {
      fontSize: '11px', fontFamily: 'Arial, sans-serif', color: '#888',
      wordWrap: { width: width - 48 },
    }).setOrigin(0.5, 0);
    const btnW = width - 40; const btnH = 26; const btnX = 20; const btnY = y + 54;
    const btnBg = this.scene.add.graphics();
    btnBg.fillStyle(enabled ? 0x66bb6a : 0x999999, 1);
    btnBg.fillRoundedRect(btnX, btnY, btnW, btnH, 10);
    const btnTxt = this.scene.add.text(btnX + btnW / 2, btnY + btnH / 2, btnLabel, {
      fontSize: '12px', fontFamily: 'Arial, sans-serif', color: '#fff', fontStyle: 'bold',
    }).setOrigin(0.5);
    if (enabled) {
      const hit = this.scene.add.rectangle(btnX + btnW / 2, btnY + btnH / 2, btnW, btnH, 0, 0)
        .setInteractive({ useHandCursor: true }).on('pointerdown', onClick);
      this.ouvrierScrollContainer.add(hit);
    }
    this.ouvrierScrollContainer.add([bg, ttl, subTxt, btnBg, btnTxt]);
    return y + h + 8;
  }

  private renderOuvrierDetailCard(y: number, oi: number, name: string, level: number,
    assignLabel: string, infoLine: string, assignment: string,
    outputRecipes: { atelierIdx: number; recipeIdx: number }[]): number {
    const { width } = this.scene.scale;
    const hasUpgrade = level < OUVRIER_MAX_LVL;
    const h = hasUpgrade ? 110 : 82;
    const bg = this.scene.add.graphics();
    bg.fillStyle(0xffffff, 0.92); bg.fillRoundedRect(8, y, width - 16, h, 10);

    const emoji = this.scene.add.text(18, y + 16, '\u{1F477}', { fontSize: '18px' }).setOrigin(0, 0.5);
    const nameTxt = this.scene.add.text(42, y + 16, name, {
      fontSize: '12px', fontFamily: 'Arial, sans-serif', color: '#5d4037', fontStyle: 'bold',
    }).setOrigin(0, 0.5);
    const lvlBg = this.scene.add.graphics();
    lvlBg.fillStyle(0x8d6e63, 1); lvlBg.fillRoundedRect(width - 60, y + 6, 44, 18, 8);
    const lvlTxt = this.scene.add.text(width - 38, y + 15, `Niv.${level}`, {
      fontSize: '11px', fontFamily: 'Arial, sans-serif', color: '#fff', fontStyle: 'bold',
    }).setOrigin(0.5);

    const info = this.scene.add.text(18, y + 32, infoLine, { fontSize: '11px', fontFamily: 'Arial, sans-serif', color: '#666' });
    const assLbl = this.scene.add.text(18, y + 50, `Recette: ${assignLabel}`, { fontSize: '11px', fontFamily: 'Arial, sans-serif', color: '#333' });

    // Next assignment
    const assignOptions = ['repos', ...outputRecipes.map(r => `${r.atelierIdx}:${r.recipeIdx}`)];
    const curIdx = assignOptions.indexOf(assignment);
    const nBtnW = 72; const nBtnH = 22; const nBtnX = width - 22 - nBtnW; const nBtnY = y + 46;
    const nBg = this.scene.add.graphics();
    nBg.fillStyle(COLORS.blue, 1); nBg.fillRoundedRect(nBtnX, nBtnY, nBtnW, nBtnH, 7);
    const nTxt = this.scene.add.text(nBtnX + nBtnW / 2, nBtnY + nBtnH / 2, 'Suivant \u25B6', {
      fontSize: '11px', fontFamily: 'Arial, sans-serif', color: '#fff', fontStyle: 'bold',
    }).setOrigin(0.5);
    const nHit = this.scene.add.rectangle(nBtnX + nBtnW / 2, nBtnY + nBtnH / 2, nBtnW, nBtnH, 0, 0)
      .setInteractive({ useHandCursor: true })
      .on('pointerdown', () => {
        const ni = (curIdx + 1) % assignOptions.length;
        gameState.data.ouvriers[oi].assignment = assignOptions[ni];
        gameState.emit(); this.buildActiveContent();
      });

    // Upgrade
    if (hasUpgrade) {
      const upgCost = gameState.getOuvrierUpgradeCost(level);
      const can = gameState.data.coins >= upgCost;
      const uBtnW = width - 40; const uBtnH = 24; const uBtnX = 20; const uBtnY = y + 78;
      const uBg = this.scene.add.graphics();
      uBg.fillStyle(can ? 0xff9800 : 0x999999, 1); uBg.fillRoundedRect(uBtnX, uBtnY, uBtnW, uBtnH, 7);
      const uTxt = this.scene.add.text(uBtnX + uBtnW / 2, uBtnY + uBtnH / 2, `\u2B06\uFE0F Niv.${level + 1} - ${fmtN(upgCost)}\u{1F4B0}`, {
        fontSize: '11px', fontFamily: 'Arial, sans-serif', color: '#fff', fontStyle: 'bold',
      }).setOrigin(0.5);
      if (can) {
        const uHit = this.scene.add.rectangle(uBtnX + uBtnW / 2, uBtnY + uBtnH / 2, uBtnW, uBtnH, 0, 0)
          .setInteractive({ useHandCursor: true })
          .on('pointerdown', () => {
            if (gameState.data.coins < upgCost) return;
            gameState.data.coins -= upgCost; gameState.data.ouvriers[oi].level++;
            gameState.emit(); this.buildActiveContent();
          });
        this.ouvrierScrollContainer.add(uHit);
      }
      this.ouvrierScrollContainer.add([uBg, uTxt]);
    }
    this.ouvrierScrollContainer.add([bg, emoji, nameTxt, lvlBg, lvlTxt, info, assLbl, nBg, nTxt, nHit]);
    return y + h + 8;
  }

  // ====================================================================
  // ===                         SCROLL                               ===
  // ====================================================================
  private setupScroll(): void {
    this.scene.input.on('pointerdown', (p: Phaser.Input.Pointer) => {
      if (!this.container.visible) return;
      // Catalogue horizontal scroll zone
      if (this.bMode === 'add' && this.catInnerContainer &&
          p.y >= this.catalogueY && p.y <= this.catalogueY + AtelierPanel.CATALOGUE_H) {
        this.catDragging = true;
        this.catDragStartX = p.x;
        this.catDragStartScrollX = this.catScrollX;
        return;
      }
      const height = this.scene.scale.height;
      if (p.y > this.scrollTopY && p.y < height - UI.TAB_HEIGHT) {
        this.scroller.onDragStart(p.y);
      }
    });
    this.scene.input.on('pointermove', (p: Phaser.Input.Pointer) => {
      if (!this.container.visible) return;
      // Catalogue horizontal scroll
      if (this.catDragging && this.catInnerContainer) {
        const dx = this.catDragStartX - p.x;
        const maxScrollX = Math.max(0, this.catContentW - this.scene.scale.width);
        this.catScrollX = Math.max(0, Math.min(maxScrollX, this.catDragStartScrollX + dx));
        this.catInnerContainer.x = -this.catScrollX;
        return;
      }
      this.scroller.onDragMove(p.y);
    });
    this.scene.input.on('pointerup', () => { this.scroller.onDragEnd(); this.catDragging = false; });
  }

  private clampScroll(sy: number): number {
    const { height } = this.scene.scale;
    const viewH = height - this.scrollTopY - UI.TAB_HEIGHT;
    let contentH = 400;
    if (this.activeSub === 'ouvriers') contentH = this.ouvrierContentHeight;
    else if (this.activeSub === 'aide') contentH = this.aideContentHeight;
    const minS = Math.min(0, viewH - contentH - 20);
    return Math.max(minS, Math.min(0, sy));
  }

  // ====================================================================
  // ===                       AIDE SUB-TAB                            ===
  // ====================================================================
  private buildAideContent(): void {
    this.aideScrollContainer = this.scene.add.container(0, this.subTabBottom + 4);
    this.contentContainer.add(this.aideScrollContainer);
    this.scrollTopY = this.subTabBottom + 4;
    this.scrollTarget = this.aideScrollContainer;
    this.renderAtelierAide();
    const { width, height } = this.scene.scale;
    const mask = this.scene.make.graphics({});
    mask.fillRect(0, this.subTabBottom, width, height - this.subTabBottom - UI.TAB_HEIGHT);
    this.aideScrollContainer.setMask(mask.createGeometryMask());
  }

  private renderAtelierAide(): void {
    this.aideScrollContainer.removeAll(true);
    const { width } = this.scene.scale;
    let y = 0;

    // Sub-sub-tabs: Recettes, Ouvriers
    type AtAideSub = 'recettes' | 'ouvriers';
    const aideTabs: { id: AtAideSub; label: string }[] = [
      { id: 'recettes', label: '\u{1F4D6} Recettes' },
      { id: 'ouvriers', label: '\u{1F477} Ouvriers' },
    ];
    const tabW = (width - 16) / aideTabs.length;
    const tabH = 26;
    aideTabs.forEach((tab, i) => {
      const tx = 8 + tabW * i + tabW / 2;
      const isActive = this.atAideSub === tab.id;
      const bg = this.scene.add.graphics();
      bg.fillStyle(isActive ? 0xe8f5e9 : 0xffffff, isActive ? 1 : 0.7);
      if (isActive) bg.lineStyle(2, COLORS.green, 1);
      bg.fillRoundedRect(tx - tabW / 2 + 2, y, tabW - 4, tabH, 7);
      if (isActive) bg.strokeRoundedRect(tx - tabW / 2 + 2, y, tabW - 4, tabH, 7);
      const label = this.scene.add.text(tx, y + tabH / 2, tab.label, {
        fontSize: '11px', fontFamily: 'Arial, sans-serif', color: '#333', fontStyle: isActive ? 'bold' : 'normal',
      }).setOrigin(0.5);
      const hit = this.scene.add.rectangle(tx, y + tabH / 2, tabW - 4, tabH, 0, 0)
        .setInteractive({ useHandCursor: true })
        .on('pointerdown', () => { this.atAideSub = tab.id; this.renderAtelierAide(); });
      this.aideScrollContainer.add([bg, label, hit]);
    });
    y += tabH + 8;

    if (this.atAideSub === 'recettes') y = this.renderAideRecettes(y);
    else y = this.renderAideOuvriersGuide(y);

    this.aideContentHeight = y + 20;
  }

  private recetteSearch = '';

  private renderAideRecettes(y: number): number {
    const { width } = this.scene.scale;

    // Search bar
    const searchBg = this.scene.add.graphics();
    searchBg.fillStyle(0xffffff, 1);
    searchBg.fillRoundedRect(10, y, width - 20, 30, 8);
    searchBg.lineStyle(1, 0xcccccc, 1);
    searchBg.strokeRoundedRect(10, y, width - 20, 30, 8);
    const searchLabel = this.scene.add.text(width / 2, y + 15,
      this.recetteSearch ? `\u{1F50D} ${this.recetteSearch}` : '\u{1F50D} Rechercher...',
      { fontSize: '12px', fontFamily: 'Arial, sans-serif', color: this.recetteSearch ? '#333' : '#999' }
    ).setOrigin(0.5);
    const searchHit = this.scene.add.rectangle(width / 2, y + 15, width - 20, 30, 0, 0)
      .setInteractive({ useHandCursor: true })
      .on('pointerdown', () => {
        const val = prompt('Rechercher une recette:', this.recetteSearch) ?? '';
        this.recetteSearch = val.trim().toLowerCase();
        this.renderAtelierAide();
      });
    this.aideScrollContainer.add([searchBg, searchLabel, searchHit]);
    y += 38;

    // Collect all recipes
    const allRecipes: { recipe: typeof ATELIERS[0]['recipes'][0]; atelierName: string; atelierEmoji: string; reqLevel: number }[] = [];
    ATELIERS.forEach(at => {
      at.recipes.forEach(r => {
        allRecipes.push({ recipe: r, atelierName: at.name, atelierEmoji: at.emoji, reqLevel: at.reqLevel });
      });
    });
    allRecipes.sort((a, b) => a.recipe.name.localeCompare(b.recipe.name));

    // Filter by search
    const q = this.recetteSearch;
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
      this.aideScrollContainer.add(noRes);
      return y + 60;
    }

    for (const entry of filtered) {
      const { recipe, atelierName, atelierEmoji, reqLevel } = entry;
      const locked = reqLevel > gameState.data.level;
      const h = 70;
      const bg = this.scene.add.graphics();
      bg.fillStyle(0xffffff, locked ? 0.5 : 0.9);
      bg.fillRoundedRect(10, y, width - 20, h, 9);

      // Header: recipe name + building name
      const nameStr = `${recipe.emoji} ${recipe.name}`;
      const nameTxt = this.scene.add.text(18, y + 8, nameStr, {
        fontSize: '13px', fontFamily: 'Arial, sans-serif', color: '#333', fontStyle: 'bold',
      }).setAlpha(locked ? 0.5 : 1);

      const bldStr = `${atelierEmoji} ${atelierName}` + (locked ? ` \u{1F512}Niv.${reqLevel}` : '');
      const bldTxt = this.scene.add.text(width - 18, y + 8, bldStr, {
        fontSize: '11px', fontFamily: 'Arial, sans-serif', color: '#888',
      }).setOrigin(1, 0).setAlpha(locked ? 0.5 : 1);

      // Add bg + header texts FIRST (behind ingredients)
      this.aideScrollContainer.add([bg, nameTxt, bldTxt]);

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
        this.aideScrollContainer.add(txt);
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

      this.aideScrollContainer.add(outTxt);
      y += h + 4;
    }

    return y;
  }

  private renderAideOuvriersGuide(y: number): number {
    const { width } = this.scene.scale;
    const lines = [
      { text: '\u{1F477} Guide des Ouvriers', bold: true, size: 14, center: true },
      { text: '', bold: false, size: 8, center: false },
      { text: 'Comment ca marche ?', bold: true, size: 12, center: false },
      { text: 'Les ouvriers fabriquent automatiquement des ressources transformees dans vos ateliers toutes les 2 minutes.', bold: false, size: 11, center: false },
      { text: '---', bold: false, size: 4, center: false },
      { text: `\u{1F6D2} Engager \u2014 Achetez un ouvrier (max ${OUVRIER_MAX}). Le cout augmente a chaque embauche.`, bold: false, size: 11, center: false },
      { text: '\u{1F4E6} Assigner \u2014 Choisissez la recette qu\'il doit fabriquer parmi celles debloquees.', bold: false, size: 11, center: false },
      { text: '\u{1F3ED} Production \u2014 Toutes les 2 min, il fabrique la recette si vous avez les ingredients en stock.', bold: false, size: 11, center: false },
      { text: `\u2B06\uFE0F Ameliorer \u2014 Montez son niveau (max ${OUVRIER_MAX_LVL}) pour augmenter sa quantite produite.`, bold: false, size: 11, center: false },
      { text: '\u{1F634} Repos \u2014 Mettez-le en repos pour diviser son loyer par 2 (mais il ne produit rien).', bold: false, size: 11, center: false },
      { text: '\u{1F3E0} Loyer \u2014 Chaque ouvrier coute un loyer mensuel (12% de son cout d\'achat). Le repos reduit ce cout de moitie.', bold: false, size: 11, center: false },
      { text: '\u270F\uFE0F Renommer \u2014 Touchez le nom pour le personnaliser (max 15 caracteres).', bold: false, size: 11, center: false },
    ];

    const pad = 12;
    const bg = this.scene.add.graphics();
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

  // ========== PUBLIC ==========
  setVisible(v: boolean): void { this.container.setVisible(v); }
  updateVisuals(): void {
    if (this.activeSub === 'ateliers') this.updateAtelierVisuals();
  }
  refresh(): void {
    this.buildSubTabs();
    this.buildActiveContent();
  }
}
