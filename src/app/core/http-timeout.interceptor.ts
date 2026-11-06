import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { Observable } from 'rxjs';

export const API_TIMEOUT_MS = 15_000;
export const API_TIMEOUT_MESSAGE =
  'เซิร์ฟเวอร์ตอบสนองช้า ใช้เวลานานเกินไป กรุณาลองใหม่อีกครั้ง';

/**
 * H1: AbortController cancels every in-flight API request after 15s and maps it
 * to a Thai-friendly HttpErrorResponse (408) with retry copy.
 */
export const httpTimeoutInterceptor: HttpInterceptorFn = (req, next) =>
  new Observable((subscriber) => {
    const controller = new AbortController();
    const abortTimer = setTimeout(() => controller.abort(), API_TIMEOUT_MS);
    const subscription = next(req).subscribe({
      next: (event) => subscriber.next(event),
      error: (err) => {
        clearTimeout(abortTimer);
        subscriber.error(err);
      },
      complete: () => {
        clearTimeout(abortTimer);
        subscriber.complete();
      },
    });

    const onAbort = (): void => {
      subscription.unsubscribe();
      if (!subscriber.closed) {
        subscriber.error(
          new HttpErrorResponse({
            status: 408,
            statusText: 'Request Timeout',
            url: req.url,
            error: { detail: API_TIMEOUT_MESSAGE },
          }),
        );
      }
    };

    controller.signal.addEventListener('abort', onAbort);
    return () => {
      clearTimeout(abortTimer);
      controller.signal.removeEventListener('abort', onAbort);
      subscription.unsubscribe();
    };
  });
