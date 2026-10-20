import { Component, OnInit, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import {
  LocationPickerModal,
  LocationPickerValue,
} from '../../../demo/location-picker-modal';
import { PageShell } from '../../../demo/page-shell';
import { RequesterBottomNav } from '../../../shared/requester-bottom-nav';
import { LocalGoApiService } from '../../../core/localgo-api.service';
import { Category, ProviderSummary } from '../../../core/models';
import { UserLocationService } from '../../../core/user-location.service';
import { formatCoordinates } from '../../../shared/coordinates';
import { LoadingSkeleton } from '../../../shared/loading-skeleton';
import { apiErrorMessage } from '../../../core/api-error.util';

@Component({
  selector: 'app-requester-search-page',
  imports: [PageShell, RouterLink, LocationPickerModal, RequesterBottomNav, LoadingSkeleton],
  templateUrl: './requester-search.html',
})
export class RequesterSearchPage implements OnInit {
  protected readonly providers = signal<ProviderSummary[]>([]);
  protected readonly categories = signal<Category[]>([]);
  protected readonly loading = signal(true);
  protected readonly locating = signal(true);
  protected readonly error = signal<string | null>(null);
  protected readonly keyword = signal('');
  protected readonly pickerOpen = signal(false);
  protected readonly selectedCategoryId = signal<string | null>(null);
  protected readonly selectedCategoryName = signal<string | null>(null);
  protected readonly selectedArea = signal({
    title: 'พื้นที่ค้นหาปัจจุบัน',
    subtitle: 'พิกัดเริ่มต้นของพื้นที่ค้นหา',
    radiusKm: 5,
    lat: 0,
    lng: 0,
  });

  constructor(
    private readonly api: LocalGoApiService,
    private readonly userLocation: UserLocationService,
    private readonly route: ActivatedRoute,
    private readonly router: Router,
  ) {}

  async ngOnInit(): Promise<void> {
    this.loading.set(true);
    this.locating.set(true);
    this.error.set(null);
    try {
      const area = await this.userLocation.resolveSearchArea();
      this.selectedArea.set({
        title: area.title,
        subtitle: area.subtitle,
        radiusKm: area.radiusKm,
        lat: area.lat,
        lng: area.lng,
      });
      this.locating.set(false);

      const cats = await firstValueFrom(this.api.listCategories());
      this.categories.set(cats);

      const qp = this.route.snapshot.queryParamMap;
      const catId = qp.get('categoryId');
      const catName = qp.get('categoryName');
      if (catId) {
        this.selectedCategoryId.set(catId);
        this.selectedCategoryName.set(catName);
      }

      await this.reload();
    } catch (e) {
      this.error.set(apiErrorMessage(e, 'โหลดหน้าค้นหาไม่สำเร็จ'));
      this.loading.set(false);
      this.locating.set(false);
    }
  }

  protected coordinateText(): string {
    const area = this.selectedArea();
    return formatCoordinates(area.lat, area.lng, this.locating());
  }

  protected openPicker(): void {
    this.pickerOpen.set(true);
  }

  protected closePicker(): void {
    this.pickerOpen.set(false);
  }

  protected async applyLocation(value: LocationPickerValue): Promise<void> {
    const area = {
      title: value.title,
      subtitle: value.subtitle,
      radiusKm: value.radiusKm,
      lat: value.lat,
      lng: value.lng,
    };
    this.selectedArea.set(area);
    this.userLocation.remember(area);
    this.pickerOpen.set(false);
    await this.reload();
  }

  protected updateKeyword(value: string): void {
    this.keyword.set(value);
  }

  protected selectCategory(id: string | null, name: string | null): void {
    this.selectedCategoryId.set(id);
    this.selectedCategoryName.set(name);
    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: id
        ? { categoryId: id, categoryName: name ?? undefined }
        : { categoryId: null, categoryName: null },
      queryParamsHandling: 'merge',
      replaceUrl: true,
    });
  }

  protected async search(): Promise<void> {
    await this.reload();
  }

  protected formatDistance(meters: number): string {
    return meters >= 1000 ? `${(meters / 1000).toFixed(1)} กม.` : `${Math.round(meters)} ม.`;
  }

  private async reload(): Promise<void> {
    this.loading.set(true);
    this.error.set(null);
    const area = this.selectedArea();
    try {
      const results = await firstValueFrom(
        this.api.searchProviders({
          lat: area.lat,
          lng: area.lng,
          radiusMeters: area.radiusKm * 1000,
          keyword: this.keyword() || undefined,
          categoryId: this.selectedCategoryId() ?? undefined,
        }),
      );
      this.providers.set(results);
    } catch (e) {
      this.providers.set([]);
      this.error.set(apiErrorMessage(e, 'ค้นหาไม่สำเร็จ'));
    } finally {
      this.loading.set(false);
    }
  }
}
