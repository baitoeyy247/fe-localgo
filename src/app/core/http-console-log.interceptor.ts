import { HttpErrorResponse, HttpEventType, HttpInterceptorFn, HttpResponse } from '@angular/common/http';
import { finalize, tap } from 'rxjs';
import { environment } from '../../environments/environment';

/**
 * R40 (SIT only, env flag httpConsoleLog): one console line per request —
 * `[HTTP] METHOD /path STATUS NNms (server NNms, req <id>)`. Path without query string; never body or headers.
 */
export const httpConsoleLogInterceptor: HttpInterceptorFn = (req, next) => {
  if (!(environment as { httpConsoleLog?: boolean }).httpConsoleLog) {
    return next(req);
  }
  const started = performance.now();
  let path = req.url;
  try {
    path = new URL(req.url, location.origin).pathname;
  } catch {
    path = req.url.split('?')[0];
  }
  let done = false;
  const line = (status: string, headers?: { get(name: string): string | null } | null) => {
    done = true;
    const ms = Math.round(performance.now() - started);
    const timing = headers?.get('Server-Timing') ?? '';
    const dur = /dur=([\d.]+)/.exec(timing)?.[1];
    const rid = headers?.get('X-Request-Id') ?? '-';
    const server = dur ? `${Math.round(Number(dur))}ms` : '-';
    console.info(`[HTTP] ${req.method} ${path} ${status} ${ms}ms (server ${server}, req ${rid})`);
  };
  return next(req).pipe(
    tap({
      next: (ev) => {
        if (ev.type === HttpEventType.Response) {
          line(String((ev as HttpResponse<unknown>).status), (ev as HttpResponse<unknown>).headers);
        }
      },
      error: (err: unknown) => {
        if (err instanceof HttpErrorResponse) {
          line(String(err.status), err.status === 0 ? null : err.headers);
        } else {
          line('error');
        }
      },
    }),
    finalize(() => {
      if (!done) {
        line('aborted');
      }
    }),
  );
};
