// src/scenes/WellWoodPanel.ts
// Pretty visual panel for Well & Wood matching the original game's UI:
// Big 4rem emoji, progress bars, accumulation display, styled buttons.
import Phaser from 'phaser';
import { gameState } from '../systems/GameState';
import { COLORS, UI, WELL_REPAIRS_NEEDED, WELL_TAP_AMOUNT, WELL_PASSIVE_AMOUNT, WELL_PASSIVE_INTERVAL, WOOD_REPAIRS_NEEDED, WOOD_TAP_AMOUNT, WOOD_PASSIVE_AMOUNT, WOOD_PASSIVE_INTERVAL } from '../utils/constants';
import { fmtN } from '../utils/helpers';
import { showFloatingText } from '../ui/FloatingText';
import { ScrollHelper } from '../ui/ScrollHelper';

export class WellWoodPanel {
  private scene: Phaser.Scene;
  private container!: Phaser.GameObjects.Container;
  private scrollContainer!: Phaser.GameObjects.Container;
  private contentHeight = 0;
  private scroller!: ScrollHelper;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    this.container = scene.add.container(0, 0);
    this.container.setDepth(10);
    this.container.setVisible(false);
    this.scrollContainer = scene.add.container(0, 0);
    this.container.add(this.scrollContainer);
    this.scroller = new ScrollHelper(scene,
      (sy) => this.clampScroll(sy),
      (sy) => this.scrollContainer.setY(UI.HUD_HEIGHT + 34 + sy),
    );
    this.setupScroll();
    this.refresh();
  }

  private setupScroll(): void {
    this.scene.input.on('pointerdown', (p: Phaser.Input.Pointer) => {
      if (!this.container.visible) return;
      const height = this.scene.scale.height;
      if (p.y > UI.HUD_HEIGHT + 34 && p.y < height - UI.TAB_HEIGHT) {
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
    const viewH = height - UI.HUD_HEIGHT - 34 - UI.TAB_HEIGHT;
    const minS = Math.min(0, viewH - this.contentHeight - 20);
    return Math.max(minS, Math.min(0, sy));
  }

  refresh(): void {
    this.container.removeAll(true);
    this.scrollContainer = this.scene.add.container(0, UI.HUD_HEIGHT + 34);
    this.container.add(this.scrollContainer);
    this.scroller.reset();

    const { width, height } = this.scene.scale;

    // Title
    const titleBg = this.scene.add.graphics();
    titleBg.fillStyle(COLORS.sky, 1);
    titleBg.fillRect(0, UI.HUD_HEIGHT, width, 30);
    const title = this.scene.add.text(width / 2, UI.HUD_HEIGHT + 15, '\u{1F4A7} Puits & Bois', {
      fontSize: '16px', fontFamily: 'Arial, sans-serif', color: '#4e342e', fontStyle: 'bold',
    }).setOrigin(0.5);
    this.container.add([titleBg, title]);

    let y = 8;
    y = this.renderWell(y);
    y = this.renderWoodSeparator(y);
    y = this.renderWood(y);

    this.contentHeight = y + 20;

    // Mask
    const maskG = this.scene.make.graphics({});
    maskG.fillRect(0, UI.HUD_HEIGHT + 34, width, height - UI.HUD_HEIGHT - 34 - UI.TAB_HEIGHT);
    this.scrollContainer.setMask(maskG.createGeometryMask());
  }

  // ====================================================================
  // ===                          WELL                                ===
  // ====================================================================
  private renderWell(y: number): number {
    const { width } = this.scene.scale;
    const cx = width / 2;
    const now = Date.now();

    if (!gameState.isWellOperational()) {
      // BROKEN STATE
      const repairs = gameState.data.wellRepairs;
      const pct = repairs / WELL_REPAIRS_NEEDED;

      // Big emoji
      const emoji = this.scene.add.text(cx, y + 30, '\u{1F573}\uFE0F', { fontSize: '48px' }).setOrigin(0.5);
      // Drop shadow effect
      emoji.setStyle({ ...emoji.style, shadow: { offsetX: 2, offsetY: 2, color: 'rgba(0,0,0,0.3)', blur: 4, fill: true } });

      const infoTxt = this.scene.add.text(cx, y + 66, 'Le puits est casse ! Repare-le !', {
        fontSize: '12px', fontFamily: 'Arial, sans-serif', color: '#5d4037', fontStyle: 'bold',
      }).setOrigin(0.5);

      // Progress bar
      const barW = width * 0.9;
      const barH = 18;
      const barX = (width - barW) / 2;
      const barY = y + 82;
      const barBg = this.scene.add.graphics();
      barBg.fillStyle(0x3e2723, 1);
      barBg.fillRoundedRect(barX, barY, barW, barH, barH / 2);
      const barFill = this.scene.add.graphics();
      barFill.fillStyle(0xd2691e, 1);
      barFill.fillRoundedRect(barX + 1, barY + 1, Math.max(0, (barW - 2) * pct), barH - 2, (barH - 2) / 2);

      const countTxt = this.scene.add.text(cx, barY + barH + 8, `${repairs}/${WELL_REPAIRS_NEEDED} reparations`, {
        fontSize: '10px', fontFamily: 'Arial, sans-serif', color: '#888',
      }).setOrigin(0.5);

      // Repair button (brown gradient style)
      const btnW = width * 0.7; const btnH = 40;
      const btnX = (width - btnW) / 2; const btnY = barY + barH + 24;
      const btnBg = this.scene.add.graphics();
      btnBg.fillStyle(0x8b4513, 1);
      btnBg.fillRoundedRect(btnX, btnY, btnW, btnH, 12);
      // Lighter inner
      const btnBg2 = this.scene.add.graphics();
      btnBg2.fillStyle(0xa0522d, 0.5);
      btnBg2.fillRoundedRect(btnX + 2, btnY + 2, btnW - 4, btnH / 2 - 2, 10);

      const btnTxt = this.scene.add.text(btnX + btnW / 2, btnY + btnH / 2, '\u{1F527} Reparer', {
        fontSize: '14px', fontFamily: 'Arial, sans-serif', color: '#ffffff', fontStyle: 'bold',
      }).setOrigin(0.5);
      const btnHit = this.scene.add.rectangle(btnX + btnW / 2, btnY + btnH / 2, btnW, btnH, 0, 0)
        .setInteractive({ useHandCursor: true })
        .on('pointerdown', () => {
          gameState.data.wellRepairs++;
          showFloatingText(this.scene, cx, btnY, `\u{1F527} ${gameState.data.wellRepairs}/${WELL_REPAIRS_NEEDED}`);
          gameState.emit(); this.refresh();
        });

      this.scrollContainer.add([emoji, infoTxt, barBg, barFill, countTxt, btnBg, btnBg2, btnTxt, btnHit]);
      return btnY + btnH + 16;
    }

    // OPERATIONAL STATE
    // Big emoji (clickable for +TAP water)
    const emoji = this.scene.add.text(cx, y + 30, '\u{1F4A7}', { fontSize: '48px' }).setOrigin(0.5);

    const tapHit = this.scene.add.rectangle(cx, y + 30, 80, 80, 0, 0)
      .setInteractive({ useHandCursor: true })
      .on('pointerdown', () => {
        gameState.data.water += WELL_TAP_AMOUNT;
        showFloatingText(this.scene, cx, y + 10, `+${WELL_TAP_AMOUNT}\u{1F4A7}`);
        // Bounce animation
        this.scene.tweens.add({ targets: emoji, scaleX: 1.2, scaleY: 1.2, duration: 100, yoyo: true, ease: 'Bounce' });
        gameState.emit();
      });

    const opTxt = this.scene.add.text(cx, y + 66, `Puits operationnel \u2014 Touche le puits pour +${WELL_TAP_AMOUNT}\u{1F4A7}`, {
      fontSize: '10px', fontFamily: 'Arial, sans-serif', color: '#5d4037',
    }).setOrigin(0.5);

    // Current water display
    const waterTxt = this.scene.add.text(cx, y + 86, `\u{1F4A7} Ton eau: ${gameState.data.water}/${gameState.data.maxWater}`, {
      fontSize: '12px', fontFamily: 'Arial, sans-serif', color: '#333',
    }).setOrigin(0.5);

    // Accumulated water (big blue)
    const accum = gameState.data.wellWater;
    const accumTxt = this.scene.add.text(cx, y + 110, `\u{1F4A7} ${accum} eau accumulee`, {
      fontSize: '18px', fontFamily: 'Arial, sans-serif', color: '#2196F3', fontStyle: 'bold',
    }).setOrigin(0.5);

    // Timer for next passive generation
    const lastTick = gameState.data.lastWellTick || now;
    const elapsed = now - lastTick;
    const nextIn = Math.max(0, Math.ceil((WELL_PASSIVE_INTERVAL - elapsed) / 1000));
    const statusTxt = this.scene.add.text(cx, y + 132, `\u{1F4A7} +${WELL_PASSIVE_AMOUNT} eau toutes les ${WELL_PASSIVE_INTERVAL / 1000}s (prochain dans ${nextIn}s)`, {
      fontSize: '11px', fontFamily: 'Arial, sans-serif', color: '#888',
    }).setOrigin(0.5);

    this.scrollContainer.add([emoji, tapHit, opTxt, waterTxt, accumTxt, statusTxt]);

    // Collect button (blue, pulsing)
    let btnBottom = y + 146;
    if (accum > 0) {
      const btnW = width * 0.8; const btnH = 42;
      const btnX = (width - btnW) / 2; const btnY = y + 146;
      const btnBg = this.scene.add.graphics();
      btnBg.fillStyle(0x2196f3, 1);
      btnBg.fillRoundedRect(btnX, btnY, btnW, btnH, 12);
      const btnBg2 = this.scene.add.graphics();
      btnBg2.fillStyle(0x42a5f5, 0.5);
      btnBg2.fillRoundedRect(btnX + 2, btnY + 2, btnW - 4, btnH / 2 - 2, 10);

      const btnTxt = this.scene.add.text(btnX + btnW / 2, btnY + btnH / 2, `\u{1F4A7} Recuperer l'eau (${accum})`, {
        fontSize: '13px', fontFamily: 'Arial, sans-serif', color: '#fff', fontStyle: 'bold',
      }).setOrigin(0.5);

      // Pulse animation on the button group
      this.scene.tweens.add({
        targets: [btnBg, btnBg2, btnTxt],
        alpha: { from: 1, to: 0.85 },
        duration: 800,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut',
      });

      const btnHit = this.scene.add.rectangle(btnX + btnW / 2, btnY + btnH / 2, btnW, btnH, 0, 0)
        .setInteractive({ useHandCursor: true })
        .on('pointerdown', () => {
          const amt = gameState.data.wellWater;
          gameState.data.water += amt;
          gameState.data.wellWater = 0;
          showFloatingText(this.scene, cx, btnY, `+${amt}\u{1F4A7}`);
          gameState.emit(); this.refresh();
        });
      this.scrollContainer.add([btnBg, btnBg2, btnTxt, btnHit]);
      btnBottom = btnY + btnH + 8;
    }

    return btnBottom;
  }

  // ========== SEPARATOR ==========
  private renderWoodSeparator(y: number): number {
    const { width } = this.scene.scale;
    const sepY = y + 10;
    const g = this.scene.add.graphics();
    g.lineStyle(2, 0x000000, 0.15);
    for (let x = 20; x < width - 20; x += 10) {
      g.lineBetween(x, sepY, x + 5, sepY);
    }
    this.scrollContainer.add(g);
    return sepY + 16;
  }

  // ====================================================================
  // ===                          WOOD                                ===
  // ====================================================================
  private renderWood(y: number): number {
    const { width } = this.scene.scale;
    const cx = width / 2;
    const now = Date.now();

    if (!gameState.isWoodOperational()) {
      const repairs = gameState.data.woodRepairs;
      const pct = repairs / WOOD_REPAIRS_NEEDED;

      const emoji = this.scene.add.text(cx, y + 30, '\u{1FAB5}', { fontSize: '48px' }).setOrigin(0.5);
      const infoTxt = this.scene.add.text(cx, y + 66, 'Le tronc est abime ! Repare-le !', {
        fontSize: '12px', fontFamily: 'Arial, sans-serif', color: '#5d4037', fontStyle: 'bold',
      }).setOrigin(0.5);

      const barW = width * 0.9; const barH = 18;
      const barX = (width - barW) / 2; const barY = y + 82;
      const barBg = this.scene.add.graphics();
      barBg.fillStyle(0x3e2723, 1); barBg.fillRoundedRect(barX, barY, barW, barH, barH / 2);
      const barFill = this.scene.add.graphics();
      barFill.fillStyle(0xd2691e, 1);
      barFill.fillRoundedRect(barX + 1, barY + 1, Math.max(0, (barW - 2) * pct), barH - 2, (barH - 2) / 2);

      const countTxt = this.scene.add.text(cx, barY + barH + 8, `${repairs}/${WOOD_REPAIRS_NEEDED} reparations`, {
        fontSize: '10px', fontFamily: 'Arial, sans-serif', color: '#888',
      }).setOrigin(0.5);

      const btnW = width * 0.7; const btnH = 40;
      const btnX = (width - btnW) / 2; const btnY = barY + barH + 24;
      const btnBg = this.scene.add.graphics();
      btnBg.fillStyle(0x8b4513, 1); btnBg.fillRoundedRect(btnX, btnY, btnW, btnH, 12);
      const btnBg2 = this.scene.add.graphics();
      btnBg2.fillStyle(0xa0522d, 0.5); btnBg2.fillRoundedRect(btnX + 2, btnY + 2, btnW - 4, btnH / 2 - 2, 10);
      const btnTxt = this.scene.add.text(btnX + btnW / 2, btnY + btnH / 2, '\u{1F527} Reparer', {
        fontSize: '14px', fontFamily: 'Arial, sans-serif', color: '#fff', fontStyle: 'bold',
      }).setOrigin(0.5);
      const btnHit = this.scene.add.rectangle(btnX + btnW / 2, btnY + btnH / 2, btnW, btnH, 0, 0)
        .setInteractive({ useHandCursor: true })
        .on('pointerdown', () => {
          gameState.data.woodRepairs++;
          showFloatingText(this.scene, cx, btnY, `\u{1F527} ${gameState.data.woodRepairs}/${WOOD_REPAIRS_NEEDED}`);
          gameState.emit(); this.refresh();
        });

      this.scrollContainer.add([emoji, infoTxt, barBg, barFill, countTxt, btnBg, btnBg2, btnTxt, btnHit]);
      return btnY + btnH + 16;
    }

    // OPERATIONAL
    const emoji = this.scene.add.text(cx, y + 30, '\u{1FA93}', { fontSize: '48px' }).setOrigin(0.5);
    const tapHit = this.scene.add.rectangle(cx, y + 30, 80, 80, 0, 0)
      .setInteractive({ useHandCursor: true })
      .on('pointerdown', () => {
        gameState.addResource('bois', WOOD_TAP_AMOUNT);
        showFloatingText(this.scene, cx, y + 10, `+${WOOD_TAP_AMOUNT}\u{1FAB5}`);
        this.scene.tweens.add({ targets: emoji, scaleX: 1.2, scaleY: 1.2, duration: 100, yoyo: true, ease: 'Bounce' });
        gameState.emit();
      });

    const opTxt = this.scene.add.text(cx, y + 66, `Tronc operationnel \u2014 Touche le tronc pour +${WOOD_TAP_AMOUNT}\u{1FAB5}`, {
      fontSize: '10px', fontFamily: 'Arial, sans-serif', color: '#5d4037',
    }).setOrigin(0.5);

    const woodAmt = gameState.getResource('bois');
    const woodTxt = this.scene.add.text(cx, y + 86, `\u{1FAB5} Ton bois: ${woodAmt}`, {
      fontSize: '12px', fontFamily: 'Arial, sans-serif', color: '#333',
    }).setOrigin(0.5);

    const accum = gameState.data.woodStock;
    const accumTxt = this.scene.add.text(cx, y + 110, `\u{1FAB5} ${accum} bois accumule`, {
      fontSize: '18px', fontFamily: 'Arial, sans-serif', color: '#2196F3', fontStyle: 'bold',
    }).setOrigin(0.5);

    const lastTick = gameState.data.lastWoodTick || now;
    const elapsed = now - lastTick;
    const nextIn = Math.max(0, Math.ceil((WOOD_PASSIVE_INTERVAL - elapsed) / 1000));
    const statusTxt = this.scene.add.text(cx, y + 132, `\u{1FAB5} +${WOOD_PASSIVE_AMOUNT} bois toutes les ${WOOD_PASSIVE_INTERVAL / 1000}s (prochain dans ${nextIn}s)`, {
      fontSize: '11px', fontFamily: 'Arial, sans-serif', color: '#888',
    }).setOrigin(0.5);

    this.scrollContainer.add([emoji, tapHit, opTxt, woodTxt, accumTxt, statusTxt]);

    let btnBottom = y + 146;
    if (accum > 0) {
      const btnW = width * 0.8; const btnH = 42;
      const btnX = (width - btnW) / 2; const btnY = y + 146;
      const btnBg = this.scene.add.graphics();
      btnBg.fillStyle(0x8b4513, 1); btnBg.fillRoundedRect(btnX, btnY, btnW, btnH, 12);
      const btnBg2 = this.scene.add.graphics();
      btnBg2.fillStyle(0xd2691e, 0.5); btnBg2.fillRoundedRect(btnX + 2, btnY + 2, btnW - 4, btnH / 2 - 2, 10);
      const btnTxt = this.scene.add.text(btnX + btnW / 2, btnY + btnH / 2, `\u{1FAB5} Recuperer le bois (${accum})`, {
        fontSize: '13px', fontFamily: 'Arial, sans-serif', color: '#fff', fontStyle: 'bold',
      }).setOrigin(0.5);

      this.scene.tweens.add({
        targets: [btnBg, btnBg2, btnTxt],
        alpha: { from: 1, to: 0.85 },
        duration: 800, yoyo: true, repeat: -1, ease: 'Sine.easeInOut',
      });

      const btnHit = this.scene.add.rectangle(btnX + btnW / 2, btnY + btnH / 2, btnW, btnH, 0, 0)
        .setInteractive({ useHandCursor: true })
        .on('pointerdown', () => {
          const amt = gameState.data.woodStock;
          gameState.addResource('bois', amt); gameState.data.woodStock = 0;
          showFloatingText(this.scene, cx, btnY, `+${amt}\u{1FAB5}`);
          gameState.emit(); this.refresh();
        });
      this.scrollContainer.add([btnBg, btnBg2, btnTxt, btnHit]);
      btnBottom = btnY + btnH + 8;
    }

    return btnBottom;
  }

  setVisible(visible: boolean): void { this.container.setVisible(visible); }
}
