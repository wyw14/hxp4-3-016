import type { AccessibilitySettings } from './types';

const STORAGE_KEY = 'constellation_accessibility_settings';

const DEFAULT_SETTINGS: AccessibilitySettings = {
  highContrast: false,
  colorBlindFriendly: false,
  reduceRotation: false,
  reduceFlicker: false
};

export class AccessibilityManager {
  private settings: AccessibilitySettings;
  private listeners: Set<(settings: AccessibilitySettings) => void> = new Set();

  constructor() {
    this.settings = this.loadSettings();
  }

  private loadSettings(): AccessibilitySettings {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        return { ...DEFAULT_SETTINGS, ...parsed };
      }
    } catch {
      console.warn('无法加载无障碍设置，使用默认值');
    }
    return { ...DEFAULT_SETTINGS };
  }

  private saveSettings(): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.settings));
    } catch {
      console.warn('无法保存无障碍设置');
    }
  }

  getSettings(): AccessibilitySettings {
    return { ...this.settings };
  }

  set<K extends keyof AccessibilitySettings>(
    key: K, value: AccessibilitySettings[K]
  ): void {
    this.settings[key] = value;
    this.saveSettings();
    this.notifyListeners();
  }

  setAll(settings: Partial<AccessibilitySettings>): void {
    this.settings = { ...this.settings, ...settings };
    this.saveSettings();
    this.notifyListeners();
  }

  reset(): void {
    this.settings = { ...DEFAULT_SETTINGS };
    this.saveSettings();
    this.notifyListeners();
  }

  subscribe(callback: (settings: AccessibilitySettings) => void): () => void {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }

  private notifyListeners(): void {
    const settings = this.getSettings();
    this.listeners.forEach(fn => fn(settings));
  }
}

export const accessibilityManager = new AccessibilityManager();
