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
  protected readonly distanceMeters = signal<number | null>(null);
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
    return displayRequestStatusLabel(status, this.appointment()?.status);
  }
  protected readonly bidStatusLabel = bidStatusLabel;
  protected readonly appointmentStatusLabel = appointmentStatusLabel;
  protected readonly formatScheduledAt = formatScheduledAt;

  private readonly route = inject(ActivatedRoute);
  private readonly api = inject(LocalGoApiService);
  private readonly session = inject(SessionStateService);
  private readonly router = inject(Router);

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
    this.hint.begin();
    try {
      const [detail, myProvider] = await Promise.all([
        firstValueFrom(this.api.getRequest(id)),
        firstValueFrom(
          this.api
            .getMyProvider()
            .pipe(catchError((err) => (isNotFoundError(err) ? of(null) : Promise.reject(err)))),
        ),
      ]);
      this.request.set(detail);
      this.myProvider.set(myProvider);
      this.myBid.set(
        myProvider ? (detail.bids?.find((bid) => bid.providerId === myProvider.id) ?? null) : null,
      );
      try {
        const matching = await firstValueFrom(this.api.listMatchingRequests());
        const hit = matching.find((item) => item.id === id);
        this.distanceMeters.set(hit?.distanceMeters ?? null);
      } catch {
        this.distanceMeters.set(null);
      }
      if (myProvider && this.hasActiveEngagement(detail, myProvider.id)) {
        await this.loadAppointment(id);
      }
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
      await this.router.navigateByUrl('/provider/requests');
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
    return this.hasActiveEngagement();
  }

  protected canConfirmAppointment(): boolean {
    const appt = this.appointment();
    return this.hasActiveEngagement() && appt?.status === 'Pending';
  }

  protected canStartJob(): boolean {
    const appt = this.appointment();
    return this.hasActiveEngagement() && appt?.status === 'Confirmed' && this.isWithinAppointmentWindow();
  }

  protected canCompleteJob(): boolean {
    const appt = this.appointment();
    return this.hasActiveEngagement() && appt?.status === 'InProgress' && this.isWithinAppointmentWindow();
  }

  /** Matches backend: start/complete allowed from 1 hour before scheduledAt. */
  protected isWithinAppointmentWindow(): boolean {
    const at = this.appointment()?.scheduledAt;
    if (!at) {
      return false;
    }
    const scheduled = new Date(at).getTime();
    if (Number.isNaN(scheduled)) {
      return false;
    }
    return Date.now() >= scheduled - 60 * 60 * 1000;
  }

  protected startWindowHint(): string | null {
    const appt = this.appointment();
    if (!appt || appt.status !== 'Confirmed' || this.isWithinAppointmentWindow()) {
      return null;
    }
    return 'ยังไม่ถึงเวลานัด — กดเริ่มงานได้ตั้งแต่ 1 ชั่วโมงก่อนเวลานัด';
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
    if (meters >= 1000) {
      return `${(meters / 1000).toFixed(1)} กม.`;
    }
    return `${Math.round(meters)} ม.`;
  }

  protected searchRadiusKm(r: ServiceRequestDetail): string {
    return (r.searchRadiusMeters / 1000).toFixed(0);
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
    try {
      const updated = await firstValueFrom(this.api.updateAppointmentStatus(appt.id, status));
      this.appointment.set(updated);
      const requestId = this.request()?.id;
      if (requestId) {
        try {
          this.request.set(await firstValueFrom(this.api.getRequest(requestId)));
        } catch {
          const current = this.request();
          if (current && status !== 'Confirmed') {
            this.request.set({ ...current, status });
          }
        }
      }
      this.notice.set(options.notice);
    } catch (e) {
      this.error.set(apiErrorMessage(e, options.errorFallback));
      scrollToFirstError();
    } finally {
      this.acting.set(false);
    }
  }
}
