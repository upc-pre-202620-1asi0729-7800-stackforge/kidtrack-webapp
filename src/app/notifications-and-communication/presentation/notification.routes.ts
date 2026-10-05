import { Routes } from '@angular/router';

/** Routes for the Notifications bounded context (mounted under /notifications-and-communication). */
export const notificationRoutes: Routes = [
  { path: 'alerts', title: 'Alerts',
    loadComponent: () => import('./views/alert-center/alert-center').then(m => m.AlertCenter) },
];
