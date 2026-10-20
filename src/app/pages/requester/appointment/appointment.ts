import { Component, OnInit, inject, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { PageShell } from '../../../demo/page-shell';
import {
  LocationPickerModal,
  LocationPickerValue,
} from '../../../demo/location-picker-modal';
import { RequesterBottomNav } from '../../../shared/requester-bottom-nav';
import { RequesterFlowBar, RequesterFlowStep } from '../../../shared/requester-flow-bar';
import { LocalGoApiService } from '../../../core/localgo-api.service';
import { AppointmentDetail, BidItem, ServiceRequestDetail } from '../../../core/models';
import { SessionStateService } from '../../../core/session-state.service';
import { AuthService } from '../../../core/auth.service';
import { apiErrorMessage } from '../../../core/api-error.util';
import { appointmentStatusLabel, requestStatusLabel } from '../../../shared/status-labels';
import {
  defaultAppointmentDatetimeLocal,
  formatScheduledAt,
  toDatetimeLocal,
} from '../../../shared/datetime.util';
import { resolveRequesterRequestId } from '../../../shared/requester-request-flow';
import { redirectProviderFromRequesterRoute } from '../../../shared/requester-deep-link-guard';

@Component({
  selector: 'app-appointment-page',
  imports: [PageShell, RequesterBottomNav, RequesterFlowBar, LocationPickerModal],
  templateUrl: './appointment.html',
})
export class AppointmentPage implements OnInit {
  protected readonly request = signal<ServiceRequestDetail | null>(null);
  protected readonly appointment = signal<AppointmentDetail | null>(null);
  protected readonly selectedBid = signal<BidItem | null>(null);
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
  protected readonly formatScheduledAt = formatScheduledAt;
  protected readonly appointmentStatusLabel = appointmentStatusLabel;
  protected readonly statusLabel = requestStatusLabel;

  private readonly api = inject(LocalGoApiService);
  private readonly session = inject(SessionStateService);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  async ngOnInit(): Promise<void> {
    const queryRequestId = this.route.snapshot.queryParamMap.get('requestId');
    if (queryRequestId) {
      const redirected = await redirectProviderFromRequesterRoute(
        this.api,
        this.auth,
        this.router,
        queryRequestId,
      );
      if (redirected) {
        return;
      }
    }

    const requestId = await resolveRequesterRequestId(this.api, this.session, {
      queryRequestId,
      strategy: 'appointment',
    });
    if (!requestId) {
      this.error.set('ยังไม่มีงานที่จะนัดหมาย โปรดประกาศงานก่อน');
      this.loading.set(false);
      return;
    }
    await this.loadRequestState(requestId);
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
    if (this.saving() || this.hasActiveAppointment() || this.isReadOnly()) {
      return;
    }
    const requestId = this.request()?.id ?? this.session.requesterRequestId ?? null;
    if (!requestId) {
      this.error.set('ไม่พบงานที่จะนัดหมาย');
      return;
    }
    this.saving.set(true);
    this.error.set(null);
    this.success.set(null);
    try {
      const detail = this.request();
      const bid = this.selectedBid();
      if (!detail) {
        this.error.set('โหลดข้อมูลงานไม่สำเร็จ');
        return;
      }

      if (!this.canCreateAppointment(detail)) {
        if (!bid) {
          this.error.set('ยังไม่ได้เลือกผู้ให้บริการ กรุณาไปที่หน้าข้อเสนอ');
          return;
        }
        if (bid.status === 'Rejected' || bid.status === 'Withdrawn') {
          this.error.set('ข้อเสนอนี้ใช้ไม่ได้แล้ว กรุณาเลือกข้อเสนออื่น');
          return;
        }
        if (bid.status === 'Submitted' || bid.status === 'Selected') {
          await firstValueFrom(this.api.selectBid(requestId, bid.id));
        } else {
          this.error.set('ยังไม่ได้เลือกผู้ให้บริการ กรุณาไปที่หน้าข้อเสนอ');
          return;
        }
      }

      await firstValueFrom(
        this.api.createAppointment(requestId, {
          scheduledAt: this.scheduledAt() ? new Date(this.scheduledAt()).toISOString() : undefined,
          addressText: this.addressText().trim() || undefined,
          latitude: this.mapLat() ?? undefined,
          longitude: this.mapLng() ?? undefined,
          note: this.note().trim() || undefined,
        }),
      );
      this.success.set('บันทึกนัดหมายแล้ว ระบบจะแจ้งผู้ให้บริการให้ทราบ');
      await this.loadRequestState(requestId);
    } catch (e) {
      this.error.set(apiErrorMessage(e, 'ยืนยันนัดหมายไม่สำเร็จ'));
    } finally {
      this.saving.set(false);
    }
  }

  protected async cancelAppointment(): Promise<void> {
    const existing = this.appointment();
    if (!existing || this.saving() || !this.canCancelAppointment()) {
      return;
    }
    if (!confirm('ต้องการยกเลิกนัดหมายใช่หรือไม่?')) {
      return;
    }
    this.saving.set(true);
    this.error.set(null);
    this.success.set(null);
    try {
      await firstValueFrom(this.api.updateAppointmentStatus(existing.id, 'Cancelled'));
      this.success.set('ยกเลิกนัดหมายแล้ว คุณสามารถนัดหมายใหม่ได้');
      const requestId = this.request()?.id ?? this.session.requesterRequestId;
      if (requestId) {
        await this.loadRequestState(requestId);
      }
    } catch (e) {
      this.error.set(apiErrorMessage(e, 'ยกเลิกนัดหมายไม่สำเร็จ'));
    } finally {
      this.saving.set(false);
    }
  }

  protected async goToBids(): Promise<void> {
    await this.router.navigateByUrl('/requester/bids');
  }

  protected canClearBidSelection(): boolean {
    const detail = this.request();
    if (!detail || detail.source === 'DirectBooking' || this.isReadOnly()) {
      return false;
    }
    if (!detail.selectedBidId) {
      return false;
    }
    if (detail.status !== 'ProviderSelected' && detail.status !== 'Scheduled') {
      return false;
    }
    const appt = this.appointment();
    if (!appt) {
      return true;
    }
    return appt.status === 'Pending';
  }

  protected async clearBidSelection(): Promise<void> {
    const requestId = this.request()?.id ?? this.session.requesterRequestId ?? null;
    if (!requestId || !this.canClearBidSelection() || this.saving()) {
      return;
    }
    if (!confirm('ยกเลิกการเลือกข้อเสนอและกลับไปเลือกใหม่?')) {
      return;
    }
    this.saving.set(true);
    this.error.set(null);
    this.success.set(null);
    try {
      await firstValueFrom(this.api.clearBidSelection(requestId));
      this.success.set('ยกเลิกการเลือกแล้ว');
      await this.router.navigateByUrl('/requester/bids');
    } catch (e) {
      this.error.set(apiErrorMessage(e, 'ยกเลิกการเลือกไม่สำเร็จ'));
    } finally {
      this.saving.set(false);
    }
  }

  protected async reload(): Promise<void> {
    const requestId = this.request()?.id ?? this.session.requesterRequestId;
    if (!requestId || this.saving()) {
      return;
    }
    await this.loadRequestState(requestId);
  }

  protected async goToReview(): Promise<void> {
    const requestId = this.request()?.id ?? this.session.requesterRequestId;
    if (requestId) {
      this.session.requesterRequestId = requestId;
    }
    const providerId = this.selectedBid()?.providerId ?? this.request()?.selectedProviderId;
    if (providerId) {
      this.session.currentProviderId = providerId;
    }
    await this.router.navigate(['/requester/review'], {
      queryParams: requestId ? { requestId } : undefined,
    });
  }

  protected get needsBidSelection(): boolean {
    const detail = this.request();
    if (!detail || this.hasActiveAppointment() || this.isReadOnly()) {
      return false;
    }
    return !this.canCreateAppointment(detail);
  }

  protected get canConfirm(): boolean {
    if (this.saving() || this.hasActiveAppointment() || this.isReadOnly()) {
      return false;
    }
    const detail = this.request();
    if (!detail) {
      return false;
    }
    if (this.canCreateAppointment(detail)) {
      return true;
    }
    return !!this.selectedBid();
  }

  protected hasActiveAppointment(): boolean {
    const appt = this.appointment();
    if (!appt) {
      return false;
    }
    return (
      appt.status === 'Pending' ||
      appt.status === 'Confirmed' ||
      appt.status === 'InProgress' ||
      appt.status === 'Completed'
    );
  }

  protected isReadOnly(): boolean {
    const detail = this.request();
    const appt = this.appointment();
    if (detail?.status === 'InProgress' || detail?.status === 'Completed') {
      return true;
    }
    return appt?.status === 'InProgress' || appt?.status === 'Completed';
  }

  protected canCancelAppointment(): boolean {
    const appt = this.appointment();
    if (!appt) {
      return false;
    }
    return appt.status === 'Pending' || appt.status === 'Confirmed';
  }

  protected canSubmitReview(): boolean {
    return this.request()?.status === 'Completed';
  }

  protected showReviewAction(): boolean {
    if (this.canSubmitReview()) {
      return true;
    }
    const detail = this.request();
    const appt = this.appointment();
    return detail?.status === 'InProgress' || appt?.status === 'InProgress';
  }

  protected isDirectBooking(): boolean {
    return this.request()?.source === 'DirectBooking';
  }

  protected flowUnlockedThrough(): RequesterFlowStep | null {
    if (this.isDirectBooking()) {
      return null;
    }
    if (this.showReviewAction()) {
      return 'review';
    }
    return 'appointment';
  }

  protected appointmentStatusHint(status: string | undefined): string | null {
    if (status === 'Pending') {
      return 'รอผู้ให้บริการยืนยันนัด';
    }
    if (status === 'Confirmed') {
      return 'ผู้ให้บริการยืนยันนัดแล้ว — รอเริ่มงาน';
    }
    if (status === 'InProgress') {
      return 'ผู้ให้บริการกำลังดำเนินงาน';
    }
    if (status === 'Completed') {
      return 'งานเสร็จแล้ว — ให้คะแนนและรีวิวได้';
    }
    return null;
  }

  protected get locationFromPost(): boolean {
    const detail = this.request();
    if (!detail) {
      return false;
    }
    return (
      !!detail.addressText?.trim() ||
      (typeof detail.latitude === 'number' && typeof detail.longitude === 'number')
    );
  }

  private async loadRequestState(requestId: string): Promise<void> {
    this.loading.set(true);
    this.error.set(null);
    try {
      const detail = await firstValueFrom(this.api.getRequest(requestId));
      this.request.set(detail);
      this.session.requesterRequestId = detail.id;
      const existing = await firstValueFrom(this.api.getAppointment(requestId));
      this.appointment.set(existing);
      const bids = detail.bids ?? (await firstValueFrom(this.api.listBids(requestId)));
      const bid = this.resolveBid(bids, detail);
      this.selectedBid.set(bid);
      if (bid) {
        this.session.currentProviderId = bid.providerId;
      } else if (detail.selectedProviderId) {
        this.session.currentProviderId = detail.selectedProviderId;
      }
      if (existing) {
        this.applyAppointmentFields(existing);
      } else {
        this.scheduledAt.set(defaultAppointmentDatetimeLocal());
        this.applyRequestLocation(detail);
      }
    } catch (e) {
      this.error.set(apiErrorMessage(e, 'โหลดข้อมูลนัดหมายไม่สำเร็จ'));
    } finally {
      this.loading.set(false);
    }
  }

  private applyAppointmentFields(existing: AppointmentDetail): void {
    if (existing.scheduledAt) {
      this.scheduledAt.set(toDatetimeLocal(new Date(existing.scheduledAt)));
    }
    if (existing.addressText?.trim()) {
      this.addressText.set(existing.addressText.trim());
    }
    if (existing.note?.trim()) {
      this.note.set(existing.note.trim());
    }
    if (typeof existing.latitude === 'number' && typeof existing.longitude === 'number') {
      this.mapLat.set(existing.latitude);
      this.mapLng.set(existing.longitude);
    }
  }

  private resolveBid(bids: BidItem[], detail: ServiceRequestDetail): BidItem | null {
    if (!bids.length) {
      return null;
    }
    const byId = detail.selectedBidId
      ? bids.find((b) => b.id === detail.selectedBidId)
      : undefined;
    if (byId && byId.status !== 'Withdrawn') {
      return byId;
    }
    const selected = bids.find((b) => b.status === 'Selected');
    if (selected) {
      return selected;
    }
    return (
      bids.find((b) => b.providerId === this.session.currentProviderId && b.status === 'Submitted') ??
      bids.find((b) => b.status === 'Submitted') ??
      null
    );
  }

  private canCreateAppointment(detail: ServiceRequestDetail | null): boolean {
    if (!detail) {
      return false;
    }
    if (detail.selectedProviderId) {
      return true;
    }
    return (
      detail.status === 'ProviderSelected' ||
      detail.status === 'Selected' ||
      detail.status === 'Scheduled'
    );
  }

  private applyRequestLocation(detail: ServiceRequestDetail): void {
    const fromPost = detail.addressText?.trim();
    this.addressText.set(
      fromPost || detail.description?.trim()?.slice(0, 120) || 'จุดรับงานตามประกาศ',
    );
    if (typeof detail.latitude === 'number' && typeof detail.longitude === 'number') {
      this.mapLat.set(detail.latitude);
      this.mapLng.set(detail.longitude);
    }
  }
}
