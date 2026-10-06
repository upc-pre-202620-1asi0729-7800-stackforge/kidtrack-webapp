import { Routes } from '@angular/router';

/** Routes for the Stakeholder bounded context (mounted under /stakeholder-and-asset-management). */
export const stakeholderRoutes: Routes = [
  { path: 'management', title: 'Community Management',
    loadComponent: () => import('./views/stakeholder-management/stakeholder-management').then(m => m.StakeholderManagement) },
  { path: 'profiles', pathMatch: 'full', redirectTo: 'management' },
];
