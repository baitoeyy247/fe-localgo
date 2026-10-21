import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { catchError, throwError, timeout, TimeoutError } from 'rxjs';

export const API_TIMEOUT_MS = 15_000;
export const API_TIMEOUT_MESSAGE =
  'เซิร์ฟเวอร์ตอบสนองช้า ใช้เวลานานเกินไป กรุณาลองใหม่อีกครั้ง';

/** Applies a 15s timeout to every API request and maps it to a Thai-friendly HttpErrorResponse (408). */
export const httpTimeoutInterceptor: HttpInterceptorFn = (req, next) => {
  return next(req).pipe(
    timeout({ first: API_TIMEOUT_MS }),
    catchError((err: unknown) => {
      if (err instanceof TimeoutError) {
        return throwError(
          () =>
            new HttpErrorResponse({
              status: 408,
              statusText: 'Request Timeout',
              url: req.url,
              error: { detail: API_TIMEOUT_MESSAGE },
            }),
        );
      }
      return throwError(() => err);
    }),
  );
};
