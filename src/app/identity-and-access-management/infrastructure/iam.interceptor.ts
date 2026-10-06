import { HttpInterceptorFn } from '@angular/common/http';
import { environment } from '../../../environments/environment';

export const TOKEN_STORAGE_KEY = 'kidtrack.token';

/**
 * IAM HTTP interceptor.
 * Attaches the bearer token (if present) to every request sent to the KidTrack API.
 * Third-party calls (OpenRouteService, PayPal) are left untouched.
 */
export const iamInterceptor: HttpInterceptorFn = (req, next) => {
  const token = localStorage.getItem(TOKEN_STORAGE_KEY);
  if (!token || !req.url.startsWith(environment.apiBaseUrl)) return next(req);
  return next(req.clone({ setHeaders: { Authorization: `Bearer ${token}` } }));
};
