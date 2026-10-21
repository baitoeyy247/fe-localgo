import { Component, OnInit, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { PageShell } from '../../../demo/page-shell';
import { ProviderBottomNav } from '../../../shared/provider-bottom-nav';
import { LocalGoApiService } from '../../../core/localgo-api.service';
import { ProviderDetail } from '../../../core/models';
import { apiErrorMessage } from '../../../core/api-error.util';
import { ErrorState } from '../../../shared/ui/error-state';
import { formatPrice } from '../../../shared/format-price';

@Component({
  selector: 'app-manage-services-page',
  imports: [PageShell, RouterLink, ProviderBottomNav, ErrorState],
  templateUrl: './manage-services.html',
})
export class ManageServicesPage implements OnInit {
  protected readonly provider = signal<ProviderDetail | null>(null);
  protected readonly loading = signal(true);
  protected readonly error = signal<string | null>(null);
  protected readonly formatPrice = formatPrice;

  constructor(private readonly api: LocalGoApiService) {}

  async ngOnInit(): Promise<void> {
    await this.reload();
  }

  protected async reload(): Promise<void> {
    this.loading.set(true);
    this.error.set(null);
    try {
      const mine = await firstValueFrom(this.api.getMyProvider());
      this.provider.set(mine);
    } catch (e) {
      if (e instanceof HttpErrorResponse && e.status === 404) {
        this.provider.set(null);
      } else {
        this.error.set(apiErrorMessage(e, 'โหลดบริการไม่สำเร็จ'));
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
    const previous = p;
    this.provider.set({
      ...p,
      services: p.services.map((s) => (s.id === serviceId ? { ...s, isActive: active } : s)),
    });
    try {
      await firstValueFrom(this.api.setServiceActive(p.id, serviceId, active));
    } catch (e) {
      this.provider.set(previous);
      this.error.set(apiErrorMessage(e, 'อัปเดตสถานะบริการไม่สำเร็จ'));
    }
  }
}
