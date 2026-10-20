import { Component, inject, signal } from '@angular/core';
import { NavigationCancel, NavigationEnd, NavigationError, Router, RouterOutlet } from '@angular/router';
import { environment } from '../environments/environment';
import { LoadingSkeleton } from './shared/loading-skeleton';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, LoadingSkeleton],
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App {
  private readonly router = inject(Router);
  protected readonly booting = signal(true);

  constructor() {
    const base = environment.apiBaseUrl.replace(/\/$/, '');
    void fetch(`${base}/health`, { cache: 'no-store' }).catch(() => undefined);
    this.router.events.subscribe((event) => {
      if (
        event instanceof NavigationEnd ||
        event instanceof NavigationCancel ||
        event instanceof NavigationError
      ) {
        this.booting.set(false);
      }
    });
  }
}
