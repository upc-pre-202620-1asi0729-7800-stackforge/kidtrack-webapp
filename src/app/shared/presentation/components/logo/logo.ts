import { Component, input } from '@angular/core';

/**
 * KidTrack brand mark (report ch. 4 "Branding"): compass/helm icon with a school vehicle
 * and the "Kid" (orange) + "Track" (navy, or white on dark backgrounds) wordmark.
 */
@Component({
  selector: 'kt-logo',
  template: `
    <span class="logo" [class.on-dark]="onDark()" [style.--logo-size.px]="size()">
      <svg class="mark" viewBox="0 0 64 64" aria-hidden="true">
        <!-- compass rose -->
        <path class="ring" d="M32 2 L37 15 L50.5 9.5 L45 23 L62 32 L45 41 L50.5 54.5 L37 49 L32 62 L27 49 L13.5 54.5 L19 41 L2 32 L19 23 L13.5 9.5 L27 15 Z"/>
        <circle class="disc" cx="32" cy="32" r="17"/>
        <circle class="inner" cx="32" cy="32" r="13.5"/>
        <!-- crosshair ticks -->
        <path class="tick" d="M32 15v4M32 45v4M15 32h4M45 32h4"/>
        <!-- needle -->
        <path class="needle" d="M33 20 L42 17 L39 26 Z"/>
        <!-- vehicle -->
        <path class="car" d="M23.5 36v-3.2l2.4-4.3c.4-.7 1-1 1.8-1h8.6c.8 0 1.4.3 1.8 1l2.4 4.3V36z"/>
        <circle class="wheel" cx="27.5" cy="36.5" r="2"/>
        <circle class="wheel" cx="36.5" cy="36.5" r="2"/>
      </svg>
      @if (wordmark()) {
        <span class="wordmark"><span class="kid">Kid</span><span class="track">Track</span></span>
      }
    </span>
  `,
  styles: `
    :host { display: inline-flex; }
    .logo { display: inline-flex; align-items: center; gap: calc(var(--logo-size) * 0.28); }
    .mark { width: var(--logo-size); height: var(--logo-size); flex-shrink: 0; }
    .ring   { fill: #1E3A63; }
    .disc   { fill: #fff; stroke: #1E3A63; stroke-width: 2.5; }
    .inner  { fill: none; stroke: #1E3A63; stroke-width: 1.5; }
    .tick   { stroke: #1E3A63; stroke-width: 2; stroke-linecap: round; }
    .needle { fill: #DE4A26; }
    .car    { fill: #E07A2B; }
    .wheel  { fill: #1E3A63; stroke: #fff; stroke-width: 1; }
    .on-dark .ring  { fill: #E07A2B; }
    .on-dark .disc  { stroke: #E07A2B; }
    .wordmark {
      font-family: var(--heading); font-weight: 800; letter-spacing: -0.02em;
      font-size: calc(var(--logo-size) * 0.72); line-height: 1;
    }
    .kid   { color: #E07A2B; }
    .track { color: #1E3A63; }
    .on-dark .track { color: #fff; }
  `,
})
export class Logo {
  readonly size = input(32);
  readonly wordmark = input(true);
  /** Use on navy/dark backgrounds: "Track" becomes white and the rose orange. */
  readonly onDark = input(false);
}
