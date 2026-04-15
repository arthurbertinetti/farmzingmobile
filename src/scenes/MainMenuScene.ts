// src/scenes/MainMenuScene.ts
import Phaser from 'phaser';
import { gameState } from '../systems/GameState';
import { COLORS } from '../utils/constants';
import { SAVE_KEY } from '../utils/constants';

export class MainMenuScene extends Phaser.Scene {
  constructor() {
    super({ key: 'MainMenuScene' });
  }

  create(): void {
    const { width, height } = this.scale;

    // Sky background
    this.cameras.main.setBackgroundColor(COLORS.sky);

    // Title
    this.add.text(width / 2, height * 0.2, '\u{1F33E}', { fontSize: '64px' })
      .setOrigin(0.5);
    this.add.text(width / 2, height * 0.32, 'FarmZing', {
      fontSize: '36px',
      fontFamily: 'Arial, sans-serif',
      color: '#4e342e',
      fontStyle: 'bold',
    }).setOrigin(0.5);

    // Subtitle
    this.add.text(width / 2, height * 0.40, 'Plante, arrose, recolte et agrandis ta ferme !', {
      fontSize: '14px',
      fontFamily: 'Arial, sans-serif',
      color: '#5d4037',
      align: 'center',
      wordWrap: { width: width * 0.8 },
    }).setOrigin(0.5);

    // Instructions
    const instructions = [
      '\u{1F331} Cultures (3\u{1F4A7}) \u00B7 \u{1F333} Arbres (4\u{1F4A7})',
      'Choisis un objet, touche une parcelle, puis arrose !',
      'Attention au loyer mensuel \u{1F3E0}',
    ];
    this.add.text(width / 2, height * 0.52, instructions.join('\n'), {
      fontSize: '12px',
      fontFamily: 'Arial, sans-serif',
      color: '#666666',
      align: 'center',
      lineSpacing: 6,
      wordWrap: { width: width * 0.85 },
    }).setOrigin(0.5);

    // Start button
    const hasSave = !!localStorage.getItem(SAVE_KEY);
    const btnText = hasSave ? '\u{1F69C} Continuer' : '\u{1F69C} Commencer';

    const btn = this.add.rectangle(width / 2, height * 0.7, 200, 50, COLORS.green, 1)
      .setInteractive({ useHandCursor: true })
      .on('pointerdown', () => this.startGame())
      .on('pointerover', () => btn.setFillStyle(COLORS.greenDark))
      .on('pointerout', () => btn.setFillStyle(COLORS.green));

    // Round corners via graphics
    const g = this.add.graphics();
    g.fillStyle(COLORS.green, 1);
    g.fillRoundedRect(width / 2 - 100, height * 0.7 - 25, 200, 50, 12);
    g.setInteractive(
      new Phaser.Geom.Rectangle(width / 2 - 100, height * 0.7 - 25, 200, 50),
      Phaser.Geom.Rectangle.Contains
    );
    g.on('pointerdown', () => this.startGame());
    btn.setVisible(false); // hide the plain rect, use the graphics

    this.add.text(width / 2, height * 0.7, btnText, {
      fontSize: '18px',
      fontFamily: 'Arial, sans-serif',
      color: '#ffffff',
      fontStyle: 'bold',
    }).setOrigin(0.5);

    // Auto-start if save exists
    // (we still show the menu, user clicks to continue)
  }

  private startGame(): void {
    // Load save if exists
    gameState.load();
    // Process offline progress since last save
    gameState.processOffline();
    // Ensure quests & trades are generated
    gameState.generateQuests();
    gameState.generateTrades();
    gameState.ensureGardenGrid();
    this.scene.start('GameScene');
  }
}
