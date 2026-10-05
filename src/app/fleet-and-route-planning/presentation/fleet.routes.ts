import { Routes } from '@angular/router';

/** Routes for the Fleet & Route Planning bounded context (mounted under /fleet-and-route-planning). */
export const fleetRoutes: Routes = [
  { path: 'routes', title: 'Routes',
    loadComponent: () => import('./views/route-list/route-list').then(m => m.RouteList) },
  { path: 'management', title: 'Route Management',
    loadComponent: () => import('./views/route-management/route-management').then(m => m.RouteManagement) },
];
