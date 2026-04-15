// src/scenes/MiniGamePanel.ts
// Mini-game panel: menu grid, level selector, and 10 game engines
import Phaser from 'phaser';
import { gameState } from '../systems/GameState';
import { COLORS, UI } from '../utils/constants';
import { fmtN } from '../utils/helpers';
import {
  MG_GAMES, MG_MAX_LEVEL, MiniGameDef,
  lightsOutParams, memoryParams, MEMORY_EMOJIS,
  SIMON_COLORS, simonParams,
  taquinParams, FL_COLORS, floodParams,
  snakeParams, mazeParams, minesweeperParams,
  CP_COLORS, patternParams, game2048Params,
} from '../data/minigames';
import { shuffle } from '../utils/helpers';
import { ScrollHelper } from '../ui/ScrollHelper';

const DRAG_THRESHOLD = 8;

type MgView = 'menu' | 'levels' | 'game' | 'rules';

export class MiniGamePanel {
  private scene: Phaser.Scene;
  private container!: Phaser.GameObjects.Container;
  private scrollContainer!: Phaser.GameObjects.Container;
  private contentMask!: Phaser.Display.Masks.GeometryMask;

  private view: MgView = 'menu';
  private selectedGame: MiniGameDef | null = null;
  private playingLevel = 1;

  // Scroll state
  private maxScroll = 0;
  private scroller!: ScrollHelper;
  private dragStartPointer = { x: 0, y: 0 };

  // Game-specific state
  private gameState: any = {};
  private gameTimers: Phaser.Time.TimerEvent[] = [];
  private gameUpdateFn: (() => void) | null = null;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    this.create();
  }

  private get panelY(): number { return UI.HUD_HEIGHT; }
  private get panelH(): number { return this.scene.scale.height - UI.HUD_HEIGHT - UI.TAB_HEIGHT; }
  private get panelW(): number { return this.scene.scale.width; }

  private create(): void {
    this.container = this.scene.add.container(0, 0);
    this.container.setDepth(10);
    this.container.setVisible(false);

    // Mask for scrollable area
    const maskShape = this.scene.make.graphics({ x: 0, y: 0 });
    maskShape.fillRect(0, this.panelY, this.panelW, this.panelH);
    this.contentMask = maskShape.createGeometryMask();

    this.scrollContainer = this.scene.add.container(0, 0);
    this.scrollContainer.setMask(this.contentMask);
    this.container.add(this.scrollContainer);

    // ScrollHelper with inverted direction (positive scrollY = scroll down = container goes up)
    this.scroller = new ScrollHelper(this.scene,
      (sy) => {
        // Invert: ScrollHelper gives negative values for scroll down, we need positive
        const inverted = -sy;
        return -Math.max(0, Math.min(this.maxScroll, inverted));
      },
      (sy) => {
        this.scrollContainer.y = sy;
      },
    );

    // Scroll input
    this.scene.input.on('pointerdown', (p: Phaser.Input.Pointer) => {
      if (!this.container.visible) return;
      if (p.y < this.panelY || p.y > this.panelY + this.panelH) return;
      this.dragStartPointer = { x: p.x, y: p.y };
      this.scroller.onDragStart(p.y);
    });

    this.scene.input.on('pointermove', (p: Phaser.Input.Pointer) => {
      if (!this.container.visible || !p.isDown) return;
      this.scroller.onDragMove(p.y);
    });

    this.scene.input.on('pointerup', () => { this.scroller.onDragEnd(); });

    this.refresh();
  }

  setVisible(v: boolean): void {
    this.container.setVisible(v);
  }

  refresh(): void {
    this.clearTimers();
    this.gameUpdateFn = null;
    this.scrollContainer.removeAll(true);
    this.scroller.reset();
    this.scrollContainer.y = 0;

    const bg = this.scene.add.graphics();
    bg.fillStyle(COLORS.panelBg, 1);
    bg.fillRect(0, this.panelY, this.panelW, this.panelH + 2000);
    this.scrollContainer.add(bg);

    if (this.view === 'menu') this.renderMenu();
    else if (this.view === 'levels') this.renderLevelSelector();
    else if (this.view === 'rules') this.renderRules();
    else if (this.view === 'game') this.renderGame();
  }

  updateVisuals(): void {
    if (this.gameUpdateFn) this.gameUpdateFn();
  }

  // ==============================
  //   MENU VIEW (10 game cards)
  // ==============================

  private renderMenu(): void {
    let y = this.panelY + 8;
    const w = this.panelW;

    // Title
    this.addText(w / 2, y, '\u{1F3AE} Mini-Jeux', 16, '#333', 'bold').setOrigin(0.5, 0);
    y += 28;

    // 2-column grid of game buttons
    const colW = (w - 24) / 2;
    const cardH = 60;
    const gap = 8;

    for (let i = 0; i < MG_GAMES.length; i++) {
      const game = MG_GAMES[i];
      const col = i % 2;
      const row = Math.floor(i / 2);
      const cx = 8 + col * (colW + gap);
      const cy = y + row * (cardH + gap);
      const lv = gameState.getMgLevel(game.stateKey);
      const lvText = lv > MG_MAX_LEVEL ? 'MAX' : `Niv.${lv}/${MG_MAX_LEVEL}`;

      const card = this.scene.add.graphics();
      card.fillStyle(0xffffff, 1);
      card.fillRoundedRect(cx, cy, colW, cardH, 8);
      card.lineStyle(2, 0xcccccc, 1);
      card.strokeRoundedRect(cx, cy, colW, cardH, 8);
      this.scrollContainer.add(card);

      this.addText(cx + colW / 2, cy + 12, `${game.emoji} ${game.label}`, 12, '#333', 'bold').setOrigin(0.5, 0);
      this.addText(cx + colW / 2, cy + 32, lvText, 10, lv > MG_MAX_LEVEL ? '#4caf50' : '#666').setOrigin(0.5, 0);

      // Hit area
      const hit = this.scene.add.rectangle(cx + colW / 2, cy + cardH / 2, colW, cardH, 0x000000, 0)
        .setInteractive({ useHandCursor: true });
      this.scrollContainer.add(hit);
      hit.on('pointerup', (ptr: Phaser.Input.Pointer) => {
        if (Math.abs(ptr.y - this.dragStartPointer.y) > DRAG_THRESHOLD) return;
        this.selectedGame = game;
        this.view = 'levels';
        this.refresh();
      });
    }

    const totalH = Math.ceil(MG_GAMES.length / 2) * (cardH + gap) + 50;
    const rulesY = y + Math.ceil(MG_GAMES.length / 2) * (cardH + gap) + 8;

    // Rules button
    const rBtnW = w - 24; const rBtnH = 36;
    const rBg = this.scene.add.graphics();
    rBg.fillStyle(0xffffff, 1);
    rBg.fillRoundedRect(12, rulesY, rBtnW, rBtnH, 8);
    rBg.lineStyle(2, 0xcccccc, 1);
    rBg.strokeRoundedRect(12, rulesY, rBtnW, rBtnH, 8);
    this.scrollContainer.add(rBg);
    this.addText(w / 2, rulesY + rBtnH / 2, '\u{1F4D6} Regles des Mini-Jeux', 13, '#5d4037', 'bold').setOrigin(0.5);
    const rHit = this.scene.add.rectangle(w / 2, rulesY + rBtnH / 2, rBtnW, rBtnH, 0, 0)
      .setInteractive({ useHandCursor: true });
    this.scrollContainer.add(rHit);
    rHit.on('pointerup', (ptr: Phaser.Input.Pointer) => {
      if (Math.abs(ptr.y - this.dragStartPointer.y) > DRAG_THRESHOLD) return;
      this.view = 'rules';
      this.refresh();
    });

    this.maxScroll = Math.max(0, rulesY + rBtnH + 20 - this.panelY - this.panelH);
  }

  // ==============================
  //   RULES VIEW
  // ==============================

  private renderRules(): void {
    let y = this.panelY + 8;
    const w = this.panelW;

    // Back button
    this.addButton(8, y, 70, 28, '\u2190 Retour', () => {
      this.view = 'menu';
      this.refresh();
    });

    this.addText(w / 2, y + 4, '\u{1F4D6} Regles des Mini-Jeux', 16, '#333', 'bold').setOrigin(0.5, 0);
    y += 44;

    const rules: { emoji: string; name: string; desc: string }[] = [
      { emoji: '\u{1F526}', name: 'Lights Out', desc: 'Eteindre toutes les lumieres. Toucher une case change son etat et les 4 adjacentes.\n100 niveaux \u2014 grilles de 3\u00D73 a 8\u00D78. +1\u2B50/niveau.' },
      { emoji: '\u{1F9E0}', name: 'Memoire', desc: 'Retrouver les paires de cartes identiques.\n100 niveaux, grilles de 2\u00D72 a 6\u00D75. +1\u2B50/niveau.' },
      { emoji: '\u{1F3B5}', name: 'Simon', desc: 'Reproduire la sequence de couleurs montree.\n100 niveaux, sequences de 3 a 102. +1\u2B50/niveau.' },
      { emoji: '\u{1F9E9}', name: 'Taquin', desc: 'Remettre les numeros dans l\'ordre en glissant les tuiles.\n100 niveaux, 3\u00D73 a 7\u00D77. +1\u2B50/niveau.' },
      { emoji: '\u{1F3A8}', name: 'Flood', desc: 'Remplir la grille d\'une seule couleur en nombre limite de coups.\n100 niveaux. +1\u2B50/niveau.' },
      { emoji: '\u{1F40D}', name: 'Snake', desc: 'Diriger le serpent pour manger les pommes. Ne toucher ni les murs ni son corps!\n100 niveaux. +1\u2B50/niveau.' },
      { emoji: '\u{1F3C1}', name: 'Labyrinthe', desc: 'Trouver la sortie (case rouge) du labyrinthe. Toucher les cases adjacentes pour se deplacer.\n100 niveaux. +1\u2B50/niveau.' },
      { emoji: '\u{1F4A3}', name: 'Demineur', desc: 'Revelez toutes les cases sans mines! Les chiffres indiquent combien de mines sont adjacentes. Utilisez les drapeaux pour marquer les mines.\n100 niveaux. +1\u2B50/niveau.' },
      { emoji: '\u{1F3AF}', name: 'Pattern', desc: 'Un motif colore est montre brievement. Reproduisez-le de memoire! Toucher pour changer la couleur.\n100 niveaux. +1\u2B50/niveau.' },
      { emoji: '\u{1F522}', name: '2048', desc: 'Glissez les tuiles pour fusionner les nombres identiques. Atteignez l\'objectif!\n100 niveaux. +1\u2B50/niveau.' },
    ];

    for (let i = 0; i < rules.length; i++) {
      const r = rules[i];
      // Title
      this.addText(16, y, `${r.emoji} ${r.name}`, 15, '#333', 'bold');
      y += 24;

      // Description with word wrap
      const descTxt = this.scene.add.text(16, y, r.desc, {
        fontSize: '13px', fontFamily: 'Arial, sans-serif', color: '#555',
        wordWrap: { width: w - 32 },
      });
      this.scrollContainer.add(descTxt);
      y += descTxt.height + 8;

      // Separator
      if (i < rules.length - 1) {
        const sep = this.scene.add.graphics();
        sep.lineStyle(1, 0x000000, 0.1);
        sep.lineBetween(16, y, w - 16, y);
        this.scrollContainer.add(sep);
        y += 10;
      }
    }

    this.maxScroll = Math.max(0, y + 20 - this.panelY - this.panelH);
  }

  // ==============================
  //   LEVEL SELECTOR (100 levels)
  // ==============================

  private renderLevelSelector(): void {
    if (!this.selectedGame) return;
    let y = this.panelY + 8;
    const w = this.panelW;
    const game = this.selectedGame;
    const curLv = gameState.getMgLevel(game.stateKey);

    // Back button
    this.addButton(8, y, 70, 28, '\u2190 Retour', () => {
      this.view = 'menu';
      this.selectedGame = null;
      this.refresh();
    });

    this.addText(w / 2, y + 4, `${game.emoji} ${game.label}`, 14, '#333', 'bold').setOrigin(0.5, 0);
    y += 40;

    // Level grid: 5 columns
    const cols = 5;
    const gap = 4;
    const btnSize = Math.floor((w - 16 - gap * (cols - 1)) / cols);

    for (let lv = 1; lv <= MG_MAX_LEVEL; lv++) {
      const col = (lv - 1) % cols;
      const row = Math.floor((lv - 1) / cols);
      const bx = 8 + col * (btnSize + gap);
      const by = y + row * (btnSize + gap);

      let bgColor: number, textColor: string;
      const isDone = lv < curLv;
      const isCurrent = lv === curLv;
      const isLocked = lv > curLv;

      if (isDone) { bgColor = 0x4caf50; textColor = '#fff'; }
      else if (isCurrent) { bgColor = 0xff9800; textColor = '#fff'; }
      else { bgColor = 0xcccccc; textColor = '#999'; }

      const card = this.scene.add.graphics();
      card.fillStyle(bgColor, 1);
      card.fillRoundedRect(bx, by, btnSize, btnSize, 4);
      if (isCurrent) {
        card.lineStyle(2, 0xff5722, 1);
        card.strokeRoundedRect(bx, by, btnSize, btnSize, 4);
      }
      this.scrollContainer.add(card);

      const label = isDone ? `\u2713${lv}` : `${lv}`;
      this.addText(bx + btnSize / 2, by + btnSize / 2, label, 10, textColor, 'bold').setOrigin(0.5);

      if (!isLocked) {
        const hit = this.scene.add.rectangle(bx + btnSize / 2, by + btnSize / 2, btnSize, btnSize, 0x000000, 0)
          .setInteractive({ useHandCursor: true });
        this.scrollContainer.add(hit);
        hit.on('pointerup', (ptr: Phaser.Input.Pointer) => {
          if (Math.abs(ptr.y - this.dragStartPointer.y) > DRAG_THRESHOLD) return;
          this.playingLevel = lv;
          this.view = 'game';
          this.refresh();
        });
      }
    }

    const totalRows = Math.ceil(MG_MAX_LEVEL / cols);
    this.maxScroll = Math.max(0, y + totalRows * (btnSize + gap) + 20 - this.panelY - this.panelH);
  }

  // ==============================
  //   GAME VIEW
  // ==============================

  private renderGame(): void {
    if (!this.selectedGame) return;
    const game = this.selectedGame;
    let y = this.panelY + 8;
    const w = this.panelW;

    // Back button
    this.addButton(8, y, 70, 28, '\u2190 Retour', () => {
      this.view = 'levels';
      this.clearTimers();
      this.gameUpdateFn = null;
      this.refresh();
    });

    this.addText(w / 2, y + 4, `${game.emoji} Niv.${this.playingLevel}`, 13, '#333', 'bold').setOrigin(0.5, 0);
    y += 40;

    switch (game.key) {
      case 'lightsout': this.initLightsOut(y); break;
      case 'memory': this.initMemory(y); break;
      case 'simon': this.initSimon(y); break;
      case 'taquin': this.initTaquin(y); break;
      case 'flood': this.initFlood(y); break;
      case 'snake': this.initSnake(y); break;
      case 'maze': this.initMaze(y); break;
      case 'minesweeper': this.initMinesweeper(y); break;
      case 'pattern': this.initPattern(y); break;
      case '2048': this.init2048(y); break;
    }

    this.maxScroll = 0; // games shouldn't scroll
  }

  // ========================== LIGHTS OUT ==========================

  private initLightsOut(startY: number): void {
    const lv = this.playingLevel;
    const { size, scramble } = lightsOutParams(lv);
    const grid: number[][] = [];
    for (let r = 0; r < size; r++) grid.push(new Array(size).fill(0));

    // Scramble by toggling random cells
    for (let s = 0; s < scramble; s++) {
      const r = Math.floor(Math.random() * size);
      const c = Math.floor(Math.random() * size);
      this.loToggle(grid, r, c, size);
    }

    const w = this.panelW;
    const gap = 2;
    const availH = this.panelH - (startY - this.panelY) - 30;
    const cellSize = Math.floor(Math.min((w - 16 - gap * (size - 1)) / size, (availH - gap * (size - 1)) / size));
    const gridW = size * cellSize + (size - 1) * gap;
    const ox = (w - gridW) / 2;
    let y = startY;

    const infoText = this.addText(w / 2, y, `Grille ${size}x${size} - Eteins tout!`, 12, '#666').setOrigin(0.5, 0);
    y += 24;

    const drawGrid = () => {
      // Remove old cells
      const toRemove = this.scrollContainer.list.filter((o: any) => o.getData?.('loCell'));
      toRemove.forEach((o: any) => o.destroy());

      for (let r = 0; r < size; r++) {
        for (let c = 0; c < size; c++) {
          const cx = ox + c * (cellSize + gap);
          const cy = y + r * (cellSize + gap);
          const isOn = grid[r][c] === 1;
          const cell = this.scene.add.graphics();
          cell.fillStyle(isOn ? 0xf1c40f : 0x555555, 1);
          cell.fillRoundedRect(cx, cy, cellSize, cellSize, 3);
          cell.setData('loCell', true);
          this.scrollContainer.add(cell);

          const hit = this.scene.add.rectangle(cx + cellSize / 2, cy + cellSize / 2, cellSize, cellSize, 0x000000, 0)
            .setInteractive({ useHandCursor: true })
            .setData('loCell', true);
          this.scrollContainer.add(hit);
          hit.on('pointerup', (ptr: Phaser.Input.Pointer) => {
            if (Math.abs(ptr.y - this.dragStartPointer.y) > DRAG_THRESHOLD) return;
            this.loToggle(grid, r, c, size);
            drawGrid();
            // Check win
            if (grid.every(row => row.every(v => v === 0))) {
              this.onMgWin();
            }
          });
        }
      }
    };

    drawGrid();
  }

  private loToggle(grid: number[][], r: number, c: number, size: number): void {
    grid[r][c] ^= 1;
    if (r > 0) grid[r - 1][c] ^= 1;
    if (r < size - 1) grid[r + 1][c] ^= 1;
    if (c > 0) grid[r][c - 1] ^= 1;
    if (c < size - 1) grid[r][c + 1] ^= 1;
  }

  // ========================== MEMORY ==========================

  private initMemory(startY: number): void {
    const lv = this.playingLevel;
    const { cols, rows, pairs, hasJoker } = memoryParams(lv);
    const w = this.panelW;

    // Build card array
    const emojis = shuffle(MEMORY_EMOJIS.slice()).slice(0, pairs);
    let cards = [...emojis, ...emojis];
    if (hasJoker) cards.push('\u2B50');
    cards = shuffle(cards);

    const revealed: boolean[] = new Array(cards.length).fill(false);
    const matched: boolean[] = new Array(cards.length).fill(false);
    if (hasJoker) {
      const jokerIdx = cards.indexOf('\u2B50');
      revealed[jokerIdx] = true;
      matched[jokerIdx] = true;
    }
    let flipped: number[] = [];
    let locked = false;

    const gap = 2;
    const availH = this.panelH - (startY - this.panelY) - 30;
    const cellSize = Math.floor(Math.min((w - 16 - gap * (cols - 1)) / cols, (availH - gap * (rows - 1)) / rows));
    const gridW = cols * cellSize + (cols - 1) * gap;
    const ox = (w - gridW) / 2;
    let y = startY;

    this.addText(w / 2, y, `${cols}x${rows} - ${pairs} paires`, 12, '#666').setOrigin(0.5, 0);
    y += 22;

    const drawCards = () => {
      const toRemove = this.scrollContainer.list.filter((o: any) => o.getData?.('mmCard'));
      toRemove.forEach((o: any) => o.destroy());

      for (let i = 0; i < cards.length; i++) {
        const col = i % cols;
        const row = Math.floor(i / cols);
        const cx = ox + col * (cellSize + gap);
        const cy = y + row * (cellSize + gap);

        const show = revealed[i] || matched[i];
        const card = this.scene.add.graphics();
        card.fillStyle(matched[i] ? 0x81c784 : show ? 0xffffff : 0x3498db, 1);
        card.fillRoundedRect(cx, cy, cellSize, cellSize, 3);
        card.setData('mmCard', true);
        this.scrollContainer.add(card);

        if (show) {
          const t = this.addText(cx + cellSize / 2, cy + cellSize / 2, cards[i], Math.min(cellSize - 6, 20), '#333');
          t.setOrigin(0.5).setData('mmCard', true);
        }

        if (!matched[i] && !revealed[i]) {
          const hit = this.scene.add.rectangle(cx + cellSize / 2, cy + cellSize / 2, cellSize, cellSize, 0, 0)
            .setInteractive({ useHandCursor: true }).setData('mmCard', true);
          this.scrollContainer.add(hit);
          hit.on('pointerup', (ptr: Phaser.Input.Pointer) => {
            if (locked || Math.abs(ptr.y - this.dragStartPointer.y) > DRAG_THRESHOLD) return;
            if (revealed[i]) return;
            revealed[i] = true;
            flipped.push(i);
            drawCards();

            if (flipped.length === 2) {
              locked = true;
              const [a, b] = flipped;
              if (cards[a] === cards[b]) {
                matched[a] = matched[b] = true;
                flipped = [];
                locked = false;
                drawCards();
                if (matched.every(m => m)) this.onMgWin();
              } else {
                this.delay(600, () => {
                  revealed[a] = revealed[b] = false;
                  flipped = [];
                  locked = false;
                  drawCards();
                });
              }
            }
          });
        }
      }
    };

    drawCards();
  }

  // ========================== SIMON ==========================

  private initSimon(startY: number): void {
    const lv = this.playingLevel;
    const { sequenceLength } = simonParams(lv);
    const w = this.panelW;

    const sequence: number[] = [];
    for (let i = 0; i < sequenceLength; i++) {
      sequence.push(Math.floor(Math.random() * 4));
    }
    let playerIdx = 0;
    let showingIdx = 0;
    let phase: 'showing' | 'input' | 'done' = 'showing';
    let activeBtn = -1;

    let y = startY;
    const infoText = this.addText(w / 2, y, `Sequence: ${sequenceLength} sons`, 12, '#666').setOrigin(0.5, 0);
    y += 24;

    const statusText = this.addText(w / 2, y, 'Regarde...', 13, '#e67e22', 'bold').setOrigin(0.5, 0);
    y += 28;

    const availH = this.panelH - (y - this.panelY) - 20;
    const availW = w - 32;
    const btnSize = Math.floor(Math.min(availW / 2 - 4, availH / 2 - 4, 100));
    const totalW = btnSize * 2 + 8;
    const totalH = btnSize * 2 + 8;
    const ox = (w - totalW) / 2;
    const oy = y;

    const simonBtns: Phaser.GameObjects.Graphics[] = [];
    const positions = [
      { x: ox,                y: oy },                   // top-left (0)
      { x: ox + btnSize + 8,  y: oy },                   // top-right (1)
      { x: ox,                y: oy + btnSize + 8 },     // bottom-left (2)
      { x: ox + btnSize + 8,  y: oy + btnSize + 8 },    // bottom-right (3)
    ];
    const btnColors = [0xe74c3c, 0x3498db, 0x2ecc71, 0xf1c40f];
    const btnBright = [0xf1948a, 0x85c1e9, 0x82e0aa, 0xf9e79f];

    const drawBtns = () => {
      simonBtns.forEach(b => b.destroy());
      simonBtns.length = 0;
      for (let i = 0; i < 4; i++) {
        const g = this.scene.add.graphics();
        const color = activeBtn === i ? btnBright[i] : btnColors[i];
        g.fillStyle(color, 1);
        g.fillRoundedRect(positions[i].x, positions[i].y, btnSize, btnSize, 10);
        this.scrollContainer.add(g);
        simonBtns.push(g);

        if (phase === 'input') {
          const hit = this.scene.add.rectangle(
            positions[i].x + btnSize / 2, positions[i].y + btnSize / 2,
            btnSize, btnSize, 0, 0
          ).setInteractive({ useHandCursor: true });
          this.scrollContainer.add(hit);
          hit.on('pointerup', (ptr: Phaser.Input.Pointer) => {
            if (Math.abs(ptr.y - this.dragStartPointer.y) > DRAG_THRESHOLD) return;
            if (phase !== 'input') return;
            if (sequence[playerIdx] === i) {
              playerIdx++;
              activeBtn = i;
              drawBtns();
              this.delay(200, () => { activeBtn = -1; drawBtns(); });
              statusText.setText(`${playerIdx}/${sequenceLength}`);
              if (playerIdx >= sequenceLength) {
                phase = 'done';
                this.onMgWin();
              }
            } else {
              statusText.setText('Erreur! Perdu.');
              statusText.setColor('#e74c3c');
              phase = 'done';
              this.delay(1500, () => {
                this.view = 'levels';
                this.refresh();
              });
            }
          });
        }
      }
    };

    drawBtns();

    // Show sequence
    const showNext = () => {
      if (showingIdx >= sequenceLength) {
        phase = 'input';
        statusText.setText('A toi! 0/' + sequenceLength);
        drawBtns();
        return;
      }
      activeBtn = sequence[showingIdx];
      drawBtns();
      this.delay(400, () => {
        activeBtn = -1;
        drawBtns();
        showingIdx++;
        this.delay(200, showNext);
      });
    };

    this.delay(500, showNext);
  }

  // ========================== TAQUIN ==========================

  private initTaquin(startY: number): void {
    const lv = this.playingLevel;
    const { size, shuffleMoves } = taquinParams(lv);
    const w = this.panelW;
    const total = size * size;

    // Create ordered tiles: 1..total-1, 0=empty
    const tiles: number[] = [];
    for (let i = 1; i < total; i++) tiles.push(i);
    tiles.push(0);

    let emptyIdx = total - 1;

    // Shuffle by random valid moves
    for (let s = 0; s < shuffleMoves; s++) {
      const er = Math.floor(emptyIdx / size);
      const ec = emptyIdx % size;
      const neighbors: number[] = [];
      if (er > 0) neighbors.push(emptyIdx - size);
      if (er < size - 1) neighbors.push(emptyIdx + size);
      if (ec > 0) neighbors.push(emptyIdx - 1);
      if (ec < size - 1) neighbors.push(emptyIdx + 1);
      const pick = neighbors[Math.floor(Math.random() * neighbors.length)];
      tiles[emptyIdx] = tiles[pick];
      tiles[pick] = 0;
      emptyIdx = pick;
    }

    let y = startY;
    const gap = 2;
    const availH = this.panelH - (startY - this.panelY) - 30;
    const cellSize = Math.floor(Math.min((w - 16 - gap * (size - 1)) / size, (availH - gap * (size - 1)) / size));
    const gridW = size * cellSize + (size - 1) * gap;
    const ox = (w - gridW) / 2;

    this.addText(w / 2, y, `Taquin ${size}x${size}`, 12, '#666').setOrigin(0.5, 0);
    y += 22;

    const drawGrid = () => {
      const toRemove = this.scrollContainer.list.filter((o: any) => o.getData?.('tqCell'));
      toRemove.forEach((o: any) => o.destroy());

      for (let i = 0; i < total; i++) {
        const col = i % size;
        const row = Math.floor(i / size);
        const cx = ox + col * (cellSize + gap);
        const cy = y + row * (cellSize + gap);

        if (tiles[i] === 0) continue;

        const cell = this.scene.add.graphics();
        cell.fillStyle(0xe67e22, 1);
        cell.fillRoundedRect(cx, cy, cellSize, cellSize, 4);
        cell.setData('tqCell', true);
        this.scrollContainer.add(cell);

        const t = this.addText(cx + cellSize / 2, cy + cellSize / 2, `${tiles[i]}`, 14, '#fff', 'bold');
        t.setOrigin(0.5).setData('tqCell', true);

        const hit = this.scene.add.rectangle(cx + cellSize / 2, cy + cellSize / 2, cellSize, cellSize, 0, 0)
          .setInteractive({ useHandCursor: true }).setData('tqCell', true);
        this.scrollContainer.add(hit);
        hit.on('pointerup', (ptr: Phaser.Input.Pointer) => {
          if (Math.abs(ptr.y - this.dragStartPointer.y) > DRAG_THRESHOLD) return;
          // Check if adjacent to empty
          const tr = Math.floor(i / size), tc = i % size;
          const eR = Math.floor(emptyIdx / size), eC = emptyIdx % size;
          if ((Math.abs(tr - eR) + Math.abs(tc - eC)) === 1) {
            tiles[emptyIdx] = tiles[i];
            tiles[i] = 0;
            emptyIdx = i;
            drawGrid();
            // Check win: 1,2,3,...N-1,0
            let won = true;
            for (let j = 0; j < total - 1; j++) {
              if (tiles[j] !== j + 1) { won = false; break; }
            }
            if (won) this.onMgWin();
          }
        });
      }
    };

    drawGrid();
  }

  // ========================== FLOOD ==========================

  private initFlood(startY: number): void {
    const lv = this.playingLevel;
    const { size, numColors, maxMoves } = floodParams(lv);
    const w = this.panelW;
    const colors = FL_COLORS.slice(0, numColors);

    const grid: number[][] = [];
    for (let r = 0; r < size; r++) {
      const row: number[] = [];
      for (let c = 0; c < size; c++) {
        row.push(Math.floor(Math.random() * numColors));
      }
      grid.push(row);
    }

    let moves = 0;
    let y = startY;

    const moveText = this.addText(w / 2, y, `Coups: 0/${maxMoves}`, 12, '#333', 'bold').setOrigin(0.5, 0);
    y += 22;

    const gap = 1;
    const availH = this.panelH - (y - this.panelY) - 60; // reserve space for color buttons
    const cellSize = Math.floor(Math.min((w - 16 - gap * (size - 1)) / size, (availH - gap * (size - 1)) / size));
    const gridW = size * cellSize + (size - 1) * gap;
    const ox = (w - gridW) / 2;

    const drawGrid = () => {
      const toRemove = this.scrollContainer.list.filter((o: any) => o.getData?.('flCell'));
      toRemove.forEach((o: any) => o.destroy());

      for (let r = 0; r < size; r++) {
        for (let c = 0; c < size; c++) {
          const cx = ox + c * (cellSize + gap);
          const cy = y + r * (cellSize + gap);
          const cell = this.scene.add.graphics();
          cell.fillStyle(Phaser.Display.Color.HexStringToColor(colors[grid[r][c]]).color, 1);
          cell.fillRect(cx, cy, cellSize, cellSize);
          cell.setData('flCell', true);
          this.scrollContainer.add(cell);
        }
      }
    };

    drawGrid();

    // Color picker buttons
    const gridEndY = y + size * (cellSize + gap) + 8;
    const btnW = Math.min(40, (w - 16 - (numColors - 1) * 4) / numColors);
    const btnOx = (w - numColors * btnW - (numColors - 1) * 4) / 2;

    for (let ci = 0; ci < numColors; ci++) {
      const bx = btnOx + ci * (btnW + 4);
      const btn = this.scene.add.graphics();
      btn.fillStyle(Phaser.Display.Color.HexStringToColor(colors[ci]).color, 1);
      btn.fillRoundedRect(bx, gridEndY, btnW, 32, 6);
      this.scrollContainer.add(btn);

      const hit = this.scene.add.rectangle(bx + btnW / 2, gridEndY + 16, btnW, 32, 0, 0)
        .setInteractive({ useHandCursor: true });
      this.scrollContainer.add(hit);
      hit.on('pointerup', (ptr: Phaser.Input.Pointer) => {
        if (Math.abs(ptr.y - this.dragStartPointer.y) > DRAG_THRESHOLD) return;
        const oldColor = grid[0][0];
        if (ci === oldColor) return;
        this.floodFill(grid, size, oldColor, ci);
        moves++;
        moveText.setText(`Coups: ${moves}/${maxMoves}`);
        drawGrid();
        // Check win
        if (grid.every(row => row.every(v => v === grid[0][0]))) {
          this.onMgWin();
        } else if (moves >= maxMoves) {
          moveText.setText('Perdu! Max coups atteint');
          moveText.setColor('#e74c3c');
          this.delay(1500, () => {
            this.view = 'levels';
            this.refresh();
          });
        }
      });
    }
  }

  private floodFill(grid: number[][], size: number, oldColor: number, newColor: number): void {
    if (oldColor === newColor) return;
    const stack: [number, number][] = [[0, 0]];
    const visited = new Set<string>();
    while (stack.length > 0) {
      const [r, c] = stack.pop()!;
      const key = `${r},${c}`;
      if (visited.has(key)) continue;
      if (r < 0 || r >= size || c < 0 || c >= size) continue;
      if (grid[r][c] !== oldColor) continue;
      visited.add(key);
      grid[r][c] = newColor;
      stack.push([r - 1, c], [r + 1, c], [r, c - 1], [r, c + 1]);
    }
  }

  // ========================== SNAKE ==========================

  private initSnake(startY: number): void {
    const lv = this.playingLevel;
    const { size, target } = snakeParams(lv);
    const w = this.panelW;

    let snake: { r: number; c: number }[] = [{ r: Math.floor(size / 2), c: Math.floor(size / 2) }];
    let dir: { r: number; c: number } = { r: 0, c: 1 };
    let apple = this.placeApple(size, snake);
    let score = 0;
    let alive = true;

    let y = startY;
    const infoText = this.addText(w / 2, y, `Pommes: 0/${target} - Grille ${size}x${size}`, 12, '#333', 'bold').setOrigin(0.5, 0);
    y += 22;

    const gap = 1;
    const availH = this.panelH - (y - this.panelY) - 110; // reserve space for direction buttons
    const cellSize = Math.floor(Math.min((w - 16 - gap * (size - 1)) / size, (availH - gap * (size - 1)) / size));
    const gridW = size * cellSize + (size - 1) * gap;
    const ox = (w - gridW) / 2;

    const drawGrid = () => {
      const toRemove = this.scrollContainer.list.filter((o: any) => o.getData?.('snCell'));
      toRemove.forEach((o: any) => o.destroy());

      for (let r = 0; r < size; r++) {
        for (let c = 0; c < size; c++) {
          const cx = ox + c * (cellSize + gap);
          const cy = y + r * (cellSize + gap);
          const isSnake = snake.some(s => s.r === r && s.c === c);
          const isHead = snake[0].r === r && snake[0].c === c;
          const isApple = apple.r === r && apple.c === c;
          let color = 0xeeeeee;
          if (isHead) color = 0x2e7d32;
          else if (isSnake) color = 0x4caf50;
          else if (isApple) color = 0xe74c3c;

          const cell = this.scene.add.graphics();
          cell.fillStyle(color, 1);
          cell.fillRect(cx, cy, cellSize, cellSize);
          cell.setData('snCell', true);
          this.scrollContainer.add(cell);
        }
      }
    };

    drawGrid();

    // Direction buttons
    const gridEndY = y + size * (cellSize + gap) + 8;
    const btnS = 44;
    const cx = w / 2;
    const dirs = [
      { label: '\u2B06', dr: -1, dc: 0, x: cx, y: gridEndY },
      { label: '\u2B07', dr: 1, dc: 0, x: cx, y: gridEndY + btnS + 4 },
      { label: '\u2B05', dr: 0, dc: -1, x: cx - btnS - 4, y: gridEndY + (btnS + 4) / 2 },
      { label: '\u27A1', dr: 0, dc: 1, x: cx + btnS + 4, y: gridEndY + (btnS + 4) / 2 },
    ];

    for (const d of dirs) {
      this.addButton(d.x - btnS / 2, d.y, btnS, btnS, d.label, () => {
        if (!alive) return;
        // Prevent reversing
        if (d.dr === -dir.r && d.dc === -dir.c) return;
        dir = { r: d.dr, c: d.dc };
      });
    }

    // Game loop
    const timer = this.scene.time.addEvent({
      delay: 200,
      loop: true,
      callback: () => {
        if (!alive || !this.container.visible) return;
        const head = { r: snake[0].r + dir.r, c: snake[0].c + dir.c };

        // Wall check
        if (head.r < 0 || head.r >= size || head.c < 0 || head.c >= size) {
          alive = false;
          infoText.setText('Perdu! Mur.');
          infoText.setColor('#e74c3c');
          this.delay(1500, () => {
            this.view = 'levels';
            this.refresh();
          });
          return;
        }

        // Self check
        if (snake.some(s => s.r === head.r && s.c === head.c)) {
          alive = false;
          infoText.setText('Perdu! Queue.');
          infoText.setColor('#e74c3c');
          this.delay(1500, () => {
            this.view = 'levels';
            this.refresh();
          });
          return;
        }

        snake.unshift(head);

        // Apple check
        if (head.r === apple.r && head.c === apple.c) {
          score++;
          infoText.setText(`Pommes: ${score}/${target}`);
          if (score >= target) {
            alive = false;
            this.onMgWin();
            return;
          }
          apple = this.placeApple(size, snake);
        } else {
          snake.pop();
        }

        drawGrid();
      },
    });
    this.gameTimers.push(timer);
  }

  private placeApple(size: number, snake: { r: number; c: number }[]): { r: number; c: number } {
    let r: number, c: number;
    do {
      r = Math.floor(Math.random() * size);
      c = Math.floor(Math.random() * size);
    } while (snake.some(s => s.r === r && s.c === c));
    return { r, c };
  }

  // ========================== MAZE ==========================

  private initMaze(startY: number): void {
    const lv = this.playingLevel;
    const { base, gridSize } = mazeParams(lv);
    const w = this.panelW;

    // Generate maze using recursive backtracking
    const maze: number[][] = [];
    for (let r = 0; r < gridSize; r++) {
      maze.push(new Array(gridSize).fill(1)); // 1=wall, 0=path
    }

    const carve = (r: number, c: number) => {
      maze[r][c] = 0;
      const dirs = shuffle([[0, 2], [0, -2], [2, 0], [-2, 0]]);
      for (const [dr, dc] of dirs) {
        const nr = r + dr, nc = c + dc;
        if (nr > 0 && nr < gridSize && nc > 0 && nc < gridSize && maze[nr][nc] === 1) {
          maze[r + dr / 2][c + dc / 2] = 0;
          carve(nr, nc);
        }
      }
    };
    carve(1, 1);

    // Player position and exit
    let pr = 1, pc = 1;
    const exitR = gridSize - 2, exitC = gridSize - 2;
    maze[exitR][exitC] = 0;

    let y = startY;
    this.addText(w / 2, y, `Labyrinthe ${base}x${base}`, 12, '#666').setOrigin(0.5, 0);
    y += 22;

    const availH = this.panelH - (y - this.panelY) - 110; // reserve for direction buttons
    const cellSize = Math.floor(Math.min((w - 16) / gridSize, availH / gridSize));
    const gridW = gridSize * cellSize;
    const ox = (w - gridW) / 2;

    const drawMaze = () => {
      const toRemove = this.scrollContainer.list.filter((o: any) => o.getData?.('maCell'));
      toRemove.forEach((o: any) => o.destroy());

      for (let r = 0; r < gridSize; r++) {
        for (let c = 0; c < gridSize; c++) {
          const cx = ox + c * cellSize;
          const cy = y + r * cellSize;
          let color = maze[r][c] === 1 ? 0x333333 : 0xeeeeee;
          if (r === pr && c === pc) color = 0x4caf50;
          else if (r === exitR && c === exitC) color = 0xe74c3c;

          const cell = this.scene.add.graphics();
          cell.fillStyle(color, 1);
          cell.fillRect(cx, cy, cellSize, cellSize);
          cell.setData('maCell', true);
          this.scrollContainer.add(cell);
        }
      }
    };

    drawMaze();

    // Direction buttons
    const gridEndY = y + gridSize * cellSize + 8;
    const btnS = 44;
    const cx = w / 2;
    const dirs = [
      { label: '\u2B06', dr: -1, dc: 0, x: cx, y: gridEndY },
      { label: '\u2B07', dr: 1, dc: 0, x: cx, y: gridEndY + btnS + 4 },
      { label: '\u2B05', dr: 0, dc: -1, x: cx - btnS - 4, y: gridEndY + (btnS + 4) / 2 },
      { label: '\u27A1', dr: 0, dc: 1, x: cx + btnS + 4, y: gridEndY + (btnS + 4) / 2 },
    ];

    for (const d of dirs) {
      this.addButton(d.x - btnS / 2, d.y, btnS, btnS, d.label, () => {
        const nr = pr + d.dr, nc = pc + d.dc;
        if (nr >= 0 && nr < gridSize && nc >= 0 && nc < gridSize && maze[nr][nc] === 0) {
          pr = nr;
          pc = nc;
          drawMaze();
          if (pr === exitR && pc === exitC) {
            this.onMgWin();
          }
        }
      });
    }
  }

  // ========================== MINESWEEPER ==========================

  private initMinesweeper(startY: number): void {
    const lv = this.playingLevel;
    const { size, mines } = minesweeperParams(lv);
    const w = this.panelW;

    const board: number[][] = []; // -1=mine, 0-8=adjacent count
    const revealed: boolean[][] = [];
    const flagged: boolean[][] = [];
    let firstClick = true;
    let mode: 'reveal' | 'flag' = 'reveal';
    let gameOver = false;

    for (let r = 0; r < size; r++) {
      board.push(new Array(size).fill(0));
      revealed.push(new Array(size).fill(false));
      flagged.push(new Array(size).fill(false));
    }

    let y = startY;
    const infoText = this.addText(w / 2, y, `${mines} mines - Mode: Reveler`, 12, '#333', 'bold').setOrigin(0.5, 0);
    y += 22;

    // Mode toggle button
    this.addButton(8, y, 80, 28, '\u{1F6A9} Flag', () => {
      mode = mode === 'reveal' ? 'flag' : 'reveal';
      infoText.setText(`${mines} mines - Mode: ${mode === 'reveal' ? 'Reveler' : 'Drapeau'}`);
    });
    y += 32;

    const gap = 1;
    const availH = this.panelH - (y - this.panelY) - 20;
    const cellSize = Math.floor(Math.min((w - 16 - gap * (size - 1)) / size, (availH - gap * (size - 1)) / size));
    const gridW = size * cellSize + (size - 1) * gap;
    const ox = (w - gridW) / 2;

    const placeMines = (safeR: number, safeC: number) => {
      let placed = 0;
      while (placed < mines) {
        const r = Math.floor(Math.random() * size);
        const c = Math.floor(Math.random() * size);
        if (board[r][c] === -1) continue;
        if (Math.abs(r - safeR) <= 1 && Math.abs(c - safeC) <= 1) continue;
        board[r][c] = -1;
        placed++;
      }
      // Calculate numbers
      for (let r = 0; r < size; r++) {
        for (let c = 0; c < size; c++) {
          if (board[r][c] === -1) continue;
          let count = 0;
          for (let dr = -1; dr <= 1; dr++) {
            for (let dc = -1; dc <= 1; dc++) {
              const nr = r + dr, nc = c + dc;
              if (nr >= 0 && nr < size && nc >= 0 && nc < size && board[nr][nc] === -1) count++;
            }
          }
          board[r][c] = count;
        }
      }
    };

    const revealCell = (r: number, c: number) => {
      if (r < 0 || r >= size || c < 0 || c >= size) return;
      if (revealed[r][c] || flagged[r][c]) return;
      revealed[r][c] = true;
      if (board[r][c] === 0) {
        for (let dr = -1; dr <= 1; dr++) {
          for (let dc = -1; dc <= 1; dc++) revealCell(r + dr, c + dc);
        }
      }
    };

    const checkWin = () => {
      for (let r = 0; r < size; r++) {
        for (let c = 0; c < size; c++) {
          if (board[r][c] !== -1 && !revealed[r][c]) return false;
        }
      }
      return true;
    };

    const numColors: Record<number, string> = {
      1: '#2196f3', 2: '#4caf50', 3: '#e74c3c', 4: '#9c27b0',
      5: '#ff9800', 6: '#00bcd4', 7: '#333333', 8: '#888888',
    };

    const drawGrid = () => {
      const toRemove = this.scrollContainer.list.filter((o: any) => o.getData?.('msCell'));
      toRemove.forEach((o: any) => o.destroy());

      for (let r = 0; r < size; r++) {
        for (let c = 0; c < size; c++) {
          const cx = ox + c * (cellSize + gap);
          const cy = y + r * (cellSize + gap);

          const cell = this.scene.add.graphics();
          if (revealed[r][c]) {
            cell.fillStyle(board[r][c] === -1 ? 0xe74c3c : 0xeeeeee, 1);
          } else {
            cell.fillStyle(0x9e9e9e, 1);
          }
          cell.fillRect(cx, cy, cellSize, cellSize);
          cell.setData('msCell', true);
          this.scrollContainer.add(cell);

          if (revealed[r][c]) {
            if (board[r][c] === -1) {
              const t = this.addText(cx + cellSize / 2, cy + cellSize / 2, '\u{1F4A3}', Math.min(cellSize - 4, 16), '#000');
              t.setOrigin(0.5).setData('msCell', true);
            } else if (board[r][c] > 0) {
              const t = this.addText(cx + cellSize / 2, cy + cellSize / 2, `${board[r][c]}`, 12, numColors[board[r][c]] ?? '#333', 'bold');
              t.setOrigin(0.5).setData('msCell', true);
            }
          } else if (flagged[r][c]) {
            const t = this.addText(cx + cellSize / 2, cy + cellSize / 2, '\u{1F6A9}', Math.min(cellSize - 4, 14), '#e74c3c');
            t.setOrigin(0.5).setData('msCell', true);
          }

          if (!revealed[r][c] && !gameOver) {
            const hit = this.scene.add.rectangle(cx + cellSize / 2, cy + cellSize / 2, cellSize, cellSize, 0, 0)
              .setInteractive({ useHandCursor: true }).setData('msCell', true);
            this.scrollContainer.add(hit);
            hit.on('pointerup', (ptr: Phaser.Input.Pointer) => {
              if (gameOver || Math.abs(ptr.y - this.dragStartPointer.y) > DRAG_THRESHOLD) return;
              if (mode === 'flag') {
                flagged[r][c] = !flagged[r][c];
                drawGrid();
                return;
              }
              if (flagged[r][c]) return;
              if (firstClick) {
                placeMines(r, c);
                firstClick = false;
              }
              if (board[r][c] === -1) {
                // Boom
                gameOver = true;
                for (let rr = 0; rr < size; rr++)
                  for (let cc = 0; cc < size; cc++)
                    if (board[rr][cc] === -1) revealed[rr][cc] = true;
                drawGrid();
                infoText.setText('BOOM! Perdu.');
                infoText.setColor('#e74c3c');
                this.delay(1500, () => {
                  this.view = 'levels';
                  this.refresh();
                });
                return;
              }
              revealCell(r, c);
              drawGrid();
              if (checkWin()) {
                gameOver = true;
                this.onMgWin();
              }
            });
          }
        }
      }
    };

    drawGrid();
  }

  // ========================== PATTERN ==========================

  private initPattern(startY: number): void {
    const lv = this.playingLevel;
    const { size, numColors, filled, viewTimeMs, hintCost } = patternParams(lv);
    const w = this.panelW;
    const colors = CP_COLORS.slice(0, numColors);

    // Generate target pattern
    const target: number[][] = [];
    for (let r = 0; r < size; r++) target.push(new Array(size).fill(-1));

    const allCells: [number, number][] = [];
    for (let r = 0; r < size; r++)
      for (let c = 0; c < size; c++) allCells.push([r, c]);
    const filledCells = shuffle(allCells).slice(0, filled);
    for (const [r, c] of filledCells) {
      target[r][c] = Math.floor(Math.random() * numColors);
    }

    // Player grid
    const player: number[][] = [];
    for (let r = 0; r < size; r++) player.push(new Array(size).fill(-1));

    let phase: 'viewing' | 'input' | 'done' = 'viewing';
    let y = startY;

    const statusText = this.addText(w / 2, y, 'Memorise le motif...', 13, '#e67e22', 'bold').setOrigin(0.5, 0);
    y += 26;

    const gap = 3;
    const availH = this.panelH - (y - this.panelY) - 100; // reserve for buttons
    const cellSize = Math.floor(Math.min((w - 16 - gap * (size - 1)) / size, (availH - gap * (size - 1)) / size));
    const gridW = size * cellSize + (size - 1) * gap;
    const ox = (w - gridW) / 2;

    const drawGrid = (grid: number[][]) => {
      const toRemove = this.scrollContainer.list.filter((o: any) => o.getData?.('cpCell'));
      toRemove.forEach((o: any) => o.destroy());

      for (let r = 0; r < size; r++) {
        for (let c = 0; c < size; c++) {
          const cx = ox + c * (cellSize + gap);
          const cy = y + r * (cellSize + gap);
          const val = grid[r][c];

          const cell = this.scene.add.graphics();
          if (val >= 0) {
            cell.fillStyle(Phaser.Display.Color.HexStringToColor(colors[val]).color, 1);
          } else {
            cell.fillStyle(0xdddddd, 1);
          }
          cell.fillRoundedRect(cx, cy, cellSize, cellSize, 4);
          cell.setData('cpCell', true);
          this.scrollContainer.add(cell);

          if (phase === 'input') {
            const hit = this.scene.add.rectangle(cx + cellSize / 2, cy + cellSize / 2, cellSize, cellSize, 0, 0)
              .setInteractive({ useHandCursor: true }).setData('cpCell', true);
            this.scrollContainer.add(hit);
            hit.on('pointerup', (ptr: Phaser.Input.Pointer) => {
              if (phase !== 'input' || Math.abs(ptr.y - this.dragStartPointer.y) > DRAG_THRESHOLD) return;
              // Cycle through colors
              player[r][c] = (player[r][c] + 2) % (numColors + 1) - 1; // -1, 0, 1, ..., numColors-1
              drawGrid(player);
            });
          }
        }
      }
    };

    // Show target pattern
    drawGrid(target);

    // After viewTime, switch to input
    this.delay(viewTimeMs, () => {
      phase = 'input';
      statusText.setText('Reproduis le motif!');
      statusText.setColor('#333');
      drawGrid(player);

      // Add check button
      const gridEndY = y + size * (cellSize + gap) + 8;
      this.addButton((w - 100) / 2, gridEndY, 100, 32, '\u2705 Verifier', () => {
        if (phase !== 'input') return;
        let correct = true;
        for (let r = 0; r < size; r++) {
          for (let c = 0; c < size; c++) {
            if (target[r][c] !== player[r][c]) { correct = false; break; }
          }
          if (!correct) break;
        }
        if (correct) {
          phase = 'done';
          this.onMgWin();
        } else {
          statusText.setText('Incorrect! Reessaie.');
          statusText.setColor('#e74c3c');
        }
      });

      // Hint button
      this.addButton((w - 100) / 2, gridEndY + 40, 100, 28, `\u{1F4A1} Indice (${hintCost}\u{1F4B0})`, () => {
        if (phase !== 'input') return;
        if (gameState.data.coins < hintCost) return;
        gameState.data.coins -= hintCost;
        phase = 'viewing';
        statusText.setText('Rappel...');
        statusText.setColor('#e67e22');
        drawGrid(target);
        this.delay(1500, () => {
          phase = 'input';
          statusText.setText('Reproduis le motif!');
          statusText.setColor('#333');
          drawGrid(player);
        });
      });
    });
  }

  // ========================== 2048 ==========================

  private init2048(startY: number): void {
    const lv = this.playingLevel;
    const { size, target } = game2048Params(lv);
    const w = this.panelW;

    const grid: number[][] = [];
    for (let r = 0; r < size; r++) grid.push(new Array(size).fill(0));

    const spawnTile = () => {
      const empty: [number, number][] = [];
      for (let r = 0; r < size; r++)
        for (let c = 0; c < size; c++)
          if (grid[r][c] === 0) empty.push([r, c]);
      if (empty.length === 0) return;
      const [r, c] = empty[Math.floor(Math.random() * empty.length)];
      grid[r][c] = Math.random() < 0.9 ? 2 : 4;
    };

    spawnTile();
    spawnTile();

    let gameOver = false;
    let y = startY;

    const infoText = this.addText(w / 2, y, `Objectif: ${target}`, 13, '#333', 'bold').setOrigin(0.5, 0);
    y += 24;

    const gap = 4;
    const availH = this.panelH - (y - this.panelY) - 120; // reserve for direction buttons
    const cellSize = Math.floor(Math.min((w - 24 - gap * (size - 1)) / size, (availH - gap * (size - 1)) / size));
    const gridW = size * cellSize + (size - 1) * gap;
    const ox = (w - gridW) / 2;

    const tileColors: Record<number, number> = {
      0: 0xcdc1b4, 2: 0xeee4da, 4: 0xede0c8, 8: 0xf2b179,
      16: 0xf59563, 32: 0xf67c5f, 64: 0xf65e3b, 128: 0xedcf72,
      256: 0xedcc61, 512: 0xedc850, 1024: 0xedc53f, 2048: 0xedc22e,
    };

    const drawGrid = () => {
      const toRemove = this.scrollContainer.list.filter((o: any) => o.getData?.('g2Cell'));
      toRemove.forEach((o: any) => o.destroy());

      for (let r = 0; r < size; r++) {
        for (let c = 0; c < size; c++) {
          const cx = ox + c * (cellSize + gap);
          const cy = y + r * (cellSize + gap);
          const val = grid[r][c];

          const cell = this.scene.add.graphics();
          cell.fillStyle(tileColors[val] ?? 0x3c3a32, 1);
          cell.fillRoundedRect(cx, cy, cellSize, cellSize, 6);
          cell.setData('g2Cell', true);
          this.scrollContainer.add(cell);

          if (val > 0) {
            const fontSize = val >= 1000 ? 12 : val >= 100 ? 14 : 18;
            const textColor = val >= 8 ? '#f9f6f2' : '#776e65';
            const t = this.addText(cx + cellSize / 2, cy + cellSize / 2, `${val}`, fontSize, textColor, 'bold');
            t.setOrigin(0.5).setData('g2Cell', true);
          }
        }
      }
    };

    drawGrid();

    const move = (dr: number, dc: number) => {
      if (gameOver) return;
      let moved = false;
      const merged: boolean[][] = [];
      for (let r = 0; r < size; r++) merged.push(new Array(size).fill(false));

      const process = (startR: number, startC: number, stepR: number, stepC: number) => {
        let r = startR, c = startC;
        while (r >= 0 && r < size && c >= 0 && c < size) {
          if (grid[r][c] !== 0) {
            let nr = r + dr, nc = c + dc;
            // Find target position
            let tr = r, tc = c;
            while (nr >= 0 && nr < size && nc >= 0 && nc < size) {
              if (grid[nr][nc] === 0) { tr = nr; tc = nc; }
              else if (grid[nr][nc] === grid[r][c] && !merged[nr][nc]) {
                tr = nr; tc = nc; break;
              } else break;
              nr += dr; nc += dc;
            }
            if (tr !== r || tc !== c) {
              if (grid[tr][tc] === grid[r][c]) {
                grid[tr][tc] *= 2;
                merged[tr][tc] = true;
              } else {
                grid[tr][tc] = grid[r][c];
              }
              grid[r][c] = 0;
              moved = true;
            }
          }
          r -= dr; c -= dc;
          if (stepR) r += stepR;
          if (stepC) c += stepC;
          // Prevent infinite loop
          if (stepR === 0 && stepC === 0) break;
        }
      };

      // Process in correct order
      if (dr === -1) { // up
        for (let c = 0; c < size; c++) {
          for (let r = 1; r < size; r++) {
            if (grid[r][c] === 0) continue;
            let tr = r;
            for (let nr = r - 1; nr >= 0; nr--) {
              if (grid[nr][c] === 0) tr = nr;
              else if (grid[nr][c] === grid[r][c] && !merged[nr][c]) { tr = nr; break; }
              else break;
            }
            if (tr !== r) {
              if (grid[tr][c] === grid[r][c]) { grid[tr][c] *= 2; merged[tr][c] = true; }
              else grid[tr][c] = grid[r][c];
              grid[r][c] = 0;
              moved = true;
            }
          }
        }
      } else if (dr === 1) { // down
        for (let c = 0; c < size; c++) {
          for (let r = size - 2; r >= 0; r--) {
            if (grid[r][c] === 0) continue;
            let tr = r;
            for (let nr = r + 1; nr < size; nr++) {
              if (grid[nr][c] === 0) tr = nr;
              else if (grid[nr][c] === grid[r][c] && !merged[nr][c]) { tr = nr; break; }
              else break;
            }
            if (tr !== r) {
              if (grid[tr][c] === grid[r][c]) { grid[tr][c] *= 2; merged[tr][c] = true; }
              else grid[tr][c] = grid[r][c];
              grid[r][c] = 0;
              moved = true;
            }
          }
        }
      } else if (dc === -1) { // left
        for (let r = 0; r < size; r++) {
          for (let c = 1; c < size; c++) {
            if (grid[r][c] === 0) continue;
            let tc = c;
            for (let nc = c - 1; nc >= 0; nc--) {
              if (grid[r][nc] === 0) tc = nc;
              else if (grid[r][nc] === grid[r][c] && !merged[r][nc]) { tc = nc; break; }
              else break;
            }
            if (tc !== c) {
              if (grid[r][tc] === grid[r][c]) { grid[r][tc] *= 2; merged[r][tc] = true; }
              else grid[r][tc] = grid[r][c];
              grid[r][c] = 0;
              moved = true;
            }
          }
        }
      } else if (dc === 1) { // right
        for (let r = 0; r < size; r++) {
          for (let c = size - 2; c >= 0; c--) {
            if (grid[r][c] === 0) continue;
            let tc = c;
            for (let nc = c + 1; nc < size; nc++) {
              if (grid[r][nc] === 0) tc = nc;
              else if (grid[r][nc] === grid[r][c] && !merged[r][nc]) { tc = nc; break; }
              else break;
            }
            if (tc !== c) {
              if (grid[r][tc] === grid[r][c]) { grid[r][tc] *= 2; merged[r][tc] = true; }
              else grid[r][tc] = grid[r][c];
              grid[r][c] = 0;
              moved = true;
            }
          }
        }
      }

      if (moved) {
        spawnTile();
        drawGrid();

        // Check win
        for (let r = 0; r < size; r++)
          for (let c = 0; c < size; c++)
            if (grid[r][c] >= target) {
              gameOver = true;
              this.onMgWin();
              return;
            }

        // Check game over
        let hasMove = false;
        for (let r = 0; r < size && !hasMove; r++) {
          for (let c = 0; c < size && !hasMove; c++) {
            if (grid[r][c] === 0) hasMove = true;
            if (r + 1 < size && grid[r][c] === grid[r + 1][c]) hasMove = true;
            if (c + 1 < size && grid[r][c] === grid[r][c + 1]) hasMove = true;
          }
        }
        if (!hasMove) {
          gameOver = true;
          infoText.setText('Game Over! Pas de coups.');
          infoText.setColor('#e74c3c');
          this.delay(1500, () => {
            this.view = 'levels';
            this.refresh();
          });
        }
      }
    };

    // Direction buttons
    const gridEndY = y + size * (cellSize + gap) + 8;
    const btnS = 44;
    const cx = w / 2;
    this.addButton(cx - btnS / 2, gridEndY, btnS, btnS, '\u2B06', () => move(-1, 0));
    this.addButton(cx - btnS / 2, gridEndY + btnS + 4 + btnS + 4, btnS, btnS, '\u2B07', () => move(1, 0));
    this.addButton(cx - btnS - btnS / 2 - 4, gridEndY + btnS + 4, btnS, btnS, '\u2B05', () => move(0, -1));
    this.addButton(cx + btnS / 2 + 4, gridEndY + btnS + 4, btnS, btnS, '\u27A1', () => move(0, 1));
  }

  // ========================== WIN HANDLER ==========================

  private onMgWin(): void {
    if (!this.selectedGame) return;
    const isNew = gameState.mgWinLevel(this.selectedGame.key, this.playingLevel);
    const msg = isNew ? '\u{1F389} Niveau reussi! +1\u2B50' : '\u{1F389} Bravo! (deja complete)';

    // Show win message
    const w = this.panelW;
    const y = this.panelY + this.panelH / 2 - 40;
    const overlay = this.scene.add.graphics();
    overlay.fillStyle(0x000000, 0.5);
    overlay.fillRect(0, this.panelY, w, this.panelH);
    this.scrollContainer.add(overlay);

    const msgBg = this.scene.add.graphics();
    msgBg.fillStyle(0xffffff, 1);
    msgBg.fillRoundedRect(w / 2 - 120, y, 240, 80, 12);
    this.scrollContainer.add(msgBg);

    this.addText(w / 2, y + 20, msg, 13, '#333', 'bold').setOrigin(0.5, 0);

    // Next level / back buttons
    this.addButton(w / 2 - 110, y + 48, 100, 28, '\u2190 Niveaux', () => {
      this.view = 'levels';
      this.refresh();
    });

    if (this.playingLevel < MG_MAX_LEVEL) {
      this.addButton(w / 2 + 10, y + 48, 100, 28, 'Suivant \u2192', () => {
        this.playingLevel++;
        this.view = 'game';
        this.refresh();
      });
    }

    gameState.save();
    gameState.emit();
  }

  // ========================== UI HELPERS ==========================

  private addText(x: number, y: number, text: string, size: number, color: string, style?: string): Phaser.GameObjects.Text {
    const t = this.scene.add.text(x, y, text, {
      fontSize: `${size}px`,
      fontFamily: 'Arial, sans-serif',
      color,
      fontStyle: style,
    });
    this.scrollContainer.add(t);
    return t;
  }

  private addButton(x: number, y: number, w: number, h: number, label: string, onClick: () => void): void {
    const g = this.scene.add.graphics();
    g.fillStyle(0x5d4037, 1);
    g.fillRoundedRect(x, y, w, h, 6);
    this.scrollContainer.add(g);

    const t = this.scene.add.text(x + w / 2, y + h / 2, label, {
      fontSize: '11px', fontFamily: 'Arial, sans-serif', color: '#fff', fontStyle: 'bold',
    }).setOrigin(0.5);
    this.scrollContainer.add(t);

    const hit = this.scene.add.rectangle(x + w / 2, y + h / 2, w, h, 0, 0)
      .setInteractive({ useHandCursor: true });
    this.scrollContainer.add(hit);
    hit.on('pointerup', (ptr: Phaser.Input.Pointer) => {
      if (Math.abs(ptr.y - this.dragStartPointer.y) > DRAG_THRESHOLD) return;
      onClick();
    });
  }

  private delay(ms: number, cb: () => void): Phaser.Time.TimerEvent {
    const t = this.scene.time.delayedCall(ms, cb);
    this.gameTimers.push(t);
    return t;
  }

  private clearTimers(): void {
    this.gameTimers.forEach(t => t.destroy());
    this.gameTimers = [];
  }

  destroy(): void {
    this.clearTimers();
    this.container.destroy();
  }
}
