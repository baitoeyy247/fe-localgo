import { Component, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
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
}
