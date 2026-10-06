import { Injectable, inject } from '@angular/core';
import { Title } from '@angular/platform-browser';
import { RouterStateSnapshot, TitleStrategy } from '@angular/router';

/** Sets the document title as "KidTrack | <route title>". */
@Injectable({ providedIn: 'root' })
export class KidTrackTitleStrategy extends TitleStrategy {
  private readonly title = inject(Title);

  override updateTitle(snapshot: RouterStateSnapshot): void {
    this.title.setTitle(`KidTrack | ${this.buildTitle(snapshot) ?? 'Default'}`);
  }
}
