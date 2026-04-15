// src/data/crops.ts

export interface CropDef {
  name: string;
  emoji: string;
  stageTime: number; // seconds per watering stage
  cost: number;
  sellValue: number;
  xp: number;
  reqLevel: number;
  /** Resource key produced on harvest (if any) */
  resourceKey?: string;
}

export const CROPS: CropDef[] = [
  { name: 'Carotte', emoji: '\u{1F955}', stageTime: 3, cost: 5, sellValue: 15, xp: 5, reqLevel: 1, resourceKey: 'carotte' },
  { name: 'Tomate', emoji: '\u{1F345}', stageTime: 6, cost: 8, sellValue: 22, xp: 8, reqLevel: 1, resourceKey: 'tomate' },
  { name: 'Salade', emoji: '\u{1F96C}', stageTime: 10, cost: 12, sellValue: 32, xp: 12, reqLevel: 2, resourceKey: 'salade' },
  { name: 'Poivron', emoji: '\u{1FAD1}', stageTime: 16, cost: 16, sellValue: 45, xp: 16, reqLevel: 2, resourceKey: 'poivron' },
  { name: 'Ble', emoji: '\u{1F33E}', stageTime: 22, cost: 20, sellValue: 58, xp: 20, reqLevel: 3, resourceKey: 'ble' },
  { name: 'Concombre', emoji: '\u{1F952}', stageTime: 30, cost: 25, sellValue: 72, xp: 25, reqLevel: 3, resourceKey: 'concombre' },
  { name: 'Mais', emoji: '\u{1F33D}', stageTime: 40, cost: 30, sellValue: 88, xp: 30, reqLevel: 4, resourceKey: 'mais' },
  { name: 'Aubergine', emoji: '\u{1F346}', stageTime: 55, cost: 38, sellValue: 110, xp: 38, reqLevel: 5, resourceKey: 'aubergine' },
  { name: 'P.de terre', emoji: '\u{1F954}', stageTime: 70, cost: 46, sellValue: 135, xp: 46, reqLevel: 6, resourceKey: 'patate' },
  { name: 'Fraise', emoji: '\u{1F353}', stageTime: 90, cost: 55, sellValue: 165, xp: 55, reqLevel: 7, resourceKey: 'fraise' },
  { name: 'Piment', emoji: '\u{1F336}\u{FE0F}', stageTime: 110, cost: 65, sellValue: 200, xp: 65, reqLevel: 8, resourceKey: 'piment' },
  { name: 'Oignon', emoji: '\u{1F9C5}', stageTime: 135, cost: 78, sellValue: 240, xp: 78, reqLevel: 9, resourceKey: 'oignon' },
  { name: 'Brocoli', emoji: '\u{1F966}', stageTime: 165, cost: 92, sellValue: 290, xp: 92, reqLevel: 10, resourceKey: 'brocoli' },
  { name: 'Melon', emoji: '\u{1F348}', stageTime: 200, cost: 110, sellValue: 350, xp: 110, reqLevel: 11, resourceKey: 'melon' },
  { name: 'Pasteque', emoji: '\u{1F349}', stageTime: 240, cost: 130, sellValue: 420, xp: 130, reqLevel: 12, resourceKey: 'pasteque' },
  { name: 'Champignon', emoji: '\u{1F344}', stageTime: 290, cost: 155, sellValue: 500, xp: 155, reqLevel: 14, resourceKey: 'champignon' },
  { name: 'Ail', emoji: '\u{1F9C4}', stageTime: 350, cost: 185, sellValue: 600, xp: 185, reqLevel: 16, resourceKey: 'ail' },
  { name: 'Cerise', emoji: '\u{1F352}', stageTime: 420, cost: 220, sellValue: 720, xp: 220, reqLevel: 17, resourceKey: 'cerise' },
  { name: 'Citrouille', emoji: '\u{1F383}', stageTime: 550, cost: 270, sellValue: 870, xp: 270, reqLevel: 18, resourceKey: 'citrouille' },
  { name: 'Fleur doree', emoji: '\u{1F490}', stageTime: 1100, cost: 350, sellValue: 1500, xp: 400, reqLevel: 20, resourceKey: 'fleur' },
];
