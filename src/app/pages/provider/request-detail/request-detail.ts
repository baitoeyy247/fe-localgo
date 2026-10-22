import { Component, OnDestroy, OnInit, inject, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
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
import { formatBudgetDisplay } from '../../../shared/format-budget';
import { providerBidRowStatus } from '../../../shared/status-labels';
import { scrollToFirstError } from '../../../shared/scroll-to-first-error';
import { JOB_COMPLETED_REVIEW_NOTICE } from './request-detail.copy';
import { AuthService } from '../../../core/auth.service';
import { MarketplaceCacheService } from '../../../core/marketplace-cache.service';
import { RequestFlowCacheService } from '../../../core/request-flow-cache.service';
import { ToastService } from '../../../core/toast.service';
import { formatDistanceMeters, haversineMeters } from '../../../shared/geo-distance';
import { UserLocationService } from '../../../core/user-location.service';
import { canStartJobAt } from '../../../shared/appointment-start-window';
import { GLOSSARY } from '../../../shared/glossary';
import {
  providerCompleteJobToast,
  providerConfirmAppointmentToast,
  providerStartJobToast,
  rejectAppointmentToast,
  destructiveSheetDismissWithdrawBid,
  withdrawBidConfirmMessage,
  withdrawBidToast,
} from '../../../shared/confirm-copy';

@Component({
  selector: 'app-provider-request-detail-page',
  imports: [
    PageShell,
    ProviderBottomNav,
    ErrorState,
    NotFoundState,
    SkeletonCard,
    ConfirmSheet,
    RouterLink,
  ],
  templateUrl: './request-detail.html',
})
export class ProviderRequestDetailPage implements OnInit, OnDestroy {
  protected readonly GLOSSARY = GLOSSARY;
  protected readonly withdrawDismissLabel = destructiveSheetDismissWithdrawBid;
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
  protected readonly withdrawBusy = signal(false);
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
      return 'รอคุณยืนยันนัดหมาย';
    }
    if (appt.status === 'Confirmed') {
      return this.startWindowHint() ?? 'กดเริ่มงานเมื่อถึงเวลานัดหมาย';
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
  private readonly flowCache = inject(RequestFlowCacheService);
  private readonly toast = inject(ToastService);

  async ngOnInit(): Promise<void> {
    const navState = (this.router.getCurrentNavigation()?.extras.state ?? history.state) as {
      notice?: string;
      requestDetail?: ServiceRequestDetail;
    };
    if (typeof navState?.notice === 'string' && navState.notice.trim()) {
      this.toast.show(navState.notice.trim());
      this.notice.set(null);
    }
    if (navState?.requestDetail?.id) {
      void this.load({ background: true });
      return;
    }
    await this.load();
  }

  ngOnDestroy(): void {
    this.hint.end();
  }

  protected async load(options?: { background?: boolean }): Promise<void> {
    const id = this.route.snapshot.paramMap.get('id');
    if (!id) {
      this.notFound.set(true);
      this.loading.set(false);
      return;
    }
    this.session.providerRequestId = id;
    if (!options?.background) {
      this.loading.set(true);
    }
    this.error.set(null);
    this.notFound.set(false);
    this.categoryBlocked.set(null);
    this.hint.begin();
    try {
      const [detail, myProvider, apptFromApi, bidAccessResult] = await Promise.all([
        firstValueFrom(this.api.getRequest(id)),
        firstValueFrom(
          this.cache
            .getMyProvider()
            .pipe(catchError((err) => (isNotFoundError(err) ? of(null as ProviderDetail | null) : Promise.reject(err)))),
        ),
        firstValueFrom(
          this.api.getAppointment(id).pipe(catchError(() => of(null as AppointmentDetail | null))),
        ),
        firstValueFrom(
          this.api.getBidFormAccess(id).pipe(
            catchError(() => of({ allowed: true as const, reason: null, reasonCode: null })),
          ),
        ),
      ]);
      let blocked: string | null = null;
      const hasMyBidHistory =
        !!myProvider && !!detail.bids?.some((b) => b.providerId === myProvider.id);
      const needsBidAccess =
        (detail.status === 'Open' || detail.status === 'HasOffers') &&
        detail.source !== 'DirectBooking' &&
        !hasMyBidHistory &&
        detail.selectedProviderId !== myProvider?.id;
      if (needsBidAccess && bidAccessResult && !bidAccessResult.allowed) {
        const msg = bidAccessResult.reason?.trim() || 'งานนี้ไม่ตรงกับบริการของคุณ';
        blocked =
          bidAccessResult.reasonCode === 'CATEGORY_MISMATCH' || msg.includes('ไม่ตรง')
            ? 'งานนี้ไม่ตรงกับบริการของคุณ'
            : msg;
      }
      this.myProvider.set(myProvider);
      this.categoryBlocked.set(blocked);
      this.request.set(detail);
      this.flowCache.putRequest(detail);
      let appt = detail.appointment ?? apptFromApi;
      if (!appt && (detail.appointmentStatus || this.needsAppointmentFetch(detail, myProvider))) {
        appt = apptFromApi;
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
      const keepVisible = options?.background && !!this.request();
      if (isNotFoundError(e)) {
        if (!keepVisible) {
          this.request.set(null);
          this.notFound.set(true);
        }
      } else if (!keepVisible) {
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
        this.appointmentError.set('ยังโหลดรายละเอียดนัดหมายไม่พบ — ลองรีเฟรชหรือติดต่อลูกค้า');
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

  protected withdrawConfirmMessage(): string {
    const bid = this.myBid();
    const title = this.request()?.title?.trim() || 'งาน';
    const price = bid?.priceText?.trim() || '—';
    return withdrawBidConfirmMessage(title, price);
  }

  protected async withdrawMyBid(): Promise<void> {
    const bid = this.myBid();
    if (!bid || !this.canWithdrawBid() || this.withdrawBusy()) {
      return;
    }
    this.withdrawBusy.set(true);
    const title = this.request()?.title?.trim() || 'งาน';
    const price = bid.priceText?.trim() || '—';
    const current = this.request();
    const previousRequest = current;
    if (current) {
      const next: ServiceRequestDetail = {
        ...current,
        bids: (current.bids ?? []).map((b) =>
          b.id === bid.id ? { ...b, status: 'Withdrawn' } : b,
        ),
      };
      this.request.set(next);
      this.flowCache.putRequest(next);
      this.loading.set(false);
    }
    try {
      await firstValueFrom(this.api.withdrawBid(bid.id));
      this.withdrawOpen.set(false);
      this.cache.invalidateMatching();
      this.toast.show(withdrawBidToast(title, price));
      void this.load({ background: true });
    } catch (e) {
      if (previousRequest) {
        this.request.set(previousRequest);
        this.flowCache.putRequest(previousRequest);
      }
      const msg = apiErrorMessage(e, 'ถอนข้อเสนอไม่สำเร็จ');
      this.error.set(msg);
      this.toast.show(msg);
      scrollToFirstError();
      void this.load({ background: true });
    } finally {
      this.withdrawBusy.set(false);
    }
  }

  protected formatBudget(budget?: string | null): string | null {
    return formatBudgetDisplay(budget);
  }

  protected categoryBlockedBody(): string {
    const cat = this.request()?.categoryName?.trim() || 'อื่น';
    return `งานนี้อยู่ในหมวด ${cat} ซึ่งไม่ตรงกับบริการที่คุณเปิดไว้`;
  }

  protected primaryBidLabel(): string {
    const bid = this.myBid();
    if (bid?.status === 'Withdrawn') {
      return GLOSSARY.submitBidAgain;
    }
    return GLOSSARY.submitBid;
  }

  protected myBidEngagementLabel(): string | null {
    const bid = this.myBid();
    const req = this.request();
    if (!bid || !req) {
      return null;
    }
    if (req.status === 'Completed' || this.appointment()?.status === 'Completed') {
      return 'งานเสร็จสิ้น';
    }
    if (req.status === 'Open' || req.status === 'HasOffers') {
      return bid.status === 'Withdrawn' ? 'ถอนข้อเสนอแล้ว' : bidStatusLabel(bid.status);
    }
    return providerBidRowStatus({
      status: bid.status,
      requestStatus: req.status,
      appointmentStatus: this.effectiveAppointmentStatus(),
    }).label;
  }

  protected showPostJobLinks(): boolean {
    const req = this.request();
    return !!req && (req.status === 'Completed' || this.isTerminal());
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
    this.actingLabel.set(GLOSSARY.rejectingAppointment);
    this.error.set(null);
    this.rejectOpen.set(false);
    const previousAppt = appt;
    const previousRequest = this.request();
    try {
      const updated = await firstValueFrom(
        this.api.updateAppointmentStatus(appt.id, 'Rejected', reason || undefined),
      );
      this.appointment.set(updated);
      this.cache.invalidateAll();
      this.toast.show(rejectAppointmentToast());
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
      this.appointment.set(previousAppt);
      if (previousRequest) {
        this.request.set(previousRequest);
      }
      const msg = apiErrorMessage(e, 'ปฏิเสธนัดหมายไม่สำเร็จ');
      this.error.set(msg);
      this.toast.show(msg);
      scrollToFirstError();
    } finally {
      this.acting.set(false);
    }
  }

  protected openConfirmAppointment(): void {
    this.openAdvanceConfirm('Confirmed', {
      allowed: () => this.canConfirmAppointment(),
      busyLabel: 'กำลังยืนยัน…',
      notice: 'ยืนยันนัดหมายแล้ว — กดเริ่มงานเมื่อถึงเวลานัดหมาย',
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
      notice: JOB_COMPLETED_REVIEW_NOTICE,
      errorFallback: 'ปิดงานไม่สำเร็จ',
    });
  }

  protected advanceConfirmTitle(): string {
    const status = this.advanceConfirmConfig?.status;
    if (status === 'Confirmed') {
      return `${GLOSSARY.confirmReceiveAppointment}?`;
    }
    if (status === 'InProgress') {
      return 'เริ่มงานตามนัดหมาย?';
    }
    if (status === 'Completed') {
      return 'ยืนยันว่างานเสร็จแล้ว?';
    }
    return 'ยืนยันการทำรายการ';
  }

  protected advanceConfirmMessage(): string {
    const status = this.advanceConfirmConfig?.status;
    if (status === 'Confirmed') {
      const when = formatScheduledAt(this.appointment()?.scheduledAt);
      return `ยืนยันนัดหมาย ${when} ตามสถานที่ที่ลูกค้าส่งมา`;
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

    const previousAppt = appt;
    const previousRequest = this.request();
    const jobTitle = previousRequest?.title?.trim() || 'งาน';
    // L-14: no optimistic status change — update only after a 2xx response.
    try {
      const updated = await firstValueFrom(this.api.updateAppointmentStatus(appt.id, status));
      this.appointment.set(updated);
      const current = this.request();
      if (current) {
        this.request.set({
          ...current,
          appointmentStatus: updated.status,
          status:
            status === 'InProgress'
              ? 'InProgress'
              : status === 'Completed'
                ? 'Completed'
                : current.status,
        });
      }
      this.notice.set(options.notice ?? null);
      if (status === 'Confirmed') {
        this.toast.show(providerConfirmAppointmentToast(appt.scheduledAt));
      } else if (status === 'InProgress') {
        this.toast.show(providerStartJobToast(jobTitle));
      } else if (status === 'Completed') {
        this.toast.show(providerCompleteJobToast(jobTitle));
      }
      this.cache.invalidateAll();
      void this.load({ background: true });
    } catch (e) {
      this.appointment.set(previousAppt);
      if (previousRequest) {
        this.request.set(previousRequest);
      }
      this.notice.set(null);
      const msg = apiErrorMessage(e, options.errorFallback);
      this.error.set(msg);
      this.toast.show(msg);
      scrollToFirstError();
    } finally {
      this.acting.set(false);
    }
  }
}
