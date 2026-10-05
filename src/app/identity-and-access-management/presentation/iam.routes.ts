import { Routes } from '@angular/router';
import { authGuard, guestGuard } from '../application/auth.guards';

export const iamRoutes: Routes = [
  { path: 'sign-in', title: 'Sign In', data: { hideNav: true }, canActivate: [guestGuard],
    loadComponent: () => import('./views/sign-in/sign-in').then(m => m.SignIn) },
  { path: 'sign-up', title: 'Sign Up', data: { hideNav: true }, canActivate: [guestGuard],
    loadComponent: () => import('./views/sign-up/sign-up').then(m => m.SignUp) },
  { path: 'organization', title: 'Organization', canActivate: [authGuard],
    loadComponent: () => import('./views/organization-management/organization-management').then(m => m.OrganizationManagement) },
  { path: 'profile', title: 'My Profile', canActivate: [authGuard],
    loadComponent: () => import('./views/admin-profile/admin-profile').then(m => m.AdminProfile) },
];
