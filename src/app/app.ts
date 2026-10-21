import { Component, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { RouteLoadingService } from './core/route-loading.service';
import { OfflineBar } from './shared/ui/offline-bar';
import { SkeletonCard } from './shared/ui/skeleton-card';
import { ToastHost } from './shared/ui/toast-host';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, OfflineBar, ToastHost, SkeletonCard],
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App {
  protected readonly routeLoading = inject(RouteLoadingService).active;
}
