// src/ui/HUD.ts
import Phaser from 'phaser';
import { gameState } from '../systems/GameState';
import { musicManager } from '../systems/MusicManager';
import { fmtN } from '../utils/helpers';
import { COLORS, UI } from '../utils/constants';

export class HUD {
  private scene: Phaser.Scene;
  private bg!: Phaser.GameObjects.Graphics;
  private coinsText!: Phaser.GameObjects.Text;
  private waterText!: Phaser.GameObjects.Text;
  private levelText!: Phaser.GameObjects.Text;
  private starsText!: Phaser.GameObjects.Text;
  private woodText!: Phaser.GameObjects.Text;
  private muteBtn!: Phaser.GameObjects.Text;
  private fsBtn!: Phaser.GameObjects.Text;
  private container!: Phaser.GameObjects.Container;

  // Previous values for flash detection
  private prevCoins = -1;
  private prevWater = -1;
  private prevStars = -1;
  private prevLevel = -1;
  private prevWood = -1;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    this.create();
  }

  private create(): void {
    const { width } = this.scene.scale;

    this.bg = this.scene.add.graphics();
    this.bg.fillGradientStyle(COLORS.brown, COLORS.brown, COLORS.brownDark, COLORS.brownDark, 1);
    this.bg.fillRect(0, 0, width, UI.HUD_HEIGHT);

    const style: Phaser.Types.GameObjects.Text.TextStyle = {
      fontSize: '12px',
      fontFamily: 'Arial, sans-serif',
      color: '#ffffff',
      fontStyle: 'bold',
    };

    const y = UI.HUD_HEIGHT / 2;
    // Reserve 52px on the right for mute + fullscreen buttons
    const btnAreaW = 52;
    const statsW = width - btnAreaW;
    const gap = statsW / 5;

    this.coinsText = this.scene.add.text(gap * 0.5, y, '', style).setOrigin(0.5);
    this.waterText = this.scene.add.text(gap * 1.5, y, '', style).setOrigin(0.5);
    this.woodText = this.scene.add.text(gap * 2.5, y, '', style).setOrigin(0.5);
    this.starsText = this.scene.add.text(gap * 3.5, y, '', style).setOrigin(0.5);
    this.levelText = this.scene.add.text(gap * 4.5, y, '', style).setOrigin(0.5);

    // Mute toggle button
    this.muteBtn = this.scene.add.text(width - 44, y, musicManager.enabled ? '\u{1F50A}' : '\u{1F507}', {
      fontSize: '18px',
    }).setOrigin(0.5).setInteractive({ useHandCursor: true })
      .on('pointerdown', () => {
        const on = musicManager.toggleMute();
        this.muteBtn.setText(on ? '\u{1F50A}' : '\u{1F507}');
      });

    // Fullscreen toggle button
    this.fsBtn = this.scene.add.text(width - 18, y, '\u26F6', {
      fontSize: '16px',
    }).setOrigin(0.5).setInteractive({ useHandCursor: true })
      .on('pointerdown', () => {
        if (!document.fullscreenElement) {
          document.documentElement.requestFullscreen().catch(() => {});
        } else {
          document.exitFullscreen();
        }
      });

    this.container = this.scene.add.container(0, 0, [
      this.bg, this.coinsText, this.waterText, this.woodText,
      this.starsText, this.levelText, this.muteBtn, this.fsBtn,
    ]);
    this.container.setDepth(100);

    this.update();
  }

  private flash(txt: Phaser.GameObjects.Text): void {
    this.scene.tweens.add({
      targets: txt,
      scaleX: 1.25, scaleY: 1.25,
      duration: 120,
      yoyo: true,
      ease: 'Power1',
    });
  }

  update(): void {
    const d = gameState.data;

    const coins = d.coins;
    const water = d.water;
    const wood = d.resources.bois || 0;
    const stars = d.stars;
    const level = d.level;

    this.coinsText.setText(`\u{1F4B0}${fmtN(coins)}`);
    this.waterText.setText(`\u{1F4A7}${fmtN(water)}/${fmtN(d.maxWater)}`);
    this.woodText.setText(`\u{1FAB5}${fmtN(wood)}`);
    this.starsText.setText(`\u2B50${fmtN(stars)}`);
    this.levelText.setText(`\u{1F3C5}Nv${level}`);

    // Flash changed values (skip first call when prev = -1)
    if (this.prevCoins >= 0 && coins !== this.prevCoins) this.flash(this.coinsText);
    if (this.prevWater >= 0 && water !== this.prevWater) this.flash(this.waterText);
    if (this.prevWood >= 0 && wood !== this.prevWood) this.flash(this.woodText);
    if (this.prevStars >= 0 && stars !== this.prevStars) this.flash(this.starsText);
    if (this.prevLevel >= 0 && level !== this.prevLevel) this.flash(this.levelText);

    this.prevCoins = coins;
    this.prevWater = water;
    this.prevWood = wood;
    this.prevStars = stars;
    this.prevLevel = level;
  }

  destroy(): void {
    this.container.destroy();
  }
}
