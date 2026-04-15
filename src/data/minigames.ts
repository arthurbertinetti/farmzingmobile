// src/data/minigames.ts
// Mini-game definitions and level-scaling parameters for 10 games x 100 levels

export interface MiniGameDef {
  key: string;
  label: string;
  emoji: string;
  stateKey: string;
}

export const MG_GAMES: MiniGameDef[] = [
  { key: 'lightsout',   label: 'Lights Out',   emoji: '\u{1F526}', stateKey: 'mgLevel' },
  { key: 'memory',      label: 'Memoire',       emoji: '\u{1F9E0}', stateKey: 'mmLevel' },
  { key: 'simon',       label: 'Simon',         emoji: '\u{1F3B5}', stateKey: 'siLevel' },
  { key: 'taquin',      label: 'Taquin',        emoji: '\u{1F9E9}', stateKey: 'tqLevel' },
  { key: 'flood',       label: 'Flood',         emoji: '\u{1F3A8}', stateKey: 'flLevel' },
  { key: 'snake',       label: 'Snake',         emoji: '\u{1F40D}', stateKey: 'snLevel' },
  { key: 'maze',        label: 'Labyrinthe',    emoji: '\u{1F3C1}', stateKey: 'maLevel' },
  { key: 'minesweeper', label: 'Demineur',      emoji: '\u{1F4A3}', stateKey: 'ppLevel' },
  { key: 'pattern',     label: 'Pattern',       emoji: '\u{1F3AF}', stateKey: 'cpLevel' },
  { key: '2048',        label: '2048',          emoji: '\u{1F522}', stateKey: 'rvLevel' },
];

export const MG_MAX_LEVEL = 100;

// ========== LIGHTS OUT ==========

export function lightsOutParams(lv: number) {
  let size: number;
  if (lv <= 5) size = 3;
  else if (lv <= 15) size = 4;
  else if (lv <= 30) size = 5;
  else if (lv <= 50) size = 6;
  else if (lv <= 75) size = 7;
  else size = 8;
  let scramble: number;
  if (lv <= 3) scramble = lv + 1;
  else if (lv <= 10) scramble = Math.floor(lv * 0.8 + 2);
  else if (lv <= 30) scramble = Math.floor(lv * 0.6 + 4);
  else scramble = Math.floor(lv * 0.5 + 8);
  return { size, scramble };
}

// ========== MEMORY ==========

export const MEMORY_EMOJIS = [
  '\u{1F34E}','\u{1F34A}','\u{1F34B}','\u{1F34C}','\u{1F34D}','\u{1F34F}','\u{1F350}',
  '\u{1F351}','\u{1F352}','\u{1F353}','\u{1F347}','\u{1F348}','\u{1F349}','\u{1F36A}',
  '\u{1F36B}','\u{1F36C}','\u{1F36D}','\u{1F36E}','\u{1F36F}','\u{1F370}','\u{1F382}',
  '\u{1F383}','\u{1F384}','\u{1F3B2}','\u{1F3B5}','\u{1F3B6}','\u{1F3B8}','\u{1F3BA}',
  '\u{1F3C0}','\u{1F3C8}','\u{1F40D}','\u{1F40E}','\u{1F411}','\u{1F412}','\u{1F418}',
  '\u{1F41D}','\u{1F41E}','\u{1F420}','\u{1F422}','\u{1F426}','\u{1F427}','\u{1F428}',
  '\u{1F42C}','\u{1F42D}','\u{1F42E}','\u{1F42F}','\u{1F430}','\u{1F431}','\u{1F432}',
  '\u{1F433}','\u{1F434}','\u{1F435}','\u{1F436}','\u{1F437}','\u{1F438}','\u{1F43B}',
  '\u{1F43C}','\u{1F43D}','\u{1F43E}','\u{1F440}','\u{1F451}','\u{1F452}','\u{1F453}',
  '\u{1F454}','\u{1F480}','\u{1F48E}','\u{1F4A0}','\u{1F4A3}','\u{1F4A5}','\u{1F4A7}',
  '\u{1F4A8}','\u{1F4AB}','\u{1F4AF}','\u{1F4B0}','\u{1F4D6}','\u{1F4DA}','\u{1F4DF}',
  '\u{1F4E6}','\u{1F4F1}','\u{1F511}','\u{1F512}','\u{1F513}','\u{1F514}','\u{1F516}',
  '\u{1F525}','\u{1F528}','\u{1F52E}','\u{1F52F}','\u{1F530}','\u{1F550}','\u{1F600}',
  '\u{1F601}','\u{1F602}','\u{1F603}','\u{1F604}','\u{1F605}','\u{1F606}','\u{1F607}',
  '\u{1F608}','\u{1F609}','\u{1F60A}','\u{1F60B}','\u{1F60C}','\u{1F60D}','\u{1F60E}',
  '\u{1F60F}','\u{1F610}','\u{1F611}','\u{1F612}','\u{1F613}','\u{1F614}','\u{1F615}',
  '\u{1F616}','\u{1F617}','\u{1F618}','\u{1F619}','\u{1F61A}','\u{1F61B}','\u{1F61C}',
  '\u{1F61D}','\u{1F61E}','\u{1F61F}','\u{1F620}','\u{1F621}','\u{1F622}','\u{1F623}',
  '\u{1F624}','\u{1F625}','\u{1F626}','\u{1F627}','\u{1F628}','\u{1F629}','\u{1F62A}',
  '\u{1F62B}','\u{1F62C}','\u{1F62D}','\u{1F62E}','\u{1F62F}','\u{1F630}','\u{1F631}',
  '\u{1F680}','\u{1F681}','\u{1F682}','\u{1F683}','\u{1F684}','\u{1F685}','\u{1F68C}',
  '\u{1F693}','\u{1F695}','\u{1F697}','\u{1F69A}','\u{1F6A2}','\u{1F6A4}','\u{1F6A8}',
  '\u{1F6AB}','\u{1F6B2}','\u{1F30D}','\u{1F30E}','\u{1F30F}','\u{1F310}','\u{1F312}',
  '\u{1F315}','\u{1F319}','\u{1F31F}','\u{1F320}','\u{1F32A}\uFE0F','\u{1F32B}\uFE0F',
  '\u{1F32E}','\u{1F32F}','\u{1F330}','\u{1F331}','\u{1F332}','\u{1F333}','\u{1F334}',
  '\u{1F335}','\u{1F336}\uFE0F','\u{1F337}','\u{1F338}','\u{1F339}','\u{1F33A}','\u{1F33B}',
  '\u{1F33C}','\u{1F33D}','\u{1F33E}','\u{1F33F}','\u{1F340}','\u{1F341}','\u{1F342}',
  '\u{1F343}','\u{1F344}','\u{1F345}','\u{1F346}','\u{1F347}','\u{1F400}','\u{1F401}',
  '\u{1F402}','\u{1F403}','\u{1F404}','\u{1F405}','\u{1F406}','\u{1F407}','\u{1F408}',
  '\u{1F409}','\u{1F40A}','\u{1F40B}','\u{1F40C}','\u{1F40F}','\u{1F410}','\u{1F413}',
  '\u{1F414}','\u{1F415}','\u{1F416}','\u{1F417}','\u{1F419}','\u{1F41A}','\u{1F41B}',
  '\u{1F41C}','\u{1F41F}','\u{1F421}','\u{1F423}','\u{1F424}','\u{1F425}','\u{1F439}',
  '\u{1F43A}','\u{1F4B2}','\u{1F4B3}','\u{1F4B4}','\u{1F4B5}','\u{1F4BB}','\u{1F4BC}',
  '\u{1F4BD}','\u{1F4BE}','\u{1F4BF}','\u{1F4C0}','\u{1F4CD}','\u{1F4CE}','\u{1F4D1}',
  '\u{1F4D2}','\u{1F4D3}','\u{1F4D4}','\u{1F4D5}','\u{1F4D7}','\u{1F4D8}','\u{1F4D9}',
  '\u{1F4DD}','\u{1F4DE}','\u{1F4E0}','\u{1F4E1}','\u{1F4E2}','\u{1F4E3}','\u{1F4E4}',
  '\u{1F4E5}','\u{1F4E7}','\u{1F4E8}','\u{1F4E9}','\u{1F4EA}','\u{1F4EB}','\u{1F4EC}',
  '\u{1F4ED}','\u{1F4EE}','\u{1F4EF}','\u{1F4F0}','\u{1F4F2}','\u{1F4F3}','\u{1F4F4}',
  '\u{1F4F6}','\u{1F4F7}','\u{1F4F9}','\u{1F4FA}','\u{1F4FB}','\u{1F4FC}','\u{1F503}',
  '\u{1F504}','\u{1F505}','\u{1F506}','\u{1F507}','\u{1F508}','\u{1F509}','\u{1F50A}',
  '\u{1F50B}','\u{1F50C}','\u{1F50D}','\u{1F50E}','\u{1F50F}','\u{1F510}','\u{1F515}',
  '\u{1F517}','\u{1F518}','\u{1F519}','\u{1F51A}','\u{1F51B}','\u{1F51C}','\u{1F51D}',
  '\u{1F51E}','\u{1F51F}','\u{1F520}','\u{1F521}','\u{1F522}','\u{1F523}','\u{1F524}',
  '\u{1F526}','\u{1F527}','\u{1F529}','\u{1F52A}','\u{1F52B}','\u{1F52C}','\u{1F52D}',
  '\u{2702}\uFE0F','\u{2709}\uFE0F','\u{270F}\uFE0F','\u{2712}\uFE0F','\u{2728}',
  '\u{274C}','\u{274E}','\u{2753}','\u{2754}','\u{2755}','\u{2757}','\u{2764}\uFE0F',
  '\u{1F49C}','\u{1F49A}','\u{1F49B}','\u{1F499}','\u{1F49D}','\u{1F49E}','\u{1F49F}',
  '\u{1F4A1}','\u{1F4A2}','\u{1F4A4}','\u{1F4A6}','\u{1F4A9}','\u{1F4AA}','\u{1F4AC}',
];

export function memoryParams(lv: number) {
  let cols: number, rows: number;
  if (lv <= 10) { cols = 4; rows = 4; }       // 16 cards = 8 pairs
  else if (lv <= 25) { cols = 6; rows = 4; }   // 24 cards = 12 pairs
  else if (lv <= 45) { cols = 6; rows = 6; }   // 36 cards = 18 pairs
  else if (lv <= 70) { cols = 8; rows = 6; }   // 48 cards = 24 pairs
  else { cols = 8; rows = 8; }                  // 64 cards = 32 pairs
  const total = cols * rows;
  const pairs = Math.floor(total / 2);
  const hasJoker = total % 2 === 1;
  return { cols, rows, pairs, hasJoker };
}

// ========== SIMON ==========

export const SIMON_COLORS = ['#e74c3c', '#3498db', '#2ecc71', '#f1c40f'];

export function simonParams(lv: number) {
  return { sequenceLength: lv + 2 };
}

// ========== TAQUIN ==========

export function taquinParams(lv: number) {
  let size: number;
  if (lv <= 10) size = 3;
  else if (lv <= 30) size = 4;
  else if (lv <= 55) size = 5;
  else if (lv <= 80) size = 6;
  else size = 7;
  const shuffleMoves = 50 + lv * 10;
  return { size, shuffleMoves };
}

// ========== FLOOD ==========

export const FL_COLORS = ['#e74c3c', '#3498db', '#2ecc71', '#f1c40f', '#9b59b6', '#e67e22', '#1abc9c'];

export function floodParams(lv: number) {
  let size: number, numColors: number, maxMoves: number;
  if (lv <= 10) { size = 6; numColors = 4; maxMoves = 14; }
  else if (lv <= 25) { size = 8; numColors = 5; maxMoves = 18; }
  else if (lv <= 45) { size = 10; numColors = 5; maxMoves = 22; }
  else if (lv <= 70) { size = 12; numColors = 6; maxMoves = 28; }
  else if (lv <= 90) { size = 14; numColors = 6; maxMoves = 32; }
  else { size = 16; numColors = 7; maxMoves = 38; }
  return { size, numColors, maxMoves };
}

// ========== SNAKE ==========

export function snakeParams(lv: number) {
  let size: number, target: number;
  if (lv <= 15) { size = 6; target = 3 + lv; }
  else if (lv <= 40) { size = 8; target = 4 + lv; }
  else if (lv <= 70) { size = 10; target = 5 + lv; }
  else { size = 12; target = 6 + lv; }
  return { size, target };
}

// ========== MAZE ==========

export function mazeParams(lv: number) {
  let base: number;
  if (lv <= 10) base = 5;
  else if (lv <= 25) base = 7;
  else if (lv <= 45) base = 9;
  else if (lv <= 70) base = 11;
  else if (lv <= 90) base = 13;
  else base = 15;
  // actual grid is (base*2+1)x(base*2+1)
  return { base, gridSize: base * 2 + 1 };
}

// ========== MINESWEEPER ==========

export function minesweeperParams(lv: number) {
  let size: number, mines: number;
  if (lv <= 10) { size = 6; mines = 5 + lv; }
  else if (lv <= 25) { size = 8; mines = 8 + lv; }
  else if (lv <= 50) { size = 10; mines = 12 + lv; }
  else if (lv <= 75) { size = 12; mines = 16 + lv; }
  else { size = 14; mines = 20 + lv; }
  mines = Math.min(mines, Math.floor(size * size * 0.35));
  return { size, mines };
}

// ========== COLOR PATTERN ==========

export const CP_COLORS = ['#e74c3c', '#3498db', '#2ecc71', '#f1c40f', '#9b59b6', '#e67e22'];

export function patternParams(lv: number) {
  let size: number, numColors: number, filled: number;
  if (lv <= 10) { size = 3; numColors = 3; filled = 3 + lv; }
  else if (lv <= 30) { size = 4; numColors = 4; filled = 5 + lv; }
  else if (lv <= 60) { size = 5; numColors = 5; filled = 6 + lv; }
  else { size = 6; numColors = 6; filled = 8 + lv; }
  filled = Math.min(filled, size * size);
  const viewTimeMs = 2000 + lv * 30;
  const hintCost = 100 + lv * 20;
  return { size, numColors, filled, viewTimeMs, hintCost };
}

// ========== 2048 ==========

export function game2048Params(lv: number) {
  const size = 4;
  let target: number;
  if (lv <= 5) target = 64;
  else if (lv <= 15) target = 128;
  else if (lv <= 30) target = 256;
  else if (lv <= 50) target = 512;
  else if (lv <= 75) target = 1024;
  else target = 2048;
  return { size, target };
}
