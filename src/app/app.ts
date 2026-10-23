import { Component, inject } from '@angular/core';
import { NavigationEnd, Router, RouterOutlet } from '@angular/router';
import { filter } from 'rxjs';
import { RouteLoadingService } from './core/route-loading.service';
import { DirtyFormGuardState } from './shared/forms/dirty-form.guard';
import { ConfirmSheet } from './shared/ui/confirm-sheet';
import { OfflineBar } from './shared/ui/offline-bar';
import { SkeletonCard } from './shared/ui/skeleton-card';
import { ToastHost } from './shared/ui/toast-host';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, OfflineBar, ToastHost, SkeletonCard, ConfirmSheet],
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App {
  protected readonly routeLoading = inject(RouteLoadingService).active;
  protected readonly dirty = inject(DirtyFormGuardState);

  constructor() {
    // R42 A5-19: after an in-app navigation move focus to the page h1 (tabindex=-1) so screen readers
    // announce the new page. Skip the very first load.
    let first = true;
    inject(Router)
      .events.pipe(filter((e): e is NavigationEnd => e instanceof NavigationEnd))
      .subscribe(() => {
        if (first) {
          first = false;
          return;
        }
        let tries = 0;
        const focusH1 = () => {
          const h1 = document.querySelector<HTMLElement>('app-page-shell h1.page-h1');
          if (h1) {
            h1.focus({ preventScroll: true });
          } else if (++tries < 20) {
            setTimeout(focusH1, 50);
          }
        };
        setTimeout(focusH1, 0);
      });
  }
}
