import { HttpErrorResponse } from '@angular/common/http';
import { Component, OnInit, inject, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { PageShell } from '../../../demo/page-shell';
import { ProviderBottomNav } from '../../../shared/provider-bottom-nav';
import { LocalGoApiService } from '../../../core/localgo-api.service';
import { AppointmentDetail, BidItem, ProviderDetail, ServiceRequestDetail } from '../../../core/models';
import { SessionStateService } from '../../../core/session-state.service';
import {
  appointmentStatusLabel,
  bidStatusLabel,
  requestStatusLabel,
} from '../../../shared/status-labels';
import { apiErrorMessage } from '../../../core/api-error.util';
import { formatScheduledAt, isWithinAppointmentWindow } from '../../../shared/datetime.util';
import { LoadingSkeleton } from '../../../shared/loading-skeleton';
import { formatBaht, jobPlaceLabel } from '../../../shared/form-rules';
import { ConfirmModal } from '../../../shared/confirm-modal';
import { isGuid } from '../../../shared/ids';
import { distanceMeters, formatDistanceMeters } from '../../../shared/coordinates';

@Component({
  selector: 'app-provider-request-detail-page',
  imports: [PageShell, RouterLink, ProviderBottomNav, LoadingSkeleton, ConfirmModal],
  templateUrl: './request-detail.html',
})
export class ProviderRequestDetailPage implements OnInit {
  protected readonly formatBaht = formatBaht;
  protected readonly placeLabel = jobPlaceLabel;
  protected readonly confirmOpen = signal(false);
  protected readonly confirmDestructive = signal(false);
  protected readonly confirmTitle = signal('');
  protected readonly confirmMessage = signal('');
  protected readonly notFound = signal(false);
  private confirmResolver: ((accepted: boolean) => void) | null = null;
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
  protected readonly statusLabel = requestStatusLabel;
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
    const id = this.route.snapshot.paramMap.get('id');
    if (!isGuid(id)) {
      this.notFound.set(true);
      this.loading.set(false);
      return;
    }
    this.session.providerRequestId = id;
    try {
      const detail = await firstValueFrom(this.api.getRequest(id));
      this.request.set(detail);
      try {
        const myProvider = await firstValueFrom(this.api.getMyProvider());
        this.myProvider.set(myProvider);
        this.myBid.set(detail.bids?.find((bid) => bid.providerId === myProvider.id) ?? null);
        if (this.hasActiveEngagement(detail, myProvider.id)) {
          await this.loadAppointment(id);
        }
      } catch (providerError) {
        if (!(providerError instanceof HttpErrorResponse) || providerError.status !== 404) {
          this.error.set(apiErrorMessage(providerError, 'โหลดข้อมูลไม่สำเร็จ'));
        }
      }
    } catch (e) {
      if (e instanceof HttpErrorResponse && (e.status === 404 || e.status === 400)) {
        this.notFound.set(true);
      } else {
        this.error.set(apiErrorMessage(e, 'โหลดข้อมูลไม่สำเร็จ'));
      }
    } finally {
      this.loading.set(false);
    }
  }

  protected async retry(): Promise<void> {
    this.loading.set(true);
    this.error.set(null);
    this.notFound.set(false);
    await this.ngOnInit();
  }

  protected distanceLabel(): string {
    const request = this.request();
    const branches = this.myProvider()?.branches.filter((branch) => branch.isActive) ?? [];
    if (!request || branches.length === 0) {
      return '';
    }
    const nearest = Math.min(
      ...branches.map((branch) =>
        distanceMeters(branch.latitude, branch.longitude, request.latitude, request.longitude),
      ),
    );
    return formatDistanceMeters(nearest);
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
    if (!bid || !this.canWithdrawBid()) {
      return;
    }
    const accepted = await this.askConfirm(
      'ถอนข้อเสนอ',
      'ถอนข้อเสนอราคานี้แล้วผู้ประกาศจะไม่เห็นราคาของคุณ',
      true,
    );
    if (!accepted) {
      return;
    }
    try {
      await firstValueFrom(this.api.withdrawBid(bid.id));
      await this.router.navigateByUrl('/provider/requests');
    } catch (e) {
      this.error.set(apiErrorMessage(e, 'ถอนข้อเสนอไม่สำเร็จ'));
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
    return this.hasActiveEngagement() && appt?.status === 'Confirmed' && isWithinAppointmentWindow(appt.scheduledAt);
  }

  protected startTooEarly(): boolean {
    const appt = this.appointment();
    return this.hasActiveEngagement() && appt?.status === 'Confirmed' && !isWithinAppointmentWindow(appt.scheduledAt);
  }

  protected canCompleteJob(): boolean {
    const appt = this.appointment();
    return this.hasActiveEngagement() && appt?.status === 'InProgress';
  }

  protected async confirmAppointment(): Promise<void> {
    await this.advanceAppointment('Confirmed', {
      allowed: () => this.canConfirmAppointment(),
      confirmTitle: 'ยืนยันรับนัด',
      confirmText: 'ยืนยันรับนัดหมายตามวัน เวลา และสถานที่ที่ลูกค้าส่งมา ลูกค้าจะเห็นว่าคุณรับนัดแล้ว',
      busyLabel: 'กำลังยืนยัน…',
      notice: 'ยืนยันรับนัดหมายแล้ว — กดเริ่มงานเมื่อถึงเวลานัด',
      errorFallback: 'ยืนยันนัดหมายไม่สำเร็จ',
    });
  }

  protected async startJob(): Promise<void> {
    const requestId = this.request()?.id;
    if (!requestId || !this.canStartJob() || this.acting() || this.confirmOpen()) {
      return;
    }
    const accepted = await this.askConfirm(
      'เริ่มงาน',
      'เริ่มงานตามนัดหมายนี้ ลูกค้าจะเห็นสถานะกำลังดำเนินงาน',
    );
    if (!accepted) {
      return;
    }
    await this.runJobAction(requestId, 'กำลังเริ่มงาน…', 'เริ่มงานไม่สำเร็จ', async () => {
      await firstValueFrom(this.api.startRequest(requestId));
      this.patchProgress('InProgress');
      this.notice.set('เริ่มงานแล้ว — ลูกค้าจะเห็นสถานะกำลังดำเนินงาน');
    });
  }

  protected async completeJob(): Promise<void> {
    const requestId = this.request()?.id;
    if (!requestId || !this.canCompleteJob() || this.acting() || this.confirmOpen()) {
      return;
    }
    const accepted = await this.askConfirm(
      'ปิดงาน',
      'เมื่องานเสร็จ ลูกค้าจะสามารถให้คะแนนและรีวิวได้',
    );
    if (!accepted) {
      return;
    }
    await this.runJobAction(requestId, 'กำลังปิดงาน…', 'ปิดงานไม่สำเร็จ', async () => {
      await firstValueFrom(this.api.completeRequest(requestId));
      this.patchProgress('Completed');
      this.notice.set('ปิดงานแล้ว — ลูกค้าสามารถให้คะแนนและรีวิวได้');
    });
  }

  protected resolveConfirm(accepted: boolean): void {
    this.confirmOpen.set(false);
    this.confirmResolver?.(accepted);
    this.confirmResolver = null;
  }

  private askConfirm(title: string, message: string, destructive = false): Promise<boolean> {
    this.confirmTitle.set(title);
    this.confirmMessage.set(message);
    this.confirmDestructive.set(destructive);
    this.confirmOpen.set(true);
    return new Promise((resolve) => {
      this.confirmResolver = resolve;
    });
  }

  private patchProgress(status: 'InProgress' | 'Completed'): void {
    const appointment = this.appointment();
    if (appointment) {
      this.appointment.set({ ...appointment, status });
    }
    const request = this.request();
    if (request) {
      this.request.set({ ...request, status });
    }
  }

  private async runJobAction(
    requestId: string,
    busyLabel: string,
    errorFallback: string,
    action: () => Promise<void>,
  ): Promise<void> {
    this.acting.set(true);
    this.actingLabel.set(busyLabel);
    this.error.set(null);
    try {
      await action();
    } catch (e) {
      this.error.set(apiErrorMessage(e, errorFallback));
    } finally {
      this.acting.set(false);
    }
    void requestId;
  }

  private async advanceAppointment(
    status: 'Confirmed' | 'InProgress' | 'Completed',
    options: {
      allowed: () => boolean;
      confirmTitle: string;
      confirmText: string;
      busyLabel: string;
      notice: string;
      errorFallback: string;
    },
  ): Promise<void> {
    const appt = this.appointment();
    if (!appt || !options.allowed() || this.acting() || this.confirmOpen()) {
      return;
    }
    const accepted = await this.askConfirm(options.confirmTitle, options.confirmText);
    if (!accepted) {
      return;
    }
    this.acting.set(true);
    this.actingLabel.set(options.busyLabel);
    this.error.set(null);
    try {
      const updated = await firstValueFrom(this.api.updateAppointmentStatus(appt.id, status));
      this.appointment.set(updated);
      const current = this.request();
      if (current) {
        this.request.set({ ...current, status: status === 'Confirmed' ? 'Scheduled' : status });
      }
      this.notice.set(options.notice);
    } catch (e) {
      this.error.set(apiErrorMessage(e, options.errorFallback));
    } finally {
      this.acting.set(false);
    }
  }
}
