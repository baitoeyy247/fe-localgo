import { Injectable, signal } from '@angular/core';
import { Event, NavigationCancel, NavigationEnd, NavigationError, NavigationStart, Router } from '@angular/router';
import { filter } from 'rxjs';

/** True while a route navigation (incl. lazy chunk load) is in progress. */
@Injectable({ providedIn: 'root' })
export class RouteLoadingService {
  readonly active = signal(false);

  constructor(router: Router) {
    router.events.pipe(filter((e): e is Event => e instanceof NavigationStart || e instanceof NavigationEnd || e instanceof NavigationCancel || e instanceof NavigationError)).subscribe((e) => {
      if (e instanceof NavigationStart) {
        this.active.set(true);
      } else {
        this.active.set(false);
      }
    });
  }
}
