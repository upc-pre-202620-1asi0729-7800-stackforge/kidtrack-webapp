import { Injectable, computed, signal } from '@angular/core';
import en from './en.json';
import es from './es.json';

export type Locale = 'en' | 'es';
type Messages = { [key: string]: string | Messages };

const MESSAGES: Record<Locale, Messages> = { en, es };
const LOCALE_STORAGE_KEY = 'kidtrack.locale';

/**
 * Signal-based i18n service. Uses the same locale files and `{param}` interpolation
 * syntax as the vue-i18n setup of the Vue web app.
 */
@Injectable({ providedIn: 'root' })
export class TranslationService {
  readonly availableLocales: Locale[] = ['en', 'es'];
  readonly locale = signal<Locale>(this.readStoredLocale());
  private readonly messages = computed(() => MESSAGES[this.locale()]);

  use(locale: Locale): void {
    this.locale.set(locale);
    try { localStorage.setItem(LOCALE_STORAGE_KEY, locale); } catch { /* storage unavailable */ }
  }

  t(key: string, params: Record<string, string | number> = {}): string {
    const value = resolve(this.messages(), key) ?? resolve(MESSAGES.en, key) ?? key;
    return value.replace(/\{([\w-]+)\}/g, (match, name: string) =>
      params[name] !== undefined ? String(params[name]) : match,
    );
  }

  private readStoredLocale(): Locale {
    try {
      const stored = localStorage.getItem(LOCALE_STORAGE_KEY);
      return stored === 'es' || stored === 'en' ? stored : 'en';
    } catch {
      return 'en';
    }
  }
}

function resolve(messages: Messages, key: string): string | undefined {
  let node: string | Messages | undefined = messages;
  for (const part of key.split('.')) {
    if (typeof node !== 'object' || node === null) return undefined;
    node = node[part];
  }
  return typeof node === 'string' ? node : undefined;
}
