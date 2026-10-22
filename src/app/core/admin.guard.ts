import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from './auth.service';

export const adminGuard: CanActivateFn = async () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  if (auth.isAuthenticated()) {
    auth.refreshSessionInBackground();
  } else {
    await auth.ensureSession();
  }
  if (auth.isAdmin()) {
    return true;
  }
  router.navigateByUrl('/');
  return false;
};
