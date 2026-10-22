import { Component, OnDestroy, OnInit, computed, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { NgClass } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { PageShell } from '../../../demo/page-shell';
import { ProviderBottomNav } from '../../../shared/provider-bottom-nav';
import { LocalGoApiService } from '../../../core/localgo-api.service';
import { MarketplaceCacheService } from '../../../core/marketplace-cache.service';
import { ProviderDetail, ServiceRequestSummary } from '../../../core/models';
import { apiErrorMessage } from '../../../core/api-error.util';
import {
  displayRequestStatusBadgeClass,
  displayRequestStatusLabel,
} from '../../../shared/status-labels';
import { SlowLoadHint } from '../../../shared/load-state';
import { ErrorState } from '../../../shared/ui/error-state';
import { SkeletonCard } from '../../../shared/ui/skeleton-card';
import { AuthService } from '../../../core/auth.service';
import { formatDistanceMeters } from '../../../shared/geo-distance';
import { formatPrice } from '../../../shared/format-price';
import { formatBudgetDisplay } from '../../../shared/format-budget';
import { normalizeList } from '../../../shared/normalize-list';
import { GLOSSARY } from '../../../shared/glossary';

type SetupIssue = 'no-profile' | 'missing-branches' | 'missing-services';
type JobTab = 'pending' | 'bidWaiting' | 'scheduled' | 'active' | 'completed' | 'cancelled' | 'rejected';

@Component({
  selector: 'app-matching-requests-page',
  imports: [PageShell, RouterLink, ProviderBottomNav, NgClass, ErrorState, SkeletonCard],
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
export class MatchingRequestsPage implements OnInit, OnDestroy {
  protected readonly GLOSSARY = GLOSSARY;
  protected readonly matchingRequests = signal<ServiceRequestSummary[]>([]);
  protected readonly provider = signal<ProviderDetail | null>(null);
  protected readonly loading = signal(true);
  protected readonly error = signal<string | null>(null);
  protected readonly setupIssue = signal<SetupIssue | null>(null);
  protected readonly pendingConfirmCount = signal(0);
  protected readonly tab = signal<JobTab>('pending');
  protected readonly statusLabel = displayRequestStatusLabel;
  protected readonly statusBadgeClass = displayRequestStatusBadgeClass;
  protected readonly hint = new SlowLoadHint();

  protected readonly formatPrice = formatPrice;
  protected readonly tabs: { key: JobTab; label: string }[] = [
    { key: 'pending', label: 'รอยืนยัน' },
    { key: 'bidWaiting', label: 'รอผลข้อเสนอ' },
    { key: 'scheduled', label: 'นัดหมายแล้ว' },
    { key: 'active', label: 'กำลังทำ' },
    { key: 'completed', label: 'เสร็จสิ้น' },
    { key: 'cancelled', label: 'ยกเลิก' },
    { key: 'rejected', label: 'ปฏิเสธ' },
  ];

  /** Jobs open for bidding (not yet mine) — shown above tabs. */
  protected readonly openJobs = computed(() => {
    const list = normalizeList<ServiceRequestSummary>(this.matchingRequests());
    return list.filter((r) => !this.isMine(r) && this.isBiddable(r));
  });
  /** All engaged / terminal jobs for this provider. */
  protected readonly myJobs = computed(() => {
    const list = normalizeList<ServiceRequestSummary>(this.matchingRequests());
    return list.filter((r) => this.isMine(r));
  });

  protected readonly filteredMyJobs = computed(() => {
    const t = this.tab();
    return this.myJobs().filter((r) => this.matchesTab(r, t));
  });

  constructor(
    private readonly api: LocalGoApiService,
    private readonly cache: MarketplaceCacheService,
    private readonly router: Router,
    protected readonly auth: AuthService,
  ) {}

  async ngOnInit(): Promise<void> {
    await this.reload();
  }

  ngOnDestroy(): void {
    this.hint.end();
  }

  protected isBiddable(request: ServiceRequestSummary): boolean {
    return request.status === 'Open' || request.status === 'HasOffers';
  }

  protected isBidWaiting(request: ServiceRequestSummary): boolean {
    return !!request.alreadyBidByMe && this.isBiddable(request);
  }

  protected isMine(request: ServiceRequestSummary): boolean {
    return (
      this.isBidWaiting(request) ||
      !!request.needsAppointmentConfirm ||
      this.isMyActiveJob(request) ||
      request.status === 'Completed' ||
      request.status === 'Cancelled' ||
      request.appointmentStatus === 'Completed' ||
      request.appointmentStatus === 'Cancelled' ||
      request.appointmentStatus === 'Rejected'
    );
  }

  protected setTab(key: JobTab): void {
    this.tab.set(key);
  }

  protected tabCount(key: JobTab): number {
    return this.myJobs().filter((r) => this.matchesTab(r, key)).length;
  }

  protected currentTabLabel(): string {
    return this.tabs.find((t) => t.key === this.tab())?.label ?? 'งานของฉัน';
  }

  private matchesTab(request: ServiceRequestSummary, tab: JobTab): boolean {
    if (tab === 'completed') {
      return request.status === 'Completed' || request.appointmentStatus === 'Completed';
    }
    if (tab === 'cancelled') {
      return (
        (request.status === 'Cancelled' || request.appointmentStatus === 'Cancelled') &&
        request.appointmentStatus !== 'Rejected'
      );
    }
    if (tab === 'rejected') {
      return request.appointmentStatus === 'Rejected';
    }
    if (tab === 'pending') {
      return this.isPendingConfirm(request);
    }
    if (tab === 'bidWaiting') {
      return this.isBidWaiting(request);
    }
    const engaged =
      !this.isBidWaiting(request) &&
      !this.isPendingConfirm(request) &&
      !this.isTerminalJob(request) &&
      request.status !== 'Completed' &&
      request.appointmentStatus !== 'Completed';
    // T4-2: กำลังทำ = InProgress only; confirmed-but-not-started goes to นัดหมายแล้ว
    const inProgress = request.status === 'InProgress' || request.appointmentStatus === 'InProgress';
    if (tab === 'active') {
      return engaged && inProgress;
    }
    return engaged && !inProgress;
  }

  private isPendingConfirm(request: ServiceRequestSummary): boolean {
    return (
      !!request.needsAppointmentConfirm ||
      request.appointmentStatus === 'Pending'
    );
  }

  /** Single chip per card, from the shared status mapping. */
  protected chipLabel(request: ServiceRequestSummary): string {
    if (request.needsAppointmentConfirm) {
      return 'รอคุณยืนยันนัดหมาย';
    }
    if (request.alreadyBidByMe && this.isBiddable(request)) {
      return 'ส่งราคาแล้ว';
    }
    return this.statusLabel(request.status, request.appointmentStatus, 'provider');
  }

  protected chipClass(request: ServiceRequestSummary): string {
    if (request.needsAppointmentConfirm) {
      return 'badge--orange';
    }
    if (request.alreadyBidByMe && this.isBiddable(request)) {
      return 'badge--blue';
    }
    return this.statusBadgeClass(request.status, request.appointmentStatus);
  }

  protected async reload(): Promise<void> {
    this.loading.set(true);
    this.error.set(null);
    this.setupIssue.set(null);
    this.pendingConfirmCount.set(0);
    this.hint.begin();
    try {
      const [mine, items] = await Promise.all([
        firstValueFrom(this.cache.getMyProvider()),
        firstValueFrom(this.cache.listMatchingRequests(true)),
      ]);
      this.provider.set(mine);
      this.matchingRequests.set(items);

      this.pendingConfirmCount.set(
        items.filter((r) => this.isMine(r) && this.isPendingConfirm(r)).length,
      );
      this.syncInitialTab();

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
      this.hint.end();
      this.loading.set(false);
    }
  }

  protected setupMessage(): string {
    switch (this.setupIssue()) {
      case 'no-profile':
        return 'สร้างโปรไฟล์ผู้ให้บริการก่อน จึงจะเห็นงานที่ตรงกับพื้นที่และหมวดบริการ';
      case 'missing-branches':
        return GLOSSARY.addCoverageBeforeMatching;
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
        return GLOSSARY.addCoverageCta;
      case 'missing-services':
        return 'เปิดบริการ';
      default:
        return 'ไปตั้งค่า';
    }
  }

  protected formatDistance(meters?: number | null): string {
    return formatDistanceMeters(meters);
  }

  protected cardMetaLine(request: ServiceRequestSummary): string {
    // T4-2: status lives in the chip only — meta line shows budget (if any), never the status again
    const budget = formatBudgetDisplay(request.budgetText);
    return budget && (request.status === 'Open' || request.status === 'HasOffers') ? budget : '';
  }

  private syncInitialTab(): void {
    if (this.pendingConfirmCount() > 0) {
      this.tab.set('pending');
      return;
    }
    const jobs = this.myJobs();
    const order: JobTab[] = ['rejected', 'pending', 'bidWaiting', 'active', 'scheduled', 'completed', 'cancelled'];
    for (const key of order) {
      if (jobs.some((r) => this.matchesTab(r, key))) {
        this.tab.set(key);
        return;
      }
    }
    this.tab.set('active');
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

  protected async primaryAction(request: ServiceRequestSummary): Promise<void> {
    if (!request.alreadyBidByMe && this.isBiddable(request) && !this.isMyActiveJob(request)) {
      await this.router.navigate(['/provider/bid'], { queryParams: { requestId: request.id } });
      return;
    }
    await this.openRequest(request);
  }

  protected isMyActiveJob(request: ServiceRequestSummary): boolean {
    return (
      request.status === 'ProviderSelected' ||
      request.status === 'Scheduled' ||
      request.status === 'InProgress'
    );
  }

  protected isTerminalJob(request: ServiceRequestSummary): boolean {
    return (
      request.status === 'Cancelled' ||
      request.appointmentStatus === 'Cancelled' ||
      request.appointmentStatus === 'Rejected'
    );
  }

  protected actionLabel(request: ServiceRequestSummary): string {
    if (request.appointmentStatus === 'Cancelled' || request.status === 'Cancelled') {
      return 'ดูรายละเอียด';
    }
    if (request.appointmentStatus === 'Rejected') {
      return 'ดูรายละเอียด';
    }
    if (request.needsAppointmentConfirm || request.appointmentStatus === 'Pending') {
      return 'ดูรายละเอียด';
    }
    if (request.appointmentStatus === 'InProgress' || request.status === 'InProgress') {
      return 'งานเสร็จสิ้น';
    }
    // Hide "เริ่มงาน" until Confirmed (AC8).
    if (request.appointmentStatus === 'Confirmed') {
      return 'เริ่มงาน';
    }
    if (this.isMyActiveJob(request)) {
      return 'ดำเนินงานต่อ';
    }
    if (request.alreadyBidByMe && this.isBiddable(request)) {
      return 'ดูข้อเสนอ';
    }
    if (this.isBiddable(request) && !this.isMine(request)) {
      return 'เสนอราคา';
    }
    return 'ดูรายละเอียด';
  }
}
