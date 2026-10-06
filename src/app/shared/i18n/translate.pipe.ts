import { Pipe, PipeTransform, inject } from '@angular/core';
import { TranslationService } from './translation.service';

/** Template helper: `{{ 'home.greeting' | t: { name: 'Ana' } }}`. Re-evaluates when the locale changes. */
@Pipe({ name: 't', pure: false })
export class TranslatePipe implements PipeTransform {
  private readonly i18n = inject(TranslationService);

  transform(key: string, params: Record<string, string | number> = {}): string {
    return this.i18n.t(key, params);
  }
}
