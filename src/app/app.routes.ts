import { Routes } from '@angular/router';
import { fleetRoutes } from './fleet-and-route-planning/presentation/fleet.routes';
import { authGuard } from './identity-and-access-management/application/auth.guards';
import { iamRoutes } from './identity-and-access-management/presentation/iam.routes';
import { notificationRoutes } from './notifications-and-communication/presentation/notification.routes';
import { stakeholderRoutes } from './stakeholder-and-asset-management/presentation/stakeholder.routes';
import { subscriptionRoutes } from './subscription-and-plan-management/presentation/subscription.routes';
import { tripRoutes } from './trip-execution-and-monitoring/presentation/trip.routes';

/** One child route tree per bounded context, mounted under its context name (same URLs as the Vue app). */
export const routes: Routes = [
  { path: 'home', title: 'Home', canActivate: [authGuard],
    loadComponent: () => import('./shared/presentation/views/home/home').then(m => m.Home) },
  { path: 'about', title: 'About',
    loadComponent: () => import('./shared/presentation/views/about/about').then(m => m.About) },
  { path: 'identity-and-access-management', children: iamRoutes },
  { path: 'stakeholder-and-asset-management', canActivate: [authGuard], children: stakeholderRoutes },
  { path: 'fleet-and-route-planning', canActivate: [authGuard], children: fleetRoutes },
  { path: 'trip-execution-and-monitoring', canActivate: [authGuard], children: tripRoutes },
  { path: 'subscription-and-plan-management', children: subscriptionRoutes },
  { path: 'notifications-and-communication', canActivate: [authGuard], children: notificationRoutes },
  { path: '', pathMatch: 'full', redirectTo: 'home' },
  { path: '**', title: 'Page Not Found',
    loadComponent: () => import('./shared/presentation/views/page-not-found/page-not-found').then(m => m.PageNotFound) },
];
