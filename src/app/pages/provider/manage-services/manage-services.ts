import { Component, OnInit, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { PageShell } from '../../../demo/page-shell';
import { ProviderBottomNav } from '../../../shared/provider-bottom-nav';
import { LocalGoApiService } from '../../../core/localgo-api.service';
import { ProviderDetail, ProviderService } from '../../../core/models';
import { LoadingSkeleton } from '../../../shared/loading-skeleton';
import { formatBaht, priceTextError } from '../../../shared/form-rules';
import { providerStatusLabel } from '../../../shared/status-labels';
import { ConfirmModal } from '../../../shared/confirm-modal';
import { apiErrorMessage } from '../../../core/api-error.util';

@Component({
  selector: 'app-manage-services-page',
  imports: [PageShell, RouterLink, ProviderBottomNav, LoadingSkeleton, ConfirmModal],
  templateUrl: './manage-services.html',
})
export class ManageServicesPage implements OnInit {
  protected readonly provider = signal<ProviderDetail | null>(null);
  protected readonly loading = signal(true);
  protected readonly togglingId = signal<string | null>(null);
  protected readonly deleting = signal(false);
  protected readonly deleteTarget = signal<ProviderService | null>(null);
  protected readonly deleteError = signal<string | null>(null);
  protected readonly formatBaht = formatBaht;
  protected readonly providerStatusLabel = providerStatusLabel;
  protected readonly priceTextError = priceTextError;

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

  protected deleteMessage(): string {
    const service = this.deleteTarget();
    return service ? `ลบ "${service.title}" แล้วลูกค้าจะไม่เห็นบริการนี้อีก` : '';
  }

  protected askDelete(service: ProviderService): void {
    this.deleteError.set(null);
    this.deleteTarget.set(service);
  }

  protected dismissDelete(): void {
    if (!this.deleting()) {
      this.deleteTarget.set(null);
      this.deleteError.set(null);
    }
  }

  protected async confirmDelete(): Promise<void> {
    const profile = this.provider();
    const service = this.deleteTarget();
    if (!profile || !service || this.deleting()) {
      return;
    }
    this.deleting.set(true);
    this.deleteError.set(null);
    try {
      await firstValueFrom(this.api.deleteService(profile.id, service.id));
      this.provider.set(await firstValueFrom(this.api.getMyProvider()));
      this.deleteTarget.set(null);
    } catch (e) {
      this.deleteError.set(apiErrorMessage(e, 'ลบบริการไม่สำเร็จ'));
    } finally {
      this.deleting.set(false);
    }
  }
}
