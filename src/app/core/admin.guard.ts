import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from './auth.service';

export const adminGuard: CanActivateFn = async () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  try {
    await auth.ensureSession();
  } catch {
    return router.createUrlTree(['/'], { queryParams: { denied: 'admin' } });
  }
  if (auth.isAdmin()) {
    return true;
  }
  return router.createUrlTree(['/'], { queryParams: { denied: 'admin' } });
};
