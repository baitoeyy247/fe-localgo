import { Component, OnInit, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { PageShell } from '../../demo/page-shell';
import { LocalGoApiService } from '../../core/localgo-api.service';
import { AppointmentDetail } from '../../core/models';
import { apiErrorMessage } from '../../core/api-error.util';
import { appointmentStatusLabel } from '../../shared/status-labels';
import { formatScheduledAt } from '../../shared/datetime.util';
import { ErrorState } from '../../shared/ui/error-state';
import { NotFoundState } from '../../shared/ui/not-found-state';

@Component({
  selector: 'app-appointment-by-id-page',
  imports: [PageShell, RouterLink, ErrorState, NotFoundState],
  template: `
    <app-page-shell [title]="title()" [backLink]="backLink()">
      @if (loading()) {
        <p class="muted" style="text-align: center">กำลังโหลด…</p>
      } @else if (forbidden()) {
        <app-not-found-state
          title="ไม่พบหรือไม่มีสิทธิ์เข้าถึง"
          message="นัดหมายนี้ไม่มีอยู่ หรือคุณไม่ใช่คู่สัญญาของนัดนี้"
          [backLink]="backLink()"
        />
      } @else if (error()) {
        <app-error-state [message]="error()!" (retry)="load()" />
      } @else if (appointment(); as a) {
        <div class="card">
          <span class="badge b-green">{{ statusLabel(a.status) }}</span>
          <p style="margin: 8px 0 0"><b>วันและเวลา:</b> {{ formatScheduledAt(a.scheduledAt) }}</p>
          <p><b>สถานที่:</b> {{ a.addressText || 'ยังไม่ระบุ' }}</p>
          @if (a.note) {
            <p><b>หมายเหตุ:</b> {{ a.note }}</p>
          }
        </div>
        @if (role() === 'requester') {
          <a class="btn btn-primary btn-block" [routerLink]="['/requester/appointment']" [queryParams]="{ requestId: a.serviceRequestId }"
            >เปิดหน้านัดหมายงานนี้</a
          >
        } @else {
          <a class="btn btn-primary btn-block" [routerLink]="['/provider/requests', a.serviceRequestId]">เปิดรายละเอียดงาน</a>
        }
      }
    </app-page-shell>
  `,
})
export class AppointmentByIdPage implements OnInit {
  protected readonly appointment = signal<AppointmentDetail | null>(null);
  protected readonly loading = signal(true);
  protected readonly error = signal<string | null>(null);
  protected readonly forbidden = signal(false);
  protected readonly formatScheduledAt = formatScheduledAt;
  protected readonly statusLabel = appointmentStatusLabel;

  private readonly route = inject(ActivatedRoute);
  private readonly api = inject(LocalGoApiService);

  protected role(): 'requester' | 'provider' {
    return this.route.snapshot.data['role'] === 'provider' ? 'provider' : 'requester';
  }

  protected title(): string {
    return this.role() === 'provider' ? 'นัดหมาย (ผู้ให้บริการ)' : 'นัดหมาย';
  }

  protected backLink(): string {
    return this.role() === 'provider' ? '/provider/requests' : '/requester';
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
    this.forbidden.set(false);
    try {
      const appt = await firstValueFrom(this.api.getAppointmentById(id));
      this.appointment.set(appt);
    } catch (e) {
      const status = (e as { status?: number })?.status;
      if (status === 403 || status === 404) {
        this.forbidden.set(true);
      } else {
        this.error.set(apiErrorMessage(e, 'โหลดนัดหมายไม่สำเร็จ'));
      }
    } finally {
      this.loading.set(false);
    }
  }
}
