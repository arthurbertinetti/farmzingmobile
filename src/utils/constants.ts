// src/utils/constants.ts

/** Grid dimensions for farm */
export const FARM_COLS = 6;
export const FARM_MAX_ROWS = 15;
export const FARM_TOTAL = FARM_COLS * FARM_MAX_ROWS; // 90
export const FARM_START_UNLOCKED = 12;

/** Water costs per category */
export const CAT_WATER: Record<number, number> = {
  0: 3, // Cultures
  1: 4, // Arbres
  2: 5, // Animaux (not used for animal pen, but kept for compatibility)
};

/** Time */
export const DAY_MS = 300_000; // 5 minutes per in-game day
export const DAYS_PER_MONTH = 30;
export const WATER_REGEN_MS = 30_000; // 1 water every 30s
export const SAVE_INTERVAL_MS = 5_000;
export const TICK_MS = 500;

/** Well & Wood */
export const WELL_REPAIRS_NEEDED = 15;
export const WELL_PASSIVE_INTERVAL = 20_000; // +5 water every 20s
export const WELL_PASSIVE_AMOUNT = 5;
export const WELL_TAP_AMOUNT = 10;
export const WOOD_REPAIRS_NEEDED = 15;
export const WOOD_PASSIVE_INTERVAL = 20_000; // +3 wood every 20s
export const WOOD_PASSIVE_AMOUNT = 3;
export const WOOD_TAP_AMOUNT = 5;

/** Fermiers & Ouvriers */
export const FARMER_MAX = 10;
export const FARMER_MAX_LVL = 50;
export const FARMER_HARVEST_MS = 60_000; // 60s
export const OUVRIER_MAX = 10;
export const OUVRIER_MAX_LVL = 50;
export const OUVRIER_PROD_MS = 120_000; // 120s

/** XP table (level 1->30+) */
export const XP_TABLE = [
  0, 30, 80, 160, 300, 500, 800, 1200, 1800, 2600,
  3600, 5000, 7000, 9500, 13000, 17000, 22000, 28000, 35000, 45000,
  58000, 73000, 90000, 110000, 135000, 165000, 200000, 245000, 300000, 370000,
];

/** Colors */
export const COLORS = {
  brown: 0x5d4037,
  brownDark: 0x4e342e,
  brownLight: 0x8d6e63,
  green: 0x4caf50,
  greenDark: 0x388e3c,
  greenLight: 0x81c784,
  gold: 0xffd93d,
  goldDark: 0xffa500,
  blue: 0x2196f3,
  blueDark: 0x1976d2,
  red: 0xe74c3c,
  white: 0xffffff,
  black: 0x000000,
  sky: 0x87ceeb,
  soil: 0x8b7355,
  soilLight: 0xa0845c,
  plotEmpty: 0x8b7355,
  plotGrowing: 0x228b22,
  plotWater: 0x1a6b9a,
  plotMature: 0xffd700,
  plotLocked: 0x555555,
  panelBg: 0xf5efe5,
  textDark: 0x333333,
  textLight: 0xffffff,
  animalPen: 0x8b6914,
  atelierBg: 0x6d4c41,
};

/** UI layout constants */
export const UI = {
  HUD_HEIGHT: 44,
  TAB_HEIGHT: 62,
  SEED_BAR_HEIGHT: 44,
  PADDING: 8,
  BUTTON_RADIUS: 8,
};

/** Save key */
export const SAVE_KEY = 'farmzing_save';

/** Harvest resource mapping (crop/tree name -> resource key) */
export const HARVEST_RES: Record<string, string> = {
  'Ble': 'ble',
  'Mais': 'mais',
  'Fraise': 'fraise',
  'Tomate': 'tomate',
  'Carotte': 'carotte',
  'Oignon': 'oignon',
  'P.de terre': 'patate',
  'Champignon': 'champignon',
  'Citrouille': 'citrouille',
  'Cerise': 'cerise',
  'Fleur doree': 'fleur',
  'Pommier': 'pomme',
  'Poirier': 'poire',
  'Oranger': 'orange',
  'Citronnier': 'citron',
  'Bananier': 'banane',
  'Pecher': 'peche',
  'Manguier': 'mangue',
  'Vigne': 'raisin',
  'Cocotier': 'noix_coco',
  'Olivier': 'olive',
};

/** Farmer assignable resource keys (raw resources from crops/trees/animals) */
export const FARMER_RESOURCES = [
  'ble', 'mais', 'oeuf', 'lait', 'laine', 'pomme', 'fraise',
  'lait_chevre', 'citron', 'miel', 'raisin', 'noix_coco', 'olive',
  'tomate', 'carotte', 'oignon', 'patate', 'champignon', 'citrouille',
  'cerise', 'fleur', 'poire', 'orange', 'banane', 'peche', 'mangue',
  'viande_porc', 'viande_dinde', 'plume', 'fourrure',
];
