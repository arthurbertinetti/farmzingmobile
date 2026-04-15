// src/data/trees.ts

export interface TreeDef {
  name: string;
  emoji: string;
  stageTime: number;
  cost: number;
  sellValue: number;
  xp: number;
  reqLevel: number;
  resourceKey?: string;
}

export const TREES: TreeDef[] = [
  { name: 'Pommier', emoji: '\u{1F34E}', stageTime: 90, cost: 200, sellValue: 400, xp: 100, reqLevel: 3, resourceKey: 'pomme' },
  { name: 'Poirier', emoji: '\u{1F350}', stageTime: 130, cost: 300, sellValue: 600, xp: 150, reqLevel: 5, resourceKey: 'poire' },
  { name: 'Oranger', emoji: '\u{1F34A}', stageTime: 180, cost: 450, sellValue: 900, xp: 220, reqLevel: 7, resourceKey: 'orange' },
  { name: 'Citronnier', emoji: '\u{1F34B}', stageTime: 240, cost: 600, sellValue: 1200, xp: 300, reqLevel: 9, resourceKey: 'citron' },
  { name: 'Bananier', emoji: '\u{1F34C}', stageTime: 310, cost: 800, sellValue: 1600, xp: 400, reqLevel: 11, resourceKey: 'banane' },
  { name: 'Pecher', emoji: '\u{1F351}', stageTime: 400, cost: 1100, sellValue: 2200, xp: 530, reqLevel: 13, resourceKey: 'peche' },
  { name: 'Manguier', emoji: '\u{1F96D}', stageTime: 500, cost: 1500, sellValue: 3000, xp: 700, reqLevel: 15, resourceKey: 'mangue' },
  { name: 'Vigne', emoji: '\u{1F347}', stageTime: 620, cost: 2000, sellValue: 4000, xp: 900, reqLevel: 17, resourceKey: 'raisin' },
  { name: 'Cocotier', emoji: '\u{1F965}', stageTime: 750, cost: 2800, sellValue: 5600, xp: 1200, reqLevel: 19, resourceKey: 'noix_coco' },
  { name: 'Olivier', emoji: '\u{1FAD2}', stageTime: 900, cost: 3800, sellValue: 7800, xp: 1600, reqLevel: 20, resourceKey: 'olive' },
];
