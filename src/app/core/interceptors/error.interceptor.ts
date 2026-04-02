import { HttpContextToken, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, switchMap, throwError } from 'rxjs';
import { AuthService } from '../services/auth.service';

const RETRY_ONCE = new HttpContextToken<boolean>(() => false);

function buildErrorMessage(error: any, requestUrl: string): string {
  const rawError = error?.error;
  const responseText = typeof rawError?.text === 'string'
    ? rawError.text.trim()
    : typeof rawError === 'string'
      ? rawError.trim()
      : '';

  if (
    rawError instanceof SyntaxError ||
    responseText.startsWith('<!DOCTYPE') ||
    responseText.startsWith('<html')
  ) {
    return `La URL configurada para la API no esta respondiendo JSON. Revisa API_URL y que el backend este levantado. Request: ${requestUrl}`;
  }

  return error.error?.message || error.statusText || 'Error HTTP no identificado';
}

export const errorInterceptor: HttpInterceptorFn = (req, next) => {
  const authService = inject(AuthService);

  return next(req).pipe(
    catchError((error) => {
      const isUnauthorized = error.status === 401;
      const isAuthEndpoint =
        req.url.includes('/auth/login') || req.url.includes('/auth/refresh');
      const alreadyRetried = req.context.get(RETRY_ONCE);

      if (!isUnauthorized) {
        const errorMessage = buildErrorMessage(error, req.url);
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
