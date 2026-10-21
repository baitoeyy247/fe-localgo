import { Component, OnDestroy, OnInit, inject, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { catchError, firstValueFrom, of } from 'rxjs';
import { PageShell } from '../../../demo/page-shell';
import { ProviderBottomNav } from '../../../shared/provider-bottom-nav';
import { LocalGoApiService } from '../../../core/localgo-api.service';
import { AppointmentDetail, BidItem, ProviderDetail, ServiceRequestDetail } from '../../../core/models';
import { SessionStateService } from '../../../core/session-state.service';
import {
  appointmentStatusLabel,
  bidStatusLabel,
  displayRequestStatusLabel,
  isTerminalAppointment,
} from '../../../shared/status-labels';
import { apiErrorMessage } from '../../../core/api-error.util';
import { formatScheduledAt } from '../../../shared/datetime.util';
import { SlowLoadHint, isNotFoundError } from '../../../shared/load-state';
import { ErrorState } from '../../../shared/ui/error-state';
import { NotFoundState } from '../../../shared/ui/not-found-state';
import { SkeletonCard } from '../../../shared/ui/skeleton-card';
import { ConfirmSheet } from '../../../shared/ui/confirm-sheet';
import { formatPrice } from '../../../shared/format-price';
import { scrollToFirstError } from '../../../shared/scroll-to-first-error';
import { AuthService } from '../../../core/auth.service';
import { MarketplaceCacheService } from '../../../core/marketplace-cache.service';
import { ToastService } from '../../../core/toast.service';
import { formatDistanceMeters, haversineMeters } from '../../../shared/geo-distance';
import { UserLocationService } from '../../../core/user-location.service';
import { canStartJobAt } from '../../../shared/appointment-start-window';
import { GLOSSARY } from '../../../shared/glossary';

@Component({
  selector: 'app-provider-request-detail-page',
  imports: [
    PageShell,
    ProviderBottomNav,
    ErrorState,
    NotFoundState,
    SkeletonCard,
    ConfirmSheet,
  ],
  templateUrl: './request-detail.html',
})
export class ProviderRequestDetailPage implements OnInit, OnDestroy {
  protected readonly GLOSSARY = GLOSSARY;
  protected readonly request = signal<ServiceRequestDetail | null>(null);
  protected readonly myBid = signal<BidItem | null>(null);
  protected readonly myProvider = signal<ProviderDetail | null>(null);
  protected readonly appointment = signal<AppointmentDetail | null>(null);
  protected readonly appointmentLoading = signal(false);
  protected readonly appointmentError = signal<string | null>(null);
  protected readonly loading = signal(true);
  protected readonly acting = signal(false);
  protected readonly actingLabel = signal('กำลังบันทึก…');
  protected readonly error = signal<string | null>(null);
  protected readonly notice = signal<string | null>(null);
  protected readonly notFound = signal(false);
  protected readonly withdrawOpen = signal(false);
  protected readonly advanceConfirmOpen = signal(false);
  protected readonly rejectOpen = signal(false);
  protected readonly distanceMeters = signal<number | null>(null);
  protected readonly categoryBlocked = signal<string | null>(null);
  protected readonly hint = new SlowLoadHint();

  protected readonly formatPrice = formatPrice;

  private advanceConfirmConfig: {
    status: 'Confirmed' | 'InProgress' | 'Completed';
    allowed: () => boolean;
    busyLabel: string;
    notice: string;
    errorFallback: string;
  } | null = null;

  protected statusLabel(status: string): string {
    return displayRequestStatusLabel(status, this.effectiveAppointmentStatus());
  }

  /** Single status chip on the page header. */
  protected pageStatusLabel(): string {
    const appt = this.appointment();
    if (this.showAppointmentSection() && appt) {
      return this.appointmentStatusLabel(appt.status);
    }
    const r = this.request();
    return r ? this.statusLabel(r.status) : '';
  }

  protected appointmentActionHint(): string | null {
    const appt = this.appointment();
    if (!appt || this.isTerminal()) {
      return null;
    }
    if (appt.status === 'Pending') {
      return 'รอคุณยืนยันนัด';
    }
    if (appt.status === 'Confirmed') {
      return this.startWindowHint() ?? 'กดเริ่มงานเมื่อถึงเวลานัด';
    }
    if (appt.status === 'InProgress') {
      return 'กำลังดำเนินงาน — กดเมื่องานเสร็จ';
    }
    if (appt.status === 'Completed') {
      return 'งานเสร็จแล้ว';
    }
    return null;
  }

  protected effectiveAppointmentStatus(): string | null | undefined {
    return this.appointment()?.status ?? this.request()?.appointmentStatus ?? null;
  }

  private needsAppointmentFetch(
    detail: ServiceRequestDetail,
    myProvider: ProviderDetail | null,
  ): boolean {
    return (
      detail.selectedProviderId === myProvider?.id ||
      detail.status === 'Scheduled' ||
      detail.status === 'ProviderSelected' ||
      detail.status === 'InProgress'
    );
  }
  protected readonly bidStatusLabel = bidStatusLabel;
  protected readonly appointmentStatusLabel = appointmentStatusLabel;
  protected readonly formatScheduledAt = formatScheduledAt;

  private readonly route = inject(ActivatedRoute);
  private readonly api = inject(LocalGoApiService);
  private readonly session = inject(SessionStateService);
  private readonly router = inject(Router);
  private readonly auth = inject(AuthService);
  private readonly userLocation = inject(UserLocationService);
  private readonly cache = inject(MarketplaceCacheService);
  private readonly toast = inject(ToastService);

  async ngOnInit(): Promise<void> {
    const navState = this.router.getCurrentNavigation()?.extras.state as { notice?: string } | undefined;
    if (typeof navState?.notice === 'string' && navState.notice.trim()) {
      this.notice.set(navState.notice);
    }
    await this.load();
  }

  ngOnDestroy(): void {
    this.hint.end();
  }

  protected async load(): Promise<void> {
    const id = this.route.snapshot.paramMap.get('id');
    if (!id) {
      this.notFound.set(true);
      this.loading.set(false);
      return;
    }
    this.session.providerRequestId = id;
    this.loading.set(true);
    this.error.set(null);
    this.notFound.set(false);
    this.categoryBlocked.set(null);
    this.hint.begin();
    try {
      const [detail, myProvider] = await Promise.all([
        firstValueFrom(this.api.getRequest(id)),
        firstValueFrom(
          this.cache
            .getMyProvider()
            .pipe(catchError((err) => (isNotFoundError(err) ? of(null as ProviderDetail | null) : Promise.reject(err)))),
        ),
      ]);
      this.request.set(detail);
      const needsBidAccess =
        (detail.status === 'Open' || detail.status === 'HasOffers') &&
        detail.source !== 'DirectBooking' &&
        !detail.bids?.some(
          (b) => b.providerId === myProvider?.id && b.status !== 'Withdrawn',
        ) &&
        detail.selectedProviderId !== myProvider?.id;
      if (needsBidAccess) {
        try {
          const bidAccess = await firstValueFrom(this.api.getBidFormAccess(id));
          if (!bidAccess.allowed) {
            const msg = bidAccess.reason?.trim() || 'งานนี้ไม่ตรงกับบริการของคุณ';
            this.categoryBlocked.set(
              bidAccess.reasonCode === 'CATEGORY_MISMATCH' || msg.includes('ไม่ตรง')
                ? 'งานนี้ไม่ตรงกับบริการของคุณ'
                : msg,
            );
          }
        } catch (e) {
          if (isNotFoundError(e)) {
            this.categoryBlocked.set('งานนี้ไม่ตรงกับบริการของคุณ');
          }
        }
      }
      this.myProvider.set(myProvider);
      let appt = detail.appointment ?? null;
      if (!appt && (detail.appointmentStatus || this.needsAppointmentFetch(detail, myProvider))) {
        appt = await firstValueFrom(
          this.api.getAppointment(id).pipe(catchError(() => of(null as AppointmentDetail | null))),
        );
      }
      this.appointment.set(appt);
      this.myBid.set(
        myProvider ? (detail.bids?.find((bid) => bid.providerId === myProvider.id) ?? null) : null,
      );
      let meters: number | null = null;
      if (detail.latitude != null && detail.longitude != null && myProvider) {
        const branch =
          myProvider.branches.find((b) => b.isActive) ?? myProvider.branches[0] ?? null;
        if (branch) {
          meters = haversineMeters(
            branch.latitude,
            branch.longitude,
            detail.latitude,
            detail.longitude,
          );
        }
      }
      this.distanceMeters.set(meters);
    } catch (e) {
      if (isNotFoundError(e)) {
        this.request.set(null);
        this.notFound.set(true);
      } else {
        this.error.set(apiErrorMessage(e, 'โหลดรายละเอียดไม่สำเร็จ'));
      }
    } finally {
      this.hint.end();
      this.loading.set(false);
    }
  }

  private async loadAppointment(requestId: string): Promise<void> {
    this.appointmentLoading.set(true);
    this.appointmentError.set(null);
    try {
      const appt = await firstValueFrom(this.api.getAppointment(requestId));
      this.appointment.set(appt);
      if (!appt && this.request()?.status === 'Scheduled') {
        this.appointmentError.set('ยังโหลดรายละเอียดนัดไม่พบ — ลองรีเฟรชหรือติดต่อลูกค้า');
      }
    } catch (e) {
      this.appointment.set(null);
      this.appointmentError.set(apiErrorMessage(e, 'โหลดนัดหมายไม่สำเร็จ'));
    } finally {
      this.appointmentLoading.set(false);
    }
  }

  protected async reloadAppointment(): Promise<void> {
    const id = this.request()?.id;
    if (id) {
      await this.loadAppointment(id);
    }
  }

  protected async submitBid(): Promise<void> {
    const id = this.request()?.id;
    if (!id) {
      return;
    }
    this.session.providerRequestId = id;
    await this.router.navigate(['/provider/bid'], { queryParams: { requestId: id } });
  }

  protected async withdrawMyBid(): Promise<void> {
    const bid = this.myBid();
    if (!bid || !this.canWithdrawBid() || this.acting()) {
      return;
    }
    this.acting.set(true);
    this.actingLabel.set('กำลังถอนข้อเสนอ…');
    try {
      await firstValueFrom(this.api.withdrawBid(bid.id));
      this.toast.show('ถอนข้อเสนอแล้ว');
      await this.load();
    } catch (e) {
      this.error.set(apiErrorMessage(e, 'ถอนข้อเสนอไม่สำเร็จ'));
      scrollToFirstError();
    } finally {
      this.withdrawOpen.set(false);
      this.acting.set(false);
    }
  }

  protected canWithdrawBid(): boolean {
    const bid = this.myBid();
    const request = this.request();
    if (!bid || !request) {
      return false;
    }
    const requestAllowsWithdraw = request.status === 'Open' || request.status === 'HasOffers';
    const bidAllowsWithdraw = bid.status === 'Submitted' || bid.status === 'Pending';
    return requestAllowsWithdraw && bidAllowsWithdraw;
  }

  protected canEditActiveBid(): boolean {
    const bid = this.myBid();
    const request = this.request();
    if (!bid || !request || this.isTerminal()) {
      return false;
    }
    const requestOpen = request.status === 'Open' || request.status === 'HasOffers';
    return requestOpen && (bid.status === 'Submitted' || bid.status === 'Pending');
  }

  protected canResubmitBid(): boolean {
    const bid = this.myBid();
    const request = this.request();
    if (!bid || !request) {
      return false;
    }
    const requestOpen = request.status === 'Open' || request.status === 'HasOffers';
    return requestOpen && bid.status === 'Withdrawn';
  }

  protected hasActiveEngagement(
    request: ServiceRequestDetail | null = this.request(),
    providerId: string | null = this.myProvider()?.id ?? null,
  ): boolean {
    if (!request || !providerId) {
      return false;
    }
    if (request.selectedProviderId === providerId) {
      return true;
    }
    const bid = request.bids?.find((b) => b.providerId === providerId);
    return bid?.status === 'Selected';
  }

  protected showAppointmentSection(): boolean {
    if (!this.hasActiveEngagement()) {
      return false;
    }
    return !!this.appointment() || !!this.request()?.appointmentStatus;
  }

  protected isTerminal(): boolean {
    return isTerminalAppointment(this.effectiveAppointmentStatus());
  }

  protected isOpenForBids(): boolean {
    const r = this.request();
    return !!r && (r.status === 'Open' || r.status === 'HasOffers');
  }

  protected canOfferNewBid(): boolean {
    if (this.categoryBlocked() || this.isTerminal() || this.hasActiveEngagement()) {
      return false;
    }
    if (!this.isOpenForBids()) {
      return false;
    }
    const bid = this.myBid();
    if (!bid) {
      return true;
    }
    return bid.status === 'Withdrawn';
  }

  protected goBackToJobs(): void {
    void this.router.navigateByUrl('/provider/requests');
  }

  protected canConfirmAppointment(): boolean {
    const appt = this.appointment();
    return this.hasActiveEngagement() && appt?.status === 'Pending' && !this.isTerminal();
  }

  protected canRejectAppointment(): boolean {
    return this.canConfirmAppointment();
  }

  protected canStartJob(): boolean {
    const appt = this.appointment();
    return (
      this.hasActiveEngagement() &&
      appt?.status === 'Confirmed' &&
      this.isWithinAppointmentWindow()
    );
  }

  protected canCompleteJob(): boolean {
    const appt = this.appointment();
    return (
      this.hasActiveEngagement() &&
      appt?.status === 'InProgress' &&
      this.isWithinAppointmentWindow()
    );
  }

  /** Matches backend: start/complete allowed from 30 minutes before scheduledAt. */
  protected isWithinAppointmentWindow(): boolean {
    return canStartJobAt(this.appointment()?.scheduledAt);
  }

  protected startWindowHint(): string | null {
    const appt = this.appointment();
    if (!appt || appt.status !== 'Confirmed' || this.isWithinAppointmentWindow()) {
      return null;
    }
    const when = formatScheduledAt(appt.scheduledAt);
    return `เริ่มงานได้ตั้งแต่ ${when}`;
  }

  protected locationLine(r: ServiceRequestDetail): string {
    const text = r.addressText?.trim();
    if (text) {
      return text;
    }
    if (typeof r.latitude === 'number' && typeof r.longitude === 'number') {
      return `${r.latitude.toFixed(5)}, ${r.longitude.toFixed(5)}`;
    }
    return 'ยังไม่ระบุสถานที่';
  }

  protected distanceLine(): string | null {
    const meters = this.distanceMeters();
    if (meters == null) {
      return null;
    }
    return formatDistanceMeters(meters);
  }

  protected searchRadiusKm(r: ServiceRequestDetail): string {
    return (r.searchRadiusMeters / 1000).toFixed(0);
  }

  protected rejectReason(appt: AppointmentDetail): string | null {
    const direct = appt.declineReason?.trim();
    if (direct) {
      return direct;
    }
    const note = appt.note?.trim();
    if (!note || appt.status !== 'Rejected') {
      return null;
    }
    const marker = 'เหตุผลที่ปฏิเสธ:';
    const idx = note.lastIndexOf(marker);
    return idx >= 0 ? note.slice(idx + marker.length).trim() || null : null;
  }

  protected customerNote(appt: AppointmentDetail): string | null {
    const note = appt.note?.trim();
    if (!note) {
      return null;
    }
    if (note.includes('เหตุผลที่ปฏิเสธ:')) {
      return note.replace(/\n?เหตุผลที่ปฏิเสธ:[\s\S]*$/u, '').trim() || null;
    }
    return note;
  }

  protected async rejectAppointment(reason: string): Promise<void> {
    const appt = this.appointment();
    if (!appt || !this.canRejectAppointment() || this.acting()) {
      return;
    }
    this.acting.set(true);
    this.actingLabel.set('กำลังปฏิเสธนัด…');
    this.error.set(null);
    this.rejectOpen.set(false);
    try {
      const updated = await firstValueFrom(
        this.api.updateAppointmentStatus(appt.id, 'Rejected', reason || undefined),
      );
      this.appointment.set(updated);
      this.cache.invalidateAll();
      this.toast.show('ปฏิเสธนัดแล้ว');
      const current = this.request();
      if (current) {
        this.request.set({ ...current, appointmentStatus: updated.status });
      }
      const requestId = current?.id;
      if (requestId) {
        try {
          this.request.set(await firstValueFrom(this.api.getRequest(requestId)));
        } catch {
          /* appointment + appointmentStatus already updated */
        }
      }
    } catch (e) {
      this.appointment.set(appt);
      this.error.set(apiErrorMessage(e, 'ปฏิเสธนัดไม่สำเร็จ'));
      scrollToFirstError();
    } finally {
      this.acting.set(false);
    }
  }

  protected openConfirmAppointment(): void {
    this.openAdvanceConfirm('Confirmed', {
      allowed: () => this.canConfirmAppointment(),
      busyLabel: 'กำลังยืนยัน…',
      notice: 'ยืนยันรับนัดหมายแล้ว — กดเริ่มงานเมื่อถึงเวลานัด',
      errorFallback: 'ยืนยันนัดหมายไม่สำเร็จ',
    });
  }

  protected openStartJob(): void {
    this.openAdvanceConfirm('InProgress', {
      allowed: () => this.canStartJob(),
      busyLabel: 'กำลังเริ่มงาน…',
      notice: 'เริ่มงานแล้ว — ลูกค้าจะเห็นสถานะกำลังดำเนินงาน',
      errorFallback: 'เริ่มงานไม่สำเร็จ',
    });
  }

  protected openCompleteJob(): void {
    this.openAdvanceConfirm('Completed', {
      allowed: () => this.canCompleteJob(),
      busyLabel: 'กำลังปิดงาน…',
      notice: 'ปิดงานแล้ว — ลูกค้าสามารถให้คะแนนและรีวิวได้',
      errorFallback: 'ปิดงานไม่สำเร็จ',
    });
  }

  protected advanceConfirmTitle(): string {
    const status = this.advanceConfirmConfig?.status;
    if (status === 'Confirmed') {
      return 'ยืนยันรับนัดหมาย?';
    }
    if (status === 'InProgress') {
      return 'เริ่มงานตามนัด?';
    }
    if (status === 'Completed') {
      return 'ยืนยันว่างานเสร็จแล้ว?';
    }
    return 'ยืนยันการทำรายการ';
  }

  protected advanceConfirmMessage(): string {
    const status = this.advanceConfirmConfig?.status;
    if (status === 'Confirmed') {
      return 'ยืนยันรับนัดหมายตามวัน เวลา และสถานที่ที่ลูกค้าส่งมา';
    }
    if (status === 'InProgress') {
      return 'เริ่มงานตามนัดหมายนี้';
    }
    if (status === 'Completed') {
      return 'ลูกค้าจะสามารถให้คะแนนและรีวิวได้หลังปิดงาน';
    }
    return '';
  }

  protected async runAdvanceConfirm(): Promise<void> {
    const cfg = this.advanceConfirmConfig;
    if (!cfg) {
      return;
    }
    await this.advanceAppointment(cfg.status, cfg);
    this.advanceConfirmOpen.set(false);
    this.advanceConfirmConfig = null;
  }

  protected cancelAdvanceConfirm(): void {
    this.advanceConfirmOpen.set(false);
    this.advanceConfirmConfig = null;
  }

  private openAdvanceConfirm(
    status: 'Confirmed' | 'InProgress' | 'Completed',
    options: {
      allowed: () => boolean;
      busyLabel: string;
      notice: string;
      errorFallback: string;
    },
  ): void {
    if (!this.appointment() || !options.allowed() || this.acting()) {
      return;
    }
    this.advanceConfirmConfig = { status, ...options };
    this.advanceConfirmOpen.set(true);
  }

  private async advanceAppointment(
    status: 'Confirmed' | 'InProgress' | 'Completed',
    options: {
      allowed: () => boolean;
      busyLabel: string;
      notice: string;
      errorFallback: string;
    },
  ): Promise<void> {
    const appt = this.appointment();
    if (!appt || !options.allowed() || this.acting()) {
      return;
    }
    this.acting.set(true);
    this.actingLabel.set(options.busyLabel);
    this.error.set(null);
    this.advanceConfirmOpen.set(false);
    try {
      const updated = await firstValueFrom(this.api.updateAppointmentStatus(appt.id, status));
      this.acting.set(false);
      this.appointment.set(updated);
      this.cache.invalidateAll();
      const current = this.request();
      if (current) {
        const nextStatus =
          status === 'InProgress'
            ? 'InProgress'
            : status === 'Completed'
              ? 'Completed'
              : status === 'Confirmed'
                ? current.status
                : current.status;
        this.request.set({
          ...current,
          status: nextStatus,
          appointmentStatus: updated.status,
        });
      }
      const requestId = current?.id;
      if (requestId) {
        try {
          this.request.set(await firstValueFrom(this.api.getRequest(requestId)));
        } catch {
          /* local patch already applied */
        }
      }
      this.notice.set(null);
    } catch (e) {
      this.appointment.set(appt);
      this.error.set(apiErrorMessage(e, options.errorFallback));
      scrollToFirstError();
    } finally {
      this.acting.set(false);
    }
  }
}
