// Theme System - Neon color palettes for table customization
import {
  Color,
  MeshStandardMaterial,
  MeshBasicMaterial,
  LineBasicMaterial,
} from '@iwsdk/core';

export interface ThemeColors {
  name: string;
  id: string;
  // Table
  feltColor: number;
  feltEmissive: number;
  feltEmissiveIntensity: number;
  railColor: number;
  railEmissive: number;
  pocketGlow: number;
  pocketOuterGlow: number;
  wireframeColor: number;
  diamondColor: number;
  edgeGlowColor: number;
  // Environment
  primaryLight: number;
  secondaryLight: number;
  tertiaryLight: number;
  fogColor: number;
  gridColor: number;
  signPrimary: number;
  signSecondary: number;
  // Balls
  ballGlowTint: number;
  // Particles
  particleColors: number[];
}

export const THEMES: ThemeColors[] = [
  {
    name: 'NEON CYAN',
    id: 'cyan',
    feltColor: 0x004d33,
    feltEmissive: 0x002a1a,
    feltEmissiveIntensity: 0.4,
    railColor: 0x0a1a2a,
    railEmissive: 0x003355,
    pocketGlow: 0xff6600,
    pocketOuterGlow: 0xff3300,
    wireframeColor: 0x00ffcc,
    diamondColor: 0x00ffcc,
    edgeGlowColor: 0x00ddff,
    primaryLight: 0x00ddff,
    secondaryLight: 0x00ff88,
    tertiaryLight: 0x8800ff,
    fogColor: 0x000510,
    gridColor: 0x003344,
    signPrimary: 0x00ffdd,
    signSecondary: 0xff6600,
    ballGlowTint: 0x00ffcc,
    particleColors: [0x00ffcc, 0xff00aa, 0x00aaff, 0xffaa00, 0xaa00ff],
  },
  {
    name: 'NEON PINK',
    id: 'pink',
    feltColor: 0x2a0028,
    feltEmissive: 0x1a0018,
    feltEmissiveIntensity: 0.5,
    railColor: 0x1a0a1a,
    railEmissive: 0x550033,
    pocketGlow: 0xff00aa,
    pocketOuterGlow: 0xff0066,
    wireframeColor: 0xff44cc,
    diamondColor: 0xff44cc,
    edgeGlowColor: 0xff66dd,
    primaryLight: 0xff44cc,
    secondaryLight: 0xff8800,
    tertiaryLight: 0x4400ff,
    fogColor: 0x0a0005,
    gridColor: 0x330022,
    signPrimary: 0xff44cc,
    signSecondary: 0x00ffaa,
    ballGlowTint: 0xff44cc,
    particleColors: [0xff44cc, 0xff8800, 0xcc00ff, 0xff0066, 0xffaa44],
  },
  {
    name: 'GOLDEN CLASSIC',
    id: 'gold',
    feltColor: 0x1a3300,
    feltEmissive: 0x0d1a00,
    feltEmissiveIntensity: 0.3,
    railColor: 0x1a1500,
    railEmissive: 0x332800,
    pocketGlow: 0xffcc00,
    pocketOuterGlow: 0xcc8800,
    wireframeColor: 0xffdd44,
    diamondColor: 0xffdd44,
    edgeGlowColor: 0xffcc66,
    primaryLight: 0xffdd88,
    secondaryLight: 0xffaa44,
    tertiaryLight: 0x886622,
    fogColor: 0x050300,
    gridColor: 0x332200,
    signPrimary: 0xffdd44,
    signSecondary: 0xff8844,
    ballGlowTint: 0xffdd44,
    particleColors: [0xffdd44, 0xffaa00, 0xff8844, 0xccaa44, 0xffcc88],
  },
  {
    name: 'PURPLE HAZE',
    id: 'purple',
    feltColor: 0x0d0033,
    feltEmissive: 0x08001a,
    feltEmissiveIntensity: 0.5,
    railColor: 0x0a0a1a,
    railEmissive: 0x220055,
    pocketGlow: 0xaa44ff,
    pocketOuterGlow: 0x7700cc,
    wireframeColor: 0xbb66ff,
    diamondColor: 0xbb66ff,
    edgeGlowColor: 0xaa88ff,
    primaryLight: 0xaa66ff,
    secondaryLight: 0x00ccff,
    tertiaryLight: 0xff44aa,
    fogColor: 0x020008,
    gridColor: 0x110033,
    signPrimary: 0xbb66ff,
    signSecondary: 0x44ffdd,
    ballGlowTint: 0xbb66ff,
    particleColors: [0xbb66ff, 0x44ffdd, 0xff44aa, 0x6644ff, 0xaa88ff],
  },
];

export class ThemeManager {
  private currentIndex: number = 0;
  private onThemeChange: ((theme: ThemeColors) => void)[] = [];

  get current(): ThemeColors {
    return THEMES[this.currentIndex];
  }

  get themeCount(): number {
    return THEMES.length;
  }

  setTheme(indexOrId: number | string): void {
    if (typeof indexOrId === 'string') {
      const idx = THEMES.findIndex(t => t.id === indexOrId);
      if (idx >= 0) this.currentIndex = idx;
    } else {
      this.currentIndex = Math.max(0, Math.min(THEMES.length - 1, indexOrId));
    }
    this.notifyListeners();
    this.saveTheme();
  }

  cycleTheme(): void {
    this.currentIndex = (this.currentIndex + 1) % THEMES.length;
    this.notifyListeners();
    this.saveTheme();
  }

  onChange(cb: (theme: ThemeColors) => void): void {
    this.onThemeChange.push(cb);
  }

  private notifyListeners(): void {
    for (const cb of this.onThemeChange) {
      cb(this.current);
    }
  }

  private saveTheme(): void {
    try {
      localStorage.setItem('phantom-pool-theme', this.current.id);
    } catch (e) { /* ignore */ }
  }

  loadTheme(): void {
    try {
      const saved = localStorage.getItem('phantom-pool-theme');
      if (saved) {
        const idx = THEMES.findIndex(t => t.id === saved);
        if (idx >= 0) this.currentIndex = idx;
      }
    } catch (e) { /* ignore */ }
  }
}
