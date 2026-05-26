import { HttpInterceptorFn } from '@angular/common/http';

/** ngrok free tier may return an HTML warning page unless this header is sent. */
export const ngrokInterceptor: HttpInterceptorFn = (req, next) => {
  const host = typeof window !== 'undefined' ? window.location.hostname : '';
  if (!host.includes('ngrok')) {
    return next(req);
  }
  return next(
    req.clone({
      setHeaders: {
        'ngrok-skip-browser-warning': 'true',
      },
    }),
  );
};
