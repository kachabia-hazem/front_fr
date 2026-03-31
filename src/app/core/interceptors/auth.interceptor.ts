import { HttpInterceptorFn, HttpRequest, HttpHandlerFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, switchMap, throwError } from 'rxjs';
import { AuthService } from '../services/auth.service';

let isRefreshing = false;

export const authInterceptor: HttpInterceptorFn = (req: HttpRequest<unknown>, next: HttpHandlerFn) => {
  const authService = inject(AuthService);

  const cloned = addToken(req, authService.getToken());

  return next(cloned).pipe(
    catchError((error: HttpErrorResponse) => {
      // Only try refresh on 401, and not on the refresh/login endpoints themselves
      if (
        error.status === 401 &&
        !req.url.includes('/auth/refresh') &&
        !req.url.includes('/auth/login') &&
        !req.url.includes('/auth/register')
      ) {
        return handle401(req, next, authService);
      }
      return throwError(() => error);
    }),
  );
};

function addToken(req: HttpRequest<unknown>, token: string | null): HttpRequest<unknown> {
  if (!token) return req;
  return req.clone({ setHeaders: { Authorization: `Bearer ${token}` } });
}

function handle401(
  req: HttpRequest<unknown>,
  next: HttpHandlerFn,
  authService: AuthService,
) {
  // No refresh token available → logout immediately
  if (!authService.getRefreshToken()) {
    authService.logout();
    return throwError(() => new Error('Session expired'));
  }

  // Prevent concurrent refresh calls
  if (isRefreshing) {
    authService.logout();
    return throwError(() => new Error('Session expired'));
  }

  isRefreshing = true;

  return authService.refreshAccessToken().pipe(
    switchMap((response) => {
      isRefreshing = false;
      // Retry the original request with the new access token
      return next(addToken(req, response.token));
    }),
    catchError((refreshError) => {
      isRefreshing = false;
      authService.logout();
      return throwError(() => refreshError);
    }),
  );
}
