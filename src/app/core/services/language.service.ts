import { Injectable, signal } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';

export type AppLanguage = 'en' | 'fr';

@Injectable({ providedIn: 'root' })
export class LanguageService {
  private readonly STORAGE_KEY = 'wl_lang';

  currentLang = signal<AppLanguage>(this.getSavedLang());

  constructor(private translate: TranslateService) {
    this.translate.addLangs(['en', 'fr']);
    this.translate.setDefaultLang('en');
    this.applyLanguage(this.currentLang());
  }

  setLanguage(lang: AppLanguage): void {
    this.currentLang.set(lang);
    localStorage.setItem(this.STORAGE_KEY, lang);
    this.applyLanguage(lang);
  }

  private applyLanguage(lang: AppLanguage): void {
    this.translate.use(lang);
    document.documentElement.setAttribute('lang', lang);
  }

  private getSavedLang(): AppLanguage {
    const saved = localStorage.getItem(this.STORAGE_KEY) as AppLanguage | null;
    return saved === 'fr' ? 'fr' : 'en';
  }
}
