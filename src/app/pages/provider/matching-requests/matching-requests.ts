import { Component, OnInit, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { NgClass } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { PageShell } from '../../../demo/page-shell';
import { ProviderBottomNav } from '../../../shared/provider-bottom-nav';
import { LocalGoApiService } from '../../../core/localgo-api.service';
import { ProviderDetail, ServiceRequestSummary } from '../../../core/models';
import { apiErrorMessage } from '../../../core/api-error.util';
import { requestStatusLabel, requestStatusBadgeClass } from '../../../shared/status-labels';
import { AuthService } from '../../../core/auth.service';

type SetupIssue = 'no-profile' | 'missing-branches' | 'missing-services';

@Component({
  selector: 'app-matching-requests-page',
  imports: [PageShell, RouterLink, ProviderBottomNav, NgClass],
  templateUrl: './matching-requests.html',
  styles: [
    `
      :host .screen {
        min-width: 0;
        max-width: 100%;
        overflow-x: clip;
      }
      :host .stack {
        width: 100%;
        max-width: 100%;
        min-width: 0;
      }
      :host .section-title {
        min-width: 0;
        gap: 0.5rem;
        flex-wrap: wrap;
      }
      :host .section-title h3 {
        flex: 1 1 auto;
        min-width: 0;
      }
      :host .match-card--api {
        grid-template-columns: minmax(0, 1fr);
      }
      :host .pending-notice {
        margin: 0 0 1rem;
        background: #fff4e5;
        border: 1px solid #fedfae;
        border-radius: 0.85rem;
        color: #b45309;
        font-weight: 800;
        padding: 0.85rem;
        text-align: center;
      }
    `,
  ],
})
export class MatchingRequestsPage implements OnInit {
  protected readonly matchingRequests = signal<ServiceRequestSummary[]>([]);
  protected readonly provider = signal<ProviderDetail | null>(null);
  protected readonly loading = signal(true);
  protected readonly error = signal<string | null>(null);
  protected readonly setupIssue = signal<SetupIssue | null>(null);
  protected readonly pendingConfirmCount = signal(0);
  protected readonly statusLabel = requestStatusLabel;
  protected readonly statusBadgeClass = requestStatusBadgeClass;

  constructor(
    private readonly api: LocalGoApiService,
    private readonly router: Router,
    protected readonly auth: AuthService,
  ) {}

  async ngOnInit(): Promise<void> {
    await this.reload();
  }

  protected async reload(): Promise<void> {
    this.loading.set(true);
    this.error.set(null);
    this.setupIssue.set(null);
    this.pendingConfirmCount.set(0);
    try {
      const mine = await firstValueFrom(this.api.getMyProvider());
      this.provider.set(mine);
      const items = await firstValueFrom(this.api.listMatchingRequests(true));
      this.matchingRequests.set(items);

      this.pendingConfirmCount.set(items.filter((r) => r.needsAppointmentConfirm).length);

      const missingBranches = mine.branches.filter((b) => b.isActive).length === 0;
      const missingServices = mine.services.filter((s) => s.isActive).length === 0;
      if (items.length === 0) {
        if (missingBranches) {
          this.setupIssue.set('missing-branches');
        } else if (missingServices) {
          this.setupIssue.set('missing-services');
        }
      }
    } catch (e) {
      if (e instanceof HttpErrorResponse && e.status === 404) {
        this.setupIssue.set('no-profile');
        this.provider.set(null);
        this.matchingRequests.set([]);
      } else {
        this.error.set(apiErrorMessage(e, 'โหลดรายการงานไม่สำเร็จ'));
      }
    } finally {
      this.loading.set(false);
    }
  }

  protected setupMessage(): string {
    switch (this.setupIssue()) {
      case 'no-profile':
        return 'สร้างโปรไฟล์ผู้ให้บริการก่อน จึงจะเห็นงานที่ตรงกับพื้นที่และหมวดบริการ';
      case 'missing-branches':
        return 'เพิ่มจุดให้บริการก่อนรับงานใหม่';
      case 'missing-services':
        return 'เปิดบริการอย่างน้อย 1 รายการ';
      default:
        return '';
    }
  }

  protected setupLink(): string {
    switch (this.setupIssue()) {
      case 'missing-branches':
        return '/provider/coverage';
      case 'missing-services':
        return '/provider/service';
      default:
        return '/provider/profile';
    }
  }

  protected setupActionLabel(): string {
    switch (this.setupIssue()) {
      case 'missing-branches':
        return 'เพิ่มจุดให้บริการ';
      case 'missing-services':
        return 'เปิดบริการ';
      default:
        return 'ไปตั้งค่า';
    }
  }

  protected formatDistance(meters?: number | null): string {
    if (meters == null) {
      return '—';
    }
    return meters >= 1000 ? `${(meters / 1000).toFixed(1)} กม.` : `${Math.round(meters)} ม.`;
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

  protected async openRequest(request: ServiceRequestSummary): Promise<void> {
    await this.router.navigate(['/provider/requests', request.id]);
  }

  protected isMyActiveJob(request: ServiceRequestSummary): boolean {
    return (
      request.status === 'ProviderSelected' ||
      request.status === 'Scheduled' ||
      request.status === 'InProgress'
    );
  }

  protected actionLabel(request: ServiceRequestSummary): string {
    if (request.needsAppointmentConfirm) {
      return 'ยืนยันรับนัด';
    }
    if (this.isMyActiveJob(request)) {
      return 'ดำเนินงานต่อ';
    }
    return request.alreadyBidByMe ? 'ดูงาน' : 'ดูรายละเอียด';
  }
}
