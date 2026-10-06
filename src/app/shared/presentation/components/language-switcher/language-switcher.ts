import { Component, inject } from '@angular/core';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { Locale, TranslationService } from '../../../i18n/translation.service';

@Component({
  selector: 'kt-language-switcher',
  imports: [MatButtonToggleModule],
  template: `
    <mat-button-toggle-group class="lang-switch" [value]="i18n.locale()" (change)="use($event.value)" hideSingleSelectionIndicator>
      @for (locale of i18n.availableLocales; track locale) {
        <mat-button-toggle [value]="locale">{{ locale.toUpperCase() }}</mat-button-toggle>
      }
    </mat-button-toggle-group>
  `,
  styles: `
    .lang-switch {
      --mat-button-toggle-height: 32px;
      --mat-button-toggle-background-color: #fff;
      --mat-button-toggle-text-color: #374151;
      font-size: 0.8rem; font-weight: 600;
    }
  `,
})
export class LanguageSwitcher {
  protected readonly i18n = inject(TranslationService);

  protected use(locale: Locale): void {
    this.i18n.use(locale);
  }
}
