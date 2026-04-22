import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';

const TRANSLATABLE_FIELDS = ['jobTitle', 'description', 'technicalEnvironment', 'companyDescription'] as const;
const MAX_CHARS = 400;

@Injectable({ providedIn: 'root' })
export class MissionTranslationService {
  private memCache = new Map<string, string>();

  constructor(private http: HttpClient) {}

  getCurrentLang(): string {
    return localStorage.getItem('wl_lang') || 'en';
  }

  private cacheKey(text: string, lang: string): string {
    // Short key: lang + first 80 chars of text (enough to identify uniquely in context)
    return `mtr_${lang}_${text.substring(0, 80).replace(/\s+/g, '_')}`;
  }

  async translate(text: string, targetLang: string): Promise<string> {
    if (!text?.trim() || targetLang === 'en') return text;

    const trimmed = text.length > MAX_CHARS ? text.substring(0, MAX_CHARS) : text;
    const key = this.cacheKey(trimmed, targetLang);

    if (this.memCache.has(key)) return this.memCache.get(key)!;

    try {
      const lsVal = localStorage.getItem(key);
      if (lsVal) {
        this.memCache.set(key, lsVal);
        return lsVal;
      }
    } catch { /* ignore */ }

    try {
      const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(trimmed)}&langpair=en|${targetLang}`;
      const res: any = await firstValueFrom(this.http.get(url));
      const translated: string = res?.responseData?.translatedText || text;
      this.memCache.set(key, translated);
      try { localStorage.setItem(key, translated); } catch { /* ignore quota */ }
      return translated;
    } catch {
      return text;
    }
  }

  async translateMissionFields(mission: any, lang: string): Promise<any> {
    if (lang !== 'fr') return mission;

    const translated = { ...mission };
    // Sequential to respect MyMemory free-tier rate limits
    for (const field of TRANSLATABLE_FIELDS) {
      if (translated[field]) {
        translated[field] = await this.translate(translated[field], 'fr');
      }
    }
    return translated;
  }
}
