import { Component } from '@angular/core';
import { TranslatePipe } from '../../../i18n/translate.pipe';

/** Static footer (shared component diagram). */
@Component({
  selector: 'kt-footer-content',
  imports: [TranslatePipe],
  template: `
    <div class="grid footer mt-4 p-2 align-content-start">
      <div class="col-12 ml-3 align-items-center justify-content-center">
        <p>Copyright &copy; 2026. StackForge</p>
      </div>
      <div class="col-12 ml-3 mt-1 align-items-center justify-content-center">
        <p>
          {{ 'authoring-phrase.intro' | t }} <i class="pi pi-heart"></i>
          {{ 'authoring-phrase.use' | t }} <a href="https://material.angular.dev/" target="_blank">Angular Material</a>
          {{ 'authoring-phrase.author' | t: { brand: 'StackForge' } }}
        </p>
      </div>
    </div>
  `,
  styles: `.footer { background: var(--orange); color: var(--dark); }`,
})
export class FooterContent {}
