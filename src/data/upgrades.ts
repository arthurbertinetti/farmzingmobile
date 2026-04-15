// src/data/upgrades.ts

export interface UpgradeDef {
  id: string;
  name: string;
  desc: string;
  icon: string;
  baseCost: number;
  costMult: number;
  maxLevel: number;
  group: string;
}

export const UPGRADES: UpgradeDef[] = [
  // Engrais
  { id: 'speed',       name: 'Engrais rapide',   desc: '-5% temps/niv',                icon: '\u26A1',        baseCost: 30,    costMult: 1.15, maxLevel: 100,  group: 'engrais' },
  { id: 'bspeed',      name: 'Engrais atelier',  desc: '-5% temps atelier/niv',        icon: '\u{1F3ED}',     baseCost: 30,    costMult: 1.15, maxLevel: 100,  group: 'engrais' },
  { id: 'animalspeed', name: 'Engrais animaux',  desc: '-5% temps animal/niv',         icon: '\u{1F43E}',     baseCost: 30,    costMult: 1.15, maxLevel: 100,  group: 'engrais' },

  // Automatisations
  { id: 'autoharvest', name: 'Auto-recolte',     desc: 'Recolte auto (2-10 min)',       icon: '\u{1F916}',     baseCost: 300,   costMult: 2.5,  maxLevel: 5,    group: 'auto' },
  { id: 'autowater',   name: 'Auto-arrosage',    desc: 'Arrose auto (1-10 min)',        icon: '\u{1F6BF}',     baseCost: 400,   costMult: 2.5,  maxLevel: 10,   group: 'auto' },
  { id: 'autoatelier', name: 'Auto-atelier',     desc: 'Recolte ateliers auto (1-10 min)', icon: '\u{1F6E0}\uFE0F', baseCost: 400, costMult: 2.5, maxLevel: 10, group: 'auto' },
  { id: 'autofeed',    name: 'Auto-alimentation',desc: 'Nourrit animaux auto (1-10 min)', icon: '\u{1F37D}\uFE0F', baseCost: 400, costMult: 2.5, maxLevel: 10, group: 'auto' },

  // Parcelles & Capacité
  { id: 'animalslots', name: 'Parcelles animaux',desc: '+2 emplacements animaux/niv',   icon: '\u{1F404}',     baseCost: 500,   costMult: 1.3,  maxLevel: 24,   group: 'parcelles' },
  { id: 'watermax',    name: 'Reservoir',        desc: '+10 eau max',                   icon: '\u{1FAA3}',     baseCost: 15,    costMult: 1.03, maxLevel: 9990, group: 'parcelles' },

  // Autre
  { id: 'value',       name: 'Meilleur marche',  desc: '+15% vente/niv',                icon: '\u{1F48E}',     baseCost: 40,    costMult: 2.0,  maxLevel: 100,  group: 'autre' },
  { id: 'animalvalue', name: 'Quantite animaux', desc: '+1 ressource animal/niv',       icon: '\u{1F95A}',     baseCost: 80,    costMult: 1.6,  maxLevel: 50,   group: 'autre' },
  { id: 'savingsrate', name: "Taux d'epargne",   desc: 'Interet mensuel: 1%->25%',     icon: '\u{1F3E6}',     baseCost: 10000, costMult: 2.2,  maxLevel: 20,   group: 'autre' },
];

export const UPG_GROUPS = [
  { id: 'engrais',   label: '\u26A1 Engrais' },
  { id: 'auto',      label: '\u{1F916} Automatisations' },
  { id: 'parcelles', label: '\u{1F532} Parcelles & Capacite' },
  { id: 'autre',     label: '\u{1F48E} Autre' },
];

/** Get upgrade cost (with reset multiplier for auto upgrades) */
export function getUpgradeCost(upg: UpgradeDef, currentLevel: number, resets = 0): number {
  const resetMult = resets > 0 ? Math.pow(1.25, resets) : 1;
  return Math.floor(upg.baseCost * Math.pow(upg.costMult, currentLevel) * resetMult);
}

/** Get auto-upgrade duration in ms */
export function getAutoDuration(upgId: string, level: number): number {
  if (upgId === 'autoharvest') return level * 2 * 60000;
  // autowater, autoatelier, autofeed: level * 1 minute
  return level * 60000;
}

/** Get auto-upgrade reactivation cost */
export function getAutoReactivationCost(upgId: string, level: number): number {
  const base = upgId === 'autoharvest' ? 80 : upgId === 'autowater' ? 60 : 70;
  const mult = level >= 5 ? 3 : 1;
  return Math.floor(base * level * mult);
}

/** Get savings interest rate for a given upgrade level */
export function getSavingsRate(level: number): number {
  if (level <= 0) return 0;
  return (1 + (level - 1) * 24 / 19) / 100;
}

/** Get debt interest rate */
export function getDebtRate(debt: number): number {
  return Math.min(0.05 + debt / 100000, 0.30);
}
