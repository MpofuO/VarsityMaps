import { Injectable, signal } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class ThemeService {
  readonly currentTheme = signal<'light' | 'dark' | 'system'>('system');
  private readonly storageKey = 'varsitymaps-theme';

  initialize(): void {
    const stored = window.localStorage.getItem(this.storageKey) as 'light' | 'dark' | 'system' | null;
    this.currentTheme.set(stored ?? 'system');
    this.applyTheme(this.currentTheme());
  }

  toggleTheme(): void {
    const nextTheme = this.isDarkMode() ? 'light' : 'dark';
    this.setTheme(nextTheme);
  }

  isDarkMode(): boolean {
    return this.resolveTheme(this.currentTheme()) === 'dark';
  }

  setTheme(theme: 'light' | 'dark' | 'system'): void {
    this.currentTheme.set(theme);
    window.localStorage.setItem(this.storageKey, theme);
    this.applyTheme(theme);
  }

  private applyTheme(theme: 'light' | 'dark' | 'system'): void {
    document.documentElement.setAttribute('data-theme', this.resolveTheme(theme));
  }

  private resolveTheme(theme: 'light' | 'dark' | 'system'): 'light' | 'dark' {
    return theme === 'system'
      ? window.matchMedia('(prefers-color-scheme: dark)').matches
        ? 'dark'
        : 'light'
      : theme;
  }
}
