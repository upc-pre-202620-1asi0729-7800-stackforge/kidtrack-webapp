import { Component, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRouteSnapshot, ResolveEnd, Router, RouterOutlet } from '@angular/router';
import { filter, map } from 'rxjs';
import { IamStore } from '../../../../identity-and-access-management/application/iam.store';
import { TranslatePipe } from '../../../i18n/translate.pipe';
import { TranslationService } from '../../../i18n/translation.service';
import { LanguageSwitcher } from '../language-switcher/language-switcher';
import { NavBar } from '../nav-bar/nav-bar';
import { ToastContainer } from '../toast-container/toast-container';

/**
 * Application shell: fixed navy sidebar (desktop) / burger drawer (mobile) + routed content.
 * Routes flagged with `data.hideNav` (sign-in, sign-up, checkout) render full-screen.
 * Matches Layout in the shared component diagram.
 */
import { Logo } from '../logo/logo';

@Component({
  selector: 'kt-layout',
  imports: [Logo, RouterOutlet, NavBar, LanguageSwitcher, ToastContainer, TranslatePipe],
  templateUrl: './layout.html',
  styleUrl: './layout.css',
})
export class Layout {
  private readonly router = inject(Router);
  private readonly i18n = inject(TranslationService);
  protected readonly iamStore = inject(IamStore);

  protected readonly menuOpen = signal(false);

  /** Resolved before activation so the routed view is only created once, in the right shell. */
  protected readonly hideNav = toSignal(
    this.router.events.pipe(
      filter((event): event is ResolveEnd => event instanceof ResolveEnd),
      map(event => {
        this.menuOpen.set(false);
        return deepestSnapshot(event.state.root).data['hideNav'] === true;
      }),
    ),
    { initialValue: true },
  );

  protected readonly roleLabel = computed(() => {
    this.i18n.locale();
    switch (this.iamStore.currentUser()?.roleTier) {
      case 'ADMIN': return this.i18n.t('home.role.admin');
      case 'DRIVER': return this.i18n.t('home.role.driver');
      case 'PARENT': return this.i18n.t('home.role.parent');
      default: return '';
    }
  });

  protected onSignOut(): void {
    this.iamStore.signOut();
    void this.router.navigate(['/identity-and-access-management/sign-in']);
  }
}

function deepestSnapshot(snapshot: ActivatedRouteSnapshot): ActivatedRouteSnapshot {
  return snapshot.firstChild ? deepestSnapshot(snapshot.firstChild) : snapshot;
}
