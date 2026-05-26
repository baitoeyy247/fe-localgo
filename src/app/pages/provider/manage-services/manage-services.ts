import { Component, OnInit, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { PageShell } from '../../../demo/page-shell';
import { ProviderBottomNav } from '../../../shared/provider-bottom-nav';
import { LocalGoApiService } from '../../../core/localgo-api.service';
import { ProviderDetail } from '../../../core/models';

@Component({
  selector: 'app-manage-services-page',
  imports: [PageShell, RouterLink, ProviderBottomNav],
  templateUrl: './manage-services.html',
})
export class ManageServicesPage implements OnInit {
  protected readonly provider = signal<ProviderDetail | null>(null);
  protected readonly loading = signal(true);

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

  protected async toggleService(serviceId: string, active: boolean): Promise<void> {
    const p = this.provider();
    if (!p) {
      return;
    }
    await firstValueFrom(this.api.setServiceActive(p.id, serviceId, active));
    const refreshed = await firstValueFrom(this.api.getMyProvider());
    this.provider.set(refreshed);
  }
}
