import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { TimeoutError, catchError, finalize, throwError, timeout } from 'rxjs';
import { SlowConnectionService } from './slow-connection.service';

const TIMEOUT_MS = 15_000;
const SLOW_MS = 4_000;

export const timeoutInterceptor: HttpInterceptorFn = (req, next) => {
  if (!req.url.includes('/api/')) {
    return next(req);
  }
  const slow = inject(SlowConnectionService);
  slow.begin();
  const slowTimer = setTimeout(() => slow.markSlow(), SLOW_MS);
  return next(req).pipe(
    timeout(TIMEOUT_MS),
    catchError((err: unknown) => {
      if (err instanceof TimeoutError) {
        return throwError(
          () =>
            new HttpErrorResponse({
              error: { detail: 'โหลดข้อมูลไม่สำเร็จ' },
              status: 0,
              statusText: 'Timeout',
              url: req.url,
            }),
        );
      }
      return throwError(() => err);
    }),
    finalize(() => {
      clearTimeout(slowTimer);
      slow.end();
    }),
  );
};
