// src/ui/AutoButton.ts
// Shared auto-button rendering for farm, animal, and atelier panels.
// Matches the original game's 3-state look: hidden / green (ready) / red (active timer).
import Phaser from 'phaser';
import { gameState } from '../systems/GameState';
import { getAutoReactivationCost, getAutoDuration } from '../data/upgrades';
import { fmtN } from '../utils/helpers';

export interface AutoButtonConfig {
  upgId: string;          // 'autoharvest' | 'autowater' | 'autoatelier' | 'autofeed'
  icon: string;           // emoji prefix
  labelReady: string;     // e.g. 'Recolte', 'Arrosage', 'Atelier', 'Alimentation'
  endKey: 'autoHarvestEnd' | 'autoWaterEnd' | 'autoAtelierEnd' | 'autoFeedEnd';
  resetKey: 'ahResets' | 'awResets' | 'aaResets' | 'afResets';
}

const GREEN = 0x27ae60;
const RED   = 0xe74c3c;

/**
 * Creates an auto-button at (cx, cy) inside the given container.
 * Returns a group containing bg + text + hitArea that auto-updates via `updateAutoButton`.
 */
export function createAutoButton(
  scene: Phaser.Scene,
  parent: Phaser.GameObjects.Container,
  cx: number, cy: number,
  btnW: number, btnH: number,
  config: AutoButtonConfig,
  onRefresh: () => void,
): Phaser.GameObjects.Container {
  const bg = scene.add.graphics();
  const label = scene.add.text(0, 0, '', {
    fontSize: '11px', fontFamily: 'Arial, sans-serif', color: '#ffffff', fontStyle: 'bold',
  }).setOrigin(0.5);

  const hit = scene.add.rectangle(0, 0, btnW, btnH, 0x000000, 0)
    .setInteractive({ useHandCursor: true })
    .on('pointerdown', () => {
      scene.tweens.add({ targets: group, scaleX: 0.93, scaleY: 0.93, duration: 60, yoyo: true, ease: 'Power1' });
      handleAutoClick(config, onRefresh);
    });

  const group = scene.add.container(cx, cy, [bg, label, hit]);
  group.setData('config', config);
  group.setData('btnW', btnW);
  group.setData('btnH', btnH);
  parent.add(group);
  return group;
}

/** Update the visual state of an auto-button (call on every frame or tick) */
export function updateAutoButton(group: Phaser.GameObjects.Container): void {
  const config = group.getData('config') as AutoButtonConfig;
  const btnW = group.getData('btnW') as number;
  const btnH = group.getData('btnH') as number;
  if (!config) return;

  const bg = group.getAt(0) as Phaser.GameObjects.Graphics;
  const label = group.getAt(1) as Phaser.GameObjects.Text;
  const lv = gameState.getUpgrade(config.upgId);

  bg.clear();

  if (lv <= 0) {
    // Hidden
    group.setVisible(false);
    return;
  }
  group.setVisible(true);

  const now = Date.now();
  const endTime = gameState.data[config.endKey];
  const halfW = btnW / 2;
  const halfH = btnH / 2;

  if (endTime > now) {
    // Active - red with pulse effect
    const pulse = 0.7 + 0.3 * Math.sin(now / 300);
    bg.fillStyle(RED, pulse);
    bg.fillRoundedRect(-halfW, -halfH, btnW, btnH, 7);
    const rem = Math.ceil((endTime - now) / 1000);
    const m = Math.floor(rem / 60);
    const s = rem % 60;
    label.setText(`${config.icon} ${m}:${s < 10 ? '0' : ''}${s}`);
  } else if (endTime > 0) {
    // Expired - green with reactivation cost
    bg.fillStyle(GREEN, 1);
    bg.fillRoundedRect(-halfW, -halfH, btnW, btnH, 7);
    const cost = getAutoReactivationCost(config.upgId, lv);
    label.setText(`${config.icon} Reactiver ${fmtN(cost)}\u{1F4B0}`);
  } else {
    // Never activated - green with duration
    bg.fillStyle(GREEN, 1);
    bg.fillRoundedRect(-halfW, -halfH, btnW, btnH, 7);
    const durMs = getAutoDuration(config.upgId, lv);
    const durMin = Math.ceil(durMs / 60000);
    label.setText(`${config.icon} ${config.labelReady} (${durMin}min)`);
  }
}

function handleAutoClick(config: AutoButtonConfig, onRefresh: () => void): void {
  const lv = gameState.getUpgrade(config.upgId);
  if (lv <= 0) return;

  const now = Date.now();
  const endTime = gameState.data[config.endKey];

  if (endTime > now) {
    // Already active, do nothing
    return;
  }

  if (endTime > 0) {
    // Reactivation (costs coins)
    const cost = getAutoReactivationCost(config.upgId, lv);
    if (gameState.data.coins < cost) return;
    gameState.data.coins -= cost;
    gameState.data[config.resetKey]++;
  }

  // Activate
  const dur = getAutoDuration(config.upgId, lv);
  gameState.data[config.endKey] = now + dur;
  gameState.emit();
  onRefresh();
}
