// src/data/garden.ts
// Garden decoration catalog — 16x16 decorative garden with buildings, deco, furniture, fences

export const GARDEN_SIZE = 16;

export interface GardenReward {
  coins?: number;
  stars?: number;
  bois?: number;
  res?: Record<string, number>;
  randomCrops?: number;
  randomBrut?: number;
  randomTransfo?: number;
  randomAnimal?: number;
}

export interface GardenItemDef {
  id: string;
  name: string;
  emoji: string;
  cost: number;
  /** Wood cost to place */
  wood?: number;
  /** Renovation states (buildings only). First state = initial placement. */
  states?: string[];
  /** Monthly reward when fully renovated (buildings only) */
  reward?: GardenReward;
  /** Human-readable reward description */
  rewardDesc?: string;
}

export interface GardenCategoryDef {
  id: string;
  name: string;
  items: GardenItemDef[];
}

export const GARDEN_CATS: GardenCategoryDef[] = [
  // === CATEGORY 0: BUILDINGS (produce monthly rewards when fully renovated) ===
  {
    id: 'batiment', name: '\u{1F3E0} Batiments', items: [
      {
        id: 'cabane', name: 'Cabane', emoji: '\u{1F6D6}', cost: 20000, wood: 15,
        states: ['\u{1FAB5}', '\u{1F6D6}', '\u{1F3D5}\uFE0F', '\u26FA', '\u{1F3E1}'],
        reward: { res: { oeuf: 5 } }, rewardDesc: '5\u{1F95A}/mois',
      },
      {
        id: 'maison', name: 'Maison', emoji: '\u{1F3E0}', cost: 30000, wood: 20,
        states: ['\u{1F3DA}\uFE0F', '\u{1F3E0}', '\u{1F3E1}'],
        reward: { coins: 10000 }, rewardDesc: '10 000\u{1F4B0}/mois',
      },
      {
        id: 'serre', name: 'Serre', emoji: '\u{1F33F}', cost: 50000, wood: 30,
        states: ['\u{1F3D7}\uFE0F', '\u{1F33F}', '\u{1F331}', '\u{1F332}'],
        reward: { randomCrops: 10 }, rewardDesc: '10 cultures alea./mois',
      },
      {
        id: 'grange', name: 'Grange', emoji: '\u{1F3E0}', cost: 80000, wood: 40,
        states: ['\u{1F3D7}\uFE0F', '\u{1F3E0}', '\u{1F3E1}', '\u{1F3D8}\uFE0F', '\u{1F33E}', '\u{1F3AA}'],
        reward: { res: { lait: 10 } }, rewardDesc: '10\u{1F95B}/mois',
      },
      {
        id: 'cafe', name: 'Cafe', emoji: '\u2615', cost: 90000, wood: 35,
        states: ['\u{1F3D7}\uFE0F', '\u2615', '\u{1F375}', '\u{1F9C1}', '\u{1F382}', '\u{1F370}', '\u{1F369}', '\u{1F36A}', '\u{1FAD6}', '\u{1F950}', '\u{1F37D}\uFE0F', '\u2B50', '\u{1F31F}', '\u2728', '\u{1F3C6}'],
        reward: { randomTransfo: 3, coins: 8000 }, rewardDesc: '8 000\u{1F4B0} + 3 ress. transfo./mois',
      },
      {
        id: 'marche', name: 'Marche', emoji: '\u{1F3EA}', cost: 100000, wood: 45,
        states: ['\u{1F3D7}\uFE0F', '\u{1F3EA}', '\u{1F3EC}', '\u{1F6D2}', '\u{1F6CD}\uFE0F', '\u{1F4B0}', '\u{1F3AA}', '\u{1F3A1}', '\u{1F3DF}\uFE0F', '\u{1F3A0}', '\u{1F3A2}', '\u{1F386}', '\u{1F31F}', '\u{1F3C6}'],
        reward: { randomAnimal: 15 }, rewardDesc: '15 ress. animaux/mois',
      },
      {
        id: 'moulin_d', name: 'Moulin', emoji: '\u{1F3ED}', cost: 120000, wood: 50,
        states: ['\u{1F3D7}\uFE0F', '\u{1F3ED}', '\u2699\uFE0F', '\u{1F527}', '\u{1F529}', '\u{1F4A8}', '\u{1F32C}\uFE0F'],
        reward: { res: { farine_ble: 4, farine_mais: 4 } }, rewardDesc: '4 farine ble + 4 farine mais/mois',
      },
      {
        id: 'poste', name: 'Poste', emoji: '\u{1F3E3}', cost: 130000, wood: 50,
        states: ['\u{1F3D7}\uFE0F', '\u{1F3E3}', '\u{1F4EE}', '\u{1F4EC}', '\u{1F4EB}', '\u{1F4E6}', '\u{1F3E4}', '\u{1F4E8}', '\u{1F48C}', '\u{1F381}', '\u{1F69A}', '\u{1F4E1}', '\u{1F6F0}\uFE0F', '\u{1F30D}', '\u2728', '\u{1F3C6}'],
        reward: { randomBrut: 12 }, rewardDesc: '12 ressources/mois',
      },
      {
        id: 'phare', name: 'Phare', emoji: '\u{1F5FC}', cost: 150000, wood: 50,
        states: ['\u{1F3D7}\uFE0F', '\u{1F5FC}', '\u{1F526}', '\u{1F4A1}', '\u{1F31F}', '\u2728', '\u{1F506}', '\u26A1', '\u{1F308}', '\u{1F386}'],
        reward: { coins: 15000, randomBrut: 3 }, rewardDesc: '15 000\u{1F4B0} + 3 ress./mois',
      },
      {
        id: 'bibliotheque', name: 'Bibliotheque', emoji: '\u{1F3E2}', cost: 180000, wood: 55,
        states: ['\u{1F3D7}\uFE0F', '\u{1F3E2}', '\u{1F4D6}', '\u{1F4DA}', '\u{1F4DC}', '\u{1F516}', '\u{1F3DB}\uFE0F', '\u{1F4D5}', '\u{1F4D7}', '\u{1F4D8}', '\u{1F4D9}', '\u{1F3AD}', '\u{1F3C6}'],
        reward: { randomTransfo: 5 }, rewardDesc: '5 ress. transformees/mois',
      },
      {
        id: 'eglise', name: 'Chapelle', emoji: '\u26EA', cost: 200000, wood: 60,
        states: ['\u{1F3D7}\uFE0F', '\u26EA', '\u{1F54D}', '\u{1F6D5}', '\u{1F492}', '\u{1F64F}', '\u271D\uFE0F', '\u2B50'],
        reward: { coins: 20000, stars: 1 }, rewardDesc: '20 000\u{1F4B0} + 1\u2B50/mois',
      },
      {
        id: 'ecole', name: 'Ecole', emoji: '\u{1F3EB}', cost: 250000, wood: 70,
        states: ['\u{1F3D7}\uFE0F', '\u{1F3EB}', '\u{1F4DA}', '\u{1F393}', '\u{1F52C}', '\u{1F52D}', '\u{1F3C5}', '\u{1F4D0}', '\u270F\uFE0F', '\u{1F3A8}', '\u{1F9EA}', '\u{1F3C6}'],
        reward: { coins: 25000, randomBrut: 5 }, rewardDesc: '25 000\u{1F4B0} + 5 ress./mois',
      },
      {
        id: 'hotel', name: 'Hotel', emoji: '\u{1F3E8}', cost: 350000, wood: 80,
        states: ['\u{1F3D7}\uFE0F', '\u{1F3E8}', '\u{1F3E9}', '\u{1F6CE}\uFE0F', '\u{1F3A9}', '\u{1F48E}', '\u{1F31F}', '\u2728', '\u{1F3C6}', '\u{1F451}', '\u{1F396}\uFE0F'],
        reward: { coins: 35000 }, rewardDesc: '35 000\u{1F4B0}/mois',
      },
      {
        id: 'chateau', name: 'Chateau', emoji: '\u{1F3F0}', cost: 500000, wood: 100,
        states: ['\u{1F3D7}\uFE0F', '\u{1F3F0}', '\u{1F3EF}', '\u{1F451}', '\u{1F5E1}\uFE0F', '\u{1F6E1}\uFE0F', '\u269C\uFE0F', '\u{1F981}', '\u{1F48E}'],
        reward: { coins: 50000 }, rewardDesc: '50 000\u{1F4B0}/mois',
      },
    ],
  },

  // === CATEGORY 1: DECORATIONS (purely cosmetic) ===
  {
    id: 'deco', name: '\u{1F333} Decorations', items: [
      { id: 'souche', name: 'Souche', emoji: '\u{1FAB5}', cost: 2000 },
      { id: 'herbe', name: 'Herbe haute', emoji: '\u{1F33E}', cost: 3000 },
      { id: 'fleur_d', name: 'Fleurs', emoji: '\u{1F337}', cost: 4000 },
      { id: 'buisson', name: 'Buisson', emoji: '\u2618\uFE0F', cost: 4000 },
      { id: 'lierre', name: 'Lierre', emoji: '\u{1F33F}', cost: 5000 },
      { id: 'tournesol', name: 'Tournesol', emoji: '\u{1F33B}', cost: 5000 },
      { id: 'arbre_d', name: 'Arbre', emoji: '\u{1F333}', cost: 6000 },
      { id: 'champignon_d', name: 'Champignon', emoji: '\u{1F344}', cost: 6000 },
      { id: 'pierre_deco', name: 'Rocher', emoji: '\u{1FAA8}', cost: 6000 },
      { id: 'rose', name: 'Roses', emoji: '\u{1F339}', cost: 7000 },
      { id: 'sapin', name: 'Sapin', emoji: '\u{1F332}', cost: 8000 },
      { id: 'cactus', name: 'Cactus', emoji: '\u{1F335}', cost: 8000 },
      { id: 'palmier', name: 'Palmier', emoji: '\u{1F334}', cost: 10000 },
      { id: 'trefle', name: 'Trefle', emoji: '\u{1F340}', cost: 10000 },
      { id: 'bambou', name: 'Bambou', emoji: '\u{1F38B}', cost: 12000 },
      { id: 'nenuphare', name: 'Nenuphar', emoji: '\u{1F33A}', cost: 14000 },
      { id: 'cerisier', name: 'Cerisier', emoji: '\u{1F338}', cost: 16000 },
      { id: 'bonsai', name: 'Bonsai', emoji: '\u{1F33E}', cost: 24000 },
      { id: 'lac', name: 'Lac', emoji: '\u{1F3DE}\uFE0F', cost: 25000 },
      { id: 'riviere', name: 'Riviere', emoji: '\u{1F30A}', cost: 30000 },
      { id: 'mare', name: 'Mare', emoji: '\u{1F4A7}', cost: 15000 },
    ],
  },

  // === CATEGORY 2: FURNITURE ===
  {
    id: 'mobilier', name: '\u{1FA91} Mobilier', items: [
      { id: 'boite_lettre', name: 'Boite lettres', emoji: '\u{1F4EE}', cost: 5000 },
      { id: 'pot_fleur', name: 'Pot de fleurs', emoji: '\u{1FAB4}', cost: 6000 },
      { id: 'table', name: 'Table', emoji: '\u{1FAB5}', cost: 8000 },
      { id: 'banc', name: 'Banc', emoji: '\u{1FA91}', cost: 10000 },
      { id: 'hamac', name: 'Hamac', emoji: '\u{1F6CB}\uFE0F', cost: 12000 },
      { id: 'lampadaire', name: 'Lampadaire', emoji: '\u{1FA94}', cost: 15000 },
      { id: 'barbecue', name: 'Barbecue', emoji: '\u{1F525}', cost: 15000 },
      { id: 'balancoire', name: 'Balancoire', emoji: '\u{1F3A0}', cost: 18000 },
      { id: 'parasol', name: 'Parasol', emoji: '\u26F1\uFE0F', cost: 20000 },
      { id: 'toboggan', name: 'Toboggan', emoji: '\u{1F6DD}', cost: 25000 },
      { id: 'borne', name: 'Borne arcade', emoji: '\u{1F3AE}', cost: 30000 },
      { id: 'horloge', name: 'Horloge', emoji: '\u{1F570}\uFE0F', cost: 35000 },
      { id: 'telescope', name: 'Telescope', emoji: '\u{1F52D}', cost: 40000 },
      { id: 'fontaine', name: 'Fontaine', emoji: '\u26F2', cost: 50000 },
      { id: 'statue', name: 'Statue', emoji: '\u{1F5FF}', cost: 80000 },
      { id: 'jacuzzi', name: 'Jacuzzi', emoji: '\u{1F6C1}', cost: 100000 },
    ],
  },

  // === CATEGORY 3: FENCES/PATHS ===
  {
    id: 'cloture', name: '\u{1F3D7}\uFE0F Clotures', items: [
      { id: 'chemin', name: 'Chemin', emoji: '\u{1F7EB}', cost: 1000 },
      { id: 'cloture_bois', name: 'Cloture bois', emoji: '\u{1FAB5}', cost: 2000, wood: 5 },
      { id: 'haie', name: 'Haie', emoji: '\u{1F33F}', cost: 3000, wood: 3 },
      { id: 'allee', name: 'Allee pavee', emoji: '\u2B1C', cost: 3000 },
      { id: 'muret', name: 'Muret bas', emoji: '\u{1F9F1}', cost: 4000 },
      { id: 'mur_pierre', name: 'Mur pierre', emoji: '\u{1F9F1}', cost: 6000 },
      { id: 'barriere', name: 'Barriere metal', emoji: '\u26D3\uFE0F', cost: 8000 },
      { id: 'escalier', name: 'Escalier', emoji: '\u{1FA9C}', cost: 15000, wood: 8 },
      { id: 'portail', name: 'Portail', emoji: '\u{1F6AA}', cost: 20000, wood: 10 },
      { id: 'arche', name: 'Arche fleurie', emoji: '\u{1F38A}', cost: 25000, wood: 15 },
      { id: 'passerelle', name: 'Passerelle', emoji: '\u{1F309}', cost: 30000, wood: 25 },
      { id: 'pont', name: 'Pont', emoji: '\u{1F309}', cost: 40000, wood: 20 },
    ],
  },
];

/** Find a garden item by ID across all categories */
export function findGardenItem(id: string): GardenItemDef | null {
  for (const cat of GARDEN_CATS) {
    for (const item of cat.items) {
      if (item.id === id) return item;
    }
  }
  return null;
}

/** Get the visual emoji for a garden cell given item id and current state index */
export function getGardenCellEmoji(id: string, stateIdx: number): string {
  const item = findGardenItem(id);
  if (!item) return '\u2753';
  if (item.states && item.states.length > 0) {
    const si = Math.min(stateIdx || 0, item.states.length - 1);
    return item.states[si];
  }
  return item.emoji || '\u2753';
}
