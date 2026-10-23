import { Injectable, inject } from '@angular/core';
import { PreloadingStrategy, Route } from '@angular/router';
import { Observable, filter, of, switchMap, take, timer } from 'rxjs';
import { toObservable } from '@angular/core/rxjs-interop';
import { AuthService } from './auth.service';

/**
 * R43 M-1e: once a user is signed in, preload the lazy requester/* and provider/* page chunks
 * so first visits do not flash the generic route fallback while the chunk downloads.
 */
@Injectable({ providedIn: 'root' })
export class RolePreloadingStrategy implements PreloadingStrategy {
  private readonly signedIn$ = toObservable(inject(AuthService).isAuthenticated);

  preload(route: Route, load: () => Observable<unknown>): Observable<unknown> {
    const path = route.path ?? '';
    if (!/^(requester|provider)(\/|$)/.test(path)) {
      return of(null);
    }
    return this.signedIn$.pipe(
      filter(Boolean),
      take(1),
      // Let the current page's own requests go first.
      switchMap(() => timer(300)),
      switchMap(() => load()),
    );
  }
}
