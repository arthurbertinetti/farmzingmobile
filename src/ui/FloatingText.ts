// src/ui/FloatingText.ts
import Phaser from 'phaser';

export function showFloatingText(
  scene: Phaser.Scene,
  x: number,
  y: number,
  text: string,
  color = '#ffd93d',
  fontSize = '16px',
): void {
  const txt = scene.add.text(x, y, text, {
    fontSize,
    fontFamily: 'Arial, sans-serif',
    color,
    fontStyle: 'bold',
    stroke: '#000000',
    strokeThickness: 2,
  }).setOrigin(0.5).setDepth(1000);

  scene.tweens.add({
    targets: txt,
    y: y - 60,
    alpha: 0,
    duration: 1200,
    ease: 'Power2',
    onComplete: () => txt.destroy(),
  });
}

/**
 * Big level-up celebration banner — centered on screen, scales in then fades out.
 */
export function showLevelUpBanner(
  scene: Phaser.Scene,
  level: number,
  waterBonus: number,
  coinBonus: number,
): void {
  const { width, height } = scene.scale;
  const cx = width / 2;
  const cy = height / 2 - 40;

  // Dark overlay (brief)
  const overlay = scene.add.graphics();
  overlay.fillStyle(0x000000, 0.4);
  overlay.fillRect(0, 0, width, height);
  overlay.setDepth(999);
  scene.tweens.add({ targets: overlay, alpha: 0, delay: 1800, duration: 600, onComplete: () => overlay.destroy() });

  // Main banner text
  const mainTxt = scene.add.text(cx, cy, `\u{1F389} Niveau ${level} !`, {
    fontSize: '28px', fontFamily: 'Arial, sans-serif', color: '#ffd93d',
    fontStyle: 'bold', stroke: '#000000', strokeThickness: 4,
    shadow: { offsetX: 2, offsetY: 2, color: '#000', blur: 6, fill: true },
  }).setOrigin(0.5).setDepth(1001).setScale(0.3).setAlpha(0);

  scene.tweens.add({
    targets: mainTxt,
    scaleX: 1, scaleY: 1, alpha: 1,
    duration: 400, ease: 'Back.easeOut',
    onComplete: () => {
      scene.tweens.add({
        targets: mainTxt,
        alpha: 0, y: cy - 40,
        delay: 1400, duration: 600,
        onComplete: () => mainTxt.destroy(),
      });
    },
  });

  // Bonus text
  const bonusTxt = scene.add.text(cx, cy + 40, `+${waterBonus}\u{1F4A7}  +${coinBonus}\u{1F4B0}`, {
    fontSize: '16px', fontFamily: 'Arial, sans-serif', color: '#ffffff',
    fontStyle: 'bold', stroke: '#000000', strokeThickness: 2,
  }).setOrigin(0.5).setDepth(1001).setAlpha(0);

  scene.tweens.add({
    targets: bonusTxt,
    alpha: 1, delay: 300, duration: 300,
    onComplete: () => {
      scene.tweens.add({
        targets: bonusTxt,
        alpha: 0, y: cy + 20,
        delay: 1200, duration: 600,
        onComplete: () => bonusTxt.destroy(),
      });
    },
  });

  // Emoji burst — scatter emojis from center
  const emojis = ['\u{1F389}', '\u2B50', '\u{1F4B0}', '\u{1F4A7}', '\u{1F31F}', '\u{1F38A}'];
  for (let i = 0; i < 10; i++) {
    const e = emojis[i % emojis.length];
    const angle = (Math.PI * 2 / 10) * i;
    const dist = 80 + Math.random() * 60;
    const tx = cx + Math.cos(angle) * dist;
    const ty = cy + Math.sin(angle) * dist;
    const em = scene.add.text(cx, cy, e, { fontSize: '20px' }).setOrigin(0.5).setDepth(1001).setAlpha(0);
    scene.tweens.add({
      targets: em,
      x: tx, y: ty, alpha: 1,
      delay: 200 + i * 40, duration: 400, ease: 'Power2',
      onComplete: () => {
        scene.tweens.add({
          targets: em,
          alpha: 0, y: ty - 30,
          delay: 800, duration: 500,
          onComplete: () => em.destroy(),
        });
      },
    });
  }
}
