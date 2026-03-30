import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

export const submoduleLockGuard: CanActivateFn = (route) => {
  const authService = inject(AuthService);
  const router = inject(Router);

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
