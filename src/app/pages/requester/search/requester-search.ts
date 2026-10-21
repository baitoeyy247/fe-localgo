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
import { formatDistanceMeters } from '../../../shared/geo-distance';
import { searchRadiusCaption, searchRadiusKmLabel } from '../../../shared/search-area-radius';
import { MapView } from '../../../demo/map-view';

@Component({
  selector: 'app-requester-search-page',
  imports: [PageShell, RouterLink, LocationPickerModal, RequesterBottomNav, MapView],
  templateUrl: './requester-search.html',
})
export class RequesterSearchPage implements OnInit {
  protected readonly providers = signal<ProviderSummary[]>([]);
  protected readonly categories = signal<Category[]>([]);
  protected readonly loading = signal(false);
  /** True after the first search in this visit (auto or manual). */
  protected readonly hasSearched = signal(false);
  protected readonly keyword = signal('');
  protected readonly pickerOpen = signal(false);
  protected readonly needsLocationPick = signal(false);
  protected readonly selectedCategoryId = signal<string | null>(null);
  protected readonly selectedCategoryName = signal<string | null>(null);
  protected readonly selectedArea = signal({
    title: 'ยังไม่ได้เลือกตำแหน่ง',
    subtitle: 'อนุญาต GPS หรือเลือกบนแผนที่',
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
    this.keyword.set('');

    const area = await this.userLocation.resolveSearchArea();
    this.selectedArea.set({
      title: area.title,
      subtitle: area.subtitle,
      radiusKm: area.radiusKm,
      lat: area.lat,
      lng: area.lng,
    });
    this.needsLocationPick.set(!!area.needsPick);
    if (area.needsPick) {
      this.pickerOpen.set(true);
    }

    const cats = await firstValueFrom(this.api.listCategories());
    this.categories.set(cats);

    const qp = this.route.snapshot.queryParamMap;
    const catId = qp.get('categoryId');
    const catName = qp.get('categoryName');
    if (catId) {
      this.selectedCategoryId.set(catId);
      this.selectedCategoryName.set(catName);
      this.scrollActiveChipIntoView();
    }

    if (!area.needsPick) {
      this.loading.set(true);
      await this.reload();
    } else {
      this.loading.set(false);
    }
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
      subtitle: value.subtitle.replace(/\s*·\s*รัศมี\s+\d+\s*กม\./gu, '').replace(/^รัศมี\s+\d+\s*กม\.?$/u, '').trim()
        || 'ตำแหน่งที่เลือก',
      radiusKm: value.radiusKm,
      lat: value.lat,
      lng: value.lng,
    };
    this.selectedArea.set(area);
    this.userLocation.remember(area);
    this.needsLocationPick.set(false);
    this.pickerOpen.set(false);
    await this.reload();
  }

  /** Single source of truth for radius display (card text + map). */
  protected radiusKmLabel(): string {
    return searchRadiusKmLabel(this.selectedArea().radiusKm);
  }

  protected searchRadiusCaption(): string {
    return searchRadiusCaption(this.selectedArea().radiusKm);
  }

  protected updateKeyword(value: string): void {
    this.keyword.set(value);
  }

  protected selectCategory(id: string | null, name: string | null): void {
    this.selectedCategoryId.set(id);
    this.selectedCategoryName.set(name);
    this.scrollActiveChipIntoView();
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
    if (this.needsLocationPick()) {
      this.pickerOpen.set(true);
      return;
    }
    await this.reload();
  }

  protected formatDistance(meters: number): string {
    return formatDistanceMeters(meters);
  }

  private scrollActiveChipIntoView(): void {
    queueMicrotask(() => {
      document.querySelector('.chips--scroll .chip.on')?.scrollIntoView({
        inline: 'center',
        block: 'nearest',
        behavior: 'smooth',
      });
    });
  }

  private async reload(): Promise<void> {
    this.loading.set(true);
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
      this.hasSearched.set(true);
    } finally {
      this.loading.set(false);
    }
  }
}
