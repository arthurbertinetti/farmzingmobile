// src/data/trades.ts
// Trade/barter NPC and resource pool definitions

export interface TradeNpcDef {
  name: string;
  emoji: string;
}

export const TRADE_NPCS: TradeNpcDef[] = [
  { name: 'Agriculteur', emoji: '\u{1F468}\u200D\u{1F33E}' },
  { name: 'Boulangere', emoji: '\u{1F469}\u200D\u{1F373}' },
  { name: 'Artisan', emoji: '\u{1F9D1}\u200D\u{1F527}' },
  { name: 'Cuisinier', emoji: '\u{1F468}\u200D\u{1F373}' },
  { name: 'Herboriste', emoji: '\u{1F9D9}' },
  { name: 'Marchand', emoji: '\u{1F9D1}\u200D\u{1F4BC}' },
  { name: 'Apiculteur', emoji: '\u{1F41D}' },
  { name: 'Berger', emoji: '\u{1F411}' },
  { name: 'Fromager', emoji: '\u{1F9C0}' },
  { name: 'Patissier', emoji: '\u{1F9C1}' },
  { name: 'Vigneron', emoji: '\u{1F377}' },
  { name: 'Tisserand', emoji: '\u{1F9F6}' },
  { name: 'Epicier', emoji: '\u{1F6D2}' },
  { name: 'Fermier', emoji: '\u{1F69C}' },
  { name: 'Chocolatier', emoji: '\u{1F36B}' },
];

/** Raw resource keys that can appear in trade demands */
export const TRADE_BRUT_KEYS = [
  'eau', 'bois', 'lait', 'ble', 'mais', 'oeuf', 'laine',
  'pomme', 'fraise', 'lait_chevre', 'citron', 'miel', 'raisin', 'noix_coco', 'olive',
  'tomate', 'carotte', 'oignon', 'patate', 'champignon', 'citrouille', 'cerise', 'fleur',
  'poire', 'orange', 'banane', 'peche', 'mangue',
  'viande_porc', 'viande_dinde', 'plume', 'fourrure',
];

/** Transformed resource keys that can appear in trade demands */
export const TRADE_TRANSFO_KEYS = [
  'beurre', 'creme', 'farine_ble', 'farine_mais', 'sucre', 'fromage', 'jus_pomme', 'confiture',
  'vin', 'huile_olive', 'lait_coco', 'chocolat',
  'sauce_tomate', 'soupe', 'jus_orange', 'smoothie', 'marmelade', 'cidre',
  'charcuterie', 'saucisse', 'pizza', 'risotto', 'tarte_citrouille',
  'parfum', 'bougie', 'coussin', 'roti_dinde', 'salade_composee',
];

/** Random crop resource keys for garden rewards */
export const CROP_REWARD_KEYS = [
  'ble', 'mais', 'fraise', 'tomate', 'carotte', 'oignon', 'patate',
  'champignon', 'citrouille', 'cerise', 'fleur',
];

/** Random brut resource keys for garden rewards */
export const BRUT_REWARD_KEYS = [
  'lait', 'ble', 'mais', 'oeuf', 'laine', 'pomme', 'fraise',
  'lait_chevre', 'citron', 'miel', 'raisin', 'noix_coco', 'olive',
  'tomate', 'carotte', 'oignon', 'patate', 'champignon', 'citrouille', 'cerise', 'fleur',
  'poire', 'orange', 'banane', 'peche', 'mangue',
];

/** Random animal resource keys for garden rewards */
export const ANIMAL_REWARD_KEYS = [
  'lait', 'oeuf', 'laine', 'miel', 'lait_chevre',
  'viande_porc', 'viande_dinde', 'plume', 'fourrure',
];
