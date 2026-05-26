import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';
import { AuthService } from './auth.service';

const PUBLIC_API_SUFFIXES = [
  '/api/categories',
  '/api/search/providers',
  '/api/health',
  '/api/auth/line/login',
  '/api/auth/dev/login',
  '/api/config/',
];

function isPublicApi(url: string): boolean {
  return PUBLIC_API_SUFFIXES.some((suffix) => url.includes(suffix));
}

export const authErrorInterceptor: HttpInterceptorFn = (req, next) => {
  const auth = inject(AuthService);
  const router = inject(Router);

  return next(req).pipe(
    catchError((err: unknown) => {
      if (err instanceof HttpErrorResponse && err.status === 401 && !isPublicApi(req.url)) {
        auth.clearSession();
        auth.resetBootstrap();
        void router.navigateByUrl('/');
      }
      return throwError(() => err);
    }),
  );
};
