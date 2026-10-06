import { Component } from '@angular/core';
import { TranslatePipe } from '../../../i18n/translate.pipe';

@Component({
  selector: 'kt-about',
  imports: [TranslatePipe],
  template: `
    <div class="align-content-start justify-content-start m-4">
      <h1>{{ 'about.title' | t }}</h1>
      <p>{{ 'about.content' | t }}</p>
    </div>
  `,
})
export class About {}
