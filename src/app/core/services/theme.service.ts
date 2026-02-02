import { Injectable, signal, effect } from '@angular/core';

export type Theme = 'light' | 'dark';

@Injectable({ providedIn: 'root' })
export class ThemeService {
  private themeSignal = signal<Theme>(this.loadTheme());

  theme = this.themeSignal.asReadonly();

  constructor() {
    effect(() => {
      const t = this.themeSignal();
      document.body.classList.remove('light-theme', 'dark-theme');
      document.body.classList.add(`${t}-theme`);
      localStorage.setItem('theme', t);
    });
  }

  toggle(): void {
    this.themeSignal.update((t) => (t === 'light' ? 'dark' : 'light'));
  }

  isDark(): boolean {
    return this.themeSignal() === 'dark';
  }

  private loadTheme(): Theme {
    const saved = localStorage.getItem('theme') as Theme | null;
    if (saved === 'dark' || saved === 'light') return saved;
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }
}
