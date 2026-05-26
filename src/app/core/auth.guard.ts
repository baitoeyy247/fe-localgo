import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from './auth.service';

export const authGuard: CanActivateFn = async () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  try {
    await auth.ensureSession();
    return auth.isAuthenticated();
  } catch {
    router.navigateByUrl('/');
    return false;
  }
};
