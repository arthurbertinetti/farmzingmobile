// src/data/ateliers.ts

export interface RecipeDef {
  name: string;
  emoji: string;
  inputs: Record<string, number>;
  /** Resource key produced (undefined = coins only) */
  output?: string;
  /** Base craft time in seconds */
  time: number;
  /** Sell price (coins gained if no output, or sell price of the output resource) */
  sell: number;
  xp: number;
}

export interface AtelierDef {
  name: string;
  emoji: string;
  cost: number;
  reqLevel: number;
  recipes: RecipeDef[];
}

export const ATELIERS: AtelierDef[] = [
  // ===== Tier 1: Débuts (lv3-5) =====
  {
    name: 'Pressoir', emoji: '\u{1F34E}', cost: 2000, reqLevel: 3,
    recipes: [
      { name: 'Jus pomme', emoji: '\u{1F9C3}', inputs: { pomme: 2 }, output: 'jus_pomme', time: 15, sell: 150, xp: 20 },
      { name: 'Compote', emoji: '\u{1F36F}', inputs: { pomme: 3 }, time: 20, sell: 250, xp: 25 },
    ],
  },
  {
    name: 'Potager', emoji: '\u{1F957}', cost: 2500, reqLevel: 4,
    recipes: [
      { name: 'Soupe', emoji: '\u{1F372}', inputs: { patate: 2, carotte: 2, oignon: 1 }, output: 'soupe', time: 20, sell: 350, xp: 30 },
      { name: 'Salade', emoji: '\u{1F957}', inputs: { tomate: 2, oeuf: 1 }, output: 'salade_composee', time: 12, sell: 400, xp: 20 },
    ],
  },
  {
    name: 'Moulin', emoji: '\u{1F3ED}', cost: 3000, reqLevel: 5,
    recipes: [
      { name: 'Farine ble', emoji: '\u{1FAD3}', inputs: { ble: 2 }, output: 'farine_ble', time: 20, sell: 120, xp: 30 },
      { name: 'Farine mais', emoji: '\u{1FAD3}', inputs: { mais: 2 }, output: 'farine_mais', time: 25, sell: 130, xp: 35 },
    ],
  },

  // ===== Tier 2: Transformation (lv6-10) =====
  {
    name: 'Cuisinette', emoji: '\u{1F373}', cost: 3500, reqLevel: 6,
    recipes: [
      { name: 'Sauce tomate', emoji: '\u{1F96B}', inputs: { tomate: 3, oignon: 1 }, output: 'sauce_tomate', time: 18, sell: 250, xp: 35 },
      { name: 'Puree', emoji: '\u{1F954}', inputs: { patate: 3, beurre: 1 }, time: 15, sell: 500, xp: 40 },
      { name: 'Soupe citrouille', emoji: '\u{1F383}', inputs: { citrouille: 2, creme: 1 }, time: 25, sell: 900, xp: 55 },
    ],
  },
  {
    name: 'Mag. laine', emoji: '\u{1F9F6}', cost: 4000, reqLevel: 8,
    recipes: [
      { name: 'Pelote', emoji: '\u{1F9F6}', inputs: { laine: 2 }, time: 30, sell: 600, xp: 40 },
      { name: 'Echarpe', emoji: '\u{1F9E3}', inputs: { laine: 5 }, time: 60, sell: 1800, xp: 120 },
    ],
  },
  {
    name: 'Fromagerie', emoji: '\u{1F9C0}', cost: 5500, reqLevel: 9,
    recipes: [
      { name: 'Fromage chevre', emoji: '\u{1F9C0}', inputs: { lait_chevre: 2 }, time: 35, sell: 800, xp: 60 },
      { name: 'Fromage', emoji: '\u{1F9C0}', inputs: { lait: 3 }, output: 'fromage', time: 40, sell: 350, xp: 55 },
      { name: 'Fondue', emoji: '\u{1F958}', inputs: { fromage: 3, lait: 1 }, time: 55, sell: 3000, xp: 150 },
    ],
  },
  {
    name: 'Laiterie', emoji: '\u{1F95B}', cost: 5000, reqLevel: 10,
    recipes: [
      { name: 'Beurre', emoji: '\u{1F9C8}', inputs: { lait: 2 }, output: 'beurre', time: 30, sell: 200, xp: 50 },
      { name: 'Creme', emoji: '\u{1F366}', inputs: { lait: 3 }, output: 'creme', time: 45, sell: 300, xp: 80 },
    ],
  },

  // ===== Tier 3: Production (lv11-14) =====
  {
    name: 'Sucrerie', emoji: '\u{1F36C}', cost: 7000, reqLevel: 11,
    recipes: [
      { name: 'Sucre', emoji: '\u{1F35A}', inputs: { mais: 3 }, output: 'sucre', time: 25, sell: 180, xp: 45 },
      { name: 'Pop-corn', emoji: '\u{1F37F}', inputs: { mais: 2, beurre: 1 }, time: 20, sell: 700, xp: 55 },
    ],
  },
  {
    name: 'Boulangerie', emoji: '\u{1F956}', cost: 8000, reqLevel: 12,
    recipes: [
      { name: 'Pain', emoji: '\u{1F35E}', inputs: { farine_ble: 2, beurre: 1 }, time: 40, sell: 1500, xp: 100 },
      { name: 'Gateau', emoji: '\u{1F382}', inputs: { oeuf: 3, farine_ble: 2, beurre: 2 }, time: 60, sell: 3000, xp: 200 },
      { name: 'Crepes', emoji: '\u{1F95E}', inputs: { oeuf: 2, farine_ble: 1 }, time: 25, sell: 1000, xp: 60 },
      { name: 'Tortilla', emoji: '\u{1FAD4}', inputs: { farine_mais: 2, fromage: 1 }, time: 35, sell: 1800, xp: 90 },
    ],
  },
  {
    name: 'Boucherie', emoji: '\u{1F969}', cost: 10000, reqLevel: 13,
    recipes: [
      { name: 'Charcuterie', emoji: '\u{1F969}', inputs: { viande_porc: 2 }, output: 'charcuterie', time: 35, sell: 800, xp: 70 },
      { name: 'Saucisse', emoji: '\u{1F32D}', inputs: { viande_porc: 2, oignon: 1 }, output: 'saucisse', time: 30, sell: 500, xp: 55 },
      { name: 'Roti dinde', emoji: '\u{1F357}', inputs: { viande_dinde: 2, patate: 2 }, output: 'roti_dinde', time: 45, sell: 3500, xp: 130 },
      { name: 'Pate', emoji: '\u{1F96B}', inputs: { viande_porc: 3, oeuf: 2, oignon: 1 }, time: 50, sell: 3000, xp: 150 },
    ],
  },
  {
    name: 'Conserverie', emoji: '\u{1F96B}', cost: 12000, reqLevel: 14,
    recipes: [
      { name: 'Confiture', emoji: '\u{1F353}', inputs: { fraise: 3, sucre: 1 }, output: 'confiture', time: 30, sell: 500, xp: 70 },
      { name: 'Jus citron', emoji: '\u{1F34B}', inputs: { citron: 2, sucre: 1 }, time: 25, sell: 800, xp: 65 },
      { name: 'Gelee', emoji: '\u{1F34F}', inputs: { jus_pomme: 2, sucre: 1 }, time: 30, sell: 900, xp: 75 },
      { name: 'Marmelade', emoji: '\u{1F34A}', inputs: { orange: 3, sucre: 1 }, output: 'marmelade', time: 30, sell: 450, xp: 65 },
    ],
  },

  // ===== Tier 4: Spécialités (lv15-20) =====
  {
    name: 'Miellerie', emoji: '\u{1F36F}', cost: 15000, reqLevel: 15,
    recipes: [
      { name: 'Bonbon miel', emoji: '\u{1F36C}', inputs: { miel: 2, sucre: 2 }, time: 30, sell: 2000, xp: 100 },
      { name: 'Nougat', emoji: '\u{1F95C}', inputs: { miel: 3, oeuf: 2, sucre: 1 }, time: 50, sell: 4000, xp: 180 },
    ],
  },
  {
    name: 'Bar a jus', emoji: '\u{1F964}', cost: 18000, reqLevel: 16,
    recipes: [
      { name: 'Jus orange', emoji: '\u{1F9C3}', inputs: { orange: 3 }, output: 'jus_orange', time: 15, sell: 200, xp: 40 },
      { name: 'Smoothie', emoji: '\u{1F964}', inputs: { banane: 2, fraise: 2, mangue: 1 }, output: 'smoothie', time: 25, sell: 600, xp: 80 },
      { name: 'Cocktail', emoji: '\u{1F379}', inputs: { jus_pomme: 1, jus_orange: 1, citron: 1 }, time: 20, sell: 1200, xp: 100 },
    ],
  },
  {
    name: 'Cidrerie', emoji: '\u{1F37A}', cost: 20000, reqLevel: 17,
    recipes: [
      { name: 'Cidre', emoji: '\u{1F37A}', inputs: { pomme: 4, sucre: 1 }, output: 'cidre', time: 40, sell: 700, xp: 90 },
      { name: 'Confiture cerise', emoji: '\u{1F352}', inputs: { cerise: 3, sucre: 1 }, time: 30, sell: 1200, xp: 85 },
      { name: 'Smoothie peche', emoji: '\u{1F351}', inputs: { peche: 3, banane: 1, lait: 1 }, time: 25, sell: 1500, xp: 95 },
    ],
  },
  {
    name: 'Cave a vin', emoji: '\u{1F377}', cost: 22000, reqLevel: 18,
    recipes: [
      { name: 'Vin', emoji: '\u{1F377}', inputs: { raisin: 3 }, output: 'vin', time: 50, sell: 800, xp: 110 },
      { name: 'Vinaigre', emoji: '\u{1FAE7}', inputs: { raisin: 2, pomme: 1 }, time: 35, sell: 700, xp: 80 },
      { name: 'Vin premium', emoji: '\u{1F942}', inputs: { raisin: 5, miel: 1 }, time: 80, sell: 5500, xp: 280 },
    ],
  },
  {
    name: 'Pizzeria', emoji: '\u{1F355}', cost: 28000, reqLevel: 19,
    recipes: [
      { name: 'Pizza', emoji: '\u{1F355}', inputs: { farine_ble: 2, sauce_tomate: 1, fromage: 2 }, output: 'pizza', time: 30, sell: 2500, xp: 120 },
      { name: 'Calzone', emoji: '\u{1FAD4}', inputs: { farine_ble: 2, sauce_tomate: 1, charcuterie: 1, fromage: 1 }, time: 35, sell: 3200, xp: 150 },
      { name: 'Risotto', emoji: '\u{1F35A}', inputs: { mais: 3, champignon: 2, fromage: 1, beurre: 1 }, output: 'risotto', time: 40, sell: 2000, xp: 110 },
    ],
  },
  {
    name: 'Huilerie', emoji: '\u{1FAD2}', cost: 30000, reqLevel: 20,
    recipes: [
      { name: 'Huile olive', emoji: '\u{1FAD2}', inputs: { olive: 3 }, output: 'huile_olive', time: 40, sell: 1000, xp: 130 },
      { name: 'Lait coco', emoji: '\u{1F965}', inputs: { noix_coco: 2 }, output: 'lait_coco', time: 35, sell: 900, xp: 110 },
      { name: 'Tapenade', emoji: '\u{1FAE7}', inputs: { olive: 4, citron: 1 }, time: 50, sell: 3500, xp: 200 },
    ],
  },

  // ===== Tier 5: Luxe (lv22-28) =====
  {
    name: 'Patisserie', emoji: '\u{1F9C1}', cost: 45000, reqLevel: 22,
    recipes: [
      { name: 'Tarte fruits', emoji: '\u{1F967}', inputs: { farine_ble: 2, beurre: 2, confiture: 1, oeuf: 1 }, time: 50, sell: 5500, xp: 300 },
      { name: 'Croissant', emoji: '\u{1F950}', inputs: { farine_ble: 3, beurre: 3, creme: 1 }, time: 40, sell: 4500, xp: 250 },
      { name: 'Macaron', emoji: '\u{1F9C1}', inputs: { oeuf: 4, sucre: 3, creme: 2 }, time: 60, sell: 7500, xp: 400 },
      { name: 'Tarte citrouille', emoji: '\u{1F967}', inputs: { citrouille: 3, farine_ble: 2, oeuf: 2, sucre: 1 }, output: 'tarte_citrouille', time: 55, sell: 1500, xp: 220 },
    ],
  },
  {
    name: 'Atelier luxe', emoji: '\u{1F338}', cost: 55000, reqLevel: 24,
    recipes: [
      { name: 'Parfum', emoji: '\u{1F338}', inputs: { fleur: 3, citron: 2, miel: 1 }, output: 'parfum', time: 60, sell: 5000, xp: 350 },
      { name: 'Bougie', emoji: '\u{1F56F}\uFE0F', inputs: { miel: 2, fleur: 2, lait_coco: 1 }, output: 'bougie', time: 45, sell: 2500, xp: 200 },
      { name: 'Coussin', emoji: '\u{1F6CB}\uFE0F', inputs: { fourrure: 3, plume: 3, laine: 2 }, output: 'coussin', time: 50, sell: 1200, xp: 180 },
    ],
  },
  {
    name: 'Chocolaterie', emoji: '\u{1F36B}', cost: 70000, reqLevel: 25,
    recipes: [
      { name: 'Chocolat', emoji: '\u{1F36B}', inputs: { lait_coco: 2, sucre: 3, beurre: 2 }, output: 'chocolat', time: 50, sell: 3000, xp: 200 },
      { name: 'Pralines', emoji: '\u{1F36C}', inputs: { chocolat: 2, miel: 2, creme: 1 }, time: 55, sell: 9000, xp: 500 },
      { name: 'Truffes', emoji: '\u{1F7E4}', inputs: { chocolat: 3, creme: 2, beurre: 1 }, time: 70, sell: 13000, xp: 650 },
      { name: 'Fontaine choco', emoji: '\u{1F958}', inputs: { chocolat: 4, lait_coco: 2, sucre: 2 }, time: 90, sell: 20000, xp: 900 },
    ],
  },
  {
    name: 'Rotisserie', emoji: '\u{1F356}', cost: 90000, reqLevel: 27,
    recipes: [
      { name: 'Poulet roti', emoji: '\u{1F357}', inputs: { oeuf: 5, patate: 3, oignon: 2, beurre: 1 }, time: 60, sell: 8000, xp: 450 },
      { name: 'Brochettes', emoji: '\u{1F362}', inputs: { viande_porc: 3, oignon: 2, champignon: 2 }, time: 50, sell: 6500, xp: 380 },
      { name: 'Festin dinde', emoji: '\u{1F983}', inputs: { roti_dinde: 2, sauce_tomate: 1, fromage: 2, citrouille: 1 }, time: 80, sell: 18000, xp: 800 },
    ],
  },
  {
    name: 'Restaurant', emoji: '\u{1F37D}\uFE0F', cost: 120000, reqLevel: 28,
    recipes: [
      { name: 'Menu gastro', emoji: '\u{1F37D}\uFE0F', inputs: { fromage: 2, vin: 1, huile_olive: 1, farine_ble: 2 }, time: 70, sell: 15000, xp: 750 },
      { name: 'Festin royal', emoji: '\u{1F451}', inputs: { chocolat: 2, vin: 2, fromage: 2, creme: 2 }, time: 100, sell: 28000, xp: 1300 },
      { name: 'Banquet', emoji: '\u{1F389}', inputs: { confiture: 2, fromage: 3, vin: 2, chocolat: 1, huile_olive: 1 }, time: 130, sell: 45000, xp: 2200 },
    ],
  },

  // ===== Tier 6: Endgame (lv30) =====
  {
    name: 'Palace etoile', emoji: '\u{1F3F0}', cost: 250000, reqLevel: 30,
    recipes: [
      { name: 'Diner royal', emoji: '\u{1F451}', inputs: { pizza: 1, vin: 2, chocolat: 2, parfum: 1, roti_dinde: 1 }, time: 120, sell: 60000, xp: 3000 },
      { name: 'Buffet palace', emoji: '\u{1F386}', inputs: { risotto: 2, smoothie: 2, tarte_citrouille: 1, charcuterie: 2, vin: 1 }, time: 150, sell: 80000, xp: 4000 },
      { name: 'Gala ultime', emoji: '\u{1F3C6}', inputs: { chocolat: 3, parfum: 2, vin: 3, pizza: 2, coussin: 1, cidre: 2 }, time: 200, sell: 150000, xp: 8000 },
    ],
  },
];

/** Atelier building grid constants */
export const ATELIER_COLS = 6;
export const ATELIER_MAX_ROWS = 10;
export const ATELIER_TOTAL = ATELIER_COLS * ATELIER_MAX_ROWS; // 60
export const ATELIER_START_UNLOCKED = 3;

/** Get all recipes that have an output (for ouvrier assignment) */
export function getAllOutputRecipes(): { atelierIdx: number; recipeIdx: number; recipe: RecipeDef; atelierName: string }[] {
  const result: { atelierIdx: number; recipeIdx: number; recipe: RecipeDef; atelierName: string }[] = [];
  ATELIERS.forEach((atelier, ai) => {
    atelier.recipes.forEach((recipe, ri) => {
      if (recipe.output) {
        result.push({ atelierIdx: ai, recipeIdx: ri, recipe, atelierName: atelier.name });
      }
    });
  });
  return result;
}
