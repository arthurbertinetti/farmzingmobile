// src/utils/helpers.ts

/** Format a number: 1234 -> "1 234", 15000 -> "15K", 2500000 -> "2.5M" */
export function fmtN(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1).replace(/\.0$/, '') + 'M';
  if (n >= 10_000) return Math.floor(n / 1_000) + 'K';
  return n.toLocaleString('fr-FR');
}

/** Fisher-Yates shuffle */
export function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** Clamp value between min and max */
export function clamp(val: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, val));
}

/** Get XP required for a given level */
import { XP_TABLE } from './constants';
export function xpForLevel(level: number): number {
  if (level - 1 < XP_TABLE.length) return XP_TABLE[level - 1];
  return 370_000 + (level - 30) * 50_000;
}
