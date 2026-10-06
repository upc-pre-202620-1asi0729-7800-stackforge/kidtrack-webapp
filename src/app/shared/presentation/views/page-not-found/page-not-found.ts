import { Component, inject } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { TranslatePipe } from '../../../i18n/translate.pipe';

@Component({
  selector: 'kt-page-not-found',
  imports: [RouterLink, TranslatePipe],
  template: `
    <div class="align-content-start justify-content-start m-4">
      <h1>{{ 'page-not-found.title' | t }}</h1>
      <p>{{ 'page-not-found.content' | t: { 'unavailable-route': unavailableRoute } }}</p>
      <a routerLink="/home">{{ 'page-not-found.go-home' | t }}</a>
    </div>
  `,
})
export class PageNotFound {
  protected readonly unavailableRoute = inject(Router).url;
}
