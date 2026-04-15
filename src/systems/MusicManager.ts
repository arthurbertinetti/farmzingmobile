// src/systems/MusicManager.ts
// HTML5 Audio based music system — per-tab tracks, volume control, mute toggle.
// Uses native Audio() to avoid Phaser audio context issues on mobile.

export type MusicTab = 'global' | 'farm' | 'atelier' | 'shop' | 'garden';

const TAB_MAP: Record<string, MusicTab> = {
  farm: 'farm',
  atelier: 'atelier',
  shop: 'shop',
  garden: 'garden',
};

class MusicManagerClass {
  private audio: HTMLAudioElement;
  private tracks: Record<MusicTab, string> = {
    global: '',
    farm: '',
    atelier: '',
    shop: '',
    garden: '',
  };
  private currentTab: MusicTab = 'global';
  private _enabled = true;
  private _volume = 0.5;

  constructor() {
    this.audio = new Audio();
    this.audio.loop = true;
    this.audio.volume = this._volume;

    // Load saved settings
    try {
      const saved = localStorage.getItem('farmzing_music');
      if (saved) {
        const s = JSON.parse(saved);
        if (typeof s.enabled === 'boolean') this._enabled = s.enabled;
        if (typeof s.volume === 'number') this._volume = s.volume;
        if (s.tracks) {
          for (const k of Object.keys(this.tracks) as MusicTab[]) {
            if (typeof s.tracks[k] === 'string') this.tracks[k] = s.tracks[k];
          }
        }
      }
    } catch { /* ignore */ }
    this.audio.volume = this._volume;
  }

  private saveSettings(): void {
    try {
      localStorage.setItem('farmzing_music', JSON.stringify({
        enabled: this._enabled,
        volume: this._volume,
        tracks: this.tracks,
      }));
    } catch { /* ignore */ }
  }

  get enabled(): boolean { return this._enabled; }
  get volume(): number { return this._volume; }

  setVolume(v: number): void {
    this._volume = Math.max(0, Math.min(1, v));
    this.audio.volume = this._volume;
    this.saveSettings();
  }

  toggleMute(): boolean {
    this._enabled = !this._enabled;
    if (!this._enabled) {
      this.audio.pause();
    } else {
      this.playCurrentTrack();
    }
    this.saveSettings();
    return this._enabled;
  }

  /** Set custom track URL for a tab */
  setTrack(tab: MusicTab, url: string): void {
    this.tracks[tab] = url;
    this.saveSettings();
    if (tab === this.currentTab) this.playCurrentTrack();
  }

  /** Called when switching game tabs */
  onTabChange(panelId: string): void {
    const newTab = TAB_MAP[panelId] || 'global';
    if (newTab === this.currentTab) return;
    this.currentTab = newTab;
    this.playCurrentTrack();
  }

  private playCurrentTrack(): void {
    if (!this._enabled) return;
    const url = this.tracks[this.currentTab] || this.tracks.global;
    if (!url) {
      this.audio.pause();
      return;
    }
    if (this.audio.src !== url) {
      this.audio.src = url;
    }
    this.audio.play().catch(() => { /* autoplay blocked, user interaction needed */ });
  }

  /** Upload a file and set it as track for the given tab */
  uploadTrack(tab: MusicTab, file: File): void {
    const url = URL.createObjectURL(file);
    this.setTrack(tab, url);
  }
}

export const musicManager = new MusicManagerClass();
