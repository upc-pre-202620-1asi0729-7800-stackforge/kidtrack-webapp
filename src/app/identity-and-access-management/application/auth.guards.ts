import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { IamStore } from './iam.store';

/** Routes that require a session redirect to sign-in, keeping the requested URL. */
export const authGuard: CanActivateFn = (_route, state) => {
  const iamStore = inject(IamStore);
  if (iamStore.isAuthenticated()) return true;
  return inject(Router).createUrlTree(['/identity-and-access-management/sign-in'], {
    queryParams: { redirect: state.url },
  });
};

/** Authenticated users visiting sign-in / sign-up are sent home. */
export const guestGuard: CanActivateFn = () => {
  return inject(IamStore).isAuthenticated() ? inject(Router).createUrlTree(['/home']) : true;
};
