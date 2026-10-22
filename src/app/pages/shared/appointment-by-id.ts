import { Component, OnInit, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { PageShell } from '../../demo/page-shell';
import { LocalGoApiService } from '../../core/localgo-api.service';
import { AppointmentDetail, ServiceRequestDetail } from '../../core/models';
import { apiErrorMessage } from '../../core/api-error.util';
import { appointmentStatusLabel } from '../../shared/status-labels';
import { formatScheduledAt } from '../../shared/datetime.util';
import { formatPrice } from '../../shared/format-price';
import { ErrorState } from '../../shared/ui/error-state';
import { NotFoundState } from '../../shared/ui/not-found-state';
import { ConfirmSheet } from '../../shared/ui/confirm-sheet';
import { GLOSSARY } from '../../shared/glossary';
import {
  cancelAppointmentConfirmMessage,
  cancelAppointmentToast,
  destructiveSheetDismissCancelAppointment,
} from '../../shared/confirm-copy';
import { ToastService } from '../../core/toast.service';

@Component({
  selector: 'app-appointment-by-id-page',
  imports: [PageShell, RouterLink, ErrorState, NotFoundState, ConfirmSheet],
  templateUrl: './appointment-by-id.html',
})
export class AppointmentByIdPage implements OnInit {
  protected readonly GLOSSARY = GLOSSARY;
  protected readonly cancelAppointmentDismissLabel = destructiveSheetDismissCancelAppointment;
  protected readonly appointment = signal<AppointmentDetail | null>(null);
  protected readonly request = signal<ServiceRequestDetail | null>(null);
  protected readonly loading = signal(true);
  protected readonly acting = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly forbidden = signal(false);
  protected readonly cancelOpen = signal(false);
  protected readonly formatScheduledAt = formatScheduledAt;
  protected readonly statusLabel = appointmentStatusLabel;

  private readonly route = inject(ActivatedRoute);
  private readonly api = inject(LocalGoApiService);
  private readonly toast = inject(ToastService);

  protected role(): 'requester' | 'provider' {
    return this.route.snapshot.data['role'] === 'provider' ? 'provider' : 'requester';
  }

  protected title(): string {
    return this.request()?.title?.trim() || GLOSSARY.appointment;
  }

  protected providerProfileLink(): string | null {
    const id = this.appointment()?.providerId;
    return id ? `/requester/provider/${id}` : null;
  }

  protected backLink(): string {
    return this.role() === 'provider' ? '/provider/requests' : '/requester';
  }

  protected providerName(): string | null {
    const a = this.appointment();
    if (a?.providerName?.trim()) {
      return a.providerName.trim();
    }
    const r = this.request();
    if (!r) {
      return null;
    }
    const bid =
      r.bids?.find((b) => b.providerId === a?.providerId) ??
      r.bids?.find((b) => b.id === r.selectedBidId) ??
      r.bids?.find((b) => b.status === 'Selected') ??
      r.bids?.[0];
    return bid?.providerName ?? null;
  }

  protected priceLine(): string | null {
    const r = this.request();
    const bid = r?.bids?.find((b) => b.id === r.selectedBidId) ?? r?.bids?.find((b) => b.status === 'Selected');
    return bid?.priceText ? formatPrice(bid.priceText) : r?.budgetText ? formatPrice(r.budgetText) : null;
  }

  protected canCancel(): boolean {
    const a = this.appointment();
    return this.role() === 'requester' && !!a && (a.status === 'Pending' || a.status === 'Confirmed');
  }

  protected canReschedule(): boolean {
    return this.canCancel();
  }

  protected cancelConfirmMessage(): string {
    const a = this.appointment();
    if (!a) {
      return '';
    }
    return cancelAppointmentConfirmMessage(a.scheduledAt, this.title());
  }

  ngOnInit(): void {
    void this.load();
  }

  protected async load(): Promise<void> {
    const id = this.route.snapshot.paramMap.get('id');
    if (!id) {
      this.forbidden.set(true);
      this.loading.set(false);
      return;
    }
    this.loading.set(true);
    this.error.set(null);
    try {
      const a = await firstValueFrom(this.api.getAppointmentById(id));
      this.appointment.set(a);
      if (a.serviceRequestId) {
        try {
          this.request.set(await firstValueFrom(this.api.getRequest(a.serviceRequestId)));
        } catch {
          /* optional */
        }
      }
    } catch (e) {
      if ((e as { status?: number }).status === 404 || (e as { status?: number }).status === 403) {
        this.forbidden.set(true);
      } else {
        this.error.set(apiErrorMessage(e, 'โหลดนัดหมายไม่สำเร็จ'));
      }
    } finally {
      this.loading.set(false);
    }
  }

  protected async cancelAppointment(): Promise<void> {
    const a = this.appointment();
    if (!a || this.acting() || !this.canCancel()) {
      return;
    }
    this.acting.set(true);
    this.cancelOpen.set(false);
    try {
      const updated = await firstValueFrom(this.api.updateAppointmentStatus(a.id, 'Cancelled'));
      this.appointment.set(updated);
      this.toast.show(cancelAppointmentToast(a.scheduledAt, this.title()));
    } catch (e) {
      this.error.set(apiErrorMessage(e, 'ยกเลิกนัดหมายไม่สำเร็จ'));
    } finally {
      this.acting.set(false);
    }
  }
}
