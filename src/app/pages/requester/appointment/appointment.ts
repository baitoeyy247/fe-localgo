import { Component, OnDestroy, OnInit, inject, signal, viewChild } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
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
import { GLOSSARY } from '../../../shared/glossary';
import {
  cancelAppointmentConfirmMessage,
  cancelAppointmentToast,
  destructiveSheetDismissCancelAppointment,
  formatDatetimeConfirmLine,
} from '../../../shared/confirm-copy';
import { ConfirmSaveDialog } from '../../../shared/forms/confirm-save-dialog';
import { DirtyFormGuardState } from '../../../shared/forms/dirty-form.guard';
import { UseDirtyGuard } from '../../../shared/forms/use-dirty-guard';

import { CharCounter } from '../../../shared/ui/char-counter';
import { FIELD_LIMITS, priceError, PRICE_ERROR } from '../../../shared/field-limits';

import { ActionError } from '../../../shared/ui/action-error';
@Component({
  selector: 'app-appointment-page',
  imports: [ActionError, CharCounter, 
    PageShell,
    RequesterBottomNav,
    RequesterFlowBar,
    LocationPickerModal,
    ErrorState,
    SkeletonCard,
    ConfirmSheet,
    ThaiDatetimeField,
    RouterLink,
    ConfirmSaveDialog,
  ],
  templateUrl: './appointment.html',
})
export class AppointmentPage implements OnInit, OnDestroy {
  protected readonly GLOSSARY = GLOSSARY;
  protected readonly cancelAppointmentDismissLabel = destructiveSheetDismissCancelAppointment;
  protected readonly request = signal<ServiceRequestDetail | null>(null);
  protected readonly appointment = signal<AppointmentDetail | null>(null);
  protected readonly selectedBid = signal<BidItem | null>(null);
  protected readonly scheduledAt = signal('');
  protected readonly addressText = signal('');
  protected readonly addressError = signal<string | null>(null);
  /** L-15: typed-but-incomplete date/time text (empty when value is a valid ISO). */
  private readonly scheduledRaw = signal('');
  protected readonly note = signal('');
  protected readonly saving = signal(false);
  protected readonly loading = signal(true);
  protected readonly error = signal<string | null>(null);
  protected readonly LIMITS = FIELD_LIMITS;
  protected readonly success = signal<string | null>(null);
  protected readonly pickerOpen = signal(false);
  protected readonly mapLat = signal<number | null>(null);
  protected readonly mapLng = signal<number | null>(null);
  protected readonly formatScheduledAt = formatScheduledAt;
  protected readonly formatPrice = formatPrice;
  protected readonly appointmentStatusLabel = appointmentStatusLabel;
  protected readonly loadError = signal<string | null>(null);
  /** T4-25: cancel failure → inline alert (heading + ProblemDetails.detail). */
  protected readonly cancelError = signal<string | null>(null);
  /** T4-4: no query → list of all active appointments (sorted by time). */
  protected readonly activeList = signal<{ appt: AppointmentDetail; title: string }[] | null>(null);
  protected readonly listStatusLabel = (s: string) => appointmentStatusLabel(s, 'requester');
  protected readonly listWhen = (iso?: string | null) => formatScheduledAt(iso);
  protected readonly noWork = signal(false);
  protected readonly confirmCancelOpen = signal(false);
  protected readonly confirmClearOpen = signal(false);
  protected readonly hint = new SlowLoadHint();
  protected readonly rescheduleMode = signal(false);
  protected readonly saveConfirmOpen = signal(false);
  protected readonly saveConfirmMessage = signal('');
  protected readonly discardConfirmOpen = signal(false);

  private readonly dirty = inject(DirtyFormGuardState);
  private readonly formGuard = new UseDirtyGuard(this.dirty);
  private baselineSummary: ReturnType<typeof this.formSnapshot> | null = null;

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
    const qp = this.route.snapshot.queryParamMap;
    // T4-4: ?appointmentId=X opens exactly that appointment.
    const queryAppointmentId = qp.get('appointmentId');
    if (queryAppointmentId) {
      await this.router.navigate(['/requester/appointments', queryAppointmentId], { replaceUrl: true });
      return;
    }
    if (!qp.get('requestId') && qp.get('reschedule') !== '1' && (await this.loadActiveList())) {
      return;
    }
    const queryRequestId = this.route.snapshot.queryParamMap.get('requestId');
    if (queryRequestId) {
      const redirected = await redirectProviderFromRequesterRoute(
        this.api,
        this.auth,
        this.router,
        queryRequestId,
        this.cache,
      );
      if (redirected) {
        return;
      }
    }

    let requestId: string | null;
    this.loadError.set(null);
    try {
      requestId = await resolveRequesterRequestId(this.api, this.session, {
        queryRequestId,
        strategy: 'appointment',
        cache: this.cache,
      });
    } catch (e) {
      // A5-1: GET failure must not render "ยังไม่มีงานที่จะนัดหมาย".
      this.noWork.set(false);
      this.loadError.set(apiErrorMessage(e, 'โหลดข้อมูลไม่สำเร็จ'));
      this.loading.set(false);
      return;
    }
    if (!requestId) {
      this.noWork.set(true);
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
    this.touchForm();
  }

  private formSnapshot(): {
    scheduledAt: string;
    addressText: string;
    note: string;
    lat: number | null;
    lng: number | null;
  } {
    return {
      scheduledAt: this.scheduledAt().trim() || this.scheduledRaw(),
      addressText: this.addressText().trim(),
      note: this.note().trim(),
      lat: this.mapLat(),
      lng: this.mapLng(),
    };
  }

  private captureBaseline(): void {
    const state = this.formSnapshot();
    this.formGuard.captureBaseline(state);
    this.baselineSummary = { ...state };
  }

  protected touchForm(): void {
    this.formGuard.syncDirty(this.formSnapshot());
  }

  protected hasChanges(): boolean {
    return this.formGuard.hasChanges(this.formSnapshot());
  }

  protected canRescheduleExisting(): boolean {
    const appt = this.appointment();
    return !!appt && (appt.status === 'Pending' || appt.status === 'Confirmed');
  }

  protected askSave(): void {
    // L-16b: an invalid / incomplete date never opens the confirm sheet; only the field's own error shows.
    const dtField = this.datetimeField();
    if (dtField) {
      dtField.markTouched();
      if (!dtField.isValid()) {
        this.error.set(null);
        scrollToFirstError();
        return;
      }
    }
    // F-N2: trim before validating — blank / whitespace-only address never opens the confirm sheet
    if (!this.addressText().trim()) {
      this.addressError.set('กรุณาระบุสถานที่');
      scrollToFirstError();
      return;
    }
    this.addressError.set(null);
    if (!this.hasChanges()) {
      return;
    }
    const prev = this.baselineSummary;
    const cur = this.formSnapshot();
    const lines: string[] = [];
    if (prev && prev.scheduledAt !== cur.scheduledAt) {
      lines.push(formatDatetimeConfirmLine('วันและเวลา', prev.scheduledAt, cur.scheduledAt));
    }
    if (prev && prev.addressText !== cur.addressText) {
      lines.push(`สถานที่: ${prev.addressText || '—'} → ${cur.addressText || '—'}`);
    }
    if (prev && prev.note !== cur.note) {
      lines.push('หมายเหตุ: มีการแก้ไข');
    }
    this.saveConfirmMessage.set(this.formGuard.buildSaveMessage(lines));
    this.saveConfirmOpen.set(true);
  }

  protected confirmSaveDialog(): void {
    this.saveConfirmOpen.set(false);
    void this.confirm();
  }

  protected cancelSaveDialog(): void {
    this.saveConfirmOpen.set(false);
  }

  protected cancelDiscardDialog(): void {
    this.discardConfirmOpen.set(false);
  }

  protected saveDialogTitle(): string {
    return this.rescheduleMode() ? GLOSSARY.saveChangesTitle : GLOSSARY.confirmBookAppointmentTitle;
  }

  protected saveDialogConfirmLabel(): string {
    return this.rescheduleMode() ? GLOSSARY.saveChangesConfirm : GLOSSARY.confirmBookAppointmentConfirm;
  }

  protected saveDialogCancelLabel(): string {
    return this.rescheduleMode() ? GLOSSARY.saveChangesCancel : GLOSSARY.confirmBookAppointmentCancel;
  }

  protected onScheduledAtChange(value: string): void {
    this.scheduledAt.set(value);
    // L-16c: clear any stale date error once the field is valid again.
    if (this.datetimeField()?.isValid()) {
      this.error.set(null);
    }
    this.touchForm();
  }

  protected onScheduledRawChange(raw: string): void {
    this.scheduledRaw.set(raw);
    this.touchForm();
  }

  protected updateAddressText(value: string): void {
    this.addressText.set(value);
    if (value.trim()) {
      this.addressError.set(null);
    }
    this.touchForm();
  }

  protected updateNote(value: string): void {
    this.note.set(value);
    this.touchForm();
  }

  protected async confirm(): Promise<void> {
    if (this.saving() || this.isReadOnly()) {
      return;
    }
    if (this.hasActiveAppointment() && !this.rescheduleMode()) {
      return;
    }
    const dt = this.datetimeField();
    dt?.markTouched();
    if (dt && !dt.isValid()) {
      // L-16b: the field shows the precise reason (invalid date / missing / future); no duplicate page error.
      this.error.set(null);
      scrollToFirstError();
      return;
    }
    if (!this.addressText().trim()) {
      this.addressError.set('กรุณาระบุสถานที่');
      scrollToFirstError();
      return;
    }
    const requestId = this.request()?.id ?? this.session.requesterRequestId ?? null;
    if (!requestId) {
      this.error.set('ไม่พบงานที่จะนัดหมาย');
      scrollToFirstError();
      return;
    }
    const whenPreview = this.scheduledAt().trim()
      ? formatScheduledAt(new Date(this.scheduledAt()).toISOString())
      : GLOSSARY.appointment;
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
      this.cache.invalidateAll();
      this.formGuard.markSaved(this.formSnapshot());
      this.toast.show(`บันทึกนัดหมาย ${whenPreview} แล้ว`);
      await this.router.navigate(['/requester/appointments', created.id]);
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
    const title = req?.title?.trim() || 'งาน';
    this.cancelError.set(null);
    try {
      await firstValueFrom(this.api.updateAppointmentStatus(existing.id, 'Cancelled'));
      // A5-13: success live region only after the server confirmed.
      this.toast.show(cancelAppointmentToast(existing.scheduledAt, title));
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
      this.cancelError.set(apiErrorMessage(e, 'ยกเลิกนัดหมายไม่สำเร็จ'));
      scrollToFirstError();
    } finally {
      this.saving.set(false);
    }
  }

  /** T4-4: returns true when the list view was shown. */
  private async loadActiveList(): Promise<boolean> {
    try {
      const mine = await firstValueFrom(this.cache.listMyRequests(true));
      const active = mine.filter((r) => ['Pending', 'Confirmed', 'InProgress'].includes(r.appointmentStatus ?? ''));
      if (active.length === 0) {
        return false;
      }
      const rows = await Promise.all(
        active.map(async (r) => {
          try {
            const appt = await firstValueFrom(this.api.getAppointment(r.id));
            return appt ? { appt, title: r.title } : null;
          } catch {
            return null;
          }
        }),
      );
      const list = rows
        .filter((x): x is { appt: AppointmentDetail; title: string } => !!x)
        .sort((a, b) => (a.appt.scheduledAt ?? '').localeCompare(b.appt.scheduledAt ?? ''));
      if (list.length === 0) {
        return false;
      }
      this.activeList.set(list);
      this.loading.set(false);
      return true;
    } catch {
      return false;
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

  protected hasSelectedProvider(): boolean {
    return !!(this.selectedBid() || this.request()?.selectedProviderId);
  }

  protected canEditAppointmentForm(): boolean {
    if (this.isReadOnly() || this.isTerminal()) {
      return false;
    }
    if (this.rescheduleMode() && this.canRescheduleExisting()) {
      return true;
    }
    if (this.hasActiveAppointment()) {
      return false;
    }
    if (this.needsBidSelection && !this.hasSelectedProvider()) {
      return false;
    }
    return true;
  }

  protected get canConfirm(): boolean {
    if (!this.canEditAppointmentForm() || this.saving()) {
      return false;
    }
    const detail = this.request();
    if (!detail) {
      return false;
    }
    if (this.canCreateAppointment(detail)) {
      return true;
    }
    return this.hasSelectedProvider();
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

  protected cancelAppointmentConfirmMessage(): string {
    const appt = this.appointment();
    const title = this.request()?.title?.trim() || 'งาน';
    if (!appt) {
      return 'ต้องการยกเลิกนัดหมายใช่หรือไม่';
    }
    return cancelAppointmentConfirmMessage(appt.scheduledAt, title);
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
      return 'รอผู้ให้บริการยืนยันนัดหมาย';
    }
    if (status === 'Confirmed') {
      return 'ผู้ให้บริการยืนยันนัดหมายแล้ว — รอเริ่มงาน';
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

  protected primaryStatusLine(): string | null {
    return this.statusHeadline();
  }

  protected statusHeadline(): string | null {
    const appt = this.appointment();
    const detail = this.request();
    if (!detail) {
      return null;
    }
    if (!appt && !this.hasActiveAppointment() && this.canCreateAppointment(detail)) {
      return 'ยังไม่ได้กำหนดนัดหมาย';
    }
    const st = detail.status;
    return st ? displayRequestStatusLabel(st, appt?.status) : null;
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
      const rescheduleQuery = this.route.snapshot.queryParamMap.get('reschedule') === '1';
      this.rescheduleMode.set(rescheduleQuery && this.canRescheduleExisting());
      this.captureBaseline();
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
      fromPost || detail.description?.trim()?.slice(0, 120) || GLOSSARY.jobLocationFromPost,
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
