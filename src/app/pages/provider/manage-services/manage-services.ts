import { Component, OnInit, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { PageShell } from '../../../demo/page-shell';
import { ProviderBottomNav } from '../../../shared/provider-bottom-nav';
import { LocalGoApiService } from '../../../core/localgo-api.service';
import { MarketplaceCacheService } from '../../../core/marketplace-cache.service';
import { ProviderDetail } from '../../../core/models';
import { apiErrorMessage } from '../../../core/api-error.util';
import { ErrorState } from '../../../shared/ui/error-state';
import { ConfirmSheet } from '../../../shared/ui/confirm-sheet';
import { ToastService } from '../../../core/toast.service';
import { formatPrice } from '../../../shared/format-price';
import { formatVerifiedRatingLine } from '../../../shared/format-verified-rating';
import { GLOSSARY } from '../../../shared/glossary';

@Component({
  selector: 'app-manage-services-page',
  imports: [PageShell, RouterLink, ProviderBottomNav, ErrorState, ConfirmSheet],
  templateUrl: './manage-services.html',
})
export class ManageServicesPage implements OnInit {
  protected readonly GLOSSARY = GLOSSARY;
  protected readonly provider = signal<ProviderDetail | null>(null);
  protected readonly loading = signal(true);
  protected readonly error = signal<string | null>(null);
  protected readonly acting = signal(false);
  protected readonly toggleConfirmOpen = signal(false);
  protected readonly toggleTarget = signal<{ serviceId: string; active: boolean; title: string } | null>(
    null,
  );
  protected readonly formatPrice = formatPrice;
  protected readonly formatVerifiedRatingLine = formatVerifiedRatingLine;

  constructor(
    private readonly api: LocalGoApiService,
    private readonly cache: MarketplaceCacheService,
    private readonly toast: ToastService,
  ) {}

  async ngOnInit(): Promise<void> {
    await this.reload();
  }

  protected async reload(): Promise<void> {
    this.loading.set(true);
    this.error.set(null);
    try {
      const mine = await firstValueFrom(this.cache.getMyProvider());
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

  protected requestToggleService(serviceId: string, active: boolean, title: string): void {
    if (this.acting()) {
      return;
    }
    this.toggleTarget.set({ serviceId, active, title });
    this.toggleConfirmOpen.set(true);
  }

  protected toggleConfirmTitle(): string {
    const t = this.toggleTarget();
    return t?.active ? 'เปิดบริการอีกครั้ง?' : 'หยุดบริการชั่วคราว?';
  }

  protected toggleConfirmMessage(): string {
    const t = this.toggleTarget();
    if (!t) {
      return '';
    }
    return t.active
      ? `เปิดรับงานสำหรับ "${t.title}" อีกครั้ง`
      : `หยุดรับงานสำหรับ "${t.title}" ชั่วคราว`;
  }

  protected toggleBusyLabel(): string {
    const t = this.toggleTarget();
    return t?.active ? 'กำลังเปิด…' : 'กำลังหยุด…';
  }

  protected async confirmToggleService(): Promise<void> {
    const target = this.toggleTarget();
    const p = this.provider();
    if (!target || !p || this.acting()) {
      return;
    }
    const { serviceId, active } = target;
    this.acting.set(true);
    this.toggleConfirmOpen.set(false);
    try {
      await firstValueFrom(this.api.setServiceActive(p.id, serviceId, active));
      this.provider.set({
        ...p,
        services: p.services.map((s) => (s.id === serviceId ? { ...s, isActive: active } : s)),
      });
      this.toast.show(active ? 'เปิดบริการแล้ว' : 'หยุดบริการแล้ว');
    } catch (e) {
      this.error.set(apiErrorMessage(e, 'อัปเดตสถานะบริการไม่สำเร็จ'));
    } finally {
      this.acting.set(false);
      this.toggleTarget.set(null);
    }
  }

  protected cancelToggle(): void {
    this.toggleConfirmOpen.set(false);
    this.toggleTarget.set(null);
  }
}
