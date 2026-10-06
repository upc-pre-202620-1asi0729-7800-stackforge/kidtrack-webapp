import { Routes } from '@angular/router';
import { authGuard } from '../../identity-and-access-management/application/auth.guards';

/** Routes for the Subscription bounded context (mounted under /subscription-and-plan-management). */
export const subscriptionRoutes: Routes = [
  { path: 'plans', title: 'Plans', canActivate: [authGuard],
    loadComponent: () => import('./views/plan-selection/plan-selection').then(m => m.PlanSelection) },
  { path: 'status', title: 'Subscription', canActivate: [authGuard],
    loadComponent: () => import('./views/subscription-status/subscription-status').then(m => m.SubscriptionStatus) },
  { path: 'checkout', title: 'Checkout', data: { hideNav: true },
    loadComponent: () => import('./views/checkout/checkout').then(m => m.Checkout) },
];
