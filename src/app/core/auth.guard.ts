import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from './auth.service';

export const authGuard: CanActivateFn = async () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  try {
    await auth.ensureSession();
    if (!auth.isAuthenticated()) {
      void router.navigateByUrl('/', { replaceUrl: true });
      return false;
    }
    return true;
  } catch {
    void router.navigateByUrl('/', { replaceUrl: true });
    return false;
  }
};
