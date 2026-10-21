import { Component, OnInit, inject, signal, viewChild } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import {
  LocationPickerModal,
  LocationPickerValue,
} from '../../../demo/location-picker-modal';
import { PageShell } from '../../../demo/page-shell';
import { RequesterBottomNav } from '../../../shared/requester-bottom-nav';
import { LocalGoApiService } from '../../../core/localgo-api.service';
import { ProviderDetail } from '../../../core/models';
import { SessionStateService } from '../../../core/session-state.service';
import { UserLocationService } from '../../../core/user-location.service';
import { apiErrorMessage } from '../../../core/api-error.util';
import { ThaiDatetimeField } from '../../../shared/ui/thai-datetime-field';
import { scrollToFirstError } from '../../../shared/scroll-to-first-error';
import { formatPrice } from '../../../shared/format-price';

@Component({
  selector: 'app-requester-book-page',
  imports: [PageShell, LocationPickerModal, RequesterBottomNav, ThaiDatetimeField],
  templateUrl: './book.html',
})
export class RequesterBookPage implements OnInit {
  protected readonly provider = signal<ProviderDetail | null>(null);
  protected readonly serviceId = signal<string | null>(null);
  /** Empty until user picks — avoids display/value mismatch. */
  protected readonly scheduledAt = signal('');
  protected readonly addressText = signal('');
  protected readonly note = signal('');
  protected readonly saving = signal(false);
  protected readonly loading = signal(true);
  protected readonly error = signal<string | null>(null);
  protected readonly success = signal<string | null>(null);
  protected readonly pickerOpen = signal(false);
  protected readonly mapLat = signal<number | null>(null);
  protected readonly mapLng = signal<number | null>(null);
  protected readonly formatPrice = formatPrice;

  private readonly api = inject(LocalGoApiService);
  private readonly session = inject(SessionStateService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly userLocation = inject(UserLocationService);
  private readonly datetimeField = viewChild(ThaiDatetimeField);

  async ngOnInit(): Promise<void> {
    const providerId = this.route.snapshot.paramMap.get('providerId');
    const qpServiceId = this.route.snapshot.queryParamMap.get('serviceId');
    if (!providerId) {
      this.error.set('ไม่พบผู้ให้บริการ');
      this.loading.set(false);
      return;
    }

    this.session.currentProviderId = providerId;

    try {
      const area = await this.userLocation.resolveSearchArea();
      this.mapLat.set(area.lat);
      this.mapLng.set(area.lng);
      this.addressText.set(area.title);

      const detail = await firstValueFrom(this.api.getProvider(providerId));
      this.provider.set(detail);

      const svc =
        (qpServiceId ? detail.services.find((s) => s.id === qpServiceId) : null) ??
        detail.services.find((s) => s.isActive) ??
        detail.services[0];
      if (!svc) {
        this.error.set('ผู้ให้บริการยังไม่มีรายการบริการที่เปิดรับจอง');
        this.loading.set(false);
        return;
      }
      this.serviceId.set(svc.id);
    } catch (e) {
      this.error.set(apiErrorMessage(e, 'โหลดข้อมูลไม่สำเร็จ'));
    } finally {
      this.loading.set(false);
    }
  }

  protected selectedService() {
    const p = this.provider();
    const id = this.serviceId();
    return p?.services.find((s) => s.id === id) ?? null;
  }

  protected profileBackLink(): string {
    const p = this.provider();
    if (!p) {
      return '/requester/search';
    }
    const svcId = this.serviceId();
    return svcId
      ? `/requester/provider/${p.id}?serviceId=${encodeURIComponent(svcId)}`
      : `/requester/provider/${p.id}`;
  }

  protected openPicker(): void {
    this.pickerOpen.set(true);
  }

  protected closePicker(): void {
    this.pickerOpen.set(false);
  }

  protected applyPickedLocation(value: LocationPickerValue): void {
    this.mapLat.set(value.lat);
    this.mapLng.set(value.lng);
    const label = `${value.title}${value.subtitle ? ` · ${value.subtitle}` : ''}`.trim();
    if (label) {
      this.addressText.set(label);
    }
    this.pickerOpen.set(false);
  }

  protected async confirm(): Promise<void> {
    const providerId = this.provider()?.id;
    const serviceId = this.serviceId();
    const lat = this.mapLat();
    const lng = this.mapLng();
    const dt = this.datetimeField();
    dt?.markTouched();
    this.error.set(null);

    if (dt && !dt.isValid()) {
      this.error.set(dt.errorMessage());
      scrollToFirstError();
      return;
    }
    if (!this.scheduledAt()) {
      this.error.set('กรุณาเลือกวันที่และเวลา');
      scrollToFirstError();
      return;
    }
    if (!providerId || !serviceId || lat === null || lng === null || this.saving()) {
      this.error.set('กรุณาเลือกสถานที่นัดหมายบนแผนที่หรือพิมพ์ที่อยู่');
      scrollToFirstError();
      return;
    }

    this.saving.set(true);
    this.success.set(null);
    try {
      const result = await firstValueFrom(
        this.api.bookProviderService(providerId, serviceId, {
          scheduledAt: new Date(this.scheduledAt()).toISOString(),
          addressText: this.addressText().trim() || undefined,
          latitude: lat,
          longitude: lng,
          note: this.note().trim() || undefined,
        }),
      );
      this.session.requesterRequestId = result.serviceRequestId;
      this.success.set('จองนัดหมายแล้ว ระบบจะแจ้งผู้ให้บริการให้ทราบ');
      setTimeout(() => {
        void this.router.navigate(['/requester/appointments', result.appointmentId]);
      }, 800);
    } catch (e) {
      this.error.set(apiErrorMessage(e, 'จองนัดหมายไม่สำเร็จ'));
      scrollToFirstError();
    } finally {
      this.saving.set(false);
    }
  }
}
