// src/ui/SubTabBar.ts
// Reusable sub-tab bar matching the original game's green-bordered active style.
import Phaser from 'phaser';
import { COLORS, UI } from '../utils/constants';

export interface SubTabDef {
  id: string;
  label: string;
}

/**
 * Renders a row of sub-tab buttons at the given Y position.
 * Returns the bottom Y coordinate (below the bar).
 */
export function buildSubTabBar(
  scene: Phaser.Scene,
  parent: Phaser.GameObjects.Container,
  tabs: SubTabDef[],
  activeId: string,
  topY: number,
  onSelect: (id: string) => void,
): number {
  const { width } = scene.scale;
  const barH = 32;
  const cy = topY + barH / 2;

  // Background
  const bg = scene.add.graphics();
  bg.fillStyle(COLORS.sky, 1);
  bg.fillRect(0, topY, width, barH);
  parent.add(bg);

  const tabW = (width - 12) / tabs.length;
  const btnH = barH - 4;

  tabs.forEach((tab, i) => {
    const x = 6 + tabW * i + tabW / 2;
    const isActive = tab.id === activeId;

    const tbg = scene.add.graphics();
    tbg.fillStyle(isActive ? 0xe8f5e9 : 0xffffff, isActive ? 1 : 0.7);
    if (isActive) tbg.lineStyle(2, COLORS.green, 1);
    tbg.fillRoundedRect(x - tabW / 2 + 2, cy - btnH / 2, tabW - 4, btnH, 8);
    if (isActive) tbg.strokeRoundedRect(x - tabW / 2 + 2, cy - btnH / 2, tabW - 4, btnH, 8);

    const label = scene.add.text(x, cy, tab.label, {
      fontSize: '12px',
      fontFamily: 'Arial, sans-serif',
      color: '#333333',
      fontStyle: isActive ? 'bold' : 'normal',
    }).setOrigin(0.5);

    const hit = scene.add.rectangle(x, cy, tabW - 4, btnH, 0x000000, 0)
      .setInteractive({ useHandCursor: true })
      .on('pointerdown', () => onSelect(tab.id));

    parent.add([tbg, label, hit]);
  });

  return topY + barH;
}
