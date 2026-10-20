import { Component, OnInit, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { NgClass } from '@angular/common';
import { firstValueFrom } from 'rxjs';
import { PageShell } from '../../../demo/page-shell';
import { RequesterBottomNav } from '../../../shared/requester-bottom-nav';
import { LocalGoApiService } from '../../../core/localgo-api.service';
import { ServiceRequestSummary } from '../../../core/models';
import { SessionStateService } from '../../../core/session-state.service';
import { requestStatusLabel, requestStatusBadgeClass } from '../../../shared/status-labels';
import { AuthService } from '../../../core/auth.service';
import { LoadingSkeleton } from '../../../shared/loading-skeleton';

@Component({
  selector: 'app-requester-home-page',
  imports: [PageShell, RouterLink, RequesterBottomNav, NgClass, LoadingSkeleton],
  templateUrl: './requester-home.html',
})
export class RequesterHomePage implements OnInit {
  protected readonly requests = signal<ServiceRequestSummary[]>([]);
  protected readonly loading = signal(true);
  protected readonly error = signal<string | null>(null);
  protected readonly statusLabel = requestStatusLabel;
  protected readonly statusBadgeClass = requestStatusBadgeClass;

  constructor(
    private readonly api: LocalGoApiService,
    private readonly session: SessionStateService,
    protected readonly auth: AuthService,
    private readonly router: Router,
  ) {}

  async ngOnInit(): Promise<void> {
    try {
      const items = await firstValueFrom(this.api.listMyRequests());
      this.requests.set(items);
    } catch (e) {
      this.error.set(e instanceof Error ? e.message : 'โหลดรายการงานไม่สำเร็จ');
    } finally {
      this.loading.set(false);
    }
  }

  protected canCancel(status: string): boolean {
    return status === 'Draft' || status === 'Open' || status === 'HasOffers';
  }

  protected async cancelRequest(request: ServiceRequestSummary, event: Event): Promise<void> {
    event.stopPropagation();
    if (!confirm(`ยกเลิกงาน "${request.title}"?`)) {
      return;
    }
    await firstValueFrom(this.api.cancelRequest(request.id));
    const items = await firstValueFrom(this.api.listMyRequests());
    this.requests.set(items);
  }

  protected async openRequest(request: ServiceRequestSummary): Promise<void> {
    this.session.currentRequestId = request.id;
    await this.auth.setActiveRole('Requester');
    if (request.status === 'Cancelled') {
      await this.router.navigate(['/requester/bids'], {
        queryParams: { requestId: request.id },
      });
      return;
    }
    if (request.status === 'Completed') {
      await this.router.navigate(['/requester/review'], {
        queryParams: { requestId: request.id },
      });
      return;
    }
    if (
      request.status === 'ProviderSelected' ||
      request.status === 'Selected' ||
      request.status === 'Scheduled' ||
      request.status === 'InProgress'
    ) {
      await this.router.navigateByUrl('/requester/appointment');
      return;
    }
    await this.router.navigateByUrl('/requester/bids');
  }

  protected continueLabel(status: string): string {
    if (status === 'Cancelled') {
      return 'ดูรายละเอียด';
    }
    if (status === 'Completed') {
      return 'ให้คะแนนและรีวิว';
    }
    if (status === 'InProgress') {
      return 'ดูสถานะงาน';
    }
    return 'ดำเนินงานต่อ';
  }

  protected formatWhen(iso: string): string {
    try {
      return new Date(iso).toLocaleString('th-TH', {
        dateStyle: 'medium',
        timeStyle: 'short',
      });
    } catch {
      return iso;
    }
  }

  protected async switchToProvider(): Promise<void> {
    await this.auth.setActiveRole('Provider');
    await this.router.navigateByUrl('/provider');
  }
}
