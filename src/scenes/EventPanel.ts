// src/scenes/EventPanel.ts
// Event panel: card list overview + 6 event sub-panels with gameplay
import Phaser from 'phaser';
import { gameState } from '../systems/GameState';
import { COLORS, UI, DAY_MS } from '../utils/constants';
import { fmtN, shuffle } from '../utils/helpers';
import { RESOURCE_INFO } from '../data/resources';
import {
  EVENTS, EventDef, getEventInfo,
  WHEEL_SECTORS, WHEEL_SPIN_COST,
  EVENT_MEMORY_EMOJIS,
  COMBO_TIERS, COMBO_DURATION_MS,
  QUIZ_QUESTIONS, QuizQuestion,
  generateJustePrixQuestions, JustePrixQuestion,
  generateMarcheOffers, MarcheOffer,
  getRandomResourceKey,
} from '../data/events';
import { ScrollHelper } from '../ui/ScrollHelper';

const DRAG_THRESHOLD = 8;

export class EventPanel {
  private scene: Phaser.Scene;
  private container!: Phaser.GameObjects.Container;
  private scrollContainer!: Phaser.GameObjects.Container;
  private contentMask!: Phaser.Display.Masks.GeometryMask;

  private activeEvent: string | null = null;

  // Scroll state
  private maxScroll = 0;
  private scroller!: ScrollHelper;
  private dragStartPointer = { x: 0, y: 0 };

  // Event-specific state
  private quizCurrent = -1;
  private justePrixQuestions: JustePrixQuestion[] = [];
  private justePrixCurrent = -1;
  private comboTimer: Phaser.Time.TimerEvent | null = null;
  private comboClicks = 0;
  private comboTimeLeft = 0;
  private comboRunning = false;
  private wheelSpinning = false;

  // Memory event
  private memCards: string[] = [];
  private memFlipped: number[] = [];
  private memMatched: Set<string> = new Set();
  private memLocked = false;
  private memMoves = 0;

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

    const maskShape = this.scene.make.graphics({ x: 0, y: 0 });
    maskShape.fillRect(0, this.panelY, this.panelW, this.panelH);
    this.contentMask = maskShape.createGeometryMask();

    this.scrollContainer = this.scene.add.container(0, 0);
    this.scrollContainer.setMask(this.contentMask);
    this.container.add(this.scrollContainer);

    // ScrollHelper with inverted direction (same as MiniGamePanel)
    this.scroller = new ScrollHelper(this.scene,
      (sy) => {
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
    this.scrollContainer.removeAll(true);
    this.scroller.reset();
    this.scrollContainer.y = 0;

    const bg = this.scene.add.graphics();
    bg.fillStyle(COLORS.panelBg, 1);
    bg.fillRect(0, this.panelY, this.panelW, this.panelH + 2000);
    this.scrollContainer.add(bg);

    if (!this.activeEvent) {
      this.renderCardList();
    } else {
      this.renderEvent();
    }
  }

  // ==============================
  //  CARD LIST (event overview)
  // ==============================

  private renderCardList(): void {
    let y = this.panelY + 8;
    const w = this.panelW;
    const month = gameState.data.month;

    // Count active events
    const activeCount = EVENTS.filter(e => getEventInfo(month, e.offset).active).length;

    this.addText(w / 2, y, `\u{1F3C6} Evenements`, 16, '#333', 'bold').setOrigin(0.5, 0);
    y += 22;
    this.addText(w / 2, y, `\u{1F4C5} Mois ${month} -- ${activeCount} actif(s)`, 11, '#666').setOrigin(0.5, 0);
    y += 24;

    for (const evt of EVENTS) {
      const info = getEventInfo(month, evt.offset);
      const cardH = 72;

      // Card background
      const card = this.scene.add.graphics();
      card.fillStyle(0xffffff, info.active ? 1 : 0.6);
      card.fillRoundedRect(8, y, w - 16, cardH, 8);
      // Left colored border
      card.fillStyle(Phaser.Display.Color.HexStringToColor(evt.color).color, info.active ? 1 : 0.4);
      card.fillRoundedRect(8, y, 6, cardH, { tl: 8, bl: 8, tr: 0, br: 0 });
      this.scrollContainer.add(card);

      // Emoji + name
      this.addText(22, y + 6, `${evt.emoji} ${evt.name}`, 13, '#333', 'bold');

      // Status tag
      if (info.active) {
        const tag = this.scene.add.graphics();
        tag.fillStyle(0x4caf50, 1);
        tag.fillRoundedRect(w - 90, y + 6, 72, 18, 9);
        this.scrollContainer.add(tag);
        this.addText(w - 54, y + 15, 'EN COURS', 9, '#fff', 'bold').setOrigin(0.5);
      } else {
        const tag = this.scene.add.graphics();
        tag.fillStyle(0x999999, 1);
        tag.fillRoundedRect(w - 78, y + 6, 60, 18, 9);
        this.scrollContainer.add(tag);
        this.addText(w - 48, y + 15, 'PAUSE', 9, '#fff', 'bold').setOrigin(0.5);
      }

      // Rules text
      this.addText(22, y + 28, evt.rules, 9, '#666').setWordWrapWidth(w - 44);

      // Bottom row
      if (info.active) {
        this.addText(22, y + cardH - 16, `${info.remaining} mois restant(s)`, 9, '#888');

        // Play button
        const btnW = 60, btnH = 24;
        const bx = w - 28 - btnW;
        this.addButton(bx, y + cardH - 28, btnW, btnH, 'Jouer', () => {
          this.activeEvent = evt.id;
          this.refresh();
        });
      } else {
        this.addText(22, y + cardH - 16, `Revient dans ${info.until} mois`, 9, '#aaa');
      }

      y += cardH + 8;
    }

    this.maxScroll = Math.max(0, y + 20 - this.panelY - this.panelH);
  }

  // ==============================
  //  EVENT DISPATCHER
  // ==============================

  private renderEvent(): void {
    let y = this.panelY + 8;
    const w = this.panelW;

    // Back button
    this.addButton(8, y, 70, 28, '\u2190 Retour', () => {
      this.activeEvent = null;
      this.refresh();
    });

    const evt = EVENTS.find(e => e.id === this.activeEvent);
    if (evt) {
      this.addText(w / 2, y + 4, `${evt.emoji} ${evt.name}`, 14, '#333', 'bold').setOrigin(0.5, 0);
    }
    y += 40;

    switch (this.activeEvent) {
      case 'quiz': this.renderQuiz(y); break;
      case 'marche': this.renderMarche(y); break;
      case 'wheel': this.renderWheel(y); break;
      case 'memory': this.renderMemoryFarm(y); break;
      case 'justeprix': this.renderJustePrix(y); break;
      case 'combo': this.renderCombo(y); break;
    }
  }

  // ========================== QUIZ ==========================

  private renderQuiz(startY: number): void {
    const w = this.panelW;
    let y = startY;
    const state = gameState.data;
    const totalQ = QUIZ_QUESTIONS.length;
    const answered = state.quizAnswered.length;

    this.addText(w / 2, y, `Score: ${state.quizStars}\u2B50 / ${totalQ} questions`, 12, '#333', 'bold').setOrigin(0.5, 0);
    y += 22;
    this.addText(w / 2, y, `Repondu: ${answered}/${totalQ}`, 10, '#666').setOrigin(0.5, 0);
    y += 24;

    if (answered >= totalQ) {
      this.addText(w / 2, y, '\u{1F3C6} Toutes les questions repondues!', 13, '#4caf50', 'bold').setOrigin(0.5, 0);
      y += 28;
      this.addButton((w - 120) / 2, y, 120, 32, '\u{1F504} Recommencer', () => {
        state.quizAnswered = [];
        state.quizStars = 0;
        this.refresh();
      });
      return;
    }

    // Pick random unanswered question
    if (this.quizCurrent < 0 || state.quizAnswered.includes(this.quizCurrent)) {
      const available = [];
      for (let i = 0; i < totalQ; i++) {
        if (!state.quizAnswered.includes(i)) available.push(i);
      }
      this.quizCurrent = available[Math.floor(Math.random() * available.length)];
    }

    const q = QUIZ_QUESTIONS[this.quizCurrent];
    if (!q) return;

    // Question text
    this.addText(16, y, q.q, 12, '#333', 'bold').setWordWrapWidth(w - 32);
    y += 44;

    // Options
    for (let oi = 0; oi < q.options.length; oi++) {
      this.addButton(16, y, w - 32, 36, q.options[oi], () => {
        state.quizAnswered.push(this.quizCurrent);
        if (oi === q.answer) {
          state.quizStars++;
          state.stars++;
        }
        this.quizCurrent = -1;
        gameState.save();
        gameState.emit();
        this.refresh();
      });
      y += 44;
    }

    this.maxScroll = Math.max(0, y + 20 - this.panelY - this.panelH);
  }

  // ========================== MARCHE FOU ==========================

  private renderMarche(startY: number): void {
    const w = this.panelW;
    let y = startY;
    const state = gameState.data;

    // Check if offers need generation
    if (state.marcheOffers.length === 0 || gameState.isMarcheExpired()) {
      gameState.generateMarcheOffers();
      gameState.save();
    }

    const expired = Date.now() > state.marcheExpiry;
    const remainMs = Math.max(0, state.marcheExpiry - Date.now());
    const remainDays = Math.ceil(remainMs / DAY_MS);

    this.addText(w / 2, y, `Echanges: ${state.marcheScore} total`, 11, '#333', 'bold').setOrigin(0.5, 0);
    y += 18;
    if (!expired) {
      this.addText(w / 2, y, `Expire dans ~${remainDays} jour(s)`, 10, '#e67e22').setOrigin(0.5, 0);
    }
    y += 22;

    // Regenerate button
    this.addButton((w - 140) / 2, y, 140, 28, '\u{1F504} Nouvelles offres', () => {
      gameState.generateMarcheOffers();
      gameState.save();
      this.refresh();
    });
    y += 38;

    for (let i = 0; i < state.marcheOffers.length; i++) {
      const offer = state.marcheOffers[i];
      const giveInfo = RESOURCE_INFO[offer.giveKey];
      const recvInfo = RESOURCE_INFO[offer.recvKey];
      const giveName = offer.giveKey === 'eau' ? '\u{1F4A7} Eau' : giveInfo ? `${giveInfo.emoji} ${giveInfo.name}` : offer.giveKey;
      const recvName = offer.recvKey === 'eau' ? '\u{1F4A7} Eau' : recvInfo ? `${recvInfo.emoji} ${recvInfo.name}` : offer.recvKey;

      const cardH = 52;
      const card = this.scene.add.graphics();
      card.fillStyle(offer.accepted ? 0xe8f5e9 : 0xffffff, 1);
      card.fillRoundedRect(8, y, w - 16, cardH, 8);
      card.lineStyle(1, offer.accepted ? 0x81c784 : 0xdddddd, 1);
      card.strokeRoundedRect(8, y, w - 16, cardH, 8);
      this.scrollContainer.add(card);

      this.addText(16, y + 6, `Donne: ${giveName} x${offer.giveQty}`, 10, '#e74c3c');
      this.addText(16, y + 22, `Recois: ${recvName} x${offer.recvQty}`, 10, '#4caf50');

      if (!offer.accepted) {
        this.addButton(w - 80, y + 12, 60, 28, 'Accepter', () => {
          gameState.acceptMarcheOffer(i);
          gameState.save();
          gameState.emit();
          this.refresh();
        });
      } else {
        this.addText(w - 60, y + 20, '\u2705 Fait', 10, '#4caf50');
      }

      y += cardH + 6;
    }

    this.maxScroll = Math.max(0, y + 20 - this.panelY - this.panelH);
  }

  // ========================== WHEEL ==========================

  // Persistent wheel state for animation
  private wheelAngle = 0; // current rotation angle in radians
  private wheelGraphics: Phaser.GameObjects.Graphics | null = null;
  private wheelLabelObjects: Phaser.GameObjects.Text[] = [];
  private wheelContainer: Phaser.GameObjects.Container | null = null;

  private renderWheel(startY: number): void {
    const w = this.panelW;
    let y = startY;
    const state = gameState.data;
    const numSectors = WHEEL_SECTORS.length;
    const sliceAngle = (Math.PI * 2) / numSectors;

    this.addText(w / 2, y, `Tours: ${state.wheelSpins} | Cout: ${WHEEL_SPIN_COST}\u{1F4B0}`, 11, '#333', 'bold').setOrigin(0.5, 0);
    y += 24;

    // Wheel dimensions — fit nicely in the panel width
    const radius = Math.min(Math.floor((w - 40) / 2), 140);
    const cx = w / 2;
    const cy = y + radius + 4;

    // Create a container for the wheel (for easy rotation)
    const wheelCont = this.scene.add.container(cx, cy);
    this.scrollContainer.add(wheelCont);
    this.wheelContainer = wheelCont;

    // Draw wheel slices and labels
    const drawWheel = () => {
      // Remove old graphics + labels
      if (this.wheelGraphics) { this.wheelGraphics.destroy(); }
      this.wheelLabelObjects.forEach(l => l.destroy());
      this.wheelLabelObjects = [];

      const g = this.scene.add.graphics();
      wheelCont.add(g);
      this.wheelGraphics = g;

      for (let i = 0; i < numSectors; i++) {
        const sector = WHEEL_SECTORS[i];
        const startA = i * sliceAngle + this.wheelAngle;
        const endA = startA + sliceAngle;
        const color = Phaser.Display.Color.HexStringToColor(sector.color).color;

        // Filled pie slice
        g.fillStyle(color, 0.85);
        g.beginPath();
        g.moveTo(0, 0);
        g.arc(0, 0, radius, startA, endA, false);
        g.closePath();
        g.fillPath();

        // Slice border
        g.lineStyle(1, 0xffffff, 0.6);
        g.beginPath();
        g.moveTo(0, 0);
        g.arc(0, 0, radius, startA, endA, false);
        g.closePath();
        g.strokePath();

        // Label positioned at 65% of radius along the middle of the slice
        const midA = startA + sliceAngle / 2;
        const labelR = radius * 0.65;
        const lx = Math.cos(midA) * labelR;
        const ly = Math.sin(midA) * labelR;

        const label = this.scene.add.text(lx, ly, sector.label, {
          fontSize: `${Math.max(10, Math.floor(radius / 11))}px`,
          fontFamily: 'Arial, sans-serif',
          color: '#fff',
          fontStyle: 'bold',
          stroke: '#000',
          strokeThickness: 2,
        }).setOrigin(0.5);
        // Rotate label to follow the slice angle
        label.setRotation(midA);
        wheelCont.add(label);
        this.wheelLabelObjects.push(label);
      }

      // Center circle overlay
      g.fillStyle(0xffffff, 1);
      g.fillCircle(0, 0, radius * 0.12);
      g.lineStyle(2, 0x333333, 1);
      g.strokeCircle(0, 0, radius * 0.12);
    };

    drawWheel();

    // Arrow pointer (fixed, pointing right → at 0 radians, i.e. right side of wheel)
    const arrowG = this.scene.add.graphics();
    const arrowX = cx + radius + 6;
    const arrowY = cy;
    arrowG.fillStyle(0xe74c3c, 1);
    arrowG.fillTriangle(
      arrowX, arrowY,
      arrowX + 18, arrowY - 10,
      arrowX + 18, arrowY + 10,
    );
    arrowG.lineStyle(2, 0xc0392b, 1);
    arrowG.strokeTriangle(
      arrowX, arrowY,
      arrowX + 18, arrowY - 10,
      arrowX + 18, arrowY + 10,
    );
    this.scrollContainer.add(arrowG);

    y = cy + radius + 16;

    // Result display area
    const resultText = this.addText(w / 2, y, '', 14, '#333', 'bold').setOrigin(0.5, 0);
    y += 28;

    // Spin button
    this.addButton((w - 160) / 2, y, 160, 38, `\u{1F3B0} Tourner (${WHEEL_SPIN_COST}\u{1F4B0})`, () => {
      if (this.wheelSpinning) return;
      if (state.coins < WHEEL_SPIN_COST) {
        resultText.setText('Pas assez de pieces!');
        resultText.setColor('#e74c3c');
        return;
      }
      state.coins -= WHEEL_SPIN_COST;
      state.wheelSpins++;
      this.wheelSpinning = true;

      resultText.setText('\u{1F3B0} La roue tourne...');
      resultText.setColor('#e67e22');

      // Pick a random target sector
      const targetIdx = Math.floor(Math.random() * numSectors);
      // Total rotation: 6 full spins + angle to land on targetIdx
      // The pointer is at angle 0 (right). For sector i, its center is at i*sliceAngle + sliceAngle/2.
      // We want the wheel to rotate so that sector targetIdx's center aligns with angle 0.
      // Since we rotate the wheel clockwise (increasing angle), the final rotation needs:
      //   finalAngle = -(targetIdx * sliceAngle + sliceAngle/2) + some random jitter within the slice
      // But since we add full rotations, it's all mod 2PI. Let's compute:
      const jitter = (Math.random() - 0.5) * sliceAngle * 0.6; // small random offset within the slice
      const targetAngle = -(targetIdx * sliceAngle + sliceAngle / 2) + jitter;
      const fullSpins = Math.PI * 2 * (5 + Math.floor(Math.random() * 3)); // 5-7 full rotations
      const totalRotation = fullSpins + targetAngle - this.wheelAngle;

      const startAngle = this.wheelAngle;
      const startTime = Date.now();
      const duration = 3000; // 3 seconds

      const animSpin = () => {
        const elapsed = Date.now() - startTime;
        const t = Math.min(1, elapsed / duration);
        // Ease-out cubic: 1 - (1-t)^3
        const ease = 1 - Math.pow(1 - t, 3);
        this.wheelAngle = startAngle + ease * totalRotation;
        drawWheel();

        if (t < 1) {
          requestAnimationFrame(animSpin);
        } else {
          // Animation done — determine winner
          this.wheelSpinning = false;
          const result = WHEEL_SECTORS[targetIdx];

          // Apply reward
          switch (result.type) {
            case 'star':
              state.stars += result.quantity;
              resultText.setText(`\u2B50 +${result.quantity} etoile(s)!`);
              break;
            case 'water':
              state.water = Math.min(state.maxWater, state.water + result.quantity);
              resultText.setText(`\u{1F4A7} +${result.quantity} eau!`);
              break;
            case 'coins':
              state.coins += result.quantity;
              state.totalEarned += result.quantity;
              resultText.setText(`\u{1F4B0} +${result.quantity} pieces!`);
              break;
            case 'wood':
              gameState.addResource('bois', result.quantity);
              resultText.setText(`\u{1FAB5} +${result.quantity} bois!`);
              break;
            case 'random': {
              const rk = getRandomResourceKey();
              gameState.addResource(rk, result.quantity);
              const ri = RESOURCE_INFO[rk];
              resultText.setText(`\u{1F381} +${result.quantity} ${ri?.name ?? rk}!`);
              break;
            }
            case 'nothing':
              resultText.setText('\u274C Rien cette fois!');
              break;
          }

          resultText.setColor('#4caf50');
          gameState.save();
          gameState.emit();
        }
      };

      animSpin();
    });

    this.maxScroll = Math.max(0, y + 60 - this.panelY - this.panelH);
  }

  // ========================== MEMORY FARM ==========================

  private renderMemoryFarm(startY: number): void {
    const w = this.panelW;
    let y = startY;
    const state = gameState.data;

    this.addText(w / 2, y, `Parties: ${state.memoryPlays} | Meilleur: ${state.memoryBest || '-'} coups`, 11, '#333', 'bold').setOrigin(0.5, 0);
    y += 24;

    // Initialize game if needed
    if (this.memCards.length === 0) {
      this.initMemoryFarmGame();
    }

    const cols = 4;
    const rows = 4;
    const gap = 4;
    const cellSize = Math.min(60, Math.floor((w - 16 - gap * (cols - 1)) / cols));
    const gridW = cols * cellSize + (cols - 1) * gap;
    const ox = (w - gridW) / 2;

    const moveText = this.addText(w / 2, y, `Coups: ${this.memMoves}`, 11, '#666').setOrigin(0.5, 0);
    y += 22;

    const drawCards = () => {
      const toRemove = this.scrollContainer.list.filter((o: any) => o.getData?.('emCard'));
      toRemove.forEach((o: any) => o.destroy());

      for (let i = 0; i < this.memCards.length; i++) {
        const col = i % cols;
        const row = Math.floor(i / cols);
        const cx = ox + col * (cellSize + gap);
        const cy = y + row * (cellSize + gap);
        const isFlipped = this.memFlipped.includes(i);
        const isMatched = this.memMatched.has(this.memCards[i]) && (() => {
          // Check if this specific card index is in a matched pair
          // Actually check if the emoji at this position is in the matched set
          return this.memMatched.has(this.memCards[i]);
        })();

        const show = isFlipped || isMatched;
        const g = this.scene.add.graphics();
        g.fillStyle(isMatched ? 0xc8e6c9 : show ? 0xffffff : 0x2ecc71, 1);
        g.fillRoundedRect(cx, cy, cellSize, cellSize, 6);
        g.lineStyle(1, 0xcccccc, 1);
        g.strokeRoundedRect(cx, cy, cellSize, cellSize, 6);
        g.setData('emCard', true);
        this.scrollContainer.add(g);

        if (show) {
          const t = this.addText(cx + cellSize / 2, cy + cellSize / 2, this.memCards[i], 24, '#333');
          t.setOrigin(0.5).setData('emCard', true);
        }

        if (!isMatched && !isFlipped) {
          const hit = this.scene.add.rectangle(cx + cellSize / 2, cy + cellSize / 2, cellSize, cellSize, 0, 0)
            .setInteractive({ useHandCursor: true }).setData('emCard', true);
          this.scrollContainer.add(hit);
          hit.on('pointerup', (ptr: Phaser.Input.Pointer) => {
            if (this.memLocked || Math.abs(ptr.y - this.dragStartPointer.y) > DRAG_THRESHOLD) return;
            if (this.memFlipped.includes(i)) return;

            this.memFlipped.push(i);
            drawCards();

            if (this.memFlipped.length === 2) {
              this.memMoves++;
              moveText.setText(`Coups: ${this.memMoves}`);
              this.memLocked = true;
              const [a, b] = this.memFlipped;
              if (this.memCards[a] === this.memCards[b]) {
                this.memMatched.add(this.memCards[a]);
                this.memFlipped = [];
                this.memLocked = false;
                drawCards();

                // Check win: 8 pairs matched
                if (this.memMatched.size >= 8) {
                  const reward = Math.max(10, 50 - this.memMoves * 2);
                  state.coins += reward;
                  state.totalEarned += reward;
                  state.memoryPlays++;
                  if (state.memoryBest === 0 || this.memMoves < state.memoryBest) {
                    state.memoryBest = this.memMoves;
                  }
                  gameState.save();
                  gameState.emit();

                  // Show win
                  this.addText(w / 2, y + rows * (cellSize + gap) + 12, `\u{1F389} Bravo! +${reward}\u{1F4B0} en ${this.memMoves} coups`, 12, '#4caf50', 'bold').setOrigin(0.5, 0);

                  this.addButton((w - 120) / 2, y + rows * (cellSize + gap) + 36, 120, 28, '\u{1F504} Rejouer', () => {
                    this.initMemoryFarmGame();
                    this.refresh();
                  });
                }
              } else {
                this.scene.time.delayedCall(800, () => {
                  this.memFlipped = [];
                  this.memLocked = false;
                  drawCards();
                });
              }
            }
          });
        }
      }
    };

    drawCards();

    this.maxScroll = 0;
  }

  private initMemoryFarmGame(): void {
    const emojis = EVENT_MEMORY_EMOJIS.slice();
    this.memCards = shuffle([...emojis, ...emojis]);
    this.memFlipped = [];
    this.memMatched = new Set();
    this.memLocked = false;
    this.memMoves = 0;
  }

  // ========================== JUSTE PRIX ==========================

  private renderJustePrix(startY: number): void {
    const w = this.panelW;
    let y = startY;
    const state = gameState.data;

    // Generate questions on first access
    if (this.justePrixQuestions.length === 0) {
      this.justePrixQuestions = generateJustePrixQuestions();
    }

    const totalQ = this.justePrixQuestions.length;
    const answered = state.justePrixAnswered.length;

    this.addText(w / 2, y, `Score: ${state.justePrixScore}/${totalQ} | +20\u{1F4B0}/bonne reponse`, 11, '#333', 'bold').setOrigin(0.5, 0);
    y += 22;
    this.addText(w / 2, y, `Repondu: ${answered}/${totalQ}`, 10, '#666').setOrigin(0.5, 0);
    y += 24;

    if (answered >= totalQ) {
      this.addText(w / 2, y, '\u{1F3C6} Toutes les questions repondues!', 13, '#4caf50', 'bold').setOrigin(0.5, 0);
      y += 28;
      this.addButton((w - 120) / 2, y, 120, 32, '\u{1F504} Recommencer', () => {
        state.justePrixAnswered = [];
        state.justePrixScore = 0;
        this.justePrixQuestions = generateJustePrixQuestions();
        this.justePrixCurrent = -1;
        this.refresh();
      });
      return;
    }

    // Pick random unanswered
    if (this.justePrixCurrent < 0 || state.justePrixAnswered.includes(this.justePrixCurrent)) {
      const available = [];
      for (let i = 0; i < totalQ; i++) {
        if (!state.justePrixAnswered.includes(i)) available.push(i);
      }
      this.justePrixCurrent = available[Math.floor(Math.random() * available.length)];
    }

    const q = this.justePrixQuestions[this.justePrixCurrent];
    if (!q) return;

    this.addText(16, y, q.q, 12, '#333', 'bold').setWordWrapWidth(w - 32);
    y += 36;

    for (let oi = 0; oi < q.options.length; oi++) {
      this.addButton(16, y, w - 32, 36, `${fmtN(q.options[oi])} \u{1F4B0}`, () => {
        state.justePrixAnswered.push(this.justePrixCurrent);
        if (oi === q.answer) {
          state.justePrixScore++;
          state.coins += 20;
          state.totalEarned += 20;
        }
        this.justePrixCurrent = -1;
        gameState.save();
        gameState.emit();
        this.refresh();
      });
      y += 44;
    }

    this.maxScroll = Math.max(0, y + 20 - this.panelY - this.panelH);
  }

  // ========================== COMBO CLICK ==========================

  private renderCombo(startY: number): void {
    const w = this.panelW;
    let y = startY;
    const state = gameState.data;

    this.addText(w / 2, y, `Parties: ${state.comboClickPlays} | Record: ${state.comboClickBest}`, 11, '#333', 'bold').setOrigin(0.5, 0);
    y += 22;

    // Show tiers
    this.addText(w / 2, y, 'Paliers de recompenses:', 10, '#666').setOrigin(0.5, 0);
    y += 18;
    for (const tier of COMBO_TIERS) {
      if (tier.minClicks > 0) {
        this.addText(w / 2, y, `${tier.minClicks}+ clics = ${fmtN(tier.reward)}\u{1F4B0}`, 9, '#888').setOrigin(0.5, 0);
        y += 14;
      }
    }
    y += 10;

    if (!this.comboRunning) {
      // Timer and counter (before start)
      const timerText = this.addText(w / 2, y, '10.0s', 24, '#333', 'bold').setOrigin(0.5, 0);
      y += 36;
      const counterText = this.addText(w / 2, y, '0 clics', 18, '#666').setOrigin(0.5, 0);
      y += 32;

      // Big click button
      const btnR = 80;
      const btnCx = w / 2;
      const btnCy = y + btnR;

      const circle = this.scene.add.graphics();
      circle.fillStyle(0xe91e63, 1);
      circle.fillCircle(btnCx, btnCy, btnR);
      this.scrollContainer.add(circle);

      this.addText(btnCx, btnCy - 10, '\u{1F446}', 32, '#fff').setOrigin(0.5);
      this.addText(btnCx, btnCy + 20, 'CLIQUER!', 12, '#fff', 'bold').setOrigin(0.5);

      const hit = this.scene.add.circle(btnCx, btnCy, btnR, 0x000000, 0)
        .setInteractive({ useHandCursor: true });
      this.scrollContainer.add(hit);

      hit.on('pointerup', () => {
        if (this.comboRunning) {
          this.comboClicks++;
          counterText.setText(`${this.comboClicks} clics`);
          return;
        }

        // Start the game
        this.comboRunning = true;
        this.comboClicks = 1;
        this.comboTimeLeft = COMBO_DURATION_MS;
        counterText.setText('1 clics');

        // Timer
        this.comboTimer = this.scene.time.addEvent({
          delay: 100,
          loop: true,
          callback: () => {
            this.comboTimeLeft -= 100;
            if (this.comboTimeLeft <= 0) {
              this.comboTimeLeft = 0;
              this.comboRunning = false;
              this.comboTimer?.destroy();
              this.comboTimer = null;

              timerText.setText('0.0s');

              // Calculate reward
              let reward = 10;
              for (const tier of COMBO_TIERS) {
                if (this.comboClicks >= tier.minClicks) { reward = tier.reward; break; }
              }

              state.coins += reward;
              state.totalEarned += reward;
              state.comboClickPlays++;
              if (this.comboClicks > state.comboClickBest) {
                state.comboClickBest = this.comboClicks;
              }

              gameState.save();
              gameState.emit();

              // Show result
              this.addText(w / 2, btnCy + btnR + 20, `\u{1F389} ${this.comboClicks} clics! +${fmtN(reward)}\u{1F4B0}`, 14, '#4caf50', 'bold').setOrigin(0.5, 0);

              this.addButton((w - 120) / 2, btnCy + btnR + 48, 120, 28, '\u{1F504} Rejouer', () => {
                this.comboClicks = 0;
                this.comboTimeLeft = 0;
                this.comboRunning = false;
                this.refresh();
              });
            } else {
              timerText.setText((this.comboTimeLeft / 1000).toFixed(1) + 's');
            }
          },
        });
      });
    }

    this.maxScroll = 0;
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

  private clearTimers(): void {
    if (this.comboTimer) {
      this.comboTimer.destroy();
      this.comboTimer = null;
    }
    this.comboRunning = false;
    // Clean up wheel references (objects are destroyed via scrollContainer.removeAll)
    this.wheelGraphics = null;
    this.wheelLabelObjects = [];
    this.wheelContainer = null;
  }

  destroy(): void {
    this.clearTimers();
    this.container.destroy();
  }
}
