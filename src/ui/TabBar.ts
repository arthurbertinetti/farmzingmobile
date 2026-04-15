// src/ui/TabBar.ts
import Phaser from 'phaser';
import { COLORS, UI } from '../utils/constants';

export interface TabDef {
  id: string;
  icon: string;
  label: string;
}

export const TABS: TabDef[] = [
  { id: 'event',   icon: '\u{1F389}', label: 'Event' },
  { id: 'quest',   icon: '\u{1F3AF}', label: 'Quetes' },
  { id: 'farm',    icon: '\u{1F33E}', label: 'Ferme' },
  { id: 'atelier', icon: '\u{1F3D7}', label: 'Ateliers' },
  { id: 'stock',   icon: '\u{1F4E6}', label: 'Stock' },
  { id: 'shop',    icon: '\u{1F3EA}', label: 'Boutique' },
  { id: 'well',    icon: '\u{1F4A7}', label: 'Puits' },
  { id: 'garden',  icon: '\u{1F337}', label: 'Jardin' },
  { id: 'minigame',icon: '\u{1F3AE}', label: 'Jeu' },
];

export class TabBar {
  private scene: Phaser.Scene;
  private container!: Phaser.GameObjects.Container;
  private tabButtons: Phaser.GameObjects.Container[] = [];
  private activeTab = 'farm';
  private onTabChange: (tabId: string) => void;

  constructor(scene: Phaser.Scene, onTabChange: (tabId: string) => void) {
    this.scene = scene;
    this.onTabChange = onTabChange;
    this.create();
  }

  private create(): void {
    const { width, height } = this.scene.scale;
    const y = height - UI.TAB_HEIGHT;

    const bg = this.scene.add.graphics();
    bg.fillGradientStyle(COLORS.brownDark, COLORS.brownDark, COLORS.brown, COLORS.brown, 1);
    bg.fillRect(0, y, width, UI.TAB_HEIGHT);

    this.container = this.scene.add.container(0, 0, [bg]);
    this.container.setDepth(100);

    const tabWidth = width / TABS.length;

    TABS.forEach((tab, i) => {
      const tx = tabWidth * i + tabWidth / 2;
      const ty = y + UI.TAB_HEIGHT / 2;

      const iconText = this.scene.add.text(tx, ty - 9, tab.icon, {
        fontSize: '20px',
      }).setOrigin(0.5);

      const labelText = this.scene.add.text(tx, ty + 13, tab.label, {
        fontSize: '9px',
        fontFamily: 'Arial, sans-serif',
        color: tab.id === this.activeTab ? '#ffd93d' : 'rgba(255,255,255,0.6)',
        fontStyle: 'bold',
      }).setOrigin(0.5);

      const hitArea = this.scene.add.rectangle(tx, ty, tabWidth - 2, UI.TAB_HEIGHT - 2, 0x000000, 0)
        .setInteractive({ useHandCursor: true })
        .on('pointerdown', () => {
          this.scene.tweens.add({ targets: btnContainer, scaleX: 0.9, scaleY: 0.9, duration: 60, yoyo: true, ease: 'Power1' });
          this.setActive(tab.id);
          this.onTabChange(tab.id);
        });

      const btnContainer = this.scene.add.container(0, 0, [iconText, labelText, hitArea]);
      this.tabButtons.push(btnContainer);
      this.container.add(btnContainer);
    });
  }

  setActive(tabId: string): void {
    this.activeTab = tabId;
    this.tabButtons.forEach((btn, i) => {
      const label = btn.getAt(1) as Phaser.GameObjects.Text;
      const isActive = TABS[i].id === tabId;
      label.setColor(isActive ? '#ffd93d' : 'rgba(255,255,255,0.6)');
    });
  }

  getActiveTab(): string {
    return this.activeTab;
  }

  destroy(): void {
    this.container.destroy();
  }
}
