import { Component, OnInit, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { NgClass } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { PageShell } from '../../../demo/page-shell';
import { ProviderBottomNav } from '../../../shared/provider-bottom-nav';
import { LoadingSkeleton } from '../../../shared/loading-skeleton';
import { LocalGoApiService } from '../../../core/localgo-api.service';
import { ProviderCoverageArea, ProviderDetail, ServiceRequestSummary } from '../../../core/models';
import { apiErrorMessage } from '../../../core/api-error.util';
import { requestStatusLabel, requestStatusBadgeClass } from '../../../shared/status-labels';
import { formatDistanceMeters } from '../../../shared/coordinates';
import { AuthService } from '../../../core/auth.service';

type SetupIssue = 'no-profile' | 'missing-branches' | 'missing-services';

@Component({
  selector: 'app-matching-requests-page',
  imports: [PageShell, RouterLink, ProviderBottomNav, NgClass, LoadingSkeleton],
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
      :host .filter-note {
        margin: 0;
        color: #3e515c;
        font-size: 0.95rem;
        line-height: 1.45;
      }
      :host .filter-note a {
        font-weight: 800;
        margin-left: 0.35rem;
      }
    `,
  ],
})
export class MatchingRequestsPage implements OnInit {
  protected readonly matchingRequests = signal<ServiceRequestSummary[]>([]);
  protected readonly provider = signal<ProviderDetail | null>(null);
  protected readonly areas = signal<ProviderCoverageArea[]>([]);
  protected readonly excludesOwnRequests = signal(false);
  protected readonly loading = signal(true);
  protected readonly ready = signal(false);
  protected readonly slow = signal(false);
  protected readonly error = signal<string | null>(null);
  private loadAttempt = 0;
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
    const attempt = ++this.loadAttempt;
    this.loading.set(true);
    this.ready.set(false);
    this.slow.set(false);
    this.error.set(null);
    this.setupIssue.set(null);
    this.pendingConfirmCount.set(0);
    const timer = setTimeout(() => {
      if (attempt === this.loadAttempt) {
        this.slow.set(true);
      }
    }, 10_000);
    try {
      const [mineResult, inboxResult] = await Promise.allSettled([
        firstValueFrom(this.api.getMyProvider()),
        firstValueFrom(this.api.listMatchingRequests(true)),
      ]);
      if (attempt !== this.loadAttempt) {
        return;
      }
      if (inboxResult.status === 'rejected') {
        this.error.set(this.safeError(apiErrorMessage(inboxResult.reason, 'โหลดรายการงานไม่สำเร็จ')));
        return;
      }

      const inbox = inboxResult.value;
      const items = inbox.items ?? [];
      this.matchingRequests.set(items);
      this.excludesOwnRequests.set(!!inbox.excludesOwnRequests);
      this.areas.set(inbox.areas ?? []);
      this.pendingConfirmCount.set(items.filter((r) => r.needsAppointmentConfirm).length);
      this.ready.set(true);

      if (mineResult.status === 'fulfilled') {
        const mine = mineResult.value;
        this.provider.set(mine);
        if (items.length === 0) {
          const missingBranches = mine.branches.filter((b) => b.isActive).length === 0;
          const missingServices = mine.services.filter((s) => s.isActive).length === 0;
          if (missingBranches) {
            this.setupIssue.set('missing-branches');
          } else if (missingServices) {
            this.setupIssue.set('missing-services');
          }
        }
      } else if (
        mineResult.reason instanceof HttpErrorResponse &&
        mineResult.reason.status === 404
      ) {
        this.setupIssue.set('no-profile');
        this.provider.set(null);
      }
    } finally {
      clearTimeout(timer);
      if (attempt === this.loadAttempt) {
        this.loading.set(false);
        this.slow.set(false);
      }
    }
  }

  protected radiusLabel(meters: number): string {
    if (meters < 100) {
      return 'น้อยกว่า 100 เมตร';
    }
    if (meters < 1000) {
      return `${Math.round(meters)} เมตร`;
    }
    const km = meters / 1000;
    const text = Number.isInteger(km) ? String(km) : km.toFixed(1);
    return `${text} กิโลเมตร`;
  }

  protected emptyReason(): string {
    const reasons: string[] = [];
    if (this.excludesOwnRequests()) {
      reasons.push('งานที่คุณโพสต์เองจะไม่แสดงในรายการนี้');
    }
    if (this.areas().length > 0) {
      const places = this.areas()
        .map((area) => `รัศมี ${this.radiusLabel(area.serviceRadiusMeters)} รอบ ${area.name}`)
        .join(' และ ');
      reasons.push(`ระบบกรองตามพื้นที่ที่ตั้งไว้ (${places})`);
    }
    if (reasons.length === 0) {
      return 'ยังไม่มีงานที่ตรงกับบริการที่เปิดอยู่';
    }
    return reasons.join(' ');
  }

  private safeError(message: string): string {
    return /api/i.test(message) ? 'โหลดรายการงานไม่สำเร็จ' : message;
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
    return formatDistanceMeters(meters);
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
    if (request.status === 'InProgress') {
      return 'งานเสร็จสิ้น';
    }
    if (request.status === 'Scheduled') {
      return 'เริ่มงาน';
    }
    if (this.isMyActiveJob(request)) {
      return 'ดำเนินงานต่อ';
    }
    return request.alreadyBidByMe ? 'ดูงาน' : 'ดูรายละเอียด';
  }
}
