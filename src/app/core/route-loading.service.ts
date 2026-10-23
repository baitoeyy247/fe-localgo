import { Injectable, signal } from '@angular/core';
import {
  ActivatedRouteSnapshot,
  Event,
  NavigationCancel,
  NavigationEnd,
  NavigationError,
  NavigationStart,
  Router,
  RoutesRecognized,
} from '@angular/router';
import { filter } from 'rxjs';

/** Target route of the navigation in flight (known after recognition, before the lazy chunk loads). */
export interface RouteLoadingTarget {
  path: string;
  title: string;
}

/** True while a route navigation (incl. lazy chunk load) is in progress. */
@Injectable({ providedIn: 'root' })
export class RouteLoadingService {
  readonly active = signal(false);
  /** R43 M-1e: lets the route fallback render the real page header/flow bar instead of a bare card. */
  readonly target = signal<RouteLoadingTarget | null>(null);

  constructor(router: Router) {
    router.events
      .pipe(
        filter(
          (e): e is Event =>
            e instanceof NavigationStart ||
            e instanceof RoutesRecognized ||
            e instanceof NavigationEnd ||
            e instanceof NavigationCancel ||
            e instanceof NavigationError,
        ),
      )
      .subscribe((e) => {
        if (e instanceof NavigationStart) {
          this.target.set(null);
          this.active.set(true);
        } else if (e instanceof RoutesRecognized) {
          let snap: ActivatedRouteSnapshot = e.state.root;
          while (snap.firstChild) {
            snap = snap.firstChild;
          }
          const cfg = snap.routeConfig;
          const rawTitle = typeof cfg?.title === 'string' ? cfg.title : '';
          this.target.set({ path: cfg?.path ?? '', title: rawTitle.replace(/\s*\|\s*LocalGo$/, '') });
        } else {
          this.active.set(false);
        }
      });
  }
}
