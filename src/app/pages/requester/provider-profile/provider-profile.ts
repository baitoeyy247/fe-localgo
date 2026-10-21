import { afterNextRender, Component, OnInit, inject, signal } from '@angular/core';
import { Router, RouterLink, ActivatedRoute } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { MapView } from '../../../demo/map-view';
import { PageShell } from '../../../demo/page-shell';
import { SkeletonCard } from '../../../shared/ui/skeleton-card';
import { LocalGoApiService } from '../../../core/localgo-api.service';
import { ProviderDetail, ProviderService, ReviewItem } from '../../../core/models';
import { SessionStateService } from '../../../core/session-state.service';
import { providerTypeLabel } from '../../../shared/status-labels';
import { formatPrice } from '../../../shared/format-price';
import { formatVerifiedRatingLine } from '../../../shared/format-verified-rating';

@Component({
  selector: 'app-provider-profile-page',
  imports: [PageShell, RouterLink, MapView, SkeletonCard],
  templateUrl: './provider-profile.html',
})
export class ProviderProfilePage implements OnInit {
  protected readonly provider = signal<ProviderDetail | null>(null);
  protected readonly reviews = signal<ReviewItem[]>([]);
  protected readonly loading = signal(true);
  protected readonly preferredServiceId = signal<string | null>(null);
  protected readonly selectedServiceId = signal<string | null>(null);
  protected readonly showAllServices = signal(false);
  protected readonly isOwnShop = signal(false);
  protected readonly providerTypeLabel = providerTypeLabel;
  protected readonly formatPrice = formatPrice;
  protected readonly formatVerifiedRatingLine = formatVerifiedRatingLine;

  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly api = inject(LocalGoApiService);
  private readonly session = inject(SessionStateService);

  constructor() {
    afterNextRender(() => {
      this.scrollToFocusedService();
    });
  }

  async ngOnInit(): Promise<void> {
    const id = this.route.snapshot.paramMap.get('id');
    this.preferredServiceId.set(this.route.snapshot.queryParamMap.get('serviceId'));
    if (!id) {
      this.loading.set(false);
      return;
    }
    const [detail, reviewList] = await Promise.all([
      firstValueFrom(this.api.getProvider(id)),
      firstValueFrom(this.api.listReviews(id)),
    ]);
    this.provider.set(detail);
    this.reviews.set(reviewList);
    this.syncSelectedService(detail);
    try {
      const mine = await firstValueFrom(this.api.getMyProvider());
      this.isOwnShop.set(mine.id === detail.id);
    } catch {
      this.isOwnShop.set(false);
    }
    this.loading.set(false);
    queueMicrotask(() => this.scrollToFocusedService());
  }

  protected activeServices(): ProviderService[] {
    return this.provider()?.services.filter((s) => s.isActive) ?? [];
  }

  protected selectService(serviceId: string): void {
    this.selectedServiceId.set(serviceId);
  }

  protected isServiceSelected(serviceId: string): boolean {
    return this.selectedServiceId() === serviceId;
  }

  protected canBookAppointment(): boolean {
    if (this.isOwnShop()) {
      return false;
    }
    const active = this.activeServices();
    if (active.length === 0) {
      return false;
    }
    if (active.length === 1) {
      return true;
    }
    return !!this.selectedServiceId();
  }

  protected bookHint(): string | null {
    if (this.activeServices().length > 1 && !this.selectedServiceId()) {
      return 'เลือกบริการก่อน';
    }
    return null;
  }

  private syncSelectedService(detail: ProviderDetail): void {
    const preferred = this.preferredServiceId();
    const active = detail.services.filter((s) => s.isActive);
    if (preferred && active.some((s) => s.id === preferred)) {
      this.selectedServiceId.set(preferred);
      return;
    }
    if (active.length === 1) {
      this.selectedServiceId.set(active[0].id);
      return;
    }
    this.selectedServiceId.set(null);
  }

  protected fromSearch(): boolean {
    const preferred = this.preferredServiceId();
    if (!preferred) {
      return false;
    }
    return this.provider()?.services.some((s) => s.id === preferred) ?? false;
  }

  protected pageTitle(): string {
    return 'โปรไฟล์ผู้ให้บริการ';
  }

  protected visibleServices(): ProviderService[] {
    const p = this.provider();
    if (!p?.services.length) {
      return [];
    }
    const preferred = this.preferredServiceId();
    const focused = preferred ? p.services.find((s) => s.id === preferred) : undefined;
    if (this.fromSearch() && focused && !this.showAllServices()) {
      return [focused];
    }
    const rest = p.services.filter((s) => s.id !== focused?.id);
    return focused ? [focused, ...rest] : p.services;
  }

  protected otherServiceCount(): number {
    const p = this.provider();
    if (!p) {
      return 0;
    }
    const preferred = this.preferredServiceId();
    if (!preferred) {
      return 0;
    }
    return p.services.filter((s) => s.id !== preferred).length;
  }

  protected showAllServicesToggle(): void {
    this.showAllServices.set(true);
  }

  protected collapseToFocusedService(): void {
    this.showAllServices.set(false);
    queueMicrotask(() => this.scrollToFocusedService());
  }

  protected isFocusedService(serviceId: string): boolean {
    return this.fromSearch() && this.preferredServiceId() === serviceId;
  }

  protected primaryBranch() {
    const p = this.provider();
    return p?.branches.find((b) => b.isActive) ?? p?.branches[0];
  }

  protected primaryService() {
    const p = this.provider();
    const preferred = this.preferredServiceId();
    if (preferred) {
      const match = p?.services.find((s) => s.id === preferred);
      if (match) {
        return match;
      }
    }
    return p?.services.find((s) => s.isActive) ?? p?.services[0];
  }

  protected async bookAppointment(): Promise<void> {
    const p = this.provider();
    if (!p || !this.canBookAppointment()) {
      return;
    }
    this.session.currentProviderId = p.id;
    const active = this.activeServices();
    const svcId =
      this.selectedServiceId() ?? (active.length === 1 ? active[0].id : null) ?? this.primaryService()?.id;
    await this.router.navigate(['/requester/book', p.id], {
      queryParams: svcId ? { serviceId: svcId } : undefined,
    });
  }

  protected branchLabels(): string {
    const p = this.provider();
    if (!p?.branches.length) {
      return 'ยังไม่ระบุจุดให้บริการ';
    }
    return p.branches.map((b) => b.name).join(', ');
  }

  private scrollToFocusedService(): void {
    if (!this.fromSearch() || this.showAllServices()) {
      return;
    }
    const el = document.getElementById('focused-service');
    el?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }
}
