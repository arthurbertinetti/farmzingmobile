// src/scenes/ShopPanel.ts
// Shop panel with 4 sub-tabs: Acheter, Vendre, Amelio, Autre (Banque)
import Phaser from 'phaser';
import { gameState } from '../systems/GameState';
import { CROPS } from '../data/crops';
import { TREES } from '../data/trees';
import { RESOURCE_INFO } from '../data/resources';
import { UPGRADES, UPG_GROUPS, getUpgradeCost } from '../data/upgrades';
import { COLORS, UI } from '../utils/constants';
import { fmtN } from '../utils/helpers';
import { showFloatingText } from '../ui/FloatingText';
import { buildSubTabBar } from '../ui/SubTabBar';
import { musicManager } from '../systems/MusicManager';
import { SAVE_KEY } from '../utils/constants';
import { ScrollHelper } from '../ui/ScrollHelper';

const WATER_PACKS = [
  { amount: 10, cost: 20, label: '10\u{1F4A7}' },
  { amount: 30, cost: 50, label: '30\u{1F4A7}' },
  { amount: 100, cost: 150, label: '100\u{1F4A7}' },
];

type ShopTab = 'buy' | 'sell' | 'upgrades' | 'autre';
type SellCat = 'cultures' | 'arbres' | 'animaux' | 'ateliers';

// Resource category mappings for sell sub-tabs
const SELL_CAT_CROP: string[] = [
  'ble', 'mais', 'fraise', 'tomate', 'carotte', 'oignon', 'patate',
  'champignon', 'citrouille', 'cerise', 'fleur',
];
const SELL_CAT_TREE: string[] = [
  'bois', 'pomme', 'poire', 'orange', 'citron', 'banane', 'peche',
  'mangue', 'raisin', 'noix_coco', 'olive',
];
const SELL_CAT_ANIMAL: string[] = [
  'lait', 'oeuf', 'laine', 'lait_chevre', 'miel', 'viande_porc',
  'viande_dinde', 'plume', 'fourrure',
];

export class ShopPanel {
  private scene: Phaser.Scene;
  private container!: Phaser.GameObjects.Container;
  private subTabContainer!: Phaser.GameObjects.Container;
  private scrollContainer!: Phaser.GameObjects.Container;
  private activeTab: ShopTab = 'buy';
  private sellCat: SellCat = 'cultures';
  private contentHeight = 0;
  private scroller!: ScrollHelper;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    this.container = scene.add.container(0, 0);
    this.container.setDepth(10);
    this.container.setVisible(false);
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

  private clampScroll(sy: number): number {
    const { height } = this.scene.scale;
    const viewH = height - this.subTabBottom - UI.TAB_HEIGHT;
    const minS = Math.min(0, viewH - this.contentHeight - 20);
    return Math.max(minS, Math.min(0, sy));
  }

  refresh(): void {
    // Save scroll position before rebuilding
    const savedScroll = this.scroller.scrollY;

    this.container.removeAll(true);
    this.subTabContainer = this.scene.add.container(0, 0);
    this.scrollContainer = this.scene.add.container(0, this.subTabBottom);
    this.container.add([this.subTabContainer, this.scrollContainer]);
    this.scroller.reset();

    const { width } = this.scene.scale;

    // Title
    const titleBg = this.scene.add.graphics();
    titleBg.fillStyle(COLORS.sky, 1);
    titleBg.fillRect(0, UI.HUD_HEIGHT, width, 30);
    const title = this.scene.add.text(width / 2, UI.HUD_HEIGHT + 15, '\u{1F3EA} Boutique', {
      fontSize: '16px', fontFamily: 'Arial, sans-serif', color: '#4e342e', fontStyle: 'bold',
    }).setOrigin(0.5);
    this.container.add([titleBg, title]);

    // Sub-tabs
    buildSubTabBar(this.scene, this.subTabContainer,
      [
        { id: 'buy', label: '\u{1F6D2} Acheter' },
        { id: 'sell', label: '\u{1F4E6} Vendre' },
        { id: 'upgrades', label: '\u2B06\uFE0F Amelio.' },
        { id: 'autre', label: '\u2699\uFE0F Autre' },
      ],
      this.activeTab,
      UI.HUD_HEIGHT + 30,
      (id) => { this.activeTab = id as ShopTab; this.refresh(); },
    );

    // Render content
    if (this.activeTab === 'buy') this.renderBuy();
    else if (this.activeTab === 'sell') this.renderSell();
    else if (this.activeTab === 'upgrades') this.renderUpgrades();
    else this.renderAutre();

    // Scroll mask
    const { height } = this.scene.scale;
    const maskG = this.scene.make.graphics({});
    maskG.fillRect(0, this.subTabBottom, width, height - this.subTabBottom - UI.TAB_HEIGHT);
    this.scrollContainer.setMask(maskG.createGeometryMask());

    // Restore scroll position (clamped to new content bounds)
    this.scroller.scrollY = this.clampScroll(savedScroll);
    this.scrollContainer.setY(this.subTabBottom + this.scroller.scrollY);
  }

  // ========== BUY ==========
  private renderBuy(): void {
    let y = 0;
    const { width } = this.scene.scale;
    y = this.renderSectionHeader('\u{1F4A7} Eau', y);
    WATER_PACKS.forEach(pk => {
      y = this.renderShopItem('\u{1F4A7}', pk.label, 'Recharge immediate',
        `${fmtN(pk.cost)}\u{1F4B0}`, gameState.data.coins >= pk.cost,
        () => {
          if (gameState.data.coins >= pk.cost) {
            gameState.data.coins -= pk.cost;
            gameState.data.water = Math.min(gameState.data.maxWater, gameState.data.water + pk.amount);
            showFloatingText(this.scene, width / 2, 200, `+${pk.amount}\u{1F4A7}`);
            gameState.emit(); this.refresh();
          }
        }, y);
    });
    y = this.renderSectionHeader('\u{1F331} Cultures', y);
    CROPS.forEach((crop, i) => {
      const ok = crop.reqLevel <= gameState.data.level;
      const sv = gameState.getSellValue(0, i);
      y = this.renderShopItem(crop.emoji,
        crop.name + (ok ? '' : ` \u{1F512}Niv.${crop.reqLevel}`),
        `\u23F1${crop.stageTime}s | \u{1F4B0}${fmtN(sv)} | \u2B50+${crop.xp}`,
        `${fmtN(crop.cost)}\u{1F4B0}`, ok && gameState.data.coins >= crop.cost,
        () => this.buyAndPlant(0, i, crop.cost), y, ok ? 1 : 0.45);
    });
    y = this.renderSectionHeader('\u{1F333} Arbres', y);
    TREES.forEach((tree, i) => {
      const ok = tree.reqLevel <= gameState.data.level;
      const sv = gameState.getSellValue(1, i);
      y = this.renderShopItem(tree.emoji,
        tree.name + (ok ? '' : ` \u{1F512}Niv.${tree.reqLevel}`),
        `\u23F1${tree.stageTime}s | \u{1F4B0}${fmtN(sv)} | \u2B50+${tree.xp}`,
        `${fmtN(tree.cost)}\u{1F4B0}`, ok && gameState.data.coins >= tree.cost,
        () => this.buyAndPlant(1, i, tree.cost), y, ok ? 1 : 0.45);
    });
    this.contentHeight = y;
  }

  private buyAndPlant(cat: number, idx: number, cost: number): void {
    const plot = gameState.data.plots.find(p => !p.locked && p.catIdx < 0);
    if (!plot) { showFloatingText(this.scene, this.scene.scale.width / 2, 200, '\u274C Plus de place!', '#ff6666'); return; }
    if (gameState.data.coins < cost) { showFloatingText(this.scene, this.scene.scale.width / 2, 200, '\u274C Pas assez!', '#ff6666'); return; }
    gameState.data.coins -= cost; plot.catIdx = cat; plot.itemIdx = idx; plot.waterCount = 0; plot.lastWater = 0;
    const items = cat === 0 ? CROPS : TREES;
    showFloatingText(this.scene, this.scene.scale.width / 2, 200, `\u{1F331} ${items[idx].name}`);
    gameState.emit(); this.refresh();
  }

  // ========== SELL ==========
  private renderSell(): void {
    let y = 0;
    const { width } = this.scene.scale;

    // Sub-sub-tabs for sell categories
    const sellTabs: { id: SellCat; label: string }[] = [
      { id: 'cultures', label: '\u{1F331} Cultures' },
      { id: 'arbres', label: '\u{1F333} Arbres' },
      { id: 'animaux', label: '\u{1F404} Animaux' },
      { id: 'ateliers', label: '\u{1F3ED} Ateliers' },
    ];
    const tabW = (width - 16) / sellTabs.length;
    const tabH = 24;
    sellTabs.forEach((tab, i) => {
      const tx = 8 + tabW * i + tabW / 2;
      const isActive = this.sellCat === tab.id;
      const bg = this.scene.add.graphics();
      bg.fillStyle(isActive ? 0xfff3e0 : 0xffffff, isActive ? 1 : 0.7);
      if (isActive) bg.lineStyle(2, COLORS.goldDark, 1);
      bg.fillRoundedRect(tx - tabW / 2 + 2, y, tabW - 4, tabH, 7);
      if (isActive) bg.strokeRoundedRect(tx - tabW / 2 + 2, y, tabW - 4, tabH, 7);
      const label = this.scene.add.text(tx, y + tabH / 2, tab.label, {
        fontSize: '10px', fontFamily: 'Arial, sans-serif', color: '#333', fontStyle: isActive ? 'bold' : 'normal',
      }).setOrigin(0.5);
      const hit = this.scene.add.rectangle(tx, y + tabH / 2, tabW - 4, tabH, 0, 0)
        .setInteractive({ useHandCursor: true })
        .on('pointerdown', () => { this.sellCat = tab.id; this.refresh(); });
      this.scrollContainer.add([bg, label, hit]);
    });
    y += tabH + 8;

    // Filter resources by category
    let catKeys: string[];
    if (this.sellCat === 'cultures') catKeys = SELL_CAT_CROP;
    else if (this.sellCat === 'arbres') catKeys = SELL_CAT_TREE;
    else if (this.sellCat === 'animaux') catKeys = SELL_CAT_ANIMAL;
    else {
      // Ateliers = everything not in the other 3 categories
      const allExcluded = new Set([...SELL_CAT_CROP, ...SELL_CAT_TREE, ...SELL_CAT_ANIMAL]);
      catKeys = Object.keys(RESOURCE_INFO).filter(k => !allExcluded.has(k));
    }

    const sellableKeys = catKeys.filter(k => (gameState.data.resources[k] ?? 0) > 0);
    if (sellableKeys.length === 0) {
      const noRes = this.scene.add.text(width / 2, y + 30, '\u{1F4E6} Aucune ressource a vendre', {
        fontSize: '13px', fontFamily: 'Arial, sans-serif', color: '#888',
      }).setOrigin(0.5);
      this.scrollContainer.add(noRes); this.contentHeight = y + 80; return;
    }
    sellableKeys.forEach(key => {
      const info = RESOURCE_INFO[key]; const qty = gameState.data.resources[key] ?? 0; if (qty <= 0) return;
      y = this.renderShopItem(info.emoji, `${info.name} (x${qty})`, `${fmtN(info.sellPrice)}\u{1F4B0} / unite`,
        'Vendre x1', true, () => {
          if ((gameState.data.resources[key] ?? 0) < 1) return;
          gameState.data.resources[key]--; gameState.data.coins += info.sellPrice; gameState.data.totalEarned += info.sellPrice;
          showFloatingText(this.scene, width / 2, 200, `+${fmtN(info.sellPrice)}\u{1F4B0}`);
          gameState.emit(); this.refresh();
        }, y);
    });
    this.contentHeight = y;
  }

  // ========== UPGRADES ==========
  private renderUpgrades(): void {
    let y = 0;
    UPG_GROUPS.forEach(grp => {
      y = this.renderSectionHeader(grp.label, y);
      UPGRADES.filter(u => u.group === grp.id).forEach(upg => {
        const lv = gameState.getUpgrade(upg.id); const isMax = lv >= upg.maxLevel;
        let resets = 0;
        if (upg.id === 'autoharvest') resets = gameState.data.ahResets;
        else if (upg.id === 'autowater') resets = gameState.data.awResets;
        else if (upg.id === 'autoatelier') resets = gameState.data.aaResets;
        else if (upg.id === 'autofeed') resets = gameState.data.afResets;
        const cost = getUpgradeCost(upg, lv, resets);
        const canBuy = !isMax && gameState.data.coins >= cost;
        let extra = '';
        if (upg.id === 'watermax') extra = ` (${gameState.data.maxWater})`;
        if (upg.id === 'speed') extra = ` (-${lv * 5}%)`;
        if (upg.id === 'bspeed') extra = ` (-${lv * 5}%)`;
        if (upg.id === 'animalspeed') extra = ` (-${lv * 5}%)`;
        if (upg.id === 'value') extra = ` (+${lv * 15}%)`;
        if (upg.id === 'animalvalue') extra = ` (+${lv})`;
        if (upg.id === 'animalslots') extra = ` (${gameState.getAnimalUnlockedSlots()})`;
        y = this.renderShopItem(upg.icon, `${upg.name} (${lv}/${upg.maxLevel})${extra}`, upg.desc,
          isMax ? 'MAX' : `${fmtN(cost)}\u{1F4B0}`, canBuy, () => {
            if (isMax || gameState.data.coins < cost) return;
            gameState.data.coins -= cost; gameState.setUpgrade(upg.id, lv + 1);
            if (upg.id === 'watermax') gameState.data.maxWater = 100 + gameState.getUpgrade('watermax') * 10;
            if (upg.id === 'animalslots') {
              const unlocked = gameState.getAnimalUnlockedSlots();
              for (let i = 0; i < gameState.data.animalSlots.length; i++) {
                gameState.data.animalSlots[i].locked = i >= unlocked;
              }
            }
            showFloatingText(this.scene, this.scene.scale.width / 2, 200, `\u2B06\uFE0F ${upg.name}!`);
            gameState.emit(); this.refresh();
          }, y);
      });
    });
    this.contentHeight = y;
  }

  // ========== AUTRE (BANK) ==========
  private renderAutre(): void {
    let y = 0;
    const { width } = this.scene.scale;
    const d = gameState.data;

    // DEBT
    if (d.debt > 0) {
      y = this.renderSectionHeader(`\u{1F4B3} Rembourser credit (${fmtN(d.debt)}\u{1F4B0})`, y);
      const debtRate = gameState.getDebtRate();
      y = this.renderShopItem('\u{1F4B3}', 'Credit en cours',
        `Interet mensuel: ${(debtRate * 100).toFixed(1)}% \u00B7 Remboursez vite!`,
        '', false, () => {}, y);

      const repays = [
        { pct: 0.1, label: 'Payer 10%' },
        { pct: 0.5, label: 'Payer 50%' },
        { pct: 1.0, label: 'Payer Tout' },
      ];
      for (const rp of repays) {
        const amt = Math.min(Math.floor(d.debt * rp.pct), d.coins);
        if (amt <= 0) continue;
        y = this.renderShopItem('\u{1F4B0}', rp.label, `${fmtN(amt)}\u{1F4B0}`,
          'Payer', amt > 0, () => {
            const a = Math.min(Math.floor(gameState.data.debt * rp.pct), gameState.data.coins);
            if (a <= 0) return;
            gameState.data.coins -= a; gameState.data.debt -= a;
            showFloatingText(this.scene, width / 2, 200, `\u{1F4B3} -${fmtN(a)}`);
            gameState.emit(); this.refresh();
          }, y, 1, 0xe74c3c);
      }
    }

    // SAVINGS
    const savLv = gameState.getUpgrade('savingsrate');
    if (savLv > 0) {
      const savRate = gameState.getSavingsRate();
      y = this.renderSectionHeader(`\u{1F3E6} Epargne (${(savRate * 100).toFixed(1)}%/mois)`, y);
      y = this.renderShopItem('\u{1F3E6}', `Solde: ${fmtN(d.savings)}\u{1F4B0}`,
        'Interet verse chaque mois', '', false, () => {}, y);

      // Deposit
      const depositPcts = [0.1, 0.25, 0.5, 1.0];
      for (const pct of depositPcts) {
        const amt = Math.floor(d.coins * pct);
        if (amt <= 0) continue;
        y = this.renderShopItem('\u2B07\uFE0F', `Deposer ${Math.round(pct * 100)}%`,
          `${fmtN(amt)}\u{1F4B0}`, 'Deposer', true, () => {
            const a = Math.floor(gameState.data.coins * pct);
            if (a <= 0) return;
            gameState.data.coins -= a; gameState.data.savings += a;
            showFloatingText(this.scene, width / 2, 200, `\u{1F3E6} +${fmtN(a)}`);
            gameState.emit(); this.refresh();
          }, y, 1, 0x2980b9);
      }

      // Withdraw
      if (d.savings > 0) {
        y = this.renderShopItem('\u2B06\uFE0F', `Retirer tout (${fmtN(d.savings)})`,
          'Recuperer votre epargne', 'Retirer', true, () => {
            const a = gameState.data.savings; gameState.data.savings = 0; gameState.data.coins += a;
            showFloatingText(this.scene, width / 2, 200, `+${fmtN(a)}\u{1F4B0}`);
            gameState.emit(); this.refresh();
          }, y, 1, 0xe67e22);
      }
    }

    if (d.debt <= 0 && savLv <= 0) {
      const noBank = this.scene.add.text(width / 2, 40, '\u{1F3E6} Ameliorez "Taux d\'epargne" pour debloquer', {
        fontSize: '11px', fontFamily: 'Arial, sans-serif', color: '#888',
      }).setOrigin(0.5);
      this.scrollContainer.add(noBank);
      y = 80;
    }

    // ========== SETTINGS ==========
    y = this.renderSectionHeader('\u2699\uFE0F Parametres', y);

    // Volume slider
    {
      const itemH = 50;
      const bg = this.scene.add.graphics();
      bg.fillStyle(0xffffff, 1);
      bg.fillRoundedRect(10, y + 2, width - 20, itemH, 9);
      const label = this.scene.add.text(20, y + 14, `\u{1F50A} Volume: ${Math.round(musicManager.volume * 100)}%`, {
        fontSize: '12px', fontFamily: 'Arial, sans-serif', color: '#333', fontStyle: 'bold',
      });

      // Slider track
      const sliderX = 20;
      const sliderW = width - 100;
      const sliderY = y + 36;
      const sliderG = this.scene.add.graphics();
      sliderG.fillStyle(0xcccccc, 1);
      sliderG.fillRoundedRect(sliderX, sliderY, sliderW, 6, 3);
      // Filled portion
      sliderG.fillStyle(0x4caf50, 1);
      sliderG.fillRoundedRect(sliderX, sliderY, sliderW * musicManager.volume, 6, 3);
      // Knob
      const knobX = sliderX + sliderW * musicManager.volume;
      const knob = this.scene.add.circle(knobX, sliderY + 3, 9, 0x4caf50)
        .setStrokeStyle(2, 0x388e3c);

      // Hit area for slider
      const sliderHit = this.scene.add.rectangle(sliderX + sliderW / 2, sliderY + 3, sliderW + 18, 24, 0, 0)
        .setInteractive({ useHandCursor: true, draggable: false })
        .on('pointerdown', (p: Phaser.Input.Pointer) => {
          const localX = p.x - sliderX;
          const v = Math.max(0, Math.min(1, localX / sliderW));
          musicManager.setVolume(v);
          this.refresh();
        });

      // - / + buttons
      const minusBtn = this.scene.add.text(width - 66, y + 28, '\u2796', {
        fontSize: '16px',
      }).setOrigin(0.5).setInteractive({ useHandCursor: true })
        .on('pointerdown', () => { musicManager.setVolume(musicManager.volume - 0.1); this.refresh(); });
      const plusBtn = this.scene.add.text(width - 34, y + 28, '\u2795', {
        fontSize: '16px',
      }).setOrigin(0.5).setInteractive({ useHandCursor: true })
        .on('pointerdown', () => { musicManager.setVolume(musicManager.volume + 0.1); this.refresh(); });

      this.scrollContainer.add([bg, label, sliderG, knob, sliderHit, minusBtn, plusBtn]);
      y += itemH + 4;
    }

    // ========== CHEAT CODES ==========
    y = this.renderSectionHeader('\u{1F511} Code secret', y);
    y = this.renderShopItem('\u{1F511}', 'Entrer un code',
      'Tape un code secret et valide',
      'Entrer', true, () => {
        const raw = window.prompt('Entrer un code secret :');
        if (!raw) return;
        const code = raw.trim().toUpperCase();
        if (code === 'OR') {
          gameState.data.coins += 10000; gameState.data.totalEarned += 10000;
          showFloatingText(this.scene, width / 2, 200, '+10000\u{1F4B0}');
        } else if (code === 'EAU') {
          gameState.data.water = Math.min(gameState.data.maxWater, gameState.data.water + 1000);
          showFloatingText(this.scene, width / 2, 200, '+1000\u{1F4A7}');
        } else if (code === 'ZING') {
          gameState.data.coins += 1000000; gameState.data.totalEarned += 1000000;
          gameState.data.water += 10000;
          showFloatingText(this.scene, width / 2, 200, '+1M\u{1F4B0} +10K\u{1F4A7}');
        } else if (code === 'RESETALL') {
          if (window.confirm('Etes-vous sur de remettre tout a zero ?')) {
            localStorage.removeItem(SAVE_KEY);
            location.reload();
          }
          return;
        } else {
          showFloatingText(this.scene, width / 2, 200, '\u274C Code invalide', '#ff6666');
          return;
        }
        gameState.emit(); this.refresh();
      }, y, 1, 0x9b59b6);

    // ========== RESET ==========
    y = this.renderSectionHeader('\u{1F5D1}\uFE0F Danger', y);
    y = this.renderShopItem('\u{1F5D1}\uFE0F', 'Tout effacer',
      'Remet le jeu a zero (irreversible !)',
      'Effacer', true, () => {
        if (window.confirm('Etes-vous sur de TOUT effacer ?\nCette action est irreversible !')) {
          localStorage.removeItem(SAVE_KEY);
          location.reload();
        }
      }, y, 1, 0xe74c3c);

    this.contentHeight = y;
  }

  // ========== HELPERS ==========
  private renderSectionHeader(text: string, y: number): number {
    const { width } = this.scene.scale;
    const bg = this.scene.add.graphics();
    bg.fillStyle(0xffffff, 0.5); bg.fillRoundedRect(10, y + 4, width - 20, 24, 8);
    const label = this.scene.add.text(width / 2, y + 16, text, {
      fontSize: '13px', fontFamily: 'Arial, sans-serif', color: '#5d4037', fontStyle: 'bold',
    }).setOrigin(0.5);
    this.scrollContainer.add([bg, label]);
    return y + 32;
  }

  private renderShopItem(
    icon: string, name: string, desc: string,
    btnLabel: string, enabled: boolean,
    onClick: () => void, y: number, alpha = 1,
    btnColor?: number,
  ): number {
    const { width } = this.scene.scale;
    const itemW = width - 20; const itemH = 50;
    const bg = this.scene.add.graphics();
    bg.fillStyle(0xffffff, 1); bg.fillRoundedRect(10, y + 2, itemW, itemH, 9); bg.setAlpha(alpha);
    const iconTxt = this.scene.add.text(26, y + itemH / 2 + 2, icon, { fontSize: '22px' }).setOrigin(0.5).setAlpha(alpha);
    const nameTxt = this.scene.add.text(46, y + 12, name, {
      fontSize: '12px', fontFamily: 'Arial, sans-serif', color: '#333', fontStyle: 'bold',
    }).setAlpha(alpha);
    const descTxt = this.scene.add.text(46, y + 28, desc, {
      fontSize: '11px', fontFamily: 'Arial, sans-serif', color: '#666',
    }).setAlpha(alpha);

    // Add card background and text first (behind button)
    this.scrollContainer.add([bg, iconTxt, nameTxt, descTxt]);

    if (btnLabel) {
      const btnW = 70; const btnH = 28;
      const btnX = width - 14 - btnW; const btnY = y + (itemH - btnH) / 2 + 2;
      const btnBg = this.scene.add.graphics();
      btnBg.fillStyle(enabled ? (btnColor ?? COLORS.green) : 0x999999, 1);
      btnBg.fillRoundedRect(btnX, btnY, btnW, btnH, 7);
      const btnTxt = this.scene.add.text(btnX + btnW / 2, btnY + btnH / 2, btnLabel, {
        fontSize: '10px', fontFamily: 'Arial, sans-serif', color: '#fff', fontStyle: 'bold',
      }).setOrigin(0.5);
      this.scrollContainer.add([btnBg, btnTxt]);
      if (enabled) {
        const hit = this.scene.add.rectangle(btnX + btnW / 2, btnY + btnH / 2, btnW, btnH, 0, 0)
          .setInteractive({ useHandCursor: true }).on('pointerdown', onClick);
        this.scrollContainer.add(hit);
      }
    }

    return y + itemH + 4;
  }

  setVisible(visible: boolean): void { this.container.setVisible(visible); }
}
