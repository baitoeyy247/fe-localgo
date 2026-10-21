import { Component, OnInit, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import {
  LocationPickerModal,
  LocationPickerValue,
} from '../../../demo/location-picker-modal';
import { PageShell } from '../../../demo/page-shell';
import { RequesterBottomNav } from '../../../shared/requester-bottom-nav';
import { RequesterFlowBar } from '../../../shared/requester-flow-bar';
import { LocalGoApiService } from '../../../core/localgo-api.service';
import { Category } from '../../../core/models';
import { SessionStateService } from '../../../core/session-state.service';
import { UserLocationService } from '../../../core/user-location.service';
import { apiErrorMessage } from '../../../core/api-error.util';
import { scrollToFirstError } from '../../../shared/scroll-to-first-error';

@Component({
  selector: 'app-post-request-page',
  imports: [PageShell, LocationPickerModal, RequesterBottomNav, RequesterFlowBar],
  templateUrl: './post-request.html',
})
export class PostRequestPage implements OnInit {
  protected readonly pickerOpen = signal(false);
  protected readonly categories = signal<Category[]>([]);
  protected readonly selectedCategoryId = signal<string | null>(null);
  protected readonly title = signal('');
  protected readonly description = signal('');
  protected readonly budgetMode = signal<'open' | 'fixed'>('open');
  protected readonly budgetAmount = signal('');
  protected readonly posting = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly requestLocation = signal({
    title: 'จุดรับงานปัจจุบัน',
    subtitle: 'พิกัดเริ่มต้นของประกาศนี้',
    radiusKm: 5,
    lat: 0,
    lng: 0,
  });

  private readonly api = inject(LocalGoApiService);
  private readonly session = inject(SessionStateService);
  private readonly router = inject(Router);
  private readonly userLocation = inject(UserLocationService);

  async ngOnInit(): Promise<void> {
    const area = await this.userLocation.resolveSearchArea();
    this.requestLocation.set({
      title: area.title,
      subtitle: area.subtitle,
      radiusKm: area.radiusKm,
      lat: area.lat,
      lng: area.lng,
    });

    const categories = await firstValueFrom(this.api.listCategories());
    this.categories.set(categories);
    if (categories[0]) {
      this.selectedCategoryId.set(categories[0].id);
    }
  }

  protected selectCategory(id: string): void {
    this.selectedCategoryId.set(id);
  }

  protected updateTitle(value: string): void {
    this.title.set(value);
  }

  protected updateDescription(value: string): void {
    this.description.set(value);
  }

  protected setBudgetMode(mode: 'open' | 'fixed'): void {
    this.budgetMode.set(mode);
  }

  protected updateBudgetAmount(value: string): void {
    this.budgetAmount.set(value.replace(/[^\d–-]/gu, ''));
  }

  protected showCoords(): boolean {
    const loc = this.requestLocation();
    return loc.title === 'พื้นที่ค้นหาเริ่มต้น' || loc.title === 'จุดรับงานปัจจุบัน';
  }

  protected openPicker(): void {
    this.pickerOpen.set(true);
  }

  protected closePicker(): void {
    this.pickerOpen.set(false);
  }

  protected applyLocation(value: LocationPickerValue): void {
    const loc = {
      title: value.title,
      subtitle: value.subtitle,
      radiusKm: value.radiusKm,
      lat: value.lat,
      lng: value.lng,
    };
    this.requestLocation.set(loc);
    this.userLocation.remember(loc);
    this.pickerOpen.set(false);
  }

  protected async publish(): Promise<void> {
    const categoryId = this.selectedCategoryId();
    const title = this.title().trim();
    if (!categoryId || !title || this.posting()) {
      if (!title) {
        this.error.set('กรุณาระบุหัวข้องาน');
        scrollToFirstError();
      }
      return;
    }
    this.posting.set(true);
    this.error.set(null);
    try {
      const loc = this.requestLocation();
      const created = await firstValueFrom(
        this.api.createRequest({
          categoryId,
          title,
          description: this.description().trim() || undefined,
          addressText: loc.title,
          latitude: loc.lat,
          longitude: loc.lng,
          searchRadiusMeters: loc.radiusKm * 1000,
          budgetText: this.resolveBudgetText(),
          publish: true,
        }),
      );
      this.session.requesterRequestId = created.id;
      await this.router.navigate(['/requester/bids'], {
        queryParams: { posted: '1', requestId: created.id },
      });
    } catch (e) {
      this.error.set(apiErrorMessage(e, 'ประกาศงานไม่สำเร็จ'));
      scrollToFirstError();
    } finally {
      this.posting.set(false);
    }
  }

  private resolveBudgetText(): string | undefined {
    if (this.budgetMode() === 'open') {
      return 'เปิดรับราคา';
    }
    const amount = this.budgetAmount().trim();
    if (!amount) {
      return undefined;
    }
    return amount.includes('บาท') ? amount : `${amount} บาท`;
  }
}
