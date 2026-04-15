// src/data/animals.ts

export interface AnimalDef {
  name: string;
  emoji: string;
  stageTime: number; // seconds per production cycle (base)
  cost: number;
  sellValue: number;
  xp: number;
  reqLevel: number;
}

export interface AnimalFeedDef {
  /** Resource key to feed (or 'coins' for gold cost) */
  feedResource: string;
  /** Quantity of feed consumed */
  feedQty: number;
  /** Resource key produced (null = coins) */
  outputResource: string | null;
  /** Coins per tick if outputResource is null */
  coinsPerTick: number;
}

export const ANIMALS: AnimalDef[] = [
  { name: 'Poule',     emoji: '\u{1F414}', stageTime: 30,  cost: 800,    sellValue: 1100,   xp: 150,   reqLevel: 5 },
  { name: 'Canard',    emoji: '\u{1F986}', stageTime: 40,  cost: 1000,   sellValue: 1400,   xp: 200,   reqLevel: 5 },
  { name: 'Lapin',     emoji: '\u{1F430}', stageTime: 50,  cost: 1300,   sellValue: 1850,   xp: 280,   reqLevel: 6 },
  { name: 'Mouton',    emoji: '\u{1F411}', stageTime: 65,  cost: 1700,   sellValue: 2400,   xp: 370,   reqLevel: 7 },
  { name: 'Chevre',    emoji: '\u{1F410}', stageTime: 80,  cost: 2200,   sellValue: 3100,   xp: 480,   reqLevel: 8 },
  { name: 'Cochon',    emoji: '\u{1F437}', stageTime: 95,  cost: 2800,   sellValue: 4000,   xp: 600,   reqLevel: 9 },
  { name: 'Vache',     emoji: '\u{1F404}', stageTime: 115, cost: 3500,   sellValue: 5100,   xp: 750,   reqLevel: 10 },
  { name: 'Cheval',    emoji: '\u{1F434}', stageTime: 135, cost: 4400,   sellValue: 6500,   xp: 930,   reqLevel: 11 },
  { name: 'Abeille',   emoji: '\u{1F41D}', stageTime: 155, cost: 5500,   sellValue: 8200,   xp: 1150,  reqLevel: 12 },
  { name: 'Dinde',     emoji: '\u{1F983}', stageTime: 180, cost: 6800,   sellValue: 10000,  xp: 1400,  reqLevel: 13 },
  { name: 'Alpaga',    emoji: '\u{1F999}', stageTime: 205, cost: 8500,   sellValue: 12500,  xp: 1700,  reqLevel: 14 },
  { name: 'Paon',      emoji: '\u{1F99A}', stageTime: 235, cost: 10500,  sellValue: 15500,  xp: 2100,  reqLevel: 15 },
  { name: 'Cygne',     emoji: '\u{1F9A2}', stageTime: 265, cost: 13000,  sellValue: 19500,  xp: 2600,  reqLevel: 16 },
  { name: 'Flamant',   emoji: '\u{1F9A9}', stageTime: 300, cost: 16000,  sellValue: 24000,  xp: 3200,  reqLevel: 17 },
  { name: 'Perroquet', emoji: '\u{1F99C}', stageTime: 340, cost: 20000,  sellValue: 30000,  xp: 4000,  reqLevel: 18 },
  { name: 'Hibou',     emoji: '\u{1F989}', stageTime: 380, cost: 25000,  sellValue: 38000,  xp: 5000,  reqLevel: 18 },
  { name: 'Tortue',    emoji: '\u{1F422}', stageTime: 420, cost: 31000,  sellValue: 47000,  xp: 6200,  reqLevel: 19 },
  { name: 'Dauphin',   emoji: '\u{1F42C}', stageTime: 470, cost: 40000,  sellValue: 60000,  xp: 8000,  reqLevel: 19 },
  { name: 'Panda',     emoji: '\u{1F43C}', stageTime: 530, cost: 52000,  sellValue: 78000,  xp: 10000, reqLevel: 20 },
  { name: 'Licorne',   emoji: '\u{1F984}', stageTime: 600, cost: 70000,  sellValue: 110000, xp: 15000, reqLevel: 20 },
];

export const ANIMAL_FEED: AnimalFeedDef[] = [
  { feedResource: 'mais',       feedQty: 2, outputResource: 'oeuf',         coinsPerTick: 0 },
  { feedResource: 'ble',        feedQty: 2, outputResource: 'plume',        coinsPerTick: 0 },
  { feedResource: 'carotte',    feedQty: 2, outputResource: 'fourrure',     coinsPerTick: 0 },
  { feedResource: 'ble',        feedQty: 3, outputResource: 'laine',        coinsPerTick: 0 },
  { feedResource: 'ble',        feedQty: 3, outputResource: 'lait_chevre',  coinsPerTick: 0 },
  { feedResource: 'patate',     feedQty: 3, outputResource: 'viande_porc',  coinsPerTick: 0 },
  { feedResource: 'ble',        feedQty: 4, outputResource: 'lait',         coinsPerTick: 0 },
  { feedResource: 'carotte',    feedQty: 5, outputResource: null,           coinsPerTick: 800 },
  { feedResource: 'fleur',      feedQty: 2, outputResource: 'miel',         coinsPerTick: 0 },
  { feedResource: 'mais',       feedQty: 4, outputResource: 'viande_dinde', coinsPerTick: 0 },
  { feedResource: 'ble',        feedQty: 4, outputResource: 'laine',        coinsPerTick: 0 },
  { feedResource: 'mais',       feedQty: 4, outputResource: 'plume',        coinsPerTick: 0 },
  { feedResource: 'ble',        feedQty: 5, outputResource: null,           coinsPerTick: 1200 },
  { feedResource: 'fraise',     feedQty: 5, outputResource: null,           coinsPerTick: 1500 },
  { feedResource: 'banane',     feedQty: 4, outputResource: null,           coinsPerTick: 1800 },
  { feedResource: 'champignon', feedQty: 5, outputResource: null,           coinsPerTick: 2200 },
  { feedResource: 'fraise',     feedQty: 6, outputResource: null,           coinsPerTick: 2800 },
  { feedResource: 'coins',      feedQty: 2000, outputResource: null,        coinsPerTick: 3500 },
  { feedResource: 'mangue',     feedQty: 5, outputResource: null,           coinsPerTick: 4500 },
  { feedResource: 'fleur',      feedQty: 8, outputResource: null,           coinsPerTick: 6000 },
];

/** Animal pen grid constants */
export const ANIMAL_COLS = 5;
export const ANIMAL_MAX_ROWS = 10;
export const ANIMAL_TOTAL = ANIMAL_COLS * ANIMAL_MAX_ROWS; // 50
export const ANIMAL_START_UNLOCKED = 3;
