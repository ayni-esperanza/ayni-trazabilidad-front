import { HttpInterceptorFn } from '@angular/common/http';
import { inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { EMPTY } from 'rxjs';
import { AuthService } from '../services/auth.service';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const platformId = inject(PLATFORM_ID);
  const authService = inject(AuthService);
  const token = authService.getAccessToken();

  // Durante SSR no hay token ni acceso al backend; abortar la petición
  // para evitar "fetch failed" (ECONNREFUSED). El navegador la re-hará
  // después de la hidratación.
  if (!isPlatformBrowser(platformId) && !token) {
    return EMPTY;
  }

  if (token) {
    req = req.clone({
      setHeaders: {
        Authorization: `Bearer ${token}`,
      },
    });
  }

  return next(req);
};
