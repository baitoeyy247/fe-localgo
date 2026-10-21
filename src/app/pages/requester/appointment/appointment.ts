import { Component, OnDestroy, OnInit, inject, signal, viewChild } from '@angular/core';
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
import { MarketplaceCacheService } from '../../../core/marketplace-cache.service';
import { ToastService } from '../../../core/toast.service';
import { apiErrorMessage } from '../../../core/api-error.util';
import {
  appointmentStatusLabel,
  displayRequestStatusLabel,
  isTerminalAppointment,
} from '../../../shared/status-labels';
import { SlowLoadHint } from '../../../shared/load-state';
import { UserLocationService } from '../../../core/user-location.service';
import { ErrorState } from '../../../shared/ui/error-state';
import { SkeletonCard } from '../../../shared/ui/skeleton-card';
import { ConfirmSheet } from '../../../shared/ui/confirm-sheet';
import { formatScheduledAt, toDatetimeLocal } from '../../../shared/datetime.util';
import { resolveRequesterRequestId } from '../../../shared/requester-request-flow';
import { redirectProviderFromRequesterRoute } from '../../../shared/requester-deep-link-guard';
import { ThaiDatetimeField } from '../../../shared/ui/thai-datetime-field';
import { scrollToFirstError } from '../../../shared/scroll-to-first-error';
import { formatPrice } from '../../../shared/format-price';

@Component({
  selector: 'app-appointment-page',
  imports: [
    PageShell,
    RequesterBottomNav,
    RequesterFlowBar,
    LocationPickerModal,
    ErrorState,
    SkeletonCard,
    ConfirmSheet,
    ThaiDatetimeField,
  ],
  templateUrl: './appointment.html',
})
export class AppointmentPage implements OnInit, OnDestroy {
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
  protected readonly formatPrice = formatPrice;
  protected readonly appointmentStatusLabel = appointmentStatusLabel;
  protected readonly loadError = signal<string | null>(null);
  protected readonly confirmCancelOpen = signal(false);
  protected readonly confirmClearOpen = signal(false);
  protected readonly hint = new SlowLoadHint();

  protected statusLabel(status: string): string {
    return displayRequestStatusLabel(status, this.appointment()?.status);
  }

  private readonly api = inject(LocalGoApiService);
  private readonly session = inject(SessionStateService);
  private readonly auth = inject(AuthService);
  private readonly cache = inject(MarketplaceCacheService);
  private readonly toast = inject(ToastService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly datetimeField = viewChild(ThaiDatetimeField);
  private readonly userLocation = inject(UserLocationService);

  ngOnDestroy(): void {
    this.hint.end();
  }

  protected async retryLoad(): Promise<void> {
    const requestId = this.request()?.id ?? this.session.requesterRequestId;
    if (requestId) {
      await this.loadRequestState(requestId);
    } else {
      this.loading.set(true);
      await this.ngOnInit();
    }
  }

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
    const dt = this.datetimeField();
    dt?.markTouched();
    if (dt && !dt.isValid()) {
      this.error.set('กรุณาเลือกวันและเวลาในอนาคต');
      scrollToFirstError();
      return;
    }
    const requestId = this.request()?.id ?? this.session.requesterRequestId ?? null;
    if (!requestId) {
      this.error.set('ไม่พบงานที่จะนัดหมาย');
      scrollToFirstError();
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
        this.success.set(null);
        scrollToFirstError();
        return;
      }

      if (!this.canCreateAppointment(detail)) {
        if (!bid) {
          this.error.set('ยังไม่ได้เลือกผู้ให้บริการ กรุณาไปที่หน้าข้อเสนอ');
          this.success.set(null);
          scrollToFirstError();
          return;
        }
        if (bid.status === 'Rejected' || bid.status === 'Withdrawn') {
          this.error.set('ข้อเสนอนี้ใช้ไม่ได้แล้ว กรุณาเลือกข้อเสนออื่น');
          this.success.set(null);
          scrollToFirstError();
          return;
        }
        if (bid.status === 'Submitted' || bid.status === 'Selected') {
          await firstValueFrom(this.api.selectBid(requestId, bid.id));
        } else {
          this.error.set('ยังไม่ได้เลือกผู้ให้บริการ กรุณาไปที่หน้าข้อเสนอ');
          this.success.set(null);
          scrollToFirstError();
          return;
        }
      }

      const created = await firstValueFrom(
        this.api.createAppointment(requestId, {
          scheduledAt: this.scheduledAt() ? new Date(this.scheduledAt()).toISOString() : undefined,
          addressText: this.addressText().trim() || undefined,
          latitude: this.mapLat() ?? undefined,
          longitude: this.mapLng() ?? undefined,
          note: this.note().trim() || undefined,
        }),
      );
      this.appointment.set(created);
      this.cache.invalidateAll();
      this.toast.show('บันทึกนัดหมายแล้ว — รอผู้ให้บริการยืนยัน');
      void this.loadRequestState(requestId);
    } catch (e) {
      this.success.set(null);
      this.error.set(apiErrorMessage(e, 'ยืนยันนัดหมายไม่สำเร็จ'));
      scrollToFirstError();
    } finally {
      this.saving.set(false);
    }
  }

  protected async cancelAppointment(): Promise<void> {
    const existing = this.appointment();
    if (!existing || this.saving() || !this.canCancelAppointment()) {
      return;
    }
    this.saving.set(true);
    this.error.set(null);
    this.confirmCancelOpen.set(false);
    // Optimistic: reflect cancelled immediately so all labels update on refresh path.
    this.appointment.set({ ...existing, status: 'Cancelled' });
    const req = this.request();
    if (req) {
      this.request.set({ ...req, status: 'Cancelled' });
    }
    this.toast.show('ยกเลิกนัดหมายแล้ว');
    try {
      await firstValueFrom(this.api.updateAppointmentStatus(existing.id, 'Cancelled'));
      this.cache.invalidateAll();
      const requestId = this.request()?.id ?? this.session.requesterRequestId;
      if (requestId) {
        await this.loadRequestState(requestId);
      }
    } catch (e) {
      this.appointment.set(existing);
      if (req) {
        this.request.set(req);
      }
      this.error.set(apiErrorMessage(e, 'ยกเลิกนัดหมายไม่สำเร็จ'));
      scrollToFirstError();
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
    this.saving.set(true);
    this.error.set(null);
    this.success.set(null);
    try {
      await firstValueFrom(this.api.clearBidSelection(requestId));
      this.success.set('ยกเลิกการเลือกแล้ว');
      await this.router.navigateByUrl('/requester/bids');
    } catch (e) {
      this.error.set(apiErrorMessage(e, 'ยกเลิกการเลือกไม่สำเร็จ'));
      scrollToFirstError();
    } finally {
      this.confirmClearOpen.set(false);
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

  protected showCancelAction(): boolean {
    return this.canCancelAppointment() || this.canClearBidSelection();
  }

  protected cancelActionLabel(): string {
    if (this.canCancelAppointment()) {
      return 'ยกเลิกนัดหมาย';
    }
    return 'ยกเลิกการเลือกข้อเสนอ';
  }

  protected openCancelDialog(): void {
    if (this.canCancelAppointment()) {
      this.confirmCancelOpen.set(true);
      return;
    }
    if (this.canClearBidSelection()) {
      this.confirmClearOpen.set(true);
    }
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
    if (status === 'Cancelled') {
      return 'ยกเลิกแล้ว';
    }
    if (status === 'Rejected') {
      return 'ผู้ให้บริการปฏิเสธ — เลือกผู้ให้บริการรายอื่นหรือจองใหม่ได้';
    }
    return null;
  }

  protected isTerminal(): boolean {
    return isTerminalAppointment(this.appointment()?.status) || this.request()?.status === 'Cancelled';
  }

  protected showRejectedActions(): boolean {
    return this.appointment()?.status === 'Rejected';
  }

  protected rejectReason(): string | null {
    const appt = this.appointment();
    if (!appt || appt.status !== 'Rejected') {
      return null;
    }
    const direct = appt.declineReason?.trim();
    if (direct) {
      return direct;
    }
    // Legacy notes that still embed the decline text.
    const note = appt.note?.trim();
    if (!note) {
      return null;
    }
    const marker = 'เหตุผลที่ปฏิเสธ:';
    const idx = note.lastIndexOf(marker);
    return idx >= 0 ? note.slice(idx + marker.length).trim() || null : null;
  }

  protected customerNote(): string | null {
    const appt = this.appointment();
    if (!appt) {
      return null;
    }
    const note = appt.note?.trim();
    if (!note) {
      return null;
    }
    if (appt.status === 'Rejected' && note.includes('เหตุผลที่ปฏิเสธ:')) {
      const cleaned = note.replace(/\n?เหตุผลที่ปฏิเสธ:[\s\S]*$/u, '').trim();
      return cleaned || null;
    }
    return note;
  }

  protected async goBookOtherProvider(): Promise<void> {
    this.session.clearRequesterFlow();
    if (this.isDirectBooking()) {
      await this.router.navigateByUrl('/requester/search');
      return;
    }
    await this.router.navigateByUrl('/requester/bids');
  }

  protected async goNewAppointment(): Promise<void> {
    this.session.clearRequesterFlow();
    if (this.isDirectBooking()) {
      await this.router.navigateByUrl('/requester/search');
      return;
    }
    await this.router.navigateByUrl('/requester/post');
  }

  protected async goRebook(): Promise<void> {
    await this.goBookOtherProvider();
  }

  protected statusHeadline(): string | null {
    const st = this.request()?.status;
    return st ? displayRequestStatusLabel(st, this.appointment()?.status) : null;
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
    this.loadError.set(null);
    this.hint.begin();
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
        this.scheduledAt.set('');
        this.applyRequestLocation(detail);
      }
    } catch (e) {
      this.loadError.set(apiErrorMessage(e, 'โหลดข้อมูลนัดหมายไม่สำเร็จ'));
    } finally {
      this.hint.end();
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
      return;
    }
    const last = this.userLocation.getLastArea();
    if (last) {
      this.mapLat.set(last.lat);
      this.mapLng.set(last.lng);
      if (!fromPost) {
        this.addressText.set(last.title);
      }
    }
  }

  protected pickerLat(): number {
    return this.mapLat() ?? this.userLocation.getLastArea()?.lat ?? 0;
  }

  protected pickerLng(): number {
    return this.mapLng() ?? this.userLocation.getLastArea()?.lng ?? 0;
  }
}
