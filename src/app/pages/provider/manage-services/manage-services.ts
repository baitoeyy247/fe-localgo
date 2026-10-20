import { Component, OnInit, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { PageShell } from '../../../demo/page-shell';
import { ProviderBottomNav } from '../../../shared/provider-bottom-nav';
import { LocalGoApiService } from '../../../core/localgo-api.service';
import { ProviderDetail } from '../../../core/models';
import { LoadingSkeleton } from '../../../shared/loading-skeleton';
import { formatBaht } from '../../../shared/form-rules';

@Component({
  selector: 'app-manage-services-page',
  imports: [PageShell, RouterLink, ProviderBottomNav, LoadingSkeleton],
  templateUrl: './manage-services.html',
})
export class ManageServicesPage implements OnInit {
  protected readonly provider = signal<ProviderDetail | null>(null);
  protected readonly loading = signal(true);
  protected readonly togglingId = signal<string | null>(null);
  protected readonly formatBaht = formatBaht;

  constructor(private readonly api: LocalGoApiService) {}

  async ngOnInit(): Promise<void> {
    try {
      const mine = await firstValueFrom(this.api.getMyProvider());
      this.provider.set(mine);
    } catch (e) {
      if (!(e instanceof HttpErrorResponse) || e.status !== 404) {
        throw e;
      }
    } finally {
      this.loading.set(false);
    }
  }

  protected pressToggle(serviceId: string, active: boolean, event: Event): void {
    if (this.togglingId()) {
      event.preventDefault();
      event.stopPropagation();
      return;
    }
    this.togglingId.set(serviceId);
    void this.toggleService(serviceId, active);
  }

  protected async toggleService(serviceId: string, active: boolean): Promise<void> {
    const p = this.provider();
    if (!p) {
      this.togglingId.set(null);
      return;
    }
    try {
      await firstValueFrom(this.api.setServiceActive(p.id, serviceId, active));
      const refreshed = await firstValueFrom(this.api.getMyProvider());
      this.provider.set(refreshed);
    } finally {
      this.togglingId.set(null);
    }
  }
}
