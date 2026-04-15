// src/systems/GameState.ts
import {
  FARM_TOTAL, FARM_START_UNLOCKED, FARM_MAX_ROWS, SAVE_KEY, CAT_WATER, XP_TABLE,
  FARMER_MAX, FARMER_MAX_LVL, OUVRIER_MAX, OUVRIER_MAX_LVL,
  WELL_REPAIRS_NEEDED, WOOD_REPAIRS_NEEDED, DAY_MS,
} from '../utils/constants';
import { CROPS } from '../data/crops';
import { TREES } from '../data/trees';
import { ANIMALS, ANIMAL_FEED, ANIMAL_TOTAL, ANIMAL_START_UNLOCKED } from '../data/animals';
import { ATELIERS, ATELIER_TOTAL, ATELIER_START_UNLOCKED } from '../data/ateliers';
import { ALL_RESOURCE_KEYS, RESOURCE_INFO } from '../data/resources';
import { getSavingsRate, getDebtRate } from '../data/upgrades';
import { xpForLevel, shuffle } from '../utils/helpers';
import { GARDEN_SIZE, GARDEN_CATS, findGardenItem } from '../data/garden';
import {
  TRADE_NPCS, TRADE_BRUT_KEYS, TRADE_TRANSFO_KEYS,
  CROP_REWARD_KEYS, BRUT_REWARD_KEYS, ANIMAL_REWARD_KEYS,
} from '../data/trades';
import { MG_GAMES, MG_MAX_LEVEL } from '../data/minigames';
import { MarcheOffer, generateMarcheOffers } from '../data/events';

// ========== STATE INTERFACES ==========

export interface PlotState {
  /** 0 = crop, 1 = tree, -1 = empty */
  catIdx: number;
  /** Index within the category array */
  itemIdx: number;
  /** Water count (how many times watered) */
  waterCount: number;
  /** Last watered timestamp */
  lastWater: number;
  /** Is this plot locked? */
  locked: boolean;
}

export interface AnimalSlotState {
  /** Index in ANIMALS array, -1 = empty */
  animalIdx: number;
  /** Is slot locked? */
  locked: boolean;
  /** Is animal currently fed/producing? */
  fed: boolean;
  /** Timestamp when production started */
  prodStart: number;
  /** Auto-feed enabled for this slot? */
  autoFeed: boolean;
}

export interface AtelierSlotState {
  /** Index in ATELIERS array, -1 = empty (no building) */
  atelierIdx: number;
  /** Is slot locked? */
  locked: boolean;
  /** Currently crafting recipe index (-1 = idle) */
  craftRecipeIdx: number;
  /** Craft quantity */
  craftQty: number;
  /** Craft start timestamp */
  craftStart: number;
  /** Craft total duration in ms */
  craftDuration: number;
}

export interface FarmerState {
  /** Display name */
  name: string;
  /** Current level (1+) */
  level: number;
  /** Hire cost (for rent calculation) */
  hireCost: number;
  /** Assigned resource key, or 'repos' for rest */
  assignment: string;
  /** Last production timestamp */
  lastProd: number;
}

export interface OuvrierState {
  name: string;
  level: number;
  hireCost: number;
  /** "atelierIdx:recipeIdx" or 'repos' */
  assignment: string;
  lastProd: number;
}

// ========== QUEST INTERFACES ==========

export interface QuestState {
  type: 'farm' | 'animal' | 'atelier';
  target: string;    // item/recipe name
  emoji: string;
  /** For animal quests: resource key being tracked */
  resKey?: string;
  /** For atelier quests: building name */
  bld?: string;
  need: number;
  progress: number;
  gold: number;
  xp: number;
  claimed: boolean;
}

// ========== TRADE INTERFACES ==========

export interface TradeState {
  npc: string;
  emoji: string;
  demands: Record<string, number>;  // resource key -> qty needed
  gold: number;
  xp: number;
  done: boolean;
}

// ========== GARDEN INTERFACES ==========

export interface GardenCellState {
  id: string;       // garden item id
  stateIdx: number;  // renovation level (0 = initial)
}

export interface GameStateData {
  version: number;
  coins: number;
  water: number;
  maxWater: number;
  xp: number;
  level: number;
  totalEarned: number;
  totalHarvested: number;
  day: number;
  month: number;
  lastDayTick: number;
  lastWaterRegen: number;
  lastSave: number;
  debt: number;
  savings: number;
  stars: number;

  /** Currently selected category (0=crops, 1=trees) */
  selCat: number;
  /** Currently selected item index within category */
  selItem: number;

  /** Farm plots */
  plots: PlotState[];
  gridBought: number;

  /** Animal pen */
  animalSlots: AnimalSlotState[];
  /** Selected animal index for placement */
  selAnimal: number;

  /** Atelier building grid */
  atelierSlots: AtelierSlotState[];
  bgridBought: number;

  /** Upgrades */
  upgrades: Record<string, number>;
  /** Resources inventory */
  resources: Record<string, number>;

  /** Auto timers end timestamps */
  autoHarvestEnd: number;
  autoWaterEnd: number;
  autoAtelierEnd: number;
  autoFeedEnd: number;
  /** Auto reset counts (for cost scaling) */
  ahResets: number;
  awResets: number;
  aaResets: number;
  afResets: number;

  /** Well */
  wellRepairs: number;
  wellWater: number;
  lastWellTick: number;

  /** Wood station */
  woodRepairs: number;
  woodStock: number;
  lastWoodTick: number;

  /** Fermiers */
  farmers: FarmerState[];
  /** Ouvriers */
  ouvriers: OuvrierState[];

  /** Quests */
  quests: QuestState[];
  questMonth: number;
  questResets: number;

  /** Trades (barter) */
  trades: TradeState[];
  tradeMonth: number;

  /** Decorative garden (16x16) */
  gardenGrid: (GardenCellState | null)[];

  // ========== MINI-GAMES (Phase 4) ==========
  /** Mini-game levels: key -> current level (1-101, where 101 = all 100 done) */
  mgLevel: number;
  mmLevel: number;
  siLevel: number;
  tqLevel: number;
  flLevel: number;
  snLevel: number;
  maLevel: number;
  ppLevel: number;
  cpLevel: number;
  rvLevel: number;

  // ========== EVENTS (Phase 4) ==========
  /** Quiz event */
  quizAnswered: number[];
  quizStars: number;
  quizLastEventStart: number;

  /** Marche Fou event */
  marcheOffers: MarcheOffer[];
  marcheExpiry: number;
  marcheScore: number;

  /** Wheel event */
  wheelSpins: number;
  wheelLastSpin: number;

  /** Memory Farm event */
  memoryBest: number;
  memoryPlays: number;

  /** Juste Prix event */
  justePrixAnswered: number[];
  justePrixScore: number;

  /** Combo Click event */
  comboClickBest: number;
  comboClickPlays: number;
}

const CURRENT_VERSION = 4;

function createDefaultState(): GameStateData {
  const plots: PlotState[] = [];
  for (let i = 0; i < FARM_TOTAL; i++) {
    plots.push({
      catIdx: -1, itemIdx: -1, waterCount: 0, lastWater: 0,
      locked: i >= FARM_START_UNLOCKED,
    });
  }

  const animalSlots: AnimalSlotState[] = [];
  for (let i = 0; i < ANIMAL_TOTAL; i++) {
    animalSlots.push({
      animalIdx: -1, locked: i >= ANIMAL_START_UNLOCKED,
      fed: false, prodStart: 0, autoFeed: false,
    });
  }

  const atelierSlots: AtelierSlotState[] = [];
  for (let i = 0; i < ATELIER_TOTAL; i++) {
    atelierSlots.push({
      atelierIdx: -1, locked: i >= ATELIER_START_UNLOCKED,
      craftRecipeIdx: -1, craftQty: 0, craftStart: 0, craftDuration: 0,
    });
  }

  const resources: Record<string, number> = {};
  for (const key of ALL_RESOURCE_KEYS) {
    resources[key] = 0;
  }

  const gardenGrid: (GardenCellState | null)[] = [];
  for (let i = 0; i < GARDEN_SIZE * GARDEN_SIZE; i++) {
    gardenGrid.push(null);
  }

  return {
    version: CURRENT_VERSION,
    coins: 20,
    water: 50,
    maxWater: 100,
    xp: 0,
    level: 1,
    totalEarned: 0,
    totalHarvested: 0,
    day: 1,
    month: 1,
    lastDayTick: Date.now(),
    lastWaterRegen: Date.now(),
    lastSave: Date.now(),
    debt: 0,
    savings: 0,
    stars: 0,
    selCat: 0,
    selItem: 0,
    plots,
    gridBought: 0,
    animalSlots,
    selAnimal: 0,
    atelierSlots,
    bgridBought: 0,
    upgrades: {},
    resources,
    autoHarvestEnd: 0,
    autoWaterEnd: 0,
    autoAtelierEnd: 0,
    autoFeedEnd: 0,
    ahResets: 0,
    awResets: 0,
    aaResets: 0,
    afResets: 0,
    wellRepairs: 0,
    wellWater: 0,
    lastWellTick: Date.now(),
    woodRepairs: 0,
    woodStock: 0,
    lastWoodTick: Date.now(),
    farmers: [],
    ouvriers: [],
    quests: [],
    questMonth: 0,
    questResets: 0,
    trades: [],
    tradeMonth: 0,
    gardenGrid,

    // Mini-games
    mgLevel: 1, mmLevel: 1, siLevel: 1, tqLevel: 1, flLevel: 1,
    snLevel: 1, maLevel: 1, ppLevel: 1, cpLevel: 1, rvLevel: 1,

    // Events
    quizAnswered: [], quizStars: 0, quizLastEventStart: 0,
    marcheOffers: [], marcheExpiry: 0, marcheScore: 0,
    wheelSpins: 0, wheelLastSpin: 0,
    memoryBest: 0, memoryPlays: 0,
    justePrixAnswered: [], justePrixScore: 0,
    comboClickBest: 0, comboClickPlays: 0,
  };
}

/** Items arrays by category for convenience */
function getItemDef(catIdx: number, itemIdx: number) {
  if (catIdx === 0) return CROPS[itemIdx];
  if (catIdx === 1) return TREES[itemIdx];
  return null;
}

class GameState {
  data: GameStateData;
  private listeners: Set<() => void> = new Set();

  constructor() {
    this.data = createDefaultState();
  }

  onChange(fn: () => void): () => void {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  emit(): void {
    this.listeners.forEach(fn => fn());
  }

  // ========== UPGRADES ==========

  getUpgrade(id: string): number {
    return this.data.upgrades[id] ?? 0;
  }

  setUpgrade(id: string, level: number): void {
    this.data.upgrades[id] = level;
  }

  // ========== RESOURCES ==========

  getResource(key: string): number {
    return this.data.resources[key] ?? 0;
  }

  addResource(key: string, amount: number): void {
    this.data.resources[key] = (this.data.resources[key] ?? 0) + amount;
  }

  hasResources(inputs: Record<string, number>, multiplier = 1): boolean {
    for (const [key, qty] of Object.entries(inputs)) {
      if ((this.data.resources[key] ?? 0) < qty * multiplier) return false;
    }
    return true;
  }

  consumeResources(inputs: Record<string, number>, multiplier = 1): void {
    for (const [key, qty] of Object.entries(inputs)) {
      this.data.resources[key] = (this.data.resources[key] ?? 0) - qty * multiplier;
    }
  }

  // ========== FARM ==========

  getStageTimeMs(catIdx: number, itemIdx: number): number {
    const item = getItemDef(catIdx, itemIdx);
    if (!item) return 999999;
    const speedLevel = this.getUpgrade('speed');
    return Math.max(item.stageTime * 1000 * Math.pow(0.95, speedLevel), 2000);
  }

  getSellValue(catIdx: number, itemIdx: number): number {
    const item = getItemDef(catIdx, itemIdx);
    if (!item) return 0;
    const valueLevel = this.getUpgrade('value');
    return Math.floor(item.sellValue * (1 + valueLevel * 0.15));
  }

  getCellCost(): number {
    return Math.floor(50 * Math.pow(1.18, this.data.gridBought));
  }

  getWaterNeeded(catIdx: number): number {
    return CAT_WATER[catIdx] ?? 3;
  }

  isReadyToWater(plot: PlotState): boolean {
    if (plot.catIdx < 0) return false;
    const needed = this.getWaterNeeded(plot.catIdx);
    if (plot.waterCount >= needed) return false;
    const stMs = this.getStageTimeMs(plot.catIdx, plot.itemIdx);
    return plot.lastWater === 0 || (Date.now() - plot.lastWater >= stMs);
  }

  isMature(plot: PlotState): boolean {
    if (plot.catIdx < 0) return false;
    return plot.waterCount >= this.getWaterNeeded(plot.catIdx);
  }

  getUnlockedCount(): number {
    return FARM_START_UNLOCKED + this.data.gridBought;
  }

  getVisibleRows(): number {
    const unlocked = this.getUnlockedCount();
    return Math.min(FARM_MAX_ROWS, Math.floor((unlocked - 1) / 6) + 2);
  }

  // ========== ANIMALS ==========

  getAnimalProdTimeMs(animalIdx: number): number {
    const animal = ANIMALS[animalIdx];
    if (!animal) return 999999;
    const speedLevel = this.getUpgrade('animalspeed');
    return Math.max(animal.stageTime * 1000 * Math.pow(0.95, speedLevel), 5000);
  }

  getAnimalProdQty(): number {
    return 1 + this.getUpgrade('animalvalue');
  }

  getAnimalUnlockedSlots(): number {
    return ANIMAL_START_UNLOCKED + this.getUpgrade('animalslots') * 2;
  }

  getAnimalSlotCost(): number {
    const lv = this.getUpgrade('animalslots');
    return Math.floor(500 * Math.pow(1.3, lv));
  }

  /** Feed an animal slot. Returns true if successful. */
  feedAnimal(slotIdx: number): boolean {
    const slot = this.data.animalSlots[slotIdx];
    if (!slot || slot.locked || slot.animalIdx < 0 || slot.fed) return false;

    const feed = ANIMAL_FEED[slot.animalIdx];
    if (!feed) return false;

    // Check feed resource
    if (feed.feedResource === 'coins') {
      if (this.data.coins < feed.feedQty) return false;
      this.data.coins -= feed.feedQty;
    } else {
      if ((this.data.resources[feed.feedResource] ?? 0) < feed.feedQty) return false;
      this.data.resources[feed.feedResource] -= feed.feedQty;
    }

    slot.fed = true;
    slot.prodStart = Date.now();
    return true;
  }

  /** Collect animal production. Returns true if collected. */
  collectAnimal(slotIdx: number): boolean {
    const slot = this.data.animalSlots[slotIdx];
    if (!slot || slot.animalIdx < 0 || !slot.fed) return false;

    const prodTime = this.getAnimalProdTimeMs(slot.animalIdx);
    if (Date.now() - slot.prodStart < prodTime) return false;

    const feed = ANIMAL_FEED[slot.animalIdx];
    if (!feed) return false;

    const qty = this.getAnimalProdQty();

    if (feed.outputResource) {
      this.addResource(feed.outputResource, qty);
    } else {
      this.data.coins += feed.coinsPerTick * qty;
      this.data.totalEarned += feed.coinsPerTick * qty;
    }

    const animal = ANIMALS[slot.animalIdx];
    if (animal) {
      this.data.xp += animal.xp;
    }

    slot.fed = false;
    slot.prodStart = 0;
    return true;
  }

  // ========== ATELIERS ==========

  getBuildingCellCost(): number {
    return Math.floor(200 * Math.pow(1.25, this.data.bgridBought));
  }

  getRecipeTimeMs(baseTimeSec: number): number {
    const speedLevel = this.getUpgrade('bspeed');
    return Math.max(baseTimeSec * 1000 * Math.pow(0.95, speedLevel), 2000);
  }

  /** Start crafting a recipe in an atelier slot */
  startCraft(slotIdx: number, recipeIdx: number, qty: number): boolean {
    const slot = this.data.atelierSlots[slotIdx];
    if (!slot || slot.locked || slot.atelierIdx < 0) return false;
    if (slot.craftRecipeIdx >= 0) return false; // already crafting

    const atelier = ATELIERS[slot.atelierIdx];
    if (!atelier) return false;
    const recipe = atelier.recipes[recipeIdx];
    if (!recipe) return false;

    // Check resources
    if (!this.hasResources(recipe.inputs, qty)) return false;

    // Consume resources
    this.consumeResources(recipe.inputs, qty);

    // Start crafting
    const totalTimeMs = this.getRecipeTimeMs(recipe.time) * qty;
    slot.craftRecipeIdx = recipeIdx;
    slot.craftQty = qty;
    slot.craftStart = Date.now();
    slot.craftDuration = totalTimeMs;
    return true;
  }

  /** Check if an atelier slot has finished crafting */
  isCraftDone(slotIdx: number): boolean {
    const slot = this.data.atelierSlots[slotIdx];
    if (!slot || slot.craftRecipeIdx < 0) return false;
    return Date.now() - slot.craftStart >= slot.craftDuration;
  }

  /** Collect finished craft from an atelier slot */
  collectCraft(slotIdx: number): boolean {
    const slot = this.data.atelierSlots[slotIdx];
    if (!slot || slot.craftRecipeIdx < 0) return false;
    if (!this.isCraftDone(slotIdx)) return false;

    const atelier = ATELIERS[slot.atelierIdx];
    if (!atelier) return false;
    const recipe = atelier.recipes[slot.craftRecipeIdx];
    if (!recipe) return false;

    if (recipe.output) {
      this.addResource(recipe.output, slot.craftQty);
    } else {
      this.data.coins += recipe.sell * slot.craftQty;
      this.data.totalEarned += recipe.sell * slot.craftQty;
    }
    this.data.xp += recipe.xp * slot.craftQty;

    // Reset slot
    slot.craftRecipeIdx = -1;
    slot.craftQty = 0;
    slot.craftStart = 0;
    slot.craftDuration = 0;
    return true;
  }

  // ========== WELL & WOOD ==========

  isWellOperational(): boolean {
    return this.data.wellRepairs >= WELL_REPAIRS_NEEDED;
  }

  isWoodOperational(): boolean {
    return this.data.woodRepairs >= WOOD_REPAIRS_NEEDED;
  }

  // ========== FERMIERS ==========

  getFarmerHireCost(index: number): number {
    if (index === 0) return 10000;
    return Math.floor(500000 * Math.pow(1.15, index - 1));
  }

  getFarmerUpgradeCost(level: number): number {
    return Math.floor(1000 * Math.pow(1.35, level - 1));
  }

  getFarmerRent(): number {
    let total = 0;
    for (const f of this.data.farmers) {
      const baseRent = Math.floor(f.hireCost * 0.1);
      total += f.assignment === 'repos' ? Math.floor(baseRent * 0.5) : baseRent;
    }
    return total;
  }

  // ========== OUVRIERS ==========

  getOuvrierHireCost(index: number): number {
    if (index === 0) return 20000;
    return Math.floor(800000 * Math.pow(1.18, index - 1));
  }

  getOuvrierUpgradeCost(level: number): number {
    return Math.floor(2000 * Math.pow(1.4, level - 1));
  }

  getOuvrierRent(): number {
    let total = 0;
    for (const o of this.data.ouvriers) {
      const baseRent = Math.floor(o.hireCost * 0.12);
      total += o.assignment === 'repos' ? Math.floor(baseRent * 0.5) : baseRent;
    }
    return total;
  }

  // ========== ECONOMY ==========

  getRent(): number {
    return this.data.level * 25 + this.getFarmerRent() + this.getOuvrierRent();
  }

  getDebtRate(): number {
    return getDebtRate(this.data.debt);
  }

  getSavingsRate(): number {
    return getSavingsRate(this.getUpgrade('savingsrate'));
  }

  // ========== LEVEL ==========

  checkLevelUp(): { leveled: boolean; newLevel: number; wBonus: number; gBonus: number } {
    let leveled = false;
    let wBonusTotal = 0;
    let gBonusTotal = 0;
    while (this.data.xp >= xpForLevel(this.data.level + 1)) {
      this.data.level++;
      leveled = true;
      const wBonus = 5 + this.data.level * 3;
      const gBonus = 10 + this.data.level * 15;
      wBonusTotal += wBonus;
      gBonusTotal += gBonus;
      this.data.water += wBonus;
      this.data.coins += gBonus;
      this.data.totalEarned += gBonus;
    }
    return { leveled, newLevel: this.data.level, wBonus: wBonusTotal, gBonus: gBonusTotal };
  }

  // ========== QUESTS ==========

  generateQuests(): void {
    if (this.data.questMonth === this.data.month && this.data.quests.length === 10) return;
    this.data.questMonth = this.data.month;
    this.data.quests = [];
    const lv = this.data.level;

    // Build farm pool: crops, trees, and animal resources
    const farmPool: { cat: number; idx: number; name: string; emoji: string; isAnimal: boolean; resKey?: string }[] = [];
    CROPS.forEach((it, i) => {
      if (it.reqLevel <= lv) farmPool.push({ cat: 0, idx: i, name: it.name, emoji: it.emoji, isAnimal: false });
    });
    TREES.forEach((it, i) => {
      if (it.reqLevel <= lv) farmPool.push({ cat: 1, idx: i, name: it.name, emoji: it.emoji, isAnimal: false });
    });
    ANIMALS.forEach((it, i) => {
      if (it.reqLevel <= lv) {
        const af = ANIMAL_FEED[i];
        if (af?.outputResource) {
          const ri = RESOURCE_INFO[af.outputResource];
          farmPool.push({ cat: 2, idx: i, name: ri?.name ?? af.outputResource, emoji: ri?.emoji ?? '', isAnimal: true, resKey: af.outputResource });
        }
      }
    });
    const shuffledFarm = shuffle(farmPool);

    // 5 farm quests
    for (let q = 0; q < 5; q++) {
      if (shuffledFarm.length === 0) break;
      const pick = shuffledFarm[q % shuffledFarm.length];
      if (!pick) continue;
      const need = 3 + Math.floor(Math.random() * 148);
      const goldMult = pick.cat === 0 ? 80 : pick.cat === 1 ? 250 : 500;
      const goldR = Math.floor(need * goldMult * (1 + lv * 0.12));
      const xpR = Math.floor(goldR * 0.25);
      if (pick.isAnimal) {
        this.data.quests.push({ type: 'animal', target: pick.name, emoji: pick.emoji, resKey: pick.resKey, need, progress: 0, gold: goldR, xp: xpR, claimed: false });
      } else {
        this.data.quests.push({ type: 'farm', target: pick.name, emoji: pick.emoji, need, progress: 0, gold: goldR, xp: xpR, claimed: false });
      }
    }

    // Build atelier recipe pool
    const recPool: { name: string; emoji: string; bld: string }[] = [];
    ATELIERS.forEach(bld => {
      if (bld.reqLevel <= lv) {
        bld.recipes.forEach(rec => {
          recPool.push({ name: rec.name, emoji: rec.emoji, bld: bld.name });
        });
      }
    });
    const shuffledRec = shuffle(recPool);

    // 5 atelier quests
    for (let q = 0; q < 5; q++) {
      if (shuffledRec.length === 0) break;
      const pick = shuffledRec[q % shuffledRec.length];
      if (!pick) continue;
      const need = 2 + Math.floor(Math.random() * 99);
      const goldR = Math.floor(need * 300 * (1 + lv * 0.15));
      const xpR = Math.floor(goldR * 0.25);
      this.data.quests.push({ type: 'atelier', target: pick.name, emoji: pick.emoji, bld: pick.bld, need, progress: 0, gold: goldR, xp: xpR, claimed: false });
    }
  }

  regenerateOneQuest(qi: number): void {
    const q = this.data.quests[qi];
    if (!q) return;
    const lv = this.data.level;

    if (q.type === 'farm' || q.type === 'animal') {
      const farmPool: { cat: number; name: string; emoji: string; isAnimal: boolean; resKey?: string }[] = [];
      CROPS.forEach((it, i) => { if (it.reqLevel <= lv) farmPool.push({ cat: 0, name: it.name, emoji: it.emoji, isAnimal: false }); });
      TREES.forEach((it, i) => { if (it.reqLevel <= lv) farmPool.push({ cat: 1, name: it.name, emoji: it.emoji, isAnimal: false }); });
      ANIMALS.forEach((it, i) => {
        if (it.reqLevel <= lv) {
          const af = ANIMAL_FEED[i];
          if (af?.outputResource) { const ri = RESOURCE_INFO[af.outputResource]; farmPool.push({ cat: 2, name: ri?.name ?? af.outputResource, emoji: ri?.emoji ?? '', isAnimal: true, resKey: af.outputResource }); }
        }
      });
      const pick = shuffle(farmPool)[0];
      if (!pick) return;
      const need = 3 + Math.floor(Math.random() * 148);
      const goldMult = pick.cat === 0 ? 80 : pick.cat === 1 ? 250 : 500;
      const goldR = Math.floor(need * goldMult * (1 + lv * 0.12));
      const xpR = Math.floor(goldR * 0.25);
      if (pick.isAnimal) {
        this.data.quests[qi] = { type: 'animal', target: pick.name, emoji: pick.emoji, resKey: pick.resKey, need, progress: 0, gold: goldR, xp: xpR, claimed: false };
      } else {
        this.data.quests[qi] = { type: 'farm', target: pick.name, emoji: pick.emoji, need, progress: 0, gold: goldR, xp: xpR, claimed: false };
      }
    } else {
      const recPool: { name: string; emoji: string; bld: string }[] = [];
      ATELIERS.forEach(bld => {
        if (bld.reqLevel <= lv) bld.recipes.forEach(rec => recPool.push({ name: rec.name, emoji: rec.emoji, bld: bld.name }));
      });
      const pick = shuffle(recPool)[0];
      if (!pick) return;
      const need = 2 + Math.floor(Math.random() * 99);
      const goldR = Math.floor(need * 300 * (1 + lv * 0.15));
      const xpR = Math.floor(goldR * 0.25);
      this.data.quests[qi] = { type: 'atelier', target: pick.name, emoji: pick.emoji, bld: pick.bld, need, progress: 0, gold: goldR, xp: xpR, claimed: false };
    }
  }

  getQuestResetCost(): number {
    return Math.floor(500 * Math.pow(1.5, this.data.questResets) * (1 + this.data.level * 0.2));
  }

  trackQuestHarvest(itemName: string): void {
    for (const q of this.data.quests) {
      if (q.type === 'farm' && q.target === itemName && !q.claimed) {
        q.progress = Math.min(q.progress + 1, q.need);
      }
    }
  }

  trackQuestRecipe(recipeName: string, qty = 1): void {
    for (const q of this.data.quests) {
      if (q.type === 'atelier' && q.target === recipeName && !q.claimed) {
        q.progress = Math.min(q.progress + qty, q.need);
      }
    }
  }

  trackQuestAnimalRes(resKey: string, qty = 1): void {
    for (const q of this.data.quests) {
      if (q.type === 'animal' && q.resKey === resKey && !q.claimed) {
        q.progress = Math.min(q.progress + qty, q.need);
      }
    }
  }

  claimQuest(qi: number): boolean {
    const q = this.data.quests[qi];
    if (!q || q.claimed || q.progress < q.need) return false;
    q.claimed = true;
    this.data.coins += q.gold;
    this.data.xp += q.xp;
    this.data.totalEarned += q.gold;
    this.data.stars += 1;
    this.checkLevelUp();
    return true;
  }

  // ========== TRADES (BARTER) ==========

  generateTrades(): void {
    if (this.data.tradeMonth === this.data.month && this.data.trades.length === 9) return;
    this.data.tradeMonth = this.data.month;
    this.data.trades = [];
    const lv = this.data.level;
    const npcs = shuffle(TRADE_NPCS.slice());
    for (let i = 0; i < 9; i++) {
      this.data.trades.push(this._generateOneTrade(npcs[i % npcs.length], lv));
    }
  }

  private _generateOneTrade(npc: { name: string; emoji: string }, lv: number): TradeState {
    const numDemands = 2 + Math.floor(Math.random() * 3); // 2-4
    const demands: Record<string, number> = {};
    const allPool = shuffle([...TRADE_BRUT_KEYS, ...TRADE_TRANSFO_KEYS]);
    for (let d = 0; d < numDemands; d++) {
      const rk = allPool[d];
      const maxQty = rk === 'eau' ? 300 : rk === 'bois' ? 100 : TRADE_BRUT_KEYS.includes(rk) ? 100 : 50;
      const qty = 10 + Math.floor(Math.random() * (maxQty - 10 + 1));
      demands[rk] = qty;
    }
    let goldR = 0;
    for (const rk in demands) goldR += demands[rk] * 150;
    goldR = Math.floor(goldR * (1 + lv * 0.1));
    const xpR = Math.floor(goldR * 0.3);
    return { npc: npc.name, emoji: npc.emoji, demands, gold: goldR, xp: xpR, done: false };
  }

  regenerateOneTrade(ti: number): void {
    const npcs = shuffle(TRADE_NPCS.slice());
    this.data.trades[ti] = this._generateOneTrade(npcs[0], this.data.level);
  }

  canExecuteTrade(ti: number): boolean {
    const tr = this.data.trades[ti];
    if (!tr || tr.done) return false;
    for (const rk in tr.demands) {
      const have = rk === 'eau' ? this.data.water : (this.data.resources[rk] ?? 0);
      if (have < tr.demands[rk]) return false;
    }
    return true;
  }

  executeTrade(ti: number): boolean {
    if (!this.canExecuteTrade(ti)) return false;
    const tr = this.data.trades[ti];
    // Deduct resources
    for (const rk in tr.demands) {
      if (rk === 'eau') {
        this.data.water -= tr.demands[rk];
      } else {
        this.data.resources[rk] = (this.data.resources[rk] ?? 0) - tr.demands[rk];
      }
    }
    tr.done = true;
    this.data.coins += tr.gold;
    this.data.xp += tr.xp;
    this.data.totalEarned += tr.gold;
    this.data.stars += 1;
    this.checkLevelUp();

    // If all 9 done, auto-regenerate
    if (this.data.trades.every(t => t.done)) {
      this.data.tradeMonth = 0;
      this.generateTrades();
    }
    return true;
  }

  resetAllTrades(): void {
    this.data.tradeMonth = 0;
    this.generateTrades();
  }

  // ========== GARDEN ==========

  ensureGardenGrid(): void {
    if (!this.data.gardenGrid) this.data.gardenGrid = [];
    while (this.data.gardenGrid.length < GARDEN_SIZE * GARDEN_SIZE) {
      this.data.gardenGrid.push(null);
    }
  }

  placeGardenItem(idx: number, itemId: string): boolean {
    this.ensureGardenGrid();
    if (idx < 0 || idx >= GARDEN_SIZE * GARDEN_SIZE) return false;
    if (this.data.gardenGrid[idx]) return false; // occupied
    const item = findGardenItem(itemId);
    if (!item) return false;
    const woodCost = item.wood ?? 0;
    const bois = this.data.resources['bois'] ?? 0;
    if (this.data.coins < item.cost) return false;
    if (woodCost > 0 && bois < woodCost) return false;
    this.data.coins -= item.cost;
    if (woodCost > 0) this.data.resources['bois'] -= woodCost;
    this.data.gardenGrid[idx] = { id: itemId, stateIdx: 0 };
    return true;
  }

  deleteGardenItem(idx: number): number {
    this.ensureGardenGrid();
    const cell = this.data.gardenGrid[idx];
    if (!cell) return 0;
    const item = findGardenItem(cell.id);
    const refund = item ? Math.floor(item.cost * 0.5) : 0;
    this.data.gardenGrid[idx] = null;
    this.data.coins += refund;
    return refund;
  }

  moveGardenItem(fromIdx: number, toIdx: number): boolean {
    this.ensureGardenGrid();
    if (!this.data.gardenGrid[fromIdx] || this.data.gardenGrid[toIdx]) return false;
    this.data.gardenGrid[toIdx] = this.data.gardenGrid[fromIdx];
    this.data.gardenGrid[fromIdx] = null;
    return true;
  }

  renovateGardenItem(idx: number): boolean {
    this.ensureGardenGrid();
    const cell = this.data.gardenGrid[idx];
    if (!cell) return false;
    const item = findGardenItem(cell.id);
    if (!item?.states) return false;
    const maxR = item.states.length - 1;
    const curR = cell.stateIdx ?? 0;
    if (curR >= maxR) return false;
    const starCost = (curR === maxR - 1) ? 2 : 1;
    if (this.data.stars < starCost) return false;
    this.data.stars -= starCost;
    cell.stateIdx++;
    return true;
  }

  /** Process monthly garden rewards. Returns summary for display. */
  processGardenRewards(): { coins: number; stars: number; bois: number; res: Record<string, number> } {
    this.ensureGardenGrid();
    let totalCoins = 0, totalStars = 0, totalBois = 0;
    const resGiven: Record<string, number> = {};

    for (const cell of this.data.gardenGrid) {
      if (!cell) continue;
      const item = findGardenItem(cell.id);
      if (!item?.states || !item.reward) continue;
      const maxR = item.states.length - 1;
      if ((cell.stateIdx ?? 0) < maxR) continue; // must be fully renovated

      const rw = item.reward;
      if (rw.coins) totalCoins += rw.coins;
      if (rw.stars) totalStars += rw.stars;
      if (rw.bois) totalBois += rw.bois;
      if (rw.res) {
        for (const k in rw.res) {
          this.addResource(k, rw.res[k]);
          resGiven[k] = (resGiven[k] ?? 0) + rw.res[k];
        }
      }
      if (rw.randomCrops) {
        for (let i = 0; i < rw.randomCrops; i++) {
          const rk = CROP_REWARD_KEYS[Math.floor(Math.random() * CROP_REWARD_KEYS.length)];
          this.addResource(rk, 1);
          resGiven[rk] = (resGiven[rk] ?? 0) + 1;
        }
      }
      if (rw.randomBrut) {
        for (let i = 0; i < rw.randomBrut; i++) {
          const rk = BRUT_REWARD_KEYS[Math.floor(Math.random() * BRUT_REWARD_KEYS.length)];
          this.addResource(rk, 1);
          resGiven[rk] = (resGiven[rk] ?? 0) + 1;
        }
      }
      if (rw.randomTransfo) {
        for (let i = 0; i < rw.randomTransfo; i++) {
          const rk = TRADE_TRANSFO_KEYS[Math.floor(Math.random() * TRADE_TRANSFO_KEYS.length)];
          this.addResource(rk, 1);
          resGiven[rk] = (resGiven[rk] ?? 0) + 1;
        }
      }
      if (rw.randomAnimal) {
        for (let i = 0; i < rw.randomAnimal; i++) {
          const rk = ANIMAL_REWARD_KEYS[Math.floor(Math.random() * ANIMAL_REWARD_KEYS.length)];
          this.addResource(rk, 1);
          resGiven[rk] = (resGiven[rk] ?? 0) + 1;
        }
      }
    }

    this.data.coins += totalCoins;
    this.data.totalEarned += totalCoins;
    this.data.stars += totalStars;
    if (totalBois > 0) this.addResource('bois', totalBois);

    return { coins: totalCoins, stars: totalStars, bois: totalBois, res: resGiven };
  }

  // ========== MINI-GAMES ==========

  getMgLevel(stateKey: string): number {
    return (this.data as any)[stateKey] ?? 1;
  }

  setMgLevel(stateKey: string, lv: number): void {
    (this.data as any)[stateKey] = lv;
  }

  /** Called when player wins a mini-game level. Returns true if new level (=star reward). */
  mgWinLevel(gameKey: string, playingLv: number): boolean {
    const game = MG_GAMES.find(g => g.key === gameKey);
    if (!game) return false;
    const cur = this.getMgLevel(game.stateKey);
    if (playingLv >= cur && cur <= MG_MAX_LEVEL) {
      this.setMgLevel(game.stateKey, Math.min(MG_MAX_LEVEL + 1, cur + 1));
      this.data.stars += 1;
      return true;
    }
    return false; // already completed, no reward
  }

  // ========== EVENTS: MARCHE FOU ==========

  generateMarcheOffers(): void {
    this.data.marcheOffers = generateMarcheOffers();
    this.data.marcheExpiry = Date.now() + 3 * 300_000; // 3 in-game days
  }

  isMarcheExpired(): boolean {
    return Date.now() > this.data.marcheExpiry && this.data.marcheOffers.length > 0;
  }

  acceptMarcheOffer(idx: number): boolean {
    const offer = this.data.marcheOffers[idx];
    if (!offer || offer.accepted) return false;

    // Check resource
    const have = offer.giveKey === 'eau'
      ? this.data.water
      : (this.data.resources[offer.giveKey] ?? 0);
    if (have < offer.giveQty) return false;

    // Deduct
    if (offer.giveKey === 'eau') {
      this.data.water -= offer.giveQty;
    } else {
      this.data.resources[offer.giveKey] = (this.data.resources[offer.giveKey] ?? 0) - offer.giveQty;
    }

    // Give
    if (offer.recvKey === 'eau') {
      this.data.water += offer.recvQty;
    } else {
      this.addResource(offer.recvKey, offer.recvQty);
    }

    offer.accepted = true;
    this.data.marcheScore++;

    // +1 star per validated order
    this.data.stars += 1;

    return true;
  }

  // ========== OFFLINE PROGRESS ==========

  /**
   * Process offline progress since last save.
   * Mirrors the original farmvalley.html processOffline().
   */
  processOffline(): void {
    const now = Date.now();
    const elapsed = now - this.data.lastSave;
    if (elapsed < 1000) return;

    // --- Water regen: +1 every 30s ---
    const wGain = Math.floor((now - this.data.lastWaterRegen) / 30_000);
    if (wGain > 0) {
      this.data.water = Math.min(this.data.maxWater, this.data.water + wGain);
      this.data.lastWaterRegen += wGain * 30_000;
    }

    // --- Day / month progression ---
    const dPassed = Math.floor((now - this.data.lastDayTick) / DAY_MS);
    if (dPassed > 0) {
      this.data.lastDayTick += dPassed * DAY_MS;
      const totalDays = this.data.day + dPassed - 1;
      const mPassed = Math.floor(totalDays / 30);
      this.data.day = (totalDays % 30) + 1;

      if (mPassed > 0) {
        this.data.month += mPassed;

        // Savings interest (per month)
        if (this.data.savings > 0 && this.getSavingsRate() > 0) {
          for (let i = 0; i < mPassed; i++) {
            this.data.savings += Math.floor(this.data.savings * this.getSavingsRate());
          }
        }

        // Debt interest (per month)
        if (this.data.debt > 0) {
          for (let i = 0; i < mPassed; i++) {
            this.data.debt += Math.ceil(this.data.debt * this.getDebtRate());
          }
        }

        // Pay rent
        const rent = this.getRent() * mPassed;
        if (this.data.coins >= rent) {
          this.data.coins -= rent;
        } else {
          this.data.debt += (rent - this.data.coins);
          this.data.coins = 0;
        }

        // Garden monthly rewards
        for (let i = 0; i < mPassed; i++) {
          this.processGardenRewards();
        }

        // Regenerate quests & trades for new month
        this.data.questMonth = 0;
        this.generateQuests();
        this.data.tradeMonth = 0;
        this.generateTrades();
      }
    }

    // --- Auto-harvest offline ---
    if (this.getUpgrade('autoharvest') >= 1 && this.data.autoHarvestEnd > this.data.lastSave) {
      for (const p of this.data.plots) {
        if (p.catIdx < 0 || p.locked) continue;
        const needed = this.getWaterNeeded(p.catIdx);
        if (p.waterCount >= needed) {
          // Mature — harvest
          const sv = this.getSellValue(p.catIdx, p.itemIdx);
          const item = getItemDef(p.catIdx, p.itemIdx);
          this.data.coins += sv;
          this.data.xp += (item?.xp ?? 0);
          this.data.totalEarned += sv;
          this.data.totalHarvested++;
          if (item?.resourceKey) this.addResource(item.resourceKey, 1);
          if (p.catIdx === 1) this.addResource('bois', 1);
          if (item) this.trackQuestHarvest(item.name);
          p.catIdx = -1; p.itemIdx = -1; p.waterCount = 0; p.lastWater = 0;
        }
      }
    }

    // --- Auto-water offline (approximate) ---
    if (this.getUpgrade('autowater') >= 1 && this.data.autoWaterEnd > this.data.lastSave) {
      for (const p of this.data.plots) {
        if (p.catIdx < 0 || p.locked) continue;
        const needed = this.getWaterNeeded(p.catIdx);
        if (p.waterCount >= needed) continue;
        const stMs = this.getStageTimeMs(p.catIdx, p.itemIdx);
        while (p.waterCount < needed && this.data.water > 0) {
          const ready = p.lastWater === 0 || (now - p.lastWater >= stMs);
          if (!ready) break;
          this.data.water--;
          p.waterCount++;
          p.lastWater = now;
        }
      }
    }

    // --- Well offline accumulation (only if water <= maxWater, like original) ---
    if (this.data.wellRepairs >= WELL_REPAIRS_NEEDED && this.data.lastWellTick && this.data.water <= this.data.maxWater) {
      const wellGain = Math.floor((now - this.data.lastWellTick) / 20_000);
      if (wellGain > 0) {
        this.data.wellWater += wellGain * 5;
        this.data.lastWellTick += wellGain * 20_000;
      }
    }

    // --- Wood offline accumulation ---
    if (this.data.woodRepairs >= WOOD_REPAIRS_NEEDED && this.data.lastWoodTick) {
      const woodGain = Math.floor((now - this.data.lastWoodTick) / 20_000);
      if (woodGain > 0) {
        this.data.woodStock += woodGain * 3;
        this.data.lastWoodTick += woodGain * 20_000;
      }
    }

    // --- Animal production offline ---
    for (const slot of this.data.animalSlots) {
      if (slot.animalIdx < 0 || !slot.fed || slot.locked) continue;
      const prodMs = this.getAnimalProdTimeMs(slot.animalIdx);
      const prodElapsed = now - slot.prodStart;
      if (prodElapsed >= prodMs) {
        const feed = ANIMAL_FEED[slot.animalIdx];
        const qty = this.getAnimalProdQty();
        if (feed?.outputResource) {
          this.addResource(feed.outputResource, qty);
          this.trackQuestAnimalRes(feed.outputResource, qty);
        } else if (feed) {
          this.data.coins += feed.coinsPerTick * qty;
          this.data.totalEarned += feed.coinsPerTick * qty;
        }
        const animal = ANIMALS[slot.animalIdx];
        if (animal) this.data.xp += animal.xp;
        slot.fed = false;
        slot.prodStart = 0;
      }
    }

    // --- Atelier crafts offline ---
    for (let i = 0; i < this.data.atelierSlots.length; i++) {
      if (this.isCraftDone(i)) {
        const slot = this.data.atelierSlots[i];
        const atelier = ATELIERS[slot.atelierIdx];
        const recipe = atelier?.recipes[slot.craftRecipeIdx];
        if (recipe) this.trackQuestRecipe(recipe.name, slot.craftQty);
        this.collectCraft(i);
      }
    }

    this.data.lastSave = now;
    this.checkLevelUp();
  }

  // ========== SAVE / LOAD ==========

  save(): void {
    this.data.lastSave = Date.now();
    try {
      localStorage.setItem(SAVE_KEY, JSON.stringify(this.data));
    } catch (e) {
      console.warn('Failed to save:', e);
    }
  }

  load(): boolean {
    try {
      const raw = localStorage.getItem(SAVE_KEY);
      if (!raw) return false;
      const parsed = JSON.parse(raw) as Partial<GameStateData>;
      const defaults = createDefaultState();
      this.data = { ...defaults, ...parsed };

      // Ensure farm plots
      if (!this.data.plots || this.data.plots.length < FARM_TOTAL) {
        if (!this.data.plots) this.data.plots = [];
        while (this.data.plots.length < FARM_TOTAL) {
          this.data.plots.push({
            catIdx: -1, itemIdx: -1, waterCount: 0, lastWater: 0,
            locked: this.data.plots.length >= FARM_START_UNLOCKED + (this.data.gridBought || 0),
          });
        }
      }
      const unlocked = FARM_START_UNLOCKED + (this.data.gridBought || 0);
      for (let i = 0; i < this.data.plots.length; i++) {
        this.data.plots[i].locked = i >= unlocked;
      }

      // Ensure animal slots
      if (!this.data.animalSlots || this.data.animalSlots.length < ANIMAL_TOTAL) {
        if (!this.data.animalSlots) this.data.animalSlots = [];
        while (this.data.animalSlots.length < ANIMAL_TOTAL) {
          this.data.animalSlots.push({
            animalIdx: -1, locked: true, fed: false, prodStart: 0, autoFeed: false,
          });
        }
      }
      const animalUnlocked = this.getAnimalUnlockedSlots();
      for (let i = 0; i < this.data.animalSlots.length; i++) {
        this.data.animalSlots[i].locked = i >= animalUnlocked;
      }

      // Ensure atelier slots
      if (!this.data.atelierSlots || this.data.atelierSlots.length < ATELIER_TOTAL) {
        if (!this.data.atelierSlots) this.data.atelierSlots = [];
        while (this.data.atelierSlots.length < ATELIER_TOTAL) {
          this.data.atelierSlots.push({
            atelierIdx: -1, locked: true,
            craftRecipeIdx: -1, craftQty: 0, craftStart: 0, craftDuration: 0,
          });
        }
      }
      const bUnlocked = ATELIER_START_UNLOCKED + (this.data.bgridBought || 0);
      for (let i = 0; i < this.data.atelierSlots.length; i++) {
        this.data.atelierSlots[i].locked = i >= bUnlocked;
      }

      // Ensure resources
      if (!this.data.resources) this.data.resources = {};
      for (const key of ALL_RESOURCE_KEYS) {
        if (this.data.resources[key] === undefined) this.data.resources[key] = 0;
      }

      // Ensure upgrades
      if (!this.data.upgrades) this.data.upgrades = {};
      this.data.maxWater = 100 + this.getUpgrade('watermax') * 10;

      // Ensure arrays
      if (!this.data.farmers) this.data.farmers = [];
      if (!this.data.ouvriers) this.data.ouvriers = [];

      // Ensure quest/trade/garden (Phase 3)
      if (!this.data.quests) this.data.quests = [];
      if (!this.data.questMonth) this.data.questMonth = 0;
      if (!this.data.questResets) this.data.questResets = 0;
      if (!this.data.trades) this.data.trades = [];
      if (!this.data.tradeMonth) this.data.tradeMonth = 0;
      if (!this.data.gardenGrid) this.data.gardenGrid = [];
      while (this.data.gardenGrid.length < GARDEN_SIZE * GARDEN_SIZE) {
        this.data.gardenGrid.push(null);
      }

      // Ensure mini-game levels (Phase 4)
      for (const game of MG_GAMES) {
        if (!(this.data as any)[game.stateKey]) {
          (this.data as any)[game.stateKey] = 1;
        }
      }

      // Ensure event states (Phase 4)
      if (!this.data.quizAnswered) this.data.quizAnswered = [];
      if (!this.data.quizStars) this.data.quizStars = 0;
      if (!this.data.quizLastEventStart) this.data.quizLastEventStart = 0;
      if (!this.data.marcheOffers) this.data.marcheOffers = [];
      if (!this.data.marcheExpiry) this.data.marcheExpiry = 0;
      if (!this.data.marcheScore) this.data.marcheScore = 0;
      if (!this.data.wheelSpins) this.data.wheelSpins = 0;
      if (!this.data.wheelLastSpin) this.data.wheelLastSpin = 0;
      if (!this.data.memoryBest) this.data.memoryBest = 0;
      if (!this.data.memoryPlays) this.data.memoryPlays = 0;
      if (!this.data.justePrixAnswered) this.data.justePrixAnswered = [];
      if (!this.data.justePrixScore) this.data.justePrixScore = 0;
      if (!this.data.comboClickBest) this.data.comboClickBest = 0;
      if (!this.data.comboClickPlays) this.data.comboClickPlays = 0;

      // Ensure quests are generated for current month
      if (this.data.questMonth !== this.data.month || this.data.quests.length !== 10) {
        this.generateQuests();
      }
      // Ensure trades are generated for current month
      if (this.data.tradeMonth !== this.data.month || this.data.trades.length !== 9) {
        this.generateTrades();
      }

      return true;
    } catch (e) {
      console.warn('Failed to load save:', e);
      return false;
    }
  }

  reset(): void {
    this.data = createDefaultState();
    localStorage.removeItem(SAVE_KEY);
    this.emit();
  }
}

/** Singleton game state */
export const gameState = new GameState();
