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
import { formatScheduledAt } from '../../../shared/datetime.util';

@Component({
  selector: 'app-provider-request-detail-page',
  imports: [PageShell, RouterLink, ProviderBottomNav],
  templateUrl: './request-detail.html',
})
export class ProviderRequestDetailPage implements OnInit {
  protected readonly request = signal<ServiceRequestDetail | null>(null);
  protected readonly myBid = signal<BidItem | null>(null);
  protected readonly myProvider = signal<ProviderDetail | null>(null);
  protected readonly appointment = signal<AppointmentDetail | null>(null);
  protected readonly appointmentLoading = signal(false);
  protected readonly appointmentError = signal<string | null>(null);
  protected readonly loading = signal(true);
  protected readonly acting = signal(false);
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
    if (!id) {
      this.loading.set(false);
      return;
    }
    this.session.providerRequestId = id;
    try {
      const [detail, myProvider] = await Promise.all([
        firstValueFrom(this.api.getRequest(id)),
        firstValueFrom(this.api.getMyProvider()),
      ]);
      this.request.set(detail);
      this.myProvider.set(myProvider);
      this.myBid.set(detail.bids?.find((bid) => bid.providerId === myProvider.id) ?? null);
      if (this.hasActiveEngagement(detail, myProvider.id)) {
        await this.loadAppointment(id);
      }
    } catch (e) {
      this.error.set(apiErrorMessage(e, 'โหลดรายละเอียดไม่สำเร็จ'));
    } finally {
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
    await this.router.navigateByUrl('/provider/bid');
  }

  protected async withdrawMyBid(): Promise<void> {
    const bid = this.myBid();
    if (!bid || !this.canWithdrawBid() || !confirm('ถอนข้อเสนอราคานี้?')) {
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

  protected canStartRequest(): boolean {
    return this.hasActiveEngagement()
      && this.request()?.status === 'Scheduled'
      && this.appointment()?.status === 'Confirmed';
  }

  protected canCompleteRequest(): boolean {
    return this.hasActiveEngagement() && this.request()?.status === 'InProgress';
  }

  protected async startRequest(): Promise<void> {
    const request = this.request();
    if (!request || !this.canStartRequest() || this.acting()) {
      return;
    }
    if (!confirm('ยืนยันว่าเริ่มดำเนินงานแล้ว?')) {
      return;
    }
    this.acting.set(true);
    this.error.set(null);
    try {
      await firstValueFrom(this.api.startRequest(request.id));
      this.request.set({ ...request, status: 'InProgress' });
      this.notice.set('เริ่มดำเนินงานแล้ว');
    } catch (e) {
      this.error.set(apiErrorMessage(e, 'เริ่มงานไม่สำเร็จ'));
    } finally {
      this.acting.set(false);
    }
  }

  protected async completeRequest(): Promise<void> {
    const request = this.request();
    if (!request || !this.canCompleteRequest() || this.acting()) {
      return;
    }
    if (!confirm('ยืนยันว่าดำเนินงานเสร็จสิ้นแล้ว?')) {
      return;
    }
    this.acting.set(true);
    this.error.set(null);
    try {
      await firstValueFrom(this.api.completeRequest(request.id));
      this.request.set({ ...request, status: 'Completed' });
      this.notice.set('งานเสร็จสิ้นแล้ว — ลูกค้าสามารถส่งรีวิวได้');
    } catch (e) {
      this.error.set(apiErrorMessage(e, 'ปิดงานไม่สำเร็จ'));
    } finally {
      this.acting.set(false);
    }
  }

  protected async confirmAppointment(): Promise<void> {
    const appt = this.appointment();
    if (!appt || !this.canConfirmAppointment() || this.acting()) {
      return;
    }
    if (!confirm('ยืนยันรับนัดหมายตามวัน เวลา และสถานที่ที่ลูกค้าส่งมา?')) {
      return;
    }
    this.acting.set(true);
    this.error.set(null);
    try {
      const updated = await firstValueFrom(
        this.api.updateAppointmentStatus(appt.id, 'Confirmed'),
      );
      this.appointment.set(updated);
      this.notice.set('ยืนยันรับนัดหมายแล้ว — ลูกค้าจะเห็นสถานะอัปเดต');
    } catch (e) {
      this.error.set(apiErrorMessage(e, 'ยืนยันนัดหมายไม่สำเร็จ'));
    } finally {
      this.acting.set(false);
    }
  }
}
