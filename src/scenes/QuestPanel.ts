// src/scenes/QuestPanel.ts
// Quest + Trade (Marchander) panel with 2 sub-tabs
import Phaser from 'phaser';
import { gameState, QuestState, TradeState } from '../systems/GameState';
import { RESOURCE_INFO } from '../data/resources';
import { COLORS, UI } from '../utils/constants';
import { fmtN } from '../utils/helpers';
import { showFloatingText } from '../ui/FloatingText';
import { buildSubTabBar } from '../ui/SubTabBar';
import { ScrollHelper } from '../ui/ScrollHelper';

const DRAG_THRESHOLD = 8;
type QuestSub = 'quetes' | 'marchander';

export class QuestPanel {
  private scene: Phaser.Scene;
  private container!: Phaser.GameObjects.Container;
  private subTabContainer!: Phaser.GameObjects.Container;
  private contentContainer!: Phaser.GameObjects.Container;
  private scrollContainer!: Phaser.GameObjects.Container;
  private activeSub: QuestSub = 'quetes';
  private contentHeight = 0;
  private scroller!: ScrollHelper;

  private static readonly SUB_TOP = UI.HUD_HEIGHT + 4;
  private static readonly CONTENT_TOP = UI.HUD_HEIGHT + 36;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    this.container = scene.add.container(0, 0);
    this.container.setDepth(10);
    this.container.setVisible(false);
    this.subTabContainer = scene.add.container(0, 0);
    this.contentContainer = scene.add.container(0, 0);
    this.scrollContainer = scene.add.container(0, 0);
    this.container.add([this.subTabContainer, this.contentContainer]);
    this.scroller = new ScrollHelper(scene,
      (sy) => this.clampScroll(sy),
      (sy) => this.scrollContainer.setY(QuestPanel.CONTENT_TOP + sy),
    );
    this.buildSubTabs();
    this.buildContent();
    this.setupScroll();
  }

  private buildSubTabs(): void {
    this.subTabContainer.removeAll(true);
    buildSubTabBar(
      this.scene, this.subTabContainer,
      [
        { id: 'quetes', label: '\u{1F3AF} Quetes' },
        { id: 'marchander', label: '\u{1F91D} Marchander' },
      ],
      this.activeSub,
      QuestPanel.SUB_TOP,
      (id) => { this.activeSub = id as QuestSub; this.buildSubTabs(); this.buildContent(); },
    );
  }

  private buildContent(): void {
    this.contentContainer.removeAll(true);
    this.scroller.reset();
    this.scrollContainer = this.scene.add.container(0, QuestPanel.CONTENT_TOP);
    this.contentContainer.add(this.scrollContainer);
    if (this.activeSub === 'quetes') this.renderQuests();
    else this.renderTrades();

    // Mask
    const { width, height } = this.scene.scale;
    const mask = this.scene.make.graphics({});
    mask.fillRect(0, QuestPanel.CONTENT_TOP, width, height - QuestPanel.CONTENT_TOP - UI.TAB_HEIGHT);
    this.scrollContainer.setMask(mask.createGeometryMask());
  }

  // ======================== QUESTS ========================

  private renderQuests(): void {
    const { width } = this.scene.scale;
    const d = gameState.data;

    // Ensure quests generated
    gameState.generateQuests();

    let y = 4;

    // Month info
    const monthInfo = this.scene.add.text(width / 2, y + 10, `\u{1F4C5} Mois ${d.month} \u2014 Jour ${d.day}/30`, {
      fontSize: '13px', fontFamily: 'Arial, sans-serif', color: '#888',
    }).setOrigin(0.5);
    this.scrollContainer.add(monthInfo);
    y += 28;

    // Stars display
    const starsText = this.scene.add.text(width / 2, y + 10, `\u2B50 Etoiles: ${d.stars}`, {
      fontSize: '13px', fontFamily: 'Arial, sans-serif', color: '#5d4037', fontStyle: 'bold',
    }).setOrigin(0.5);
    this.scrollContainer.add(starsText);
    y += 28;

    // Farm quests section
    y = this.renderSectionHeader(y, '\u{1F33E} Quetes Ferme', width);
    for (let qi = 0; qi < 5 && qi < d.quests.length; qi++) {
      y = this.renderQuestCard(y, qi, d.quests[qi], width);
    }

    // Atelier quests section
    y = this.renderSectionHeader(y, '\u{1F3D7}\uFE0F Quetes Atelier', width);
    for (let qi = 5; qi < 10 && qi < d.quests.length; qi++) {
      y = this.renderQuestCard(y, qi, d.quests[qi], width);
    }

    // Reset all button
    y += 8;
    const resetCost = gameState.getQuestResetCost();
    const canReset = d.coins >= resetCost;
    const rBtnW = width - 32; const rBtnH = 36;
    const rBg = this.scene.add.graphics();
    rBg.fillStyle(canReset ? 0x9b59b6 : 0x999999, 1);
    rBg.fillRoundedRect(16, y, rBtnW, rBtnH, 8);
    const rTxt = this.scene.add.text(width / 2, y + rBtnH / 2,
      `\u{1F504} Toutes nouvelles quetes (${fmtN(resetCost)}\u{1F4B0})`, {
        fontSize: '12px', fontFamily: 'Arial, sans-serif', color: '#fff', fontStyle: 'bold',
      }).setOrigin(0.5);
    this.scrollContainer.add([rBg, rTxt]);
    if (canReset) {
      const rHit = this.scene.add.rectangle(width / 2, y + rBtnH / 2, rBtnW, rBtnH, 0, 0)
        .setInteractive({ useHandCursor: true })
        .on('pointerup', () => {
          if (this.scroller.totalDragDistance >= DRAG_THRESHOLD) return;
          if (gameState.data.coins < resetCost) return;
          gameState.data.coins -= resetCost;
          gameState.data.questResets++;
          gameState.data.questMonth = 0;
          gameState.data.quests = [];
          gameState.generateQuests();
          showFloatingText(this.scene, width / 2, QuestPanel.CONTENT_TOP + 60, '\u{1F3AF} Nouvelles quetes!');
          gameState.emit(); this.buildContent();
        });
      this.scrollContainer.add(rHit);
    }
    y += rBtnH + 16;

    this.contentHeight = y;
  }

  private renderSectionHeader(y: number, text: string, width: number): number {
    const bg = this.scene.add.graphics();
    bg.fillStyle(0xffffff, 0.5);
    bg.fillRoundedRect(8, y, width - 16, 26, 8);
    const txt = this.scene.add.text(width / 2, y + 13, text, {
      fontSize: '13px', fontFamily: 'Arial, sans-serif', color: '#5d4037', fontStyle: 'bold',
    }).setOrigin(0.5);
    this.scrollContainer.add([bg, txt]);
    return y + 30;
  }

  private renderQuestCard(y: number, qi: number, q: QuestState, width: number): number {
    const done = q.progress >= q.need;
    const claimed = q.claimed;
    const h = claimed ? 56 : 96;

    // Card bg
    const bg = this.scene.add.graphics();
    bg.fillStyle(claimed ? 0xc8e6c8 : 0xffffff, claimed ? 0.7 : 0.9);
    bg.fillRoundedRect(8, y, width - 16, h, 10);
    this.scrollContainer.add(bg);

    // Header: emoji + target
    const desc = q.type === 'atelier'
      ? `Fabriquer ${q.need} ${q.target}`
      : `Recolter ${q.need} ${q.target}`;
    const hdr = this.scene.add.text(16, y + 12, `${q.emoji} ${desc}`, {
      fontSize: '13px', fontFamily: 'Arial, sans-serif', color: '#333', fontStyle: 'bold',
    });
    this.scrollContainer.add(hdr);

    if (q.type === 'atelier' && q.bld) {
      const bldTxt = this.scene.add.text(16, y + 28, `\u{1F3ED} ${q.bld}`, {
        fontSize: '10px', fontFamily: 'Arial, sans-serif', color: '#666',
      });
      this.scrollContainer.add(bldTxt);
    }

    // Progress bar
    const barX = 16; const barY = y + (q.type === 'atelier' ? 42 : 34); const barW = width - 80; const barH = 10;
    const barBg = this.scene.add.graphics();
    barBg.fillStyle(0x000000, 0.1);
    barBg.fillRoundedRect(barX, barY, barW, barH, 5);
    const pct = Math.min(q.progress / q.need, 1);
    if (pct > 0) {
      barBg.fillStyle(done ? 0x4caf50 : 0xff9800, 1);
      barBg.fillRoundedRect(barX, barY, barW * pct, barH, 5);
    }
    const progTxt = this.scene.add.text(barX + barW + 6, barY + barH / 2, `${q.progress}/${q.need}`, {
      fontSize: '10px', fontFamily: 'Arial, sans-serif', color: '#666',
    }).setOrigin(0, 0.5);
    this.scrollContainer.add([barBg, progTxt]);

    if (!claimed) {
      // Reward line
      const rwY = barY + barH + 5;
      const rwTxt = this.scene.add.text(16, rwY, `\u{1F3C6} ${fmtN(q.gold)}\u{1F4B0} + ${fmtN(q.xp)}\u2B50 + 1\u2B50`, {
        fontSize: '11px', fontFamily: 'Arial, sans-serif', color: '#5d4037',
      });
      this.scrollContainer.add(rwTxt);

      // Buttons row
      const btnY = rwY + 18;
      const btnH = 24;

      // Claim button
      const claimW = (width - 44) * 0.6;
      const clBg = this.scene.add.graphics();
      clBg.fillStyle(done ? 0x4caf50 : 0x999999, 1);
      clBg.fillRoundedRect(16, btnY, claimW, btnH, 8);
      const clTxt = this.scene.add.text(16 + claimW / 2, btnY + btnH / 2,
        done ? '\u{1F381} Reclamer' : '\u274C Pas terminee', {
          fontSize: '11px', fontFamily: 'Arial, sans-serif', color: '#fff', fontStyle: 'bold',
        }).setOrigin(0.5);
      this.scrollContainer.add([clBg, clTxt]);
      if (done) {
        const clHit = this.scene.add.rectangle(16 + claimW / 2, btnY + btnH / 2, claimW, btnH, 0, 0)
          .setInteractive({ useHandCursor: true })
          .on('pointerup', () => {
            if (this.scroller.totalDragDistance >= DRAG_THRESHOLD) return;
            gameState.claimQuest(qi);
            const baseY = QuestPanel.CONTENT_TOP + y + btnY / 2;
            showFloatingText(this.scene, width / 2, baseY, `\u{1F381} Quete terminee!`, '#66ff66');
            showFloatingText(this.scene, width / 2, baseY - 24, `+${fmtN(q.gold)}\u{1F4B0}`, '#ffdd44', '14px');
            showFloatingText(this.scene, width / 2, baseY - 48, `+${fmtN(q.xp)}\u2B50 +1\u2B50`, '#ffdd44', '14px');
            gameState.emit(); this.buildContent();
          });
        this.scrollContainer.add(clHit);
      }

      // Skip button
      const skipW = (width - 44) * 0.35;
      const skipX = width - 16 - skipW;
      const skBg = this.scene.add.graphics();
      skBg.fillStyle(0x9b59b6, 1);
      skBg.fillRoundedRect(skipX, btnY, skipW, btnH, 8);
      const skTxt = this.scene.add.text(skipX + skipW / 2, btnY + btnH / 2, '\u{1F504} Passer', {
        fontSize: '11px', fontFamily: 'Arial, sans-serif', color: '#fff', fontStyle: 'bold',
      }).setOrigin(0.5);
      const skHit = this.scene.add.rectangle(skipX + skipW / 2, btnY + btnH / 2, skipW, btnH, 0, 0)
        .setInteractive({ useHandCursor: true })
        .on('pointerup', () => {
          if (this.scroller.totalDragDistance >= DRAG_THRESHOLD) return;
          gameState.regenerateOneQuest(qi);
          showFloatingText(this.scene, skipX + skipW / 2, QuestPanel.CONTENT_TOP + y + btnY / 2,
            '\u{1F504} Nouvelle quete!');
          gameState.emit(); this.buildContent();
        });
      this.scrollContainer.add([skBg, skTxt, skHit]);
    } else {
      const doneTxt = this.scene.add.text(16, y + h - 18, '\u2705 Terminee!', {
        fontSize: '12px', fontFamily: 'Arial, sans-serif', color: '#27ae60', fontStyle: 'bold',
      });
      this.scrollContainer.add(doneTxt);
    }

    return y + h + 8;
  }

  // ======================== TRADES ========================

  private renderTrades(): void {
    const { width } = this.scene.scale;
    const d = gameState.data;

    // Ensure trades generated
    gameState.generateTrades();

    let y = 4;

    // Header
    const hdr = this.scene.add.text(width / 2, y + 10, `\u{1F91D} Marchander \u2014 Mois ${d.month}`, {
      fontSize: '14px', fontFamily: 'Arial, sans-serif', color: '#5d4037', fontStyle: 'bold',
    }).setOrigin(0.5);
    this.scrollContainer.add(hdr);
    y += 28;

    // Stars
    const starsTxt = this.scene.add.text(width / 2, y + 8, `\u2B50 Etoiles: ${d.stars}`, {
      fontSize: '13px', fontFamily: 'Arial, sans-serif', color: '#5d4037', fontStyle: 'bold',
    }).setOrigin(0.5);
    this.scrollContainer.add(starsTxt);
    y += 24;

    for (let ti = 0; ti < d.trades.length; ti++) {
      y = this.renderTradeCard(y, ti, d.trades[ti], width);
    }

    // Full reset button (FREE)
    y += 8;
    const rBtnW = width - 32; const rBtnH = 36;
    const rBg = this.scene.add.graphics();
    rBg.fillStyle(0x2196f3, 1);
    rBg.fillRoundedRect(16, y, rBtnW, rBtnH, 8);
    const rTxt = this.scene.add.text(width / 2, y + rBtnH / 2,
      '\u{1F504} Tous nouveaux marchands (gratuit)', {
        fontSize: '12px', fontFamily: 'Arial, sans-serif', color: '#fff', fontStyle: 'bold',
      }).setOrigin(0.5);
    const rHit = this.scene.add.rectangle(width / 2, y + rBtnH / 2, rBtnW, rBtnH, 0, 0)
      .setInteractive({ useHandCursor: true })
      .on('pointerup', () => {
        if (this.scroller.totalDragDistance >= DRAG_THRESHOLD) return;
        gameState.resetAllTrades();
        showFloatingText(this.scene, width / 2, QuestPanel.CONTENT_TOP + 60, '\u{1F91D} Nouveaux marchands!');
        gameState.emit(); this.buildContent();
      });
    this.scrollContainer.add([rBg, rTxt, rHit]);
    y += rBtnH + 16;

    this.contentHeight = y;
  }

  private renderTradeCard(y: number, ti: number, tr: TradeState, width: number): number {
    const isDone = tr.done;
    const canTrade = !isDone && gameState.canExecuteTrade(ti);

    // Build demands info
    const demandEntries: { emoji: string; name: string; need: number; have: number; ok: boolean }[] = [];
    for (const rk in tr.demands) {
      const need = tr.demands[rk];
      let emoji: string, name: string, have: number;
      if (rk === 'eau') {
        emoji = '\u{1F4A7}'; name = 'Eau'; have = gameState.data.water;
      } else {
        const ri = RESOURCE_INFO[rk];
        emoji = ri?.emoji ?? '?'; name = ri?.name ?? rk; have = gameState.data.resources[rk] ?? 0;
      }
      demandEntries.push({ emoji, name, need, have, ok: have >= need });
    }

    const demLines = Math.ceil(demandEntries.length / 2);
    const h = isDone ? 54 : 80 + demLines * 20;

    // Card bg
    const bg = this.scene.add.graphics();
    bg.fillStyle(isDone ? 0xc8e6c8 : 0xffffff, isDone ? 0.7 : 0.9);
    bg.fillRoundedRect(8, y, width - 16, h, 10);
    this.scrollContainer.add(bg);

    // NPC header
    const npcTxt = this.scene.add.text(16, y + 12, `${tr.emoji} ${tr.npc}`, {
      fontSize: '13px', fontFamily: 'Arial, sans-serif', color: '#333', fontStyle: 'bold',
    });
    this.scrollContainer.add(npcTxt);

    if (isDone) {
      const doneTxt = this.scene.add.text(16, y + 32, '\u2705 Echange effectue!', {
        fontSize: '12px', fontFamily: 'Arial, sans-serif', color: '#27ae60', fontStyle: 'bold',
      });
      this.scrollContainer.add(doneTxt);
      return y + h + 8;
    }

    // Demand tags
    let tagY = y + 30;
    for (let di = 0; di < demandEntries.length; di++) {
      const d = demandEntries[di];
      const col = di % 2;
      const tagX = 16 + col * ((width - 32) / 2);
      if (di > 0 && col === 0) tagY += 20;
      const color = d.ok ? '#27ae60' : '#e74c3c';
      const tagTxt = this.scene.add.text(tagX, tagY,
        `${d.emoji}${d.need} ${d.name} (${d.have})`, {
          fontSize: '11px', fontFamily: 'Arial, sans-serif', color,
        });
      this.scrollContainer.add(tagTxt);
    }
    if (demandEntries.length % 2 !== 0 || demandEntries.length > 0) tagY += 20;

    // Reward
    const rwY = tagY + 2;
    const rwTxt = this.scene.add.text(16, rwY,
      `\u{1F3C6} ${fmtN(tr.gold)}\u{1F4B0} + ${fmtN(tr.xp)}\u2B50 + 1\u2B50`, {
        fontSize: '11px', fontFamily: 'Arial, sans-serif', color: '#5d4037',
      });
    this.scrollContainer.add(rwTxt);

    // Buttons
    const btnY = rwY + 18;
    const btnH = 24;

    // Exchange button
    const exW = (width - 44) * 0.6;
    const exBg = this.scene.add.graphics();
    exBg.fillStyle(canTrade ? 0x4caf50 : 0x999999, 1);
    exBg.fillRoundedRect(16, btnY, exW, btnH, 8);
    const exTxt = this.scene.add.text(16 + exW / 2, btnY + btnH / 2,
      canTrade ? '\u{1F4E6} Echanger' : '\u274C Insuffisant', {
        fontSize: '11px', fontFamily: 'Arial, sans-serif', color: '#fff', fontStyle: 'bold',
      }).setOrigin(0.5);
    this.scrollContainer.add([exBg, exTxt]);
    if (canTrade) {
      const exHit = this.scene.add.rectangle(16 + exW / 2, btnY + btnH / 2, exW, btnH, 0, 0)
        .setInteractive({ useHandCursor: true })
        .on('pointerup', () => {
          if (this.scroller.totalDragDistance >= DRAG_THRESHOLD) return;
          gameState.executeTrade(ti);
          showFloatingText(this.scene, 16 + exW / 2, QuestPanel.CONTENT_TOP + y + btnY / 2,
            `+${fmtN(tr.gold)}\u{1F4B0} +1\u2B50`);
          gameState.emit(); this.buildContent();
        });
      this.scrollContainer.add(exHit);
    }

    // Skip button
    const skipW = (width - 44) * 0.35;
    const skipX = width - 16 - skipW;
    const skBg = this.scene.add.graphics();
    skBg.fillStyle(0x9b59b6, 1);
    skBg.fillRoundedRect(skipX, btnY, skipW, btnH, 8);
    const skTxt = this.scene.add.text(skipX + skipW / 2, btnY + btnH / 2, '\u{1F504} Passer', {
      fontSize: '11px', fontFamily: 'Arial, sans-serif', color: '#fff', fontStyle: 'bold',
    }).setOrigin(0.5);
    const skHit = this.scene.add.rectangle(skipX + skipW / 2, btnY + btnH / 2, skipW, btnH, 0, 0)
      .setInteractive({ useHandCursor: true })
      .on('pointerup', () => {
        if (this.scroller.totalDragDistance >= DRAG_THRESHOLD) return;
        gameState.regenerateOneTrade(ti);
        showFloatingText(this.scene, skipX + skipW / 2, QuestPanel.CONTENT_TOP + y + btnY / 2,
          '\u{1F504} Nouveau marchand!');
        gameState.emit(); this.buildContent();
      });
    this.scrollContainer.add([skBg, skTxt, skHit]);

    return y + h + 8;
  }

  // ======================== SCROLL ========================

  private setupScroll(): void {
    this.scene.input.on('pointerdown', (p: Phaser.Input.Pointer) => {
      if (!this.container.visible) return;
      const height = this.scene.scale.height;
      if (p.y > QuestPanel.CONTENT_TOP && p.y < height - UI.TAB_HEIGHT) {
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
    const viewH = height - QuestPanel.CONTENT_TOP - UI.TAB_HEIGHT;
    const minS = Math.min(0, viewH - this.contentHeight - 20);
    return Math.max(minS, Math.min(0, sy));
  }

  // ======================== PUBLIC API ========================

  setVisible(v: boolean): void { this.container.setVisible(v); }

  refresh(): void {
    this.buildSubTabs();
    this.buildContent();
  }
}
