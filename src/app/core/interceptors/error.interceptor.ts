import { HttpContextToken, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, switchMap, throwError } from 'rxjs';
import { AuthService } from '../services/auth.service';

const RETRY_ONCE = new HttpContextToken<boolean>(() => false);

export const errorInterceptor: HttpInterceptorFn = (req, next) => {
  const authService = inject(AuthService);

  return next(req).pipe(
    catchError((error) => {
      const isUnauthorized = error.status === 401;
      const isAuthEndpoint =
        req.url.includes('/v1/auth/login') || req.url.includes('/v1/auth/refresh');
      const alreadyRetried = req.context.get(RETRY_ONCE);

      if (!isUnauthorized) {
        const errorMessage = error.error?.message || error.statusText;
        console.error('Error HTTP:', errorMessage);
        return throwError(() => error);
      }

      if (isAuthEndpoint || alreadyRetried || !authService.getRefreshToken()) {
        authService.logout();
        return throwError(() => error);
      }

      return authService.refreshAccessToken().pipe(
        switchMap((newToken) => {
          const retryReq = req.clone({
            context: req.context.set(RETRY_ONCE, true),
            setHeaders: {
              Authorization: `Bearer ${newToken}`,
            },
          });

          return next(retryReq);
        }),
        catchError((refreshError) => {
          authService.logout();
          return throwError(() => refreshError);
        }),
      );
    }),
  );
};
