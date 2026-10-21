import { Component, inject, signal } from '@angular/core';
import { NavigationCancel, NavigationEnd, NavigationError, Router, RouterOutlet } from '@angular/router';
import { environment } from '../environments/environment';
import { SlowConnectionService } from './core/slow-connection.service';
import { LoadingSkeleton } from './shared/loading-skeleton';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, LoadingSkeleton],
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App {
  private readonly router = inject(Router);
  protected readonly slow = inject(SlowConnectionService);
  protected readonly booting = signal(true);
  protected readonly bootFailed = signal(false);

  constructor() {
    const base = environment.apiBaseUrl.replace(/\/$/, '');
    const warmup = new AbortController();
    const warmupTimer = setTimeout(() => warmup.abort(), 15_000);
    void fetch(`${base}/health`, { cache: 'no-store', signal: warmup.signal })
      .catch(() => undefined)
      .finally(() => clearTimeout(warmupTimer));
    const bootTimer = setTimeout(() => {
      if (this.booting()) {
        this.booting.set(false);
        this.bootFailed.set(true);
      }
    }, 15_000);
    this.router.events.subscribe((event) => {
      if (
        event instanceof NavigationEnd ||
        event instanceof NavigationCancel ||
        event instanceof NavigationError
      ) {
        clearTimeout(bootTimer);
        this.booting.set(false);
        this.bootFailed.set(false);
      }
    });
  }

  protected reload(): void {
    window.location.reload();
  }
}
