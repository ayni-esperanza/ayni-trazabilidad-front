import { inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

export const submoduleLockGuard: CanActivateFn = (route) => {
  const platformId = inject(PLATFORM_ID);
  const authService = inject(AuthService);
  const router = inject(Router);

  // Durante SSR, permitir paso; la hidratación en el navegador verificará.
  if (!isPlatformBrowser(platformId)) {
    return true;
  }

  if (authService.isAdminUser()) {
    return true;
  }

  const blockedModule = route.data['moduleLabel'] as string | undefined;
  router.navigate(['/submodulo-en-construccion'], {
    queryParams: {
      modulo: blockedModule ?? route.routeConfig?.path ?? 'submodulo',
    },
  });

  return false;
};

