import { Component, computed, inject } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { IamStore } from '../../../../identity-and-access-management/application/iam.store';
import { TranslatePipe } from '../../../i18n/translate.pipe';

interface NavItem { label: string; to: string; icon: string; }

const ADMIN_ITEMS: NavItem[] = [
  { label: 'option.home', to: '/home', icon: 'pi pi-home' },
  { label: 'option.community', to: '/stakeholder-and-asset-management/management', icon: 'pi pi-users' },
  { label: 'option.routes', to: '/fleet-and-route-planning/management', icon: 'pi pi-map-marker' },
  { label: 'option.trips', to: '/trip-execution-and-monitoring/monitor', icon: 'pi pi-car' },
  { label: 'option.subscription-and-plan-management', to: '/subscription-and-plan-management/status', icon: 'pi pi-credit-card' },
  { label: 'option.alerts', to: '/notifications-and-communication/alerts', icon: 'pi pi-bell' },
  { label: 'option.profile', to: '/identity-and-access-management/profile', icon: 'pi pi-user' },
];

const DRIVER_ITEMS: NavItem[] = [
  { label: 'option.home', to: '/home', icon: 'pi pi-home' },
  { label: 'option.trips', to: '/trip-execution-and-monitoring/active', icon: 'pi pi-car' },
  { label: 'option.alerts', to: '/notifications-and-communication/alerts', icon: 'pi pi-bell' },
  { label: 'option.profile', to: '/identity-and-access-management/profile', icon: 'pi pi-user' },
];

const PARENT_ITEMS: NavItem[] = [
  { label: 'option.home', to: '/home', icon: 'pi pi-home' },
  { label: 'option.tracking', to: '/trip-execution-and-monitoring/tracking', icon: 'pi pi-map' },
  { label: 'option.alerts', to: '/notifications-and-communication/alerts', icon: 'pi pi-bell' },
  { label: 'option.profile', to: '/identity-and-access-management/profile', icon: 'pi pi-user' },
];

/**
 * NavBar — renders the role-based sidebar navigation items.
 * Matches NavBar in the shared component diagram.
 */
@Component({
  selector: 'kt-nav-bar',
  imports: [RouterLink, RouterLinkActive, TranslatePipe],
  template: `
    <nav class="sidebar-nav">
      @for (item of navItems(); track item.to) {
        <a class="nav-item" [routerLink]="item.to" routerLinkActive="router-link-active">
          <i [class]="item.icon"></i>
          <span>{{ item.label | t }}</span>
        </a>
      }
    </nav>
  `,
  styles: `
    .sidebar-nav {
      flex: 1;
      padding: 1rem 0;
      display: flex;
      flex-direction: column;
    }
    .nav-item {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      padding: 0.75rem 1.25rem;
      color: rgba(255,255,255,0.7);
      text-decoration: none;
      font-size: 0.9rem;
      transition: background 0.15s, color 0.15s;
      border-left: 3px solid transparent;
    }
    .nav-item:hover {
      background: rgba(255,255,255,0.08);
      color: var(--white);
    }
    .nav-item.router-link-active {
      background: rgba(224,122,43,0.15);
      color: var(--white);
      border-left-color: var(--orange);
    }
    .nav-item i { width: 1.1rem; text-align: center; font-size: 1rem; }
  `,
})
export class NavBar {
  private readonly iamStore = inject(IamStore);

  protected readonly navItems = computed<NavItem[]>(() => {
    if (!this.iamStore.isAuthenticated()) return [];
    switch (this.iamStore.currentUser()?.roleTier) {
      case 'ADMIN': return ADMIN_ITEMS;
      case 'DRIVER': return DRIVER_ITEMS;
      case 'PARENT': return PARENT_ITEMS;
      default: return [{ label: 'option.home', to: '/home', icon: 'pi pi-home' }];
    }
  });
}
